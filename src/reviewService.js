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
 * Helper: Extract links and categorize internal vs external from raw markdown/HTML
 */
function analyzeLinks(content) {
  if (!content || typeof content !== 'string') {
    return { totalLinks: 0, internalLinksCount: 0, externalLinksCount: 0, internalLinks: [], externalLinks: [] };
  }

  const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const htmlLinkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;

  const allLinks = [];
  let match;

  while ((match = mdLinkRegex.exec(content)) !== null) {
    allLinks.push({ text: match[1].trim(), url: match[2].trim() });
  }

  while ((match = htmlLinkRegex.exec(content)) !== null) {
    allLinks.push({ text: match[2].replace(/<[^>]*>/g, '').trim(), url: match[1].trim() });
  }

  const internalLinks = [];
  const externalLinks = [];

  for (const link of allLinks) {
    const url = link.url.toLowerCase();
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('www.')) {
      externalLinks.push(link);
    } else {
      internalLinks.push(link);
    }
  }

  const words = content.trim().split(/\s+/).filter(Boolean);
  const firstFoldText = words.slice(0, 180).join(' ');
  const linksInFirstFold = allLinks.filter(l => firstFoldText.includes(l.url) || firstFoldText.includes(l.text));

  return {
    totalLinks: allLinks.length,
    internalLinksCount: internalLinks.length,
    externalLinksCount: externalLinks.length,
    internalLinks,
    externalLinks,
    linksInFirstFoldCount: linksInFirstFold.length
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
    const linkAnalysis = analyzeLinks(trimmedContent);

    try {
      const userPrompt = `Please review the following blog post thoroughly according to the strict editorial, SEO, and compliance guidelines.

================================================================================
VERIFIED SYSTEM-COMPUTED METRICS (REAL LIVE DATA EXTRACTED FROM POST):
- Exact Total Word Count: ${words} words (${words >= 1200 ? 'MEETS the 1200-word minimum. Rule [CONTENT-01] is a PASS.' : `DOES NOT meet 1200-word minimum (${words}/1200). Rule [CONTENT-01] is a FAIL.`})
- Explicit Title Provided: "${finalTitle}" (Length: ${titleLength} characters. ${titleLength > 0 && titleLength <= 58 ? 'Under 58 chars: PASS for length.' : titleLength === 0 ? 'No title provided: FAIL.' : `Over 58 chars (${titleLength}/58): FAIL.`})
- Explicit Meta Description Provided: "${finalMeta}" (Length: ${metaLength} characters. ${metaLength > 0 && metaLength <= 155 ? 'Under 155 chars: PASS for length.' : metaLength === 0 ? 'No meta description: FAIL.' : `Over 155 chars (${metaLength}/155): FAIL.`})
- Exact Live Hemingway Readability Score: ${hemingway.label} (Score: ${hemingway.rawScore}. ${hemingway.meetsRequirement ? 'Passes rule [TONE-04] (<= Grade 7).' : 'Fails rule [TONE-04] (exceeds Grade 7).'})
- Actual Extracted Internal Links Count: ${linkAnalysis.internalLinksCount} internal links (${linkAnalysis.internalLinksCount >= 2 && linkAnalysis.internalLinksCount <= 4 ? 'Passes rule [LINKS-01] (2-4 internal links).' : `Fails rule [LINKS-01] (Expected 2-4, found ${linkAnalysis.internalLinksCount}).`})
- Actual Extracted External Links Count: ${linkAnalysis.externalLinksCount} external links (${linkAnalysis.externalLinksCount > 0 ? 'Passes rule [LINKS-03].' : 'Fails rule [LINKS-03] (No external reference links found).'})
- Links in Opening 1st Fold (First ~180 words): ${linkAnalysis.linksInFirstFoldCount} (${linkAnalysis.linksInFirstFoldCount === 0 ? 'Passes rule [LINKS-02].' : 'Fails rule [LINKS-02] (Do not place internal links in 1st fold).'})
- Estimated Reading Time: ~${readTimeMin} minutes
================================================================================

RAW SUBMITTED BLOG POST CONTENT:
---
${trimmedContent}
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
        // [CONTENT-01] Minimum Word Count
        const content01 = parsedResult.checklist.find(c => c.ruleId === 'CONTENT-01');
        if (content01) {
          if (words >= 1200) {
            content01.status = 'Pass';
            content01.notes = `Verified exact word count is ${words} words (exceeds 1200-word requirement).`;
          } else {
            content01.status = 'Fail';
            content01.notes = `Current word count is ${words} words (minimum required is 1200 words).`;
          }
        }

        // [TONE-04] Hemingway Readability Score
        const tone04 = parsedResult.checklist.find(c => c.ruleId === 'TONE-04');
        if (tone04) {
          tone04.status = hemingway.meetsRequirement ? 'Pass' : 'Fail';
          tone04.notes = `Calculated readability level: ${hemingway.label} (Automated Readability Index: ${hemingway.rawScore}, Target: <= Grade 7).`;
        }

        // [LINKS-01] Internal Links (2 to 4)
        const links01 = parsedResult.checklist.find(c => c.ruleId === 'LINKS-01');
        if (links01) {
          if (linkAnalysis.internalLinksCount >= 2 && linkAnalysis.internalLinksCount <= 4) {
            links01.status = 'Pass';
            links01.notes = `Found ${linkAnalysis.internalLinksCount} internal links in article body (meets 2-4 requirement).`;
          } else if (linkAnalysis.internalLinksCount === 0) {
            links01.status = 'Fail';
            links01.notes = 'No internal links detected in the article. Please add 2 to 4 relevant internal links.';
          } else {
            links01.status = 'Warning';
            links01.notes = `Found ${linkAnalysis.internalLinksCount} internal links. Recommendation is 2 to 4 relevant internal links.`;
          }
        }
      }

      // Filter out erroneous word count violation if word count meets standard
      if (words >= 1200 && parsedResult.violations) {
        parsedResult.violations = parsedResult.violations.filter(v => 
          v.ruleId !== 'CONTENT-01' && !v.issue.toLowerCase().includes('word count')
        );
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
