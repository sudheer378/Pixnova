/* Pixaroid — Filter/Edit Worker (classic script) */
'use strict';

var MIME_MAP = {jpeg:'image/jpeg',jpg:'image/jpeg',png:'image/png',webp:'image/webp',avif:'image/avif'};
function clamp(v){return Math.max(0,Math.min(255,Math.round(v)));}

self.onmessage = async function(e) {
  var d = e.data;
  try {
    var result = await edit(d);
    self.postMessage({jobId:d.jobId, blob:result.blob, width:result.width, height:result.height, format:result.format}, [result.blob]);
  } catch(err) {
    self.postMessage({jobId:d.jobId, error:err.message||String(err)});
  }
};

async function edit(d) {
  var bm = await createImageBitmap(new Blob([d.buffer], {type:d.mime||'image/jpeg'}));
  var c = new OffscreenCanvas(bm.width, bm.height);
  c.getContext('2d').drawImage(bm, 0, 0);
  bm.close();
  var ops = d.operations || [];
  for (var i = 0; i < ops.length; i++) c = await applyOp(c, ops[i]);
  var fmt = d.format || 'jpeg';
  if (fmt === 'auto') fmt = d.mime === 'image/png' ? 'png' : 'jpeg';
  var outMime = MIME_MAP[fmt] || 'image/jpeg';
  var quality = Math.max(0.01, Math.min(1, (d.quality||90)/100));
  var opts = outMime === 'image/png' ? {type:outMime} : {type:outMime, quality:quality};
  var blob = await c.convertToBlob(opts);
  return {blob:blob, width:c.width, height:c.height, format:fmt};
}

async function applyOp(c, op) {
  switch(op.type) {
    case 'brightness':   return applyBrightness(c, op.value||0);
    case 'contrast':     return applyContrast(c, op.value||0);
    case 'saturation':   return applySaturation(c, op.value||0);
    case 'grayscale':    return applySaturation(c, -100);
    case 'sepia':        return applySepia(c, op.intensity||80);
    case 'invert':       return applyInvert(c);
    case 'blur':         return applyBlur(c, op.radius||5);
    case 'sharpen':      return applySharpen(c, op.amount||50, op.radius||1.5);
    case 'vignette':     return applyVignette(c, op.intensity||50);
    case 'rotate':       return applyRotate(c, op.angle||90);
    case 'flip':         return applyFlip(c, op.horizontal||false, op.vertical||false);
    case 'crop':         return applyCrop(c, op.x||0, op.y||0, op.width, op.height);
    case 'watermark':    return applyWatermark(c, op);
    case 'text':         return applyText(c, op);
    case 'border':       return applyBorder(c, op.size||10, op.color||'#000000');
    case 'vibrance':     return applyVibrance(c, op.value||0);
    case 'temperature':  return applyTemperature(c, op.value||0);
    case 'highlights':   return applyHighlights(c, op.value||0);
    case 'shadows':      return applyShadows(c, op.value||0);
    case 'noise':        return applyNoise(c, op.amount||20);
    case 'denoise':      return applyBlur(c, Math.min(op.strength||1.5, 3));
    default: return c;
  }
}

function getPixels(c){return c.getContext('2d').getImageData(0,0,c.width,c.height);}
function putPixels(c,id){c.getContext('2d').putImageData(id,0,0);return c;}

