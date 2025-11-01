import React, { useState } from 'react';

const initialState = {
  name: '',
  company: '',
  email: '',
  phone: '',
  message: '',
  service: 'Integrated Guarding',
};

const Contact = () => {
  const [form, setForm] = useState(initialState);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <section id="contact" className="relative py-24">
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-night-sky via-night-sky to-primary-dark/50" />
      <div className="section-container grid gap-16 lg:grid-cols-2 lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-accent">Contact</p>
          <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Schedule a consultation with Fortis Secured</h2>
          <p className="mt-6 text-base text-white/70">
            Share your portfolio requirements and our mobilisation team will craft a tailored security and technology roadmap,
            covering guard force design, Appwrite data integrations, and go-live milestones.
          </p>
          <dl className="mt-10 space-y-6 text-white/70">
            <div>
              <dt className="text-sm font-semibold text-white">Head office</dt>
              <dd className="text-sm">17 Bishopsgate, London EC2N 3AR</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-white">Email</dt>
              <dd className="text-sm">engage@fortissecured.com</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-white">Phone</dt>
              <dd className="text-sm">+44 (0)20 1234 5678</dd>
            </div>
          </dl>
        </div>
        <div className="glass-panel p-10">
          {submitted ? (
            <div className="space-y-4 text-center">
              <h3 className="text-2xl font-semibold text-white">Thank you!</h3>
              <p className="text-sm text-white/70">
                Your request has been captured. A member of the Fortis mobilisation team will reach out within one business day.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-6 inline-flex items-center rounded-full bg-accent px-6 py-2 text-sm font-semibold text-night-sky"
              >
                Submit another enquiry
              </button>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col text-sm text-white/70">
                  Name
                  <input
                    required
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="mt-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                    placeholder="Jordan Blake"
                  />
                </label>
                <label className="flex flex-col text-sm text-white/70">
                  Company
                  <input
                    required
                    type="text"
                    name="company"
                    value={form.company}
                    onChange={handleChange}
                    className="mt-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                    placeholder="Riverside Offices"
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col text-sm text-white/70">
                  Email
                  <input
                    required
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="mt-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                    placeholder="you@company.com"
                  />
                </label>
                <label className="flex flex-col text-sm text-white/70">
                  Phone
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="mt-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                    placeholder="+44 7700 900123"
                  />
                </label>
              </div>
              <label className="flex flex-col text-sm text-white/70">
                Service focus
                <select
                  name="service"
                  value={form.service}
                  onChange={handleChange}
                  className="mt-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white focus:border-accent focus:outline-none"
                >
                  <option className="text-night-sky">Integrated Guarding</option>
                  <option className="text-night-sky">Remote Command</option>
                  <option className="text-night-sky">Risk & Compliance</option>
                  <option className="text-night-sky">Full Programme Assessment</option>
                </select>
              </label>
              <label className="flex flex-col text-sm text-white/70">
                Project background
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  rows="4"
                  className="mt-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                  placeholder="Share objectives, portfolio size and timelines"
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-night-sky shadow-lg shadow-accent/40 hover:bg-accent/90"
              >
                Request consultation
              </button>
              <p className="text-xs text-white/50">
                By submitting this form you agree to the Fortis Secured privacy statement. We’ll only use your details to respond
                to your enquiry.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default Contact;
