import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useCart } from '../hooks/useCart.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import { CartItem } from '../components/CartItem.jsx';

export function Cart() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const {
    cart,
    items,
    itemCount,
    subtotal,
    loading,
    error,
    refresh,
    clearError,
    usingSnapshot,
    snapshotSavedAt,
  } = useCart();
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/cart' } } });
      return undefined;
    }
    const controller = new AbortController();
    refresh({ signal: controller.signal });
    return () => controller.abort();
  }, [isAuthenticated, refresh, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  if (loading && !cart) {
    return (
      <div className="page container">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p className="text-text-muted">Loading cart…</p>
        </div>
      </div>
    );
  }

  if (error && (!items || items.length === 0)) {
    return (
      <div className="page container">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3 className="empty-state-title">Cart unavailable</h3>
          <p className="empty-state-description">{error}</p>
          <button type="button" onClick={() => refresh()} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="page container">
        <div className="empty-state">
          <div className="empty-state-icon">🛒</div>
          <h3 className="empty-state-title">Your cart is empty</h3>
          <p className="empty-state-description">
            Looks like you haven&apos;t added any components to your cart yet.
          </p>
          <Link to="/products" className="btn btn-primary">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const cartItems = Array.isArray(items) ? items : (cart?.items || []);

  return (
    <div className="page container">
      <div className="page-header mb-6">
        <h1 className="page-title">Shopping Cart</h1>
        <p className="page-subtitle">{itemCount} item{itemCount !== 1 ? 's' : ''} in your cart</p>
      </div>

      {usingSnapshot && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-sm" role="status">
          <p className="font-medium text-warning mb-1">Showing your saved cart</p>
          <p className="text-text-muted">
            You are offline. This is the cart saved on this device
            {snapshotSavedAt ? ` on ${new Date(snapshotSavedAt).toLocaleString()}` : ''}. Changes
            will sync when you reconnect.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-lg text-error text-sm" role="alert">
          {error}
          <button type="button" onClick={clearError} className="ml-2 text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-6">
        {cartItems.map((item) => (
          <CartItem key={item.product?._id || item.id} item={item} />
        ))}
      </div>

      {/* Order Summary */}
      <div className="p-6 bg-surface border border-border rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-primary">Order Summary</h2>
          <span className="text-sm font-medium text-text-muted">
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Estimated subtotal</span>
            <span className="text-text font-medium">₱{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Shipping</span>
            <span className="text-text font-medium">Calculated by the store</span>
          </div>
          {cart?.couponCode && (
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Coupon {cart.couponCode}</span>
              <span className="text-success">Applied</span>
            </div>
          )}
          <div className="flex justify-between text-sm border-t border-border pt-3 font-semibold">
            <span className="text-text">Estimated total</span>
            <span className="text-xl text-primary">₱{subtotal.toLocaleString()}</span>
          </div>
          <p className="text-xs text-text-muted">
            The API does not return cart totals. The final total, including any coupon discount, is
            calculated by the server when you place the order.
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate('/checkout')}
            disabled={!isOnline}
            className="btn btn-primary btn-lg w-full"
          >
            Proceed to Checkout
          </button>
          {!isOnline && (
            <p className="text-xs text-warning text-center">
              You&apos;re offline — checkout unavailable
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link to="/products" className="text-text-muted hover:text-accent">
          ← Continue Shopping
        </Link>
      </div>
    </div>
  );
}

export default Cart;
