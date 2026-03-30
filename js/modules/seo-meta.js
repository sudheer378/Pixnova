/**
 * ═══════════════════════════════════════════════════════════════════
 *  Pixaroid SEO Meta  ·  js/modules/seo-meta.js
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Dynamically injects all required SEO tags into the <head> for
 *  every tool page at runtime.  Also used by the build script to
 *  stamp static HTML.
 *
 *  Tags injected:
 *    - <title>
 *    - <meta name="description">
 *    - <link rel="canonical">
 *    - Open Graph (og:title, og:description, og:url, og:image,
 *                  og:type, og:site_name)
 *    - Twitter Card (twitter:card, twitter:site, twitter:title,
 *                    twitter:description, twitter:image)
 *    - JSON-LD: SoftwareApplication schema
 *    - JSON-LD: FAQPage schema (if tool has faqs)
 *    - JSON-LD: BreadcrumbList schema
 *    - <meta name="robots"> (index/noindex per page type)
 *
 *  Usage (runtime, tool pages):
 *    import { injectToolMeta } from '/js/modules/seo-meta.js';
 *    injectToolMeta(toolConfig);
 *
 *  Usage (build-time, generate-pages.js):
 *    import { buildToolHeadHTML } from '/js/modules/seo-meta.js';
 *    const headHTML = buildToolHeadHTML(toolConfig);
 * ═══════════════════════════════════════════════════════════════════
 */

'use strict';

const SITE = {
  name:    'Pixaroid',
  domain:  'https://pixaroid.vercel.app',
  twitter: '@pixaroidapp',
  ogImage: 'https://pixaroid.vercel.app/assets/images/og-default.png',
  logoURL: 'https://pixaroid.vercel.app/assets/svg/logo.svg',
};

const CATEGORY_LABELS = {
  compression:   'Compression',
  conversion:    'Conversion',
  resize:        'Resize',
  editor:        'Editor',
  'ai-tools':    'AI Tools',
  'social-tools':'Social Media',
  utilities:     'Utilities',
  'bulk-tools':  'Bulk Tools',
};

/* ────────────────────────────────────────────────────────────────
   Runtime injection  (call on DOMContentLoaded in tool pages)
──────────────────────────────────────────────────────────────── */
export function injectToolMeta(tool) {
  if (!tool?.slug) return;
  const head = document.head;
  const { title, description, ogTitle, ogDescription, canonical } = _buildMeta(tool);

  /* ── <title> ── */
  let titleEl = head.querySelector('title');
  if (!titleEl) { titleEl = document.createElement('title'); head.appendChild(titleEl); }
  titleEl.textContent = title;

  /* ── <meta> tags ── */
  _setMeta(head, 'name',     'description',        description);
  _setMeta(head, 'name',     'robots',             'index, follow');
  _setMeta(head, 'property', 'og:type',            'website');
  _setMeta(head, 'property', 'og:site_name',       SITE.name);
  _setMeta(head, 'property', 'og:title',           ogTitle);
  _setMeta(head, 'property', 'og:description',     ogDescription);
  _setMeta(head, 'property', 'og:url',             canonical);
  _setMeta(head, 'property', 'og:image',           SITE.ogImage);
  _setMeta(head, 'property', 'og:image:width',     '1200');
  _setMeta(head, 'property', 'og:image:height',    '630');
  _setMeta(head, 'property', 'og:image:alt',       ogTitle);
  _setMeta(head, 'name',     'twitter:card',       'summary_large_image');
  _setMeta(head, 'name',     'twitter:site',       SITE.twitter);
  _setMeta(head, 'name',     'twitter:title',      ogTitle);
  _setMeta(head, 'name',     'twitter:description',ogDescription);
  _setMeta(head, 'name',     'twitter:image',      SITE.ogImage);

  /* ── <link rel="canonical"> ── */
  let canon = head.querySelector('link[rel="canonical"]');
  if (!canon) { canon = document.createElement('link'); canon.rel = 'canonical'; head.appendChild(canon); }
  canon.href = canonical;

  /* ── JSON-LD schemas ── */
  _injectSchema(head, 'schema-app',        _buildAppSchema(tool, canonical));
  if (tool.faqs?.length) {
    _injectSchema(head, 'schema-faq',      _buildFAQSchema(tool.faqs));
  }
  _injectSchema(head, 'schema-breadcrumb', _buildBreadcrumbSchema(tool, canonical));
}

