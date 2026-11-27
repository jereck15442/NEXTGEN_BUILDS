import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { ordersAPI } from '../api/orders.js';
import { productPlaceholder } from '../utils/placeholder.js';

const PAYMENT_LABELS = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const FULFILLMENT_LABELS = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [notice, setNotice] = useState(null);

  const justCreated = searchParams.get('created') === '1';
  const paymentMessage = location.state?.paymentMessage;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return undefined;
    }

    const controller = new AbortController();
    const loadOrder = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await ordersAPI.get(id, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setOrder(data.order || data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setLoadError(err.message || 'Failed to load order details');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadOrder();
    return () => controller.abort();
  }, [isAuthenticated, id, location, navigate]);

  const handleCancel = async () => {
    if (cancelling) return;
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    setActionError(null);
    try {
      const data = await ordersAPI.cancel(id);
      setOrder(data.order || data);
      setNotice('Your order has been cancelled.');
    } catch (err) {
      setActionError(err.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="page container">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p className="text-text-muted">Loading order details…</p>
        </div>
      </div>
    );
  }

  if (loadError || !order) {
    return (
      <div className="page container">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3 className="empty-state-title">Order Not Found</h3>
          <p className="empty-state-description">
            {loadError || 'The order you are looking for does not exist.'}
          </p>
          <Link to="/orders" className="btn btn-primary">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const paymentStatus = order.paymentStatus || 'pending';
  const fulfillmentStatus = order.fulfillmentStatus || 'pending';
  const canCancel = paymentStatus === 'pending' && fulfillmentStatus !== 'cancelled';
  const orderItems = Array.isArray(order.items) ? order.items : [];
  const paymentColor =
    paymentStatus === 'paid'
      ? 'text-success'
      : paymentStatus === 'failed' || paymentStatus === 'expired'
        ? 'text-error'
        : paymentStatus === 'cancelled'
          ? 'text-text-muted'
          : 'text-warning';

  return (
    <div className="page container">
      <nav className="mb-4">
        <Link to="/orders" className="text-sm text-accent hover:underline flex items-center gap-1">
          ← Back to Orders
        </Link>
      </nav>

      {justCreated && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-sm" role="status">
          <p className="font-medium text-warning mb-1">Order created — payment pending</p>
          <p className="text-text-muted">
            {paymentMessage ||
              'The payment provider is running in sandbox mode, so no hosted checkout was created. The order stays pending until a payment confirmation arrives.'}
          </p>
        </div>
      )}

      {notice && (
        <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-lg text-sm text-success" role="status">
          {notice}
        </div>
      )}

      {actionError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-error" role="alert">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Order Info */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 bg-surface border border-border rounded-lg shadow-sm">
            <h2 className="text-lg font-bold text-primary mb-4">Order Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Order Number</span>
                <span className="font-medium text-text break-all text-right">#{order._id}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Order Date</span>
                <span className="font-medium text-text">
                  {new Date(order.createdAt || Date.now()).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Payment Status</span>
                <span className={`font-medium ${paymentColor}`}>
                  {PAYMENT_LABELS[paymentStatus] || paymentStatus}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Fulfillment Status</span>
                <span className="font-medium text-text">
                  {FULFILLMENT_LABELS[fulfillmentStatus] || fulfillmentStatus}
                </span>
              </div>
              <div className="flex justify-between gap-4 pt-3 border-t border-border">
                <span className="text-text-muted">Payment Provider</span>
                <span className="font-medium text-text">
                  {order.paymentProvider || 'sandbox'}
                </span>
              </div>
              {order.paymentReference && (
                <div className="flex justify-between gap-4">
                  <span className="text-text-muted">Reference</span>
                  <span className="font-medium text-text-muted text-xs truncate max-w-xs">
                    {order.paymentReference}
                  </span>
                </div>
              )}
            </div>
          </div>

          {paymentStatus === 'pending' && (
            <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
              <h3 className="text-sm font-semibold text-warning mb-2">Payment Pending</h3>
              <p className="text-sm text-text-muted">
                The store has not received a payment confirmation for this order. In sandbox mode
                no real charge is made, and the status only changes when the payment provider
                confirms it.
              </p>
            </div>
          )}

          {canCancel && (
            <div className="p-4 bg-surface border border-border rounded-lg">
              <h3 className="text-sm font-semibold text-text mb-2">Cancel Order</h3>
              <p className="text-sm text-text-muted mb-3">
                You can cancel this order while payment is still pending.
              </p>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="btn btn-outline text-error"
              >
                {cancelling ? 'Cancelling…' : 'Cancel Order'}
              </button>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 bg-surface border border-border rounded-lg shadow-sm">
            <h2 className="text-lg font-bold text-primary mb-4">Purchased Products</h2>
            <div className="space-y-4">
              {orderItems.length > 0 ? (
                orderItems.map((item, index) => {
                  const price = item.price || 0;
                  const qty = item.quantity || 1;
                  const name = item.name || 'Unknown Product';
                  return (
                    <div key={item.product || index} className="flex gap-4 items-start">
                      <div className="w-16 h-16 flex-shrink-0 bg-surface/50 rounded overflow-hidden">
                        <img
                          src={productPlaceholder(name)}
                          alt={name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-text">{name}</div>
                        <div className="text-sm text-text-muted">
                          ₱{price.toLocaleString()} × {qty}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-text">
                          ₱{(price * qty).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-text-muted">No products recorded on this order.</p>
              )}
            </div>
          </div>

          <div className="p-4 bg-background border border-border/50 rounded-lg">
            <div className="flex justify-between text-sm mb-3">
              <span className="text-text-muted">Subtotal</span>
              <span className="font-medium text-text">₱{(order.subtotal || 0).toLocaleString()}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm mb-3">
                <span className="text-text-muted">Discount</span>
                <span className="font-medium text-success">-₱{order.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t border-border pt-3">
              <span className="text-text">Total</span>
              <span className="text-primary">₱{(order.total || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderDetails;
