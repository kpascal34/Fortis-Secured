import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PageHeader from '../../components/PageHeader';
import { useSEO } from '../../lib/seo.js';
import { serviceSchema, breadcrumbListSchema, injectSchemas } from '../../lib/schema.js';
import { getServiceOGImage } from '../../lib/imageMetadata.js';

const CorporateSecurity = () => {
  useSEO({
    title: 'Corporate & Concierge Security | Fortis Secured',
    description:
      'Corporate security with concierge presence, asset protection and risk assessments. Professional teams aligned to ISO and SIA standards.',
    image: getServiceOGImage('corporate-security'),
  });

  useEffect(() => {
    const breadcrumbs = [
      { label: 'Home', path: '/' },
      { label: 'Services', path: '/services' },
      { label: 'Corporate Security', path: '/services/corporate-security' },
    ];
    const schemas = [
      serviceSchema('Corporate Security', 'Corporate security with concierge presence, asset protection and risk assessments.', 'https://fortis-secured.vercel.app/services/corporate-security'),
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
          title="Corporate Security"
          subtitle="Executive protection, asset security and enterprise risk assessments for commercial portfolios."
        />

        <section className="section-container py-12">
          <div className="prose max-w-none">
            <h2>Professional Corporate Security Solutions</h2>
            <p>
              Protect your business, employees and assets. Fortis Security delivers comprehensive corporate security tailored to your industry,
              size and risk profile. From reception and access control to executive protection and incident response, we maintain a secure
              environment where your team can work with confidence.
            </p>

            <h2>Why Corporate Security Matters</h2>
            <ul>
              <li><strong>Employee Safety:</strong> Secure workplace reduces stress and enhances productivity</li>
              <li><strong>Asset Protection:</strong> Safeguarding equipment, inventory and intellectual property</li>
              <li><strong>Executive Protection:</strong> Discreet, professional protection for senior leadership</li>
              <li><strong>Access Control:</strong> Credential-based entry systems and visitor management</li>
              <li><strong>Regulatory Compliance:</strong> Full adherence to Health &amp; Safety and data protection requirements</li>
            </ul>

            <h2>Industries We Secure</h2>
            <p>Corporate security expertise across diverse sectors:</p>
            <div className="grid gap-4 sm:grid-cols-2 mt-6">
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Finance & Insurance</h3>
                <p className="text-sm">High-value asset protection and secure office environments</p>
              </div>
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Technology & IT</h3>
                <p className="text-sm">Data centre security and intellectual property protection</p>
              </div>
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Healthcare</h3>
                <p className="text-sm">Hospital and clinic security with safeguarding protocols</p>
              </div>
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Legal & Professional</h3>
                <p className="text-sm">Client confidentiality and secure office operations</p>
              </div>
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Manufacturing</h3>
                <p className="text-sm">Site security, inventory protection and perimeter control</p>
              </div>
              <div className="glass-panel p-4">
                <h3 className="text-lg font-semibold">Retail & Distribution</h3>
                <p className="text-sm">Loss prevention and secure logistics operations</p>
              </div>
            </div>

            <h2>Our Corporate Security Approach</h2>
            <ol className="list-decimal pl-6">
              <li><strong>Security Audit:</strong> Comprehensive assessment of your premises, operations and risk factors</li>
              <li><strong>Tailored Strategy:</strong> Custom security plan aligned to your specific business needs and budget</li>
              <li><strong>Professional Deployment:</strong> SIA-licensed personnel trained for corporate environments and de-escalation</li>
              <li><strong>Access Management:</strong> Visitor protocols, credential verification and secure entry procedures</li>
              <li><strong>Incident Support:</strong> Swift response to security events with full documentation and escalation</li>
              <li><strong>Continuous Review:</strong> Regular assessments and strategy refinement based on emerging risks</li>
            </ol>

            <h2>Compliance &amp; Accreditation</h2>
            <ul>
              <li><strong>SIA Licensed Officers:</strong> All security personnel hold current SIA licenses and corporate security training</li>
              <li><strong>BS 7858 Vetting:</strong> Comprehensive background screening of all staff</li>
              <li><strong>ISO 9001 Certified:</strong> Quality-assured processes and consistent service delivery</li>
              <li><strong>Health &amp; Safety Aligned:</strong> Full compliance with HSE guidelines and workplace security standards</li>
              <li><strong>CHAS / SafeContractor:</strong> Verified safe contractor for regulated corporate sectors</li>
            </ul>

            <h2>Key Services</h2>
            <ul>
              <li>Manned security presence in reception and common areas</li>
              <li>Access control and visitor management</li>
              <li>Perimeter patrols and external monitoring</li>
              <li>Executive and VIP protection</li>
              <li>CCTV monitoring and incident response</li>
              <li>After-hours and out-of-hours security</li>
              <li>Emergency response and evacuation support</li>
            </ul>

            <h2>Secure Your Corporate Environment</h2>
            <p>
              Let Fortis Security help you create a safe, secure workplace for your team. We work seamlessly with your 
              management, HR and facilities teams to deliver professional, discreet security.
            </p>

            <h2>Request a Corporate Security Assessment</h2>
            <p className="mt-6">
              Contact our team for a confidential consultation and tailored security proposal.
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

export default CorporateSecurity;
