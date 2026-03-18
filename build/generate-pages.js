/**
 * ═══════════════════════════════════════════════════════════════════
 *  Pixaroid Build — Page Generator  ·  build/generate-pages.js
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Generates one static HTML file per tool:
 *    dist/tools/<category>/<slug>/index.html
 *
 *  Each page includes:
 *    ✓ <title> tag
 *    ✓ <meta name="description">
 *    ✓ <link rel="canonical">
 *    ✓ Open Graph tags  (og:title, og:description, og:url, og:image)
 *    ✓ Twitter Card tags
 *    ✓ JSON-LD SoftwareApplication schema
 *    ✓ JSON-LD FAQPage schema  (if tool has faqs)
 *    ✓ JSON-LD BreadcrumbList schema
 *    ✓ How-to steps, related tools, FAQ accordion
 *    ✓ Tool interface scaffolding from tool-template.html
 *
 *  Usage:   node build/generate-pages.js
 *  Output:  dist/tools/**\/index.html  (67 files)
 * ═══════════════════════════════════════════════════════════════════
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const DIST = ROOT;

/* ── Load configs ─────────────────────────────────────────── */
const { default: TOOLS }      = await import(path.join(ROOT,'config','tools-config.js'));
const { default: SEO_CONFIG } = await import(path.join(ROOT,'config','seo-config.js'));

const TEMPLATE = fs.readFileSync(path.join(ROOT,'templates','tool-template.html'),'utf8');
const toolMap  = Object.fromEntries(TOOLS.map(t => [t.slug, t]));

/* ── Constants ────────────────────────────────────────────── */
const BASE_DOMAIN = SEO_CONFIG.site.domain;

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

const ACCEPTED_FORMAT_LABELS = {
  'image/jpeg':'JPG', 'image/png':'PNG', 'image/webp':'WebP',
  'image/gif':'GIF',  'image/avif':'AVIF','image/bmp':'BMP',
  'image/tiff':'TIFF','image/heic':'HEIC','image/heif':'HEIF',
  'application/pdf':'PDF',
};

const HIGH_PRIORITY_SLUGS = new Set([
  'compress-image','compress-image-to-20kb','compress-image-to-50kb',
  'compress-image-to-100kb','reduce-image-size','reduce-jpg-size',
  'jpg-to-png','png-to-jpg','jpg-to-webp','webp-to-jpg','heic-to-jpg',
  'resize-image','resize-passport-photo','resize-image-for-instagram',
  'background-remover','image-upscaler','youtube-thumbnail-maker',
  'crop-image','rotate-image','add-watermark','image-to-text-ocr',
]);

/* ── Helpers ──────────────────────────────────────────────── */
function esc(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function truncate(s, n) {
  if (!s || s.length <= n) return s || '';
  return s.slice(0, n-1).trimEnd() + '…';
}

function buildTitle(tool, catLabel) {
  return `${tool.title} — Free Online ${catLabel} Tool | ${SEO_CONFIG.site.name}`;
}

function buildOgTitle(tool) {
  return tool.ogTitle
    ? `${tool.ogTitle} | ${SEO_CONFIG.site.name}`
    : `${tool.title} — Free & Instant | ${SEO_CONFIG.site.name}`;
}

/* ── Schema builders ──────────────────────────────────────── */
function buildAppSchema(tool, url, catLabel) {
  return {
    '@context':'https://schema.org','@type':'SoftwareApplication',
    name:        tool.title,
    description: tool.description,
    url,
    applicationCategory:    'MultimediaApplication',
    applicationSubCategory: catLabel,
    operatingSystem:        'Web Browser',
    browserRequirements:    'Requires JavaScript. Chrome 90+, Firefox 88+, Safari 14+, Edge 90+.',
    offers: { '@type':'Offer', price:'0', priceCurrency:'USD', availability:'https://schema.org/InStock' },
    featureList:  (tool.instructions||[]).join(' '),
    screenshot:   SEO_CONFIG.ogImage.url,
    provider: SEO_CONFIG.organization,
    author:   SEO_CONFIG.organization,
    inLanguage:   'en',
    dateModified: new Date().toISOString().split('T')[0],
  };
}

function buildFAQSchema(faqs) {
  return {
    '@context':'https://schema.org','@type':'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type':'Question', name: f.q,
      acceptedAnswer: { '@type':'Answer', text: f.a },
    })),
  };
}

function buildBreadcrumbSchema(tool, url, catLabel) {
  return {
    '@context':'https://schema.org','@type':'BreadcrumbList',
    itemListElement:[
      { '@type':'ListItem','position':1, name:'Home',    item:`${BASE_DOMAIN}/` },
      { '@type':'ListItem','position':2, name:catLabel,  item:`${BASE_DOMAIN}/tools/${tool.category}/` },
      { '@type':'ListItem','position':3, name:tool.title,item:url },
    ],
  };
}

