import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageHeader from '../components/PageHeader';
import { useSEO } from '../lib/seo.js';
import { breadcrumbListSchema, injectSchemas } from '../lib/schema.js';
import { getDefaultOGImage } from '../lib/imageMetadata.js';

const initialState = {
  name: '',
  company: '',
  email: '',
  phone: '',
  message: '',
  service: 'Integrated Guarding',
};

const Contact = () => {
  useSEO({
    title: 'Contact Fortis Secured | Security Services Inquiry',
    description: 'Get in touch with Fortis Secured for a security consultation. Call, email, or complete our online enquiry form.',
    image: getDefaultOGImage(),
  });

  const [form, setForm] = useState(initialState);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const breadcrumbs = [
      { label: 'Home', path: '/' },
      { label: 'Contact', path: '/contact' },
    ];
    injectSchemas([breadcrumbListSchema(breadcrumbs)]);
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    // Reset after 3 seconds to allow another submission
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <PageHeader
          eyebrow="Get in Touch"
          title="Contact Our Team"
          subtitle="For enquiries, quotes or consultations, reach out to our management team."
        />

        <section className="relative py-24 bg-white">
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-white via-white to-gray-50" />
          <div className="section-container grid gap-16 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-accent">Contact Info</p>
              <h2 className="mt-4 text-3xl font-bold text-gray-900 sm:text-4xl">Speak to Our Team</h2>
              <p className="mt-6 text-base text-gray-600">
                We're available 24/7 for emergencies and during business hours for consultations. Complete our online form for a prompt
                response.
              </p>
              <div className="mt-8 flex items-center justify-center gap-6">
                <a href="mailto:engage@fortissecured.com" aria-label="Email Fortis" className="group flex flex-col items-center">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-lg transition-all duration-200 group-hover:scale-105 group-hover:bg-primary/20 group-hover:shadow-primary/25">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      />
                    </svg>
                  </div>
                  <span className="mt-2 text-sm text-gray-600 transition-colors group-hover:text-primary">Email</span>
                </a>
                <a href="tel:+442012345678" aria-label="Call Fortis" className="group flex flex-col items-center">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-lg transition-all duration-200 group-hover:scale-105 group-hover:bg-primary/20 group-hover:shadow-primary/25">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                      />
                    </svg>
                  </div>
                  <span className="mt-2 text-sm text-gray-600 transition-colors group-hover:text-primary">Phone</span>
                </a>
                <a
                  href="https://www.linkedin.com/company/fortis-secured"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Fortis on LinkedIn"
                  className="group flex flex-col items-center"
                >
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-lg transition-all duration-200 group-hover:scale-105 group-hover:bg-primary/20 group-hover:shadow-primary/25">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </div>
                  <span className="mt-2 text-sm text-gray-600 transition-colors group-hover:text-primary">LinkedIn</span>
                </a>
              </div>

              <dl className="mt-10 space-y-6 text-gray-600">
                <div>
                  <dt className="text-sm font-semibold text-gray-900">Office Locations</dt>
                  <dd className="text-sm">Yorkshire &amp; Greater Manchester</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-gray-900">Email</dt>
                  <dd className="text-sm">
                    <a href="mailto:engage@fortissecured.com" className="text-primary hover:underline">
                      engage@fortissecured.com
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-gray-900">Phone</dt>
                  <dd className="text-sm">
                    <a href="tel:+442012345678" className="text-primary hover:underline">
                      +44 (0)201 234 5678
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-gray-900">Operations</dt>
                  <dd className="text-sm">24/7 Emergency Response · Business Hours Consultations</dd>
                </div>
              </dl>
            </div>
            <div className="glass-panel p-10">
              {submitted ? (
                <div className="space-y-4 text-center">
                  <div className="mx-auto h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-accent" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900">Thank you!</h3>
                  <p className="text-sm text-gray-600">
                    Your request has been captured. A member of our team will reach out within one business day.
                  </p>
                </div>
              ) : (
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col text-sm text-gray-600">
                      Name
                      <input
                        required
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        className="mt-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-accent focus:outline-none"
                        placeholder="Your name"
                      />
                    </label>
                    <label className="flex flex-col text-sm text-gray-600">
                      Company
                      <input
                        required
                        type="text"
                        name="company"
                        value={form.company}
                        onChange={handleChange}
                        className="mt-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-accent focus:outline-none"
                        placeholder="Company or site"
                      />
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col text-sm text-gray-600">
                      Email
                      <input
                        required
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        className="mt-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-accent focus:outline-none"
                        placeholder="you@company.com"
                      />
                    </label>
                    <label className="flex flex-col text-sm text-gray-600">
                      Phone
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        className="mt-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-accent focus:outline-none"
                        placeholder="Contact number"
                      />
                    </label>
                  </div>
                  <label className="flex flex-col text-sm text-gray-600">
                    Service focus
                    <select
                      name="service"
                      value={form.service}
                      onChange={handleChange}
                      className="mt-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-accent focus:outline-none"
                    >
                      <option className="text-night-sky">Integrated Guarding</option>
                      <option className="text-night-sky">Manned Guarding</option>
                      <option className="text-night-sky">Door Supervision</option>
                      <option className="text-night-sky">Event Security</option>
                      <option className="text-night-sky">Corporate Security</option>
                      <option className="text-night-sky">Construction Site Security</option>
                    </select>
                  </label>
                  <label className="flex flex-col text-sm text-gray-600">
                    Project background
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      rows="4"
                      className="mt-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-accent focus:outline-none"
                      placeholder="Share objectives, portfolio size and timelines"
                    />
                  </label>
                  <button
                    type="submit"
                    className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-night-sky shadow-lg shadow-accent/40 hover:bg-accent/90"
                  >
                    Request consultation
                  </button>
                  <p className="text-xs text-gray-500">
                    By submitting this form you agree to the Fortis Secured privacy statement. We'll only use your details to respond to your
                    enquiry.
                  </p>
                </form>
              )}
            </div>
          </div>
        </section>

        <section className="py-12 bg-gray-50">
          <div className="section-container text-center">
            <h2 className="text-2xl font-bold text-gray-900">Explore Our Services</h2>
            <p className="mt-4 text-gray-600">Discover comprehensive security solutions tailored to your needs.</p>
            <div className="mt-8">
              <Link
                to="/services/manned-guarding"
                className="inline-block px-6 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary-dark transition-all"
              >
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

export default Contact;
