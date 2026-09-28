require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const reviewService = require('./src/reviewService');
const { GUIDELINE_RULES } = require('./src/systemPrompt');
const { SAMPLE_PRESETS } = require('./src/presets');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Health & Configuration Check
 */
app.get('/api/health', (req, res) => {
  const isKeySet = reviewService.isConfigured();
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    geminiConfigured: isKeySet,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    rulesCount: GUIDELINE_RULES.length
  });
});

/**
 * Get permanent hardcoded guidelines
 */
app.get('/api/rules', (req, res) => {
  res.json({
    rules: GUIDELINE_RULES,
    totalRules: GUIDELINE_RULES.length
  });
});

/**
 * Get sample blog post presets
 */
app.get('/api/presets', (req, res) => {
  res.json({
    presets: SAMPLE_PRESETS
  });
});

/**
 * Core Review Endpoint (Stateless)
 * POST /api/review
 * Body: { content: string, title?: string, metaDescription?: string }
 */
app.post('/api/review', async (req, res) => {
  try {
    const { content, title, metaDescription } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Request body must include a "content" string field.'
      });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({
        error: 'Empty Content',
        message: 'Please provide blog post text to analyze.'
      });
    }

    const reviewResult = await reviewService.reviewContent(content, title, metaDescription);
    return res.json({
      success: true,
      data: reviewResult
    });
  } catch (error) {
    console.error('Error in /api/review:', error.message);
    const statusCode = error.message.includes('GEMINI_API_KEY') ? 503 : 500;
    return res.status(statusCode).json({
      success: false,
      error: 'Review Analysis Failed',
      message: error.message
    });
  }
});

// Fallback route to serve index.html for single-page app
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Content Review Server running on http://localhost:${PORT}`);
  console.log(`⚡ Model: ${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}`);
  console.log(`🔑 Gemini Key Configured: ${reviewService.isConfigured() ? 'YES ✅' : 'NO ⚠️ (Please set GEMINI_API_KEY in .env)'}`);
  console.log(`====================================================`);
});
