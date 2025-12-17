/**
 * AI Content Management System
 * ============================
 * 
 * Manages AI-generated content with E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
 * principles and disclosure requirements for regulatory compliance.
 * 
 * E-E-A-T Framework:
 * - Experience: Author's hands-on expertise and real-world knowledge
 * - Expertise: Demonstrated professional knowledge and credentials
 * - Authoritativeness: Recognition, citations, third-party validation
 * - Trustworthiness: Transparency, accuracy, compliance, citations
 */

// ============================================================================
// 1. AI CONTENT DISCLOSURE SYSTEM
// ============================================================================

/**
 * Content disclosure labels with regulatory compliance
 */
export const DISCLOSURE_TYPES = {
  FULLY_AI_GENERATED: {
    label: 'AI-Generated Content',
    description: 'This content was generated using artificial intelligence',
    disclosure: 'Generated with AI assistance',
    required: true,
    icon: '🤖',
    color: 'blue',
  },

  AI_ASSISTED: {
    label: 'AI-Assisted Content',
    description: 'Human-written with AI assistance for research/drafting',
    disclosure: 'Written by humans with AI research assistance',
    required: true,
    icon: '👤🤖',
    color: 'purple',
  },

  AI_REVIEWED: {
    label: 'AI-Reviewed Content',
    description: 'Human-written, reviewed and fact-checked by AI',
    disclosure: 'Human-written, AI-reviewed for accuracy',
    required: false,
    icon: '✓',
    color: 'green',
  },

  HUMAN_ORIGINAL: {
    label: 'Original Content',
    description: 'Entirely human-written without AI assistance',
    disclosure: null,
    required: false,
    icon: '✍️',
    color: 'gray',
  },

  HYBRID: {
    label: 'Hybrid Content',
    description: 'Mix of human writing, AI drafting, and human refinement',
    disclosure: 'Blend of human writing and AI assistance',
    required: true,
    icon: '👤🤖✓',
    color: 'orange',
  },
};

/**
 * Content quality checklist for E-E-A-T compliance
 */
export const EEAT_CHECKLIST = {
  experience: [
    '✓ Author has direct hands-on experience with the topic',
    '✓ Real-world examples and case studies included',
    '✓ Practical, actionable advice provided',
    '✓ Personal insights or lessons learned documented',
    '✓ Evidence of applying knowledge in practice',
  ],

  expertise: [
    '✓ Author credentials clearly stated (role, certifications)',
    '✓ Professional qualifications relevant to topic',
    '✓ Demonstrated knowledge depth and specificity',
    '✓ Industry-recognized certifications mentioned',
    '✓ Relevant education or training highlighted',
  ],

  authoritativeness: [
    '✓ Citations from authoritative sources (studies, reports)',
    '✓ References to industry standards and guidelines',
    '✓ Links to original research and data sources',
    '✓ Third-party validation or endorsements',
    '✓ Recognition from reputable organizations',
  ],

  trustworthiness: [
    '✓ Sources clearly cited with links',
    '✓ Factual claims supported by evidence',
    '✓ Transparency about AI involvement',
    '✓ Disclaimers for non-expert advice',
    '✓ Regular updates and corrections made public',
    '✓ Privacy and security information clear',
    '✓ No misleading or false claims',
  ],
};

/**
 * Content quality scoring system (0-100)
 */
export function scoreContentQuality(content) {
  let score = 0;

  // Expertise markers (+25)
  if (content.authorCredentials) score += 10;
  if (content.authorCertifications?.length > 0) score += 8;
  if (content.authorExperience) score += 7;

  // Experience markers (+25)
  if (content.caseStudies?.length > 0) score += 10;
  if (content.practicalExamples?.length > 0) score += 8;
  if (content.realWorldData) score += 7;

  // Authoritativeness markers (+25)
  if (content.citations?.length > 5) score += 10;
  if (content.thirdPartyValidation) score += 8;
  if (content.industryStandards?.length > 0) score += 7;

  // Trustworthiness markers (+25)
  if (content.disclosureLevel !== 'HUMAN_ORIGINAL') score += 8;
  if (content.disclaimers?.length > 0) score += 8;
  if (content.updateFrequency === 'regular') score += 5;
  if (content.factCheckStatus === 'verified') score += 4;

  return Math.min(score, 100);
}

// ============================================================================
// 2. CONTENT TEMPLATE FOR AI MANAGEMENT
// ============================================================================

