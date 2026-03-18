/* Pixaroid — filter.worker.js — classic script, 20 operations */
'use strict';
var MIME={jpeg:'image/jpeg',jpg:'image/jpeg',png:'image/png',webp:'image/webp',avif:'image/avif'};
function cl(v){return Math.max(0,Math.min(255,Math.round(v)));}

self.onmessage=async function(e){
  var d=e.data;
  try{
    var bm=await getBitmap(d.buffer,d.mime);
    var c=new OffscreenCanvas(bm.width,bm.height);
    c.getContext('2d').drawImage(bm,0,0);
    bm.close();
    var ops=d.operations||[];
    for(var i=0;i<ops.length;i++) c=await op(c,ops[i]);
    var fmt=d.format||'jpeg'; if(fmt==='auto') fmt=d.mime==='image/png'?'png':'jpeg';
    var mime=MIME[fmt]||'image/jpeg';
    var q=Math.max(1,Math.min(100,parseFloat(d.quality)||90))/100;
    var opts=(mime==='image/png')?{type:mime}:{type:mime,quality:q};
    var blob=await c.convertToBlob(opts);
    var _b=blob,_ab=await _b.arrayBuffer();self.postMessage({jobId:jobId:d.jobId,buffer:_ab,mime:_b.type,width:c.width,height:c.height,format:fmt});
  }catch(err){self.postMessage({jobId:d.jobId,error:String(err.message||err)});}
};

async function getBitmap(buf,mime){
  var tries=[mime,'image/jpeg','image/png',''];
  for(var i=0;i<tries.length;i++){try{return await createImageBitmap(tries[i]?new Blob([buf],{type:tries[i]}):new Blob([buf]));}catch(e){}}
  throw new Error('Cannot decode image');
}
function px(c){return c.getContext('2d').getImageData(0,0,c.width,c.height);}
function put(c,id){c.getContext('2d').putImageData(id,0,0);return c;}
function copy(c){var d=new OffscreenCanvas(c.width,c.height);d.getContext('2d').drawImage(c,0,0);return d;}

async function op(c,o){
  switch(o.type){
    case 'brightness':  return brightness(c,o.value||0);
    case 'contrast':    return contrast(c,o.value||0);
    case 'saturation':  return saturation(c,o.value||0);
    case 'grayscale':   return saturation(c,-100);
    case 'vibrance':    return vibrance(c,o.value||0);
    case 'temperature': return temperature(c,o.value||0);
    case 'highlights':  return highlights(c,o.value||0);
    case 'shadows':     return shadows(c,o.value||0);
    case 'sepia':       return sepia(c,o.intensity||80);
    case 'invert':      return invert(c);
    case 'blur':        return blur(c,o.radius||5);
    case 'sharpen':     return sharpen(c,o.amount||50,o.radius||1.5);
    case 'vignette':    return vignette(c,o.intensity||50);
    case 'noise':       return noise(c,o.amount||20);
    case 'denoise':     return blur(c,Math.min(o.strength||1.5,3));
    case 'rotate':      return rotate(c,o.angle||90);
    case 'flip':        return flip(c,o.horizontal||false,o.vertical||false);
    case 'crop':        return crop(c,o.x||0,o.y||0,o.width,o.height);
    case 'border':      return border(c,o.size||10,o.color||'#000000');
    case 'watermark':   return watermark(c,o);
    case 'text':        return textOp(c,o);
    default: return c;
  }
}

