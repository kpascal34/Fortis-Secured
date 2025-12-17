import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PageHeader from '../../components/PageHeader';

const EventSecurity = () => (
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
          <p>
            Precision, planning and presence for every event. Fortis Security delivers tailored event security services to protect guests,
            assets and reputation. From small corporate functions to large-scale festivals, we provide proactive management, access control
            and incident prevention.
          </p>

          <h3>Compliance &amp; Accreditation</h3>
          <ul>
            <li>SIA Licensed Personnel</li>
            <li>BS 7858 Screening</li>
            <li>Event Risk Assessment Compliance</li>
            <li>Emergency Response Preparedness</li>
            <li>CHAS / SafeContractor</li>
          </ul>

          <h3>Event Types</h3>
          <p>Corporate launches, festivals & concerts, sports, community events and VIP/private functions.</p>

          <Link to="/" className="inline-block mt-6 text-primary hover:text-primary-dark transition-colors">Back to Home</Link>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default EventSecurity;
