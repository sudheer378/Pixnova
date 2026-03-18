/**
 * CanvasEngine — Core Canvas API wrapper for Pixaroid image operations.
 */
export function loadImageFromDataURL(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = dataURL;
  });
}

export function drawToCanvas(img, { width, height } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width  = width  || img.naturalWidth;
  canvas.height = height || img.naturalHeight;
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function canvasToBlob(canvas, mimeType = 'image/jpeg', quality = 0.85) {
  return new Promise(resolve => canvas.toBlob(resolve, mimeType, quality));
}

export function applyFilter(canvas, filterCSS) {
  const ctx = canvas.getContext('2d');
  ctx.filter = filterCSS;
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = 'none';
  return canvas;
}
