/**
 * ═══════════════════════════════════════════════════════════════════
 *  Pixaroid — Performance Module  ·  js/modules/performance.js
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Implements:
 *    1. Lazy loading    – IntersectionObserver for images + panels
 *    2. Code splitting  – dynamic import() helpers per tool type
 *    3. Prefetching     – <link rel="prefetch"> for hovered links
 *    4. Image optimisation hints – loading="lazy", decoding="async"
 *    5. Resource hints  – preconnect / preload critical assets
 *    6. CLS prevention  – explicit width/height on images
 *    7. Web Worker pool – from engine.js (re-exported here)
 * ═══════════════════════════════════════════════════════════════════
 */

'use strict';

/* ────────────────────────────────────────────────────────────────
   1. Lazy Loading — IntersectionObserver
──────────────────────────────────────────────────────────────── */

const _lazyObserver = typeof IntersectionObserver !== 'undefined'
  ? new IntersectionObserver(_onIntersect, { rootMargin: '200px 0px', threshold: 0.01 })
  : null;

function _onIntersect(entries) {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    _lazyObserver.unobserve(el);

    if (el.dataset.src) {
      el.src = el.dataset.src;
      el.removeAttribute('data-src');
      el.decoding = 'async';
    }
    if (el.dataset.load === 'panel') {
      el.dispatchEvent(new CustomEvent('pxn:load-panel'));
    }
    el.classList.remove('pxn-lazy');
    el.classList.add('pxn-loaded');
  });
}

/**
 * Observe all elements with [data-src] or [data-load="panel"]
 * for deferred loading.
 */
export function initLazyLoading() {
  if (!_lazyObserver) {
    // Fallback for browsers without IntersectionObserver
    document.querySelectorAll('[data-src]').forEach(el => { el.src = el.dataset.src; });
    return;
  }
  document.querySelectorAll('[data-src], [data-load="panel"]').forEach(el => {
    _lazyObserver.observe(el);
  });
}

/**
 * Lazy-observe a specific element (call after dynamic DOM insertion).
 */
export function lazyObserve(el) {
  if (_lazyObserver && el) _lazyObserver.observe(el);
}

/**
 * Apply lazy-loading attributes to all <img> tags in `root`.
 */
export function applyLazyImages(root = document) {
  root.querySelectorAll('img:not([loading])').forEach(img => {
    img.loading  = 'lazy';
    img.decoding = 'async';
    // Prevent CLS: set explicit dimensions from natural size if available
    if (!img.width  && img.naturalWidth)  img.width  = img.naturalWidth;
    if (!img.height && img.naturalHeight) img.height = img.naturalHeight;
  });
}

/* ────────────────────────────────────────────────────────────────
   2. Code Splitting — dynamic import helpers
──────────────────────────────────────────────────────────────── */

// Module registry — maps interfaceType → chunk path
const TOOL_CHUNKS = {
  compress:        () => import('/js/chunks/tool-compress.js'),
  'compress-target': () => import('/js/chunks/tool-compress.js'),
  convert:         () => import('/js/chunks/tool-convert.js'),
  'convert-multi': () => import('/js/chunks/tool-convert.js'),
  'convert-pdf':   () => import('/js/chunks/tool-convert.js'),
  resize:          () => import('/js/chunks/tool-resize.js'),
  'resize-social': () => import('/js/chunks/tool-resize.js'),
  crop:            () => import('/js/chunks/tool-editor.js'),
  rotate:          () => import('/js/chunks/tool-editor.js'),
  flip:            () => import('/js/chunks/tool-editor.js'),
  watermark:       () => import('/js/chunks/tool-editor.js'),
  'text-overlay':  () => import('/js/chunks/tool-editor.js'),
  blur:            () => import('/js/chunks/tool-editor.js'),
  sharpen:         () => import('/js/chunks/tool-editor.js'),
  adjust:          () => import('/js/chunks/tool-editor.js'),
  'ai-bg-remove':  () => import('/js/chunks/tool-ai.js'),
  'ai-upscale':    () => import('/js/chunks/tool-ai.js'),
  'ai-enhance':    () => import('/js/chunks/tool-ai.js'),
  'ai-sharpen':    () => import('/js/chunks/tool-ai.js'),
  'ai-colorize':   () => import('/js/chunks/tool-ai.js'),
  'ai-ocr':        () => import('/js/chunks/tool-ai.js'),
  'social-canvas': () => import('/js/chunks/tool-social.js'),
  bulk:            () => import('/js/chunks/tool-bulk.js'),
  palette:         () => import('/js/chunks/tool-utility.js'),
  info:            () => import('/js/chunks/tool-utility.js'),
  metadata:        () => import('/js/chunks/tool-utility.js'),
  calculator:      () => import('/js/chunks/tool-utility.js'),
};

/**
 * Dynamically load the chunk for a given interfaceType.
 * Returns the module exports or null if chunk not found.
 */
