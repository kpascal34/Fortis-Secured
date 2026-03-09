import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const navigation = [
  { href: '/', label: 'Home' },
  {
    href: '/services',
    label: 'Services',
    children: [
      { href: '/services/manned-guarding', label: 'Manned Guarding' },
      { href: '/services/door-supervision', label: 'Door Supervision' },
      { href: '/services/event-security', label: 'Event Security' },
      { href: '/services/corporate-security', label: 'Corporate Security' },
      { href: '/services/construction-site-security', label: 'Construction Site Security' },
    ],
  },
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact' },
  { href: '/join-the-team', label: 'Join the Team' },
];

const isActive = (pathname, href) => {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
};

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false);
    setServicesOpen(false);
  }, [location.pathname]);

  // Track scroll for navbar background effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-md' : 'bg-white shadow-sm'
      }`}
    >
      <div className="mx-auto max-w-7xl px-2 sm:px-4 lg:px-6">
        <div className="flex h-24 items-center justify-between">
          <Link to="/" className="group inline-flex items-center">
            <img
              src="/FORTIS-2.gif"
              alt="Fortis Secured - Professional Security Services Logo"
              title="Fortis Secured Home"
              className="h-24 w-auto transform hover:scale-105 transition-transform duration-200"
              loading="eager"
              decoding="auto"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-8 lg:gap-12">
            {navigation.map((item) => (
              item.children ? (
                <div key={item.href} className="relative">
                  <button
                    type="button"
                    onClick={() => setServicesOpen((s) => !s)}
                    className={`text-sm font-medium transition inline-flex items-center gap-2 ${
                      isActive(location.pathname, item.href) ? 'text-primary' : 'text-gray-800 hover:text-primary'
                    }`}
                    aria-expanded={servicesOpen}
                  >
                    {item.label}
                    <svg className={`h-4 w-4 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none" stroke="currentColor">
                      <path d="M6 8l4 4 4-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <div
                    className={`absolute right-0 mt-2 w-60 rounded-xl bg-white shadow-xl ring-1 ring-black/5 transition-all duration-200 ${servicesOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}
                  >
                    <div className="py-2">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          to={child.href}
                          className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                            isActive(location.pathname, child.href) ? 'text-primary bg-primary/5' : 'text-gray-800 hover:bg-gray-50 hover:text-primary'
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`text-sm font-medium transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:bg-primary after:transition-all ${
                    isActive(location.pathname, item.href)
                      ? 'text-primary after:w-full'
                      : 'text-gray-800 hover:text-primary after:w-0 hover:after:w-full'
                  }`}
                >
                  {item.label}
                </Link>
              )
            ))}
            <a
              href="#contact"
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-night-sky hover:bg-accent/90 transition-colors shadow-lg hover:shadow-xl"
            >
              Get a Quote
            </a>
            <Link
              to="/portal"
              className="rounded-full border border-primary/20 px-6 py-2.5 text-sm font-medium text-primary hover:bg-primary hover:text-white transition-all"
            >
              Client Login
            </Link>
          </nav>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="inline-flex items-center md:hidden rounded-lg p-2 text-gray-800 hover:bg-gray-100"
          >
            <span className="sr-only">Open menu</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d={open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu with backdrop */}
      {open && (
        <div className="fixed inset-0 top-24 z-40 bg-black/20 md:hidden" onClick={() => setOpen(false)} />
      )}
      <div className={`md:hidden transition-all duration-300 overflow-hidden ${open ? 'max-h-screen' : 'max-h-0'}`}>
        <div className="space-y-1 px-4 pb-4 pt-2 bg-white border-t border-gray-100">
          {navigation.map((item) => (
            item.children ? (
              <div key={item.href} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setServicesOpen((s) => !s)}
                  className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  <span>{item.label}</span>
                  <svg className={`h-4 w-4 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none" stroke="currentColor">
                    <path d="M6 8l4 4 4-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {servicesOpen && (
                  <div className="pl-4 space-y-0.5">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        to={child.href}
                        className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                          isActive(location.pathname, child.href) ? 'text-primary bg-primary/5' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => setOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.href}
                to={item.href}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive(location.pathname, item.href) ? 'text-primary bg-primary/5' : 'text-gray-800 hover:bg-gray-50'
                }`}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            )
          ))}
          <div className="pt-2 space-y-2">
            <a
              href="#contact"
              className="block w-full rounded-lg bg-accent px-3 py-2.5 text-center text-sm font-semibold text-night-sky hover:bg-accent/90"
              onClick={() => setOpen(false)}
            >
              Get a Quote
            </a>
            <Link
              to="/portal"
              className="block w-full rounded-lg border border-primary/20 px-3 py-2.5 text-center text-sm font-medium text-primary hover:bg-primary hover:text-white transition-all"
              onClick={() => setOpen(false)}
            >
              Client Login
            </Link>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Navbar;