/**
 * Template for managing AI-generated content
 */
export const AI_CONTENT_TEMPLATE = {
  metadata: {
    contentId: 'unique-identifier',
    title: 'Content Title',
    description: 'Brief description',
    dateCreated: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    author: {
      name: 'Author Name',
      role: 'Position/Title',
      credentials: ['Certification 1', 'Certification 2'],
      experience: 'Years of experience',
      bio: 'Author biography',
    },
  },

  aiInvolvement: {
    type: 'FULLY_AI_GENERATED|AI_ASSISTED|AI_REVIEWED|HUMAN_ORIGINAL|HYBRID',
    tools: ['ChatGPT-4', 'Claude', 'Gemini'],
    disclosure: true,
    disclosureText: 'This content was...',
    reviewProcess: 'How content was reviewed',
    factCheckStatus: 'verified|pending|needs-review',
  },

  eeatSignals: {
    expertiseLevel: 'expert|intermediate|beginner',
    experienceLevel: 'extensive|moderate|limited',
    authoritySource: 'first-hand|research-based|expert-cited',
    trustIndicators: ['citation-heavy', 'transparent', 'updated-regularly'],
  },

  content: {
    headline: 'Main headline',
    subheadlines: ['Sub 1', 'Sub 2'],
    bodyText: 'Full content text',
    keyTakeaways: ['Point 1', 'Point 2'],
    callToAction: 'CTA text',
  },

  sources: {
    citations: [
      {
        id: 'citation-1',
        title: 'Source Title',
        url: 'https://example.com',
        author: 'Source Author',
        date: '2025-01-01',
        credibility: 'high|medium|low',
      },
    ],
    thirdPartyValidation: ['Organization 1', 'Organization 2'],
    industryStandards: ['Standard 1', 'Standard 2'],
  },

  quality: {
    score: 0, // 0-100
    factChecked: false,
    expertReviewed: false,
    audited: false,
  },

  compliance: {
    ftcDisclosed: true,
    gdprCompliant: true,
    ccpaCompliant: true,
    ccpaLink: 'https://example.com/privacy',
    disclaimers: ['Disclaimer 1', 'Disclaimer 2'],
  },
};

// ============================================================================
// 3. CONTENT REVIEW GUIDELINES
// ============================================================================

/**
 * Comprehensive review checklist for AI-generated content
 */
export function getContentReviewChecklist(contentType) {
  const baseChecklist = [
    {
      category: 'Accuracy',
      items: [
        '☐ All factual claims verified against authoritative sources',
        '☐ Statistics and data points checked for current accuracy',
        '☐ No false or misleading statements present',
        '☐ Scientific claims supported by peer-reviewed research',
        '☐ Product/service information current and accurate',
      ],
    },

    {
      category: 'Expertise & Authority',
      items: [
        '☐ Author expertise clearly demonstrated',
        '☐ Relevant credentials mentioned (if applicable)',
        '☐ Experience level appropriate for topic',
        '☐ No overstatement of expertise',
        '☐ Limitations acknowledged where appropriate',
      ],
    },

    {
      category: 'Sources & Citations',
      items: [
        '☐ All major claims cite authoritative sources',
        '☐ At least 5+ citations for technical content',
        '☐ Citations are current (within 2-3 years for fast-moving topics)',
        '☐ Citation links functional and accessible',
        '☐ Source credibility evaluated and noted',
      ],
    },

    {
      category: 'AI Disclosure',
      items: [
        '☐ AI involvement clearly disclosed upfront',
        '☐ Type of AI assistance specified',
        '☐ Human review/refinement documented',
        '☐ Fact-checking process described',
        '☐ Disclosure meets FTC guidelines',
      ],
    },

    {
      category: 'Compliance & Disclaimers',
      items: [
        '☐ Appropriate disclaimers included',
        '☐ Medical/legal disclaimers (if applicable)',
        '☐ GDPR privacy notice (EU content)',
        '☐ CCPA compliance (US content)',
        '☐ Terms of use linked where relevant',
      ],
    },

    {
      category: 'Tone & Accessibility',
      items: [
        '☐ Language is clear and accessible',
        '☐ Technical terms explained for lay audience',
        '☐ Tone matches brand voice',
        '☐ Content organized logically',
        '☐ Subheadings aid scannability',
      ],
    },

    {
      category: 'Real-World Value',
      items: [
        '☐ Practical examples included',
        '☐ Actionable advice provided',
        '☐ Relevant to target audience',
        '☐ Solves stated problem or question',
        '☐ Unique perspective or insight offered',
      ],
    },
  ];

  // Add content-specific items
  const contentSpecific = {
    'blog-post': [
      {
        category: 'Blog-Specific',
        items: [
          '☐ Engaging headline (50-60 characters)',
          '☐ Meta description present (150-160 chars)',
          '☐ Internal links to 2-3 relevant posts',
          '☐ Featured image with alt text',
          '☐ Reading time estimate accurate',
        ],
      },
    ],
    'service-page': [
      {
        category: 'Service Page-Specific',
        items: [
          '☐ Service benefits clearly articulated',
          '☐ Pricing/packages information provided',
          '☐ Call-to-action prominent and clear',
          '☐ Customer testimonials/reviews included',
          '☐ Process/methodology explained',
        ],
      },
    ],
    'legal-content': [
      {
        category: 'Legal Content-Specific',
        items: [
          '☐ Lawyer reviewed before publication',
          '☐ Jurisdiction clearly stated',
          '☐ "Not legal advice" disclaimer present',
          '☐ Links to official government resources',
          '☐ Last reviewed date documented',
        ],
      },
    ],
    'medical-content': [
      {
        category: 'Medical Content-Specific',
        items: [
          '☐ Medical professional reviewed',
          '☐ Evidence-based recommendations only',
          '☐ "Not professional advice" disclaimer',
          '☐ Links to NHS/WHO/CDC as appropriate',
          '☐ EEAT signals clearly present',
        ],
      },
    ],
  };

  return [...baseChecklist, ...(contentSpecific[contentType] || [])];
}

