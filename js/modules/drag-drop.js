/**
 * Pixaroid — Drag & Drop  v2.0
 * Reusable drag-drop zone with visual feedback, multi-file,
 * type filtering, page-level drop guard.
 */
'use strict';

export class DragDrop {
  constructor({ zone, onDrop, accept=[], multiple=false, highlight=true }) {
    this.zone      = zone;
    this.onDrop    = onDrop;
    this.accept    = new Set(accept);
    this.multiple  = multiple;
    this.highlight = highlight;
    this._depth    = 0;
    this._bind();
  }

  _bind() {
    const z = this.zone;
    z.addEventListener('dragenter', e => { e.preventDefault(); this._depth++; if (this.highlight) z.classList.add('drag-over'); });
    z.addEventListener('dragleave', () => { this._depth--; if (!this._depth && this.highlight) z.classList.remove('drag-over'); });
    z.addEventListener('dragover',  e => { e.preventDefault(); e.dataTransfer.dropEffect='copy'; });
    z.addEventListener('drop', e => {
      e.preventDefault(); this._depth=0;
      if (this.highlight) z.classList.remove('drag-over');
      const files = this._filter(Array.from(e.dataTransfer.files||[]));
      if (files.length) this.onDrop(this.multiple ? files : [files[0]]);
    });

    // Prevent browser from opening files dropped outside the zone
    document.addEventListener('dragover',  e => { if (!z.contains(e.target)) e.preventDefault(); }, true);
    document.addEventListener('drop',      e => { if (!z.contains(e.target)) e.preventDefault(); }, true);
  }

  _filter(files) {
    if (!this.accept.size) return files;
    return files.filter(f => this.accept.has(f.type) || this.accept.has('image/*') && f.type.startsWith('image/'));
  }

  destroy() {
    const clone = this.zone.cloneNode(true);
    this.zone.parentNode?.replaceChild(clone, this.zone);
  }
}
