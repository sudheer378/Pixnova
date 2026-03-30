/**
 * Pixaroid — Tool Runner  v3.0
 * Handles processing ONLY. Dispatches pxn:result or pxn:error.
 * All UI updates (preview, download, savings) done by template inline script.
 *
 * Loaded as: <script type="module" data-tool="..." data-category="...">
 */

/* ── Dynamic imports (ES module — runs after DOM ready) ─────── */
const script   = document.currentScript;
const slug     = script?.dataset?.tool     || document.body?.dataset?.toolSlug || '';
const category = script?.dataset?.category || '';

if (slug) init();

async function init() {
  /* Load config */
  let tool = null;
  try {
    const { default: TOOLS } = await import('/config/tools-config.js');
    tool = TOOLS.find(t => t.slug === slug);
  } catch(e) { /* config load failed — will use controls from DOM */ }

  /* Inject SEO + links (non-critical) */
  try {
    if (tool) {
      const { injectToolMeta }  = await import('/js/modules/seo-meta.js');
      const { injectToolLinks } = await import('/js/modules/internal-links.js');
      injectToolMeta(tool);
      injectToolLinks(tool);
    }
  } catch(e) { /* optional enhancement */ }

  /* Build controls from tool config */
  if (tool?.controls?.length) buildControls(tool.controls);

  /* Populate dropzone format chips */
  if (tool?.acceptedFormats?.length) {
    const dz = document.querySelector('.dz-formats');
    if (dz) {
      const LABELS = {'image/jpeg':'JPG','image/png':'PNG','image/webp':'WebP','image/heic':'HEIC','image/gif':'GIF','image/bmp':'BMP','image/tiff':'TIFF','image/avif':'AVIF'};
      dz.innerHTML = tool.acceptedFormats.map(f =>
        `<span class="dz-fmt-chip">${LABELS[f]||f.split('/')[1].toUpperCase()}</span>`
      ).join('');
    }
  }

  /* Listen for process trigger from template */
  document.addEventListener('pxn:process', async (e) => {
    const { file, controls } = e.detail || {};
    if (!file) {
      document.dispatchEvent(new CustomEvent('pxn:error', { detail:{ message:'No file provided.' } }));
      return;
    }
    try {
      const result = await processFile(tool, file, controls || {});
      document.dispatchEvent(new CustomEvent('pxn:result', { detail: result }));
    } catch(err) {
      document.dispatchEvent(new CustomEvent('pxn:error', { detail:{ message: err.message || String(err) } }));
    }
  });
}

/* ══════════════════════════════════════════════════════════
   PROCESSING — no UI here, returns result object
══════════════════════════════════════════════════════════ */
async function processFile(tool, file, controls) {
  const itype = tool?.interfaceType || guessInterfaceType(slug);

  /* Read file as ArrayBuffer */
  const buffer = await readBuffer(file);
  const mime   = file.type || guessMime(file.name);

  /* Route to correct worker */
  if (itype === 'compress') {
    return runWorker('/workers/compress.worker.js', {
      op:'compress', buffer, mime,
      quality:  clampNum(controls.quality, 80, 1, 100),
      format:   controls.format || autoFmt(mime),
      maxWidth: clampNum(controls.maxWidth, 0),
    }, buffer);
  }

  if (itype === 'compress-target') {
    const targetKB = clampNum(controls.targetKB, 100, 1, 50000);
    return runWorker('/workers/compress.worker.js', {
      op:'compress-target', buffer, mime,
      targetBytes: targetKB * 1024,
      format:      controls.format || 'jpeg',
      minQuality:  clampNum(controls.minQuality, 10, 1, 80),
    }, buffer);
  }

  if (itype === 'convert' || itype === 'convert-multi' || itype === 'convert-pdf') {
    return runWorker('/workers/convert.worker.js', {
      op:'convert', buffer, mime,
      targetFormat: (controls.format || controls.targetFormat || 'jpeg').replace('jpg','jpeg'),
      quality:      clampNum(controls.quality, 90, 1, 100),
      background:   controls.background || '#ffffff',
      lossless:     controls.lossless === true || controls.lossless === 'true',
    }, buffer);
  }

  if (itype === 'resize' || itype === 'resize-social' || itype === 'social-canvas') {
    return runWorker('/workers/resize.worker.js', {
      op:'resize', buffer, mime,
      width:      clampNum(controls.width, 0),
      height:     clampNum(controls.height, 0),
      percent:    clampNum(controls.percent, 0),
      preset:     controls.preset || '',
      fit:        controls.fit || 'contain',
      lockAspect: controls.lockAspect !== 'false',
      format:     controls.format || autoFmt(mime),
      quality:    clampNum(controls.quality, 92, 1, 100),
    }, buffer);
  }

  if (itype === 'bulk') {
    return runBulk(slug, file, controls);
  }

  if (['ai-bg-remove','ai-upscale','ai-enhance','ai-sharpen','ai-colorize','ai-ocr'].includes(itype)) {
    return runAI(itype, buffer, mime, controls);
  }

  if (['info','metadata','palette','calculator'].includes(itype)) {
    return runUtility(itype, file, buffer);
  }

  /* Default: all editor ops → filter worker */
  const ops = buildOps(itype, controls);
  return runWorker('/workers/filter.worker.js', {
    op:'edit', buffer, mime, operations: ops,
    format:  controls.format || autoFmt(mime),
    quality: clampNum(controls.quality, 90, 1, 100),
  }, buffer);
}

