/* Pixaroid — Compress Worker (classic script — no ES modules) */
'use strict';

var MIME_MAP = {jpeg:'image/jpeg',jpg:'image/jpeg',png:'image/png',webp:'image/webp',avif:'image/avif',gif:'image/gif'};
var DIM_STEPS = [0.9,0.85,0.8,0.75,0.7,0.65,0.6,0.55,0.5,0.45,0.4,0.35,0.3,0.25];

self.onmessage = async function(e) {
  var d = e.data, jobId = d.jobId;
  try {
    var result = d.op === 'compress-target'
      ? await compressTarget(d)
      : await compress(d);
    self.postMessage({jobId:jobId, blob:result.blob, width:result.width, height:result.height, format:result.format}, [result.blob]);
  } catch(err) {
    self.postMessage({jobId:jobId, error:err.message||String(err)});
  }
};

async function decode(buffer, mime) {
  var blob = new Blob([buffer], {type: mime||'image/jpeg'});
  try { return await createImageBitmap(blob); }
  catch(e) {
    if (mime === 'image/heic' || mime === 'image/heif') throw new Error('HEIC not supported in this browser. Please convert HEIC to JPG first using the HEIC→JPG tool.');
    // Try without MIME type
    try { return await createImageBitmap(new Blob([buffer])); } catch(e2) {}
    throw new Error('Could not decode image: ' + (e.message||e));
  }
}

async function render(bm, w, h, fmt, quality) {
  var mime = MIME_MAP[fmt] || 'image/jpeg';
  var c = new OffscreenCanvas(w, h);
  var ctx = c.getContext('2d');
  if (mime === 'image/jpeg') { ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h); }
  ctx.drawImage(bm, 0, 0, w, h);
  var opts = mime === 'image/png' ? {type:mime} : {type:mime, quality:quality};
  return c.convertToBlob(opts);
}

async function compress(d) {
  var bm = await decode(d.buffer, d.mime);
  var w = bm.width, h = bm.height;
  var maxWidth = d.maxWidth || 0;
  if (maxWidth > 0 && w > maxWidth) { h = Math.round(h/w*maxWidth); w = maxWidth; }
  var fmt = d.format || 'jpeg';
  if (fmt === 'auto') fmt = d.mime === 'image/png' ? 'png' : d.mime === 'image/webp' ? 'webp' : 'jpeg';
  var quality = Math.max(0.01, Math.min(1, (d.quality||80)/100));
  var blob = await render(bm, w, h, fmt, quality);
  bm.close();
  return {blob:blob, width:w, height:h, format:fmt};
}

async function compressTarget(d) {
  var targetBytes = d.targetBytes || (d.targetKB || 100) * 1024;
  var fmt = d.format || 'jpeg';
  if (fmt === 'auto') fmt = 'jpeg';
  var minQ = Math.max(0.03, (d.minQuality||10)/100);
  var bm = await decode(d.buffer, d.mime);
  var origW = bm.width, origH = bm.height;

  // Quick check
  var hi = await render(bm, origW, origH, fmt, 0.95);
  if (hi.size <= targetBytes) { bm.close(); return {blob:hi, width:origW, height:origH, format:fmt}; }

  // Phase 1: binary search on quality
  var lo = minQ, hiQ = 0.95, best = null;
  for (var i = 0; i < 14; i++) {
    var mid = (lo + hiQ) / 2;
    var probe = await render(bm, origW, origH, fmt, mid);
    if (probe.size <= targetBytes) { best = {blob:probe, w:origW, h:origH}; lo = mid; }
    else hiQ = mid;
    if (hiQ - lo < 0.003) break;
  }
  if (best) { bm.close(); return {blob:best.blob, width:best.w, height:best.h, format:fmt}; }

  // Phase 2: dimension scaling
  for (var s = 0; s < DIM_STEPS.length; s++) {
    var scale = DIM_STEPS[s];
    var sw = Math.max(1, Math.round(origW * scale));
    var sh = Math.max(1, Math.round(origH * scale));
    var sLo = minQ, sHi = 0.92;
    for (var j = 0; j < 12; j++) {
      var smid = (sLo + sHi) / 2;
      var sp = await render(bm, sw, sh, fmt, smid);
      if (sp.size <= targetBytes) { best = {blob:sp, w:sw, h:sh}; sLo = smid; }
      else sHi = smid;
      if (sHi - sLo < 0.003) break;
    }
    if (best && best.w === sw) break;
  }
  bm.close();
  if (best) return {blob:best.blob, width:best.w, height:best.h, format:fmt};

  // Absolute fallback
  var fbm = await decode(d.buffer, d.mime);
  var ls = DIM_STEPS[DIM_STEPS.length-1];
  var fb = await render(fbm, Math.max(1,Math.round(origW*ls)), Math.max(1,Math.round(origH*ls)), fmt, minQ);
  fbm.close();
  return {blob:fb, width:Math.round(origW*ls), height:Math.round(origH*ls), format:fmt};
}
