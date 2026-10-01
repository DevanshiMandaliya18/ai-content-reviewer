/**
 * Cloudflare Pages Function: GET /api/rules
 */
const GUIDELINE_RULES = [
  // 1. SEO, Title & Meta
  { id: 'SEO-01', category: 'SEO, Title & Meta', name: 'Search Intent Identified & Satisfied Early (150-200 words)' },
  { id: 'SEO-02', category: 'SEO, Title & Meta', name: 'Title Under 58 Characters & Contains Primary Keyword' },
  { id: 'SEO-03', category: 'SEO, Title & Meta', name: 'Meta Description Under 155 Chars & Contains Keyword' },
  { id: 'SEO-04', category: 'SEO, Title & Meta', name: 'Primary Keyword Used Naturally (2-4 times)' },
  { id: 'SEO-05', category: 'SEO, Title & Meta', name: 'Comprehensive SEO & Intent Optimization' },

  // 2. Structure, Headings & Formatting
  { id: 'STRUCT-01', category: 'Structure & Formatting', name: 'Logical Heading Hierarchy (H2 -> H3)' },
  { id: 'STRUCT-02', category: 'Structure & Formatting', name: 'Clear & Non-Generic Headings' },
  { id: 'STRUCT-03', category: 'Structure & Formatting', name: 'No -ing Verbs in Headings (Use Simpler Forms)' },
  { id: 'STRUCT-04', category: 'Structure & Formatting', name: 'Short Paragraphs (2 to 4 Lines Max, Independent)' },
  { id: 'STRUCT-05', category: 'Structure & Formatting', name: 'Bullet Points & Tables Used Where Needed' },
  { id: 'STRUCT-06', category: 'Structure & Formatting', name: 'Logical Flow & Smooth Transitions' },
  { id: 'STRUCT-07', category: 'Structure & Formatting', name: 'Natural Structure (Avoid Templated Feel)' },

  // 3. Content Depth, Quality & Accuracy
  { id: 'CONTENT-02', category: 'Content Depth & Accuracy', name: 'Thorough Subtopic Coverage' },
  { id: 'CONTENT-03', category: 'Content Depth & Accuracy', name: 'Specific, Actionable & Example-Driven' },
  { id: 'CONTENT-04', category: 'Content Depth & Accuracy', name: 'No Fluff, Filler, or Vague Statements' },
  { id: 'CONTENT-05', category: 'Content Depth & Accuracy', name: 'No Redundancy or Repeated Ideas' },
  { id: 'CONTENT-06', category: 'Content Depth & Accuracy', name: 'Factual Accuracy & Grammar/Spelling' },

  // 4. Links & Clean URLs
  { id: 'LINK-01', category: 'Linking & Clean URLs', name: 'Internal Links Added (At Least 1 Relevant Page)' },
  { id: 'LINK-02', category: 'Linking & Clean URLs', name: 'Skip Internal Links in H1 & Introduction (Allowed from H2 Onwards)' },
  { id: 'LINK-04', category: 'Linking & Clean URLs', name: 'Clean URLs (No AI/Tracking UTM Parameters)' },

  // 5. Tone, Readability & Anti-AI
  { id: 'TONE-01', category: 'Tone & Anti-AI Quality', name: 'Anti-AI: Natural Human Writing (No Robotic Wording)' },
  { id: 'TONE-02', category: 'Tone & Anti-AI Quality', name: 'Avoid Generic Content with Useful Specifics' },
  { id: 'TONE-03', category: 'Tone & Anti-AI Quality', name: 'Tone is Expert Yet Accessible' },
  { id: 'TONE-04', category: 'Tone & Anti-AI Quality', name: 'Hemingway Readability (Grade 7 or Less)' },
  { id: 'TONE-05', category: 'Tone & Anti-AI Quality', name: 'Clear Intro & Value-Driven Conclusion with CTA' }
];

export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      rules: GUIDELINE_RULES,
      totalRules: GUIDELINE_RULES.length
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      }
    }
  );
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
