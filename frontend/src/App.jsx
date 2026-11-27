import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { NetworkStatusProvider } from './context/NetworkStatusContext.jsx';
import { OfflineBanner } from './components/OfflineBanner.jsx';
import { Navbar } from './components/Navbar.jsx';
import { BottomNav } from './components/BottomNav.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';

const Home = lazy(() => import('./pages/Home.jsx'));
const Products = lazy(() => import('./pages/Products.jsx'));
const ProductDetails = lazy(() => import('./pages/ProductDetails.jsx'));
const AIAssistant = lazy(() => import('./pages/AIAssistant.jsx'));
const Cart = lazy(() => import('./pages/Cart.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess.jsx'));
const PaymentCancelled = lazy(() => import('./pages/PaymentCancelled.jsx'));
const Orders = lazy(() => import('./pages/Orders.jsx'));
const OrderDetails = lazy(() => import('./pages/OrderDetails.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const PCBuilder = lazy(() => import('./pages/PCBuilder.jsx'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <NetworkStatusProvider>
          <OfflineBanner />
          <Navbar />
          <Suspense
            fallback={
              <div className="page container">
                <div className="loading-container">
                  <div className="loading-spinner" />
                  <p className="text-text-muted">Loading page…</p>
                </div>
              </div>
            }
          >
              <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetails />} />
              <Route path="/ai-assistant" element={
                <ProtectedRoute>
                  <AIAssistant />
                </ProtectedRoute>
              } />
              <Route path="/cart" element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              } />
              <Route path="/checkout" element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              } />
              <Route path="/payment/success" element={
                <ProtectedRoute>
                  <PaymentSuccess />
                </ProtectedRoute>
              } />
              <Route path="/payment/cancelled" element={
                <ProtectedRoute>
                  <PaymentCancelled />
                </ProtectedRoute>
              } />
              <Route path="/orders" element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              } />
              <Route path="/orders/:id" element={
                <ProtectedRoute>
                  <OrderDetails />
                </ProtectedRoute>
              } />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/pc-builder" element={
                <ProtectedRoute>
                  <PCBuilder />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          <BottomNav />
        </NetworkStatusProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
