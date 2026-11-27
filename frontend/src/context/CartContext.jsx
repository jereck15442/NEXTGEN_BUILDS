import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartAPI } from '../api/cart.js';
import { useAuth } from './AuthContext.jsx';

const CartContext = createContext(null);
const SNAPSHOT_KEY = 'nextgen-builds:cart-snapshot';

function readSnapshot() {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.cart?.items) ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function writeSnapshot(cart) {
  try {
    localStorage.setItem(
      SNAPSHOT_KEY,
      JSON.stringify({ cart, savedAt: new Date().toISOString() })
    );
  } catch (_error) {
    // A full or blocked storage quota must not break the live cart.
  }
}

function clearSnapshot() {
  try {
    localStorage.removeItem(SNAPSHOT_KEY);
  } catch (_error) {
    // Ignore storage access failures.
  }
}

function clientError(message, extra = {}) {
  const error = new Error(message);
  Object.assign(error, extra);
  return error;
}

export function CartProvider({ children }) {
  const { token } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState(null);
  const [usingSnapshot, setUsingSnapshot] = useState(false);
  const [snapshotSavedAt, setSnapshotSavedAt] = useState(null);

  const applyCart = useCallback((nextCart) => {
    setCart(nextCart);
    setUsingSnapshot(false);
    setSnapshotSavedAt(null);
    writeSnapshot(nextCart);
  }, []);

  const showSnapshot = useCallback(() => {
    const snapshot = readSnapshot();
    if (!snapshot) return false;
    setCart(snapshot.cart);
    setUsingSnapshot(true);
    setSnapshotSavedAt(snapshot.savedAt || null);
    return true;
  }, []);

  const fetchCart = useCallback(async ({ signal } = {}) => {
    if (!token) {
      setCart(null);
      setLoading(false);
      setError(null);
      return null;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLoading(false);
      setError(null);
      if (!showSnapshot()) setCart(null);
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await cartAPI.get({ signal });
      if (signal?.aborted) return null;
      applyCart(data);
      return data;
    } catch (err) {
      if (signal?.aborted) return null;
      if (err?.isOffline && showSnapshot()) {
        setError(null);
        return null;
      }
      setError(err.message || 'Failed to load cart');
      return null;
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [token, applyCart, showSnapshot]);

  useEffect(() => {
    if (!token) {
      setCart(null);
      setLoading(false);
      setError(null);
      setUsingSnapshot(false);
      setSnapshotSavedAt(null);
      clearSnapshot();
      return undefined;
    }

    const controller = new AbortController();
    fetchCart({ signal: controller.signal });
    return () => controller.abort();
  }, [token, fetchCart]);

  useEffect(() => {
    if (!token) return undefined;
    const handleOnline = () => fetchCart();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [token, fetchCart]);

  const assertMutable = useCallback(() => {
    let failure = null;
    if (!token) {
      failure = clientError('Sign in to manage your cart.', {
        code: 'UNAUTHORIZED',
        status: 401,
      });
    } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
      failure = clientError('You are offline. Reconnect to change your cart.', {
        code: 'NETWORK_ERROR',
        isOffline: true,
      });
    }

    if (failure) {
      setError(failure.message);
      throw failure;
    }
  }, [token]);

  const syncCart = useCallback(async () => {
    const data = await cartAPI.get();
    applyCart(data);
    return data;
  }, [applyCart]);

  const addItem = useCallback(async ({ productId, quantity }) => {
    assertMutable();
    setError(null);
    try {
      await cartAPI.addItem({ productId, quantity });
      return await syncCart();
    } catch (err) {
      setError(err.message || 'Failed to add item to cart');
      throw err;
    }
  }, [assertMutable, syncCart]);

  const updateItem = useCallback(async (productId, quantity) => {
    assertMutable();
    setError(null);
    try {
      await cartAPI.updateItem(productId, quantity);
      return await syncCart();
    } catch (err) {
      setError(err.message || 'Failed to update quantity');
      throw err;
    }
  }, [assertMutable, syncCart]);

  const removeItem = useCallback(async (productId) => {
    assertMutable();
    setError(null);
    try {
      await cartAPI.removeItem(productId);
      return await syncCart();
    } catch (err) {
      setError(err.message || 'Failed to remove item');
      throw err;
    }
  }, [assertMutable, syncCart]);

  const itemCount = cart?.items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;
  const subtotal = cart?.items
    ? cart.items.reduce((sum, item) => {
        const price = Number(item.product?.price) || 0;
        return sum + price * (Number(item.quantity) || 0);
      }, 0)
    : 0;

  const value = {
    cart,
    items: cart?.items || [],
    itemCount,
    subtotal,
    loading,
    error,
    usingSnapshot,
    snapshotSavedAt,
    addItem,
    updateItem,
    removeItem,
    refresh: fetchCart,
    clearError: () => setError(null),
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
