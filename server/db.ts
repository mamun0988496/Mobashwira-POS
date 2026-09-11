import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const dataDir = process.env.USER_DATA || process.env.APPDATA || process.cwd();
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const DB_FILE_PATH = path.join(dataDir, 'shop_database.db');

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;

  const wasmPaths = [
    path.join(__dirname, 'sql-wasm.wasm'),
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'dist-server', 'sql-wasm.wasm'),
    path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
  ];

  let wasmBinary: Buffer | undefined;
  for (const p of wasmPaths) {
    if (fs.existsSync(p)) {
      wasmBinary = fs.readFileSync(p);
      break;
    }
  }

  const SQL = await initSqlJs(wasmBinary ? { wasmBinary } : {});

  if (fs.existsSync(DB_FILE_PATH)) {
    try {
      const filebuffer = fs.readFileSync(DB_FILE_PATH);
      db = new SQL.Database(filebuffer);
      db.run('PRAGMA foreign_keys = ON;');
      initSchema(db);
    } catch (err) {
      console.error('Recreating database:', err);
      try { fs.unlinkSync(DB_FILE_PATH); } catch (e) {}
      db = new SQL.Database();
      db.run('PRAGMA foreign_keys = ON;');
      initSchema(db);
    }
  } else {
    db = new SQL.Database();
    db.run('PRAGMA foreign_keys = ON;');
    initSchema(db);
  }

  saveDb();
  return db;
}

export function saveDb() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE_PATH, buffer);
  } catch (err) {
    console.error('Failed to save DB:', err);
  }
}

