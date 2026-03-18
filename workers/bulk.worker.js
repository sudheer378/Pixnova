/* Pixaroid — Bulk Worker (classic script) */
'use strict';

var MIME_MAP = {jpeg:'image/jpeg',jpg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif'};
function clamp(v){return Math.max(0,Math.min(255,Math.round(v)));}

self.onmessage = async function(e) {
  var d = e.data, jobId = d.jobId;
  var tasks = d.tasks || [], taskType = d.taskType || 'compress', options = d.options || {};
  var total = tasks.length, results = [], errors = [];

  for (var i = 0; i < total; i++) {
    var task = tasks[i];
    try {
      var blob = await processTask(task, taskType, options);
      results.push({filename:task.filename, blob:blob});
      self.postMessage({jobId:jobId, type:'progress', current:i+1, total:total, filename:task.filename, blob:blob}, [blob]);
    } catch(err) {
      var error = err.message||String(err);
      errors.push({filename:task.filename, error:error});
      self.postMessage({jobId:jobId, type:'progress', current:i+1, total:total, filename:task.filename, error:error});
    }
  }
  self.postMessage({jobId:jobId, type:'done', total:total, results:results, errors:errors});
};

async function decode(buffer, mime) {
  try { return await createImageBitmap(new Blob([buffer], {type:mime||'image/jpeg'})); }
  catch(e) { try { return await createImageBitmap(new Blob([buffer])); } catch(e2) { throw new Error('Decode failed: '+e.message); } }
}
async function render(bm, w, h, fmt, quality) {
  var mime = MIME_MAP[fmt]||'image/jpeg';
  var c = new OffscreenCanvas(w,h), ctx = c.getContext('2d');
  if (mime==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);}
  ctx.drawImage(bm,0,0,w,h);
  if(typeof bm.close==='function')bm.close();
  return c.convertToBlob(mime==='image/png'?{type:mime}:{type:mime,quality:quality});
}

async function processTask(task, type, opts) {
  var buf = task.buffer, mime = task.mime||'image/jpeg';
  if (type==='compress') return compressTask(buf,mime,opts);
  if (type==='compress-target'||type==='target') return compressTargetTask(buf,mime,opts);
  if (type==='resize') return resizeTask(buf,mime,opts);
  if (type==='convert') return convertTask(buf,mime,opts);
  if (type==='watermark') return watermarkTask(buf,mime,opts);
  if (type==='rotate') return rotateTask(buf,mime,opts);
  if (type==='flip') return flipTask(buf,mime,opts);
  throw new Error('Unknown task type: '+type);
}

async function compressTask(buf,mime,o){var bm=await decode(buf,mime),w=bm.width,h=bm.height,fmt=o.format||'jpeg',q=Math.max(0.01,Math.min(1,(o.quality||80)/100));return render(bm,w,h,fmt,q);}

async function compressTargetTask(buf,mime,o){
  var targetBytes=(o.targetKB||100)*1024,fmt=o.format||'jpeg',minQ=Math.max(0.03,(o.minQuality||10)/100);
  var bm=await decode(buf,mime),w=bm.width,h=bm.height;
  var hi=await render(bm,w,h,fmt,0.95);
  if(hi.size<=targetBytes){bm.close();return hi;}
  var lo=minQ,hiQ=0.95,best=null;
  for(var i=0;i<12;i++){var mid=(lo+hiQ)/2,p=await render(bm,w,h,fmt,mid);if(p.size<=targetBytes){best=p;lo=mid;}else hiQ=mid;if(hiQ-lo<0.005)break;}
  bm.close();
  if(best)return best;
  var fbm=await decode(buf,mime),fb=await render(fbm,Math.round(w*0.5),Math.round(h*0.5),fmt,minQ);fbm.close();return fb;
}

