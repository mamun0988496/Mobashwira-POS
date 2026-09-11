import React, { useState, useEffect, useRef } from 'react';
import { useShop } from '../context/ShopContext';
import { Product, CartItem, Sale, Customer } from '../types';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Printer,
  CheckCircle2,
  History,
  Banknote,
  Clock,
  User
} from 'lucide-react';

interface POSPageProps {
  onViewInvoice: (sale: Sale) => void;
}

export const POSPage: React.FC<POSPageProps> = ({ onViewInvoice }) => {
  const { formatCurrency, getAuthHeader, showToast, language } = useShop();
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState<'terminal' | 'history'>('terminal');
  const [products, setProducts] = useState<Product[]>([]);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // POS Form State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [vatPercent, setVatPercent] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile_banking' | 'partial'>('cash');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const [prodRes, historyRes, custRes] = await Promise.all([
        fetch('/api/products', { headers: getAuthHeader() }),
        fetch('/api/sales', { headers: getAuthHeader() }),
        fetch('/api/customers', { headers: getAuthHeader() })
      ]);

      if (prodRes.ok) setProducts(await prodRes.json());
      if (historyRes.ok) setSalesHistory(await historyRes.json());
      if (custRes.ok) setCustomers(await custRes.json());
    } catch {
      showToast('error', 'Failed to load POS catalog data');
    }
  };

  useEffect(() => {
    fetchData();
    barcodeInputRef.current?.focus();
  }, []);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      showToast('error', `${product.name} is Out of Stock!`);
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          showToast('info', `Maximum stock limit (${product.stock}) reached for this product.`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prevCart, { product, qty: 1, unit_price: product.selling_price }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.qty + delta;
            if (newQty > item.product.stock) {
              showToast('info', `Maximum available stock is ${item.product.stock}`);
              return item;
            }
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setVatPercent(0);
    setPaidAmount('');
    setPaymentMethod('cash');
    setSelectedCustomerId('');
    setNote('');
  };

  // Computations
  const subtotal = cart.reduce((acc, item) => acc + item.unit_price * item.qty, 0);
  const vatAmount = (subtotal * vatPercent) / 100;
  const totalAmount = Math.max(0, subtotal - discount + vatAmount);
  const numericPaid = paidAmount === ''
    ? (paymentMethod === 'partial' ? 0 : totalAmount)
    : (isNaN(parseFloat(paidAmount)) ? (paymentMethod === 'partial' ? 0 : totalAmount) : parseFloat(paidAmount));
  const dueAmount = Math.max(0, totalAmount - numericPaid);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('error', isBn ? 'কার্ট খালি' : 'Cart is empty');
      return;
    }

    if ((paymentMethod === 'partial' || dueAmount > 0) && !selectedCustomerId) {
      showToast('error', isBn ? 'বাকি বিক্রয়ের জন্য অনুগ্রহ করে Due Center কাস্টমার লিস্ট থেকে কাস্টমার সিলেক্ট করুন' : 'Please select a customer from Due Center list for due sale');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer_id: selectedCustomerId ? parseInt(selectedCustomerId, 10) : null,
        items: cart.map((i) => ({
          product_id: i.product.id,
          qty: i.qty,
          unit_price: i.unit_price
        })),
        discount,
        vat: vatPercent,
        paid_amount: numericPaid,
        payment_method: paymentMethod,
        note
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const saleResult = await res.json();
        showToast('success', `Sale Completed! Invoice: ${saleResult.invoice_no}`);
        
        // 🔴 ফিক্স: সেল সাকসেস হওয়ার সাথে সাথেই আগে কার্ট খালি করা এবং স্টক আপডেট করা হলো
        clearCart();
        await fetchData();

        // এরপর ইনভয়েস প্রিন্ট করার জন্য ডেটা লোড করবে
        try {
          const saleDetailsRes = await fetch(`/api/sales/${saleResult.id}`, { headers: getAuthHeader() });
          if (saleDetailsRes.ok) {
            const fullSale = await saleDetailsRes.json();
            onViewInvoice(fullSale);
          } else {
            onViewInvoice(saleResult);
          }
        } catch (invoiceErr) {
          console.error("Failed to load invoice details:", invoiceErr);
          onViewInvoice(saleResult); // ফেইল করলেও রসিদ ওপেন হবে
        }
      } else {
        const errData = await res.json();
        showToast('error', errData.error || 'Failed to complete sale');
      }
    } catch {
      showToast('error', 'Network error completing transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    return (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-4 w-full h-[calc(100vh-120px)] flex flex-col overflow-hidden">
      {/* Top Header Tabs */}
      <div className="shrink-0 flex items-center justify-between bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-2 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'terminal'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <ShoppingCart className="w-4 h-4" /> POS Terminal
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <History className="w-4 h-4" /> Sales History ({salesHistory.length})
          </button>
        </div>
      </div>

      {activeTab === 'terminal' ? (
        // MAIN POS LAYOUT 
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">
          
          {/* Left Column: Product Grid & Search */}
          <div className="flex-1 w-full h-full flex flex-col space-y-4 min-h-0">
            {/* Search Input */}
            <div className="shrink-0 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search products by name or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/60 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xl shadow-slate-200/50 dark:shadow-none"
              />
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 content-start pb-4">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={isOutOfStock}
                    className={`p-3 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl border text-left flex flex-col justify-between transition-all group relative cursor-pointer ${
                      isOutOfStock
                        ? 'opacity-50 border-slate-200/50 dark:border-slate-800/50 cursor-not-allowed'
                        : 'border-white/60 dark:border-slate-700/60 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-white/70 dark:hover:bg-slate-800/70 shadow-lg shadow-slate-200/40 dark:shadow-none'
                    }`}
                  >
                    <div>
                      <div className="h-24 w-full bg-slate-100/50 dark:bg-slate-900/60 rounded-xl overflow-hidden mb-2 relative">
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-slate-900/80 backdrop-blur-md text-white text-[9px] font-mono rounded-md">
                          {p.barcode}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight">{p.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{p.category_name || 'General'}</p>
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-white/40 dark:border-slate-700/40 pt-2">
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(p.selling_price)}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        isOutOfStock
                          ? 'bg-rose-100/80 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                          : 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                      }`}>
                        {isOutOfStock ? 'Out' : `Stock: ${p.stock}`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Cart & Checkout Panel */}
          <div className="w-full lg:w-[400px] xl:w-[450px] shrink-0 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none p-5 flex flex-col h-full min-h-0">
            
            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto border-b border-slate-100 dark:border-slate-700/60 pb-3 space-y-2 custom-scrollbar pr-2">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center h-full">
                  <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
                  <span>Click products to add to checkout cart</span>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl text-xs">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{item.product.name}</p>
                      <p className="text-[10px] text-slate-500">{formatCurrency(item.unit_price)} each</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                        <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-mono font-bold text-slate-900 dark:text-slate-100">{item.qty}</span>
                        <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-bold text-slate-900 dark:text-slate-100 w-16 text-right">
                        {formatCurrency(item.unit_price * item.qty)}
                      </span>

                      <button onClick={() => removeFromCart(item.product.id)} className="text-rose-400 hover:text-rose-600 p-1 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Calculations & Discounts */}
            <div className="shrink-0 space-y-2 text-xs pt-3">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(subtotal)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">Discount ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={discount || ''}
                    onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0.00"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">VAT (%)</label>
                  <input
                    type="number"
                    min="0"
                    value={vatPercent || ''}
                    onChange={(e) => setVatPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0%"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
                  />
                </div>
              </div>

              {/* Payment Options */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                  {isBn ? 'পেমেন্ট মেথড' : 'Payment Method'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setPaymentMethod('cash'); setPaidAmount(''); }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'cash' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>{isBn ? 'নগদ' : 'Cash'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setPaymentMethod('partial'); setPaidAmount(''); }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'partial' ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>{isBn ? 'বাকি' : 'Due'}</span>
                  </button>
                </div>
              </div>

              {/* Customer Selection */}
              {paymentMethod === 'partial' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-slate-500 block">
                      {isBn ? 'কাস্টমার নির্বাচন (Due Center List)' : 'Select Customer (Due Center List)'}
                    </label>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">* {isBn ? 'বাকি হিসাবের জন্য আবশ্যক' : 'Required'}</span>
                  </div>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl font-medium text-xs focus:outline-none transition-colors ${
                        !selectedCustomerId ? 'border-amber-500 ring-2 ring-amber-500/20 text-slate-900 dark:text-slate-100' : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      <option value="">-- {isBn ? 'কাস্টমার সিলেক্ট করুন' : 'Select Customer'} --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ''} {c.total_due > 0 ? `- ${isBn ? 'বর্তমান বাকি' : 'Current Due'}: ৳${c.total_due}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                  {isBn ? 'পরিশোধিত পরিমাণ (Paid Amount)' : 'Paid Amount ($)'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value.replace(/^0+(?=\d)/, ''))}
                  placeholder={paymentMethod === 'partial' ? '0' : formatCurrency(totalAmount)}
                  className="w-full p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 rounded-xl font-mono font-bold text-sm"
                />
              </div>

              {/* Total & Due Summary */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex justify-between items-center text-sm font-black text-slate-900 dark:text-slate-100">
                  <span>Total Payable:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 text-base">{formatCurrency(totalAmount)}</span>
                </div>
                {dueAmount > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-rose-600 dark:text-rose-400">
                    <span>Due Balance:</span>
                    <span>{formatCurrency(dueAmount)}</span>
                  </div>
                )}
              </div>

              {/* Submit Checkout Button */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={clearCart}
                  className="px-3 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || submitting}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> {submitting ? 'Processing...' : 'Complete Sale & Print'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Sales History View */
        <div className="flex-1 min-h-0 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 p-5 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col">
          <h3 className="shrink-0 text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Sales History</h3>
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100/90 dark:bg-slate-700/90 backdrop-blur-md text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] z-10">
                <tr>
                  <th className="p-3">Invoice Number</th>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3 text-center">Quantity</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Total Price</th>
                  <th className="p-3">Payment Method</th>
                  <th className="p-3 text-right">Grand Total</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {salesHistory.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-400">
                      No sales records found.
                    </td>
                  </tr>
                ) : (
                  salesHistory.flatMap((s) => {
                    const items = s.items && s.items.length > 0
                      ? s.items
                      : [{ product_name: 'Sale Product', qty: 1, unit_price: s.subtotal || s.total, total_price: s.subtotal || s.total }];

                    return items.map((item, itemIdx) => (
                      <tr key={`${s.id}-${itemIdx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                        {itemIdx === 0 && (
                          <>
                            <td rowSpan={items.length} className="p-3 font-bold text-indigo-600 dark:text-indigo-400 align-top border-b border-slate-100 dark:border-slate-700/40">
                              {s.invoice_no}
                            </td>
                            <td rowSpan={items.length} className="p-3 text-slate-500 dark:text-slate-400 whitespace-nowrap align-top border-b border-slate-100 dark:border-slate-700/40">
                              {s.date}
                            </td>
                          </>
                        )}
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/40">
                          {item.product_name}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700/40">
                          {item.qty}
                        </td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/40">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="p-3 text-right font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/40">
                          {formatCurrency(item.total_price)}
                        </td>
                        {itemIdx === 0 && (
                          <>
                            <td rowSpan={items.length} className="p-3 uppercase text-[10px] font-bold text-slate-600 dark:text-slate-300 align-top border-b border-slate-100 dark:border-slate-700/40">
                              <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700/60 rounded-md">
                                {s.payment_method ? s.payment_method.replace('_', ' ') : 'CASH'}
                              </span>
                            </td>
                            <td rowSpan={items.length} className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm align-top border-b border-slate-100 dark:border-slate-700/40">
                              {formatCurrency(s.total)}
                            </td>
                            <td rowSpan={items.length} className="p-3 text-center align-top border-b border-slate-100 dark:border-slate-700/40">
                              <button
                                onClick={() => onViewInvoice(s)}
                                title="Print Invoice"
                                className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-lg transition-colors cursor-pointer"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ));
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};