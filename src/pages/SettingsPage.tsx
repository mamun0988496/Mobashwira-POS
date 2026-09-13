import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { Settings, Save, Store, DollarSign, Globe, RotateCcw, AlertTriangle, Shield } from 'lucide-react';
import { Language } from '../i18n/translations';
import { validateBDPhone, sanitizeBDPhoneInput } from '../utils/phone';
import { BackupPage } from './BackupPage';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, t, language, setLanguage, showToast, resetAppData } = useShop();

  const [shopName, setShopName] = useState<string>(settings.shop_name || '');
  const [shopAddress, setShopAddress] = useState<string>(settings.address || '');
  const [shopPhone, setShopPhone] = useState<string>(settings.phone || '');
  const [shopEmail, setShopEmail] = useState<string>(settings.email || '');
  const [currencySymbol, setCurrencySymbol] = useState<string>(settings.currency || '৳');
  const [invoiceDesign, setInvoiceDesign] = useState<'58mm' | 'A4'>(settings.invoice_design || 'A4');
  const [appLanguage, setAppLanguage] = useState<Language>(language || 'bn');
  const [settingsPassword, setSettingsPassword] = useState<string>(settings.settings_password || ''); // 🔴 পাসওয়ার্ড স্টেট যুক্ত করা হয়েছে
  const [saving, setSaving] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);

  useEffect(() => {
    setShopName(settings.shop_name || '');
    setShopAddress(settings.address || '');
    setShopPhone(settings.phone || '');
    setShopEmail(settings.email || '');
    setCurrencySymbol(settings.currency || '৳');
    setInvoiceDesign(settings.invoice_design || 'A4');
    setAppLanguage(language || 'bn');
    setSettingsPassword(settings.settings_password || ''); // 🔴 ডাটাবেস থেকে পাসওয়ার্ড লোড করা হচ্ছে
  }, [settings, language]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (shopPhone) {
      const phoneCheck = validateBDPhone(shopPhone);
      if (!phoneCheck.isValid) {
        showToast('error', phoneCheck.message || 'দোকানের ফোন নম্বরটি অবশ্যই সঠিক বাংলাদেশী হতে হবে');
        return;
      }
    }
    setSaving(true);
    try {
      await updateSettings({
        shop_name: shopName,
        address: shopAddress,
        phone: shopPhone,
        email: shopEmail,
        currency: currencySymbol,
        invoice_design: invoiceDesign,
        language: appLanguage,
        settings_password: settingsPassword // 🔴 ডাটাবেসে পাসওয়ার্ড সেভ করা হচ্ছে
      });
      if (appLanguage !== language) {
        setLanguage(appLanguage);
      }
      
      showToast('success', appLanguage === 'bn' ? 'সেটিংস সফলভাবে সেভ হয়েছে!' : 'Settings saved successfully!');
      
    } catch (error) {
      showToast('error', appLanguage === 'bn' ? 'সেটিংস সেভ করতে সমস্যা হয়েছে!' : 'Failed to save settings!');
    } finally {
      setSaving(false);
    }
  };

  const handleFullReset = async () => {
    setResetting(true);
    try {
      const success = await resetAppData();
      if (success) {
        setShowResetModal(false);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex items-center gap-3 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="p-2.5 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200/50">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('headerSettingsTitle')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('headerSettingsSub')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-6 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6 text-xs">
        
        {/* Language Option */}
        <div>
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> {t('languageSelection')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                {t('languageSelection')}
              </label>
              <select
                value={appLanguage}
                onChange={(e) => setAppLanguage(e.target.value as Language)}
                className="w-full p-3 bg-white/80 dark:bg-slate-900/80 border border-indigo-200 dark:border-indigo-800/60 rounded-xl text-slate-800 dark:text-slate-100 font-bold outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
              >
                <option value="bn">🇧🇩 বাংলা (Bengali)</option>
                <option value="en">🇬🇧 English (ইংরেজি)</option>
              </select>
            </div>
            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl flex items-center text-indigo-700 dark:text-indigo-300">
              <p className="text-[11px] leading-relaxed">
                {appLanguage === 'bn' 
                  ? 'অ্যাপের সমস্ত বাটন, মেনু, ফিল্ড ও রিপোর্ট তাৎক্ষণিকভাবে বাংলায় প্রদর্শিত হবে।' 
                  : 'All app interface buttons, menus, fields and reports will switch to English immediately.'}
              </p>
            </div>
          </div>
        </div>

        {/* Shop Information Section */}
        <div className="pt-4 border-t border-white/40 dark:border-slate-700/40">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-3 flex items-center gap-2">
            <Store className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> {t('shopDetails')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">{t('shopName')} *</label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl text-slate-800 dark:text-slate-100 outline-none"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">{t('phone')} (বাংলাদেশী)</label>
              <input
                type="text"
                value={shopPhone}
                onChange={(e) => setShopPhone(sanitizeBDPhoneInput(e.target.value))}
                placeholder="01712345678 বা +8801712345678"
                className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl text-slate-800 dark:text-slate-100 outline-none"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">{t('email')}</label>
              <input
                type="email"
                value={shopEmail}
                onChange={(e) => setShopEmail(e.target.value)}
                className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl text-slate-800 dark:text-slate-100 outline-none"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">{t('address')}</label>
              <input
                type="text"
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl text-slate-800 dark:text-slate-100 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Currency & Invoice Setup */}
        <div className="pt-4 border-t border-white/40 dark:border-slate-700/40">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> {t('currencySymbol')} & {t('receiptFormat')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">{t('currencySymbol')}</label>
              <input
                type="text"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                placeholder="৳"
                className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl font-mono text-center font-bold text-slate-800 dark:text-slate-100 outline-none"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">{t('receiptFormat')}</label>
              <select
                value={invoiceDesign}
                onChange={(e) => setInvoiceDesign(e.target.value as '58mm' | 'A4')}
                className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl text-slate-800 dark:text-slate-100 outline-none"
              >
                <option value="A4">A4 Invoice Paper</option>
                <option value="58mm">58mm POS Thermal Slip</option>
              </select>
            </div>
          </div>
        </div>

        {/* ================= Security Settings (নতুন যুক্ত করা হলো) ================= */}
        <div className="pt-4 border-t border-white/40 dark:border-slate-700/40">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-rose-600 dark:text-rose-400" /> Security Settings (সেটিংস পাসওয়ার্ড)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Settings Page Password</label>
              <input
                type="text"
                value={settingsPassword}
                onChange={(e) => setSettingsPassword(e.target.value)}
                className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-500/50"
                placeholder="পাসওয়ার্ড দিন (ফাঁকা রাখলে পাসওয়ার্ড চাইবে না)"
              />
              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                এই পাসওয়ার্ড সেট করলে সাইডবার থেকে সেটিংসে আসার সময় প্রতিবার পাসওয়ার্ড দিয়ে প্রবেশ করতে হবে।
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-3 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className={`px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 ${saving ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <Save className={`w-4 h-4 ${saving ? 'animate-pulse' : ''}`} /> 
            {saving 
              ? (appLanguage === 'bn' ? 'সেভ হচ্ছে...' : 'Saving...') 
              : t('saveSettingsBtn')}
          </button>
        </div>
      </form>

      {/* Backup & Restore Section */}
      <div className="pt-2">
        <BackupPage />
      </div>

      {/* Full App Reset Section */}
      <div className="bg-rose-50/60 dark:bg-rose-950/20 backdrop-blur-xl p-6 rounded-2xl border border-rose-200/60 dark:border-rose-900/40 shadow-xl shadow-rose-100/30 dark:shadow-none space-y-4 text-xs">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <h4 className="font-bold text-rose-700 dark:text-rose-400 text-sm flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              {appLanguage === 'bn' ? 'সম্পূর্ণ অ্যাপ রিসেট করুন (Full App Reset)' : 'Full App Reset'}
            </h4>
            <p className="text-slate-600 dark:text-slate-400 text-xs max-w-2xl leading-relaxed">
              {appLanguage === 'bn'
                ? 'এই অপশনটির সাহায্যে অ্যাপের সমস্ত ডাটা (পণ্য, বিক্রয় রেকর্ড, পারচেজ, কাস্টমার, সাপ্লায়ার, খরচ ও বকেয়া) সম্পূর্ণ মুছে ফেলে নতুন শুরু করতে পারবেন।'
                : 'Reset all application data including products, sales history, purchases, customers, suppliers, expenses and dues back to a clean state.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            {appLanguage === 'bn' ? 'সম্পূর্ণ অ্যাপ রিসেট করুন' : 'Reset All App Data'}
          </button>
        </div>
      </div>

      {/* App Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/60 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {appLanguage === 'bn' ? 'সম্পূর্ণ অ্যাপ রিসেট কনফার্মেশন' : 'Confirm Full App Reset'}
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                  {appLanguage === 'bn' ? 'সতর্কতা: এটি আর ফিরিয়ে আনা যাবে না!' : 'Warning: Action cannot be undone!'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-rose-50/50 dark:bg-rose-950/30 p-3.5 rounded-xl border border-rose-100 dark:border-rose-900/30">
              {appLanguage === 'bn'
                ? 'আপনি কি নিশ্চিত যে আপনি অ্যাপের সমস্ত তথ্য (পণ্য, সেলস রসিদ, কাস্টমার, সাপ্লায়ার, ক্রয় হিসাব ও হিস্ট্রি) স্থায়ীভাবে মুছে ফেলতে চান?'
                : 'Are you sure you want to permanently delete all application data (products, sales receipts, customers, suppliers, purchases and history)?'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer"
              >
                {appLanguage === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleFullReset}
                disabled={resetting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                {resetting
                  ? (appLanguage === 'bn' ? 'রিসেট হচ্ছে...' : 'Resetting...')
                  : (appLanguage === 'bn' ? 'হ্যাঁ, সম্পূর্ণ রিসেট করুন' : 'Yes, Reset Everything')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};