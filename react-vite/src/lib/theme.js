/**
 * Dark mode theme management
 */

const DARK_MODE_KEY = 'anyprint:theme';

export function initDarkMode() {
  const stored = localStorage.getItem(DARK_MODE_KEY);
  
  if (stored !== null) {
    const isDark = stored === 'dark';
    applyTheme(isDark);
    return isDark;
  }
  
  // Check system preference
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(isDark);
  return isDark;
}

export function toggleDarkMode() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const newValue = !isDark;
  applyTheme(newValue);
  localStorage.setItem(DARK_MODE_KEY, newValue ? 'dark' : 'light');
  window.dispatchEvent(new Event('anyprint:theme-changed'));
  return newValue;
}

export function applyTheme(isDark) {
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

export function isDarkMode() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}
