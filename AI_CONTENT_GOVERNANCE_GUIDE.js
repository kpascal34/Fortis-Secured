/**
 * AI CONTENT GOVERNANCE & E-E-A-T IMPLEMENTATION GUIDE
 * ==================================================
 * 
 * Complete guide for managing AI-generated content with regulatory compliance
 * and E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) standards
 */

// ============================================================================
// PART 1: AI CONTENT POLICY & STANDARDS
// ============================================================================

const AI_CONTENT_POLICY = `
FORTIS SECURED AI CONTENT POLICY
================================

1. AI USE GUIDELINES
────────────────────
✓ PERMITTED:
  • Content research and fact-gathering
  • First-draft generation with human review
  • Grammar/style editing and refinement
  • Outline creation and structure planning
  • Summarization of complex topics
  • Code examples and technical documentation

✗ NOT PERMITTED WITHOUT DISCLOSURE:
  • Customer testimonials (must be genuine)
  • Expert quotes (must be from actual experts)
  • Medical/legal advice (must be human expert)
  • Security certifications (must be verified)
  • Case study outcomes (must be actual results)
  • Financial recommendations (must be human expert)

✗ STRICTLY PROHIBITED:
  • Creating fake expert credentials
  • Misrepresenting data or statistics
  • Publishing AI as human-written without disclosure
  • Using AI for deceptive purposes
  • Plagiarism or copyright infringement
  • Medical/legal advice without qualified professional

2. DISCLOSURE REQUIREMENTS
──────────────────────────
• ALL AI-involved content must disclose involvement
• Disclosure must be PROMINENT and at BEGINNING
• Must specify TYPE of AI involvement (full, assisted, reviewed)
• Must name AI TOOLS used
• Must name HUMAN REVIEWER
• Must include review DATE

3. E-E-A-T STANDARDS
────────────────────
ALL content must meet E-E-A-T requirements:

EXPERTISE:
  ✓ Author credentials clearly stated
  ✓ Professional qualifications mentioned
  ✓ Years of experience documented
  ✓ Relevant certifications included
  ✓ Educational background relevant

EXPERIENCE:
  ✓ Real-world examples provided
  ✓ Case studies included (anonymized)
  ✓ Hands-on knowledge demonstrated
  ✓ Practical implementation details shared
  ✓ Lessons learned documented

AUTHORITATIVENESS:
  ✓ 5+ citations from authoritative sources
  ✓ Links to industry standards (ISO, NIST, etc)
  ✓ References to peer-reviewed research
  ✓ Third-party validation mentioned
  ✓ Original data/reports linked

TRUSTWORTHINESS:
  ✓ AI involvement transparently disclosed
  ✓ Sources cited with working links
  ✓ All facts supported by evidence
  ✓ Appropriate disclaimers included
  ✓ Regular updates scheduled and shown
  ✓ Correction process explained publicly

4. CONTENT REVIEW REQUIREMENTS
──────────────────────────────
BEFORE PUBLICATION:

  Tier 1 - Light Review (5-10 min):
    Blog posts, non-critical content
    • Accuracy check on main claims
    • AI disclosure present
    • Tone/brand alignment
    • Link functionality

  Tier 2 - Standard Review (20-30 min):
    Service pages, guides, industry content
    • Full fact-checking against sources
    • E-E-A-T signals verified
    • Expertise level appropriate
    • Compliance review
    • Expert review by subject matter expert

  Tier 3 - Expert Review (45-60 min):
    Medical, legal, security-critical content
    • Licensed professional review required
    • All claims verified and cited
    • Disclaimers included
    • Regulatory compliance checked
    • Final approval by expert

5. QUALITY STANDARDS
────────────────────
✓ E-E-A-T Score: Minimum 70/100
✓ Accuracy: 100% of checkable claims verified
✓ Sources: 5+ for technical, 3+ for general content
✓ Citations: All with working links
✓ Disclosure: Clear and prominent
✓ Tone: Professional and trustworthy
✓ Accessibility: WCAG 2.1 AA compliant
✓ Compliance: All legal requirements met

CONSEQUENCES OF VIOLATIONS:
  ⚠️ First: Content unpublished, retraining required
  ⚠️ Second: Suspension of content creation privileges
  ⚠️ Third: Termination and potential legal action

`;

// ============================================================================
// PART 2: PRACTICAL IMPLEMENTATION EXAMPLES
// ============================================================================

