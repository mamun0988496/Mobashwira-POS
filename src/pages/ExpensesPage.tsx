import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { Expense, ExpenseCategory } from '../types';
import { Receipt, Plus, Trash2, Calendar, FolderTree, X } from 'lucide-react';

export const ExpensesPage: React.FC = () => {
  const { formatCurrency, getAuthHeader, showToast } = useShop();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [showExpenseModal, setShowExpenseModal] = useState<boolean>(false);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);

  // New Expense Form
  const [title, setTitle] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>('');

  // New Category Form
  const [catName, setCatName] = useState<string>('');
  const [catDesc, setCatDesc] = useState<string>('');

  const fetchData = async () => {
    try {
      const res = await fetch('/api/expenses', { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        setCategories(data.categories || []);
      }
    } catch {
      showToast('error', 'Error loading expenses');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return;

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          title,
          category_id: categoryId ? Number(categoryId) : null,
          amount: parseFloat(amount),
          date,
          note
        })
      });

      if (res.ok) {
        showToast('success', 'Expense logged successfully');
        setShowExpenseModal(false);
        setTitle('');
        setAmount('');
        setNote('');
        fetchData();
      }
    } catch {
      showToast('error', 'Error creating expense');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;

    try {
      const res = await fetch('/api/expenses/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ name: catName, description: catDesc })
      });

      if (res.ok) {
        showToast('success', 'Expense Category added');
        setShowCategoryModal(false);
        setCatName('');
        setCatDesc('');
        fetchData();
      }
    } catch {
      showToast('error', 'Error adding category');
    }
  };

  const handleDeleteExpense = async (id: number) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE', headers: getAuthHeader() });
      if (res.ok) {
        showToast('success', 'Expense deleted');
        fetchData();
      }
    } catch {
      showToast('error', 'Error deleting expense');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTotal = expenses.filter((e) => e.date === todayStr).reduce((acc, e) => acc + e.amount, 0);
  const totalAllTime = expenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200/50">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Shop Expense Tracker</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Log utility bills, shop rent, staff wages & daily petty cash</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
          >
            <FolderTree className="w-4 h-4" /> Add Category
          </button>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Log Expense
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Today's Total Expenses</span>
          <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{formatCurrency(todayTotal)}</h3>
        </div>
        <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total All-Time Operating Expense</span>
          <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{formatCurrency(totalAllTime)}</h3>
        </div>
      </div>

      {/* Expense List Table */}
      <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/50 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400 font-semibold uppercase">
            <tr>
              <th className="p-3.5 pl-5">Expense Title</th>
              <th className="p-3.5">Category</th>
              <th className="p-3.5">Date</th>
              <th className="p-3.5 text-right">Amount</th>
              <th className="p-3.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/40 dark:divide-slate-700/40">
            {expenses.map((e) => (
              <tr key={e.id} className="hover:bg-white/60 dark:hover:bg-slate-700/30">
                <td className="p-3.5 pl-5">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">{e.title}</h4>
                  {e.note && <p className="text-[10px] text-slate-400">{e.note}</p>}
                </td>
                <td className="p-3.5 text-slate-600 dark:text-slate-400 font-medium">{e.category_name || 'General'}</td>
                <td className="p-3.5 text-slate-500 dark:text-slate-400">{e.date}</td>
                <td className="p-3.5 text-right font-bold text-rose-600 dark:text-rose-400">{formatCurrency(e.amount)}</td>
                <td className="p-3.5 text-center">
                  <button onClick={() => handleDeleteExpense(e.id)} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Log Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-6 rounded-3xl max-w-md w-full border border-white/80 dark:border-slate-700/60 shadow-2xl">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Log Shop Expense</h3>
            <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Electricity Bill"
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Expense Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                >
                  <option value="">-- General Expense --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl font-bold font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Note</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Additional receipt details"
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl cursor-pointer shadow-md shadow-indigo-600/20">Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-6 rounded-3xl max-w-md w-full border border-white/80 dark:border-slate-700/60 shadow-2xl">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Add Expense Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Category Name *</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Rent & Utilities"
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Description</label>
                <input
                  type="text"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Details..."
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="px-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl cursor-pointer shadow-md shadow-indigo-600/20">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
