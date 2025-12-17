import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PageHeader from '../../components/PageHeader';

const ConstructionSiteSecurity = () => (
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
          <p>
            Protecting high-value sites with precision and presence. Fortis Security provides 24/7 site protection with visible,
            compliant and dependable guarding. We prevent unauthorised access, theft and vandalism while maintaining health and safety
            compliance.
          </p>

          <h3>Compliance &amp; Accreditation</h3>
          <ul>
            <li>SIA Licensed</li>
            <li>BS 7858 Screening</li>
            <li>CSCS Awareness</li>
            <li>ISO 9001 / 45001 Systems</li>
          </ul>

          <h3>Industries</h3>
          <p>Construction, warehousing, infrastructure and property.</p>

          <h3>Why Fortis</h3>
          <ul>
            <li>24/7 presence</li>
            <li>GPS patrol verification</li>
            <li>HSE compliance</li>
            <li>Rapid deployment</li>
          </ul>

          <Link to="/" className="inline-block mt-6 text-primary hover:text-primary-dark transition-colors">Back to Home</Link>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default ConstructionSiteSecurity;
