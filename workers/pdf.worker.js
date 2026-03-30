/* Pixaroid — pdf.worker.js v1
   Handles: pdf-create (image→PDF), pdf-extract (PDF→images), pdf-compress, pdf-merge, pdf-split, pdf-rotate, pdf-watermark
   Uses PDF.js for reading + pdf-lib for writing
   Classic script — no ES modules
*/
'use strict';

var PDF_LIB_LOADED = false;
var PDFJS_LOADED = false;

self.onmessage = async function(e) {
  var d = e.data, jid = d.jobId;
  try {
    var r;
    if      (d.op === 'pdf-create')   r = await pdfCreate(d);
    else if (d.op === 'pdf-extract')  r = await pdfExtract(d);
    else if (d.op === 'pdf-compress') r = await pdfCompress(d);
    else if (d.op === 'pdf-merge')    r = await pdfMerge(d);
    else if (d.op === 'pdf-split')    r = await pdfSplit(d);
    else if (d.op === 'pdf-rotate')   r = await pdfRotate(d);
    else if (d.op === 'pdf-watermark')r = await pdfWatermark(d);
    else if (d.op === 'pdf-ocr')      r = await pdfOCR(d);
    else throw new Error('Unknown PDF op: ' + d.op);
    
    var ab = blobBuf(r.blob);
    if (ab && ab.byteLength > 0) {
      self.postMessage({jobId:jid, buffer:ab, mime:r.blob.type, format:r.fmt, pages:r.pages||1, isZip:r.isZip||false});
    } else {
      self.postMessage({jobId:jid, blob:r.blob, format:r.fmt, pages:r.pages||1});
    }
  } catch(err) {
    self.postMessage({jobId:jid, error:String(err.message||err)});
  }
};

function blobBuf(b) { try { return new FileReaderSync().readAsArrayBuffer(b); } catch(e) { return null; } }
function prog(n) { self.postMessage({type:'progress', percent:Math.round(n)}); }

async function loadPdfLib() {
  if (PDF_LIB_LOADED) return;
  importScripts('https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js');
  PDF_LIB_LOADED = true;
}
async function loadPdfJs() {
  if (PDFJS_LOADED) return;
  importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
  // eslint-disable-next-line no-undef
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  PDFJS_LOADED = true;
}

/* ── PDF CREATE: images → PDF ─────────────────────────────── */
async function pdfCreate(d) {
  await loadPdfLib();
  prog(10);
  // eslint-disable-next-line no-undef
  var { PDFDocument, rgb } = PDFLib;
  var pdfDoc = await PDFDocument.create();
  var images = d.images || [{ buffer: d.buffer, mime: d.mime }];
  var pageSize = d.pageSize || 'A4';
  var landscape = d.orientation === 'Landscape';
  var margin = parseInt(d.margin) || 10;
  var quality = parseInt(d.quality) || 90;

  var PAGE_SIZES = {
    'A4':     [595.28, 841.89],
    'Letter': [612,    792   ],
    'A3':     [841.89, 1190.55],
  };
  var [pw, ph] = PAGE_SIZES[pageSize] || PAGE_SIZES['A4'];
  if (landscape) { var tmp=pw; pw=ph; ph=tmp; }

  for (var i = 0; i < images.length; i++) {
    var img = images[i];
    var mime = img.mime || 'image/jpeg';
    var buf = img.buffer;
    prog(10 + Math.round((i / images.length) * 75));

    // Draw image onto canvas at quality, get JPEG/PNG bytes
    var bm = await createImageBitmap(new Blob([buf], {type:mime})).catch(async () => {
      return createImageBitmap(new Blob([buf]));
    });
    var c = new OffscreenCanvas(bm.width, bm.height);
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, bm.width, bm.height);
    ctx.drawImage(bm, 0, 0);
    bm.close();
    var jpgBlob = await c.convertToBlob({type:'image/jpeg', quality:quality/100});
    var jpgBuf = await jpgBlob.arrayBuffer();

    var embImg = await pdfDoc.embedJpg(jpgBuf);
    var page = pdfDoc.addPage([pw, ph]);
    var aw = pw - margin * 2, ah = ph - margin * 2;
    var iw = embImg.width, ih = embImg.height;
    var scale = Math.min(aw/iw, ah/ih);
    var dw = iw * scale, dh = ih * scale;
    var x = (pw - dw) / 2, y = (ph - dh) / 2;
    page.drawImage(embImg, {x, y, width:dw, height:dh});
  }
  prog(90);
  var pdfBytes = await pdfDoc.save();
  prog(100);
  return { blob: new Blob([pdfBytes], {type:'application/pdf'}), fmt:'pdf', pages:images.length };
}

