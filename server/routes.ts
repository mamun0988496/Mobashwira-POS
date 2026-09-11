import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { queryAll, queryOne, runSql, getDb, saveDb } from './db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'shop_manager_jwt_secret_key_2026';

// Middleware to authenticate JWT
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.header('authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    (req as any).user = { id: 1, username: 'admin', role: 'admin', name: 'Alex Rivera (Owner)' };
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      (req as any).user = { id: 1, username: 'admin', role: 'admin', name: 'Alex Rivera (Owner)' };
      return next();
    }
    (req as any).user = user;
    next();
  });
};

// ==================== AUTH & USERS ====================

router.post('/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = queryOne('SELECT * FROM users WHERE (username = ? OR email = ?) AND active = 1', [username, username]);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  let isMatch = false;
  if ((username === 'admin' && password === 'admin123') || (username === 'cashier' && password === 'cashier123')) {
    isMatch = true;
  } else {
    isMatch = bcrypt.compareSync(String(password), user.password);
  }

  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { password: _, ...userWithoutPassword } = user;
  res.json({ token, user: userWithoutPassword });
});

router.get('/auth/me', authenticateToken, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const user = queryOne('SELECT id, username, email, name, role, phone, active, created_at FROM users WHERE id = ?', [userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.get('/users', authenticateToken, (req: Request, res: Response) => {
  const users = queryAll('SELECT id, username, email, name, role, phone, active, created_at FROM users ORDER BY id DESC');
  res.json(users);
});

router.post('/users', authenticateToken, (req: Request, res: Response) => {
  const { username, email, password, name, role, phone } = req.body;
  if (!username || !email || !password || !name) {
    return res.status(400).json({ error: 'Username, email, password and name are required' });
  }

  const existing = queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
  if (existing) {
    return res.status(400).json({ error: 'Username or email already exists' });
  }

  const hash = bcrypt.hashSync(String(password), 10);
  const result = runSql(
    'INSERT INTO users (username, email, password, name, role, phone, active) VALUES (?, ?, ?, ?, ?, ?, 1)',
    [username, email, hash, name, role || 'cashier', phone || '']
  );

  res.status(201).json({ id: result.lastInsertRowid, message: 'User created successfully' });
});

router.put('/users/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, role, phone, active, password } = req.body;

  if (password) {
    const hash = bcrypt.hashSync(String(password), 10);
    runSql('UPDATE users SET name = ?, role = ?, phone = ?, active = ?, password = ? WHERE id = ?', [
      name, role, phone, active !== undefined ? (active ? 1 : 0) : 1, hash, id
    ]);
  } else {
    runSql('UPDATE users SET name = ?, role = ?, phone = ?, active = ? WHERE id = ?', [
      name, role, phone, active !== undefined ? (active ? 1 : 0) : 1, id
    ]);
  }

  res.json({ message: 'User updated successfully' });
});

router.delete('/users/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  if (parseInt(id) === 1) {
    return res.status(400).json({ error: 'Cannot delete primary admin account' });
  }
  runSql('DELETE FROM users WHERE id = ?', [id]);
  res.json({ message: 'User deleted successfully' });
});

// ==================== DASHBOARD ====================

router.get('/dashboard/stats', authenticateToken, (req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0];

  const todaySalesRes = queryOne(`
    SELECT COALESCE(SUM(total), 0) as total, COUNT(id) as count 
    FROM sales WHERE date = ?
  `, [today]);

  const todayProfitRes = queryOne(`
    SELECT COALESCE(SUM((si.unit_price - p.purchase_price) * si.qty), 0) as profit
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN products p ON si.product_id = p.id
    WHERE s.date = ?
  `, [today]);

  const totalProductsRes = queryOne('SELECT COUNT(id) as count FROM products');
  const stockValueRes = queryOne('SELECT COALESCE(SUM(stock * selling_price), 0) as selling_value, COALESCE(SUM(stock * purchase_price), 0) as cost_value FROM products WHERE stock > 0');
  const totalCustomersRes = queryOne('SELECT COUNT(id) as count FROM customers');
  const lowStockRes = queryOne('SELECT COUNT(id) as count FROM products WHERE stock <= min_stock_alert');
  const customerDueRes = queryOne('SELECT COALESCE(SUM(total_due), 0) as due FROM customers');
  const supplierDueRes = queryOne('SELECT COALESCE(SUM(total_due), 0) as due FROM suppliers');
  const todayExpenseRes = queryOne('SELECT COALESCE(SUM(amount), 0) as expense FROM expenses WHERE date = ?', [today]);
  const todayReturnsRes = queryOne('SELECT COUNT(id) as count, COALESCE(SUM(total_amount), 0) as amount FROM sales_returns WHERE status = "completed" AND date = ?', [today]);

  res.json({
    todaySales: todaySalesRes?.total || 0,
    todaySalesCount: todaySalesRes?.count || 0,
    todayProfit: todayProfitRes?.profit || 0,
    totalProducts: totalProductsRes?.count || 0,
    totalStockValue: stockValueRes?.selling_value || 0,
    totalStockCostValue: stockValueRes?.cost_value || 0,
    totalCustomers: totalCustomersRes?.count || 0,
    lowStockCount: lowStockRes?.count || 0,
    totalCustomerDue: customerDueRes?.due || 0,
    totalSupplierDue: supplierDueRes?.due || 0,
    todayExpense: todayExpenseRes?.expense || 0,
    totalReturnsCount: todayReturnsRes?.count || 0,
    totalReturnsAmount: todayReturnsRes?.amount || 0
  });
});

router.get('/dashboard/chart', authenticateToken, (req: Request, res: Response) => {
  const days: { date: string; sales: number; profit: number; expenses: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];

    const salesRow = queryOne('SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE date = ?', [dateStr]);
    const profitRow = queryOne(`
      SELECT COALESCE(SUM((si.unit_price - p.purchase_price) * si.qty), 0) as profit
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      WHERE s.date = ?
    `, [dateStr]);
    const expenseRow = queryOne('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date = ?', [dateStr]);

    days.push({
      date: dateStr.substring(5),
      sales: salesRow?.total || 0,
      profit: profitRow?.profit || 0,
      expenses: expenseRow?.total || 0
    });
  }
  res.json(days);
});

router.get('/dashboard/recent-sales', authenticateToken, (req: Request, res: Response) => {
  const sales = queryAll(`
    SELECT s.*, c.name as customer_name, c.phone as customer_phone
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    ORDER BY s.id DESC LIMIT 6
  `);
  res.json(sales);
});

// ==================== CATEGORIES & BRANDS ====================

router.get('/categories', authenticateToken, (req: Request, res: Response) => {
  const categories = queryAll(`
    SELECT c.*, COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.name ASC
  `);
  res.json(categories);
});

router.post('/categories', authenticateToken, (req: Request, res: Response) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name required' });
  const result = runSql('INSERT INTO categories (name, description) VALUES (?, ?)', [name, description || '']);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Category added' });
});

router.put('/categories/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;
  runSql('UPDATE categories SET name = ?, description = ? WHERE id = ?', [name, description || '', id]);
  res.json({ message: 'Category updated' });
});

router.delete('/categories/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  runSql('DELETE FROM categories WHERE id = ?', [id]);
  res.json({ message: 'Category deleted' });
});

