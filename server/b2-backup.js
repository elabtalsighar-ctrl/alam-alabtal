import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = '/app/server/data/alam.db';
const B2_KEY = 'db/alam.db';
let lastUploadHash = '';
let cachedB2 = null;

function getConfig() {
  const accountId = process.env.B2_ACCOUNT_ID;
  const appKey = process.env.B2_ACCOUNT_KEY;
  const bucket = process.env.B2_BUCKET_NAME;
  if (!accountId || !appKey || !bucket) return null;
  return { accountId, appKey, bucket };
}

async function getB2Auth(cfg) {
  if (cachedB2) return cachedB2;
  const auth = Buffer.from(`${cfg.accountId}:${cfg.appKey}`).toString('base64');
  const res = await fetch('https://api.backblazeb2.com/b2api/v4/b2_authorize_account', {
    headers: { Authorization: `Basic ${auth}` }
  });
  if (!res.ok) throw new Error(`B2 auth failed: ${res.status}`);
  const data = await res.json();
  // Find the bucket by name
  const bucketRes = await fetch(`${data.apiUrl}/b2api/v4/b2_list_buckets`, {
    method: 'POST',
    headers: { Authorization: data.authorizationToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  if (!bucketRes.ok) throw new Error('Failed to list buckets');
  const buckets = await bucketRes.json();
  const bucket = buckets.buckets?.find(b => b.bucketName === cfg.bucket);
  if (!bucket) throw new Error(`Bucket "${cfg.bucket}" not found`);
  cachedB2 = { ...data, bucketId: bucket.bucketId };
  return cachedB2;
}

function fileHash(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return `${stat.size}-${stat.mtimeMs}`;
  } catch { return ''; }
}

export async function restoreFromB2() {
  const cfg = getConfig();
  if (!cfg) { console.log('[B2-BACKUP] No B2 credentials, skipping'); return false; }

  try {
    const exists = fs.existsSync(DB_PATH) && fs.statSync(DB_PATH).size > 10000;
    if (exists) { console.log('[B2-BACKUP] DB exists, skipping restore'); return false; }

    console.log('[B2-BACKUP] Downloading from B2...');
    const b2 = await getB2Auth(cfg);

    // List files to find the DB
    const listRes = await fetch(`${b2.apiUrl}/b2api/v4/b2_list_file_names`, {
      method: 'POST',
      headers: { Authorization: b2.authorizationToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucketId: b2.bucketId, prefix: B2_KEY, maxFileCount: 1 })
    });
    if (!listRes.ok) throw new Error('Failed to list files');
    const listData = await listRes.json();
    if (!listData.files || listData.files.length === 0) {
      console.log('[B2-BACKUP] No backup found');
      return false;
    }

    // Download
    const downloadRes = await fetch(`${b2.downloadUrl}/file/${b2.bucketId}/${B2_KEY}`, {
      headers: { Authorization: b2.authorizationToken }
    });
    if (!downloadRes.ok) throw new Error('Download failed');

    const buffer = Buffer.from(await downloadRes.arrayBuffer());
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, buffer);
    lastUploadHash = fileHash(DB_PATH);
    console.log(`[B2-BACKUP] Restored DB (${buffer.length} bytes)`);
    return true;
  } catch (e) {
    console.error('[B2-BACKUP] Restore failed:', e.message);
    return false;
  }
}

export async function backupToB2() {
  const cfg = getConfig();
  if (!cfg) return;

  try {
    const currentHash = fileHash(DB_PATH);
    if (currentHash === lastUploadHash) return;
    if (!fs.existsSync(DB_PATH)) return;

    const data = fs.readFileSync(DB_PATH);
    const b2 = await getB2Auth(cfg);

    // Get upload URL
    const urlRes = await fetch(`${b2.apiUrl}/b2api/v4/b2_get_upload_url`, {
      method: 'POST',
      headers: { Authorization: b2.authorizationToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucketId: b2.bucketId })
    });
    if (!urlRes.ok) throw new Error('Failed to get upload URL');
    const urlData = await urlRes.json();

    const uploadRes = await fetch(urlData.uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: urlData.authorizationToken,
        'X-Bz-File-Name': B2_KEY,
        'Content-Type': 'application/x-sqlite3',
        'X-Bz-Content-Sha1': 'do_not_verify'
      },
      body: data
    });
    if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);
    lastUploadHash = fileHash(DB_PATH);
    console.log(`[B2-BACKUP] Uploaded DB (${data.length} bytes)`);
  } catch (e) {
    console.error('[B2-BACKUP] Upload failed:', e.message);
  }
}

export function startAutoBackup() {
  const cfg = getConfig();
  if (!cfg) return;
  setInterval(backupToB2, 30000);
  process.on('SIGTERM', async () => { await backupToB2().catch(() => {}); process.exit(0); });
  process.on('SIGINT', async () => { await backupToB2().catch(() => {}); process.exit(0); });
  console.log('[B2-BACKUP] Auto-backup started');
}