/* ── PDF EXTRACT: PDF → images ────────────────────────────── */
async function pdfExtract(d) {
  await loadPdfJs();
  prog(5);
  var outputFmt = d.outputFormat || 'jpeg';
  var dpiMap = {'72 DPI (Screen)':72,'150 DPI (Standard)':150,'300 DPI (Print)':300,'72 DPI':72,'150 DPI':150,'300 DPI':300};
  var dpi = dpiMap[d.dpi] || 150;
  var scale = dpi / 72;
  var quality = parseInt(d.quality) || 90;

  // eslint-disable-next-line no-undef
  var pdf = await pdfjsLib.getDocument({ data: d.buffer }).promise;
  var numPages = Math.min(pdf.numPages, 50);
  prog(15);

  if (numPages === 1) {
    var page = await pdf.getPage(1);
    var vp = page.getViewport({scale});
    var c = new OffscreenCanvas(Math.round(vp.width), Math.round(vp.height));
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({canvasContext:ctx, viewport:vp}).promise;
    prog(80);
    var mime = outputFmt==='png' ? 'image/png' : 'image/jpeg';
    var opts = outputFmt==='png' ? {type:mime} : {type:mime, quality:quality/100};
    var blob = await c.convertToBlob(opts);
    prog(100);
    return { blob, fmt:outputFmt, pages:1 };
  }

  // Multiple pages → ZIP
  await loadPdfLib();
  // eslint-disable-next-line no-undef
  var { PDFDocument } = PDFLib;
  var blobs = [];
  for (var i = 1; i <= numPages; i++) {
    var pg = await pdf.getPage(i);
    var vpt = pg.getViewport({scale});
    var cv = new OffscreenCanvas(Math.round(vpt.width), Math.round(vpt.height));
    var cx = cv.getContext('2d');
    cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
    await pg.render({canvasContext:cx, viewport:vpt}).promise;
    var mime2 = outputFmt==='png' ? 'image/png' : 'image/jpeg';
    var opts2 = outputFmt==='png' ? {type:mime2} : {type:mime2, quality:quality/100};
    blobs.push(await cv.convertToBlob(opts2));
    prog(15 + Math.round((i / numPages) * 75));
  }
  // Build simple ZIP using manual ZIP format
  var zipBlob = await buildZip(blobs, outputFmt);
  prog(100);
  return { blob: zipBlob, fmt:'zip', pages:numPages, isZip:true };
}

