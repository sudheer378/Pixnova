/**
 * ═══════════════════════════════════════════════════════════════════
 *  Pixaroid — Internal Links  ·  js/modules/internal-links.js
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Provides runtime data and DOM helpers for internal linking.
 *
 *  Exports:
 *    POPULAR_TOOLS         – curated top-12 list
 *    getRelatedTools(slug) – 5 related tools for a given slug
 *    getSameCategory(slug) – up to 5 tools from same category
 *    buildRelatedPanel(slug, container)   – renders related panel
 *    buildPopularPanel(container)         – renders popular panel
 *    buildCategoryStrip(category, container) – inline category strip
 *    injectToolLinks(toolConfig)          – auto-builds both panels
 *                                           for tool pages
 * ═══════════════════════════════════════════════════════════════════
 */

'use strict';

/* ────────────────────────────────────────────────────────────────
   Curated popular tools list  (hand-ranked by search volume)
──────────────────────────────────────────────────────────────── */
export const POPULAR_TOOLS = [
  { slug:'compress-image',      category:'compression',  title:'Compress Image',          badge:'',     color:'indigo' },
  { slug:'jpg-to-png',          category:'conversion',   title:'JPG to PNG',               badge:'',     color:'violet' },
  { slug:'background-remover',  category:'ai-tools',     title:'Background Remover',       badge:'AI',   color:'rose' },
  { slug:'resize-image',        category:'resize',       title:'Resize Image',             badge:'',     color:'emerald' },
  { slug:'webp-to-jpg',         category:'conversion',   title:'WebP to JPG',              badge:'',     color:'violet' },
  { slug:'image-upscaler',      category:'ai-tools',     title:'AI Upscaler',              badge:'AI',   color:'rose' },
  { slug:'heic-to-jpg',         category:'conversion',   title:'HEIC to JPG',              badge:'',     color:'violet' },
  { slug:'compress-image-to-20kb',category:'compression',title:'Compress to 20KB',         badge:'',     color:'indigo' },
  { slug:'youtube-thumbnail-maker',category:'social-tools',title:'YouTube Thumbnail',      badge:'New',  color:'sky' },
  { slug:'crop-image',          category:'editor',       title:'Crop Image',               badge:'',     color:'amber' },
  { slug:'image-to-text-ocr',   category:'ai-tools',     title:'Image to Text (OCR)',      badge:'AI',   color:'rose' },
  { slug:'resize-passport-photo',category:'resize',      title:'Passport Photo Resizer',   badge:'',     color:'emerald' },
];

/* ────────────────────────────────────────────────────────────────
   Full tool registry  (slug → { category, title, description })
   Built lazily from the tools-config import
──────────────────────────────────────────────────────────────── */
let _registry = null;

async function _getRegistry() {
  if (_registry) return _registry;
  try {
    const { default: tools } = await import('/config/tools-config.js');
    _registry = new Map(tools.map(t => [t.slug, t]));
  } catch {
    // Fallback: build a minimal registry from POPULAR_TOOLS
    _registry = new Map(POPULAR_TOOLS.map(t => [t.slug, t]));
  }
  return _registry;
}

/* ────────────────────────────────────────────────────────────────
   Data accessors
──────────────────────────────────────────────────────────────── */

/**
 * Returns up to `limit` related tools for a slug.
 * Pulls from the tool's own relatedTools array in config,
 * then fills from same-category tools if needed.
 */
export async function getRelatedTools(slug, limit = 5) {
  const reg  = await _getRegistry();
  const tool = reg.get(slug);
  if (!tool) return [];

  const related = (tool.relatedTools || [])
    .map(s => reg.get(s))
    .filter(Boolean);

  if (related.length >= limit) return related.slice(0, limit);

  // Fill with same-category tools (excluding self + already included)
  const seen = new Set([slug, ...related.map(t => t.slug)]);
  for (const [s, t] of reg) {
    if (related.length >= limit) break;
    if (!seen.has(s) && t.category === tool.category) {
      related.push(t); seen.add(s);
    }
  }
  return related.slice(0, limit);
}

/**
 * Returns up to `limit` tools from the same category (excluding self).
 */
