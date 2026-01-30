import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="border-t border-gray-200 bg-white">
    <div className="section-container flex flex-col gap-8 py-10 text-sm text-gray-600 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-2">
        <p>© {new Date().getFullYear()} Fortis Secured. All rights reserved.</p>
        <p className="text-xs text-gray-500">Registered company details and contact information available on request.</p>
      </div>
      <div className="flex flex-wrap items-start gap-8">
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900 mb-2">Explore</span>
          <Link className="hover:text-accent" to="/services">Services</Link>
          <Link className="hover:text-accent mt-1" to="/join-the-team">Join the Team</Link>
          <Link className="hover:text-accent mt-1" to="/about">About Us</Link>
          <Link className="hover:text-accent mt-1" to="/contact">Contact</Link>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900 mb-2">Legal</span>
          <Link className="hover:text-accent" to="/privacy-policy">Privacy Policy</Link>
          <Link className="hover:text-accent mt-1" to="/terms">Terms &amp; Conditions</Link>
          <Link className="hover:text-accent mt-1" to="/cookie-policy">Cookie Policy</Link>
          <a className="hover:text-accent mt-1" href="/sitemap.xml">Sitemap</a>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900 mb-2">Portal</span>
          <Link className="hover:text-accent" to="/portal">Client Portal</Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
