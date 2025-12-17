import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PageHeader from '../../components/PageHeader';

const MannedGuarding = () => (
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
          <p>
            Dependable, professional and compliant protection for every environment. Fortis Security provides fully managed
            manned guarding solutions that deliver consistency, presence and peace of mind. Our guards are more than a visible deterrent —
            they represent your business, uphold your standards and operate under a culture of accountability and professionalism.
          </p>

          <h3>Compliance &amp; Accreditation</h3>
          <ul>
            <li>BS 7858 Security Screening</li>
            <li>SIA Licensing</li>
            <li>ISO 9001 / 45001 Alignment</li>
            <li>CHAS / SafeContractor Accreditation</li>
          </ul>

          <h3>Industries Served</h3>
          <p>Construction, Warehousing, Corporate, Education, Manufacturing, Residential and more.</p>

          <p className="mt-6">Contact us to discuss your manned guarding requirements and experience a higher standard of professional security.</p>
          <Link to="/" className="inline-block mt-6 text-primary hover:text-primary-dark transition-colors">Back to Home</Link>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default MannedGuarding;
