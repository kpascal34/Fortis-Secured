import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PageHeader from '../../components/PageHeader';
import { useSEO } from '../../lib/seo.js';
import { serviceSchema, breadcrumbListSchema, injectSchemas } from '../../lib/schema.js';
import { getServiceOGImage } from '../../lib/imageMetadata.js';

const MannedGuarding = () => {
  useSEO({
    title: 'Manned Guarding Services | Fortis Secured',
    description:
      'Highly trained officers for static guarding, mobile patrols and events. Visible deterrence, professional presence and rapid response.',
    image: getServiceOGImage('manned-guarding'),
  });

  useEffect(() => {
    const breadcrumbs = [
      { label: 'Home', path: '/' },
      { label: 'Services', path: '/services' },
      { label: 'Manned Guarding', path: '/services/manned-guarding' },
    ];
    const schemas = [
      serviceSchema('Manned Guarding', 'Highly trained officers for static guarding, mobile patrols and events.', 'https://fortis-secured.vercel.app/services/manned-guarding'),
      breadcrumbListSchema(breadcrumbs),
    ];
    injectSchemas(schemas);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <PageHeader
          eyebrow="Service"
          title="Manned Guarding"
          subtitle="Highly trained officers for static site guarding, mobile patrols and events. Deterrence, visibility and rapid response tailored to your portfolio."
        />

        <section className="section-container py-12">
          <div className="prose max-w-none">
            <h2>Professional Manned Guarding Services</h2>
            <p>
              Dependable, professional and compliant protection for every environment. Fortis Security provides fully managed
              manned guarding solutions that deliver consistency, presence and peace of mind. Our guards are more than a visible deterrent —
              they represent your business, uphold your standards and operate under a culture of accountability and professionalism.
            </p>

            <h2>Why Choose Manned Guarding?</h2>
            <ul>
              <li><strong>Visible Deterrence:</strong> Professional, uniformed presence that prevents unauthorised access and deters criminal activity</li>
              <li><strong>Rapid Response:</strong> Immediate incident response and escalation protocols for maximum protection</li>
              <li><strong>Compliance Assurance:</strong> All officers meet BS 7858 standards and maintain current SIA licenses</li>
              <li><strong>Customised Operations:</strong> Tailored schedules, patrol patterns and protocols matched to your specific needs</li>
              <li><strong>24/7 Availability:</strong> Round-the-clock guarding with no gaps in coverage</li>
            </ul>

            <h2>Service Applications</h2>
            <p>Our manned guarding services are deployed across diverse industries and environments:</p>
            <div className="grid gap-4 sm:grid-cols-2 mt-6">
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Construction Sites</h3>
                <p className="text-sm">Asset protection, site access control and HSE compliance monitoring</p>
              </div>
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Warehousing & Logistics</h3>
                <p className="text-sm">Inventory security, theft prevention and supply chain protection</p>
              </div>
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Corporate Premises</h3>
                <p className="text-sm">Professional lobby presence, access management and employee safety</p>
              </div>
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Education & Healthcare</h3>
                <p className="text-sm">Duty of care, visitor management and incident response protocols</p>
              </div>
            </div>

            <h2>Compliance &amp; Accreditation</h2>
            <ul>
              <li><strong>BS 7858 Security Screening:</strong> Rigorous background checks and vetting of all personnel</li>
              <li><strong>SIA Licensing:</strong> All guards maintain active, current SIA licenses with regular CPD training</li>
              <li><strong>ISO 9001 Quality Management:</strong> Processes audited and certified to ISO standards</li>
              <li><strong>ISO 45001 Health &amp; Safety:</strong> Comprehensive H&amp;S protocols and incident management</li>
              <li><strong>CHAS / SafeContractor Accreditation:</strong> Verified safe contractor status for construction and industrial sites</li>
            </ul>

            <h2>Our Manned Guarding Approach</h2>
            <p>
              Every deployment begins with a detailed security assessment to understand your site, risks and operational requirements. We design tailored
              guard schedules, patrol patterns and incident protocols—then provide professional, uniformed officers who operate with discipline and accountability.
              Our National Control Centre monitors all deployments in real-time, ensuring rapid escalation and support whenever needed.
            </p>

            <h2>Industries Served</h2>
            <p>
              Construction, Warehousing, Corporate, Education, Manufacturing, Residential, Retail, Property Development, Infrastructure and more. 
              Whether you need static guarding at a single fixed post or mobile patrols across multiple sites, we adapt our service to match your portfolio 
              and risk profile.
            </p>

            <h2>Ready to Secure Your Assets?</h2>
            <p className="mt-6">
              Contact us to discuss your manned guarding requirements and experience a higher standard of professional security.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <Link to="/contact" className="inline-block px-6 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary-dark transition-all">
                Request a Consultation
              </Link>
              <Link to="/services" className="inline-block px-6 py-3 rounded-full border border-gray-200 hover:border-primary transition-all">
                View All Services
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default MannedGuarding;
