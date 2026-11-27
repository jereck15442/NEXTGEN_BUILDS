import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export function ProtectedRoute({ children, requiredRole }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null; // Let the parent show a loader
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Ensure user is a valid object before checking role; requiredRole must match
  if (requiredRole && user && typeof user.role === 'string' && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}