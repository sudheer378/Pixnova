/* Pixaroid — ai.worker.js v5 */
'use strict';

self.onmessage=async function(e){
  var d=e.data,jid=d.jobId;
  try{
    var r;
    if     (d.op==='ai-bg-remove')r=await bgRemove(d);
    else if(d.op==='ai-upscale')  r=await upscale(d);
    else if(d.op==='ai-enhance')  r=await enhance(d);
    else if(d.op==='ai-sharpen')  r=await aiSharpen(d);
    else if(d.op==='ai-colorize') r=await colorize(d);
    else if(d.op==='ai-ocr')      r=await ocr(d);
    else throw new Error('Unknown op: '+d.op);
    if(r.isText){self.postMessage({jobId:jid,text:r.text,confidence:r.conf,format:'txt',buffer:null,mime:'text/plain',width:r.w,height:r.h});return;}
    var ab=blobBuf(r.blob);
    if(ab&&ab.byteLength>0)self.postMessage({jobId:jid,buffer:ab,mime:r.blob.type,width:r.w,height:r.h,format:r.fmt});
    else self.postMessage({jobId:jid,blob:r.blob,width:r.w,height:r.h,format:r.fmt});
  }catch(err){self.postMessage({jobId:d.jobId,error:String(err.message||err)});}
};

function blobBuf(b){try{return new FileReaderSync().readAsArrayBuffer(b);}catch(e){return null;}}
function prog(p){self.postMessage({type:'progress',percent:Math.round(p)});}
async function getBm(buf,mime){
  if(mime==='image/heic'||mime==='image/heif')throw new Error('HEIC not supported here — use HEIC→JPG tool first.');
  for(var t of[mime,'image/jpeg','image/png','']){
    try{return await createImageBitmap(t?new Blob([buf],{type:t}):new Blob([buf]));}catch(e){}
  }
  throw new Error('Cannot decode image for AI processing');
}

async function bgRemove(d){
  var bm=await getBm(d.buffer,d.mime);prog(15);
  var w=bm.width,h=bm.height,c=new OffscreenCanvas(w,h),ctx=c.getContext('2d');
  ctx.drawImage(bm,0,0);bm.close();
  var id=ctx.getImageData(0,0,w,h),p=id.data;prog(30);
  var bgR=p[0],bgG=p[1],bgB=p[2];
  for(var i=0;i<p.length;i+=4){
    var dr=p[i]-bgR,dg=p[i+1]-bgG,db=p[i+2]-bgB,dist=Math.sqrt(dr*dr+dg*dg+db*db);
    if(dist<40)p[i+3]=0;else if(dist<80)p[i+3]=Math.round((dist-40)/40*255);
  }
  ctx.putImageData(id,0,0);prog(80);
  if(d.bgColor&&d.bgColor!=='transparent'){
    var bg=new OffscreenCanvas(w,h),bctx=bg.getContext('2d');
    bctx.fillStyle=d.bgColor;bctx.fillRect(0,0,w,h);bctx.drawImage(c,0,0);
    var blob=await bg.convertToBlob({type:'image/png'});prog(100);return{blob,w,h,fmt:'png'};
  }
  var blob=await c.convertToBlob({type:'image/png'});prog(100);return{blob,w,h,fmt:'png'};
}

async function upscale(d){
  var bm=await getBm(d.buffer,d.mime);prog(20);
  var factor=parseInt(d.scale)||2;if(factor!==2&&factor!==4)factor=2;
  var dw=bm.width*factor,dh=bm.height*factor;
  var c=new OffscreenCanvas(dw,dh),ctx=c.getContext('2d');
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(bm,0,0,dw,dh);bm.close();prog(60);
  var bl=new OffscreenCanvas(dw,dh),bctx=bl.getContext('2d');
  bctx.filter='blur(1px)';bctx.drawImage(c,0,0);bctx.filter='none';
  var orig=c.getContext('2d').getImageData(0,0,dw,dh),blurD=bl.getContext('2d').getImageData(0,0,dw,dh);
  var od=orig.data,bd=blurD.data;
  for(var i=0;i<od.length;i+=4){for(var ch=0;ch<3;ch++){var diff=od[i+ch]-bd[i+ch];if(Math.abs(diff)>3)od[i+ch]=Math.max(0,Math.min(255,Math.round(od[i+ch]+.8*diff)));}}
  c.getContext('2d').putImageData(orig,0,0);prog(90);
  var blob=await c.convertToBlob({type:'image/jpeg',quality:.95});prog(100);return{blob,w:dw,h:dh,fmt:'jpeg'};
}