function brightness(c,v){var d=v/100*255,id=px(c),p=id.data;for(var i=0;i<p.length;i+=4){p[i]=cl(p[i]+d);p[i+1]=cl(p[i+1]+d);p[i+2]=cl(p[i+2]+d);}return put(c,id);}
function contrast(c,v){var f=(259*(v+255))/(255*(259-v)),id=px(c),p=id.data;for(var i=0;i<p.length;i+=4){p[i]=cl(f*(p[i]-128)+128);p[i+1]=cl(f*(p[i+1]-128)+128);p[i+2]=cl(f*(p[i+2]-128)+128);}return put(c,id);}
function saturation(c,v){var s=1+v/100,id=px(c),p=id.data;for(var i=0;i<p.length;i+=4){var l=0.2126*p[i]+0.7152*p[i+1]+0.0722*p[i+2];p[i]=cl(l+s*(p[i]-l));p[i+1]=cl(l+s*(p[i+1]-l));p[i+2]=cl(l+s*(p[i+2]-l));}return put(c,id);}
function vibrance(c,v){var s=v/100,id=px(c),p=id.data;for(var i=0;i<p.length;i+=4){var mx=Math.max(p[i],p[i+1],p[i+2]),avg=(p[i]+p[i+1]+p[i+2])/3,a=((mx-avg)/255)*2*s;p[i]=cl(p[i]-(mx-p[i])*a);p[i+1]=cl(p[i+1]-(mx-p[i+1])*a);p[i+2]=cl(p[i+2]-(mx-p[i+2])*a);}return put(c,id);}
function temperature(c,v){var id=px(c),p=id.data,s=Math.abs(v)/100*30,w=v>0;for(var i=0;i<p.length;i+=4){if(w){p[i]=cl(p[i]+s);p[i+2]=cl(p[i+2]-s);}else{p[i]=cl(p[i]-s);p[i+2]=cl(p[i+2]+s);}}return put(c,id);}
function highlights(c,v){var s=v/200,id=px(c),p=id.data;for(var i=0;i<p.length;i+=4){var l=(p[i]*0.2126+p[i+1]*0.7152+p[i+2]*0.0722)/255;if(l>0.5){p[i]=cl(p[i]+p[i]*s);p[i+1]=cl(p[i+1]+p[i+1]*s);p[i+2]=cl(p[i+2]+p[i+2]*s);}}return put(c,id);}
function shadows(c,v){var s=v/200,id=px(c),p=id.data;for(var i=0;i<p.length;i+=4){var l=(p[i]*0.2126+p[i+1]*0.7152+p[i+2]*0.0722)/255;if(l<0.5){p[i]=cl(p[i]+p[i]*s);p[i+1]=cl(p[i+1]+p[i+1]*s);p[i+2]=cl(p[i+2]+p[i+2]*s);}}return put(c,id);}
function sepia(c,t){var it=t/100,id=px(c),p=id.data;for(var i=0;i<p.length;i+=4){var r=p[i],g=p[i+1],b=p[i+2];p[i]=cl(r*(1-0.607*it)+g*0.769*it+b*0.189*it);p[i+1]=cl(r*0.349*it+g*(1-0.314*it)+b*0.168*it);p[i+2]=cl(r*0.272*it+g*0.534*it+b*(1-0.869*it));}return put(c,id);}
function invert(c){var id=px(c),p=id.data;for(var i=0;i<p.length;i+=4){p[i]=255-p[i];p[i+1]=255-p[i+1];p[i+2]=255-p[i+2];}return put(c,id);}
function noise(c,a){var id=px(c),p=id.data;for(var i=0;i<p.length;i+=4){var n=(Math.random()-0.5)*a*2;p[i]=cl(p[i]+n);p[i+1]=cl(p[i+1]+n);p[i+2]=cl(p[i+2]+n);}return put(c,id);}
function blur(c,r){var d=new OffscreenCanvas(c.width,c.height),ctx=d.getContext('2d');ctx.filter='blur('+Math.max(0.1,r)+'px)';ctx.drawImage(c,0,0);ctx.filter='none';return d;}
function sharpen(c,amount,rad){
  var bl=blur(copy(c),Math.max(0.3,rad));
  var id=px(c),bid=px(bl),p=id.data,bp=bid.data,s=amount/100*2.5;
  for(var i=0;i<p.length;i+=4){for(var ch=0;ch<3;ch++){var diff=p[i+ch]-bp[i+ch];if(Math.abs(diff)>2)p[i+ch]=cl(p[i+ch]+s*diff);}}
  return put(c,id);
}
function vignette(c,intensity){var ctx=c.getContext('2d'),w=c.width,h=c.height,s=intensity/100;var g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.sqrt(w*w+h*h)/2);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(0.5,'rgba(0,0,0,'+(s*0.2)+')');g.addColorStop(1,'rgba(0,0,0,'+(s*0.75)+')');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);return c;}
function rotate(c,angle){var r=angle*Math.PI/180,sin=Math.abs(Math.sin(r)),cos=Math.abs(Math.cos(r)),dw=Math.round(c.width*cos+c.height*sin),dh=Math.round(c.width*sin+c.height*cos);var d=new OffscreenCanvas(dw,dh),ctx=d.getContext('2d');ctx.translate(dw/2,dh/2);ctx.rotate(r);ctx.drawImage(c,-c.width/2,-c.height/2);return d;}
function flip(c,h,v){var d=new OffscreenCanvas(c.width,c.height),ctx=d.getContext('2d');ctx.translate(h?c.width:0,v?c.height:0);ctx.scale(h?-1:1,v?-1:1);ctx.drawImage(c,0,0);return d;}
function crop(c,x,y,w,h){var cx=Math.max(0,Math.round(x||0)),cy=Math.max(0,Math.round(y||0)),cw=Math.min(c.width-cx,Math.round(w||c.width)),ch=Math.min(c.height-cy,Math.round(h||c.height));if(cw<=0||ch<=0)return c;var d=new OffscreenCanvas(cw,ch);d.getContext('2d').drawImage(c,cx,cy,cw,ch,0,0,cw,ch);return d;}
function border(c,size,color){var nw=c.width+size*2,nh=c.height+size*2,d=new OffscreenCanvas(nw,nh),ctx=d.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,nw,nh);ctx.drawImage(c,size,size);return d;}
function watermark(c,o){var ctx=c.getContext('2d'),w=c.width,h=c.height;var text=o.text||'© Pixaroid',fs=parseInt(o.fontSize)||40,col=o.color||'#ffffff',opa=parseFloat(o.opacity)||50,pos=o.position||'bottom-right';ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,opa/100));ctx.font='bold '+fs+'px Arial,sans-serif';ctx.fillStyle=col;ctx.shadowColor='rgba(0,0,0,0.5)';ctx.shadowBlur=4;var tw=ctx.measureText(text).width,pad=20,tx,ty;switch(pos){case'top-left':tx=pad;ty=pad+fs;break;case'top-right':tx=w-tw-pad;ty=pad+fs;break;case'center':tx=(w-tw)/2;ty=(h+fs)/2;break;case'bottom-left':tx=pad;ty=h-pad;break;default:tx=w-tw-pad;ty=h-pad;}if(o.tile==='true'||o.tile===true){ctx.rotate(-0.3);for(var vy=-h;vy<h*2;vy+=fs+80)for(var vx=-w;vx<w*2;vx+=tw+120)ctx.fillText(text,vx,vy);}else ctx.fillText(text,tx,ty);ctx.restore();return c;}
function textOp(c,o){var ctx=c.getContext('2d'),w=c.width,h=c.height,text=o.text||'',fs=parseInt(o.fontSize)||48,col=o.color||'#ffffff',sw=parseInt(o.strokeWidth)||0,sc=o.strokeColor||'#000000';ctx.save();ctx.font=(o.bold!==false?'bold ':'')+fs+'px '+(o.fontFamily||'Arial')+',sans-serif';ctx.fillStyle=col;ctx.textAlign=o.align||'center';ctx.shadowColor='rgba(0,0,0,0.4)';ctx.shadowBlur=5;var tx=o.x!=null?+o.x:(o.align==='center'?w/2:20),ty=o.y!=null?+o.y:h/2+fs/3;if(sw>0){ctx.strokeStyle=sc;ctx.lineWidth=sw;ctx.strokeText(text,tx,ty);}ctx.fillText(text,tx,ty);ctx.restore();return c;}
