/**
 * Sample Blog Post Presets for Quick Testing Against Custom Guidelines
 */

const SAMPLE_PRESETS = [
  {
    id: 'compliant-tech-guide',
    name: '1. SEO & Guideline Compliant Post',
    badge: 'PASS (Expected ~95)',
    badgeType: 'pass',
    description: 'Title under 58 chars, primary keyword "REST API design", no -ing verbs in headings, short paragraphs, clean URLs, natural tone.',
    content: `# REST API Design: 5 Rules for Modern Services

Meta Description: Master REST API design with 5 practical rules for scalable systems, clean endpoints, and reliable error responses.

Good REST API design helps software teams build faster and maintain systems with less effort. When your team scales microservices, consistent API contracts prevent costly downtime and make onboarding new engineers straightforward.

In this guide, you will learn the five most effective design patterns for modern HTTP APIs, including endpoint naming, error schemas, idempotency keys, cursor pagination, and rate limit headers.

## 1. Use Plural Nouns for Resource Endpoints

Choose clear, plural nouns to represent collections and single items. Do not put verbs in your URI endpoints because HTTP verbs already specify the action.

- Preferred: \`GET /api/v1/users\` or \`POST /api/v1/orders\`
- Avoid: \`GET /api/v1/getUsers\` or \`POST /api/v1/createNewOrder\`

This naming convention keeps route structures predictable across large enterprise services. If you need more background, check our [API architecture fundamentals guide](https://example.com/blog/api-architecture-fundamentals).

## 2. Return Explicit Error Envelopes

Always return explicit HTTP status codes that match the result. Pair non-2xx responses with a structured JSON error envelope containing a clear machine-readable code and a helpful human message.

For example, when a user is not found, return status code 404 with this payload:

\`\`\`json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "The user with ID 482 could not be found."
  }
}
\`\`\`

## 3. Implement Idempotency Keys for Mutations

For payment processing and order creation, support client-provided idempotency keys in request headers. If a network timeout happens, the client can retry the request safely without double charging the customer.

## 4. Choose Cursor Pagination Over Offset Queries

Offset pagination creates database performance issues on large tables and returns duplicate items when new rows arrive. Cursor pagination uses indexed timestamps or record IDs to deliver fast O(1) query speeds.

To learn more about database indexing strategies, read our [database query optimization tutorial](https://example.com/blog/database-query-optimization).

## 5. Add Standard Rate Limit Headers

Protect downstream services by setting rate limits per API key or IP address. Always return standard response headers such as \`X-RateLimit-Limit\`, \`X-RateLimit-Remaining\`, and \`Retry-After\` so client applications can handle backoff gracefully.

## Summary & Action Steps

Applying solid REST API design principles keeps your services fast, dependable, and easy for developers to use. Start by auditing your current OpenAPI specifications against these five rules.

For more implementation templates, explore our [developer tooling resource hub](https://example.com/resources/developer-tools) or download our free REST checklist.`
  },
  {
    id: 'violating-crypto-promo',
    name: '2. Post with Violations (-ing verbs, UTM links, AI fluff)',
    badge: 'NEEDS REVISION',
    badgeType: 'fail',
    description: 'Has long title > 58 chars, -ing verbs in headings, AI buzzwords (tapestry, delve), UTM tracking parameters, long paragraphs.',
    content: `# The Complete Definitive Ultimate Guide to Mastering Cryptocurrency Trading in 2026

In today's fast-paced, ever-evolving digital tapestry of modern finance, it is truly essential to delve deeply into the myriad facets of blockchain technology. Needless to say, cryptocurrency represents a groundbreaking paradigm shift that serves as a testament to human ingenuity and algorithmic excellence.

Furthermore, it is important to note that many traders often struggle due to the fact that they lack a holistic framework. In order to truly comprehend the intricate nuances of decentralized finance, one must embark upon a transformative journey through market liquidity.

## Optimizing Your High-Frequency Trading Bot for Profits

Building and maintaining automated trading systems requires careful observation of market order books. When you are analyzing token swaps across decentralized exchanges, you will observe that slippage can impact returns significantly over time.

For more information, click this link: [https://example.com/crypto-bot?utm_source=chatgpt&utm_campaign=promo](https://example.com/crypto-bot?utm_source=chatgpt&utm_campaign=promo) to sign up immediately!

## Creating Wealth Through Algorithmic Crypto Loops

Many investors believe that trading is difficult. However, our unique strategy is guaranteed to provide effortless returns without any complex setup or market risk. Simply deploy the script and watch your portfolio multiply exponentially every single week without fail.`
  },
  {
    id: 'poor-formatting-tone',
    name: '3. Rough Draft (Wall Paragraphs, Vague Headings, Passive Voice)',
    badge: 'NEEDS REVISION',
    badgeType: 'warning',
    description: 'Generic heading ("Section 1"), wall of text, passive voice, missing search intent satisfaction.',
    content: `# Productivity Tips

in order to understand productivity in the modern corporate workplace environment it is important to note that many things are being done in a totally wrong way by managers. at the end of the day, employees are being overwhelmed by unnecessary meetings and useless communication apps. A study was conducted somewhere recently which proved that 99% of all corporate workers are wasting half their day on silly tasks. It was observed that when time tracking software is implemented by executives, employee morale is completely destroyed by it and work is not completed in a timely manner. needless to say, people should just stop having meetings and do better stuff instead.

## Section 1: Overview

There are lots of cool things you can do to be more productive like turning off notifications and doing deep work or whatever. That is pretty much all there is to say about workplace efficiency.`
  }
];

module.exports = {
  SAMPLE_PRESETS
};