async function enhance(d){
  var bm=await getBm(d.buffer,d.mime);prog(20);
  var w=bm.width,h=bm.height,mode=d.mode||'auto',str=(parseFloat(d.strength)||70)/100;
  var src=new OffscreenCanvas(w,h);src.getContext('2d').drawImage(bm,0,0);bm.close();
  var id=src.getContext('2d').getImageData(0,0,w,h),p=id.data,total=0;
  for(var i=0;i<p.length;i+=4)total+=.2126*p[i]+.7152*p[i+1]+.0722*p[i+2];
  var avg=total/(w*h);prog(40);
  var bAdj=avg<80?1+str*.20:avg<120?1+str*.08:avg>180?1-str*.05:1+str*.03;
  var FL={auto:'brightness('+bAdj.toFixed(3)+') contrast('+(1+str*.12).toFixed(3)+') saturate('+(1+str*.18).toFixed(3)+')',portrait:'brightness('+(1+str*.07)+') contrast('+(1+str*.10)+') saturate('+(1+str*.15)+')',landscape:'brightness('+(1+str*.05)+') contrast('+(1+str*.14)+') saturate('+(1+str*.28)+')',nightshot:'brightness('+(1+str*.35)+') contrast('+(1-str*.05)+') saturate('+(1+str*.08)+')',product:'brightness('+(1+str*.06)+') contrast('+(1+str*.18)+') saturate('+(1-str*.08)+')'};
  var dst=new OffscreenCanvas(w,h),ctx=dst.getContext('2d');
  ctx.filter=FL[mode]||FL.auto;ctx.drawImage(src,0,0);ctx.filter='none';prog(85);
  var blob=await dst.convertToBlob({type:'image/jpeg',quality:.93});prog(100);return{blob,w,h,fmt:'jpeg'};
}

async function aiSharpen(d){
  var bm=await getBm(d.buffer,d.mime);prog(20);
  var w=bm.width,h=bm.height,amt=(parseFloat(d.amount)||70)/100*2.5,rad=parseFloat(d.radius)||1.5;
  var c=new OffscreenCanvas(w,h);c.getContext('2d').drawImage(bm,0,0);bm.close();prog(30);
  function unsharp(src,s,r){
    var bl=new OffscreenCanvas(w,h),bctx=bl.getContext('2d');bctx.filter='blur('+Math.max(.3,r)+'px)';bctx.drawImage(src,0,0);bctx.filter='none';
    var orig=src.getContext('2d').getImageData(0,0,w,h),blur=bl.getContext('2d').getImageData(0,0,w,h);
    var od=orig.data,bd=blur.data;for(var i=0;i<od.length;i+=4){for(var ch=0;ch<3;ch++){var diff=od[i+ch]-bd[i+ch];if(Math.abs(diff)>2)od[i+ch]=Math.max(0,Math.min(255,Math.round(od[i+ch]+s*diff)));}}
    src.getContext('2d').putImageData(orig,0,0);return src;
  }
  c=unsharp(c,amt,rad);prog(65);if(amt>.8)c=unsharp(c,amt*.4,rad*.5);prog(88);
  var blob=await c.convertToBlob({type:'image/jpeg',quality:.94});prog(100);return{blob,w,h,fmt:'jpeg'};
}

async function colorize(d){
  var bm=await getBm(d.buffer,d.mime);prog(20);
  var w=bm.width,h=bm.height,style=d.style||'natural',intensity=(parseFloat(d.intensity)||80)/100;
  var c=new OffscreenCanvas(w,h),ctx=c.getContext('2d');ctx.drawImage(bm,0,0);bm.close();
  var id=ctx.getImageData(0,0,w,h),p=id.data;
  for(var i=0;i<p.length;i+=4){var g=Math.round(.2126*p[i]+.7152*p[i+1]+.0722*p[i+2]);p[i]=p[i+1]=p[i+2]=g;}
  ctx.putImageData(id,0,0);prog(40);
  var ST={natural:'sepia('+(intensity*.35)+') saturate('+(1+intensity*.9)+')',vivid:'sepia('+(intensity*.5)+') saturate('+(1+intensity*2.2)+')',vintage:'sepia('+(intensity*.85)+') contrast('+(1+intensity*.08)+')',warm:'sepia('+(intensity*.45)+') saturate('+(1+intensity*.7)+') hue-rotate(-15deg)',cool:'sepia('+(intensity*.2)+') saturate('+(1+intensity*.9)+') hue-rotate(200deg)',dramatic:'sepia('+(intensity*.6)+') contrast('+(1+intensity*.3)+') saturate('+(1+intensity*1.2)+')'};
  var dst=new OffscreenCanvas(w,h),dctx=dst.getContext('2d');
  dctx.filter=ST[style]||ST.natural;dctx.drawImage(c,0,0);dctx.filter='none';prog(85);
  var blob=await dst.convertToBlob({type:'image/jpeg',quality:.93});prog(100);return{blob,w,h,fmt:'jpeg'};
}

async function ocr(d){
  var bm=await getBm(d.buffer,d.mime);prog(10);
  var w=bm.width,h=bm.height,c=new OffscreenCanvas(w,h),ctx=c.getContext('2d');
  if(d.preprocess!==false){ctx.filter='contrast(1.5) brightness(1.05)';}
  ctx.drawImage(bm,0,0);ctx.filter='none';bm.close();prog(20);
  var text='',conf=0;
  try{
    importScripts('https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js');
    prog(35);
    var blob=await c.convertToBlob({type:'image/png'}),url=URL.createObjectURL(blob);
    var worker=await Tesseract.createWorker(d.language||'eng',1,{logger:function(m){if(m.progress)prog(35+Math.round(m.progress*55));}});
    var res=await worker.recognize(url);await worker.terminate();URL.revokeObjectURL(url);
    text=(res.data.text||'').trim();conf=Math.round(res.data.confidence||0);
  }catch(err){text='[OCR unavailable: '+String(err.message||err)+']';}
  prog(100);return{isText:true,text,conf,w,h};
}
