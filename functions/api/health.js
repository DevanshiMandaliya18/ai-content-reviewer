/**
 * Cloudflare Pages Function: GET /api/health
 */
export async function onRequestGet(context) {
  const apiKey = context.env.GEMINI_API_KEY || '';
  const isKeyConfigured = Boolean(apiKey && apiKey !== 'your_gemini_api_key_here');
  const model = context.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const data = {
    status: 'online',
    timestamp: new Date().toISOString(),
    geminiConfigured: isKeyConfigured,
    model: model,
    rulesCount: 26
  };

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
