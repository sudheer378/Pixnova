/* Pixaroid — compress.worker.js — classic script, no ES modules */
'use strict';

var MIME = {jpeg:'image/jpeg',jpg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif'};
var STEPS = [1,0.9,0.8,0.7,0.6,0.5,0.4,0.3,0.25,0.2];

self.onmessage = async function(e) {
  var d = e.data;
  try {
    var r = (d.op === 'compress-target') ? await targetCompress(d) : await fixedCompress(d);
    var _b=r.blob,_ab=await _b.arrayBuffer();self.postMessage({jobId:jobId:d.jobId,buffer:_ab,mime:_b.type,width:r.w,height:r.h,format:r.fmt});
  } catch(err) {
    self.postMessage({jobId:d.jobId, error: String(err.message||err)});
  }
};

async function getBitmap(buffer, mime) {
  var types = [mime, 'image/jpeg', 'image/png', ''];
  for (var i=0; i<types.length; i++) {
    try {
      var blob = types[i] ? new Blob([buffer],{type:types[i]}) : new Blob([buffer]);
      return await createImageBitmap(blob);
    } catch(e) {}
  }
  throw new Error('Cannot decode this image format. Please try JPG or PNG.');
}

async function draw(bm, w, h, fmt, q) {
  var mime = MIME[fmt] || 'image/jpeg';
  var c = new OffscreenCanvas(w, h);
  var ctx = c.getContext('2d');
  if (mime !== 'image/png' && mime !== 'image/gif') { ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,w,h); }
  ctx.drawImage(bm, 0, 0, w, h);
  var opts = (mime==='image/png'||mime==='image/gif') ? {type:mime} : {type:mime, quality: q/100};
  var blob = await c.convertToBlob(opts);
  if (!blob || blob.size===0) throw new Error('Canvas output was empty');
  return blob;
}

async function fixedCompress(d) {
  var fmt = d.format || 'jpeg'; if (fmt==='auto') fmt = autoFmt(d.mime);
  var q = Math.max(1, Math.min(100, parseFloat(d.quality)||80));
  var bm = await getBitmap(d.buffer, d.mime);
  var w = bm.width, h = bm.height;
  if (d.maxWidth && d.maxWidth > 0 && w > d.maxWidth) {
    h = Math.round(h / w * d.maxWidth); w = d.maxWidth;
  }
  var blob = await draw(bm, w, h, fmt, q);
  bm.close();
  return {blob:blob, w:w, h:h, fmt:fmt};
}

async function targetCompress(d) {
  var targetBytes = d.targetBytes || (parseFloat(d.targetKB)||100)*1024;
  var fmt = (d.format||'jpeg').replace('jpg','jpeg'); if (fmt==='auto') fmt='jpeg';
  var minQ = Math.max(1, Math.min(50, parseFloat(d.minQuality)||5));
  var bm = await getBitmap(d.buffer, d.mime);
  var origW = bm.width, origH = bm.height;

  // Phase 1: binary search quality at full size
  var lo=minQ, hi=95, bestBlob=null, bestQ=hi;
  for (var i=0; i<16; i++) {
    var mid = Math.round((lo+hi)/2);
    var probe = await draw(bm, origW, origH, fmt, mid);
    if (probe.size <= targetBytes) { bestBlob=probe; bestQ=mid; lo=mid+1; }
    else hi=mid-1;
    if (lo>hi) break;
  }
  if (bestBlob) { bm.close(); return {blob:bestBlob, w:origW, h:origH, fmt:fmt}; }

  // Phase 2: scale down dimensions
  for (var s=0; s<STEPS.length; s++) {
    var sc=STEPS[s], sw=Math.max(1,Math.round(origW*sc)), sh=Math.max(1,Math.round(origH*sc));
    lo=minQ; hi=95; bestBlob=null;
    for (var j=0; j<14; j++) {
      var qm=Math.round((lo+hi)/2);
      var p2=await draw(bm, sw, sh, fmt, qm);
      if (p2.size<=targetBytes) { bestBlob=p2; lo=qm+1; }
      else hi=qm-1;
      if (lo>hi) break;
    }
    if (bestBlob) { bm.close(); return {blob:bestBlob, w:sw, h:sh, fmt:fmt}; }
  }
  bm.close();
  // Absolute fallback
  var fbm = await getBitmap(d.buffer, d.mime);
  var fb = await draw(fbm, Math.max(1,Math.round(origW*0.2)), Math.max(1,Math.round(origH*0.2)), fmt, minQ);
  fbm.close();
  return {blob:fb, w:Math.round(origW*0.2), h:Math.round(origH*0.2), fmt:fmt};
}

function autoFmt(mime) {
  if (mime==='image/png') return 'png';
  if (mime==='image/webp') return 'webp';
  return 'jpeg';
}
