import React, { useEffect } from 'react';
import Navbar from '../components/Navbar.jsx';
import Hero from '../sections/Hero.jsx';
import Services from '../sections/Services.jsx';
import Platform from '../sections/Platform.jsx';
import About from '../sections/About.jsx';
import Resources from '../sections/Resources.jsx';
import Contact from '../sections/Contact.jsx';
import Footer from '../components/Footer.jsx';
import { useSEO } from '../lib/seo.js';
import { organizationSchema, localBusinessSchema, breadcrumbListSchema, injectSchemas } from '../lib/schema.js';
import { getDefaultOGImage } from '../lib/imageMetadata.js';

const PublicSite = () => {
  useSEO({
    title: 'Fortis Secured | Professional Security Services',
    description:
      'Fortis Secured provides professional guarding, door supervision, event and corporate security with compliance-first operations and responsive support.',
    image: getDefaultOGImage(),
  });

  useEffect(() => {
    const breadcrumbs = [{ label: 'Home', path: '/' }];
    injectSchemas([organizationSchema, localBusinessSchema, breadcrumbListSchema(breadcrumbs)]);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-gray-900">
      <Navbar />
      <main>
        <Hero />
        <Services />
        <Platform />
        <About />
        <Resources />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default PublicSite;
