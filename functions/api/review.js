/**
 * Cloudflare Pages Function: POST /api/review
 */

const SYSTEM_PROMPT = `You are a Senior SEO Content Editor, Editorial Quality Auditor, and Publishing Strategist.
Your mission is to perform a strict, rigorous, and objective review of the submitted blog post or article.

You must review and evaluate the content EXCLUSIVELY against the following STRICT GUIDELINES:

================================================================================
1. SEO, TITLE & META DATA:
- [SEO-01] Search Intent Identified & Satisfied Early: Search intent must be clearly identified and directly satisfied within the first 150 to 200 words.
- [SEO-02] Title Under 58 Characters & Contains Primary Keyword: The title must be strictly under 58 characters and must contain the primary keyword.
- [SEO-03] Meta Description Under 155 Characters & Contains Primary Keyword: Meta description (if provided or extracted) must be under 155 characters and contain the primary keyword.
- [SEO-04] Primary Keyword Density (2 to 4 Times): The primary keyword must appear naturally 2 to 4 times across the article without keyword stuffing.
- [SEO-05] SEO Optimized Keyword Usage: The article must be comprehensively SEO optimized for related search intent while maintaining natural phrasing.

================================================================================
2. STRUCTURE, HEADINGS & FORMATTING:
- [STRUCT-01] Logical Heading Hierarchy (H2 -> H3): Headings must follow a strict, logical hierarchy (H1 -> H2 -> H3).
- [STRUCT-02] Clear & Non-Generic Headings: Headings must be clear, compelling, and descriptive (no vague or generic headers like "Overview", "Details", "Section 1").
- [STRUCT-03] No -ing Verbs in Headings: Do not use -ing verbs in headings if a simpler, direct root form exists (e.g., use "Build High-Performance APIs" instead of "Building High-Performance APIs", "Optimize Your Database" instead of "Optimizing Your Database"). Only flag a violation if a heading explicitly contains an action verb ending in "-ing" (such as "Creating", "Developing", "Deploying"). Do NOT flag headings that use root verbs (e.g. "Build"), agent nouns (e.g. "Builders", "Designers"), or standard nouns (e.g. "Marketing", "Pricing", "Spring").
- [STRUCT-04] Short Paragraphs (Max 4 Statements/Sentences): Each paragraph must contain a maximum of 4 statements/sentences (delimited by '.', '!', or '?'). There is NO word count limit on paragraphs. Visual line wrap caused by screen or editor width does NOT count as extra lines. Only flag a violation if a single individual paragraph contains 5 or more distinct statements/sentences.
- [STRUCT-05] Bullet Points & Tables Used Where Needed: Lists, bullet points, or comparison tables must be used for multi-item concepts, steps, or structured data.
- [STRUCT-06] Logical Flow & Smooth Section Transitions: Content must flow logically from top to bottom with seamless, natural transitions between sections.
- [STRUCT-07] Natural Structure (Avoid Templated Feel): Structure must feel organic and tailored to the topic, avoiding repetitive or cookie-cutter templates.

================================================================================
3. CONTENT DEPTH, QUALITY & ACCURACY:
- [CONTENT-02] Thorough Subtopic Coverage: The article must cover all expected subtopics and search nuances thoroughly.
- [CONTENT-03] Specific, Actionable & Example-Driven: Every claim must be backed by concrete examples, verifiable data, or practical frameworks.
- [CONTENT-04] No Fluff, Filler, or Vague Statements: Strictly eliminate empty filler, fluff phrases ("needless to say", "in today's fast-paced world", "it is important to note"), and vague assertions.
- [CONTENT-05] No Redundancy or Repeated Ideas: Zero circular logic, repeated points, or rephrased restatements across sections.
- [CONTENT-06] Factual Accuracy & Grammar/Spelling: Flawless grammar, correct spelling, accurate technical terminology, and verified claims.

================================================================================
4. INTERNAL LINKS & CLEAN URLS:
- [LINK-01] Internal Links Added to Relevant Pages: Content must include at least 1 internal link to relevant contextual pages. Flag an error/warning ONLY if 0 internal links are present. Do NOT flag any error if multiple internal links (e.g. 2, 4, 6, 10, etc.) are added; there is no upper limit.
- [LINK-02] Skip Internal Links in H1 and Introduction: Do not place internal links in the H1 title/heading or in the opening introductory paragraph(s) before the first H2 heading. Internal links are allowed and encouraged everywhere else from the first H2 heading onwards. Word count limits do NOT apply to link restrictions; only check that H1 and the opening introduction paragraph contain no internal links.
- [LINK-04] Clean URLs (No AI / Tracking Parameters): All URLs must be clean and free of tracking parameters such as utm_source=gemini, utm_source=chatgpt, utm_source=claude, or unnecessary query tags.

================================================================================
5. TONE, READABILITY & ANTI-AI HUMAN WRITING:
- [TONE-01] Anti-AI (Natural & Human Writing): Keep the writing authentic, human, and conversational. Avoid robotic cadence, cliché AI transitional buzzwords ("delve", "tapestry", "moreover", "furthermore", "beacon", "testament"), and pretentious phrasing.
- [TONE-02] Non-Generic Content: Avoid vague platitudes; provide specific, useful, and accurate details.
- [TONE-03] Expert Yet Accessible Tone: Tone must be authoritative, credible, and expert, yet easy for readers to digest.
- [TONE-04] Hemingway Readability (Grade 7 or Less): Sentence complexity must remain accessible, maintaining a Hemingway readability grade level of Grade 7 or less.
- [TONE-05] Clear Intro & Value-Driven Conclusion with CTA: Introduction must be clear and to the point; conclusion must summarize core value clearly with a relevant, non-intrusive Call to Action (CTA).

================================================================================
SCORING & STATUS EVALUATION CRITERIA:
- Calculate a Compliance Score from 0 to 100 based strictly on adherence to the rules above.
- Overall Status:
  * "Pass": Compliance Score >= 85 AND zero critical violations (e.g. search intent satisfied early, clean URLs, natural human tone, proper heading structure).
  * "Needs Revision": Compliance Score < 85 OR serious infractions (e.g. robotic AI phrasing, missing early search intent, tracking params in URLs, headings with -ing verbs, long wall paragraphs).

OUTPUT FORMAT:
- You must return ONLY a JSON response strictly conforming to the requested schema.
- For each violation, quote the EXACT original excerpt, explain why it violated the guideline, and provide a concrete rewritten "suggestedFix".
- Provide the full checklist for each rule.`;

