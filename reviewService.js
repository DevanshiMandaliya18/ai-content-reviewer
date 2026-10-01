const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const { SYSTEM_PROMPT } = require('./systemPrompt');
const { reviewResponseSchema } = require('./reviewSchema');

/**
 * Helper: Exact, robust plain text extraction from HTML or Markdown
 */
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

/**
 * Helper: Standard word count calculation shared across frontend and backend
 */
function countWords(content) {
  const plain = extractPlainText(content);
  return plain ? plain.split(/\s+/).filter(Boolean).length : 0;
}

/**
 * Helper: Calculate deterministic Hemingway readability grade using Hemingway App's exact Automated Readability Index (ARI) formula
 */
function calculateHemingwayGrade(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return { grade: 0, label: 'N/A', meetsRequirement: true };
  }

  // 1. Convert block tags and line breaks to newlines so headings, paragraphs, and list items have distinct sentence boundaries
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

  // 2. Protect decimals, version numbers (e.g. 2.4.7), and abbreviations (e.g., i.e., vs., Dr.) from triggering false sentence splits
  formatted = formatted.replace(/\b([0-9]+)\.([0-9]+)\b/g, '$1_$2');
  formatted = formatted.replace(/\b(e\.g\.|i\.e\.|vs\.|mr\.|mrs\.|dr\.|inc\.|ltd\.|etc\.)/gi, (m) => m.replace(/\./g, '_'));

  // 3. Divide content into structural blocks (paragraphs, list items, headings)
  const blocks = formatted.split(/\r?\n+/).map(b => b.trim()).filter(Boolean);
  
  // 4. Tokenize sentences within each block
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

  // 5. Calculate words and alphanumeric letters
  const cleanPlainText = formatted.replace(/_/g, '.').trim();
  const words = cleanPlainText.split(/\s+/).filter(Boolean);
  const letters = (cleanPlainText.match(/[a-zA-Z0-9]/g) || []).length;

  if (words.length === 0) {
    return { grade: 1, label: 'Grade 1', meetsRequirement: true };
  }

  const wordCount = Math.max(1, words.length);
  const sentenceCount = Math.max(1, allSentences.length);

  // 6. Exact Hemingway Editor Automated Readability Index (ARI) Formula:
  // ARI = 4.71 * (letters / words) + 0.5 * (words / sentences) - 21.43
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

/**
 * Helper: Extract domain from URL
 */
