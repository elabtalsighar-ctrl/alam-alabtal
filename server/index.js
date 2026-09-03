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
import { db, getSettings, updateSettings } from './db.js';
import { seed, slugify } from './seed.js';
import { pushOrderToEcotrack, testEcotrackConnection } from './ecotrack.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

if (!process.env.JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET environment variable is required. Generate one with: openssl rand -hex 32');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
const UPLOAD_DIR = path.join('/tmp', 'alam-uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- Security middleware ----------
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || false,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static('/tmp/alam-uploads'));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many login attempts. Try again later.' } });
const orderLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many orders. Try again later.' } });
const reviewLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many reviews. Try again later.' } });
const contactLimiter = rateLimit({ windowMs: 60 * 1000, max: 3, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many messages. Try again later.' } });

// ---------- Auth helpers ----------
function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, email, role, name FROM users WHERE id = ?').get(payload.id);
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

// ---------- Uploads ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only images allowed'));
  }
});

// ---------- Public helpers ----------
function publicProduct(p) {
  return {
    ...p,
    specifications: p.specifications ? p.specifications.split('\n').filter(Boolean) : [],
    features: p.features ? p.features.split('\n').filter(Boolean) : []
  };
}

function productWithImages(p) {
  const images = db.prepare('SELECT image FROM product_images WHERE product_id = ? ORDER BY sort_order, id').all(p.id).map(r => r.image);
  return { ...publicProduct(p), images };
}

const LOW_STOCK_CACHE = { value: null, at: 0 };
function lowStockThreshold() {
  const now = Date.now();
  if (LOW_STOCK_CACHE.value !== null && now - LOW_STOCK_CACHE.at < 5000) return LOW_STOCK_CACHE.value;
  LOW_STOCK_CACHE.value = parseInt(getSettings().low_stock_threshold || '5', 10);
  LOW_STOCK_CACHE.at = now;
  return LOW_STOCK_CACHE.value;
}

// ---------- Settings ----------
const PUBLIC_SETTINGS_KEYS = [
  'store_name', 'store_name_en', 'store_description', 'logo',
  'whatsapp_number', 'whatsapp_message', 'contact_phone', 'contact_email',
  'instagram_url', 'facebook_url', 'tiktok_url',
  'delivery_pricing', 'delivery_time', 'delivery_info', 'shipping_free_over',
  'delivery_fees', 'low_stock_threshold',
  'ecotrack_enabled', 'ecotrack_base_url',
  'google_sheets_url', 'faq_content', 'facebook_pixel_id'
];

