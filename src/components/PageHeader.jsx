import React from 'react';

const PageHeader = ({ title, eyebrow, subtitle }) => (
  <header className="bg-white py-16">
    <div className="section-container">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-500">{eyebrow}</p>
      <h1 className="mt-4 text-4xl font-extrabold text-gray-900 sm:text-5xl">{title}</h1>
      {subtitle && <p className="mt-4 max-w-2xl text-lg text-gray-600">{subtitle}</p>}
    </div>
  </header>
);

export default PageHeader;
