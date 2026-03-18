/**
 * Pixaroid — Preview Module  v2.0
 * Before/after comparison with slider, zoom, metadata overlay.
 */
'use strict';

import { formatBytes } from '/js/engine.js';

export class PreviewPanel {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.container
   * @param {boolean} [opts.slider]    — enable drag comparison slider
   * @param {boolean} [opts.zoom]      — enable click-to-zoom
   * @param {boolean} [opts.stats]     — show file size stats
   */
  constructor({ container, slider=true, zoom=true, stats=true }) {
    this.container = container;
    this._slider   = slider;
    this._zoom     = zoom;
    this._showStats= stats;
    this._build();
  }

  _build() {
    this.container.innerHTML = `
      <div class="pv-wrap" style="position:relative;border:1px solid var(--border,#E5E7EB);border-radius:.875rem;overflow:hidden;background:repeating-conic-gradient(#e5e7eb 0% 25%,transparent 0% 50%) 0 0/20px 20px;min-height:160px;">
        <img class="pv-original" style="width:100%;display:block;max-height:320px;object-fit:contain;" alt="Original" />
        <div class="pv-result-clip" style="position:absolute;top:0;left:0;width:50%;height:100%;overflow:hidden;display:none;">
          <img class="pv-result" style="width:100%;max-height:320px;object-fit:contain;transform:none;" alt="Result" />
        </div>
        <div class="pv-divider" style="display:none;position:absolute;top:0;left:50%;width:2px;height:100%;background:#4F46E5;cursor:ew-resize;z-index:10;">
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:28px;height:28px;border-radius:50%;background:#4F46E5;display:flex;align-items:center;justify-content:center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
        <div class="pv-badge-orig" style="display:none;position:absolute;top:.5rem;left:.5rem;padding:.25rem .625rem;border-radius:999px;background:rgba(0,0,0,.55);color:#fff;font-size:.7rem;font-weight:600;">ORIGINAL</div>
        <div class="pv-badge-result" style="display:none;position:absolute;top:.5rem;right:.5rem;padding:.25rem .625rem;border-radius:999px;background:rgba(79,70,229,.85);color:#fff;font-size:.7rem;font-weight:600;">RESULT</div>
      </div>
      <div class="pv-stats" style="display:flex;gap:.625rem;flex-wrap:wrap;margin-top:.625rem;"></div>
    `;
    this._imgOrig   = this.container.querySelector('.pv-original');
    this._imgResult = this.container.querySelector('.pv-result');
    this._clip      = this.container.querySelector('.pv-result-clip');
    this._divider   = this.container.querySelector('.pv-divider');
    this._statsEl   = this.container.querySelector('.pv-stats');
    this._badgeO    = this.container.querySelector('.pv-badge-orig');
    this._badgeR    = this.container.querySelector('.pv-badge-result');
    if (this._zoom) this._initZoom();
  }

  /**
   * Set original image from File or data URL.
   * @param {File|string} source
   * @param {object} [meta] — { size, width, height, format }
   */
  async setOriginal(source, meta={}) {
    const url = typeof source === 'string' ? source : URL.createObjectURL(source);
    this._origURL   = url;
    this._origMeta  = meta;
    this._imgOrig.src = url;
    if (meta.size) this._updateStats();
  }

  /**
   * Set result Blob and show comparison.
   * @param {Blob}   blob
   * @param {object} [meta] — { originalSize, resultSize, savings, width, height, format }
   */
  async setResult(blob, meta={}) {
    const url = URL.createObjectURL(blob);
    this._resultURL  = url;
    this._resultMeta = meta;
    this._imgResult.src = url;
    if (this._imgResult.parentElement) {
      this._imgResult.style.width = `${1/(meta.sliderPct??0.5)*100}%`;
    }
    this._clip.style.display    = 'block';
    this._divider.style.display = 'block';
    this._badgeO.style.display  = 'block';
    this._badgeR.style.display  = 'block';
    if (this._slider) this._initSlider();
    if (this._showStats) this._updateStats(meta);
  }

  _updateStats(meta={}) {
    const chips = [];
    if (meta.originalSize) chips.push(`<span style="padding:.25rem .625rem;border-radius:999px;background:var(--bg,#F9FAFB);border:1px solid var(--border,#E5E7EB);font-size:.75rem;">Before: ${formatBytes(meta.originalSize)}</span>`);
    if (meta.resultSize)   chips.push(`<span style="padding:.25rem .625rem;border-radius:999px;background:rgba(16,185,129,.1);color:#059669;font-weight:600;font-size:.75rem;">After: ${formatBytes(meta.resultSize)}</span>`);
    if (meta.savings>0)    chips.push(`<span style="padding:.25rem .625rem;border-radius:999px;background:rgba(16,185,129,.15);color:#059669;font-weight:700;font-size:.75rem;">↓ ${meta.savings}% smaller</span>`);
    if (meta.width&&meta.height) chips.push(`<span style="padding:.25rem .625rem;border-radius:999px;background:var(--bg,#F9FAFB);border:1px solid var(--border,#E5E7EB);font-size:.75rem;">${meta.width}×${meta.height}</span>`);
    this._statsEl.innerHTML = chips.join('');
  }

  _initSlider() {
    const wrap = this.container.querySelector('.pv-wrap');
    const div  = this._divider;
    let dragging = false;
    const move = (x) => {
      const rect = wrap.getBoundingClientRect();
      const pct  = Math.max(5, Math.min(95, ((x-rect.left)/rect.width)*100));
      div.style.left = pct+'%';
      this._clip.style.width = pct+'%';
      this._imgResult.style.width = (100/pct*100)+'%';
    };
    div.addEventListener('mousedown',  () => { dragging=true; });
    div.addEventListener('touchstart', () => { dragging=true; }, { passive:true });
    document.addEventListener('mousemove', e => { if (dragging) move(e.clientX); });
    document.addEventListener('touchmove', e => { if (dragging) move(e.touches[0].clientX); }, { passive:true });
    document.addEventListener('mouseup',  () => { dragging=false; });
    document.addEventListener('touchend', () => { dragging=false; });
  }

  _initZoom() {
    const wrap = this.container.querySelector('.pv-wrap');
    wrap.style.cursor = 'zoom-in';
    wrap.addEventListener('click', () => {
      const src = this._resultURL || this._origURL;
      if (!src) return;
      const overlay = document.createElement('div');
      Object.assign(overlay.style, { position:'fixed',inset:'0',background:'rgba(0,0,0,.85)',zIndex:'9998',display:'flex',alignItems:'center',justifyContent:'center',cursor:'zoom-out' });
      const img = document.createElement('img');
      Object.assign(img.style, { maxWidth:'95vw',maxHeight:'92vh',objectFit:'contain',borderRadius:'.5rem',boxShadow:'0 20px 80px rgba(0,0,0,.5)' });
      img.src = src;
      overlay.appendChild(img);
      overlay.addEventListener('click', () => overlay.remove());
      document.body.appendChild(overlay);
    });
  }

  /** Reset to empty state */
  reset() {
    this._imgOrig.src   = '';
    this._imgResult.src = '';
    this._clip.style.display    = 'none';
    this._divider.style.display = 'none';
    this._badgeO.style.display  = 'none';
    this._badgeR.style.display  = 'none';
    this._statsEl.innerHTML     = '';
    if (this._origURL)  URL.revokeObjectURL(this._origURL);
    if (this._resultURL)URL.revokeObjectURL(this._resultURL);
    this._origURL = this._resultURL = null;
  }
}
