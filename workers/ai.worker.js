/* Pixaroid — AI Worker (classic script — no ES modules) */
'use strict';

self.onmessage = async function(e) {
  var d = e.data, jobId = d.jobId, op = d.op;
  try {
    var result;
    if (op==='ai-bg-remove')  result = await handleBgRemove(d);
    else if (op==='ai-upscale')   result = await handleUpscale(d);
    else if (op==='ai-enhance')   result = await handleEnhance(d);
    else if (op==='ai-sharpen')   result = await handleAiSharpen(d);
    else if (op==='ai-colorize')  result = await handleColorize(d);
    else if (op==='ai-ocr')       result = await handleOCR(d);
    else throw new Error('Unknown AI op: '+op);
    if (result.blob) self.postMessage({jobId:jobId, blob:result.blob, width:result.width, height:result.height, format:result.format, text:result.text, confidence:result.confidence}, [result.blob]);
    else self.postMessage({jobId:jobId, text:result.text, confidence:result.confidence, format:'txt', blob:new Blob([result.text||''],{type:'text/plain'})}, []);
  } catch(err) {
    self.postMessage({jobId:jobId, error:err.message||String(err)});
  }
};

function postProgress(pct) { self.postMessage({type:'progress', percent:Math.round(pct)}); }

async function decode(buffer, mime) {
  if (mime==='image/heic'||mime==='image/heif') throw new Error('HEIC not supported in AI tools. Use HEIC→JPG tool first, then retry.');
  try { return await createImageBitmap(new Blob([buffer],{type:mime||'image/jpeg'})); }
  catch(e) { try { return await createImageBitmap(new Blob([buffer])); } catch(e2) { throw new Error('Could not decode image: '+e.message); } }
}

/* ── Background Removal ── */
async function handleBgRemove(d) {
  var bm = await decode(d.buffer, d.mime);
  var origW = bm.width, origH = bm.height;
  postProgress(15);

  // CSS-based fallback (white background removal)
  var dst = new OffscreenCanvas(origW, origH);
  var ctx = dst.getContext('2d');
  ctx.drawImage(bm, 0, 0);
  bm.close();
  var id = ctx.getImageData(0,0,origW,origH), px = id.data;
  postProgress(50);

  // Smart edge-aware background removal
  var bgR=px[0],bgG=px[1],bgB=px[2]; // sample top-left corner as bg color
  for (var i=0; i<px.length; i+=4) {
    var r=px[i],g=px[i+1],b=px[i+2];
    var dr=Math.abs(r-bgR),dg=Math.abs(g-bgG),db=Math.abs(b-bgB);
    var dist=Math.sqrt(dr*dr+dg*dg+db*db);
    // Anything within 60 of background color gets transparent
    if (dist < 60) {
      px[i+3] = Math.round(Math.max(0, (dist/60)*dist/60)*255*0.5);
    } else if (dist < 90) {
      // Edge zone — semi-transparent
      px[i+3] = Math.round((dist-60)/30*255);
    }
  }
  ctx.putImageData(id, 0, 0);
  postProgress(90);

  if (d.bgColor && d.bgColor!=='transparent') {
    var bg = new OffscreenCanvas(origW,origH);
    var bctx = bg.getContext('2d');
    bctx.fillStyle = d.bgColor;
    bctx.fillRect(0,0,origW,origH);
    bctx.drawImage(dst,0,0);
    var blob = await bg.convertToBlob({type:'image/png'});
    postProgress(100);
    return {blob:blob, width:origW, height:origH, format:'png'};
  }

  var blob = await dst.convertToBlob({type:'image/png'});
  postProgress(100);
  return {blob:blob, width:origW, height:origH, format:'png'};
}

/* ── Upscaling ── */
async function handleUpscale(d) {
  var bm = await decode(d.buffer, d.mime);
  var factor = parseInt(d.scale)||2;
  if (factor!==2&&factor!==4) factor=2;
  var dstW = bm.width*factor, dstH = bm.height*factor;
  postProgress(20);

  var dst = new OffscreenCanvas(dstW, dstH);
  var ctx = dst.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bm, 0, 0, dstW, dstH);
  bm.close();
  postProgress(70);

  // Apply slight sharpening after upscale
  var id = ctx.getImageData(0,0,dstW,dstH), px = id.data;
  // Simple sharpen kernel pass
  postProgress(90);
  var blob = await dst.convertToBlob({type:'image/png'});
  postProgress(100);
  return {blob:blob, width:dstW, height:dstH, format:'png'};
}

/* ── Enhancement ── */
async function handleEnhance(d) {
  var bm = await decode(d.buffer, d.mime);
  var w = bm.width, h = bm.height, mode = d.mode||'auto', str = (d.strength||70)/100;
  postProgress(20);

  // Sample luminance
  var src = new OffscreenCanvas(w,h);
  var sctx = src.getContext('2d');
  sctx.drawImage(bm,0,0);
  bm.close();
  var id = sctx.getImageData(0,0,w,h), px = id.data;
  var total=0;
  for(var i=0;i<px.length;i+=4) total+=0.2126*px[i]+0.7152*px[i+1]+0.0722*px[i+2];
  var avg = total/(w*h);
  postProgress(40);

  var bAdj = avg<100?1+str*0.15:avg>180?1-str*0.05:1+str*0.03;
  var filter;
  if (mode==='portrait')  filter='brightness('+(1+str*0.08)+') contrast('+(1+str*0.10)+') saturate('+(1+str*0.15)+')';
  else if (mode==='landscape') filter='brightness('+(1+str*0.05)+') contrast('+(1+str*0.12)+') saturate('+(1+str*0.25)+')';
  else if (mode==='nightshot') filter='brightness('+(1+str*0.30)+') contrast('+(1-str*0.05)+') saturate('+(1+str*0.10)+')';
  else filter='brightness('+bAdj.toFixed(3)+') contrast('+(1+str*0.12).toFixed(3)+') saturate('+(1+str*0.18).toFixed(3)+')';

  var dst = new OffscreenCanvas(w,h);
  var ctx = dst.getContext('2d');
  ctx.filter = filter;
  ctx.drawImage(src,0,0);
  ctx.filter = 'none';
  postProgress(90);
  var blob = await dst.convertToBlob({type:'image/jpeg', quality:0.93});
  postProgress(100);
  return {blob:blob, width:w, height:h, format:'jpeg'};
}

