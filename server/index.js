import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool, initDB, dbGet, dbAll, dbRun, getSettings, updateSettings } from './db.js';
import { seed, slugify } from './seed.js';
import { pushOrderToEcotrack, testEcotrackConnection } from './ecotrack.js';
import { v2 as cloudinary } from 'cloudinary';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

if (!process.env.JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET environment variable is required. Generate one with: openssl rand -hex 32');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

if (process.env.CLOUDINARY_URL) {
  cloudinary.config({ cloud_url: process.env.CLOUDINARY_URL });
  console.log('[UPLOAD] Cloudinary configured');
} else {
  console.log('[UPLOAD] No CLOUDINARY_URL, using local /tmp (images lost on restart)');
}
const UPLOAD_DIR = path.join('/tmp', 'alam-uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || false,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static('/tmp/alam-uploads'));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many login attempts. Try again later.' } });
const orderLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many orders. Try again later.' } });
const reviewLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many reviews. Try again later.' } });
const contactLimiter = rateLimit({ windowMs: 60 * 1000, max: 3, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many messages. Try again later.' } });

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await dbGet('SELECT id, email, role, name FROM users WHERE id = $1', [payload.id]);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({
  storage: process.env.CLOUDINARY_URL ? multer.memoryStorage() : multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only images allowed'));
  }
});

function publicProduct(p) {
  let sizes = [];
  if (p.sizes) {
    try { sizes = JSON.parse(p.sizes); } catch { sizes = []; }
  }
  return {
    ...p,
    specifications: p.specifications ? p.specifications.split('\n').filter(Boolean) : [],
    features: p.features ? p.features.split('\n').filter(Boolean) : [],
    sizes
  };
}

async function productWithImages(p) {
  const imgResult = await dbAll('SELECT image FROM product_images WHERE product_id = $1 ORDER BY sort_order, id', [p.id]);
  const images = imgResult.map(r => r.image);
  return { ...publicProduct(p), images };
}

const LOW_STOCK_CACHE = { value: null, at: 0 };
async function lowStockThreshold() {
  const now = Date.now();
  if (LOW_STOCK_CACHE.value !== null && now - LOW_STOCK_CACHE.at < 5000) return LOW_STOCK_CACHE.value;
  const settings = await getSettings();
  LOW_STOCK_CACHE.value = parseInt(settings.low_stock_threshold || '5', 10);
  LOW_STOCK_CACHE.at = now;
  return LOW_STOCK_CACHE.value;
}

const PUBLIC_SETTINGS_KEYS = [
  'store_name', 'store_name_en', 'store_description', 'logo',
  'whatsapp_number', 'whatsapp_message', 'contact_phone', 'contact_email',
  'instagram_url', 'facebook_url', 'tiktok_url',
  'delivery_pricing', 'delivery_time', 'delivery_info', 'shipping_free_over',
  'delivery_fees', 'low_stock_threshold',
  'ecotrack_enabled', 'ecotrack_base_url',
  'google_sheets_url', 'faq_content', 'facebook_pixel_id'
];

app.get('/api/settings', async (req, res) => {
  try {
    const all = await getSettings();
    const safe = {};
    for (const key of PUBLIC_SETTINGS_KEYS) {
      if (all[key] !== undefined) safe[key] = all[key];
    }
    res.json(safe);
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.get('/api/admin/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    res.json(await getSettings());
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.put('/api/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    res.json(await updateSettings(req.body));
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.post('/api/settings/test-sheets', requireAuth, requireAdmin, async (req, res) => {
  try {
    const settings = await getSettings();
    const sheetsUrl = (settings.google_sheets_url || '').trim();
    if (!sheetsUrl) return res.status(400).json({ error: 'لم يتم ضبط رابط Google Sheets.' });
    const testPayload = {
      order_number: 'TEST-' + Date.now(), timestamp: new Date().toISOString(),
      customer_name: 'اختبار الاتصال', phone: '0796389228',
      wilaya: '16 - الجزائر', commune: 'باب الزوار', address: 'اختبار',
      items: 'اختبار x1', items_total: 1000, delivery_cost: 350, total: 1350, status: 'new'
    };
    const r = await fetch(sheetsUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(testPayload) });
    const text = await r.text();
    if (text.includes('<!DOCTYPE') || !r.ok) {
      return res.status(500).json({ error: 'فشل الاتصال. تأكد من Deploy كـ Web App بصلاحية Anyone و Execute as Me.' });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'فشل الاتصال: ' + (e.message || String(e)) });
  }
});

app.post('/api/ecotrack/test', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await testEcotrackConnection();
    if (result.ok) return res.json(result);
    return res.status(500).json({ error: 'فشل الاتصال بـ Ecotrack' });
  } catch (e) {
    res.status(500).json({ error: 'فشل الاتصال: ' + (e.message || String(e)) });
  }
});

app.get('/api/ecotrack/wilayas', async (req, res) => {
  try {
    const s = await getSettings();
    const baseUrl = (s.ecotrack_base_url || 'https://anderson-ecommerce.ecotrack.dz').replace(/\/$/, '');
    const token = (s.ecotrack_token || '').trim();
    if (!token) return res.status(400).json({ error: 'Ecotrack غير مُعرف' });
    const r = await fetch(`${baseUrl}/api/v1/get/wilayas?api_token=${encodeURIComponent(token)}`);
    const t = await r.text();
    let j = null; try { j = JSON.parse(t); } catch {}
    if (j) return res.json(j);
    return res.status(500).json({ error: 'فشل جلب الولايات' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ecotrack/communes', async (req, res) => {
  try {
    const wilaya_id = String(req.query.wilaya_id || '').replace(/[^0-9]/g, '');
    if (!wilaya_id) return res.status(400).json({ error: 'wilaya_id مطلوب' });
    const s = await getSettings();
    const baseUrl = (s.ecotrack_base_url || 'https://anderson-ecommerce.ecotrack.dz').replace(/\/$/, '');
    const token = (s.ecotrack_token || '').trim();
    if (!token) return res.status(400).json({ error: 'Ecotrack غير مُعرف' });
    const r = await fetch(`${baseUrl}/api/v1/get/communes?api_token=${encodeURIComponent(token)}&wilaya_id=${wilaya_id}`);
    const t = await r.text();
    let j = null; try { j = JSON.parse(t); } catch {}
    if (Array.isArray(j)) return res.json(j);
    if (j) return res.json(j);
    return res.status(500).json({ error: 'فشل جلب البلديات' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ecotrack/fees', async (req, res) => {
  try {
    const s = await getSettings();
    const baseUrl = (s.ecotrack_base_url || 'https://anderson-ecommerce.ecotrack.dz').replace(/\/$/, '');
    const token = (s.ecotrack_token || '').trim();
    if (!token) return res.json({ fees: {}, _debug: 'no_token' });
    const url = `${baseUrl}/api/v1/get/fees?api_token=${encodeURIComponent(token)}`;
    const r = await fetch(url);
    const t = await r.text();
    let j = null; try { j = JSON.parse(t); } catch {}
    if (!j || (typeof j === 'object' && Object.keys(j).length === 0)) {
      return res.json({ fees: {}, _debug: 'empty_response' });
    }
    return res.json(j);
  } catch (e) {
    res.status(500).json({ error: 'فشل جلب الأسعار' });
  }
});

app.post('/api/ecotrack/fetch-fees', requireAuth, requireAdmin, async (req, res) => {
  try {
    const s = await getSettings();
    const baseUrl = (s.ecotrack_base_url || 'https://anderson-ecommerce.ecotrack.dz').replace(/\/$/, '');
    const token = (req.body.token || s.ecotrack_token || '').trim();
    if (!token) return res.status(400).json({ error: 'أدخل Token Ecotrack أولاً' });
    const url = `${baseUrl}/api/v1/get/fees?api_token=${encodeURIComponent(token)}`;
    const r = await fetch(url);
    const t = await r.text();
    let j = null; try { j = JSON.parse(t); } catch {}
    if (!j) return res.status(500).json({ error: 'فشل جلب الأسعار' });
    const feesMap = {};
    const arr = j.livraison || (Array.isArray(j) ? j : null);
    if (Array.isArray(arr)) {
      arr.forEach(item => {
        const code = String(item.wilaya_id || '');
        const home = parseFloat(item.tarif || '0');
        const sd = parseFloat(item.tarif_stopdesk || '0');
        if (code && home > 0) feesMap[code] = { home: String(home), stop_desk: sd > 0 ? String(sd) : String(home) };
      });
    }
    if (Object.keys(feesMap).length) {
      await updateSettings({ ecotrack_token: token, delivery_fees: JSON.stringify(feesMap) });
      return res.json({ ok: true, count: Object.keys(feesMap).length, fees: feesMap });
    }
    return res.status(500).json({ error: 'لم يتم العثور على أسعار' });
  } catch (e) {
    res.status(500).json({ error: 'فشل جلب الأسعار' });
  }
});

const _feeCache = {};
const FEE_CACHE_TTL = 60 * 60 * 1000;

app.get('/api/ecotrack/fee/:wilaya_id', async (req, res) => {
  try {
    const wilayaId = String(req.params.wilaya_id).replace(/[^0-9]/g, '');
    if (!wilayaId) return res.status(400).json({ error: 'wilaya_id مطلوب' });
    const cached = _feeCache[wilayaId];
    if (cached && Date.now() - cached.at < FEE_CACHE_TTL) return res.json(cached.data);

    const s = await getSettings();
    const baseUrl = (s.ecotrack_base_url || 'https://anderson-ecommerce.ecotrack.dz').replace(/\/$/, '');
    const token = (s.ecotrack_token || '').trim();
    if (!token) {
      const fallback = parseFloat(s.delivery_pricing || '350');
      return res.json({ home: fallback, stop_desk: fallback, stop_desk_available: true, source: 'fallback' });
    }

    const r = await fetch(`${baseUrl}/api/v1/get/fees?api_token=${encodeURIComponent(token)}&wilaya_id=${wilayaId}`);
    const t = await r.text();
    let j = null; try { j = JSON.parse(t); } catch {}

    let homeFee = null, stopDeskFee = null, stopDeskAvailable = false;
    function parseRow(row) {
      if (!row) return;
      homeFee = parseFloat(row.tarif || row.homeDeliveryPrice || row.price || row.fee || row.montant || 0);
      stopDeskFee = parseFloat(row.tarif_stopdesk || row.stopDeskPrice || row.stop_desk_price || 0) || null;
      stopDeskAvailable = !!(row.has_stop_desk || row.stop_desk || stopDeskFee);
    }

    if (j && typeof j === 'object' && !Array.isArray(j)) {
      const arr = j.livraison || j.data || (Array.isArray(j) ? j : null);
      if (Array.isArray(arr)) {
        const row = arr.find(r => String(r.wilaya_id || '') === wilayaId) || arr[0];
        parseRow(row);
      }
    } else if (Array.isArray(j) && j.length > 0) {
      const row = j.find(r => String(r.wilaya_id || '') === wilayaId) || j[0];
      parseRow(row);
    }

    if (!homeFee || homeFee <= 0) {
      try {
        const fees = JSON.parse(s.delivery_fees || '{}');
        if (fees[wilayaId]) homeFee = parseFloat(fees[wilayaId]);
      } catch {}
    }
    if (!homeFee || homeFee <= 0) homeFee = parseFloat(s.delivery_pricing || '350');

    const result = { home: homeFee, stop_desk: stopDeskFee || homeFee, stop_desk_available: stopDeskAvailable, source: 'ecotrack' };
    _feeCache[wilayaId] = { data: result, at: Date.now() };
    return res.json(result);
  } catch (e) {
    const s = await getSettings();
    const fallback = parseFloat(s.delivery_pricing || '350');
    return res.json({ home: fallback, stop_desk: fallback, stop_desk_available: true, source: 'fallback' });
  }
});

// ---------- Auth ----------
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'تسجيل الدخول غير مكتمل.' });
    const user = await dbGet('SELECT * FROM users WHERE email = $1', [String(email).toLowerCase()]);
    if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة.' });
    }
    res.json({ token: signToken(user), user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

// ---------- Upload ----------
app.post('/api/upload', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'لم يتم رفع أي ملف.' });
  try {
    if (process.env.CLOUDINARY_URL) {
      const b64 = req.file.buffer.toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'alam-alabtal',
        transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }]
      });
      return res.json({ url: result.secure_url });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
  } catch (e) {
    console.error('[UPLOAD] Error:', e.message);
    res.status(500).json({ error: 'فشل رفع الملف.' });
  }
});

// ---------- Categories ----------
app.get('/api/categories', async (req, res) => {
  try {
    const { all } = req.query;
    const rows = all
      ? await dbAll('SELECT * FROM categories ORDER BY sort_order, name')
      : await dbAll('SELECT * FROM categories WHERE enabled = 1 ORDER BY sort_order, name');
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.post('/api/categories', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, image, sort_order, enabled } = req.body;
    if (!name) return res.status(400).json({ error: 'اسم التصنيف مطلوب.' });
    const slug = slugify(name) + '-' + Date.now().toString(36);
    const result = await dbRun(
      'INSERT INTO categories (name, slug, description, image, enabled, sort_order) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [name, slug, description || '', image || '', enabled === undefined ? 1 : (enabled ? 1 : 0), sort_order || 0]
    );
    res.json(await dbGet('SELECT * FROM categories WHERE id = $1', [result.id]));
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.put('/api/categories/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, image, enabled, sort_order } = req.body;
    const existing = await dbGet('SELECT * FROM categories WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'التصنيف غير موجود.' });
    await dbRun(
      'UPDATE categories SET name = $1, description = $2, image = $3, enabled = $4, sort_order = $5 WHERE id = $6',
      [name ?? existing.name, description ?? existing.description, image ?? existing.image,
       enabled === undefined ? existing.enabled : (enabled ? 1 : 0), sort_order ?? existing.sort_order, existing.id]
    );
    res.json(await dbGet('SELECT * FROM categories WHERE id = $1', [existing.id]));
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.delete('/api/categories/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await dbRun('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

// ---------- Products ----------
function productQuery() {
  return `
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
  `;
}

app.get('/api/products', async (req, res) => {
  try {
    const { q, category, min, max, age, available, sort, includeDisabled } = req.query;
    let sql = productQuery();
    const conds = [];
    const params = [];
    let paramIdx = 1;

    if (!includeDisabled) conds.push('p.enabled = 1');
    if (q) {
      conds.push(`(p.name ILIKE $${paramIdx} OR p.short_description ILIKE $${paramIdx} OR p.description ILIKE $${paramIdx} OR p.keywords ILIKE $${paramIdx} OR c.name ILIKE $${paramIdx})`);
      params.push(`%${q}%`); paramIdx++;
    }
    if (category) {
      conds.push(`c.slug = $${paramIdx}`); params.push(category); paramIdx++;
    }
    if (min) { conds.push(`p.price >= $${paramIdx}`); params.push(Number(min)); paramIdx++; }
    if (max) { conds.push(`p.price <= $${paramIdx}`); params.push(Number(max)); paramIdx++; }
    if (age) { conds.push(`p.recommended_age ILIKE $${paramIdx}`); params.push(`%${age}%`); paramIdx++; }
    if (available === 'true') conds.push('p.stock > 0');

    if (conds.length) sql += ' WHERE ' + conds.join(' AND ');

    const sorters = {
      newest: 'p.created_at DESC, p.id DESC',
      price_asc: 'p.price ASC',
      price_desc: 'p.price DESC',
      bestseller: 'p.is_bestseller DESC, p.created_at DESC'
    };
    sql += ' ORDER BY ' + (sorters[sort] || sorters.bestseller);

    const rows = await dbAll(sql, params);
    const threshold = await lowStockThreshold();
    const result = rows.map(p => ({
      ...publicProduct(p),
      is_low_stock: p.stock > 0 && p.stock <= threshold ? 1 : 0
    }));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.get('/api/products/:slugOrId', async (req, res) => {
  try {
    const param = req.params.slugOrId;
    const row = /^\d+$/.test(param)
      ? await dbGet(productQuery() + ' WHERE p.id = $1', [Number(param)])
      : await dbGet(productQuery() + ' WHERE p.slug = $1', [param]);
    if (!row) return res.status(404).json({ error: 'المنتج غير موجود.' });
    res.json(await productWithImages(row));
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.post('/api/products', requireAuth, requireAdmin, async (req, res) => {
  try {
    const p = req.body;
    if (!p.name || p.price === undefined) return res.status(400).json({ error: 'الاسم والسعر مطلوبان.' });
    const slug = slugify(p.name) + '-' + Date.now().toString(36);
    const result = await dbRun(`
      INSERT INTO products (name, slug, short_description, description, price, old_price, stock, category_id,
        recommended_age, is_new, is_bestseller, is_featured, enabled, image, keywords, specifications, features, sizes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id
    `, [p.name, slug, p.short_description || '', p.description || '',
      Number(p.price) || 0, p.old_price ? Number(p.old_price) : null,
      Number(p.stock) || 0, p.category_id || null,
      p.recommended_age || '', p.is_new ? 1 : 0, p.is_bestseller ? 1 : 0,
      p.is_featured ? 1 : 0, p.enabled === undefined ? 1 : (p.enabled ? 1 : 0),
      p.image || '', p.keywords || '',
      (p.specifications || []).join('\n'), (p.features || []).join('\n'),
      Array.isArray(p.sizes) ? JSON.stringify(p.sizes) : (p.sizes || '')
    ]);
    const id = result.id;
    if (Array.isArray(p.images)) {
      for (let i = 0; i < p.images.length; i++) {
        await dbRun('INSERT INTO product_images (product_id, image, sort_order) VALUES ($1, $2, $3)', [id, p.images[i], i]);
      }
    }
    const created = await dbGet(productQuery() + ' WHERE p.id = $1', [id]);
    res.json(await productWithImages(created));
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.put('/api/products/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const existing = await dbGet('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'المنتج غير موجود.' });
    const p = req.body;
    await dbRun(`
      UPDATE products SET name = $1, short_description = $2, description = $3,
        price = $4, old_price = $5, stock = $6, category_id = $7,
        recommended_age = $8, is_new = $9, is_bestseller = $10,
        is_featured = $11, enabled = $12, image = $13, keywords = $14,
        specifications = $15, features = $16, sizes = $17
      WHERE id = $18
    `, [
      p.name ?? existing.name, p.short_description ?? existing.short_description,
      p.description ?? existing.description, p.price !== undefined ? Number(p.price) : existing.price,
      p.old_price !== undefined ? (p.old_price ? Number(p.old_price) : null) : existing.old_price,
      p.stock !== undefined ? Number(p.stock) : existing.stock,
      p.category_id ?? existing.category_id, p.recommended_age ?? existing.recommended_age,
      p.is_new ? 1 : (existing.is_new ? 1 : 0), p.is_bestseller ? 1 : (existing.is_bestseller ? 1 : 0),
      p.is_featured ? 1 : (existing.is_featured ? 1 : 0),
      p.enabled === undefined ? existing.enabled : (p.enabled ? 1 : 0),
      p.image ?? existing.image, p.keywords ?? existing.keywords,
      Array.isArray(p.specifications) ? p.specifications.join('\n') : (p.specifications ?? existing.specifications),
      Array.isArray(p.features) ? p.features.join('\n') : (p.features ?? existing.features),
      Array.isArray(p.sizes) ? JSON.stringify(p.sizes) : (p.sizes !== undefined ? p.sizes : existing.sizes),
      existing.id
    ]);
    if (Array.isArray(p.images)) {
      await dbRun('DELETE FROM product_images WHERE product_id = $1', [existing.id]);
      for (let i = 0; i < p.images.length; i++) {
        await dbRun('INSERT INTO product_images (product_id, image, sort_order) VALUES ($1, $2, $3)', [existing.id, p.images[i], i]);
      }
    }
    const updated = await dbGet(productQuery() + ' WHERE p.id = $1', [existing.id]);
    res.json(await productWithImages(updated));
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.delete('/api/products/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await dbRun('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

// ---------- Orders ----------
async function generateOrderNumber() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const countResult = await dbGet('SELECT COUNT(*) as c FROM orders');
  const count = countResult.c + 1;
  return `AA-${y}${m}-${String(count).padStart(4, '0')}`;
}

app.post('/api/orders', orderLimiter, async (req, res) => {
  try {
    const { customer_name, phone, wilaya, commune, address, items, stop_desk } = req.body;
    if (!customer_name || !phone || !wilaya || !commune || !address) {
      return res.status(400).json({ error: 'الرجاء تعبئة جميع الحقول المطلوبة.' });
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return res.status(400).json({ error: 'سلتك فارغة أو بها أكثر من 50 منتج.' });
    }
    const phoneClean = String(phone).replace(/[^0-9]/g, '');
    if (!/^(0|00|\+)?(5|6|7)\d{8}$/.test(phoneClean)) {
      return res.status(400).json({ error: 'الرجاء إدخال رقم هاتف صحيح.' });
    }

    const verifiedItems = [];
    for (const item of items) {
      const name = String(item.product_name || '').slice(0, 500);
      const qty = Math.min(Math.max(1, Number(item.quantity) || 1), 100);
      let price = Number(item.unit_price) || 0;
      if (item.product_id) {
        const product = await dbGet('SELECT price FROM products WHERE id = $1', [item.product_id]);
        if (product) price = product.price;
      }
      verifiedItems.push({ ...item, product_name: name, quantity: qty, unit_price: price, selected_size: item.selected_size || null });
    }

    const settings = await getSettings();
    let deliveryCost = parseFloat(settings.delivery_pricing || '350');
    let deliverySource = 'default';
    try {
      const fees = JSON.parse(settings.delivery_fees || '{}');
      const m = String(wilaya || '').match(/\d+/);
      const code = m ? m[0] : '';
      if (code && fees[code] !== undefined) {
        const feeVal = fees[code];
        if (typeof feeVal === 'object' && feeVal !== null) {
          deliveryCost = stop_desk ? parseFloat(feeVal.stop_desk || feeVal.home || '350') : parseFloat(feeVal.home || '350');
        } else {
          deliveryCost = parseFloat(feeVal);
        }
        deliverySource = 'ecotrack';
      }
    } catch {}
    const itemsTotal = verifiedItems.reduce((s, i) => s + (Number(i.unit_price) * Number(i.quantity)), 0);
    const freeOver = parseFloat(settings.shipping_free_over || '0');
    if (freeOver > 0 && itemsTotal >= freeOver) deliveryCost = 0;
    const total = itemsTotal + deliveryCost;

    let customer = await dbGet('SELECT * FROM customers WHERE phone = $1 AND name = $2', [phoneClean, customer_name]);
    if (!customer) {
      const custResult = await dbRun('INSERT INTO customers (name, phone, wilaya, commune, address) VALUES ($1, $2, $3, $4, $5) RETURNING id', [customer_name, phoneClean, wilaya, commune, address]);
      customer = { id: custResult.id };
    }

    const sd = stop_desk ? 1 : 0;
    const orderResult = await dbRun(`
      INSERT INTO orders (order_number, customer_name, phone, wilaya, commune, address, items_total, delivery_cost, total, status, customer_id, stop_desk)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'new', $10, $11) RETURNING id
    `, [await generateOrderNumber(), customer_name, phoneClean, wilaya, commune, address, itemsTotal, deliveryCost, total, customer.id, sd]);

    const orderId = orderResult.id;
    for (const item of verifiedItems) {
      await dbRun(
        'INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, image, product_snapshot) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [orderId, item.product_id || null, item.product_name, Number(item.unit_price), Number(item.quantity), item.image || null, JSON.stringify(item) || null]
      );
    }

    const order = await dbGet('SELECT * FROM orders WHERE id = $1', [orderId]);

    const sheetsUrl = (settings.google_sheets_url || '').trim();
    if (sheetsUrl) {
      const payload = {
        order_number: order.order_number, timestamp: order.created_at,
        customer_name, phone: phoneClean, wilaya, commune, address,
        items: verifiedItems.map(i => `${i.product_name} x${i.quantity} (${i.unit_price} دج)`).join(' | '),
        items_total: itemsTotal, delivery_cost: deliveryCost, total, status: 'new'
      };
      fetch(sheetsUrl, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload)
      }).then(async r => {
        const text = await r.text().catch(() => '');
        if (!r.ok || text.includes('<!DOCTYPE')) console.error('[Sheets] Forward failed.', r.status);
        else console.log('[Sheets] Order forwarded:', order.order_number);
      }).catch(err => console.error('[Sheets] Fetch error:', err.message));
    }

    res.json({ order, delivery_cost: deliveryCost, items_total: itemsTotal, total });
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.get('/api/orders', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let rows;
    if (status) rows = await dbAll('SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC', [String(status)]);
    else rows = await dbAll('SELECT * FROM orders ORDER BY created_at DESC');
    const out = [];
    for (const o of rows) {
      const items = await dbAll('SELECT * FROM order_items WHERE order_id = $1', [o.id]);
      out.push({ ...o, items });
    }
    res.json(out);
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.put('/api/orders/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['new', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];
    const order = await dbGet('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود.' });
    if (!allowed.includes(status)) return res.status(400).json({ error: 'حالة غير صالحة.' });

    if (status === 'confirmed' && order.status !== 'confirmed' && order.status !== 'cancelled') {
      const items = await dbAll('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
      for (const item of items) {
        if (item.product_id) await dbRun('UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2', [item.quantity, item.product_id]);
      }
    }
    if (status === 'cancelled' && (order.status === 'confirmed' || order.status === 'preparing' || order.status === 'shipped')) {
      const items = await dbAll('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
      for (const item of items) {
        if (item.product_id) await dbRun('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
      }
    }

    await dbRun('UPDATE orders SET status = $1 WHERE id = $2', [status, order.id]);
    const updated = await dbGet('SELECT * FROM orders WHERE id = $1', [order.id]);

    if (status === 'confirmed') {
      pushOrderToEcotrack(updated).then(result => {
        if (result && result.ok) console.log('[Ecotrack] Pushed order', updated.order_number, result.tracking || '');
        else if (result && !result.skipped) console.error('[Ecotrack] Push failed for', updated.order_number, result.error);
      }).catch(e => console.error('[Ecotrack] Push exception', e.message));
    }

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.post('/api/orders/:id/push-ecotrack', requireAuth, requireAdmin, async (req, res) => {
  try {
    const order = await dbGet('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود.' });
    const result = await pushOrderToEcotrack(order);
    if (result.ok) return res.json({ ok: true, tracking: result.tracking, order: await dbGet('SELECT * FROM orders WHERE id = $1', [order.id]) });
    return res.status(500).json({ error: 'فشل الرفع إلى Ecotrack' });
  } catch (e) {
    res.status(500).json({ error: 'فشل: ' + (e.message || String(e)) });
  }
});

// ---------- Customers ----------
app.get('/api/customers', requireAuth, requireAdmin, async (req, res) => {
  try {
    const rows = await dbAll(`
      SELECT c.*,
        (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) as order_count,
        (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.customer_id = c.id AND o.status != 'cancelled') as total_spent,
        (SELECT MAX(o.created_at) FROM orders o WHERE o.customer_id = c.id) as last_order_at
      FROM customers c ORDER BY c.created_at DESC
    `);
    const out = [];
    for (const c of rows) {
      const ordersRaw = await dbAll('SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC', [c.id]);
      const orders = [];
      for (const o of ordersRaw) {
        const items = await dbAll('SELECT * FROM order_items WHERE order_id = $1', [o.id]);
        orders.push({ ...o, items });
      }
      out.push({ ...c, orders });
    }
    res.json(out);
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.post('/api/customers', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, phone, wilaya, commune, address } = req.body;
    if (!name || !phone || !wilaya || !commune) {
      return res.status(400).json({ error: 'الاسم الكامل، رقم الهاتف، الولاية والبلدية مطلوبة.' });
    }
    const phoneClean = String(phone).replace(/[^0-9]/g, '');
    if (!/^(0|00|\+)?(5|6|7)\d{8}$/.test(phoneClean)) {
      return res.status(400).json({ error: 'الرجاء إدخال رقم هاتف صحيح.' });
    }
    const result = await dbRun('INSERT INTO customers (name, phone, wilaya, commune, address) VALUES ($1,$2,$3,$4,$5) RETURNING id', [name.trim(), phoneClean, wilaya, commune, address || '']);
    res.json(await dbGet('SELECT * FROM customers WHERE id = $1', [result.id]));
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

// ---------- Reviews ----------
app.get('/api/reviews', async (req, res) => {
  try {
    const { approved, product } = req.query;
    let rows;
    if (approved === 'true') {
      rows = await dbAll('SELECT * FROM reviews WHERE approved = 1 ORDER BY created_at DESC');
    } else {
      rows = await dbAll('SELECT * FROM reviews ORDER BY created_at DESC');
    }
    const allProducts = await dbAll('SELECT id, name FROM products');
    const productNames = {};
    for (const p of allProducts) productNames[p.id] = p.name;
    res.json(rows.map(r => ({ ...r, product_name: r.product_id ? (productNames[r.product_id] || '') : '' })));
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.post('/api/reviews', reviewLimiter, async (req, res) => {
  try {
    const { customer_name, rating, comment, product_id } = req.body;
    if (!customer_name || !rating || !comment) return res.status(400).json({ error: 'جميع الحقول مطلوبة.' });
    const r = Number(rating);
    if (r < 1 || r > 5) return res.status(400).json({ error: 'التقييم يجب أن يكون بين 1 و 5.' });
    const result = await dbRun('INSERT INTO reviews (customer_name, rating, comment, product_id, verified, approved) VALUES ($1,$2,$3,$4,0,0) RETURNING id', [customer_name, r, comment, product_id || null]);
    res.json(await dbGet('SELECT * FROM reviews WHERE id = $1', [result.id]));
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.put('/api/reviews/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { customer_name, rating, comment, verified, approved, product_id } = req.body;
    const existing = await dbGet('SELECT * FROM reviews WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'التقييم غير موجود.' });
    await dbRun(
      'UPDATE reviews SET customer_name = $1, rating = $2, comment = $3, verified = $4, approved = $5, product_id = $6 WHERE id = $7',
      [customer_name ?? existing.customer_name, rating ?? existing.rating, comment ?? existing.comment,
       verified === undefined ? existing.verified : (verified ? 1 : 0),
       approved === undefined ? existing.approved : (approved ? 1 : 0),
       product_id === undefined ? existing.product_id : product_id, existing.id]
    );
    res.json(await dbGet('SELECT * FROM reviews WHERE id = $1', [existing.id]));
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.delete('/api/reviews/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await dbRun('DELETE FROM reviews WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

// ---------- Stats / Overview ----------
app.get('/api/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const totalOrders = (await dbGet('SELECT COUNT(*) as c FROM orders')).c;
    const totalSales = (await dbGet("SELECT COALESCE(SUM(total),0) as s FROM orders WHERE status NOT IN ('cancelled', 'new')")).s;
    const newOrders = (await dbGet("SELECT COUNT(*) as c FROM orders WHERE status = 'new'")).c;
    const delivered = (await dbGet("SELECT COUNT(*) as c FROM orders WHERE status = 'delivered'")).c;
    const cancelled = (await dbGet("SELECT COUNT(*) as c FROM orders WHERE status = 'cancelled'")).c;
    const totalProducts = (await dbGet('SELECT COUNT(*) as c FROM products')).c;
    const threshold = await lowStockThreshold();
    const lowStock = (await dbGet('SELECT COUNT(*) as c FROM products WHERE stock <= $1', [threshold])).c;
    const recentOrders = await dbAll('SELECT * FROM orders ORDER BY created_at DESC LIMIT 7');
    const salesByDay = await dbAll(`
      SELECT substr(created_at::text, 1, 10) as day, COALESCE(SUM(total),0) as total, COUNT(*) as orders
      FROM orders WHERE status != 'cancelled' GROUP BY day ORDER BY day DESC LIMIT 10
    `);
    res.json({ totalOrders, totalSales, newOrders, delivered, cancelled, totalProducts, lowStock, recentOrders, salesByDay });
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

// ---------- Messages / Contact ----------
app.post('/api/contact', contactLimiter, async (req, res) => {
  const { name, phone, message } = req.body;
  if (!name || !phone || !message) return res.status(400).json({ error: 'الرجاء تعبئة جميع الحقول.' });
  await dbRun('INSERT INTO messages (name, phone, message) VALUES ($1, $2, $3)', [name, phone, message]);
  res.json({ ok: true });
});

// ---------- SEO / static ----------
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send('User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: /sitemap.xml\n');
});

app.get('/sitemap.xml', async (req, res) => {
  try {
    const base = `${req.protocol}://${req.get('host')}`;
    const products = await dbAll('SELECT slug FROM products WHERE enabled = 1');
    const cats = await dbAll('SELECT slug FROM categories WHERE enabled = 1');
    const urls = [
      `${base}/`, `${base}/products`, `${base}/about`, `${base}/contact`, `${base}/faq`,
      ...cats.map(c => `${base}/products?category=${c.slug}`),
      ...products.map(p => `${base}/product/${p.slug}`)
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>`;
    res.type('application/xml').send(xml);
  } catch {
    res.type('application/xml').send('<?xml version="1.0"?><urlset/>');
  }
});

app.get('/logout', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Logout</title></head><body><script>
localStorage.removeItem('admin_token');
window.location.href = '/admin';
</script></body></html>`);
});

const webDist = path.join(__dirname, '..', 'web', 'dist');
if (fs.existsSync(path.join(webDist, 'index.html'))) {
  app.use(express.static(webDist));
  app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  next();
});

app.listen(PORT, async () => {
  console.log(`Alam Al-Abtal Al-Sighar server running on http://localhost:${PORT}`);

  try {
    await initDB();
    const result = await seed();
    console.log(`Seed: ${result}`);
  } catch (e) {
    console.error('[STARTUP] DB init/seed failed:', e.message);
  }

  if (!process.env.ADMIN_PASSWORD) {
    console.log('[WARNING] Set ADMIN_PASSWORD env var to change the default admin password.');
  }

  try {
    const s = await getSettings();
    const token = (s.ecotrack_token || '').trim();
    if (token) {
      const fees = JSON.parse(s.delivery_fees || '{}');
      const firstFee = fees['1'];
      if (!firstFee || typeof firstFee === 'number') {
        console.log('[STARTUP] Auto-fetching Ecotrack fees...');
        const baseUrl = (s.ecotrack_base_url || 'https://anderson-ecommerce.ecotrack.dz').replace(/\/$/, '');
        const r = await fetch(`${baseUrl}/api/v1/get/fees?api_token=${encodeURIComponent(token)}`);
        const j = await r.json();
        const feesMap = {};
        const arr = j.livraison || (Array.isArray(j) ? j : null);
        if (Array.isArray(arr)) {
          arr.forEach(item => {
            const code = String(item.wilaya_id || '');
            const home = parseFloat(item.tarif || '0');
            const sd = parseFloat(item.tarif_stopdesk || '0');
            if (code && home > 0) feesMap[code] = { home: String(home), stop_desk: sd > 0 ? String(sd) : String(home) };
          });
        }
        if (Object.keys(feesMap).length) {
          await updateSettings({ delivery_fees: JSON.stringify(feesMap) });
          console.log(`[STARTUP] Auto-fetched fees for ${Object.keys(feesMap).length} wilayas`);
        }
      }
    }
  } catch (e) {
    console.log('[STARTUP] Auto-fetch fees failed:', e.message);
  }
});
