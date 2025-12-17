import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageHeader from '../components/PageHeader';
import { useSEO } from '../lib/seo.js';
import { breadcrumbListSchema, injectSchemas } from '../lib/schema.js';
import { getDefaultOGImage } from '../lib/imageMetadata.js';

const PrivacyPolicy = () => {
  useSEO({
    title: 'Privacy Policy | Fortis Secured',
    description: 'Learn how Fortis Secured handles personal data in accordance with UK GDPR and legitimate business use.',
    image: getDefaultOGImage(),
    noIndex: false,
  });

  useEffect(() => {
    const breadcrumbs = [
      { label: 'Home', path: '/' },
      { label: 'Privacy Policy', path: '/privacy-policy' },
    ];
    injectSchemas([breadcrumbListSchema(breadcrumbs)]);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <PageHeader eyebrow="Legal" title="Privacy Policy" subtitle="How we collect, use and protect your personal data." />

        <section className="section-container py-12">
          <div className="prose max-w-none">
            <h2>Privacy Policy</h2>
            <p className="lead">
              Fortis Secured Limited ("we", "us", "our") is committed to protecting your privacy and ensuring you have a positive experience on our website and when using our services. This Privacy Policy explains how we collect, use, disclose and safeguard your information in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
            </p>

            <h2>1. Information We Collect</h2>
            <p>We collect information you voluntarily provide when:</p>
            <ul>
              <li><strong>Requesting a consultation or quote:</strong> Name, company, email, phone number, and details about your security requirements</li>
              <li><strong>Contacting us:</strong> Any information provided in enquiry forms or direct communication</li>
              <li><strong>Visiting our website:</strong> Analytics data including IP address, browser type, pages visited and time spent (via Google Analytics)</li>
              <li><strong>Becoming a client:</strong> Employment records, vetting information, and operational data necessary for service delivery</li>
            </ul>

            <h2>2. Legal Basis for Processing</h2>
            <p>We process your personal data on the following legal bases:</p>
            <ul>
              <li><strong>Consent:</strong> When you choose to complete a contact form or request a quote</li>
              <li><strong>Legitimate interest:</strong> To improve our website and services, prevent fraud, and comply with legal obligations</li>
              <li><strong>Contract necessity:</strong> To deliver security services to our clients and manage client relationships</li>
              <li><strong>Legal obligation:</strong> To comply with BS 7858 vetting, SIA licensing requirements and regulatory obligations</li>
            </ul>

            <h2>3. How We Use Your Information</h2>
            <p>We use your information for the following purposes:</p>
            <ul>
              <li>Responding to your inquiries and providing quotations</li>
              <li>Providing contracted security services and client support</li>
              <li>Conducting background vetting and security screening for personnel</li>
              <li>Complying with regulatory requirements and industry standards (SIA, BS 7858, ISO certifications)</li>
              <li>Improving our website functionality and user experience</li>
              <li>Sending newsletters or marketing communications (with consent)</li>
              <li>Preventing fraud, misuse and security incidents</li>
            </ul>

            <h2>4. Data Sharing</h2>
            <p>We do not sell your personal data. We may share your information with:</p>
            <ul>
              <li><strong>Service providers:</strong> Cloud infrastructure providers (Appwrite), analytics services (Google Analytics)</li>
              <li><strong>Regulatory bodies:</strong> When required by law or to comply with licensing requirements</li>
              <li><strong>Vetting providers:</strong> Approved vetting companies for BS 7858 background checks</li>
              <li><strong>Emergency services:</strong> If required for safety or legal compliance</li>
            </ul>

            <h2>5. Data Retention</h2>
            <p>We retain your personal data for as long as necessary to:</p>
            <ul>
              <li>Fulfill the purpose it was collected for</li>
              <li>Comply with legal and regulatory obligations</li>
              <li>Resolve disputes or enforce agreements</li>
            </ul>
            <p>Inquiry form data is typically retained for 3 years. Client and personnel data is retained in accordance with employment law and regulatory requirements. You may request deletion of your data at any time, subject to legal obligations.</p>

            <h2>6. Your Rights</h2>
            <p>Under UK GDPR, you have the following rights:</p>
            <ul>
              <li><strong>Right of access:</strong> You can request a copy of your personal data</li>
              <li><strong>Right to rectification:</strong> You can request correction of inaccurate data</li>
              <li><strong>Right to erasure:</strong> You can request deletion of your data (subject to legal obligations)</li>
              <li><strong>Right to restrict processing:</strong> You can limit how we use your data</li>
              <li><strong>Right to data portability:</strong> You can request your data in a portable format</li>
              <li><strong>Right to object:</strong> You can object to specific processing activities</li>
              <li><strong>Rights related to automated decision-making:</strong> We do not use automated decision-making</li>
            </ul>
            <p>To exercise these rights, contact us at engage@fortissecured.com or write to our registered office.</p>

            <h2>7. Cookies and Analytics</h2>
            <p>We use cookies to enhance your browsing experience and gather analytics. For detailed information, please see our <Link to="/cookie-policy" className="text-primary hover:text-primary-dark">Cookie Policy</Link>.</p>

            <h2>8. Security</h2>
            <p>We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure or destruction. However, no method of transmission over the internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.</p>

            <h2>9. Third-Party Links</h2>
            <p>Our website may contain links to external websites. We are not responsible for the privacy practices of external sites. We encourage you to review their privacy policies before providing personal information.</p>

            <h2>10. Children's Privacy</h2>
            <p>Our website and services are not directed to children under the age of 18. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal data, we will take steps to delete such information and terminate the child's account.</p>

            <h2>11. International Data Transfers</h2>
            <p>Your data may be transferred to and processed in countries other than the UK. We ensure that such transfers are made in accordance with applicable data protection law and that appropriate safeguards are in place.</p>

            <h2>12. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any material changes via email or by posting the updated policy on our website with an updated "last modified" date.</p>

            <h2>13. Contact Us</h2>
            <p>If you have questions, concerns, or wish to exercise your rights, please contact us:</p>
            <ul>
              <li><strong>Email:</strong> engage@fortissecured.com</li>
              <li><strong>Phone:</strong> +44 (0) 201 234 5678</li>
              <li><strong>Address:</strong> Fortis Secured Limited, Yorkshire, UK</li>
            </ul>

            <h2>14. Data Protection Officer</h2>
            <p>If you have concerns about how we handle your data or believe we have violated your rights, you have the right to lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk.</p>

            <p className="text-sm text-gray-500 mt-12">Last updated: December 2025</p>

            <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-8 border-t border-gray-200">
              <Link to="/terms" className="inline-block text-primary hover:text-primary-dark transition-colors font-medium">
                Terms & Conditions
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

export default PrivacyPolicy;