const JSON_SCHEMA = {
  type: 'OBJECT',
  properties: {
    overallStatus: {
      type: 'STRING',
      description: 'Overall editorial decision: "Pass" or "Needs Revision"',
      enum: ['Pass', 'Needs Revision']
    },
    complianceScore: {
      type: 'INTEGER',
      description: 'Calculated compliance score between 0 and 100 based strictly on the provided custom guidelines'
    },
    summary: {
      type: 'STRING',
      description: 'Executive summary of the review findings, SEO readiness, and editorial recommendation (2-3 sentences)'
    },
    metrics: {
      type: 'OBJECT',
      description: 'Quantitative content and SEO metrics',
      properties: {
        wordCount: {
          type: 'INTEGER',
          description: 'Total word count of the analyzed text'
        },
        estimatedReadingTimeMinutes: {
          type: 'NUMBER',
          description: 'Estimated reading time in minutes'
        },
        detectedTone: {
          type: 'STRING',
          description: 'Detected tone (e.g., Expert & Accessible, Robotic AI, Informal, Overly Academic)'
        },
        readingLevel: {
          type: 'STRING',
          description: 'Hemingway readability grade level (Target: Grade 7 or less)'
        },
        primaryKeyword: {
          type: 'STRING',
          description: 'Identified primary target keyword'
        },
        primaryKeywordCount: {
          type: 'INTEGER',
          description: 'Number of times primary keyword appears (Target: 2 to 4 times)'
        },
        titleLength: {
          type: 'INTEGER',
          description: 'Character length of the title (Target: under 58 characters)'
        },
        internalLinksCount: {
          type: 'INTEGER',
          description: 'Count of internal links detected (Target: 2 to 4 relevant links, none in 1st fold)'
        }
      },
      required: [
        'wordCount',
        'estimatedReadingTimeMinutes',
        'detectedTone',
        'readingLevel',
        'primaryKeyword',
        'primaryKeywordCount',
        'titleLength',
        'internalLinksCount'
      ]
    },
    checklist: {
      type: 'ARRAY',
      description: 'Evaluation against every specified rule in the custom guidelines',
      items: {
        type: 'OBJECT',
        properties: {
          ruleId: {
            type: 'STRING',
            description: 'Rule code (e.g., SEO-01, STRUCT-01, CONTENT-02, LINK-01, TONE-01)'
          },
          category: {
            type: 'STRING',
            description: 'Category name of the guideline'
          },
          ruleName: {
            type: 'STRING',
            description: 'Title of the guideline rule'
          },
          status: {
            type: 'STRING',
            description: 'Evaluation status for this specific rule',
            enum: ['Pass', 'Fail', 'Warning']
          },
          notes: {
            type: 'STRING',
            description: 'Specific audit note or measurement explaining the rating'
          }
        },
        required: ['ruleId', 'category', 'ruleName', 'status', 'notes']
      }
    },
    violations: {
      type: 'ARRAY',
      description: 'List of specific guideline violations found in the text',
      items: {
        type: 'OBJECT',
        properties: {
          ruleId: {
            type: 'STRING',
            description: 'The associated rule ID'
          },
          category: {
            type: 'STRING',
            description: 'Category of the violation'
          },
          severity: {
            type: 'STRING',
            description: 'Severity level of the violation',
            enum: ['Critical', 'Major', 'Minor', 'Suggestion']
          },
          issue: {
            type: 'STRING',
            description: 'Clear, concise description of the detected issue'
          },
          originalExcerpt: {
            type: 'STRING',
            description: 'Exact verbatim excerpt from the blog post containing the violation'
          },
          suggestedFix: {
            type: 'STRING',
            description: 'Rewritten replacement text or concrete editorial fix'
          },
          explanation: {
            type: 'STRING',
            description: 'Why this excerpt violates the specific guideline'
          }
        },
        required: ['ruleId', 'category', 'severity', 'issue', 'originalExcerpt', 'suggestedFix', 'explanation']
      }
    },
    strengths: {
      type: 'ARRAY',
      description: 'Key positive aspects and strengths observed in the content adhering to the guidelines',
      items: {
        type: 'STRING'
      }
    },
    actionPlan: {
      type: 'ARRAY',
      description: 'Prioritized step-by-step checklist to bring content to 100% compliance with guidelines',
      items: {
        type: 'STRING'
      }
    }
  },
  required: [
    'overallStatus',
    'complianceScore',
    'summary',
    'metrics',
    'checklist',
    'violations',
    'strengths',
    'actionPlan'
  ]
};

