import React from 'react';
import { Link } from 'react-router-dom';

const PortalHeader = ({ title, description, eyebrow, children }) => {
  return (
    <header className="glass-panel mb-10 flex flex-col gap-6 px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-accent/90">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-bold tracking-wide text-white">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-white/70">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-4">
          {children}
        </div>
      )}
    </header>
  );
};

export default PortalHeader;