/* ══════════════════════════════════════════════════════════
   WORKER RUNNER — promise wrapper
══════════════════════════════════════════════════════════ */
function runWorker(workerPath, payload, transferBuffer) {
  return new Promise((resolve, reject) => {
    let worker;
    try { worker = new Worker(workerPath); }
    catch(e) { reject(new Error('Worker failed to load: ' + workerPath)); return; }

    const jobId  = (Math.random()*1e9|0).toString(36);
    const timer  = setTimeout(() => {
      worker.terminate();
      reject(new Error('Processing timed out after 60s. Try a smaller image.'));
    }, 60000);

    worker.onmessage = (e) => {
      if (e.data?.jobId !== jobId) return;
      clearTimeout(timer);
      worker.terminate();
      if (e.data.error) {
        reject(new Error(e.data.error));
      } else {
        const blob = e.data.blob;
        const origSize = payload.buffer?.byteLength || 0;
        const savings  = origSize > 0 ? Math.max(0, Math.round((1 - blob.size/origSize)*100)) : 0;
        resolve({
          blob,
          width:    e.data.width  || null,
          height:   e.data.height || null,
          format:   e.data.format || null,
          originalSize: origSize,
          resultSize:   blob.size,
          savings,
        });
      }
    };

    worker.onerror = (e) => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error(e.message || 'Worker crashed. Check browser console.'));
    };

    const msg = { jobId, ...payload };
    const transfers = transferBuffer instanceof ArrayBuffer ? [transferBuffer] : [];
    worker.postMessage(msg, transfers);
  });
}

/* ══════════════════════════════════════════════════════════
   AI RUNNER
══════════════════════════════════════════════════════════ */
function runAI(itype, buffer, mime, controls) {
  return new Promise((resolve, reject) => {
    let worker;
    try { worker = new Worker('/workers/ai.worker.js'); }
    catch(e) { reject(new Error('AI worker failed to load')); return; }

    const jobId = (Math.random()*1e9|0).toString(36);
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('AI processing timed out. Try a smaller image.'));
    }, 120000);

    worker.onmessage = (e) => {
      if (e.data?.type === 'progress') {
        document.dispatchEvent(new CustomEvent('pxn:ai-progress', { detail: { percent: e.data.percent } }));
        return;
      }
      if (e.data?.jobId !== jobId) return;
      clearTimeout(timer);
      worker.terminate();
      if (e.data.error) {
        reject(new Error(e.data.error));
      } else if (e.data.text !== undefined) {
        resolve({
          blob:   new Blob([e.data.text || ''], { type:'text/plain' }),
          text:   e.data.text,
          confidence: e.data.confidence,
          format: 'txt',
          width:  e.data.width,
          height: e.data.height,
        });
      } else {
        const blob = e.data.blob;
        const origSize = buffer?.byteLength || 0;
        resolve({
          blob, width:e.data.width, height:e.data.height, format:e.data.format,
          originalSize: origSize, resultSize: blob.size,
          savings: origSize > 0 ? Math.max(0, Math.round((1-blob.size/origSize)*100)) : 0,
        });
      }
    };

    worker.onerror = (e) => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error(e.message || 'AI worker error'));
    };

    const OP_MAP = {
      'ai-bg-remove':'ai-bg-remove','ai-upscale':'ai-upscale','ai-enhance':'ai-enhance',
      'ai-sharpen':'ai-sharpen','ai-colorize':'ai-colorize','ai-ocr':'ai-ocr',
    };
    worker.postMessage({
      jobId, op: OP_MAP[itype], buffer, mime,
      scale:      controls.scale,
      mode:       controls.mode,
      strength:   clampNum(controls.strength, 70, 0, 100),
      style:      controls.style,
      language:   controls.language || 'eng',
      amount:     clampNum(controls.amount, 70, 0, 100),
      intensity:  clampNum(controls.intensity, 80, 0, 100),
      bgColor:    controls.bgColor || 'transparent',
      refine:     controls.refine !== 'false',
      preprocess: controls.preprocess !== 'false',
    }, [buffer]);
  });
}

