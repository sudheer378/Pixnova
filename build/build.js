/**
 * Pixaroid — Build Entry Point  ·  build/build.js
 *
 * Runs the full build pipeline:
 *   1. node build/generate-pages.js        — 67 tool pages
 *   2. node build/generate-category-pages.js — 8 category pages
 *   3. node build/generate-sitemap.js      — sitemap index + sub-sitemaps
 *
 * Usage: node build/build.js
 * (Or use `npm run build` which also runs Tailwind CSS first)
 */
import { execSync } from 'child_process';

const steps = [
  { label: 'Tool pages',     cmd: 'node build/generate-pages.js' },
  { label: 'Category pages', cmd: 'node build/generate-category-pages.js' },
  { label: 'Sitemaps',       cmd: 'node build/generate-sitemap.js' },
];

console.log('Pixaroid Build Pipeline\n' + '─'.repeat(40));
for (const step of steps) {
  console.log(`\n▶ ${step.label}`);
  try {
    const out = execSync(step.cmd, { encoding: 'utf8' });
    process.stdout.write(out);
  } catch (e) {
    console.error(`✗ ${step.label} failed:`, e.message);
    process.exit(1);
  }
}
console.log('\n' + '─'.repeat(40));
console.log('✓ Build complete');
