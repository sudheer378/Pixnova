/**
 * Pixaroid — Code Split Chunk: tool-utility
 * Loaded dynamically by performance.js loadToolChunk()
 * when a tool with a matching interfaceType is opened.
 *
 * Populate with tool-specific UI logic, control builders,
 * and engine wiring for each interface type in this group.
 */
export const CHUNK_LOADED = true;
export const CHUNK_NAME   = 'tool-utility';

// Tool logic imported from engine
export { compressImage, compressToTargetSize, resizeImage,
         convertImage, editImage, processBulkImages } from '/js/engine.js';
