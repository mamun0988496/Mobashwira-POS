import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { Product, Category, Brand } from '../types';
import { Pagination } from '../components/common/Pagination';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import {
  Package,
  Plus,
  Search,
  Filter,
  Barcode,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const { formatCurrency, getAuthHeader, showToast } = useShop();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Search
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [stockStatus, setStockStatus] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Add / Edit Modal
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Delete Modal
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);

  // Product Form State
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category_id: '',
    brand_id: '',
    purchase_price: '',
    selling_price: '',
    wholesale_price: '',
    stock: '',
    min_stock_alert: '5',
    expire_date: '',
    image: ''
  });

  const fetchData = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (selectedCategory) queryParams.append('category_id', selectedCategory);
      if (selectedBrand) queryParams.append('brand_id', selectedBrand);
      if (stockStatus) queryParams.append('stock_status', stockStatus);

      const [pRes, cRes, bRes] = await Promise.all([
        fetch(`/api/products?${queryParams.toString()}`, { headers: getAuthHeader() }),
        fetch('/api/categories', { headers: getAuthHeader() }),
        fetch('/api/brands', { headers: getAuthHeader() })
      ]);

      if (pRes.ok) setProducts(await pRes.json());
      if (cRes.ok) setCategories(await cRes.json());
      if (bRes.ok) setBrands(await bRes.json());
    } catch {
      showToast('error', 'Error loading products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, selectedCategory, selectedBrand, stockStatus]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      barcode: '88' + Math.floor(1000000000 + Math.random() * 9000000000),
      category_id: categories[0]?.id.toString() || '',
      brand_id: brands[0]?.id.toString() || '',
      purchase_price: '',
      selling_price: '',
      wholesale_price: '',
      stock: '',
      min_stock_alert: '5',
      expire_date: '',
      image: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      barcode: product.barcode,
      category_id: product.category_id?.toString() || '',
      brand_id: product.brand_id?.toString() || '',
      purchase_price: product.purchase_price.toString(),
      selling_price: product.selling_price.toString(),
      wholesale_price: product.wholesale_price.toString(),
      stock: product.stock.toString(),
      min_stock_alert: product.min_stock_alert.toString(),
      expire_date: product.expire_date || '',
      image: product.image || ''
    });
    setShowModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.selling_price) {
      showToast('error', 'Name and selling price are required');
      return;
    }

    const payload = {
      ...formData,
      category_id: formData.category_id ? Number(formData.category_id) : null,
      brand_id: formData.brand_id ? Number(formData.brand_id) : null,
      purchase_price: parseFloat(formData.purchase_price) || 0,
      selling_price: parseFloat(formData.selling_price) || 0,
      wholesale_price: parseFloat(formData.wholesale_price) || 0,
      stock: parseInt(formData.stock) || 0,
      min_stock_alert: parseInt(formData.min_stock_alert) || 5
    };

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('success', editingProduct ? 'Product updated successfully' : 'Product created successfully');
        setShowModal(false);
        fetchData();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to save product');
      }
    } catch {
      showToast('error', 'Network error saving product');
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProductId) return;
    try {
      const res = await fetch(`/api/products/${deletingProductId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      if (res.ok) {
        showToast('success', 'Product deleted');
        fetchData();
      } else {
        showToast('error', 'Failed to delete product');
      }
    } catch {
      showToast('error', 'Error deleting product');
    }
  };

  const generateBarcode = () => {
    setFormData((prev) => ({
      ...prev,
      barcode: '88' + Math.floor(1000000000 + Math.random() * 9000000000)
    }));
  };

  // Pagination slice
  const paginatedProducts = products.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200/50">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Products Catalog ({products.length})</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage shop items, barcodes, prices & inventory alerts</p>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Product
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search name or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/80 dark:border-slate-700/60 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/80 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/80 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 outline-none"
        >
          <option value="">All Brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select
          value={stockStatus}
          onChange={(e) => setStockStatus(e.target.value)}
          className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/80 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 outline-none"
        >
          <option value="">All Stock Levels</option>
          <option value="low">Low Stock Alert</option>
          <option value="out">Out of Stock</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/30 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              <tr>
                <th className="p-3.5 pl-5">Product Info</th>
                <th className="p-3.5">Barcode</th>
                <th className="p-3.5">Category & Brand</th>
                <th className="p-3.5">Purchase Price</th>
                <th className="p-3.5">Selling Price</th>
                <th className="p-3.5">Current Stock</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/20 dark:divide-slate-700/30">
              {paginatedProducts.map((p) => {
                const isLowStock = p.stock <= p.min_stock_alert;
                const isOut = p.stock <= 0;
                return (
                  <tr key={p.id} className="hover:bg-white/40 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="p-3.5 pl-5 flex items-center gap-3">
                      <img src={p.image} alt={p.name} className="w-10 h-10 rounded-xl object-cover bg-slate-100 dark:bg-slate-900 shrink-0" />
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">{p.name}</h4>
                        {p.expire_date && <p className="text-[10px] text-amber-600">Exp: {p.expire_date}</p>}
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">{p.barcode}</td>
                    <td className="p-3.5">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{p.category_name || 'General'}</p>
                      <p className="text-[10px] text-slate-500">{p.brand_name || 'Generic'}</p>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-600 dark:text-slate-400">{formatCurrency(p.purchase_price)}</td>
                    <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.selling_price)}</td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        isOut
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : isLowStock
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {isLowStock && <AlertTriangle className="w-3 h-3" />}
                        {p.stock} units
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingProductId(p.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={products.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Product Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Samsung Wireless Buds"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Brand</label>
                  <select
                    value={formData.brand_id}
                    onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="">-- Select Brand --</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Purchase Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Selling Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="0"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Min Stock Alert</label>
                  <input
                    type="number"
                    value={formData.min_stock_alert}
                    onChange={(e) => setFormData({ ...formData, min_stock_alert: e.target.value })}
                    placeholder="5"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Expire Date</label>
                  <input
                    type="date"
                    value={formData.expire_date}
                    onChange={(e) => setFormData({ ...formData, expire_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Image URL</label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deletingProductId !== null}
        title="Delete Product"
        message="Are you sure you want to permanently delete this product? This action cannot be undone."
        isDanger={true}
        confirmText="Delete Product"
        onConfirm={handleDeleteProduct}
        onClose={() => setDeletingProductId(null)}
      />
    </div>
  );
};
