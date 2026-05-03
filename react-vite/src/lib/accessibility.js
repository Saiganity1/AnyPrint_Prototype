/**
 * Accessibility utilities
 */

export function ensureKeyboardNavigation(element, callback) {
  element.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  });
}

export function announceToScreenReader(message) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  setTimeout(() => announcement.remove(), 1000);
}

export function setFocusTrap(element) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  element.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  });
}

export function improveColorContrast() {
  const style = document.createElement('style');
  style.textContent = `
    /* Improve text contrast */
    body { color: #222; }
    a { color: #0066cc; }
    a:visited { color: #663399; }
    button { min-height: 44px; min-width: 44px; } /* Touch target size */
    input, select, textarea { min-height: 44px; } /* Touch target size */
  `;
  document.head.appendChild(style);
}

export function setupFocusIndicators() {
  const style = document.createElement('style');
  style.textContent = `
    *:focus-visible {
      outline: 3px solid #0066cc;
      outline-offset: 2px;
    }
    button:focus-visible,
    a:focus-visible,
    input:focus-visible,
    select:focus-visible,
    textarea:focus-visible {
      outline: 3px solid #0066cc;
      outline-offset: 2px;
    }
  `;
  document.head.appendChild(style);
}