// ============================================================================
// 4. AI TOOL CREDIBILITY RATINGS
// ============================================================================

/**
 * Ratings of AI tools for different content types
 * Based on accuracy, citation capability, and fact-checking ability
 */
export const AI_TOOL_RATINGS = {
  'ChatGPT-4': {
    overallRating: 4.2,
    strengths: [
      'Excellent at understanding complex topics',
      'Good creative writing ability',
      'Can follow specific guidelines well',
    ],
    weaknesses: [
      'Knowledge cutoff limits (April 2024)',
      'May hallucinate sources',
      'Less accurate for current events',
    ],
    suitableFor: ['Blog posts', 'General guides', 'Creative content'],
    notSuitableFor: ['Medical advice', 'Legal content', 'Current data'],
    factCheckRating: 3.5,
    citationAccuracy: 3.0,
    recommendedUseCase: 'First draft generation with human review',
  },

  Claude: {
    overallRating: 4.5,
    strengths: [
      'Excellent reasoning and analysis',
      'Better at acknowledging uncertainty',
      'More careful with factual claims',
    ],
    weaknesses: [
      'Sometimes overly verbose',
      'Slower response times',
      'Limited real-time internet access',
    ],
    suitableFor: ['Analysis', 'Research summaries', 'Thoughtful content'],
    notSuitableFor: ['Fast turnaround content', 'Current event coverage'],
    factCheckRating: 4.2,
    citationAccuracy: 4.0,
    recommendedUseCase: 'Research assistance and drafting',
  },

  Gemini: {
    overallRating: 4.1,
    strengths: [
      'Good real-time information access',
      'Multi-modal capabilities',
      'Fast processing',
    ],
    weaknesses: [
      'Citation reliability varies',
      'Occasional factual errors',
      'Less nuanced reasoning sometimes',
    ],
    suitableFor: ['Current topics', 'Research assistance', 'Summaries'],
    notSuitableFor: ['Highly specialized content', 'Long-form analysis'],
    factCheckRating: 3.8,
    citationAccuracy: 3.5,
    recommendedUseCase: 'Research and information gathering',
  },

  'Perplexity AI': {
    overallRating: 4.3,
    strengths: [
      'Built-in source citations',
      'Real-time internet access',
      'Source attribution clear',
    ],
    weaknesses: [
      'Citation accuracy not guaranteed',
      'Occasional source misrepresentation',
      'Limited depth for complex topics',
    ],
    suitableFor: ['Cited summaries', 'Research starting point', 'Quick facts'],
    notSuitableFor: ['Expert analysis', 'Medical/legal advice'],
    factCheckRating: 4.0,
    citationAccuracy: 4.2,
    recommendedUseCase: 'Research starting point with verification',
  },
};

// ============================================================================
// 5. CONTENT REFINEMENT GUIDELINES
// ============================================================================

