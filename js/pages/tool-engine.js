/* ═══════════════════════════════════════════════════════════
   PIXAROID TOOL — INLINE PROCESSING ENGINE
   All logic is synchronous, loaded before user interaction.
   Workers spawned directly — no postMessage transfers.
═══════════════════════════════════════════════════════════ */
(function(){
'use strict';


/* ── DOM ── */
function $$(id){return document.getElementById(id);}
var dz=$$('dz'),fi=$$('fi'),bb=$$('bb');
var ab=$$('ab'),bp=$$('bp'),bd=$$('bd'),br=$$('br');
var pw=$$('pw'),pf=$$('pf'),pl=$$('pl'),pd=$$('pd');
var prs=$$('prs'),pob=$$('pob'),prb=$$('prb');
var so=$$('so'),sr=$$('sr');
var sv=$$('sv'),svn=$$('svn'),svs=$$('svs'),svb=$$('svb');
var op=$$('op'),oo=$$('oo');
var sp=$$('sp');
var fn=$$('fn'),dl=$$('dl');
var zo=$$('zo'),zc=$$('zc'),zi=$$('zi');

var curFile=null, resBlob=null, origURL=null, safeT=null;

/* ── THEME ── */
var root=document.documentElement;
function applyTheme(l){root.classList.toggle('L',l);$$('im').style.display=l?'none':'';$$('is').style.display=l?''  :'none';}
var ts=localStorage.getItem('pxr');
applyTheme(ts==='l'||(!ts&&!matchMedia('(prefers-color-scheme:dark)').matches));
$$('thm').addEventListener('click',function(){var l=!root.classList.contains('L');applyTheme(l);localStorage.setItem('pxr',l?'l':'d');});

/* ── UTILS ── */
function fmt(n){if(!n&&n!==0)return'—';if(n<1024)return n+' B';if(n<1048576)return(n/1024).toFixed(1)+' KB';return(n/1048576).toFixed(2)+' MB';}
function ck(t,c){return'<span class="ck '+(c||'cd')+'">'+t+'</span>';}
function toast(m,t,d){
  var c=$$('tc2'),el=document.createElement('div');
  el.className='tst t'+(t||'in');el.textContent=m;
  c.appendChild(el);requestAnimationFrame(function(){el.classList.add('V');});
  setTimeout(function(){el.classList.remove('V');setTimeout(function(){el.remove();},300);},d||3500);
}
function readBuf(file){
  return new Promise(function(ok,fail){
    var r=new FileReader();
    r.onload=function(e){ok(e.target.result);};
    r.onerror=function(){fail(new Error('Cannot read file'));};
    r.readAsArrayBuffer(file);
  });
}
function autoFmt(mime){
  if(mime==='image/png')return'png';
  if(mime==='image/webp')return'webp';
  if(mime==='image/gif')return'gif';
  return'jpeg';
}
function guessItype(s){
  if(/compress.*\d+kb$|to-\d+kb/.test(s))return'compress-target';
  if(/compress|reduce|optim/.test(s))return'compress';
  if(/resize|passport|dpi|for-|social/.test(s))return'resize';
  if(/to-png|to-jpg|to-webp|to-bmp|to-gif|to-tiff|to-avif|convert|heic/.test(s))return'convert';
  if(/crop/.test(s))return'crop';
  if(/rotat/.test(s))return'rotate';
  if(/flip/.test(s))return'flip';
  if(/watermark/.test(s))return'watermark';
  if(/\bblur\b/.test(s))return'blur';
  if(/sharpen/.test(s))return'sharpen';
  if(/bright|contrast|saturat|adjust/.test(s))return'adjust';
  if(/bg-remov|background/.test(s))return'ai-bg-remove';
  if(/upscal/.test(s))return'ai-upscale';
  if(/enhanc/.test(s))return'ai-enhance';
  if(/coloriz/.test(s))return'ai-colorize';
  if(/ocr|text-ext/.test(s))return'ai-ocr';
  if(/bulk/.test(s))return'bulk';
  return'compress';
}
function getControls(){
  var v={};
  document.querySelectorAll('#controls-body [data-control]').forEach(function(el){
    v[el.dataset.control]=el.type==='checkbox'?el.checked:el.value;
  });
  return v;
}
function clamp(v,lo,hi){return Math.max(lo||0,Math.min(hi||100,parseFloat(v)||0));}
function getAcceptedKinds(){
  var accept=((fi&&fi.getAttribute('accept'))||'').toLowerCase();
  var wantsPdf=accept.indexOf('application/pdf')!==-1||accept.indexOf('.pdf')!==-1||ITYPE==='convert-pdf';
  return { pdf:wantsPdf, image:!wantsPdf||accept.indexOf('image/')!==-1 };
}
function getFileKind(f){
  var ext=((f&&f.name)||'').split('.').pop().toLowerCase();
  var isPdf=(f.type==='application/pdf')||ext==='pdf';
  var isImage=(f.type&&f.type.startsWith('image/'))||/^(jpg|jpeg|png|webp|gif|bmp|tiff|tif|avif|heic|heif|svg|ico)$/i.test(ext);
  return {isPdf:isPdf,isImage:isImage,ext:ext};
}
function currentInputLabel(){
  var kinds=getAcceptedKinds();
  return kinds.pdf&&!kinds.image?'PDF':'image';
}

/* ── FILE HANDLING ── */
function handleFile(f){
  if(!f)return;
  var kinds=getAcceptedKinds();
  var info=getFileKind(f);
  var maxSize=(kinds.pdf&&!kinds.image)?52428800:MAX;
  if(f.size>maxSize){toast('File too large — max '+(maxSize===52428800?'50 MB':'20 MB'),'er',4000);return;}
  if((kinds.pdf&&!info.isPdf)||(!kinds.pdf&&!info.isImage)||(!kinds.image&&!kinds.pdf)){
    toast(kinds.pdf&&!kinds.image?'Please select a PDF file (.pdf)':'Please select a valid image file (JPG, PNG, WebP, HEIC, GIF, BMP…)','er',4000);return;
  }
  curFile=f;resBlob=null;
  if(origURL)URL.revokeObjectURL(origURL);
  origURL=null;
  pob.innerHTML='';
  if(info.isPdf){
    pob.innerHTML='<div class="pe" style="flex-direction:column;gap:.6rem"><svg viewBox="0 0 24 24" fill="none" stroke="#F87171" stroke-width="1.5" width="48" height="48"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><p>'+f.name+'</p><p style="font-size:.75rem;color:var(--mu)">'+fmt(f.size)+' · PDF</p></div>';
  } else {
    origURL=URL.createObjectURL(f);
    var img=document.createElement('img');img.src=origURL;img.alt='Original';pob.appendChild(img);
  }

  // Reset result
  prb.innerHTML='<div class="pe"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><p>Result appears here</p></div>';
  so.innerHTML=ck(fmt(f.size))+ck(f.name.split('.').pop().toUpperCase(),'ca');
  sr.innerHTML='';
  if(sv)sv.classList.remove('V');
  if(op)op.classList.remove('V');
  bd.classList.remove('V');
  fn.textContent=f.name;
  prs.classList.add('V');
  if(sp)sp.classList.add('V');
  ab.classList.add('V');
  bp.disabled=false;
  toast((info.isPdf?'PDF':'File')+' loaded — press '+('{{PROCESS_BUTTON_LABEL}}'||'Process'),'ok',2000);
}

bb&&bb.addEventListener('click',function(e){e.stopPropagation();fi.click();});
dz.addEventListener('click',function(){fi.click();});
dz.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' ')fi.click();});
dz.addEventListener('dragover',function(e){e.preventDefault();dz.classList.add('on');});
dz.addEventListener('dragleave',function(e){if(!dz.contains(e.relatedTarget))dz.classList.remove('on');});
dz.addEventListener('drop',function(e){e.preventDefault();dz.classList.remove('on');var f=e.dataTransfer.files&&e.dataTransfer.files[0];if(f)handleFile(f);});
fi.addEventListener('change',function(e){var f=e.target.files&&e.target.files[0];if(f)handleFile(f);fi.value='';});
document.addEventListener('paste',function(e){
  var items=Array.from((e.clipboardData&&e.clipboardData.items)||[]);
  var accepted=getAcceptedKinds();
  var picked=items.find(function(i){return accepted.pdf?i.type==='application/pdf':i.type.startsWith('image/');});
  if(picked){e.preventDefault();handleFile(picked.getAsFile());}
});