function extractPlainText(content) {
  if (!content || typeof content !== 'string') return '';
  return content
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/<\/(?:p|div|h[1-6]|li|tr|td|th|blockquote|pre|code|table|section|article)>/gi, ' ')
    .replace(/<(?:br|hr|img|input)[^>]*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(content) {
  const plain = extractPlainText(content);
  return plain ? plain.split(/\s+/).filter(Boolean).length : 0;
}

function calculateHemingwayGrade(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return { grade: 0, rawScore: 0, label: 'N/A', meetsRequirement: true };
  }

  let formatted = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<\/(?:p|div|h[1-6]|li|tr|blockquote|pre|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~`#]/g, '');

  formatted = formatted.replace(/\b([0-9]+)\.([0-9]+)\b/g, '$1_$2');
  formatted = formatted.replace(/\b(e\.g\.|i\.e\.|vs\.|mr\.|mrs\.|dr\.|inc\.|ltd\.|etc\.)/gi, (m) => m.replace(/\./g, '_'));

  const blocks = formatted.split(/\r?\n+/).map(b => b.trim()).filter(Boolean);
  const allSentences = [];
  for (const block of blocks) {
    const blockSentences = block.split(/[.!?]+(?:\s+|$)/)
      .map(s => s.replace(/_/g, '.').trim())
      .filter(s => /[a-zA-Z0-9]/.test(s));
    
    if (blockSentences.length > 0) {
      allSentences.push(...blockSentences);
    } else if (/[a-zA-Z0-9]/.test(block)) {
      allSentences.push(block);
    }
  }

  const cleanPlainText = formatted.replace(/_/g, '.').trim();
  const words = cleanPlainText.split(/\s+/).filter(Boolean);
  const letters = (cleanPlainText.match(/[a-zA-Z0-9]/g) || []).length;

  if (words.length === 0) {
    return { grade: 1, rawScore: 1, label: 'Grade 1', meetsRequirement: true };
  }

  const wordCount = Math.max(1, words.length);
  const sentenceCount = Math.max(1, allSentences.length);

  // Exact ARI formula
  const rawAri = 4.71 * (letters / wordCount) + 0.5 * (wordCount / sentenceCount) - 21.43;
  const gradeInt = Math.max(1, Math.round(rawAri));
  const meetsRequirement = gradeInt <= 7;

  return {
    grade: gradeInt,
    rawScore: Math.round(rawAri * 10) / 10,
    label: `Grade ${gradeInt}`,
    meetsRequirement
  };
}

function extractDomain(url) {
  try {
    const cleaned = url.replace(/^[a-z]+:\/\//i, '').replace(/^www\./i, '');
    const slashIdx = cleaned.indexOf('/');
    return (slashIdx !== -1 ? cleaned.substring(0, slashIdx) : cleaned).toLowerCase();
  } catch (e) {
    return '';
  }
}

function analyzeLinks(content, title = '') {
  if (!content || typeof content !== 'string') {
    return {
      totalLinks: 0,
      internalLinksCount: 0,
      externalLinksCount: 0,
      internalLinks: [],
      externalLinks: [],
      linksInFirstFoldCount: 0,
      uncleanLinks: [],
      isAllClean: true
    };
  }

  const allLinks = [];
  const seenUrls = new Set();

  // 1. Extract Markdown Links [text](url)
  const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = mdLinkRegex.exec(content)) !== null) {
    const text = match[1].trim();
    const url = match[2].trim();
    if (url && !seenUrls.has(url)) {
      seenUrls.add(url);
      allLinks.push({ text, url, raw: match[0] });
    }
  }

  // 2. Extract HTML Links <a ...href="url"...>text</a>
  const htmlLinkRegex = /<a\s+[^>]*?href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = htmlLinkRegex.exec(content)) !== null) {
    const url = match[1].trim();
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    if (url && !seenUrls.has(url)) {
      seenUrls.add(url);
      allLinks.push({ text: text || url, url, raw: match[0] });
    }
  }

  // 3. Scan for tracking parameters
  const trackingParamRegex = /(?:[?&](?:utm_[a-z0-9_]+|fbclid|gclid|msclkid|mc_cid|mc_eid|ref_src|yclid)=[^&#]*)/i;
  const uncleanLinks = [];
  for (const link of allLinks) {
    if (trackingParamRegex.test(link.url) || /utm_source=/i.test(link.url)) {
      uncleanLinks.push(link);
    }
  }

  // 4. Categorize Internal vs External
  const knownExternalDomainSuffixes = [
    'wikipedia.org', 'who.int', 'nih.gov', 'cdc.gov', 'gov.in', 'gov.uk', 'reuters.com',
    'bloomberg.com', 'forbes.com', 'nytimes.com', 'bbc.com', 'techcrunch.com',
    'github.com', 'w3.org', 'mozilla.org', 'stackoverflow.com', 'medium.com'
  ];

  const domainCounts = {};
  for (const link of allLinks) {
    const dom = extractDomain(link.url);
    if (dom) {
      domainCounts[dom] = (domainCounts[dom] || 0) + 1;
    }
  }

  let primaryDomain = '';
  let maxCount = 0;
  for (const [dom, count] of Object.entries(domainCounts)) {
    if (count > maxCount && !knownExternalDomainSuffixes.some(k => dom.endsWith(k))) {
      maxCount = count;
      primaryDomain = dom;
    }
  }

  const cleanTitle = (title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const dom of Object.keys(domainCounts)) {
    const rootName = dom.split('.')[0];
    if (rootName.length >= 3 && cleanTitle.includes(rootName)) {
      primaryDomain = dom;
      break;
    }
  }

  const internalLinks = [];
  const externalLinks = [];

  for (const link of allLinks) {
    const url = link.url;
    const dom = extractDomain(url);
    const isRelative = !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('//');
    const isSamePrimaryDomain = Boolean(dom && primaryDomain && (dom === primaryDomain || dom.endsWith('.' + primaryDomain)));
    const isKnownExternal = Boolean(dom && knownExternalDomainSuffixes.some(k => dom.endsWith(k)));

    if (isRelative || isSamePrimaryDomain) {
      internalLinks.push(link);
    } else if (isKnownExternal) {
      externalLinks.push(link);
    } else {
      if (Object.keys(domainCounts).length <= 1 && dom) {
        internalLinks.push(link);
      } else if (dom === primaryDomain) {
        internalLinks.push(link);
      } else {
        externalLinks.push(link);
      }
    }
  }

  // Fallback: If all links point to same domain and none are marked internal yet
  if (internalLinks.length === 0 && externalLinks.length > 0) {
    const firstDom = extractDomain(externalLinks[0].url);
    const allSameDom = externalLinks.every(l => extractDomain(l.url) === firstDom);
    if (allSameDom && firstDom && !knownExternalDomainSuffixes.some(k => firstDom.endsWith(k))) {
      internalLinks.push(...externalLinks);
      externalLinks.length = 0;
    }
  }

  // First fold check: Look for internal links inside H1 or the Introduction section (before first H2 heading)
  let introContent = '';
  const h2Match = content.match(/<h2\b[^>]*>|(?:\r?\n|^)##\s+/i);
  if (h2Match && typeof h2Match.index === 'number') {
    introContent = content.slice(0, h2Match.index);
  } else {
    // Fallback if no H2 heading exists: only the first paragraph
    const firstParaMatch = content.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
    if (firstParaMatch) {
      introContent = firstParaMatch[0];
    } else {
      const plainBlocks = content.split(/\r?\n\s*\r?\n/);
      introContent = plainBlocks[0] || '';
    }
  }

  // Also include the title/H1 explicitly in intro check
  const titleClean = (title || '').toLowerCase();
  const introLower = (introContent + ' ' + titleClean).toLowerCase();

  const linksInFirstFold = internalLinks.filter(l => {
    const linkText = (l.text || '').toLowerCase();
    const linkUrl = (l.url || '').toLowerCase();
    const rawLink = (l.raw || '').toLowerCase();
    return (rawLink && introLower.includes(rawLink)) ||
           (linkUrl.length > 3 && introLower.includes(linkUrl)) ||
           (linkText.length > 2 && introLower.includes(linkText));
  });

  return {
    totalLinks: allLinks.length,
    internalLinksCount: internalLinks.length,
    externalLinksCount: externalLinks.length,
    internalLinks,
    externalLinks,
    linksInFirstFoldCount: linksInFirstFold.length,
    uncleanLinks,
    isAllClean: uncleanLinks.length === 0
  };
}

function countKeywordOccurrences(text, keyword) {
  if (!text || !keyword || typeof keyword !== 'string' || keyword.trim().length === 0) return 0;
  const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Helper: Analyze paragraphs and statement counts (delimited by ., !, ?)
 * Enforces maximum 4 statements per paragraph rule without any paragraph word count limits.
 * Visual line wrapping is strictly ignored.
 * Evaluates each paragraph independently, properly splitting at <p>, <div>, <br><br>, or blank lines.
 */
function analyzeParagraphStatements(content) {
  if (!content || typeof content !== 'string' || !content.trim()) {
    return {
      totalParagraphs: 0,
      maxStatements: 0,
      violatingParagraphs: [],
      allCompliant: true
    };
  }

  // 1. Remove code blocks
  let cleaned = content.replace(/```[\s\S]*?```/g, '\n\n');

  // 2. Normalize all HTML and markdown paragraph delimiters into double newlines
  let normalized = cleaned
    .replace(/<br\s*\/?>\s*(?:&nbsp;|\s)*<br\s*\/?>/gi, '\n\n')
    .replace(/<\/(?:p|div|h[1-6]|li|blockquote|section|article|tr|td|th|table)>/gi, '\n\n')
    .replace(/<(?:p|div|h[1-6]|li|blockquote|section|article|tr|td|th|table)\b[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\u00a0/g, ' ');

  // 3. Extract independent paragraph blocks
  const rawBlocks = normalized.split(/\r?\n\s*\r?\n+/);
  const paragraphTexts = [];

  for (const block of rawBlocks) {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    // Exclude markdown headings, table rows, and divider lines
    const proseLines = lines.filter(l => !l.startsWith('#') && !l.startsWith('|') && !l.startsWith('---') && !l.startsWith('==='));
    const text = proseLines.join(' ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_~`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (
      text && 
      /[a-zA-Z0-9]/.test(text) && 
      !text.toLowerCase().startsWith('meta description:') && 
      !text.toLowerCase().startsWith('title:') &&
      text.length > 5
    ) {
      paragraphTexts.push(text);
    }
  }

  // 4. For each individual independent paragraph, count statements delimited by . ! ?
  const violatingParagraphs = [];
  let maxStatements = 0;

  for (let i = 0; i < paragraphTexts.length; i++) {
    const para = paragraphTexts[i];

    // Protect abbreviations and decimal numbers
    let protectedPara = para
      .replace(/\b([0-9]+)\.([0-9]+)\b/g, '$1_$2')
      .replace(/\b(e\.g\.|i\.e\.|vs\.|mr\.|mrs\.|dr\.|prof\.|inc\.|ltd\.|etc\.|al\.|no\.|vol\.)/gi, (m) => m.replace(/\./g, '_'));

    // Split by ., !, or ?
    const rawStatements = protectedPara
      .split(/[.!?]+(?:\s+|$)/)
      .map(s => s.replace(/_/g, '.').trim())
      .filter(s => /[a-zA-Z0-9]/.test(s));

    const statementCount = rawStatements.length > 0 ? rawStatements.length : (/[a-zA-Z0-9]/.test(para) ? 1 : 0);

    if (statementCount > maxStatements) {
      maxStatements = statementCount;
    }

    if (statementCount > 4) {
      violatingParagraphs.push({
        index: i + 1,
        statementCount,
        excerpt: para.length > 140 ? para.substring(0, 140) + '...' : para,
        fullText: para
      });
    }
  }

  return {
    totalParagraphs: paragraphTexts.length,
    maxStatements,
    violatingParagraphs,
    allCompliant: violatingParagraphs.length === 0
  };
}

