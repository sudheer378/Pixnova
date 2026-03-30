/** Format bytes to human-readable string */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  const k   = 1024;
  const dm  = decimals < 0 ? 0 : decimals;
  const sizes = ['B','KB','MB','GB'];
  const i   = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/** Derive output filename with new extension */
export function deriveFilename(originalName, newExt) {
  const base = originalName.replace(/\.[^/.]+$/, '');
  return `${base}.${newExt}`;
}

/** MIME type → extension map */
export const MIME_TO_EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/gif':  'gif', 'image/avif': 'avif', 'image/bmp': 'bmp',
  'image/tiff': 'tiff', 'image/svg+xml': 'svg',
};
