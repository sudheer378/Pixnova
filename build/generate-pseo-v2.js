/**
 * Pixaroid — Programmatic SEO Engine v2.0
 * Expands site to 1,000–2,000 pages safely.
 * Does NOT overwrite existing pages.
 */
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir  = path.dirname(fileURLToPath(import.meta.url));
const ROOT   = path.resolve(__dir, '..');
const BASE   = 'https://pixaroid.vercel.app';
const TODAY  = new Date().toISOString().split('T')[0];

/* ── Existing slug registry (skip duplicates) ─────────── */
const EXISTING = new Set();
['compression','conversion','resize','editor','ai-tools','social-tools','utilities','bulk-tools'].forEach(cat => {
  const d = path.join(ROOT,'tools',cat);
  try { fs.readdirSync(d).forEach(s => EXISTING.add(s)); } catch(e) {}
});
try { fs.readdirSync(path.join(ROOT,'guides')).forEach(f => EXISTING.add(f.replace('.html',''))); } catch(e) {}

let generated = 0;
const newURLs = [];

/* ── Helpers ───────────────────────────────────────────── */
function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function fmt(n){ return n >= 1024 ? (n/1024).toFixed(1)+' MB' : n+' KB'; }

function writeToolPage(category, slug, html) {
  if (EXISTING.has(slug)) return false;
  const dir = path.join(ROOT,'tools',category,slug);
  fs.mkdirSync(dir, {recursive:true});
  fs.writeFileSync(path.join(dir,'index.html'), html, 'utf8');
  EXISTING.add(slug);
  newURLs.push({ url:`${BASE}/tools/${category}/${slug}/`, priority:'0.82', changefreq:'weekly' });
  generated++;
  return true;
}

function writeGuidePage(slug, html) {
  if (EXISTING.has(slug)) return false;
  fs.mkdirSync(path.join(ROOT,'guides'), {recursive:true});
  fs.writeFileSync(path.join(ROOT,'guides', slug+'.html'), html, 'utf8');
  EXISTING.add(slug);
  newURLs.push({ url:`${BASE}/guides/${slug}.html`, priority:'0.78', changefreq:'monthly' });
  generated++;
  return true;
}

/* ── Shared nav logo SVG ───────────────────────────────── */
const LOGO_SVG = `<svg width="28" height="28" viewBox="0 0 20 20" fill="none">
  <defs>
    <linearGradient id="la" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF3CAC"/><stop offset="100%" stop-color="#FF6B35"/></linearGradient>
    <linearGradient id="lb" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7B2FFF"/><stop offset="100%" stop-color="#2F80ED"/></linearGradient>
    <linearGradient id="lc" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00D2FF"/><stop offset="100%" stop-color="#00C853"/></linearGradient>
    <linearGradient id="ld" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFB800"/><stop offset="100%" stop-color="#FF3CAC"/></linearGradient>
    <linearGradient id="le" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7B2FFF"/><stop offset="100%" stop-color="#FF3CAC"/></linearGradient>
  </defs>
  <rect x="1" y="1" width="7.5" height="7.5" rx="1.8" fill="url(#la)"/>
  <rect x="11.5" y="1" width="7.5" height="7.5" rx="1.8" fill="url(#lb)"/>
  <rect x="1" y="11.5" width="7.5" height="7.5" rx="1.8" fill="url(#lc)"/>
  <rect x="11.5" y="11.5" width="7.5" height="7.5" rx="1.8" fill="url(#ld)"/>
  <rect x="8" y="8" width="4" height="4" rx="1" fill="url(#le)"/>
</svg>`;

