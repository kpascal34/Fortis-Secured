import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useSEO } from '../lib/seo.js';

const NotFound = () => {
  useSEO({ title: 'Page Not Found | Fortis Secured', description: 'The page you requested could not be found.', noIndex: true });

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main className="flex flex-col items-center justify-center py-28 text-center px-6">
        <p className="text-accent font-semibold tracking-[0.3em] uppercase mb-2">Error 404</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-6">Page not found</h1>
        <p className="max-w-xl text-gray-600 mb-10">
          The page you are looking for might have been moved, renamed, or may never have existed. Use the navigation below to
          continue exploring Fortis Secured.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link className="px-6 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary-dark transition-all" to="/">
            Return to Homepage
          </Link>
          <Link className="px-6 py-3 rounded-full border border-gray-200 hover:border-primary transition-all" to="/portal">
            Access Portal
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