/**
 * Guidelines for refining AI-generated content to meet E-E-A-T standards
 */
export const REFINEMENT_GUIDELINES = {
  addExpertise: {
    action: 'Enhance expertise signals',
    methods: [
      'Add author bio with relevant credentials',
      'Include specific years of experience',
      'Mention relevant certifications/education',
      'Reference past projects or accomplishments',
      'Include professional affiliations',
    ],
    example: `
      BEFORE: "Security is important for businesses"
      AFTER: "As a security consultant with 15+ years experience 
              and ISO 27001 certification, I've seen..."
    `,
  },

  addExperience: {
    action: 'Incorporate real-world experience',
    methods: [
      'Add specific case studies (anonymized if needed)',
      'Include personal examples or stories',
      'Reference real-world scenarios',
      'Provide hands-on implementation details',
      'Share lessons learned from practice',
    ],
    example: `
      BEFORE: "Team coordination is important"
      AFTER: "In one recent project, coordinating our 12-person 
              security team across 3 sites revealed that..."
    `,
  },

  addAuthority: {
    action: 'Strengthen authoritative sources',
    methods: [
      'Add 5+ citations from authoritative sources',
      'Link to industry standards and guidelines',
      'Reference peer-reviewed research',
      'Include third-party validation',
      'Link to original data/reports',
    ],
    example: `
      BEFORE: "Studies show security is effective"
      AFTER: "According to the 2024 Gartner Security Report 
              (link: gartner.com/...) and supported by 
              research from NIST (link: nist.gov/...), 
              modern security practices reduce incidents by 89%"
    `,
  },

  addTrustworthiness: {
    action: 'Build trust through transparency',
    methods: [
      'Clearly disclose AI involvement',
      'Explain review/fact-checking process',
      'Add relevant disclaimers',
      'Cite all sources with working links',
      'Include last updated date',
      'Add correction policy notice',
    ],
    example: `
      DISCLOSURE: "This article was drafted with AI assistance 
                   and reviewed by our security team. Sources 
                   verified as of December 2025."
    `,
  },
};

// ============================================================================
// 6. REGULATORY COMPLIANCE
// ============================================================================

/**
 * Compliance requirements by jurisdiction and content type
 */
export const COMPLIANCE_REQUIREMENTS = {
  FTC: {
    jurisdiction: 'United States',
    requirement: 'Clear and conspicuous disclosure of AI involvement',
    guideline: 'FTC Act Section 5 - Unfair or Deceptive Practices',
    implementation: {
      placement: 'Prominently at beginning of content',
      language: 'Clear, simple language (avoid jargon)',
      example: '🤖 This content was generated with AI assistance and reviewed by [Human]',
      bestPractice: 'Use clear visual indicator + text disclosure',
    },
  },

  GDPR: {
    jurisdiction: 'European Union',
    requirement: 'Transparency about automated decision-making',
    guideline: 'GDPR Article 13-14 - Right to Explanation',
    implementation: {
      placement: 'Privacy policy and per-content',
      language: 'Explain how AI data was trained/used',
      example: 'Content generated using [AI Tool] trained on public data up to [Date]',
      bestPractice: 'Link to detailed privacy policy',
    },
  },

  CCPA: {
    jurisdiction: 'California, USA',
    requirement: 'Disclosure of AI use for consumer data',
    guideline: 'CCPA Section 1798.100 - Right to Know',
    implementation: {
      placement: 'Privacy policy and opt-out mechanism',
      language: 'Explain AI data practices',
      example: 'We use AI tools to analyze content. Learn about your privacy rights.',
      bestPractice: 'Provide opt-out and data deletion options',
    },
  },

  SECTION_508: {
    jurisdiction: 'United States (Accessibility)',
    requirement: 'AI content must be accessible to all users',
    guideline: 'Section 508 - Electronic and Information Technology',
    implementation: {
      placement: 'Throughout content',
      language: 'Accessible formatting and alt text',
      example: 'All images include alt text, video has captions',
      bestPractice: 'WCAG 2.1 AA compliance minimum',
    },
  },
};

/**
 * Generate compliance checklist for content
 */