/* ══════════════════════════════════════════════════════════
   BULK RUNNER
══════════════════════════════════════════════════════════ */
async function runBulk(slug, file, controls) {
  const task  = inferBulkTask(slug);
  const input = document.getElementById('file-input');
  const files = input?.files?.length > 1 ? Array.from(input.files) : [file];
  const tasks = await Promise.all(files.map(async f => ({
    filename: f.name,
    mime:     f.type || guessMime(f.name),
    buffer:   await readBuffer(f),
  })));

  return new Promise((resolve, reject) => {
    let worker;
    try { worker = new Worker('/workers/bulk.worker.js'); }
    catch(e) { reject(new Error('Bulk worker failed to load')); return; }

    const jobId = (Math.random()*1e9|0).toString(36);
    const timer = setTimeout(() => { worker.terminate(); reject(new Error('Bulk timed out')); }, 300000);
    const results = [], errors = [];

    worker.onmessage = async (e) => {
      if (e.data?.jobId !== jobId) return;
      if (e.data.type === 'progress') {
        const { current, total, filename } = e.data;
        document.dispatchEvent(new CustomEvent('pxn:bulk-progress', { detail:{ current,total,filename } }));
        return;
      }
      if (e.data.type === 'done') {
        clearTimeout(timer);
        worker.terminate();
        const allResults = e.data.results || [];
        if (!allResults.length) { reject(new Error('No files processed')); return; }
        if (allResults.length === 1) {
          const r = allResults[0];
          resolve({ blob:r.blob, format: (r.blob.type.split('/')[1]||'jpg').replace('jpeg','jpg'), savings:0 });
          return;
        }
        // Build ZIP
        try {
          if (!window.JSZip) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
          const zip = new window.JSZip();
          const EXT = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
          allResults.forEach(r => {
            if (!r.blob) return;
            const ext  = EXT[r.blob.type] || 'jpg';
            const base = (r.filename||'image').replace(/\.[^.]+$/,'');
            zip.file(`${base}.${ext}`, r.blob);
          });
          const zipBlob = await zip.generateAsync({ type:'blob', compression:'DEFLATE' });
          resolve({ blob:zipBlob, format:'zip', isZip:true, savings:0 });
        } catch(e2) {
          const r = allResults[0];
          resolve({ blob:r.blob, format:'jpg', savings:0 });
        }
      }
    };
    worker.onerror = (e) => { clearTimeout(timer); worker.terminate(); reject(new Error(e.message||'Bulk worker error')); };

    const transfers = tasks.map(t => t.buffer).filter(b => b instanceof ArrayBuffer);
    worker.postMessage({ jobId, tasks, taskType:task, options:controls }, transfers);
  });
}

/* ══════════════════════════════════════════════════════════
   UTILITY TOOLS (no worker needed)
══════════════════════════════════════════════════════════ */
async function runUtility(itype, file, buffer) {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    const url = URL.createObjectURL(file);
    i.onload = () => { res(i); URL.revokeObjectURL(url); };
    i.onerror = rej;
    i.src = url;
  });
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);

  if (itype === 'palette' || itype === 'info') {
    const id = ctx.getImageData(0, 0, c.width, c.height);
    const colours = extractPalette(id.data, 8);
    const panel = document.getElementById('palette-panel') || document.getElementById('ocr-panel');
    if (panel) {
      panel.style.display = 'block';
      panel.innerHTML = `<div style="font-weight:600;margin-bottom:.75rem;">Colour Palette — ${c.width}×${c.height}</div>
        <div style="display:flex;flex-wrap:wrap;gap:.5rem;">
          ${colours.map(cl=>`<div style="width:44px;height:44px;border-radius:.5rem;background:${cl};border:1px solid rgba(0,0,0,.1);cursor:pointer" title="${cl}" onclick="navigator.clipboard.writeText('${cl}')"></div>`).join('')}
        </div>`;
    }
    return { blob: file, width: c.width, height: c.height, format: 'original' };
  }

  if (itype === 'metadata') {
    const info = { Name:file.name, Size:fmtBytes(file.size), Dimensions:`${c.width}×${c.height}`, Type:file.type, Modified:new Date(file.lastModified).toLocaleDateString() };
    const panel = document.getElementById('ocr-panel');
    if (panel) {
      panel.style.display = 'block';
      panel.querySelector('h3')?.remove();
      const out = panel.querySelector('#ocr-output');
      if (out) out.value = Object.entries(info).map(([k,v])=>`${k}: ${v}`).join('\n');
    }
    return { blob: file, width: c.width, height: c.height };
  }

  return { blob: file, width: c.width, height: c.height };
}

