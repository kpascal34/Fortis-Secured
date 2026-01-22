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
          <a className="hover:text-accent" href="#services">Services</a>
          <a className="hover:text-accent mt-1" href="/join-the-team">Join the Team</a>
          <a className="hover:text-accent mt-1" href="#about">About Us</a>
          <a className="hover:text-accent mt-1" href="#contact">Contact</a>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900 mb-2">Legal</span>
          <a className="hover:text-accent" href="/privacy-policy">Privacy Policy</a>
          <a className="hover:text-accent mt-1" href="/terms">Terms &amp; Conditions</a>
          <a className="hover:text-accent mt-1" href="/cookie-policy">Cookie Policy</a>
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
