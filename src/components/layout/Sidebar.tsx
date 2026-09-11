import React from 'react';
import { useShop } from '../../context/ShopContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  Tag,
  Boxes,
  Truck,
  ShoppingBag,
  Receipt,
  CreditCard,
  BarChart3,
  History,
  Settings,
  Store,
  RotateCcw, // রিটার্নের আইকন
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'categories'
  | 'brands'
  | 'stock'
  | 'customers'
  | 'suppliers'
  | 'purchases'
  | 'expenses'
  | 'return' // রিটার্ন অপশন যোগ করা হয়েছে
  | 'dues'
  | 'reports'
  | 'history'
  | 'users'
  | 'backup'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { settings, t } = useShop();
  
  // ভাষা চেক করা হচ্ছে (যাতে t('navReturn') কাজ না করলেও ডিফল্টভাবে বাংলা/ইংরেজি দেখায়)
  const isBn = settings?.language === 'bn' || settings?.language === 'bd' || settings?.language === 'Bangla';

  const menuItems = [
    { id: 'dashboard' as ActiveTab, label: t('navDashboard'), icon: LayoutDashboard },
    { id: 'pos' as ActiveTab, label: t('navPos'), icon: ShoppingCart, badge: 'HOT' },
    { id: 'products' as ActiveTab, label: t('navProducts'), icon: Package },
    { id: 'categories' as ActiveTab, label: t('navCategories'), icon: FolderTree },
    { id: 'brands' as ActiveTab, label: t('navBrands'), icon: Tag },
    { id: 'stock' as ActiveTab, label: t('navStock'), icon: Boxes },
    { id: 'suppliers' as ActiveTab, label: t('navSuppliers'), icon: Truck },
    { id: 'purchases' as ActiveTab, label: t('navPurchases'), icon: ShoppingBag },
    { id: 'expenses' as ActiveTab, label: t('navExpenses'), icon: Receipt },
    { id: 'return' as ActiveTab, label: isBn ? 'রিটার্ন' : 'Return', icon: RotateCcw }, // ভাষা সাপোর্ট সহ রিটার্ন মেনু
    { id: 'dues' as ActiveTab, label: t('navDues'), icon: CreditCard },
    { id: 'reports' as ActiveTab, label: t('navReports'), icon: BarChart3 },
    { id: 'history' as ActiveTab, label: t('navHistory'), icon: History },
    { id: 'settings' as ActiveTab, label: t('navSettings'), icon: Settings },
  ];

  return (
    <aside className="w-64 shrink-0">
      {/* এই ভেতরের div টাকে fixed করে দেওয়া হয়েছে, যাতে এটা স্ক্রিন থেকে কখনো না নড়ে */}
      <div className="fixed top-0 left-0 w-64 bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-xl text-slate-400 flex flex-col h-screen border-r border-slate-800 select-none z-20">
        
        {/* Brand Logo Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Store className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <span className="text-white font-bold tracking-tight text-lg block truncate">{settings.shop_name || 'Nexus ERP'}</span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 py-4 overflow-y-auto space-y-1 px-3 custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-indigo-400 opacity-90' : 'opacity-60'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-black bg-rose-500/90 text-white rounded-md uppercase tracking-wider">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};