function applyBrightness(c,v){var d=(v/100)*255,id=getPixels(c),px=id.data;for(var i=0;i<px.length;i+=4){px[i]=clamp(px[i]+d);px[i+1]=clamp(px[i+1]+d);px[i+2]=clamp(px[i+2]+d);}return putPixels(c,id);}
function applyContrast(c,v){var f=(259*(v+255))/(255*(259-v)),id=getPixels(c),px=id.data;for(var i=0;i<px.length;i+=4){px[i]=clamp(f*(px[i]-128)+128);px[i+1]=clamp(f*(px[i+1]-128)+128);px[i+2]=clamp(f*(px[i+2]-128)+128);}return putPixels(c,id);}
function applySaturation(c,v){var s=1+v/100,id=getPixels(c),px=id.data;for(var i=0;i<px.length;i+=4){var l=0.2126*px[i]+0.7152*px[i+1]+0.0722*px[i+2];px[i]=clamp(l+s*(px[i]-l));px[i+1]=clamp(l+s*(px[i+1]-l));px[i+2]=clamp(l+s*(px[i+2]-l));}return putPixels(c,id);}
function applySepia(c,t){var it=t/100,id=getPixels(c),px=id.data;for(var i=0;i<px.length;i+=4){var r=px[i],g=px[i+1],b=px[i+2];px[i]=clamp(r*(1-0.607*it)+g*0.769*it+b*0.189*it);px[i+1]=clamp(r*0.349*it+g*(1-0.314*it)+b*0.168*it);px[i+2]=clamp(r*0.272*it+g*0.534*it+b*(1-0.869*it));}return putPixels(c,id);}
function applyInvert(c){var id=getPixels(c),px=id.data;for(var i=0;i<px.length;i+=4){px[i]=255-px[i];px[i+1]=255-px[i+1];px[i+2]=255-px[i+2];}return putPixels(c,id);}
function applyVibrance(c,v){var s=v/100,id=getPixels(c),px=id.data;for(var i=0;i<px.length;i+=4){var mx=Math.max(px[i],px[i+1],px[i+2]),avg=(px[i]+px[i+1]+px[i+2])/3,amt=((mx-avg)/255)*2*s;px[i]=clamp(px[i]+(mx-px[i])*amt*(-1));px[i+1]=clamp(px[i+1]+(mx-px[i+1])*amt*(-1));px[i+2]=clamp(px[i+2]+(mx-px[i+2])*amt*(-1));}return putPixels(c,id);}
function applyTemperature(c,v){var id=getPixels(c),px=id.data,s=Math.abs(v)/100*30,w=v>0;for(var i=0;i<px.length;i+=4){if(w){px[i]=clamp(px[i]+s);px[i+2]=clamp(px[i+2]-s);}else{px[i]=clamp(px[i]-s);px[i+2]=clamp(px[i+2]+s);}}return putPixels(c,id);}
function applyHighlights(c,v){var s=v/200,id=getPixels(c),px=id.data;for(var i=0;i<px.length;i+=4){var l=(px[i]*0.2126+px[i+1]*0.7152+px[i+2]*0.0722)/255;if(l>0.5){var f=s;px[i]=clamp(px[i]+px[i]*f);px[i+1]=clamp(px[i+1]+px[i+1]*f);px[i+2]=clamp(px[i+2]+px[i+2]*f);}}return putPixels(c,id);}
function applyShadows(c,v){var s=v/200,id=getPixels(c),px=id.data;for(var i=0;i<px.length;i+=4){var l=(px[i]*0.2126+px[i+1]*0.7152+px[i+2]*0.0722)/255;if(l<0.5){var f=s;px[i]=clamp(px[i]+px[i]*f);px[i+1]=clamp(px[i+1]+px[i+1]*f);px[i+2]=clamp(px[i+2]+px[i+2]*f);}}return putPixels(c,id);}
function applyNoise(c,a){var id=getPixels(c),px=id.data;for(var i=0;i<px.length;i+=4){var n=(Math.random()-0.5)*a*2;px[i]=clamp(px[i]+n);px[i+1]=clamp(px[i+1]+n);px[i+2]=clamp(px[i+2]+n);}return putPixels(c,id);}

function applyBlur(c,r){var d=new OffscreenCanvas(c.width,c.height),ctx=d.getContext('2d');ctx.filter='blur('+Math.max(0.1,r)+'px)';ctx.drawImage(c,0,0);ctx.filter='none';return d;}

function applySharpen(c,amount,radius){
  var blurred=applyBlur(copyC(c),Math.max(0.3,radius));
  var id=getPixels(c),bid=getPixels(blurred),px=id.data,bp=bid.data,s=amount/100;
  for(var i=0;i<px.length;i+=4){for(var ch=0;ch<3;ch++){var diff=px[i+ch]-bp[i+ch];if(Math.abs(diff)>0)px[i+ch]=clamp(px[i+ch]+s*diff*2.5);}}
  return putPixels(c,id);
}