/**
 * Standard words ending in -ing that are valid nouns, adjectives, or industry terms (NOT action verbs to simplify)
 */
const ALLOWED_ING_WORDS = new Set([
  'marketing', 'pricing', 'engineering', 'accounting', 'training', 'branding', 'clothing',
  'housing', 'shipping', 'landing', 'spring', 'ring', 'wing', 'king', 'thing', 'everything',
  'anything', 'something', 'nothing', 'during', 'according', 'ongoing', 'upcoming', 'interesting',
  'morning', 'evening', 'ceiling', 'flooring', 'lighting', 'ranking', 'scoring', 'listing', 'padding',
  'spelling', 'caching', 'routing', 'clustering', 'piping', 'monitoring'
]);

/**
 * Helper: Extract all headings and verify whether they contain action verbs ending in '-ing'
 */
function analyzeHeadings(content, title = '') {
  if (!content || typeof content !== 'string') {
    return {
      allHeadings: [],
      violatingHeadings: [],
      allCompliant: true
    };
  }

  const headings = [];

  if (title && title.trim()) {
    headings.push({ level: 'H1', text: title.trim() });
  }

  const htmlHeadingRegex = /<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = htmlHeadingRegex.exec(content)) !== null) {
    const level = match[1].toUpperCase();
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    if (text) {
      headings.push({ level, text });
    }
  }

  const mdHeadingRegex = /^(#{1,6})\s+(.+)$/gm;
  while ((match = mdHeadingRegex.exec(content)) !== null) {
    const level = 'H' + match[1].length;
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    if (text && !headings.some(h => h.text.toLowerCase() === text.toLowerCase())) {
      headings.push({ level, text });
    }
  }

  const violatingHeadings = [];

  for (const heading of headings) {
    const words = heading.text
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    const detectedIngWords = [];
    for (const word of words) {
      const lower = word.toLowerCase();
      if (lower.endsWith('ing') && lower.length > 4 && !ALLOWED_ING_WORDS.has(lower)) {
        detectedIngWords.push(word);
      }
    }

    if (detectedIngWords.length > 0) {
      violatingHeadings.push({
        ...heading,
        ingWords: detectedIngWords
      });
    }
  }

  return {
    allHeadings: headings,
    violatingHeadings,
    allCompliant: violatingHeadings.length === 0
  };
}

