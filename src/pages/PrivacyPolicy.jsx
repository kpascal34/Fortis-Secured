import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageHeader from '../components/PageHeader';

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-white text-gray-900">
    <Navbar />
    <main>
      <PageHeader eyebrow="Legal" title="Privacy Policy" />

      <section className="section-container py-12">
        <div className="prose max-w-none">
          <h2 className="text-lg font-semibold">Privacy Policy</h2>
          <p>We handle personal data in accordance with UK GDPR. Information is collected for legitimate business use only.</p>
          <p className="mt-6">If you have questions about how we use personal data please contact engage@fortissecured.com.</p>
          <Link to="/" className="inline-block mt-6 text-primary hover:text-primary-dark transition-colors">Back to Home</Link>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default PrivacyPolicy;
