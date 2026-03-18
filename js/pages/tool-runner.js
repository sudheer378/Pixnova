/**
 * Pixaroid — Tool Runner  v2.0
 * Full wiring: file pick → validate → process → preview → download.
 * Supports all interface types: compress, convert, resize, edit, AI, bulk, utility.
 */
import {
  compressImage, compressToTargetSize, resizeImage,
  convertImage, editImage, processBulkImages,
  validateFile, formatBytes,
} from '/js/engine.js';
import { showToast }    from '/js/modules/toast.js';
import { ProgressBar }  from '/js/modules/progress-bar.js';
import { DownloadManager } from '/js/modules/download-manager.js';
import { loadToolChunk }   from '/js/modules/performance.js';
import { injectToolMeta }  from '/js/modules/seo-meta.js';
import { injectToolLinks } from '/js/modules/internal-links.js';

(async function bootstrap() {
  const script   = document.currentScript;
  const slug     = script?.dataset?.tool;
  const category = script?.dataset?.category;
  if (!slug) return;

  // Load tool config
  let tool = null;
  try {
    const { default: TOOLS } = await import('/config/tools-config.js');
    tool = TOOLS.find(t => t.slug === slug);
  } catch(e) { console.warn('[tool-runner] tools-config load failed:', e); }
  if (!tool) return;

  // SEO + links
  injectToolMeta(tool);
  injectToolLinks(tool);

  // Load code-split chunk
  await loadToolChunk(tool.interfaceType).catch(() => {});

  // DOM refs
  const dropzone   = document.getElementById('dropzone');
  const fileInput  = document.getElementById('file-input');
  const browseBtn  = document.getElementById('browse-btn');
  const actionBar  = document.getElementById('action-bar');
  const btnProcess = document.getElementById('btn-process');
  const btnDl      = document.getElementById('btn-download');
  const btnReset   = document.getElementById('btn-reset');
  const pwWrap     = document.getElementById('progress-wrap');
  const pfFill     = document.getElementById('progress-fill');
  const plLabel    = document.getElementById('progress-label');
  const prevPanel  = document.getElementById('preview-panel');
  const prevOrig   = document.getElementById('preview-original');
  const prevResult = document.getElementById('preview-result');
  const statsOrig  = document.getElementById('stats-original');
  const statsResult= document.getElementById('stats-result');
  const ocrPanel   = document.getElementById('ocr-panel');
  const ocrOut     = document.getElementById('ocr-output');

  let currentFile = null, resultBlob = null, origObjectURL = null;

  const pb = pwWrap ? new ProgressBar({ container: pwWrap, showLabel:true, showETA:true }) : null;

  // ── File handling ──────────────────────────────────────────
  function onFile(file) {
    const v = validateFile(file);
    if (!v.ok) { showToast(v.error, 'error'); return; }
    currentFile = file; resultBlob = null;
    if (origObjectURL) URL.revokeObjectURL(origObjectURL);
    origObjectURL = URL.createObjectURL(file);
    if (prevOrig)   prevOrig.src = origObjectURL;
    if (prevPanel)  prevPanel.classList.add('visible');
    if (statsOrig)  statsOrig.innerHTML = chip(formatBytes(file.size)) + chip(file.name.split('.').pop().toUpperCase());
    if (statsResult) statsResult.innerHTML = '';
    if (btnDl)      btnDl.classList.remove('visible');
    if (prevResult) prevResult.src = '';
    if (actionBar)  actionBar.style.display = 'flex';
    if (btnProcess) btnProcess.disabled = false;
    if (document.getElementById('controls-panel')) document.getElementById('controls-panel').classList.add('visible');
  }

  if (browseBtn) browseBtn.addEventListener('click', e => { e.stopPropagation(); fileInput?.click(); });
  if (dropzone)  dropzone.addEventListener('click', () => fileInput?.click());
  if (dropzone)  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
  if (dropzone)  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  if (dropzone)  dropzone.addEventListener('drop', e => {
    e.preventDefault(); dropzone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files||[]);
    if (files.length) onFile(files[0]);
  });
  if (fileInput) fileInput.addEventListener('change', e => {
    const files = Array.from(e.target.files||[]);
    if (files.length) onFile(files[0]);
    e.target.value = '';
  });
  // Clipboard paste support
  document.addEventListener('paste', e => {
    const img = Array.from(e.clipboardData?.items||[]).find(it => it.type.startsWith('image/'));
    if (img) { e.preventDefault(); onFile(img.getAsFile()); }
  });

  // ── Reset ──────────────────────────────────────────────────
  if (btnReset) btnReset.addEventListener('click', () => {
    currentFile = resultBlob = null;
    if (fileInput) fileInput.value = '';
    if (prevOrig)  prevOrig.src = '';
    if (prevResult)prevResult.src = '';
    if (statsOrig) statsOrig.innerHTML = '';
    if (statsResult)statsResult.innerHTML = '';
    if (prevPanel) prevPanel.classList.remove('visible');
    if (pwWrap)    { pwWrap.classList.remove('visible'); pb?.reset(); }
    if (actionBar) actionBar.style.display = 'none';
    if (btnDl)     btnDl.classList.remove('visible');
    if (document.getElementById('controls-panel'))
      document.getElementById('controls-panel').classList.remove('visible');
    if (ocrPanel)  ocrPanel.style.display = 'none';
    if (origObjectURL) { URL.revokeObjectURL(origObjectURL); origObjectURL = null; }
  });

  // ── Download ───────────────────────────────────────────────
  if (btnDl) btnDl.addEventListener('click', () => {
    if (!resultBlob) return;
    DownloadManager.download(resultBlob, `${slug}-${Date.now()}`, 'pixaroid');
    showToast('Download started!', 'success', 2500);
  });

  // ── Process ────────────────────────────────────────────────
  if (btnProcess) btnProcess.addEventListener('click', async () => {
    if (!currentFile) { showToast('Please select an image first.', 'warning'); return; }
    btnProcess.disabled = true;
    if (pwWrap) { pwWrap.classList.add('visible'); pb?.simulate(88); }
    const controls = getControlValues();

    try {
      const result = await routeProcess(tool, currentFile, controls);
      pb?.complete('Done!');
      if (result) {
        resultBlob = result.blob;
        // Preview result
        if (prevResult) {
          prevResult.src = URL.createObjectURL(result.blob);
          if (statsResult) {
            const savings = result.savings ?? 0;
            statsResult.innerHTML =
              chipGreen(formatBytes(result.blob.size)) +
              (savings > 0 ? chipGreen(`↓ ${savings}% smaller`) : '') +
              (result.width ? chip(`${result.width}×${result.height}`) : '');
          }
        }
        // OCR text output
        if (result.text !== undefined && ocrPanel) {
          ocrPanel.style.display = 'block';
          if (ocrOut) ocrOut.value = result.text || '(No text detected)';
        }
        if (btnDl) {
          btnDl.classList.add('visible');
          const lbl = btnDl.querySelector('#btn-download-label') || btnDl;
          lbl.textContent = result.isZip ? 'Download ZIP' : 'Download';
        }
        showToast('Processing complete! Click Download to save.', 'success');
      }
    } catch(err) {
      pb?.reset();
      if (pwWrap) pwWrap.classList.remove('visible');
      showToast(`Error: ${err.message}`, 'error', 6000);
    }
    btnProcess.disabled = false;
  });
})();

