/* Pixaroid — Resize Worker (classic script) */
'use strict';

var MIME_MAP = {jpeg:'image/jpeg',jpg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif'};
var PRESETS = {
  'Instagram Square':       {w:1080,h:1080}, 'Instagram Portrait':   {w:1080,h:1350},
  'Instagram Landscape':    {w:1080,h:566},  'Instagram Story':      {w:1080,h:1920},
  'Facebook Post':          {w:1200,h:630},  'Facebook Cover':       {w:820,h:312},
  'Twitter Tweet':          {w:1200,h:675},  'Twitter Header':       {w:1500,h:500},
  'LinkedIn Post':          {w:1200,h:627},  'LinkedIn Banner':      {w:1584,h:396},
  'YouTube Thumbnail':      {w:1280,h:720},  'YouTube Channel':      {w:2560,h:1440},
  'WhatsApp DP':            {w:500,h:500},   'WhatsApp Status':      {w:1080,h:1920},
  'Pinterest Pin':          {w:1000,h:1500}, 'TikTok Video':         {w:1080,h:1920},
  'US Passport':            {w:600,h:600},   'UK Passport':          {w:413,h:531},
  'India Passport':         {w:413,h:531},
};

self.onmessage = async function(e) {
  var d = e.data;
  try {
    var result = await resize(d);
    self.postMessage({jobId:d.jobId, blob:result.blob, width:result.width, height:result.height, format:result.format}, [result.blob]);
  } catch(err) {
    self.postMessage({jobId:d.jobId, error:err.message||String(err)});
  }
};

async function resize(d) {
  var bm = await decode(d.buffer, d.mime);
  var srcW = bm.width, srcH = bm.height;
  var fmt = d.format || 'jpeg';
  if (fmt === 'auto') fmt = d.mime === 'image/png' ? 'png' : 'jpeg';
  var quality = Math.max(0.01, Math.min(1, (d.quality||92)/100));
  var fit = d.fit || 'contain';
  var lockAspect = d.lockAspect !== false && d.lockAspect !== 'false';
  var dstW, dstH;

  // Parse preset from "Label WxH" string
  var preset = d.preset || '';
  var pm = preset.match(/(\d+)[×x](\d+)/);
  if (pm) { dstW = parseInt(pm[1]); dstH = parseInt(pm[2]); }
  else if (preset) {
    for (var k in PRESETS) {
      if (preset.toLowerCase().indexOf(k.toLowerCase()) >= 0 || preset.toLowerCase().indexOf(PRESETS[k].w+'x'+PRESETS[k].h) >= 0) {
        dstW = PRESETS[k].w; dstH = PRESETS[k].h; break;
      }
    }
  }

  if (!dstW && !dstH) {
    var pct = parseFloat(d.percent) || 0;
    var w = parseInt(d.width) || 0, h = parseInt(d.height) || 0;
    if (pct > 0) {
      dstW = Math.max(1, Math.round(srcW * pct / 100));
      dstH = Math.max(1, Math.round(srcH * pct / 100));
    } else if (w > 0 && h > 0) {
      dstW = w; dstH = h;
    } else if (w > 0) {
      dstW = w; dstH = lockAspect ? Math.max(1, Math.round(w / (srcW/srcH))) : srcH;
    } else if (h > 0) {
      dstH = h; dstW = lockAspect ? Math.max(1, Math.round(h * (srcW/srcH))) : srcW;
    } else {
      dstW = srcW; dstH = srcH; // no change
    }
  }

  var outMime = MIME_MAP[fmt] || 'image/jpeg';
  var c = new OffscreenCanvas(dstW, dstH);
  var ctx = c.getContext('2d');
  if (outMime === 'image/jpeg') { ctx.fillStyle='#fff'; ctx.fillRect(0,0,dstW,dstH); }

  if (fit === 'cover' && dstW && dstH) {
    var scaleW = dstW/srcW, scaleH = dstH/srcH;
    var scale = Math.max(scaleW, scaleH);
    var drawW = Math.round(srcW*scale), drawH = Math.round(srcH*scale);
    ctx.drawImage(bm, Math.round((dstW-drawW)/2), Math.round((dstH-drawH)/2), drawW, drawH);
  } else if (fit === 'stretch') {
    ctx.drawImage(bm, 0, 0, dstW, dstH);
  } else {
    // contain
    var scaleW2 = dstW/srcW, scaleH2 = dstH/srcH;
    var scale2 = Math.min(scaleW2, scaleH2);
    var dw = Math.round(srcW*scale2), dh = Math.round(srcH*scale2);
    ctx.drawImage(bm, Math.round((dstW-dw)/2), Math.round((dstH-dh)/2), dw, dh);
  }
  bm.close();

  var opts = outMime === 'image/png' ? {type:outMime} : {type:outMime, quality:quality};
  var blob = await c.convertToBlob(opts);
  return {blob:blob, width:dstW, height:dstH, format:fmt};
}

async function decode(buffer, mime) {
  try { return await createImageBitmap(new Blob([buffer], {type:mime||'image/jpeg'})); }
  catch(e) {
    try { return await createImageBitmap(new Blob([buffer])); } catch(e2) {}
    throw new Error('Decode failed: ' + (e.message||e));
  }
}
