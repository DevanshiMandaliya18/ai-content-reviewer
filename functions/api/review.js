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
- [STRUCT-03] No -ing Verbs in Headings: Do not use -ing verbs in headings if a simpler, direct root form exists (e.g., use "Build High-Performance APIs" instead of "Building High-Performance APIs", "Optimize Your Database" instead of "Optimizing Your Database").
- [STRUCT-04] Short Paragraphs (2 to 4 Lines Max): Paragraphs must be concise (2 to 4 lines/sentences maximum) to prevent visual fatigue.
- [STRUCT-05] Bullet Points & Tables Used Where Needed: Lists, bullet points, or comparison tables must be used for multi-item concepts, steps, or structured data.
- [STRUCT-06] Logical Flow & Smooth Section Transitions: Content must flow logically from top to bottom with seamless, natural transitions between sections.
- [STRUCT-07] Natural Structure (Avoid Templated Feel): Structure must feel organic and tailored to the topic, avoiding repetitive or cookie-cutter templates.

================================================================================
3. CONTENT DEPTH, QUALITY & ACCURACY:
- [CONTENT-01] Minimum Word Count (1200+ Words): The article must meet a minimum length of 1200 words total for comprehensive topic depth.
- [CONTENT-02] Thorough Subtopic Coverage: The article must cover all expected subtopics and search nuances thoroughly.
- [CONTENT-03] Specific, Actionable & Example-Driven: Every claim must be backed by concrete examples, verifiable data, or practical frameworks.
- [CONTENT-04] No Fluff, Filler, or Vague Statements: Strictly eliminate empty filler, fluff phrases ("needless to say", "in today's fast-paced world", "it is important to note"), and vague assertions.
- [CONTENT-05] No Redundancy or Repeated Ideas: Zero circular logic, repeated points, or rephrased restatements across sections.
- [CONTENT-06] Factual Accuracy & Grammar/Spelling: Flawless grammar, correct spelling, accurate technical terminology, and verified claims.

================================================================================
4. INTERNAL / EXTERNAL LINKS & CLEAN URLS:
- [LINK-01] Internal Links Added to 2 to 4 Relevant Pages: Content should include 2 to 4 internal links to relevant contextual pages.
- [LINK-02] Skip Internal Links in the 1st Fold: Do not place internal links in the opening 1st fold / introductory 150-200 words to keep reader focus on core intent.
- [LINK-03] External Reference Links: Include relevant, authoritative external reference links where empirical data or citations are mentioned.
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
  * "Pass": Compliance Score >= 85 AND zero critical violations.
  * "Needs Revision": Compliance Score < 85 OR serious infractions.

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
          description: 'Total word count of the analyzed text (Minimum required: 1200)'
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
            description: 'Rule code (e.g., SEO-01, STRUCT-01, CONTENT-01, LINK-01, TONE-01)'
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

function analyzeLinks(content) {
  if (!content || typeof content !== 'string') {
    return { totalLinks: 0, internalLinksCount: 0, externalLinksCount: 0, internalLinks: [], externalLinks: [], linksInFirstFoldCount: 0 };
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

function countKeywordOccurrences(text, keyword) {
  if (!text || !keyword || typeof keyword !== 'string' || keyword.trim().length === 0) return 0;
  const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
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
    const linkAnalysis = analyzeLinks(trimmedContent);

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

      const tone04 = parsedResult.checklist.find(c => c.ruleId === 'TONE-04');
      if (tone04) {
        tone04.status = hemingway.meetsRequirement ? 'Pass' : 'Fail';
        tone04.notes = `Calculated readability level: ${hemingway.label} (Automated Readability Index: ${hemingway.rawScore}, Target: <= Grade 7).`;
      }

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

    if (words >= 1200 && parsedResult.violations) {
      parsedResult.violations = parsedResult.violations.filter(v => 
        v.ruleId !== 'CONTENT-01' && !v.issue.toLowerCase().includes('word count')
      );
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