function initSchema(database: Database) {
  const schemaSql = [
    'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, role TEXT CHECK(role IN (\'admin\', \'manager\', \'cashier\')) NOT NULL DEFAULT \'cashier\', phone TEXT, active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);',
    'CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);',
    'CREATE TABLE IF NOT EXISTS brands (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);',
    'CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, barcode TEXT UNIQUE NOT NULL, category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL, brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL, purchase_price REAL NOT NULL DEFAULT 0, selling_price REAL NOT NULL DEFAULT 0, wholesale_price REAL NOT NULL DEFAULT 0, stock INTEGER NOT NULL DEFAULT 0, min_stock_alert INTEGER NOT NULL DEFAULT 5, expire_date TEXT, image TEXT, is_stock_alert_sent INTEGER DEFAULT 0, is_expiry_alert_sent INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);',
    'CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT DEFAULT \'\', email TEXT DEFAULT \'\', address TEXT DEFAULT \'\', total_due REAL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);',
    'CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT DEFAULT \'\', email TEXT DEFAULT \'\', address TEXT DEFAULT \'\', company_name TEXT DEFAULT \'\', total_due REAL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);',
    'CREATE TABLE IF NOT EXISTS purchases (id INTEGER PRIMARY KEY AUTOINCREMENT, purchase_no TEXT UNIQUE NOT NULL, supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL, total_amount REAL NOT NULL, paid_amount REAL NOT NULL, due_amount REAL NOT NULL, payment_status TEXT CHECK(payment_status IN (\'paid\', \'partial\', \'due\')) NOT NULL, note TEXT, date TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);',
    'CREATE TABLE IF NOT EXISTS purchase_items (id INTEGER PRIMARY KEY AUTOINCREMENT, purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE, product_id INTEGER REFERENCES products(id) ON DELETE CASCADE, qty INTEGER NOT NULL, unit_price REAL NOT NULL, total_price REAL NOT NULL, expire_date TEXT);',
    'CREATE TABLE IF NOT EXISTS sales (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_no TEXT UNIQUE NOT NULL, customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, subtotal REAL NOT NULL, discount REAL DEFAULT 0, vat REAL DEFAULT 0, total REAL NOT NULL, paid_amount REAL NOT NULL, due_amount REAL NOT NULL, payment_method TEXT CHECK(payment_method IN (\'cash\', \'card\', \'mobile_banking\', \'partial\')) NOT NULL, payment_status TEXT CHECK(payment_status IN (\'paid\', \'partial\', \'due\')) NOT NULL, note TEXT, date TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);',
    'CREATE TABLE IF NOT EXISTS sale_items (id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE, product_id INTEGER REFERENCES products(id) ON DELETE CASCADE, qty INTEGER NOT NULL, unit_price REAL NOT NULL, total_price REAL NOT NULL);',
    'CREATE TABLE IF NOT EXISTS expense_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, description TEXT);',
    'CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, category_id INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL, amount REAL NOT NULL, date TEXT NOT NULL, note TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);',
    'CREATE TABLE IF NOT EXISTS due_payments (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT CHECK(type IN (\'customer\', \'supplier\')) NOT NULL, entity_id INTEGER NOT NULL, amount REAL NOT NULL, payment_method TEXT NOT NULL, note TEXT, date TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);',
    'CREATE TABLE IF NOT EXISTS stock_history (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER REFERENCES products(id) ON DELETE CASCADE, change_type TEXT CHECK(change_type IN (\'purchase\', \'sale\', \'adjustment_add\', \'adjustment_remove\', \'return\')) NOT NULL, qty INTEGER NOT NULL, note TEXT, date TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);',
    'CREATE TABLE IF NOT EXISTS sales_returns (id INTEGER PRIMARY KEY AUTOINCREMENT, return_number TEXT UNIQUE NOT NULL, original_sale_id INTEGER REFERENCES sales(id) ON DELETE RESTRICT, customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL, total_amount REAL NOT NULL, refund_amount REAL NOT NULL DEFAULT 0, adjustment_amount REAL NOT NULL DEFAULT 0, refund_method TEXT CHECK(refund_method IN (\'cash\', \'bkash\', \'nagad\', \'card\', \'due_adjustment\')) NOT NULL, reason TEXT NOT NULL, note TEXT, status TEXT CHECK(status IN (\'completed\', \'cancelled\')) NOT NULL DEFAULT \'completed\', created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, date TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);',
    'CREATE TABLE IF NOT EXISTS sales_return_items (id INTEGER PRIMARY KEY AUTOINCREMENT, return_id INTEGER REFERENCES sales_returns(id) ON DELETE CASCADE, sale_item_id INTEGER REFERENCES sale_items(id) ON DELETE SET NULL, product_id INTEGER REFERENCES products(id) ON DELETE RESTRICT, quantity INTEGER NOT NULL, unit_price REAL NOT NULL, discount REAL DEFAULT 0, return_amount REAL NOT NULL);',
    'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);',
    'CREATE TABLE IF NOT EXISTS backups (id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT NOT NULL, file_size INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);'
  ];

  for (const sql of schemaSql) {
    try { database.run(sql); } catch (e) {}
  }

  try { database.run('ALTER TABLE products ADD COLUMN is_stock_alert_sent INTEGER DEFAULT 0;'); } catch (e) {}
  try { database.run('ALTER TABLE products ADD COLUMN is_expiry_alert_sent INTEGER DEFAULT 0;'); } catch (e) {}

  const stmt = database.prepare('SELECT COUNT(*) as count FROM settings');
  if (stmt.step()) {
    const row = stmt.getAsObject();
    if (row.count === 0) {
      const defaultSettings = [
        ['shop_name', 'My Shop'],
        ['logo', ''],
        ['address', ''],
        ['phone', ''],
        ['email', ''],
        ['currency', '৳'],
        ['language', 'bn'],
        ['invoice_design', 'A4'],
        ['dark_mode', 'false'],
        ['auto_backup', 'daily']
      ];
      for (const [k, v] of defaultSettings) {
        database.run('INSERT INTO settings (key, value) VALUES (?, ?)', [k, v]);
      }
    }
  }
  stmt.free();

  const userStmt = database.prepare('SELECT COUNT(*) as count FROM users');
  if (userStmt.step()) {
    const row = userStmt.getAsObject();
    if (row.count === 0) {
      database.run(
        'INSERT INTO users (username, email, password, name, role, phone, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['admin', 'admin@shop.com', '$2a$10$e8.Z/0Xo.sH0k3R2yv8Mne6QvG7P2e2S/K/9T/xJ6K6W4aZqZqZq', 'Admin', 'admin', '', 1]
      );
    }
  }
  userStmt.free();
}

