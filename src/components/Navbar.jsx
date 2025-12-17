import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const navigation = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services', children: [
    { href: '/services/manned-guarding', label: 'Manned Guarding' },
    { href: '/services/door-supervision', label: 'Door Supervision' },
    { href: '/services/event-security', label: 'Event Security' },
    { href: '/services/corporate-security', label: 'Corporate Security' },
    { href: '/services/construction-site-security', label: 'Construction Site Security' },
  ] },
  { href: '/join-the-team', label: 'Join the Team' },
  { href: '#about', label: 'About Us', isAnchor: true },
  { href: '#contact', label: 'Contact', isAnchor: true },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const location = useLocation();

  const handleScroll = (event, targetId) => {
    event.preventDefault();
    const element = document.getElementById(targetId.replace('#', ''));
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setOpen(false);
    } else if (location.pathname !== '/') {
      // If we're not on the home page, navigate there first
      window.location.href = `/${targetId}`;
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed inset-x-0 top-0 z-50 bg-white shadow-sm"
    >
      <div className="mx-auto max-w-7xl px-2 sm:px-4 lg:px-6">
        <div className="flex h-24 items-center justify-between">
          <Link to="/" className="group inline-flex items-center">
            <img src="/FORTIS-2.gif" alt="Fortis Security" className="h-24 w-auto transform hover:scale-105 transition-transform duration-200" />
          </Link>
          <nav className="hidden md:flex items-center gap-12">
            {navigation.map((item) => (
              item.children ? (
                <div key={item.href} className="relative">
                  <button
                    type="button"
                    onClick={() => setServicesOpen((s) => !s)}
                    className="text-sm font-medium text-gray-800 hover:text-primary transition inline-flex items-center gap-2"
                    aria-expanded={servicesOpen}
                  >
                    {item.label}
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                      <path d="M6 8l4 4 4-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <div
                    className={`absolute right-0 mt-2 w-60 rounded-md bg-white shadow-lg ring-1 ring-black/5 transition-opacity ${servicesOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                  >
                    <div className="py-2">
                      {item.children.map((child) => (
                        <Link key={child.href} to={child.href} className="block px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100">
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                item.isAnchor ? (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={(e) => handleScroll(e, item.href)}
                    className="text-sm font-medium text-gray-800 hover:text-primary transition cursor-pointer"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="text-sm font-medium text-gray-800 hover:text-primary transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full"
                  >
                    {item.label}
                  </Link>
                )
              )
            ))}
            <Link
              to="/portal"
              className="rounded-full bg-primary px-8 py-3 text-sm font-medium text-white hover:bg-primary-dark transition-colors shadow-lg hover:shadow-xl"
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
      
      {/* Mobile menu */}
      <div className={`md:hidden ${open ? "block" : "hidden"}`}>
        <div className="space-y-1 px-4 pb-3 pt-2">
          {navigation.map((item) => (
            item.children ? (
              <div key={item.href} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setServicesOpen((s) => !s)}
                  className="w-full flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100"
                >
                  <span>{item.label}</span>
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                    <path d="M6 8l4 4 4-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {servicesOpen && (
                  <div className="pl-4">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        to={child.href}
                        className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                        onClick={() => setOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              item.isAnchor ? (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleScroll(e, item.href)}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 cursor-pointer"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  to={item.href}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              )
            )
          ))}
          <Link
            to="/portal"
            className="block w-full rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-white hover:bg-primary-dark"
            onClick={() => setOpen(false)}
          >
            Client Login
          </Link>
        </div>
      </div>
    </motion.header>
  );
};

export default Navbar;
