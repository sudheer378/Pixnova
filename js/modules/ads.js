/**
 * ═══════════════════════════════════════════════════════════════════
 *  Pixaroid — Ad Unit Module  ·  js/modules/ads.js
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Manages Google AdSense ad placeholders and live ad injection.
 *
 *  Ad slots defined:
 *    leaderboard-top      728×90   / responsive — top of every page
 *    leaderboard-bottom   728×90   / responsive — above footer
 *    sidebar-top          300×250  — sidebar, above fold
 *    sidebar-mid          300×250  — sidebar, mid-page
 *    in-content-1         responsive — between tool description & dropzone
 *    in-content-2         responsive — below tool preview
 *    category-banner      responsive — below category hero
 *    mobile-sticky        320×50   — mobile sticky footer (toggle)
 *
 *  To activate ads:
 *    1. Replace ADS_CLIENT with your real pub-XXXXXXXXXXXXXXXX ID.
 *    2. Replace each data-ad-slot value with your real slot IDs.
 *    3. Set ADS_ENABLED = true.
 *    4. Ensure ads.txt is updated with your publisher ID.
 * ═══════════════════════════════════════════════════════════════════
 */

'use strict';

/* ── Configuration ─────────────────────────────────────────── */
export const ADS_CLIENT  = 'pub-XXXXXXXXXXXXXXXX';   // ← replace
export const ADS_ENABLED = false;                     // ← set true after AdSense approval

const SLOT_IDS = {
  'leaderboard-top':    '1111111111',   // ← replace with real slot IDs
  'leaderboard-bottom': '2222222222',
  'sidebar-top':        '3333333333',
  'sidebar-mid':        '4444444444',
  'in-content-1':       '5555555555',
  'in-content-2':       '6666666666',
  'category-banner':    '7777777777',
  'mobile-sticky':      '8888888888',
};

/* ── Slot definitions ──────────────────────────────────────── */
const SLOT_SPECS = {
  'leaderboard-top': {
    label:        'Leaderboard — Top',
    width:        728, height: 90,
    responsive:   true,
    format:       'horizontal',
    placement:    'top-of-page',
    pages:        ['all'],
    mobileFallback: { width: 320, height: 50 },
  },
  'leaderboard-bottom': {
    label:        'Leaderboard — Bottom',
    width:        728, height: 90,
    responsive:   true,
    format:       'horizontal',
    placement:    'above-footer',
    pages:        ['all'],
    mobileFallback: { width: 320, height: 50 },
  },
  'sidebar-top': {
    label:        'Sidebar Rectangle — Top',
    width:        300, height: 250,
    responsive:   false,
    format:       'rectangle',
    placement:    'sidebar',
    pages:        ['tool', 'category'],
  },
  'sidebar-mid': {
    label:        'Sidebar Rectangle — Mid',
    width:        300, height: 250,
    responsive:   false,
    format:       'rectangle',
    placement:    'sidebar',
    pages:        ['tool', 'category'],
  },
  'in-content-1': {
    label:        'In-Content — Above Tool',
    width:        'auto', height: 'auto',
    responsive:   true,
    format:       'auto',
    placement:    'in-content',
    pages:        ['tool', 'guide'],
    lazyLoad:     true,
  },
  'in-content-2': {
    label:        'In-Content — Below Preview',
    width:        'auto', height: 'auto',
    responsive:   true,
    format:       'auto',
    placement:    'in-content',
    pages:        ['tool'],
    lazyLoad:     true,
  },
  'category-banner': {
    label:        'Category Banner',
    width:        'auto', height: 'auto',
    responsive:   true,
    format:       'auto',
    placement:    'below-hero',
    pages:        ['category', 'homepage'],
  },
  'mobile-sticky': {
    label:        'Mobile Sticky Footer',
    width:        320, height: 50,
    responsive:   false,
    format:       'banner',
    placement:    'fixed-bottom',
    pages:        ['all'],
    mobileOnly:   true,
  },
};

/* ── Public API ────────────────────────────────────────────── */

/**
 * Inject the AdSense script tag if not already present.
 * Call once per page after AdSense approval.
 */
