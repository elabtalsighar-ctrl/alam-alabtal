import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'allow',
  transform: { undefined: null },
  connection: { timeout: 15000 }
});

console.log('[DB] postgres.js connected, DATABASE_URL host:', process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@')[1]?.split(':')[0] : 'NOT SET');

export { sql };

export async function dbGet(sqlQuery, params = []) {
  const rows = await sql.unsafe(sqlQuery, params);
  return rows[0] || null;
}

export async function dbAll(sqlQuery, params = []) {
  return await sql.unsafe(sqlQuery, params);
}

export async function dbRun(sqlQuery, params = []) {
  const rows = await sql.unsafe(sqlQuery, params);
  return { id: rows[0]?.id, rowCount: rows.count || rows.length, rows };
}

export async function initDB() {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      name TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      image TEXT,
      enabled INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      short_description TEXT DEFAULT '',
      description TEXT DEFAULT '',
      price REAL NOT NULL DEFAULT 0,
      old_price REAL,
      stock INTEGER NOT NULL DEFAULT 0,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      recommended_age TEXT,
      is_new INTEGER DEFAULT 0,
      is_bestseller INTEGER DEFAULT 0,
      is_featured INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      image TEXT,
      keywords TEXT DEFAULT '',
      specifications TEXT DEFAULT '',
      features TEXT DEFAULT '',
      sizes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      image TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      wilaya TEXT,
      commune TEXT,
      address TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
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
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      stop_desk INTEGER DEFAULT 0,
      ecotrack_id TEXT DEFAULT '',
      ecotrack_tracking TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      image TEXT,
      product_snapshot TEXT
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      customer_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      verified INTEGER DEFAULT 0,
      approved INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      name TEXT,
      phone TEXT,
      message TEXT,
      created_at TIMESTAMP DEFAULT NOW()
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
    contact_phone: process.env.CONTACT_PHONE || '0796389228',
    contact_email: process.env.CONTACT_EMAIL || 'elabtalsighar@gmail.com',
    delivery_pricing: '350',
    delivery_info: 'التوصيل متوفر لمختلف ولايات الجزائر. تكلفة التوصيل 350 دج لمعظم الولايات.',
    delivery_time: 'من 2 إلى 5 أيام عمل',
    low_stock_threshold: '5',
    shipping_free_over: '0',
    google_sheets_url: '',
    ecotrack_token: process.env.ECOTRACK_TOKEN || '',
    ecotrack_enabled: process.env.ECOTRACK_ENABLED || '0',
    ecotrack_base_url: process.env.ECOTRACK_BASE_URL || 'https://anderson-ecommerce.ecotrack.dz',
    facebook_pixel_id: process.env.FACEBOOK_PIXEL_ID || '',
    delivery_fees: process.env.DELIVERY_FEES || JSON.stringify(Object.fromEntries(Array.from({length:58},(_,i)=>[String(i+1), i<8 || [9,10,15,16,19,21,23,25,26,35,42].includes(i+1) ? 400 : 600])))
  };

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await sql.unsafe('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING', [key, String(value)]);
  }
  console.log('[DB] PostgreSQL initialized');
}

export async function getSettings() {
  const rows = await sql.unsafe('SELECT key, value FROM settings');
  const out = {};
  for (const row of rows) out[row.key] = row.value;
  return out;
}

export async function updateSettings(patch) {
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      await sql.unsafe('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [key, String(value)]);
    }
  }
  return getSettings();
}