/* ── Content builders ─────────────────────────────────────── */
function buildHeadHTML(tool) {
  const catLabel  = CATEGORY_LABELS[tool.category] ?? tool.category;
  const canonical = `${BASE_DOMAIN}/tools/${tool.category}/${tool.slug}/`;
  const title     = buildTitle(tool, catLabel);
  const ogTitle   = buildOgTitle(tool);
  const desc      = esc(truncate(tool.description, 160));
  const ogDesc    = esc(truncate(tool.ogDescription || tool.description, 200));
  const ogImg     = SEO_CONFIG.ogImage.url;
  const ogImgAlt  = esc(ogTitle);

  const schemaLines = [
    `<script type="application/ld+json">`,
    JSON.stringify(buildAppSchema(tool, canonical, catLabel), null, 2),
    `</script>`,
  ];

  if (tool.faqs?.length) {
    schemaLines.push(
      `<script type="application/ld+json">`,
      JSON.stringify(buildFAQSchema(tool.faqs), null, 2),
      `</script>`,
    );
  }

  schemaLines.push(
    `<script type="application/ld+json">`,
    JSON.stringify(buildBreadcrumbSchema(tool, canonical, catLabel), null, 2),
    `</script>`,
  );

  const verif = SEO_CONFIG.verification || {};

  return `<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<!-- Primary SEO -->
<title>${esc(title)}</title>
<meta name="description"          content="${desc}" />
<meta name="robots"               content="index, follow" />
<link rel="canonical"             href="${esc(canonical)}" />
${verif.google ? `<meta name="google-site-verification" content="${esc(verif.google)}" />` : ''}
${verif.bing   ? `<meta name="msvalidate.01"            content="${esc(verif.bing)}" />` : ''}

<!-- Open Graph -->
<meta property="og:type"          content="website" />
<meta property="og:site_name"     content="${esc(SEO_CONFIG.site.name)}" />
<meta property="og:title"         content="${esc(ogTitle)}" />
<meta property="og:description"   content="${esc(truncate(tool.ogDescription||tool.description,200))}" />
<meta property="og:url"           content="${esc(canonical)}" />
<meta property="og:image"         content="${esc(ogImg)}" />
<meta property="og:image:width"   content="1200" />
<meta property="og:image:height"  content="630" />
<meta property="og:image:alt"     content="${ogImgAlt}" />
<meta property="og:locale"        content="en_US" />

<!-- Twitter Card -->
<meta name="twitter:card"         content="summary_large_image" />
<meta name="twitter:site"         content="${esc(SEO_CONFIG.site.twitter)}" />
<meta name="twitter:title"        content="${esc(ogTitle)}" />
<meta name="twitter:description"  content="${esc(truncate(tool.ogDescription||tool.description,200))}" />
<meta name="twitter:image"        content="${esc(ogImg)}" />

<!-- Favicon & PWA -->
<link rel="icon"             href="/assets/svg/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/assets/images/apple-touch-icon.png" />
<link rel="manifest"         href="/manifest.json" />
<meta name="theme-color"          content="#4F46E5" />

<!-- Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />

<!-- JSON-LD Schemas -->
${schemaLines.join('\n')}`;
}

function buildHowSteps(instructions) {
  return (instructions||[]).map((s,i) => `
  <div class="hst">
    <div class="hn">0${i+1}</div>
    <div class="ht2">${esc(s)}</div>
  </div>`).join('\n');
}

function buildFAQHTML(faqs) {
  return (faqs||[]).map((f,i) => `
  <div class="fi${i===0?' O':''}">
    <button class="fq">${esc(f.q)}
      <span class="fqi"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
    </button>
    <div class="fa"${i===0?' style="max-height:400px"':''}><div class="fai">${esc(f.a)}</div></div>
  </div>`).join('\n');
}

function buildRelatedHTML(tool) {
  return (tool.relatedTools||[]).slice(0,5).map(slug => {
    const rt = toolMap[slug];
    if (!rt) return '';
    return `<li><a href="/tools/${rt.category}/${rt.slug}/">${esc(rt.title)}</a></li>`;
  }).join('\n');
}

function stamp(tpl, vars) {
  return Object.entries(vars).reduce((t,[k,v]) => t.replaceAll(`{{${k}}}`, v ?? ''), tpl);
}


