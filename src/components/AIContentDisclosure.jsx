/**
 * AI Content Disclosure Component
 * ==============================
 * 
 * React component for displaying AI involvement disclosure
 * Meets FTC, GDPR, and CCPA requirements
 */

import React from 'react';

/**
 * AIDisclosure - Main component for showing AI involvement
 * 
 * @param {Object} props
 * @param {string} props.type - FULLY_AI_GENERATED | AI_ASSISTED | AI_REVIEWED | HYBRID
 * @param {string} props.tools - Comma-separated list of AI tools used
 * @param {string} props.reviewerName - Name of human reviewer
 * @param {string} props.reviewDate - ISO date of review
 * @param {boolean} props.prominent - Show as prominent banner (default: true)
 * @param {string} props.position - top | inline | bottom (default: top)
 */
export const AIDisclosure = ({
  type = 'AI_ASSISTED',
  tools = 'AI Tools',
  reviewerName = 'Our Editorial Team',
  reviewDate = new Date().toISOString().split('T')[0],
  prominent = true,
  position = 'top',
}) => {
  const disclosures = {
    FULLY_AI_GENERATED: {
      icon: '🤖',
      title: 'AI-Generated Content',
      text: `This article was generated using ${tools}. It was reviewed and fact-checked by ${reviewerName} on ${reviewDate}.`,
      color: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-900',
    },
    AI_ASSISTED: {
      icon: '👤🤖',
      title: 'AI-Assisted Content',
      text: `This article was written by humans with AI research assistance (${tools}). It was reviewed by ${reviewerName} on ${reviewDate}.`,
      color: 'bg-purple-50 border-purple-200',
      textColor: 'text-purple-900',
    },
    AI_REVIEWED: {
      icon: '✓',
      title: 'AI-Reviewed Content',
      text: `This article was written by humans and reviewed using AI verification tools (${tools}) on ${reviewDate}.`,
      color: 'bg-green-50 border-green-200',
      textColor: 'text-green-900',
    },
    HYBRID: {
      icon: '👤🤖✓',
      title: 'Hybrid Content',
      text: `This article combines human writing with AI assistance (${tools}). Reviewed by ${reviewerName} on ${reviewDate}.`,
      color: 'bg-orange-50 border-orange-200',
      textColor: 'text-orange-900',
    },
  };

  const disclosure = disclosures[type] || disclosures.AI_ASSISTED;

  if (!prominent) {
    return (
      <p className={`text-sm ${disclosure.textColor} mt-4 pt-2 border-t`}>
        <span className="mr-2">{disclosure.icon}</span>
        {disclosure.text}
      </p>
    );
  }

  const bannerClass = `
    ${disclosure.color} ${disclosure.textColor}
    border rounded-lg p-4 my-4
  `.trim();

  return (
    <div className={bannerClass}>
      <div className="flex gap-3">
        <span className="text-2xl flex-shrink-0">{disclosure.icon}</span>
        <div>
          <h3 className="font-semibold mb-1">{disclosure.title}</h3>
          <p className="text-sm">{disclosure.text}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * AICredibilityBadge - Small inline badge for AI involvement
 * Use in article headers or author bylines
 */
export const AICredibilityBadge = ({ type = 'AI_ASSISTED', size = 'sm' }) => {
  const badges = {
    FULLY_AI_GENERATED: { text: '🤖 AI-Generated', color: 'bg-blue-100 text-blue-700' },
    AI_ASSISTED: { text: '👤🤖 AI-Assisted', color: 'bg-purple-100 text-purple-700' },
    AI_REVIEWED: { text: '✓ AI-Reviewed', color: 'bg-green-100 text-green-700' },
    HYBRID: { text: '👤🤖✓ Hybrid', color: 'bg-orange-100 text-orange-700' },
  };

  const badge = badges[type] || badges.AI_ASSISTED;
  const sizeClass = size === 'lg' ? 'px-3 py-1 text-base' : 'px-2 py-0.5 text-xs';

  return (
    <span className={`${badge.color} rounded-full font-medium ${sizeClass}`}>
      {badge.text}
    </span>
  );
};

/**
 * EEATIndicator - Shows E-E-A-T compliance level
 * 
 * @param {Object} props
 * @param {number} props.score - E-E-A-T score 0-100
 * @param {Object} props.signals - {expertise, experience, authority, trustworthiness}
 */
export const EEATIndicator = ({ score = 75, signals = {} }) => {
  const getQualityLabel = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  const getQualityColor = (score) => {
    if (score >= 90) return 'text-green-700';
    if (score >= 75) return 'text-blue-700';
    if (score >= 60) return 'text-yellow-700';
    return 'text-red-700';
  };

  return (
    <div className="border rounded-lg p-4 my-4 bg-gray-50">
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <span>📊 E-E-A-T Quality</span>
        <span className={`text-2xl font-bold ${getQualityColor(score)}`}>
          {score}%
        </span>
      </h4>
      <p className="text-sm mb-3">{getQualityLabel(score)} content quality</p>
      
      <div className="space-y-2 text-sm">
        {signals.expertise && (
          <div className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <span>Expert credentials verified</span>
          </div>
        )}
        {signals.experience && (
          <div className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <span>Real-world experience documented</span>
          </div>
        )}
        {signals.authority && (
          <div className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <span>Authoritative sources cited</span>
          </div>
        )}
        {signals.trustworthiness && (
          <div className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <span>Transparent and verified</span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * SourceCitationBox - Display content sources with credibility
 */
export const SourceCitationBox = ({ sources = [] }) => {
  if (!sources.length) return null;

  const getCredibilityIcon = (credibility) => {
    switch (credibility) {
      case 'high':
        return '🏅';
      case 'medium':
        return '✓';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="border-l-4 border-blue-500 bg-blue-50 p-4 my-4">
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <span>📚 Sources & References</span>
      </h4>
      <ul className="space-y-2 text-sm">
        {sources.map((source, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="flex-shrink-0">{getCredibilityIcon(source.credibility)}</span>
            <div className="flex-1">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                {source.title}
              </a>
              {source.author && <span className="text-gray-600"> — {source.author}</span>}
              {source.date && <span className="text-gray-500 text-xs"> ({source.date})</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * DisclaimerBanner - Important disclaimers (medical, legal, etc)
 */
export const DisclaimerBanner = ({
  type = 'general', // general | medical | legal | financial
  customText = null,
}) => {
  const disclaimers = {
    general: {
      icon: '⚠️',
      title: 'Important Notice',
      text: 'While this content is thoroughly reviewed, it may contain errors. Always verify important information.',
      color: 'bg-yellow-50 border-yellow-200',
    },
    medical: {
      icon: '⚕️',
      title: 'Medical Disclaimer',
      text: 'This content is for informational purposes only and not a substitute for professional medical advice. Always consult with a qualified healthcare provider.',
      color: 'bg-red-50 border-red-200',
    },
    legal: {
      icon: '⚖️',
      title: 'Legal Disclaimer',
      text: 'This content is for informational purposes only and not legal advice. Consult with a qualified attorney for your specific situation.',
      color: 'bg-red-50 border-red-200',
    },
    financial: {
      icon: '💰',
      title: 'Financial Disclaimer',
      text: 'This content is for educational purposes only. Not financial advice. Consult with a financial advisor before making investment decisions.',
      color: 'bg-amber-50 border-amber-200',
    },
  };

  const disclaimer = customText
    ? { icon: '⚠️', title: 'Important Notice', text: customText, color: 'bg-yellow-50 border-yellow-200' }
    : disclaimers[type] || disclaimers.general;

  return (
    <div className={`border rounded-lg p-4 my-4 ${disclaimer.color}`}>
      <div className="flex gap-3">
        <span className="text-2xl flex-shrink-0">{disclaimer.icon}</span>
        <div>
          <h3 className="font-semibold mb-1">{disclaimer.title}</h3>
          <p className="text-sm">{disclaimer.text}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * AuthorCredentials - Display author expertise and credentials
 */
export const AuthorCredentials = ({ author = {} }) => {
  if (!author.name) return null;

  return (
    <div className="border rounded-lg p-4 my-4 bg-gray-50">
      <div className="flex gap-4 items-start">
        {author.image && (
          <img
            src={author.image}
            alt={author.name}
            className="w-16 h-16 rounded-full object-cover"
          />
        )}
        <div className="flex-1">
          <h4 className="font-semibold text-lg">{author.name}</h4>
          {author.role && <p className="text-blue-600 font-medium">{author.role}</p>}
          {author.bio && <p className="text-sm text-gray-700 mt-2">{author.bio}</p>}
          {author.credentials && author.credentials.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium text-gray-600">Credentials:</p>
              <ul className="text-sm text-gray-700 mt-1">
                {author.credentials.map((cred, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    {cred}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * FactCheckStatus - Show fact-checking verification status
 */
export const FactCheckStatus = ({
  status = 'verified', // verified | pending | needs-review
  lastChecked = null,
  checkSummary = null,
}) => {
  const statuses = {
    verified: {
      icon: '✅',
      label: 'Fact-Checked',
      color: 'bg-green-50 text-green-900 border-green-200',
      description: 'Content has been verified against authoritative sources',
    },
    pending: {
      icon: '⏳',
      label: 'Pending Review',
      color: 'bg-yellow-50 text-yellow-900 border-yellow-200',
      description: 'Content is pending expert fact-check review',
    },
    'needs-review': {
      icon: '⚠️',
      label: 'Needs Review',
      color: 'bg-red-50 text-red-900 border-red-200',
      description: 'Content requires fact-checking before use',
    },
  };

  const current = statuses[status] || statuses.pending;

  return (
    <div className={`border rounded-lg p-3 my-4 ${current.color}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{current.icon}</span>
        <div className="flex-1">
          <p className="font-semibold">{current.label}</p>
          <p className="text-sm">{current.description}</p>
          {lastChecked && (
            <p className="text-xs mt-2">Last checked: {lastChecked}</p>
          )}
          {checkSummary && (
            <p className="text-sm mt-2">{checkSummary}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default {
  AIDisclosure,
  AICredibilityBadge,
  EEATIndicator,
  SourceCitationBox,
  DisclaimerBanner,
  AuthorCredentials,
  FactCheckStatus,
};