/* ── Route to correct engine function ────────────────────────── */
async function routeProcess(tool, file, controls) {
  const itype = tool.interfaceType;

  if (itype === 'compress') {
    return compressImage(file, {
      quality:  Number(controls.quality ?? 80),
      format:   controls.format ?? 'auto',
      maxWidth: Number(controls.maxWidth ?? 0),
    });
  }

  if (itype === 'compress-target') {
    return compressToTargetSize(file, {
      targetKB:   Number(controls.targetKB ?? 100),
      format:     controls.format ?? 'jpeg',
      minQuality: Number(controls.minQuality ?? 10),
    });
  }

  if (itype === 'convert' || itype === 'convert-multi' || itype === 'convert-pdf') {
    return convertImage(file, {
      targetFormat: controls.format ?? controls.targetFormat ?? 'jpeg',
      quality:      Number(controls.quality ?? 90),
      background:   controls.background ?? '#ffffff',
      lossless:     controls.lossless === true || controls.lossless === 'true',
    });
  }

  if (itype === 'resize' || itype === 'resize-social' || itype === 'social-canvas') {
    // Parse preset "Label WxH" pattern
    let preset = controls.preset;
    let w = Number(controls.width ?? 0), h = Number(controls.height ?? 0);
    if (preset && preset.match(/\d+×\d+/)) {
      const m = preset.match(/(\d+)×(\d+)/);
      if (m) { w = Number(m[1]); h = Number(m[2]); preset = undefined; }
    }
    return resizeImage(file, {
      width:      w,
      height:     h,
      percent:    Number(controls.percent ?? 0),
      preset:     preset,
      lockAspect: controls.lockAspect !== 'false',
      fit:        controls.fit ?? 'contain',
      format:     controls.format ?? 'auto',
      quality:    Number(controls.quality ?? 92),
    });
  }

  if (['crop','rotate','flip','watermark','text-overlay','blur','sharpen','adjust',
       'brightness','contrast','saturation','vibrance','hue','vignette',
       'temperature','tint','highlights','shadows','sepia','grayscale',
       'invert','noise','denoise','border'].includes(itype)) {
    const ops = buildEditOps(itype, controls);
    return editImage(file, ops, {
      format:  controls.format ?? 'auto',
      quality: Number(controls.quality ?? 90),
    });
  }

  if (['ai-bg-remove','ai-upscale','ai-enhance','ai-sharpen','ai-colorize','ai-ocr'].includes(itype)) {
    return dispatchAI(itype, file, controls);
  }

  if (itype === 'bulk') {
    return runBulk(tool, file, controls);
  }

  if (['info','metadata','palette','calculator'].includes(itype)) {
    return runUtility(itype, file, controls);
  }

  throw new Error(`Unknown interface type: "${itype}"`);
}

