import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { useCart } from '../hooks/useCart.js';
import { useAuth } from '../hooks/useAuth.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import { productsAPI } from '../api/products.js';
import { ProductCard } from '../components/ProductCard.jsx';
import { productPlaceholder } from '../utils/placeholder.js';

const CATEGORY_LABELS = {
  CPU: 'CPU',
  motherboard: 'Motherboard',
  GPU: 'GPU',
  RAM: 'RAM',
  storage: 'Storage',
  PSU: 'PSU',
  case: 'PC Case',
};

function formatSpecValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { isOnline } = useOnlineStatus();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [related, setRelated] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadProduct = async () => {
      setLoading(true);
      setLoadError(null);
      setActionError(null);
      setAdded(false);
      setQuantity(1);
      try {
        const data = await productsAPI.get(id, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setProduct(data.product || data.data || data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setLoadError(err.message || 'Failed to load product');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadProduct();
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!product?.category || !product?._id) {
      setRelated([]);
      return undefined;
    }

    const controller = new AbortController();
    const loadRelated = async () => {
      setRelatedLoading(true);
      setRelatedError(null);
      try {
        const data = await productsAPI.list({
          category: product.category,
          limit: 5,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const items = Array.isArray(data.items) ? data.items : [];
        setRelated(items.filter((item) => item._id !== product._id).slice(0, 4));
      } catch (err) {
        if (controller.signal.aborted) return;
        setRelated([]);
        setRelatedError(err.message || 'Related products are unavailable.');
      } finally {
        if (!controller.signal.aborted) setRelatedLoading(false);
      }
    };

    loadRelated();
    return () => controller.abort();
  }, [product?._id, product?.category]);

  const handleAddToCart = async () => {
    if (!isOnline || adding || !product) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    setAdding(true);
    setActionError(null);
    try {
      await addItem({ productId: product._id, quantity });
      setAdded(true);
      window.setTimeout(() => setAdded(false), 2500);
    } catch (err) {
      if (err?.status === 401) {
        navigate('/login', { state: { from: location } });
        return;
      }
      setActionError(err.message || 'Failed to add item to cart');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="page container">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p className="text-text-muted">Loading product details…</p>
        </div>
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div className="page container">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3 className="empty-state-title">Product Not Found</h3>
          <p className="empty-state-description">
            {loadError || 'The product you are looking for does not exist.'}
          </p>
          <Link to="/products" className="btn btn-primary">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  const stock = Number(product.stock) || 0;
  const isOutOfStock = stock <= 0;
  const imageUrl = productPlaceholder(product.name, product.category);
  const addLabel = adding
    ? 'Adding…'
    : added
      ? 'Added to Cart'
      : !isAuthenticated
        ? 'Sign in to Add to Cart'
        : 'Add to Cart';

  return (
    <div className="page page-detail container">
      <nav className="mb-4">
        <Link to="/products" className="text-sm text-accent hover:underline flex items-center gap-1">
          ← Back to Products
        </Link>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Product artwork */}
        <div className="lg:col-span-5 space-y-4">
          <div className="aspect-square bg-surface border border-border rounded-lg overflow-hidden relative">
            <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-bold text-lg">Out of Stock</span>
              </div>
            )}
          </div>
          <p className="text-xs text-text-muted">
            This catalog does not store product photographs, so each item uses a
            category-specific illustration.
          </p>
        </div>

        {/* Product Info */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <span className="text-xs font-semibold text-accent uppercase tracking-wider mb-2 block">
              {CATEGORY_LABELS[product.category] || product.category}
            </span>
            <h1 className="text-2xl font-bold text-primary mb-2">{product.name}</h1>
            <p className="text-text-muted">{product.description || 'No description available.'}</p>
          </div>

          <div className="p-4 bg-surface border border-border rounded-lg">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Price & Stock</h3>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold text-primary">
                ₱{Number(product.price || 0).toLocaleString()}
              </span>
              <span className="text-lg text-text-muted">PHP</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${isOutOfStock ? 'text-error' : 'text-success'}`}>
                {isOutOfStock ? 'Out of Stock' : `In Stock — ${stock} available`}
              </span>
            </div>
          </div>

          {/* Specifications */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="p-4 bg-surface border border-border rounded-lg">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Specifications</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="bg-background p-2 rounded border border-border/50">
                    <span className="text-text-muted text-xs block mb-1">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-text break-words">{formatSpecValue(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add to Cart Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-text" id="quantity-label">Quantity</span>
              <div className="quantity-control ml-auto" role="group" aria-labelledby="quantity-label">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || isOutOfStock}
                  className="quantity-btn"
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <span className="quantity-value" aria-live="polite">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  disabled={isOutOfStock || quantity >= stock}
                  className="quantity-btn"
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!isOnline || isOutOfStock || adding}
              className={`btn btn-primary btn-lg w-full ${adding ? 'opacity-70' : ''}`}
            >
              {addLabel}
              {!adding && !added && !isOutOfStock && <ShoppingCart size={20} className="ml-2" />}
            </button>

            {added && (
              <p className="text-sm text-success text-center">
                Added to your cart.{' '}
                <Link to="/cart" className="underline font-medium">
                  View cart
                </Link>
              </p>
            )}
            {actionError && (
              <p className="text-sm text-error text-center" role="alert">{actionError}</p>
            )}
            {!isOnline && (
              <p className="text-sm text-warning text-center">
                You&apos;re offline — cannot add to cart
              </p>
            )}
            {!isAuthenticated && isOnline && (
              <p className="text-sm text-text-muted text-center">
                Sign in to add this item to your cart.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Related products */}
      {(relatedLoading || related.length > 0 || relatedError) && (
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-primary">More in {CATEGORY_LABELS[product.category] || product.category}</h2>
            <Link
              to={`/products?category=${product.category}`}
              className="text-sm font-medium text-accent hover:underline"
            >
              View All →
            </Link>
          </div>
          {relatedLoading && <p className="text-sm text-text-muted">Loading related products…</p>}
          {!relatedLoading && relatedError && (
            <p className="text-sm text-text-muted">{relatedError}</p>
          )}
          {!relatedLoading && related.length > 0 && (
            <div className="product-grid">
              {related.map((item) => (
                <ProductCard key={item._id} product={item} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Sticky Add to Cart (mobile) */}
      <div className="sticky-add-to-cart lg:hidden">
        <div className="sticky-add-to-cart-price">
          ₱{Number(product.price || 0).toLocaleString()}
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!isOnline || isOutOfStock || adding}
          className={`btn btn-primary ${adding ? 'opacity-70' : ''}`}
        >
          {adding ? 'Adding…' : isOutOfStock ? 'Out of Stock' : !isAuthenticated ? 'Sign in to Add' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}

export default ProductDetails;
