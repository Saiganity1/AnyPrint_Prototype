/**
 * Breadcrumb component for navigation hierarchy
 */

import { Link } from 'react-router-dom';

export default function Breadcrumb({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <ol className="breadcrumb-list">
        {items.map((item, index) => (
          <li key={index} className="breadcrumb-item">
            {item.href ? (
              <>
                <Link to={item.href} className="breadcrumb-link">
                  {item.label}
                </Link>
                {index < items.length - 1 && <span className="breadcrumb-separator">/</span>}
              </>
            ) : (
              <>
                <span className="breadcrumb-current">{item.label}</span>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
