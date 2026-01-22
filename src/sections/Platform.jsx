import React from 'react';

const capabilities = [
  {
    title: 'Unified Command Centre',
    description:
      'Monitor incidents, shift performance and guard wellbeing through configurable dashboards with automated alerts and SLA tracking.',
    stats: [
      { label: 'App uptime', value: '99.95%' },
      { label: 'Sites managed', value: '350+' },
      { label: 'Realtime refresh', value: '12s' },
    ],
  },
  {
    title: 'Role-based Workflows',
    description:
      'Permissions mapped to PRD requirements with dedicated experiences for Admin, Client, Guard and Supervisor personas via Appwrite Teams.',
    bullets: [
      'Multi-factor authentication with SSO support',
      'Incident lifecycle automation and guard dispatch',
      'Asset registers tied to shifts, invoices and logs',
      'Audit-ready compliance reporting and exports',
    ],
  },
];

const Platform = () => (
  <section id="platform" className="relative py-24 bg-white">
    <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white to-gray-50" />
    <div className="section-container">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-dark">Fortis Portal</p>
        <h2 className="mt-4 text-3xl font-bold text-gray-900 sm:text-4xl">
          Operate with confidence from any device
        </h2>
        <p className="mt-4 text-base text-gray-600">
          A secure Appwrite-powered platform delivering realtime notifications, incident management, asset controls and guard
          collaboration tailored to your role.
        </p>
      </header>
      <div className="mt-16 grid gap-10 lg:grid-cols-2">
        {capabilities.map((item) => (
          <article key={item.title} className="glass-panel p-10">
            <h3 className="text-2xl font-semibold text-gray-900">{item.title}</h3>
            <p className="mt-4 text-sm text-gray-600">{item.description}</p>
            {item.stats && (
              <dl className="mt-8 grid grid-cols-3 gap-4 text-center text-gray-900">
                {item.stats.map((stat) => (
                  <div key={stat.label}>
                    <dt className="text-3xl font-extrabold text-brand">{stat.value}</dt>
                    <dd className="mt-2 text-xs uppercase tracking-wider text-gray-600">{stat.label}</dd>
                  </div>
                ))}
              </dl>
            )}
            {item.bullets && (
              <ul className="mt-6 space-y-3 text-sm text-gray-700">
                {item.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default Platform;
