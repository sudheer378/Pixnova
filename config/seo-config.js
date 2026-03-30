/**
 * ═══════════════════════════════════════════════════════════════════
 *  Pixaroid — SEO Configuration  ·  config/seo-config.js
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Central source of truth for all SEO / meta settings.
 *  Referenced by:
 *    - build/generate-sitemap.js
 *    - build/generate-pages.js
 *    - js/modules/seo-meta.js
 * ═══════════════════════════════════════════════════════════════════
 */

const SEO_CONFIG = {

  /* ── Site identity ──────────────────────────────────────── */
  site: {
    name:        'Pixaroid',
    tagline:     'Next Generation AI Image Tools',
    domain:      'https://pixaroid.vercel.app',
    twitter:     '@pixaroidapp',
    locale:      'en_US',
    language:    'en',
  },

  /* ── Default OG / share image ───────────────────────────── */
  ogImage: {
    url:    'https://pixaroid.vercel.app/assets/images/og-default.png',
    width:  1200,
    height: 630,
    alt:    'Pixaroid — Free AI-Powered Image Tools',
    type:   'image/png',
  },

  /* ── Favicon / PWA ──────────────────────────────────────── */
  icons: {
    favicon:   '/assets/svg/favicon.svg',
    appleTouchIcon: '/assets/images/apple-touch-icon.png',
    manifest:  '/manifest.json',
  },

  /* ── Theme ──────────────────────────────────────────────── */
  themeColor: '#4F46E5',

  /* ── Sitemaps ───────────────────────────────────────────── */
  sitemaps: [
    'https://pixaroid.vercel.app/sitemap.xml',
    'https://pixaroid.vercel.app/sitemap-tools.xml',
  ],

  /* ── Homepage meta ──────────────────────────────────────── */
  homepage: {
    title:       'Pixaroid — Free AI-Powered Image Tools | Compress, Convert, Resize',
    description: '70+ free browser-based image tools. Compress, convert, resize, edit and AI enhance images instantly. No upload required — 100% private and fast.',
    ogTitle:     'Pixaroid — Next Generation AI Image Tools',
    ogDescription:'70+ free image tools that run in your browser. Compress, convert, resize, AI enhance — no uploads, no account.',
    robots:      'index, follow',
    changefreq:  'daily',
    priority:    '1.00',
  },

  /* ── Category meta templates ────────────────────────────── */
  categories: {
    compression: {
      title:       'Image Compression Tools — Free Online | Pixaroid',
      description: '10 free image compression tools. Compress JPEG, PNG, WebP, GIF to any target size. Browser-based, no upload, no quality loss.',
      ogTitle:     'Free Image Compression Tools — Pixaroid',
      ogDescription:'Compress images to 20KB, 50KB, 100KB, or any size. JPEG, PNG, WebP. Free and instant.',
      priority:    '0.88',
    },
    conversion: {
      title:       'Image Format Conversion Tools — Free Online | Pixaroid',
      description: '13 free image format converters. JPG to PNG, PNG to WebP, HEIC to JPG, and 10 more. No upload required.',
      ogTitle:     'Free Image Converters — JPG, PNG, WebP, HEIC | Pixaroid',
      ogDescription:'Convert between 13 image format pairs. HEIC, WebP, AVIF, TIFF, BMP and more.',
      priority:    '0.88',
    },
    resize: {
      title:       'Image Resize Tools — Resize for Any Platform | Pixaroid',
      description: '12 free image resize tools. Resize by pixels, percentage, or for Instagram, YouTube, Facebook, LinkedIn, passport photos.',
      ogTitle:     'Free Image Resizer — All Platforms & Sizes | Pixaroid',
      ogDescription:'Resize images for Instagram, YouTube, Twitter, LinkedIn, passport photos. Free online tool.',
      priority:    '0.85',
    },
    editor: {
      title:       'Online Image Editor — Crop, Rotate, Watermark & More | Pixaroid',
      description: '10 free image editing tools. Crop, rotate, flip, adjust brightness, contrast, saturation, add watermarks and text.',
      ogTitle:     'Free Online Image Editor — Pixaroid',
      ogDescription:'Crop, rotate, adjust brightness, contrast, saturation, add watermarks and text to images.',
      priority:    '0.83',
    },
    'ai-tools': {
      title:       'AI Image Tools — Background Remover, Upscaler, Enhancer | Pixaroid',
      description: '6 AI-powered image tools. Remove backgrounds, upscale 4×, enhance photos, colourize B&W, extract text (OCR). Free, browser-based.',
      ogTitle:     'AI Image Tools — Free Background Removal, Upscaling | Pixaroid',
      ogDescription:'AI background remover, 4× upscaler, photo enhancer, OCR. Free and runs in your browser.',
      priority:    '0.86',
    },
    'social-tools': {
      title:       'Social Media Image Tools — YouTube, Instagram, LinkedIn | Pixaroid',
      description: '6 free social media image makers. Create YouTube thumbnails, Instagram posts, Facebook covers, Twitter headers and more.',
      ogTitle:     'Social Media Image Tools — Free Online | Pixaroid',
      ogDescription:'Create YouTube thumbnails, Instagram posts, Facebook covers, LinkedIn banners. Free tools.',
      priority:    '0.80',
    },
    utilities: {
      title:       'Image Utilities — File Size, Metadata, Colour Palette | Pixaroid',
      description: '6 free image utility tools. Check image size, dimensions, view EXIF metadata, extract colour palettes, and calculate aspect ratios.',
      ogTitle:     'Image Utilities — Metadata, Size, Colour Palette | Pixaroid',
      ogDescription:'Check image file size, view EXIF data, extract colour palettes. Free browser tools.',
      priority:    '0.74',
    },
    'bulk-tools': {
      title:       'Bulk Image Tools — Compress, Resize & Convert Multiple Images | Pixaroid',
      description: '4 free bulk image processing tools. Compress, resize, convert and watermark up to 100 images at once. Download as ZIP.',
      ogTitle:     'Bulk Image Tools — Process 100 Images at Once | Pixaroid',
      ogDescription:'Bulk compress, resize, convert, and watermark up to 100 images. Download as ZIP.',
      priority:    '0.77',
    },
  },

  /* ── Tool title suffix ──────────────────────────────────── */
  toolTitleSuffix: '— Free Online Tool | Pixaroid',

  /* ── Robots default ─────────────────────────────────────── */
  defaultRobots: 'index, follow',
  noindexRobots: 'noindex, nofollow',

  /* ── Schema.org org entity ──────────────────────────────── */
  organization: {
    '@type':  'Organization',
    'name':   'Pixaroid',
    'url':    'https://pixaroid.vercel.app',
    'logo':   'https://pixaroid.vercel.app/assets/svg/logo.svg',
    'sameAs': [
      'https://twitter.com/pixaroidapp',
    ],
  },

  /* ── Verification codes (replace with real values) ──────── */
  verification: {
    google:  'REPLACE_WITH_GOOGLE_SEARCH_CONSOLE_CODE',
    bing:    'REPLACE_WITH_BING_WEBMASTER_CODE',
    yandex:  '',
  },
};

export default SEO_CONFIG;
