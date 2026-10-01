const { Type } = require('@google/genai');

/**
 * Structured Output Schema for Content Review
 * Using official @google/genai Type enums to enforce strict JSON contract.
 */
const reviewResponseSchema = {
  type: Type.OBJECT,
  properties: {
    overallStatus: {
      type: Type.STRING,
      description: 'Overall editorial decision: "Pass" or "Needs Revision"',
      enum: ['Pass', 'Needs Revision']
    },
    complianceScore: {
      type: Type.INTEGER,
      description: 'Calculated compliance score between 0 and 100 based strictly on the provided custom guidelines'
    },
    summary: {
      type: Type.STRING,
      description: 'Executive summary of the review findings, SEO readiness, and editorial recommendation (2-3 sentences)'
    },
    metrics: {
      type: Type.OBJECT,
      description: 'Quantitative content and SEO metrics',
      properties: {
        wordCount: {
          type: Type.INTEGER,
          description: 'Total word count of the analyzed text'
        },
        estimatedReadingTimeMinutes: {
          type: Type.NUMBER,
          description: 'Estimated reading time in minutes'
        },
        detectedTone: {
          type: Type.STRING,
          description: 'Detected tone (e.g., Expert & Accessible, Robotic AI, Informal, Overly Academic)'
        },
        readingLevel: {
          type: Type.STRING,
          description: 'Hemingway readability grade level (Target: Grade 7 or less)'
        },
        primaryKeyword: {
          type: Type.STRING,
          description: 'Identified primary target keyword'
        },
        primaryKeywordCount: {
          type: Type.INTEGER,
          description: 'Number of times primary keyword appears (Target: 2 to 4 times)'
        },
        titleLength: {
          type: Type.INTEGER,
          description: 'Character length of the title (Target: under 58 characters)'
        },
        internalLinksCount: {
          type: Type.INTEGER,
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
      type: Type.ARRAY,
      description: 'Evaluation against every specified rule in the custom guidelines',
      items: {
        type: Type.OBJECT,
        properties: {
          ruleId: {
            type: Type.STRING,
            description: 'Rule code (e.g., SEO-01, STRUCT-01, CONTENT-02, LINK-01, TONE-01)'
          },
          category: {
            type: Type.STRING,
            description: 'Category name of the guideline'
          },
          ruleName: {
            type: Type.STRING,
            description: 'Title of the guideline rule'
          },
          status: {
            type: Type.STRING,
            description: 'Evaluation status for this specific rule',
            enum: ['Pass', 'Fail', 'Warning']
          },
          notes: {
            type: Type.STRING,
            description: 'Specific audit note or measurement explaining the rating'
          }
        },
        required: ['ruleId', 'category', 'ruleName', 'status', 'notes']
      }
    },
    violations: {
      type: Type.ARRAY,
      description: 'List of specific guideline violations found in the text',
      items: {
        type: Type.OBJECT,
        properties: {
          ruleId: {
            type: Type.STRING,
            description: 'The associated rule ID'
          },
          category: {
            type: Type.STRING,
            description: 'Category of the violation'
          },
          severity: {
            type: Type.STRING,
            description: 'Severity level of the violation',
            enum: ['Critical', 'Major', 'Minor', 'Suggestion']
          },
          issue: {
            type: Type.STRING,
            description: 'Clear, concise description of the detected issue'
          },
          originalExcerpt: {
            type: Type.STRING,
            description: 'Exact verbatim excerpt from the blog post containing the violation'
          },
          suggestedFix: {
            type: Type.STRING,
            description: 'Rewritten replacement text or concrete editorial fix'
          },
          explanation: {
            type: Type.STRING,
            description: 'Why this excerpt violates the specific guideline'
          }
        },
        required: ['ruleId', 'category', 'severity', 'issue', 'originalExcerpt', 'suggestedFix', 'explanation']
      }
    },
    strengths: {
      type: Type.ARRAY,
      description: 'Key positive aspects and strengths observed in the content adhering to the guidelines',
      items: {
        type: Type.STRING
      }
    },
    actionPlan: {
      type: Type.ARRAY,
      description: 'Prioritized step-by-step checklist to bring content to 100% compliance with guidelines',
      items: {
        type: Type.STRING
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

module.exports = {
  reviewResponseSchema
};
