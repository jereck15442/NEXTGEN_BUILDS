export function LoadingSkeleton({ className = '' }) {
  return (
    <div className={`skeleton ${className}`} />
  );
}

export function ProductSkeletonGrid({ count = 6 } = {}) {
  return (
    <div className="product-grid">
      {Array.from({ length: count }).map((_, i) => (
        <article key={i} className="product-card">
          <div className="skeleton-image" />
          <div className="product-card-content">
            <div className="skeleton-text title" />
            <div className="skeleton-text" style={{ width: '40%' }} />
            <div className="skeleton-text price" />
          </div>
        </article>
      ))}
    </div>
  );
}