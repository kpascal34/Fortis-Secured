import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageHeader from '../components/PageHeader';

const Terms = () => (
  <div className="min-h-screen bg-white text-gray-900">
    <Navbar />
    <main>
      <PageHeader eyebrow="Legal" title="Terms & Conditions" />

      <section className="section-container py-12">
        <div className="prose max-w-none">
          <h2 className="text-lg font-semibold">Terms of Service</h2>
          <p>Use of our website implies acceptance of our terms. Fortis Security reserves the right to amend content or availability at any time.</p>
          <p className="mt-6">For full contractual terms regarding services and deployments please contact engage@fortissecured.com.</p>
          <Link to="/" className="inline-block mt-6 text-primary hover:text-primary-dark transition-colors">Back to Home</Link>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default Terms;
