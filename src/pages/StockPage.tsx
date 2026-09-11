import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { Product, StockHistory } from '../types';
import { Boxes, AlertTriangle, ArrowUpRight, ArrowDownRight, History, SlidersHorizontal, Plus, Minus, RotateCcw, CalendarX, AlertOctagon } from 'lucide-react';

export const StockPage: React.FC = () => {
  const { formatCurrency, getAuthHeader, showToast, language } = useShop();
  const isBn = language === 'bn';

  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<StockHistory[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'low' | 'out' | 'expire' | 'expire_45'>('all');
  const [activeView, setActiveView] = useState<'inventory' | 'history'>('inventory');

  // Adjustment Modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [changeType, setChangeType] = useState<'adjustment_add' | 'adjustment_remove' | 'return'>('adjustment_add');
  const [adjustQty, setAdjustQty] = useState<string>('');
  const [adjustNote, setAdjustNote] = useState<string>('');

  const fetchStock = async () => {
    try {
      const res = await fetch('/api/stock', { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setHistory(data.history || []);
      }
    } catch {
      showToast('error', 'Error loading inventory stock');
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !adjustQty || parseInt(adjustQty) <= 0) return;

    try {
      const res = await fetch('/api/stock/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          change_type: changeType,
          qty: parseInt(adjustQty),
          note: adjustNote
        })
      });

      if (res.ok) {
        showToast('success', 'Stock level adjusted successfully');
        setSelectedProduct(null);
        setAdjustQty('');
        setAdjustNote('');
        fetchStock();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Adjustment failed');
      }
    } catch {
      showToast('error', 'Network error');
    }
  };

  // ডেট ওভার এবং ৪৫ দিনের লজিক একসাথে চেক করার ফাংশন
  const checkExpireStatus = (expireDateStr?: string) => {
    if (!expireDateStr) return { isExpired: false, isExpiring45: false, daysLeft: null };
    const expireDate = new Date(expireDateStr);
    if (isNaN(expireDate.getTime())) return { isExpired: false, isExpiring45: false, daysLeft: null };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expireDate.setHours(0, 0, 0, 0);

    const diffTime = expireDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      isExpired: diffDays < 0, // ডেট অলরেডি ওভার হয়ে গেছে
      isExpiring45: diffDays >= 0 && diffDays <= 45, // ডেট ওভার হয়নি, কিন্তু ৪৫ দিন বা তার কম বাকি
      daysLeft: diffDays
    };
  };

  const filteredProducts = products.filter((p) => {
    if (filterTab === 'low') return p.stock <= p.min_stock_alert && p.stock > 0;
    if (filterTab === 'out') return p.stock <= 0;
    if (filterTab === 'expire') return checkExpireStatus(p.expire_date).isExpired;
    if (filterTab === 'expire_45') return checkExpireStatus(p.expire_date).isExpiring45;
    return true;
  });

  const lowStockCount = products.filter((p) => p.stock <= p.min_stock_alert && p.stock > 0).length;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;
  const dateExpireCount = products.filter((p) => checkExpireStatus(p.expire_date).isExpired).length;
  const expire45Count = products.filter((p) => checkExpireStatus(p.expire_date).isExpiring45).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200/50">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Stock & Inventory Management</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Monitor quantities, handle damage/returns & review stock logs</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('inventory')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeView === 'inventory' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 border border-white/80 dark:border-slate-700/60'
            }`}
          >
            Current Inventory
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeView === 'history' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 border border-white/80 dark:border-slate-700/60'
            }`}
          >
            Stock Movement Log
          </button>
        </div>
      </div>

      {activeView === 'inventory' ? (
        <>
          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md'
                  : 'bg-white/40 dark:bg-slate-800/40 backdrop-blur-md text-slate-600 dark:text-slate-300 border border-white/60 dark:border-slate-700/60'
              }`}
            >
              All Items ({products.length})
            </button>
            <button
              onClick={() => setFilterTab('low')}
              className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                filterTab === 'low'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'bg-white/40 dark:bg-slate-800/40 backdrop-blur-md text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Low Stock ({lowStockCount})
            </button>
            <button
              onClick={() => setFilterTab('out')}
              className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                filterTab === 'out'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'bg-white/40 dark:bg-slate-800/40 backdrop-blur-md text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60'
              }`}
            >
              Out of Stock ({outOfStockCount})
            </button>
            
            {/* ৪ নম্বর বাটন: Date Expire (শুধুমাত্র মেয়াদোত্তীর্ণ) */}
            <button
              onClick={() => setFilterTab('expire')}
              className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                filterTab === 'expire'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-white/40 dark:bg-slate-800/40 backdrop-blur-md text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/60'
              }`}
            >
              <CalendarX className="w-3.5 h-3.5" /> {isBn ? `ডেট এক্সপায়ার (${dateExpireCount})` : `Date Expire (${dateExpireCount})`}
            </button>

            {/* ৫ নম্বর বাটন: 45 Days Left (মেয়াদ শেষ হয়নি, কিন্তু ৪৫ দিন বা তার কম বাকি) */}
            <button
              onClick={() => setFilterTab('expire_45')}
              className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                filterTab === 'expire_45'
                  ? 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-600/20'
                  : 'bg-white/40 dark:bg-slate-800/40 backdrop-blur-md text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-200/60 dark:border-fuchsia-800/60'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5" /> {isBn ? `৪৫ দিন বাকি (${expire45Count})` : `45 Days Left (${expire45Count})`}
            </button>
          </div>

          {/* Stock Table */}
          <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/30 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <tr>
                  <th className="p-3.5 pl-5">Product</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Current Stock</th>
                  <th className="p-3.5">Expire Date</th>
                  <th className="p-3.5">Min Alert Level</th>
                  <th className="p-3.5">Total Value (Cost)</th>
                  <th className="p-3.5 text-center">Adjust Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/20 dark:divide-slate-700/30">
                {filteredProducts.map((p) => {
                  const isLow = p.stock <= p.min_stock_alert && p.stock > 0;
                  const isOut = p.stock <= 0;
                  const expireInfo = checkExpireStatus(p.expire_date);
                  
                  return (
                    <tr key={p.id} className="hover:bg-white/40 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="p-3.5 pl-5 flex items-center gap-3">
                        <img src={p.image} alt={p.name} className="w-9 h-9 rounded-xl object-cover bg-slate-100 dark:bg-slate-900 shrink-0 border border-white/50" />
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">{p.name}</h4>
                          <span className="font-mono text-[10px] text-slate-400">{p.barcode}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300 font-medium">{p.category_name || 'General'}</td>
                      <td className="p-3.5 font-bold text-sm">
                        <span className={`px-2.5 py-1 rounded-lg text-xs ${
                          isOut ? 'bg-rose-100/80 text-rose-800 border border-rose-200/50' : isLow ? 'bg-amber-100/80 text-amber-800 border border-amber-200/50' : 'bg-emerald-100/80 text-emerald-800 border border-emerald-200/50'
                        }`}>
                          {p.stock} units
                        </span>
                      </td>
                      <td className="p-3.5 font-medium">
                        {p.expire_date ? (
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`px-2 py-1 rounded-lg text-xs font-mono font-bold inline-flex items-center gap-1 ${
                              expireInfo.isExpired
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                                : expireInfo.isExpiring45
                                  ? 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/80 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-800/60'
                                  : 'text-slate-600 dark:text-slate-400'
                            }`}>
                              {(expireInfo.isExpired || expireInfo.isExpiring45) && (
                                <CalendarX className={`w-3 h-3 ${expireInfo.isExpired ? 'text-rose-600 dark:text-rose-400' : 'text-fuchsia-600 dark:text-fuchsia-400'}`} />
                              )}
                              {p.expire_date}
                            </span>
                            
                            {/* ওয়ার্নিং মেসেজ */}
                            {expireInfo.isExpired && (
                              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Expired!</span>
                            )}
                            {expireInfo.isExpiring45 && (
                              <span className="text-[10px] font-bold text-fuchsia-600 dark:text-fuchsia-400">
                                {expireInfo.daysLeft === 0 ? 'Expires today!' : `${expireInfo.daysLeft} days left`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">N/A</span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-slate-500">{p.min_stock_alert} units</td>
                      <td className="p-3.5 font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(p.stock * p.purchase_price)}</td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setSelectedProduct(p)}
                          className="px-3 py-1.5 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl hover:bg-indigo-100 transition-colors cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 inline mr-1" /> Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* Stock History Log */
        <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 p-5 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-4">Stock Movement History</h4>
          <div className="space-y-3">
            {history.map((h) => (
              <div key={h.id} className="p-3 bg-white/50 dark:bg-slate-900/60 rounded-xl border border-white/60 dark:border-slate-700/50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl text-white ${
                    h.change_type.includes('add') || h.change_type === 'purchase' || h.change_type === 'return' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}>
                    {h.change_type.includes('add') || h.change_type === 'purchase' || h.change_type === 'return' ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{h.product_name}</p>
                    <p className="text-[10px] text-slate-400">{h.note || 'No notes'} • {h.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-black text-sm ${
                    h.change_type.includes('add') || h.change_type === 'purchase' || h.change_type === 'return' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {h.change_type.includes('add') || h.change_type === 'purchase' || h.change_type === 'return' ? '+' : '-'}{h.qty} units
                  </span>
                  <p className="text-[10px] uppercase font-bold text-slate-400">{h.change_type.replace('_', ' ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-6 rounded-3xl max-w-md w-full border border-white/80 dark:border-slate-700/60 shadow-2xl">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Stock Adjustment</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{selectedProduct.name} (Current: {selectedProduct.stock} units)</p>

            <form onSubmit={handleAdjustStock} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Adjustment Action</label>
                <select
                  value={changeType}
                  onChange={(e) => setChangeType(e.target.value as any)}
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                >
                  <option value="adjustment_add">Add Stock (Restock / Found Inventory)</option>
                  <option value="adjustment_remove">Remove Stock (Damaged / Expired / Lost)</option>
                  <option value="return">Customer Return</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl font-mono outline-none"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Reason / Note</label>
                <input
                  type="text"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="e.g. Broken box during shipment"
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl cursor-pointer shadow-md shadow-indigo-600/20">
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};