function extractDomain(url) {
  try {
    const cleaned = url.replace(/^[a-z]+:\/\//i, '').replace(/^www\./i, '');
    const slashIdx = cleaned.indexOf('/');
    return (slashIdx !== -1 ? cleaned.substring(0, slashIdx) : cleaned).toLowerCase();
  } catch (e) {
    return '';
  }
}

/**
 * Helper: Extract links and categorize internal vs external from raw markdown/HTML
 */
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

  // First fold check: Look for internal links inside the Introduction section (before first H2 heading)
  let introContent = '';
  const h2Match = content.match(/<h2\b[^>]*>|(?:\r?\n|^)##\s+/i);
  if (h2Match && typeof h2Match.index === 'number') {
    introContent = content.slice(0, h2Match.index);
  } else {
    // Fallback if no H2 heading exists: first paragraph or first ~150 words
    const plainText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = plainText.split(/\s+/).filter(Boolean);
    introContent = words.slice(0, 150).join(' ');
  }

  const introLower = introContent.toLowerCase();
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

/**
 * Helper: Count exact keyword occurrences in text (case-insensitive)
 */
function countKeywordOccurrences(text, keyword) {
  if (!text || !keyword || typeof keyword !== 'string' || keyword.trim().length === 0) return 0;
  const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Service to execute content reviews using Google Gen AI SDK
 */
class ReviewService {
  constructor() {
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.ai = null;
  }

  /**
   * Reload API Key dynamically from environment or .env file
   */
  getApiKey() {
    let key = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
    if (!key || key === 'your_gemini_api_key_here') {
      try {
        const envPath = path.join(__dirname, '..', '.env');
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf8');
          const match = envContent.match(/^GEMINI_API_KEY=(.+)$/m);
          if (match && match[1]) {
            key = match[1].trim();
            process.env.GEMINI_API_KEY = key;
          }
        }
      } catch (e) {
        // ignore read error
      }
    }
    return (key && key !== 'your_gemini_api_key_here') ? key : '';
  }

  /**
   * Re-check or update API Key if dynamically set or modified in env
   */
  getClient() {
    const key = this.getApiKey();
    if (key) {
      this.ai = new GoogleGenAI({ apiKey: key });
      return this.ai;
    }
    return null;
  }

  /**
   * Check if client is properly configured with an active key
   */
  isConfigured() {
    return Boolean(this.getApiKey());
  }

  /**
   * Perform content review on blog text with dedicated title and meta description
   * @param {string} content - Main article content
   * @param {string} [title] - Dedicated article title
   * @param {string} [metaDescription] - Dedicated meta description
   * @returns {Promise<object>} Structured review report
   */
  async reviewContent(content, title = '', metaDescription = '') {
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('Please provide valid blog post content for analysis.');
    }

    const trimmedContent = content.trim();

    if (trimmedContent.length < 20) {
      throw new Error('Content is too short. Please provide at least a few sentences or a complete article draft to evaluate.');
    }

    const client = this.getClient();

    if (!client) {
      throw new Error(
        'GEMINI_API_KEY is not configured in .env file. Please add your Google Gemini API key to .env and restart the server.'
      );
    }

    // Extract title if not explicitly provided
    let finalTitle = (title || '').trim();
    if (!finalTitle) {
      const titleMatch = trimmedContent.match(/^#\s*(.+)$/m) || trimmedContent.match(/^Title:\s*(.+)$/mi) || trimmedContent.match(/^(.+)$/m);
      finalTitle = titleMatch ? titleMatch[1].trim() : '';
    }

    // Extract meta description if not explicitly provided
    let finalMeta = (metaDescription || '').trim();
    if (!finalMeta) {
      const metaMatch = trimmedContent.match(/Meta(?:\s*Description)?:\s*(.+)$/mi);
      finalMeta = metaMatch ? metaMatch[1].trim() : '';
    }

    // Deterministic metrics computed from actual text (stripping HTML tags if rich text editor HTML was sent)
    const plainText = extractPlainText(trimmedContent);
    const words = countWords(trimmedContent);
    const chars = plainText.length;
    const readTimeMin = Math.max(1, Math.ceil(words / 200));
    const titleLength = finalTitle.length;
    const metaLength = finalMeta.length;

    // Live Hemingway Readability and Link Data calculation
    const hemingway = calculateHemingwayGrade(trimmedContent);
    const linkAnalysis = analyzeLinks(trimmedContent, finalTitle);

    // Sanitize any massive embedded base64 images before sending to Gemini prompt to prevent token limit blowups
    const sanitizedContentForPrompt = trimmedContent
      .replace(/<img[^>]+src=["']data:image\/[^"']+["'][^>]*>/gi, '<img alt="[embedded image]"/>')
      .replace(/data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]{100,}/g, '[embedded image data]');

    // Format content with explicit double-newline paragraph separation for clean LLM parsing
    const formattedContentForPrompt = sanitizedContentForPrompt
      .replace(/<\/(?:p|div|h[1-6]|li|blockquote|section|article)>/gi, '</$1>\n\n')
      .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    try {
      const userPrompt = `Please review the following blog post thoroughly according to the strict editorial, SEO, and compliance guidelines.

================================================================================
VERIFIED SYSTEM-COMPUTED METRICS (REAL LIVE DATA EXTRACTED FROM POST):
- Total Word Count: ${words} words (Informational statistic, do not fail for word count)
- Explicit Title Provided: "${finalTitle}" (Length: ${titleLength} characters. ${titleLength > 0 && titleLength <= 58 ? 'Under 58 chars: PASS for length.' : titleLength === 0 ? 'No title provided: FAIL.' : `Over 58 chars (${titleLength}/58): FAIL.`})
- Explicit Meta Description Provided: "${finalMeta}" (Length: ${metaLength} characters. ${metaLength > 0 && metaLength <= 155 ? 'Under 155 chars: PASS for length.' : metaLength === 0 ? 'No meta description: FAIL.' : `Over 155 chars (${metaLength}/155): FAIL.`})
- Exact Live Hemingway Readability Score: ${hemingway.label} (Score: ${hemingway.rawScore}. ${hemingway.meetsRequirement ? 'Passes rule [TONE-04] (<= Grade 7).' : 'Fails rule [TONE-04] (exceeds Grade 7).'})
- Actual Extracted Internal Links Count: ${linkAnalysis.internalLinksCount} internal link(s) (${linkAnalysis.internalLinksCount >= 1 ? `Passes rule [LINK-01] (${linkAnalysis.internalLinksCount} internal link(s) found - meets at least 1 requirement).` : 'Fails rule [LINK-01] (0 internal links found. At least 1 internal link required).'})
- Internal Links in Introduction (Before 1st H2): ${linkAnalysis.linksInFirstFoldCount} (${linkAnalysis.linksInFirstFoldCount === 0 ? 'Passes rule [LINK-02] (No internal links in intro before 1st H2).' : `Fails rule [LINK-02] (Found ${linkAnalysis.linksInFirstFoldCount} internal link(s) in intro before 1st H2).`})
- URL Cleanliness Verification: ${linkAnalysis.isAllClean ? 'ALL URLs ARE 100% CLEAN (Zero UTM / AI tracking parameters). Rule [LINK-04] is a PASS.' : `Found ${linkAnalysis.uncleanLinks.length} URL(s) with tracking parameters: ${linkAnalysis.uncleanLinks.map(l => l.url).join(', ')}.`}
- List of Detected Internal Links: ${linkAnalysis.internalLinks.length > 0 ? linkAnalysis.internalLinks.map(l => `"${l.text}" (${l.url})`).join(', ') : 'None'}
- Estimated Reading Time: ~${readTimeMin} minutes
================================================================================

RAW SUBMITTED BLOG POST CONTENT:
---
${formattedContentForPrompt}
---`;

      const response = await client.models.generateContent({
        model: this.modelName,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: userPrompt
              }
            ]
          }
        ],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: reviewResponseSchema,
          temperature: 0.1
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Received an empty response from Gemini API.');
      }

      let parsedResult;
      try {
        parsedResult = JSON.parse(responseText);
      } catch (parseErr) {
        const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim();
        parsedResult = JSON.parse(cleaned);
      }

      // Synchronize exact live system-computed metrics into the report payload
      if (parsedResult.metrics) {
        parsedResult.metrics.wordCount = words;
        parsedResult.metrics.estimatedReadingTimeMinutes = readTimeMin;
        parsedResult.metrics.titleLength = titleLength;
        parsedResult.metrics.readingLevel = hemingway.label;
        parsedResult.metrics.internalLinksCount = linkAnalysis.internalLinksCount;
        parsedResult.metrics.externalLinksCount = linkAnalysis.externalLinksCount;

        // Synchronize real keyword count for identified primary keyword
        if (parsedResult.metrics.primaryKeyword) {
          const combinedSearchSpace = `${finalTitle} ${finalMeta} ${trimmedContent}`;
          parsedResult.metrics.primaryKeywordCount = countKeywordOccurrences(
            combinedSearchSpace,
            parsedResult.metrics.primaryKeyword
          );
        }
      }

      // Synchronize checklist items with real computed metrics
      if (parsedResult.checklist) {
        // Remove CONTENT-01 (Word Count) and LINK-03 (External Links) from checklist if present
        parsedResult.checklist = parsedResult.checklist.filter(c => 
          c.ruleId !== 'CONTENT-01' && c.ruleId !== 'LINK-03' && c.ruleId !== 'LINKS-03'
        );

        // [TONE-04] Hemingway Readability Score
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

        // [LINK-02] Skip Internal Links in Introduction (Before 1st H2)
        const link02 = parsedResult.checklist.find(c => c.ruleId === 'LINK-02' || c.ruleId === 'LINKS-02');
        if (link02) {
          if (linkAnalysis.linksInFirstFoldCount === 0) {
            link02.status = 'Pass';
            link02.notes = 'No internal links placed in the introductory section before the first H2 heading. Reader focus preserved.';
          } else {
            link02.status = 'Warning';
            link02.notes = `Found ${linkAnalysis.linksInFirstFoldCount} internal link(s) in the introduction before the 1st H2 heading. Recommend moving links to H2 sections onwards.`;
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
            v.ruleId !== 'LINK-02' && v.ruleId !== 'LINKS-02'
          );
        }
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

      // Add audit metadata
      return {
        ...parsedResult,
        meta: {
          analyzedAt: new Date().toISOString(),
          modelUsed: this.modelName,
          contentLength: chars,
          wordCountCalculated: words,
          hemingwayGradeCalculated: hemingway.rawScore,
          internalLinksFound: linkAnalysis.internalLinksCount,
          externalLinksFound: linkAnalysis.externalLinksCount,
          titleProvided: finalTitle,
          metaDescriptionProvided: finalMeta
        }
      };
    } catch (apiError) {
      console.error('Gemini API review error:', apiError);

      if (apiError.message && apiError.message.includes('API_KEY_INVALID')) {
        throw new Error('The configured GEMINI_API_KEY is invalid. Please verify your API key in the .env file.');
      } else if (apiError.status === 403 || (apiError.message && apiError.message.includes('permission'))) {
        throw new Error('Gemini API access denied. Please check your API permissions or billing setup in Google AI Studio.');
      } else if (apiError.status === 429 || (apiError.message && apiError.message.includes('RESOURCE_EXHAUSTED'))) {
        throw new Error('Gemini API rate limit exceeded. Please wait a moment before running another review.');
      }

      throw new Error(`Content review analysis failed: ${apiError.message || 'Unknown error'}`);
    }
  }
}

module.exports = new ReviewService();
