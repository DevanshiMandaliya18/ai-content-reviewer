# AI Content Review Web Application

A lightweight, stateless content review and compliance auditing platform powered by **Google Gemini API** via the official `@google/genai` SDK.

---

## 🌟 Key Architecture & Highlights

- **100% Stateless**: No database or session storage required. All reviews are computed on-the-fly and returned directly as structured data.
- **Hardcoded Editorial Rulebook**: Content guidelines and compliance policies are strictly embedded as a backend System Prompt across 5 core pillars.
- **Official Google Gen AI SDK**: Uses `@google/genai` (v2.x) with strict JSON Schema constraints (`responseMimeType: 'application/json'`).
- **Modern Dashboard UI**: 2-column layout with live text metrics, animated loading scanner, SVG circular score gauge, color-coded pass/fail badges, and side-by-side excerpt diffs.
- **Multi-Format Exporting**: Client-side 1-click report downloads in **Markdown (`.md`)**, **Plain Text (`.txt`)**, **Structured JSON (`.json`)**, and **Print-Ready PDF format**.

---

## 🏛️ Permanent Custom Guidelines Enforced

1. **SEO, Title & Meta Data**
   - Search intent clearly identified & satisfied in the first 150 to 200 words.
   - Title strictly under 58 characters and contains primary keyword.
   - Meta description under 155 characters and contains primary keyword.
   - Primary keyword used naturally 2 to 4 times (avoid keyword stuffing).
   - SEO optimized for target search queries.

2. **Structure, Headings & Formatting**
   - Headings follow logical hierarchy (H2 → H3).
   - Headings are clear and specific (no vague titles like "Overview" or "Details").
   - No -ing verbs in headings if simpler root forms exist (e.g., "Build APIs" vs "Building APIs").
   - Short paragraphs (maximum 4 statements/sentences per paragraph delimited by . ! ?; no paragraph word count limit; visual line wrap ignored).
   - Scannable bullet points, numbered lists, and tables used where needed.
   - Content flows logically from top to bottom with smooth transitions.
   - Natural content structure (avoid rigid or templated formats).

3. **Content Depth, Quality & Accuracy**
   - Thorough coverage of all expected subtopics.
   - Specific, actionable claims supported by concrete examples, data, or frameworks.
   - Zero fluff, filler phrases, or vague statements.
   - No redundancy or repeated ideas.
   - Factual accuracy checked; flawless grammar and spelling.

4. **Linking & Clean URLs**
   - Internal links added (at least 1 relevant internal link required; no upper limit).
   - Skip adding internal links in the H1 title and opening introduction paragraph(s) (allowed everywhere from H2 onwards).
   - Clean URLs without tracking parameters (e.g. `utm_source=gemini`, `utm_source=chatgpt`, `utm_source=claude`).

5. **Tone, Readability & Anti-AI Quality**
   - Anti-AI: Keep writing natural and human, avoiding robotic, repetitive, or fancy wording.
   - Non-generic content with useful, verified details.
   - Expert yet accessible tone.
   - Hemingway readability score is Grade 7 or less.
   - Clear introduction and value-driven conclusion with CTA.

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- A Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### 2. Configure Environment
Open the `.env` file in the project root and add your API key:
```env
GEMINI_API_KEY=AIzaSy...your_gemini_api_key_here
PORT=3000
GEMINI_MODEL=gemini-2.5-flash
```

### 3. Start the Server
```bash
npm start
```
Or run in live development watch mode:
```bash
npm run dev
```

### 4. Open the Web Application
Navigate to `http://localhost:3000` in your web browser.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Verifies server and Gemini API key readiness |
| `GET` | `/api/rules` | Returns the 16 codified editorial guideline rules |
| `GET` | `/api/presets` | Returns pre-built sample posts for testing |
| `POST` | `/api/review` | Statelessly reviews a blog post and returns a structured JSON audit |

### Sample POST `/api/review` Request Body:
```json
{
  "content": "# Modern REST API Design..."
}
```

### Structured Response Schema:
```json
{
  "overallStatus": "Pass",
  "complianceScore": 95,
  "summary": "Executive review summary...",
  "metrics": {
    "wordCount": 350,
    "estimatedReadingTimeMinutes": 2,
    "detectedTone": "Professional",
    "readingLevel": "Grade 9-10",
    "primaryAudience": "Software Engineers"
  },
  "checklist": [
    {
      "ruleId": "TONE-01",
      "category": "Tone & Voice",
      "ruleName": "Professional & Empathetic Authority",
      "status": "Pass",
      "notes": "Tone is objective and technical."
    }
  ],
  "violations": [],
  "strengths": ["Clear structure", "Practical code examples"],
  "actionPlan": ["Proceed with publication"]
}
```

---

## 📁 Project Structure

```text
d:/AI_content_review/
├── .env                  # API Key & Configuration
├── .env.example          # Environment template
├── package.json          # Dependencies & npm scripts
├── server.js             # Express backend server
├── src/
│   ├── systemPrompt.js   # Hardcoded rules & strict System Prompt
│   ├── reviewSchema.js   # Official @google/genai structured output schema
│   ├── reviewService.js  # Gemini API service client
│   └── presets.js        # Server-side presets
└── public/
    ├── index.html        # Clean modern dashboard UI
    ├── css/
    │   └── styles.css    # Responsive design system
    └── js/
        ├── app.js        # Dashboard state & controller
        ├── exporter.js   # Markdown, TXT & JSON file generation
        └── presets.js    # Client presets
```
