import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { Database, Download, Upload } from 'lucide-react';

export const BackupPage: React.FC = () => {
  const { showToast, language } = useShop();
  const isBn = language === 'bn';
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  const handleCloudBackup = async () => {
    try {
      setIsBackingUp(true);
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('upload-to-drive');
      
      if (result.success) {
        showToast('success', result.message);
      } else {
        showToast('error', result.message);
      }
    } catch (error) {
      showToast('error', isBn ? 'গুগল ড্রাইভে ব্যাকআপ নিতে সমস্যা হয়েছে' : 'Failed to backup to Google Drive');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleCloudRestore = async () => {
    try {
      setIsRestoring(true);
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('download-from-drive');
      
      if (result.success) {
        showToast('success', isBn ? 'রিস্টোর সফল! পেজ রিলোড হচ্ছে...' : 'Restore Success! Reloading page...');
        // পিসির কমান্ড উইন্ডো যেন না খোলে, তাই শুধু অ্যাপের পেজটা রিলোড করা হচ্ছে!
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        showToast('error', result.message);
        setIsRestoring(false);
      }
    } catch (error) {
      showToast('error', isBn ? 'গুগল ড্রাইভ থেকে রিস্টোর করতে সমস্যা হয়েছে' : 'Failed to restore from Google Drive');
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="p-2.5 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200/50">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {isBn ? 'গুগল ড্রাইভ ব্যাকআপ ও রিকভারি' : 'Google Drive Backup & Recovery'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isBn ? 'সহজেই সকল পণ্যের তথ্য, বিক্রয় ও হিসাব সরাসরি আপনার গুগল ড্রাইভে সেভ করুন এবং যেকোনো সময় রিস্টোর করুন' : 'Safeguard shop data directly to Google Drive and restore with one click.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-6 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col justify-between space-y-4">
          <div>
            <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 w-fit rounded-xl border border-emerald-200/50 mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {isBn ? 'গুগল ড্রাইভে ব্যাকআপ নিন (Backup)' : 'Backup to Google Drive'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isBn ? 'দোকানের প্রোডাক্ট, সেলস রেকর্ড, কাস্টমার বকেয়া, সাপ্লায়ার ও সেটিংস সরাসরি আপনার গুগল ড্রাইভে সেভ করুন।' : 'Backup all products, sales records, customer balances, and settings directly to your Google Drive account.'}
            </p>
          </div>

          <button
            onClick={handleCloudBackup}
            disabled={isBackingUp || isRestoring}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" /> 
            {isBackingUp ? (isBn ? 'ব্যাকআপ হচ্ছে...' : 'Backing up...') : (isBn ? 'গুগল ড্রাইভে ব্যাকআপ করুন' : 'Backup to Google Drive')}
          </button>
        </div>

        <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-6 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col justify-between space-y-4">
          <div>
            <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 w-fit rounded-xl border border-indigo-200/50 mb-3">
              <Download className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {isBn ? 'গুগল ড্রাইভ থেকে রিস্টোর (Restore)' : 'Restore from Google Drive'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isBn ? 'গুগল ড্রাইভে সেভ করা সর্বশেষ ব্যাকআপ থেকে আপনার দোকানের সমস্ত তথ্য আবার অ্যাপে ফিরিয়ে আনুন।' : 'Restore your shop state from the latest backup saved in your Google Drive.'}
            </p>
          </div>

          <button
            onClick={handleCloudRestore}
            disabled={isBackingUp || isRestoring}
            className="w-full py-2.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-white/90 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> 
            {isRestoring ? (isBn ? 'রিস্টোর হচ্ছে...' : 'Restoring...') : (isBn ? 'গুগল ড্রাইভ থেকে রিস্টোর করুন' : 'Restore from Google Drive')}
          </button>
        </div>
      </div>
    </div>
  );
};