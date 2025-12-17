import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageHeader from '../components/PageHeader';

const CookiePolicy = () => (
  <div className="min-h-screen bg-white text-gray-900">
    <Navbar />
    <main>
      <PageHeader eyebrow="Legal" title="Cookie Policy" />

      <section className="section-container py-12">
        <div className="prose max-w-none">
          <h2 className="text-lg font-semibold">Cookies Policy</h2>
          <p>We use cookies to improve site performance and analytics. Continued use of this site constitutes consent to our use of cookies.</p>
          <p className="mt-6">You can control cookie preferences via your browser settings. For detailed information contact engage@fortissecured.com.</p>
          <Link to="/" className="inline-block mt-6 text-primary hover:text-primary-dark transition-colors">Back to Home</Link>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default CookiePolicy;
