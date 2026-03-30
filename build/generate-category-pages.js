/**
 * Pixaroid — Category Page Generator
 * Generates one HTML page per category into /tools/<category>/index.html
 * and also the short aliases /compress/, /convert/, etc.
 */
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT  = path.resolve(__dirname, '..');
const DIST = ROOT;
const BASE  = 'https://pixaroid.vercel.app';

const { default: TOOLS }      = await import(path.join(ROOT,'config','tools-config.js'));
const { default: SEO_CONFIG } = await import(path.join(ROOT,'config','seo-config.js'));

const CATEGORIES = [
  {
    slug:     'compression',
    label:    'Compression',
    short:    'compress',
    icon:     't-compress',
    color:    '#4F46E5',
    colorBg:  'rgba(79,70,229,.08)',
    headline: 'Image Compression Tools',
    sub:      'Reduce file sizes by up to 90% without losing visible quality. Works with JPEG, PNG, WebP, GIF, AVIF — all in your browser.',
  },
  {
    slug:     'conversion',
    label:    'Conversion',
    short:    'convert',
    icon:     't-convert',
    color:    '#8B5CF6',
    colorBg:  'rgba(139,92,246,.08)',
    headline: 'Image Format Conversion',
    sub:      'Convert between 13 format pairs — JPG, PNG, WebP, HEIC, AVIF, BMP, TIFF, ICO, PDF and more. Instant, browser-based.',
  },
  {
    slug:     'resize',
    label:    'Resize',
    short:    'resize',
    icon:     't-resize',
    color:    '#10B981',
    colorBg:  'rgba(16,185,129,.08)',
    headline: 'Image Resize Tools',
    sub:      'Resize by pixels, percentage, or social media presets. Instagram, YouTube, LinkedIn, passport photos and more.',
  },
  {
    slug:     'editor',
    label:    'Editor',
    short:    'editor',
    icon:     't-editor',
    color:    '#F59E0B',
    colorBg:  'rgba(245,158,11,.08)',
    headline: 'Online Image Editor',
    sub:      'Crop, rotate, flip, adjust brightness, contrast and saturation. Add watermarks and text overlays. All in your browser.',
  },
  {
    slug:     'ai-tools',
    label:    'AI Tools',
    short:    'ai',
    icon:     't-ai',
    color:    '#F43F5E',
    colorBg:  'rgba(244,63,94,.08)',
    headline: 'AI-Powered Image Tools',
    sub:      'Background removal, 4× upscaling, photo enhancement, colourisation, OCR. On-device AI — no server uploads.',
  },
  {
    slug:     'social-tools',
    label:    'Social Media',
    short:    'social',
    icon:     't-social',
    color:    '#0EA5E9',
    colorBg:  'rgba(14,165,233,.08)',
    headline: 'Social Media Image Tools',
    sub:      'Create pixel-perfect images for YouTube, Instagram, Facebook, Twitter, LinkedIn, and WhatsApp.',
  },
  {
    slug:     'utilities',
    label:    'Utilities',
    short:    'utilities',
    icon:     't-ai',
    color:    '#06B6D4',
    colorBg:  'rgba(6,182,212,.08)',
    headline: 'Image Utility Tools',
    sub:      'Check file size, view EXIF metadata, generate colour palettes, calculate aspect ratios and more.',
  },
  {
    slug:     'bulk-tools',
    label:    'Bulk Tools',
    short:    'bulk',
    icon:     't-bulk',
    color:    '#14B8A6',
    colorBg:  'rgba(20,184,166,.08)',
    headline: 'Bulk Image Processing',
    sub:      'Process up to 100 images at once. Bulk compress, resize, convert and watermark. Download as a single ZIP.',
  },
];

