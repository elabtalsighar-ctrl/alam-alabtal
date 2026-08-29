import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, 'alam.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  image TEXT,
  enabled INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  short_description TEXT DEFAULT '',
  description TEXT DEFAULT '',
  price REAL NOT NULL DEFAULT 0,
  old_price REAL,
  stock INTEGER NOT NULL DEFAULT 0,
  category_id INTEGER,
  recommended_age TEXT,
  is_new INTEGER DEFAULT 0,
  is_bestseller INTEGER DEFAULT 0,
  is_featured INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  image TEXT,
  keywords TEXT DEFAULT '',
  specifications TEXT DEFAULT '',
  features TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  image TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  wilaya TEXT,
  commune TEXT,
  address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  wilaya TEXT NOT NULL,
  commune TEXT NOT NULL,
  address TEXT NOT NULL,
  items_total REAL NOT NULL DEFAULT 0,
  delivery_cost REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  customer_id INTEGER,
  stop_desk INTEGER DEFAULT 0,
  ecotrack_id TEXT DEFAULT '',
  ecotrack_tracking TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  unit_price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  image TEXT,
  product_snapshot TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  product_id INTEGER,
  verified INTEGER DEFAULT 0,
  approved INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  phone TEXT,
  message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

const DEFAULT_SETTINGS = {
  store_name: 'عالم الأبطال الصغار',
  store_name_en: 'Alam Al-Abtal Al-Sighar',
  store_description: 'متجر جزائري للأطفال: منتجات مختارة بعناية تجمع بين المتعة والجودة والخيال.',
  logo: '',
  whatsapp_number: '213550000000',
  whatsapp_message: 'السلام عليكم، حاب نسقسي على أحد المنتجات في عالم الأبطال الصغار.',
  instagram_url: '',
  facebook_url: '',
  tiktok_url: '',
  contact_phone: '0550 00 00 00',
  contact_email: 'contact@example.com',
  delivery_pricing: '350',
  delivery_info: 'التوصيل متوفر لمختلف ولايات الجزائر. تكلفة التوصيل 350 دج لمعظم الولايات.',
  delivery_time: 'من 2 إلى 5 أيام عمل',
  low_stock_threshold: '5',
  shipping_free_over: '0',
  google_sheets_url: '',
  ecotrack_token: '',
  ecotrack_enabled: '0',
  ecotrack_base_url: 'https://anderson-ecommerce.ecotrack.dz',
  facebook_pixel_id: '',
  delivery_fees: JSON.stringify(Object.fromEntries(Array.from({length:58},(_,i)=>[String(i+1), i<8 || [9,10,15,16,19,21,23,25,26,35,42].includes(i+1) ? 400 : 600])))
};

// node:sqlite doesn't support placeholders in INSERT OR IGNORE the same way with bound params? It does.
const insertSetting = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
  insertSetting.run(key, String(value));
}

export function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const row of rows) out[row.key] = row.value;
  return out;
}

export function updateSettings(patch) {
  const stmt = db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`);
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) stmt.run(key, String(value));
  }
  return getSettings();
}
