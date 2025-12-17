import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const positions = [];

const JoinTheTeam = () => {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white pt-20">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-gray-50 opacity-50" />
          <div className="relative text-gray-900">
            {/* Hero Section */}
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl"
                >
                  Join Our Team
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="mx-auto mt-6 max-w-2xl text-lg text-gray-600"
                >
                  Be part of a team that sets the standard in security excellence. We offer competitive
                  compensation, professional development, and a supportive work environment.
                </motion.p>
              </div>

              {/* Benefits Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-20"
              >
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="glass-panel p-6">
                    <h3 className="text-lg font-semibold text-accent">Competitive Pay</h3>
                    <p className="mt-2 text-sm text-gray-600">
                      Above-industry rates with regular reviews and performance bonuses
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-primary">Training & Development</h3>
                    <p className="mt-2 text-sm text-gray-600">
                      Ongoing professional development and specialized security training
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-primary">Career Growth</h3>
                    <p className="mt-2 text-sm text-gray-600">
                      Clear progression paths and leadership opportunities
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-primary">Support System</h3>
                    <p className="mt-2 text-sm text-gray-600">
                      24/7 management support and a strong team environment
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Open Positions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-20"
              >
                <h2 className="text-center text-3xl font-bold text-gray-900">Open Positions</h2>
                <div className="mt-12 space-y-8">
                  {positions.map((position, index) => (
                    <motion.div
                      key={position.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                      className="rounded-lg bg-white p-6 shadow-lg overflow-hidden"
                    >
                      <div className="px-6 py-8">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <h3 className="text-xl font-semibold text-blue-600">{position.title}</h3>
                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                              <span>{position.type}</span>
                              <span>•</span>
                              <span>{position.location}</span>
                            </div>
                          </div>
                          <button className="rounded-full border border-primary px-6 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white">
                            Apply Now
                          </button>
                        </div>

                        <p className="mt-6 text-gray-700">{position.description}</p>

                        <div className="mt-8 grid gap-8 md:grid-cols-2">
                          <div>
                            <h4 className="font-semibold text-primary">Requirements</h4>
                            <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-gray-600">
                              {position.requirements.map((req) => (
                                <li key={req}>{req}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-semibold text-primary">Responsibilities</h4>
                            <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-gray-600">
                              {position.responsibilities.map((resp) => (
                                <li key={resp}>{resp}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Application Process */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="mt-20 mb-20"
              >
                <div className="rounded-lg bg-white p-8 shadow-lg text-center">
                  <h2 className="text-2xl font-bold text-gray-900">Professional Opportunities for Licensed Security Personnel</h2>
                  <p className="mx-auto mt-4 max-w-2xl text-gray-600">
                    Join a company that values professionalism and personal growth. Fortis Security is building a network of skilled
                    officers who share our commitment to raising standards.
                  </p>

                  <h3 className="mt-6 text-lg font-semibold text-gray-900">Requirements</h3>
                  <ul className="mt-3 text-sm text-gray-600">
                    <li>Valid SIA licence</li>
                    <li>Right to work in the UK</li>
                    <li>Strong communication &amp; professional presentation</li>
                  </ul>

                  <p className="mt-6 text-gray-600">Apply today to start your journey with Fortis Security — send CV & cover letter to <a href="mailto:careers@fortissecured.co.uk" className="text-primary hover:text-primary-dark transition-colors">careers@fortissecured.co.uk</a>.</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default JoinTheTeam;