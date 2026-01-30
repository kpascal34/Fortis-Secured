import React from 'react';
import { Link } from 'react-router-dom';

const AccessDenied = ({ title = 'Access denied', message = "You don't have permission to view this page." }) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-white/70">{message}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/portal"
          className="rounded-full bg-accent px-5 py-2 font-semibold text-white hover:bg-accent/90"
        >
          Back to portal
        </Link>
        <Link
          to="/"
          className="rounded-full border border-white/15 bg-white/5 px-5 py-2 font-semibold text-white/90 hover:bg-white/10"
        >
          Public site
        </Link>
      </div>
    </div>
  );
};

export default AccessDenied;
