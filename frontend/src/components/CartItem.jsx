import { useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../hooks/useCart.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import { productPlaceholder } from '../utils/placeholder.js';

export function CartItem({ item }) {
  const [updating, setUpdating] = useState(false);
  const { updateItem, removeItem } = useCart();
  const { isOnline } = useOnlineStatus();

  const product = item.product;
  const quantity = item.quantity || 1;
  const price = product?.price || 0;
  const imageUrl = productPlaceholder(product?.name || 'Item');

  const handleIncrease = async () => {
    if (!isOnline || updating) return;
    setUpdating(true);
    try {
      await updateItem(product._id, quantity + 1);
    } catch (_err) {
      // Handled by context
    } finally {
      setUpdating(false);
    }
  };

  const handleDecrease = async () => {
    if (!isOnline || updating || quantity <= 1) return;
    setUpdating(true);
    try {
      await updateItem(product._id, quantity - 1);
    } catch (_err) {
      // Handled by context
    } finally {
      setUpdating(false);
    }
  };

  const handleRemove = async () => {
    if (!isOnline || updating) return;
    setUpdating(true);
    try {
      await removeItem(product._id);
    } catch (_err) {
      // Handled by context
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="cart-item">
      <div className="cart-item-image">
        <img src={imageUrl} alt={product?.name || 'Product'} loading="lazy" />
      </div>
      <div className="cart-item-details">
        <div className="cart-item-name">{product?.name || 'Unknown Product'}</div>
        <div className="cart-item-price">
          ₱{price.toLocaleString()}
        </div>
        <div className="cart-item-controls">
          <div className="quantity-control">
            <button
              onClick={handleDecrease}
              disabled={quantity <= 1 || updating || !isOnline}
              className="quantity-btn"
              aria-label={`Decrease quantity of ${product?.name || 'item'}`}
            >
              <Minus size={16} />
            </button>
            <span className="quantity-value" aria-live="polite">{quantity}</span>
            <button
              onClick={handleIncrease}
              disabled={updating || !isOnline}
              className="quantity-btn"
              aria-label={`Increase quantity of ${product?.name || 'item'}`}
            >
              <Plus size={16} />
            </button>
          </div>
          <button
            onClick={handleRemove}
            disabled={updating || !isOnline}
            className="remove-btn"
            aria-label={`Remove ${product?.name || 'item'} from cart`}
          >
            <Trash2 size={16} /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}