const IMPLEMENTATION_EXAMPLES = {
  // EXAMPLE 1: Blog Post with AI Assistance
  blogPostExample: {
    title: 'Example: Security Blog Post (AI-Assisted)',
    
    step1_planning: `
    1. CONTENT OUTLINE (Created with AI)
    ──────────────────────────────────
    Title: "10 Advanced Door Supervision Techniques for Venue Security"
    
    • Research AI tools used: ChatGPT-4 for research, Perplexity for citations
    • Identify author: John Smith (Senior Security Manager, 15 years experience)
    • Define scope: Technical guide for security professionals
    • Identify compliance: No medical/legal disclaimers needed
    `,

    step2_aiGeneration: `
    2. AI CONTENT GENERATION
    ───────────────────────
    Prompt: "Write a technical guide on door supervision techniques for 
             professional security venues. Include industry standards,
             practical tips, and safety considerations. Format with
             subheadings and include research from industry sources."
    
    AI Output: ~2000-word initial draft with structure
    `,

    step3_research: `
    3. RESEARCH & VERIFICATION
    ─────────────────────────
    ☐ Verify all statistics against SIA guidelines
    ☐ Check door supervision legal requirements by region
    ☐ Add citations from:
      • SIA (Security Industry Authority)
      • ISO 17081 standards
      • Industry case studies
      • HMRC guidance documents
    ☐ Added 7 new citations during review
    ☐ Corrected 2 factual errors from AI draft
    ☐ Added disclaimer for legal variations by region
    `,

    step4_humanRefinement: `
    4. HUMAN REFINEMENT
    ──────────────────
    ☐ Add author expertise section:
      - John Smith, Senior Security Manager
      - SIA DBS and Door Supervision licenses
      - 15+ years venue security experience
      - Managed security at 50+ events annually
    
    ☐ Add real-world examples:
      - Case study from recent music festival
      - Common mistakes encountered in practice
      - Best practices from actual implementation
    
    ☐ Enhance with personal insights:
      - "In my experience, the most common issue is..."
      - "I've learned that communication protocols..."
      - "Over 15 years, I've noticed..."
    `,

    step5_compliance: `
    5. COMPLIANCE REVIEW
    ───────────────────
    ☐ Add AI disclosure at top:
      🤖 "This article was drafted with AI assistance (ChatGPT-4,
         Perplexity AI) for research and structure. It was written and
         reviewed by John Smith, a certified door supervisor with 15 years
         experience, on December 17, 2025."
    
    ☐ Add appropriate disclaimers:
      - "Laws vary by region - verify local requirements"
      - "This is educational content, not legal advice"
    
    ☐ Verify compliance:
      - FTC: Clear AI disclosure present ✓
      - GDPR: Links to privacy policy ✓
      - Accessibility: WCAG 2.1 AA ✓
    `,

    step6_review: `
    6. EXPERT REVIEW
    ───────────────
    Reviewer: Sarah Johnson (Operations Manager)
    Date: December 17, 2025
    Status: APPROVED
    
    ✓ Expertise signals strong
    ✓ All claims verified
    ✓ Real-world examples valuable
    ✓ Tone professional and trustworthy
    ✓ E-E-A-T score: 82/100 ✓
    ✓ AI disclosure clear and prominent
    ✓ No corrections needed
    ✓ Ready for publication
    `,

    step7_publication: `
    7. PUBLICATION & MONITORING
    ──────────────────────────
    ☐ Published: December 18, 2025
    ☐ Disclosure visible on page load
    ☐ All links tested working
    ☐ Sources accessible and current
    ☐ Analytics tracking enabled
    ☐ Scheduled review: June 2026 (6 months)
    
    Monthly checks:
    ☐ Link integrity
    ☐ Citation currency
    ☐ Feedback monitoring
    ☐ Correction tracking
    `,

    finalContent: `
    FINAL PUBLISHED ARTICLE STRUCTURE:
    ──────────────────────────────────
    
    🤖 AI DISCLOSURE (PROMINENT, AT TOP)
    ────────────────────────────────────
    This article was drafted with AI research assistance and written 
    by John Smith, a certified door supervisor with 15+ years of venue 
    security experience. It was fact-checked and published on 
    December 18, 2025.
    
    AUTHOR CREDENTIALS
    ──────────────────
    [Author box with photo, bio, certifications]
    
    ARTICLE CONTENT
    ───────────────
    [Full article with subheadings, examples, research]
    
    SOURCES & REFERENCES
    ────────────────────
    [7+ sources with links]
    
    E-E-A-T INDICATOR
    ────────────────
    Quality Score: 82/100 ✓
    ✓ Expert credentials verified
    ✓ Real-world experience documented
    ✓ Authoritative sources cited
    ✓ Fact-checked and transparent
    `,
  },

  // EXAMPLE 2: Service Page with Hybrid Content
  servicePageExample: {
    title: 'Example: Service Page (Hybrid AI + Human)',
    
    aiContribution: `
    AI CONTRIBUTED:
    • Market research and competitive analysis
    • Service benefit list generation
    • Industry trend identification
    • FAQ generation from common questions
    • Meta description optimization
    
    HUMAN CONTRIBUTED:
    • Core service description from company knowledge
    • Pricing and package details
    • Real case study from actual client
    • Security methodology from internal processes
    • Testimonials from real customers
    `,

    review: `
    REVIEW CHECKLIST FOR SERVICE PAGE:
    ──────────────────────────────────
    
    ☐ Service benefits accurate and achievable
    ☐ Pricing transparent and current
    ☐ Real case study included (not AI-generated)
    ☐ Customer testimonials genuine (verified)
    ☐ Security certifications accurate
    ☐ AI contribution disclosed
    ☐ Call-to-action clear and compelling
    ☐ Compliance: GDPR, CCPA, accessibility
    ☐ E-E-A-T signals present (authority, trust)
    ☐ Expert approval: Operations Director
    `,

    disclosure: `
    DISCLOSURE TEXT FOR SERVICE PAGE:
    ─────────────────────────────────
    "This page was created with AI research assistance to identify 
     industry trends and competitive positioning. The core service 
     descriptions, pricing, case studies, and testimonials are 
     provided by Fortis Secured's leadership team. Last updated 
     December 18, 2025."
    `,
  },

  // EXAMPLE 3: Legal Content (Medical/Legal Disclaimers)
  legalContentExample: {
    title: 'Example: Legal Content (Requires Expert Review)',
    
    aiLimitation: `
    AI CANNOT BE USED FOR:
    • Legal advice generation
    • Medical guidance
    • Regulatory interpretation
    • Compliance recommendations
    • Security certifications
    
    AI CAN BE USED FOR:
    • Research and information gathering
    • Drafting structure and outline
    • Summarizing published guidelines
    • Identifying relevant regulations
    • Format and accessibility improvements
    `,

    reviewProcess: `
    LEGAL CONTENT REVIEW PROCESS:
    ────────────────────────────
    
    1. AI Generates Initial Draft:
       • Outlines UK security regulations
       • Identifies SIA requirements
       • Summarizes existing guidance
       • Creates FAQ structure
    
    2. Legal Expert Review (REQUIRED):
       • Legal review by qualified solicitor
       • Verification of accuracy
       • Disclaimer appropriateness
       • Compliance with FCA/SRA guidelines
    
    3. Human Refinement:
       • Add specific case examples
       • Include internal compliance procedures
       • Add clarifications from expertise
       • Ensure disclaimer prominence
    
    4. Final Approval:
       • Legal team signoff required
       • Company leadership approval
       • Compliance officer review
    `,

    mandatoryDisclosure: `
    MANDATORY DISCLOSURE FOR LEGAL CONTENT:
    ──────────────────────────────────────
    
    ⚖️ LEGAL DISCLAIMER
    ──────────────────
    This content is for informational purposes only and does not 
    constitute legal advice. This page was drafted with AI research 
    assistance and reviewed by [Name], a solicitor licensed to practice 
    law in England & Wales. Laws and regulations vary by jurisdiction. 
    Always consult with a qualified legal professional for your specific 
    situation. Fortis Secured is not liable for reliance on this 
    information.
    
    AI DISCLOSURE:
    This page was researched using AI tools (ChatGPT-4, Perplexity AI) 
    and then professionally reviewed and approved by our legal team on 
    December 18, 2025.
    `,
  },
};

