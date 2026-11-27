import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';

export function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, error, clearError } = useAuth();
  const { isOnline } = useOnlineStatus();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from;
  const redirectTo = from ? `${from.pathname || '/'}${from.search || ''}` : '/';

  const handleInputChange = (key) => (e) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOnline || submitting) return;
    if (formData.password.length < 8) return;
    setSubmitting(true);
    clearError();
    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      navigate(redirectTo, { replace: true });
    } catch (_err) {
      // Error already set by context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page container">
      <div className="auth-form">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center text-accent mx-auto mb-4">
            <span className="text-xl">✨</span>
          </div>
          <h1 className="text-2xl font-bold text-primary">Create Account</h1>
          <p className="text-text-muted">Join NextGen Builds and start building your dream PC</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3" role="alert">
            <AlertCircle size={20} className="text-error mt-0.5" />
            <div>
              <p className="text-sm text-error">{error}</p>
              <button type="button" onClick={clearError} className="mt-1 text-xs text-accent underline">
                Dismiss
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="form-label" htmlFor="register-name">Full Name</label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                id="register-name"
                type="text"
                className="form-input pl-9"
                value={formData.name}
                onChange={handleInputChange('name')}
                placeholder="John Doe"
                autoComplete="name"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-email">Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                id="register-email"
                type="email"
                className="form-input pl-9"
                value={formData.email}
                onChange={handleInputChange('email')}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div className="flex justify-between mb-2">
              <label className="form-label" htmlFor="register-password">Password</label>
              <span className="text-xs text-text-muted">Min 8 characters</span>
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                id="register-password"
                type="password"
                className="form-input pl-9"
                value={formData.password}
                onChange={handleInputChange('password')}
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !isOnline}
            className={`btn btn-primary btn-lg w-full ${submitting ? 'opacity-70' : ''}`}
          >
            {submitting ? 'Creating account…' : 'Create Account'}
            {!submitting && <ArrowRight size={18} className="ml-2" />}
          </button>

          {!isOnline && (
            <p className="text-sm text-warning text-center">
              You&apos;re offline — registration requires a connection
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Already have an account?{' '}
          <Link to="/login" state={{ from: location.state?.from }} className="text-accent hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
