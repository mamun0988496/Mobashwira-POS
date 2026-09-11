import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { DashboardStats, Sale } from '../types';
import { CardSkeleton, TableSkeleton } from '../components/common/Skeleton';
import {
  DollarSign,
  Package,
  AlertTriangle,
  ShoppingBag,
  CreditCard,
  Receipt,
  ChevronRight,
  History,
  TrendingUp,
  Activity
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface DashboardPageProps {
  onNavigate: (page: any) => void;
  onViewInvoice: (sale: Sale) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onViewInvoice }) => {
  const { formatCurrency, getAuthHeader, darkMode, language } = useShop();
  const isBn = language === 'bn';
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, chartRes, recentRes] = await Promise.all([
        fetch('/api/dashboard/stats', { headers: getAuthHeader() }),
        fetch('/api/dashboard/chart', { headers: getAuthHeader() }),
        fetch('/api/dashboard/recent-sales', { headers: getAuthHeader() }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (chartRes.ok) setChartData(await chartRes.json());
      if (recentRes.ok) setRecentSales(await recentRes.json());
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[calc(100vh-120px)] flex flex-col space-y-6 overflow-hidden">
        <div className="shrink-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="flex-1 min-h-0">
          <TableSkeleton rows={5} />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: isBn ? 'আজকের বিক্রি' : "Today's Sales",
      value: formatCurrency(stats?.todaySales || 0),
      subtitle: `${stats?.todaySalesCount || 0} ${isBn ? 'টি অর্ডার আজ' : 'orders today'}`,
      icon: DollarSign,
      gradient: 'from-emerald-400 to-emerald-600 shadow-emerald-500/30',
      badge: '+12%',
      badgeIcon: TrendingUp,
      badgeColor: 'text-emerald-600 bg-emerald-100/80 dark:bg-emerald-500/20 dark:text-emerald-400'
    },
    {
      title: isBn ? 'শপে মোট পণ্যের মূল্য' : 'Total Stock Value',
      value: formatCurrency(stats?.totalStockValue || 0),
      subtitle: `${isBn ? 'ক্রয় মূল্য: ' : 'Cost: '}${formatCurrency(stats?.totalStockCostValue || 0)}`,
      icon: ShoppingBag,
      gradient: 'from-indigo-400 to-indigo-600 shadow-indigo-500/30',
      badge: isBn ? 'ইন স্টক' : 'In Stock',
      badgeColor: 'text-indigo-600 bg-indigo-100/80 dark:bg-indigo-500/20 dark:text-indigo-400'
    },
    {
      title: isBn ? 'মোট প্রোডাক্ট সংখ্যা' : 'Total Products',
      value: stats?.totalProducts || 0,
      subtitle: isBn ? 'ক্যাটালগে মোট পণ্য' : 'Items in catalog',
      icon: Package,
      gradient: 'from-sky-400 to-sky-600 shadow-sky-500/30',
      badge: isBn ? 'এক্টিভ' : 'Active',
      badgeColor: 'text-sky-600 bg-sky-100/80 dark:bg-sky-500/20 dark:text-sky-400'
    }
  ];

  return (
    <div className="w-full h-[calc(100vh-120px)] flex flex-col space-y-4 lg:space-y-6 overflow-hidden">
      
      {/* 1. Core Summary Metric Cards (With Premium Gradients & Hover Lift) */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          const BadgeIcon = card.badgeIcon;
          return (
            <div
              key={idx}
              className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/60 p-4 lg:p-5 rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-none transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-indigo-300 dark:hover:border-indigo-500/30 group"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">{card.title}</p>
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg text-white`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-xl lg:text-3xl font-black text-slate-800 dark:text-slate-100 mt-2 tracking-tight">{card.value}</h3>
              <div className="mt-3 flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-bold">{card.subtitle}</span>
                <span className={`font-bold flex items-center gap-1 px-2 py-0.5 rounded-full border border-current/10 ${card.badgeColor}`}>
                  {BadgeIcon && <BadgeIcon className="w-3 h-3" />}
                  {card.badge}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Quick Statistics Banner (With Hover Effects) */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
        <button
          onClick={() => onNavigate('stock')}
          className="bg-red-50/40 dark:bg-red-950/20 backdrop-blur-xl border border-red-100 dark:border-red-900/30 p-3 lg:p-4 rounded-2xl flex items-center justify-between text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-red-500/10 hover:bg-red-50/80 dark:hover:bg-red-900/40 cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-red-400 to-red-600 text-white rounded-xl shadow-lg shadow-red-500/30 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4 lg:w-5 lg:h-5" />
            </div>
            <div>
              <p className="text-[10px] lg:text-xs font-bold text-slate-600 dark:text-slate-300">Low Stock Alert</p>
              <h4 className="text-sm lg:text-lg font-black text-red-600 dark:text-red-400">{stats?.lowStockCount || 0} Products</h4>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5 text-red-400 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => onNavigate('dues')}
          className="bg-amber-50/40 dark:bg-amber-950/20 backdrop-blur-xl border border-amber-100 dark:border-amber-900/30 p-3 lg:p-4 rounded-2xl flex items-center justify-between text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-500/10 hover:bg-amber-50/80 dark:hover:bg-amber-900/40 cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-xl shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
              <CreditCard className="w-4 h-4 lg:w-5 lg:h-5" />
            </div>
            <div>
              <p className="text-[10px] lg:text-xs font-bold text-slate-600 dark:text-slate-300">Total Customer Due</p>
              <h4 className="text-sm lg:text-lg font-black text-amber-600 dark:text-amber-400">{formatCurrency(stats?.totalCustomerDue || 0)}</h4>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5 text-amber-400 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => onNavigate('expenses')}
          className="bg-sky-50/40 dark:bg-sky-950/20 backdrop-blur-xl border border-sky-100 dark:border-sky-900/30 p-3 lg:p-4 rounded-2xl flex items-center justify-between text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-sky-500/10 hover:bg-sky-50/80 dark:hover:bg-sky-900/40 cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-sky-400 to-sky-600 text-white rounded-xl shadow-lg shadow-sky-500/30 group-hover:scale-110 transition-transform">
              <Receipt className="w-4 h-4 lg:w-5 lg:h-5" />
            </div>
            <div>
              <p className="text-[10px] lg:text-xs font-bold text-slate-600 dark:text-slate-300">Today's Expenses</p>
              <h4 className="text-sm lg:text-lg font-black text-sky-600 dark:text-sky-400">{formatCurrency(stats?.todayExpense || 0)}</h4>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5 text-sky-400 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* BOTTOM LAYOUT: 2-Column Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        
        {/* Left Side: Premium Area Chart */}
        <div className="lg:col-span-2 flex flex-col bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/60 p-4 lg:p-6 rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-none h-full min-h-0">
          <div className="shrink-0 flex items-center justify-between mb-4 lg:mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-slate-800 dark:text-slate-100">Sales Analytics</h4>
                {/* 3. Live Indicator */}
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md text-[9px] font-black uppercase tracking-wider border border-emerald-200 dark:border-emerald-500/20">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Live
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400">Daily revenue trend vs profit</p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/50">
              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-md shadow-indigo-500/40" /> Sales
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/40" /> Profit
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-0 w-full pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(203, 213, 225, 0.4)'} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b', fontWeight: 600 }} dy={10} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b', fontWeight: 600 }} dx={-10} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)' }}
                  formatter={(val: any) => [formatCurrency(Number(val)), '']}
                  itemStyle={{ padding: '2px 0' }}
                />
                <Area type="monotone" dataKey="sales" name="Sales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }} />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Side: Recent Sales Feed (With 4. Payment Badges) */}
        <div className="lg:col-span-1 flex flex-col bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/60 p-4 lg:p-5 rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-none h-full min-h-0">
          <div className="shrink-0 flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-100">{isBn ? 'সাম্প্রতিক বিক্রি' : 'Recent Sales'}</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Real-time transaction feed</p>
            </div>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-800/30">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-2">
            {recentSales.map((sale) => {
              // Payment Status Badge Logic
              const isPaid = sale.payment_status === 'paid' || sale.due_amount === 0;
              const badgeClass = isPaid 
                ? 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                : 'bg-amber-100/80 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30';

              return (
                <div key={sale.id} className="p-3 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md rounded-xl border border-slate-100 dark:border-slate-700/50 hover:border-indigo-300 dark:hover:border-indigo-600/50 hover:shadow-md transition-all duration-300 cursor-pointer group">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">{sale.invoice_no}</span>
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{sale.date}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-700 dark:text-slate-200 font-bold truncate max-w-[120px]">
                        {sale.customer_name || (isBn ? 'সাধারণ কাস্টমার' : 'Walk-in Customer')}
                      </span>
                      {/* Payment Status Badge */}
                      <span className={`mt-1.5 w-fit px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded border ${badgeClass}`}>
                        {isPaid ? 'PAID' : 'DUE'}
                      </span>
                    </div>
                    <span className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(sale.total)}</span>
                  </div>
                </div>
              );
            })}
            {recentSales.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                <History className="w-8 h-8 mb-2 opacity-20" />
                <span>No recent sales found</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};