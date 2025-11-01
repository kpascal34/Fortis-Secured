import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="border-t border-white/10 bg-night-sky/80">
    <div className="section-container flex flex-col gap-6 py-10 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
      <p>© {new Date().getFullYear()} Fortis Secured. All rights reserved.</p>
      <div className="flex flex-wrap items-center gap-4">
        <a className="hover:text-accent" href="#contact">
          Contact
        </a>
        <a className="hover:text-accent" href="#resources">
          Resources
        </a>
        <Link className="hover:text-accent" to="/portal">
          Client Portal
        </Link>
      </div>
    </div>
  </footer>
);

export default Footer;
