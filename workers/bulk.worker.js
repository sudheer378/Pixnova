/* Pixaroid — bulk.worker.js — classic script */
'use strict';
var MIME={jpeg:'image/jpeg',jpg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif'};

self.onmessage=async function(e){
  var d=e.data,jobId=d.jobId,tasks=d.tasks||[],type=d.taskType||'compress',opts=d.options||{};
  var total=tasks.length,results=[],errors=[];
  for(var i=0;i<total;i++){
    var t=tasks[i];
    try{
      var blob=await process(t,type,opts);
      results.push({filename:t.filename,blob:blob});
      self.postMessage({jobId:jobId,type:'progress',current:i+1,total:total,filename:t.filename});
    }catch(err){
      errors.push({filename:t.filename,error:String(err.message||err)});
      self.postMessage({jobId:jobId,type:'progress',current:i+1,total:total,filename:t.filename,error:String(err.message||err)});
    }
  }
  self.postMessage({jobId:jobId,type:'done',total:total,results:results,errors:errors});
};

async function getBitmap(buf,mime){
  try{return await createImageBitmap(new Blob([buf],{type:mime||'image/jpeg'}));}
  catch(e){try{return await createImageBitmap(new Blob([buf]));}catch(e2){throw new Error('Decode failed');}}
}
async function draw(bm,w,h,fmt,q){
  var mime=MIME[fmt]||'image/jpeg';
  var c=new OffscreenCanvas(w,h),ctx=c.getContext('2d');
  if(mime==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);}
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(bm,0,0,w,h);
  if(typeof bm.close==='function')bm.close();
  return c.convertToBlob((mime==='image/png'||mime==='image/gif')?{type:mime}:{type:mime,quality:q/100});
}

async function process(t,type,o){
  var buf=t.buffer,mime=t.mime||'image/jpeg';
  if(type==='compress'){
    var bm=await getBitmap(buf,mime);
    return draw(bm,bm.width,bm.height,o.format||'jpeg',Math.max(1,Math.min(100,parseFloat(o.quality)||80)));
  }
  if(type==='resize'){
    var bm=await getBitmap(buf,mime),sw=bm.width,sh=bm.height,fmt=o.format||'jpeg',q=parseFloat(o.quality)||90;
    var tw=parseInt(o.width)||0,th=parseInt(o.height)||0,pct=parseFloat(o.percent)||0,dw=sw,dh=sh;
    if(pct>0){dw=Math.max(1,Math.round(sw*pct/100));dh=Math.max(1,Math.round(sh*pct/100));}
    else if(tw>0&&th>0){dw=tw;dh=th;}
    else if(tw>0){dw=tw;dh=Math.max(1,Math.round(tw/(sw/sh)));}
    else if(th>0){dh=th;dw=Math.max(1,Math.round(th*(sw/sh)));}
    return draw(bm,dw,dh,fmt,q);
  }
  if(type==='convert'){
    var fmt=(o.targetFormat||'jpeg').replace('jpg','jpeg');
    var mime2=MIME[fmt]||'image/jpeg',q=parseFloat(o.quality)||90;
    var bm=await getBitmap(buf,mime);
    var c=new OffscreenCanvas(bm.width,bm.height),ctx=c.getContext('2d');
    if(mime2==='image/jpeg'){ctx.fillStyle=o.background||'#ffffff';ctx.fillRect(0,0,bm.width,bm.height);}
    ctx.drawImage(bm,0,0);bm.close();
    return c.convertToBlob((mime2==='image/png'||mime2==='image/gif')?{type:mime2}:{type:mime2,quality:q/100});
  }
  if(type==='watermark'){
    var bm=await getBitmap(buf,mime),w=bm.width,h=bm.height,fmt=o.format||'jpeg',q=parseFloat(o.quality)||90;
    var c=new OffscreenCanvas(w,h),ctx=c.getContext('2d');
    ctx.drawImage(bm,0,0);bm.close();
    var text=o.text||'© Pixaroid',fs=parseInt(o.fontSize)||40,col=o.color||'#ffffff',opa=parseFloat(o.opacity)||50,pos=o.position||'bottom-right';
    ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,opa/100));ctx.font='bold '+fs+'px Arial,sans-serif';ctx.fillStyle=col;ctx.shadowColor='rgba(0,0,0,0.4)';ctx.shadowBlur=4;
    var tw=ctx.measureText(text).width,pad=20,tx,ty;
    switch(pos){case'top-left':tx=pad;ty=pad+fs;break;case'top-right':tx=w-tw-pad;ty=pad+fs;break;case'center':tx=(w-tw)/2;ty=(h+fs)/2;break;default:tx=w-tw-pad;ty=h-pad;}
    ctx.fillText(text,tx,ty);ctx.restore();
    var mime3=MIME[fmt]||'image/jpeg';
    return c.convertToBlob((mime3==='image/png'||mime3==='image/gif')?{type:mime3}:{type:mime3,quality:q/100});
  }
  // fallback compress
  var bm=await getBitmap(buf,mime);
  return draw(bm,bm.width,bm.height,'jpeg',80);
}
