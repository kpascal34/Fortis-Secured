/**
 * Image Metadata and Configuration
 * Centralized registry of all images used throughout the site with SEO metadata
 */

export const imageMetadata = {
  logo: {
    path: '/FORTIS-2.gif',
    alt: 'Fortis Secured - Professional Security Services Logo',
    title: 'Fortis Secured',
    width: 200,
    height: 100,
    type: 'gif',
    usage: 'Navigation header and branding',
  },
  hero: {
    slides: [
      {
        path: '/hero-slide-1.jpg',
        alt: 'Professional security officer on patrol - Fortis Secured',
        title: 'Security Officer on Patrol',
        width: 1920,
        height: 1200,
        type: 'jpg',
        keywords: 'security, officer, patrol, guarding, professional',
      },
      {
        path: '/hero-slide-2.jpg',
        alt: 'Security team coordination and operations center',
        title: 'Security Operations Center',
        width: 1920,
        height: 1200,
        type: 'jpg',
        keywords: 'security, operations, team, coordination, command center',
      },
      {
        path: '/hero-slide-3.jpg',
        alt: 'Door supervision and access control services',
        title: 'Door Supervision',
        width: 1920,
        height: 1200,
        type: 'jpg',
        keywords: 'door supervision, access control, venue security',
      },
      {
        path: '/hero-slide-4.jpg',
        alt: 'Corporate security and building protection',
        title: 'Corporate Security',
        width: 1920,
        height: 1200,
        type: 'jpg',
        keywords: 'corporate security, building, protection, concierge',
      },
      {
        path: '/hero-slide-5.jpg',
        alt: 'Construction site security and perimeter guarding',
        title: 'Construction Site Security',
        width: 1920,
        height: 1200,
        type: 'jpg',
        keywords: 'construction, site security, perimeter, guarding, access control',
      },
      {
        path: '/hero-slide-6.jpg',
        alt: 'Event security and crowd management services',
        title: 'Event Security',
        width: 1920,
        height: 1200,
        type: 'jpg',
        keywords: 'event security, crowd management, festival, corporate event',
      },
    ],
  },
  // Future service-specific images (placeholders for expansion)
  services: {
    mannedGuarding: {
      path: '/services/manned-guarding.jpg', // Future: Add service detail images
      alt: 'Manned guarding security officer providing site protection and patrol services',
      title: 'Manned Guarding Services',
      width: 1200,
      height: 800,
      type: 'jpg',
      keywords: 'manned guarding, security officer, static guard, mobile patrol',
      usage: 'Service detail page hero or content image',
    },
    doorSupervision: {
      path: '/services/door-supervision.jpg',
      alt: 'Professional door supervisor managing venue access control and crowd safety',
      title: 'Door Supervision Services',
      width: 1200,
      height: 800,
      type: 'jpg',
      keywords: 'door supervision, SIA license, venue security, access control',
      usage: 'Service detail page hero or content image',
    },
    eventSecurity: {
      path: '/services/event-security.jpg',
      alt: 'Event security team managing crowd control at festival or corporate event',
      title: 'Event Security Services',
      width: 1200,
      height: 800,
      type: 'jpg',
      keywords: 'event security, crowd management, festival security, corporate events',
      usage: 'Service detail page hero or content image',
    },
    corporateSecurity: {
      path: '/services/corporate-security.jpg',
      alt: 'Corporate security officer in professional office building lobby',
      title: 'Corporate Security Services',
      width: 1200,
      height: 800,
      type: 'jpg',
      keywords: 'corporate security, office security, concierge, reception security',
      usage: 'Service detail page hero or content image',
    },
    constructionSecurity: {
      path: '/services/construction-security.jpg',
      alt: 'Construction site security officer conducting perimeter patrol and access control',
      title: 'Construction Site Security',
      width: 1200,
      height: 800,
      type: 'jpg',
      keywords: 'construction security, site security, perimeter patrol, HSE compliance',
      usage: 'Service detail page hero or content image',
    },
  },
  // Future team/about images
  team: {
    controlRoom: {
      path: '/team/control-room.jpg',
      alt: 'Fortis Secured National Control Centre monitoring operations 24/7',
      title: 'National Control Centre',
      width: 1200,
      height: 800,
      type: 'jpg',
      keywords: 'control centre, operations, monitoring, command center',
      usage: 'About page or Platform section imagery',
    },
    training: {
      path: '/team/training.jpg',
      alt: 'Security officers participating in professional development and compliance training',
      title: 'Security Training Programme',
      width: 1200,
      height: 800,
      type: 'jpg',
      keywords: 'training, CPD, professional development, SIA training',
      usage: 'About page or Careers section',
    },
  },
  // Future accreditation badges/logos
  accreditations: {
    sia: {
      path: '/accreditations/sia-logo.png',
      alt: 'SIA - Security Industry Authority approved contractor logo',
      title: 'SIA Approved Contractor',
      width: 200,
      height: 200,
      type: 'png',
      keywords: 'SIA, security industry authority, approved contractor',
      usage: 'Footer or About page accreditation display',
    },
    iso9001: {
      path: '/accreditations/iso-9001.png',
      alt: 'ISO 9001 Quality Management System certified logo',
      title: 'ISO 9001 Certified',
      width: 200,
      height: 200,
      type: 'png',
      keywords: 'ISO 9001, quality management, certification',
      usage: 'Footer or About page accreditation display',
    },
    chas: {
      path: '/accreditations/chas.png',
      alt: 'CHAS - Contractors Health and Safety Assessment Scheme accredited',
      title: 'CHAS Accredited',
      width: 200,
      height: 200,
      type: 'png',
      keywords: 'CHAS, health safety, construction, safe contractor',
      usage: 'Footer or About page accreditation display',
    },
    safeContractor: {
      path: '/accreditations/safe-contractor.png',
      alt: 'SafeContractor approved security services provider',
      title: 'SafeContractor Approved',
      width: 200,
      height: 200,
      type: 'png',
      keywords: 'safe contractor, health safety, approved',
      usage: 'Footer or About page accreditation display',
    },
  },
};