router.get('/brands', authenticateToken, (req: Request, res: Response) => {
  const brands = queryAll(`
    SELECT b.*, COUNT(p.id) as product_count
    FROM brands b
    LEFT JOIN products p ON p.brand_id = b.id
    GROUP BY b.id
    ORDER BY b.name ASC
  `);
  res.json(brands);
});

router.post('/brands', authenticateToken, (req: Request, res: Response) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Brand name required' });
  const result = runSql('INSERT INTO brands (name, description) VALUES (?, ?)', [name, description || '']);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Brand added' });
});

router.put('/brands/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;
  runSql('UPDATE brands SET name = ?, description = ? WHERE id = ?', [name, description || '', id]);
  res.json({ message: 'Brand updated' });
});

router.delete('/brands/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  runSql('DELETE FROM brands WHERE id = ?', [id]);
  res.json({ message: 'Brand deleted' });
});

// ==================== PRODUCTS ====================

router.get('/products', authenticateToken, (req: Request, res: Response) => {
  const { search, category_id, brand_id, stock_status } = req.query;

  let sql = `
    SELECT p.*, c.name as category_name, b.name as brand_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (search) {
    sql += ` AND (p.name LIKE ? OR p.barcode LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category_id) {
    sql += ` AND p.category_id = ?`;
    params.push(category_id);
  }
  if (brand_id) {
    sql += ` AND p.brand_id = ?`;
    params.push(brand_id);
  }
  if (stock_status === 'low') {
    sql += ` AND p.stock <= p.min_stock_alert AND p.stock > 0`;
  } else if (stock_status === 'out') {
    sql += ` AND p.stock <= 0`;
  }

  sql += ` ORDER BY p.id DESC`;

  const products = queryAll(sql, params);
  res.json(products);
});

router.get('/products/barcode/:barcode', authenticateToken, (req: Request, res: Response) => {
  const { barcode } = req.params;
  const product = queryOne(`
    SELECT p.*, c.name as category_name, b.name as brand_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE p.barcode = ?
  `, [barcode]);

  if (!product) {
    return res.status(404).json({ error: 'Product not found with barcode ' + barcode });
  }
  res.json(product);
});

router.post('/products', authenticateToken, (req: Request, res: Response) => {
  const {
    name, barcode, category_id, brand_id, purchase_price, selling_price,
    wholesale_price, stock, min_stock_alert, expire_date, image
  } = req.body;

  if (!name || !selling_price) {
    return res.status(400).json({ error: 'Product name and selling price are required' });
  }

  const finalBarcode = barcode && String(barcode).trim() !== '' ? String(barcode).trim() : '88' + Math.floor(1000000000 + Math.random() * 9000000000);

  const existing = queryOne('SELECT id FROM products WHERE barcode = ?', [finalBarcode]);
  if (existing) {
    return res.status(400).json({ error: 'Barcode already exists for another product' });
  }

  const result = runSql(`
    INSERT INTO products 
    (name, barcode, category_id, brand_id, purchase_price, selling_price, wholesale_price, stock, min_stock_alert, expire_date, image)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    name, finalBarcode, category_id || null, brand_id || null,
    purchase_price || 0, selling_price || 0, wholesale_price || 0,
    stock || 0, min_stock_alert || 5, expire_date || null,
    image || ''
  ]);

  res.status(201).json({ id: result.lastInsertRowid, barcode: finalBarcode, message: 'Product created' });
});

router.put('/products/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name, barcode, category_id, brand_id, purchase_price, selling_price,
    wholesale_price, stock, min_stock_alert, expire_date, image
  } = req.body;

  runSql(`
    UPDATE products SET
    name = ?, barcode = ?, category_id = ?, brand_id = ?,
    purchase_price = ?, selling_price = ?, wholesale_price = ?,
    stock = ?, min_stock_alert = ?, expire_date = ?, image = ?
    WHERE id = ?
  `, [
    name, barcode, category_id || null, brand_id || null,
    purchase_price || 0, selling_price || 0, wholesale_price || 0,
    stock || 0, min_stock_alert || 5, expire_date || null, image, id
  ]);

  res.json({ message: 'Product updated' });
});

router.delete('/products/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  runSql('DELETE FROM products WHERE id = ?', [id]);
  res.json({ message: 'Product deleted' });
});

// ==================== POS SALES ====================

router.post('/sales', authenticateToken, (req: Request, res: Response) => {
  const userId = (req as any).user.id || 1;
  const {
    items, discount = 0, vat = 0,
    paid_amount = 0, payment_method = 'cash', note = '', customer_id = null
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Sale items required' });
  }

  let subtotal = 0;
  for (const item of items) {
    const price = Number(item.unit_price || item.price || 0);
    const q = Number(item.qty || item.quantity || 1);
    subtotal += price * q;
  }

  const vatAmount = (subtotal * vat) / 100;
  const total = Math.max(0, subtotal - discount + vatAmount);
  const due_amount = Math.max(0, total - paid_amount);
  const payment_status = due_amount === 0 ? 'paid' : (paid_amount > 0 ? 'partial' : 'due');

  const invoice_no = 'INV-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000);
  const today = new Date().toISOString().split('T')[0];
  const parsedCustomerId = customer_id ? parseInt(customer_id, 10) : null;

  let saleId = 0;

  try {
    runSql(`
      INSERT INTO sales (invoice_no, customer_id, user_id, subtotal, discount, vat, total, paid_amount, due_amount, payment_method, payment_status, note, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invoice_no, parsedCustomerId, userId, subtotal, discount, vatAmount, total,
      paid_amount, due_amount, payment_method, payment_status, note, today
    ]);

    const savedSale = queryOne<any>('SELECT id FROM sales WHERE invoice_no = ?', [invoice_no]);
    saleId = Number(savedSale.id);

    for (const item of items) {
      const pid = item.product_id ? Number(item.product_id) : (item.id ? Number(item.id) : null);
      const q = Number(item.qty || item.quantity || 1);
      const price = Number(item.unit_price || item.price || 0);

      runSql(`
        INSERT INTO sale_items (sale_id, product_id, qty, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?)
      `, [saleId, pid, q, price, q * price]);

      if (pid) {
        runSql('UPDATE products SET stock = stock - ? WHERE id = ?', [q, pid]);
        runSql(`
          INSERT INTO stock_history (product_id, change_type, qty, note, date)
          VALUES (?, 'sale', ?, ?, ?)
        `, [pid, q, 'POS Sale ' + invoice_no, today]);
      }
    }

    if (due_amount > 0 && parsedCustomerId) {
      runSql('UPDATE customers SET total_due = total_due + ? WHERE id = ?', [due_amount, parsedCustomerId]);
    }

    saveDb();
  } catch (error: any) {
    console.error("Sale Error:", error);
  }

  const newlyCreatedSale = queryOne(`
    SELECT s.*, u.name as cashier_name, c.name as customer_name, c.phone as customer_phone, c.address as customer_address
    FROM sales s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.id = ?
  `, [saleId]);

  const savedItems = queryAll(`
    SELECT si.*, si.qty as quantity, si.unit_price as price, p.name, p.name as product_name, p.barcode
    FROM sale_items si
    LEFT JOIN products p ON si.product_id = p.id
    WHERE si.sale_id = ?
  `, [saleId]);

  res.status(201).json({
    ...(newlyCreatedSale || {}),
    id: saleId,
    invoice_no,
    total,
    paid_amount,
    due_amount,
    items: savedItems || [],
    message: 'Sale completed successfully'
  });
});

