import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Box,
  CircuitBoard,
  Cpu,
  HardDrive,
  Layers,
  MemoryStick,
  PcCase,
  Search,
  ShieldCheck,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { ProductSkeletonGrid } from '../components/LoadingSkeleton.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import { productsAPI } from '../api/products.js';

const CATEGORY_ICONS = {
  CPU: Cpu,
  motherboard: CircuitBoard,
  GPU: Box,
  RAM: MemoryStick,
  storage: HardDrive,
  PSU: Zap,
  case: PcCase,
};

const CATEGORIES = [
  { key: 'CPU', label: 'Processors', description: 'AMD & Intel CPUs' },
  { key: 'GPU', label: 'Graphics Cards', description: 'NVIDIA & AMD GPUs' },
  { key: 'motherboard', label: 'Motherboards', description: 'Boards matched to your CPU' },
  { key: 'RAM', label: 'Memory', description: 'DDR4 & DDR5 kits' },
  { key: 'storage', label: 'Storage', description: 'NVMe SSDs and drives' },
  { key: 'PSU', label: 'Power Supplies', description: 'Reliable power delivery' },
  { key: 'case', label: 'PC Cases', description: 'Mid and full towers' },
];

export function Home() {
  const navigate = useNavigate();
  const [recent, setRecent] = useState([]);
  const [bestValue, setBestValue] = useState([]);
  const [gaming, setGaming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const loadCatalog = async () => {
      setLoading(true);
      setError(null);
      try {
        const [recentData, valueData, gamingData] = await Promise.all([
          productsAPI.list({ limit: 8, signal: controller.signal }),
          productsAPI.list({ limit: 4, sort: 'price_asc', signal: controller.signal }),
          productsAPI.list({ category: 'GPU', limit: 4, signal: controller.signal }),
        ]);
        if (controller.signal.aborted) return;
        setRecent(Array.isArray(recentData.items) ? recentData.items : []);
        setBestValue(Array.isArray(valueData.items) ? valueData.items : []);
        setGaming(Array.isArray(gamingData.items) ? gamingData.items : []);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err.message || 'Failed to load the catalog');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadCatalog();
    return () => controller.abort();
  }, [reloadKey]);

  const handleSearch = (e) => {
    e.preventDefault();
    const query = searchText.trim();
    navigate(query ? `/products?search=${encodeURIComponent(query)}` : '/products');
  };

  const featured = recent.slice(0, 4);
  const recentlyAdded = recent.slice(4, 8);

  return (
    <div className="page container">
      {/* Hero */}
      <section className="home-hero mb-8">
        <p className="home-hero-eyebrow">NextGen Builds</p>
        <h1 className="home-hero-title">Parts that fit. A build that works.</h1>
        <p className="home-hero-copy">
          Shop CPUs, graphics cards, memory, and everything else from a live catalog. Every price
          and stock count comes straight from the store API.
        </p>

        <form onSubmit={handleSearch} className="home-search" role="search">
          <label className="sr-only" htmlFor="home-search-input">Search components</label>
          <Search size={18} className="home-search-icon" aria-hidden="true" />
          <input
            id="home-search-input"
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search CPUs, GPUs, RAM…"
            className="home-search-input"
          />
          <button type="submit" className="btn btn-primary home-search-button">
            Search
          </button>
        </form>

        <div className="home-hero-actions">
          <Link to="/products" className="btn btn-primary">
            Shop Components
            <ArrowRight size={18} />
          </Link>
          <Link to="/ai-assistant" className="btn btn-outline text-white border-white">
            Ask the AI Advisor
          </Link>
        </div>

        <div className="home-hero-facts">
          <span><ShieldCheck size={16} /> Server-priced catalog</span>
          <span><Layers size={16} /> 7 component categories</span>
          <span><TrendingUp size={16} /> Build validation</span>
        </div>
      </section>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-error text-sm" role="alert">
          {error}
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="ml-2 text-xs underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Categories */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-primary">Shop by Category</h2>
          <Link to="/products" className="text-sm font-medium text-accent hover:underline">
            View All →
          </Link>
        </div>
        <div className="category-grid">
          {CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category.key] || Box;
            return (
              <Link
                key={category.key}
                to={`/products?category=${category.key}`}
                className="category-tile"
              >
                <div className="category-tile-icon">
                  <Icon size={20} />
                </div>
                <h3 className="font-semibold text-text">{category.label}</h3>
                <p className="text-xs text-text-muted">{category.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Gaming picks */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-primary">Gaming Picks</h2>
            <p className="text-sm text-text-muted">Graphics cards currently in the catalog.</p>
          </div>
          <Link to="/products?category=GPU" className="text-sm font-medium text-accent hover:underline">
            View GPUs →
          </Link>
        </div>
        {loading ? (
          <ProductSkeletonGrid count={2} />
        ) : gaming.length > 0 ? (
          <div className="product-grid">
            {gaming.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">No graphics cards are listed right now.</p>
        )}
      </section>

      {/* Promo strip */}
      <section className="promo-strip mb-8">
        <div>
          <h2 className="text-lg font-bold text-white">Not sure everything fits?</h2>
          <p className="text-sm text-white opacity-70">
            Pick your parts, then let the store validate sockets, memory, power, and clearance
            before you buy.
          </p>
        </div>
        <Link to="/pc-builder" className="btn btn-primary flex-shrink-0">
          Open PC Builder
        </Link>
      </section>

      {/* Featured */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-primary">Featured Products</h2>
          <Link to="/products" className="text-sm font-medium text-accent hover:underline">
            View All →
          </Link>
        </div>
        {loading ? (
          <ProductSkeletonGrid count={4} />
        ) : featured.length > 0 ? (
          <div className="product-grid">
            {featured.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3 className="empty-state-title">No products yet</h3>
            <p className="empty-state-description">Check back soon for new arrivals.</p>
          </div>
        )}
      </section>

      {/* Best value */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-primary">Best Value</h2>
            <p className="text-sm text-text-muted">
              Lowest prices in the catalog. The API has no sales data, so this is not a
              best-seller ranking.
            </p>
          </div>
          <Link to="/products?sort=price_asc" className="text-sm font-medium text-accent hover:underline">
            Browse →
          </Link>
        </div>
        {loading ? (
          <ProductSkeletonGrid count={2} />
        ) : bestValue.length > 0 ? (
          <div className="product-grid">
            {bestValue.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">No products are listed right now.</p>
        )}
      </section>

      {/* Recently added */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-primary">Recently Added</h2>
            <p className="text-sm text-text-muted">Newest entries in the store catalog.</p>
          </div>
          <Link to="/products" className="text-sm font-medium text-accent hover:underline">
            View All →
          </Link>
        </div>
        {loading ? (
          <ProductSkeletonGrid count={4} />
        ) : recentlyAdded.length > 0 ? (
          <div className="product-grid">
            {recentlyAdded.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">No newer products to show.</p>
        )}
      </section>

      {/* AI PC Builder Promo */}
      <section className="home-ai-promo">
        <div className="home-ai-promo-icon">
          <Zap size={24} />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-primary">AI PC Builder</h2>
          <p className="text-sm text-text-muted">
            Tell the advisor your budget and what you do. It recommends parts from this catalog
            and flags compatibility issues.
          </p>
        </div>
        <Link to="/ai-assistant" className="btn btn-primary flex-shrink-0">
          Try AI Builder
        </Link>
      </section>
    </div>
  );
}

export default Home;
