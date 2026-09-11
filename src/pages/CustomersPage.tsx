import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { Customer } from '../types';
import { Users, Plus, Phone, MapPin, Edit2, History, User, Trash2 } from 'lucide-react';
import { validateBDPhone, sanitizeBDPhoneInput } from '../utils/phone';
import { CustomerProfileModal } from '../components/CustomerProfileModal';
import { ConfirmationModal } from '../components/common/ConfirmationModal';

export const CustomersPage: React.FC = () => {
  const { formatCurrency, getAuthHeader, showToast, language } = useShop();
  const isBn = language === 'bn';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form State
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [address, setAddress] = useState<string>('');

  // Profile Modal State
  const [profileCustId, setProfileCustId] = useState<number | null>(null);

  // Delete Target State
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers', { headers: getAuthHeader() });
      if (res.ok) setCustomers(await res.json());
    } catch {
      showToast('error', 'Error loading customers');
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleDeleteCustomer = async (id: number) => {
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });

      if (res.ok) {
        showToast('success', isBn ? 'কাস্টমার মুছে ফেলা হয়েছে' : 'Customer deleted successfully!');
        fetchCustomers();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to delete customer');
      }
    } catch {
      showToast('error', 'Network error deleting customer');
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    if (phone && phone.trim() !== '') {
      const phoneCheck = validateBDPhone(phone);
      if (!phoneCheck.isValid) {
        showToast('error', phoneCheck.message || 'শুধুমাত্র বাংলাদেশী ফোন নম্বর গ্রহণযোগ্য');
        return;
      }
    }

    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ name, phone, email, address })
      });

      if (res.ok) {
        showToast('success', editingCustomer ? 'Customer updated' : 'Customer created');
        setShowAddModal(false);
        fetchCustomers();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to save customer');
      }
    } catch {
      showToast('error', 'Network error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200/50">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Customer Directory ({customers.length})</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Profiles, phone contacts, purchase history & due balances</p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingCustomer(null);
            setName('');
            setPhone('');
            setEmail('');
            setAddress('');
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Customer
        </button>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((c) => (
          <div key={c.id} className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0 shadow-xs">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4
                      onClick={() => setProfileCustId(c.id)}
                      className="font-bold text-slate-900 dark:text-slate-100 text-sm hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                      title="View Customer Profile & Ledger"
                    >
                      {c.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3" /> {c.phone}
                    </p>
                  </div>
                </div>
                {c.total_due > 0 ? (
                  <span className="px-2.5 py-1 bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/50 font-bold text-xs rounded-xl">
                    Due: {formatCurrency(c.total_due)}
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50 font-bold text-xs rounded-xl">
                    Clear
                  </span>
                )}
              </div>

              {c.address && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" /> {c.address}
                </p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/40 dark:border-slate-700/40 flex items-center justify-between">
              <button
                onClick={() => setProfileCustId(c.id)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <History className="w-3.5 h-3.5" /> Profile & Ledger
              </button>

              <div className="flex items-center gap-2">
                {c.total_due > 0 && (
                  <button
                    onClick={() => setProfileCustId(c.id)}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg shadow-md shadow-rose-600/20 cursor-pointer"
                  >
                    Collect Due
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingCustomer(c);
                    setName(c.name);
                    setPhone(c.phone);
                    setEmail(c.email || '');
                    setAddress(c.address || '');
                    setShowAddModal(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 cursor-pointer"
                  title={isBn ? 'সম্পাদনা করুন' : 'Edit Customer'}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
                  className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                  title={isBn ? 'মুছে ফেলুন' : 'Delete Customer'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-6 rounded-3xl max-w-md w-full border border-white/80 dark:border-slate-700/60 shadow-2xl">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">{editingCustomer ? 'Edit Customer' : 'Add Customer'}</h3>
            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">ফোন নম্বর (বাংলাদেশী - ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(sanitizeBDPhoneInput(e.target.value))}
                  placeholder="01712345678 বা +8801712345678 (ঐচ্ছিক)"
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  placeholder="Street, City, Zip"
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl cursor-pointer shadow-md shadow-indigo-600/20">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Profile & Ledger Modal */}
      {profileCustId !== null && (
        <CustomerProfileModal
          customerId={profileCustId}
          onClose={() => setProfileCustId(null)}
          onCollectDueSuccess={fetchCustomers}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        title={isBn ? 'কাস্টমার মুছুন' : 'Delete Customer'}
        message={
          isBn
            ? `আপনি কি নিশ্চিত যে '${deleteTarget?.name}' কে কাস্টমার তালিকা থেকে মুছে ফেলতে চান?`
            : `Are you sure you want to delete customer '${deleteTarget?.name}'?`
        }
        confirmText={isBn ? 'হ্যাঁ, মুছুন' : 'Yes, Delete'}
        cancelText={isBn ? 'বাতিল' : 'Cancel'}
        isDanger={true}
        onConfirm={() => {
          if (deleteTarget) {
            handleDeleteCustomer(deleteTarget.id);
          }
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