/* ── PDF COMPRESS ─────────────────────────────────────────── */
async function pdfCompress(d) {
  await loadPdfJs();
  await loadPdfLib();
  prog(5);
  var dpiMap = {'High Quality (72 DPI)':72,'Balanced (150 DPI)':150,'Maximum Compression (96 DPI)':96};
  var dpi = dpiMap[d.quality] || 150;
  var scale = dpi / 72;
  var imgQuality = dpi <= 96 ? 0.6 : dpi <= 120 ? 0.75 : 0.88;

  // eslint-disable-next-line no-undef
  var srcPdf = await pdfjsLib.getDocument({ data: d.buffer }).promise;
  var numPages = Math.min(srcPdf.numPages, 50);
  // eslint-disable-next-line no-undef
  var { PDFDocument } = PDFLib;
  var newDoc = await PDFDocument.create();

  for (var i = 1; i <= numPages; i++) {
    prog(5 + Math.round((i / numPages) * 85));
    var pg = await srcPdf.getPage(i);
    var vpt = pg.getViewport({scale});
    var cv = new OffscreenCanvas(Math.round(vpt.width), Math.round(vpt.height));
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    await pg.render({canvasContext:ctx, viewport:vpt}).promise;
    var jpgBlob = await cv.convertToBlob({type:'image/jpeg', quality:imgQuality});
    var jpgBuf = await jpgBlob.arrayBuffer();
    var embImg = await newDoc.embedJpg(jpgBuf);
    var origVP = pg.getViewport({scale:1});
    var page = newDoc.addPage([origVP.width, origVP.height]);
    page.drawImage(embImg, {x:0, y:0, width:origVP.width, height:origVP.height});
  }
  prog(95);
  var bytes = await newDoc.save();
  prog(100);
  return { blob: new Blob([bytes], {type:'application/pdf'}), fmt:'pdf', pages:numPages };
}

/* ── PDF MERGE ────────────────────────────────────────────── */
async function pdfMerge(d) {
  await loadPdfLib();
  prog(10);
  // eslint-disable-next-line no-undef
  var { PDFDocument } = PDFLib;
  var merged = await PDFDocument.create();
  var pdfs = d.pdfs || [{ buffer: d.buffer }];
  for (var i = 0; i < pdfs.length; i++) {
    prog(10 + Math.round((i / pdfs.length) * 80));
    var src = await PDFDocument.load(pdfs[i].buffer);
    var pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach(function(p) { merged.addPage(p); });
  }
  prog(95);
  var bytes = await merged.save();
  prog(100);
  return { blob: new Blob([bytes], {type:'application/pdf'}), fmt:'pdf', pages:merged.getPageCount() };
}

/* ── PDF SPLIT ────────────────────────────────────────────── */
async function pdfSplit(d) {
  await loadPdfLib();
  prog(10);
  // eslint-disable-next-line no-undef
  var { PDFDocument } = PDFLib;
  var src = await PDFDocument.load(d.buffer);
  var total = src.getPageCount();
  var indices = parsePageRange(d.range, total);
  if (indices.length === 1) {
    prog(70);
    var single = await PDFDocument.create();
    var [p] = await single.copyPages(src, [indices[0]]);
    single.addPage(p);
    var bytes = await single.save();
    prog(100);
    return { blob: new Blob([bytes], {type:'application/pdf'}), fmt:'pdf', pages:1 };
  }
  // Multiple pages → ZIP of PDFs
  var blobs = [];
  for (var i = 0; i < indices.length; i++) {
    prog(10 + Math.round((i / indices.length) * 80));
    var doc = await PDFDocument.create();
    var [page] = await doc.copyPages(src, [indices[i]]);
    doc.addPage(page);
    var b = await doc.save();
    blobs.push(new Blob([b], {type:'application/pdf'}));
  }
  var zipBlob = await buildZipPDF(blobs);
  prog(100);
  return { blob: zipBlob, fmt:'zip', pages:indices.length, isZip:true };
}

/* ── PDF ROTATE ───────────────────────────────────────────── */
async function pdfRotate(d) {
  await loadPdfLib();
  prog(10);
  // eslint-disable-next-line no-undef
  var { PDFDocument, degrees } = PDFLib;
  var pdfDoc = await PDFDocument.load(d.buffer);
  var angleMap = {'90° Clockwise':90,'180°':180,'90° Counter-clockwise':270};
  var angle = angleMap[d.angle] || 90;
  var total = pdfDoc.getPageCount();
  var indices = parsePageRange(d.pages, total) || pdfDoc.getPageIndices();
  var pageSet = new Set(indices);
  pdfDoc.getPages().forEach(function(p, i) {
    if (pageSet.has(i)) {
      var cur = p.getRotation().angle;
      p.setRotation(degrees((cur + angle) % 360));
    }
  });
  prog(85);
  var bytes = await pdfDoc.save();
  prog(100);
  return { blob: new Blob([bytes], {type:'application/pdf'}), fmt:'pdf', pages:total };
}

