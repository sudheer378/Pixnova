/**
 * Pixaroid — File Handler  v2.0
 * Drag-drop, click-to-browse, clipboard paste, URL fetch,
 * multi-file support, type validation, preview thumbnails.
 */
'use strict';

import { validateFile, formatBytes, MAX_FILE_SIZE_BYTES } from '/js/engine.js';

const ACCEPTED_TYPES = [
  'image/jpeg','image/png','image/webp','image/heic','image/heif',
  'image/gif','image/bmp','image/tiff','image/avif',
];

export class FileHandler {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.dropzone
   * @param {HTMLInputElement} opts.input
   * @param {function} opts.onFile   — called with File on single pick
   * @param {function} opts.onFiles  — called with File[] on multi pick
   * @param {function} opts.onError  — called with error string
   * @param {boolean}  opts.multiple — allow multiple files
   * @param {string[]} opts.accept   — MIME types to accept
   */
  constructor({ dropzone, input, onFile, onFiles, onError, multiple=false, accept=ACCEPTED_TYPES }) {
    this.dropzone  = dropzone;
    this.input     = input;
    this.onFile    = onFile   || (() => {});
    this.onFiles   = onFiles  || (() => {});
    this.onError   = onError  || (msg => console.warn('[FileHandler]', msg));
    this.multiple  = multiple;
    this.accept    = accept;
    this._init();
  }

  _init() {
    const dz = this.dropzone;
    if (!dz) return;

    // Drag events
    dz.addEventListener('dragenter', e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragover',  e => { e.preventDefault(); e.dataTransfer.dropEffect='copy'; dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', e => { if (!dz.contains(e.relatedTarget)) dz.classList.remove('drag-over'); });
    dz.addEventListener('drop',      e => { e.preventDefault(); dz.classList.remove('drag-over'); this._handleDataTransfer(e.dataTransfer); });

    // Click to browse
    dz.addEventListener('click',  () => this.input?.click());
    dz.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') this.input?.click(); });
    dz.setAttribute('tabindex','0'); dz.setAttribute('role','button');

    // Input change
    if (this.input) {
      if (this.multiple) this.input.multiple = true;
      this.input.accept = this.accept.join(',');
      this.input.addEventListener('change', e => {
        const files = Array.from(e.target.files||[]);
        if (files.length) this._processFiles(files);
        e.target.value = '';
      });
    }

    // Clipboard paste
    document.addEventListener('paste', e => {
      const items = Array.from(e.clipboardData?.items||[]);
      const imageItems = items.filter(it => it.type.startsWith('image/'));
      if (imageItems.length) {
        e.preventDefault();
        const files = imageItems.map(it => it.getAsFile()).filter(Boolean);
        if (files.length) this._processFiles(files);
      }
    });
  }

  _handleDataTransfer(dt) {
    // Handle URL drops (e.g. dragging image from browser)
    const url = dt.getData('text/uri-list') || dt.getData('text/plain');
    if (url && !dt.files?.length && url.match(/^https?:\/\//)) {
      this.fetchFromURL(url); return;
    }
    const files = Array.from(dt.files||[]);
    if (files.length) this._processFiles(files);
  }

  _processFiles(files) {
    const valid = [], errors = [];
    for (const f of files) {
      const v = validateFile(f, { maxBytes: MAX_FILE_SIZE_BYTES });
      if (v.ok) valid.push(f);
      else errors.push(`${f.name}: ${v.error}`);
    }
    if (errors.length) this.onError(errors.join('\n'));
    if (!valid.length) return;
    if (this.multiple) {
      this.onFiles(valid);
    } else {
      this.onFile(valid[0]);
      if (valid.length > 1) this.onError('Only the first file was used. Use a bulk tool for multiple files.');
    }
  }

  /** Fetch an image from a remote URL (CORS-permitting) */
  async fetchFromURL(url) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      if (!blob.type.startsWith('image/')) throw new Error('URL does not point to an image.');
      const filename = url.split('/').pop().split('?')[0] || 'image.jpg';
      const file = new File([blob], filename, { type: blob.type });
      this._processFiles([file]);
    } catch(e) {
      this.onError(`Could not fetch image from URL: ${e.message}`);
    }
  }

  /** Read a file as base64 data URL */
  static readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload  = e => resolve(e.target.result);
      r.onerror = () => reject(new Error('Failed to read file'));
      r.readAsDataURL(file);
    });
  }

  /** Read a file as ArrayBuffer */
  static readAsBuffer(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload  = e => resolve(e.target.result);
      r.onerror = () => reject(new Error('Failed to read file'));
      r.readAsArrayBuffer(file);
    });
  }

  /** Generate a thumbnail data URL (max 120px) */
  static async thumbnail(file, maxSize=120) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const { naturalWidth:w, naturalHeight:h } = img;
        const scale = Math.min(1, maxSize/Math.max(w,h));
        const c = document.createElement('canvas');
        c.width  = Math.round(w*scale);
        c.height = Math.round(h*scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Thumbnail failed')); };
      img.src = url;
    });
  }

  /** Destroy all event listeners */
  destroy() {
    const clone = this.dropzone?.cloneNode(true);
    if (clone && this.dropzone?.parentNode) this.dropzone.parentNode.replaceChild(clone, this.dropzone);
  }
}
