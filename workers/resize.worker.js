/* Pixaroid — resize.worker.js v5 */
'use strict';
var MIME={jpeg:'image/jpeg',jpg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif'};
var PS={'1080x1080':{w:1080,h:1080},'1080x1350':{w:1080,h:1350},'1080x566':{w:1080,h:566},'1080x1920':{w:1080,h:1920},'1200x630':{w:1200,h:630},'820x312':{w:820,h:312},'1920x1005':{w:1920,h:1005},'170x170':{w:170,h:170},'1200x675':{w:1200,h:675},'1500x500':{w:1500,h:500},'400x400':{w:400,h:400},'1200x627':{w:1200,h:627},'1584x396':{w:1584,h:396},'1280x720':{w:1280,h:720},'2560x1440':{w:2560,h:1440},'800x800':{w:800,h:800},'500x500':{w:500,h:500},'1000x1500':{w:1000,h:1500},'1000x3000':{w:1000,h:3000},'165x165':{w:165,h:165},'600x600':{w:600,h:600},'413x531':{w:413,h:531},'512x512':{w:512,h:512},'320x320':{w:320,h:320},'1080x1080':{w:1080,h:1080}};

self.onmessage=async function(e){
  var d=e.data,jid=d.jobId;
  try{var r=await doResize(d);dispatch(jid,r.blob,r.w,r.h,r.fmt);}
  catch(err){self.postMessage({jobId:jid,error:String(err.message||err)});}
};
function blobBuf(b){try{return new FileReaderSync().readAsArrayBuffer(b);}catch(e){return null;}}
function dispatch(jid,blob,w,h,fmt){
  var ab=blobBuf(blob);
  if(ab&&ab.byteLength>0)self.postMessage({jobId:jid,buffer:ab,mime:blob.type,width:w,height:h,format:fmt});
  else self.postMessage({jobId:jid,blob:blob,width:w,height:h,format:fmt});
}
async function getBm(buf,mime){
  try{return await createImageBitmap(new Blob([buf],{type:mime||'image/jpeg'}));}catch(e){}
  try{return await createImageBitmap(new Blob([buf]));}catch(e2){throw new Error('Cannot decode image');}
}
async function doResize(d){
  var b=await getBm(d.buffer,d.mime),sw=b.width,sh=b.height,ratio=sw/sh;
  var fmt=d.format||'jpeg';if(fmt==='auto')fmt=d.mime==='image/png'?'png':'jpeg';
  var q=Math.max(1,Math.min(100,parseFloat(d.quality)||92));
  var mime=MIME[fmt]||'image/jpeg',fit=d.fit||'contain';
  var dw=sw,dh=sh;
  // Parse preset
  var pr=d.preset||'',pm=pr.match(/(\d+)[×x](\d+)/);
  if(pm){dw=+pm[1];dh=+pm[2];}
  else if(pr){var k=Object.keys(PS).find(function(k){return pr.indexOf(k)>=0||pr.replace('×','x').indexOf(k)>=0;});if(k){dw=PS[k].w;dh=PS[k].h;}}
  if(!pm&&!pr){
    var pct=parseFloat(d.percent)||0,tw=parseInt(d.width)||0,th=parseInt(d.height)||0;
    var lock=d.lockAspect!=='false'&&d.lockAspect!==false;
    if(pct>0){dw=Math.max(1,Math.round(sw*pct/100));dh=Math.max(1,Math.round(sh*pct/100));}
    else if(tw>0&&th>0){dw=tw;dh=th;}
    else if(tw>0){dw=tw;dh=lock?Math.max(1,Math.round(tw/ratio)):sh;}
    else if(th>0){dh=th;dw=lock?Math.max(1,Math.round(th*ratio)):sw;}
  }
  dw=Math.max(1,dw);dh=Math.max(1,dh);
  var c=new OffscreenCanvas(dw,dh),ctx=c.getContext('2d');
  if(mime==='image/jpeg'){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,dw,dh);}
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  if(fit==='cover'){var sc=Math.max(dw/sw,dh/sh),nw=sw*sc,nh=sh*sc;ctx.drawImage(b,(dw-nw)/2,(dh-nh)/2,nw,nh);}
  else if(fit==='stretch'){ctx.drawImage(b,0,0,dw,dh);}
  else{var sc2=Math.min(dw/sw,dh/sh),nw2=sw*sc2,nh2=sh*sc2;ctx.drawImage(b,(dw-nw2)/2,(dh-nh2)/2,nw2,nh2);}
  b.close();
  var opts=(mime==='image/png'||mime==='image/gif')?{type:mime}:{type:mime,quality:q/100};
  return{blob:await c.convertToBlob(opts),w:dw,h:dh,fmt};
}
