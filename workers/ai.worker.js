/* Pixaroid — ai.worker.js — classic script */
'use strict';

self.onmessage = async function(e) {
  var d = e.data, jobId = d.jobId, op = d.op;
  try {
    var r;
    if      (op==='ai-bg-remove') r=await bgRemove(d);
    else if (op==='ai-upscale')   r=await upscale(d);
    else if (op==='ai-enhance')   r=await enhance(d);
    else if (op==='ai-sharpen')   r=await aiSharpen(d);
    else if (op==='ai-colorize')  r=await colorize(d);
    else if (op==='ai-ocr')       r=await ocr(d);
    else throw new Error('Unknown AI op: '+op);
    var _b=r.blob,_ab=_b?await _b.arrayBuffer():null;self.postMessage({jobId:jobId:jobId,buffer:_ab,mime:_b?_b.type:'text/plain',width:r.w,height:r.h,format:r.fmt,text:r.text,confidence:r.conf});
  } catch(err) {
    self.postMessage({jobId:jobId, error:String(err.message||err)});
  }
};

function prog(p){self.postMessage({type:'progress',percent:Math.round(p)});}

async function getBitmap(buf,mime){
  if(mime==='image/heic'||mime==='image/heif') throw new Error('HEIC not supported in AI tools. Use HEIC→JPG first.');
  var tries=[mime,'image/jpeg','image/png',''];
  for(var i=0;i<tries.length;i++){
    try{return await createImageBitmap(tries[i]?new Blob([buf],{type:tries[i]}):new Blob([buf]));}catch(e){}
  }
  throw new Error('Cannot decode image for AI processing');
}

/* Background removal — smart colour-distance mask */
async function bgRemove(d){
  var bm=await getBitmap(d.buffer,d.mime); prog(15);
  var w=bm.width,h=bm.height;
  var c=new OffscreenCanvas(w,h),ctx=c.getContext('2d');
  ctx.drawImage(bm,0,0); bm.close();
  var id=ctx.getImageData(0,0,w,h),p=id.data; prog(30);
  // Sample corner bg colors
  var bgR=(p[0]+p[4])/2, bgG=(p[1]+p[5])/2, bgB=(p[2]+p[6])/2;
  for(var i=0;i<p.length;i+=4){
    var dr=p[i]-bgR,dg=p[i+1]-bgG,db=p[i+2]-bgB;
    var dist=Math.sqrt(dr*dr+dg*dg+db*db);
    if(dist<40)p[i+3]=0;
    else if(dist<80)p[i+3]=Math.round((dist-40)/40*255);
  }
  ctx.putImageData(id,0,0); prog(80);
  if(d.bgColor&&d.bgColor!=='transparent'){
    var bg=new OffscreenCanvas(w,h),bctx=bg.getContext('2d');
    bctx.fillStyle=d.bgColor; bctx.fillRect(0,0,w,h); bctx.drawImage(c,0,0);
    var blob=await bg.convertToBlob({type:'image/png'}); prog(100);
    return {blob:blob,w:w,h:h,fmt:'png'};
  }
  var blob=await c.convertToBlob({type:'image/png'}); prog(100);
  return {blob:blob,w:w,h:h,fmt:'png'};
}

/* Upscale — high-quality bicubic with optional sharpening pass */
async function upscale(d){
  var bm=await getBitmap(d.buffer,d.mime); prog(20);
  var factor=parseInt(d.scale)||2; if(factor!==2&&factor!==4)factor=2;
  var dw=bm.width*factor,dh=bm.height*factor;
  var c=new OffscreenCanvas(dw,dh),ctx=c.getContext('2d');
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
  ctx.drawImage(bm,0,0,dw,dh); bm.close(); prog(60);
  // Unsharp mask pass
  var blurred=new OffscreenCanvas(dw,dh),bctx=blurred.getContext('2d');
  bctx.filter='blur(1px)'; bctx.drawImage(c,0,0); bctx.filter='none';
  var orig=c.getContext('2d').getImageData(0,0,dw,dh);
  var bl=blurred.getContext('2d').getImageData(0,0,dw,dh);
  var od=orig.data,bd=bl.data;
  for(var i=0;i<od.length;i+=4){for(var ch=0;ch<3;ch++){var diff=od[i+ch]-bd[i+ch];if(Math.abs(diff)>3)od[i+ch]=Math.max(0,Math.min(255,Math.round(od[i+ch]+0.8*diff)));}}
  c.getContext('2d').putImageData(orig,0,0); prog(90);
  var blob=await c.convertToBlob({type:'image/jpeg',quality:0.95}); prog(100);
  return {blob:blob,w:dw,h:dh,fmt:'jpeg'};
}

/* Smart auto-enhance */
async function enhance(d){
  var bm=await getBitmap(d.buffer,d.mime); prog(20);
  var w=bm.width,h=bm.height,mode=d.mode||'auto',str=(parseFloat(d.strength)||70)/100;
  var src=new OffscreenCanvas(w,h); src.getContext('2d').drawImage(bm,0,0); bm.close();
  var id=src.getContext('2d').getImageData(0,0,w,h),p=id.data,total=0;
  for(var i=0;i<p.length;i+=4)total+=0.2126*p[i]+0.7152*p[i+1]+0.0722*p[i+2];
  var avg=total/(w*h); prog(40);
  var bAdj=avg<80?1+str*0.20:avg<120?1+str*0.08:avg>180?1-str*0.05:1+str*0.03;
  var filters={
    auto:'brightness('+bAdj.toFixed(3)+') contrast('+(1+str*0.12).toFixed(3)+') saturate('+(1+str*0.18).toFixed(3)+')',
    portrait:'brightness('+(1+str*0.07)+') contrast('+(1+str*0.10)+') saturate('+(1+str*0.15)+')',
    landscape:'brightness('+(1+str*0.05)+') contrast('+(1+str*0.14)+') saturate('+(1+str*0.28)+')',
    nightshot:'brightness('+(1+str*0.35)+') contrast('+(1-str*0.05)+') saturate('+(1+str*0.08)+')',
    product:'brightness('+(1+str*0.06)+') contrast('+(1+str*0.18)+') saturate('+(1-str*0.08)+')',
  };
  var dst=new OffscreenCanvas(w,h),ctx=dst.getContext('2d');
  ctx.filter=filters[mode]||filters.auto; ctx.drawImage(src,0,0); ctx.filter='none'; prog(85);
  var blob=await dst.convertToBlob({type:'image/jpeg',quality:0.93}); prog(100);
  return {blob:blob,w:w,h:h,fmt:'jpeg'};
}

