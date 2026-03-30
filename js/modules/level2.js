/**
 * Pixaroid Level 2 — Shared Enhancement Module
 * Adds: touch support, confetti, comparison slider, back-to-top, share, mobile nav
 */
(function(){
'use strict';

/* ── CONFETTI ──────────────────────────────────────── */
window.pxConfetti = function(opts){
  var canvas=document.createElement('canvas');
  canvas.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);
  var ctx=canvas.getContext('2d');
  canvas.width=innerWidth;canvas.height=innerHeight;
  var colors=['#7C6FFF','#FF3CAC','#22D67A','#FFB02E','#14D9C4','#F87171','#60A5FA'];
  var particles=[];
  var count=opts&&opts.count||80;
  for(var i=0;i<count;i++){
    particles.push({
      x:Math.random()*canvas.width,y:-10,
      w:Math.random()*10+4,h:Math.random()*6+3,
      color:colors[Math.floor(Math.random()*colors.length)],
      rotation:Math.random()*360,
      speed:Math.random()*3+1.5,
      drift:(Math.random()-0.5)*2,
      rotSpeed:(Math.random()-0.5)*8,
      opacity:1
    });
  }
  var frame=0,maxFrames=120;
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    frame++;
    particles.forEach(function(p){
      p.y+=p.speed;p.x+=p.drift;p.rotation+=p.rotSpeed;
      if(frame>maxFrames*0.6) p.opacity=Math.max(0,p.opacity-(1/(maxFrames*0.4)));
      ctx.save();ctx.globalAlpha=p.opacity;
      ctx.translate(p.x,p.y);ctx.rotate(p.rotation*Math.PI/180);
      ctx.fillStyle=p.color;ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      ctx.restore();
    });
    if(frame<maxFrames) requestAnimationFrame(draw);
    else canvas.remove();
  }
  draw();
};

/* ── TOUCH → DRAG-DROP ─────────────────────────────── */
window.pxAddTouch = function(dropzone, onFile){
  if(!dropzone) return;
  dropzone.addEventListener('touchstart',function(e){dropzone.style.background='rgba(124,111,255,.12)';},false);
  dropzone.addEventListener('touchend',function(e){dropzone.style.background='';},false);
  // Native file input handles touch tap via label - no extra work needed
  // Add touch-specific paste hint
  var hint = dropzone.querySelector('.dh,.dz-hint');
  if(hint && !/touch/i.test(hint.textContent)){
    hint.textContent = 'Tap to browse or long-press to paste';
  }
};

/* ── BACK TO TOP ───────────────────────────────────── */
(function(){
  var btn = document.createElement('button');
  btn.id='btt';
  btn.setAttribute('aria-label','Back to top');
  btn.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>';
  btn.style.cssText='position:fixed;bottom:5rem;right:1.25rem;width:40px;height:40px;border-radius:50%;background:rgba(124,111,255,.85);backdrop-filter:blur(8px);border:1px solid rgba(124,111,255,.4);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;transform:translateY(8px);transition:opacity .25s,transform .25s;z-index:90;box-shadow:0 4px 16px rgba(124,111,255,.35);';
  document.body.appendChild(btn);
  window.addEventListener('scroll',function(){
    var show=window.scrollY>400;
    btn.style.opacity=show?'1':'0';
    btn.style.transform=show?'translateY(0)':'translateY(8px)';
    btn.style.pointerEvents=show?'all':'none';
  },{passive:true});
  btn.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'});});
})();

/* ── MOBILE NAV TOGGLE ─────────────────────────────── */
(function(){
  var nav = document.querySelector('nav.tn,.nav,nav.nav');
  if(!nav) return;
  var links = nav.querySelector('.nl,.nav-links,.nl');
  if(!links) return;
  // Check if mobile menu btn already exists
  if(document.getElementById('mob-menu-btn')) return;
  var btn=document.createElement('button');
  btn.id='mob-menu-btn';
  btn.setAttribute('aria-label','Menu');
  btn.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  btn.style.cssText='display:none;width:36px;height:36px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:currentColor;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;';
  var ni=nav.querySelector('.ni,.nav-inner,.gni');
  if(ni) ni.insertBefore(btn,ni.lastElementChild);
  
  // Mobile dropdown
  var drawer=document.createElement('div');
  drawer.style.cssText='display:none;position:absolute;top:100%;left:0;right:0;background:rgba(7,7,17,.97);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.1);padding:.75rem 1.25rem;z-index:199;';
  nav.style.position='sticky';nav.style.zIndex='300';
  nav.appendChild(drawer);
  
  // Clone nav links into drawer
  Array.from(links.querySelectorAll('a')).forEach(function(a){
    var clone=a.cloneNode(true);
    clone.style.cssText='display:block;padding:.625rem .5rem;font-size:.9375rem;color:rgba(255,255,255,.8);border-bottom:1px solid rgba(255,255,255,.06);';
    drawer.appendChild(clone);
  });
  
  var open=false;
  function updateVisibility(){
    var mobile=window.innerWidth<=768;
    btn.style.display=mobile?'flex':'none';
    links.style.display=mobile?'none':'';
    if(!mobile){drawer.style.display='none';open=false;}
  }
  updateVisibility();
  window.addEventListener('resize',updateVisibility,{passive:true});
  btn.addEventListener('click',function(){
    open=!open;drawer.style.display=open?'block':'none';
    btn.innerHTML=open
      ?'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
      :'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  });
  document.addEventListener('click',function(e){if(open&&!nav.contains(e.target)){open=false;drawer.style.display='none';}});
})();

/* ── LAZY LOAD IMAGES ──────────────────────────────── */
if('IntersectionObserver' in window){
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){
        var img=e.target;
        if(img.dataset.src){img.src=img.dataset.src;delete img.dataset.src;}
        io.unobserve(img);
      }
    });
  },{rootMargin:'200px'});
  document.querySelectorAll('img[data-src]').forEach(function(img){io.observe(img);});
}

/* ── SMOOTH SCROLL REVEAL ──────────────────────────── */
if('IntersectionObserver' in window){
  var revealIO=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){
        e.target.style.opacity='1';
        e.target.style.transform='translateY(0)';
        revealIO.unobserve(e.target);
      }
    });
  },{threshold:0.1,rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.hst,.feat,.sec,.card').forEach(function(el,i){
    el.style.opacity='0';el.style.transform='translateY(20px)';
    el.style.transition='opacity .5s ease '+(i*0.06)+'s, transform .5s ease '+(i*0.06)+'s';
    revealIO.observe(el);
  });
}

/* ── COPY TO CLIPBOARD ─────────────────────────────── */
window.pxCopy = function(text,btn){
  navigator.clipboard.writeText(text).then(function(){
    var orig=btn.innerHTML;
    btn.innerHTML='✓ Copied!';
    setTimeout(function(){btn.innerHTML=orig;},2000);
  }).catch(function(){});
};

})();
