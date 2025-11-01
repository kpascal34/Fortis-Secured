import React from 'react';

const differentiators = [
  {
    title: 'Operational excellence',
    description: 'National Control Centre dispatching 1,200+ guard tours monthly with guaranteed response SLAs.',
  },
  {
    title: 'Technology-first',
    description: 'Appwrite-native platform for realtime data, integrations and secure client collaboration.',
  },
  {
    title: 'Trusted expertise',
    description: 'SIA licensed supervisors and consultants aligned to BS7499, ISO 27001 and industry best practice.',
  },
];

const About = () => (
  <section id="about" className="relative py-24">
    <div className="absolute inset-0 -z-10 bg-gradient-to-b from-night-sky/80 to-night-sky" />
    <div className="section-container grid gap-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-accent">About Fortis Secured</p>
        <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
          Trusted by commercial real estate leaders across the UK
        </h2>
        <p className="mt-6 text-base text-white/70">
          We combine decades of frontline experience with modern cloud infrastructure to deliver proactive, accountable security
          programmes. Our teams act as an extension of your organisation, embedding into operations and governance to deliver
          measurable outcomes.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {differentiators.map((item) => (
            <div key={item.title} className="glass-panel p-6">
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-3 text-sm text-white/70">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="glass-panel space-y-6 p-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-accent">Accreditations</p>
          <ul className="mt-4 space-y-3 text-sm text-white/70">
            <li>BS7499:2020 Static Site Guarding</li>
            <li>ISO 9001 Quality Management</li>
            <li>Cyber Essentials Plus</li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-accent">Leadership quotes</p>
          <blockquote className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/80">
            “Fortis Secured give us the visibility to act early and prove compliance across our portfolio.”
            <footer className="mt-4 text-xs uppercase tracking-[0.3em] text-white/60">Operations Director · Industrial Portfolio</footer>
          </blockquote>
        </div>
      </div>
    </div>
  </section>
);

export default About;