/* Multi-pass unsharp mask sharpen */
async function aiSharpen(d){
  var bm=await getBitmap(d.buffer,d.mime); prog(20);
  var w=bm.width,h=bm.height,amt=(parseFloat(d.amount)||70)/100*2.5,rad=parseFloat(d.radius)||1.5;
  var c=new OffscreenCanvas(w,h); c.getContext('2d').drawImage(bm,0,0); bm.close(); prog(30);
  function unsharp(src,s,r){
    var bl=new OffscreenCanvas(w,h),bctx=bl.getContext('2d');
    bctx.filter='blur('+Math.max(0.3,r)+'px)'; bctx.drawImage(src,0,0); bctx.filter='none';
    var orig=src.getContext('2d').getImageData(0,0,w,h),blur=bl.getContext('2d').getImageData(0,0,w,h);
    var od=orig.data,bd=blur.data;
    for(var i=0;i<od.length;i+=4){for(var ch=0;ch<3;ch++){var diff=od[i+ch]-bd[i+ch];if(Math.abs(diff)>2)od[i+ch]=Math.max(0,Math.min(255,Math.round(od[i+ch]+s*diff)));}}
    src.getContext('2d').putImageData(orig,0,0); return src;
  }
  c=unsharp(c,amt,rad); prog(60);
  if(amt>0.8)c=unsharp(c,amt*0.4,rad*0.5); prog(85);
  var blob=await c.convertToBlob({type:'image/jpeg',quality:0.94}); prog(100);
  return {blob:blob,w:w,h:h,fmt:'jpeg'};
}

/* Colorize with style presets */
async function colorize(d){
  var bm=await getBitmap(d.buffer,d.mime); prog(20);
  var w=bm.width,h=bm.height,style=d.style||'natural',intensity=(parseFloat(d.intensity)||80)/100;
  var c=new OffscreenCanvas(w,h),ctx=c.getContext('2d');
  ctx.drawImage(bm,0,0); bm.close();
  var id=ctx.getImageData(0,0,w,h),p=id.data;
  for(var i=0;i<p.length;i+=4){var g=Math.round(0.2126*p[i]+0.7152*p[i+1]+0.0722*p[i+2]);p[i]=p[i+1]=p[i+2]=g;}
  ctx.putImageData(id,0,0); prog(40);
  var STYLES={
    natural:'sepia('+(intensity*0.35)+') saturate('+(1+intensity*0.9)+')',
    vivid:'sepia('+(intensity*0.5)+') saturate('+(1+intensity*2.2)+')',
    vintage:'sepia('+(intensity*0.85)+') contrast('+(1+intensity*0.08)+')',
    warm:'sepia('+(intensity*0.45)+') saturate('+(1+intensity*0.7)+') hue-rotate(-15deg)',
    cool:'sepia('+(intensity*0.2)+') saturate('+(1+intensity*0.9)+') hue-rotate(200deg)',
    dramatic:'sepia('+(intensity*0.6)+') contrast('+(1+intensity*0.3)+') saturate('+(1+intensity*1.2)+')',
  };
  var dst=new OffscreenCanvas(w,h),dctx=dst.getContext('2d');
  dctx.filter=STYLES[style]||STYLES.natural; dctx.drawImage(c,0,0); dctx.filter='none'; prog(85);
  var blob=await dst.convertToBlob({type:'image/jpeg',quality:0.93}); prog(100);
  return {blob:blob,w:w,h:h,fmt:'jpeg'};
}

/* OCR using Tesseract.js */
async function ocr(d){
  var bm=await getBitmap(d.buffer,d.mime); prog(10);
  var w=bm.width,h=bm.height;
  var c=new OffscreenCanvas(w,h),ctx=c.getContext('2d');
  if(d.preprocess!==false){ctx.filter='contrast(1.5) brightness(1.05)';}
  ctx.drawImage(bm,0,0); ctx.filter='none'; bm.close(); prog(20);
  var text='',conf=0;
  try{
    importScripts('https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js');
    prog(35);
    var blob=await c.convertToBlob({type:'image/png'});
    var url=URL.createObjectURL(blob);
    var worker=await Tesseract.createWorker(d.language||'eng',1,{logger:function(m){if(m.progress)prog(35+Math.round(m.progress*55));}});
    var res=await worker.recognize(url);
    await worker.terminate();
    URL.revokeObjectURL(url);
    text=(res.data.text||'').trim();
    conf=Math.round(res.data.confidence||0);
  }catch(e){text='[OCR unavailable: '+e.message+']';}
  prog(100);
  var outBlob=new Blob([text],{type:'text/plain'});
  return {blob:outBlob,text:text,conf:conf,fmt:'txt',w:w,h:h};
}
