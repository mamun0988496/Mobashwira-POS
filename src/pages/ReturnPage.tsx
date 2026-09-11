import React, { useState, useEffect } from 'react';
import { Truck, Users, ArrowLeft, Plus, Search, CheckCircle, Package, Trash2, History } from 'lucide-react';
import { useShop } from '../context/ShopContext';

export const ReturnPage = () => {
  const { settings, getAuthHeader, formatCurrency, showToast } = useShop();
  const isBn = settings?.language === 'bn' || settings?.language === 'bd' || settings?.language === 'Bangla';

  // State Management
  const [activeView, setActiveView] = useState<'menu' | 'customer' | 'supplier'>('menu');
  const [submitting, setSubmitting] = useState(false);
  
  // Data States
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [returnLogs, setReturnLogs] = useState<any[]>([]); // রিটার্ন হিস্ট্রি

  // Customer Return States
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [searchedInvoice, setSearchedInvoice] = useState<any | null>(null);
  const [customerReturnItems, setCustomerReturnItems] = useState<any[]>([]);

  // Supplier Return States
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [supplierReturnCart, setSupplierReturnCart] = useState<any[]>([]);

  // পেজ লোড হওয়ার সাথে সাথে ডাটা ফেচ করা
  useEffect(() => {
    const loadData = async () => {
      try {
        const [salesRes, prodRes] = await Promise.all([
          fetch('/api/sales', { headers: getAuthHeader() }),
          fetch('/api/products', { headers: getAuthHeader() })
        ]);
        if (salesRes.ok) setSalesHistory(await salesRes.json());
        if (prodRes.ok) setProducts(await prodRes.json());
        
        // লোকাল স্টোরেজ থেকে রিটার্ন হিস্ট্রি আনা
        const savedLogs = localStorage.getItem('return_history_logs');
        if (savedLogs) setReturnLogs(JSON.parse(savedLogs));
      } catch (error) {
        console.error("Failed to load data");
      }
    };
    loadData();
  }, []);

  // হিস্ট্রি সেভ করার ফাংশন
  const saveReturnLog = (log: any) => {
    const updatedLogs = [log, ...returnLogs];
    setReturnLogs(updatedLogs);
    localStorage.setItem('return_history_logs', JSON.stringify(updatedLogs));
  };

  // ==========================================
  // CUSTOMER RETURN LOGIC
  // ==========================================
  const handleCustomerSearch = () => {
    if (!customerSearchQuery.trim()) {
      showToast('error', isBn ? 'একটি ইনভয়েস নম্বর দিন!' : 'Enter an invoice number!');
      return;
    }
    const foundSale = salesHistory.find((sale: any) => 
      sale.invoice_no?.toLowerCase() === customerSearchQuery.trim().toLowerCase()
    );
    if (!foundSale) {
      showToast('error', isBn ? 'ইনভয়েস পাওয়া যায়নি!' : 'Invoice not found!');
      setSearchedInvoice(null);
      return;
    }
    setSearchedInvoice(foundSale);
    setCustomerReturnItems((foundSale.items || []).map((item: any, idx: number) => ({
      id: item.product_id?.toString() || idx.toString(), 
      returnQty: 0
    })));
  };

  const handleConfirmCustomerReturn = async () => {
    const itemsToReturn = customerReturnItems.filter(item => item.returnQty > 0);
    if (itemsToReturn.length === 0) {
      showToast('error', isBn ? 'অন্তত একটি প্রোডাক্ট নির্বাচন করুন।' : 'Select at least one product.');
      return;
    }

    setSubmitting(true);
    let totalRefund = 0;

    try {
      for (const item of itemsToReturn) {
        const product = products.find(p => p.id.toString() === item.id.toString());
        if (product) {
          const newStock = Number(product.stock) + item.returnQty; 
          
          await fetch(`/api/products/${product.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify({ ...product, stock: newStock })
          });
          
          const saleItem = searchedInvoice.items.find((i: any) => i.product_id?.toString() === item.id.toString());
          totalRefund += item.returnQty * (saleItem?.unit_price || 0);
        }
      }
      
      saveReturnLog({
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        type: 'Customer',
        invoice: searchedInvoice.invoice_no,
        amount: totalRefund
      });

      showToast('success', isBn ? 'কাস্টমার রিটার্ন সফল! স্টক বাড়ানো হয়েছে।' : 'Return successful! Stock increased.');
      setSearchedInvoice(null);
      setCustomerSearchQuery('');
      setActiveView('menu');
      
      const prodRes = await fetch('/api/products', { headers: getAuthHeader() });
      if (prodRes.ok) setProducts(await prodRes.json());
    } catch (error) {
      showToast('error', isBn ? 'সমস্যা হয়েছে!' : 'Error occurred!');
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // SUPPLIER RETURN LOGIC
  // ==========================================
  const addToSupplierCart = (product: any) => {
    if (product.stock <= 0) {
      showToast('error', isBn ? 'স্টকে প্রোডাক্ট নেই!' : 'Out of stock!');
      return;
    }
    const exists = supplierReturnCart.find(item => item.id === product.id);
    if (exists) {
      showToast('info', isBn ? 'প্রোডাক্টটি লিস্টে আছে' : 'Product already in list');
      return;
    }
    setSupplierReturnCart([...supplierReturnCart, { ...product, returnQty: 1 }]);
    setSupplierSearchQuery('');
    setShowSuggestions(false);
  };

  const handleConfirmSupplierReturn = async () => {
    if (supplierReturnCart.length === 0) {
      showToast('error', isBn ? 'লিস্টে প্রোডাক্ট যোগ করুন।' : 'Add products to list.');
      return;
    }

    setSubmitting(true);
    let totalReturnVal = 0;

    try {
      for (const item of supplierReturnCart) {
        if (item.returnQty > item.stock) {
          showToast('error', `${item.name} - ${isBn ? 'স্টকের চেয়ে বেশি রিটার্ন দেওয়া যাবে না!' : 'Cannot return more than stock!'}`);
          setSubmitting(false);
          return;
        }

        const newStock = Number(item.stock) - item.returnQty; 
        
        await fetch(`/api/products/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify({ ...item, stock: newStock })
        });
        
        totalReturnVal += item.returnQty * (item.purchase_price || item.selling_price || 0);
      }
      
      saveReturnLog({
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        type: 'Supplier',
        invoice: 'N/A',
        amount: totalReturnVal
      });

      showToast('success', isBn ? 'সাপ্লায়ার রিটার্ন সফল! স্টক কমানো হয়েছে।' : 'Return successful! Stock decreased.');
      setSupplierReturnCart([]);
      setActiveView('menu');
      
      const prodRes = await fetch('/api/products', { headers: getAuthHeader() });
      if (prodRes.ok) setProducts(await prodRes.json());
    } catch (error) {
      showToast('error', isBn ? 'সমস্যা হয়েছে!' : 'Error occurred!');
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // RENDER: CUSTOMER RETURN VIEW
  // ==========================================
  if (activeView === 'customer') {
    const totalRefund = searchedInvoice ? searchedInvoice.items.reduce((total: number, item: any, idx: number) => {
      const rItem = customerReturnItems.find(r => r.id === (item.product_id?.toString() || idx.toString()));
      return total + (rItem ? rItem.returnQty * (item.unit_price || 0) : 0);
    }, 0) : 0;

    return (
      <div className="p-4 sm:p-6 w-full mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveView('menu')} className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full hover:bg-slate-300 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </button>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{isBn ? 'কাস্টমার রিটার্ন' : 'Customer Return'}</h2>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex gap-3">
          <input 
            type="text" value={customerSearchQuery} onChange={(e) => setCustomerSearchQuery(e.target.value)}
            placeholder={isBn ? "ইনভয়েস নম্বর লিখুন (যেমন: INV-1234)" : "Enter invoice number..."}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:border-indigo-500 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-white"
          />
          <button onClick={handleCustomerSearch} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium cursor-pointer">{isBn ? 'খুঁজুন' : 'Search'}</button>
        </div>

        {searchedInvoice && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
              <p className="font-bold text-slate-800 dark:text-white">{isBn ? 'ইনভয়েস নং' : 'Invoice No'}: {searchedInvoice.invoice_no}</p>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="p-4">{isBn ? 'প্রোডাক্ট' : 'Product'}</th>
                  <th className="p-4 text-center">{isBn ? 'কেনা হয়েছিল' : 'Sold'}</th>
                  <th className="p-4 text-center">{isBn ? 'রিটার্ন পরিমাণ' : 'Return Qty'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {searchedInvoice.items.map((item: any, idx: number) => {
                  const id = item.product_id?.toString() || idx.toString();
                  const rItem = customerReturnItems.find(r => r.id === id);
                  const qty = rItem ? rItem.returnQty : 0;
                  return (
                    <tr key={id}>
                      <td className="p-4 text-slate-800 dark:text-slate-200">{item.product_name}</td>
                      <td className="p-4 text-center">{item.qty}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => setCustomerReturnItems(prev => prev.map(p => p.id === id ? {...p, returnQty: Math.max(0, qty - 1)} : p))} className="px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-md">-</button>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 w-6 text-center">{qty}</span>
                          <button onClick={() => setCustomerReturnItems(prev => prev.map(p => p.id === id ? {...p, returnQty: Math.min(item.qty, qty + 1)} : p))} className="px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-md">+</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="p-5 bg-slate-50 dark:bg-slate-950 flex justify-between items-center border-t border-slate-200 dark:border-slate-800">
              <p className="text-xl font-bold dark:text-white">{isBn ? 'ফেরত টাকা' : 'Refund'}: {formatCurrency(totalRefund)}</p>
              <button onClick={handleConfirmCustomerReturn} disabled={submitting} className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg flex gap-2 items-center cursor-pointer disabled:opacity-50">
                <CheckCircle className="w-5 h-5" /> {isBn ? 'কনফার্ম করুন (স্টক বাড়বে)' : 'Confirm (Stock +)'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER: SUPPLIER RETURN VIEW
  // ==========================================
  if (activeView === 'supplier') {
    const filteredProds = products.filter(p => p.name.toLowerCase().includes(supplierSearchQuery.toLowerCase()));
    const totalSuppRefund = supplierReturnCart.reduce((acc, item) => acc + (item.returnQty * (item.purchase_price || item.selling_price || 0)), 0);

    return (
      <div className="p-4 sm:p-6 w-full mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveView('menu')} className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full hover:bg-slate-300 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </button>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{isBn ? 'সাপ্লায়ার রিটার্ন' : 'Supplier Return'}</h2>
        </div>

        {/* Product Search */}
        <div className="relative z-10">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              value={supplierSearchQuery} 
              onChange={(e) => { setSupplierSearchQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              placeholder={isBn ? "প্রোডাক্টের নাম দিয়ে খুঁজুন..." : "Search product to return..."}
              className="w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white shadow-sm"
            />
          </div>
          {showSuggestions && supplierSearchQuery && (
            <div className="absolute w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
              {filteredProds.map(p => (
                <div key={p.id} onClick={() => addToSupplierCart(p)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex justify-between border-b dark:border-slate-700 last:border-0">
                  <span className="font-medium dark:text-white">{p.name}</span>
                  <span className="text-sm text-slate-500">{isBn ? 'বর্তমান স্টক' : 'Stock'}: {p.stock}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Products Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="p-4">{isBn ? 'প্রোডাক্ট' : 'Product'}</th>
                <th className="p-4 text-center">{isBn ? 'স্টক আছে' : 'In Stock'}</th>
                <th className="p-4 text-center">{isBn ? 'কত পিস ফেরত দিবেন?' : 'Return Qty'}</th>
                <th className="p-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {supplierReturnCart.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-400">{isBn ? 'কোনো প্রোডাক্ট যোগ করা হয়নি' : 'No products added'}</td></tr>
              ) : (
                supplierReturnCart.map(item => (
                  <tr key={item.id}>
                    <td className="p-4 font-medium dark:text-white">{item.name}</td>
                    <td className="p-4 text-center dark:text-slate-300">{item.stock}</td>
                    <td className="p-4">
                       <div className="flex items-center justify-center gap-3">
                          <button onClick={() => setSupplierReturnCart(prev => prev.map(p => p.id === item.id ? {...p, returnQty: Math.max(1, p.returnQty - 1)} : p))} className="px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-md">-</button>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 w-6 text-center">{item.returnQty}</span>
                          <button onClick={() => setSupplierReturnCart(prev => prev.map(p => p.id === item.id ? {...p, returnQty: Math.min(p.stock, p.returnQty + 1)} : p))} className="px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-md">+</button>
                        </div>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => setSupplierReturnCart(prev => prev.filter(p => p.id !== item.id))} className="text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg cursor-pointer">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="p-5 bg-slate-50 dark:bg-slate-950 flex justify-between items-center border-t border-slate-200 dark:border-slate-800">
             <p className="text-xl font-bold dark:text-white">{isBn ? 'আনুমানিক মূল্য' : 'Est. Value'}: {formatCurrency(totalSuppRefund)}</p>
             <button onClick={handleConfirmSupplierReturn} disabled={submitting || supplierReturnCart.length === 0} className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-lg flex gap-2 items-center cursor-pointer disabled:opacity-50">
               <CheckCircle className="w-5 h-5" /> {isBn ? 'কনফার্ম করুন (স্টক কমবে)' : 'Confirm (Stock -)'}
             </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: MAIN MENU & HISTORY (DEFAULT)
  // ==========================================
  return (
    <div className="p-4 sm:p-6 w-full mx-auto h-full flex flex-col space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">{isBn ? 'রিটার্ন ম্যানেজমেন্ট' : 'Return Management'}</h2>
        
        {/* এখানে w-full এবং গ্যাপ (gap-6) অ্যাডজাস্ট করা হয়েছে যেন ডানে-বামে সমানভাবে থাকে */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <button onClick={() => setActiveView('supplier')} className="flex flex-col items-center justify-center py-10 px-6 bg-white/50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm cursor-pointer group w-full">
            <Truck className="w-12 h-12 text-rose-500 mb-3 group-hover:scale-110 transition-transform" />
            <span className="text-xl font-bold text-slate-700 dark:text-white">{isBn ? 'সাপ্লায়ার রিটার্ন' : 'Supplier Return'}</span>
            <span className="text-sm text-slate-500 mt-2">{isBn ? 'কোম্পানিকে মাল ফেরত দিন (স্টক মাইনাস)' : 'Return items to supplier (Stock -)'}</span>
          </button>

          <button onClick={() => setActiveView('customer')} className="flex flex-col items-center justify-center py-10 px-6 bg-white/50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm cursor-pointer group w-full">
            <Users className="w-12 h-12 text-emerald-500 mb-3 group-hover:scale-110 transition-transform" />
            <span className="text-xl font-bold text-slate-700 dark:text-white">{isBn ? 'কাস্টমার রিটার্ন' : 'Customer Return'}</span>
            <span className="text-sm text-slate-500 mt-2">{isBn ? 'কাস্টমার থেকে মাল ফেরত নিন (স্টক প্লাস)' : 'Accept return from customer (Stock +)'}</span>
          </button>
        </div>
      </div>

      {/* রিটার্ন হিস্ট্রি টেবিল (বাটনের নিচে) */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col min-h-[300px]">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-indigo-500" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">{isBn ? 'সাম্প্রতিক রিটার্ন হিস্ট্রি' : 'Recent Return History'}</h3>
        </div>
        
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="p-3 font-medium">{isBn ? 'তারিখ' : 'Date'}</th>
                <th className="p-3 font-medium">{isBn ? 'ধরন' : 'Type'}</th>
                <th className="p-3 font-medium">{isBn ? 'ইনভয়েস নং' : 'Invoice No'}</th>
                <th className="p-3 font-medium text-right">{isBn ? 'টাকার পরিমাণ' : 'Amount'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {returnLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    {isBn ? 'কোনো রিটার্ন রেকর্ড নেই' : 'No records found'}
                  </td>
                </tr>
              ) : (
                returnLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 text-slate-600 dark:text-slate-300">{log.date}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${log.type === 'Customer' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {log.type === 'Customer' ? (isBn ? 'কাস্টমার রিটার্ন' : 'Customer') : (isBn ? 'সাপ্লায়ার রিটার্ন' : 'Supplier')}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300 font-mono">{log.invoice}</td>
                    <td className="p-3 text-right font-bold text-slate-800 dark:text-white">{formatCurrency(log.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};