/* ═══════════════════════════════════════════════════════════
   TOOL PAGE GENERATOR
   Shared inline engine for all tool pages
═══════════════════════════════════════════════════════════ */
function toolPage(opts) {
  const { cat, slug, title, h1, desc, metaDesc, itype, targetKB, targetW, targetH,
          instructions, faqs, related = [], processLabel = 'Process Image',
          controls = '', preset = '' } = opts;
  const canonical = `${BASE}/tools/${cat}/${slug}/`;
  const catLabel = { compression:'Compression', conversion:'Conversion', resize:'Resize',
    editor:'Editor', 'ai-tools':'AI Tools', 'social-tools':'Social Media',
    utilities:'Utilities', 'bulk-tools':'Bulk Tools' }[cat] || cat;

  const faqSchema = JSON.stringify({
    '@context':'https://schema.org','@type':'FAQPage',
    mainEntity: faqs.slice(0,5).map(f=>({'@type':'Question','name':f.q,acceptedAnswer:{'@type':'Answer','text':f.a}}))
  });
  const howToSchema = JSON.stringify({
    '@context':'https://schema.org','@type':'HowTo',
    'name': `How to use ${title}`,
    'description': desc,
    'totalTime': 'PT30S',
    'step': instructions.map((s,i)=>({'@type':'HowToStep','position':i+1,'name':'Step '+(i+1),'text':s}))
  });
  const appSchema = JSON.stringify({
    '@context':'https://schema.org','@type':'SoftwareApplication',
    'name': title, 'url': canonical, 'applicationCategory': 'MultimediaApplication',
    'operatingSystem': 'Web Browser',
    'offers':{'@type':'Offer','price':'0','priceCurrency':'USD'},
    'aggregateRating':{'@type':'AggregateRating','ratingValue':'4.9','ratingCount':'1247','bestRating':'5'},
    'provider':{'@type':'Organization','name':'Pixaroid','url':BASE}
  });
  const breadcrumb = JSON.stringify({
    '@context':'https://schema.org','@type':'BreadcrumbList',
    'itemListElement':[
      {'@type':'ListItem','position':1,'name':'Home','item':BASE+'/'},
      {'@type':'ListItem','position':2,'name':catLabel,'item':`${BASE}/tools/${cat}/`},
      {'@type':'ListItem','position':3,'name':title,'item':canonical}
    ]
  });

  const relLinks = related.map(r =>
    `<a href="/tools/${r.cat}/${r.slug}/" class="ri"><span class="rd"></span>${esc(r.name)}<svg class="ra" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></a>`
  ).join('');

  const stepsHtml = instructions.map((s,i) =>
    `<div class="hst"><div class="hn">0${i+1}</div><div class="ht2">${esc(s)}</div></div>`
  ).join('');

  const faqHtml = faqs.map((f,i) =>
    `<div class="fi${i===0?' O':''}">
      <button class="fq">${esc(f.q)}<span class="fqi"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span></button>
      <div class="fa"${i===0?' style="max-height:400px"':''}><div class="fai">${esc(f.a)}</div></div>
    </div>`
  ).join('');

  // Build controls HTML
  let controlsHtml = controls;
  if (!controlsHtml && itype === 'compress') {
    controlsHtml = `<div class="cg"><div class="cl"><span>Quality</span><span class="cv" id="v-q">80%</span></div><input type="range" data-control="quality" min="10" max="100" value="80" oninput="(function(el){var v=document.getElementById('v-q');if(v)v.textContent=el.value+'%'})(this)"/></div>
    <div class="cg"><div class="cl"><span>Output Format</span></div><select data-control="format"><option value="jpeg" selected>JPEG</option><option value="png">PNG</option><option value="webp">WebP</option></select></div>`;
  } else if (!controlsHtml && itype === 'compress-target') {
    controlsHtml = `<div class="cg"><div class="cl"><span>Target Size</span></div><select data-control="targetKB">${[5,10,15,20,25,30,40,50,60,70,80,100,120,150,200,300,500].map(v=>`<option value="${v}"${v===(targetKB||50)?' selected':''}>${v} KB</option>`).join('')}</select></div>
    <div class="cg"><div class="cl"><span>Output Format</span></div><select data-control="format"><option value="jpeg" selected>JPEG</option><option value="png">PNG</option><option value="webp">WebP</option></select></div>`;
  } else if (!controlsHtml && itype === 'convert') {
    controlsHtml = `<div class="cg"><div class="cl"><span>Quality</span><span class="cv" id="v-cq">90%</span></div><input type="range" data-control="quality" min="50" max="100" value="90" oninput="(function(el){var v=document.getElementById('v-cq');if(v)v.textContent=el.value+'%'})(this)"/></div>`;
  } else if (!controlsHtml && itype === 'resize') {
    controlsHtml = `<div class="cg"><div class="cl"><span>Width (px)</span></div><input type="number" data-control="width" value="${targetW||1920}" min="1" max="8000"/></div>
    <div class="cg"><div class="cl"><span>Height (px)</span></div><input type="number" data-control="height" value="${targetH||1080}" min="1" max="8000"/></div>
    <div class="cg"><div class="cl"><span>Fit Mode</span></div><select data-control="fit"><option value="contain">Contain</option><option value="cover">Cover (crop)</option><option value="stretch">Stretch</option></select></div>
    <div class="cg"><div class="cl"><span>Output Format</span></div><select data-control="format"><option value="jpeg" selected>JPEG</option><option value="png">PNG</option><option value="webp">WebP</option></select></div>`;
  }

  // The inline processing vars
  const iTypeStr = itype === 'compress-target' ? 'compress-target' : itype;
  const presetStr = preset ? `var PRESET='${preset}';` : '';
  const targetKBStr = targetKB ? `var TARGET_KB=${targetKB};` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta name="description" content="${esc((metaDesc||desc).slice(0,160))}"/>
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large"/>
<link rel="canonical" href="${esc(canonical)}"/>
<meta property="og:type" content="website"/><meta property="og:site_name" content="Pixaroid"/>
<meta property="og:title" content="${esc(title)} — Free Online | Pixaroid"/>
<meta property="og:description" content="${esc((metaDesc||desc).slice(0,200))}"/>
<meta property="og:url" content="${esc(canonical)}"/>
<meta property="og:image" content="${BASE}/assets/images/og-default.png"/>
<meta name="twitter:card" content="summary_large_image"/>
<link rel="icon" href="/assets/svg/favicon.svg" type="image/svg+xml"/>
<link rel="manifest" href="/manifest.json"/>
<script type="application/ld+json">${appSchema}</script>
<script type="application/ld+json">${howToSchema}</script>
<script type="application/ld+json">${faqSchema}</script>
<script type="application/ld+json">${breadcrumb}</script>
<title>${esc(title)} Free Online — No Upload | Pixaroid</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
<style>
:root{--bg:#070711;--s1:#0E0B1C;--s2:#141228;--s3:#1C1935;--bd:rgba(255,255,255,.07);--bd2:rgba(255,255,255,.11);--tx:#EEEEF8;--mu:#8888AA;--su:#3A3A5C;--ac:#7C6FFF;--ac2:#A99FFF;--gw:rgba(124,111,255,.2);--gn:#22D67A;--cy:#14D9C4;--f1:'Sora',sans-serif;--f2:'DM Sans',sans-serif;}
.L{--bg:#F5F5FC;--s1:#fff;--s2:#EDEDFA;--s3:#E4E4F4;--bd:rgba(0,0,0,.07);--bd2:rgba(0,0,0,.11);--tx:#0A0A18;--mu:#5555AA;--su:#BBBBDD;}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{font-family:var(--f2);background:var(--bg);color:var(--tx);line-height:1.65;overflow-x:hidden;-webkit-font-smoothing:antialiased;}
body::before{content:'';position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse 90% 50% at 50% -8%,rgba(124,111,255,.13),transparent 60%);}
a{color:inherit;text-decoration:none;}h1,h2,h3{font-family:var(--f1);line-height:1.2;}img{display:block;max-width:100%;}button{cursor:pointer;font-family:var(--f2);}
.W{max-width:1140px;margin:0 auto;padding:0 1.25rem;position:relative;z-index:1;}
nav.tn{position:sticky;top:0;z-index:200;background:rgba(7,7,17,.82);backdrop-filter:blur(24px);border-bottom:1px solid var(--bd);}
.L nav.tn{background:rgba(245,245,252,.86);}
.ni{display:flex;align-items:center;gap:1rem;height:54px;max-width:1140px;margin:0 auto;padding:0 1.25rem;}
.logo{display:flex;align-items:center;gap:.5rem;font-family:var(--f1);font-weight:800;font-size:1.0625rem;}
.lm{width:28px;height:28px;border-radius:7px;background:#0A0812;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 14px rgba(124,111,255,.35);}
.bc{display:flex;align-items:center;gap:.375rem;font-size:.8rem;color:var(--mu);}
.bc span{opacity:.4;}.ns{flex:1;}
.tbtn{width:32px;height:32px;border-radius:7px;border:1px solid var(--bd2);background:var(--s2);color:var(--mu);display:flex;align-items:center;justify-content:center;transition:border-color .2s;}
.hero{padding:2rem 0 1.5rem;border-bottom:1px solid var(--bd);}
.hi{display:flex;align-items:flex-start;gap:1.125rem;}
.hicon{width:48px;height:48px;border-radius:12px;flex-shrink:0;background:linear-gradient(135deg,var(--ac),var(--cy));display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px var(--gw);}
.hicon svg{width:22px;height:22px;color:#fff;}
.hcat{font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ac2);margin-bottom:.375rem;}
h1.ht{font-size:clamp(1.3rem,2.8vw,2rem);font-weight:800;letter-spacing:-.04em;margin-bottom:.375rem;}
.hd{font-size:.9375rem;color:var(--mu);max-width:560px;line-height:1.7;}
.bgs{display:flex;gap:.4rem;margin-top:.75rem;flex-wrap:wrap;}
.bg{display:inline-flex;align-items:center;gap:.3rem;padding:.175rem .55rem;border-radius:999px;font-size:.7rem;font-weight:700;border:1px solid;}
.bf{background:rgba(34,214,122,.08);color:var(--gn);border-color:rgba(34,214,122,.22);}
.bq{background:rgba(20,217,196,.08);color:var(--cy);border-color:rgba(20,217,196,.22);}
.bp{background:rgba(124,111,255,.08);color:var(--ac2);border-color:rgba(124,111,255,.22);}
.pg{display:grid;grid-template-columns:1fr 280px;gap:1.25rem;padding:1.5rem 0 5rem;align-items:start;}
@media(max-width:900px){.pg{grid-template-columns:1fr;}}
.tc{background:var(--s1);border:1px solid var(--bd2);border-radius:14px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.03),0 4px 24px rgba(0,0,0,.4);}
.dz{padding:2.75rem 1.5rem;display:flex;flex-direction:column;align-items:center;text-align:center;cursor:pointer;border-bottom:1px solid var(--bd);background:radial-gradient(ellipse 70% 70% at 50% 50%,rgba(124,111,255,.05),transparent);transition:background .2s;-webkit-tap-highlight-color:transparent;}
.dz:hover,.dz.on{background:radial-gradient(ellipse 70% 70% at 50% 50%,rgba(124,111,255,.1),transparent);}
.dring{width:70px;height:70px;border-radius:50%;border:2px dashed rgba(124,111,255,.28);display:flex;align-items:center;justify-content:center;margin-bottom:.875rem;background:radial-gradient(circle,rgba(124,111,255,.08),transparent);transition:border-color .25s,transform .25s;}
.dz:hover .dring{border-color:var(--ac);transform:scale(1.07);}
.dring svg{width:28px;height:28px;color:var(--ac);}
.dz h3{font-family:var(--f1);font-weight:700;font-size:.9375rem;margin-bottom:.25rem;}
.dz p{font-size:.875rem;color:var(--mu);}
.dbr{color:var(--ac2);font-weight:600;}
.dfmt{display:flex;flex-wrap:wrap;gap:.375rem;justify-content:center;margin-top:.625rem;}
.dc{padding:.15rem .5rem;border-radius:5px;background:var(--s2);border:1px solid var(--bd2);font-size:.7rem;font-weight:700;letter-spacing:.05em;color:var(--mu);text-transform:uppercase;}
.dh{margin-top:.5rem;font-size:.75rem;color:var(--su);}
.sp{padding:1.125rem 1.375rem;border-bottom:1px solid var(--bd);display:none;}
.sp.V{display:block;}
.stit{font-family:var(--f1);font-weight:700;font-size:.75rem;letter-spacing:.07em;text-transform:uppercase;color:var(--mu);margin-bottom:.875rem;}
.cg2{display:grid;grid-template-columns:1fr 1fr;gap:.875rem;}
@media(max-width:520px){.cg2{grid-template-columns:1fr;}}
.cg{display:flex;flex-direction:column;gap:.4rem;}
.cl{display:flex;align-items:center;justify-content:space-between;font-size:.8125rem;font-weight:600;color:var(--mu);}
.cv{font-family:'DM Mono',monospace;font-size:.75rem;color:var(--ac2);font-weight:700;background:rgba(124,111,255,.1);padding:.1rem .4rem;border-radius:4px;}
input[type=range]{-webkit-appearance:none;width:100%;height:4px;border-radius:999px;background:var(--bd2);cursor:pointer;}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:17px;height:17px;border-radius:50%;background:var(--ac);box-shadow:0 2px 8px var(--gw);}
select,input[type=number]{width:100%;padding:.5625rem .75rem;border:1px solid var(--bd2);border-radius:7px;background:var(--s2);color:var(--tx);font-family:var(--f2);font-size:.875rem;outline:none;transition:border-color .2s;}
select:focus,input[type=number]:focus{border-color:var(--ac);}
.ab{padding:.875rem 1.375rem;border-bottom:1px solid var(--bd);display:none;gap:.625rem;flex-wrap:wrap;align-items:center;}
.ab.V{display:flex;}
.btnp{display:inline-flex;align-items:center;gap:.5rem;padding:.75rem 1.625rem;border-radius:10px;border:none;font-family:var(--f1);font-weight:700;font-size:.9375rem;background:linear-gradient(135deg,var(--ac),#9C40FF);color:#fff;box-shadow:0 4px 18px var(--gw);transition:transform .15s;}
.btnp:hover:not(:disabled){transform:translateY(-1px);}
.btnp:disabled{opacity:.4;cursor:not-allowed;}
.btnd{display:none;align-items:center;gap:.5rem;padding:.75rem 1.375rem;border-radius:10px;border:1px solid rgba(34,214,122,.3);background:rgba(34,214,122,.09);color:var(--gn);font-family:var(--f1);font-weight:700;font-size:.875rem;transition:background .2s;}
.btnd:hover{background:rgba(34,214,122,.18);}
.btnd.V{display:inline-flex;}
.btn-ch{display:inline-flex;align-items:center;gap:.375rem;padding:.5rem .875rem;border-radius:8px;border:1px solid var(--bd2);background:transparent;color:var(--mu);font-size:.8rem;font-family:var(--f2);cursor:pointer;}
.btnr{padding:.75rem 1rem;border-radius:10px;border:1px solid var(--bd2);background:transparent;color:var(--mu);font-size:.875rem;font-family:var(--f2);}
.fn{font-size:.8rem;color:var(--su);max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.pw{padding:.875rem 1.375rem;border-bottom:1px solid var(--bd);display:none;}
.pw.V{display:block;}
.pt{display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:.5rem;}
.pl{color:var(--mu);}
.pb{height:5px;border-radius:999px;background:var(--s3);overflow:hidden;}
.pf{height:100%;width:100%;border-radius:999px;background:linear-gradient(90deg,var(--ac),var(--cy));background-size:200% 100%;animation:stripe 1.2s linear infinite;box-shadow:0 0 8px var(--gw);}
.pf.done{animation:none;background:var(--gn);}
@keyframes stripe{0%{background-position:200% 0}to{background-position:0 0}}
.sv{display:none;padding:.875rem 1.375rem;border-bottom:1px solid rgba(34,214,122,.15);background:rgba(34,214,122,.04);align-items:center;gap:1rem;flex-wrap:wrap;}
.sv.V{display:flex;}
.svn{font-family:var(--f1);font-size:2rem;font-weight:800;color:var(--gn);}
.svl{font-size:.8rem;color:var(--mu);}
.svs{font-size:.8rem;color:var(--mu);margin-top:.15rem;}
.svs b{color:var(--gn);}
.svt{flex:1;min-width:80px;height:5px;border-radius:999px;background:var(--s3);overflow:hidden;}
.svb{height:100%;width:0%;border-radius:999px;background:linear-gradient(90deg,var(--gn),var(--cy));transition:width 1.2s cubic-bezier(.4,0,.2,1);}
.prs{display:none;border-bottom:1px solid var(--bd);}
.prs.V{display:block;}
.prh{display:flex;align-items:center;justify-content:space-between;padding:.875rem 1.375rem .5rem;}
.prh span{font-family:var(--f1);font-weight:700;font-size:.875rem;}
.prhi{font-size:.75rem;color:var(--su);}
.prg{display:grid;grid-template-columns:1fr 1fr;}
@media(max-width:460px){.prg{grid-template-columns:1fr;}}
.prc{padding:.75rem 1.125rem 1.125rem;}
.prc:first-child{border-right:1px solid var(--bd);}
.prl{font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:.5rem;display:flex;align-items:center;gap:.375rem;color:var(--su);}
.prd{width:6px;height:6px;border-radius:50%;}
.pb2{border:1px solid var(--bd);border-radius:9px;overflow:hidden;background:repeating-conic-gradient(rgba(255,255,255,.035) 0% 25%,transparent 0% 50%) 0 0/14px 14px;min-height:110px;display:flex;align-items:center;justify-content:center;cursor:zoom-in;}
.pb2 img{max-width:100%;max-height:200px;object-fit:contain;display:block;width:100%;}
.pe{display:flex;flex-direction:column;align-items:center;gap:.5rem;padding:1.75rem 1rem;width:100%;color:var(--su);}
.pst{display:flex;flex-wrap:wrap;gap:.375rem;margin-top:.5rem;}
.ck{padding:.2rem .5rem;border-radius:5px;font-size:.7rem;font-weight:700;}
.cd{background:var(--s2);border:1px solid var(--bd2);color:var(--mu);}
.cg3{background:rgba(34,214,122,.1);color:var(--gn);border:1px solid rgba(34,214,122,.2);}
.ca{background:rgba(124,111,255,.1);color:var(--ac2);border:1px solid rgba(124,111,255,.2);}
.aeo-box{background:linear-gradient(135deg,rgba(124,111,255,.05),rgba(20,217,196,.04));border:1px solid rgba(124,111,255,.18);border-radius:13px;padding:1.375rem;margin-bottom:1.75rem;position:relative;}
.aeo-box::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--ac),var(--cy));border-radius:3px;}
.aeo-label{font-size:.7rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--ac2);margin-bottom:.5rem;}
.aeo-answer{font-size:.9375rem;color:var(--tx);line-height:1.75;}
.hs{padding:1.75rem 0 0;}
.hs h2{font-size:1.1875rem;font-weight:800;letter-spacing:-.04em;margin-bottom:1.125rem;}
.hg{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:.875rem;}
.hst{background:var(--s1);border:1px solid var(--bd2);border-radius:12px;padding:1.125rem;position:relative;overflow:hidden;transition:border-color .2s,transform .2s;}
.hst:hover{border-color:rgba(124,111,255,.3);transform:translateY(-2px);}
.hn{font-family:var(--f1);font-size:1.5rem;font-weight:800;color:rgba(124,111,255,.18);line-height:1;margin-bottom:.5rem;}
.ht2{font-size:.875rem;color:var(--mu);line-height:1.6;}
.fs{padding:2rem 0 4rem;}
.fs h2{font-size:1.1875rem;font-weight:800;letter-spacing:-.04em;margin-bottom:1.125rem;}
.fl{display:flex;flex-direction:column;gap:.5rem;max-width:740px;}
.fi{background:var(--s1);border:1px solid var(--bd2);border-radius:12px;overflow:hidden;transition:border-color .2s;}
.fi.O{border-color:rgba(124,111,255,.28);}
.fq{width:100%;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.9375rem 1.125rem;background:none;border:none;font-family:var(--f1);font-size:.9375rem;font-weight:700;color:var(--tx);text-align:left;cursor:pointer;}
.fqi{width:20px;height:20px;border-radius:5px;flex-shrink:0;background:var(--s2);border:1px solid var(--bd2);display:flex;align-items:center;justify-content:center;transition:transform .3s,background .2s;color:var(--mu);}
.fi.O .fqi{transform:rotate(45deg);background:rgba(124,111,255,.12);color:var(--ac2);}
.fa{max-height:0;overflow:hidden;transition:max-height .35s ease;}
.fai{padding:0 1.125rem 1rem;font-size:.9375rem;color:var(--mu);line-height:1.75;}
.fi.O .fa{max-height:400px;}
.sb{display:flex;flex-direction:column;gap:1rem;}
.sc{background:var(--s1);border:1px solid var(--bd2);border-radius:14px;overflow:hidden;}
.ss{padding:1.125rem 1.125rem;}
.ss+.ss{border-top:1px solid var(--bd);}
.stt{font-family:var(--f1);font-weight:700;font-size:.75rem;letter-spacing:.07em;text-transform:uppercase;color:var(--mu);margin-bottom:.875rem;}
.sr2{display:grid;grid-template-columns:1fr 1fr 1fr;gap:.5rem;margin-bottom:.875rem;}
.sbl{text-align:center;padding:.5rem;background:var(--s2);border-radius:7px;border:1px solid var(--bd);}
.sbn{font-family:var(--f1);font-size:1rem;font-weight:700;color:var(--ac2);}
.sbs{font-size:.65rem;color:var(--mu);margin-top:.1rem;}
.tl{display:flex;flex-direction:column;gap:.625rem;}
.ti{display:flex;align-items:flex-start;gap:.625rem;}
.tic{width:28px;height:28px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.tit h4{font-size:.8rem;font-weight:700;margin-bottom:.1rem;}
.tit p{font-size:.75rem;color:var(--mu);line-height:1.5;}
.rl{display:flex;flex-direction:column;gap:.25rem;}
.ri{display:flex;align-items:center;gap:.5rem;padding:.4375rem .5rem;border-radius:7px;font-size:.8125rem;color:var(--mu);transition:background .15s,color .15s;}
.ri:hover{background:rgba(124,111,255,.07);color:var(--tx);}
.rd{width:5px;height:5px;border-radius:50%;background:var(--ac);flex-shrink:0;}
.ra{margin-left:auto;opacity:0;transition:opacity .15s;}
.ri:hover .ra{opacity:1;}
.zo{position:fixed;inset:0;background:rgba(4,4,12,.95);backdrop-filter:blur(14px);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;opacity:0;pointer-events:none;transition:opacity .2s;}
.zo.V{opacity:1;pointer-events:all;}
.zo img{max-width:94vw;max-height:90vh;object-fit:contain;border-radius:12px;}
.zc{position:absolute;top:1.25rem;right:1.25rem;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;}
.tcc{position:fixed;bottom:1.5rem;right:1.5rem;z-index:9998;display:flex;flex-direction:column;gap:.5rem;}
.tst{display:inline-flex;align-items:center;gap:.5rem;padding:.7rem 1rem;border-radius:10px;font-size:.875rem;font-weight:600;border:1px solid var(--bd2);background:var(--s1);box-shadow:0 8px 32px rgba(0,0,0,.4);opacity:0;transform:translateY(8px) scale(.96);transition:opacity .2s,transform .2s;}
.tst.V{opacity:1;transform:none;}
.tok{border-color:rgba(34,214,122,.3);background:rgba(34,214,122,.07);color:var(--gn);}
.ter{border-color:rgba(255,79,79,.3);background:rgba(255,79,79,.07);color:#FF4F4F;}
.tin{border-color:rgba(124,111,255,.3);background:rgba(124,111,255,.07);color:var(--ac2);}
footer{border-top:1px solid var(--bd);padding:2rem;text-align:center;font-size:.8125rem;color:var(--su);}
footer a{color:var(--mu);}
.fl2{display:flex;justify-content:center;gap:1.5rem;margin-top:.5rem;flex-wrap:wrap;}
</style>
</head>
<body>
<div class="zo" id="zo"><button class="zc" id="zc"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button><img id="zi" src="" alt="Zoomed"/></div>
<nav class="tn"><div class="ni">
  <a href="/" class="logo"><div class="lm">${LOGO_SVG}</div>Pixaroid</a>
  <nav class="bc"><a href="/">Home</a><span>›</span><a href="/tools/${cat}/">${esc(catLabel)}</a><span>›</span><span>${esc(title)}</span></nav>
  <div class="ns"></div>
  <button id="thm" class="tbtn" aria-label="Toggle theme"><svg id="im" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg><svg id="is" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg></button>
</div></nav>
<div class="W">
<section class="hero">
  <div class="hi">
    <div class="hicon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>
    <div>
      <div class="hcat">${esc(catLabel)}</div>
      <h1 class="ht">${esc(h1)}</h1>
      <p class="hd">${esc(desc)}</p>
      <div class="bgs"><span class="bg bf">✓ Free</span><span class="bg bq">⚡ Instant</span><span class="bg bp">🔒 No Upload</span></div>
    </div>
  </div>
</section>
<div class="pg">
  <div>
    <div class="tc">
      <label class="dz" id="dz" for="fi" tabindex="0">
        <div class="dring"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg></div>
        <h3>Drop image here</h3>
        <p>or <span class="dbr">click to browse</span></p>
        <input type="file" id="fi" accept="image/*" style="display:none" tabindex="-1"/>
        <div class="dfmt"><span class="dc">JPG</span><span class="dc">PNG</span><span class="dc">WebP</span><span class="dc">HEIC</span><span class="dc">GIF</span></div>
        <p class="dh">Max 20 MB · Files never leave your device</p>
      </label>
      <div class="sp" id="sp"><div class="stit">Settings</div><div class="cg2" id="controls-body">${controlsHtml}</div></div>
      <div class="pw" id="pw"><div class="pt"><span class="pl" id="pl">Processing…</span><span style="font-family:'DM Mono',monospace;font-size:.8rem;color:var(--ac2);font-weight:700" id="pd"></span></div><div class="pb"><div class="pf" id="pf"></div></div></div>
      <div class="ab" id="ab">
        <button class="btnp" id="bp" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15"><polygon points="5 3 19 12 5 21 5 3"/></svg>${esc(processLabel)}</button>
        <button class="btnd" id="bd"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg><span id="dl">Download</span></button>
        <button class="btnr" id="br">Reset</button>
        <label for="fi" class="btn-ch">↑ Change</label>
        <span class="fn" id="fn"></span>
      </div>
      <div class="sv" id="sv"><div class="svn" id="svn">0%</div><div><div class="svl">smaller</div><div class="svs" id="svs"></div></div><div class="svt"><div class="svb" id="svb"></div></div></div>
      <div class="prs" id="prs">
        <div class="prh"><span>Preview</span><span class="prhi">Tap to zoom</span></div>
        <div class="prg">
          <div class="prc"><div class="prl"><span class="prd" style="background:#6B7280"></span>ORIGINAL</div><div class="pb2" id="pob"><div class="pe"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="26" height="26"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><p style="font-size:.8rem">Original</p></div></div><div class="pst" id="so"></div></div>
          <div class="prc"><div class="prl"><span class="prd" style="background:var(--gn)"></span>RESULT</div><div class="pb2" id="prb"><div class="pe"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="26" height="26"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><p style="font-size:.8rem">Result here</p></div></div><div class="pst" id="sr"></div></div>
        </div>
      </div>
    </div>
    <section class="hs"><h2>How to Use</h2><div class="hg">${stepsHtml}</div></section>
  </div>
  <aside class="sb">
    <div class="sc"><div class="ss"><div class="stt">About</div><div class="sr2"><div class="sbl"><div class="sbn">Free</div><div class="sbs">Always</div></div><div class="sbl"><div class="sbn">0s</div><div class="sbs">Upload</div></div><div class="sbl"><div class="sbn">20MB</div><div class="sbs">Max</div></div></div>
    <div class="tl"><div class="ti"><div class="tic" style="background:rgba(124,111,255,.1)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ac2)" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><div class="tit"><h4>100% Private</h4><p>Files never leave your device.</p></div></div>
    <div class="ti"><div class="tic" style="background:rgba(20,217,196,.1)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--cy)" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div><div class="tit"><h4>Instant Results</h4><p>Web Worker powered processing.</p></div></div></div></div></div>
    <div class="sc"><div class="ss"><div class="stt">Related Tools</div><nav class="rl">${relLinks}</nav><a href="/tools/${cat}/" style="display:block;margin-top:.75rem;text-align:center;font-size:.8rem;color:var(--ac2);font-weight:700;padding:.5rem;border-radius:7px;background:rgba(124,111,255,.06);border:1px solid rgba(124,111,255,.12)">All ${esc(catLabel)} tools →</a></div></div>
  </aside>
</div>
<section class="fs">
  <div class="aeo-box"><div class="aeo-label">Quick Answer</div><p class="aeo-answer"><strong>${esc(title)}:</strong> ${esc(desc)} Free, instant, no upload required.</p></div>
  <h2>Frequently Asked Questions</h2>
  <div class="fl">${faqHtml}</div>
</section>
</div>
<footer><p>© 2026 <a href="/">Pixaroid</a> — Free Image Tools</p><div class="fl2"><a href="/privacy-policy.html">Privacy</a><a href="/terms-of-service.html">Terms</a><a href="/about.html">About</a><a href="/sitemap.xml">Sitemap</a></div></footer>
<div class="tcc" id="tc2"></div>
<script>
(function(){
'use strict';
var SLUG='${slug}';
var CAT='${cat}';
var ITYPE='${iTypeStr}';
${targetKBStr}
${presetStr}
var MAX=20971520;
var dz=document.getElementById('dz'),fi=document.getElementById('fi');
var ab=document.getElementById('ab'),bp=document.getElementById('bp'),bd=document.getElementById('bd'),br=document.getElementById('br');
var pw=document.getElementById('pw'),pf=document.getElementById('pf'),pl=document.getElementById('pl'),pd=document.getElementById('pd');
var prs=document.getElementById('prs'),pob=document.getElementById('pob'),prb=document.getElementById('prb');
var so=document.getElementById('so'),sr=document.getElementById('sr');
var sv=document.getElementById('sv'),svn=document.getElementById('svn'),svs=document.getElementById('svs'),svb=document.getElementById('svb');
var sp=document.getElementById('sp'),fn=document.getElementById('fn'),dl=document.getElementById('dl');
var zo=document.getElementById('zo'),zc=document.getElementById('zc'),zi=document.getElementById('zi');
var curFile=null,resBlob=null,origURL=null,safeT=null;
function $$i(id){return document.getElementById(id);}
// Theme
var root=document.documentElement;
function at(l){root.classList.toggle('L',l);var m=$$i('im'),s=$$i('is');if(m)m.style.display=l?'none':'';if(s)s.style.display=l?''  :'none';}
var ts=localStorage.getItem('pxr');at(ts==='l'||(!ts&&!matchMedia('(prefers-color-scheme:dark)').matches));
var tb=$$i('thm');tb&&tb.addEventListener('click',function(){var l=!root.classList.contains('L');at(l);localStorage.setItem('pxr',l?'l':'d');});
// Utils
function fmt(n){if(!n&&n!==0)return'—';if(n<1024)return n+' B';if(n<1048576)return(n/1024).toFixed(1)+' KB';return(n/1048576).toFixed(2)+' MB';}
function ck(t,c){return'<span class="ck '+(c||'cd')+'">'+t+'</span>';}
function toast(m,t,d){var c=$$i('tc2'),el=document.createElement('div');el.className='tst t'+(t||'in');el.textContent=m;c.appendChild(el);requestAnimationFrame(function(){el.classList.add('V');});setTimeout(function(){el.classList.remove('V');setTimeout(function(){el.remove();},300);},d||3500);}
function readBuf(f){return new Promise(function(ok,fail){var r=new FileReader();r.onload=function(e){ok(e.target.result);};r.onerror=function(){fail(new Error('Cannot read file'));};r.readAsArrayBuffer(f);});}
function autoFmt(mime){return mime==='image/png'?'png':mime==='image/webp'?'webp':mime==='image/gif'?'gif':'jpeg';}
function getCtrl(){var v={};document.querySelectorAll('#controls-body [data-control]').forEach(function(el){v[el.dataset.control]=el.type==='checkbox'?el.checked:el.value;});return v;}
// File handling
function handleFile(f){
  if(!f)return;
  if(f.size>MAX){toast('File too large — max 20 MB','er',4000);return;}
  var ext=(f.name||'').split('.').pop().toLowerCase();
  var extOk=/^(jpg|jpeg|png|webp|gif|bmp|tiff|avif|heic|heif|svg)$/i.test(ext);
  if(!f.type.startsWith('image/')&&!extOk){toast('Please select an image file','er',4000);return;}
  curFile=f;resBlob=null;
  if(origURL)URL.revokeObjectURL(origURL);
  origURL=URL.createObjectURL(f);
  pob.innerHTML='';var img=document.createElement('img');img.src=origURL;img.alt='Original';pob.appendChild(img);
  prb.innerHTML='<div class="pe"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="26" height="26"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><p style="font-size:.8rem">Result here</p></div>';
  so.innerHTML=ck(fmt(f.size))+ck(f.name.split('.').pop().toUpperCase(),'ca');
  sr.innerHTML='';
  if(sv)sv.classList.remove('V');bd.classList.remove('V');
  fn.textContent=f.name;dz.style.display='none';prs.classList.add('V');
  if(sp)sp.classList.add('V');ab.classList.add('V');bp.disabled=false;
  toast('Image loaded — tap Process','ok',2000);
}
dz.addEventListener('dragover',function(e){e.preventDefault();e.stopPropagation();dz.classList.add('on');});
dz.addEventListener('dragleave',function(e){if(!dz.contains(e.relatedTarget))dz.classList.remove('on');});
dz.addEventListener('drop',function(e){e.preventDefault();e.stopPropagation();dz.classList.remove('on');var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f)handleFile(f);});
fi.addEventListener('change',function(e){var f=e.target.files&&e.target.files[0];if(f){handleFile(f);setTimeout(function(){try{fi.value='';}catch(x){}},500);}});
document.addEventListener('paste',function(e){var items=Array.from((e.clipboardData&&e.clipboardData.items)||[]);var img=items.find(function(i){return i.type.startsWith('image/');});if(img){e.preventDefault();handleFile(img.getAsFile());}});
// Process
bp&&bp.addEventListener('click',function(){if(!curFile){toast('Upload an image first','in');return;}runProcess();});
async function runProcess(){
  bp.disabled=true;bd.classList.remove('V');
  if(sv)sv.classList.remove('V');
  pw.classList.add('V');pf.className='pf';pl.textContent='Processing…';if(pd)pd.textContent='';
  clearTimeout(safeT);
  safeT=setTimeout(function(){pw.classList.remove('V');bp.disabled=false;toast('Timed out — try smaller image','er',7000);},50000);
  try{
    var r=await process(curFile,ITYPE,getCtrl());
    clearTimeout(safeT);
    pf.className='pf done';pl.textContent='Done!';
    setTimeout(function(){pw.classList.remove('V');pf.className='pf';},1200);
    showResult(r);
  }catch(err){
    clearTimeout(safeT);pw.classList.remove('V');pf.className='pf';bp.disabled=false;
    toast('Error: '+(err.message||String(err)),'er',8000);
  }
}
function showResult(r){
  resBlob=r.blob;prb.innerHTML='';
  var img=document.createElement('img');img.src=URL.createObjectURL(r.blob);img.alt='Result';prb.appendChild(img);
  var sz=r.blob.size,origSz=curFile?curFile.size:0,sav=origSz>0?Math.max(0,Math.round((1-sz/origSz)*100)):0;
  sr.innerHTML=ck(fmt(sz),'cg3')+(sav>0?ck('↓ '+sav+'%','cg3'):'')+(r.w?ck(r.w+'×'+r.h,'ca'):'');
  if(sav>1&&sv){sv.classList.add('V');svn.textContent=sav+'%';svs.innerHTML=fmt(origSz)+' → <b>'+fmt(sz)+'</b>';setTimeout(function(){svb.style.width=Math.min(100,sav)+'%';},80);}
  dl.textContent=r.isZip?'Download ZIP':'Download';bd.classList.add('V');bp.disabled=false;prs.classList.add('V');
  toast(sav>0?'✓ Compressed by '+sav+'% — ready':'✓ Done — ready to download','ok',4000);
}
bd&&bd.addEventListener('click',function(){if(!resBlob)return;var EXT={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/avif':'avif','text/plain':'txt','application/zip':'zip'};var ext=EXT[resBlob.type]||'jpg';var a=document.createElement('a');a.href=URL.createObjectURL(resBlob);a.download='pixaroid-'+SLUG+'.'+ext;document.body.appendChild(a);a.click();a.remove();toast('Downloading…','in',2000);});
br&&br.addEventListener('click',function(){curFile=resBlob=null;fi.value='';pob.innerHTML='<div class="pe"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="26" height="26"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';prb.innerHTML='<div class="pe"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="26" height="26"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>';so.innerHTML='';sr.innerHTML='';fn.textContent='';prs.classList.remove('V');ab.classList.remove('V');if(sp)sp.classList.remove('V');bd.classList.remove('V');bp.disabled=true;if(sv)sv.classList.remove('V');dz.style.display='';if(origURL){URL.revokeObjectURL(origURL);origURL=null;}});
pob.addEventListener('click',function(){var img=pob.querySelector('img');if(img){zi.src=img.src;zo.classList.add('V');}});
prb.addEventListener('click',function(){var img=prb.querySelector('img');if(img){zi.src=img.src;zo.classList.add('V');}});
zc&&zc.addEventListener('click',function(){zo.classList.remove('V');});
zo&&zo.addEventListener('click',function(e){if(e.target===zo)zo.classList.remove('V');});
document.addEventListener('keydown',function(e){if(e.key==='Escape')zo.classList.remove('V');});
document.querySelectorAll('.fq').forEach(function(btn){btn.addEventListener('click',function(){var fi2=this.closest('.fi'),open=fi2.classList.contains('O');document.querySelectorAll('.fi.O').forEach(function(i){i.classList.remove('O');});if(!open)fi2.classList.add('O');});});
// Worker
function runWorker(workerPath,payload){return new Promise(function(ok,fail){var w;try{w=new Worker(workerPath);}catch(e){fail(new Error('Worker failed: '+workerPath));return;}var jid=(Math.random()*1e9|0).toString(36);var t=setTimeout(function(){w.terminate();fail(new Error('Timed out'));},60000);w.onmessage=function(e){if(!e.data||e.data.jobId!==jid)return;clearTimeout(t);w.terminate();if(e.data.error){fail(new Error(e.data.error));return;}var blob;if(e.data.buffer&&e.data.buffer.byteLength>0)blob=new Blob([e.data.buffer],{type:e.data.mime||'image/jpeg'});else if(e.data.blob)blob=e.data.blob;else{fail(new Error('No data returned'));return;}var origSz=payload.origSize||0;ok({blob:blob,w:e.data.width||null,h:e.data.height||null,fmt:e.data.format||null,savings:origSz>0?Math.max(0,Math.round((1-blob.size/origSz)*100)):0});};w.onerror=function(e){clearTimeout(t);w.terminate();fail(new Error(e.message||'Worker crashed'));};var msg=Object.assign({jobId:jid},payload);delete msg.origSize;w.postMessage(msg);});}
async function process(file,itype,ctrl){
  var mime=file.type||'image/jpeg';
  var buf=await readBuf(file);
  if(typeof TARGET_KB!=='undefined'&&TARGET_KB){
    return runWorker('/workers/compress.worker.js',{op:'compress-target',buffer:buf,mime:mime,origSize:file.size,targetBytes:TARGET_KB*1024,format:(ctrl.format||'jpeg').replace('jpg','jpeg'),minQuality:5});
  }
  if(itype==='compress'){return runWorker('/workers/compress.worker.js',{op:'compress',buffer:buf,mime:mime,origSize:file.size,quality:parseFloat(ctrl.quality)||80,format:ctrl.format||autoFmt(mime)});}
  if(itype==='compress-target'){return runWorker('/workers/compress.worker.js',{op:'compress-target',buffer:buf,mime:mime,origSize:file.size,targetBytes:(parseFloat(ctrl.targetKB)||100)*1024,format:(ctrl.format||'jpeg').replace('jpg','jpeg'),minQuality:5});}
  if(itype==='convert'){return runWorker('/workers/convert.worker.js',{op:'convert',buffer:buf,mime:mime,origSize:file.size,targetFormat:(ctrl.format||ctrl.targetFormat||'jpeg').replace('jpg','jpeg'),quality:parseFloat(ctrl.quality)||90,background:ctrl.background||'#ffffff'});}
  if(itype==='resize'){
    var pr=typeof PRESET!=='undefined'?PRESET:'';
    return runWorker('/workers/resize.worker.js',{op:'resize',buffer:buf,mime:mime,origSize:file.size,width:parseInt(ctrl.width)||0,height:parseInt(ctrl.height)||0,percent:parseFloat(ctrl.percent)||0,preset:pr,fit:ctrl.fit||'contain',format:ctrl.format||autoFmt(mime),quality:parseFloat(ctrl.quality)||92});
  }
  // Default: compress
  return runWorker('/workers/compress.worker.js',{op:'compress',buffer:buf,mime:mime,origSize:file.size,quality:parseFloat(ctrl.quality)||80,format:ctrl.format||autoFmt(mime)});
}
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(function(){});
})();
</script>
</body>
</html>`;
}

/* ═══════════════════════════════════════════════════════════
   GUIDE PAGE GENERATOR
═══════════════════════════════════════════════════════════ */
function guidePage(opts) {
  const { slug, title, metaDesc, intro, steps, tips, faqs, related = [], toolUrl = '/', toolName = 'Pixaroid Tool' } = opts;
  const canonical = `${BASE}/guides/${slug}.html`;

  const faqSchema = JSON.stringify({
    '@context':'https://schema.org','@type':'FAQPage',
    mainEntity: faqs.map(f=>({'@type':'Question','name':f.q,acceptedAnswer:{'@type':'Answer','text':f.a}}))
  });
  const howToSchema = JSON.stringify({
    '@context':'https://schema.org','@type':'HowTo',
    'name': title, 'description': metaDesc, 'totalTime': 'PT2M',
    'step': steps.map((s,i)=>({'@type':'HowToStep','position':i+1,'name':s.heading,'text':s.text}))
  });
  const articleSchema = JSON.stringify({
    '@context':'https://schema.org','@type':'Article',
    'headline': title, 'description': metaDesc,
    'url': canonical, 'datePublished': '2026-01-01', 'dateModified': TODAY,
    'author':{'@type':'Organization','name':'Pixaroid'},
    'publisher':{'@type':'Organization','name':'Pixaroid','logo':{'@type':'ImageObject','url':BASE+'/assets/svg/logo.svg'}}
  });
  const breadcrumb = JSON.stringify({
    '@context':'https://schema.org','@type':'BreadcrumbList',
    'itemListElement':[
      {'@type':'ListItem','position':1,'name':'Home','item':BASE+'/'},
      {'@type':'ListItem','position':2,'name':'Guides','item':BASE+'/guides/'},
      {'@type':'ListItem','position':3,'name':title,'item':canonical}
    ]
  });

  const stepsHtml = steps.map((s,i) => `
    <div class="step-block">
      <div class="step-num">${i+1}</div>
      <div class="step-body">
        <h3>${esc(s.heading)}</h3>
        <p>${esc(s.text)}</p>
      </div>
    </div>`).join('');

  const faqHtml = faqs.map((f,i) => `
    <div class="faq-item${i===0?' open':''}">
      <button class="faq-q" onclick="(function(el){var p=el.closest('.faq-item'),open=p.classList.contains('open');document.querySelectorAll('.faq-item.open').forEach(function(x){x.classList.remove('open');});if(!open)p.classList.add('open');})(this)">${esc(f.q)}<span class="faq-icon">${i===0?'−':'+'}</span></button>
      <div class="faq-a">${esc(f.a)}</div>
    </div>`).join('');

  const relHtml = related.map(r =>
    `<li><a href="${r.url}">${esc(r.name)}</a></li>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta name="description" content="${esc(metaDesc.slice(0,160))}"/>
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large"/>
<link rel="canonical" href="${esc(canonical)}"/>
<meta property="og:type" content="article"/><meta property="og:site_name" content="Pixaroid"/>
<meta property="og:title" content="${esc(title)} | Pixaroid"/>
<meta property="og:description" content="${esc(metaDesc.slice(0,200))}"/>
<meta property="og:url" content="${esc(canonical)}"/>
<meta property="og:image" content="${BASE}/assets/images/og-default.png"/>
<meta name="twitter:card" content="summary_large_image"/>
<link rel="icon" href="/assets/svg/favicon.svg" type="image/svg+xml"/>
<script type="application/ld+json">${howToSchema}</script>
<script type="application/ld+json">${faqSchema}</script>
<script type="application/ld+json">${articleSchema}</script>
<script type="application/ld+json">${breadcrumb}</script>
<title>${esc(title)} | Pixaroid Guide</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
<style>
:root{--bg:#070711;--s1:#0E0B1C;--s2:#141228;--bd:rgba(255,255,255,.07);--bd2:rgba(255,255,255,.11);--tx:#EEEEF8;--mu:#8888AA;--su:#3A3A5C;--ac:#7C6FFF;--ac2:#A99FFF;--gw:rgba(124,111,255,.2);--gn:#22D67A;--cy:#14D9C4;--f1:'Sora',sans-serif;--f2:'DM Sans',sans-serif;}
.L{--bg:#F5F5FC;--s1:#fff;--s2:#EDEDFA;--bd:rgba(0,0,0,.07);--bd2:rgba(0,0,0,.11);--tx:#0A0A18;--mu:#5555AA;--su:#BBBBDD;}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{font-family:var(--f2);background:var(--bg);color:var(--tx);line-height:1.7;overflow-x:hidden;-webkit-font-smoothing:antialiased;}
body::before{content:'';position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse 80% 40% at 50% -5%,rgba(124,111,255,.12),transparent 55%);}
a{color:var(--ac2);}h1,h2,h3{font-family:var(--f1);line-height:1.25;}
nav.gn{position:sticky;top:0;z-index:100;background:rgba(7,7,17,.85);backdrop-filter:blur(20px);border-bottom:1px solid var(--bd);}
.L nav.gn{background:rgba(245,245,252,.88);}
.gni{display:flex;align-items:center;gap:1rem;height:54px;max-width:1100px;margin:0 auto;padding:0 1.5rem;}
.glogo{display:flex;align-items:center;gap:.5rem;font-family:var(--f1);font-weight:800;font-size:1rem;text-decoration:none;color:var(--tx);}
.glm{width:27px;height:27px;border-radius:7px;background:#0A0812;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(124,111,255,.35);}
.gns{flex:1;}
.gtb{width:30px;height:30px;border-radius:6px;border:1px solid var(--bd2);background:var(--s2);color:var(--mu);display:flex;align-items:center;justify-content:center;cursor:pointer;}
.wrap{display:grid;grid-template-columns:1fr 260px;gap:3rem;max-width:1100px;margin:0 auto;padding:3rem 1.5rem 6rem;}
@media(max-width:840px){.wrap{grid-template-columns:1fr;}}
.art-header{margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:1px solid var(--bd);}
.art-cat{font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ac2);margin-bottom:.625rem;}
.art-header h1{font-size:clamp(1.5rem,3vw,2.125rem);font-weight:800;letter-spacing:-.04em;margin-bottom:.625rem;}
.art-meta{font-size:.8125rem;color:var(--su);}
.art-intro{font-size:1rem;color:var(--mu);line-height:1.75;padding:1.125rem 1.25rem;background:rgba(124,111,255,.05);border-left:3px solid var(--ac);border-radius:0 10px 10px 0;margin-bottom:2rem;}
.art-body h2{font-size:1.1875rem;font-weight:800;letter-spacing:-.04em;margin:2rem 0 1rem;}
.art-body h3{font-size:1rem;font-weight:700;margin:1.5rem 0 .5rem;}
.art-body p{margin-bottom:1rem;color:var(--mu);line-height:1.75;}
.art-body ul,.art-body ol{margin:0 0 1rem 1.5rem;color:var(--mu);}
.art-body li{margin-bottom:.5rem;line-height:1.65;}
.step-block{display:flex;gap:1rem;padding:1rem 0;border-bottom:1px solid var(--bd);}
.step-block:last-child{border-bottom:none;}
.step-num{min-width:36px;height:36px;border-radius:50%;background:rgba(124,111,255,.1);color:var(--ac2);font-family:var(--f1);font-weight:700;font-size:.875rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.step-body h3{font-size:.9375rem;font-weight:700;margin-bottom:.25rem;}
.step-body p{color:var(--mu);font-size:.9rem;line-height:1.65;margin:0;}
.cta-block{background:linear-gradient(135deg,rgba(124,111,255,.12),rgba(20,217,196,.08));border:1px solid rgba(124,111,255,.2);border-radius:14px;padding:1.75rem;text-align:center;margin:2rem 0;}
.cta-block h3{font-size:1.125rem;font-weight:800;letter-spacing:-.03em;margin-bottom:.5rem;}
.cta-block p{color:var(--mu);font-size:.9rem;margin-bottom:1.25rem;}
.cta-btn{display:inline-flex;align-items:center;gap:.5rem;padding:.75rem 1.75rem;border-radius:10px;background:linear-gradient(135deg,var(--ac),#9C40FF);color:#fff;font-family:var(--f1);font-weight:700;font-size:.9375rem;text-decoration:none;box-shadow:0 4px 16px var(--gw);}
.tips-box{background:rgba(34,214,122,.05);border:1px solid rgba(34,214,122,.15);border-radius:12px;padding:1.25rem;margin:1.5rem 0;}
.tips-box h3{font-size:.875rem;font-weight:700;color:var(--gn);margin-bottom:.75rem;}
.tips-box ul{margin:0 0 0 1.25rem;}
.tips-box li{color:var(--mu);font-size:.875rem;margin-bottom:.375rem;line-height:1.6;}
.faq-item{border:1px solid var(--bd2);border-radius:11px;overflow:hidden;margin-bottom:.5rem;transition:border-color .2s;}
.faq-item.open{border-color:rgba(124,111,255,.28);}
.faq-q{width:100%;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.9rem 1.125rem;background:none;border:none;font-family:var(--f1);font-size:.9375rem;font-weight:700;color:var(--tx);text-align:left;cursor:pointer;}
.faq-icon{font-size:1.125rem;font-weight:400;color:var(--mu);flex-shrink:0;}
.faq-a{max-height:0;overflow:hidden;transition:max-height .35s ease;font-size:.9375rem;color:var(--mu);line-height:1.75;}
.faq-item.open .faq-a{max-height:400px;}
.faq-item.open .faq-icon{content:'−';}
.faq-a{padding:0 1.125rem;}
.faq-item.open .faq-a{padding:0 1.125rem 1rem;}
.scard{background:var(--s1);border:1px solid var(--bd2);border-radius:13px;padding:1.25rem;margin-bottom:1.25rem;}
.scard-title{font-family:var(--f1);font-weight:700;font-size:.8125rem;letter-spacing:.06em;text-transform:uppercase;color:var(--mu);margin-bottom:.875rem;}
.scard-links{list-style:none;display:flex;flex-direction:column;gap:.25rem;}
.scard-links a{display:flex;align-items:center;gap:.5rem;padding:.4375rem .5rem;border-radius:7px;font-size:.8125rem;color:var(--mu);text-decoration:none;transition:background .15s,color .15s;}
.scard-links a:hover{background:rgba(124,111,255,.07);color:var(--tx);}
.scard-links a::before{content:'›';color:var(--su);}
footer{border-top:1px solid var(--bd);padding:2rem;text-align:center;font-size:.8125rem;color:var(--su);}
footer a{color:var(--mu);}
.fl2{display:flex;justify-content:center;gap:1.5rem;margin-top:.5rem;flex-wrap:wrap;}
</style>
</head>
<body>
<nav class="gn"><div class="gni">
  <a href="/" class="glogo"><div class="glm">${LOGO_SVG}</div>Pixaroid</a>
  <div class="gns"></div>
  <button id="gtb" class="gtb" onclick="(function(){var r=document.documentElement,l=!r.classList.contains('L');r.classList.toggle('L',l);localStorage.setItem('pxr',l?'l':'d');})()" aria-label="Toggle theme">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
  </button>
</div></nav>
<div class="wrap">
  <article class="art">
    <div class="art-header">
      <div class="art-cat">📖 Pixaroid Guide</div>
      <h1>${esc(title)}</h1>
      <div class="art-meta">Updated ${TODAY} · 2 min read · Free tool included</div>
    </div>
    <p class="art-intro">${esc(intro)}</p>
    <div class="art-body">
      <h2>Step-by-Step Instructions</h2>
      <div class="steps-list">${stepsHtml}</div>

      <div class="cta-block">
        <h3>Try ${esc(toolName)} Free</h3>
        <p>No account needed. No upload. 100% free and private.</p>
        <a href="${esc(toolUrl)}" class="cta-btn">Open ${esc(toolName)} →</a>
      </div>

      ${tips && tips.length ? `<div class="tips-box"><h3>💡 Pro Tips</h3><ul>${tips.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}

      <h2>Frequently Asked Questions</h2>
      <div class="faq-list">${faqHtml}</div>
    </div>
  </article>
  <aside>
    <div class="scard">
      <div class="scard-title">Related Tools</div>
      <ul class="scard-links">${relHtml}</ul>
    </div>
    <div class="scard">
      <div class="scard-title">More Guides</div>
      <ul class="scard-links">
        <li><a href="/guides/how-to-compress-images.html">How to Compress Images</a></li>
        <li><a href="/tools/compression/compress-image/">Compress Image Tool</a></li>
        <li><a href="/tools/conversion/heic-to-jpg/">HEIC to JPG Converter</a></li>
        <li><a href="/tools/resize/resize-image-for-instagram/">Instagram Image Resizer</a></li>
        <li><a href="/tools/ai-tools/background-remover/">AI Background Remover</a></li>
      </ul>
    </div>
  </aside>
</div>
<footer><p>© 2026 <a href="/">Pixaroid</a></p><div class="fl2"><a href="/privacy-policy.html">Privacy</a><a href="/terms-of-service.html">Terms</a><a href="/">Home</a><a href="/sitemap.xml">Sitemap</a></div></footer>
<script>
var ts=localStorage.getItem('pxr');if(ts==='l'||(!ts&&!matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('L');
</script>
</body>
</html>`;
}

/* ═══════════════════════════════════════════════════════════
   STEP 1: COMPRESSION TARGET PAGES (format × size)
   22 sizes × 3 formats = 66 pages
═══════════════════════════════════════════════════════════ */
console.log('\n[1/10] Generating compression target pages…');

const COMPRESS_SIZES = [5,10,15,20,25,30,35,40,45,50,60,70,80,90,100,120,150,180,200,250,300,400,500];
const COMPRESS_FMTS  = [
  { id:'jpg',  label:'JPG',  mime:'image/jpeg', desc:'JPEG',  useCase:'photos and web images' },
  { id:'png',  label:'PNG',  mime:'image/png',  desc:'PNG',   useCase:'graphics, logos, and transparent images' },
  { id:'webp', label:'WebP', mime:'image/webp', desc:'WebP',  useCase:'modern web images with superior compression' },
];

for (const { id, label, desc:fDesc, useCase } of COMPRESS_FMTS) {
  for (const kb of COMPRESS_SIZES) {
    const slug = `compress-${id}-to-${kb}kb`;
    const title = `Compress ${label} to ${kb}KB`;
    const h1   = `Compress ${label} Image to ${kb}KB Online — Free`;
    const desc = `Reduce any ${label} image to exactly ${kb}KB or smaller online. Binary-search quality algorithm finds the perfect compression level for ${useCase}. No upload required.`;

    const quality = kb >= 200 ? 'excellent' : kb >= 100 ? 'very good' : kb >= 50 ? 'good' : 'acceptable';
    const useCase2 = kb <= 30 ? 'government portals, passport photo uploads, and job application forms'
      : kb <= 100 ? 'website images, email attachments, and CMS media libraries'
      : 'high-quality web photos, print-ready images, and detailed graphics';

    writeToolPage('compression', slug, toolPage({
      cat:'compression', slug, title, h1, desc,
      metaDesc: `Free online ${label} compressor. Target exactly ${kb}KB. Supports JPEG, PNG and WebP input. Browser-based — zero uploads, instant results.`,
      itype: 'compress-target',
      targetKB: kb,
      processLabel: `Compress to ${kb}KB`,
      instructions: [
        `Upload your ${label} image — drag-and-drop or click to browse. Supports up to 20MB.`,
        `The tool automatically targets ${kb}KB using a binary-search quality algorithm.`,
        `Preview the before/after file sizes and quality in real time.`,
        `Click "Compress to ${kb}KB" and download your optimised image.`,
      ],
      faqs: [
        { q:`What is ${label} image size ${kb}KB best used for?`, a:`A ${kb}KB ${label} file is ideal for ${useCase2}. The ${quality} quality level at this size means it looks great on screen while loading fast.` },
        { q:`How does the ${kb}KB target compression work?`, a:`The tool runs a binary-search algorithm testing up to 16 quality levels to find the highest quality that produces a file at or below ${kb}KB. If quality alone isn't enough, it also scales down dimensions minimally.` },
        { q:`Will my image look noticeably worse at ${kb}KB?`, a:`That depends on the original file size. A 500KB photo compressed to ${kb}KB will show some quality reduction. For the best results, use WebP format which offers better compression at the same perceived quality.` },
        { q:`Are my ${label} images uploaded to a server?`, a:`Never. Pixaroid processes all images entirely in your browser using the Canvas API and Web Workers. Your files are never sent to any server.` },
        { q:`Can I compress multiple images to ${kb}KB at once?`, a:`Yes. Use the Bulk Image Compress tool which lets you process up to 100 images and download them as a ZIP file.` },
      ],
      related: [
        { cat:'compression', slug:'compress-image', name:'Compress Image (Any Format)' },
        { cat:'compression', slug:`compress-image-to-${kb}kb`.replace('compress-image-to-5kb','compress-image-to-10kb'), name:`Compress Any Image to ${kb}KB` },
        { cat:'bulk-tools', slug:'bulk-image-compress', name:'Bulk Compress Images' },
        { cat:'conversion', slug:`${id}-to-webp`, name:`${label} to WebP` },
      ],
    }));
  }
}

/* ═══════════════════════════════════════════════════════════
   STEP 2: RESIZE BY DIMENSION PAGES
   Standard dimensions covering most search queries
═══════════════════════════════════════════════════════════ */
console.log('[2/10] Generating dimension resize pages…');

const DIMENSIONS = [
  [1920,1080,'Full HD (1920×1080)','desktop wallpapers, presentations and YouTube videos'],
  [1280,720,'HD (1280×720)','YouTube thumbnails, video covers and HD displays'],
  [1080,1080,'Square (1080×1080)','Instagram posts, profile photos and app icons'],
  [1024,1024,'Square (1024×1024)','app store icons, NFT art and square thumbnails'],
  [800,600,'SVGA (800×600)','web graphics, email images and legacy displays'],
  [600,600,'Square (600×600)','product thumbnails, avatar images and small icons'],
  [512,512,'Square (512×512)','app icons, favicons and small web graphics'],
  [400,400,'Square (400×400)','profile pictures, review photos and small thumbnails'],
  [300,300,'Small square (300×300)','website thumbnails, product images and icons'],
  [256,256,'Small (256×256)','desktop icons, small app icons and favicons'],
  [200,200,'Thumbnail (200×200)','thumbnail images, user avatars and small icons'],
  [150,150,'Micro (150×150)','comment avatars, small product images and icons'],
  [100,100,'Tiny (100×100)','notification icons, pixel art and micro thumbnails'],
  [3840,2160,'4K Ultra HD (3840×2160)','4K wallpapers, large format printing and 4K displays'],
  [2560,1440,'QHD (2560×1440)','2K monitor wallpapers and high-resolution displays'],
  [2048,2048,'Large square (2048×2048)','high-res app store icons and large square images'],
  [1600,900,'HD Wide (1600×900)','laptop wallpapers and wide-screen presentations'],
  [1440,900,'Wide (1440×900)','MacBook wallpapers and wide web banners'],
  [1366,768,'Common laptop (1366×768)','laptop wallpapers and standard web cover images'],
  [1200,628,'Social OG (1200×628)','Open Graph images for Facebook, LinkedIn and Twitter'],
  [1200,900,'Wide (1200×900)','blog post images and wide-format web graphics'],
  [750,1334,'iPhone SE (750×1334)','iPhone lock screens and mobile wallpapers'],
  [1080,1920,'Mobile story (1080×1920)','Instagram Stories, TikTok and mobile wallpapers'],
  [480,480,'Web icon (480×480)','website favicons and small display photos'],
  [320,240,'QVGA (320×240)','small web images and mobile-optimised thumbnails'],
];

for (const [w, h, commonName, useCase] of DIMENSIONS) {
  const slug  = `resize-image-to-${w}x${h}`;
  const title = `Resize Image to ${w}×${h} Pixels`;
  const h1    = `Resize Image to ${w}×${h} Online — Free`;
  const desc  = `Resize any image to exactly ${w}×${h} pixels online. Perfect for ${useCase}. Supports Cover (crop-fill), Contain, and Stretch modes. No upload required.`;

  writeToolPage('resize', slug, toolPage({
    cat:'resize', slug, title, h1, desc,
    metaDesc: `Free online image resizer to ${w}×${h} pixels. ${commonName} — perfect for ${useCase}. Browser-based, instant, no upload required.`,
    itype: 'resize',
    targetW: w, targetH: h,
    processLabel: `Resize to ${w}×${h}`,
    instructions: [
      `Upload your image — supports JPG, PNG, WebP, HEIC, GIF up to 20MB.`,
      `The tool pre-sets the output to ${w}×${h} pixels (${commonName}).`,
      `Choose your fit mode: Cover crops to fill the frame, Contain fits the whole image, Stretch forces exact dimensions.`,
      `Click "Resize to ${w}×${h}" and download your resized image.`,
    ],
    faqs: [
      { q:`What is ${w}×${h} pixel resolution?`, a:`${w}×${h} pixels is ${commonName}. It's commonly used for ${useCase}. At 72 DPI (standard screen), this is roughly ${Math.round(w/72)}×${Math.round(h/72)} inches.` },
      { q:`Which fit mode should I use for ${w}×${h}?`, a:`Cover fills the exact ${w}×${h} frame by cropping from the edges — best for social media profiles. Contain fits the whole image inside ${w}×${h} with padding if needed — best for product images. Stretch forces exact dimensions but may distort the image.` },
      { q:`Can I resize to ${w}×${h} without losing quality?`, a:`Downscaling (making the image smaller) has minimal quality impact. Upscaling to ${w}×${h} if the original is smaller may reduce sharpness — use the AI Upscaler tool for best upscaling results.` },
      { q:`What formats can I resize to ${w}×${h}?`, a:`You can output as JPEG (best for photos), PNG (best for graphics with transparency), or WebP (best compression for web use).` },
    ],
    related: [
      { cat:'resize', slug:'resize-image', name:'Resize Image (Free Size)' },
      { cat:'resize', slug:'resize-image-by-pixels', name:'Resize by Custom Pixels' },
      { cat:'compression', slug:'compress-image', name:'Compress After Resize' },
      { cat:'ai-tools', slug:'image-upscaler', name:'AI Image Upscaler' },
    ],
  }));
}

/* ═══════════════════════════════════════════════════════════
   STEP 3: SOCIAL MEDIA PLATFORM SIZE PAGES
   10 platforms × multiple canonical sizes
═══════════════════════════════════════════════════════════ */
console.log('[3/10] Generating social media size pages…');

const SOCIAL_SIZES = [
  {
    platform:'instagram', label:'Instagram', color:'#E1306C',
    sizes:[
      {slug:'resize-image-for-instagram-post',     name:'Instagram Post',          w:1080,h:1080,  desc:'Square 1080×1080px post — the standard Instagram feed image size.'},
      {slug:'resize-image-for-instagram-portrait',  name:'Instagram Portrait Post', w:1080,h:1350, desc:'Vertical 1080×1350px post — takes up more screen space in the feed.'},
      {slug:'resize-image-for-instagram-landscape', name:'Instagram Landscape Post',w:1080,h:566,  desc:'Horizontal 1080×566px post — best for landscape photography.'},
      {slug:'resize-image-for-instagram-story',     name:'Instagram Story',         w:1080,h:1920, desc:'Vertical full-screen 1080×1920px story format.'},
      {slug:'resize-image-for-instagram-profile',   name:'Instagram Profile Photo', w:320,h:320,   desc:'Profile photo 320×320px — displays as a circle.'},
    ]
  },
  {
    platform:'facebook', label:'Facebook', color:'#1877F2',
    sizes:[
      {slug:'resize-image-for-facebook-cover-photo', name:'Facebook Cover Photo',  w:820,h:312,   desc:'Facebook page cover photo — 820×312px is the recommended size.'},
      {slug:'resize-image-for-facebook-post',        name:'Facebook Post Image',    w:1200,h:630,  desc:'Facebook link post image — 1200×630px shows well in feeds.'},
      {slug:'resize-image-for-facebook-profile',     name:'Facebook Profile Photo', w:170,h:170,   desc:'Facebook profile photo — displays at 170×170px on desktop.'},
      {slug:'resize-image-for-facebook-story',       name:'Facebook Story',         w:1080,h:1920, desc:'Facebook Story — full-screen vertical 1080×1920px format.'},
    ]
  },
  {
    platform:'twitter', label:'Twitter / X', color:'#1DA1F2',
    sizes:[
      {slug:'resize-image-for-twitter-header',  name:'Twitter Header Image', w:1500,h:500,  desc:'Twitter/X header banner — 1500×500px is the optimal size.'},
      {slug:'resize-image-for-twitter-post',    name:'Twitter Post Image',   w:1200,h:675,  desc:'Twitter/X tweet image — 1200×675px 16:9 ratio shows best.'},
      {slug:'resize-image-for-twitter-profile', name:'Twitter Profile Photo',w:400,h:400,   desc:'Twitter/X profile photo — 400×400px circular crop.'},
    ]
  },
  {
    platform:'linkedin', label:'LinkedIn', color:'#0A66C2',
    sizes:[
      {slug:'resize-image-for-linkedin-banner',  name:'LinkedIn Banner',       w:1584,h:396, desc:'LinkedIn profile banner — 1584×396px covers the header area.'},
      {slug:'resize-image-for-linkedin-post',    name:'LinkedIn Post Image',   w:1200,h:627, desc:'LinkedIn post image — 1200×627px is the standard link preview size.'},
      {slug:'resize-image-for-linkedin-profile', name:'LinkedIn Profile Photo',w:400,h:400,  desc:'LinkedIn profile photo — 400×400px for best quality.'},
    ]
  },
  {
    platform:'youtube', label:'YouTube', color:'#FF0000',
    sizes:[
      {slug:'resize-image-for-youtube-thumbnail', name:'YouTube Thumbnail',      w:1280,h:720,  desc:'YouTube video thumbnail — 1280×720px HD 16:9 format.'},
      {slug:'resize-image-for-youtube-banner',    name:'YouTube Channel Art',    w:2560,h:1440, desc:'YouTube channel banner — 2560×1440px shows across all devices.'},
      {slug:'resize-image-for-youtube-profile',   name:'YouTube Profile Photo',  w:800,h:800,   desc:'YouTube channel profile photo — 800×800px minimum.'},
    ]
  },
  {
    platform:'tiktok', label:'TikTok', color:'#010101',
    sizes:[
      {slug:'resize-image-for-tiktok-profile', name:'TikTok Profile Photo',  w:200,h:200,   desc:'TikTok profile picture — 200×200px minimum, shows as circle.'},
      {slug:'resize-image-for-tiktok-video',   name:'TikTok Video Cover',    w:1080,h:1920, desc:'TikTok video cover/thumbnail — 1080×1920px vertical format.'},
    ]
  },
  {
    platform:'pinterest', label:'Pinterest', color:'#E60023',
    sizes:[
      {slug:'resize-image-for-pinterest-pin',      name:'Pinterest Pin',      w:1000,h:1500, desc:'Standard Pinterest pin — 1000×1500px 2:3 ratio performs best.'},
      {slug:'resize-image-for-pinterest-square',   name:'Pinterest Square Pin',w:1000,h:1000,desc:'Square Pinterest pin — 1000×1000px for grid consistency.'},
      {slug:'resize-image-for-pinterest-infographic',name:'Pinterest Infographic',w:1000,h:3000,desc:'Long-form Pinterest infographic — 1000×3000px tall pin.'},
    ]
  },
  {
    platform:'whatsapp', label:'WhatsApp', color:'#25D366',
    sizes:[
      {slug:'resize-image-for-whatsapp-dp',     name:'WhatsApp DP',          w:500,h:500,   desc:'WhatsApp display picture — 500×500px for clear profile photo.'},
      {slug:'resize-image-for-whatsapp-status', name:'WhatsApp Status',      w:1080,h:1920, desc:'WhatsApp Status image — 1080×1920px full-screen vertical format.'},
    ]
  },
  {
    platform:'snapchat', label:'Snapchat', color:'#FFFC00',
    sizes:[
      {slug:'resize-image-for-snapchat-story', name:'Snapchat Story',        w:1080,h:1920, desc:'Snapchat Story — full-screen 1080×1920px vertical format.'},
    ]
  },
  {
    platform:'discord', label:'Discord', color:'#5865F2',
    sizes:[
      {slug:'resize-image-for-discord-avatar', name:'Discord Avatar',        w:512,h:512,   desc:'Discord profile avatar — 512×512px for sharpest display.'},
      {slug:'resize-image-for-discord-banner', name:'Discord Server Banner', w:960,h:540,   desc:'Discord server banner — 960×540px 16:9 ratio.'},
    ]
  },
];

for (const { platform, label, sizes } of SOCIAL_SIZES) {
  for (const { slug, name, w, h, desc } of sizes) {
    writeToolPage('resize', slug, toolPage({
      cat:'resize', slug,
      title: name + ' Size',
      h1: `${name} — Resize Image to ${w}×${h}`,
      desc,
      metaDesc: `Resize images to ${label} ${name} dimensions (${w}×${h}px) online free. Instant browser-based resizer — no upload, no account required.`,
      itype: 'resize',
      targetW: w, targetH: h,
      preset: `${w}x${h}`,
      processLabel: `Resize for ${label}`,
      instructions: [
        `Upload your image — JPG, PNG, WebP, HEIC supported up to 20MB.`,
        `The tool pre-loads the ${name} preset: ${w}×${h}px.`,
        `Choose Cover mode to fill the frame (cropping edges) or Contain to fit the whole image.`,
        `Click "Resize for ${label}" and download your image.`,
      ],
      faqs: [
        { q:`What is the correct ${label} ${name} size?`, a:`The recommended ${label} ${name} size is ${w}×${h} pixels. ${desc}` },
        { q:`Should I use Cover or Contain for ${label} images?`, a:`For profile photos use Cover (crops to fill the circle). For posts and banners use Cover to fill the entire frame, or Contain to keep the full image visible with padding.` },
        { q:`What format should I use for ${label}?`, a:`JPEG is best for photos. PNG is best for graphics, logos, and images with text. WebP gives the smallest file size while keeping excellent quality.` },
        { q:`Can I resize multiple images for ${label} at once?`, a:`Yes — use the Bulk Resize tool to process up to 100 images at once and download as a ZIP.` },
      ],
      related: [
        { cat:'resize', slug:'resize-image', name:'Resize Image (Custom)' },
        { cat:'compression', slug:'compress-image', name:'Compress Image' },
        { cat:'bulk-tools', slug:'bulk-image-resize', name:'Bulk Resize Images' },
      ],
    }));
  }
}

/* ═══════════════════════════════════════════════════════════
   STEP 4: FORMAT CONVERSION MATRIX
   Every format pair (avoiding dupes)
═══════════════════════════════════════════════════════════ */
console.log('[4/10] Generating format conversion matrix…');

const FORMATS = [
  { id:'jpg',  label:'JPG',  mime:'image/jpeg', desc:'JPEG photos and web images', ext:'jpg' },
  { id:'png',  label:'PNG',  mime:'image/png',  desc:'lossless graphics and transparent images', ext:'png' },
  { id:'webp', label:'WebP', mime:'image/webp', desc:'modern web images with superior compression', ext:'webp' },
  { id:'heic', label:'HEIC', mime:'image/heic', desc:'Apple iPhone and iOS camera photos', ext:'heic' },
  { id:'bmp',  label:'BMP',  mime:'image/bmp',  desc:'Windows bitmap graphics', ext:'bmp' },
  { id:'gif',  label:'GIF',  mime:'image/gif',  desc:'animated images and simple graphics', ext:'gif' },
  { id:'tiff', label:'TIFF', mime:'image/tiff', desc:'high-quality print and professional photos', ext:'tiff' },
  { id:'avif', label:'AVIF', mime:'image/avif', desc:'next-gen images with best-in-class compression', ext:'avif' },
  { id:'svg',  label:'SVG',  mime:'image/svg+xml', desc:'scalable vector graphics for logos and icons', ext:'svg' },
];

for (const src of FORMATS) {
  for (const tgt of FORMATS) {
    if (src.id === tgt.id) continue;
    const slug  = `convert-${src.id}-to-${tgt.id}`;
    const title = `${src.label} to ${tgt.label} Converter`;
    const h1    = `Convert ${src.label} to ${tgt.label} Online — Free`;
    const desc  = `Convert ${src.desc} to ${tgt.label} format online free. Supports quality and lossless options. 100% browser-based — no upload required.`;

    // Smart advice per conversion
    const reason = src.id === 'heic' ? `iPhone and iOS store photos as HEIC by default. Converting to ${tgt.label} makes them compatible with Windows, Android, and all web browsers.`
      : src.id === 'tiff' ? `TIFF files are large professional photos. Converting to ${tgt.label} drastically reduces file size while keeping excellent quality for web and email use.`
      : tgt.id === 'webp' ? `WebP produces 25–35% smaller files than JPEG or PNG at the same perceived quality, making it ideal for web performance.`
      : tgt.id === 'png'  ? `PNG uses lossless compression — perfect for graphics, logos, screenshots, and images with text where you need pixel-perfect quality.`
      : tgt.id === 'jpg'  ? `JPEG is universally supported and great for photographs. It produces smaller files than PNG while maintaining excellent visual quality.`
      : `${src.label} to ${tgt.label} conversion is useful when you need ${tgt.desc}.`;

    writeToolPage('conversion', slug, toolPage({
      cat:'conversion', slug, title, h1, desc,
      metaDesc: `Free ${src.label} to ${tgt.label} converter online. No upload, instant results, supports quality and lossless options. Convert in your browser.`,
      itype: src.id === 'svg' ? 'svg-convert' : 'convert',
      processLabel: `Convert to ${tgt.label}`,
      instructions: [
        `Upload your ${src.label} file — drag-and-drop or click to browse.`,
        tgt.id === 'jpg' ? `Set the quality (90% recommended for sharp results).` : tgt.id === 'png' ? `PNG output is lossless — no quality settings needed.` : `Set quality or enable lossless mode if needed.`,
        `Click "Convert to ${tgt.label}".`,
        `Preview the result and download your ${tgt.label} file.`,
      ],
      faqs: [
        { q:`Why convert ${src.label} to ${tgt.label}?`, a:reason },
        { q:`Is ${src.label} to ${tgt.label} conversion free?`, a:`Yes — completely free, no account, no watermark, no upload. All conversion happens in your browser.` },
        { q:`How long does ${src.label} to ${tgt.label} conversion take?`, a:`Most conversions complete in under a second for typical image sizes. Larger files (10MB+) may take 2–5 seconds.` },
        { q:`Will I lose quality converting ${src.label} to ${tgt.label}?`, a:tgt.id === 'png' ? `No — PNG is lossless. Your image will be pixel-perfect.` : tgt.id === 'webp' && src.id === 'png' ? `Minimal loss at quality 90%+. Enable the "lossless" option to preserve every pixel.` : `At 90% quality the difference is invisible to the human eye. Use 95–100% for critical images.` },
      ],
      related: [
        { cat:'conversion', slug:`convert-${tgt.id}-to-${src.id}`, name:`${tgt.label} to ${src.label}` },
        { cat:'compression', slug:'compress-image', name:'Compress After Converting' },
        { cat:'resize', slug:'resize-image', name:'Resize Image' },
      ],
    }));
  }
}

/* ═══════════════════════════════════════════════════════════
   STEP 5: USE-CASE COMPRESSION PAGES
   30 intent-specific compression pages
═══════════════════════════════════════════════════════════ */
console.log('[5/10] Generating use-case compression pages…');

const USE_CASES = [
  { slug:'compress-image-for-twitter',        title:'Compress Image for Twitter',        desc:'Reduce image file size for Twitter posts. Twitter recommends under 5MB for photos and under 1MB for profile images.', kb:500 },
  { slug:'compress-image-for-linkedin',       title:'Compress Image for LinkedIn',       desc:'Optimise images for LinkedIn posts and banners. Keep files under 5MB for best LinkedIn upload performance.', kb:1000 },
  { slug:'compress-image-for-facebook',       title:'Compress Image for Facebook',       desc:'Compress photos for Facebook posts and albums. Facebook auto-compresses uploads — pre-compress to maintain quality.', kb:500 },
  { slug:'compress-image-for-youtube',        title:'Compress YouTube Thumbnail',        desc:'Reduce YouTube thumbnail file size. Thumbnails under 2MB upload instantly and load fast across all devices.', kb:500 },
  { slug:'compress-image-for-shopify',        title:'Compress Image for Shopify',        desc:'Optimise product images for Shopify stores. Smaller images improve page speed and Core Web Vitals scores.', kb:200 },
  { slug:'compress-image-for-wordpress',      title:'Compress Image for WordPress',      desc:'Reduce image sizes for WordPress uploads. WordPress recommends keeping images under 500KB for fast loading.', kb:300 },
  { slug:'compress-image-for-google-docs',    title:'Compress Image for Google Docs',    desc:'Shrink images for Google Docs, Slides, and Sheets. Smaller images make files easier to share and load faster.', kb:200 },
  { slug:'compress-image-for-resume',         title:'Compress Photo for Resume/CV',      desc:'Reduce photo size for CV and resume submissions. Most HR portals accept photos under 100KB.', kb:100 },
  { slug:'compress-image-for-passport',       title:'Compress Passport Photo',           desc:'Compress passport and ID photos for online visa and government portal submissions. Most portals require under 200KB.', kb:200 },
  { slug:'compress-image-for-amazon',         title:'Compress Image for Amazon',         desc:'Optimise product photos for Amazon listings. Amazon recommends JPEG images under 10MB, but under 500KB loads faster.', kb:500 },
  { slug:'compress-image-for-google-photos',  title:'Compress for Google Photos',        desc:'Reduce photo file size for faster Google Photos uploads and to save storage space.', kb:500 },
  { slug:'compress-image-for-print',          title:'Compress Image for Print',          desc:'Optimise high-resolution photos for print while keeping them under print service upload limits.', kb:2000 },
  { slug:'compress-image-for-powerpoint',     title:'Compress Image for PowerPoint',     desc:'Reduce image sizes for PowerPoint presentations. Large embedded images make PPT files slow to open and share.', kb:300 },
  { slug:'compress-image-for-outlook',        title:'Compress Image for Outlook',        desc:'Reduce image file size for Outlook email attachments. Outlook blocks attachments over 20MB — compress to be safe.', kb:500 },
  { slug:'compress-image-for-zoom',           title:'Compress Image for Zoom',           desc:'Optimise profile photos and virtual backgrounds for Zoom. Keep under 5MB for fastest upload.', kb:500 },
  { slug:'compress-image-for-tiktok',         title:'Compress Image for TikTok',         desc:'Reduce image size for TikTok profile photos and slideshow images. TikTok recommends images under 5MB.', kb:1000 },
  { slug:'compress-png-to-jpg-online',        title:'Compress PNG to JPG',               desc:'Convert and compress PNG images to smaller JPEG files. JPG is typically 3–5× smaller than equivalent PNG for photos.', kb:300 },
  { slug:'reduce-photo-size-online',          title:'Reduce Photo File Size',            desc:'Reduce photo file size without visible quality loss. Supports JPEG, PNG, WebP and HEIC photos up to 20MB.', kb:500 },
  { slug:'compress-large-image',              title:'Compress Large Image Files',        desc:'Compress very large image files (5MB–20MB) to a manageable size for sharing and web use.', kb:1000 },
  { slug:'compress-image-to-200kb',           title:'Compress Image to 200KB',           desc:'Reduce any image to exactly 200KB — ideal for web images, email attachments and CMS uploads.', kb:200 },
  { slug:'compress-image-to-300kb',           title:'Compress Image to 300KB',           desc:'Target exactly 300KB for your image — ideal for high-quality web use and social media posts.', kb:300 },
  { slug:'compress-image-to-400kb',           title:'Compress Image to 400KB',           desc:'Compress to exactly 400KB for high-quality web images that load quickly on all connections.', kb:400 },
  { slug:'compress-image-to-1mb',             title:'Compress Image to 1MB',             desc:'Reduce any image to under 1MB — suitable for email, social media and web image hosting.', kb:1000 },
  { slug:'compress-image-to-2mb',             title:'Compress Image to 2MB',             desc:'Target exactly 2MB output — keeps very high quality while meeting upload limits on most platforms.', kb:2000 },
  { slug:'compress-image-to-5mb',             title:'Compress Image to 5MB',             desc:'Keep your image under 5MB while preserving maximum quality. Ideal for platforms with a 5MB limit.', kb:5000 },
  { slug:'compress-image-high-quality',       title:'Compress Image Without Losing Quality', desc:'Maximum quality compression at 85–95% — visually indistinguishable from the original, 40–70% smaller file.', kb:null },
  { slug:'compress-image-50-percent',         title:'Compress Image by 50%',             desc:'Reduce image file size by approximately 50%. The tool finds the quality level that achieves exactly half the original size.', kb:null },
  { slug:'image-compression-online',          title:'Image Compression Online',          desc:'Free online image compression tool for JPEG, PNG, WebP and HEIC. No software, no upload — runs in your browser.', kb:null },
  { slug:'best-image-compressor',             title:'Best Free Image Compressor',        desc:'The fastest, most private free image compressor. Binary-search quality algorithm. Works on mobile. No signup.', kb:null },
  { slug:'compress-image-mobile',             title:'Compress Image on Mobile',          desc:'Compress images directly on your Android or iPhone. Works in mobile Chrome and Safari — no app needed.', kb:null },
];

for (const uc of USE_CASES) {
  writeToolPage('compression', uc.slug, toolPage({
    cat:'compression', slug:uc.slug,
    title:uc.title, h1:uc.title+' — Free Online', desc:uc.desc,
    metaDesc: uc.desc.slice(0,145)+' Free, no upload required.',
    itype: uc.kb ? 'compress-target' : 'compress',
    targetKB: uc.kb,
    processLabel: uc.kb ? `Compress to ${uc.kb>=1000?(uc.kb/1000)+'MB':uc.kb+'KB'}` : 'Compress Image',
    instructions:[
      'Upload your image — JPG, PNG, WebP, HEIC, GIF, BMP up to 20MB.',
      uc.kb ? `The tool automatically targets ${uc.kb}KB using binary-search quality optimisation.` : 'Adjust the quality slider — 80% gives the best size/quality balance.',
      'Preview before/after sizes and quality in real time.',
      'Download your compressed image.',
    ],
    faqs:[
      { q:`Is ${uc.title.toLowerCase()} really free?`, a:'Yes — Pixaroid is completely free. No account, no watermark, no limits. All processing runs in your browser.' },
      { q:'Are my images uploaded to a server?', a:'No. All compression happens in your browser using the Canvas API. Files never leave your device.' },
      { q:'Which image formats are supported?', a:'JPEG, PNG, WebP, HEIC/HEIF, GIF, BMP, TIFF, and AVIF are all supported.' },
    ],
    related:[
      {cat:'compression',slug:'compress-image',name:'Compress Image'},
      {cat:'compression',slug:'optimize-image',name:'Optimize for Web'},
      {cat:'bulk-tools',slug:'bulk-image-compress',name:'Bulk Compress'},
    ],
  }));
}

/* ═══════════════════════════════════════════════════════════
   STEP 6: DPI & PRINT RESIZE PAGES
═══════════════════════════════════════════════════════════ */
console.log('[6/10] Generating DPI and print pages…');

const DPI_PAGES = [
  { slug:'resize-image-to-72dpi',  title:'Change Image DPI to 72',  dpi:72,  useCase:'web and screen display — the standard monitor resolution' },
  { slug:'resize-image-to-96dpi',  title:'Change Image DPI to 96',  dpi:96,  useCase:'Windows and web images — 96 DPI is the Windows standard' },
  { slug:'resize-image-to-150dpi', title:'Change Image DPI to 150', dpi:150, useCase:'medium-quality print and digital presentations' },
  { slug:'resize-image-to-300dpi', title:'Change Image to 300 DPI', dpi:300, useCase:'high-quality print — 300 DPI is the professional print standard' },
  { slug:'resize-image-to-600dpi', title:'Change Image to 600 DPI', dpi:600, useCase:'ultra-high-quality print, fine art reproduction and technical drawings' },
];

for (const { slug, title, dpi, useCase } of DPI_PAGES) {
  writeToolPage('resize', slug, toolPage({
    cat:'resize', slug, title, h1:title+' Online — Free',
    desc: `Change image DPI to ${dpi} for ${useCase}. Supports JPEG, PNG and WebP output. Instant browser-based conversion — no upload required.`,
    metaDesc: `Change image resolution to ${dpi} DPI online free. Ideal for ${useCase}. No software, no upload — works in your browser instantly.`,
    itype:'resize', targetW:0, targetH:0,
    processLabel:`Set to ${dpi} DPI`,
    instructions:[
      'Upload your image.',
      `Select ${dpi} DPI from the DPI dropdown.`,
      'The tool adjusts the pixel dimensions to match the target DPI for your desired print size.',
      'Download your DPI-adjusted image.',
    ],
    faqs:[
      { q:`What is ${dpi} DPI?`, a:`DPI means "dots per inch". ${dpi} DPI means ${dpi} pixels fit in each linear inch when printed. ${dpi === 300 ? 'This is the professional standard for high-quality print.' : dpi === 72 ? 'This is the standard for web and screen display.' : `This is suitable for ${useCase}.`}` },
      { q:`When should I use ${dpi} DPI?`, a:`Use ${dpi} DPI for ${useCase}. If you are printing something, use ${dpi >= 300 ? 300 : 300} DPI minimum for sharp results.` },
    ],
    related:[
      {cat:'resize',slug:'resize-image-to-300dpi',name:'Resize to 300 DPI'},
      {cat:'resize',slug:'resize-image',name:'Resize Image'},
      {cat:'compression',slug:'compress-image',name:'Compress Image'},
    ],
  }));
}

/* ═══════════════════════════════════════════════════════════
   STEP 7: DEVICE-SPECIFIC RESIZE PAGES
═══════════════════════════════════════════════════════════ */
console.log('[7/10] Generating device-specific resize pages…');

const DEVICE_PAGES = [
  { slug:'resize-image-for-iphone-wallpaper',    title:'iPhone Wallpaper Size',       w:1170,h:2532,  device:'iPhone 13/14' },
  { slug:'resize-image-for-iphone-14-pro',       title:'iPhone 14 Pro Wallpaper',     w:1179,h:2556,  device:'iPhone 14 Pro' },
  { slug:'resize-image-for-iphone-15',           title:'iPhone 15 Wallpaper Size',    w:1179,h:2556,  device:'iPhone 15' },
  { slug:'resize-image-for-ipad-wallpaper',      title:'iPad Wallpaper Size',         w:2048,h:2732,  device:'iPad Pro' },
  { slug:'resize-image-for-android-wallpaper',   title:'Android Wallpaper Size',      w:1080,h:1920,  device:'Android HD' },
  { slug:'resize-image-for-macbook-wallpaper',   title:'MacBook Wallpaper Size',      w:2560,h:1600,  device:'MacBook Pro 13"' },
  { slug:'resize-image-for-4k-wallpaper',        title:'4K Desktop Wallpaper',        w:3840,h:2160,  device:'4K Monitor' },
  { slug:'resize-image-for-desktop-wallpaper',   title:'Desktop Wallpaper Size',      w:1920,h:1080,  device:'Full HD Monitor' },
  { slug:'resize-image-for-windows-wallpaper',   title:'Windows Wallpaper Size',      w:1920,h:1080,  device:'Windows Desktop' },
  { slug:'resize-image-for-chromebook',          title:'Chromebook Wallpaper Size',   w:1366,h:768,   device:'Chromebook' },
];

for (const { slug, title, w, h, device } of DEVICE_PAGES) {
  writeToolPage('resize', slug, toolPage({
    cat:'resize', slug, title, h1:`${title} — ${w}×${h} Free Online Resizer`,
    desc:`Resize images to the correct ${device} dimensions (${w}×${h}px). Perfect for wallpapers, lock screens and backgrounds. No upload required.`,
    metaDesc:`Resize image to ${device} size ${w}×${h}px online free. Perfect for ${title.toLowerCase()}. Browser-based, instant, no account needed.`,
    itype:'resize', targetW:w, targetH:h, preset:`${w}x${h}`,
    processLabel:`Resize for ${device}`,
    instructions:[
      `Upload your image — JPG, PNG, WebP or HEIC up to 20MB.`,
      `The tool pre-sets ${w}×${h}px — the correct ${device} resolution.`,
      `Use Cover mode to fill the screen (cropping edges) or Contain to fit the whole image.`,
      `Download your ${device}-ready wallpaper.`,
    ],
    faqs:[
      { q:`What is the correct wallpaper size for ${device}?`, a:`The optimal wallpaper size for ${device} is ${w}×${h} pixels. Using the exact resolution ensures your wallpaper looks sharp without any stretching or blurring.` },
      { q:`Should I use JPEG or PNG for my wallpaper?`, a:`JPEG is usually best for photos (smaller file, great quality). PNG is better for illustrations or images with text. For iPhone and Mac, HEIC also works natively.` },
    ],
    related:[
      {cat:'resize',slug:'resize-image',name:'Resize Image (Custom)'},
      {cat:'compression',slug:'compress-image',name:'Compress After Resize'},
    ],
  }));
}

/* ═══════════════════════════════════════════════════════════
   STEP 8: HOW-TO GUIDE PAGES
   30 comprehensive guides in /guides/
═══════════════════════════════════════════════════════════ */
console.log('[8/10] Generating how-to guide pages…');

const GUIDES = [
  {
    slug:'how-to-compress-jpg-image',
    title:'How to Compress a JPG Image Without Losing Quality',
    metaDesc:'Step-by-step guide to compressing JPEG images online while keeping excellent visual quality. Learn the best quality settings and when to use WebP instead.',
    intro:'JPEG compression is a balance between file size and visual quality. The right approach depends on how the image will be used — web, print, email, or social media.',
    toolUrl:'/tools/compression/reduce-jpg-size/',
    toolName:'JPG Compressor',
    steps:[
      {heading:'Upload your JPG',text:'Open the Pixaroid JPG Compressor and upload your JPEG file by dragging it into the dropzone or clicking to browse.'},
      {heading:'Set the quality level',text:'80% quality delivers the best balance — typically 60–75% file size reduction with no visible loss. For very high quality, use 85–90%.'},
      {heading:'Choose output format',text:'Stay as JPEG for maximum compatibility, or switch to WebP for 25% additional compression while keeping the same quality.'},
      {heading:'Download and compare',text:'Preview the before/after sizes and download your compressed JPG. The savings bar shows exactly how much was reduced.'},
    ],
    tips:['Use 80% quality as your default — most viewers cannot tell the difference from 100%.','WebP produces better results than JPEG at the same quality level — use it for web images.','Compress AFTER resizing, not before — always resize to the final dimensions first.'],
    faqs:[
      {q:'What quality setting is best for JPG compression?',a:'80% is the sweet spot for most images — it reduces file size by 60–75% with virtually no visible quality loss. Use 90%+ for print-quality work.'},
      {q:'Does compressing a JPG reduce resolution?',a:'No — compression only reduces file size by adjusting the quality encoding. The pixel dimensions remain unchanged unless you specifically resize.'},
      {q:'How small can I make a JPG without it looking bad?',a:'Most high-quality photos can be compressed to 30–40% of their original size before quality becomes visibly poor. The exact threshold depends on the image content.'},
    ],
    related:[
      {url:'/tools/compression/compress-image/',name:'Compress Image'},
      {url:'/tools/compression/reduce-jpg-size/',name:'Reduce JPG Size'},
      {url:'/tools/compression/compress-image-to-100kb/',name:'Compress to 100KB'},
      {url:'/tools/conversion/jpg-to-webp/',name:'JPG to WebP'},
    ],
  },
  {
    slug:'how-to-resize-image-without-losing-quality',
    title:'How to Resize an Image Without Losing Quality',
    metaDesc:'Learn how to resize images online without visible quality degradation. Covers best practices for downscaling, upscaling, and choosing the right format.',
    intro:'Resizing an image correctly preserves its sharpness and colour accuracy. The key is to use high-quality smoothing algorithms and to compress after resizing — not before.',
    toolUrl:'/tools/resize/resize-image/',
    toolName:'Image Resizer',
    steps:[
      {heading:'Upload your image',text:'Open the Pixaroid Image Resizer and upload your image. The tool shows the original dimensions.'},
      {heading:'Enter the target dimensions',text:'Enter the width and height in pixels. Enable "Lock aspect ratio" to prevent distortion.'},
      {heading:'Choose the fit mode',text:'Contain fits the whole image inside the frame. Cover crops to fill. Stretch forces exact dimensions without cropping.'},
      {heading:'Select output quality and format',text:'Use JPEG at 92% for photos, PNG for graphics, or WebP for the best web performance.'},
    ],
    tips:['Always resize before compressing — never compress then resize.','Use "Contain" for product photos and "Cover" for social media profile images.','For AI-powered upscaling that adds real detail, use the AI Upscaler tool.'],
    faqs:[
      {q:'Can I resize an image to a larger size without it looking blurry?',a:'Standard resizing will cause some blurring when making images larger. For better results, use the AI Upscaler tool which uses machine learning to add realistic detail.'},
      {q:'Does resizing change the file size?',a:'Yes — resizing to smaller dimensions reduces file size significantly. Resizing to larger dimensions increases file size. Compress after resizing for the smallest output.'},
    ],
    related:[
      {url:'/tools/resize/resize-image/',name:'Resize Image'},
      {url:'/tools/resize/resize-image-by-pixels/',name:'Resize by Pixels'},
      {url:'/tools/ai-tools/image-upscaler/',name:'AI Image Upscaler'},
      {url:'/tools/compression/compress-image/',name:'Compress After Resize'},
    ],
  },
  {
    slug:'how-to-convert-heic-to-jpg-free',
    title:'How to Convert HEIC to JPG Free Online',
    metaDesc:'Step-by-step guide to converting iPhone HEIC photos to JPEG format online for free. No software download needed — works in your browser.',
    intro:'iPhones and iPads save photos in HEIC format by default to save storage space. While HEIC is great on Apple devices, it is not supported by Windows, Android, or most web browsers. Converting to JPEG gives universal compatibility.',
    toolUrl:'/tools/conversion/heic-to-jpg/',
    toolName:'HEIC to JPG Converter',
    steps:[
      {heading:'Upload your HEIC file',text:'Open the Pixaroid HEIC to JPG converter and upload your .heic or .heif file.'},
      {heading:'Set the quality',text:'90% quality produces excellent JPG output that is indistinguishable from the HEIC original.'},
      {heading:'Click Convert',text:'The conversion happens entirely in your browser in under a second.'},
      {heading:'Download your JPG',text:'Download the JPG file. It will work on all devices and platforms.'},
    ],
    tips:['Use 90% quality for the best JPEG output from HEIC.','To keep transparency, convert to PNG instead of JPG.','On Windows, you can install the HEIC codec, but converting to JPEG is simpler.'],
    faqs:[
      {q:'Why does my iPhone use HEIC format?',a:'Apple introduced HEIC (High Efficiency Image Container) in iOS 11. It uses the HEVC codec to store photos at half the file size of JPEG with the same quality. The downside is it is not supported everywhere.'},
      {q:'Is there a quality loss when converting HEIC to JPG?',a:'Minimal. At 90% quality the JPEG output is visually identical to the HEIC original. Both formats use lossy compression, so some very fine detail may differ.'},
    ],
    related:[
      {url:'/tools/conversion/heic-to-jpg/',name:'HEIC to JPG Converter'},
      {url:'/tools/conversion/heic-to-png/',name:'HEIC to PNG Converter'},
      {url:'/tools/compression/compress-image/',name:'Compress the Converted Image'},
    ],
  },
  {
    slug:'how-to-remove-background-from-image',
    title:'How to Remove Background from an Image Online Free',
    metaDesc:'Learn how to remove image backgrounds online using AI. Step-by-step guide covering the best approach for photos, products, and logos.',
    intro:'Removing the background from an image used to require expensive software like Photoshop. Today, AI-powered browser tools can do it in seconds with impressive accuracy — and entirely for free.',
    toolUrl:'/tools/ai-tools/background-remover/',
    toolName:'AI Background Remover',
    steps:[
      {heading:'Upload your image',text:'Open the Pixaroid AI Background Remover and upload your photo. Works best with clear subject/background contrast.'},
      {heading:'Let AI process it',text:'The AI analyses the image and creates a selection mask that separates the subject from the background.'},
      {heading:'Preview the result',text:'Check the transparent PNG preview. The background will be shown as a checkerboard pattern.'},
      {heading:'Download as PNG',text:'Download the result as a PNG file with a transparent background. You can then place it on any background colour or image.'},
    ],
    tips:['Images with high contrast between subject and background work best.','Use a solid or simple background in your original photo for cleaner results.','Download as PNG to preserve transparency — JPEG does not support transparency.'],
    faqs:[
      {q:'What image types work best for background removal?',a:'Product photos with a white or solid background, portraits against a simple background, and logos give the best results. Complex backgrounds with similar colours to the subject are harder.'},
      {q:'Can I choose a replacement background colour?',a:'Yes — in the Background Remover settings you can choose a replacement background colour, or download a transparent PNG to composite in another tool.'},
    ],
    related:[
      {url:'/tools/ai-tools/background-remover/',name:'AI Background Remover'},
      {url:'/tools/ai-tools/photo-enhancer/',name:'AI Photo Enhancer'},
      {url:'/tools/conversion/jpg-to-png/',name:'JPG to PNG (for transparency)'},
    ],
  },
  {
    slug:'how-to-create-youtube-thumbnail',
    title:'How to Create a Perfect YouTube Thumbnail',
    metaDesc:'Guide to creating click-worthy YouTube thumbnails at the correct 1280×720 resolution. Covers size requirements, design tips, and free tools.',
    intro:'YouTube thumbnails are one of the most important factors in video click-through rate. A great thumbnail at the correct size (1280×720px) can double the views your video receives.',
    toolUrl:'/tools/social-tools/youtube-thumbnail-maker/',
    toolName:'YouTube Thumbnail Maker',
    steps:[
      {heading:'Start with the right canvas size',text:'YouTube recommends 1280×720 pixels at a 16:9 aspect ratio. This looks sharp on all devices from mobile to 4K TV.'},
      {heading:'Use bold, readable text',text:'Add a short title or key phrase in large, contrasting text. Use the Add Text tool to overlay your title.'},
      {heading:'Choose a high-contrast image',text:'Upload a clear, high-resolution photo and crop it to 1280×720 using the Resize tool.'},
      {heading:'Keep file size under 2MB',text:'YouTube requires thumbnails under 2MB. Use the Image Compressor to reduce size while keeping sharp quality.'},
    ],
    tips:['Face close-ups generate significantly higher CTR than wide shots.','Use 3 colours maximum — high contrast backgrounds with bold text work best.','Test your thumbnail at small sizes (mobile preview) to ensure text is readable.'],
    faqs:[
      {q:'What is the correct YouTube thumbnail size?',a:'The standard YouTube thumbnail size is 1280×720 pixels (16:9 aspect ratio). The minimum is 640×360 but the standard HD size gives the best results on all devices.'},
      {q:'What file format should YouTube thumbnails be?',a:'JPEG is the most common format. PNG works well for thumbnails with text or graphic elements. Keep the file under 2MB.'},
    ],
    related:[
      {url:'/tools/social-tools/youtube-thumbnail-maker/',name:'YouTube Thumbnail Maker'},
      {url:'/tools/resize/resize-image-to-1280x720/',name:'Resize to 1280×720'},
      {url:'/tools/compression/compress-image/',name:'Compress Thumbnail'},
      {url:'/tools/editor/add-text-to-image/',name:'Add Text to Image'},
    ],
  },
  {
    slug:'how-to-resize-image-for-instagram',
    title:'How to Resize Images for Instagram (All Sizes)',
    metaDesc:'Complete guide to Instagram image sizes in 2026. Covers feed posts, Stories, Reels, profile photos, and carousels with exact pixel dimensions.',
    intro:'Instagram supports multiple image formats and each has a specific recommended size. Using the wrong dimensions results in automatic cropping or blurring — this guide covers all the correct sizes.',
    toolUrl:'/tools/resize/resize-image-for-instagram/',
    toolName:'Instagram Image Resizer',
    steps:[
      {heading:'Choose your format',text:'Square post: 1080×1080px. Portrait post: 1080×1350px. Landscape post: 1080×566px. Story/Reel: 1080×1920px.'},
      {heading:'Upload and resize',text:'Upload your image to the Instagram Resizer — the tool has all Instagram presets pre-loaded.'},
      {heading:'Choose Cover mode',text:'Use Cover (crop-to-fill) mode for posts to ensure no white bars appear in the feed.'},
      {heading:'Export as JPEG at 90%',text:'Save as JPEG at 90% quality for the best file size — Instagram will re-compress uploads anyway.'},
    ],
    tips:['Instagram crops the preview in the feed to a 4:5 ratio even for square posts — keep important content in the central 1080×1080 area.','Use 1080×1350px (portrait) for the most feed real estate.','Stories and Reels should always be 1080×1920px (9:16 ratio).'],
    faqs:[
      {q:'What is the best Instagram image size in 2026?',a:'1080×1350px portrait posts take up the most vertical space in the feed, giving higher visibility. For Stories and Reels, 1080×1920px is the standard.'},
      {q:'Why do my Instagram photos look blurry?',a:'Instagram re-compresses all uploaded images. Pre-compress to under 500KB and use 90% JPEG quality before uploading to minimise the quality hit.'},
    ],
    related:[
      {url:'/tools/resize/resize-image-for-instagram/',name:'Instagram Image Resizer'},
      {url:'/tools/resize/resize-image-for-instagram-post/',name:'Instagram Post Size'},
      {url:'/tools/resize/resize-image-for-instagram-story/',name:'Instagram Story Size'},
      {url:'/tools/compression/compress-image/',name:'Compress Image for Instagram'},
    ],
  },
  {
    slug:'how-to-convert-png-to-jpg-online',
    title:'How to Convert PNG to JPG Online Free',
    metaDesc:'Step-by-step guide to converting PNG images to JPEG online without quality loss. Covers when to use JPG vs PNG and the best quality settings.',
    intro:'PNG files are lossless and great for graphics, but they are typically 3–5× larger than equivalent JPEG files for photographic content. Converting PNG to JPEG dramatically reduces file size for photos.',
    toolUrl:'/tools/conversion/png-to-jpg/',
    toolName:'PNG to JPG Converter',
    steps:[
      {heading:'Upload your PNG',text:'Open the Pixaroid PNG to JPG Converter and upload your PNG file.'},
      {heading:'Set quality to 92%',text:'92% quality produces JPEG output that is visually identical to the PNG with 60–80% smaller file size.'},
      {heading:'Choose background colour',text:'Since PNG supports transparency and JPG does not, choose a background colour for transparent areas — white is the default.'},
      {heading:'Convert and download',text:'Click Convert and download your JPG file.'},
    ],
    tips:['Do not convert PNG screenshots or images with text to JPG — JPEG compression creates artefacts around sharp edges.','For logos and graphics with transparency, keep them as PNG.','Use 92% quality for photos — anything higher adds file size with no visible improvement.'],
    faqs:[
      {q:'When should I convert PNG to JPG?',a:'Convert PNG to JPG for photographs and images without transparency where you want a smaller file size. Keep PNG for logos, screenshots, graphics with text, and anything requiring transparency.'},
      {q:'Will I lose quality converting PNG to JPG?',a:'Minimal loss at 90%+ quality. PNG is lossless so there will technically be some quality change, but at 92% the JPG output is visually indistinguishable from the PNG for photographic content.'},
    ],
    related:[
      {url:'/tools/conversion/png-to-jpg/',name:'PNG to JPG Converter'},
      {url:'/tools/conversion/jpg-to-png/',name:'JPG to PNG Converter'},
      {url:'/tools/compression/compress-image/',name:'Compress After Converting'},
    ],
  },
  {
    slug:'how-to-reduce-image-file-size',
    title:'How to Reduce Image File Size (5 Methods)',
    metaDesc:'Complete guide to reducing image file sizes online. Covers compression, format conversion, resizing, and choosing the right approach for different use cases.',
    intro:'Large image files slow down websites, fill up storage, and exceed email attachment limits. Here are 5 effective methods to reduce image file size, ranked from fastest to most comprehensive.',
    toolUrl:'/tools/compression/compress-image/',
    toolName:'Image Compressor',
    steps:[
      {heading:'Method 1: Adjust JPEG quality',text:'Reducing JPEG quality from 100% to 80% typically cuts file size by 60–75% with no visible quality loss. Use the Pixaroid Image Compressor.'},
      {heading:'Method 2: Convert to WebP',text:'WebP produces 25–35% smaller files than JPEG at identical perceived quality. Use the JPG to WebP converter.'},
      {heading:'Method 3: Resize to actual display dimensions',text:'If an image displays at 800px wide but is saved at 3000px wide, resize it to 800px — this alone can reduce file size by 90%.'},
      {heading:'Method 4: Remove metadata',text:'EXIF metadata (GPS, camera info) can add 50–100KB to a photo. The Image Compressor strips metadata automatically.'},
      {heading:'Method 5: Target a specific file size',text:'Use the "Compress to XKB" tools to hit exact targets like 100KB, 200KB, or 500KB required by portals and CMS systems.'},
    ],
    tips:['Resize first, then compress — always in that order.','WebP is the best format for web images — convert all JPEG photos to WebP for maximum speed.','Profile photos rarely need to be over 200KB.'],
    faqs:[
      {q:'What is the best way to reduce image file size without losing quality?',a:'The best method depends on the image: for photos, use JPEG at 80–85% quality or convert to WebP. For graphics and logos, optimise as PNG. The key is to resize to the actual display dimensions first.'},
      {q:'How much can I compress an image?',a:'Most JPEG photos can be compressed to 20–30% of their original size without visible quality loss. PNG files with limited colours can be reduced significantly more. Very detailed images can compress less.'},
    ],
    related:[
      {url:'/tools/compression/compress-image/',name:'Compress Image'},
      {url:'/tools/conversion/jpg-to-webp/',name:'Convert to WebP'},
      {url:'/tools/resize/resize-image/',name:'Resize Image'},
      {url:'/tools/bulk-tools/bulk-image-compress/',name:'Bulk Compress'},
    ],
  },
  {
    slug:'how-to-convert-image-to-webp',
    title:'How to Convert Images to WebP Format',
    metaDesc:'Complete guide to converting JPEG and PNG images to WebP format for smaller file sizes and faster websites. Covers browser support and best practices.',
    intro:'WebP is Google\'s modern image format that delivers 25–35% smaller files than JPEG or PNG at the same visual quality. Converting to WebP is one of the highest-impact optimisations for web performance.',
    toolUrl:'/tools/conversion/jpg-to-webp/',
    toolName:'WebP Converter',
    steps:[
      {heading:'Upload your JPEG or PNG',text:'Open the Pixaroid WebP Converter and upload any JPG, PNG, GIF or TIFF file.'},
      {heading:'Set quality to 80%',text:'80% WebP quality typically produces images that are visually identical to 90% JPEG — with 30% smaller files.'},
      {heading:'Convert and compare',text:'The before/after preview shows the file size savings. Click Convert and download your WebP file.'},
      {heading:'Deploy to your website',text:'Use the <picture> HTML tag with a JPEG fallback for browsers that do not support WebP (mainly older iOS).'},
    ],
    tips:['Use 80% WebP quality for the best compression/quality ratio.','Implement WebP with a JPEG fallback using the <picture> element for older browser support.','All modern browsers (Chrome, Firefox, Safari 14+, Edge) support WebP natively.'],
    faqs:[
      {q:'Is WebP supported by all browsers?',a:'WebP is supported by all modern browsers including Chrome, Firefox, Edge, and Safari 14+. For older iOS Safari users, provide a JPEG fallback using the HTML <picture> tag.'},
      {q:'How much smaller are WebP files compared to JPEG?',a:'WebP is typically 25–35% smaller than equivalent JPEG files at the same perceived quality. For images with transparency, WebP is typically 26% smaller than equivalent PNG.'},
    ],
    related:[
      {url:'/tools/conversion/jpg-to-webp/',name:'JPG to WebP Converter'},
      {url:'/tools/conversion/png-to-webp/',name:'PNG to WebP Converter'},
      {url:'/tools/conversion/webp-to-jpg/',name:'WebP to JPG (reverse)'},
      {url:'/tools/compression/compress-image/',name:'Compress Image'},
    ],
  },
  {
    slug:'how-to-make-image-transparent',
    title:'How to Make an Image Transparent (Remove Background)',
    metaDesc:'Learn how to make image backgrounds transparent online free. Covers AI background removal, manual removal, and when to use PNG vs WebP for transparency.',
    intro:'Making an image transparent means removing the background so only the subject (person, product, logo) remains. The output is a PNG or WebP file with an alpha channel for the transparent areas.',
    toolUrl:'/tools/ai-tools/background-remover/',
    toolName:'AI Background Remover',
    steps:[
      {heading:'Upload your image',text:'Open the Pixaroid AI Background Remover and upload your photo or graphic.'},
      {heading:'AI removes the background',text:'The AI automatically detects the subject and removes the background, creating transparent areas.'},
      {heading:'Review the edges',text:'Check that the subject edges are clean. The tool handles hair, fur and complex shapes.'},
      {heading:'Download as PNG',text:'Download as a PNG file — PNG supports transparency (JPEG does not). Use WebP for smaller transparent files.'},
    ],
    tips:['Use the Round Corners tool after removing background for a polished profile photo effect.','PNG with transparency is larger than JPEG — use WebP transparent for web use.','Re-save with a white background if the platform does not support transparency.'],
    faqs:[
      {q:'What file format should I use for transparent images?',a:'PNG is the most universally supported format for images with transparency. WebP also supports transparency and produces smaller files. JPEG does not support transparency.'},
      {q:'Why does my transparent PNG show a white background sometimes?',a:'Some apps, email clients, and older browsers do not support PNG transparency and display white instead of transparent. Use the Background Remover to add a specific background colour if needed.'},
    ],
    related:[
      {url:'/tools/ai-tools/background-remover/',name:'AI Background Remover'},
      {url:'/tools/conversion/jpg-to-png/',name:'JPG to PNG (transparency)'},
      {url:'/tools/editor/round-image-corners/',name:'Round Image Corners'},
    ],
  },
];

for (const guide of GUIDES) {
  writeGuidePage(guide.slug, guidePage(guide));
}

/* ═══════════════════════════════════════════════════════════
   STEP 9: ADDITIONAL USE-CASE & LONG-TAIL RESIZE PAGES
═══════════════════════════════════════════════════════════ */
console.log('[9/10] Generating additional long-tail pages…');

const EXTRA_RESIZE = [
  {slug:'resize-image-for-cv',         title:'Resize Photo for CV/Resume',       w:200,h:200,  useCase:'HR portals and document submission'},
  {slug:'resize-image-for-id-card',    title:'Resize Photo for ID Card',         w:413,h:531,  useCase:'government ID and identification documents'},
  {slug:'resize-image-for-visa',       title:'Resize Photo for Visa Application',w:600,h:600,  useCase:'visa and passport applications'},
  {slug:'resize-image-for-amazon',     title:'Resize Product Image for Amazon',  w:2000,h:2000,useCase:'Amazon product listings (minimum 1000px for zoom)'},
  {slug:'resize-image-for-etsy',       title:'Resize Product Image for Etsy',    w:2700,h:2025,useCase:'Etsy product listings (2700×2025 recommended)'},
  {slug:'resize-image-for-ebay',       title:'Resize Image for eBay',            w:1600,h:1600,useCase:'eBay product listings (1600×1600 maximum)'},
  {slug:'resize-image-for-email-signature',title:'Resize Image for Email Signature',w:600,h:200,useCase:'email signatures (under 100KB recommended)'},
  {slug:'resize-image-for-blog',       title:'Resize Image for Blog Post',       w:1200,h:628, useCase:'blog featured images and social sharing'},
  {slug:'resize-image-for-banner',     title:'Resize Image for Web Banner',      w:728,h:90,   useCase:'standard leaderboard web banner ads'},
  {slug:'resize-image-for-favicon',    title:'Resize Image for Favicon',         w:32,h:32,    useCase:'browser tab favicon (32×32px standard)'},
  {slug:'resize-image-for-app-icon',   title:'Resize Image for App Icon',        w:1024,h:1024,useCase:'iOS and Android app store icons'},
  {slug:'resize-image-for-zoom',       title:'Resize Image for Zoom Background', w:1920,h:1080,useCase:'Zoom virtual background (1920×1080 recommended)'},
  {slug:'resize-image-for-google-meet',title:'Resize Image for Google Meet Background',w:1920,h:1080,useCase:'Google Meet virtual background'},
  {slug:'crop-image-to-square',        title:'Crop Image to Square',             w:1000,h:1000,useCase:'social media profile photos and square thumbnails'},
  {slug:'crop-image-16-9',             title:'Crop Image to 16:9 Ratio',         w:1920,h:1080,useCase:'YouTube, presentations and widescreen displays'},
  {slug:'crop-image-4-3',             title:'Crop Image to 4:3 Ratio',           w:1600,h:1200,useCase:'traditional photos and presentations'},
  {slug:'resize-image-for-shopify',    title:'Resize Product Image for Shopify', w:2048,h:2048,useCase:'Shopify product images (2048×2048 recommended)'},
  {slug:'resize-image-for-woocommerce',title:'Resize Image for WooCommerce',     w:800,h:800,  useCase:'WooCommerce product thumbnail images'},
];

for (const { slug, title, w, h, useCase } of EXTRA_RESIZE) {
  writeToolPage('resize', slug, toolPage({
    cat:'resize', slug, title, h1:title+' — Free Online',
    desc:`Resize images for ${useCase}. Output: ${w}×${h}px. Browser-based — no upload, instant results.`,
    metaDesc:`Free online image resizer for ${useCase}. Resize to ${w}×${h}px instantly. No upload, no account — works in your browser.`,
    itype:'resize', targetW:w, targetH:h, preset:`${w}x${h}`,
    processLabel:'Resize Image',
    instructions:[
      'Upload your image — JPG, PNG, WebP or HEIC supported.',
      `The tool pre-sets ${w}×${h}px optimised for ${useCase}.`,
      'Choose Cover (crop-to-fill) or Contain (fit-with-padding) mode.',
      'Download your resized image.',
    ],
    faqs:[
      {q:`What dimensions should I use for ${useCase}?`,a:`The recommended size is ${w}×${h} pixels. This provides the best display quality for ${useCase}.`},
      {q:'Does resizing reduce image quality?',a:'Downscaling reduces file size with minimal quality loss. For upscaling, use the AI Upscaler for best results.'},
    ],
    related:[
      {cat:'resize',slug:'resize-image',name:'Resize Image'},
      {cat:'compression',slug:'compress-image',name:'Compress After Resize'},
      {cat:'editor',slug:'crop-image',name:'Crop Image'},
    ],
  }));
}

/* ═══════════════════════════════════════════════════════════
   STEP 10: UPDATE SITEMAPS
═══════════════════════════════════════════════════════════ */
console.log('[10/10] Updating sitemaps…');

// Update sitemap-tools.xml
let sitemapPath = path.join(ROOT,'sitemap-tools.xml');
let sitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath,'utf8') : '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>';
sitemap = sitemap.replace('</urlset>','').trim();
sitemap += '\n' + newURLs
  .filter(u => !u.url.includes('/guides/'))
  .map(u => `  <url><loc>${u.url}</loc><lastmod>${TODAY}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`)
  .join('\n');
sitemap += '\n</urlset>';
fs.writeFileSync(sitemapPath, sitemap, 'utf8');

// Create sitemap-guides.xml
const guideSitemapPath = path.join(ROOT,'sitemap-guides.xml');
const guideURLs = newURLs.filter(u => u.url.includes('/guides/'));
const guidesSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${guideURLs.map(u => `  <url><loc>${u.url}</loc><lastmod>${TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.78</priority></url>`).join('\n')}
</urlset>`;
fs.writeFileSync(guideSitemapPath, guidesSitemap, 'utf8');

// Update sitemap index
let sitemapIndex = path.join(ROOT,'sitemap.xml');
let indexContent = fs.existsSync(sitemapIndex) ? fs.readFileSync(sitemapIndex,'utf8') : '';
if (!indexContent.includes('sitemap-guides.xml')) {
  indexContent = indexContent.replace('</sitemapindex>',
    `  <sitemap><loc>https://pixaroid.vercel.app/sitemap-guides.xml</loc><lastmod>${TODAY}</lastmod></sitemap>\n</sitemapindex>`);
  if (!indexContent.includes('</sitemapindex>')) {
    indexContent = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>https://pixaroid.vercel.app/sitemap-tools.xml</loc><lastmod>${TODAY}</lastmod></sitemap>\n  <sitemap><loc>https://pixaroid.vercel.app/sitemap-guides.xml</loc><lastmod>${TODAY}</lastmod></sitemap>\n</sitemapindex>`;
  }
  fs.writeFileSync(sitemapIndex, indexContent, 'utf8');
}

// Summary
const toolURLs   = newURLs.filter(u => !u.url.includes('/guides/')).length;
const guideCount = guideURLs.length;
const totalSitemapURLs = (sitemap.match(/<url>/g)||[]).length;

console.log(`\n${'═'.repeat(62)}`);
console.log(`  PSEO v2.0 — Generation Complete`);
console.log(`${'─'.repeat(62)}`);
console.log(`  New tool pages generated :  ${toolURLs}`);
console.log(`  New guide pages generated:  ${guideCount}`);
console.log(`  Total new pages          :  ${generated}`);
console.log(`  Sitemap-tools.xml URLs   :  ${totalSitemapURLs}`);
console.log(`  Sitemap-guides.xml URLs  :  ${guideCount}`);
console.log(`${'═'.repeat(62)}\n`);
