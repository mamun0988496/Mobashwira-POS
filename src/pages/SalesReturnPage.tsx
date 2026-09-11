import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { SalesReturn, SalesReturnItem, ReturnReason, RefundMethod } from '../types';
import {
  Search,
  RotateCcw,
  Printer,
  FileText,
  AlertCircle,
  CheckCircle2,
  Calendar,
  User,
  DollarSign,
  Info,
  XCircle,
  Eye,
  Filter,
  RefreshCw,
} from 'lucide-react';

interface InvoiceItem {
  id: number;
  sale_id: number;
  product_id: number;
  product_name: string;
  barcode?: string;
  qty: number;
  unit_price: number;
  discount: number;
  total_price: number;
}

interface Invoice {
  id: number;
  invoice_no: string;
  customer_id?: number | null;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  total: number;
  paid_amount: number;
  due_amount: number;
  payment_method: string;
  date: string;
  created_at?: string;
  items?: InvoiceItem[];
}

export const SalesReturnPage: React.FC = () => {
  const { authFetch, user, settings, t } = useShop();

  // Active sub tab
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  // Search invoice state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundInvoices, setFoundInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [alreadyReturnedMap, setAlreadyReturnedMap] = useState<Record<number, number>>({});

  // Return form state
  const [returnItems, setReturnItems] = useState<{
    sale_item_id: number;
    product_id: number;
    product_name: string;
    barcode?: string;
    unit_price: number;
    original_qty: number;
    already_returned_qty: number;
    return_qty: number;
    discount: number;
    return_amount: number;
  }[]>([]);

  const [refundMethod, setRefundMethod] = useState<RefundMethod>('cash');
  const [reason, setReason] = useState<ReturnReason>('Defective Product');
  const [customReason, setCustomReason] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Print modal state
  const [printedReturn, setPrintedReturn] = useState<SalesReturn | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // History state
  const [returnsList, setReturnsList] = useState<SalesReturn[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewingReturn, setViewingReturn] = useState<SalesReturn | null>(null);

  // Fetch returns history or recent invoices when tab switches
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    } else if (activeTab === 'create') {
      if (foundInvoices.length === 0 && !selectedInvoice) {
        loadRecentInvoices();
      }
    }
  }, [activeTab, startDate, endDate]);

  const loadRecentInvoices = async () => {
    try {
      const res = await authFetch('/api/sales?limit=10');
      if (res.ok) {
        const data = await res.json();
        setFoundInvoices(data);
      }
    } catch (err) {
      console.error('Failed to load recent sales', err);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      let url = '/api/sales-returns?';
      if (startDate && endDate) url += `start_date=${startDate}&end_date=${endDate}&`;
      if (historySearch.trim()) url += `search=${encodeURIComponent(historySearch.trim())}&`;
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        setReturnsList(data);
      }
    } catch (err) {
      console.error('Failed to load return history', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Search invoices by invoice #, customer name, phone
  const handleSearchInvoice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      loadRecentInvoices();
      return;
    }

    setSearching(true);
    setErrorMsg(null);
    setFoundInvoices([]);
    setSelectedInvoice(null);

    try {
      const res = await authFetch(`/api/sales?search=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setFoundInvoices(data);
        if (data.length === 1) {
          selectInvoice(data[0]);
        } else if (data.length === 0) {
          setErrorMsg('কোনো ইনভয়েস পাওয়া যায়নি। সঠিক ইনভয়েস নম্বর বা কাস্টমার ফোন নম্বর লিখুন।');
        }
      } else {
        setErrorMsg('ইনভয়েস খুঁজতে ব্যর্থ হয়েছে।');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('সার্ভারে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setSearching(false);
    }
  };

  // Select an invoice and calculate existing returns
  const selectInvoice = async (inv: Invoice) => {
    setInvoiceLoading(true);
    setSelectedInvoice(inv);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Get full details including items
      const resInv = await authFetch(`/api/sales/${inv.id}`);
      const invData = await resInv.json();
      setSelectedInvoice(invData);

      // Get existing returns for this sale
      const resRet = await authFetch(`/api/sales-returns/invoice/${inv.id}`);
      const existingReturns = await resRet.json();

      const retMap: Record<string, number> = {};
      if (Array.isArray(existingReturns)) {
        for (const ret of existingReturns) {
          if (ret.items) {
            for (const item of ret.items) {
              if (item.sale_item_id) {
                const key = `si_${item.sale_item_id}`;
                retMap[key] = (retMap[key] || 0) + (item.quantity || 0);
              }
              if (item.product_id) {
                const key = `p_${item.product_id}`;
                retMap[key] = (retMap[key] || 0) + (item.quantity || 0);
              }
            }
          }
        }
      }
      setAlreadyReturnedMap(retMap as any);

      // Initialize return items table
      if (invData.items && Array.isArray(invData.items)) {
        const formatted = invData.items.map((item: InvoiceItem) => {
          const already = retMap[`si_${item.id}`] ?? retMap[`p_${item.product_id}`] ?? 0;
          return {
            sale_item_id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            barcode: item.barcode,
            unit_price: item.unit_price,
            original_qty: item.qty,
            already_returned_qty: already,
            return_qty: 0,
            discount: 0,
            return_amount: 0,
          };
        });
        setReturnItems(formatted);
      }

      // Default refund method based on customer due
      if (invData.due_amount > 0 && invData.customer_id) {
        setRefundMethod('due_adjustment');
      } else {
        setRefundMethod('cash');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('ইনভয়েসের বিস্তারিত ডাটা আনতে সমস্যা হয়েছে।');
    } finally {
      setInvoiceLoading(false);
    }
  };

  // Handle quantity change
  const handleQtyChange = (index: number, newQty: number) => {
    setReturnItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      const maxReturnable = item.original_qty - item.already_returned_qty;

      const qty = Math.max(0, Math.min(newQty, maxReturnable));
      item.return_qty = qty;
      item.return_amount = Math.max(0, qty * item.unit_price - item.discount);

      copy[index] = item;
      return copy;
    });
  };

  // Calculate total return sum
  const totalReturnAmount = returnItems.reduce((acc, curr) => acc + curr.return_amount, 0);
  const totalReturnQty = returnItems.reduce((acc, curr) => acc + curr.return_qty, 0);

  // Process Sales Return
  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const itemsToSubmit = returnItems
      .filter((i) => i.return_qty > 0)
      .map((i) => ({
        sale_item_id: i.sale_item_id,
        product_id: i.product_id,
        quantity: i.return_qty,
        unit_price: i.unit_price,
        discount: i.discount,
        return_amount: i.return_amount,
      }));

    if (itemsToSubmit.length === 0) {
      setErrorMsg('অনুগ্রহ করে ফেরত দেওয়ার জন্য অন্তত ১টি পণ্যের পরিমাণ নির্বাচন করুন।');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const effectiveReason = reason === 'Other' && customReason.trim() ? customReason.trim() : reason;

    try {
      const res = await authFetch('/api/sales-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_sale_id: selectedInvoice.id,
          invoice_no: selectedInvoice.invoice_no,
          items: itemsToSubmit,
          refund_method: refundMethod,
          reason: effectiveReason,
          note,
          date: new Date().toISOString().split('T')[0],
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(`সেলস রিটার্ন সফল হয়েছে! রসিদ নম্বর: ${data.return_number}`);

        // Fetch complete return object for printing
        const retDetailRes = await authFetch(`/api/sales-returns/${data.id}`);
        if (retDetailRes.ok) {
          const retDetail = await retDetailRes.json();
          setPrintedReturn(retDetail);
          setShowPrintModal(true);
        }

        // Reset form
        setSelectedInvoice(null);
        setReturnItems([]);
        setCustomReason('');
        setNote('');
      } else {
        setErrorMsg(data.error || 'সেলস রিটার্ন সম্পূর্ণ করা যায়নি।');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('সার্ভারে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel past return
  const handleCancelReturn = async (retId: number) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই সেলস রিটার্নটি বাতিল করতে চান? এতে পণ্য পুনরায় ইনভেন্টরি থেকে বাদ যাবে।')) {
      return;
    }

    try {
      const res = await authFetch(`/api/sales-returns/${retId}/cancel`, {
        method: 'POST',
      });
      if (res.ok) {
        alert('সেলস রিটার্ন সফলভাবে বাতিল করা হয়েছে।');
        fetchHistory();
        if (viewingReturn?.id === retId) {
          setViewingReturn(null);
        }
      } else {
        const err = await res.json();
        alert(err.error || 'বাতিল করা যায়নি।');
      }
    } catch (err) {
      console.error(err);
      alert('সার্ভারে সমস্যা হয়েছে।');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <RotateCcw className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            {t('headerSalesReturnsTitle') || 'সেলস রিটার্ন ম্যানেজমেন্ট'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t('headerSalesReturnsSub') || 'বিক্রিত পণ্য ফেরত গ্রহণ, ক্যাশ রিফান্ড ও বকেয়া সমন্বয়'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'create'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            নতুন রিটার্ন
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            রিটার্ন হিস্টরি
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {/* TAB 1: PROCESS NEW RETURN */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          {/* Invoice Search Bar */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-500" />
              মূল ইনভয়েস খুঁজুন
            </h2>
            <form onSubmit={handleSearchInvoice} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ইনভয়েস নম্বর (যেমন: INV-...) বা কাস্টমারের ফোন নম্বর বা নাম দিয়ে খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                খুঁজুন
              </button>
            </form>

            {/* Found Invoices List Selection */}
            {foundInvoices.length > 0 && !selectedInvoice && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 mb-2">
                  {searchQuery.trim() ? 'প্রাপ্ত ইনভয়েসসমূহ (একটি নির্বাচন করুন):' : 'সাম্প্রতিক ইনভয়েসসমূহ (একটি নির্বাচন করুন):'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                  {foundInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => selectInvoice(inv)}
                      className="p-3 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/40 dark:hover:bg-indigo-950/30 border border-slate-200 dark:border-slate-700/60 rounded-xl cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{inv.invoice_no}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{inv.customer_name || 'Walk-in Customer'} • {inv.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">৳{inv.total.toLocaleString('bn-BD')}</p>
                        <p className="text-[11px] text-slate-400">মেথড: {inv.payment_method}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Selected Invoice Details & Product Return Table */}
          {invoiceLoading ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
              <p className="text-sm text-slate-500">ইনভয়েস ডাটা লোড হচ্ছে...</p>
            </div>
          ) : selectedInvoice && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Product List Table (2 cols) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  {/* Invoice Header Details */}
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          ইনভয়েস #{selectedInvoice.invoice_no}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {selectedInvoice.date}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1.5 flex items-center gap-1.5">
                        <User className="w-4 h-4 text-slate-400" />
                        {selectedInvoice.customer_name || 'Walk-in Customer'}
                        {selectedInvoice.customer_phone && <span className="text-xs text-slate-400 font-normal">({selectedInvoice.customer_phone})</span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-xs text-slate-500">মোট বিক্রয়</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">৳{selectedInvoice.total.toLocaleString('bn-BD')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">পরিশোধিত</p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">৳{selectedInvoice.paid_amount.toLocaleString('bn-BD')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">বকেয়া</p>
                        <p className="text-sm font-bold text-rose-600 dark:text-rose-400">৳{selectedInvoice.due_amount.toLocaleString('bn-BD')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Return Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                          <th className="py-3 px-4">পণ্য</th>
                          <th className="py-3 px-3 text-right">একক মূল্য</th>
                          <th className="py-3 px-3 text-center">ক্রয় Qty</th>
                          <th className="py-3 px-3 text-center">আগে ফেরত</th>
                          <th className="py-3 px-4 text-center">ফেরত Qty</th>
                          <th className="py-3 px-4 text-right">ফেরত মূল্য (৳)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                        {returnItems.map((item, idx) => {
                          const maxReturnable = item.original_qty - item.already_returned_qty;
                          const isFullyReturned = maxReturnable <= 0;

                          return (
                            <tr key={idx} className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors ${isFullyReturned ? 'opacity-50 bg-slate-50/40 dark:bg-slate-800/20' : ''}`}>
                              <td className="py-3 px-4">
                                <p className="font-semibold text-slate-900 dark:text-white">{item.product_name}</p>
                                {item.barcode && <p className="text-xs text-slate-400 font-mono">{item.barcode}</p>}
                              </td>
                              <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                                ৳{item.unit_price}
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white">
                                {item.original_qty}
                              </td>
                              <td className="py-3 px-3 text-center text-rose-600 font-semibold">
                                {item.already_returned_qty}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {isFullyReturned ? (
                                  <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400">পূর্ণ ফেরত সম্পন্ন</span>
                                ) : (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleQtyChange(idx, item.return_qty - 1)}
                                      className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-bold flex items-center justify-center transition-colors"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min={0}
                                      max={maxReturnable}
                                      value={item.return_qty}
                                      onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 0)}
                                      className="w-14 text-center py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleQtyChange(idx, item.return_qty + 1)}
                                      className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-bold flex items-center justify-center transition-colors"
                                    >
                                      +
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-indigo-600 dark:text-indigo-400">
                                ৳{item.return_amount.toLocaleString('bn-BD')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Return Summary & Action Form (1 col) */}
              <div className="space-y-6">
                <form onSubmit={handleSubmitReturn} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span>রিটার্ন সামারি</span>
                    <span className="text-xs font-normal text-slate-500">{totalReturnQty} টি আইটেম ফেরত</span>
                  </h3>

                  {/* Total Amount Display */}
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-center">
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">মোট ফেরত মূল্য (Total Refund)</p>
                    <p className="text-3xl font-black text-indigo-700 dark:text-indigo-300 mt-1">
                      ৳{totalReturnAmount.toLocaleString('bn-BD')}
                    </p>
                  </div>

                  {/* Return Reason Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      ফেরতের কারণ (Return Reason) *
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value as ReturnReason)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Damaged Product">নষ্ট/ক্ষতিগ্রস্ত পণ্য (Damaged Product)</option>
                      <option value="Wrong Product">ভুল পণ্য দেয়া হয়েছিল (Wrong Product)</option>
                      <option value="Customer Changed Mind">কাস্টমার পছন্দ পরিবর্তন করেছে (Changed Mind)</option>
                      <option value="Defective Product">ডিফেক্টিভ বা ত্রুটিযুক্ত পণ্য (Defective Product)</option>
                      <option value="Expired Product">মেয়াদ উত্তীর্ণ পণ্য (Expired Product)</option>
                      <option value="Other">অন্যান্য (Other)</option>
                    </select>

                    {reason === 'Other' && (
                      <input
                        type="text"
                        placeholder="নির্দিষ্ট কারণ লিখুন..."
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        className="w-full mt-2 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    )}
                  </div>

                  {/* Refund/Adjustment Method */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      রিফান্ড বা সমন্বয় মেথড (Refund Method) *
                    </label>
                    <select
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(e.target.value as RefundMethod)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="cash">ক্যাশ রিফান্ড (Cash Payment)</option>
                      {selectedInvoice.customer_id && selectedInvoice.due_amount > 0 && (
                        <option value="due_adjustment">বকেয়া বিল সমন্বয় (Customer Due Adjustment)</option>
                      )}
                      <option value="bkash">বিকাশ (bKash)</option>
                      <option value="nagad">নগদ (Nagad)</option>
                      <option value="card">কার্ড (Card)</option>
                    </select>
                    {refundMethod === 'due_adjustment' && (
                      <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        ফেরত মূল্য কাস্টমারের বকেয়া অ্যাকাউন্ট থেকে বিয়োগ করা হবে।
                      </p>
                    )}
                  </div>

                  {/* Remarks / Note */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      নোট / মন্তব্য (ঐচ্ছিক)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="অতিরিক্ত তথ্য বা নোট লিখুন..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting || totalReturnAmount <= 0}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    সাবমিট সেলস রিটার্ন
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RETURN HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* History Search & Date Filters */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="রিটার্ন # বা ইনভয়েস # দিয়ে খুঁজুন..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchHistory()}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
              <span className="text-slate-400 text-xs">থেকে</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
              <button
                onClick={fetchHistory}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Filter className="w-3.5 h-3.5" />
                ফিল্টার
              </button>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {historyLoading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                <p className="text-sm text-slate-500">রিটার্ন রেকর্ড লোড হচ্ছে...</p>
              </div>
            ) : returnsList.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <RotateCcw className="w-12 h-12 stroke-1 mx-auto mb-2 opacity-50" />
                <p className="text-base font-semibold">কোনো সেলস রিটার্ন রেকর্ড পাওয়া যায়নি</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <th className="py-3 px-4">রিটার্ন #</th>
                      <th className="py-3 px-4">মূল ইনভয়েস #</th>
                      <th className="py-3 px-4">কাস্টমার</th>
                      <th className="py-3 px-3 text-right">মোট ফেরত (৳)</th>
                      <th className="py-3 px-3">মেথড</th>
                      <th className="py-3 px-4">কারণ</th>
                      <th className="py-3 px-3">তারিখ</th>
                      <th className="py-3 px-3">স্ট্যাটাস</th>
                      <th className="py-3 px-4 text-center">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {returnsList.map((ret) => (
                      <tr key={ret.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {ret.return_number}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                          {ret.invoice_no || ret.original_sale_id}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                          {ret.customer_name || 'Walk-in Customer'}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">
                          ৳{ret.total_amount.toLocaleString('bn-BD')}
                        </td>
                        <td className="py-3 px-3 capitalize text-xs font-semibold text-slate-600 dark:text-slate-400">
                          {ret.refund_method === 'due_adjustment' ? 'বকেয়া সমন্বয়' : ret.refund_method}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                          {ret.reason}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-500">
                          {ret.date}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md uppercase ${
                              ret.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                            }`}
                          >
                            {ret.status === 'completed' ? 'সম্পন্ন' : 'বাতিল'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setPrintedReturn(ret);
                                setShowPrintModal(true);
                              }}
                              title="রসিদ দেখুন ও প্রিন্ট করুন"
                              className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 dark:text-indigo-400 transition-colors"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {ret.status === 'completed' && (user?.role === 'admin' || user?.role === 'manager') && (
                              <button
                                onClick={() => handleCancelReturn(ret.id)}
                                title="রিটার্ন বাতিল করুন"
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 dark:text-rose-400 transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRINT RECEIPT MODAL */}
      {showPrintModal && printedReturn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4 print:p-0 print:shadow-none print:max-w-none">
            {/* Action Bar (hidden on print) */}
            <div className="flex items-center justify-between border-b pb-3 print:hidden">
              <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900">
                <Printer className="w-5 h-5 text-indigo-600" />
                সেলস রিটার্ন রসিদ
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  প্রিন্ট করুন
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Receipt Content */}
            <div id="printable-return-receipt" className="text-xs space-y-3 font-sans text-slate-900">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h2 className="text-base font-black tracking-tight">{settings.shop_name || 'Nexus ERP'}</h2>
                <p className="text-[11px] text-slate-600">{settings.address || 'দোকানের ঠিকানা'}</p>
                <p className="text-[11px] text-slate-600">ফোন: {settings.phone || '01700000000'}</p>
                <div className="mt-2 inline-block px-3 py-0.5 bg-slate-100 font-bold text-[11px] rounded uppercase border">
                  সেলস রিটার্ন মেমো (RETURN MEMO)
                </div>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-600">রিটার্ন নম্বর:</span>
                  <span className="font-bold font-mono">{printedReturn.return_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">মূল ইনভয়েস #:</span>
                  <span className="font-bold font-mono">{printedReturn.invoice_no || printedReturn.original_sale_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">তারিখ:</span>
                  <span>{printedReturn.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">কাস্টমার:</span>
                  <span className="font-bold">{printedReturn.customer_name || 'Walk-in Customer'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">ফেরতের কারণ:</span>
                  <span>{printedReturn.reason}</span>
                </div>
              </div>

              <table className="w-full text-left border-t border-b border-dashed border-slate-300 py-2">
                <thead>
                  <tr className="text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                    <th className="py-1">পণ্য</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">দর</th>
                    <th className="py-1 text-right">মোট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {printedReturn.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1 max-w-[120px] truncate">{item.product_name}</td>
                      <td className="py-1 text-center font-bold">{item.quantity}</td>
                      <td className="py-1 text-right">৳{item.unit_price}</td>
                      <td className="py-1 text-right font-bold">৳{item.return_amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="space-y-1 text-[11px] pt-1">
                <div className="flex justify-between font-bold text-sm text-slate-900 border-b pb-1">
                  <span>মোট ফেরত মূল্য:</span>
                  <span>৳{printedReturn.total_amount.toLocaleString('bn-BD')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>রিফান্ড মেথড:</span>
                  <span className="font-semibold capitalize">
                    {printedReturn.refund_method === 'due_adjustment' ? 'বকেয়া সমন্বয়' : printedReturn.refund_method}
                  </span>
                </div>
              </div>

              <div className="text-center pt-4 border-t border-dashed border-slate-300 text-[10px] text-slate-500">
                <p>আমাদের সাথে কেনাকাটা করার জন্য ধন্যবাদ!</p>
                <p className="font-mono mt-0.5">Software by Nexus ERP</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
