/**
 * Image optimization utilities for SEO and accessibility
 * Provides lazy loading, WebP support detection, and srcset generation
 */

/**
 * Generate a srcset string for responsive images
 * @param {string} basePath - Base path without extension (e.g., '/image')
 * @param {string[]} sizes - Array of sizes (e.g., ['300w', '600w', '1200w'])
 * @returns {string} srcset attribute value
 */
export function generateSrcSet(basePath, sizes = ['300w', '600w', '1200w']) {
  return sizes.map((size) => `${basePath}-${size}.jpg ${size}`).join(', ');
}

/**
 * Optimized Image component with lazy loading and accessibility
 * Supports both static images and WebP with fallback
 */
export const OptimizedImage = ({
  src,
  alt,
  title,
  width,
  height,
  className = '',
  loading = 'lazy',
  srcSet = null,
  sizes = null,
  decoding = 'async',
}) => (
  <img
    src={src}
    alt={alt}
    title={title || alt}
    width={width}
    height={height}
    className={className}
    loading={loading}
    srcSet={srcSet}
    sizes={sizes}
    decoding={decoding}
    style={{
      maxWidth: '100%',
      height: 'auto',
      display: 'block',
    }}
  />
);

/**
 * Picture element with WebP support and fallback
 * Automatically uses WebP if supported, falls back to JPEG
 */
export const ResponsivePicture = ({
  webpSrc,
  jpgSrc,
  alt,
  title,
  width,
  height,
  className = '',
  loading = 'lazy',
  srcSet = null,
  sizes = null,
}) => (
  <picture>
    <source srcSet={webpSrc} type="image/webp" />
    <img
      src={jpgSrc}
      alt={alt}
      title={title || alt}
      width={width}
      height={height}
      className={className}
      loading={loading}
      srcSet={srcSet}
      sizes={sizes}
      style={{
        maxWidth: '100%',
        height: 'auto',
        display: 'block',
      }}
    />
  </picture>
);

/**
 * Check if browser supports WebP
 */
export function supportsWebP() {
  if (typeof window === 'undefined') return false;
  const canvas = document.createElement('canvas');
  return canvas.toDataURL('image/webp').indexOf('image/webp') === 0;
}

/**
 * Generate optimized image URL with Cloudinary or similar CDN
 * (adjust baseUrl to match your CDN setup)
 */
export function getOptimizedImageUrl(imagePath, width = 800, quality = 85) {
  // Example for Vercel Image Optimization
  // Adjust this based on your actual hosting/CDN setup
  return `${imagePath}?w=${width}&q=${quality}`;
}

/**
 * Preload image for better performance
 */
export function preloadImage(src) {
  if (typeof document === 'undefined') return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  document.head.appendChild(link);
}

/**
 * Preload multiple images
 */
export function preloadImages(srcArray) {
  srcArray.forEach((src) => preloadImage(src));
}