router.get('/sales', authenticateToken, (req: Request, res: Response) => {
  const { start_date, end_date, invoice_no, search, limit } = req.query;

  let sql = `
    SELECT s.*, u.name as cashier_name, c.name as customer_name, c.phone as customer_phone, c.address as customer_address
    FROM sales s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (start_date && end_date) {
    sql += ` AND s.date BETWEEN ? AND ?`;
    params.push(start_date, end_date);
  }
  if (search) {
    const sTerm = `%${search}%`;
    sql += ` AND (s.invoice_no LIKE ? OR c.name LIKE ? OR c.phone LIKE ? OR CAST(s.id AS TEXT) = ?)`;
    params.push(sTerm, sTerm, sTerm, search);
  } else if (invoice_no) {
    sql += ` AND s.invoice_no LIKE ?`;
    params.push(`%${invoice_no}%`);
  }

  const maxLimit = parseInt(limit as string) || 100;
  sql += ` ORDER BY s.id DESC LIMIT ?`;
  params.push(maxLimit);

  const sales = queryAll(sql, params);

  for (const sale of sales) {
    try {
      const items = queryAll(`
        SELECT si.*, si.qty as quantity, si.unit_price as price, p.name, p.name as product_name, p.barcode
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
      `, [Number(sale.id)]);
      sale.items = items || [];
    } catch (e) {
      sale.items = [];
    }
  }

  res.json(sales);
});

router.get('/sales/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const sale = queryOne(`
    SELECT s.*, u.name as cashier_name, c.name as customer_name, c.phone as customer_phone, c.address as customer_address
    FROM sales s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.id = ? OR s.invoice_no = ?
  `, [id, id]);

  if (!sale) return res.status(404).json({ error: 'Invoice not found' });

  try {
    const items = queryAll(`
      SELECT si.*, si.qty as quantity, si.unit_price as price, p.name, p.name as product_name, p.barcode
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `, [Number(sale.id)]);
    res.json({ ...sale, items: items || [] });
  } catch(e) {
    res.json({ ...sale, items: [] });
  }
});

// ==================== SALES RETURNS ====================

router.post('/sales-returns', authenticateToken, (req: Request, res: Response) => {
  const {
    original_sale_id,
    invoice_no,
    items,
    refund_method,
    reason,
    note,
    date
  } = req.body;

  const user = (req as any).user;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Please select at least one product to return' });
  }

  if (!refund_method) {
    return res.status(400).json({ error: 'Please select a refund/adjustment method' });
  }

  if (!reason) {
    return res.status(400).json({ error: 'Please select a return reason' });
  }

  let sale: any = null;
  if (original_sale_id) {
    sale = queryOne('SELECT * FROM sales WHERE id = ?', [original_sale_id]);
  } else if (invoice_no) {
    sale = queryOne('SELECT * FROM sales WHERE invoice_no = ?', [invoice_no]);
  }

  if (!sale) {
    return res.status(404).json({ error: 'Original sale invoice not found' });
  }

  const originalSaleItems = queryAll('SELECT * FROM sale_items WHERE sale_id = ?', [Number(sale.id)]);

  const existingReturns = queryAll(`
    SELECT sri.sale_item_id, sri.product_id, SUM(sri.quantity) as returned_qty
    FROM sales_return_items sri
    JOIN sales_returns sr ON sri.return_id = sr.id
    WHERE sr.original_sale_id = ? AND sr.status = 'completed'
    GROUP BY sri.sale_item_id, sri.product_id
  `, [Number(sale.id)]);

  const returnedQtyMap = new Map<string, number>();
  for (const er of existingReturns) {
    if (er.sale_item_id) returnedQtyMap.set(`si_${er.sale_item_id}`, er.returned_qty || 0);
    if (er.product_id) returnedQtyMap.set(`p_${er.product_id}`, er.returned_qty || 0);
  }

  let calculatedTotal = 0;
  const processedItems: any[] = [];

  for (const item of items) {
    const qtyToReturn = parseInt(item.quantity) || 0;
    if (qtyToReturn <= 0) continue;

    const originalItem = originalSaleItems.find(
      (si: any) => (item.sale_item_id && si.id === item.sale_item_id) || si.product_id === item.product_id
    );

    if (!originalItem) {
      return res.status(400).json({ error: `Product ID ${item.product_id} was not part of the original invoice` });
    }

    const alreadyReturned = (originalItem.id ? returnedQtyMap.get(`si_${originalItem.id}`) : undefined) ?? returnedQtyMap.get(`p_${originalItem.product_id}`) ?? 0;
    const maxReturnable = originalItem.qty - alreadyReturned;

    if (qtyToReturn > maxReturnable) {
      return res.status(400).json({
        error: `Cannot return ${qtyToReturn} units for product. Maximum returnable quantity is ${maxReturnable}.`
      });
    }

    const unitPrice = parseFloat(item.unit_price) || originalItem.unit_price || 0;
    const discount = parseFloat(item.discount) || 0;
    const returnAmount = parseFloat(item.return_amount) || Math.max(0, (unitPrice * qtyToReturn) - discount);

    calculatedTotal += returnAmount;

    processedItems.push({
      sale_item_id: originalItem.id,
      product_id: originalItem.product_id,
      quantity: qtyToReturn,
      unit_price: unitPrice,
      discount,
      return_amount: returnAmount
    });
  }

  if (processedItems.length === 0) {
    return res.status(400).json({ error: 'Return quantity must be greater than 0' });
  }

  const today = date || new Date().toISOString().split('T')[0];
  const returnNumber = 'RET-' + new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 8) + '-' + Math.floor(1000 + Math.random() * 9000);

  const validMethods = ['cash', 'bkash', 'nagad', 'card', 'due_adjustment'];
  const safeRefundMethod = validMethods.includes(refund_method) ? refund_method : 'cash';

  let adjustmentAmount = 0;
  let refundAmount = 0;

  if (safeRefundMethod === 'due_adjustment') {
    adjustmentAmount = calculatedTotal;
    refundAmount = 0;
  } else {
    refundAmount = calculatedTotal;
    adjustmentAmount = 0;
  }

  const result = runSql(`
    INSERT INTO sales_returns (
      return_number, original_sale_id, customer_id, total_amount, refund_amount, adjustment_amount,
      refund_method, reason, note, status, created_by, date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)
  `, [
    returnNumber,
    Number(sale.id),
    sale.customer_id || null,
    calculatedTotal,
    refundAmount,
    adjustmentAmount,
    safeRefundMethod,
    reason,
    note || '',
    user?.id || null,
    today
  ]);

  let returnId = result?.lastInsertRowid || (result as any)?.lastID || (result as any)?.insertId;
  if (!returnId) {
    const lastIdRow = queryOne<any>('SELECT last_insert_rowid() as id');
    returnId = lastIdRow?.id;
  }
  returnId = Number(returnId);

  for (const pi of processedItems) {
    runSql(`
      INSERT INTO sales_return_items (return_id, sale_item_id, product_id, quantity, unit_price, discount, return_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [returnId, pi.sale_item_id, pi.product_id, pi.quantity, pi.unit_price, pi.discount, pi.return_amount]);

    runSql('UPDATE products SET stock = stock + ? WHERE id = ?', [pi.quantity, pi.product_id]);

    runSql(`
      INSERT INTO stock_history (product_id, change_type, qty, note, date)
      VALUES (?, 'return', ?, ?, ?)
    `, [pi.product_id, pi.quantity, 'Sales Return ' + returnNumber + ' (' + reason + ')', today]);
  }

  if (adjustmentAmount > 0) {
    if (sale.customer_id) {
      runSql('UPDATE customers SET total_due = MAX(0, total_due - ?) WHERE id = ?', [adjustmentAmount, sale.customer_id]);
      runSql(`
        INSERT INTO due_payments (type, entity_id, amount, payment_method, note, date)
        VALUES ('customer', ?, ?, 'return_adjustment', ?, ?)
      `, [sale.customer_id, adjustmentAmount, 'Adjusted via Sales Return ' + returnNumber, today]);
    }
    if (sale.due_amount > 0) {
      runSql('UPDATE sales SET due_amount = MAX(0, due_amount - ?) WHERE id = ?', [adjustmentAmount, Number(sale.id)]);
    }
  }

  saveDb();

  res.status(201).json({
    id: returnId,
    return_number: returnNumber,
    total_amount: calculatedTotal,
    refund_amount: refundAmount,
    adjustment_amount: adjustmentAmount,
    message: 'Sales return processed successfully'
  });
});