/* ── PROCESS ── */
bp&&bp.addEventListener('click',function(){
  if(!curFile){toast('Upload a '+currentInputLabel()+' first','in');return;}
  runProcess();
});

async function runProcess(){
  bp.disabled=true;bd.classList.remove('V');
  if(sv)sv.classList.remove('V');
  pw.classList.add('V');pf.className='pf';
  pl.textContent='Processing…';pd.textContent='';
  clearTimeout(safeT);
  safeT=setTimeout(function(){
    pw.classList.remove('V');bp.disabled=false;
    toast('Timed out — try a smaller '+currentInputLabel(),'er',7000);
  },50000);
  try{
    var itype=ITYPE||guessItype(SLUG);
    var controls=getControls();
    var result=await process(curFile,itype,controls);
    clearTimeout(safeT);
    pf.className='pf done';pl.textContent='Done!';pd.textContent='';
    setTimeout(function(){pw.classList.remove('V');pf.className='pf';},1500);
    showResult(result);
  }catch(err){
    clearTimeout(safeT);
    pw.classList.remove('V');pf.className='pf';
    bp.disabled=false;
    toast('Error: '+(err.message||String(err)),'er',8000);
  }
}

function showResult(r){
  resBlob=r.blob;
  // Result image
  prb.innerHTML='';
  var img=document.createElement('img');
  img.src=URL.createObjectURL(r.blob);
  img.alt='Result';
  prb.appendChild(img);

  var sz=r.blob.size,origSz=curFile?curFile.size:0;
  var sav=origSz>0?Math.max(0,Math.round((1-sz/origSz)*100)):0;
  sr.innerHTML=ck(fmt(sz),'cg3')+(sav>0?ck('↓ '+sav+'%','cg3'):'')+(r.w?ck(r.w+'×'+r.h,'ca'):'');

  if(sav>1&&sv){
    sv.classList.add('V');
    svn.textContent=sav+'%';
    svs.innerHTML=fmt(origSz)+' → <b>'+fmt(sz)+'</b>';
    setTimeout(function(){svb.style.width=Math.min(100,sav)+'%';},80);
  }
  if(r.text!==undefined&&op){
    op.classList.add('V');oo.value=r.text||'(No text found)';
    if($$('bod'))$$('bod').style.display='inline-flex';
  }
  dl.textContent=r.isZip?'Download ZIP':'Download';
  bd.classList.add('V');
  bp.disabled=false;
  prs.classList.add('V');
  toast(sav>0?'✓ Compressed by '+sav+'% — ready to download':'✓ Done — ready to download','ok',4000);
}

