export default function LoadingSpinner({ label = "Loading", className = "" }) {
  return (
    <span className={`loading-spinner ${className}`.trim()} role="status" aria-label={label}>
      <span className="loading-spinner-ring" aria-hidden="true" />
    </span>
  );
}