/**
 * Generate structured data for images for SEO
 */
export function getImageStructuredData(imageKey) {
  const img = imageMetadata[imageKey];
  if (!img) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    url: `https://fortis-secured.vercel.app${img.path}`,
    name: img.alt,
    description: img.title,
    width: img.width,
    height: img.height,
  };
}

/**
 * Get all images for preloading or optimization
 */
export function getAllImages() {
  const all = [];
  all.push(imageMetadata.logo);
  if (imageMetadata.hero?.slides) {
    all.push(...imageMetadata.hero.slides);
  }
  return all;
}

/**
 * Accessibility helper: check image has proper alt text
 */
export function hasProperAltText(alt) {
  return alt && alt.length > 10 && !alt.toLowerCase().includes('image');
}

/**
 * Get default Open Graph image for pages without custom imagery
 * Uses the logo as fallback for brand recognition
 */
export function getDefaultOGImage() {
  const baseUrl = 'https://fortis-secured.vercel.app';
  const logo = imageMetadata.logo;
  return {
    url: `${baseUrl}${logo.path}`,
    alt: logo.alt,
    width: logo.width,
    height: logo.height,
    type: `image/${logo.type}`,
  };
}

/**
 * Get service-specific Open Graph image (uses hero slide as fallback)
 */
export function getServiceOGImage(serviceType) {
  const baseUrl = 'https://fortis-secured.vercel.app';
  const serviceImages = {
    'manned-guarding': imageMetadata.hero.slides[0],
    'door-supervision': imageMetadata.hero.slides[2],
    'event-security': imageMetadata.hero.slides[5],
    'corporate-security': imageMetadata.hero.slides[3],
    'construction-site-security': imageMetadata.hero.slides[4],
  };
  
  const img = serviceImages[serviceType] || imageMetadata.hero.slides[0];
  return {
    url: `${baseUrl}${img.path}`,
    alt: img.alt,
    width: img.width,
    height: img.height,
    type: `image/${img.type}`,
  };
}

/**
 * Generate Open Graph meta tags for images
 * Used for social sharing and rich snippets
 */
export function generateOpenGraphImageMeta(imageKey) {
  const img = imageMetadata[imageKey];
  if (!img) return null;

  const url = `https://fortis-secured.vercel.app${img.path}`;
  return {
    'og:image': url,
    'og:image:alt': img.alt,
    'og:image:width': img.width,
    'og:image:height': img.height,
    'og:image:type': `image/${img.type}`,
    'twitter:image': url,
    'twitter:image:alt': img.alt,
  };
}

/**
 * Preload critical hero images for better LCP
 */
export function preloadCriticalImages() {
  if (typeof document === 'undefined') return;
  
  // Preload first hero slide (visible on page load)
  const firstSlide = imageMetadata.hero.slides[0];
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = firstSlide.path;
  link.fetchPriority = 'high';
  document.head.appendChild(link);
}

/**
 * Lazy load images with Intersection Observer for performance
 * Improves LCP by deferring off-screen image loading
 */
export function setupLazyLoading() {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

  const imageElements = document.querySelectorAll('img[data-src]');
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px', // Start loading 50px before entering viewport
    threshold: 0.01,
  });

  imageElements.forEach((img) => imageObserver.observe(img));
}

