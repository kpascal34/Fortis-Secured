import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { preloadCriticalImages } from '../lib/imageMetadata';

const Hero = () => {
  // Slideshow images with descriptive alt text
  const images = [
    { src: '/hero-slide-1.jpg', alt: 'Professional security officer on patrol - Fortis Secured' },
    { src: '/hero-slide-2.jpg', alt: 'Security team coordination and operations center' },
    { src: '/hero-slide-3.jpg', alt: 'Door supervision and access control services' },
    { src: '/hero-slide-4.jpg', alt: 'Corporate security and building protection' },
    { src: '/hero-slide-5.jpg', alt: 'Construction site security and perimeter guarding' },
    { src: '/hero-slide-6.jpg', alt: 'Event security and crowd management services' },
  ];
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const imgRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setOffsetY(window.scrollY || 0);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

    // Preload first hero image for LCP optimization
    useEffect(() => {
      preloadCriticalImages();
    }, []);

  // Auto-advance slideshow every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  // Smoother parallax effect with easing
  const parallax = Math.round(offsetY * 0.15);
  const parallaxStyle = {
    transform: `translateY(${parallax}px)`,
    transition: 'transform 0.1s cubic-bezier(0.215, 0.61, 0.355, 1)',
  };

  return (
    <section className="relative overflow-hidden pb-32 pt-28 bg-white text-gray-900">
      <div className="absolute inset-0 -z-10">
        <div className="absolute right-0 top-0 h-[520px] w-[520px] bg-primary/10 blur-3xl" />
        <div className="absolute left-0 bottom-0 h-[340px] w-[340px] bg-primary/5 blur-2xl" />
      </div>

      <div className="section-container grid gap-12 lg:grid-cols-1 lg:items-center">
        {/* Text column */}
        <div className="order-2 lg:order-1 mx-auto max-w-3xl space-y-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-4xl font-light leading-tight sm:text-5xl lg:text-6xl text-gray-900"
          >
            Raising Standards in <span className="text-brand-dark font-medium">Professional Security</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mx-auto max-w-3xl text-lg text-gray-700 font-light leading-relaxed"
          >
            At Fortis Security we provide professional, reliable and fully compliant security services across Yorkshire
            and Greater Manchester. Our reputation is built on operational excellence, transparency and a commitment to
            raising standards across the private security sector.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center"
          >
            <a
              className="group inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-base font-medium text-white shadow-xl hover:bg-primary-dark transition-all hover:shadow-primary/25"
              href="#contact"
            >
              Book a consultation
              <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>

            <a
              className="ml-0 hidden sm:inline-flex group items-center justify-center rounded-full border border-brand-dark/20 px-6 py-3 text-sm font-medium text-brand-dark hover:bg-brand-dark/5 transition-all"
              href="#contact"
            >
              Contact us
            </a>
          </motion.div>
        </div>

        {/* image moved to a dedicated section below (see next block) */}
      </div>

      {/* New full-width image section with curved top edge and slideshow */}
      <div className="relative mt-16 -mx-6 sm:-mx-8">
        <div className="relative w-full overflow-hidden">
          {/* Slideshow container with parallax and curved top using clip-path */}
          <div 
            style={{ 
              transform: `translateY(${Math.round(offsetY * 0.18)}px)`, 
              transition: 'transform 120ms ease-out',
              clipPath: 'ellipse(120% 100% at 50% 100%)'
            }}
            className="relative"
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={currentImageIndex}
                src={images[currentImageIndex].src}
                alt={images[currentImageIndex].alt}
                className="w-full h-[400px] sm:h-[500px] md:h-[600px] lg:h-[700px] object-cover object-center"
                loading="lazy"
                decoding="async"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
              />
            </AnimatePresence>
          </div>
          
          {/* Slideshow indicators */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentImageIndex ? 'w-8 bg-white' : 'w-2 bg-white/50'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating accents retained */}
      <div className="absolute left-1/4 top-1/4 h-4 w-4 rounded-full bg-primary/30 blur-sm animate-float" />
      <div className="absolute right-1/4 bottom-1/4 h-6 w-6 rounded-full bg-accent/30 blur-sm animate-float-delayed" />
      <div className="absolute right-1/3 top-1/3 h-3 w-3 rounded-full bg-primary/30 blur-sm animate-float-slow" />
    </section>
  );
};

// Add these animations to your tailwind.config.js
// animation: {
//   float: 'float 8s ease-in-out infinite',
//   'float-delayed': 'float 8s ease-in-out 2s infinite',
//   'float-slow': 'float 10s ease-in-out 1s infinite',
// },
// keyframes: {
//   float: {
//     '0%, 100%': { transform: 'translate(0, 0)' },
//     '50%': { transform: 'translate(10px, -10px)' },
//   },
// },

export default Hero;
