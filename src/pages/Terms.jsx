import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageHeader from '../components/PageHeader';
import { useSEO } from '../lib/seo.js';
import { breadcrumbListSchema, injectSchemas } from '../lib/schema.js';
import { getDefaultOGImage } from '../lib/imageMetadata.js';

const Terms = () => {
  useSEO({
    title: 'Terms & Conditions | Fortis Secured',
    description: 'Read the website terms of use for Fortis Secured and learn how to contact us for contractual terms.',
    image: getDefaultOGImage(),
    noIndex: false,
  });

  useEffect(() => {
    const breadcrumbs = [
      { label: 'Home', path: '/' },
      { label: 'Terms & Conditions', path: '/terms' },
    ];
    injectSchemas([breadcrumbListSchema(breadcrumbs)]);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <PageHeader eyebrow="Legal" title="Terms & Conditions" subtitle="Please read these terms carefully before using our website or services." />

        <section className="section-container py-12">
          <div className="prose max-w-none">
            <h2>Website Terms & Conditions</h2>
            <p className="lead">
              These terms and conditions ("Terms") govern your access to and use of the Fortis Secured website and any information, services or products available through it. By accessing or using the website, you accept and agree to be bound by these Terms. If you do not agree to be bound by these Terms, please do not use the website.
            </p>

            <h2>1. Use Licence</h2>
            <p>Fortis Secured grants you a limited, non-exclusive, non-transferable licence to access and use the website for lawful purposes only. You agree not to:</p>
            <ul>
              <li>Reproduce, duplicate, copy, or resell any portion of the website without express written permission</li>
              <li>Access the website through automated means (bots, scrapers) without written consent</li>
              <li>Use the website for any unlawful purpose or in violation of applicable laws</li>
              <li>Attempt to gain unauthorized access to systems or information</li>
              <li>Transmit viruses, malware, or any code of destructive nature</li>
              <li>Harass, threaten, or defame any person or entity</li>
              <li>Post spam, advertising, or promotional content</li>
            </ul>

            <h2>2. Intellectual Property Rights</h2>
            <p>The website and its entire contents, including all text, graphics, logos, images, audio and video material, are the property of Fortis Secured or its content suppliers and are protected by international copyright laws. You may not modify, copy, reproduce, republish, upload, post, transmit or distribute any material in any form without our prior written permission.</p>

            <h2>3. Disclaimer of Warranties</h2>
            <p>The website and all information, content, materials and services provided are provided on an "as-is" and "as-available" basis. Fortis Secured makes no warranties, expressed or implied, including but not limited to:</p>
            <ul>
              <li>Warranties of merchantability or fitness for a particular purpose</li>
              <li>That the website will be uninterrupted, error-free, or free of viruses</li>
              <li>That defects will be corrected or that the website is compatible with your equipment</li>
            </ul>
            <p>To the fullest extent permitted by law, Fortis Secured disclaims all warranties.</p>

            <h2>4. Limitation of Liability</h2>
            <p>In no event shall Fortis Secured, its officers, directors, employees or agents be liable for any indirect, incidental, special, consequential or punitive damages, including but not limited to lost profits, lost revenue, or lost data, arising out of or in connection with your use of or inability to use the website, even if Fortis Secured has been advised of the possibility of such damages.</p>

            <h2>5. Indemnification</h2>
            <p>You agree to indemnify, defend, and hold harmless Fortis Secured and its officers, directors, employees, agents and successors from any and all damages, liabilities, costs and expenses (including reasonable attorneys' fees) arising from:</p>
            <ul>
              <li>Your violation of these Terms</li>
              <li>Your violation of applicable laws or regulations</li>
              <li>Your infringement of any third-party intellectual property or privacy rights</li>
              <li>Any content you submit or transmit through the website</li>
            </ul>

            <h2>6. Third-Party Links and Content</h2>
            <p>The website may contain links to third-party websites. Fortis Secured is not responsible for the content, accuracy, legality or practices of external sites. Your access to and use of third-party websites is at your own risk and subject to their terms and conditions.</p>

            <h2>7. User-Submitted Content</h2>
            <p>If you submit, post or display content on the website (including through contact forms or enquiries), you grant Fortis Secured a non-exclusive, worldwide, royalty-free license to use, reproduce, modify, and distribute such content for business purposes, including responding to your inquiry.</p>

            <h2>8. Modification and Termination</h2>
            <p>Fortis Secured reserves the right to:</p>
            <ul>
              <li>Modify these Terms at any time without notice</li>
              <li>Modify, suspend, or discontinue the website or any service without notice</li>
              <li>Terminate access for any reason, including violation of these Terms</li>
            </ul>
            <p>Your continued use of the website following modifications constitutes acceptance of the updated Terms.</p>

            <h2>9. Governing Law & Jurisdiction</h2>
            <p>These Terms and Conditions are governed by and construed in accordance with the laws of England and Wales, and you irrevocably submit to the exclusive jurisdiction of the courts located in England and Wales.</p>

            <h2>10. Severability</h2>
            <p>If any provision of these Terms is found to be invalid, unlawful or unenforceable, that provision shall be enforced to the maximum extent permitted, and the remaining provisions shall remain in full force and effect.</p>

            <h2>11. Entire Agreement</h2>
            <p>These Terms, together with our Privacy Policy and Cookie Policy, constitute the entire agreement between you and Fortis Secured regarding your use of the website and supersede all prior or contemporaneous communications, agreements and understandings.</p>

            <h2>12. Service Contracts</h2>
            <p>The terms governing contracted security services are separate from these website terms. Clients will receive detailed service agreements including scope of work, pricing, insurance, liability, and compliance obligations. For information about service contracts, please contact engage@fortissecured.com.</p>

            <h2>13. Contact Information</h2>
            <p>If you have questions about these Terms or our website, please contact:</p>
            <ul>
              <li><strong>Email:</strong> engage@fortissecured.com</li>
              <li><strong>Phone:</strong> +44 (0) 201 234 5678</li>
              <li><strong>Address:</strong> Fortis Secured Limited, Yorkshire, UK</li>
            </ul>

            <p className="text-sm text-gray-500 mt-12">Last updated: December 2025</p>

            <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-8 border-t border-gray-200">
              <Link to="/privacy-policy" className="inline-block text-primary hover:text-primary-dark transition-colors font-medium">
                Privacy Policy
              </Link>
              <Link to="/cookie-policy" className="inline-block text-primary hover:text-primary-dark transition-colors font-medium">
                Cookie Policy
              </Link>
              <Link to="/" className="inline-block text-primary hover:text-primary-dark transition-colors font-medium">
                Back to Home
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
