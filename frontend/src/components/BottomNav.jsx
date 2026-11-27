import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, Package, Clock, Headphones } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/cart', label: 'Cart', icon: ShoppingCart },
  { to: '/orders', label: 'Orders', icon: Clock },
  { to: '/ai-assistant', label: 'AI Assistant', icon: Headphones },
];

export function BottomNav() {
  const location = useLocation();

  const currentIndex = navItems.findIndex((item) =>
    item.to === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.to)
  );

  return (
    <nav className="bottom-nav">
      {navItems.map((item, index) => (
        <Link
          key={item.to}
          to={item.to}
          className={`bottom-nav-item ${index === currentIndex ? 'active' : ''}`}
        >
          <item.icon size={20} />
          <span className="bottom-nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}