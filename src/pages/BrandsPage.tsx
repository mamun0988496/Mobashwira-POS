import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { Brand } from '../types';
import { Tag, Plus, Edit2, Trash2, X } from 'lucide-react';
import { ConfirmationModal } from '../components/common/ConfirmationModal';

export const BrandsPage: React.FC = () => {
  const { getAuthHeader, showToast } = useShop();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchBrands = async () => {
    try {
      const res = await fetch('/api/brands', { headers: getAuthHeader() });
      if (res.ok) setBrands(await res.json());
    } catch {
      showToast('error', 'Failed to load brands');
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleOpenAdd = () => {
    setEditingBrand(null);
    setName('');
    setDescription('');
    setShowModal(true);
  };

  const handleOpenEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setName(brand.name);
    setDescription(brand.description || '');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const url = editingBrand ? `/api/brands/${editingBrand.id}` : '/api/brands';
      const method = editingBrand ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ name, description })
      });

      if (res.ok) {
        showToast('success', editingBrand ? 'Brand updated' : 'Brand created');
        setShowModal(false);
        fetchBrands();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to save brand');
      }
    } catch {
      showToast('error', 'Network error');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/brands/${deletingId}`, { method: 'DELETE', headers: getAuthHeader() });
      if (res.ok) {
        showToast('success', 'Brand deleted');
        fetchBrands();
      }
    } catch {
      showToast('error', 'Error deleting brand');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200/50">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Brands ({brands.length})</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manufacturers and brand label partners</p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Brand
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {brands.map((b) => (
          <div key={b.id} className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{b.name}</h4>
                <span className="px-2 py-0.5 bg-purple-50/80 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/50 text-[10px] font-bold rounded-md">
                  {b.product_count || 0} Products
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{b.description || 'No description'}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-white/40 dark:border-slate-700/40 flex justify-end gap-2">
              <button onClick={() => handleOpenEdit(b)} className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg cursor-pointer">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => setDeletingId(b.id)} className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg cursor-pointer">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-6 rounded-3xl max-w-md w-full border border-white/80 dark:border-slate-700/60 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100/50 dark:border-slate-700/50">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">{editingBrand ? 'Edit Brand' : 'Add Brand'}</h3>
              <button onClick={() => setShowModal(false)} className="cursor-pointer"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Brand Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Samsung"
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Brand details..."
                  className="w-full p-2.5 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-700/60 rounded-xl outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl cursor-pointer shadow-md shadow-indigo-600/20">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deletingId !== null}
        title="Delete Brand"
        message="Are you sure you want to delete this brand?"
        isDanger={true}
        onConfirm={handleDelete}
        onClose={() => setDeletingId(null)}
      />
    </div>
  );
};