export async function getSameCategory(slug, limit = 5) {
  const reg  = await _getRegistry();
  const tool = reg.get(slug);
  if (!tool) return [];
  return [...reg.values()]
    .filter(t => t.category === tool.category && t.slug !== slug)
    .slice(0, limit);
}

/**
 * Returns tools for a given category slug.
 */
export async function getCategoryTools(category) {
  const reg = await _getRegistry();
  return [...reg.values()].filter(t => t.category === category);
}

/* ────────────────────────────────────────────────────────────────
   Color map
──────────────────────────────────────────────────────────────── */
const CAT_COLORS = {
  compression:   { bg:'rgba(79,70,229,.1)',   text:'#4F46E5',  dark:'rgba(79,70,229,.25)'  },
  conversion:    { bg:'rgba(139,92,246,.1)',  text:'#8B5CF6',  dark:'rgba(139,92,246,.25)' },
  resize:        { bg:'rgba(16,185,129,.1)',  text:'#10B981',  dark:'rgba(16,185,129,.25)' },
  editor:        { bg:'rgba(245,158,11,.1)',  text:'#F59E0B',  dark:'rgba(245,158,11,.25)' },
  'ai-tools':    { bg:'rgba(244,63,94,.1)',   text:'#F43F5E',  dark:'rgba(244,63,94,.25)'  },
  'social-tools':{ bg:'rgba(14,165,233,.1)',  text:'#0EA5E9',  dark:'rgba(14,165,233,.25)' },
  utilities:     { bg:'rgba(6,182,212,.1)',   text:'#06B6D4',  dark:'rgba(6,182,212,.25)'  },
  'bulk-tools':  { bg:'rgba(20,184,166,.1)',  text:'#14B8A6',  dark:'rgba(20,184,166,.25)' },
};

function _colorFor(category) {
  return CAT_COLORS[category] ?? CAT_COLORS.compression;
}

const BADGE_STYLES = {
  'AI':  'background:rgba(244,63,94,.1);color:#F43F5E;',
  'New': 'background:rgba(6,182,212,.1);color:#06B6D4;',
  'Hot': 'background:rgba(245,158,11,.1);color:#F59E0B;',
};

/* ────────────────────────────────────────────────────────────────
   DOM renderers
──────────────────────────────────────────────────────────────── */

/**
 * Renders the "Related Tools" sidebar card into `container`.
 * Guarantees at least 5 links.
 */
export async function buildRelatedPanel(slug, container) {
  if (!container) return;
  const tools = await getRelatedTools(slug, 6);
  if (!tools.length) return;

  container.innerHTML = `
    <div class="link-panel" style="background:var(--surface);border:1px solid var(--border);border-radius:1rem;padding:1.25rem;">
      <div class="link-panel-title" style="font-family:'Poppins',sans-serif;font-weight:600;font-size:.9375rem;margin-bottom:.875rem;">Related Tools</div>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:.375rem;">
        ${tools.map(t => _toolLinkItem(t)).join('')}
      </ul>
    </div>`;
}

/**
 * Renders the "Popular Tools" sidebar card into `container`.
 */
export function buildPopularPanel(container) {
  if (!container) return;
  const tools = POPULAR_TOOLS.slice(0, 8);

  container.innerHTML = `
    <div class="link-panel" style="background:var(--surface);border:1px solid var(--border);border-radius:1rem;padding:1.25rem;margin-top:1rem;">
      <div class="link-panel-title" style="font-family:'Poppins',sans-serif;font-weight:600;font-size:.9375rem;margin-bottom:.875rem;">Popular Tools</div>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:.375rem;">
        ${tools.map(t => _toolLinkItem(t, true)).join('')}
      </ul>
      <a href="/" style="display:block;margin-top:.875rem;text-align:center;font-size:.8125rem;color:#4F46E5;font-weight:600;">
        View all 67 tools →
      </a>
    </div>`;
}

/**
 * Renders a horizontal "More in [Category]" strip.
 * Placed below the tool card.
 */