/* ── HTML generation ────────────────────────────────────────── */
function buildCategoryPage(cat, tools) {
  const canonical = `${BASE}/tools/${cat.slug}/`;
  const seoMeta   = (SEO_CONFIG.categories?.[cat.slug]) || {};
  const title     = seoMeta.title       || `${cat.label} Tools — Free Online | Pixaroid`;
  const desc      = seoMeta.description || `Free online ${cat.label.toLowerCase()} tools. ${cat.sub}`;
  const ogTitle   = seoMeta.ogTitle     || title;
  const ogDesc    = seoMeta.ogDescription || desc;

  const schemaBreadcrumb = JSON.stringify({
    '@context':'https://schema.org','@type':'BreadcrumbList',
    itemListElement:[
      {'@type':'ListItem','position':1,'name':'Home','item':`${BASE}/`},
      {'@type':'ListItem','position':2,'name':cat.label,'item':canonical},
    ],
  });

  const schemaItemList = JSON.stringify({
    '@context':'https://schema.org','@type':'ItemList',
    name: `${cat.label} Tools`,
    description: desc,
    url: canonical,
    numberOfItems: tools.length,
    itemListElement: tools.map((t,i) => ({
      '@type':'ListItem','position':i+1,
      name: t.title,
      description: t.description,
      url: `${BASE}/tools/${t.category}/${t.slug}/`,
    })),
  });

  const toolCards = tools.map(t => `
        <a href="/tools/${t.category}/${t.slug}/"
           class="tool-card reveal-on-scroll"
           style="display:flex;align-items:flex-start;gap:.875rem;padding:1.25rem;border-radius:1rem;border:1px solid var(--border);background:var(--surface);text-decoration:none;color:var(--text);transition:transform .2s,box-shadow .2s,border-color .2s;"
           onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 28px rgba(0,0,0,.1)';this.style.borderColor='${cat.color}40'"
           onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor='var(--border)'">
          <div style="width:40px;height:40px;border-radius:.75rem;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:${cat.colorBg};">
            <svg width="20" height="20" fill="none" stroke="${cat.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#${cat.icon}"/></svg>
          </div>
          <div style="min-width:0;">
            <div style="font-family:'Poppins',sans-serif;font-weight:600;font-size:.9375rem;margin-bottom:.25rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(t.title)}</div>
            <div style="font-size:.8125rem;color:var(--muted);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(t.description.slice(0,100))}</div>
          </div>
        </a>`).join('');

  // Popular tools sidebar (12 curated)
  const POPULAR = [
    {slug:'compress-image',category:'compression',title:'Compress Image'},
    {slug:'jpg-to-png',category:'conversion',title:'JPG to PNG'},
    {slug:'background-remover',category:'ai-tools',title:'Background Remover'},
    {slug:'resize-image',category:'resize',title:'Resize Image'},
    {slug:'webp-to-jpg',category:'conversion',title:'WebP to JPG'},
    {slug:'image-upscaler',category:'ai-tools',title:'AI Upscaler'},
    {slug:'heic-to-jpg',category:'conversion',title:'HEIC to JPG'},
    {slug:'youtube-thumbnail-maker',category:'social-tools',title:'YouTube Thumbnail'},
    {slug:'crop-image',category:'editor',title:'Crop Image'},
    {slug:'image-to-text-ocr',category:'ai-tools',title:'OCR: Image to Text'},
  ];

  const popularLinks = POPULAR
    .filter(p => p.slug !== cat.slug)
    .slice(0,8)
    .map(p => `<li><a href="/tools/${p.category}/${p.slug}/" style="display:block;padding:.5rem .625rem;border-radius:.5rem;font-size:.8125rem;color:var(--muted);text-decoration:none;transition:background .15s,color .15s;"
      onmouseover="this.style.background='rgba(79,70,229,.06)';this.style.color='#4F46E5'"
      onmouseout="this.style.background='';this.style.color='var(--muted)'">${p.title}</a></li>`)
    .join('');

  // Other category links
  const otherCats = CATEGORIES.filter(c => c.slug !== cat.slug);
  const catLinks  = otherCats.map(c => `
      <a href="/tools/${c.slug}/"
         style="display:flex;align-items:center;gap:.625rem;padding:.625rem .75rem;border-radius:.75rem;border:1px solid var(--border);font-size:.875rem;font-weight:500;color:var(--text);text-decoration:none;background:var(--surface);transition:border-color .2s;"
         onmouseover="this.style.borderColor='${c.color}'"
         onmouseout="this.style.borderColor='var(--border)'">
        <span style="width:8px;height:8px;border-radius:50%;background:${c.color};flex-shrink:0;"></span>
        ${c.label}
        <span style="margin-left:auto;font-size:.75rem;color:var(--muted);">${TOOLS.filter(t=>t.category===c.slug).length}</span>
      </a>`).join('');

  return `<!DOCTYPE html>
<html lang="en" class="">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>${esc(title)}</title>
  <meta name="description"        content="${esc(desc.slice(0,160))}" />
  <meta name="robots"             content="index, follow" />
  <link rel="canonical"           href="${esc(canonical)}" />

  <meta property="og:type"        content="website" />
  <meta property="og:site_name"   content="Pixaroid" />
  <meta property="og:title"       content="${esc(ogTitle)}" />
  <meta property="og:description" content="${esc(ogDesc.slice(0,200))}" />
  <meta property="og:url"         content="${esc(canonical)}" />
  <meta property="og:image"       content="${BASE}/assets/images/og-default.png" />

  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:site"        content="@pixaroidapp" />
  <meta name="twitter:title"       content="${esc(ogTitle)}" />
  <meta name="twitter:description" content="${esc(ogDesc.slice(0,200))}" />
  <meta name="twitter:image"       content="${BASE}/assets/images/og-default.png" />

  <link rel="icon"     href="/assets/svg/favicon.svg" type="image/svg+xml" />
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#4F46E5" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />

  <script type="application/ld+json">${schemaBreadcrumb}</script>
  <script type="application/ld+json">${schemaItemList}</script>

  <style>
    :root{--brand:#4F46E5;--bg:#F9FAFB;--surface:#fff;--text:#111827;--muted:#6B7280;--border:#E5E7EB;}
    .dark{--bg:#0B0E1A;--surface:#131726;--text:#F3F4F6;--muted:#9CA3AF;--border:#1F2533;}
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{scroll-behavior:smooth;}
    body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);line-height:1.6;overflow-x:hidden;transition:background .25s,color .25s;}
    h1,h2,h3,h4{font-family:'Poppins',sans-serif;line-height:1.25;}
    a{color:inherit;text-decoration:none;}
    .container{max-width:1200px;margin:0 auto;padding:0 1.5rem;}
    .navbar{position:sticky;top:0;z-index:100;background:rgba(249,250,251,.85);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);}
    .dark .navbar{background:rgba(11,14,26,.85);}
    .navbar-inner{display:flex;align-items:center;gap:1.25rem;height:60px;max-width:1200px;margin:0 auto;padding:0 1.5rem;}
    .nav-logo{display:flex;align-items:center;gap:.5rem;font-family:'Poppins',sans-serif;font-weight:700;font-size:1.125rem;}
    .nav-logo-text{background:linear-gradient(135deg,#4F46E5,#06B6D4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
    .nav-spacer{flex:1;}
    .btn-nav{padding:.5rem 1.25rem;border-radius:.75rem;font-size:.875rem;font-weight:600;background:linear-gradient(135deg,#4F46E5,#8B5CF6);color:#fff;cursor:pointer;border:none;}
    #theme-toggle{width:36px;height:36px;border-radius:.625rem;border:1px solid var(--border);background:var(--surface);color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center;}
    .hero{padding:3.5rem 1.5rem 2.5rem;border-bottom:1px solid var(--border);}
    .hero-badge{display:inline-flex;align-items:center;gap:.375rem;padding:.25rem .75rem;border-radius:999px;font-size:.75rem;font-weight:600;margin-bottom:1rem;}
    .page-layout{display:grid;grid-template-columns:1fr 264px;gap:2rem;padding:2.5rem 0 4rem;}
    @media(max-width:900px){.page-layout{grid-template-columns:1fr;}}
    .tools-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem;}
    @media(max-width:500px){.tools-grid{grid-template-columns:1fr;}}
    .sidebar-card{background:var(--surface);border:1px solid var(--border);border-radius:1rem;padding:1.25rem;margin-bottom:1rem;}
    .sidebar-title{font-family:'Poppins',sans-serif;font-weight:600;font-size:.9375rem;margin-bottom:.875rem;}
    .breadcrumb{display:flex;align-items:center;gap:.5rem;font-size:.8125rem;color:var(--muted);padding:.875rem 0 0;}
    .breadcrumb a:hover{color:var(--brand);}
    .bc-sep{color:var(--border);}
    .reveal-on-scroll{opacity:0;transform:translateY(14px);transition:opacity .45s ease,transform .45s ease;}
    .reveal-on-scroll.is-visible{opacity:1;transform:none;}
    .js-ready .reveal-on-scroll{/* transitions only after JS ready */}
    footer{background:var(--surface);border-top:1px solid var(--border);padding:2rem 1.5rem;text-align:center;font-size:.8125rem;color:var(--muted);}
    footer a{color:var(--brand);}
  </style>
</head>
<body>

<svg style="display:none" xmlns="http://www.w3.org/2000/svg"><defs>
  <symbol id="t-compress" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></symbol>
  <symbol id="t-convert" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></symbol>
  <symbol id="t-resize" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></symbol>
  <symbol id="t-editor" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></symbol>
  <symbol id="t-ai" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75z"/></symbol>
  <symbol id="t-bulk" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></symbol>
  <symbol id="t-social" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></symbol>
  <symbol id="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></symbol>
  <symbol id="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></symbol>
</defs></svg>

<header class="navbar">
  <div class="navbar-inner">
    <a href="/" class="nav-logo">
      <svg width="28" height="28" viewBox="0 0 32 32"><defs><linearGradient id="ng" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#4F46E5"/><stop offset="100%" stop-color="#06B6D4"/></linearGradient></defs><rect width="32" height="32" rx="7" fill="url(#ng)"/><rect x="5" y="5" width="9" height="9" rx="2" fill="white" opacity=".95"/><rect x="18" y="5" width="9" height="9" rx="2" fill="white" opacity=".6"/><rect x="5" y="18" width="9" height="9" rx="2" fill="white" opacity=".6"/><rect x="18" y="18" width="9" height="9" rx="2" fill="white" opacity=".3"/></svg>
      <span class="nav-logo-text">Pixaroid</span>
    </a>
    <nav style="display:flex;gap:.25rem;margin-left:1rem;">
      ${CATEGORIES.map(c=>`<a href="/tools/${c.slug}/" style="padding:.375rem .625rem;border-radius:.5rem;font-size:.8rem;font-weight:500;color:${c.slug===cat.slug?c.color:'var(--muted)'};">${c.label}</a>`).join('')}
    </nav>
    <div class="nav-spacer"></div>
    <button id="theme-toggle" aria-label="Toggle theme">
      <svg width="17" height="17"><use href="#i-moon" class="icon-moon"/><use href="#i-sun" class="icon-sun" style="display:none"/></svg>
    </button>
  </div>
</header>

<section class="hero" style="background:${cat.colorBg}">
  <div class="container">
    <nav class="breadcrumb"><a href="/">Home</a><span class="bc-sep">›</span><span>${esc(cat.label)}</span></nav>
    <div style="max-width:680px;margin-top:1.5rem;">
      <div class="hero-badge" style="background:${cat.colorBg};color:${cat.color};border:1px solid ${cat.color}30;">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><use href="#${cat.icon}"/></svg>
        ${tools.length} Tools
      </div>
      <h1 style="font-size:clamp(1.75rem,3.5vw,2.5rem);font-weight:800;margin-bottom:.75rem;">${esc(cat.headline)}</h1>
      <p style="font-size:1.0625rem;color:var(--muted);line-height:1.7;max-width:560px;">${esc(cat.sub)}</p>
    </div>
  </div>
</section>

<main class="container">
  <div class="page-layout">

    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;flex-wrap:wrap;gap:.5rem;">
        <h2 style="font-size:1.125rem;font-weight:600;">${tools.length} ${esc(cat.label)} Tools</h2>
        <span style="font-size:.8125rem;color:var(--muted);">All free · No upload · Browser-based</span>
      </div>
      <div class="tools-grid">${toolCards}</div>
    </div>

    <aside>
      <div class="sidebar-card">
        <div class="sidebar-title">Popular Tools</div>
        <ul style="list-style:none;display:flex;flex-direction:column;gap:.25rem;">${popularLinks}</ul>
        <a href="/" style="display:block;margin-top:.75rem;text-align:center;font-size:.8125rem;color:#4F46E5;font-weight:600;">All 67 tools →</a>
      </div>

      <div class="sidebar-card">
        <div class="sidebar-title">All Categories</div>
        <div style="display:flex;flex-direction:column;gap:.5rem;">${catLinks}</div>
      </div>

      <div class="sidebar-card" style="background:${cat.colorBg};border-color:${cat.color}30;">
        <div style="display:flex;gap:.625rem;align-items:flex-start;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${cat.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <div>
            <div style="font-family:'Poppins',sans-serif;font-weight:600;font-size:.875rem;margin-bottom:.25rem;color:${cat.color};">100% Private</div>
            <p style="font-size:.8rem;color:var(--muted);line-height:1.6;">Your images never leave your device. All processing runs locally in your browser.</p>
          </div>
        </div>
      </div>
    </aside>

  </div>
</main>

<footer>
  <p>© 2026 <a href="/">Pixaroid</a> · <a href="/privacy-policy.html">Privacy</a> · <a href="/terms-of-service.html">Terms</a> · <a href="/contact.html">Contact</a></p>
</footer>

<script>
(function(){
  const root=document.documentElement,btn=document.getElementById('theme-toggle');
  const moon=btn.querySelector('.icon-moon'),sun=btn.querySelector('.icon-sun');
  function apply(dark){root.classList.toggle('dark',dark);moon.style.display=dark?'none':'';sun.style.display=dark?'':'none';}
  const s=localStorage.getItem('pxn-theme');
  apply(s==='dark'||(!s&&matchMedia('(prefers-color-scheme:dark)').matches));
  btn.addEventListener('click',()=>{const d=!root.classList.contains('dark');apply(d);localStorage.setItem('pxn-theme',d?'dark':'light');});
  root.classList.add('js-ready');
  if(IntersectionObserver){
    const io=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target);}});},{threshold:0.08,rootMargin:'0px 0px -30px 0px'});
    document.querySelectorAll('.reveal-on-scroll').forEach(el=>io.observe(el));
  }
  if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
})();
</script>
</body>
</html>`;
}

function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* ── Write pages ─────────────────────────────────────────────── */
let generated = 0;
console.log('Generating category pages…\n');

for (const cat of CATEGORIES) {
  const tools   = TOOLS.filter(t => t.category === cat.slug);
  const html    = buildCategoryPage(cat, tools);

  // Primary: /tools/<slug>/index.html
  const dir1 = path.join(DIST, 'tools', cat.slug);
  fs.mkdirSync(dir1, { recursive: true });
  fs.writeFileSync(path.join(dir1,'index.html'), html, 'utf8');

  // Short alias: /<short>/index.html
  const dir2 = path.join(DIST, cat.short);
  fs.mkdirSync(dir2, { recursive: true });
  fs.writeFileSync(path.join(dir2,'index.html'), html, 'utf8');

  console.log(`  ✓  /tools/${cat.slug}/  +  /${cat.short}/  (${tools.length} tools)`);
  generated++;
}

console.log(`\n✓ Generated ${generated} category pages (${generated * 2} paths)`);
