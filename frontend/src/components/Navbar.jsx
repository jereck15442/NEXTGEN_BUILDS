import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, ShoppingCart, Search, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useCart } from '../hooks/useCart.js';

export function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout, isAuthenticated } = useAuth();
  const { itemCount } = useCart();

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" className="navbar-brand" onClick={() => setMenuOpen(false)}>
          <span className="font-bold text-xl tracking-tight">NEXTGEN</span>
          <span className="text-accent">BUILDS</span>
        </Link>
        <div className="hidden md:flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted size-4" />
            <input
              type="text"
              aria-label="Search components"
              placeholder="Search components…"
              className="pl-9 pr-4 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
                }
              }}
            />
          </div>
          <Link to="/products" className="px-4 py-2 text-sm font-medium text-text hover:text-accent transition-colors">
            Shop
          </Link>
        </div>
        <div className="navbar-actions">
          <Link
            to="/cart"
            className="navbar-icon-btn relative"
            onClick={() => setMenuOpen(false)}
            aria-label={itemCount > 0 ? `Cart, ${itemCount} items` : 'Cart, empty'}
          >
            <ShoppingCart size={24} />
            {itemCount > 0 && (
              <span className="navbar-badge">{itemCount}</span>
            )}
          </Link>

          {isAuthenticated ? (
            <div className="relative">
              <button
                className="navbar-icon-btn flex items-center gap-2"
                aria-label="Account menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <User size={20} />
                <span className="text-xs font-medium hidden md:block">{user?.name}</span>
                <ChevronDown size={14} className="ml-1" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-lg shadow-lg py-2 z-50">
                  <Link
                    to="/orders"
                    className="block px-4 py-3 text-sm text-text hover:bg-background transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Orders
                  </Link>
                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="block px-4 py-3 text-sm text-text hover:bg-background transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-3 text-sm text-error hover:bg-red-50 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-text hover:text-accent transition-colors hidden md:block"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="btn btn-primary btn-sm hidden md:block"
                onClick={() => setMenuOpen(false)}
              >
                Join
              </Link>
              <button
                className="navbar-icon-btn md:hidden"
                aria-label="Open menu"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <Menu size={24} />
              </button>
            </>
          )}
        </div>
      </div>

      {menuOpen && !isAuthenticated && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setMenuOpen(false)} />
      )}
      {menuOpen && !isAuthenticated && (
        <div className="fixed inset-y-0 left-0 w-full sm:w-80 bg-surface z-50 shadow-xl drawer-enter md:hidden">
          <div className="p-4 border-b border-border">
            <button
              onClick={() => {
                setMenuOpen(false);
                navigate('/login');
              }}
              className="btn btn-ghost w-full justify-start text-error"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                navigate('/register');
              }}
              className="btn btn-primary w-full justify-start mt-2"
            >
              Join
            </button>
          </div>
          <div className="p-4">
            <div className="mb-4">
              <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider" htmlFor="navbar-search">
                Search
              </label>
              <input
                id="navbar-search"
                type="text"
                placeholder="Search components…"
                className="w-full pl-3 pr-4 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    setMenuOpen(false);
                    navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
              />
            </div>
            <Link
              to="/products"
              className="btn btn-ghost w-full justify-start text-text mb-2"
              onClick={() => setMenuOpen(false)}
            >
              Browse Products
            </Link>
            <Link
              to="/ai-assistant"
              className="btn btn-ghost w-full justify-start text-text mb-2"
              onClick={() => setMenuOpen(false)}
            >
              AI Assistant
            </Link>
            <Link
              to="/cart"
              className="btn btn-ghost w-full justify-start text-text"
              onClick={() => setMenuOpen(false)}
            >
              Shopping Cart ({itemCount})
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}