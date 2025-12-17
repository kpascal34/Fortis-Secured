import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PageHeader from '../../components/PageHeader';

const CorporateSecurity = () => (
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
          <p>
            Professional security for professional environments. Fortis Security provides corporate and concierge security tailored for
            business premises. Our personnel uphold your brand image while ensuring safety, confidentiality and compliance.
          </p>

          <h3>Compliance &amp; Accreditation</h3>
          <ul>
            <li>BS 7858 Vetting</li>
            <li>SIA Licensing</li>
            <li>ISO 9001 &amp; 45001 Alignment</li>
            <li>GDPR &amp; Confidentiality Training</li>
          </ul>

          <h3>Industries</h3>
          <p>Financial, government, education, healthcare and residential sectors.</p>

          <Link to="/" className="inline-block mt-6 text-primary hover:text-primary-dark transition-colors">Back to Home</Link>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default CorporateSecurity;