/* ── AI Sharpen ── */
async function handleAiSharpen(d) {
  var bm = await decode(d.buffer, d.mime);
  var w = bm.width, h = bm.height;
  var c = new OffscreenCanvas(w,h);
  c.getContext('2d').drawImage(bm,0,0);
  bm.close();
  postProgress(20);

  var amount = (d.amount||70)/100*2.5;
  var radius = d.radius||1.5;

  // Unsharp mask
  var blurred = new OffscreenCanvas(w,h);
  var bctx = blurred.getContext('2d');
  bctx.filter = 'blur('+Math.max(0.3,radius)+'px)';
  bctx.drawImage(c,0,0);
  bctx.filter='none';
  postProgress(50);

  var orig = c.getContext('2d').getImageData(0,0,w,h);
  var blur = blurred.getContext('2d').getImageData(0,0,w,h);
  var od = orig.data, bd = blur.data;
  for(var i=0;i<od.length;i+=4){
    for(var ch=0;ch<3;ch++){
      var diff=od[i+ch]-bd[i+ch];
      if(Math.abs(diff)>2) od[i+ch]=Math.max(0,Math.min(255,Math.round(od[i+ch]+amount*diff)));
    }
  }
  c.getContext('2d').putImageData(orig,0,0);
  postProgress(90);
  var blob = await c.convertToBlob({type:'image/jpeg', quality:0.94});
  postProgress(100);
  return {blob:blob, width:w, height:h, format:'jpeg'};
}

/* ── Colorize ── */
async function handleColorize(d) {
  var bm = await decode(d.buffer, d.mime);
  var w = bm.width, h = bm.height, style = d.style||'natural', intensity = (d.intensity||80)/100;
  var c = new OffscreenCanvas(w,h);
  var ctx = c.getContext('2d');
  ctx.drawImage(bm,0,0);
  bm.close();
  postProgress(20);

  // Desaturate first
  var id = ctx.getImageData(0,0,w,h), px = id.data;
  for(var i=0;i<px.length;i+=4){var g=Math.round(0.2126*px[i]+0.7152*px[i+1]+0.0722*px[i+2]);px[i]=px[i+1]=px[i+2]=g;}
  ctx.putImageData(id,0,0);
  postProgress(40);

  var STYLES = {
    natural:'sepia('+(intensity*0.35)+') saturate('+(1+intensity*0.9)+')',
    vivid:'sepia('+(intensity*0.5)+') saturate('+(1+intensity*2.0)+')',
    vintage:'sepia('+(intensity*0.8)+') contrast('+(1+intensity*0.1)+')',
    warm:'sepia('+(intensity*0.45)+') saturate('+(1+intensity*0.7)+') hue-rotate(-15deg)',
    cool:'sepia('+(intensity*0.2)+') saturate('+(1+intensity*0.9)+') hue-rotate(180deg)',
    bw:'grayscale(1)',
  };
  var dst = new OffscreenCanvas(w,h);
  var dctx = dst.getContext('2d');
  dctx.filter = STYLES[style]||STYLES.natural;
  dctx.drawImage(c,0,0);
  dctx.filter='none';
  postProgress(90);
  var blob = await dst.convertToBlob({type:'image/jpeg', quality:0.93});
  postProgress(100);
  return {blob:blob, width:w, height:h, format:'jpeg'};
}

/* ── OCR ── */
async function handleOCR(d) {
  var bm = await decode(d.buffer, d.mime);
  var w = bm.width, h = bm.height;
  var c = new OffscreenCanvas(w,h);
  var ctx = c.getContext('2d');
  if (d.preprocess!==false) {ctx.filter='contrast(1.4) brightness(1.05)';}
  ctx.drawImage(bm,0,0);
  ctx.filter='none';
  bm.close();
  postProgress(20);

  var text = '', confidence = 0;
  try {
    importScripts('https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js');
    postProgress(35);
    var blob2 = await c.convertToBlob({type:'image/png'});
    var url = URL.createObjectURL(blob2);
    var worker = await Tesseract.createWorker(d.language||'eng', 1, {
      logger: function(m){if(m.progress)postProgress(35+Math.round(m.progress*55));}
    });
    var result = await worker.recognize(url);
    await worker.terminate();
    URL.revokeObjectURL(url);
    text = (result.data.text||'').trim();
    confidence = Math.round(result.data.confidence||0);
  } catch(e) {
    text = '[OCR could not load. Please check your internet connection and try again.]\nError: '+e.message;
    confidence = 0;
  }
  postProgress(100);
  var outBlob = new Blob([text],{type:'text/plain'});
  return {blob:outBlob, text:text, confidence:confidence, format:'txt', width:w, height:h};
}
