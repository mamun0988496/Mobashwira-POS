import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { Supplier, Purchase, DuePayment } from '../types';
import { Truck, Plus, Phone, MapPin, Building, CreditCard, History, X, Edit2, Trash2 } from 'lucide-react';
import { validateBDPhone, sanitizeBDPhoneInput } from '../utils/phone';
import { ConfirmationModal } from '../components/common/ConfirmationModal';

export const SuppliersPage: React.FC = () => {
  const { formatCurrency, getAuthHeader, showToast } = useShop();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [address, setAddress] = useState<string>('');

  // Pay Due Modal
  const [selectedPaySupp, setSelectedPaySupp] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<string>('cash');
  const [payNote, setPayNote] = useState<string>('');

  // History Modal
  const [historySupp, setHistorySupp] = useState<Supplier | null>(null);
  const [suppPurchases, setSuppPurchases] = useState<Purchase[]>([]);
  const [suppPayments, setSuppPayments] = useState<DuePayment[]>([]);

  // Delete Target State
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/suppliers', { headers: getAuthHeader() });
      if (res.ok) setSuppliers(await res.json());
    } catch {
      showToast('error', 'Error loading suppliers');
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleDeleteSupplier = async (id: number) => {
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });

      if (res.ok) {
        showToast('success', 'Supplier deleted successfully!');
        fetchSuppliers();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to delete supplier');
      }
    } catch {
      showToast('error', 'Network error deleting supplier');
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    const phoneCheck = validateBDPhone(phone);
    if (!phoneCheck.isValid) {
      showToast('error', phoneCheck.message || 'শুধুমাত্র বাংলাদেশী ফোন নম্বর গ্রহণযোগ্য');
      return;
    }

    try {
      const url = editingSupplier ? `/api/suppliers/${editingSupplier.id}` : '/api/suppliers';
      const method = editingSupplier ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ name, phone, email, address, company_name: companyName })
      });

      if (res.ok) {
        showToast('success', editingSupplier ? 'Supplier updated' : 'Supplier created');
        setShowAddModal(false);
        fetchSuppliers();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to save supplier');
      }
    } catch {
      showToast('error', 'Network error');
    }
  };

  const handlePayDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaySupp || !payAmount || parseFloat(payAmount) <= 0) return;

    try {
      const res = await fetch('/api/dues/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          type: 'supplier',
          entity_id: selectedPaySupp.id,
          amount: parseFloat(payAmount),
          payment_method: payMethod,
          note: payNote
        })
      });

      if (res.ok) {
        showToast('success', 'Supplier payment recorded!');
        setSelectedPaySupp(null);
        setPayAmount('');
        setPayNote('');
        fetchSuppliers();
      } else {
        showToast('error', 'Failed to record supplier payment');
      }
    } catch {
      showToast('error', 'Error processing payment');
    }
  };

  const openHistoryModal = async (supp: Supplier) => {
    setHistorySupp(supp);
    try {
      const res = await fetch(`/api/suppliers/${supp.id}/history`, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setSuppPurchases(data.purchases || []);
        setSuppPayments(data.payments || []);
      }
    } catch {
      showToast('error', 'Failed to load supplier activity history');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200/50">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Supplier Directory ({suppliers.length})</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Wholesale vendors, company contacts & pending bill balances</p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingSupplier(null);
            setName('');
            setPhone('');
            setEmail('');
            setCompanyName('');
            setAddress('');
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map((s) => (
          <div key={s.id} className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{s.name}</h4>
                  {s.company_name && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                      <Building className="w-3 h-3" /> {s.company_name}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3" /> {s.phone}
                  </p>
                </div>
                {s.total_due > 0 ? (
                  <span className="px-2.5 py-1 bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/50 font-bold text-xs rounded-xl">
                    Owed: {formatCurrency(s.total_due)}
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50 font-bold text-xs rounded-xl">
                    Paid
                  </span>
                )}
              </div>

              {s.address && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" /> {s.address}
                </p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/40 dark:border-slate-700/40 flex items-center justify-between">
              <button
                onClick={() => openHistoryModal(s)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <History className="w-3.5 h-3.5" /> History
              </button>

              <div className="flex items-center gap-2">
                {s.total_due > 0 && (
                  <button
                    onClick={() => {
                      setSelectedPaySupp(s);
                      setPayAmount(s.total_due.toString());
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    Pay Supplier
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingSupplier(s);
                    setName(s.name);
                    setPhone(s.phone);
                    setEmail(s.email || '');
                    setCompanyName(s.company_name || '');
                    setAddress(s.address || '');
                    setShowAddModal(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 cursor-pointer"
                  title="Edit Supplier"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget({ id: s.id, name: s.name })}
                  className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                  title="Delete Supplier"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-6 rounded-3xl max-w-md w-full border border-white/80 dark:border-slate-700/60 shadow-2xl">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h3>
            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Contact Person Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Apex Wholesalers Agent"
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Company / Vendor Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Apex Digital Corp"
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">ফোন নম্বর (বাংলাদেশী) *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(sanitizeBDPhoneInput(e.target.value))}
                  placeholder="01712345678 বা +8801712345678"
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vendor@company.com"
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  placeholder="Industrial Park, City, State"
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

      {/* Pay Supplier Due Modal */}
      {selectedPaySupp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-6 rounded-3xl max-w-md w-full border border-white/80 dark:border-slate-700/60 shadow-2xl">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Pay Supplier Bill</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{selectedPaySupp.name} • Total Owed: {formatCurrency(selectedPaySupp.total_due)}</p>

            <form onSubmit={handlePayDue} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Payment Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedPaySupp.total_due}
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
                  <option value="bank_transfer">Bank Wire Transfer</option>
                  <option value="check">Company Check</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Note</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="e.g. Cleared purchase invoice #PUR-2026-99"
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setSelectedPaySupp(null)} className="px-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl cursor-pointer shadow-md shadow-emerald-600/20">Pay Bill</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier History Modal */}
      {historySupp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-6 rounded-3xl max-w-2xl w-full border border-white/80 dark:border-slate-700/60 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100/50 dark:border-slate-700/50">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{historySupp.name}'s Purchase Invoices</h3>
              <button onClick={() => setHistorySupp(null)} className="cursor-pointer"><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Purchase Orders</h4>
                <div className="space-y-2">
                  {suppPurchases.map((p) => (
                    <div key={p.id} className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-white/60 dark:border-slate-700/50 flex justify-between">
                      <div>
                        <p className="font-bold text-indigo-600 dark:text-indigo-400">{p.purchase_no}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{p.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(p.total_amount)}</p>
                        <p className="text-[10px] text-rose-600 dark:text-rose-400">Due: {formatCurrency(p.due_amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Supplier"
        message={`Are you sure you want to delete supplier '${deleteTarget?.name}'?`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={() => {
          if (deleteTarget) {
            handleDeleteSupplier(deleteTarget.id);
          }
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
