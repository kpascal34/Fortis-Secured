import { useEffect } from 'react';

function updateNamedMeta(name, content) {
  if (!name) return;
  let el = document.head.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  if (typeof content === 'string') {
    el.setAttribute('content', content);
  }
}

function updatePropertyMeta(property, content) {
  if (!property) return;
  let el = document.head.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  if (typeof content === 'string') {
    el.setAttribute('content', content);
  }
}

function updateLink(rel, href) {
  if (!rel) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  if (typeof href === 'string') {
    el.setAttribute('href', href);
  }
}

export function useSEO({ title, description, image, noIndex = false, canonical } = {}) {
  useEffect(() => {
    const siteName = 'Fortis Secured';
    const computedTitle = title || siteName;
    const url = canonical || (typeof window !== 'undefined' ? window.location.href.split('#')[0] : undefined);

    if (computedTitle) {
      document.title = computedTitle;
      updatePropertyMeta('og:title', computedTitle);
      updateNamedMeta('twitter:title', computedTitle);
    }

    if (description) {
      updateNamedMeta('description', description);
      updatePropertyMeta('og:description', description);
      updateNamedMeta('twitter:description', description);
    }

    if (url) {
      updatePropertyMeta('og:url', url);
      updateLink('canonical', url);
    }

    updatePropertyMeta('og:site_name', siteName);
    updatePropertyMeta('og:type', 'website');

    if (image) {
      // Enhanced Open Graph image with dimensions
      if (typeof image === 'string') {
        updatePropertyMeta('og:image', image);
        updatePropertyMeta('og:image:secure_url', image);
        updateNamedMeta('twitter:image', image);
      } else if (typeof image === 'object') {
        updatePropertyMeta('og:image', image.url);
        updatePropertyMeta('og:image:secure_url', image.url);
        updateNamedMeta('twitter:image', image.url);
        if (image.alt) {
          updatePropertyMeta('og:image:alt', image.alt);
          updateNamedMeta('twitter:image:alt', image.alt);
        }
        if (image.width) updatePropertyMeta('og:image:width', String(image.width));
        if (image.height) updatePropertyMeta('og:image:height', String(image.height));
        if (image.type) updatePropertyMeta('og:image:type', image.type);
      }
      updateNamedMeta('twitter:card', 'summary_large_image');
    } else {
      updateNamedMeta('twitter:card', 'summary');
    }

    if (noIndex) {
      updateNamedMeta('robots', 'noindex, nofollow');
    } else {
      // Provide a sane default for indexable pages
      updateNamedMeta('robots', 'index, follow');
    }
  }, [title, description, image, noIndex, canonical]);
}

export function SEO(props) {
  useSEO(props);
  return null;
}
