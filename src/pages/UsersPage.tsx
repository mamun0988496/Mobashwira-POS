import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { User } from '../types';
import { UserCheck, Plus, Shield, Mail, Key, Edit2, CheckCircle2, XCircle } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { getAuthHeader, showToast } = useShop();

  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);

  // Form State
  const [name, setName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<'admin' | 'staff' | 'cashier'>('cashier');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { headers: getAuthHeader() });
      if (res.ok) setUsers(await res.json());
    } catch {
      showToast('error', 'Error loading shop staff accounts');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !password) return;

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ name, username, password, role })
      });

      if (res.ok) {
        showToast('success', 'User account created successfully');
        setShowModal(false);
        setName('');
        setUsername('');
        setPassword('');
        fetchUsers();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to create user');
      }
    } catch {
      showToast('error', 'Network error creating user');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200/50">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">User & Staff Role Management</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configure admin and cashier access privileges</p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Staff Account
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/50 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400 font-semibold uppercase">
            <tr>
              <th className="p-3.5 pl-5">Staff Member</th>
              <th className="p-3.5">Username</th>
              <th className="p-3.5">System Role</th>
              <th className="p-3.5">Account Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/40 dark:divide-slate-700/40">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-white/60 dark:hover:bg-slate-700/30">
                <td className="p-3.5 pl-5 font-bold text-slate-900 dark:text-slate-100">{u.name}</td>
                <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">@{u.username}</td>
                <td className="p-3.5">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${
                    u.role === 'admin'
                      ? 'bg-purple-100/80 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/40'
                      : 'bg-blue-100/80 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/40'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-3.5">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-6 rounded-3xl max-w-md w-full border border-white/80 dark:border-slate-700/60 shadow-2xl">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Create Staff Account</h3>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Username *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. alex2026"
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl font-mono outline-none"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Login Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl font-mono outline-none"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Role Permission</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                >
                  <option value="cashier">Cashier (POS & Sales)</option>
                  <option value="staff">Shop Staff (Stock & Orders)</option>
                  <option value="admin">Administrator (Full Access)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl cursor-pointer shadow-md shadow-indigo-600/20">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