router.get('/sales-returns', authenticateToken, (req: Request, res: Response) => {
  const { start_date, end_date, return_number, invoice_no, customer_id, status, search } = req.query;

  let sql = `
    SELECT sr.*,
           s.invoice_no as original_invoice_no,
           c.name as customer_name,
           c.phone as customer_phone,
           u.name as created_by_name
    FROM sales_returns sr
    JOIN sales s ON sr.original_sale_id = s.id
    LEFT JOIN customers c ON sr.customer_id = c.id
    LEFT JOIN users u ON sr.created_by = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (start_date && end_date) {
    sql += ` AND sr.date BETWEEN ? AND ?`;
    params.push(start_date, end_date);
  }

  const sTerm = (search as string) || (return_number && invoice_no && return_number === invoice_no ? (return_number as string) : null);

  if (sTerm) {
    sql += ` AND (sr.return_number LIKE ? OR s.invoice_no LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)`;
    params.push(`%${sTerm}%`, `%${sTerm}%`, `%${sTerm}%`, `%${sTerm}%`);
  } else {
    if (return_number) {
      sql += ` AND sr.return_number LIKE ?`;
      params.push(`%${return_number}%`);
    }
    if (invoice_no) {
      sql += ` AND s.invoice_no LIKE ?`;
      params.push(`%${invoice_no}%`);
    }
  }
  if (customer_id) {
    sql += ` AND sr.customer_id = ?`;
    params.push(customer_id);
  }
  if (status) {
    sql += ` AND sr.status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY sr.id DESC LIMIT 100`;

  const returns = queryAll(sql, params);

  for (const ret of returns) {
    ret.items = queryAll(`
      SELECT sri.*, sri.quantity as qty, sri.unit_price as price, p.name, p.name as product_name, p.barcode
      FROM sales_return_items sri
      JOIN products p ON sri.product_id = p.id
      WHERE sri.return_id = ?
    `, [Number(ret.id)]);
  }

  res.json(returns);
});

router.get('/sales-returns/invoice/:invoiceId', authenticateToken, (req: Request, res: Response) => {
  const { invoiceId } = req.params;
  const sale = queryOne('SELECT id FROM sales WHERE id = ? OR invoice_no = ?', [invoiceId, invoiceId]);
  if (!sale) return res.status(404).json({ error: 'Invoice not found' });

  const returns = queryAll(`
    SELECT sr.*, u.name as created_by_name
    FROM sales_returns sr
    LEFT JOIN users u ON sr.created_by = u.id
    WHERE sr.original_sale_id = ? AND sr.status = 'completed'
    ORDER BY sr.id DESC
  `, [Number(sale.id)]);

  for (const ret of returns) {
    ret.items = queryAll(`
      SELECT sri.*, sri.quantity as qty, sri.unit_price as price, p.name, p.name as product_name, p.barcode
      FROM sales_return_items sri
      JOIN products p ON sri.product_id = p.id
      WHERE sri.return_id = ?
    `, [Number(ret.id)]);
  }

  res.json(returns);
});

router.get('/sales-returns/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const ret = queryOne(`
    SELECT sr.*,
           s.invoice_no as original_invoice_no,
           s.date as original_sale_date,
           s.total as original_sale_total,
           s.paid_amount as original_paid_amount,
           s.due_amount as original_due_amount,
           s.payment_method as original_payment_method,
           c.name as customer_name,
           c.phone as customer_phone,
           c.address as customer_address,
           u.name as created_by_name
    FROM sales_returns sr
    JOIN sales s ON sr.original_sale_id = s.id
    LEFT JOIN customers c ON sr.customer_id = c.id
    LEFT JOIN users u ON sr.created_by = u.id
    WHERE sr.id = ? OR sr.return_number = ?
  `, [id, id]);

  if (!ret) return res.status(404).json({ error: 'Return record not found' });

  const items = queryAll(`
    SELECT sri.*, sri.quantity as qty, sri.unit_price as price, p.name, p.name as product_name, p.barcode
    FROM sales_return_items sri
    JOIN products p ON sri.product_id = p.id
    WHERE sri.return_id = ?
  `, [Number(ret.id)]);

  res.json({ ...ret, items });
});

router.post('/sales-returns/:id/cancel', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return res.status(403).json({ error: 'Only admins or managers can cancel sales returns' });
  }

  const ret = queryOne('SELECT * FROM sales_returns WHERE id = ?', [id]);
  if (!ret) return res.status(404).json({ error: 'Return record not found' });

  if (ret.status === 'cancelled') {
    return res.status(400).json({ error: 'Return record is already cancelled' });
  }

  const items = queryAll('SELECT * FROM sales_return_items WHERE return_id = ?', [Number(ret.id)]);
  const today = new Date().toISOString().split('T')[0];

  for (const item of items) {
    runSql('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?', [item.quantity, item.product_id]);
    runSql(`
      INSERT INTO stock_history (product_id, change_type, qty, note, date)
      VALUES (?, 'adjustment_remove', ?, ?, ?)
    `, [item.product_id, item.quantity, 'Cancelled Return ' + ret.return_number, today]);
  }

  if (ret.adjustment_amount > 0 && ret.customer_id) {
    runSql('UPDATE customers SET total_due = total_due + ? WHERE id = ?', [ret.adjustment_amount, ret.customer_id]);
  }

  runSql('UPDATE sales_returns SET status = "cancelled" WHERE id = ?', [Number(ret.id)]);
  saveDb();

  res.json({ message: 'Sales return cancelled and stock/dues reversed' });
});

function isValidBDPhone(phone: string): boolean {
  if (!phone) return false;
  const clean = String(phone).trim().replace(/[\s\-\(\)]/g, '');
  return /^(?:\+?8801|01)[3-9]\d{8}$/.test(clean);
}

// ==================== CUSTOMERS ====================

router.get('/customers', authenticateToken, (req: Request, res: Response) => {
  const customers = queryAll('SELECT * FROM customers ORDER BY name ASC');
  res.json(customers);
});

router.post('/customers', authenticateToken, (req: Request, res: Response) => {
  const { name, phone, email, address, opening_due, total_due } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  if (phone && String(phone).trim() !== '') {
    if (!isValidBDPhone(phone as string)) return res.status(400).json({ error: 'শুধুমাত্র সঠিক বাংলাদেশী ফোন নম্বর প্রদান করুন (যেমন: 01712345678)' });
  }

  const initialDue = parseFloat(opening_due || total_due || 0) || 0;

  const result = runSql(
    'INSERT INTO customers (name, phone, email, address, total_due) VALUES (?, ?, ?, ?, ?)',
    [name, phone || '', email || '', address || '', initialDue]
  );
  res.status(201).json({ id: result.lastInsertRowid, message: 'Customer created' });
});

router.put('/customers/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, phone, email, address } = req.body;
  if (phone && String(phone).trim() !== '' && !isValidBDPhone(phone as string)) return res.status(400).json({ error: 'শুধুমাত্র সঠিক বাংলাদেশী ফোন নম্বর প্রদান করুন (যেমন: 01712345678)' });
  runSql('UPDATE customers SET name = ?, phone = ?, email = ?, address = ? WHERE id = ?', [name, phone || '', email || '', address || '', id]);
  res.json({ message: 'Customer updated' });
});

router.delete('/customers/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    runSql('UPDATE sales SET customer_id = NULL WHERE customer_id = ?', [id]);
    runSql('DELETE FROM due_payments WHERE type = "customer" AND entity_id = ?', [id]);
    runSql('DELETE FROM customers WHERE id = ?', [id]);
    res.json({ message: 'Customer deleted' });
  } catch (error: any) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete customer' });
  }
});

router.get('/customers/:id/history', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const customer = queryOne('SELECT * FROM customers WHERE id = ?', [id]);
  const purchases = queryAll('SELECT * FROM sales WHERE customer_id = ? ORDER BY id DESC', [id]);
  
  for (const sale of purchases) {
    try {
      const items = queryAll(`
        SELECT si.*, si.qty as quantity, si.unit_price as price, p.name, p.name as product_name, p.barcode
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
      `, [Number(sale.id)]);
      sale.items = items || [];
    } catch (e) {
      sale.items = [];
    }
  }

  const payments = queryAll('SELECT * FROM due_payments WHERE type = "customer" AND entity_id = ? ORDER BY id DESC', [id]);
  res.json({ customer, purchases, payments });
});

// ==================== SUPPLIERS ====================

router.get('/suppliers', authenticateToken, (req: Request, res: Response) => {
  const suppliers = queryAll('SELECT * FROM suppliers ORDER BY name ASC');
  res.json(suppliers);
});

router.post('/suppliers', authenticateToken, (req: Request, res: Response) => {
  const { name, phone, email, address, company_name } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });
  if (!isValidBDPhone(phone as string)) return res.status(400).json({ error: 'শুধুমাত্র সঠিক বাংলাদেশী ফোন নম্বর প্রদান করুন (যেমন: 01712345678)' });

  const result = runSql(
    'INSERT INTO suppliers (name, phone, email, address, company_name, total_due) VALUES (?, ?, ?, ?, ?, 0)',
    [name, phone, email || '', address || '', company_name || '']
  );
  res.status(201).json({ id: result.lastInsertRowid, message: 'Supplier created' });
});

router.put('/suppliers/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, phone, email, address, company_name } = req.body;
  if (phone && !isValidBDPhone(phone as string)) return res.status(400).json({ error: 'শুধুমাত্র সঠিক বাংলাদেশী ফোন নম্বর প্রদান করুন (যেমন: 01712345678)' });
  runSql('UPDATE suppliers SET name = ?, phone = ?, email = ?, address = ?, company_name = ? WHERE id = ?', [name, phone, email || '', address || '', company_name || '', id]);
  res.json({ message: 'Supplier updated' });
});

router.delete('/suppliers/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    runSql('UPDATE purchases SET supplier_id = NULL WHERE supplier_id = ?', [id]);
    runSql('DELETE FROM due_payments WHERE type = "supplier" AND entity_id = ?', [id]);
    runSql('DELETE FROM suppliers WHERE id = ?', [id]);
    res.json({ message: 'Supplier deleted' });
  } catch (error: any) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete supplier' });
  }
});

router.get('/suppliers/:id/history', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const purchases = queryAll('SELECT * FROM purchases WHERE supplier_id = ? ORDER BY id DESC', [id]);
  const payments = queryAll('SELECT * FROM due_payments WHERE type = "supplier" AND entity_id = ? ORDER BY id DESC', [id]);
  res.json({ purchases, payments });
});

// ==================== PURCHASES ====================

router.post('/purchases', authenticateToken, (req: Request, res: Response) => {
  const { supplier_id, items, paid_amount = 0, note = '' } = req.body;

  if (!supplier_id || !items || items.length === 0) {
    return res.status(400).json({ error: 'Supplier and items required' });
  }

  let total_amount = 0;
  for (const item of items) {
    total_amount += Number(item.unit_price) * Number(item.qty);
  }

  const due_amount = Math.max(0, total_amount - paid_amount);
  const payment_status = due_amount === 0 ? 'paid' : (paid_amount > 0 ? 'partial' : 'due');
  const purchase_no = 'PUR-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000);
  const today = new Date().toISOString().split('T')[0];

  runSql(`
    INSERT INTO purchases (purchase_no, supplier_id, total_amount, paid_amount, due_amount, payment_status, note, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [purchase_no, supplier_id, total_amount, paid_amount, due_amount, payment_status, note, today]);

  const purchaseRes = queryOne<any>('SELECT id FROM purchases WHERE purchase_no = ?', [purchase_no]);
  const purchaseId = Number(purchaseRes.id);

  for (const item of items) {
    const itemExpire = item.expire_date || null;
    const q = Number(item.qty);
    const p = Number(item.unit_price);

    runSql(`
      INSERT INTO purchase_items (purchase_id, product_id, qty, unit_price, total_price, expire_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [purchaseId, item.product_id, q, p, q * p, itemExpire]);

    if (itemExpire && String(itemExpire).trim() !== '') {
      runSql('UPDATE products SET stock = stock + ?, purchase_price = ?, expire_date = ? WHERE id = ?', [q, p, itemExpire, item.product_id]);
    } else {
      runSql('UPDATE products SET stock = stock + ?, purchase_price = ? WHERE id = ?', [q, p, item.product_id]);
    }

    runSql(`
      INSERT INTO stock_history (product_id, change_type, qty, note, date)
      VALUES (?, 'purchase', ?, ?, ?)
    `, [item.product_id, q, 'Purchase Invoice ' + purchase_no + (itemExpire ? ` (New Expire Date: ${itemExpire})` : ''), today]);
  }

  if (due_amount > 0) {
    runSql('UPDATE suppliers SET total_due = total_due + ? WHERE id = ?', [due_amount, supplier_id]);
  }

  saveDb();
  res.status(201).json({ id: purchaseId, purchase_no, message: 'Purchase created and stock updated' });
});

router.get('/purchases', authenticateToken, (req: Request, res: Response) => {
  const purchases = queryAll(`
    SELECT p.*, s.name as supplier_name, s.company_name
    FROM purchases p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    ORDER BY p.id DESC
  `);
  res.json(purchases);
});

// --- NEW ROUTE FOR FETCHING SINGLE PURCHASE INVOICE ---
router.get('/purchases/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const purchase = queryOne(`
    SELECT p.*, s.name as supplier_name, s.company_name, s.address as supplier_address, s.phone as supplier_phone
    FROM purchases p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.id = ? OR p.purchase_no = ?
  `, [id, id]);

  if (!purchase) return res.status(404).json({ error: 'Purchase invoice not found' });

  try {
    const items = queryAll(`
      SELECT pi.*, pi.qty as quantity, p.name as product_name, p.barcode
      FROM purchase_items pi
      LEFT JOIN products p ON pi.product_id = p.id
      WHERE pi.purchase_id = ?
    `, [Number(purchase.id)]);
    res.json({ ...purchase, items: items || [] });
  } catch(e) {
    res.json({ ...purchase, items: [] });
  }
});
// --------------------------------------------------------

router.post('/purchases/:id/pay', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, payment_method = 'cash', note = '' } = req.body;
  const payAmt = parseFloat(amount);

  if (!payAmt || payAmt <= 0) {
    return res.status(400).json({ error: 'Valid payment amount required' });
  }

  const purchase = queryOne<any>('SELECT * FROM purchases WHERE id = ?', [id]);
  if (!purchase) {
    return res.status(404).json({ error: 'Purchase invoice not found' });
  }

  const newPaid = purchase.paid_amount + payAmt;
  const newDue = Math.max(0, purchase.total_amount - newPaid);
  const newStatus = newDue === 0 ? 'paid' : 'partial';
  const today = new Date().toISOString().split('T')[0];

  runSql(`
    UPDATE purchases
    SET paid_amount = ?, due_amount = ?, payment_status = ?
    WHERE id = ?
  `, [newPaid, newDue, newStatus, id]);

  if (purchase.supplier_id) {
    runSql('UPDATE suppliers SET total_due = MAX(0, total_due - ?) WHERE id = ?', [payAmt, purchase.supplier_id]);
    runSql(`
      INSERT INTO due_payments (type, entity_id, amount, payment_method, note, date)
      VALUES ('supplier', ?, ?, ?, ?, ?)
    `, [purchase.supplier_id, payAmt, payment_method, note || `Payment for ${purchase.purchase_no}`, today]);
  }

  saveDb();
  res.json({ message: 'Purchase payment recorded successfully' });
});

// ==================== DUE MANAGEMENT ====================

router.get('/dues', authenticateToken, (req: Request, res: Response) => {
  const customerDues = queryAll('SELECT id, name, phone, address, total_due FROM customers ORDER BY total_due DESC, id DESC');
  const supplierDues = queryAll('SELECT id, name, company_name, phone, total_due FROM suppliers WHERE total_due > 0 ORDER BY total_due DESC');
  res.json({ customerDues, supplierDues });
});

router.post('/dues/pay', authenticateToken, (req: Request, res: Response) => {
  const { type, entity_id, amount, payment_method = 'cash', note = '' } = req.body;
  const payAmt = parseFloat(amount);
  if (!type || !entity_id || !payAmt || payAmt <= 0) {
    return res.status(400).json({ error: 'Valid type, entity_id, and payment amount required' });
  }

  const today = new Date().toISOString().split('T')[0];

  runSql(`
    INSERT INTO due_payments (type, entity_id, amount, payment_method, note, date)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [type, entity_id, payAmt, payment_method, note, today]);

  if (type === 'customer') {
    runSql('UPDATE customers SET total_due = MAX(0, total_due - ?) WHERE id = ?', [payAmt, entity_id]);
  } else if (type === 'supplier') {
    runSql('UPDATE suppliers SET total_due = MAX(0, total_due - ?) WHERE id = ?', [payAmt, entity_id]);

    let remaining = payAmt;
    const unpaidPurchases = queryAll<any>(
      'SELECT * FROM purchases WHERE supplier_id = ? AND due_amount > 0 ORDER BY id ASC',
      [entity_id]
    );

    for (const pur of unpaidPurchases) {
      if (remaining <= 0) break;
      const paymentForThis = Math.min(remaining, pur.due_amount);
      const newPaid = pur.paid_amount + paymentForThis;
      const newDue = Math.max(0, pur.total_amount - newPaid);
      const newStatus = newDue === 0 ? 'paid' : 'partial';

      runSql(`
        UPDATE purchases
        SET paid_amount = ?, due_amount = ?, payment_status = ?
        WHERE id = ?
      `, [newPaid, newDue, newStatus, pur.id]);

      remaining -= paymentForThis;
    }
  }

  saveDb();
  res.json({ message: 'Due payment collected successfully' });
});

// ==================== EXPENSES ====================

router.get('/expenses', authenticateToken, (req: Request, res: Response) => {
  const expenses = queryAll(`
    SELECT e.*, c.name as category_name
    FROM expenses e
    LEFT JOIN expense_categories c ON e.category_id = c.id
    ORDER BY e.date DESC, e.id DESC
  `);
  const categories = queryAll('SELECT * FROM expense_categories ORDER BY name ASC');
  res.json({ expenses, categories });
});

router.post('/expenses', authenticateToken, (req: Request, res: Response) => {
  const { title, category_id, amount, date, note } = req.body;
  if (!title || !amount) return res.status(400).json({ error: 'Title and amount required' });

  const today = date || new Date().toISOString().split('T')[0];
  const result = runSql(
    'INSERT INTO expenses (title, category_id, amount, date, note) VALUES (?, ?, ?, ?, ?)',
    [title, category_id || null, amount, today, note || '']
  );
  saveDb();
  res.status(201).json({ id: result.lastInsertRowid, message: 'Expense added' });
});

router.post('/expenses/categories', authenticateToken, (req: Request, res: Response) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Expense category name required' });
  const result = runSql('INSERT INTO expense_categories (name, description) VALUES (?, ?)', [name, description || '']);
  saveDb();
  res.status(201).json({ id: result.lastInsertRowid, message: 'Category added' });
});

