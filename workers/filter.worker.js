/* Pixaroid — filter.worker.js v5 — 22 operations */
'use strict';
var MIME={jpeg:'image/jpeg',jpg:'image/jpeg',png:'image/png',webp:'image/webp',avif:'image/avif'};
function cl(v){return Math.max(0,Math.min(255,Math.round(v)));}

self.onmessage=async function(e){
  var d=e.data,jid=d.jobId;
  try{
    var bm=await getBm(d.buffer,d.mime);
    var c=new OffscreenCanvas(bm.width,bm.height);c.getContext('2d').drawImage(bm,0,0);bm.close();
    var ops=d.operations||[];
    for(var i=0;i<ops.length;i++)c=await applyOp(c,ops[i]);
    var fmt=d.format||'jpeg';if(fmt==='auto')fmt=d.mime==='image/png'?'png':'jpeg';
    var mime=MIME[fmt]||'image/jpeg',q=Math.max(1,Math.min(100,parseFloat(d.quality)||90))/100;
    var blob=await c.convertToBlob((mime==='image/png'||mime==='image/gif')?{type:mime}:{type:mime,quality:q});
    dispatch(jid,blob,c.width,c.height,fmt);
  }catch(err){self.postMessage({jobId:jid,error:String(err.message||err)});}
};
function blobBuf(b){try{return new FileReaderSync().readAsArrayBuffer(b);}catch(e){return null;}}
function dispatch(jid,blob,w,h,fmt){
  var ab=blobBuf(blob);
  if(ab&&ab.byteLength>0)self.postMessage({jobId:jid,buffer:ab,mime:blob.type,width:w,height:h,format:fmt});
  else self.postMessage({jobId:jid,blob:blob,width:w,height:h,format:fmt});
}
async function getBm(buf,mime){
  for(var t of[mime,'image/jpeg','image/png','']){
    try{return await createImageBitmap(t?new Blob([buf],{type:t}):new Blob([buf]));}catch(e){}
  }
  throw new Error('Cannot decode image');
}
function gp(c){return c.getContext('2d').getImageData(0,0,c.width,c.height);}
function pp(c,id){c.getContext('2d').putImageData(id,0,0);return c;}
function cp(c){var d=new OffscreenCanvas(c.width,c.height);d.getContext('2d').drawImage(c,0,0);return d;}

async function applyOp(c,o){
  switch(o.type){
    case 'brightness':    return brightness(c,o.value||0);
    case 'contrast':      return contrast(c,o.value||0);
    case 'saturation':    return saturation(c,o.value||0);
    case 'grayscale':     return saturation(c,-100);
    case 'vibrance':      return vibrance(c,o.value||0);
    case 'temperature':   return temperature(c,o.value||0);
    case 'highlights':    return highlights(c,o.value||0);
    case 'shadows':       return shadows(c,o.value||0);
    case 'sepia':         return sepia(c,o.intensity||80);
    case 'invert':        return invert(c);
    case 'blur':          return blur(c,o.radius||5);
    case 'sharpen':       return sharpen(c,o.amount||50,o.radius||1.5);
    case 'vignette':      return vignette(c,o.intensity||50);
    case 'noise':         return noise(c,o.amount||20);
    case 'denoise':       return blur(c,Math.min(o.strength||1.5,3));
    case 'rotate':        return rotate(c,o.angle||90);
    case 'flip':          return flip(c,o.horizontal||false,o.vertical||false);
    case 'crop':          return crop(c,o.x||0,o.y||0,o.width,o.height);
    case 'border':        return border(c,o.size||10,o.color||'#000000');
    case 'watermark':     return watermark(c,o);
    case 'text':          return textOp(c,o);
    case 'meme':          return memeOp(c,o);
    case 'round-corners': return roundCorners(c,o);
    default: return c;
  }
}