/* ── PDF WATERMARK ────────────────────────────────────────── */
async function pdfWatermark(d) {
  await loadPdfLib();
  prog(10);
  // eslint-disable-next-line no-undef
  var { PDFDocument, rgb, degrees, StandardFonts } = PDFLib;
  var pdfDoc = await PDFDocument.load(d.buffer);
  var font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  var text = d.text || 'CONFIDENTIAL';
  var opacity = (parseFloat(d.opacity) || 30) / 100;
  var angle = parseFloat(d.angle) || -45;
  var hex = (d.color || '#FF0000').replace('#','');
  var r = parseInt(hex.slice(0,2),16)/255, g = parseInt(hex.slice(2,4),16)/255, b = parseInt(hex.slice(4,6),16)/255;
  var pages = pdfDoc.getPages();
  var total = pages.length;
  pages.forEach(function(page, i) {
    prog(10 + Math.round((i / total) * 80));
    var { width, height } = page.getSize();
    var fontSize = Math.max(24, Math.min(72, width * 0.07));
    var tw = font.widthOfTextAtSize(text, fontSize);
    page.drawText(text, {
      x: (width - tw) / 2, y: height / 2,
      size: fontSize, font: font,
      color: rgb(r, g, b), opacity: opacity,
      rotate: degrees(angle),
    });
  });
  prog(92);
  var bytes = await pdfDoc.save();
  prog(100);
  return { blob: new Blob([bytes], {type:'application/pdf'}), fmt:'pdf', pages:total };
}

/* ── PDF OCR ──────────────────────────────────────────────── */
async function pdfOCR(d) {
  await loadPdfJs();
  prog(5);
  // eslint-disable-next-line no-undef
  var pdf = await pdfjsLib.getDocument({ data: d.buffer }).promise;
  var numPages = Math.min(pdf.numPages, 20);
  var allText = '';
  for (var i = 1; i <= numPages; i++) {
    prog(5 + Math.round((i / numPages) * 60));
    var page = await pdf.getPage(i);
    var tc = await page.getTextContent();
    var pageText = tc.items.map(function(item) { return item.str; }).join(' ');
    if (pageText.trim()) {
      allText += '\n--- Page ' + i + ' ---\n' + pageText.trim() + '\n';
    } else {
      // Render page and OCR it
      var vp = page.getViewport({scale:2});
      var cv = new OffscreenCanvas(Math.round(vp.width), Math.round(vp.height));
      var ctx = cv.getContext('2d');
      ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);
      await page.render({canvasContext:ctx,viewport:vp}).promise;
      try {
        importScripts('https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js');
        var blob = await cv.convertToBlob({type:'image/png'});
        var url = URL.createObjectURL(blob);
        var worker = await Tesseract.createWorker(d.language||'eng');
        var res = await worker.recognize(url);
        await worker.terminate();
        URL.revokeObjectURL(url);
        allText += '\n--- Page ' + i + ' (OCR) ---\n' + (res.data.text||'').trim() + '\n';
      } catch(e) { allText += '\n--- Page ' + i + ' ---\n[Could not extract text]\n'; }
    }
  }
  prog(100);
  var blob = new Blob([allText.trim()], {type:'text/plain'});
  return { blob, fmt:'txt', pages:numPages };
}

