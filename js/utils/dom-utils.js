/**
 * DOM Utilities — theme, helpers.
 */
export function initTheme() {
  const saved = localStorage.getItem('pxn-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'dark' || (!saved && prefersDark)) {
    document.documentElement.classList.add('dark');
  }
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('pxn-theme', isDark ? 'dark' : 'light');
}

export function $(selector, parent = document) { return parent.querySelector(selector); }
export function $$(selector, parent = document) { return [...parent.querySelectorAll(selector)]; }

export function show(el) { el?.classList.remove('hidden'); }
export function hide(el) { el?.classList.add('hidden'); }
