import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageHeader from '../components/PageHeader';
import { useSEO } from '../lib/seo.js';
import { breadcrumbListSchema, injectSchemas } from '../lib/schema.js';
import { getDefaultOGImage } from '../lib/imageMetadata.js';

const CookiePolicy = () => {
  useSEO({
    title: 'Cookie Policy | Fortis Secured',
    description: 'Understand how Fortis Secured uses cookies for performance and analytics, and how to control your preferences.',
    image: getDefaultOGImage(),
    noIndex: false,
  });

  useEffect(() => {
    const breadcrumbs = [
      { label: 'Home', path: '/' },
      { label: 'Cookie Policy', path: '/cookie-policy' },
    ];
    injectSchemas([breadcrumbListSchema(breadcrumbs)]);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <PageHeader eyebrow="Legal" title="Cookie Policy" subtitle="How we use cookies and similar technologies to enhance your experience." />

        <section className="section-container py-12">
          <div className="prose max-w-none">
            <h2>Cookie Policy</h2>
            <p className="lead">
              This Cookie Policy explains how Fortis Secured and third parties we work with use cookies and similar tracking technologies when you visit our website. Please read this policy to understand our practices and your choices regarding cookies.
            </p>

            <h2>1. What Are Cookies?</h2>
            <p>Cookies are small text files that are stored on your device when you visit a website. They are widely used to make websites work more efficiently, improve user experience, and provide information to website owners. Cookies can be persistent (remain on your device until you delete them) or session-based (deleted when you close your browser).</p>

            <h2>2. Types of Cookies We Use</h2>

            <h3>Essential Cookies</h3>
            <p>These cookies are necessary for the website to function and cannot be disabled. They enable:</p>
            <ul>
              <li>Website navigation and basic functionality</li>
              <li>Security measures and fraud prevention</li>
              <li>Load balancing and server operations</li>
              <li>Legal compliance and content delivery</li>
            </ul>

            <h3>Performance & Analytics Cookies</h3>
            <p>These cookies help us understand how visitors use our website, including:</p>
            <ul>
              <li><strong>Google Analytics:</strong> Tracks page views, user behaviour, traffic sources, and device types to help us improve website performance and content</li>
              <li>Anonymous usage statistics and bounce rates</li>
              <li>Popular pages and user flow patterns</li>
              <li>Search keywords and navigation patterns</li>
            </ul>
            <p>These cookies do not identify you personally and help us provide a better user experience.</p>

            <h3>Functional Cookies</h3>
            <p>These cookies remember your preferences and settings, such as:</p>
            <ul>
              <li>Language and region preferences</li>
              <li>Form entries and user-specific settings</li>
              <li>Navigation preferences and page layout</li>
            </ul>

            <h3>Marketing & Advertising Cookies</h3>
            <p>Currently, we do not use marketing or advertising cookies. If we implement targeted advertising in the future, we will update this policy and seek your consent.</p>

            <h2>3. Third-Party Cookies</h2>
            <p>Third parties may place cookies on your device when you visit our website:</p>
            <ul>
              <li><strong>Google Analytics:</strong> Stores cookies to track user interactions and provide analytics reports. See <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google's Privacy Policy</a></li>
              <li><strong>Vercel (hosting):</strong> May use cookies for performance monitoring and analytics</li>
              <li><strong>Appwrite (backend):</strong> May use cookies for authentication and service operations</li>
            </ul>
            <p>We encourage you to review third-party privacy policies to understand their practices.</p>

            <h2>4. Cookie Consent</h2>
            <p>By continuing to use our website, you consent to the use of cookies as described in this policy. We use essential cookies without consent, but analytics cookies are deployed with your continued use of the site. If you do not consent to non-essential cookies, you can disable them (see section 6 below).</p>

            <h2>5. How Long Do Cookies Last?</h2>
            <ul>
              <li><strong>Session cookies:</strong> Deleted when you close your browser</li>
              <li><strong>Persistent cookies:</strong> Typically expire after 12 months to 2 years</li>
              <li><strong>Analytics cookies:</strong> Typically expire after 12-24 months</li>
            </ul>

            <h2>6. Managing Your Cookie Preferences</h2>
            <p>You have control over cookies through your browser settings:</p>

            <h3>Browser Controls</h3>
            <ul>
              <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
              <li><strong>Firefox:</strong> Preferences → Privacy & Security → Cookies and Site Data</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Cookies and website data</li>
              <li><strong>Edge:</strong> Settings → Privacy, search, and services → Clear browsing data</li>
            </ul>

            <h3>Opt Out of Analytics</h3>
            <p>To opt out of Google Analytics tracking, you can:</p>
            <ul>
              <li>Install the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google Analytics Opt-Out Browser Add-on</a></li>
              <li>Manage your Google account settings at <a href="https://myaccount.google.com" target="_blank" rel="noopener noreferrer">myaccount.google.com</a></li>
              <li>Use Do Not Track settings in your browser (though not all sites honor this)</li>
            </ul>

            <h3>Note on Blocking Cookies</h3>
            <p>Disabling cookies may affect website functionality and your user experience. Essential cookies cannot be disabled, but you can choose to disable non-essential cookies at any time.</p>

            <h2>7. Local Storage & Tracking Technologies</h2>
            <p>In addition to cookies, we may use similar technologies such as:</p>
            <ul>
              <li><strong>Local Storage:</strong> Stores user preferences and form data on your device</li>
              <li><strong>Session Storage:</strong> Temporary storage for the current browser session</li>
              <li><strong>Web Beacons:</strong> Small tracking pixels used in analytics</li>
            </ul>
            <p>These are used for the same purposes as cookies and can be managed through browser settings.</p>

            <h2>8. Updates to This Cookie Policy</h2>
            <p>We may update this Cookie Policy to reflect changes in our practices, technology, legal requirements or other factors. We will notify you by updating the "Last Updated" date on this page. Your continued use of the website following changes constitutes your acceptance of the updated policy.</p>

            <h2>9. Questions About Cookies?</h2>
            <p>If you have questions about our use of cookies or this policy, please contact:</p>
            <ul>
              <li><strong>Email:</strong> engage@fortissecured.com</li>
              <li><strong>Phone:</strong> +44 (0) 201 234 5678</li>
              <li><strong>Address:</strong> Fortis Secured Limited, Yorkshire, UK</li>
            </ul>

            <h2>10. Privacy Rights</h2>
            <p>For information about how we use and protect personal data collected through cookies and other means, please see our <Link to="/privacy-policy" className="text-primary hover:text-primary-dark">Privacy Policy</Link>.</p>

            <p className="text-sm text-gray-500 mt-12">Last updated: December 2025</p>

            <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-8 border-t border-gray-200">
              <Link to="/privacy-policy" className="inline-block text-primary hover:text-primary-dark transition-colors font-medium">
                Privacy Policy
              </Link>
              <Link to="/terms" className="inline-block text-primary hover:text-primary-dark transition-colors font-medium">
                Terms & Conditions
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

export default CookiePolicy;