/* ── HELPERS ─────────────────────────────────────────────── */
function parsePageRange(rangeStr, total) {
  if (!rangeStr || !rangeStr.trim()) return Array.from({length:total},(_,i)=>i);
  var indices = [];
  rangeStr.split(',').forEach(function(part) {
    part = part.trim();
    var dash = part.indexOf('-');
    if (dash > 0) {
      var from = parseInt(part)-1, to = parseInt(part.slice(dash+1))-1;
      for (var i=from;i<=Math.min(to,total-1);i++) if(i>=0)indices.push(i);
    } else {
      var n = parseInt(part)-1;
      if (n>=0&&n<total) indices.push(n);
    }
  });
  return indices.length ? [...new Set(indices)] : Array.from({length:total},(_,i)=>i);
}

async function buildZip(blobs, ext) {
  // Simple ZIP builder
  var files = blobs.map(function(b, i) {
    return { name:'page-'+(i+1)+'.'+ext, data:b };
  });
  return buildZipFromFiles(files);
}
async function buildZipPDF(blobs) {
  var files = blobs.map(function(b, i) {
    return { name:'page-'+(i+1)+'.pdf', data:b };
  });
  return buildZipFromFiles(files);
}
async function buildZipFromFiles(files) {
  var parts = [];
  var offset = 0;
  var centralDir = [];
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var nameBytes = new TextEncoder().encode(file.name);
    var fileData = new Uint8Array(await file.data.arrayBuffer());
    var crc = crc32(fileData);
    var header = new Uint8Array(30 + nameBytes.length);
    var dv = new DataView(header.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true); dv.setUint16(6, 0, true); dv.setUint16(8, 0, true);
    dv.setUint16(10, 0, true); dv.setUint16(12, 0, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, fileData.length, true); dv.setUint32(22, fileData.length, true);
    dv.setUint16(26, nameBytes.length, true); dv.setUint16(28, 0, true);
    header.set(nameBytes, 30);
    centralDir.push({name:nameBytes, crc:crc, size:fileData.length, offset:offset});
    offset += header.length + fileData.length;
    parts.push(header, fileData);
  }
  var cdOffset = offset;
  var cdParts = [];
  centralDir.forEach(function(cd) {
    var ce = new Uint8Array(46 + cd.name.length);
    var dv = new DataView(ce.buffer);
    dv.setUint32(0, 0x02014b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 20, true);
    dv.setUint16(8, 0, true); dv.setUint16(10, 0, true);
    dv.setUint16(12, 0, true); dv.setUint16(14, 0, true);
    dv.setUint32(16, cd.crc, true); dv.setUint32(20, cd.size, true); dv.setUint32(24, cd.size, true);
    dv.setUint16(28, cd.name.length, true); dv.setUint16(30, 0, true); dv.setUint16(32, 0, true);
    dv.setUint16(34, 0, true); dv.setUint16(36, 0, true); dv.setUint32(38, 0, true);
    dv.setUint32(42, cd.offset, true);
    ce.set(cd.name, 46);
    cdParts.push(ce);
  });
  var cdSize = cdParts.reduce(function(s,p){return s+p.length;},0);
  var eocd = new Uint8Array(22);
  var dv2 = new DataView(eocd.buffer);
  dv2.setUint32(0,0x06054b50,true); dv2.setUint16(4,0,true); dv2.setUint16(6,0,true);
  dv2.setUint16(8,files.length,true); dv2.setUint16(10,files.length,true);
  dv2.setUint32(12,cdSize,true); dv2.setUint32(16,cdOffset,true); dv2.setUint16(20,0,true);
  return new Blob([...parts,...cdParts,eocd], {type:'application/zip'});
}
function crc32(buf) {
  var table=new Uint32Array(256);
  for(var i=0;i<256;i++){var c=i;for(var j=0;j<8;j++)c=c&1?(0xEDB88320^(c>>>1)):(c>>>1);table[i]=c;}
  var crc=0xFFFFFFFF;
  for(var k=0;k<buf.length;k++)crc=table[(crc^buf[k])&0xFF]^(crc>>>8);
  return (crc^0xFFFFFFFF)>>>0;
}