/* ── Build injectable schemas for <!--INJECT_FAQ_SCHEMA--> ── */
function _buildInjectSchemas(tool, canonical, catLabel) {
  const parts = [];
  if (tool.faqs?.length) {
    parts.push(
      `<script type="application/ld+json">\n${JSON.stringify({
        '@context':'https://schema.org','@type':'FAQPage',
        mainEntity: tool.faqs.map(f => ({
          '@type':'Question','name':f.q,
          acceptedAnswer:{'@type':'Answer','text':f.a}
        }))
      }, null, 2)}\n</script>`
    );
  }
  parts.push(
    `<script type="application/ld+json">\n${JSON.stringify({
      '@context':'https://schema.org','@type':'BreadcrumbList',
      itemListElement:[
        {'@type':'ListItem','position':1,'name':'Home','item':`${BASE_DOMAIN}/`},
        {'@type':'ListItem','position':2,'name':catLabel,'item':`${BASE_DOMAIN}/tools/${tool.category}/`},
        {'@type':'ListItem','position':3,'name':tool.title,'item':canonical},
      ]
    }, null, 2)}\n</script>`
  );
  return parts.join('\n');
}

/* ── Generate pages ───────────────────────────────────────── */
let generated = 0;
console.log(`Generating ${TOOLS.length} tool pages…\n`);

for (const tool of TOOLS) {
  const catLabel  = CATEGORY_LABELS[tool.category] ?? tool.category;
  const outDir    = path.join(DIST, 'tools', tool.category, tool.slug);
  fs.mkdirSync(outDir, { recursive: true });

  const acceptInput = (tool.acceptedFormats||[]).join(',');
  const acceptLabel = (tool.acceptedFormats||[]).map(f => ACCEPTED_FORMAT_LABELS[f]||f).join(', ') || 'Images';

  const canonical  = `${BASE_DOMAIN}/tools/${tool.category}/${tool.slug}/`;
  const injectSchemas = _buildInjectSchemas(tool, canonical, catLabel);
  const headHTML   = buildHeadHTML(tool);

  const page = stamp(TEMPLATE, {
    TOOL_SLUG:              tool.slug,
    INTERFACE_TYPE:         tool.interfaceType || 'compress',
    PROCESS_BUTTON_LABEL:   (() => {
      const m = {'compress':'Compress Image','compress-target':'Compress to Target','convert':'Convert Image','convert-multi':'Convert Image','resize':'Resize Image','resize-social':'Resize Image','social-canvas':'Resize Image','crop':'Crop Image','rotate':'Rotate Image','flip':'Flip Image','watermark':'Add Watermark','text-overlay':'Add Text','blur':'Apply Blur','sharpen':'Sharpen','adjust':'Apply Adjustments','ai-bg-remove':'Remove Background','ai-upscale':'Upscale Image','ai-enhance':'Enhance Photo','ai-sharpen':'Sharpen with AI','ai-colorize':'Colorize Photo','ai-ocr':'Extract Text','bulk':'Process All','info':'Analyse Image','metadata':'View Metadata','palette':'Extract Palette'};
      return m[tool.interfaceType] || 'Process Image';
    })(),
    TOOL_CATEGORY:          tool.category,
    TOOL_CATEGORY_LABEL:    catLabel,
    TOOL_TITLE:             esc(tool.title),
    TOOL_DESCRIPTION:       esc(tool.description),
    TOOL_OG_TITLE:          esc(buildOgTitle(tool)),
    TOOL_OG_DESCRIPTION:    esc(truncate(tool.ogDescription||tool.description, 200)),
    ACCEPTED_FORMATS:       acceptInput,
    ACCEPTED_FORMATS_LABEL: acceptLabel,
    HOW_TO_STEPS:           buildHowSteps(tool.instructions),
    RELATED_TOOLS_HTML:     buildRelatedHTML(tool),
    FAQ_HTML:               buildFAQHTML(tool.faqs),
    INJECT_FAQ_SCHEMA:      injectSchemas,
  });

  // Replace the <head>…</head> placeholder with fully stamped head
  const pageWithHead    = page.replace('<!--HEAD_PLACEHOLDER-->', headHTML);
  const finalPage       = pageWithHead.replace('<!--INJECT_FAQ_SCHEMA-->', injectSchemas);

  fs.writeFileSync(path.join(outDir,'index.html'), finalPage, 'utf8');
  generated++;

  const priority = HIGH_PRIORITY_SLUGS.has(tool.slug) ? '★' : ' ';
  if (generated % 10 === 0 || generated === TOOLS.length) {
    process.stdout.write(`  ${priority} [${String(generated).padStart(2)}/${TOOLS.length}] ${tool.category}/${tool.slug}\n`);
  }
}

console.log(`\n✓ Generated ${generated} tool pages → tools/`);
