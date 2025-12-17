/**
 * JSON-LD Schema markup generation for SEO
 * Implements Organization, LocalBusiness, Service, BreadcrumbList, and WebPage schemas
 */

const baseUrl = 'https://fortis-secured.vercel.app';

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Fortis Secured',
  url: baseUrl,
  logo: `${baseUrl}/FORTIS-2.gif`,
  description:
    'Professional security services including manned guarding, door supervision, event security, corporate security, and construction site security.',
  foundingDate: '2024',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Support',
    telephone: '+44-201-234-5678',
    email: 'engage@fortissecured.com',
  },
  sameAs: ['https://www.linkedin.com/company/fortis-secured'],
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Yorkshire & Greater Manchester',
    addressCountry: 'GB',
  },
};

export const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Fortis Secured',
  url: baseUrl,
  logo: `${baseUrl}/FORTIS-2.gif`,
  image: `${baseUrl}/FORTIS-2.gif`,
  description:
    'Professional security and guarding services operating 24/7 across Yorkshire and Greater Manchester.',
  priceRange: '$$',
  telephone: '+44-201-234-5678',
  email: 'engage@fortissecured.com',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Yorkshire & Greater Manchester',
    addressCountry: 'GB',
  },
  geo: {
    '@type': 'GeoShape',
    addressCountry: 'GB',
  },
  areaServed: ['GB', 'UK'],
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    opens: '00:00',
    closes: '23:59',
  },
};

export const serviceSchema = (serviceTitle, serviceDescription, url) => ({
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: serviceTitle,
  description: serviceDescription,
  url: url,
  provider: {
    '@type': 'Organization',
    name: 'Fortis Secured',
    url: baseUrl,
  },
  areaServed: ['GB', 'UK'],
  serviceType: 'Security Services',
});

export const breadcrumbListSchema = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.label,
    item: `${baseUrl}${item.path}`,
  })),
});

export const webPageSchema = (pageTitle, pageDescription, canonicalUrl, breadcrumbs) => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: pageTitle,
  description: pageDescription,
  url: canonicalUrl || `${baseUrl}${typeof window !== 'undefined' ? window.location.pathname : ''}`,
  isPartOf: {
    '@type': 'WebSite',
    name: 'Fortis Secured',
    url: baseUrl,
  },
  breadcrumb: breadcrumbListSchema(breadcrumbs),
});

/**
 * Hook to inject JSON-LD schema into the document head
 */
export function useSchema(schemas) {
  if (typeof window === 'undefined') return;

  const schemaArray = Array.isArray(schemas) ? schemas : [schemas];

  schemaArray.forEach((schema) => {
    if (!schema) return;

    // Remove existing schema if present (to avoid duplicates)
    const existing = document.head.querySelector(`script[type="application/ld+json"]`);
    if (existing && JSON.stringify(JSON.parse(existing.textContent)) === JSON.stringify(schema)) {
      return;
    }

    // Create and inject new schema script
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  });
}

export function injectSchemas(schemas) {
  useSchema(schemas);
}
