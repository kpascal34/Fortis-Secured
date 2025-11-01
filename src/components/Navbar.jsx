import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

const navigation = [
  { href: '#services', label: 'Services' },
  { href: '#platform', label: 'Platform' },
  { href: '#about', label: 'About' },
  { href: '#resources', label: 'Resources' },
  { href: '#contact', label: 'Contact' },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <nav className="section-container flex items-center justify-between py-6">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-wide">
          <span className="text-white/80">Fortis</span>
          <span className="text-accent">Secured</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 lg:hidden"
        >
          Menu
        </button>
        <div className="hidden lg:flex lg:items-center lg:gap-8">
          <ul className="flex items-center gap-6 text-sm text-white/70">
            {navigation.map((item) => (
              <li key={item.href}>
                <a className="hover:text-accent" href={item.href}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <Link
            to="/portal"
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-night-sky shadow-lg shadow-accent/20"
          >
            Client Login
          </Link>
        </div>
      </nav>
      <div
        className={clsx(
          'lg:hidden transition-all origin-top',
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        )}
      >
        <div className="mx-6 mb-4 space-y-4 rounded-3xl border border-white/10 bg-night-sky/95 px-6 py-6 text-sm text-white/70">
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-2xl px-3 py-2 hover:bg-white/10"
            >
              {item.label}
            </a>
          ))}
          <Link
            to="/portal"
            onClick={() => setOpen(false)}
            className="block rounded-2xl bg-accent px-3 py-2 text-center font-semibold text-night-sky"
          >
            Client Login
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
