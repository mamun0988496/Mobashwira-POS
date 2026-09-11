import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { Customer, Supplier } from '../types';
import { CreditCard, Users, UserPlus, X, Eye, User, Building2, Trash2, Search } from 'lucide-react';
import { validateBDPhone, sanitizeBDPhoneInput } from '../utils/phone';
import { CustomerProfileModal } from '../components/CustomerProfileModal';
import { ConfirmationModal } from '../components/common/ConfirmationModal';

export const DueManagementPage: React.FC = () => {
  const { formatCurrency, getAuthHeader, showToast, language } = useShop();
  const isBn = language === 'bn';

  const [customerDues, setCustomerDues] = useState<Customer[]>([]);
  const [supplierDues, setSupplierDues] = useState<Supplier[]>([]);
  const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Customer Profile Modal
  const [selectedProfileCustomerId, setSelectedProfileCustomerId] = useState<number | null>(null);

  // Add Customer Modal
  const [showAddCustModal, setShowAddCustModal] = useState<boolean>(false);
  const [custName, setCustName] = useState<string>('');
  const [custPhone, setCustPhone] = useState<string>('');
  const [custEmail, setCustEmail] = useState<string>('');
  const [custAddress, setCustAddress] = useState<string>('');
  const [openingDue, setOpeningDue] = useState<string>('');
  const [custSubmitting, setCustSubmitting] = useState<boolean>(false);

  // Settlement Modal
  const [selectedEntity, setSelectedEntity] = useState<{ id: number; name: string; due: number; type: 'customer' | 'supplier' } | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<string>('cash');
  const [payNote, setPayNote] = useState<string>('');

  const fetchDues = async () => {
    try {
      const res = await fetch('/api/dues', { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setCustomerDues(data.customerDues || []);
        setSupplierDues(data.supplierDues || []);
      }
    } catch {
      showToast('error', 'Error loading dues summary');
    }
  };

  useEffect(() => {
    fetchDues();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName) return;

    if (custPhone && custPhone.trim() !== '') {
      const phoneCheck = validateBDPhone(custPhone);
      if (!phoneCheck.isValid) {
        showToast('error', phoneCheck.message || 'শুধুমাত্র সঠিক বাংলাদেশী ফোন নম্বর প্রদান করুন');
        return;
      }
    }

    setCustSubmitting(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          name: custName,
          phone: custPhone,
          email: custEmail,
          address: custAddress,
          opening_due: parseFloat(openingDue) || 0
        })
      });

      if (res.ok) {
        showToast('success', 'Customer added successfully!');
        setShowAddCustModal(false);
        setCustName('');
        setCustPhone('');
        setCustEmail('');
        setCustAddress('');
        setOpeningDue('');
        fetchDues();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to add customer');
      }
    } catch {
      showToast('error', 'Network error adding customer');
    } finally {
      setCustSubmitting(false);
    }
  };

  // Delete Customer state
  const [deleteCustomerTarget, setDeleteCustomerTarget] = useState<{ id: number; name: string } | null>(null);

  const handleDeleteCustomer = async (id: number) => {
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });

      if (res.ok) {
        showToast('success', isBn ? 'কাস্টমার মুছে ফেলা হয়েছে' : 'Customer deleted successfully!');
        fetchDues();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to delete customer');
      }
    } catch {
      showToast('error', 'Network error deleting customer');
    }
  };

  const handleSettleDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntity || !payAmount || parseFloat(payAmount) <= 0) return;

    try {
      const res = await fetch('/api/dues/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          type: selectedEntity.type,
          entity_id: selectedEntity.id,
          amount: parseFloat(payAmount),
          payment_method: payMethod,
          note: payNote
        })
      });

      if (res.ok) {
        showToast('success', `${selectedEntity.type === 'customer' ? 'Customer' : 'Supplier'} due payment recorded!`);
        setSelectedEntity(null);
        setPayAmount('');
        setPayNote('');
        fetchDues();
      } else {
        showToast('error', 'Failed to settle due payment');
      }
    } catch {
      showToast('error', 'Network error');
    }
  };

  const totalCustomerDue = customerDues.reduce((acc, c) => acc + c.total_due, 0);
  const totalSupplierDue = supplierDues.reduce((acc, s) => acc + s.total_due, 0);

  const filteredCustomerDues = customerDues.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.phone && c.phone.toLowerCase().includes(term))
    );
  });

  const filteredSupplierDues = supplierDues.filter((s) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.company_name && s.company_name.toLowerCase().includes(term)) ||
      (s.phone && s.phone.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200/50">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Due Settlement Center</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Track outstanding receivables from buyers & payables to suppliers</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowAddCustModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
          <button
            onClick={() => setActiveTab('customer')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'customer'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-300'
            }`}
          >
            Customer Dues ({customerDues.length})
          </button>
          <button
            onClick={() => setActiveTab('supplier')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'supplier'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-300'
            }`}
          >
            Supplier Dues ({supplierDues.length})
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Due</span>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(totalCustomerDue)}</h3>
          </div>
          <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-200/50">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Dues List */}
      <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
        {/* Search Bar Bar Header */}
        <div className="p-4 border-b border-white/60 dark:border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={isBn ? 'কাস্টমার / সাপ্লায়ারের নাম বা ফোন দিয়ে খুঁজুন...' : 'Search by name or phone number...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 shadow-xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 self-end sm:self-auto">
            {isBn
              ? `মোট পাওয়া গেছে: ${activeTab === 'customer' ? filteredCustomerDues.length : filteredSupplierDues.length} জন`
              : `Total found: ${activeTab === 'customer' ? filteredCustomerDues.length : filteredSupplierDues.length}`}
          </div>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-white/50 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400 font-semibold uppercase">
            <tr>
              <th className="p-3.5 pl-5">{activeTab === 'customer' ? 'Customer Name' : 'Supplier / Vendor'}</th>
              <th className="p-3.5">Contact Phone</th>
              <th className="p-3.5">Address</th>
              <th className="p-3.5 text-right">Outstanding Due</th>
              <th className="p-3.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/40 dark:divide-slate-700/40">
            {activeTab === 'customer'
              ? filteredCustomerDues.map((c) => (
                  <tr key={c.id} className="hover:bg-white/60 dark:hover:bg-slate-700/30">
                    <td className="p-3.5 pl-5 font-bold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0 shadow-xs">
                          <User className="w-4 h-4" />
                        </div>
                        <button
                          onClick={() => setSelectedProfileCustomerId(c.id)}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400 text-left cursor-pointer underline decoration-dotted underline-offset-2"
                          title="Click to view full customer profile"
                        >
                          {c.name}
                        </button>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">{c.phone || 'N/A'}</td>
                    <td className="p-3.5 text-slate-500 dark:text-slate-400">{c.address || 'N/A'}</td>
                    <td className="p-3.5 text-right font-black text-rose-600 dark:text-rose-400">{formatCurrency(c.total_due)}</td>
                    <td className="p-3.5 text-center flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedProfileCustomerId(c.id)}
                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl border border-indigo-200/50 cursor-pointer flex items-center gap-1 text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Profile</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedEntity({ id: c.id, name: c.name, due: c.total_due, type: 'customer' });
                          setPayAmount(c.total_due.toString());
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer text-xs"
                      >
                        Collect Due
                      </button>
                      <button
                        onClick={() => setDeleteCustomerTarget({ id: c.id, name: c.name })}
                        title={isBn ? 'কাস্টমার মুছে ফেলুন' : 'Delete Customer'}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-200/50 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              : filteredSupplierDues.map((s) => (
                  <tr key={s.id} className="hover:bg-white/60 dark:hover:bg-slate-700/30">
                    <td className="p-3.5 pl-5 font-bold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 shadow-xs">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <span>
                          {s.name} {s.company_name ? `(${s.company_name})` : ''}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">{s.phone}</td>
                    <td className="p-3.5 text-slate-500 dark:text-slate-400">{s.address || 'N/A'}</td>
                    <td className="p-3.5 text-right font-black text-rose-600 dark:text-rose-400">{formatCurrency(s.total_due)}</td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => {
                          setSelectedEntity({ id: s.id, name: s.name, due: s.total_due, type: 'supplier' });
                          setPayAmount(s.total_due.toString());
                        }}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-md shadow-rose-600/20 cursor-pointer"
                      >
                        Pay Supplier
                      </button>
                    </td>
                  </tr>
                ))}

            {(activeTab === 'customer' ? filteredCustomerDues.length === 0 : filteredSupplierDues.length === 0) && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                  {searchTerm
                    ? (isBn ? 'কোনো কাস্টমার বা সাপ্লায়ারের তথ্য পাওয়া যায়নি' : 'No matching records found')
                    : (isBn ? 'কোনো বাকির তালিকা নেই' : 'No due records found')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Customer Modal */}
      {showAddCustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-6 rounded-3xl max-w-md w-full border border-white/80 dark:border-slate-700/60 shadow-2xl relative">
            <button
              onClick={() => setShowAddCustModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                {isBn ? 'নতুন কাস্টমার যোগ করুন' : 'Add New Customer'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {isBn ? 'বকেয়া হিসাব সংরক্ষণের জন্য কাস্টমারের তথ্য দিন' : 'Enter details of the customer to manage dues'}
            </p>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  {isBn ? 'কাস্টমারের নাম *' : 'Customer Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isBn ? 'যেমন: রহিম আহমেদ' : 'e.g. Rahim Ahmed'}
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none font-medium"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  {isBn ? 'ফোন নম্বর (ঐচ্ছিক)' : 'Phone Number (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder={isBn ? 'যেমন: 01712345678 (ঐচ্ছিক)' : 'e.g. 01712345678 (Optional)'}
                  value={custPhone}
                  onChange={(e) => setCustPhone(sanitizeBDPhoneInput(e.target.value))}
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none font-mono font-medium"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  {isBn ? 'ঠিকানা (ঐচ্ছিক)' : 'Address (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder={isBn ? 'যেমন: মিরপুর, ঢাকা' : 'e.g. Dhanmondi, Dhaka'}
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none font-medium"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  {isBn ? 'পূর্বের বকেয়া (ঐচ্ছিক)' : 'Opening Due (Optional)'}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0"
                  value={openingDue}
                  onChange={(e) => setOpeningDue(e.target.value)}
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none font-mono font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustModal(false)}
                  className="px-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl font-semibold cursor-pointer"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={custSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  {custSubmitting ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBn ? 'কাস্টমার সংরক্ষণ করুন' : 'Save Customer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Due Modal */}
      {selectedEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-6 rounded-3xl max-w-md w-full border border-white/80 dark:border-slate-700/60 shadow-2xl">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">
              {selectedEntity.type === 'customer' ? 'Collect Customer Due' : 'Pay Supplier Due'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{selectedEntity.name} • Total Due: {formatCurrency(selectedEntity.due)}</p>

            <form onSubmit={handleSettleDue} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Payment Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedEntity.due}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl font-bold font-mono text-sm outline-none"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile_banking">Mobile Banking</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Payment Note</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="e.g. Due settlement installment"
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setSelectedEntity(null)} className="px-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl font-semibold cursor-pointer">Cancel</button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white font-bold rounded-xl cursor-pointer shadow-md ${selectedEntity.type === 'customer' ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-rose-600 shadow-rose-600/20'}`}
                >
                  Confirm Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Customer Profile Modal */}
      {selectedProfileCustomerId !== null && (
        <CustomerProfileModal
          customerId={selectedProfileCustomerId}
          onClose={() => setSelectedProfileCustomerId(null)}
          onCollectDueSuccess={fetchDues}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteCustomerTarget}
        title={isBn ? 'কাস্টমার মুছুন' : 'Delete Customer'}
        message={
          isBn
            ? `আপনি কি নিশ্চিত যে '${deleteCustomerTarget?.name}' কে কাস্টমার তালিকা থেকে মুছে ফেলতে চান?`
            : `Are you sure you want to delete customer '${deleteCustomerTarget?.name}'?`
        }
        confirmText={isBn ? 'হ্যাঁ, মুছুন' : 'Yes, Delete'}
        cancelText={isBn ? 'বাতিল' : 'Cancel'}
        isDanger={true}
        onConfirm={() => {
          if (deleteCustomerTarget) {
            handleDeleteCustomer(deleteCustomerTarget.id);
          }
        }}
        onClose={() => setDeleteCustomerTarget(null)}
      />
    </div>
  );
};
