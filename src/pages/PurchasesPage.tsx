import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { Supplier, Product, Purchase } from '../types';
import { ShoppingBag, Plus, Trash2, CheckCircle2, FileText, Printer, X } from 'lucide-react';
import Select from 'react-select';

export const PurchasesPage: React.FC = () => {
  const { formatCurrency, getAuthHeader, showToast, language } = useShop();
  const isBn = language === 'bn';

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  // Purchase Entry Form State
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);
  const [items, setItems] = useState<{ product_id: number; product_name: string; qty: number; unit_price: number; expire_date?: string }[]>([]);
  const [selectedProdId, setSelectedProdId] = useState<number | null>(null);
  const [inputQty, setInputQty] = useState<string>('1');
  const [inputCost, setInputCost] = useState<string>('');
  const [inputExpireDate, setInputExpireDate] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Pay Purchase Due Modal State
  const [selectedPayPur, setSelectedPayPur] = useState<Purchase | null>(null);
  const [payAmountModal, setPayAmountModal] = useState<string>('');
  const [payMethodModal, setPayMethodModal] = useState<string>('cash');
  const [payNoteModal, setPayNoteModal] = useState<string>('');
  const [paySubmitting, setPaySubmitting] = useState<boolean>(false);

  // View Invoice Modal State
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const [invoiceLoading, setInvoiceLoading] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      const [sRes, pRes, purRes] = await Promise.all([
        fetch('/api/suppliers', { headers: getAuthHeader() }),
        fetch('/api/products', { headers: getAuthHeader() }),
        fetch('/api/purchases', { headers: getAuthHeader() })
      ]);

      if (sRes.ok) setSuppliers(await sRes.json());
      if (pRes.ok) setProducts(await pRes.json());
      if (purRes.ok) setPurchases(await purRes.json());
    } catch {
      showToast('error', 'Error loading purchase data');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItem = () => {
    if (!selectedProdId) return;
    const prod = products.find((p) => p.id === selectedProdId);
    if (!prod) return;

    const qty = parseInt(inputQty) || 1;
    const cost = parseFloat(inputCost) || prod.purchase_price;

    setItems((prev) => [
      ...prev,
      { product_id: prod.id, product_name: prod.name, qty, unit_price: cost, expire_date: inputExpireDate }
    ]);

    setSelectedProdId(null);
    setInputQty('1');
    setInputCost('');
    setInputExpireDate('');
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((acc, item) => acc + item.qty * item.unit_price, 0);
  const numericPaid = paidAmount.trim() === '' ? totalAmount : (isNaN(parseFloat(paidAmount)) ? 0 : Math.max(0, parseFloat(paidAmount)));
  const dueAmount = Math.max(0, totalAmount - numericPaid);

  const handlePayPurchaseDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayPur || !payAmountModal || parseFloat(payAmountModal) <= 0) return;

    setPaySubmitting(true);
    try {
      const res = await fetch(`/api/purchases/${selectedPayPur.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          amount: parseFloat(payAmountModal),
          payment_method: payMethodModal,
          note: payNoteModal
        })
      });

      if (res.ok) {
        showToast('success', 'Purchase payment recorded successfully!');
        setSelectedPayPur(null);
        setPayAmountModal('');
        setPayNoteModal('');
        fetchData();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to record purchase payment');
      }
    } catch {
      showToast('error', 'Error processing purchase payment');
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleCreatePurchase = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (!selectedSupplier) {
      showToast('error', 'Please select a supplier');
      return;
    }
    if (items.length === 0) {
      showToast('error', 'Please add at least one product item');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          supplier_id: selectedSupplier,
          items,
          paid_amount: numericPaid,
          note
        })
      });

      if (res.ok) {
        const result = await res.json();
        showToast('success', `Purchase Invoice created (${result.purchase_no}) & Stock Auto-Updated!`);
        setItems([]);
        setSelectedSupplier(null);
        setPaidAmount('');
        setNote('');
        fetchData();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to process purchase');
      }
    } catch {
      showToast('error', 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewInvoice = async (purchaseId: number) => {
    setInvoiceLoading(true);
    try {
      const res = await fetch(`/api/purchases/${purchaseId}`, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setViewInvoice(data);
      } else {
        showToast('error', 'Failed to load invoice details');
      }
    } catch {
      showToast('error', 'Network error while loading invoice');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // react-select এর জন্য প্রোডাক্ট ডাটা রেডি করা
  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.name} (Cur: ${p.stock})`
  }));

  const customSelectStyles = {
    control: (base: any) => ({
      ...base,
      backgroundColor: 'rgba(30, 41, 59, 0.7)',
      borderColor: 'rgba(71, 85, 105, 0.4)',
      borderRadius: '0.5rem',
      padding: '2px',
      minHeight: '38px',
      fontSize: '0.75rem',
      boxShadow: 'none',
      cursor: 'text'
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: '#1e293b',
      borderRadius: '0.5rem',
      fontSize: '0.75rem',
      zIndex: 50,
      border: '1px solid rgba(71, 85, 105, 0.4)'
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? '#334155' : 'transparent',
      color: '#f1f5f9',
      cursor: 'pointer'
    }),
    singleValue: (base: any) => ({
      ...base,
      color: '#f1f5f9'
    }),
    input: (base: any) => ({
      ...base,
      color: '#f1f5f9'
    }),
    placeholder: (base: any) => ({
      ...base,
      color: '#94a3b8'
    })
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200/50">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Stock Purchase Invoices</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Record incoming wholesale purchases & auto-update product inventory</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-300'
            }`}
          >
            New Purchase Invoice
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-300'
            }`}
          >
            Purchase History
          </button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
          {/* Purchase Entry Form (7 cols) */}
          <div className="lg:col-span-7 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-6 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-4 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Create Purchase Entry</h4>

            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Select Wholesaler Supplier *</label>
              <select
                value={selectedSupplier || ''}
                onChange={(e) => setSelectedSupplier(e.target.value ? Number(e.target.value) : null)}
                className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.company_name || 'Vendor'})</option>
                ))}
              </select>
            </div>

            {/* Add Item Row */}
            <div className="p-3 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-white/60 dark:border-slate-700/60 space-y-3">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {isBn ? 'স্টক আইটেম যোগ করুন' : 'Add Stock Items'}
              </span>
              <div className="grid grid-cols-12 gap-2">
                
                <div className="col-span-12 sm:col-span-4">
                  <Select
                    options={productOptions}
                    value={productOptions.find((opt) => opt.value === selectedProdId) || null}
                    placeholder={isBn ? 'প্রোডাক্ট খুঁজুন...' : 'Search Product...'}
                    isSearchable
                    styles={customSelectStyles}
                    onChange={(selectedOption) => {
                      if (selectedOption) {
                        const id = selectedOption.value;
                        setSelectedProdId(id);
                        const p = products.find((x) => x.id === id);
                        if (p) {
                          setInputCost(p.purchase_price.toString());
                          setInputExpireDate(p.expire_date || '');
                        }
                      } else {
                        setSelectedProdId(null);
                        setInputCost('');
                        setInputExpireDate('');
                      }
                    }}
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <input
                    type="number"
                    min="1"
                    placeholder={isBn ? 'পরিমাণ' : 'Qty'}
                    value={inputQty}
                    onChange={(e) => setInputQty(e.target.value)}
                    className="w-full p-2 h-[38px] bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-slate-700/60 rounded-lg font-mono text-center outline-none text-xs"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder={isBn ? 'ক্রয় মূল্য' : 'Cost Price'}
                    value={inputCost}
                    onChange={(e) => setInputCost(e.target.value)}
                    className="w-full p-2 h-[38px] bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-slate-700/60 rounded-lg font-mono outline-none text-xs"
                  />
                </div>
                <div className="col-span-4 sm:col-span-3">
                  <input
                    type="date"
                    title={isBn ? 'নিউ ডেট / মেয়াদের তারিখ' : 'New / Expire Date'}
                    value={inputExpireDate}
                    onChange={(e) => setInputExpireDate(e.target.value)}
                    className="w-full p-2 h-[38px] bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-slate-700/60 rounded-lg font-mono outline-none text-xs"
                  />
                </div>
                <div className="col-span-12 sm:col-span-1 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    title={isBn ? 'যোগ করুন' : 'Add Item'}
                    className="w-full h-full min-h-[38px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center font-bold cursor-pointer transition-all shadow-sm shadow-indigo-600/20"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-white/60 dark:border-slate-700/50 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-white/50 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Cost Price</th>
                    <th className="p-2.5 text-center">{isBn ? 'নিউ ডেট (মেয়াদ)' : 'New Date'}</th>
                    <th className="p-2.5 text-right">Total</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40 dark:divide-slate-700/40">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">{item.product_name}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">{item.qty}</td>
                      <td className="p-2.5 text-right font-mono text-slate-800 dark:text-slate-200">{formatCurrency(item.unit_price)}</td>
                      <td className="p-2.5 text-center font-mono text-slate-600 dark:text-slate-400">{item.expire_date || '-'}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(item.qty * item.unit_price)}</td>
                      <td className="p-2.5 text-center">
                        <button onClick={() => handleRemoveItem(idx)} className="text-rose-500 hover:text-rose-600 cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment & Summary Panel (5 cols) */}
          <div className="lg:col-span-5 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-6 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-4 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Purchase Payment</h4>

            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/40 dark:border-indigo-800/40 rounded-xl space-y-2">
              <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-slate-100">
                <span>Total Invoice Amount:</span>
                <span className="text-indigo-600 dark:text-indigo-400 text-base">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Paid Amount to Supplier (৳)</label>
              <input
                type="number"
                step="0.01"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder={formatCurrency(totalAmount)}
                className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl font-mono font-bold outline-none"
              />
            </div>

            {dueAmount > 0 && (
              <div className="p-3 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/50 dark:border-rose-800/50 rounded-xl text-rose-700 dark:text-rose-300 font-bold flex justify-between">
                <span>Supplier Due Created:</span>
                <span>{formatCurrency(dueAmount)}</span>
              </div>
            )}

            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Purchase Order Notes</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Shipment tracking, batch numbers..."
                className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
              />
            </div>

            <button
              onClick={handleCreatePurchase}
              disabled={items.length === 0 || submitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Purchase & Auto-Add Stock
            </button>
          </div>
        </div>
      ) : (
        /* Purchase History */
        <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 p-5 shadow-xl shadow-slate-200/50 dark:shadow-none print:hidden">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-4">Past Purchase Invoices</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/50 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="p-3">Purchase No</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Total Cost</th>
                  <th className="p-3">Paid</th>
                  <th className="p-3">Supplier Due</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40 dark:divide-slate-700/40">
                {purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-white/60 dark:hover:bg-slate-700/30">
                    <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">{p.purchase_no}</td>
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{p.supplier_name || 'Vendor'}</td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">{p.date}</td>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{formatCurrency(p.total_amount)}</td>
                    <td className="p-3 text-emerald-600 dark:text-emerald-400 font-semibold">{formatCurrency(p.paid_amount)}</td>
                    <td className="p-3 text-rose-600 dark:text-rose-400 font-semibold">{formatCurrency(p.due_amount)}</td>
                    <td className="p-3 uppercase text-[10px] font-bold text-slate-700 dark:text-slate-300">{p.payment_status}</td>
                    <td className="p-3 text-center flex justify-center gap-2">
                      <button
                        onClick={() => handleViewInvoice(p.id)}
                        className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        title="View Invoice"
                      >
                        <FileText className="w-3.5 h-3.5" /> View
                      </button>
                      
                      {p.due_amount > 0 ? (
                        <button
                          onClick={() => {
                            setSelectedPayPur(p);
                            setPayAmountModal(p.due_amount.toString());
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md shadow-emerald-600/20 cursor-pointer"
                        >
                          Pay Due
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded-md flex items-center">
                          Paid
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pay Purchase Due Modal */}
      {selectedPayPur && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm print:hidden">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-6 rounded-3xl max-w-md w-full border border-white/80 dark:border-slate-700/60 shadow-2xl">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Pay Purchase Due</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Invoice: <strong className="text-indigo-600 dark:text-indigo-400">{selectedPayPur.purchase_no}</strong> • Supplier Due: {formatCurrency(selectedPayPur.due_amount)}
            </p>

            <form onSubmit={handlePayPurchaseDue} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Payment Amount (৳)</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedPayPur.due_amount}
                  required
                  value={payAmountModal}
                  onChange={(e) => setPayAmountModal(e.target.value)}
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl font-bold font-mono text-sm outline-none"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Payment Method</label>
                <select
                  value={payMethodModal}
                  onChange={(e) => setPayMethodModal(e.target.value)}
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Wire Transfer</option>
                  <option value="card">Card</option>
                  <option value="mobile_banking">Mobile Banking</option>
                  <option value="check">Company Check</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Note</label>
                <input
                  type="text"
                  value={payNoteModal}
                  onChange={(e) => setPayNoteModal(e.target.value)}
                  placeholder="e.g. Partial purchase payment"
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setSelectedPayPur(null)} className="px-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl font-semibold cursor-pointer">Cancel</button>
                <button type="submit" disabled={paySubmitting} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer shadow-md shadow-emerald-600/20">
                  {paySubmitting ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm print:bg-white print:p-0">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-y-auto max-h-[90vh] print:border-none print:shadow-none print:w-full print:max-h-none print:overflow-visible">
            
            {/* Header for Print / View */}
            <div className="text-center border-b pb-4 mb-4 border-slate-200 dark:border-slate-700">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">মোবাশ্বিরা পশু পাখির ঔষধ ঘর</h2>
              <p className="text-slate-500 text-sm">Purchase Invoice Record</p>
            </div>

            <div className="flex justify-between items-start mb-6 text-sm text-slate-700 dark:text-slate-300">
              <div>
                <p><span className="font-bold">Invoice No:</span> {viewInvoice.purchase_no}</p>
                <p><span className="font-bold">Supplier:</span> {viewInvoice.supplier_name || 'N/A'}</p>
                <p><span className="font-bold">Note:</span> {viewInvoice.note || 'N/A'}</p>
              </div>
              <div className="text-right">
                <p><span className="font-bold">Date:</span> {viewInvoice.date}</p>
                <p><span className="font-bold">Status:</span> <span className="uppercase text-xs font-bold text-indigo-600">{viewInvoice.payment_status}</span></p>
              </div>
            </div>

            {/* Items Table in Modal */}
            <div className="mb-6">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200">
                    <th className="pb-2 font-bold">Item Name</th>
                    <th className="pb-2 text-center font-bold">Qty</th>
                    <th className="pb-2 text-right font-bold">Rate</th>
                    <th className="pb-2 text-right font-bold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {viewInvoice.items && viewInvoice.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 text-slate-700 dark:text-slate-300">{item.product_name}</td>
                      <td className="py-2 text-center text-slate-700 dark:text-slate-300">{item.quantity}</td>
                      <td className="py-2 text-right text-slate-700 dark:text-slate-300">{formatCurrency(item.unit_price)}</td>
                      <td className="py-2 text-right font-bold text-slate-900 dark:text-slate-100">{formatCurrency(item.quantity * item.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="flex justify-end border-t border-slate-300 dark:border-slate-600 pt-4">
              <div className="w-64 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(viewInvoice.total_amount)}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Paid Amount:</span>
                  <span className="font-bold">{formatCurrency(viewInvoice.paid_amount)}</span>
                </div>
                <div className="flex justify-between text-rose-600 border-t border-slate-200 dark:border-slate-700 pt-1">
                  <span>Due Balance:</span>
                  <span className="font-bold">{formatCurrency(viewInvoice.due_amount)}</span>
                </div>
              </div>
            </div>

            {/* Actions (Hidden on Print) */}
            <div className="mt-8 flex justify-end gap-3 print:hidden">
              <button 
                onClick={handlePrint}
                className="px-4 py-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-400 font-bold rounded-xl cursor-pointer flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <button 
                onClick={() => setViewInvoice(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 font-bold rounded-xl cursor-pointer flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};