export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function runSql(sql: string, params: any[] = []): { lastInsertRowid: number; changes: number } {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  saveDb();
  
  const lastIdRes = db.exec('SELECT last_insert_rowid() as id');
  const lastId = lastIdRes.length > 0 && lastIdRes[0].values.length > 0 ? (lastIdRes[0].values[0][0] as number) : 0;
  
  const changesRes = db.exec('SELECT changes() as changes');
  const changes = changesRes.length > 0 && changesRes[0].values.length > 0 ? (changesRes[0].values[0][0] as number) : 0;

  return { lastInsertRowid: lastId, changes };
}


// --- WhatsApp Alert Helpers ---
export function getPendingAlerts(daysThreshold = 15) {
  if (!db) return { stockAlerts: [], expiryAlerts: [] };
  
  const stockSql = `SELECT id, name, stock FROM products WHERE stock <= 0 AND (is_stock_alert_sent = 0 OR is_stock_alert_sent IS NULL)`;
  const stockAlerts = queryAll(stockSql);
  
  // null স্ট্রিং বা undefined স্ট্রিং থাকলে সেটাকেও বাদ দিয়ে কোয়েরি করবে
  const expirySql = `SELECT id, name, expire_date FROM products WHERE expire_date IS NOT NULL AND expire_date != '' AND expire_date != 'null' AND expire_date != 'undefined' AND (is_expiry_alert_sent = 0 OR is_expiry_alert_sent IS NULL)`;
  const allProductsWithDate = queryAll(expirySql);
  
  console.log("\n--- Debug Info ---");
  console.log("স্টক জিরো এমন প্রোডাক্ট পাওয়া গেছে:", stockAlerts.length, "টি");
  console.log("মেয়াদ আছে এমন প্রোডাক্ট ডাটাবেস থেকে পাওয়া গেছে:", allProductsWithDate.length, "টি");

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysThreshold);
  
  const expiryAlerts = allProductsWithDate.filter(p => {
    let dateStr = String(p.expire_date).trim();
    let exp = new Date(dateStr);
    
    // যদি ডেট DD/MM/YYYY বা DD-MM-YYYY ফরম্যাটে থাকে, তবে সেটা ঠিক করে নেওয়া
    if (isNaN(exp.getTime()) && dateStr.match(/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/)) {
        const parts = dateStr.split(/[\/\-]/);
        exp = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); // YYYY-MM-DD
    }
    
    const isValidDate = !isNaN(exp.getTime());
    
    console.log(`প্রোডাক্ট: "${p.name}" | সেভ করা মেয়াদ: "${dateStr}" | পার্স করা মেয়াদ: ${isValidDate ? exp.toDateString() : 'Invalid Date'}`);
    
    if (isValidDate) {
        return exp <= targetDate;
    }
    return false;
  });
  
  console.log("------------------\n");
  
  return { stockAlerts, expiryAlerts };
}

export function markAlertAsSent(productId: number, type: 'stock' | 'expiry') {
  const column = type === 'stock' ? 'is_stock_alert_sent' : 'is_expiry_alert_sent';
  runSql(`UPDATE products SET ${column} = 1 WHERE id = ?`, [productId]);
}

export function resetAlert(productId: number, type: 'stock' | 'expiry') {
  const column = type === 'stock' ? 'is_stock_alert_sent' : 'is_expiry_alert_sent';
  runSql(`UPDATE products SET ${column} = 0 WHERE id = ?`, [productId]);
}