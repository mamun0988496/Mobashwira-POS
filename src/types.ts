export type UserRole = 'admin' | 'manager' | 'cashier';

export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  active: number;
  created_at?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  product_count?: number;
  created_at?: string;
}

export interface Brand {
  id: number;
  name: string;
  description?: string;
  product_count?: number;
  created_at?: string;
}

export interface Product {
  id: number;
  name: string;
  barcode: string;
  category_id?: number;
  category_name?: string;
  brand_id?: number;
  brand_name?: string;
  purchase_price: number;
  selling_price: number;
  wholesale_price: number;
  stock: number;
  min_stock_alert: number;
  expire_date?: string;
  image?: string;
  created_at?: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  total_due: number;
  created_at?: string;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  company_name?: string;
  total_due: number;
  created_at?: string;
}

export interface CartItem {
  product: Product;
  qty: number;
  unit_price: number;
}

export interface SaleItem {
  id?: number;
  sale_id?: number;
  product_id: number;
  product_name?: string;
  barcode?: string;
  qty: number;
  unit_price: number;
  total_price: number;
}

export interface Sale {
  id: number;
  invoice_no: string;
  customer_id?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  user_id?: number;
  cashier_name?: string;
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  paid_amount: number;
  due_amount: number;
  payment_method: 'cash' | 'card' | 'mobile_banking' | 'partial';
  payment_status: 'paid' | 'partial' | 'due';
  note?: string;
  date: string;
  created_at?: string;
  items?: SaleItem[];
}

export interface PurchaseItem {
  id?: number;
  purchase_id?: number;
  product_id: number;
  product_name?: string;
  qty: number;
  unit_price: number;
  total_price: number;
  expire_date?: string;
}

export interface Purchase {
  id: number;
  purchase_no: string;
  supplier_id: number;
  supplier_name?: string;
  company_name?: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: 'paid' | 'partial' | 'due';
  note?: string;
  date: string;
  created_at?: string;
  items?: PurchaseItem[];
}

export interface ExpenseCategory {
  id: number;
  name: string;
  description?: string;
}

export interface Expense {
  id: number;
  title: string;
  category_id?: number;
  category_name?: string;
  amount: number;
  date: string;
  note?: string;
  created_at?: string;
}

export interface DuePayment {
  id: number;
  type: 'customer' | 'supplier';
  entity_id: number;
  amount: number;
  payment_method: string;
  note?: string;
  date: string;
  created_at?: string;
}

export interface StockHistory {
  id: number;
  product_id: number;
  product_name?: string;
  barcode?: string;
  change_type: 'purchase' | 'sale' | 'adjustment_add' | 'adjustment_remove' | 'return';
  qty: number;
  note?: string;
  date: string;
  created_at?: string;
}

export interface ShopSettings {
  shop_name: string;
  logo: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  language: string;
  invoice_design: '58mm' | 'A4';
  dark_mode: string;
  auto_backup: string;
}

export interface SalesReturnItem {
  id?: number;
  return_id?: number;
  sale_item_id?: number;
  product_id: number;
  product_name?: string;
  barcode?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  return_amount: number;
  original_qty?: number;
  already_returned_qty?: number;
}

export type ReturnReason =
  | 'Damaged Product'
  | 'Wrong Product'
  | 'Customer Changed Mind'
  | 'Defective Product'
  | 'Expired Product'
  | 'Other';

export type RefundMethod = 'cash' | 'bkash' | 'nagad' | 'card' | 'due_adjustment';

export interface SalesReturn {
  id: number;
  return_number: string;
  original_sale_id: number;
  invoice_no?: string;
  customer_id?: number | null;
  customer_name?: string;
  customer_phone?: string;
  total_amount: number;
  refund_amount: number;
  adjustment_amount: number;
  refund_method: RefundMethod;
  reason: ReturnReason | string;
  note?: string;
  status: 'completed' | 'cancelled';
  created_by?: number | null;
  created_by_name?: string;
  date: string;
  created_at?: string;
  items?: SalesReturnItem[];
}

export interface DashboardStats {
  todaySales: number;
  todaySalesCount: number;
  todayProfit: number;
  totalProducts: number;
  totalStockValue?: number;
  totalStockCostValue?: number;
  totalCustomers: number;
  lowStockCount: number;
  totalCustomerDue: number;
  totalSupplierDue: number;
  todayExpense: number;
  totalReturnsCount?: number;
  totalReturnsAmount?: number;
}

export interface BackupItem {
  id: number;
  filename: string;
  file_size: number;
  created_at: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
