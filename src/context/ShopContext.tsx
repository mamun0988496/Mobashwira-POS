import React, { createContext, useContext, useState, useEffect } from 'react';
import { ShopSettings, ToastMessage } from '../types';
import { translations, Language } from '../i18n/translations';

interface ShopContextType {
  settings: ShopSettings;
  updateSettings: (newSettings: Partial<ShopSettings>) => Promise<void>;
  toasts: ToastMessage[];
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  removeToast: (id: string) => void;
  formatCurrency: (amount: number) => string;
  getAuthHeader: () => Record<string, string>;
  darkMode: boolean;
  toggleDarkMode: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.bn, fallback?: string) => string;
  cleanDemoData: () => Promise<boolean>;
  resetAppData: () => Promise<boolean>;
}

const defaultSettings: ShopSettings = {
  shop_name: 'আমার শপ',
  logo: '',
  address: '',
  phone: '',
  email: '',
  currency: '৳',
  language: 'bn',
  invoice_design: 'A4',
  dark_mode: 'false',
  auto_backup: 'daily'
};

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ShopSettings>(defaultSettings);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [language, setLanguageState] = useState<Language>('bn');

  const getAuthHeader = () => {
    const token = localStorage.getItem('shop_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings', { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({ ...prev, ...data }));
        if (data.dark_mode === 'true') {
          setDarkMode(true);
        }
        if (data.language === 'en' || data.language === 'bn') {
          setLanguageState(data.language as Language);
        }
      }
    } catch {
      // Use defaults
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const updateSettings = async (newSettings: Partial<ShopSettings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        setSettings((prev) => ({ ...prev, ...newSettings }));
        if (newSettings.language && (newSettings.language === 'en' || newSettings.language === 'bn')) {
          setLanguageState(newSettings.language as Language);
        }
        showToast('success', language === 'bn' ? 'সেটিংস সফলভাবে সংরক্ষিত হয়েছে!' : 'Shop settings saved successfully!');
      } else {
        showToast('error', language === 'bn' ? 'সেটিংস সেভ করতে ব্যর্থ হয়েছে' : 'Failed to save shop settings');
      }
    } catch {
      showToast('error', language === 'bn' ? 'নেটওয়ার্ক ত্রুটি' : 'Network error saving settings');
    }
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    updateSettings({ language: lang });
  };

  const t = (key: keyof typeof translations.bn, fallback?: string): string => {
    const langDict = translations[language] || translations.bn;
    return langDict[key] || fallback || translations.bn[key] || String(key);
  };

  const cleanDemoData = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/demo/clean', {
        method: 'POST',
        headers: { ...getAuthHeader() }
      });
      if (res.ok) {
        // রিটার্ন হিস্ট্রি ক্লিয়ার করার কোড
        localStorage.removeItem('return_history_logs');
        
        showToast('success', t('cleanDemoSuccess'));
        return true;
      } else {
        showToast('error', 'Failed to clean demo data');
        return false;
      }
    } catch {
      showToast('error', 'Network error while cleaning demo data');
      return false;
    }
  };

  const resetAppData = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/app/reset', {
        method: 'POST',
        headers: { ...getAuthHeader() }
      });
      if (res.ok) {
        // রিটার্ন হিস্ট্রি ক্লিয়ার করার কোড
        localStorage.removeItem('return_history_logs');
        
        showToast('success', language === 'bn' ? 'অ্যাপের সমস্ত ডাটা সফলভাবে রিসেট করা হয়েছে!' : 'All app data reset successfully!');
        // পেজটি অটোমেটিক রিলোড হবে যাতে হিস্ট্রি সাথে সাথে মুছে যায়
        setTimeout(() => window.location.reload(), 1000);
        return true;
      } else {
        showToast('error', language === 'bn' ? 'অ্যাপ রিসেট করতে ব্যর্থ হয়েছে' : 'Failed to reset app');
        return false;
      }
    } catch {
      showToast('error', language === 'bn' ? 'নেটওয়ার্ক ত্রুটি' : 'Network error resetting app');
      return false;
    }
  };

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    updateSettings({ dark_mode: newMode ? 'true' : 'false' });
  };

  const formatCurrency = (amount: number) => {
    const num = Number(amount) || 0;
    return `${settings.currency || '৳'} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <ShopContext.Provider
      value={{
        settings,
        updateSettings,
        toasts,
        showToast,
        removeToast,
        formatCurrency,
        getAuthHeader,
        darkMode,
        toggleDarkMode,
        language,
        setLanguage,
        t,
        cleanDemoData,
        resetAppData
      }}
    >
      <div className={darkMode ? 'dark bg-slate-900 text-slate-100 min-h-screen' : 'bg-slate-50 text-slate-900 min-h-screen'}>
        {children}
      </div>
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) throw new Error('useShop must be used within a ShopProvider');
  return context;
};