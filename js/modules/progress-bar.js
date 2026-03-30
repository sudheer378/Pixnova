/**
 * Pixaroid — Progress Bar  v2.0
 * Animated fill, label, estimated time, indeterminate mode.
 */
'use strict';

export class ProgressBar {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.container
   * @param {string}  [opts.fillColor]
   * @param {boolean} [opts.showLabel]
   * @param {boolean} [opts.showETA]
   */
  constructor({ container, fillColor='#4F46E5', showLabel=true, showETA=false }) {
    this.container = container;
    this._startTime = null;
    this._current   = 0;

    container.innerHTML = `
      <div class="pb-track" style="height:5px;border-radius:999px;background:var(--border,#E5E7EB);overflow:hidden;">
        <div class="pb-fill" style="height:100%;width:0%;background:${fillColor};border-radius:999px;transition:width .3s ease;"></div>
      </div>
      ${showLabel ? '<div class="pb-label" style="font-size:.8125rem;color:var(--muted,#6B7280);margin-top:.375rem;"></div>' : ''}
      ${showETA   ? '<div class="pb-eta"   style="font-size:.75rem;color:var(--muted,#6B7280);"></div>' : ''}
    `;
    this._fill  = container.querySelector('.pb-fill');
    this._label = container.querySelector('.pb-label');
    this._eta   = container.querySelector('.pb-eta');
  }

  /** Set progress 0-100 */
  set(pct, label='') {
    const p = Math.max(0, Math.min(100, Math.round(pct)));
    this._current = p;
    if (!this._startTime && p > 0) this._startTime = Date.now();
    this._fill.style.width = p + '%';
    if (this._label) this._label.textContent = label || (p < 100 ? `Processing… ${p}%` : 'Done!');
    if (this._eta && this._startTime && p > 5 && p < 100) {
      const elapsed = (Date.now()-this._startTime)/1000;
      const eta     = Math.round(elapsed/p*(100-p));
      this._eta.textContent = eta > 1 ? `~${eta}s remaining` : '';
    }
    if (p === 100) { if (this._eta) this._eta.textContent = ''; }
  }

  /** Tick up automatically (simulated progress) */
  simulate(targetPct=88, intervalMs=180, stepMax=12) {
    this._startTime = Date.now();
    this._interval  = setInterval(() => {
      const gap  = targetPct - this._current;
      const step = Math.random() * Math.min(stepMax, gap * 0.25);
      this.set(Math.min(targetPct, this._current + step));
    }, intervalMs);
  }

  /** Stop simulation and set to 100 */
  complete(label='Done!') {
    clearInterval(this._interval);
    this.set(100, label);
  }

  /** Reset */
  reset() {
    clearInterval(this._interval);
    this._current   = 0;
    this._startTime = null;
    this._fill.style.transition = 'none';
    this._fill.style.width = '0%';
    setTimeout(() => { this._fill.style.transition = 'width .3s ease'; }, 50);
    if (this._label) this._label.textContent = '';
    if (this._eta)   this._eta.textContent   = '';
  }

  /** Indeterminate loading stripe */
  indeterminate(on=true) {
    if (on) {
      this._fill.style.width = '100%';
      this._fill.style.backgroundImage = 'linear-gradient(90deg,#4F46E5 25%,#8B5CF6 50%,#4F46E5 75%)';
      this._fill.style.backgroundSize  = '200% 100%';
      this._fill.style.animation       = 'pb-stripe 1.5s linear infinite';
      if (!document.getElementById('pb-style')) {
        const s = document.createElement('style');
        s.id = 'pb-style';
        s.textContent = '@keyframes pb-stripe{0%{background-position:200% 0}100%{background-position:0% 0}}';
        document.head.appendChild(s);
      }
    } else {
      this._fill.style.animation = '';
      this._fill.style.backgroundImage = '';
    }
  }
}
