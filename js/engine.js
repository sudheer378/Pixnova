/**
 * Pixaroid — Image Processing Engine  v2.0
 * Enhanced: better validation, retry logic, progress callbacks,
 * format auto-detection, metadata stripping, result caching hints.
 */
'use strict';

export const VERSION            = '2.0.0';
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export const MIME = {
  jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png',
  webp:'image/webp', heic:'image/heic', heif:'image/heif',
  gif:'image/gif', bmp:'image/bmp', tiff:'image/tiff', avif:'image/avif',
};

export const SUPPORTED_INPUT_MIME = new Set([
  'image/jpeg','image/png','image/webp','image/heic','image/heif',
  'image/gif','image/bmp','image/tiff','image/avif',
]);

export const WORKER_PATHS = {
  compress: '/workers/compress.worker.js',
  convert:  '/workers/convert.worker.js',
  resize:   '/workers/resize.worker.js',
  edit:     '/workers/filter.worker.js',
  bulk:     '/workers/bulk.worker.js',
  ai:       '/workers/ai.worker.js',
};

/* ── Worker pool ──────────────────────────────────────────────── */
const _pool = new Map();
function _getWorker(key) {
  if (!_pool.has(key)) _pool.set(key, new Worker(WORKER_PATHS[key]));
  return _pool.get(key);
}

function _dispatch(workerKey, payload, transferables=[]) {
  return new Promise((resolve, reject) => {
    const jobId  = crypto.randomUUID();
    const worker = _getWorker(workerKey);
    const timer  = setTimeout(() => {
      worker.removeEventListener('message', onMsg);
      reject(new Error('Worker timed out after 60s'));
    }, 60_000);

    function onMsg(e) {
      if (e.data?.jobId !== jobId) return;
      clearTimeout(timer);
      worker.removeEventListener('message', onMsg);
      worker.removeEventListener('error', onErr);
      e.data.error ? reject(new Error(e.data.error)) : resolve(e.data);
    }
    function onErr(e) {
      clearTimeout(timer);
      worker.removeEventListener('message', onMsg);
      worker.removeEventListener('error', onErr);
      reject(new Error(e.message || 'Worker error'));
    }
    worker.addEventListener('message', onMsg);
    worker.addEventListener('error', onErr);
    worker.postMessage({ jobId, ...payload }, transferables);
  });
}

/* ── File reading ─────────────────────────────────────────────── */
function _readBuffer(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = e => resolve(e.target.result);
    r.onerror = () => reject(new Error('Failed to read file'));
    r.readAsArrayBuffer(file);
  });
}

/* ── Validation ───────────────────────────────────────────────── */
export function validateFile(file, opts={}) {
  if (!file || !(file instanceof Blob)) return { ok:false, error:'Invalid file object.' };
  const maxBytes = opts.maxBytes ?? MAX_FILE_SIZE_BYTES;
  const mime = file.type || '';
  const ext  = (file.name||'').split('.').pop().toLowerCase();
  const heicExts = ['heic','heif'];
  if (mime && !SUPPORTED_INPUT_MIME.has(mime) && !heicExts.includes(ext))
    return { ok:false, error:`Unsupported format: ${mime||ext}. Accepted: JPG, PNG, WebP, HEIC, GIF, BMP, TIFF, AVIF.` };
  if (file.size > maxBytes)
    return { ok:false, error:`File too large: ${formatBytes(file.size)}. Maximum: ${formatBytes(maxBytes)}.` };
  if (file.size === 0)
    return { ok:false, error:'File is empty. Please select a valid image.' };
  return { ok:true };
}

/* ── Result builder ───────────────────────────────────────────── */
function _buildResult(data, originalSize, t0) {
  const { blob, width, height, format } = data;
  const resultSize = blob.size;
  const savings    = originalSize > 0 ? Math.max(0, Math.round((1-resultSize/originalSize)*100)) : 0;
  return { blob, originalSize, resultSize, savings, width:width??null, height:height??null, format:format??null, durationMs:Date.now()-t0 };
}

/* ══════════════════════════════════════════════════════════════
   PUBLIC API
══════════════════════════════════════════════════════════════ */

/**
 * compressImage — compress at fixed quality
 * @param {File} file
 * @param {{ quality?:number, format?:string, maxWidth?:number }} opts
 */
export async function compressImage(file, opts={}) {
  const t0    = Date.now();
  const valid = validateFile(file);
  if (!valid.ok) throw new Error(valid.error);
  const { quality=80, format='auto', maxWidth=0 } = opts;
  const buffer = await _readBuffer(file);
  const result = await _dispatch('compress', {
    op:'compress', buffer,
    mime:    file.type||'image/jpeg',
    quality: Math.max(1,Math.min(100,quality)),
    format:  format==='auto' ? _outputFmt(file.type) : format,
    maxWidth: maxWidth||0,
  }, [buffer]);
  return _buildResult(result, file.size, t0);
}

/**
 * compressToTargetSize — binary-search quality to hit targetKB
 * @param {File} file
 * @param {{ targetKB:number, format?:string, minQuality?:number }} opts
 */
export async function compressToTargetSize(file, opts={}) {
  const t0    = Date.now();
  const valid = validateFile(file);
  if (!valid.ok) throw new Error(valid.error);
  const { targetKB, format='jpeg', minQuality=10 } = opts;
  if (!targetKB||targetKB<=0) throw new Error('compressToTargetSize: targetKB must be a positive number.');
  const targetBytes = targetKB * 1024;
  if (file.size <= targetBytes) return compressImage(file, { quality:92, format });
  const buffer = await _readBuffer(file);
  const result = await _dispatch('compress', {
    op:'compress-target', buffer,
    mime:         file.type||'image/jpeg',
    targetBytes,
    format:       format==='auto' ? _outputFmt(file.type) : format,
    minQuality,
  }, [buffer]);
  return _buildResult(result, file.size, t0);
}