/* ────────────────────────────────────────────────────────────────
   Build-time HTML string  (used by generate-pages.js)
──────────────────────────────────────────────────────────────── */
export function buildToolHeadHTML(tool) {
  const { title, description, ogTitle, ogDescription, canonical } = _buildMeta(tool);
  const catLabel = CATEGORY_LABELS[tool.category] ?? tool.category;

  const lines = [
    `<meta charset="UTF-8" />`,
    `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    ``,
    `<!-- Primary SEO -->`,
    `<title>${_esc(title)}</title>`,
    `<meta name="description" content="${_esc(description)}" />`,
    `<meta name="robots" content="index, follow" />`,
    `<link rel="canonical" href="${_esc(canonical)}" />`,
    ``,
    `<!-- Open Graph -->`,
    `<meta property="og:type"        content="website" />`,
    `<meta property="og:site_name"   content="${_esc(SITE.name)}" />`,
    `<meta property="og:title"       content="${_esc(ogTitle)}" />`,
    `<meta property="og:description" content="${_esc(ogDescription)}" />`,
    `<meta property="og:url"         content="${_esc(canonical)}" />`,
    `<meta property="og:image"       content="${_esc(SITE.ogImage)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height"content="630" />`,
    `<meta property="og:image:alt"   content="${_esc(ogTitle)}" />`,
    ``,
    `<!-- Twitter Card -->`,
    `<meta name="twitter:card"        content="summary_large_image" />`,
    `<meta name="twitter:site"        content="${_esc(SITE.twitter)}" />`,
    `<meta name="twitter:title"       content="${_esc(ogTitle)}" />`,
    `<meta name="twitter:description" content="${_esc(ogDescription)}" />`,
    `<meta name="twitter:image"       content="${_esc(SITE.ogImage)}" />`,
    ``,
    `<!-- Favicon -->`,
    `<link rel="icon" href="/assets/svg/favicon.svg" type="image/svg+xml" />`,
    `<link rel="apple-touch-icon" href="/assets/images/apple-touch-icon.png" />`,
    ``,
    `<!-- Fonts -->`,
    `<link rel="preconnect" href="https://fonts.googleapis.com" />`,
    `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />`,
    `<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />`,
    ``,
    `<!-- PWA -->`,
    `<link rel="manifest" href="/manifest.json" />`,
    `<meta name="theme-color" content="#4F46E5" />`,
    ``,
    `<!-- JSON-LD: SoftwareApplication -->`,
    `<script type="application/ld+json">`,
    JSON.stringify(_buildAppSchema(tool, canonical), null, 2),
    `</script>`,
  ];

  if (tool.faqs?.length) {
    lines.push(
      ``,
      `<!-- JSON-LD: FAQPage -->`,
      `<script type="application/ld+json">`,
      JSON.stringify(_buildFAQSchema(tool.faqs), null, 2),
      `</script>`,
    );
  }

  lines.push(
    ``,
    `<!-- JSON-LD: BreadcrumbList -->`,
    `<script type="application/ld+json">`,
    JSON.stringify(_buildBreadcrumbSchema(tool, canonical), null, 2),
    `</script>`,
  );

  return lines.join('\n');
}

/* ────────────────────────────────────────────────────────────────
   Build meta values from tool config
──────────────────────────────────────────────────────────────── */
function _buildMeta(tool) {
  const catLabel = CATEGORY_LABELS[tool.category] ?? tool.category;
  const canonical = `${SITE.domain}/tools/${tool.category}/${tool.slug}/`;

  // Title: "Tool Name — Free Online Tool | Pixaroid"
  const title = `${tool.title} — Free Online ${catLabel} Tool | ${SITE.name}`;

  // OG title: shorter, punchier
  const ogTitle = tool.ogTitle
    ? `${tool.ogTitle} | ${SITE.name}`
    : `${tool.title} — Free & Instant | ${SITE.name}`;

  // Description: from config, max 160 chars
  const description = _truncate(tool.description, 160);

  // OG description: from config or truncated description, max 200 chars
  const ogDescription = _truncate(tool.ogDescription || tool.description, 200);

  return { title, ogTitle, description, ogDescription, canonical };
}

/* ────────────────────────────────────────────────────────────────
   JSON-LD schema builders
──────────────────────────────────────────────────────────────── */
function _buildAppSchema(tool, url) {
  const catLabel = CATEGORY_LABELS[tool.category] ?? tool.category;

  return {
    '@context': 'https://schema.org',
    '@type':    'SoftwareApplication',
    'name':          tool.title,
    'description':   tool.description,
    'url':           url,
    'applicationCategory': 'MultimediaApplication',
    'applicationSubCategory': catLabel,
    'operatingSystem': 'Web Browser',
    'browserRequirements': 'Requires JavaScript. Supports Chrome 90+, Firefox 88+, Safari 14+, Edge 90+.',
    'offers': {
      '@type':    'Offer',
      'price':    '0',
      'priceCurrency': 'USD',
      'availability': 'https://schema.org/InStock',
    },
    'featureList': (tool.instructions || []).join(' '),
    'screenshot': SITE.ogImage,
    'provider': {
      '@type': 'Organization',
      'name':  SITE.name,
      'url':   SITE.domain,
      'logo':  SITE.logoURL,
    },
    'author': {
      '@type': 'Organization',
      'name':  SITE.name,
      'url':   SITE.domain,
    },
    'inLanguage': 'en',
    'dateModified': new Date().toISOString().split('T')[0],
  };
}

function _buildFAQSchema(faqs) {
  return {
    '@context':  'https://schema.org',
    '@type':     'FAQPage',
    'mainEntity': faqs.map(f => ({
      '@type':       'Question',
      'name':        f.q,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text':  f.a,
      },
    })),
  };
}

function _buildBreadcrumbSchema(tool, url) {
  const catLabel = CATEGORY_LABELS[tool.category] ?? tool.category;
  return {
    '@context': 'https://schema.org',
    '@type':    'BreadcrumbList',
    'itemListElement': [
      {
        '@type':    'ListItem',
        'position': 1,
        'name':     'Home',
        'item':     SITE.domain + '/',
      },
      {
        '@type':    'ListItem',
        'position': 2,
        'name':     catLabel,
        'item':     `${SITE.domain}/tools/${tool.category}/`,
      },
      {
        '@type':    'ListItem',
        'position': 3,
        'name':     tool.title,
        'item':     url,
      },
    ],
  };
}

/* ────────────────────────────────────────────────────────────────
   DOM helpers
──────────────────────────────────────────────────────────────── */
function _setMeta(head, attrName, attrVal, content) {
  const selector = `meta[${attrName}="${attrVal}"]`;
  let el = head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrVal);
    head.appendChild(el);
  }
  el.content = content;
}

function _injectSchema(head, id, schemaObj) {
  const existing = head.querySelector(`script[data-schema="${id}"]`);
  if (existing) existing.remove();
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.dataset.schema = id;
  script.textContent = JSON.stringify(schemaObj, null, 2);
  head.appendChild(script);
}

/* ────────────────────────────────────────────────────────────────
   String helpers
──────────────────────────────────────────────────────────────── */
function _truncate(str, max) {
  if (!str) return '';
  if (str.length <= max) return str;
  return str.slice(0, max - 1).trimEnd() + '…';
}

function _esc(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
