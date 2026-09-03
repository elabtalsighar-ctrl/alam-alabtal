import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = '/app/server/data/alam.db';
const B2_KEY = 'db/alam.db';
let client = null;
let bucket = null;
let lastUploadHash = '';
let backupInterval = null;

function getConfig() {
  const accountId = process.env.B2_ACCOUNT_ID;
  const appKey = process.env.B2_ACCOUNT_KEY;
  bucket = process.env.B2_BUCKET_NAME;
  if (!accountId || !appKey || !bucket) return null;
  return { accountId, appKey, bucket };
}

function getClient() {
  if (client) return client;
  const cfg = getConfig();
  if (!cfg) return null;
  client = new S3Client({
    region: 'us-east-005',
    endpoint: `https://s3.${cfg.accountId ? 'us-east-005' : 'us-west-004'}.backblazeb2.com`,
    credentials: { accessKeyId: cfg.accountId, secretAccessKey: cfg.appKey },
    forcePathStyle: true
  });
  return client;
}

function fileHash(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return `${stat.size}-${stat.mtimeMs}`;
  } catch { return ''; }
}

export async function restoreFromB2() {
  const cfg = getConfig();
  if (!cfg) { console.log('[B2-BACKUP] No B2 credentials, skipping restore'); return false; }

  try {
    if (!fs.existsSync(DB_PATH) || fs.statSync(DB_PATH).size === 0) {
      console.log('[B2-BACKUP] DB missing/empty, downloading from B2...');
    } else {
      console.log('[B2-BACKUP] DB exists, checking B2 for newer version...');
      // Always download if DB is fresh (small = just seeded)
      const size = fs.statSync(DB_PATH).size;
      if (size > 10000) { console.log('[B2-BACKUP] DB is healthy, skipping restore'); return false; }
    }

    const s3 = getClient();
    if (!s3) return false;

    const res = await s3.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: B2_KEY }));
    const chunks = [];
    for await (const chunk of res.Body) chunks.push(chunk);
    const data = Buffer.concat(chunks);

    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, data);
    lastUploadHash = fileHash(DB_PATH);
    console.log(`[B2-BACKUP] Restored DB from B2 (${data.length} bytes)`);
    return true;
  } catch (e) {
    if (e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404) {
      console.log('[B2-BACKUP] No backup found in B2, starting fresh');
    } else {
      console.error('[B2-BACKUP] Restore failed:', e.message);
    }
    return false;
  }
}

export async function backupToB2() {
  const cfg = getConfig();
  if (!cfg) return;

  try {
    const currentHash = fileHash(DB_PATH);
    if (currentHash === lastUploadHash) return; // no changes

    if (!fs.existsSync(DB_PATH)) return;
    const data = fs.readFileSync(DB_PATH);
    const s3 = getClient();
    if (!s3) return;

    await s3.send(new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: B2_KEY,
      Body: data,
      ContentType: 'application/x-sqlite3'
    }));
    lastUploadHash = currentHash;
    console.log(`[B2-BACKUP] Uploaded DB to B2 (${data.length} bytes)`);
  } catch (e) {
    console.error('[B2-BACKUP] Upload failed:', e.message);
  }
}

export function startAutoBackup() {
  const cfg = getConfig();
  if (!cfg) return;
  // Backup every 30 seconds if there are changes
  backupInterval = setInterval(backupToB2, 30000);
  // Also backup on process exit
  process.on('SIGTERM', () => { backupToB2().then(() => process.exit(0)).catch(() => process.exit(1)); });
  process.on('SIGINT', () => { backupToB2().then(() => process.exit(0)).catch(() => process.exit(1)); });
  console.log('[B2-BACKUP] Auto-backup started (every 30s)');
}