/**
 * Convert image URLs to optimized CDN URLs with sizing
 * Use this if implementing image CDN like Cloudinary
 */
export function getOptimizedImageUrl(
  imagePath,
  width = null,
  quality = 80,
  format = 'auto'
) {
  // If using Cloudinary or similar:
  // const cloudinaryBase = 'https://res.cloudinary.com/YOUR_CLOUD/image/fetch';
  // return `${cloudinaryBase}/w_${width},q_${quality},f_${format}/https://fortis-secured.vercel.app${imagePath}`;
  
  // For now, return the original path
  return imagePath;
}

/**
 * Generate responsive image srcset for different screen sizes
 */
export function generateResponsiveSrcSet(imagePath) {
  const basePath = imagePath.replace(/\.[^.]*$/, ''); // Remove extension
  return {
    mobile: getOptimizedImageUrl(imagePath, 480, 80),
    tablet: getOptimizedImageUrl(imagePath, 768, 85),
    desktop: getOptimizedImageUrl(imagePath, 1920, 90),
    srcset: `
      ${getOptimizedImageUrl(imagePath, 480, 80)} 480w,
      ${getOptimizedImageUrl(imagePath, 768, 85)} 768w,
      ${getOptimizedImageUrl(imagePath, 1920, 90)} 1920w
    `.trim(),
  };
}

/**
 * Prefetch or preconnect to CDN for faster image loading
 */
export function prefetchImageResources() {
  if (typeof document === 'undefined') return;

  // Prefetch Vercel image CDN
  const prefetchLink = document.createElement('link');
  prefetchLink.rel = 'prefetch-dns';
  prefetchLink.href = 'https://fortis-secured.vercel.app';
  document.head.appendChild(prefetchLink);

  // Preconnect for faster image delivery
  const preconnectLink = document.createElement('link');
  preconnectLink.rel = 'preconnect';
  preconnectLink.href = 'https://fortis-secured.vercel.app';
  preconnectLink.crossOrigin = 'anonymous';
  document.head.appendChild(preconnectLink);
}

/**
 * Check network conditions and load appropriate image quality
 * Reduces bandwidth for slow connections (save-data, 3G)
 */
export function getImageQualityByNetwork() {
  if (typeof window === 'undefined' || !window.navigator.connection) {
    return { quality: 85, format: 'auto', width: 1920 };
  }

  const connection = window.navigator.connection;
  const saveData = connection.saveData || false;
  const effectiveType = connection.effectiveType || '4g';

  if (saveData) {
    return { quality: 60, format: 'webp', width: 640 };
  }

  switch (effectiveType) {
    case 'slow-2g':
    case '2g':
      return { quality: 50, format: 'webp', width: 480 };
    case '3g':
      return { quality: 70, format: 'webp', width: 768 };
    case '4g':
    default:
      return { quality: 85, format: 'auto', width: 1920 };
  }
}

/**
 * Create responsive image HTML with modern picture element
 */
export function createResponsiveImageHTML(imagePath, alt, title) {
  const basePath = imagePath.replace(/\.[^.]*$/, '');
  const webpSrcset = `
    ${basePath}-480w.webp 480w,
    ${basePath}-768w.webp 768w,
    ${basePath}-1920w.webp 1920w
  `.trim();
  
  const jpgSrcset = `
    ${basePath}-480w.jpg 480w,
    ${basePath}-768w.jpg 768w,
    ${basePath}-1920w.jpg 1920w
  `.trim();

  return `
    <picture>
      <source srcset="${webpSrcset}" type="image/webp" />
      <img 
        src="${basePath}-1920w.jpg" 
        srcset="${jpgSrcset}"
        sizes="(max-width: 480px) 480px, (max-width: 768px) 768px, 1920px"
        alt="${alt}" 
        title="${title}"
        loading="lazy"
        decoding="async"
      />
    </picture>
  `;
}

/**
 * Measure image loading performance
 */
export function measureImageLoadingPerformance(imagePath) {
  if (typeof window === 'undefined') return null;

  return new Promise((resolve) => {
    const start = performance.now();
    const img = new Image();
    
    img.onload = () => {
      const duration = performance.now() - start;
      const naturalSize = img.naturalWidth * img.naturalHeight;
      
      resolve({
        path: imagePath,
        duration,
        naturalSize,
        bytesPerMs: naturalSize / duration,
      });
    };
    
    img.onerror = () => {
      resolve({
        path: imagePath,
        error: 'Failed to load',
        duration: performance.now() - start,
      });
    };
    
    img.src = imagePath;
  });
}
