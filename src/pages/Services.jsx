import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageHeader from '../components/PageHeader';
import { useSEO } from '../lib/seo.js';
import { breadcrumbListSchema, injectSchemas } from '../lib/schema.js';
import { getDefaultOGImage } from '../lib/imageMetadata.js';

const services = [
  {
    id: 'manned-guarding',
    title: 'Manned Guarding',
    description: 'Highly trained officers for static guarding, mobile patrols and events.',
    href: '/services/manned-guarding',
  },
  {
    id: 'door-supervision',
    title: 'Door Supervision',
    description: 'Licensed door supervisors for access control, crowd management and venue safety.',
    href: '/services/door-supervision',
  },
  {
    id: 'event-security',
    title: 'Event Security',
    description: 'Tailored event security with planning, access control and incident prevention.',
    href: '/services/event-security',
  },
  {
    id: 'corporate-security',
    title: 'Corporate Security',
    description: 'Corporate and concierge security with asset protection and risk assessments.',
    href: '/services/corporate-security',
  },
  {
    id: 'construction-site-security',
    title: 'Construction Site Security',
    description: '24/7 site protection with access control and HSE-aligned operations.',
    href: '/services/construction-site-security',
  },
];

const Services = () => {
  useSEO({
    title: 'Security Services | Fortis Secured',
    description: 'Explore our comprehensive security services: manned guarding, door supervision, event security, corporate security, and construction site security.',
  });

  useEffect(() => {
    const breadcrumbs = [
      { label: 'Home', path: '/' },
      { label: 'Services', path: '/services' },
    ];
    injectSchemas([breadcrumbListSchema(breadcrumbs)]);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <PageHeader
          eyebrow="Services"
          title="Security Solutions"
          subtitle="Professional, compliant and reliable security services tailored to your needs."
        />

        <section className="py-24 bg-white">
          <div className="section-container">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <Link
                  key={service.id}
                  to={service.href}
                  className="group glass-panel p-8 hover:shadow-lg transition-all duration-300"
                >
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary transition-colors">{service.title}</h3>
                  <p className="mt-4 text-sm text-gray-600">{service.description}</p>
                  <div className="mt-6 flex items-center text-primary font-semibold">
                    Learn more
                    <svg className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 bg-gray-50">
          <div className="section-container text-center">
            <h2 className="text-2xl font-bold text-gray-900">Need a Custom Solution?</h2>
            <p className="mt-4 text-gray-600">Contact our team to discuss your specific security requirements.</p>
            <div className="mt-8">
              <Link
                to="/contact"
                className="inline-block px-6 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary-dark transition-all"
              >
                Get in Touch
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Services;
