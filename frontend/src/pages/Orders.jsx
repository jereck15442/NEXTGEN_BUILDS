import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { ordersAPI } from '../api/orders.js';

const PAGE_SIZE = 10;

const PAYMENT_LABELS = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const PAYMENT_COLORS = {
  pending: 'text-warning',
  paid: 'text-success',
  failed: 'text-error',
  cancelled: 'text-text-muted',
  expired: 'text-text-muted',
};

const FULFILLMENT_LABELS = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export function Orders() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    pages: 0,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const loadOrders = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ordersAPI.list({ page, limit: PAGE_SIZE, signal });
      if (signal?.aborted) return;
      setOrders(Array.isArray(data.items) ? data.items : []);
      setPagination((prev) => ({
        ...prev,
        ...(data.pagination || {}),
        page,
        limit: PAGE_SIZE,
      }));
    } catch (err) {
      if (signal?.aborted) return;
      setError(err.message || 'Failed to load orders');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/orders' } } });
      return undefined;
    }
    const controller = new AbortController();
    loadOrders(controller.signal);
    return () => controller.abort();
  }, [isAuthenticated, loadOrders, navigate]);

  const handleCancel = async (orderId) => {
    if (cancellingId) return;
    if (!window.confirm('Cancel this order? This cannot be undone.')) return;
    setCancellingId(orderId);
    setActionError(null);
    try {
      const data = await ordersAPI.cancel(orderId);
      const updated = data.order || data;
      setOrders((prev) => prev.map((order) => (order._id === orderId ? updated : order)));
    } catch (err) {
      setActionError(err.message || 'Failed to cancel order');
    } finally {
      setCancellingId(null);
    }
  };

  const goToPage = (nextPage) => {
    setPage(nextPage);
    window.scrollTo(0, 0);
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="page container">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p className="text-text-muted">Loading orders…</p>
        </div>
      </div>
    );
  }

  const totalPages = pagination.pages || 1;

  return (
    <div className="page container">
      <div className="page-header mb-6">
        <h1 className="page-title">My Orders</h1>
        <p className="page-subtitle">Track your purchases and order history</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-error text-sm" role="alert">
          {error}
          <button type="button" onClick={() => loadOrders()} className="ml-2 text-xs underline">
            Retry
          </button>
        </div>
      )}

      {actionError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-error text-sm" role="alert">
          {actionError}
        </div>
      )}

      {orders.length > 0 ? (
        <>
          <div className="space-y-4">
            {orders.map((order) => {
              const canCancel =
                order.paymentStatus === 'pending' && order.fulfillmentStatus !== 'cancelled';
              return (
                <div key={order._id} className="bg-surface border border-border rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-accent break-all">
                        Order #{order._id}
                      </span>
                      <p className="text-sm font-medium text-text mt-0.5">
                        {new Date(order.createdAt || order.created_at || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-sm font-medium ${PAYMENT_COLORS[order.paymentStatus] || 'text-text-muted'}`}>
                        {PAYMENT_LABELS[order.paymentStatus] || order.paymentStatus}
                      </span>
                      <p className="text-xs text-text-muted mt-0.5">
                        {FULFILLMENT_LABELS[order.fulfillmentStatus] || order.fulfillmentStatus}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-text-muted">
                      {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-lg font-bold text-primary">
                      ₱{(order.total || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/orders/${order._id}`} className="btn btn-outline flex-1">
                      View Details
                    </Link>
                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => handleCancel(order._id)}
                        disabled={cancellingId === order._id}
                        className="btn btn-outline text-error flex-1"
                      >
                        {cancellingId === order._id ? 'Cancelling…' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => goToPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="btn btn-ghost"
              >
                ← Prev
              </button>
              <span className="text-sm text-text-muted">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => goToPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="btn btn-ghost"
              >
                Next →
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3 className="empty-state-title">No orders yet</h3>
          <p className="empty-state-description">
            You haven&apos;t placed any orders. Start shopping to see your order history here.
          </p>
          <Link to="/products" className="btn btn-primary">
            Browse Products
          </Link>
        </div>
      )}
    </div>
  );
}

export default Orders;
