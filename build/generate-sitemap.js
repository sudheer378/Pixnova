/**
 * ═══════════════════════════════════════════════════════════════════
 *  Pixaroid — Sitemap Generator  ·  build/generate-sitemap.js
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Generates:
 *    sitemap.xml           — sitemap index (references all sub-sitemaps)
 *    sitemap-core.xml      — homepage + core pages
 *    sitemap-tools.xml     — all 67 tool pages grouped by category
 *    sitemap-categories.xml— 8 category listing pages
 *
 *  Run:   node build/generate-sitemap.js
 *  Auto:  called by `npm run build` after page generation
 *
 *  All sitemaps are written to the project root (served at /)
 *  and also copied to seo/ for archival.
 * ═══════════════════════════════════════════════════════════════════
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const SEO_DIR   = path.join(ROOT, 'seo');
const BASE      = 'https://pixaroid.vercel.app';
const TODAY     = new Date().toISOString().split('T')[0];

/* ── Import tools config ──────────────────────────────────── */
const { default: TOOLS } = await import(path.join(ROOT, 'config', 'tools-config.js'));

/* ── Priority / changefreq rules ─────────────────────────── */
const CATEGORY_PRIORITY = {
  compression:   '0.95',
  conversion:    '0.95',
  resize:        '0.90',
  editor:        '0.85',
  'ai-tools':    '0.88',
  'social-tools':'0.82',
  utilities:     '0.75',
  'bulk-tools':  '0.78',
};

// Top tools get highest priority based on search volume
const HIGH_PRIORITY_SLUGS = new Set([
  'compress-image', 'compress-image-to-20kb', 'compress-image-to-50kb',
  'compress-image-to-100kb', 'reduce-image-size', 'reduce-jpg-size',
  'jpg-to-png', 'png-to-jpg', 'jpg-to-webp', 'webp-to-jpg', 'heic-to-jpg',
  'resize-image', 'resize-passport-photo', 'resize-image-for-instagram',
  'background-remover', 'image-upscaler', 'youtube-thumbnail-maker',
  'crop-image', 'rotate-image', 'add-watermark', 'image-to-text-ocr',
]);

function toolPriority(tool) {
  if (HIGH_PRIORITY_SLUGS.has(tool.slug)) return '0.92';
  return CATEGORY_PRIORITY[tool.category] ?? '0.80';
}

function toolChangefreq(tool) {
  return HIGH_PRIORITY_SLUGS.has(tool.slug) ? 'weekly' : 'monthly';
}

/* ── XML helpers ──────────────────────────────────────────── */
function xmlHeader() {
  return `<?xml version="1.0" encoding="UTF-8"?>\n`;
}