export async function buildCategoryStrip(slug, container) {
  if (!container) return;
  const reg  = await _getRegistry();
  const tool = reg.get(slug);
  if (!tool) return;

  const peers = await getSameCategory(slug, 5);
  if (!peers.length) return;

  const col = _colorFor(tool.category);
  const catLabel = _catLabel(tool.category);

  container.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:1rem;padding:1.5rem;margin-top:1.5rem;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem;">
        <span style="font-family:'Poppins',sans-serif;font-weight:600;font-size:.9375rem;">
          More ${catLabel} Tools
        </span>
        <a href="/tools/${tool.category}/"
           style="font-size:.8125rem;font-weight:600;color:${col.text};">
          See all ${catLabel} tools →
        </a>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:.625rem;">
        ${peers.map(t => _toolCard(t, col)).join('')}
      </div>
    </div>`;
}

/* ────────────────────────────────────────────────────────────────
   Auto-inject on tool pages
   Call with the tool's config object after DOMContentLoaded.
──────────────────────────────────────────────────────────────── */
export async function injectToolLinks(toolConfig) {
  if (!toolConfig?.slug) return;

  // Sidebar: related tools
  const relatedContainer  = document.getElementById('related-tools-panel');
  const popularContainer  = document.getElementById('popular-tools-panel');
  const categoryContainer = document.getElementById('category-strip');

  if (relatedContainer)  await buildRelatedPanel(toolConfig.slug, relatedContainer);
  if (popularContainer)       buildPopularPanel(popularContainer);
  if (categoryContainer) await buildCategoryStrip(toolConfig.slug, categoryContainer);

  // Fallback: if the template used the static #related-list, also hydrate it
  const staticList = document.getElementById('related-list');
  if (staticList) {
    const tools = await getRelatedTools(toolConfig.slug, 6);
    staticList.innerHTML = tools.map(t =>
      `<li><a href="/tools/${t.category}/${t.slug}/" style="display:flex;align-items:center;gap:.5rem;padding:.5rem .625rem;border-radius:.5rem;font-size:.875rem;color:var(--text);transition:background .2s;">
        <span style="width:6px;height:6px;border-radius:50%;background:#4F46E5;flex-shrink:0;opacity:.6;"></span>
        ${t.title}
      </a></li>`
    ).join('');
  }
}

/* ────────────────────────────────────────────────────────────────
   Private DOM helpers
──────────────────────────────────────────────────────────────── */
function _toolLinkItem(t, showBadge = false) {
  const col   = _colorFor(t.category);
  const badge = showBadge && t.badge
    ? `<span style="font-size:.65rem;font-weight:700;padding:.1rem .4rem;border-radius:999px;${BADGE_STYLES[t.badge]||''}">${t.badge}</span>`
    : '';
  return `<li>
    <a href="/tools/${t.category}/${t.slug}/"
       style="display:flex;align-items:center;gap:.5rem;padding:.5rem .625rem;border-radius:.625rem;font-size:.8125rem;color:var(--text);transition:background .15s,color .15s;text-decoration:none;"
       onmouseover="this.style.background='${col.bg}';this.style.color='${col.text}'"
       onmouseout="this.style.background='';this.style.color='var(--text)'">
      <span style="width:5px;height:5px;border-radius:50%;background:${col.text};flex-shrink:0;"></span>
      <span style="flex:1;">${t.title}</span>
      ${badge}
    </a>
  </li>`;
}

function _toolCard(t, col) {
  return `<a href="/tools/${t.category}/${t.slug}/"
    style="display:block;padding:.75rem;border-radius:.75rem;border:1px solid var(--border);background:var(--bg);font-size:.8125rem;font-weight:500;color:var(--text);transition:border-color .2s,box-shadow .2s;text-decoration:none;"
    onmouseover="this.style.borderColor='${col.text}';this.style.boxShadow='0 2px 12px rgba(0,0,0,.08)'"
    onmouseout="this.style.borderColor='var(--border)';this.style.boxShadow=''">
    <span style="display:block;width:28px;height:28px;border-radius:.5rem;margin-bottom:.5rem;background:${col.bg};"></span>
    ${t.title}
  </a>`;
}

function _catLabel(cat) {
  const labels = {
    compression:'Compression', conversion:'Conversion', resize:'Resize',
    editor:'Editor','ai-tools':'AI','social-tools':'Social',
    utilities:'Utility','bulk-tools':'Bulk',
  };
  return labels[cat] ?? cat;
}
