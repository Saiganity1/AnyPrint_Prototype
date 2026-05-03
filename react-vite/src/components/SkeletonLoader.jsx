/**
 * Skeleton Loader component for loading states
 */

export default function SkeletonLoader({ type = 'card', count = 1 }) {
  if (type === 'card') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton skeleton-image"></div>
            <div className="skeleton skeleton-text"></div>
            <div className="skeleton skeleton-text short"></div>
            <div className="skeleton skeleton-text short"></div>
          </div>
        ))}
      </>
    );
  }

  if (type === 'product-detail') {
    return (
      <div className="skeleton-product-detail">
        <div className="skeleton skeleton-large"></div>
        <div className="skeleton-details">
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-text short"></div>
          <div className="skeleton skeleton-text short"></div>
        </div>
      </div>
    );
  }

  if (type === 'line') {
    return <div className="skeleton skeleton-text"></div>;
  }

  return null;
}
