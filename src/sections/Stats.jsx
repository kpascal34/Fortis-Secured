import React, { useEffect, useRef, useState } from 'react';

const stats = [
  { value: 10, suffix: '+', label: 'Years Experience' },
  { value: 500, suffix: '+', label: 'Guards Deployed' },
  { value: 150, suffix: '+', label: 'Sites Covered' },
  { value: 99.8, suffix: '%', label: 'Uptime SLA' },
];

const testimonials = [
  {
    quote:
      'Fortis Secured transformed our site security with their technology-driven approach. The real-time reporting and compliance tracking gives us complete visibility.',
    author: 'Operations Director',
    company: 'National Retail Group',
  },
  {
    quote:
      'Professional, reliable and genuinely invested in our safety. The transition from our previous provider was seamless and the improvement in service quality was immediate.',
    author: 'Facilities Manager',
    company: 'Commercial Property Portfolio',
  },
  {
    quote:
      'Their compliance-first approach and digital platform set them apart. We have full confidence in the calibre of officers they deploy across our sites.',
    author: 'Head of Security',
    company: 'Construction & Infrastructure Firm',
  },
];

const CountUp = ({ target, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 2000;
          const steps = 60;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current * 10) / 10);
            }
          }, duration / steps);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  const display = Number.isInteger(target) ? Math.floor(count) : count.toFixed(1);

  return (
    <span ref={ref}>
      {display}{suffix}
    </span>
  );
};

const Stats = () => (
  <section className="relative py-24 bg-gray-50">
    <div className="section-container">
      {/* Statistics */}
      <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-4xl font-bold text-primary sm:text-5xl">
              <CountUp target={stat.value} suffix={stat.suffix} />
            </p>
            <p className="mt-2 text-sm font-medium text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Testimonials */}
      <div className="mt-20">
        <header className="mx-auto max-w-3xl text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-dark">Testimonials</p>
          <h2 className="mt-4 text-3xl font-bold text-gray-900 sm:text-4xl">
            Trusted by businesses across the UK
          </h2>
        </header>
        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((t) => (
            <article key={t.company} className="relative rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <svg className="absolute top-6 left-6 h-8 w-8 text-primary/15" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391C0 7.905 3.748 4.039 9 3l.996 2.151C7.563 6.068 6 8.789 6 11h4v10H0z" />
              </svg>
              <blockquote className="relative z-10 mt-8 text-sm leading-relaxed text-gray-700">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="mt-6 border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-gray-900">{t.author}</p>
                <p className="text-xs text-gray-500">{t.company}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default Stats;
