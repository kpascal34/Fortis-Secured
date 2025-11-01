import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-night-sky text-white text-center px-6">
    <p className="text-accent font-semibold tracking-[0.3em] uppercase mb-2">Error 404</p>
    <h1 className="text-4xl sm:text-5xl font-extrabold mb-6">Page not found</h1>
    <p className="max-w-xl text-white/70 mb-10">
      The page you are looking for might have been moved, renamed, or may never have existed. Use the navigation below to
      continue exploring Fortis Secured.
    </p>
    <div className="flex flex-col sm:flex-row gap-4">
      <Link className="px-6 py-3 rounded-full bg-accent text-night-sky font-semibold" to="/">
        Back to homepage
      </Link>
      <Link className="px-6 py-3 rounded-full border border-white/20 hover:border-accent" to="/portal">
        Visit client portal
      </Link>
    </div>
  </div>
);

export default NotFound;
