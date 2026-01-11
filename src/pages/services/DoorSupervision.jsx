import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PageHeader from '../../components/PageHeader';
import { useSEO } from '../../lib/seo.js';
import { serviceSchema, breadcrumbListSchema, injectSchemas } from '../../lib/schema.js';
import { getServiceOGImage } from '../../lib/imageMetadata.js';

const DoorSupervision = () => {
  useSEO({
    title: 'Door Supervision & Venue Security | Fortis Secured',
    description:
      'Licensed door supervisors for access control, crowd management and venue safety. Professional presence and compliance-first operations.',
    image: getServiceOGImage('door-supervision'),
  });

  useEffect(() => {
    const breadcrumbs = [
      { label: 'Home', path: '/' },
      { label: 'Services', path: '/services' },
      { label: 'Door Supervision', path: '/services/door-supervision' },
    ];
    const schemas = [
      serviceSchema('Door Supervision', 'Licensed door supervisors for access control, crowd management and venue safety.', 'https://fortis-secured.vercel.app/services/door-supervision'),
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
          title="Door Supervision"
          subtitle="Fortis provides trained door supervisors experienced in crowd management, access control and venue safety."
        />

        <section className="section-container py-12">
          <div className="prose max-w-none">
            <h2>Professional Door Supervision & Venue Security</h2>
            <p>
              Professionalism, presence and protection at every venue. Fortis Security provides licensed door supervisors who combine
              professionalism with situational awareness to protect venues, staff and patrons. Our teams are selected for communication
              skills, composure under pressure and adherence to SIA and BS 7858 standards.
            </p>

            <h2>Benefits of Professional Door Supervision</h2>
            <ul>
              <li><strong>Licensed Expertise:</strong> All supervisors hold current SIA licenses and undergo regular training</li>
              <li><strong>Conflict Prevention:</strong> De-escalation and communication skills reduce incidents before they escalate</li>
              <li><strong>Regulatory Compliance:</strong> Full adherence to licensing laws and safeguarding requirements</li>
              <li><strong>Patron & Staff Safety:</strong> Protective presence that maintains welcoming atmosphere while ensuring security</li>
              <li><strong>Liability Reduction:</strong> Professional incident documentation and escalation protocols minimise legal exposure</li>
            </ul>

            <h2>Venue Types Served</h2>
            <p>We provide door supervision across a range of entertainment and hospitality venues:</p>
            <div className="grid gap-4 sm:grid-cols-2 mt-6">
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Bars & Pubs</h3>
                <p className="text-sm">Evening and weekend cover with conflict management and access control</p>
              </div>
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Nightclubs & Discos</h3>
                <p className="text-sm">High-capacity venue management with robust safety protocols</p>
              </div>
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Hotels & Restaurants</h3>
                <p className="text-sm">Discreet, professional presence for upscale establishments</p>
              </div>
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Festivals & Events</h3>
                <p className="text-sm">Multi-door management and crowd control for large gatherings</p>
              </div>
            </div>

            <h2>Compliance &amp; Accreditation</h2>
            <ul>
              <li><strong>SIA Licensed:</strong> All door supervisors maintain active SIA licenses with annual renewal</li>
              <li><strong>BS 7858 Vetted:</strong> Comprehensive background checks and vetting of all personnel</li>
              <li><strong>Conflict Management Certified:</strong> Accredited training in de-escalation and safe restraint</li>
              <li><strong>First Aid Qualified:</strong> Emergency medical response capability on-site</li>
              <li><strong>ISO-aligned Management:</strong> Quality and H&amp;S processes aligned to industry standards</li>
            </ul>

            <h2>Our Door Supervision Approach</h2>
            <p>
              We begin with a site assessment to understand your venue layout, capacity, typical clientele and risk profile. Our supervisors then 
              implement tailored access control protocols, maintain patron flow, and manage challenging situations with professional communication 
              and discretion. Our team is trained to balance security with hospitality—protecting your venue and reputation.
            </p>

            <h2>Why Venues Trust Fortis</h2>
            <p>
              Professional, courteous door supervisors who command respect, reduce liability and protect your guests and staff. 
              We understand the hospitality environment and deliver security that enhances, not detracts from, the customer experience.
            </p>

            <h2>Get Door Supervision Support</h2>
            <p className="mt-6">
              Protect your venue with professional, licensed door supervision. Contact us for a consultation tailored to your venue type and needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <Link to="/contact" className="inline-block px-6 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary-dark transition-all">
                Request a Quote
              </Link>
              <Link to="/services" className="inline-block px-6 py-3 rounded-full border border-gray-200 hover:border-primary transition-all">
                Back to Services
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default DoorSupervision;