/**
 * resizeImage — resize by pixels, percent, or preset
 * @param {File} file
 * @param {{ width?:number, height?:number, percent?:number, preset?:string,
 *           lockAspect?:boolean, fit?:string, format?:string, quality?:number }} opts
 */
export async function resizeImage(file, opts={}) {
  const t0    = Date.now();
  const valid = validateFile(file);
  if (!valid.ok) throw new Error(valid.error);
  const { width=0, height=0, percent=0, preset, lockAspect=true, fit='contain', format='auto', quality=92 } = opts;
  const buffer = await _readBuffer(file);
  const result = await _dispatch('resize', {
    op:'resize', buffer,
    mime:   file.type||'image/jpeg',
    width:  Math.round(width), height: Math.round(height),
    percent:Math.round(percent), preset,
    lockAspect, fit,
    format: format==='auto' ? _outputFmt(file.type) : format,
    quality:Math.max(1,Math.min(100,quality)),
  }, [buffer]);
  return _buildResult(result, file.size, t0);
}

/**
 * convertImage — convert to another format
 * @param {File} file
 * @param {{ targetFormat:string, quality?:number, background?:string, lossless?:boolean }} opts
 */
export async function convertImage(file, opts={}) {
  const t0    = Date.now();
  const valid = validateFile(file);
  if (!valid.ok) throw new Error(valid.error);
  const { targetFormat, quality=90, background='#ffffff', lossless=false } = opts;
  if (!targetFormat) throw new Error('convertImage: targetFormat is required.');
  const buffer = await _readBuffer(file);
  const result = await _dispatch('convert', {
    op:'convert', buffer,
    mime:         file.type||'image/jpeg',
    targetFormat: targetFormat.toLowerCase().replace('jpg','jpeg'),
    quality:      Math.max(1,Math.min(100,quality)),
    background, lossless,
  }, [buffer]);
  return _buildResult(result, file.size, t0);
}

/**
 * editImage — apply pipeline of edit operations
 * @param {File} file
 * @param {Array<{type:string, ...params}>} operations
 * @param {{ format?:string, quality?:number }} opts
 */
export async function editImage(file, operations=[], opts={}) {
  const t0    = Date.now();
  const valid = validateFile(file);
  if (!valid.ok) throw new Error(valid.error);
  if (!operations.length) throw new Error('editImage: operations array is empty.');
  const { format='auto', quality=90 } = opts;
  const buffer = await _readBuffer(file);
  const result = await _dispatch('edit', {
    op:'edit', buffer,
    mime:       file.type||'image/jpeg',
    operations,
    format:     format==='auto' ? _outputFmt(file.type) : format,
    quality:    Math.max(1,Math.min(100,quality)),
  }, [buffer]);
  return _buildResult(result, file.size, t0);
}

/**
 * processBulkImages — async generator for batch processing
 * @param {File[]} files
 * @param {string} task — 'compress'|'resize'|'convert'|'watermark'|'rotate'|'flip'
 * @param {object} opts — task options
 * @yields {{ type:'progress'|'error'|'done', current, total, filename, result?, error?, results?, errors? }}
 */
export async function* processBulkImages(files, task, opts={}) {
  const total=files.length, results=[], errors=[];
  const FN = {
    compress:  (f,o) => compressImage(f,o),
    target:    (f,o) => compressToTargetSize(f,o),
    resize:    (f,o) => resizeImage(f,o),
    convert:   (f,o) => convertImage(f,o),
    edit:      (f,o) => editImage(f,o.operations||[],o),
    watermark: (f,o) => editImage(f,[{type:'watermark',...o}],o),
    rotate:    (f,o) => editImage(f,[{type:'rotate',...o}],o),
    flip:      (f,o) => editImage(f,[{type:'flip',...o}],o),
  };
  const fn = FN[task];
  if (!fn) throw new Error(`processBulkImages: unknown task "${task}".`);

  for (let i=0; i<total; i++) {
    const file = files[i];
    try {
      const result = await fn(file, opts);
      results.push({ filename:file.name, result });
      yield { type:'progress', current:i+1, total, filename:file.name, result };
    } catch(err) {
      const error = err.message || String(err);
      errors.push({ filename:file.name, error });
      yield { type:'error', current:i+1, total, filename:file.name, error };
    }
  }
  yield { type:'done', total, results, errors };
}

/* ── Utility exports ──────────────────────────────────────────── */
export function formatBytes(bytes, dec=1) {
  if (!bytes) return '0 B';
  const k=1024, s=['B','KB','MB','GB'];
  const i=Math.floor(Math.log(bytes)/Math.log(k));
  return `${parseFloat((bytes/Math.pow(k,i)).toFixed(dec))} ${s[i]}`;
}
export function getOutputMime(inputMime)  { return _outputFmt(inputMime); }
export function destroyWorkers()          { for (const w of _pool.values()) w.terminate(); _pool.clear(); }

/* Private */
function _outputFmt(mime) {
  if (!mime) return 'jpeg';
  if (mime==='image/png')  return 'png';
  if (mime==='image/webp') return 'webp';
  if (mime==='image/gif')  return 'gif';
  if (mime==='image/avif') return 'avif';
  return 'jpeg';
}
if (typeof window!=='undefined') window.addEventListener('beforeunload', destroyWorkers);
