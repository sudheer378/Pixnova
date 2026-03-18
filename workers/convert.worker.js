/* Pixaroid — Convert Worker (classic script) */
'use strict';

var MIME_MAP = {jpeg:'image/jpeg',jpg:'image/jpeg',png:'image/png',webp:'image/webp',avif:'image/avif',gif:'image/gif',bmp:'image/bmp',tiff:'image/tiff',tif:'image/tiff'};

self.onmessage = async function(e) {
  var d = e.data;
  try {
    var result = await convert(d);
    self.postMessage({jobId:d.jobId, blob:result.blob, width:result.width, height:result.height, format:result.format}, [result.blob]);
  } catch(err) {
    self.postMessage({jobId:d.jobId, error:err.message||String(err)});
  }
};

async function decode(buffer, mime) {
  var blob = new Blob([buffer], {type:mime||'image/jpeg'});
  try { return await createImageBitmap(blob); }
  catch(e) {
    if (mime==='image/heic'||mime==='image/heif') throw new Error('HEIC decoding failed. Use the HEIC→JPG tool first, then convert.');
    try { return await createImageBitmap(new Blob([buffer])); } catch(e2) {}
    throw new Error('Decode failed: ' + (e.message||e));
  }
}

async function convert(d) {
  var fmt = (d.targetFormat||'jpeg').toLowerCase().replace('jpg','jpeg');
  var outMime = MIME_MAP[fmt] || 'image/jpeg';
  var quality = Math.max(0.01, Math.min(1, (d.quality||90)/100));
  var bg = d.background || '#ffffff';
  var lossless = d.lossless === true || d.lossless === 'true';

  var bm = await decode(d.buffer, d.mime);
  var w = bm.width, h = bm.height;
  var c = new OffscreenCanvas(w, h);
  var ctx = c.getContext('2d');

  // Fill background for formats that don't support alpha
  if (outMime === 'image/jpeg' || outMime === 'image/bmp') {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(bm, 0, 0);
  bm.close();

  var opts;
  if (outMime === 'image/png') opts = {type:'image/png'};
  else if (outMime === 'image/webp') opts = {type:'image/webp', quality: lossless ? 1.0 : quality};
  else opts = {type:outMime, quality:quality};

  var blob = await c.convertToBlob(opts);
  return {blob:blob, width:w, height:h, format:fmt};
}
