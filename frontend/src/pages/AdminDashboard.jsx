import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { productsAPI } from '../api/products.js';
import { Layers, Box, Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';

const CATEGORY_LABELS = {
  CPU: 'CPU',
  motherboard: 'Motherboard',
  GPU: 'GPU',
  RAM: 'RAM',
  storage: 'Storage',
  PSU: 'PSU',
  case: 'PC Case',
};

const EMPTY_FORM = {
  name: '',
  description: '',
  category: 'CPU',
  price: '',
  stock: '',
  lowStockThreshold: '5',
  active: true,
  specifications: {},
};

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [products, setProducts] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [specText, setSpecText] = useState('{}');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user?.role !== 'admin') {
      navigate('/');
      return;
    }
    const controller = new AbortController();
    loadProducts(controller.signal);
    return () => controller.abort();
  }, [isAuthenticated, user, navigate]);

  const loadProducts = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const [listData, lowStockData] = await Promise.all([
        productsAPI.list({ limit: 100, signal }),
        productsAPI.lowStock({ signal }),
      ]);
      if (signal?.aborted) return;
      setProducts(Array.isArray(listData.items) ? listData.items : []);
      setLowStockItems(Array.isArray(lowStockData.items) ? lowStockData.items : []);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err.message || 'Failed to load products');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const handleInputChange = (key) => (e) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSpecChange = (e) => {
    const text = e.target.value;
    setSpecText(text);
    try {
      const parsed = JSON.parse(text || '{}');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        setFormData((prev) => ({ ...prev, specifications: parsed }));
      }
    } catch (_err) {
      // Still typing — keep the last valid specifications until it parses.
    }
  };

  const resetForm = () => {
    setEditMode(false);
    setEditProduct(null);
    setFormData(EMPTY_FORM);
    setSpecText('{}');
  };

  const handleEdit = (product) => {
    setEditProduct(product);
    const specifications = product.specifications || {};
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category,
      price: product.price,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold ?? 5,
      active: product.active !== false,
      specifications,
    });
    setSpecText(JSON.stringify(specifications, null, 2));
    setEditMode(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    let specifications;
    try {
      specifications = JSON.parse(specText || '{}');
    } catch (_err) {
      setError('Specifications must be valid JSON');
      return;
    }
    if (!specifications || typeof specifications !== 'object' || Array.isArray(specifications)) {
      setError('Specifications must be a JSON object');
      return;
    }

    const price = Number(formData.price);
    const stock = Number(formData.stock);
    const lowStockThreshold = Number(formData.lowStockThreshold);
    if (!formData.name.trim()) {
      setError('Product name is required');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError('Price must be zero or greater');
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      setError('Stock must be a whole number of zero or greater');
      return;
    }
    if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
      setError('Low-stock threshold must be a whole number of zero or greater');
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description,
        category: formData.category,
        price,
        stock,
        lowStockThreshold,
        active: formData.active,
        specifications,
      };
      if (editMode && editProduct) {
        await productsAPI.update(editProduct._id, payload);
      } else {
        await productsAPI.create(payload);
      }
      resetForm();
      await loadProducts();
    } catch (err) {
      setError(err.message || 'Failed to save product');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this product?')) return;
    try {
      await productsAPI.deactivate(id);
      await loadProducts();
    } catch (err) {
      setError(err.message || 'Failed to deactivate product');
    }
  };

  const lowStockCount = lowStockItems.length;

  if (!isAuthenticated) return null;
  if (user?.role !== 'admin') {
    return (
      <div className="page container">
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <h3 className="empty-state-title">Admin Access Required</h3>
          <p className="empty-state-description">You do not have permission to access the admin dashboard.</p>
          <Link to="/" className="btn btn-primary">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="page container">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p className="text-text-muted">Loading admin dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page container">
      <div className="page-header mb-6">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Manage products and inventory</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="admin-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="admin-stat-label">Total Products</p>
              <p className="admin-stat-value">{products.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <Box size={20} />
            </div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="admin-stat-label">Low Stock Items</p>
              <p className="admin-stat-value text-warning">{lowStockCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-600">
              <Layers size={20} />
            </div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="admin-stat-label">Active Admin</p>
              <p className="admin-stat-value">{user?.name}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
              <Plus size={20} />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-error text-sm" role="alert">
          {error}
        </div>
      )}

      {lowStockItems.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-warning" />
            <h2 className="font-semibold text-warning">Low Stock</h2>
          </div>
          <ul className="space-y-2">
            {lowStockItems.map((item) => (
              <li key={item._id} className="flex justify-between gap-3 text-sm">
                <span className="text-text break-words">{item.name}</span>
                <span className="text-warning font-medium flex-shrink-0">
                  {item.stock} left (threshold {item.lowStockThreshold})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Product Management */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">Product Management</h2>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setEditMode(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={18} /> Add Product
          </button>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 text-xs font-semibold text-text-muted uppercase">Product</th>
                <th className="py-3 text-xs font-semibold text-text-muted uppercase">Category</th>
                <th className="py-3 text-xs font-semibold text-text-muted uppercase">Price</th>
                <th className="py-3 text-xs font-semibold text-text-muted uppercase">Stock</th>
                <th className="py-3 text-xs font-semibold text-text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id} className="border-b border-border/50">
                  <td className="py-4">
                    <div className="font-medium text-text">{product.name}</div>
                    <div className="text-xs text-text-muted">{product.description || 'No description'}</div>
                  </td>
                  <td className="py-4">
                    <span className="text-sm text-text-muted">{CATEGORY_LABELS[product.category] || product.category}</span>
                  </td>
                  <td className="py-4">
                    <span className="font-medium text-primary">₱{product.price.toLocaleString()}</span>
                  </td>
                  <td className="py-4">
                    <span
                      className={`text-xs font-medium ${product.stock <= 5 ? 'text-warning' : 'text-success'}`}
                    >
                      {product.stock}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(product)}
                        className="admin-icon-btn text-accent"
                        title="Edit"
                        aria-label={`Edit ${product.name}`}
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(product._id)}
                        className="admin-icon-btn text-error"
                        title="Deactivate"
                        aria-label={`Deactivate ${product.name}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 md:hidden">
          {products.map((product) => {
            const isLow = product.stock <= (product.lowStockThreshold ?? 5);
            return (
              <div key={product._id} className="bg-surface border border-border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-text break-words">{product.name}</p>
                    <p className="text-xs text-text-muted">
                      {CATEGORY_LABELS[product.category] || product.category}
                    </p>
                  </div>
                  <span className={`text-xs font-medium flex-shrink-0 ${isLow ? 'text-warning' : 'text-success'}`}>
                    {product.stock} in stock
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-primary">
                    ₱{Number(product.price || 0).toLocaleString()}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(product)}
                      className="admin-icon-btn text-accent"
                      aria-label={`Edit ${product.name}`}
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(product._id)}
                      className="admin-icon-btn text-error"
                      aria-label={`Deactivate ${product.name}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {products.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3 className="empty-state-title">No Products</h3>
            <p className="empty-state-description">No products found. Add your first product to get started.</p>
          </div>
        )}
      </div>

      {/* Edit/Add Product Form */}
      {editMode && (
        <div className="mt-8 p-6 bg-surface border border-border rounded-lg shadow-lg">
          <h3 className="text-lg font-bold text-primary mb-4">
            {editProduct ? 'Edit Product' : 'Add New Product'}
          </h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label className="form-label" htmlFor="admin-product-name">Product Name</label>
                <input
                  id="admin-product-name"
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  placeholder="e.g. AMD Ryzen 5 7600"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="admin-product-category">Category</label>
                <select
                  id="admin-product-category"
                  value={formData.category}
                  onChange={handleInputChange('category')}
                  className="form-select"
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="admin-product-description">Description</label>
                <textarea
                  id="admin-product-description"
                  className="form-input"
                  value={formData.description}
                  onChange={handleInputChange('description')}
                  rows={3}
                  placeholder="Describe this component…"
                />
              </div>
              <div className="form-group md:col-span-2">
                <label className="form-label" htmlFor="admin-product-specs">Specifications (JSON)</label>
                <textarea
                  id="admin-product-specs"
                  className="form-input font-mono text-sm"
                  value={specText}
                  onChange={handleSpecChange}
                  placeholder='{ "socket": "AM5", "powerWatts": 65 }'
                  spellCheck={false}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="admin-product-price">Price (PHP)</label>
                <input
                  id="admin-product-price"
                  type="number"
                  className="form-input"
                  value={formData.price}
                  onChange={handleInputChange('price')}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="admin-product-stock">Stock Quantity</label>
                <input
                  id="admin-product-stock"
                  type="number"
                  className="form-input"
                  value={formData.stock}
                  onChange={handleInputChange('stock')}
                  placeholder="0"
                  min="0"
                  step="1"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="admin-product-threshold">Low-Stock Threshold</label>
                <input
                  id="admin-product-threshold"
                  type="number"
                  className="form-input"
                  value={formData.lowStockThreshold}
                  onChange={handleInputChange('lowStockThreshold')}
                  placeholder="5"
                  min="0"
                  step="1"
                  required
                />
              </div>
              <div className="form-group md:col-span-2">
                <label className="flex items-center gap-3 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, active: e.target.checked }))
                    }
                    className="w-5 h-5"
                  />
                  Active in the store catalog
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="btn btn-primary"
              >
                {editProduct ? 'Update Product' : 'Create Product'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="btn btn-ghost"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
