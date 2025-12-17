import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PageHeader from '../../components/PageHeader';

const DoorSupervision = () => (
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
          <p>
            Professionalism, presence and protection at every venue. Fortis Security provides licensed door supervisors who combine
            professionalism with situational awareness to protect venues, staff and patrons. Our teams are selected for communication
            skills, composure under pressure and adherence to SIA and BS 7858 standards.
          </p>

          <h3>Compliance &amp; Accreditation</h3>
          <ul>
            <li>SIA Licensed</li>
            <li>BS 7858 Vetted</li>
            <li>ISO-aligned Management</li>
            <li>Conflict Management &amp; First Aid Certified</li>
          </ul>

          <h3>Industries &amp; Venues</h3>
          <p>Bars, clubs, hotels, festivals and private events.</p>

          <Link to="/" className="inline-block mt-6 text-primary hover:text-primary-dark transition-colors">Back to Home</Link>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default DoorSupervision;
