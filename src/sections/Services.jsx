import React from 'react';

const services = [
  {
    title: 'Integrated Guarding',
    description:
      'Armed and unarmed officers coordinated through a mobile-first workforce suite with GPS verified patrols and automatic compliance logging.',
    bullets: ['Rapid onboarding', 'Licensing management', 'Dynamic post orders'],
  },
  {
    title: 'Remote Command',
    description:
      '24/7 operations centre monitoring alarms, CCTV and IoT sensors to coordinate swift response and escalation workflows.',
    bullets: ['Realtime alerting', 'Supervisor escalation', 'Incident analytics'],
  },
  {
    title: 'Risk & Compliance',
    description:
      'Strategic audits, threat assessments and regulatory reporting delivered by certified consultants with industry frameworks.',
    bullets: ['SIA & BS7499 alignment', 'Business continuity', 'Executive briefings'],
  },
];

const Services = () => (
  <section id="services" className="relative py-24">
    <div className="absolute inset-0 -z-10 bg-gradient-to-b from-night-sky via-night-sky to-night-sky/80" />
    <div className="section-container">
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-accent">Specialised services</p>
        <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
          Full-spectrum security designed for multi-site operators
        </h2>
        <p className="mt-4 text-base text-white/70">
          Tailored programmes built around detailed risk assessments, compliance mandates and on-the-ground realities.
        </p>
      </header>
      <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <article key={service.title} className="glass-panel h-full p-8">
            <h3 className="text-xl font-semibold text-white">{service.title}</h3>
            <p className="mt-4 text-sm text-white/70">{service.description}</p>
            <ul className="mt-6 space-y-2 text-sm text-white">
              {service.bullets.map((bullet) => (
                <li key={bullet} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {bullet}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default Services;