export function loadAdSenseScript() {
  if (!ADS_ENABLED) return;
  if (document.querySelector('script[data-ad-client]')) return;

  const script = document.createElement('script');
  script.async  = true;
  script.src    = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CLIENT}`;
  script.setAttribute('crossorigin', 'anonymous');
  script.setAttribute('data-ad-client', ADS_CLIENT);
  document.head.appendChild(script);
}

/**
 * Render an ad slot into `container`.
 * In development (ADS_ENABLED = false) renders a labelled placeholder.
 *
 * @param {string} slotKey  — key from SLOT_SPECS
 * @param {HTMLElement} container
 * @param {object} overrides  — optional spec overrides
 */
export function renderAdSlot(slotKey, container, overrides = {}) {
  if (!container) return;
  const spec = { ...SLOT_SPECS[slotKey], ...overrides };
  if (!spec) { console.warn(`[ads] Unknown slot key: "${slotKey}"`); return; }

  if (ADS_ENABLED) {
    _renderLiveAd(slotKey, spec, container);
  } else {
    _renderPlaceholder(slotKey, spec, container);
  }
}

/**
 * Auto-inject all ad slots on the current page by finding
 * [data-ad-slot] elements in the DOM.
 *
 * Usage in HTML:
 *   <div data-ad-slot="leaderboard-top"></div>
 */
export function autoInjectAds() {
  document.querySelectorAll('[data-ad-slot]').forEach(el => {
    const key = el.dataset.adSlot;
    renderAdSlot(key, el);
  });
  if (ADS_ENABLED) loadAdSenseScript();
}

/**
 * Build the HTML string for an ad container to embed in templates.
 * Used by generate-pages.js and generate-category-pages.js.
 */
export function adSlotHTML(slotKey, extraStyle = '') {
  const spec = SLOT_SPECS[slotKey];
  if (!spec) return '';

  const w = spec.width  !== 'auto' ? `min-height:${spec.height}px;` : 'min-height:90px;';
  const mobile = spec.mobileOnly ? 'display:none;' : '';

  return `<div data-ad-slot="${slotKey}"
     data-ad-label="${spec.label}"
     style="${mobile}${w}${extraStyle}"
     class="pxn-ad-slot pxn-ad-${slotKey}"
     aria-label="Advertisement"
     role="complementary"></div>`;
}

/* ── Private renderers ─────────────────────────────────────── */

function _renderLiveAd(slotKey, spec, container) {
  const slotId = SLOT_IDS[slotKey];
  if (!slotId) return;

  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = spec.responsive ? 'block' : 'inline-block';

  if (!spec.responsive) {
    ins.style.width  = `${spec.width}px`;
    ins.style.height = `${spec.height}px`;
  }

  ins.setAttribute('data-ad-client',  ADS_CLIENT);
  ins.setAttribute('data-ad-slot',    slotId);
  ins.setAttribute('data-ad-format',  spec.format || 'auto');

  if (spec.responsive) {
    ins.setAttribute('data-full-width-responsive', 'true');
  }
  if (spec.lazyLoad) {
    ins.setAttribute('data-ad-lazy-load', 'true');
  }

  container.innerHTML = '';
  container.appendChild(ins);

  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) { /* adsbygoogle not loaded yet */ }
}

function _renderPlaceholder(slotKey, spec, container) {
  const isResponsive = spec.responsive;
  const w = isResponsive ? '100%'   : `${spec.width}px`;
  const h = isResponsive ? '90px'   : `${spec.height}px`;

  container.innerHTML = `
    <div style="
      width:${w};min-height:${h};
      border:1.5px dashed rgba(79,70,229,.25);
      border-radius:.625rem;
      background:rgba(79,70,229,.03);
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      gap:.375rem;padding:.75rem;
      font-family:'Inter',sans-serif;
      user-select:none;pointer-events:none;
    ">
      <span style="font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:rgba(79,70,229,.5);">Ad</span>
      <span style="font-size:.65rem;color:rgba(107,114,128,.6);">${spec.label} · ${isResponsive ? 'responsive' : `${spec.width}×${spec.height}`}</span>
    </div>`;
}