function urlEntry(loc, lastmod, changefreq, priority, extras = '') {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${extras}
  </url>`;
}

function sitemapOpen(xmlns = '') {
  return `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${xmlns}>`;
}

function sitemapClose() {
  return `</urlset>`;
}

function write(filename, content) {
  const rootPath = path.join(ROOT, filename);
  const seoPath  = path.join(SEO_DIR, filename);
  fs.writeFileSync(rootPath, content, 'utf8');
  fs.writeFileSync(seoPath,  content, 'utf8');
  const kb = (content.length / 1024).toFixed(1);
  console.log(`  ✓ ${filename.padEnd(30)} ${String(content.split('<url>').length - 1).padStart(4)} URLs  (${kb} KB)`);
}

/* ═══════════════════════════════════════════════════════════
   1. sitemap-core.xml  — homepage + static pages
═══════════════════════════════════════════════════════════ */
const CORE_PAGES = [
  { path: '/',                     priority: '1.00', changefreq: 'daily',   title: 'Pixaroid Homepage' },
  { path: '/about.html',           priority: '0.60', changefreq: 'monthly', title: 'About' },
  { path: '/faq.html',             priority: '0.70', changefreq: 'monthly', title: 'FAQ' },
  { path: '/contact.html',         priority: '0.50', changefreq: 'yearly',  title: 'Contact' },
  { path: '/privacy-policy.html',  priority: '0.40', changefreq: 'yearly',  title: 'Privacy Policy' },
  { path: '/terms-of-service.html',priority: '0.40', changefreq: 'yearly',  title: 'Terms of Service' },
  { path: '/disclaimer.html',      priority: '0.35', changefreq: 'yearly',  title: 'Disclaimer' },
];

const coreXML = [
  xmlHeader(),
  sitemapOpen(),
  ...CORE_PAGES.map(p => urlEntry(`${BASE}${p.path}`, TODAY, p.changefreq, p.priority)),
  sitemapClose(),
].join('\n');

write('sitemap-core.xml', coreXML);

/* ═══════════════════════════════════════════════════════════
   2. sitemap-categories.xml  — 8 category listing pages
═══════════════════════════════════════════════════════════ */
const ALL_CATEGORIES = [
  'compression','conversion','resize','editor',
  'ai-tools','social-tools','utilities','bulk-tools',
];

const CATEGORY_CHANGEFREQ = {
  compression: 'weekly', conversion: 'weekly', resize: 'weekly',
  editor: 'weekly', 'ai-tools': 'weekly',
  'social-tools': 'monthly', utilities: 'monthly', 'bulk-tools': 'monthly',
};

const catXML = [
  xmlHeader(),
  sitemapOpen(),
  ...ALL_CATEGORIES.map(cat => urlEntry(
    `${BASE}/tools/${cat}/`,
    TODAY,
    CATEGORY_CHANGEFREQ[cat] ?? 'monthly',
    '0.85',
  )),
  sitemapClose(),
].join('\n');

write('sitemap-categories.xml', catXML);

/* ═══════════════════════════════════════════════════════════
   3. sitemap-tools.xml  — all 67 tool pages
     Uses xhtml:link for hreflang if i18n ever added
═══════════════════════════════════════════════════════════ */
const toolsXML = [
  xmlHeader(),
  sitemapOpen(' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'),
  ...TOOLS.map(tool => {
    const loc      = `${BASE}/tools/${tool.category}/${tool.slug}/`;
    const priority = toolPriority(tool);
    const freq     = toolChangefreq(tool);

    // Image sitemap extension — helps Google index the og:image
    const imageExtra = `
    <image:image>
      <image:loc>${BASE}/assets/images/og-default.png</image:loc>
      <image:title>${escapeXml(tool.title)}</image:title>
      <image:caption>${escapeXml(tool.description.slice(0, 120))}</image:caption>
    </image:image>`;

    return urlEntry(loc, TODAY, freq, priority, imageExtra);
  }),
  sitemapClose(),
].join('\n');

write('sitemap-tools.xml', toolsXML);

/* ═══════════════════════════════════════════════════════════
   4. sitemap.xml  — Sitemap Index (master file)
═══════════════════════════════════════════════════════════ */
const SUB_SITEMAPS = [
  'sitemap-core.xml',
  'sitemap-categories.xml',
  'sitemap-tools.xml',
];

const indexXML = [
  xmlHeader(),
  `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ...SUB_SITEMAPS.map(name => `  <sitemap>
    <loc>${BASE}/${name}</loc>
    <lastmod>${TODAY}</lastmod>
  </sitemap>`),
  `</sitemapindex>`,
].join('\n');

write('sitemap.xml', indexXML);

/* ── Summary ──────────────────────────────────────────────── */
const totalURLs = CORE_PAGES.length + ALL_CATEGORIES.length + TOOLS.length;
console.log(`\n  Total URLs indexed: ${totalURLs}`);
console.log(`  Sub-sitemaps: ${SUB_SITEMAPS.length}`);
console.log(`  Date: ${TODAY}`);

/* ── Helpers ──────────────────────────────────────────────── */
function escapeXml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
