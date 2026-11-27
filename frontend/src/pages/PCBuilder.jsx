import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Box,
  CheckCircle,
  CircuitBoard,
  Cpu,
  HardDrive,
  MemoryStick,
  PcCase,
  Save,
  ShoppingCart,
  Zap,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useCart } from '../hooks/useCart.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import { buildsAPI } from '../api/builds.js';
import { compatibilityAPI } from '../api/compatibility.js';
import { productsAPI } from '../api/products.js';

const COMPONENT_CATEGORIES = [
  { key: 'CPU', label: 'CPU', icon: Cpu },
  { key: 'motherboard', label: 'Motherboard', icon: CircuitBoard },
  { key: 'RAM', label: 'RAM', icon: MemoryStick },
  { key: 'GPU', label: 'GPU', icon: Box },
  { key: 'storage', label: 'Storage', icon: HardDrive },
  { key: 'PSU', label: 'PSU', icon: Zap },
  { key: 'case', label: 'PC Case', icon: PcCase },
];

export function PCBuilder() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { refresh: refreshCart } = useCart();
  const { isOnline } = useOnlineStatus();

  const [components, setComponents] = useState({});
  const [selectedProducts, setSelectedProducts] = useState({});
  const [compatibility, setCompatibility] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [savedBuilds, setSavedBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingBuildId, setAddingBuildId] = useState(null);
  const [buildName, setBuildName] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/pc-builder' } } });
      return undefined;
    }
    const controller = new AbortController();
    loadProducts(controller.signal);
    loadSavedBuilds(controller.signal);
    return () => controller.abort();
  }, [isAuthenticated, navigate]);

  const loadProducts = async (signal) => {
    try {
      const data = await productsAPI.list({ limit: 100, signal });
      if (signal?.aborted) return;
      setAllProducts(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err.message || 'Failed to load components');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const loadSavedBuilds = async (signal) => {
    try {
      const data = await buildsAPI.list({ signal });
      if (signal?.aborted) return;
      setSavedBuilds(Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err.message || 'Failed to load saved builds');
    }
  };

  const getProductsByCategory = (category) =>
    allProducts.filter((product) => product.category === category);

  const handleSelect = (category, product) => {
    setComponents((prev) => ({ ...prev, [category]: product._id }));
    setSelectedProducts((prev) => ({ ...prev, [category]: product }));
    setCompatibility(null);
    setError(null);
    setNotice(null);
  };

  const handleClear = (category) => {
    setComponents((prev) => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
    setSelectedProducts((prev) => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
    setCompatibility(null);
  };

  const handleValidate = async () => {
    if (!isOnline) return;
    if (Object.keys(components).length === 0) {
      setError('Select at least one component before validating.');
      return;
    }
    setValidating(true);
    setError(null);
    try {
      const result = await compatibilityAPI.check(components);
      setCompatibility(result);
    } catch (err) {
      setError(err.message || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const handleSaveBuild = async () => {
    if (!buildName.trim()) {
      setError('Enter a name for this build.');
      return;
    }
    if (Object.keys(components).length === 0) {
      setError('Select at least one component before saving.');
      return;
    }
    if (!isOnline) return;

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await buildsAPI.create({ name: buildName.trim(), components });
      setBuildName('');
      setNotice('Build saved. You can add it to your cart below.');
      await loadSavedBuilds();
    } catch (err) {
      setError(err.message || 'Failed to save build');
    } finally {
      setSaving(false);
    }
  };

  const handleAddToCart = async (buildId) => {
    if (!isOnline || addingBuildId) return;
    setAddingBuildId(buildId);
    setError(null);
    setNotice(null);
    try {
      await buildsAPI.addToCart(buildId);
      await refreshCart();
      navigate('/cart');
    } catch (err) {
      setError(err.message || 'Failed to add build to cart');
    } finally {
      setAddingBuildId(null);
    }
  };

  const estimatedPrice = Object.values(selectedProducts).reduce(
    (sum, product) => sum + (Number(product?.price) || 0),
    0
  );
  const hasSelection = Object.keys(components).length > 0;

  if (!isAuthenticated) return null;
  if (loading) {
    return (
      <div className="page container">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p className="text-text-muted">Loading components…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page container">
      <div className="page-header mb-6">
        <h1 className="page-title">PC Builder</h1>
        <p className="page-subtitle">
          Pick one component per slot, validate compatibility, then save your build.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-error text-sm" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-lg text-success text-sm" role="status">
          {notice}
        </div>
      )}

      {!isOnline && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-warning text-sm" role="status">
          You are offline. Browsing works, but validating and saving a build need a connection.
        </div>
      )}

      <div className="space-y-6">
        {COMPONENT_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const products = getProductsByCategory(category.key);
          const selectedId = components[category.key];

          return (
            <div key={category.key} className="bg-surface border border-border rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-accent/10 flex items-center justify-center text-accent">
                    <Icon size={16} />
                  </div>
                  <h3 className="font-semibold text-text">{category.label}</h3>
                </div>
                {selectedId && (
                  <button
                    type="button"
                    onClick={() => handleClear(category.key)}
                    className="text-xs font-medium text-text-muted underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {products.length > 0 ? (
                  products.map((product) => {
                    const isSelected = product._id === selectedId;
                    const outOfStock = (Number(product.stock) || 0) <= 0;
                    return (
                      <button
                        key={product._id}
                        type="button"
                        onClick={() => handleSelect(category.key, product)}
                        disabled={outOfStock}
                        className={`flex flex-col gap-2 p-3 rounded border text-left transition-all ${
                          isSelected
                            ? 'bg-blue-50 border-blue-200 shadow-sm'
                            : 'border-border hover:border-accent hover:bg-blue-50/50'
                        } ${outOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="font-medium text-text">{product.name}</div>
                        <div className="text-sm font-bold text-primary">
                          ₱{Number(product.price || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-text-muted">
                          {outOfStock ? 'Out of stock' : `In stock (${product.stock})`}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="sm:col-span-2 text-center py-4 text-text-muted text-sm">
                    No {category.label} components available
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Build Summary */}
        <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6 gap-3">
            <h2 className="text-lg font-bold text-primary">Build Summary</h2>
            <span className={`text-xs font-medium ${estimatedPrice > 0 ? 'text-success' : 'text-text-muted'}`}>
              Estimated: ₱{estimatedPrice.toLocaleString()}
            </span>
          </div>

          <div className="space-y-3 mb-6">
            {COMPONENT_CATEGORIES.map((category) => {
              const product = selectedProducts[category.key];
              return (
                <div
                  key={category.key}
                  className="flex flex-wrap justify-between items-center gap-2 p-3 bg-background rounded border border-border/50"
                >
                  <span className="text-sm text-text-muted">{category.label}</span>
                  {product ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-text truncate">{product.name}</span>
                      <span className="text-sm font-bold text-primary">
                        ₱{Number(product.price || 0).toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-text-muted">Not selected</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <label className="sr-only" htmlFor="buildName">Build name</label>
            <input
              id="buildName"
              type="text"
              value={buildName}
              onChange={(e) => setBuildName(e.target.value)}
              placeholder="Build name (required to save)"
              className="flex-1 form-input"
              maxLength={80}
            />
            <button
              type="button"
              onClick={handleSaveBuild}
              disabled={saving || !hasSelection || !buildName.trim() || !isOnline}
              className={`btn btn-primary px-6 ${saving ? 'opacity-70' : ''}`}
            >
              {saving ? 'Saving…' : <span className="inline-flex items-center gap-2"><Save size={18} /> Save Build</span>}
            </button>
          </div>

          {compatibility && (
            <div className="mt-6">
              {compatibility.compatible ? (
                <div className="bg-green-50 border border-green-100 p-4 rounded">
                  <div className="flex items-start gap-2">
                    <CheckCircle size={20} className="text-success mt-0.5" />
                    <div>
                      <h4 className="font-medium text-success">Build Compatible</h4>
                      <p className="text-sm text-text-muted">
                        The store checked the recorded specifications and found no conflicts.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-100 p-4 rounded">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={20} className="text-warning mt-0.5" />
                    <div>
                      <h4 className="font-medium text-warning">Compatibility Warnings</h4>
                      <ul className="text-sm text-text-muted mt-1 space-y-1">
                        {(compatibility.warnings || []).map((warning) => (
                          <li key={warning.code}>{warning.message}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-6">
          <button
            type="button"
            onClick={handleValidate}
            disabled={validating || !isOnline || !hasSelection}
            className={`btn btn-outline flex-1 ${validating ? 'opacity-70' : ''}`}
          >
            {validating ? 'Validating…' : 'Validate Build'}
          </button>
        </div>

        {/* Saved Builds */}
        <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-bold text-primary mb-4">Saved Builds</h2>
          {savedBuilds.length > 0 ? (
            <div className="space-y-3">
              {savedBuilds.map((build) => (
                <div
                  key={build._id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3 bg-background rounded border border-border/50"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-text break-words">{build.name}</div>
                    <div className="text-xs text-text-muted">
                      {Object.keys(build.components || {}).length} components
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddToCart(build._id)}
                    disabled={!isOnline || addingBuildId === build._id}
                    className="btn btn-outline"
                  >
                    <ShoppingCart size={16} />
                    {addingBuildId === build._id ? 'Adding…' : 'Add to Cart'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">
              No saved builds yet. Select components above and save one.
            </p>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-text-muted">
        Looking for a starting point?{' '}
        <Link to="/ai-assistant" className="text-accent hover:underline font-medium">
          Ask the AI Advisor
        </Link>
      </p>
    </div>
  );
}

export default PCBuilder;