function applyVignette(c,intensity){var ctx=c.getContext('2d'),w=c.width,h=c.height,s=intensity/100,g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.sqrt(w*w+h*h)/2);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(0.5,'rgba(0,0,0,'+(s*0.2)+')');g.addColorStop(1,'rgba(0,0,0,'+(s*0.7)+')');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);return c;}

function applyRotate(c,angle){var rad=angle*Math.PI/180,sinA=Math.abs(Math.sin(rad)),cosA=Math.abs(Math.cos(rad)),dw=Math.round(c.width*cosA+c.height*sinA),dh=Math.round(c.width*sinA+c.height*cosA),d=new OffscreenCanvas(dw,dh),ctx=d.getContext('2d');ctx.translate(dw/2,dh/2);ctx.rotate(rad);ctx.drawImage(c,-c.width/2,-c.height/2);return d;}

function applyFlip(c,h,v){var d=new OffscreenCanvas(c.width,c.height),ctx=d.getContext('2d');ctx.translate(h?c.width:0,v?c.height:0);ctx.scale(h?-1:1,v?-1:1);ctx.drawImage(c,0,0);return d;}

function applyCrop(c,x,y,w,h){var cx=Math.max(0,Math.round(x||0)),cy=Math.max(0,Math.round(y||0)),cw=Math.min(c.width-cx,Math.round(w||c.width)),ch=Math.min(c.height-cy,Math.round(h||c.height));if(cw<=0||ch<=0)return c;var d=new OffscreenCanvas(cw,ch);d.getContext('2d').drawImage(c,cx,cy,cw,ch,0,0,cw,ch);return d;}

function applyBorder(c,size,color){var nw=c.width+size*2,nh=c.height+size*2,d=new OffscreenCanvas(nw,nh),ctx=d.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,nw,nh);ctx.drawImage(c,size,size);return d;}

function applyWatermark(c,op){var ctx=c.getContext('2d'),w=c.width,h=c.height,text=op.text||'© Pixaroid',fs=parseInt(op.fontSize)||40,color=op.color||'#ffffff',opacity=parseFloat(op.opacity)||50,pos=op.position||'bottom-right',tile=op.tile||op.tile==='true';ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,opacity/100));ctx.font='bold '+fs+'px Arial,sans-serif';ctx.fillStyle=color;ctx.shadowColor='rgba(0,0,0,0.4)';ctx.shadowBlur=4;var tw=ctx.measureText(text).width,pad=20,tx,ty;if(tile){ctx.rotate(-0.3);for(var y=-h;y<h*2;y+=fs+80)for(var x=-w;x<w*2;x+=tw+120)ctx.fillText(text,x,y);}else{switch(pos){case 'top-left':tx=pad;ty=pad+fs;break;case 'top-right':tx=w-tw-pad;ty=pad+fs;break;case 'top-center':tx=(w-tw)/2;ty=pad+fs;break;case 'bottom-left':tx=pad;ty=h-pad;break;case 'center':tx=(w-tw)/2;ty=(h+fs)/2;break;default:tx=w-tw-pad;ty=h-pad;}ctx.fillText(text,tx,ty);}ctx.restore();return c;}

function applyText(c,op){var ctx=c.getContext('2d'),w=c.width,h=c.height,text=op.text||'Your Text',fs=parseInt(op.fontSize)||48,color=op.color||'#ffffff',sw=parseInt(op.strokeWidth)||2,sc=op.strokeColor||'#000000';ctx.save();ctx.font=(op.bold!==false?'bold ':'')+fs+'px '+(op.fontFamily||'Arial')+',sans-serif';ctx.fillStyle=color;ctx.textAlign=op.align||'center';ctx.shadowColor='rgba(0,0,0,0.5)';ctx.shadowBlur=5;var tx=op.x!=null?parseFloat(op.x):(op.align==='center'?w/2:20),ty=op.y!=null?parseFloat(op.y):h/2+fs/3;if(sw>0){ctx.strokeStyle=sc;ctx.lineWidth=sw;ctx.strokeText(text,tx,ty);}ctx.fillText(text,tx,ty);ctx.restore();return c;}

function copyC(c){var d=new OffscreenCanvas(c.width,c.height);d.getContext('2d').drawImage(c,0,0);return d;}