/* ── Edit operations builder ─────────────────────────────────── */
function buildEditOps(itype, controls) {
  switch(itype) {
    case 'rotate':      return [{ type:'rotate',      angle:      Number(controls.angle ?? 90) }];
    case 'flip':        return [{ type:'flip',         horizontal: controls.direction!=='vertical', vertical: controls.direction==='vertical' }];
    case 'crop':        return [{ type:'crop',         x:Number(controls.x??0), y:Number(controls.y??0), width:Number(controls.width), height:Number(controls.height) }];
    case 'watermark':   return [{ type:'watermark',    ...controls, fontSize:Number(controls.fontSize??40), opacity:Number(controls.opacity??50) }];
    case 'text-overlay':return [{ type:'text',         ...controls, fontSize:Number(controls.fontSize??48) }];
    case 'blur':        return [{ type:'blur',         radius:     Number(controls.radius??5) }];
    case 'sharpen':     return [{ type:'sharpen',      amount:     Number(controls.amount??50), radius:Number(controls.radius??1.5) }];
    case 'vignette':    return [{ type:'vignette',     intensity:  Number(controls.intensity??50) }];
    case 'border':      return [{ type:'border',       size:       Number(controls.size??10), color:controls.color||'#000000' }];
    case 'sepia':       return [{ type:'sepia',        intensity:  Number(controls.intensity??80) }];
    case 'grayscale':   return [{ type:'grayscale' }];
    case 'invert':      return [{ type:'invert' }];
    case 'noise':       return [{ type:'noise',        amount:     Number(controls.amount??20) }];
    case 'denoise':     return [{ type:'denoise',      strength:   Number(controls.strength??1.5) }];
    case 'adjust':      return [
      { type:'brightness', value: Number(controls.brightness??0) },
      { type:'contrast',   value: Number(controls.contrast??0)   },
      { type:'saturation', value: Number(controls.saturation??0) },
      { type:'vibrance',   value: Number(controls.vibrance??0)   },
      { type:'highlights', value: Number(controls.highlights??0) },
      { type:'shadows',    value: Number(controls.shadows??0)    },
      { type:'temperature',value: Number(controls.temperature??0)},
      { type:'tint',       value: Number(controls.tint??0)       },
    ].filter(op => op.value !== 0);
    default: return [{ type: itype, ...controls }];
  }
}