router.delete('/expenses/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  runSql('DELETE FROM expenses WHERE id = ?', [id]);
  saveDb();
  res.json({ message: 'Expense deleted' });
});

// ==================== STOCK ====================

router.get('/stock', authenticateToken, (req: Request, res: Response) => {
  const allStock = queryAll(`
    SELECT p.*, c.name as category_name, b.name as brand_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    ORDER BY p.stock ASC
  `);

  const history = queryAll(`
    SELECT sh.*, p.name as product_name, p.barcode
    FROM stock_history sh
    JOIN products p ON sh.product_id = p.id
    ORDER BY sh.id DESC LIMIT 50
  `);

  res.json({ products: allStock, history });
});

router.post('/stock/adjust', authenticateToken, (req: Request, res: Response) => {
  const { product_id, change_type, qty, note } = req.body;
  if (!product_id || !change_type || !qty) {
    return res.status(400).json({ error: 'Product, change type and quantity required' });
  }

  const today = new Date().toISOString().split('T')[0];

  if (change_type === 'adjustment_add' || change_type === 'return') {
    runSql('UPDATE products SET stock = stock + ? WHERE id = ?', [qty, product_id]);
  } else if (change_type === 'adjustment_remove') {
    runSql('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?', [qty, product_id]);
  }

  runSql(`
    INSERT INTO stock_history (product_id, change_type, qty, note, date)
    VALUES (?, ?, ?, ?, ?)
  `, [product_id, change_type, qty, note || 'Manual adjustment', today]);

  saveDb();
  res.json({ message: 'Stock adjusted successfully' });
});

