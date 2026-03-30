/**
 * Pixaroid — Download Manager  v2.0
 * Single file, ZIP bundle, filename sanitisation, format detection.
 */
'use strict';

const EXT_MAP = {
  'image/jpeg':'jpg','image/png':'png','image/webp':'webp',
  'image/gif':'gif','image/avif':'avif','image/bmp':'bmp',
  'image/tiff':'tiff','text/plain':'txt','application/pdf':'pdf',
  'application/zip':'zip',
};

export class DownloadManager {
  /**
   * Download a single Blob.
   * @param {Blob}   blob
   * @param {string} [suggestedName]
   * @param {string} [prefix]        — filename prefix e.g. 'pixaroid-compressed'
   */
  static download(blob, suggestedName='', prefix='pixaroid') {
    const ext  = EXT_MAP[blob?.type] || 'jpg';
    const base = suggestedName
      ? suggestedName.replace(/\.[^.]+$/, '')
      : `${prefix}-${Date.now()}`;
    const filename = `${sanitise(base)}.${ext}`;
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href:url, download:filename });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 90_000);
    return filename;
  }

  /**
   * Bundle multiple Blobs into a ZIP and download.
   * Dynamically loads JSZip from CDN if not already loaded.
   * @param {Array<{blob:Blob, filename:string}>} files
   * @param {string} zipName
   */
  static async downloadZIP(files, zipName='pixaroid-images') {
    if (!files?.length) return;
    // Single file — skip ZIP
    if (files.length === 1) {
      return DownloadManager.download(files[0].blob, files[0].filename);
    }
    // Load JSZip
    if (!window.JSZip) {
      await new Promise((res,rej) => {
        const s = document.createElement('script');
        s.src    = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    const zip = new window.JSZip();
    const names = new Set();
    for (const { blob, filename } of files) {
      const ext  = EXT_MAP[blob.type] || 'jpg';
      let   base = sanitise(filename.replace(/\.[^.]+$/,'') || 'image');
      let   name = `${base}.${ext}`, n=1;
      while (names.has(name)) name = `${base}-${++n}.${ext}`;
      names.add(name);
      zip.file(name, blob);
    }
    const zipBlob = await zip.generateAsync({ type:'blob', compression:'DEFLATE', compressionOptions:{ level:6 } });
    DownloadManager.download(zipBlob, zipName, '');
    return `${zipName}.zip`;
  }

  /**
   * Copy text to clipboard.
   */
  static async copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch { /* fallback */ }
    const ta = Object.assign(document.createElement('textarea'), { value:text, style:'position:fixed;opacity:0' });
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }

  /**
   * Suggest an output filename based on input name + operation.
   */
  static suggestName(originalName='', operation='processed', format='') {
    const base = sanitise(originalName.replace(/\.[^.]+$/, '') || 'image');
    const ext  = format || originalName.split('.').pop() || 'jpg';
    return `${base}-${operation}.${ext}`;
  }
}

function sanitise(s) {
  return (s||'').replace(/[<>:"/\\|?*\x00-\x1f]/g,'').trim().replace(/\s+/g,'-').slice(0,80) || 'image';
}
