import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useCart } from '../hooks/useCart.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
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

export function ProductCard({ product, onAdd }) {
  const [adding, setAdding] = useState(false);
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { isOnline } = useOnlineStatus();
  const navigate = useNavigate();
  const location = useLocation();

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOnline || adding) return;

    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }

    setAdding(true);
    try {
      await addItem({ productId: product._id, quantity: 1 });
      if (onAdd) onAdd(product);
    } catch (err) {
      if (err?.status === 401) {
        navigate('/login', { state: { from: location } });
      }
    } finally {
      setAdding(false);
    }
  };

  const stock = Number(product.stock) || 0;
  const isOutOfStock = stock <= 0;
  const lowStockThreshold = Number.isFinite(Number(product.lowStockThreshold))
    ? Number(product.lowStockThreshold)
    : 5;
  const isLowStock = stock > 0 && stock <= lowStockThreshold;
  const imageUrl = productPlaceholder(product.name, product.category);

  let buttonLabel = 'Add to Cart';
  if (adding) buttonLabel = 'Adding…';
  else if (isOutOfStock) buttonLabel = 'Out of Stock';
  else if (!isAuthenticated) buttonLabel = 'Sign in to Add';

  return (
    <article className="product-card">
      <div className="product-card-image">
        <img
          src={imageUrl}
          alt={`${CATEGORY_LABELS[product.category] || product.category} — ${product.name}`}
          loading="lazy"
        />
        {isOutOfStock && (
          <span className="absolute top-2 right-2 px-2 py-1 bg-error text-white text-xs font-bold rounded-md">
            Out of Stock
          </span>
        )}
        {isLowStock && (
          <span className="product-card-badge">Low Stock</span>
        )}
      </div>
      <div className="product-card-content">
        <Link to={`/products/${product._id}`} className="product-card-category">
          {CATEGORY_LABELS[product.category] || product.category}
        </Link>
        <Link to={`/products/${product._id}`} className="product-card-name">
          {product.name}
        </Link>
        <div className="product-card-price">
          ₱{Number(product.price || 0).toLocaleString()}
        </div>
        <div className={`product-card-stock ${isOutOfStock ? 'out-of-stock' : ''}`}>
          {isOutOfStock ? 'Out of Stock' : `In Stock (${stock})`}
        </div>
        <div className="product-card-footer">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!isOnline || isOutOfStock || adding}
            className={`btn btn-primary btn-full ${adding ? 'opacity-70' : ''}`}
            aria-label={`${buttonLabel}: ${product.name}`}
          >
            {buttonLabel}
            {!adding && !isOutOfStock && <Plus size={16} className="ml-2" />}
          </button>
          {!isOnline && (
            <p className="text-xs text-warning mt-2 text-center">
              You&apos;re offline — add to cart later
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