/* ══════════════════════════════════════════════════════════
   CONTROLS BUILDER
══════════════════════════════════════════════════════════ */
function buildControls(controls) {
  const body = document.getElementById('controls-body');
  if (!body || !controls?.length) return;
  body.innerHTML = '';
  controls.forEach(ctrl => {
    if (ctrl.type === 'hidden') return;
    const group = document.createElement('div');
    group.className = 'cg';
    // Label
    if (ctrl.type !== 'checkbox') {
      const lbl = document.createElement('div');
      lbl.className = 'cl';
      lbl.innerHTML = `<span>${ctrl.label||''}</span>${ctrl.unit ? `<span id="v-${ctrl.id}">${ctrl.default??''}${ctrl.unit}</span>` : ''}`;
      group.appendChild(lbl);
    }
    // Input
    let inp;
    if (ctrl.type === 'range') {
      inp = Object.assign(document.createElement('input'), {type:'range',min:ctrl.min??0,max:ctrl.max??100,value:ctrl.default??80});
      if (ctrl.unit) inp.oninput = () => { const v=document.getElementById('v-'+ctrl.id); if(v) v.textContent=inp.value+ctrl.unit; };
    } else if (ctrl.type === 'select') {
      inp = document.createElement('select');
      (ctrl.options||[]).forEach(o => { const opt=document.createElement('option'); opt.value=o; opt.textContent=o; if(o===ctrl.default)opt.selected=true; inp.appendChild(opt); });
    } else if (ctrl.type === 'checkbox') {
      const row = document.createElement('label');
      row.className = 'checkbox-row';
      inp = Object.assign(document.createElement('input'), {type:'checkbox', checked:!!ctrl.default});
      const span = document.createElement('span'); span.textContent = ctrl.label||'';
      row.appendChild(inp); row.appendChild(span); group.appendChild(row);
    } else if (ctrl.type === 'color') {
      inp = Object.assign(document.createElement('input'), {type:'color', value:ctrl.default||'#ffffff'});
    } else {
      inp = Object.assign(document.createElement('input'), {type:ctrl.type||'text', value:ctrl.default??'', placeholder:ctrl.placeholder||''});
      if (ctrl.min != null) inp.min = ctrl.min;
      if (ctrl.max != null) inp.max = ctrl.max;
    }
    if (inp) { inp.dataset.control = ctrl.id; if (ctrl.type !== 'checkbox') group.appendChild(inp); }
    body.appendChild(group);
  });
}

