import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PageHeader from '../../components/PageHeader';
import { useSEO } from '../../lib/seo.js';
import { serviceSchema, breadcrumbListSchema, injectSchemas } from '../../lib/schema.js';
import { getServiceOGImage } from '../../lib/imageMetadata.js';

const EventSecurity = () => {
  useSEO({
    title: 'Event Security for Festivals & Corporate Events | Fortis Secured',
    description:
      'Tailored event security with planning, access control and incident prevention for festivals, corporate and private functions.',
    image: getServiceOGImage('event-security'),
  });

  useEffect(() => {
    const breadcrumbs = [
      { label: 'Home', path: '/' },
      { label: 'Services', path: '/services' },
      { label: 'Event Security', path: '/services/event-security' },
    ];
    const schemas = [
      serviceSchema('Event Security', 'Tailored event security with planning, access control and incident prevention.', 'https://fortis-secured.vercel.app/services/event-security'),
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
          title="Event Security"
          subtitle="Planning and on-site management for festivals, corporate events and private functions."
        />

        <section className="section-container py-12">
          <div className="prose max-w-none">
            <h2>Professional Event Security & Planning</h2>
            <p>
              Precision, planning and presence for every event. Fortis Security delivers tailored event security services to protect guests,
              assets and reputation. From small corporate functions to large-scale festivals, we provide proactive management, access control
              and incident prevention.
            </p>

            <h2>Why Events Need Professional Security</h2>
            <ul>
              <li><strong>Risk Mitigation:</strong> Comprehensive security planning identifies and mitigates potential threats</li>
              <li><strong>Guest Confidence:</strong> Professional security presence allows guests to relax and enjoy the event</li>
              <li><strong>Asset Protection:</strong> Safeguarding equipment, materials and high-value items</li>
              <li><strong>Emergency Response:</strong> Trained personnel ready for rapid escalation and incident management</li>
              <li><strong>Regulatory Compliance:</strong> Full adherence to safeguarding, licensing and health &amp; safety requirements</li>
            </ul>

            <h2>Event Types We Secure</h2>
            <p>Our event security expertise covers diverse formats and scales:</p>
            <div className="grid gap-4 sm:grid-cols-2 mt-6">
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Corporate Events</h3>
                <p className="text-sm">Product launches, conferences and gala dinners with executive protection</p>
              </div>
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Festivals & Concerts</h3>
                <p className="text-sm">Large-scale crowd management and multi-point access control</p>
              </div>
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Sports Events</h3>
                <p className="text-sm">Spectator safety, VIP protection and incident response</p>
              </div>
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Private Functions</h3>
                <p className="text-sm">Weddings, private parties and bespoke high-security events</p>
              </div>
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Community Events</h3>
                <p className="text-sm">Public gatherings with family-friendly safety protocols</p>
              </div>
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Charity Events</h3>
                <p className="text-sm">High-profile fundraising with VIP guest protection</p>
              </div>
            </div>

            <h2>Our Event Security Process</h2>
            <ol className="list-decimal pl-6">
              <li><strong>Pre-Event Planning:</strong> Site assessment, risk identification and security strategy development</li>
              <li><strong>Staffing & Training:</strong> Deployment of SIA-licensed personnel trained for your specific event profile</li>
              <li><strong>Access Control:</strong> Professional entry point management and ticket verification</li>
              <li><strong>On-Site Management:</strong> Real-time monitoring, crowd flow management and incident response</li>
              <li><strong>Post-Event Review:</strong> Incident documentation and feedback for continuous improvement</li>
            </ol>

            <h2>Compliance &amp; Accreditation</h2>
            <ul>
              <li><strong>SIA Licensed Personnel:</strong> All officers hold current SIA licenses with event security specialisation</li>
              <li><strong>BS 7858 Screening:</strong> Comprehensive vetting of all security staff</li>
              <li><strong>Event Risk Assessment:</strong> Professional risk assessment aligned to industry best practice</li>
              <li><strong>Emergency Response Preparedness:</strong> Staff trained in emergency protocols and incident escalation</li>
              <li><strong>CHAS / SafeContractor:</strong> Verified safe contractor approval for regulated venues</li>
            </ul>

            <h2>Partner With Event Security Experts</h2>
            <p>
              Whether hosting a small corporate gathering or managing a multi-thousand-person festival, Fortis provides 
              professional, responsive event security. We coordinate seamlessly with event management, venue staff and emergency services.
            </p>

            <h2>Plan Your Event Security</h2>
            <p className="mt-6">
              Let us help secure your next event. Contact our team for a consultation and custom security proposal.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <Link to="/contact" className="inline-block px-6 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary-dark transition-all">
                Event Security Consultation
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

export default EventSecurity;