/* ── AI tool dispatcher ──────────────────────────────────────── */
async function dispatchAI(itype, file, controls) {
  const buffer = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = e => resolve(e.target.result);
    r.onerror = reject;
    r.readAsArrayBuffer(file);
  });
  const opMap = {
    'ai-bg-remove': 'ai-bg-remove', 'ai-upscale':'ai-upscale',
    'ai-enhance':'ai-enhance',      'ai-sharpen':'ai-sharpen',
    'ai-colorize':'ai-colorize',    'ai-ocr':'ai-ocr',
  };
  return new Promise((resolve, reject) => {
    const jobId  = crypto.randomUUID();
    const worker = new Worker('/workers/ai.worker.js');
    const timer  = setTimeout(() => { worker.terminate(); reject(new Error('AI processing timed out.')); }, 180_000);
    worker.addEventListener('message', e => {
      if (e.data?.type === 'progress') {
        const pct = e.data.percent ?? 0;
        const fill = document.getElementById('progress-fill');
        if (fill) fill.style.width = pct + '%';
        return;
      }
      if (e.data?.jobId !== jobId) return;
      clearTimeout(timer); worker.terminate();
      if (e.data.error) reject(new Error(e.data.error));
      else resolve(e.data);
    });
    worker.addEventListener('error', e => { clearTimeout(timer); worker.terminate(); reject(new Error(e.message)); });
    worker.postMessage({ jobId, op: opMap[itype], buffer, mime: file.type||'image/jpeg',
      scale: controls.scale, mode: controls.mode, strength: Number(controls.strength??70),
      style: controls.style, language: controls.language||'eng',
      amount: Number(controls.amount??70), radius: Number(controls.radius??1.5),
      intensity: Number(controls.intensity??80), bgColor: controls.bgColor||'transparent',
      refine: controls.refine !== 'false', preprocess: controls.preprocess !== 'false',
    }, [buffer]);
  });
}

/* ── Bulk runner ─────────────────────────────────────────────── */
async function runBulk(tool, file, controls) {
  const task  = _inferBulkTask(tool.slug);
  const input = document.getElementById('file-input');
  const files = input?.files?.length > 1 ? Array.from(input.files) : [file];
  const results = [], errors = [];
  const total = files.length;
  for await (const evt of processBulkImages(files, task, controls)) {
    if (evt.type === 'progress') {
      const pct = Math.round((evt.current/total)*100);
      const fill = document.getElementById('progress-fill');
      if (fill) fill.style.width = pct + '%';
      const lbl = document.getElementById('progress-label');
      if (lbl) lbl.textContent = `Processing ${evt.current}/${total}: ${evt.filename}`;
    }
    if (evt.type === 'done') { results.push(...(evt.results||[])); errors.push(...(evt.errors||[])); }
  }
  return _buildBulkResult(results);
}

function _inferBulkTask(slug) {
  if (slug.includes('compress'))  return 'compress';
  if (slug.includes('resize'))    return 'resize';
  if (slug.includes('convert'))   return 'convert';
  if (slug.includes('watermark')) return 'watermark';
  if (slug.includes('rotate'))    return 'rotate';
  if (slug.includes('flip'))      return 'flip';
  return 'compress';
}