export function getComplianceChecklist(contentRegions = ['US', 'EU']) {
  const checklist = [];

  if (contentRegions.includes('US')) {
    checklist.push({
      region: 'US (FTC)',
      items: [
        '☐ AI involvement disclosed prominently',
        '☐ Disclosure uses clear, simple language',
        '☐ Visual indicator present (icon or badge)',
        '☐ Disclosure at beginning of content',
        '☐ No deceptive claims about AI capability',
      ],
    });
  }

  if (contentRegions.includes('EU')) {
    checklist.push({
      region: 'EU (GDPR)',
      items: [
        '☐ AI tools listed in privacy policy',
        '☐ Data training details disclosed',
        '☐ User rights explained (access, deletion)',
        '☐ Right to human review mentioned',
        '☐ Link to detailed privacy policy provided',
      ],
    });
  }

  if (contentRegions.includes('CCPA')) {
    checklist.push({
      region: 'California (CCPA)',
      items: [
        '☐ Privacy policy updated',
        '☐ Opt-out mechanism available',
        '☐ Right to deletion explained',
        '☐ Right to know explained',
        '☐ Data processing details transparent',
      ],
    });
  }

  checklist.push({
    region: 'All Regions',
    items: [
      '☐ Accessibility standards met (WCAG 2.1 AA)',
      '☐ Content not deceptive in any way',
      '☐ Sources cited with working links',
      '☐ Disclaimers appropriate for content type',
      '☐ Regular updates scheduled and documented',
    ],
  });

  return checklist;
}

// ============================================================================
// 7. CONTENT QUALITY WORKFLOW
// ============================================================================

/**
 * Recommended workflow for AI-generated content
 */
export const AI_CONTENT_WORKFLOW = {
  phase1_planning: {
    title: 'Planning & Scope',
    steps: [
      '1. Define content objectives and target audience',
      '2. Determine appropriate E-E-A-T level',
      '3. Identify compliance requirements',
      '4. Select appropriate AI tool(s)',
      '5. Create content outline with sources',
    ],
    duration: '30-60 minutes',
  },

  phase2_generation: {
    title: 'AI Content Generation',
    steps: [
      '1. Prepare detailed prompts with guidelines',
      '2. Request specific E-E-A-T enhancements',
      '3. Include source citations in prompts',
      '4. Generate initial draft with AI',
      '5. Export with original AI output for audit trail',
    ],
    duration: '15-30 minutes',
  },

  phase3_research: {
    title: 'Research & Verification',
    steps: [
      '1. Verify all factual claims against sources',
      '2. Check citations for accuracy and currency',
      '3. Add missing citations (minimum 5 for technical)',
      '4. Research author expertise/credentials',
      '5. Identify third-party validation opportunities',
    ],
    duration: '45-90 minutes',
  },

  phase4_refinement: {
    title: 'Human Refinement',
    steps: [
      '1. Add expertise signals (author bio, credentials)',
      '2. Incorporate real-world examples',
      '3. Enhance with hands-on experience',
      '4. Improve tone and brand alignment',
      '5. Add industry-specific insights',
    ],
    duration: '30-60 minutes',
  },

  phase5_compliance: {
    title: 'Compliance Review',
    steps: [
      '1. Add appropriate AI disclosure',
      '2. Include required disclaimers',
      '3. Verify accessibility compliance',
      '4. Check regional compliance (FTC, GDPR, etc)',
      '5. Validate all links and sources',
    ],
    duration: '20-30 minutes',
  },

  phase6_review: {
    title: 'Expert Review',
    steps: [
      '1. Subject matter expert reviews content',
      '2. Fact-check against personal experience',
      '3. Verify appropriateness for audience',
      '4. Check for accuracy of AI claims',
      '5. Approve for publication or request changes',
    ],
    duration: '30-45 minutes',
  },

  phase7_publication: {
    title: 'Publication & Monitoring',
    steps: [
      '1. Publish with all required disclosures',
      '2. Create audit trail with dates',
      '3. Monitor for feedback/corrections',
      '4. Schedule regular review (quarterly/annually)',
      '5. Update with new information as available',
    ],
    duration: 'Ongoing',
  },

  totalDuration: '3-4 hours per 2000-word article',
  recommendation: 'Use workflow for any AI-assisted content',
};

export default {
  DISCLOSURE_TYPES,
  EEAT_CHECKLIST,
  scoreContentQuality,
  AI_CONTENT_TEMPLATE,
  getContentReviewChecklist,
  AI_TOOL_RATINGS,
  REFINEMENT_GUIDELINES,
  COMPLIANCE_REQUIREMENTS,
  getComplianceChecklist,
  AI_CONTENT_WORKFLOW,
};