// ============================================================================
// PART 3: TOOLS & RESOURCES
// ============================================================================

const TOOLS_AND_RESOURCES = {
  aiTools: {
    'ChatGPT-4': {
      suitability: 'Content drafting, research, ideation',
      strengths: 'Excellent for first drafts, follows guidelines',
      weaknesses: 'May hallucinate sources, knowledge cutoff',
      recommendation: 'Use for initial drafts requiring human review',
    },
    Claude: {
      suitability: 'Analysis, research, fact-checking',
      strengths: 'Better at reasoning, acknowledges limitations',
      weaknesses: 'Slower, less real-time information',
      recommendation: 'Ideal for detailed analysis and research',
    },
    'Perplexity AI': {
      suitability: 'Research with citations, current information',
      strengths: 'Provides citations, real-time web access',
      weaknesses: 'Citation accuracy not always verified',
      recommendation: 'Good for research starting point',
    },
  },

  factCheckingTools: [
    'Fact-check.org',
    'Snopes.com',
    'PolitiFact.com',
    'FullFact.org (UK)',
    'Google Fact Check Explorer',
  ],

  sourceVerification: [
    'CrossRef.org - Academic citations',
    'Google Scholar - Peer-reviewed research',
    'ScienceDaily - Recent research summaries',
    'ResearchGate - Direct researcher access',
    'ISSN Database - Journal verification',
  ],

  regulatoryGuidelines: [
    'FTC Guidelines on Endorsements & Testimonials',
    'GDPR Article 13-14 - Data Subject Rights',
    'CCPA - California Consumer Privacy Act',
    'WCAG 2.1 - Web Content Accessibility',
    'Section 508 - Federal Accessibility Requirements',
  ],
};

