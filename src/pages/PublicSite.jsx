import React from 'react';
import Navbar from '../components/Navbar.jsx';
import Hero from '../sections/Hero.jsx';
import Services from '../sections/Services.jsx';
import Platform from '../sections/Platform.jsx';
import About from '../sections/About.jsx';
import Resources from '../sections/Resources.jsx';
import Contact from '../sections/Contact.jsx';
import Footer from '../components/Footer.jsx';

const PublicSite = () => (
  <div className="relative min-h-screen overflow-hidden bg-night-sky text-white">
    <Navbar />
    <main>
      <Hero />
      <Services />
      <Platform />
      <About />
      <Resources />
      <Contact />
    </main>
    <Footer />
  </div>
);

export default PublicSite;
