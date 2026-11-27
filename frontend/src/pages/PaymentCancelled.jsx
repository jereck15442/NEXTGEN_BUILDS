import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { ordersAPI } from '../api/orders.js';

const STATUS_LABELS = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

function outcomeFor(paymentStatus) {
  if (paymentStatus === 'paid') {
    return {
      tone: 'success',
      icon: CheckCircle,
      title: 'Payment Completed',
      message:
        'The backend reports this order as paid. No further payment action is needed.',
    };
  }
  if (paymentStatus === 'cancelled') {
    return {
      tone: 'error',
      icon: AlertCircle,
      title: 'Order Cancelled',
      message:
        'The backend reports this order as cancelled. No charge was recorded for it.',
    };
  }
  if (paymentStatus === 'failed' || paymentStatus === 'expired') {
    return {
      tone: 'error',
      icon: AlertCircle,
      title: `Payment ${STATUS_LABELS[paymentStatus] || 'Unsuccessful'}`,
      message:
        'The backend reports that this payment did not complete. You can return to your cart and try again.',
    };
  }
  return {
    tone: 'warning',
    icon: Clock,
    title: 'Payment Not Confirmed',
    message:
      'No payment confirmation was received. The order is still pending and can be cancelled from its details page.',
  };
}

export function PaymentCancelled() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return undefined;
    }
    if (!orderId) {
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const fetchOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await ordersAPI.get(orderId, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setOrder(data.order || data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err.message || 'Failed to verify order status');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchOrder();
    return () => controller.abort();
  }, [isAuthenticated, location, navigate, orderId]);

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="page container">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p className="text-text-muted">Checking order status…</p>
        </div>
      </div>
    );
  }

  if (!orderId) {
    return (
      <div className="page container">
        <div className="empty-state">
          <div className="empty-state-icon">💳</div>
          <h3 className="empty-state-title">No Order Reference</h3>
          <p className="empty-state-description">
            This page needs an order reference to check the real payment status. Open an order
            from your history to see its latest status.
          </p>
          <Link to="/orders" className="btn btn-primary">
            View My Orders
          </Link>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="page container">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3 className="empty-state-title">Could Not Verify Order</h3>
          <p className="empty-state-description">
            {error || 'The order could not be loaded from the server.'}
          </p>
          <Link to="/orders" className="btn btn-primary">
            View My Orders
          </Link>
        </div>
      </div>
    );
  }

  const paymentStatus = order.paymentStatus || 'pending';
  const fulfillmentStatus = order.fulfillmentStatus || 'pending';
  const outcome = outcomeFor(paymentStatus);
  const Icon = outcome.icon;

  return (
    <div className="page container">
      <div className="text-center py-12">
        <div className={`payment-outcome-icon ${outcome.tone}`}>
          <Icon size={28} strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-bold text-primary mb-2">{outcome.title}</h1>
        <p className="text-text-muted mb-6">{outcome.message}</p>

        <div className="p-6 bg-surface border border-border rounded-lg text-left">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-text-muted">Order Number</span>
              <span className="font-medium text-text break-all">#{order._id}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-text-muted">Order Date</span>
              <span className="font-medium text-text">
                {new Date(order.createdAt || Date.now()).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-text-muted">Total Amount</span>
              <span className="font-medium text-primary">
                ₱{(order.total || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-text-muted">Payment Status</span>
              <span className={`font-medium ${paymentStatus === 'paid' ? 'text-success' : 'text-warning'}`}>
                {STATUS_LABELS[paymentStatus] || paymentStatus}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-text-muted">Order Status</span>
              <span className="font-medium text-text">
                {fulfillmentStatus.charAt(0).toUpperCase() + fulfillmentStatus.slice(1)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link to={`/orders/${order._id}`} className="btn btn-primary">
            View Order Details
          </Link>
          <Link to="/orders" className="btn btn-ghost">
            Back to Orders
          </Link>
          <Link to="/products" className="btn btn-ghost">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PaymentCancelled;
