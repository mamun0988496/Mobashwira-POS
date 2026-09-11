import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { Customer, Sale, DuePayment } from '../types';
import {
  X,
  User,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  FileText,
  Printer,
  Edit3,
  CheckCircle2,
  Clock,
  ChevronRight
} from 'lucide-react';
// সঠিক পাথ দেওয়া হয়েছে
import { InvoiceModal } from './invoice/InvoiceModal';

interface CustomerProfileModalProps {
  customerId: number;
  onClose: () => void;
  onCollectDueSuccess?: () => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  customerId,
  onClose,
  onCollectDueSuccess
}) => {
  const { formatCurrency, getAuthHeader, showToast, language } = useShop();
  const isBn = language === 'bn';

  const [loading, setLoading] = useState<boolean>(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<DuePayment[]>([]);

  const [activeTab, setActiveTab] = useState<'purchases' | 'due_history'>('purchases');

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState<boolean>(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/history`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const data = await res.json();
        const cust = data.customer || null;
        setCustomer(cust);
        setSales(data.purchases || []);
        setPayments(data.payments || []);

        if (cust) {
          setEditName(cust.name || '');
          setEditPhone(cust.phone || '');
          setEditAddress(cust.address || '');
          setEditNotes(cust.notes || (isBn ? 'VIP নিয়মিত কাস্টমার' : 'VIP Regular Customer'));
        }
      } else {
        showToast('error', isBn ? 'কাস্টমার প্রোফাইল লোড করতে ব্যর্থ হয়েছে' : 'Failed to load customer profile');
      }
    } catch {
      showToast('error', isBn ? 'নেটওয়ার্ক ত্রুটি' : 'Network error loading profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [customerId, language]);

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName) return;

    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          address: editAddress,
          notes: editNotes
        })
      });

      if (res.ok) {
        showToast('success', isBn ? 'কাস্টমার তথ্য সফলভাবে আপডেট হয়েছে!' : 'Customer profile updated successfully!');
        setIsEditing(false);
        fetchHistory();
        if (onCollectDueSuccess) onCollectDueSuccess();
      } else {
        showToast('error', isBn ? 'কাস্টমার আপডেট করতে ব্যর্থ হয়েছে' : 'Failed to update customer');
      }
    } catch {
      showToast('error', isBn ? 'আপডেট করার সময় ত্রুটি ঘটেছে' : 'Error updating profile');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setIsInvoiceOpen(true);
  };

  const translatePaymentMethod = (method: string) => {
    if (!method) return isBn ? 'নগদ' : 'Cash';
    const m = method.toLowerCase();
    if (m === 'cash') return isBn ? 'নগদ (Cash)' : 'Cash';
    if (m === 'card') return isBn ? 'কার্ড (Card)' : 'Card';
    if (m === 'mobile_banking' || m === 'bkash' || m === 'nagad') return isBn ? 'বিকাশ / নগদ' : 'Mobile Banking';
    if (m === 'due' || m === 'baki') return isBn ? 'বাকিতে' : 'Due';
    return method;
  };

  const totalOrders = sales.length;
  const lastPurchaseDate = sales.length > 0 ? sales[0].date : 'N/A';
  const lastPaymentDate = payments.length > 0 ? payments[0].date : 'N/A';
  const registrationDate = customer?.created_at
    ? new Date(customer.created_at).toLocaleDateString(isBn ? 'bn-BD' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : (isBn ? '১২ জানুয়ারী, ২০২৪' : 'Jan 12, 2024');

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-md transition-opacity duration-300 flex justify-end animate-fadeIn">
        <div className="w-full max-w-4xl bg-slate-900 text-slate-100 h-full shadow-2xl border-l border-slate-800/80 flex flex-col overflow-hidden transform transition-all duration-300 ease-in-out">
          
          <div className="p-5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between shrink-0 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-100 tracking-wide">
                    {isBn ? 'কাস্টমার প্রোফাইল' : 'Customer Profile'}
                  </h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-medium">
                    #CUST-{customerId}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isBn ? 'গ্রাহকের সম্পূর্ণ অর্ডার বিবরণ ও প্রোফাইল ডাটাবেজ' : 'Complete customer order history & profile database'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                title={isBn ? 'এডিট করুন' : 'Edit Customer'}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 text-xs shadow-lg shadow-emerald-600/20"
              >
                <Edit3 className="w-4 h-4" />
                <span>{isBn ? 'এডিট' : 'Edit'}</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-20 text-center text-slate-400 text-sm font-medium">
              {isBn ? 'প্রোফাইল তথ্য লোড হচ্ছে...' : 'Loading profile details...'}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              {isEditing && (
                <form onSubmit={handleUpdateCustomer} className="p-4 bg-slate-800/90 border border-emerald-500/40 rounded-2xl space-y-3 text-xs animate-fadeIn shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                    <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4" /> {isBn ? 'কাস্টমার তথ্য আপডেট করুন' : 'Update Customer Details'}
                    </h4>
                    <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-200">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-medium text-slate-300 block mb-1">
                        {isBn ? 'কাস্টমার নাম' : 'Customer Name'}
                      </label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="font-medium text-slate-300 block mb-1">
                        {isBn ? 'ফোন নম্বর' : 'Phone Number'}
                      </label>
                      <input
                        type="text"
                        required
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 outline-none font-mono focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-medium text-slate-300 block mb-1">
                      {isBn ? 'ঠিকানা' : 'Address'}
                    </label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-300 block mb-1">
                      {isBn ? 'কাস্টমার নোট' : 'Customer Notes'}
                    </label>
                    <input
                      type="text"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder={isBn ? 'যেমন: VIP নিয়মিত গ্রাহক' : 'e.g. VIP regular customer'}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl cursor-pointer"
                    >
                      {isBn ? 'বাতিল' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={editSubmitting}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                      {editSubmitting ? (isBn ? 'সেভ হচ্ছে...' : 'Saving...') : (isBn ? 'সেভ করুন' : 'Save Changes')}
                    </button>
                  </div>
                </form>
              )}

              <div className="p-6 bg-slate-800/60 border border-slate-700/60 rounded-2xl shadow-xl backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-0.5 shadow-xl">
                        <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center overflow-hidden">
                          <User className="w-10 h-10 text-emerald-400" />
                        </div>
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-slate-950" />
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-extrabold text-slate-100">{customer?.name || 'Customer Name'}</h3>
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                          {isBn ? 'সক্রিয় গ্রাহক' : 'Active Customer'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap pt-0.5">
                        <span className="flex items-center gap-1.5 font-mono">
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          {customer?.phone || 'N/A'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          {customer?.address || (isBn ? 'ঢাকা, বাংলাদেশ' : 'Dhaka, Bangladesh')}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" /> {isBn ? 'রেজিস্ট্রেশন:' : 'Registration:'} <span className="text-slate-300 font-medium">{registrationDate}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" /> {isBn ? 'আইডি:' : 'ID:'} <span className="text-slate-300 font-mono font-medium">#CUST-{customerId}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold">{isBn ? 'মোট অর্ডার' : 'Total Orders'}</span>
                    <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-black text-slate-100 font-mono">
                    {totalOrders} {isBn ? 'টি' : ''}
                  </div>
                  <p className="text-[10px] text-slate-500">Order Count</p>
                </div>

                <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold">{isBn ? 'সর্বশেষ ক্রয়' : 'Last Purchase'}</span>
                    <Calendar className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-sm font-bold text-slate-100 font-mono truncate">
                    {lastPurchaseDate}
                  </div>
                  <p className="text-[10px] text-slate-500">Last Purchase Date</p>
                </div>

                <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold">{isBn ? 'সর্বশেষ পরিশোধ' : 'Last Payment'}</span>
                    <Clock className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-sm font-bold text-slate-100 font-mono truncate">
                    {lastPaymentDate}
                  </div>
                  <p className="text-[10px] text-slate-500">Last Payment Date</p>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-5 shadow-xl space-y-4 min-h-[320px]">
                <div className="flex items-center gap-3 border-b border-slate-700/80 pb-3">
                  <button
                    onClick={() => setActiveTab('purchases')}
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                      activeTab === 'purchases'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                        : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>{isBn ? 'কেনাকাটার ইতিহাস (Purchase History)' : 'Purchase History'}</span>
                    <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-950/40 text-slate-300 font-mono">
                      {sales.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('due_history')}
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                      activeTab === 'due_history'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                        : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>{isBn ? 'বাকি লেনদেন ইতিহাস (Due History)' : 'Due History'}</span>
                    <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-950/40 text-slate-300 font-mono">
                      {payments.length}
                    </span>
                  </button>
                </div>

                {activeTab === 'purchases' && (
                  <div className="overflow-x-auto">
                    {sales.length === 0 ? (
                      <div className="py-12 text-center text-slate-500 text-xs">
                        {isBn ? 'কোন অর্ডার রেকর্ড পাওয়া যায়নি।' : 'No order records found.'}
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-700/80 text-slate-400 font-bold uppercase tracking-wider">
                            <th className="py-3 px-3">{isBn ? 'ইনভয়েস নং' : 'Invoice No'}</th>
                            <th className="py-3 px-3">{isBn ? 'তারিখ' : 'Date'}</th>
                            <th className="py-3 px-3">{isBn ? 'মোট টাকা' : 'Total'}</th>
                            <th className="py-3 px-3">{isBn ? 'পরিশোধিত' : 'Paid'}</th>
                            <th className="py-3 px-3">{isBn ? 'বাকি' : 'Due'}</th>
                            <th className="py-3 px-3">{isBn ? 'পেমেন্ট মেথড' : 'Payment Method'}</th>
                            <th className="py-3 px-3 text-center">{isBn ? 'অবস্থা' : 'Status'}</th>
                            <th className="py-3 px-3 text-right">{isBn ? 'অ্যাকশন' : 'Action'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/40">
                          {sales.map((s) => {
                            const isCompleted = s.due_amount <= 0;
                            return (
                              <tr key={s.id} className="hover:bg-slate-700/30 transition-colors">
                                <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                                  {s.invoice_no}
                                </td>
                                <td className="py-3 px-3 font-mono text-slate-300">
                                  {s.date}
                                </td>
                                <td className="py-3 px-3 font-mono font-bold text-slate-100">
                                  {formatCurrency(s.total)}
                                </td>
                                <td className="py-3 px-3 font-mono text-emerald-400 font-bold">
                                  {formatCurrency(s.paid_amount)}
                                </td>
                                <td className="py-3 px-3 font-mono text-amber-400 font-bold">
                                  {s.due_amount > 0 ? formatCurrency(s.due_amount) : '৳0'}
                                </td>
                                <td className="py-3 px-3 text-slate-300">
                                  {translatePaymentMethod(s.payment_method)}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {isCompleted ? (
                                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      {isBn ? 'সম্পন্ন (Completed)' : 'Completed'}
                                    </span>
                                  ) : (
                                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                      {isBn ? 'বকেয়া রয়েছে' : 'Pending'}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    onClick={() => handleViewDetails(s)}
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 rounded-lg text-[11px] font-semibold transition-all border border-slate-700/60 inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>{isBn ? 'বিস্তারিত' : 'Details'}</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {activeTab === 'due_history' && (
                  <div className="overflow-x-auto">
                    {payments.length === 0 ? (
                      <div className="py-12 text-center text-slate-500 text-xs">
                        {isBn ? 'কোন বাকি পেমেন্ট ক্লিয়ারেন্স রেকর্ড পাওয়া যায়নি।' : 'No due payment clearance records found.'}
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-700/80 text-slate-400 font-bold uppercase tracking-wider">
                            <th className="py-3 px-3">{isBn ? 'রসিদ নং' : 'Receipt No'}</th>
                            <th className="py-3 px-3">{isBn ? 'পরিশোধের তারিখ' : 'Payment Date'}</th>
                            <th className="py-3 px-3">{isBn ? 'শোধ করা পরিমাণ' : 'Paid Amount'}</th>
                            <th className="py-3 px-3">{isBn ? 'পেমেন্ট মেথড' : 'Payment Method'}</th>
                            <th className="py-3 px-3">{isBn ? 'স্ট্যাটাস / নোট' : 'Status / Notes'}</th>
                            <th className="py-3 px-3 text-right">{isBn ? 'অ্যাকশন' : 'Action'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/40">
                          {payments.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-700/30 transition-colors">
                              <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                                REC-{p.id}
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-300">
                                {p.date}
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-emerald-400 text-sm">
                                {formatCurrency(p.amount)}
                              </td>
                              <td className="py-3 px-3 text-slate-300">
                                {translatePaymentMethod(p.payment_method)}
                              </td>
                              <td className="py-3 px-3 text-slate-400 italic">
                                {p.note || (isBn ? 'বাকির টাকা পরিশোধ করা হয়েছে' : 'Due payment collected')}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  onClick={() => handlePrint()}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 rounded-lg text-[11px] font-semibold transition-all border border-slate-700/60 inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <span>{isBn ? 'রসিদ প্রিন্ট' : 'Print Receipt'}</span>
                                  <Printer className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <InvoiceModal
        sale={selectedSale}
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
      />
    </>
  );
};