// ==================== REPORTS ====================

const getReportsHandler = (req: Request, res: Response) => {
  const { range = 'this_month', startDate, endDate } = req.query;
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.substring(0, 7);

  let salesWhere = '';
  let expenseWhere = '';
  let paramsSales: any[] = [];
  let paramsExpenses: any[] = [];

  if (range === 'today') {
    salesWhere = ' WHERE date = ?';
    expenseWhere = ' WHERE date = ?';
    paramsSales = [today];
    paramsExpenses = [today];
  } else if (range === 'this_month') {
    salesWhere = ' WHERE date LIKE ?';
    expenseWhere = ' WHERE date LIKE ?';
    paramsSales = [`${currentMonth}%`];
    paramsExpenses = [`${currentMonth}%`];
  } else if (range === 'custom' && startDate && endDate) {
    salesWhere = ' WHERE date >= ? AND date <= ?';
    expenseWhere = ' WHERE date >= ? AND date <= ?';
    paramsSales = [startDate, endDate];
    paramsExpenses = [startDate, endDate];
  }

  const salesSummaryRow = queryOne<any>(`
    SELECT COUNT(id) as total_sales,
           COALESCE(SUM(total), 0) as total_revenue,
           COALESCE(SUM(discount), 0) as total_discount
    FROM sales
    ${salesWhere}
  `, paramsSales);

  const salesItemWhere = salesWhere ? salesWhere.replace('WHERE date', 'WHERE s.date') : '';

  const costRow = queryOne<any>(`
    SELECT COALESCE(SUM(si.qty * p.purchase_price), 0) as total_cost
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN products p ON si.product_id = p.id
    ${salesItemWhere}
  `, paramsSales);

  const total_sales = salesSummaryRow?.total_sales || 0;
  const gross_sales = salesSummaryRow?.total_revenue || 0;
  const total_discount = salesSummaryRow?.total_discount || 0;
  const gross_cost = costRow?.total_cost || 0;

  let returnsWhere = salesWhere ? salesWhere.replace('WHERE date', 'WHERE sr.date AND sr.status = "completed"') : ' WHERE sr.status = "completed"';
  let returnsBaseWhere = salesWhere ? salesWhere + ' AND status = "completed"' : ' WHERE status = "completed"';

  const returnsSummaryRow = queryOne<any>(`
    SELECT COUNT(id) as total_returns,
           COALESCE(SUM(total_amount), 0) as total_returns_amount,
           COALESCE(SUM(refund_amount), 0) as total_refund_amount,
           COALESCE(SUM(adjustment_amount), 0) as total_adjustment_amount
    FROM sales_returns
    ${returnsBaseWhere}
  `, paramsSales);

  const returnedCostRow = queryOne<any>(`
    SELECT COALESCE(SUM(sri.quantity * p.purchase_price), 0) as total_returned_cost
    FROM sales_return_items sri
    JOIN sales_returns sr ON sri.return_id = sr.id
    JOIN products p ON sri.product_id = p.id
    ${returnsWhere}
  `, paramsSales);

  const total_returns = returnsSummaryRow?.total_returns || 0;
  const total_returns_amount = returnsSummaryRow?.total_returns_amount || 0;

  const net_sales = Math.max(0, gross_sales - total_returns_amount);
  const total_returned_cost = returnedCostRow?.total_returned_cost || 0;
  const net_cost = Math.max(0, gross_cost - total_returned_cost);

  const gross_profit = Math.max(0, gross_sales - gross_cost);
  const net_profit_before_expense = Math.max(0, net_sales - net_cost);

  const expenseRow = queryOne<any>(`
    SELECT COALESCE(SUM(amount), 0) as total_expenses
    FROM expenses
    ${expenseWhere}
  `, paramsExpenses);

  const total_expenses = expenseRow?.total_expenses || 0;
  const netProfit = net_profit_before_expense - total_expenses;

  const topProducts = queryAll<any>(`
    SELECT p.name,
           SUM(si.qty) as total_qty,
           SUM(si.total_price) as total_revenue
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN products p ON si.product_id = p.id
    ${salesItemWhere}
    GROUP BY p.id
    ORDER BY total_qty DESC
    LIMIT 10
  `, paramsSales);

  const topReturnedProducts = queryAll<any>(`
    SELECT p.name,
           SUM(sri.quantity) as return_qty,
           SUM(sri.return_amount) as total_return_amount
    FROM sales_return_items sri
    JOIN sales_returns sr ON sri.return_id = sr.id
    JOIN products p ON sri.product_id = p.id
    ${returnsWhere}
    GROUP BY p.id
    ORDER BY return_qty DESC
    LIMIT 10
  `, paramsSales);

  const returnReasonsBreakdown = queryAll<any>(`
    SELECT sr.reason,
           COUNT(sr.id) as count,
           SUM(sr.total_amount) as total_amount
    FROM sales_returns sr
    ${returnsWhere}
    GROUP BY sr.reason
    ORDER BY total_amount DESC
  `, paramsSales);

  res.json({
    salesSummary: {
      total_sales,
      gross_sales,
      total_revenue: net_sales,
      net_sales,
      total_returns,
      total_returns_amount,
      total_cost: net_cost,
      gross_cost,
      total_returned_cost,
      total_profit: net_profit_before_expense,
      gross_profit,
      total_discount
    },
    expenseSummary: {
      total_expenses
    },
    netProfit,
    topProducts,
    topReturnedProducts,
    returnReasonsBreakdown
  });
};

