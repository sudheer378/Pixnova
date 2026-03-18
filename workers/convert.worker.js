/* Pixaroid — convert.worker.js — classic script */
'use strict';

var MIME = {jpeg:'image/jpeg',jpg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',bmp:'image/bmp',tiff:'image/tiff',tif:'image/tiff',avif:'image/avif'};

self.onmessage = async function(e) {
  var d = e.data;
  try {
    var r = await convert(d);
    var _b=r.blob,_ab=await _b.arrayBuffer();self.postMessage({jobId:jobId:d.jobId,buffer:_ab,mime:_b.type,width:r.w,height:r.h,format:r.fmt});
  } catch(err) {
    self.postMessage({jobId:d.jobId, error:String(err.message||err)});
  }
};

async function getBitmap(buffer, mime) {
  var tries = [mime,'image/jpeg','image/png',''];
  for (var i=0; i<tries.length; i++) {
    try {
      return await createImageBitmap(tries[i] ? new Blob([buffer],{type:tries[i]}) : new Blob([buffer]));
    } catch(e) {}
  }
  throw new Error('Cannot decode image. Try converting to JPG first.');
}

async function convert(d) {
  var fmt = (d.targetFormat||'jpeg').toLowerCase().replace('jpg','jpeg');
  var mime = MIME[fmt] || 'image/jpeg';
  var q = Math.max(1, Math.min(100, parseFloat(d.quality)||90));
  var bg = d.background || '#ffffff';
  var lossless = d.lossless===true || d.lossless==='true';
  var bm = await getBitmap(d.buffer, d.mime||'image/jpeg');
  var w=bm.width, h=bm.height;
  var c = new OffscreenCanvas(w, h);
  var ctx = c.getContext('2d');
  if (mime==='image/jpeg'||mime==='image/bmp') { ctx.fillStyle=bg; ctx.fillRect(0,0,w,h); }
  ctx.drawImage(bm, 0, 0);
  bm.close();
  var opts;
  if (mime==='image/png'||mime==='image/gif') opts={type:mime};
  else if (mime==='image/webp') opts={type:mime, quality: lossless?1.0:q/100};
  else opts={type:mime, quality:q/100};
  var blob = await c.convertToBlob(opts);
  return {blob:blob, w:w, h:h, fmt:fmt};
}