export async function loadToolChunk(interfaceType) {
  const loader = TOOL_CHUNKS[interfaceType];
  if (!loader) {
    console.warn(`[perf] No chunk mapped for interfaceType "${interfaceType}"`);
    return null;
  }
  try {
    return await loader();
  } catch (err) {
    console.error(`[perf] Failed to load chunk for "${interfaceType}":`, err);
    return null;
  }
}

/* ────────────────────────────────────────────────────────────────
   3. Prefetching — hover intent prefetch
──────────────────────────────────────────────────────────────── */

const _prefetched = new Set();

/**
 * Add hover-intent prefetch to all internal tool links.
 * Prefetches the HTML document on 150ms hover.
 */
export function initPrefetch() {
  const DELAY = 150;

  document.addEventListener('mouseover', e => {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const url = link.href;
    if (!url || _prefetched.has(url)) return;
    if (!url.includes('/tools/') && !url.startsWith(location.origin)) return;

    const timer = setTimeout(() => {
      _prefetchURL(url);
    }, DELAY);

    link.addEventListener('mouseout', () => clearTimeout(timer), { once: true });
  });
}

function _prefetchURL(url) {
  if (_prefetched.has(url)) return;
  _prefetched.add(url);

  const link = document.createElement('link');
  link.rel  = 'prefetch';
  link.href = url;
  link.as   = 'document';
  document.head.appendChild(link);
}

/* ────────────────────────────────────────────────────────────────
   4. Resource hints — inject on page load
──────────────────────────────────────────────────────────────── */

/**
 * Inject <link rel="preconnect"> for known third-party origins
 * and <link rel="preload"> for the CSS output file.
 */
export function injectResourceHints() {
  const hints = [
    { rel:'preconnect', href:'https://fonts.googleapis.com' },
    { rel:'preconnect', href:'https://fonts.gstatic.com', crossorigin:'' },
  ];

  hints.forEach(({ rel, href, crossorigin }) => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const el = document.createElement('link');
    el.rel  = rel;
    el.href = href;
    if (crossorigin !== undefined) el.crossOrigin = '';
    document.head.appendChild(el);
  });
}

/* ────────────────────────────────────────────────────────────────
   5. Critical CSS inline check
──────────────────────────────────────────────────────────────── */

/**
 * Marks the page as JS-enhanced once DOMContentLoaded fires,
 * allowing CSS to show progressive enhancement states.
 */
export function markJSReady() {
  document.documentElement.classList.add('js-ready');
  document.documentElement.classList.remove('no-js');
}

/* ────────────────────────────────────────────────────────────────
   6. Scroll-based animation trigger
──────────────────────────────────────────────────────────────── */

/**
 * Uses IntersectionObserver to add .is-visible to elements
 * with class .reveal-on-scroll, triggering CSS animations.
 */
export function initScrollReveal() {
  if (!IntersectionObserver) return;

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        revealObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal-on-scroll').forEach(el => {
    revealObserver.observe(el);
  });
}

/* ────────────────────────────────────────────────────────────────
   7. Image srcset / optimisation helpers
──────────────────────────────────────────────────────────────── */

/**
 * Given a base image URL and a list of widths, returns a srcset string.
 * Assumes Pixaroid's URL scheme: /assets/images/[name]-[width].webp
 */
export function buildSrcset(basePath, widths = [480, 800, 1200]) {
  const ext    = basePath.split('.').pop();
  const base   = basePath.replace(`.${ext}`, '');
  return widths.map(w => `${base}-${w}.${ext} ${w}w`).join(', ');
}

/**
 * Applies loading="lazy" and explicit width/height to a given
 * <img> element to prevent CLS (Cumulative Layout Shift).
 */
export function optimiseImageEl(img, width, height) {
  img.loading  = 'lazy';
  img.decoding = 'async';
  if (width)  img.width  = width;
  if (height) img.height = height;
}

/* ────────────────────────────────────────────────────────────────
   8. Bundle size reporting (dev only)
──────────────────────────────────────────────────────────────── */

export function reportPerformance() {
  if (typeof performance === 'undefined') return;

  const nav = performance.getEntriesByType('navigation')[0];
  if (!nav) return;

  const metrics = {
    TTFB:    Math.round(nav.responseStart - nav.requestStart),
    FCP:     Math.round(nav.domContentLoadedEventEnd - nav.startTime),
    Load:    Math.round(nav.loadEventEnd - nav.startTime),
    DOMSize: document.querySelectorAll('*').length,
  };

  console.table(metrics);
  return metrics;
}

/* ────────────────────────────────────────────────────────────────
   9. init() — call once on DOMContentLoaded
──────────────────────────────────────────────────────────────── */

export function init() {
  markJSReady();
  injectResourceHints();
  initLazyLoading();
  applyLazyImages();
  initScrollReveal();
  initPrefetch();
}
