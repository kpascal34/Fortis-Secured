import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="border-t border-gray-200 bg-white">
    {/* Main footer content */}
    <div className="section-container py-12">
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand column */}
        <div className="space-y-4">
          <img
            src="/FORTIS-2.gif"
            alt="Fortis Secured"
            className="h-16 w-auto"
            loading="lazy"
          />
          <p className="text-sm text-gray-600 leading-relaxed">
            Professional security services with compliance-first operations, real-time reporting, and responsive 24/7 support across the UK.
          </p>
          {/* Social links */}
          <div className="flex items-center gap-3 pt-2">
            <a href="https://www.linkedin.com/company/fortis-secured" target="_blank" rel="noopener noreferrer" className="rounded-lg bg-gray-100 p-2 text-gray-500 hover:bg-primary hover:text-white transition-colors" aria-label="LinkedIn">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <a href="https://www.instagram.com/fortissecured" target="_blank" rel="noopener noreferrer" className="rounded-lg bg-gray-100 p-2 text-gray-500 hover:bg-primary hover:text-white transition-colors" aria-label="Instagram">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href="https://x.com/FortisSecured" target="_blank" rel="noopener noreferrer" className="rounded-lg bg-gray-100 p-2 text-gray-500 hover:bg-primary hover:text-white transition-colors" aria-label="X (Twitter)">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
          </div>
        </div>

        {/* Explore column */}
        <div className="flex flex-col text-sm">
          <span className="font-semibold text-gray-900 mb-3">Explore</span>
          <Link className="text-gray-600 hover:text-primary transition-colors py-1" to="/services">Services</Link>
          <Link className="text-gray-600 hover:text-primary transition-colors py-1" to="/join-the-team">Join the Team</Link>
          <Link className="text-gray-600 hover:text-primary transition-colors py-1" to="/about">About Us</Link>
          <Link className="text-gray-600 hover:text-primary transition-colors py-1" to="/contact">Contact</Link>
          <Link className="text-gray-600 hover:text-primary transition-colors py-1" to="/schedule-demo">Schedule Demo</Link>
        </div>

        {/* Legal column */}
        <div className="flex flex-col text-sm">
          <span className="font-semibold text-gray-900 mb-3">Legal</span>
          <Link className="text-gray-600 hover:text-primary transition-colors py-1" to="/privacy-policy">Privacy Policy</Link>
          <Link className="text-gray-600 hover:text-primary transition-colors py-1" to="/terms">Terms &amp; Conditions</Link>
          <Link className="text-gray-600 hover:text-primary transition-colors py-1" to="/cookie-policy">Cookie Policy</Link>
          <a className="text-gray-600 hover:text-primary transition-colors py-1" href="/sitemap.xml">Sitemap</a>
          <Link className="text-gray-600 hover:text-primary transition-colors py-1" to="/portal">Client Portal</Link>
        </div>

        {/* Accreditations column */}
        <div className="flex flex-col text-sm">
          <span className="font-semibold text-gray-900 mb-3">Accreditations</span>
          <div className="space-y-3 text-gray-600">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>SIA Approved Contractor</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <span>ACS Pacesetters</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>BS7858 Vetting</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Nationwide Coverage</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="border-t border-gray-100">
      <div className="section-container flex flex-col items-center justify-between gap-4 py-6 text-xs text-gray-500 sm:flex-row">
        <p>&copy; {new Date().getFullYear()} Fortis Secured Ltd. All rights reserved.</p>
        <p>Registered in England &amp; Wales. Company details available on request.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