async function _buildBulkResult(results) {
  if (!results.length) throw new Error('No output files from bulk processing.');
  if (results.length === 1) return results[0].result;
  try {
    if (!window.JSZip) {
      await new Promise((res,rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        s.onload=res; s.onerror=rej; document.head.appendChild(s);
      });
    }
    const zip = new window.JSZip();
    const EXT = { 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif' };
    for (const { filename, result } of results) {
      if (!result?.blob) continue;
      const ext  = EXT[result.blob.type] || 'jpg';
      const base = filename.replace(/\.[^.]+$/,'');
      zip.file(`${base}.${ext}`, result.blob);
    }
    const zipBlob = await zip.generateAsync({ type:'blob', compression:'DEFLATE' });
    return { blob: zipBlob, width:null, height:null, format:'zip', isZip:true };
  } catch { return results[0].result; }
}

/* ── Utility tools ───────────────────────────────────────────── */
async function runUtility(itype, file, controls) {
  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d');
  const img    = await new Promise((res,rej) => {
    const i = new Image();
    i.onload = () => res(i); i.onerror = rej;
    i.src = URL.createObjectURL(file);
  });
  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0,0,canvas.width,canvas.height);

  if (itype === 'palette' || itype === 'info') {
    const colours = extractPalette(id.data, 8);
    const panel   = document.getElementById('palette-panel') || document.getElementById('result-panel');
    if (panel) renderPalette(panel, colours, canvas.width, canvas.height, file.size);
    return { blob: file, width:canvas.width, height:canvas.height };
  }
  if (itype === 'metadata') {
    const panel = document.getElementById('result-panel') || document.getElementById('ocr-panel');
    const info  = { name:file.name, size:formatBytes(file.size), width:canvas.width, height:canvas.height,
      type:file.type, lastModified:new Date(file.lastModified).toLocaleDateString(), aspect:`${canvas.width}:${canvas.height}` };
    if (panel) { panel.style.display='block'; panel.innerHTML = `<pre style="font-size:.875rem;white-space:pre-wrap">${JSON.stringify(info,null,2)}</pre>`; }
    return { blob: file, ...info };
  }
  return { blob: file, width:canvas.width, height:canvas.height };
}

function extractPalette(data, count=8) {
  const buckets = {}, step=16;
  for (let i=0; i<data.length; i+=4) {
    if (data[i+3]<128) continue;
    const key = `${Math.round(data[i]/step)*step},${Math.round(data[i+1]/step)*step},${Math.round(data[i+2]/step)*step}`;
    buckets[key] = (buckets[key]||0)+1;
  }
  return Object.entries(buckets).sort((a,b)=>b[1]-a[1]).slice(0,count)
    .map(([k])=>{ const [r,g,b]=k.split(','); return `rgb(${r},${g},${b})`; });
}

function renderPalette(panel, colours, w, h, size) {
  panel.style.display='block';
  panel.innerHTML = `<div style="font-family:'Poppins',sans-serif;font-weight:600;margin-bottom:.75rem;">Colour Palette — ${w}×${h} · ${formatBytes(size)}</div>
  <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
    ${colours.map(c=>`<div style="width:44px;height:44px;border-radius:.5rem;background:${c};border:1px solid rgba(0,0,0,.1);cursor:pointer;title='${c}'" onclick="navigator.clipboard.writeText('${c}')"></div>`).join('')}
  </div>`;
}

/* ── Helpers ─────────────────────────────────────────────────── */
function getControlValues() {
  const vals = {};
  document.querySelectorAll('#controls-body [data-control]').forEach(el => {
    vals[el.dataset.control] = el.type==='checkbox' ? el.checked : el.value;
  });
  return vals;
}

function chip(t) {
  return `<span style="padding:.2rem .625rem;border-radius:999px;background:var(--bg,#F9FAFB);border:1px solid var(--border,#E5E7EB);font-size:.75rem;">${t}</span>`;
}
function chipGreen(t) {
  return `<span style="padding:.2rem .625rem;border-radius:999px;background:rgba(16,185,129,.1);color:#059669;font-weight:600;font-size:.75rem;">${t}</span>`;
}