async function resizeTask(buf,mime,o){
  var bm=await decode(buf,mime),w=bm.width,h=bm.height,fmt=o.format||'jpeg',q=Math.max(0.01,Math.min(1,(o.quality||90)/100));
  var dw=w,dh=h,pct=parseFloat(o.percent)||0,tw=parseInt(o.width)||0,th=parseInt(o.height)||0;
  if(pct>0){dw=Math.max(1,Math.round(w*pct/100));dh=Math.max(1,Math.round(h*pct/100));}
  else if(tw>0&&th>0){dw=tw;dh=th;}
  else if(tw>0){dw=tw;dh=Math.max(1,Math.round(tw/(w/h)));}
  else if(th>0){dh=th;dw=Math.max(1,Math.round(th*(w/h)));}
  return render(bm,dw,dh,fmt,q);
}

async function convertTask(buf,mime,o){
  var fmt=(o.targetFormat||'jpeg').replace('jpg','jpeg'),bm=await decode(buf,mime),w=bm.width,h=bm.height;
  var outMime=MIME_MAP[fmt]||'image/jpeg',q=Math.max(0.01,Math.min(1,(o.quality||90)/100));
  var c=new OffscreenCanvas(w,h),ctx=c.getContext('2d');
  if(outMime==='image/jpeg'){ctx.fillStyle=o.background||'#ffffff';ctx.fillRect(0,0,w,h);}
  ctx.drawImage(bm,0,0);bm.close();
  return c.convertToBlob(outMime==='image/png'?{type:outMime}:{type:outMime,quality:q});
}

async function watermarkTask(buf,mime,o){
  var bm=await decode(buf,mime),w=bm.width,h=bm.height;
  var c=new OffscreenCanvas(w,h),ctx=c.getContext('2d');
  ctx.drawImage(bm,0,0);bm.close();
  var text=o.text||'© Pixaroid',fs=parseInt(o.fontSize)||40,color=o.color||'#ffffff',opacity=parseFloat(o.opacity)||50,pos=o.position||'bottom-right';
  ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,opacity/100));ctx.font='bold '+fs+'px Arial,sans-serif';ctx.fillStyle=color;ctx.shadowColor='rgba(0,0,0,0.4)';ctx.shadowBlur=4;
  var tw=ctx.measureText(text).width,pad=20,tx,ty;
  switch(pos){case 'top-left':tx=pad;ty=pad+fs;break;case 'top-right':tx=w-tw-pad;ty=pad+fs;break;case 'bottom-left':tx=pad;ty=h-pad;break;case 'center':tx=(w-tw)/2;ty=(h+fs)/2;break;default:tx=w-tw-pad;ty=h-pad;}
  ctx.fillText(text,tx,ty);ctx.restore();
  var fmt=o.format||'jpeg',outMime=MIME_MAP[fmt]||'image/jpeg',q=(o.quality||90)/100;
  return c.convertToBlob(outMime==='image/png'?{type:outMime}:{type:outMime,quality:q});
}

async function rotateTask(buf,mime,o){
  var bm=await decode(buf,mime),angle=(o.angle||90)*Math.PI/180;
  var sinA=Math.abs(Math.sin(angle)),cosA=Math.abs(Math.cos(angle)),dw=Math.round(bm.width*cosA+bm.height*sinA),dh=Math.round(bm.width*sinA+bm.height*cosA);
  var c=new OffscreenCanvas(dw,dh),ctx=c.getContext('2d');
  ctx.translate(dw/2,dh/2);ctx.rotate(angle);ctx.drawImage(bm,-bm.width/2,-bm.height/2);bm.close();
  var fmt=o.format||'jpeg',outMime=MIME_MAP[fmt]||'image/jpeg',q=(o.quality||90)/100;
  return c.convertToBlob(outMime==='image/png'?{type:outMime}:{type:outMime,quality:q});
}

async function flipTask(buf,mime,o){
  var bm=await decode(buf,mime),h=o.horizontal||false,v=o.vertical||false;
  var c=new OffscreenCanvas(bm.width,bm.height),ctx=c.getContext('2d');
  ctx.translate(h?bm.width:0,v?bm.height:0);ctx.scale(h?-1:1,v?-1:1);ctx.drawImage(bm,0,0);bm.close();
  var fmt=o.format||'jpeg',outMime=MIME_MAP[fmt]||'image/jpeg',q=(o.quality||90)/100;
  return c.convertToBlob(outMime==='image/png'?{type:outMime}:{type:outMime,quality:q});
}