/* ── DOWNLOAD ── */
bd&&bd.addEventListener('click',function(){
  if(!resBlob)return;
  var EXT={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/avif':'avif','text/plain':'txt','application/zip':'zip'};
  var ext=EXT[resBlob.type]||'jpg';
  var a=document.createElement('a');
  a.href=URL.createObjectURL(resBlob);
  a.download='pixaroid-'+SLUG+'.'+ext;
  document.body.appendChild(a);a.click();a.remove();
  toast('Downloading…','in',2000);
});

/* ── RESET ── */
br&&br.addEventListener('click',function(){
  curFile=resBlob=null;fi.value='';
  pob.innerHTML='<div class="pe"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><p>Original</p></div>';
  prb.innerHTML='<div class="pe"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><p>Result appears here</p></div>';
  so.innerHTML='';sr.innerHTML='';fn.textContent='';
  prs.classList.remove('V');ab.classList.remove('V');
  if(sp)sp.classList.remove('V');
  bd.classList.remove('V');bp.disabled=true;
  if(sv)sv.classList.remove('V');if(svb)svb.style.width='0%';
  if(op)op.classList.remove('V');
  if(origURL){URL.revokeObjectURL(origURL);origURL=null;}
});

/* ── OCR ACTIONS ── */
$$('boc')&&$$('boc').addEventListener('click',function(){
  navigator.clipboard&&navigator.clipboard.writeText(oo.value||'')
    .then(function(){toast('Text copied!','ok',2000);})
    .catch(function(){toast('Copy failed','er');});
});
$$('bod')&&$$('bod').addEventListener('click',function(){
  if(!resBlob)return;
  var a=document.createElement('a');a.href=URL.createObjectURL(resBlob);a.download='pixaroid-ocr.txt';
  document.body.appendChild(a);a.click();a.remove();
});

/* ── ZOOM ── */
pob.addEventListener('click',function(){var img=pob.querySelector('img');if(img){zi.src=img.src;zo.classList.add('V');}});
prb.addEventListener('click',function(){var img=prb.querySelector('img');if(img){zi.src=img.src;zo.classList.add('V');}});
zc&&zc.addEventListener('click',function(){zo.classList.remove('V');});
zo&&zo.addEventListener('click',function(e){if(e.target===zo)zo.classList.remove('V');});
document.addEventListener('keydown',function(e){if(e.key==='Escape')zo.classList.remove('V');});

/* ── FAQ ── */
document.querySelectorAll('.fq').forEach(function(btn){
  btn.addEventListener('click',function(){
    var fi=this.closest('.fi'),open=fi.classList.contains('O');
    document.querySelectorAll('.fi.O').forEach(function(i){i.classList.remove('O');});
    if(!open)fi.classList.add('O');
  });
});

/* ══════════════════════════════════════════════════════════
   WORKER RUNNER — no transferables, maximum compatibility
══════════════════════════════════════════════════════════ */
function runWorker(path,payload){
  return new Promise(function(ok,fail){
    var w;
    try{w=new Worker(path);}catch(e){fail(new Error('Worker failed: '+path));return;}
    var jid=(Math.random()*1e9|0).toString(36);
    var t=setTimeout(function(){w.terminate();fail(new Error('Worker timed out'));},60000);
    w.onmessage=function(e){
      if(!e.data||e.data.jobId!==jid)return;
      clearTimeout(t);w.terminate();
      if(e.data.error){fail(new Error(e.data.error));return;}
      /* Workers send buffer (ArrayBuffer) for max compat; fall back to blob */
      var blob;
      try {
        if(e.data.buffer&&e.data.buffer.byteLength>0){
          blob=new Blob([e.data.buffer],{type:e.data.mime||'image/jpeg'});
        } else if(e.data.blob){
          blob=e.data.blob;
        } else if(e.data.text!==undefined) {
          blob=new Blob([e.data.text||''],{type:'text/plain'});
        } else {
          fail(new Error('Worker returned no data'));return;
        }
      } catch(blobErr) { fail(new Error('Cannot create result blob: '+blobErr.message)); return; }
      var origSz=payload.origSize||0;
      ok({blob:blob,w:e.data.width||null,h:e.data.height||null,
          fmt:e.data.format||null,text:e.data.text,confidence:e.data.confidence,
          savings:origSz>0?Math.max(0,Math.round((1-blob.size/origSz)*100)):0});
    };
    w.onerror=function(e){clearTimeout(t);w.terminate();fail(new Error(e.message||'Worker crashed'));};
    // Always copy — never transfer — avoids all postMessage type errors
    var msg=Object.assign({jobId:jid},payload);
    delete msg.origSize;
    w.postMessage(msg);
  });
}

/* ══════════════════════════════════════════════════════════
   PROCESS ROUTER
══════════════════════════════════════════════════════════ */
async function process(file,itype,ctrl){
  if(!itype||itype==='auto')itype=guessItype(SLUG);
  var mime=file.type||'image/jpeg';
  var buf=await readBuf(file);

  if(itype==='compress'){
    return runWorker('/workers/compress.worker.js',{
      op:'compress',buffer:buf,mime:mime,origSize:file.size,
      quality:clamp(ctrl.quality||80,1,100),
      format:ctrl.format||autoFmt(mime),
      maxWidth:parseInt(ctrl.maxWidth)||0,
    });
  }
  if(itype==='compress-target'){
    var tkb=parseFloat(ctrl.targetKB)||100;
    return runWorker('/workers/compress.worker.js',{
      op:'compress-target',buffer:buf,mime:mime,origSize:file.size,
      targetBytes:tkb*1024,
      format:(ctrl.format||'jpeg').replace('jpg','jpeg'),
      minQuality:clamp(ctrl.minQuality||5,1,50),
    });
  }
  if(itype==='convert'||itype==='convert-multi'||itype==='convert-pdf'){
    return runWorker('/workers/convert.worker.js',{
      op:'convert',buffer:buf,mime:mime,origSize:file.size,
      targetFormat:(ctrl.format||ctrl.targetFormat||'jpeg').replace('jpg','jpeg'),
      quality:clamp(ctrl.quality||90,1,100),
      background:ctrl.background||'#ffffff',
      lossless:ctrl.lossless===true||ctrl.lossless==='true',
    });
  }
  if(itype==='resize'||itype==='resize-social'||itype==='social-canvas'){
    return runWorker('/workers/resize.worker.js',{
      op:'resize',buffer:buf,mime:mime,origSize:file.size,
      width:parseInt(ctrl.width)||0,height:parseInt(ctrl.height)||0,
      percent:parseFloat(ctrl.percent)||0,preset:ctrl.preset||'',
      fit:ctrl.fit||'contain',lockAspect:ctrl.lockAspect!=='false',
      format:ctrl.format||autoFmt(mime),
      quality:clamp(ctrl.quality||92,1,100),
    });
  }
  if(itype==='ai-bg-remove'||itype==='ai-upscale'||itype==='ai-enhance'||
     itype==='ai-sharpen'||itype==='ai-colorize'||itype==='ai-ocr'){
    return runAI(itype,buf,mime,file.size,ctrl);
  }
  if(itype==='bulk')return runBulk(file,ctrl);
  if(itype==='info'||itype==='metadata'||itype==='palette')return runUtil(file,buf);

  // Editor ops
  var ops=buildOps(itype,ctrl);
  if(!ops.length)throw new Error('No operations to apply');
  return runWorker('/workers/filter.worker.js',{
    op:'edit',buffer:buf,mime:mime,origSize:file.size,
    operations:ops,
    format:ctrl.format||autoFmt(mime),
    quality:clamp(ctrl.quality||90,1,100),
  });
}

function buildOps(it,c){
  var ops=[];
  switch(it){
    case'rotate':    ops.push({type:'rotate',angle:parseFloat(c.angle)||90});break;
    case'flip':      ops.push({type:'flip',horizontal:c.direction!=='vertical',vertical:c.direction==='vertical'});break;
    case'crop':      ops.push({type:'crop',x:+c.x||0,y:+c.y||0,width:+c.width,height:+c.height});break;
    case'watermark': ops.push({type:'watermark',text:c.text||'© Pixaroid',fontSize:+c.fontSize||40,color:c.color||'#fff',opacity:+c.opacity||50,position:c.position||'bottom-right',tile:c.tile==='true'});break;
    case'text-overlay':ops.push({type:'text',text:c.text||'',fontSize:+c.fontSize||48,color:c.color||'#fff',strokeWidth:+c.strokeWidth||2,align:c.align||'center'});break;
    case'blur':      ops.push({type:'blur',radius:clamp(c.radius||5,0.1,50)});break;
    case'sharpen':   ops.push({type:'sharpen',amount:clamp(c.amount||50,0,100),radius:clamp(c.radius||1.5,0.1,10)});break;
    case'vignette':  ops.push({type:'vignette',intensity:clamp(c.intensity||50,0,100)});break;
    case'border':    ops.push({type:'border',size:clamp(c.size||10,1,200),color:c.color||'#000'});break;
    case'sepia':     ops.push({type:'sepia',intensity:clamp(c.intensity||80,0,100)});break;
    case'grayscale': ops.push({type:'grayscale'});break;
    case'invert':    ops.push({type:'invert'});break;
    case'noise':     ops.push({type:'noise',amount:clamp(c.amount||20,0,100)});break;
    case'denoise':   ops.push({type:'denoise',strength:clamp(c.strength||1.5,0,5)});break;
    default:
      var fs={brightness:0,contrast:0,saturation:0,vibrance:0,temperature:0,highlights:0,shadows:0};
      Object.keys(fs).forEach(function(k){var v=parseFloat(c[k]);if(!isNaN(v)&&v!==0)ops.push({type:k,value:v});});
  }
  return ops;
}

/* ── AI RUNNER ── */
function runAI(itype,buf,mime,origSize,ctrl){
  return new Promise(function(ok,fail){
    var w;try{w=new Worker('/workers/ai.worker.js');}catch(e){fail(new Error('AI worker failed'));return;}
    var jid=(Math.random()*1e9|0).toString(36);
    var t=setTimeout(function(){w.terminate();fail(new Error('AI timed out — try a smaller image'));},120000);
    w.onmessage=function(e){
      if(e.data&&e.data.type==='progress'){
        var p=e.data.percent||0;
        pl.textContent=p<30?'Loading AI…':p<70?'Analysing…':'Finalising…';
        pd.textContent=p+'%';return;
      }
      if(!e.data||e.data.jobId!==jid)return;
      clearTimeout(t);w.terminate();
      if(e.data.error){fail(new Error(e.data.error));return;}
      var blob;
      if(e.data.buffer&&e.data.buffer.byteLength>0){
        blob=new Blob([e.data.buffer],{type:e.data.mime||'image/png'});
      } else if(e.data.blob){
        blob=e.data.blob;
      } else {
        /* OCR: text-only result */
        blob=new Blob([e.data.text||''],{type:'text/plain'});
      }
      ok({blob:blob,w:e.data.width,h:e.data.height,fmt:e.data.format||'png',
          text:e.data.text,confidence:e.data.confidence});
    };
    w.onerror=function(e){clearTimeout(t);w.terminate();fail(new Error(e.message||'AI error'));};
    w.postMessage({jobId:jid,op:itype,buffer:buf,mime:mime,
      scale:ctrl.scale,mode:ctrl.mode,strength:parseFloat(ctrl.strength)||70,
      style:ctrl.style,language:ctrl.language||'eng',amount:parseFloat(ctrl.amount)||70,
      intensity:parseFloat(ctrl.intensity)||80,bgColor:ctrl.bgColor||'transparent',
      preprocess:ctrl.preprocess!=='false'});
  });
}

/* ── BULK ── */
async function runBulk(file,ctrl){
  var input=$$('fi'),files=input&&input.files&&input.files.length>1?Array.from(input.files):[file];
  var task=SLUG.includes('resize')?'resize':SLUG.includes('convert')?'convert':SLUG.includes('watermark')?'watermark':'compress';
  var results=[],total=files.length;
  for(var i=0;i<total;i++){
    var f=files[i];
    pl.textContent=(i+1)+'/'+total+': '+f.name;pd.textContent=Math.round((i/total)*100)+'%';
    try{
      var buf=await readBuf(f);
      var r=await runWorker('/workers/compress.worker.js',{
        op:'compress',buffer:buf,mime:f.type||'image/jpeg',origSize:f.size,
        quality:parseInt(ctrl.quality)||80,format:'jpeg',
      });
      results.push({name:f.name,blob:r.blob});
    }catch(e2){}
  }
  if(!results.length)throw new Error('No files processed');
  if(results.length===1)return{blob:results[0].blob,fmt:'jpeg'};
  if(!window.JSZip)await new Promise(function(res,rej){var s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);});
  var zip=new window.JSZip();
  results.forEach(function(r){zip.file(r.name.replace(/\.[^.]+$/,'')+'.jpg',r.blob);});
  var zb=await zip.generateAsync({type:'blob',compression:'DEFLATE'});
  return{blob:zb,fmt:'zip',isZip:true};
}

/* ── UTILITY ── */
async function runUtil(file,buf){
  var img=await new Promise(function(res,rej){var i=new Image();var u=URL.createObjectURL(file);i.onload=function(){res(i);URL.revokeObjectURL(u);};i.onerror=rej;i.src=u;});
  return{blob:file,w:img.naturalWidth,h:img.naturalHeight,fmt:'original'};
}

/* ── SERVICE WORKER ── */
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(function(){});

})();
