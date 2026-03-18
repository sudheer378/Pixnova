/* Pixaroid — compress.worker.js v5 — classic script, no ES modules */
'use strict';
var MIME={jpeg:'image/jpeg',jpg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif'};
var DIM=[1,.9,.8,.7,.6,.5,.4,.3,.25,.2];

self.onmessage=async function(e){
  var d=e.data,jid=d.jobId;
  try{var r=(d.op==='compress-target')?await doTarget(d):await doFixed(d);
    dispatch(jid,r.blob,r.w,r.h,r.fmt);
  }catch(err){self.postMessage({jobId:jid,error:String(err.message||err)});}
};

function blobBuf(blob){try{var fr=new FileReaderSync();return fr.readAsArrayBuffer(blob);}catch(e){return null;}}
function dispatch(jid,blob,w,h,fmt){
  var ab=blobBuf(blob);
  if(ab&&ab.byteLength>0) self.postMessage({jobId:jid,buffer:ab,mime:blob.type,width:w,height:h,format:fmt});
  else self.postMessage({jobId:jid,blob:blob,width:w,height:h,format:fmt});
}
async function bm(buf,mime){
  for(var t of[mime,'image/jpeg','image/png','']){
    try{return await createImageBitmap(t?new Blob([buf],{type:t}):new Blob([buf]));}catch(e){}
  }
  throw new Error('Cannot decode image. Try JPG or PNG.');
}
async function draw(b,w,h,fmt,q){
  var mime=MIME[fmt]||'image/jpeg';
  var c=new OffscreenCanvas(Math.max(1,w),Math.max(1,h)),ctx=c.getContext('2d');
  if(mime!=='image/png'&&mime!=='image/gif'){ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);}
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(b,0,0,w,h);
  return c.convertToBlob((mime==='image/png'||mime==='image/gif')?{type:mime}:{type:mime,quality:q/100});
}
function afmt(m){return m==='image/png'?'png':m==='image/webp'?'webp':'jpeg';}

async function doFixed(d){
  var fmt=d.format||'jpeg';if(fmt==='auto')fmt=afmt(d.mime);
  var q=Math.max(1,Math.min(100,parseFloat(d.quality)||80));
  var b=await bm(d.buffer,d.mime),w=b.width,h=b.height;
  if(d.maxWidth>0&&w>d.maxWidth){h=Math.round(h/w*d.maxWidth);w=d.maxWidth;}
  var blob=await draw(b,w,h,fmt,q);b.close();return{blob,w,h,fmt};
}
async function doTarget(d){
  var tb=d.targetBytes||(parseFloat(d.targetKB)||100)*1024;
  var fmt=(d.format||'jpeg').replace('jpg','jpeg');if(fmt==='auto')fmt='jpeg';
  var minQ=Math.max(1,Math.min(50,parseFloat(d.minQuality)||5));
  var b=await bm(d.buffer,d.mime),ow=b.width,oh=b.height;
  // Phase 1: binary-search quality at full resolution
  var lo=minQ,hi=95,best=null;
  for(var i=0;i<16;i++){
    var mid=Math.round((lo+hi)/2),p=await draw(b,ow,oh,fmt,mid);
    if(p.size<=tb){best={blob:p,w:ow,h:oh};lo=mid+1;}else hi=mid-1;
    if(lo>hi)break;
  }
  if(best){b.close();return best;}
  // Phase 2: shrink dimensions
  for(var s=0;s<DIM.length;s++){
    var sc=DIM[s],sw=Math.max(1,Math.round(ow*sc)),sh=Math.max(1,Math.round(oh*sc));
    lo=minQ;hi=95;
    for(var j=0;j<14;j++){
      var qm=Math.round((lo+hi)/2),p2=await draw(b,sw,sh,fmt,qm);
      if(p2.size<=tb){best={blob:p2,w:sw,h:sh};lo=qm+1;}else hi=qm-1;
      if(lo>hi)break;
    }
    if(best&&best.w===sw)break;
  }
  b.close();
  if(best)return best;
  var fb=await bm(d.buffer,d.mime),fb2=await draw(fb,Math.max(1,Math.round(ow*.2)),Math.max(1,Math.round(oh*.2)),fmt,minQ);
  fb.close();return{blob:fb2,w:Math.round(ow*.2),h:Math.round(oh*.2),fmt};
}
