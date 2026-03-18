/* Pixaroid — resize.worker.js — classic script */
'use strict';

var MIME = {jpeg:'image/jpeg',jpg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif'};
var PRESETS = {
  '1080x1080':{w:1080,h:1080},'1080x1350':{w:1080,h:1350},'1080x566':{w:1080,h:566},
  '1080x1920':{w:1080,h:1920},'1200x630':{w:1200,h:630},'820x312':{w:820,h:312},
  '1200x675':{w:1200,h:675},'1500x500':{w:1500,h:500},'400x400':{w:400,h:400},
  '1200x627':{w:1200,h:627},'1584x396':{w:1584,h:396},'1280x720':{w:1280,h:720},
  '2560x1440':{w:2560,h:1440},'500x500':{w:500,h:500},'1000x1500':{w:1000,h:1500},
  '600x600':{w:600,h:600},'413x531':{w:413,h:531},'512x512':{w:512,h:512},
  '165x165':{w:165,h:165},'800x800':{w:800,h:800},'320x320':{w:320,h:320},
};

self.onmessage = async function(e) {
  var d = e.data;
  try {
    var r = await resize(d);
    var _b=r.blob,_ab=await _b.arrayBuffer();self.postMessage({jobId:jobId:d.jobId,buffer:_ab,mime:_b.type,width:r.w,height:r.h,format:r.fmt});
  } catch(err) {
    self.postMessage({jobId:d.jobId, error:String(err.message||err)});
  }
};

async function getBitmap(buffer, mime) {
  try { return await createImageBitmap(new Blob([buffer],{type:mime||'image/jpeg'})); }
  catch(e) { try { return await createImageBitmap(new Blob([buffer])); } catch(e2) { throw new Error('Cannot decode image'); } }
}

async function resize(d) {
  var bm = await getBitmap(d.buffer, d.mime);
  var sw=bm.width, sh=bm.height, ratio=sw/sh;
  var fmt = d.format||'jpeg'; if(fmt==='auto') fmt=d.mime==='image/png'?'png':'jpeg';
  var q = Math.max(1, Math.min(100, parseFloat(d.quality)||92));
  var mime = MIME[fmt]||'image/jpeg';
  var fit = d.fit||'contain';
  var dw=sw, dh=sh;

  // Parse preset
  var preset = d.preset||'';
  var pm = preset.match(/(\d+)[×x](\d+)/);
  if (pm) { dw=+pm[1]; dh=+pm[2]; }
  else if (preset) {
    var key = Object.keys(PRESETS).find(function(k){ return preset.indexOf(k)>=0||preset.replace('×','x').indexOf(k)>=0; });
    if (key) { dw=PRESETS[key].w; dh=PRESETS[key].h; }
  }
  if (!pm && !preset) {
    var pct=parseFloat(d.percent)||0, tw=parseInt(d.width)||0, th=parseInt(d.height)||0;
    var lock = d.lockAspect!=='false' && d.lockAspect!==false;
    if (pct>0) { dw=Math.max(1,Math.round(sw*pct/100)); dh=Math.max(1,Math.round(sh*pct/100)); }
    else if (tw>0&&th>0) { dw=tw; dh=th; }
    else if (tw>0) { dw=tw; dh=lock?Math.max(1,Math.round(tw/ratio)):sh; }
    else if (th>0) { dh=th; dw=lock?Math.max(1,Math.round(th*ratio)):sw; }
  }
  dw=Math.max(1,dw); dh=Math.max(1,dh);

  var c = new OffscreenCanvas(dw, dh);
  var ctx = c.getContext('2d');
  if (mime==='image/jpeg') { ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,dw,dh); }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (fit==='cover') {
    var scl=Math.max(dw/sw,dh/sh);
    var nw=sw*scl, nh=sh*scl;
    ctx.drawImage(bm,(dw-nw)/2,(dh-nh)/2,nw,nh);
  } else if (fit==='stretch') {
    ctx.drawImage(bm,0,0,dw,dh);
  } else {
    // contain
    var scl2=Math.min(dw/sw,dh/sh);
    var nw2=sw*scl2, nh2=sh*scl2;
    ctx.drawImage(bm,(dw-nw2)/2,(dh-nh2)/2,nw2,nh2);
  }
  bm.close();
  var opts = (mime==='image/png'||mime==='image/gif')?{type:mime}:{type:mime,quality:q/100};
  var blob = await c.convertToBlob(opts);
  return {blob:blob, w:dw, h:dh, fmt:fmt};
}
