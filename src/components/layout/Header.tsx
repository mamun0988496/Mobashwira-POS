import React from 'react';
import { ActiveTab } from './Sidebar';
import { useShop } from '../../context/ShopContext';
import { ShoppingCart, Sun, Moon, Globe } from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onSearchOpen?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const { darkMode, toggleDarkMode, language, setLanguage, t } = useShop();

  const getTabHeaderInfo = (tab: ActiveTab) => {
    switch (tab) {
      case 'dashboard':
        return { title: t('headerDashboardTitle'), subtitle: t('headerDashboardSub') };
      case 'pos':
        return { title: t('headerPosTitle'), subtitle: t('headerPosSub') };
      case 'products':
        return { title: t('headerProductsTitle'), subtitle: t('headerProductsSub') };
      case 'categories':
        return { title: t('headerCategoriesTitle'), subtitle: t('headerCategoriesSub') };
      case 'brands':
        return { title: t('headerBrandsTitle'), subtitle: t('headerBrandsSub') };
      case 'stock':
        return { title: t('headerStockTitle'), subtitle: t('headerStockSub') };
      case 'customers':
        return { title: t('headerCustomersTitle'), subtitle: t('headerCustomersSub') };
      case 'suppliers':
        return { title: t('headerSuppliersTitle'), subtitle: t('headerSuppliersSub') };
      case 'purchases':
        return { title: t('headerPurchasesTitle'), subtitle: t('headerPurchasesSub') };
      case 'expenses':
        return { title: t('headerExpensesTitle'), subtitle: t('headerExpensesSub') };
      case 'dues':
        return { title: t('headerDuesTitle'), subtitle: t('headerDuesSub') };
      case 'reports':
        return { title: t('headerReportsTitle'), subtitle: t('headerReportsSub') };
      case 'history':
        return { title: t('headerHistoryTitle'), subtitle: t('headerHistorySub') };
      case 'users':
        return { title: t('headerUsersTitle'), subtitle: t('headerUsersSub') };
      case 'backup':
        return { title: t('headerBackupTitle'), subtitle: t('headerBackupSub') };
      case 'settings':
        return { title: t('headerSettingsTitle'), subtitle: t('headerSettingsSub') };
      default:
        return { title: t('appName'), subtitle: '' };
    }
  };

  const current = getTabHeaderInfo(activeTab);

  return (
    <header className="h-16 px-8 z-20 flex items-center justify-between shrink-0 sticky top-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-b border-white/60 dark:border-slate-800/60 shadow-xs">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{current.title}</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">{current.subtitle}</p>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Language Switcher Pill */}
        <button
          onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
          title={language === 'bn' ? 'Switch to English' : 'বাংলা ভাষায় পরিবর্তন করুন'}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-full border border-white/50 dark:border-slate-700/50 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-500" />
          <span>{language === 'bn' ? 'বাংলা (BN)' : 'English (EN)'}</span>
        </button>

        {/* Quick Date Pill */}
        <div className="hidden lg:flex items-center bg-white/70 dark:bg-slate-800/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 dark:border-slate-700/50 text-xs font-semibold text-slate-500 dark:text-slate-400 shadow-xs">
          {new Date().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
        </div>

        {/* Quick POS Launch Button */}
        {activeTab !== 'pos' && (
          <button
            onClick={() => setActiveTab('pos')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-full shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" /> {t('openPos')}
          </button>
        )}

        {/* Dark mode toggle pill */}
        <button
          onClick={toggleDarkMode}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="w-10 h-10 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-full border border-white/50 dark:border-slate-700/50 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-xs hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};