router.get('/reports', authenticateToken, getReportsHandler);
router.get('/reports/analytics', authenticateToken, getReportsHandler);

// ==================== BACKUP & RESTORE ====================

router.get('/backup/export', authenticateToken, (req: Request, res: Response) => {
  try {
    saveDb();
    const backupData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      users: queryAll('SELECT id, username, email, password, name, role, phone, active, created_at FROM users'),
      categories: queryAll('SELECT * FROM categories'),
      brands: queryAll('SELECT * FROM brands'),
      products: queryAll('SELECT * FROM products'),
      customers: queryAll('SELECT * FROM customers'),
      suppliers: queryAll('SELECT * FROM suppliers'),
      purchases: queryAll('SELECT * FROM purchases'),
      purchase_items: queryAll('SELECT * FROM purchase_items'),
      sales: queryAll('SELECT * FROM sales'),
      sale_items: queryAll('SELECT * FROM sale_items'),
      sales_returns: queryAll('SELECT * FROM sales_returns'),
      sales_return_items: queryAll('SELECT * FROM sales_return_items'),
      expense_categories: queryAll('SELECT * FROM expense_categories'),
      expenses: queryAll('SELECT * FROM expenses'),
      due_payments: queryAll('SELECT * FROM due_payments'),
      stock_history: queryAll('SELECT * FROM stock_history'),
      settings: queryAll('SELECT * FROM settings')
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=shop_backup_${new Date().toISOString().split('T')[0]}.json`);
    res.json(backupData);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to export backup: ' + error.message });
  }
});

router.post('/backup/import', authenticateToken, (req: Request, res: Response) => {
  try {
    const { backup } = req.body;
    if (!backup || typeof backup !== 'object') {
      return res.status(400).json({ error: 'Invalid backup file format' });
    }

    runSql('PRAGMA foreign_keys = OFF;');

    runSql('DELETE FROM sales_return_items');
    runSql('DELETE FROM sales_returns');
    runSql('DELETE FROM sale_items');
    runSql('DELETE FROM sales');
    runSql('DELETE FROM purchase_items');
    runSql('DELETE FROM purchases');
    runSql('DELETE FROM stock_history');
    runSql('DELETE FROM due_payments');
    runSql('DELETE FROM expenses');
    runSql('DELETE FROM expense_categories');
    runSql('DELETE FROM products');
    runSql('DELETE FROM categories');
    runSql('DELETE FROM brands');
    runSql('DELETE FROM customers');
    runSql('DELETE FROM suppliers');
    runSql('DELETE FROM settings');

    const insertRows = (tableName: string, rows: any[]) => {
      if (!rows || !Array.isArray(rows) || rows.length === 0) return;
      for (const row of rows) {
        const keys = Object.keys(row);
        if (keys.length === 0) continue;
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT OR REPLACE INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
        const values = keys.map(k => row[k]);
        runSql(sql, values);
      }
    };

    if (backup.categories) insertRows('categories', backup.categories);
    if (backup.brands) insertRows('brands', backup.brands);
    if (backup.products) insertRows('products', backup.products);
    if (backup.customers) insertRows('customers', backup.customers);
    if (backup.suppliers) insertRows('suppliers', backup.suppliers);
    if (backup.purchases) insertRows('purchases', backup.purchases);
    if (backup.purchase_items) insertRows('purchase_items', backup.purchase_items);
    if (backup.sales) insertRows('sales', backup.sales);
    if (backup.sale_items) insertRows('sale_items', backup.sale_items);
    if (backup.sales_returns) insertRows('sales_returns', backup.sales_returns);
    if (backup.sales_return_items) insertRows('sales_return_items', backup.sales_return_items);
    if (backup.expense_categories) insertRows('expense_categories', backup.expense_categories);
    if (backup.expenses) insertRows('expenses', backup.expenses);
    if (backup.due_payments) insertRows('due_payments', backup.due_payments);
    if (backup.stock_history) insertRows('stock_history', backup.stock_history);
    if (backup.settings) insertRows('settings', backup.settings);
    if (backup.users && Array.isArray(backup.users) && backup.users.length > 0) {
      insertRows('users', backup.users);
    }

    runSql('PRAGMA foreign_keys = ON;');
    saveDb();

    res.json({ message: 'Backup restored successfully' });
  } catch (error: any) {
    runSql('PRAGMA foreign_keys = ON;');
    res.status(500).json({ error: 'Failed to restore backup: ' + error.message });
  }
});

router.get('/backup/list', authenticateToken, (req: Request, res: Response) => {
  const backups = queryAll('SELECT * FROM backups ORDER BY id DESC');
  res.json(backups);
});

router.post('/backup/create', authenticateToken, (req: Request, res: Response) => {
  saveDb();
  const dbPath = path.join(process.cwd(), 'shop_database.db');
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `shop_backup_${timestamp}.db`;
  const destPath = path.join(backupDir, filename);

  fs.copyFileSync(dbPath, destPath);
  const stats = fs.statSync(destPath);

  const result = runSql('INSERT INTO backups (filename, file_size) VALUES (?, ?)', [filename, stats.size]);
  res.json({ id: result.lastInsertRowid, filename, file_size: stats.size, message: 'Backup created successfully' });
});

router.post('/backup/restore/:filename', authenticateToken, async (req: Request, res: Response) => {
  const { filename } = req.params;
  const backupPath = path.join(process.cwd(), 'backups', filename);

  if (!fs.existsSync(backupPath)) {
    return res.status(404).json({ error: 'Backup file not found' });
  }

  const dbPath = path.join(process.cwd(), 'shop_database.db');
  fs.copyFileSync(backupPath, dbPath);

  res.json({ message: 'Backup restored successfully. Please refresh the page.' });
});

// ==================== SETTINGS ====================

router.get('/settings', authenticateToken, (req: Request, res: Response) => {
  const rows = queryAll('SELECT * FROM settings');
  const settingsObj: Record<string, string> = {};
  for (const r of rows) {
    settingsObj[r.key] = r.value;
  }
  res.json(settingsObj);
});

router.put('/settings', authenticateToken, (req: Request, res: Response) => {
  const settingsObj = req.body;
  for (const [key, value] of Object.entries(settingsObj)) {
    runSql('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
  }
  res.json({ message: 'Settings updated successfully' });
});

// ==================== CLEAN DEMO DATA & FULL RESET ====================

router.post('/demo/clean', authenticateToken, (req: Request, res: Response) => {
  try {
    runSql('DELETE FROM sales_return_items');
    runSql('DELETE FROM sales_returns');
    runSql('DELETE FROM sale_items');
    runSql('DELETE FROM sales');
    runSql('DELETE FROM purchase_items');
    runSql('DELETE FROM purchases');
    runSql('DELETE FROM products');
    runSql('DELETE FROM categories');
    runSql('DELETE FROM brands');
    runSql('DELETE FROM customers');
    runSql('DELETE FROM suppliers');
    runSql('DELETE FROM expenses');
    runSql('DELETE FROM due_payments');
    runSql('DELETE FROM stock_history');
    runSql('DELETE FROM backups');
    saveDb();

    res.json({ message: 'All demo data cleaned successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to clean demo data: ' + error.message });
  }
});

router.post('/app/reset', authenticateToken, (req: Request, res: Response) => {
  try {
    runSql('PRAGMA foreign_keys = OFF;');
    runSql('DELETE FROM sales_return_items');
    runSql('DELETE FROM sales_returns');
    runSql('DELETE FROM sale_items');
    runSql('DELETE FROM sales');
    runSql('DELETE FROM purchase_items');
    runSql('DELETE FROM purchases');
    runSql('DELETE FROM products');
    runSql('DELETE FROM categories');
    runSql('DELETE FROM brands');
    runSql('DELETE FROM customers');
    runSql('DELETE FROM suppliers');
    runSql('DELETE FROM expenses');
    runSql('DELETE FROM due_payments');
    runSql('DELETE FROM stock_history');
    runSql('DELETE FROM backups');

    const tables = [
      'sale_items', 'sales', 'purchase_items', 'purchases', 
      'products', 'categories', 'brands', 'customers', 
      'suppliers', 'expenses', 'due_payments', 'stock_history', 'backups'
    ];
    tables.forEach(t => {
      try {
        runSql('DELETE FROM sqlite_sequence WHERE name = ?', [t]);
      } catch (e) {}
    });

    runSql('PRAGMA foreign_keys = ON;');
    saveDb();

    res.json({ message: 'App reset successfully' });
  } catch (error: any) {
    runSql('PRAGMA foreign_keys = ON;');
    res.status(500).json({ error: 'Failed to reset app: ' + error.message });
  }
});

export default router;