// ============================================================================
// PART 4: QUICK REFERENCE CHECKLISTS
// ============================================================================

const CHECKLISTS = {
  beforeAiGeneration: [
    '☐ Define content objective and audience',
    '☐ Identify content type (blog, guide, legal, etc)',
    '☐ Determine E-E-A-T level required',
    '☐ Check compliance requirements',
    '☐ Select appropriate AI tool(s)',
    '☐ Create detailed prompts with guidelines',
    '☐ Prepare source list for verification',
    '☐ Assign human reviewer',
  ],

  beforePublication: [
    '☐ All factual claims verified',
    '☐ 5+ citations (or 3+ for general content)',
    '☐ AI disclosure present and prominent',
    '☐ Author credentials documented',
    '☐ Appropriate disclaimers included',
    '☐ E-E-A-T score 70+ minimum',
    '☐ Accessibility compliant (WCAG 2.1 AA)',
    '☐ All links functional',
    '☐ Expert approval obtained',
    '☐ Compliance review passed',
  ],

  afterPublication: [
    '☐ Scheduled review date set',
    '☐ Update schedule established',
    '☐ Feedback monitoring enabled',
    '☐ Correction process documented',
    '☐ Analytics tracking active',
    '☐ Link checker scheduled monthly',
    '☐ Citation currency review scheduled',
  ],
};

// ============================================================================
// PART 5: TRAINING & EDUCATION
// ============================================================================

const TRAINING_MODULES = {
  'Module 1: E-E-A-T Fundamentals': {
    duration: '30 minutes',
    topics: [
      'What is E-E-A-T and why it matters',
      'How search engines evaluate E-E-A-T',
      'Practical E-E-A-T signals in content',
      'Real examples of good vs poor E-E-A-T',
    ],
    assessment: 'Quiz on E-E-A-T principles',
  },

  'Module 2: AI Content Guidelines': {
    duration: '45 minutes',
    topics: [
      'When to use AI (permitted uses)',
      'When NOT to use AI (prohibited)',
      'Disclosure requirements by jurisdiction',
      'Red flags and ethical considerations',
    ],
    assessment: 'Review sample content for compliance',
  },

  'Module 3: Content Review Process': {
    duration: '60 minutes',
    topics: [
      'How to verify factual claims',
      'Finding and evaluating sources',
      'Using fact-checking tools',
      'Documenting review process',
    ],
    assessment: 'Fact-check sample article',
  },

  'Module 4: Disclosure & Compliance': {
    duration: '45 minutes',
    topics: [
      'FTC disclosure requirements',
      'GDPR transparency requirements',
      'CCPA privacy notice requirements',
      'Industry-specific compliance (medical, legal)',
    ],
    assessment: 'Compliance audit of sample content',
  },

  'Module 5: AI Tool Evaluation': {
    duration: '30 minutes',
    topics: [
      'Overview of major AI tools',
      'Strengths and weaknesses',
      'When to use each tool',
      'Limitations and hallucination risks',
    ],
    assessment: 'Match content type to best AI tool',
  },

  'Module 6: Case Studies & Practice': {
    duration: '90 minutes',
    topics: [
      'Real-world examples of good AI content',
      'Common mistakes to avoid',
      'Practice with guided review',
      'Handling difficult scenarios',
    ],
    assessment: 'Complete full content review workflow',
  },
};

export {
  AI_CONTENT_POLICY,
  IMPLEMENTATION_EXAMPLES,
  TOOLS_AND_RESOURCES,
  CHECKLISTS,
  TRAINING_MODULES,
};
