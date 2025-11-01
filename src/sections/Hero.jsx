import React from 'react';
import { Link } from 'react-router-dom';

const Hero = () => (
  <section className="relative overflow-hidden pb-32 pt-36">
    <div className="absolute inset-0 -z-10">
      <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-b from-night-sky via-night-sky/95 to-night-sky" />
    </div>
    <div className="section-container grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
      <div className="space-y-8">
        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
          Intelligence-led security
        </span>
        <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
          Modern protection for complex facilities
        </h1>
        <p className="max-w-xl text-lg text-white/70">
          Fortis Secured pairs specialist guarding with a unified operations portal so industrial, retail and commercial
          properties can anticipate threats, manage teams and prove compliance in real time.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <a
            className="inline-flex items-center justify-center rounded-full bg-accent px-8 py-3 text-sm font-semibold text-night-sky shadow-lg shadow-accent/30 hover:bg-accent/90"
            href="#contact"
          >
            Book a consultation
          </a>
          <a
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-3 text-sm font-semibold text-white hover:border-accent"
            href="#platform"
          >
            Explore the platform
          </a>
        </div>
        <dl className="flex flex-wrap gap-6 text-sm text-white/60">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <dt className="font-semibold text-white">24/7 Ops Centre</dt>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" />
            <dt className="font-semibold text-white">Appwrite Secured</dt>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
            <dt className="font-semibold text-white">ISO 27001 Ready</dt>
          </div>
        </dl>
      </div>
      <div className="glass-panel relative overflow-hidden p-8">
        <div className="absolute -right-10 top-10 h-40 w-40 rounded-full bg-accent/40 blur-3xl" />
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Live site posture</h3>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Metro Shopping Centre · Guards on duty
              </li>
              <li className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                Riverside Offices · Incident triage
              </li>
              <li className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                Industrial Park · Patrol in progress
              </li>
            </ul>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
            <p className="text-sm uppercase tracking-[0.3em] text-white/60">Response KPI</p>
            <p className="mt-2 text-4xl font-bold">04:21</p>
            <p className="text-xs uppercase text-white/60">Avg. dispatch time</p>
            <p className="mt-4 text-sm text-white/70">Synced in real-time from the Fortis portal</p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default Hero;