app.get('/api/settings', (req, res) => {
  try {
    const all = getSettings();
    const safe = {};
    for (const key of PUBLIC_SETTINGS_KEYS) {
      if (all[key] !== undefined) safe[key] = all[key];
    }
    res.json(safe);
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.get('/api/admin/settings', requireAuth, requireAdmin, (req, res) => {
  try {
    res.json(getSettings());
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.put('/api/settings', requireAuth, requireAdmin, (req, res) => {
  try {
    res.json(updateSettings(req.body));
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.post('/api/settings/test-sheets', requireAuth, requireAdmin, async (req, res) => {
  try {
    const sheetsUrl = (getSettings().google_sheets_url || '').trim();
    if (!sheetsUrl) return res.status(400).json({ error: 'لم يتم ضبط رابط Google Sheets.' });
    const testPayload = {
      order_number: 'TEST-' + Date.now(),
      timestamp: new Date().toISOString(),
      customer_name: 'اختبار الاتصال',
      phone: '0796389228',
      wilaya: '16 - الجزائر',
      commune: 'باب الزوار',
      address: 'اختبار',
      items: 'اختبار x1',
      items_total: 1000,
      delivery_cost: 350,
      total: 1350,
      status: 'new'
    };
    const r = await fetch(sheetsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(testPayload)
    });
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

// Public proxy for communes/wilayas (used by checkout)
app.get('/api/ecotrack/wilayas', async (req, res) => {
  try {
    const { baseUrl, token } = (() => { const s=getSettings(); return { baseUrl:(s.ecotrack_base_url||'https://anderson-ecommerce.ecotrack.dz').replace(/\/$/,''), token:(s.ecotrack_token||'').trim() }; })();
    if (!token) return res.status(400).json({ error: 'Ecotrack غير مُعرف' });
    const r = await fetch(`${baseUrl}/api/v1/get/wilayas?api_token=${encodeURIComponent(token)}`);
    const t = await r.text();
    let j=null; try{ j=JSON.parse(t);}catch{}
    if (j) return res.json(j);
    return res.status(500).json({ error: 'فشل جلب الولايات' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ecotrack/communes', async (req, res) => {
  try {
    const wilaya_id = String(req.query.wilaya_id || '').replace(/[^0-9]/g,'');
    if (!wilaya_id) return res.status(400).json({ error: 'wilaya_id مطلوب' });
    const { baseUrl, token } = (() => { const s=getSettings(); return { baseUrl:(s.ecotrack_base_url||'https://anderson-ecommerce.ecotrack.dz').replace(/\/$/,''), token:(s.ecotrack_token||'').trim() }; })();
    if (!token) return res.status(400).json({ error: 'Ecotrack غير مُعرف' });
    const r = await fetch(`${baseUrl}/api/v1/get/communes?api_token=${encodeURIComponent(token)}&wilaya_id=${wilaya_id}`);
    const t = await r.text();
    let j=null; try{ j=JSON.parse(t);}catch{}
    if (Array.isArray(j)) return res.json(j);
    if (j) return res.json(j);
    return res.status(500).json({ error: 'فشل جلب البلديات' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ecotrack/fees', async (req, res) => {
  try {
    const s = getSettings();
    const baseUrl = (s.ecotrack_base_url || 'https://anderson-ecommerce.ecotrack.dz').replace(/\/$/, '');
    const token = (s.ecotrack_token || '').trim();
    if (!token) {
      return res.json({ fees: {}, _debug: 'no_token' });
    }
    const url = `${baseUrl}/api/v1/get/fees?api_token=${encodeURIComponent(token)}`;
    const r = await fetch(url);
    const t = await r.text();
    let j = null;
    try { j = JSON.parse(t); } catch {}
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
    const s = getSettings();
    const baseUrl = (s.ecotrack_base_url || 'https://anderson-ecommerce.ecotrack.dz').replace(/\/$/, '');
    const token = (req.body.token || s.ecotrack_token || '').trim();
    if (!token) return res.status(400).json({ error: 'أدخل Token Ecotrack أولاً' });
    const url = `${baseUrl}/api/v1/get/fees?api_token=${encodeURIComponent(token)}`;
    const r = await fetch(url);
    const t = await r.text();
    let j = null;
    try { j = JSON.parse(t); } catch {}
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
      updateSettings({ ecotrack_token: token, delivery_fees: JSON.stringify(feesMap) });
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
    if (cached && Date.now() - cached.at < FEE_CACHE_TTL) {
      return res.json(cached.data);
    }

    const { baseUrl, token } = (() => { const s=getSettings(); return { baseUrl:(s.ecotrack_base_url||'https://anderson-ecommerce.ecotrack.dz').replace(/\/$/,''), token:(s.ecotrack_token||'').trim() }; })();
    if (!token) {
      const fallback = parseFloat(getSettings().delivery_pricing || '350');
      return res.json({ home: fallback, stop_desk: fallback, stop_desk_available: true, source: 'fallback' });
    }

    const r = await fetch(`${baseUrl}/api/v1/get/fees?api_token=${encodeURIComponent(token)}&wilaya_id=${wilayaId}`);
    const t = await r.text();
    let j = null;
    try { j = JSON.parse(t); } catch {}

    let homeFee = null;
    let stopDeskFee = null;
    let stopDeskAvailable = false;

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
      const settings = getSettings();
      try {
        const fees = JSON.parse(settings.delivery_fees || '{}');
        if (fees[wilayaId]) homeFee = parseFloat(fees[wilayaId]);
      } catch {}
    }
    if (!homeFee || homeFee <= 0) {
      homeFee = parseFloat(getSettings().delivery_pricing || '350');
    }

    const result = { home: homeFee, stop_desk: stopDeskFee || homeFee, stop_desk_available: stopDeskAvailable, source: 'ecotrack' };
    _feeCache[wilayaId] = { data: result, at: Date.now() };
    return res.json(result);
  } catch (e) {
    const fallback = parseFloat(getSettings().delivery_pricing || '350');
    return res.json({ home: fallback, stop_desk: fallback, stop_desk_available: true, source: 'fallback' });
  }
});

// ---------- Auth ----------
app.post('/api/auth/login', loginLimiter, (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'تسجيل الدخول غير مكتمل.' });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase());
    if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة.' });
    }
    res.json({ token: signToken(user), user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ---------- Upload ----------
app.post('/api/upload', requireAuth, requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'لم يتم رفع أي ملف.' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ---------- Categories ----------
app.get('/api/categories', (req, res) => {
  try {
    const { all } = req.query;
    const rows = all
      ? db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all()
      : db.prepare('SELECT * FROM categories WHERE enabled = 1 ORDER BY sort_order, name').all();
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.post('/api/categories', requireAuth, requireAdmin, (req, res) => {
  try {
    const { name, description, image, sort_order, enabled } = req.body;
    if (!name) return res.status(400).json({ error: 'اسم التصنيف مطلوب.' });
    const slug = slugify(name) + '-' + Date.now().toString(36);
    const info = db.prepare('INSERT INTO categories (name, slug, description, image, enabled, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
      .run(name, slug, description || '', image || '', enabled === undefined ? 1 : (enabled ? 1 : 0), sort_order || 0);
    res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid));
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.put('/api/categories/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const { name, description, image, enabled, sort_order } = req.body;
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'التصنيف غير موجود.' });
    db.prepare('UPDATE categories SET name = ?, description = ?, image = ?, enabled = ?, sort_order = ? WHERE id = ?')
      .run(name ?? existing.name, description ?? existing.description, image ?? existing.image,
        enabled === undefined ? existing.enabled : (enabled ? 1 : 0), sort_order ?? existing.sort_order, existing.id);
    res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(existing.id));
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.delete('/api/categories/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
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

app.get('/api/products', (req, res) => {
  try {
    const { q, category, min, max, age, available, sort, includeDisabled } = req.query;
    let sql = productQuery();
    const conds = [];
    const params = {};

    if (!includeDisabled) conds.push('p.enabled = 1');
    if (q) {
      conds.push('(p.name LIKE @q OR p.short_description LIKE @q OR p.description LIKE @q OR p.keywords LIKE @q OR c.name LIKE @q)');
      params.q = `%${q}%`;
    }
    if (category) {
      conds.push('c.slug = @category');
      params.category = category;
    }
    if (min) { conds.push('p.price >= @min'); params.min = Number(min); }
    if (max) { conds.push('p.price <= @max'); params.max = Number(max); }
    if (age) { conds.push('p.recommended_age LIKE @age'); params.age = `%${age}%`; }
    if (available === 'true') conds.push('p.stock > 0');

    if (conds.length) sql += ' WHERE ' + conds.join(' AND ');

    const sorters = {
      newest: 'p.created_at DESC, p.id DESC',
      price_asc: 'p.price ASC',
      price_desc: 'p.price DESC',
      bestseller: 'p.is_bestseller DESC, p.created_at DESC'
    };
    const orderClause = sorters[sort] || sorters.bestseller;
    sql += ' ORDER BY ' + orderClause;

    const rows = db.prepare(sql).all(params);
    const threshold = lowStockThreshold();
    // Join with images - single image per product for grid
    const getImage = db.prepare('SELECT image FROM product_images WHERE product_id = ? ORDER BY sort_order, id LIMIT 1');
    const result = rows.map(p => {
      const img = getImage.get(p.id);
      return {
        ...publicProduct(p),
        image: img ? img.image : p.image,
        is_low_stock: p.stock > 0 && p.stock <= threshold ? 1 : 0
      };
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.get('/api/products/:slugOrId', (req, res) => {
  try {
    const param = req.params.slugOrId;
    const row = /^\d+$/.test(param)
      ? db.prepare(productQuery() + ' WHERE p.id = ?').get(Number(param))
      : db.prepare(productQuery() + ' WHERE p.slug = ?').get(param);
    if (!row) return res.status(404).json({ error: 'المنتج غير موجود.' });
    res.json(productWithImages(row));
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.post('/api/products', requireAuth, requireAdmin, (req, res) => {
  try {
    const p = req.body;
    if (!p.name || p.price === undefined) return res.status(400).json({ error: 'الاسم والسعر مطلوبان.' });
    const slug = slugify(p.name) + '-' + Date.now().toString(36);
    const info = db.prepare(`
      INSERT INTO products (name, slug, short_description, description, price, old_price, stock, category_id,
        recommended_age, is_new, is_bestseller, is_featured, enabled, image, keywords, specifications, features)
      VALUES (@name, @slug, @short, @description, @price, @old_price, @stock, @category_id,
        @recommended_age, @is_new, @is_bestseller, @is_featured, @enabled, @image, @keywords, @specifications, @features)
    `).run({
      name: p.name, slug, short: p.short_description || '', description: p.description || '',
      price: Number(p.price) || 0, old_price: p.old_price ? Number(p.old_price) : null,
      stock: Number(p.stock) || 0, category_id: p.category_id || null,
      recommended_age: p.recommended_age || '', is_new: p.is_new ? 1 : 0, is_bestseller: p.is_bestseller ? 1 : 0,
      is_featured: p.is_featured ? 1 : 0, enabled: p.enabled === undefined ? 1 : (p.enabled ? 1 : 0),
      image: p.image || '', keywords: p.keywords || '',
      specifications: (p.specifications || []).join('\n'), features: (p.features || []).join('\n')
    });
    const id = info.lastInsertRowid;
    if (Array.isArray(p.images)) {
      const ins = db.prepare('INSERT INTO product_images (product_id, image, sort_order) VALUES (?, ?, ?)');
      p.images.forEach((img, i) => ins.run(id, img, i));
    }
    const created = db.prepare(productQuery() + ' WHERE p.id = ?').get(id);
    res.json(productWithImages(created));
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.put('/api/products/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'المنتج غير موجود.' });
    const p = req.body;
    db.prepare(`
      UPDATE products SET name = @name, short_description = @short, description = @description,
        price = @price, old_price = @old_price, stock = @stock, category_id = @category_id,
        recommended_age = @recommended_age, is_new = @is_new, is_bestseller = @is_bestseller,
        is_featured = @is_featured, enabled = @enabled, image = @image, keywords = @keywords,
        specifications = @specifications, features = @features
      WHERE id = @id
    `).run({
      id: existing.id, name: p.name ?? existing.name, short: p.short_description ?? existing.short_description,
      description: p.description ?? existing.description, price: p.price !== undefined ? Number(p.price) : existing.price,
      old_price: p.old_price !== undefined ? (p.old_price ? Number(p.old_price) : null) : existing.old_price,
      stock: p.stock !== undefined ? Number(p.stock) : existing.stock,
      category_id: p.category_id ?? existing.category_id, recommended_age: p.recommended_age ?? existing.recommended_age,
      is_new: p.is_new ? 1 : (existing.is_new ? 1 : 0), is_bestseller: p.is_bestseller ? 1 : (existing.is_bestseller ? 1 : 0),
      is_featured: p.is_featured ? 1 : (existing.is_featured ? 1 : 0),
      enabled: p.enabled === undefined ? existing.enabled : (p.enabled ? 1 : 0),
      image: p.image ?? existing.image, keywords: p.keywords ?? existing.keywords,
      specifications: Array.isArray(p.specifications) ? p.specifications.join('\n') : (p.specifications ?? existing.specifications),
      features: Array.isArray(p.features) ? p.features.join('\n') : (p.features ?? existing.features)
    });
    if (Array.isArray(p.images)) {
      db.prepare('DELETE FROM product_images WHERE product_id = ?').run(existing.id);
      const ins = db.prepare('INSERT INTO product_images (product_id, image, sort_order) VALUES (?, ?, ?)');
      p.images.forEach((img, i) => ins.run(existing.id, img, i));
    }
    const updated = db.prepare(productQuery() + ' WHERE p.id = ?').get(existing.id);
    res.json(productWithImages(updated));
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.delete('/api/products/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

// ---------- Orders ----------
function generateOrderNumber() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const count = db.prepare('SELECT COUNT(*) as c FROM orders').get().c + 1;
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

    // Server-side price verification
    const verifiedItems = [];
    for (const item of items) {
      const name = String(item.product_name || '').slice(0, 500);
      const qty = Math.min(Math.max(1, Number(item.quantity) || 1), 100);
      let price = Number(item.unit_price) || 0;
      if (item.product_id) {
        const product = db.prepare('SELECT price FROM products WHERE id = ?').get(item.product_id);
        if (product) price = product.price;
      }
      verifiedItems.push({ ...item, product_name: name, quantity: qty, unit_price: price });
    }

    const settings = getSettings();
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

    // Create/find customer
    let customer = db.prepare('SELECT * FROM customers WHERE phone = ? AND name = ?').get(phoneClean, customer_name);
    if (!customer) {
      customer = db.prepare('INSERT INTO customers (name, phone, wilaya, commune, address) VALUES (?, ?, ?, ?, ?)')
        .run(customer_name, phoneClean, wilaya, commune, address);
      customer = { id: customer.lastInsertRowid };
    }

    const sd = stop_desk ? 1 : 0;
    const info = db.prepare(`
      INSERT INTO orders (order_number, customer_name, phone, wilaya, commune, address, items_total, delivery_cost, total, status, customer_id, stop_desk)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
    `).run(generateOrderNumber(), customer_name, phoneClean, wilaya, commune, address, itemsTotal, deliveryCost, total, customer.id, sd);

    const orderId = info.lastInsertRowid;
    const insItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, image, product_snapshot)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of verifiedItems) {
      insItem.run(orderId, item.product_id || null, item.product_name, Number(item.unit_price), Number(item.quantity), item.image || null, JSON.stringify(item) || null);
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

    // Forward to Google Sheets if configured (fire-and-forget, do not fail order)
    const sheetsUrl = (settings.google_sheets_url || '').trim();
    if (sheetsUrl) {
      const payload = {
        order_number: order.order_number,
        timestamp: order.created_at,
        customer_name, phone: phoneClean, wilaya, commune, address,
        items: verifiedItems.map(i => `${i.product_name} x${i.quantity} (${i.unit_price} دج)`).join(' | '),
        items_total: itemsTotal, delivery_cost: deliveryCost, total,
        status: 'new'
      };
      fetch(sheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      }).then(async r => {
        const text = await r.text().catch(() => '');
        if (!r.ok || text.includes('<!DOCTYPE')) {
          console.error('[Sheets] Forward failed. Status:', r.status, 'Body preview:', text.slice(0, 400));
        } else {
          console.log('[Sheets] Order forwarded:', order.order_number);
        }
      }).catch(err => console.error('[Sheets] Fetch error:', err.message));
    }

    res.json({ order, delivery_cost: deliveryCost, items_total: itemsTotal, total });
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.get('/api/orders', requireAuth, requireAdmin, (req, res) => {
  try {
    const { status } = req.query;
    let rows;
    if (status) rows = db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC').all(String(status));
    else rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
    const getItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    const out = rows.map(o => ({ ...o, items: getItems.all(o.id) }));
    res.json(out);
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.put('/api/orders/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['new', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود.' });
    if (!allowed.includes(status)) return res.status(400).json({ error: 'حالة غير صالحة.' });

    // Inventory update on confirmation
    if (status === 'confirmed' && order.status !== 'confirmed' && order.status !== 'cancelled') {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
      const updateStock = db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?');
      const deduct = db.prepare('SELECT stock FROM products WHERE id = ?');
      for (const item of items) {
        if (item.product_id) {
          const prod = deduct.get(item.product_id);
          if (prod) updateStock.run(item.quantity, item.product_id);
        }
      }
    }
    // Restore stock if cancelled and was confirmed
    if (status === 'cancelled' && (order.status === 'confirmed' || order.status === 'preparing' || order.status === 'shipped')) {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
      const addStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
      for (const item of items) {
        if (item.product_id) addStock.run(item.quantity, item.product_id);
      }
    }

    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, order.id);
    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);

    // Auto-push to Ecotrack when confirmed
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
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود.' });
    const result = await pushOrderToEcotrack(order);
    if (result.ok) return res.json({ ok: true, tracking: result.tracking, order: db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id) });
    return res.status(500).json({ error: 'فشل الرفع إلى Ecotrack' });
  } catch (e) {
    res.status(500).json({ error: 'فشل: ' + (e.message || String(e)) });
  }
});

// ---------- Customers ----------
app.get('/api/customers', requireAuth, requireAdmin, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) as order_count,
        (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.customer_id = c.id AND o.status != 'cancelled') as total_spent,
        (SELECT MAX(o.created_at) FROM orders o WHERE o.customer_id = c.id) as last_order_at
      FROM customers c ORDER BY c.created_at DESC
    `).all();
    const getOrders = db.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC');
    const getItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    const out = rows.map(c => {
      const orders = getOrders.all(c.id).map(o => ({ ...o, items: getItems.all(o.id) }));
      return { ...c, orders };
    });
    res.json(out);
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.post('/api/customers', requireAuth, requireAdmin, (req, res) => {
  try {
    const { name, phone, wilaya, commune, address } = req.body;
    if (!name || !phone || !wilaya || !commune) {
      return res.status(400).json({ error: 'الاسم الكامل، رقم الهاتف، الولاية والبلدية مطلوبة.' });
    }
    const phoneClean = String(phone).replace(/[^0-9]/g, '');
    if (!/^(0|00|\+)?(5|6|7)\d{8}$/.test(phoneClean)) {
      return res.status(400).json({ error: 'الرجاء إدخال رقم هاتف صحيح.' });
    }
    const info = db.prepare('INSERT INTO customers (name, phone, wilaya, commune, address) VALUES (?, ?, ?, ?, ?)')
      .run(name.trim(), phoneClean, wilaya, commune, address || '');
    res.json(db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid));
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

// ---------- Reviews ----------
app.get('/api/reviews', (req, res) => {
  try {
    const { approved, product } = req.query;
    let rows;
    if (approved === 'true') {
      rows = db.prepare('SELECT * FROM reviews WHERE approved = 1 ORDER BY created_at DESC').all();
    } else {
      rows = db.prepare('SELECT * FROM reviews ORDER BY created_at DESC').all();
    }
    const productNames = {};
    const getAll = db.prepare('SELECT id, name FROM products');
    for (const p of getAll.all()) productNames[p.id] = p.name;
    res.json(rows.map(r => ({ ...r, product_name: r.product_id ? (productNames[r.product_id] || '') : '' })));
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.post('/api/reviews', reviewLimiter, (req, res) => {
  try {
    const { customer_name, rating, comment, product_id } = req.body;
    if (!customer_name || !rating || !comment) return res.status(400).json({ error: 'جميع الحقول مطلوبة.' });
    const r = Number(rating);
    if (r < 1 || r > 5) return res.status(400).json({ error: 'التقييم يجب أن يكون بين 1 و 5.' });
    const info = db.prepare('INSERT INTO reviews (customer_name, rating, comment, product_id, verified, approved) VALUES (?, ?, ?, ?, 0, 0)')
      .run(customer_name, r, comment, product_id || null);
    res.json(db.prepare('SELECT * FROM reviews WHERE id = ?').get(info.lastInsertRowid));
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.put('/api/reviews/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const { customer_name, rating, comment, verified, approved, product_id } = req.body;
    const existing = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'التقييم غير موجود.' });
    db.prepare('UPDATE reviews SET customer_name = ?, rating = ?, comment = ?, verified = ?, approved = ?, product_id = ? WHERE id = ?')
      .run(customer_name ?? existing.customer_name, rating ?? existing.rating, comment ?? existing.comment,
        verified === undefined ? existing.verified : (verified ? 1 : 0),
        approved === undefined ? existing.approved : (approved ? 1 : 0),
        product_id === undefined ? existing.product_id : product_id, existing.id);
    res.json(db.prepare('SELECT * FROM reviews WHERE id = ?').get(existing.id));
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

app.delete('/api/reviews/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

// ---------- Stats / Overview ----------
app.get('/api/stats', requireAuth, requireAdmin, (req, res) => {
  try {
    const totalOrders = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
    const totalSales = db.prepare('SELECT COALESCE(SUM(total),0) as s FROM orders WHERE status NOT IN (?, ?)').get('cancelled', 'new').s;
    const newOrders = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'new'").get().c;
    const delivered = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'delivered'").get().c;
    const cancelled = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'cancelled'").get().c;
    const totalProducts = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
    const threshold = lowStockThreshold();
    const lowStock = db.prepare('SELECT COUNT(*) as c FROM products WHERE stock <= ?').get(threshold).c;
    const recentOrders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 7').all();
    // sales per day (last 7 days by date)
    const salesByDay = db.prepare(`
      SELECT substr(created_at, 1, 10) as day, COALESCE(SUM(total),0) as total, COUNT(*) as orders
      FROM orders WHERE status NOT IN ('cancelled') GROUP BY day ORDER BY day DESC LIMIT 10
    `).all();
    res.json({ totalOrders, totalSales, newOrders, delivered, cancelled, totalProducts, lowStock, recentOrders, salesByDay });
  } catch {
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

// ---------- Messages / Contact ----------
app.post('/api/contact', contactLimiter, (req, res) => {
  const { name, phone, message } = req.body;
  if (!name || !phone || !message) return res.status(400).json({ error: 'الرجاء تعبئة جميع الحقول.' });
  // In a full production build this would email/notify the admin. Stored to a table.
  db.prepare('CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, message TEXT, created_at TEXT DEFAULT (datetime("now")))').run();
  db.prepare('INSERT INTO messages (name, phone, message) VALUES (?, ?, ?)').run(name, phone, message);
  res.json({ ok: true });
});

// ---------- SEO / static ----------
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send('User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: /sitemap.xml\n');
});

app.get('/sitemap.xml', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const products = db.prepare('SELECT slug, created_at FROM products WHERE enabled = 1').all();
  const cats = db.prepare('SELECT slug FROM categories WHERE enabled = 1').all();
  const urls = [
    `${base}/`, `${base}/products`, `${base}/about`, `${base}/contact`, `${base}/faq`,
    ...cats.map(c => `${base}/products?category=${c.slug}`),
    ...products.map(p => `${base}/product/${p.slug}`)
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>`;
  res.type('application/xml').send(xml);
});

// Logout page - clears token and redirects to admin
app.get('/logout', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Logout</title></head><body><script>
localStorage.removeItem('admin_token');
window.location.href = '/admin';
</script></body></html>`);
});

// Serve built frontend
const webDist = path.join(__dirname, '..', 'web', 'dist');
if (fs.existsSync(path.join(webDist, 'index.html'))) {
  app.use(express.static(webDist));
  app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: 'حدث خطأ، حاول مرة أخرى.' });
  }
  next();
});

app.listen(PORT, async () => {
  console.log(`Alam Al-Abtal Al-Sighar server running on http://localhost:${PORT}`);
  const result = seed();
  console.log(`Seed: ${result}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log('[WARNING] Set ADMIN_PASSWORD env var to change the default admin password.');
  }

  // Auto-fetch Ecotrack fees on startup if token exists but fees need refresh
  try {
    const s = getSettings();
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
          updateSettings({ delivery_fees: JSON.stringify(feesMap) });
          console.log(`[STARTUP] Auto-fetched fees for ${Object.keys(feesMap).length} wilayas`);
        } else {
          console.log('[STARTUP] No fees returned from Ecotrack');
        }
      } else {
        console.log('[STARTUP] Ecotrack fees already in new format, skipping fetch');
      }
    } else {
      console.log('[STARTUP] No Ecotrack token set, skipping fee fetch');
    }
  } catch (e) {
    console.log('[STARTUP] Auto-fetch fees failed:', e.message);
  }
});
