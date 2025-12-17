import React from 'react';

const resources = [
  {
    title: 'Security Programme Blueprint',
    description: 'Download our governance model covering shift scheduling, escalation playbooks and KPI tracking.',
    action: 'Download PDF',
  },
  {
    title: 'Incident Response Checklist',
    description: 'Step-by-step workflow for guards, supervisors and clients to capture, triage and resolve incidents.',
    action: 'View checklist',
  },
  {
    title: 'Client success stories',
    description: 'See how Fortis Secured reduced incidents by 37% across a multi-site retail portfolio.',
    action: 'Read case studies',
  },
];

const Resources = () => (
  <section id="resources" className="relative py-24 bg-white">
    <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white to-gray-50" />
    <div className="section-container">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-accent">Resources</p>
        <h2 className="mt-4 text-3xl font-bold text-gray-900 sm:text-4xl">Bring the Fortis methodology to your next programme</h2>
        <p className="mt-4 text-base text-gray-600">
          Insights, templates and readiness guides to accelerate your mobilisation and ongoing assurance.
        </p>
      </header>
      <div className="mt-16 grid gap-6 lg:grid-cols-3">
        {resources.map((resource) => (
          <article key={resource.title} className="glass-panel flex h-full flex-col justify-between p-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-accent">Featured</p>
              <h3 className="mt-4 text-xl font-semibold text-gray-900">{resource.title}</h3>
              <p className="mt-3 text-sm text-gray-600">{resource.description}</p>
            </div>
            <a className="mt-6 inline-flex items-center text-sm font-semibold text-accent hover:text-primary-dark transition-colors" href="#contact">
              {resource.action}
              <span className="ml-2 text-lg">→</span>
            </a>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default Resources;