/* ══════════════════════════════════════════════════════════
   EDIT OPERATIONS BUILDER
══════════════════════════════════════════════════════════ */
function buildOps(itype, controls) {
  switch(itype) {
    case 'rotate':       return [{type:'rotate',       angle:     clampNum(controls.angle,90)}];
    case 'flip':         return [{type:'flip',          horizontal:controls.direction!=='vertical', vertical:controls.direction==='vertical'}];
    case 'crop':         return [{type:'crop',          x:+controls.x||0, y:+controls.y||0, width:+controls.width, height:+controls.height}];
    case 'watermark':    return [{type:'watermark',     text:controls.text||'© Pixaroid', fontSize:+controls.fontSize||40, color:controls.color||'#ffffff', opacity:+controls.opacity||50, position:controls.position||'bottom-right', tile:controls.tile==='true'}];
    case 'text-overlay': return [{type:'text',          text:controls.text||'', fontSize:+controls.fontSize||48, color:controls.color||'#ffffff', strokeWidth:+controls.strokeWidth||2, align:controls.align||'center'}];
    case 'blur':         return [{type:'blur',          radius:    clampNum(controls.radius,5,0.1,50)}];
    case 'sharpen':      return [{type:'sharpen',       amount:    clampNum(controls.amount,50,0,100), radius:clampNum(controls.radius,1.5,0.1,10)}];
    case 'vignette':     return [{type:'vignette',      intensity: clampNum(controls.intensity,50,0,100)}];
    case 'border':       return [{type:'border',        size:      clampNum(controls.size,10,1,200), color:controls.color||'#000000'}];
    case 'sepia':        return [{type:'sepia',         intensity: clampNum(controls.intensity,80,0,100)}];
    case 'grayscale':    return [{type:'grayscale'}];
    case 'invert':       return [{type:'invert'}];
    case 'noise':        return [{type:'noise',         amount:    clampNum(controls.amount,20,0,100)}];
    case 'denoise':      return [{type:'denoise',       strength:  clampNum(controls.strength,1.5,0,5)}];
    case 'adjust':
    default:
      return [
        {type:'brightness', value:clampNum(controls.brightness,0,-100,100)},
        {type:'contrast',   value:clampNum(controls.contrast,0,-100,100)},
        {type:'saturation', value:clampNum(controls.saturation,0,-100,100)},
        {type:'vibrance',   value:clampNum(controls.vibrance,0,-100,100)},
        {type:'temperature',value:clampNum(controls.temperature,0,-100,100)},
        {type:'highlights', value:clampNum(controls.highlights,0,-100,100)},
        {type:'shadows',    value:clampNum(controls.shadows,0,-100,100)},
      ].filter(op => op.value !== 0);
  }
}

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
function readBuffer(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = e => res(e.target.result);
    r.onerror = () => rej(new Error('Failed to read file'));
    r.readAsArrayBuffer(file);
  });
}
function clampNum(v, def, min, max) {
  const n = parseFloat(v);
  if (isNaN(n)) return def;
  if (min != null && n < min) return min;
  if (max != null && n > max) return max;
  return n;
}
function autoFmt(mime) {
  if (mime==='image/png')  return 'png';
  if (mime==='image/webp') return 'webp';
  if (mime==='image/gif')  return 'gif';
  return 'jpeg';
}
function guessMime(name) {
  const ext = (name||'').split('.').pop().toLowerCase();
  const map = {jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',bmp:'image/bmp',tiff:'image/tiff',avif:'image/avif',heic:'image/heic',heif:'image/heif'};
  return map[ext] || 'image/jpeg';
}
function guessInterfaceType(slug) {
  if (slug.includes('compress-to')||slug.includes('to-'+'kb')) return 'compress-target';
  if (slug.startsWith('compress')||slug.includes('reduce')||slug.includes('optim')) return 'compress';
  if (slug.includes('resize')||slug.includes('passport')||slug.includes('dpi')) return 'resize';
  if (slug.includes('convert')||slug.includes('to-png')||slug.includes('to-jpg')||slug.includes('to-webp')||slug.includes('heic')||slug.includes('bmp')||slug.includes('gif')||slug.includes('tiff')||slug.includes('pdf')) return 'convert';
  if (slug.includes('crop')) return 'crop';
  if (slug.includes('rotate')) return 'rotate';
  if (slug.includes('flip')) return 'flip';
  if (slug.includes('watermark')) return 'watermark';
  if (slug.includes('blur')) return 'blur';
  if (slug.includes('sharpen')||slug.includes('sharpener')) return 'sharpen';
  if (slug.includes('brightness')) return 'adjust';
  if (slug.includes('contrast'))   return 'adjust';
  if (slug.includes('saturation')) return 'adjust';
  if (slug.includes('background')||slug.includes('bg-remov')) return 'ai-bg-remove';
  if (slug.includes('upscal')) return 'ai-upscale';
  if (slug.includes('enhanc')) return 'ai-enhance';
  if (slug.includes('coloriz')) return 'ai-colorize';
  if (slug.includes('ocr')||slug.includes('text-ext')) return 'ai-ocr';
  if (slug.includes('bulk')) return 'bulk';
  return 'compress'; // safe default
}
function inferBulkTask(slug) {
  if (slug.includes('compress')) return 'compress';
  if (slug.includes('resize'))   return 'resize';
  if (slug.includes('convert'))  return 'convert';
  if (slug.includes('watermark'))return 'watermark';
  return 'compress';
}
function extractPalette(data, count) {
  const buckets = {}, step = 16;
  for (let i=0;i<data.length;i+=4) {
    if (data[i+3]<128) continue;
    const k=`${Math.round(data[i]/step)*step},${Math.round(data[i+1]/step)*step},${Math.round(data[i+2]/step)*step}`;
    buckets[k]=(buckets[k]||0)+1;
  }
  return Object.entries(buckets).sort((a,b)=>b[1]-a[1]).slice(0,count)
    .map(([k])=>`rgb(${k})`);
}
function fmtBytes(n) {
  if (!n) return '0 B';
  if (n<1024) return n+' B';
  if (n<1048576) return (n/1024).toFixed(1)+' KB';
  return (n/1048576).toFixed(2)+' MB';
}
function loadScript(src) {
  return new Promise((res,rej)=>{ const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s); });
}
