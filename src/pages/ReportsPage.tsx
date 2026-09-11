import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { FileText, Calendar, Download, TrendingUp, DollarSign, PackageCheck, Receipt } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { formatCurrency, getAuthHeader, showToast, language } = useShop();
  const isBn = language === 'bn';

  const [dateRange, setDateRange] = useState<'today' | 'this_month' | 'custom'>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [todayProfit, setTodayProfit] = useState<number | null>(null);

  const [reportData, setReportData] = useState<{
    salesSummary: {
      total_sales: number;
      gross_sales?: number;
      total_revenue: number;
      net_sales?: number;
      total_returns?: number;
      total_returns_amount?: number;
      total_cost: number;
      gross_cost?: number;
      total_returned_cost?: number;
      total_profit: number;
      gross_profit?: number;
      total_discount: number;
    };
    expenseSummary: { total_expenses: number };
    netProfit: number;
    topProducts: { name: string; total_qty: number; total_revenue: number }[];
    topReturnedProducts?: { name: string; return_qty: number; total_return_amount: number }[];
    returnReasonsBreakdown?: { reason: string; count: number; total_amount: number }[];
  } | null>(null);

  useEffect(() => {
    const fetchTodayStats = async () => {
      try {
        const res = await fetch('/api/dashboard/stats', { headers: getAuthHeader() });
        if (res.ok) {
          const data = await res.json();
          setTodayProfit(data.todayProfit || 0);
        }
      } catch {
        // Ignore error
      }
    };
    fetchTodayStats();
  }, []);

  const fetchReport = async () => {
    try {
      const queryParams = new URLSearchParams({ range: dateRange });
      if (dateRange === 'custom' && startDate && endDate) {
        queryParams.append('startDate', startDate);
        queryParams.append('endDate', endDate);
      }

      const res = await fetch(`/api/reports/analytics?${queryParams.toString()}`, { headers: getAuthHeader() });
      if (res.ok) {
        setReportData(await res.json());
      }
    } catch {
      showToast('error', 'Error generating report analytics');
    }
  };

  useEffect(() => {
    fetchReport();
  }, [dateRange, startDate, endDate]);

  const handleExportCSV = () => {
    if (!reportData) return;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Report Type,Value\n' +
      `Total Revenue,${reportData.salesSummary.total_revenue}\n` +
      `Total Cost,${reportData.salesSummary.total_cost}\n` +
      `Gross Profit,${reportData.salesSummary.total_profit}\n` +
      `Operating Expenses,${reportData.expenseSummary.total_expenses}\n` +
      `Net Profit,${reportData.netProfit}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `shop_report_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200/50">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Financial Reports & Profit Analytics</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Sales breakdown, gross profit vs expenses & best selling items</p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-xs rounded-xl shadow-md cursor-pointer"
        >
          <Download className="w-4 h-4" /> Export CSV Report
        </button>
      </div>

      {/* Today's Net Profit Card */}
      {todayProfit !== null && (
        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-indigo-950/40 backdrop-blur-xl p-5 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/60 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/20">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {isBn ? "আজকের নিট প্রফিট (Today's Net Profit)" : "Today's Net Profit"}
              </p>
              <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                {formatCurrency(todayProfit)}
              </h3>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200/50">
            {isBn ? 'আজকের নিট লাভ' : 'Gross profit minus cost'}
          </span>
        </div>
      )}

      {/* Date Range Selector */}
      <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-4 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-wrap items-center gap-3 text-xs">
        <span className="font-bold text-slate-700 dark:text-slate-300">Date Filter:</span>
        <button
          onClick={() => setDateRange('today')}
          className={`px-3.5 py-1.5 font-bold rounded-xl transition-all cursor-pointer ${dateRange === 'today' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 border border-white/80 dark:border-slate-700/60'}`}
        >
          Today
        </button>
        <button
          onClick={() => setDateRange('this_month')}
          className={`px-3.5 py-1.5 font-bold rounded-xl transition-all cursor-pointer ${dateRange === 'this_month' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 border border-white/80 dark:border-slate-700/60'}`}
        >
          This Month
        </button>
        <button
          onClick={() => setDateRange('custom')}
          className={`px-3.5 py-1.5 font-bold rounded-xl transition-all cursor-pointer ${dateRange === 'custom' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 border border-white/80 dark:border-slate-700/60'}`}
        >
          Custom Range
        </button>

        {dateRange === 'custom' && (
          <div className="flex items-center gap-2 ml-auto">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-1.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-lg text-slate-800 dark:text-slate-100 outline-none"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-1.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-lg text-slate-800 dark:text-slate-100 outline-none"
            />
          </div>
        )}
      </div>

      {/* Analytics Metric Grid */}
      {reportData && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Gross Sales</span>
              <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {formatCurrency(reportData.salesSummary.gross_sales || reportData.salesSummary.total_revenue)}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">{reportData.salesSummary.total_sales} transactions</p>
            </div>

            <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none">
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Sales Returns (-)</span>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(reportData.salesSummary.total_returns_amount || 0)}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">{reportData.salesSummary.total_returns || 0} returns</p>
            </div>

            <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Net Sales</span>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(reportData.salesSummary.net_sales || reportData.salesSummary.total_revenue)}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Gross Sales - Returns</p>
            </div>

            <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Operating Expenses</span>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {formatCurrency(reportData.expenseSummary.total_expenses)}
              </h3>
            </div>

            <div className="bg-emerald-500/10 dark:bg-emerald-950/30 backdrop-blur-xl p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 shadow-xl shadow-emerald-500/5">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Net Clean Profit</span>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(reportData.netProfit)}
              </h3>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">Net Sales - (Net Cost + Expenses)</p>
            </div>
          </div>

          {/* Tables Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products Report Table */}
            <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-6 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-4">Top Performing Products</h4>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/30 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <tr>
                    <th className="p-3 pl-4">Product Name</th>
                    <th className="p-3 text-center">Units Sold</th>
                    <th className="p-3 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/20 dark:divide-slate-700/30">
                  {reportData.topProducts.map((p, i) => (
                    <tr key={i} className="hover:bg-white/40 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="p-3 pl-4 font-bold text-slate-800 dark:text-slate-200">{p.name}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">{p.total_qty} units</td>
                      <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.total_revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Top Returned Products Table */}
            {reportData.topReturnedProducts && reportData.topReturnedProducts.length > 0 && (
              <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-6 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none">
                <h4 className="font-bold text-rose-600 dark:text-rose-400 text-sm mb-4">Top Returned Products</h4>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/30 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <tr>
                      <th className="p-3 pl-4">Product Name</th>
                      <th className="p-3 text-center">Units Returned</th>
                      <th className="p-3 text-right">Returned Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/20 dark:divide-slate-700/30">
                    {reportData.topReturnedProducts.map((p, i) => (
                      <tr key={i} className="hover:bg-white/40 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="p-3 pl-4 font-bold text-slate-800 dark:text-slate-200">{p.name}</td>
                        <td className="p-3 text-center font-mono font-bold text-rose-600 dark:text-rose-400">{p.return_qty} units</td>
                        <td className="p-3 text-right font-bold text-rose-600 dark:text-rose-400">{formatCurrency(p.total_return_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
