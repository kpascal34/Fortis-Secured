import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PageHeader from '../../components/PageHeader';
import { useSEO } from '../../lib/seo.js';
import { serviceSchema, breadcrumbListSchema, injectSchemas } from '../../lib/schema.js';
import { getServiceOGImage } from '../../lib/imageMetadata.js';

const ConstructionSiteSecurity = () => {
  useSEO({
    title: 'Construction Site Security & Site Guarding | Fortis Secured',
    description:
      '24/7 construction site security with access control, patrols and HSE-aligned operations. Prevent unauthorised access, theft and vandalism.',
    image: getServiceOGImage('construction-site-security'),
  });

  useEffect(() => {
    const breadcrumbs = [
      { label: 'Home', path: '/' },
      { label: 'Services', path: '/services' },
      { label: 'Construction Site Security', path: '/services/construction-site-security' },
    ];
    const schemas = [
      serviceSchema('Construction Site Security', '24/7 construction site security with access control, patrols and HSE-aligned operations.', 'https://fortis-secured.vercel.app/services/construction-site-security'),
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
          title="Construction Site Security"
          subtitle="Site guarding, access control and secure logistics for construction projects."
        />

        <section className="section-container py-12">
          <div className="prose max-w-none">
            <h2>Professional Construction Site Security</h2>
            <p>
              Protecting high-value construction sites with precision and presence. Fortis Security provides 24/7 site protection 
              with visible, compliant and dependable guarding. We prevent unauthorised access, theft and vandalism while maintaining 
              health and safety compliance and project timeline protection.
            </p>

            <h2>Why Construction Sites Need Professional Security</h2>
            <ul>
              <li><strong>Theft Prevention:</strong> Tools, equipment and materials are high-value theft targets</li>
              <li><strong>Vandalism Deterrence:</strong> Visible security presence prevents costly property damage</li>
              <li><strong>Access Control:</strong> Authorised personnel only—reducing site liability and insurance risk</li>
              <li><strong>HSE Compliance:</strong> Professional security aligned to Health &amp; Safety Executive requirements</li>
              <li><strong>Project Continuity:</strong> Secure sites maintain schedules and protect contractor reputations</li>
            </ul>

            <h2>Construction Project Types We Secure</h2>
            <p>Site protection across diverse construction and infrastructure projects:</p>
            <div className="grid gap-4 sm:grid-cols-2 mt-6">
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Commercial Development</h3>
                <p className="text-sm">Office and retail construction with multi-phase site protection</p>
              </div>
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Residential Projects</h3>
                <p className="text-sm">Housing developments and residential complex security</p>
              </div>
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Infrastructure & Utilities</h3>
                <p className="text-sm">Highways, bridges, utilities and critical asset protection</p>
              </div>
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Industrial & Warehousing</h3>
                <p className="text-sm">Large-scale industrial build-out and warehouse construction</p>
              </div>
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Heritage & Renovation</h3>
                <p className="text-sm">Listed building works and specialist renovation sites</p>
              </div>
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Temporary Site Operations</h3>
                <p className="text-sm">Fabrication yards, staging areas and satellite sites</p>
              </div>
            </div>

            <h2>Our Construction Site Security Approach</h2>
            <ol className="list-decimal pl-6">
              <li><strong>Pre-Work Assessment:</strong> Site survey, risk analysis and security requirement planning with site management</li>
              <li><strong>Tailored Security Plan:</strong> Custom deployment strategy aligned to project phase, value at risk and HSE protocols</li>
              <li><strong>SIA-Compliant Personnel:</strong> Licensed, trained security staff with construction site awareness and CSCS alignment</li>
              <li><strong>24/7 Site Coverage:</strong> Day and night patrols with GPS verification and incident logging</li>
              <li><strong>Access Control:</strong> Visitor passes, personnel verification and secure entry/exit management</li>
              <li><strong>Incident Response:</strong> Swift escalation to site management and emergency services; full incident documentation</li>
              <li><strong>Liaison & Reporting:</strong> Regular briefings with site management, project managers and stakeholders</li>
            </ol>

            <h2>Compliance &amp; Accreditation</h2>
            <ul>
              <li><strong>SIA Licensed Personnel:</strong> All officers hold current SIA licenses with construction site specialisation</li>
              <li><strong>BS 7858 Vetting:</strong> Comprehensive background screening of all security staff</li>
              <li><strong>HSE Aligned Operations:</strong> Full compliance with Health &amp; Safety Executive site security guidance</li>
              <li><strong>ISO 9001 Quality Systems:</strong> Certified processes for service consistency and quality assurance</li>
              <li><strong>CHAS / SafeContractor Approved:</strong> Verified safe contractor status for regulated construction sectors</li>
            </ul>

            <h2>Key Site Protection Services</h2>
            <ul>
              <li>24/7 manned site presence and visible deterrence</li>
              <li>Perimeter patrols with GPS tracking verification</li>
              <li>Access control and visitor pass management</li>
              <li>Equipment and material inventory monitoring</li>
              <li>After-hours and weekend security coverage</li>
              <li>Temporary fencing and secure boundary establishment</li>
              <li>CCTV coordination and incident escalation support</li>
              <li>Emergency response and site evacuation assistance</li>
            </ul>

            <h2>Protect Your Construction Investment</h2>
            <p>
              Construction projects represent significant financial investment. Fortis Security safeguards your assets, maintains 
              HSE compliance and provides the peace of mind to stay on schedule and within budget.
            </p>

            <h2>Secure Your Construction Site</h2>
            <p className="mt-6">
              Let Fortis provide comprehensive security for your project. Contact our team for a site assessment and tailored security proposal.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <Link to="/contact" className="inline-block px-6 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary-dark transition-all">
                Site Security Consultation
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

export default ConstructionSiteSecurity;
