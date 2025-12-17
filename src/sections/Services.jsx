import React from 'react';
import { RiShieldUserLine, RiRemoteControlLine, RiFileShieldLine } from 'react-icons/ri';

const services = [
  {
    title: 'Integrated Guarding',
    description:
      'Armed and unarmed officers coordinated through a smart workforce platform with real-time GPS tracking, digital patrol verification, and automated compliance reporting.',
    bullets: ['Rapid onboarding', 'Licensing management', 'Dynamic post orders'],
    icon: RiShieldUserLine,
  },
  {
    title: 'Mobile Patrols',
    description:
      'Visible deterrent and rapid-response coverage across multiple client sites. Our patrol officers perform scheduled and randomised inspections, ensuring asset protection, incident prevention, and peace of mind for clients.',
    bullets: ['GPS-verified patrols', 'Lock & unlock services', 'Out-of-hours response'],
    icon: RiRemoteControlLine,
  },
  {
    title: 'Risk & Compliance',
    description:
      'Strategic audits, threat assessments, and regulatory reporting delivered by certified consultants aligned with recognised industry frameworks.',
    bullets: ['SIA & BS7499 alignment', 'Business continuity', 'Executive briefings'],
    icon: RiFileShieldLine,
  },
];

const Services = () => (
  <section id="services" className="relative py-24 bg-white">
    <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white to-gray-50" />
    <div className="section-container">
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-accent">Specialised services</p>
        <h2 className="mt-4 text-3xl font-bold text-gray-900 sm:text-4xl">
          Full-spectrum security designed for multi-site operators
        </h2>
        <p className="mt-4 text-base text-gray-600">
          Tailored programmes built around detailed risk assessments, compliance mandates and on-the-ground realities.
        </p>
      </header>
      <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <article key={service.title} className="glass-panel h-full p-8">
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              {React.createElement(service.icon, { 
                className: "h-7 w-7 text-primary"
              })}
            </div>
            <h3 className="text-xl font-semibold text-gray-900">{service.title}</h3>
            <p className="mt-4 text-sm text-gray-600">{service.description}</p>
            <ul className="mt-6 space-y-2 text-sm text-gray-700">
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
