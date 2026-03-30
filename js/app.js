/**
 * Pixaroid — App Bootstrap  ·  js/app.js
 *
 * Entry point loaded on every page.
 * Initialises: theme, service worker, performance module, prefetch,
 *              lazy loading, scroll reveal, tool link injection.
 */
import { init as initPerf } from '/js/modules/performance.js';

document.addEventListener('DOMContentLoaded', () => {

  /* ── Theme ────────────────────────────────────────────── */
  const root = document.documentElement;
  const s    = localStorage.getItem('pxn-theme');
  if (s === 'dark' || (!s && matchMedia('(prefers-color-scheme:dark)').matches)) {
    root.classList.add('dark');
  }

  /* ── Performance module ───────────────────────────────── */
  initPerf();

  /* ── Service Worker ───────────────────────────────────── */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .catch(err => console.warn('[SW] registration failed:', err));
  }

  /* ── Tool page: inject internal links ─────────────────── */
  const toolSlug = document.body.dataset.toolSlug;
  if (toolSlug) {
    import('/js/modules/internal-links.js').then(({ injectToolLinks }) => {
      injectToolLinks({ slug: toolSlug });
    });
  }

  /* ── Analytics (replace with real GA4 ID) ─────────────── */
  // const GA_ID = 'G-XXXXXXXXXX';
  // _loadGA(GA_ID);
});
