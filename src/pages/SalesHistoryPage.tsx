import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { Sale } from '../types';
import { InvoiceModal } from '../components/invoice/InvoiceModal';
import {
  History,
  Search,
  Calendar,
  Eye,
  RefreshCw,
  TrendingUp,
  DollarSign,
  CreditCard,
  FileText,
  User,
  ShoppingBag,
  Filter
} from 'lucide-react';

export const SalesHistoryPage: React.FC = () => {
  const { formatCurrency, getAuthHeader, showToast, language } = useShop();
  const isBn = language === 'bn';

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState<boolean>(false);

  // Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  const fetchSales = async () => {
    setLoading(true);
    try {
      let url = '/api/sales';
      const params = new URLSearchParams();
      if (startDate && endDate) {
        params.append('start_date', startDate);
        params.append('end_date', endDate);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setSales(data);
      } else {
        showToast('error', isBn ? 'বিক্রির তথ্য লোড করতে সমস্যা হয়েছে' : 'Failed to load sales history');
      }
    } catch {
      showToast('error', isBn ? 'নেটওয়ার্ক সমস্যা' : 'Network error loading sales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [startDate, endDate]);

  const filteredSales = sales.filter((sale) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      sale.invoice_no?.toLowerCase().includes(q) ||
      sale.customer_name?.toLowerCase().includes(q) ||
      sale.customer_phone?.toLowerCase().includes(q) ||
      sale.cashier_name?.toLowerCase().includes(q);

    const matchPayment =
      paymentFilter === 'all' ||
      (paymentFilter === 'paid' && sale.due_amount <= 0) ||
      (paymentFilter === 'due' && sale.due_amount > 0) ||
      sale.payment_method === paymentFilter;

    return matchQuery && matchPayment;
  });

  // Summary Metrics
  const totalSalesCount = filteredSales.length;
  const totalRevenue = filteredSales.reduce((acc, s) => acc + (s.total || 0), 0);
  const totalPaid = filteredSales.reduce((acc, s) => acc + (s.paid_amount || 0), 0);
  const totalDue = filteredSales.reduce((acc, s) => acc + (s.due_amount || 0), 0);

  const handleViewInvoice = (sale: Sale) => {
    setSelectedSale(sale);
    setIsInvoiceOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-6 rounded-3xl border border-white/60 dark:border-slate-700/60 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500/20 text-indigo-500 rounded-2xl flex items-center justify-center border border-indigo-500/30 shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              {isBn ? 'বিক্রির হিস্টরি' : 'Sales History'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isBn ? 'দোকানের সকল বিক্রয় রসিদ ও লেনদেনের রেকর্ড' : 'All sales transactions, invoices & customer receipts'}
            </p>
          </div>
        </div>

        <button
          onClick={fetchSales}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{isBn ? 'রিফ্রেশ করুন' : 'Refresh'}</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">{isBn ? 'মোট বিক্রয় সংখ্যা' : 'Total Sales'}</span>
            <FileText className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{totalSalesCount}</p>
        </div>

        <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">{isBn ? 'মোট বিক্রয় মূল্য' : 'Total Revenue'}</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(totalRevenue)}</p>
        </div>

        <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">{isBn ? 'আদায়কৃত টাকা' : 'Total Paid'}</span>
            <CreditCard className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{formatCurrency(totalPaid)}</p>
        </div>

        <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-md">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">{isBn ? 'মোট বকেয়া / বাকি' : 'Total Due'}</span>
            <TrendingUp className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{formatCurrency(totalDue)}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-4 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isBn ? 'ইনভয়েস নং বা কাস্টমার খুঁজুন...' : 'Search invoice no or customer...'}
            className="w-full pl-10 pr-4 py-2 bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Date & Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Payment filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-2 bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 font-semibold"
            >
              <option value="all">{isBn ? 'সকল পেমেন্ট স্ট্যাটাস' : 'All Payment Status'}</option>
              <option value="paid">{isBn ? 'সম্পূর্ণ পরিশোধিত (Paid)' : 'Fully Paid'}</option>
              <option value="due">{isBn ? 'বকেয়া আছে (Due)' : 'Has Due'}</option>
              <option value="cash">{isBn ? 'ক্যাশ (Cash)' : 'Cash'}</option>
              <option value="bkash">{isBn ? 'বিকাশ (bKash)' : 'bKash'}</option>
              <option value="card">{isBn ? 'কার্ড (Card)' : 'Card'}</option>
            </select>
          </div>

          {/* Date range inputs */}
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300"
            />
            <span className="text-xs text-slate-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm font-semibold flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>{isBn ? 'বিক্রির ইতিহাস লোড হচ্ছে...' : 'Loading sales records...'}</span>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <ShoppingBag className="w-12 h-12 mx-auto opacity-30 text-indigo-500" />
            <p className="text-sm font-bold">{isBn ? 'কোনো বিক্রির রেকর্ড পাওয়া যায়নি' : 'No sales records found'}</p>
            <p className="text-xs opacity-75">{isBn ? 'ফিল্টার পরিবর্তন করে চেষ্টা করুন' : 'Try searching with different query'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100/70 dark:bg-slate-900/70 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">{isBn ? 'ইনভয়েস নং' : 'Invoice No'}</th>
                  <th className="p-4">{isBn ? 'তারিখ ও সময়' : 'Date & Time'}</th>
                  <th className="p-4">{isBn ? 'কাস্টমার' : 'Customer'}</th>
                  <th className="p-4">{isBn ? 'পেমেন্ট মেথড' : 'Payment Method'}</th>
                  <th className="p-4 text-right">{isBn ? 'মোট টাকা' : 'Total'}</th>
                  <th className="p-4 text-right">{isBn ? 'পরিশোধিত' : 'Paid'}</th>
                  <th className="p-4 text-right">{isBn ? 'বকেয়া' : 'Due'}</th>
                  <th className="p-4 text-center">{isBn ? 'অ্যাকশন' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      #{sale.invoice_no}
                    </td>
                    <td className="p-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {sale.date}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{sale.customer_name || (isBn ? 'ওয়াক-ইন কাস্টমার' : 'Walk-in Customer')}</span>
                      </div>
                      {sale.customer_phone && (
                        <div className="text-[11px] text-slate-400 font-mono ml-5">{sale.customer_phone}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        {sale.payment_method?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-right font-black text-slate-900 dark:text-slate-100">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="p-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(sale.paid_amount)}
                    </td>
                    <td className="p-4 text-right font-semibold">
                      {sale.due_amount > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400">{formatCurrency(sale.due_amount)}</span>
                      ) : (
                        <span className="text-slate-400">৳0.00</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleViewInvoice(sale)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                        title={isBn ? 'ইনভয়েস বিবরণ ও প্রিন্ট' : 'View Invoice & Print'}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isBn ? 'রসিদ' : 'Invoice'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Details Modal */}
      {selectedSale && (
        <InvoiceModal
          sale={selectedSale}
          isOpen={isInvoiceOpen}
          onClose={() => {
            setIsInvoiceOpen(false);
            setSelectedSale(null);
          }}
        />
      )}
    </div>
  );
};
