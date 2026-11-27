import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { ProductCard } from '../components/ProductCard.jsx';
import { ProductSkeletonGrid } from '../components/LoadingSkeleton.jsx';
import { productsAPI } from '../api/products.js';
import { useDebounce } from '../hooks/useDebounce.js';

const CATEGORY_LABELS = {
  CPU: 'CPU',
  motherboard: 'Motherboard',
  GPU: 'GPU',
  RAM: 'RAM',
  storage: 'Storage',
  PSU: 'PSU',
  case: 'PC Case',
};

const SORT_OPTIONS = [
  { value: '', label: 'Default (Newest)' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

export function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || '';
  const page = Number(searchParams.get('page')) || 1;

  const [searchText, setSearchText] = useState(search);
  const debouncedSearchText = useDebounce(searchText, 400);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setSearchText(search);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const loadProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await productsAPI.list({
          page,
          limit: 20,
          category: category || undefined,
          search: search || undefined,
          sort: sort || undefined,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setProducts(data.items || []);
        setPagination(data.pagination || { page, limit: 20, total: 0, pages: 0 });
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err.message || 'Failed to load products');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadProducts();
    return () => controller.abort();
  }, [category, search, sort, page]);

  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next);
  };

  const goToPage = (nextPage) => {
    updateParams({ page: nextPage > 1 ? String(nextPage) : '' });
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const nextSearch = debouncedSearchText.trim();
    if (nextSearch === search) return;
    updateParams({ search: nextSearch });
  }, [debouncedSearchText, search, updateParams]);

  const totalPages = pagination.pages || 1;

  return (
    <div className="page container">
      <div className="page-header mb-6">
        <div className="mb-4">
          <h1 className="page-title">Shop Components</h1>
          <p className="page-subtitle">
            {products.length} of {pagination.total} products
          </p>
        </div>

        {/* Search */}
        <form
          className="flex gap-2 mb-6"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            updateParams({ search: searchText.trim(), page: '' });
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted size-4" />
            <label className="sr-only" htmlFor="products-search">Search components</label>
            <input
              id="products-search"
              type="search"
              placeholder="Search components…"
              className="w-full pl-9 pr-4 py-3 text-base border border-border rounded-lg bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary flex-shrink-0">
            Search
          </button>
        </form>

        {/* Filter & Sort Options */}
        <div className="flex flex-wrap gap-4 mb-6 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider" htmlFor="products-category">
              Category
            </label>
            <select
              id="products-category"
              value={category}
              onChange={(e) => updateParams({ category: e.target.value, page: '' })}
              className="w-full form-select"
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider" htmlFor="products-sort">
              Sort By
            </label>
            <select
              id="products-sort"
              value={sort}
              onChange={(e) => updateParams({ sort: e.target.value, page: '' })}
              className="w-full form-select"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-error text-sm" role="alert">
          {error}
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <ProductSkeletonGrid count={6} />
      ) : products.length > 0 ? (
        <>
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>

          {/* Pagination */}
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
          <div className="empty-state-icon">🔍</div>
          <h3 className="empty-state-title">No products found</h3>
          <p className="empty-state-description">
            Try adjusting your search or filter criteria.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchText('');
              setSearchParams({});
            }}
            className="btn btn-primary"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}

export default Products;