export async function onRequestPost(context) {
  try {
    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing API Key',
          message: 'GEMINI_API_KEY is not configured in Cloudflare Pages Environment Variables.'
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    const modelName = context.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const body = await context.request.json();
    const { content, title, metaDescription } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Bad Request',
          message: 'Request body must include a non-empty "content" string field.'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length < 20) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Content Too Short',
          message: 'Please provide at least a few sentences or a complete article draft to evaluate.'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    let finalTitle = (title || '').trim();
    if (!finalTitle) {
      const titleMatch = trimmedContent.match(/^#\s*(.+)$/m) || trimmedContent.match(/^Title:\s*(.+)$/mi) || trimmedContent.match(/^(.+)$/m);
      finalTitle = titleMatch ? titleMatch[1].trim() : '';
    }

    let finalMeta = (metaDescription || '').trim();
    if (!finalMeta) {
      const metaMatch = trimmedContent.match(/Meta(?:\s*Description)?:\s*(.+)$/mi);
      finalMeta = metaMatch ? metaMatch[1].trim() : '';
    }

    const plainText = extractPlainText(trimmedContent);
    const words = countWords(trimmedContent);
    const chars = plainText.length;
    const readTimeMin = Math.max(1, Math.ceil(words / 200));
    const titleLength = finalTitle.length;
    const metaLength = finalMeta.length;

    const hemingway = calculateHemingwayGrade(trimmedContent);
    const linkAnalysis = analyzeLinks(trimmedContent, finalTitle);
    const paraAnalysis = analyzeParagraphStatements(trimmedContent);
    const headingAnalysis = analyzeHeadings(trimmedContent, finalTitle);

    // Sanitize any massive embedded base64 images before sending to Gemini prompt to prevent token limit blowups
    const sanitizedContentForPrompt = trimmedContent
      .replace(/<img[^>]+src=["']data:image\/[^"']+["'][^>]*>/gi, '<img alt="[embedded image]"/>')
      .replace(/data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]{100,}/g, '[embedded image data]');

    // Format content with explicit double-newline paragraph separation for clean LLM parsing
    const formattedContentForPrompt = sanitizedContentForPrompt
      .replace(/<br\s*\/?>\s*(?:&nbsp;|\s)*<br\s*\/?>/gi, '</p>\n\n<p>')
      .replace(/<\/(?:p|div|h[1-6]|li|blockquote|section|article)>/gi, '</$1>\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p\b[^>]*>\s*<\/p>/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const userPrompt = `Please review the following blog post thoroughly according to the strict editorial, SEO, and compliance guidelines.

===============================================================================
VERIFIED SYSTEM-COMPUTED METRICS (REAL LIVE DATA EXTRACTED FROM POST):
- Total Word Count: ${words} words (Informational statistic, do not fail for word count)
- Explicit Title Provided: "${finalTitle}" (Length: ${titleLength} characters. ${titleLength > 0 && titleLength <= 58 ? 'Under 58 chars: PASS for length.' : titleLength === 0 ? 'No title provided: FAIL.' : `Over 58 chars (${titleLength}/58): FAIL.`})
- Explicit Meta Description Provided: "${finalMeta}" (Length: ${metaLength} characters. ${metaLength > 0 && metaLength <= 155 ? 'Under 155 chars: PASS for length.' : metaLength === 0 ? 'No meta description: FAIL.' : `Over 155 chars (${metaLength}/155): FAIL.`})
- Exact Live Hemingway Readability Score: ${hemingway.label} (Score: ${hemingway.rawScore}. ${hemingway.meetsRequirement ? 'Passes rule [TONE-04] (<= Grade 7).' : 'Fails rule [TONE-04] (exceeds Grade 7).'})
- Actual Extracted Internal Links Count: ${linkAnalysis.internalLinksCount} internal link(s) (${linkAnalysis.internalLinksCount >= 1 ? `Passes rule [LINK-01] (${linkAnalysis.internalLinksCount} internal link(s) found - meets at least 1 requirement).` : 'Fails rule [LINK-01] (0 internal links found. At least 1 internal link required).'})
- Internal Links in H1 & Introduction (Before 1st H2): ${linkAnalysis.linksInFirstFoldCount} (${linkAnalysis.linksInFirstFoldCount === 0 ? 'Passes rule [LINK-02] (No internal links in H1 or opening intro before 1st H2).' : `Fails rule [LINK-02] (Found ${linkAnalysis.linksInFirstFoldCount} internal link(s) in H1/intro before 1st H2).`})
- URL Cleanliness Verification: ${linkAnalysis.isAllClean ? 'ALL URLs ARE 100% CLEAN (Zero UTM / AI tracking parameters). Rule [LINK-04] is a PASS.' : `Found ${linkAnalysis.uncleanLinks.length} URL(s) with tracking parameters: ${linkAnalysis.uncleanLinks.map(l => l.url).join(', ')}.`}
- Heading -ing Verbs Verification: ${headingAnalysis.allCompliant ? `ALL ${headingAnalysis.allHeadings.length} HEADINGS COMPLIANT (Zero unneeded -ing action verbs; headings use direct root verbs or clean nouns). Rule [STRUCT-03] is a PASS.` : `Found ${headingAnalysis.violatingHeadings.length} heading(s) with -ing action verbs: ${headingAnalysis.violatingHeadings.map(h => `"${h.text}" (${h.ingWords.join(', ')})`).join('; ')}.`}
- Paragraph Statement Count Verification: ${paraAnalysis.allCompliant ? `ALL ${paraAnalysis.totalParagraphs} PARAGRAPHS FULLY COMPLIANT (Each paragraph has <= 4 statements delimited by . ! ?; highest count in any paragraph: ${paraAnalysis.maxStatements} statements). Rule [STRUCT-04] is a PASS. Zero word count restrictions apply.` : `Found ${paraAnalysis.violatingParagraphs.length} paragraph(s) with more than 4 statements: ${paraAnalysis.violatingParagraphs.map(p => `Paragraph #${p.index} has ${p.statementCount} statements ("${p.excerpt}")`).join('; ')}.`}
- List of Detected Internal Links: ${linkAnalysis.internalLinks.length > 0 ? linkAnalysis.internalLinks.map(l => `"${l.text}" (${l.url})`).join(', ') : 'None'}
- Estimated Reading Time: ~${readTimeMin} minutes
===============================================================================

RAW SUBMITTED BLOG POST CONTENT:
---
${formattedContentForPrompt}
---`;

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const geminiPayload = {
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: JSON_SCHEMA,
        temperature: 0.1
      }
    };

    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      let errJson;
      try { errJson = JSON.parse(errText); } catch(e) {}
      const errMsg = errJson?.error?.message || errText || `Gemini API returned HTTP ${response.status}`;
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Gemini API Error',
          message: errMsg
        }),
        {
          status: response.status >= 500 ? 502 : response.status,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    const geminiData = await response.json();
    const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Empty Response',
          message: 'Received empty response from Gemini API.'
        }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(candidateText);
    } catch (parseErr) {
      const cleaned = candidateText.replace(/```json\n?|\n?```/g, '').trim();
      parsedResult = JSON.parse(cleaned);
    }

    // Synchronize computed metrics
    if (parsedResult.metrics) {
      parsedResult.metrics.wordCount = words;
      parsedResult.metrics.estimatedReadingTimeMinutes = readTimeMin;
      parsedResult.metrics.titleLength = titleLength;
      parsedResult.metrics.readingLevel = hemingway.label;
      parsedResult.metrics.internalLinksCount = linkAnalysis.internalLinksCount;
      parsedResult.metrics.externalLinksCount = linkAnalysis.externalLinksCount;

      if (parsedResult.metrics.primaryKeyword) {
        const combinedSearchSpace = `${finalTitle} ${finalMeta} ${trimmedContent}`;
        parsedResult.metrics.primaryKeywordCount = countKeywordOccurrences(
          combinedSearchSpace,
          parsedResult.metrics.primaryKeyword
        );
      }
    }

    // Synchronize checklist items with real metrics
    if (parsedResult.checklist) {
      // Remove CONTENT-01 (Word Count) and LINK-03 (External Links) from checklist if present
      parsedResult.checklist = parsedResult.checklist.filter(c => 
        c.ruleId !== 'CONTENT-01' && c.ruleId !== 'LINK-03' && c.ruleId !== 'LINKS-03'
      );

      const tone04 = parsedResult.checklist.find(c => c.ruleId === 'TONE-04');
      if (tone04) {
        tone04.status = hemingway.meetsRequirement ? 'Pass' : 'Fail';
        tone04.notes = `Calculated readability level: ${hemingway.label} (Automated Readability Index: ${hemingway.rawScore}, Target: <= Grade 7).`;
      }

      // [LINK-01] Internal Links (At least 1 required, no upper limit)
      const link01 = parsedResult.checklist.find(c => c.ruleId === 'LINK-01' || c.ruleId === 'LINKS-01');
      if (link01) {
        if (linkAnalysis.internalLinksCount >= 1) {
          link01.status = 'Pass';
          link01.notes = `Found ${linkAnalysis.internalLinksCount} internal link(s) in article: ${linkAnalysis.internalLinks.map(l => l.text).join(', ')} (meets requirement).`;
        } else {
          link01.status = 'Fail';
          link01.notes = 'No internal links detected in the article. Please add at least 1 relevant internal link.';
        }
      }

      // [LINK-02] Skip Internal Links in H1 & Introduction (Before 1st H2)
      const link02 = parsedResult.checklist.find(c => c.ruleId === 'LINK-02' || c.ruleId === 'LINKS-02');
      if (link02) {
        if (linkAnalysis.linksInFirstFoldCount === 0) {
          link02.status = 'Pass';
          link02.notes = 'No internal links placed in H1 or opening introductory paragraph. All internal links are located from H2 onwards.';
        } else {
          link02.status = 'Warning';
          link02.notes = `Found ${linkAnalysis.linksInFirstFoldCount} internal link(s) in H1 or opening introduction before the first H2 heading. Recommend moving links to H2 sections onwards.`;
        }
      }

      // [LINK-04] Clean URLs
      const link04 = parsedResult.checklist.find(c => c.ruleId === 'LINK-04' || c.ruleId === 'LINKS-04');
      if (link04) {
        if (linkAnalysis.isAllClean) {
          link04.status = 'Pass';
          link04.notes = linkAnalysis.totalLinks === 0 
            ? 'No URLs with tracking parameters detected.' 
            : `All ${linkAnalysis.totalLinks} detected URLs are verified clean (zero UTM, AI, or advertising tracking parameters).`;
        } else {
          link04.status = 'Fail';
          link04.notes = `Detected tracking parameters in ${linkAnalysis.uncleanLinks.length} URL(s): ${linkAnalysis.uncleanLinks.map(l => l.url).join(', ')}`;
        }
      }

      // [STRUCT-03] No -ing Verbs in Headings
      const struct03 = parsedResult.checklist.find(c => c.ruleId === 'STRUCT-03');
      if (struct03) {
        if (headingAnalysis.allCompliant) {
          struct03.status = 'Pass';
          struct03.notes = headingAnalysis.allHeadings.length === 0 
            ? 'No headings found to evaluate.' 
            : `All ${headingAnalysis.allHeadings.length} heading(s) use direct root verbs or clean nouns (zero unnecessary -ing action verbs detected).`;
        } else {
          struct03.status = 'Fail';
          struct03.notes = `Found ${headingAnalysis.violatingHeadings.length} heading(s) with -ing verbs: ${headingAnalysis.violatingHeadings.map(h => `"${h.text}" (uses "${h.ingWords.join(', ')}")`).join(', ')}. Please use root verb forms (e.g. "Build" instead of "Building").`;
        }
      }

      // [STRUCT-04] Short Paragraphs (Max 4 Statements Delimited by . ! ?)
      const struct04 = parsedResult.checklist.find(c => c.ruleId === 'STRUCT-04');
      if (struct04) {
        if (paraAnalysis.allCompliant) {
          struct04.status = 'Pass';
          struct04.notes = paraAnalysis.totalParagraphs === 0 
            ? 'No paragraphs found to evaluate.' 
            : `All ${paraAnalysis.totalParagraphs} paragraph(s) strictly comply with the 4-statement maximum (highest count: ${paraAnalysis.maxStatements} statement(s) delimited by '.', '!', or '?'). Zero word count restrictions applied.`;
        } else {
          struct04.status = 'Fail';
          struct04.notes = `Found ${paraAnalysis.violatingParagraphs.length} paragraph(s) exceeding 4 statements: ${paraAnalysis.violatingParagraphs.map(p => `Paragraph #${p.index} (${p.statementCount} statements)`).join(', ')}.`;
        }
      }
    }

    // Filter out removed or false violations
    if (parsedResult.violations) {
      // Strip any CONTENT-01 (Word Count) or LINK-03 (External Links) violations completely
      parsedResult.violations = parsedResult.violations.filter(v => 
        v.ruleId !== 'CONTENT-01' && 
        v.ruleId !== 'LINK-03' && 
        v.ruleId !== 'LINKS-03' && 
        !v.issue.toLowerCase().includes('word count') &&
        !v.issue.toLowerCase().includes('minimum 1200') &&
        !v.issue.toLowerCase().includes('external link')
      );

      if (linkAnalysis.internalLinksCount >= 1) {
        parsedResult.violations = parsedResult.violations.filter(v => 
          v.ruleId !== 'LINK-01' && v.ruleId !== 'LINKS-01'
        );
      }
      if (linkAnalysis.isAllClean) {
        parsedResult.violations = parsedResult.violations.filter(v => 
          v.ruleId !== 'LINK-04' && v.ruleId !== 'LINKS-04'
        );
      }
      if (linkAnalysis.linksInFirstFoldCount === 0) {
        parsedResult.violations = parsedResult.violations.filter(v => 
          v.ruleId !== 'LINK-02' && 
          v.ruleId !== 'LINKS-02' &&
          !v.issue.toLowerCase().includes('first fold') &&
          !v.issue.toLowerCase().includes('150-200 words') &&
          !v.issue.toLowerCase().includes('150 to 200 words')
        );
      }
      // Filter out false STRUCT-04 violations
      parsedResult.violations = parsedResult.violations.filter(v => {
        if (v.ruleId === 'STRUCT-04' || v.issue.toLowerCase().includes('paragraph exceeds') || v.issue.toLowerCase().includes('4 statements') || v.issue.toLowerCase().includes('4 sentences') || v.issue.toLowerCase().includes('4 lines')) {
          if (paraAnalysis.allCompliant) return false;
          const excerptAnalysis = analyzeParagraphStatements(v.originalExcerpt || '');
          return !excerptAnalysis.allCompliant;
        }
        return true;
      });

      // Filter out false STRUCT-03 violations
      parsedResult.violations = parsedResult.violations.filter(v => {
        if (v.ruleId === 'STRUCT-03' || v.issue.toLowerCase().includes('-ing') || v.issue.toLowerCase().includes('ing verb')) {
          if (headingAnalysis.allCompliant) return false;
          const excerptWords = (v.originalExcerpt || '').replace(/[^\w\s-]/g, ' ').split(/\s+/).filter(Boolean);
          const hasRealIngVerb = excerptWords.some(w => {
            const lower = w.toLowerCase();
            return lower.endsWith('ing') && lower.length > 4 && !ALLOWED_ING_WORDS.has(lower);
          });
          return hasRealIngVerb;
        }
        return true;
      });
    }

    // Deterministic compliance score adjustment
    if (parsedResult.checklist && parsedResult.checklist.length > 0) {
      const total = parsedResult.checklist.length;
      const passCount = parsedResult.checklist.filter(c => c.status === 'Pass').length;
      const warningCount = parsedResult.checklist.filter(c => c.status === 'Warning').length;
      const failCount = parsedResult.checklist.filter(c => c.status === 'Fail').length;
      
      const deterministicScore = Math.round(((passCount * 1.0) + (warningCount * 0.6)) / total * 100);
      parsedResult.complianceScore = Math.max(deterministicScore, parsedResult.complianceScore || 0);

      if (failCount === 0 && warningCount <= 3 && parsedResult.complianceScore >= 85) {
        parsedResult.overallStatus = 'Pass';
      } else if (failCount > 0 || parsedResult.complianceScore < 85) {
        parsedResult.overallStatus = 'Needs Revision';
      }
    }

    const finalReport = {
      ...parsedResult,
      meta: {
        analyzedAt: new Date().toISOString(),
        modelUsed: modelName,
        contentLength: chars,
        wordCountCalculated: words,
        hemingwayGradeCalculated: hemingway.rawScore,
        internalLinksFound: linkAnalysis.internalLinksCount,
        externalLinksFound: linkAnalysis.externalLinksCount,
        titleProvided: finalTitle,
        metaDescriptionProvided: finalMeta
      }
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: finalReport
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Review Analysis Failed',
        message: err.message || 'Internal Server Error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