function brightness(c,v){var n=v/100*255,id=gp(c),p=id.data;for(var i=0;i<p.length;i+=4){p[i]=cl(p[i]+n);p[i+1]=cl(p[i+1]+n);p[i+2]=cl(p[i+2]+n);}return pp(c,id);}
function contrast(c,v){var f=(259*(v+255))/(255*(259-v)),id=gp(c),p=id.data;for(var i=0;i<p.length;i+=4){p[i]=cl(f*(p[i]-128)+128);p[i+1]=cl(f*(p[i+1]-128)+128);p[i+2]=cl(f*(p[i+2]-128)+128);}return pp(c,id);}
function saturation(c,v){var s=1+v/100,id=gp(c),p=id.data;for(var i=0;i<p.length;i+=4){var l=0.2126*p[i]+0.7152*p[i+1]+0.0722*p[i+2];p[i]=cl(l+s*(p[i]-l));p[i+1]=cl(l+s*(p[i+1]-l));p[i+2]=cl(l+s*(p[i+2]-l));}return pp(c,id);}
function vibrance(c,v){var s=v/100,id=gp(c),p=id.data;for(var i=0;i<p.length;i+=4){var mx=Math.max(p[i],p[i+1],p[i+2]),avg=(p[i]+p[i+1]+p[i+2])/3,a=((mx-avg)/255)*2*s;p[i]=cl(p[i]-(mx-p[i])*a);p[i+1]=cl(p[i+1]-(mx-p[i+1])*a);p[i+2]=cl(p[i+2]-(mx-p[i+2])*a);}return pp(c,id);}
function temperature(c,v){var id=gp(c),p=id.data,s=Math.abs(v)/100*30,w=v>0;for(var i=0;i<p.length;i+=4){if(w){p[i]=cl(p[i]+s);p[i+2]=cl(p[i+2]-s);}else{p[i]=cl(p[i]-s);p[i+2]=cl(p[i+2]+s);}}return pp(c,id);}
function highlights(c,v){var s=v/200,id=gp(c),p=id.data;for(var i=0;i<p.length;i+=4){var l=(p[i]*.2126+p[i+1]*.7152+p[i+2]*.0722)/255;if(l>0.5){p[i]=cl(p[i]+p[i]*s);p[i+1]=cl(p[i+1]+p[i+1]*s);p[i+2]=cl(p[i+2]+p[i+2]*s);}}return pp(c,id);}
function shadows(c,v){var s=v/200,id=gp(c),p=id.data;for(var i=0;i<p.length;i+=4){var l=(p[i]*.2126+p[i+1]*.7152+p[i+2]*.0722)/255;if(l<0.5){p[i]=cl(p[i]+p[i]*s);p[i+1]=cl(p[i+1]+p[i+1]*s);p[i+2]=cl(p[i+2]+p[i+2]*s);}}return pp(c,id);}
function sepia(c,t){var it=t/100,id=gp(c),p=id.data;for(var i=0;i<p.length;i+=4){var r=p[i],g=p[i+1],b=p[i+2];p[i]=cl(r*(1-.607*it)+g*.769*it+b*.189*it);p[i+1]=cl(r*.349*it+g*(1-.314*it)+b*.168*it);p[i+2]=cl(r*.272*it+g*.534*it+b*(1-.869*it));}return pp(c,id);}
function invert(c){var id=gp(c),p=id.data;for(var i=0;i<p.length;i+=4){p[i]=255-p[i];p[i+1]=255-p[i+1];p[i+2]=255-p[i+2];}return pp(c,id);}
function noise(c,a){var id=gp(c),p=id.data;for(var i=0;i<p.length;i+=4){var n=(Math.random()-.5)*a*2;p[i]=cl(p[i]+n);p[i+1]=cl(p[i+1]+n);p[i+2]=cl(p[i+2]+n);}return pp(c,id);}
function blur(c,r){var d=new OffscreenCanvas(c.width,c.height),ctx=d.getContext('2d');ctx.filter='blur('+Math.max(.1,r)+'px)';ctx.drawImage(c,0,0);ctx.filter='none';return d;}
function sharpen(c,amount,rad){var bl=blur(cp(c),Math.max(.3,rad)),id=gp(c),bid=gp(bl),p=id.data,bp=bid.data,s=amount/100*2.5;for(var i=0;i<p.length;i+=4){for(var ch=0;ch<3;ch++){var diff=p[i+ch]-bp[i+ch];if(Math.abs(diff)>2)p[i+ch]=cl(p[i+ch]+s*diff);}}return pp(c,id);}
function vignette(c,intensity){var ctx=c.getContext('2d'),w=c.width,h=c.height,s=intensity/100,g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.sqrt(w*w+h*h)/2);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.5,'rgba(0,0,0,'+(s*.2)+')');g.addColorStop(1,'rgba(0,0,0,'+(s*.75)+')');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);return c;}
function rotate(c,angle){var r=angle*Math.PI/180,sin=Math.abs(Math.sin(r)),cos=Math.abs(Math.cos(r)),dw=Math.round(c.width*cos+c.height*sin),dh=Math.round(c.width*sin+c.height*cos),d=new OffscreenCanvas(dw,dh),ctx=d.getContext('2d');ctx.translate(dw/2,dh/2);ctx.rotate(r);ctx.drawImage(c,-c.width/2,-c.height/2);return d;}
function flip(c,h,v){var d=new OffscreenCanvas(c.width,c.height),ctx=d.getContext('2d');ctx.translate(h?c.width:0,v?c.height:0);ctx.scale(h?-1:1,v?-1:1);ctx.drawImage(c,0,0);return d;}
function crop(c,x,y,w,h){var cx=Math.max(0,Math.round(x||0)),cy=Math.max(0,Math.round(y||0)),cw=Math.min(c.width-cx,Math.round(w||c.width)),ch=Math.min(c.height-cy,Math.round(h||c.height));if(cw<=0||ch<=0)return c;var d=new OffscreenCanvas(cw,ch);d.getContext('2d').drawImage(c,cx,cy,cw,ch,0,0,cw,ch);return d;}
function border(c,size,color){var nw=c.width+size*2,nh=c.height+size*2,d=new OffscreenCanvas(nw,nh),ctx=d.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,nw,nh);ctx.drawImage(c,size,size);return d;}
function watermark(c,o){var ctx=c.getContext('2d'),w=c.width,h=c.height,text=o.text||'© Pixaroid',fs=parseInt(o.fontSize)||40,col=o.color||'#fff',opa=parseFloat(o.opacity)||50,pos=o.position||'bottom-right';ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,opa/100));ctx.font='bold '+fs+'px Arial,sans-serif';ctx.fillStyle=col;ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=4;var tw=ctx.measureText(text).width,pad=20,tx,ty;switch(pos){case'top-left':tx=pad;ty=pad+fs;break;case'top-right':tx=w-tw-pad;ty=pad+fs;break;case'center':tx=(w-tw)/2;ty=(h+fs)/2;break;case'bottom-left':tx=pad;ty=h-pad;break;default:tx=w-tw-pad;ty=h-pad;}if(o.tile==='true'||o.tile===true){ctx.rotate(-.3);for(var vy=-h;vy<h*2;vy+=fs+80)for(var vx=-w;vx<w*2;vx+=tw+120)ctx.fillText(text,vx,vy);}else ctx.fillText(text,tx,ty);ctx.restore();return c;}
function textOp(c,o){var ctx=c.getContext('2d'),w=c.width,h=c.height,text=o.text||'',fs=parseInt(o.fontSize)||48,col=o.color||'#fff',sw=parseInt(o.strokeWidth)||0,sc=o.strokeColor||'#000';ctx.save();ctx.font=(o.bold!==false?'bold ':'')+fs+'px '+(o.fontFamily||'Arial')+',sans-serif';ctx.fillStyle=col;ctx.textAlign=o.align||'center';ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=5;var tx=o.x!=null?+o.x:(o.align==='center'?w/2:20),ty=o.y!=null?+o.y:h/2+fs/3;if(sw>0){ctx.strokeStyle=sc;ctx.lineWidth=sw;ctx.strokeText(text,tx,ty);}ctx.fillText(text,tx,ty);ctx.restore();return c;}
function memeOp(c,o){var ctx=c.getContext('2d'),w=c.width,h=c.height;var top=(o.topText||'TOP TEXT').toUpperCase(),bot=(o.bottomText||'BOTTOM TEXT').toUpperCase();var fs=parseInt(o.fontSize)||Math.max(24,Math.round(h*.08)),col=o.textColor||'#fff',sc=o.strokeColor||'#000',sw=Math.max(2,Math.round(fs*.07));ctx.save();ctx.font='bold '+fs+'px Impact,"Arial Black",sans-serif';ctx.fillStyle=col;ctx.strokeStyle=sc;ctx.lineWidth=sw;ctx.textAlign='center';ctx.lineJoin='round';var tx=w/2;ctx.strokeText(top,tx,fs+10);ctx.fillText(top,tx,fs+10);ctx.strokeText(bot,tx,h-10);ctx.fillText(bot,tx,h-10);ctx.restore();return c;}
function roundCorners(c,o){var r=Math.max(0,Math.min(50,parseFloat(o.radius)||15)),w=c.width,h=c.height,rx=w*r/100,ry=h*r/100,d=new OffscreenCanvas(w,h),ctx=d.getContext('2d');ctx.beginPath();ctx.moveTo(rx,0);ctx.lineTo(w-rx,0);ctx.quadraticCurveTo(w,0,w,ry);ctx.lineTo(w,h-ry);ctx.quadraticCurveTo(w,h,w-rx,h);ctx.lineTo(rx,h);ctx.quadraticCurveTo(0,h,0,h-ry);ctx.lineTo(0,ry);ctx.quadraticCurveTo(0,0,rx,0);ctx.closePath();ctx.clip();ctx.drawImage(c,0,0);return d;}
