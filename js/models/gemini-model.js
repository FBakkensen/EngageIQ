/**
 * EngageIQ Chrome Extension
 * Gemini Model Module
 * 
 * This module provides constants and functions related to the Gemini API model selection and endpoint construction.
 * It centralizes model management for consistent handling across the extension.
 */

// Import storage utility to get model preferences
import { DEFAULT_GEMINI_MODEL, getCurrentModel } from '../utils/storage-utils.js';

// API Configuration Constants
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// JSON Schema for Gemini API function calling - defines the expected structure of the response
const GENERATION_SCHEMA = {
  type: 'object',
  properties: {
    comments: {
      type: 'object',
      properties: {
        like: {
          type: 'string',
          description: "Comment suggestion for 'Like' reaction.",
        },
        celebrate: {
          type: 'string',
          description: "Comment suggestion for 'Celebrate' reaction.",
        },
        support: {
          type: 'string',
          description: "Comment suggestion for 'Support' reaction.",
        },
        love: {
          type: 'string',
          description: "Comment suggestion for 'Love' reaction.",
        },
        insightful: {
          type: 'string',
          description: "Comment suggestion for 'Insightful' reaction.",
        },
        funny: {
          type: 'string',
          description: "Comment suggestion for 'Funny' reaction.",
        },
      },
      required: ['like', 'celebrate', 'support', 'love', 'insightful', 'funny'],
    },
  },
  required: ['comments'],
};

// Schema for comment regeneration requests
const REGENERATION_SCHEMA = {
  type: 'object',
  properties: {
    regeneratedComment: {
      type: 'string',
      description: 'The regenerated comment with adjusted length.',
    },
  },
  required: ['regeneratedComment'],
};

// Schema for Smart Suggestions direction analysis
const DIRECTION_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    directions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The title of the direction approach.',
          },
          description: {
            type: 'string',
            description: 'Brief description of the direction approach.',
          },
          emoji: {
            type: 'string',
            description: 'Relevant emoji for the direction.',
          },
        },
        required: ['title', 'description', 'emoji'],
      },
      minItems: 3,
      maxItems: 4,
    },
  },
  required: ['directions'],
};

// Schema for Smart Suggestions direction-based comment generation
const DIRECTION_COMMENT_SCHEMA = {
  type: 'object',
  properties: {
    comments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The comment text.',
          },
          type: {
            type: 'string',
            description: 'The length type of the comment (short, medium, detailed).',
            enum: ['short', 'medium', 'detailed'],
          },
        },
        required: ['text', 'type'],
      },
      minItems: 3,
      maxItems: 3,
    },
    direction: {
      type: 'string',
      description: 'The selected direction for which comments were generated.',
    },
  },
  required: ['comments', 'direction'],
};

/**
 * Constructs the API endpoint URL with the current model
 * This is a key part of the model selection feature, as it dynamically
 * builds the API URL based on the user's model preference.
 *
 * @returns {Promise<string>} The complete API endpoint URL for the selected model
 */
async function getGenerateContentEndpoint() {
  try {
    const model = await getCurrentModel();
    return `${GEMINI_API_BASE_URL}/${model}:generateContent`; // Will append ?key=API_KEY when making the request
  } catch (error) {
    console.error(`EngageIQ: Error getting model for API endpoint: ${error}`);
    // Fallback to default model in case of any error
    return `${GEMINI_API_BASE_URL}/${DEFAULT_GEMINI_MODEL}:generateContent`;
  }
}

/**
 * Returns the list of valid Gemini models supported by the extension
 * 
 * @returns {string[]} Array of valid model identifiers
 */
function getValidModels() {
  return [
    'gemini-2.5-pro-exp-03-25', // Latest experimental model with highest quality but stricter rate limits
    'gemini-2.0-flash', // Default model with good balance of speed and quality
    'gemini-2.0-flash-lite', // Fastest model with highest rate limits
    'gemini-1.5-pro', // Previous generation model for specific use cases
  ];
}

/**
 * Validates if a given model name is supported by the extension
 * 
 * @param {string} modelName - The model name to validate
 * @returns {boolean} True if the model is valid, false otherwise
 */
function isValidModel(modelName) {
  return getValidModels().includes(modelName);
}

/**
 * Gets the default temperature setting for a specific model
 * Different models may have different optimal temperature settings
 * 
 * @param {string} modelName - The model to get temperature for
 * @returns {number} The recommended temperature value
 */
function getModelTemperature(modelName) {
  const temperatureMap = {
    'gemini-2.5-pro-exp-03-25': 0.7, // Higher temperature for more creative outputs
    'gemini-2.0-flash': 0.6, // Balanced temperature
    'gemini-2.0-flash-lite': 0.5, // Lower temperature for more consistent outputs
    'gemini-1.5-pro': 0.6, // Standard temperature
  };
  
  return temperatureMap[modelName] || 0.6; // Default to 0.6 if model not found
}

/**
 * Gets model specifics like description, capabilities, and rate limits
 * 
 * @param {string} modelName - The model to get details for
 * @returns {Object} Object containing model specifications
 */
function getModelSpecs(modelName) {
  const modelSpecs = {
    'gemini-2.5-pro-exp-03-25': {
      description: 'Latest experimental model with highest quality',
      bestFor: 'Premium quality comment generation',
      rateLimit: 'Stricter rate limits (60 requests per minute)',
      responseTime: 'Medium',
    },
    'gemini-2.0-flash': {
      description: 'Default model with good balance',
      bestFor: 'Everyday comment generation',
      rateLimit: 'Standard rate limits (120 requests per minute)',
      responseTime: 'Fast',
    },
    'gemini-2.0-flash-lite': {
      description: 'Fastest model with highest rate limits',
      bestFor: 'High-volume comment generation',
      rateLimit: 'Generous rate limits (300 requests per minute)',
      responseTime: 'Very fast',
    },
    'gemini-1.5-pro': {
      description: 'Previous generation model',
      bestFor: 'Legacy compatibility',
      rateLimit: 'Standard rate limits (120 requests per minute)',
      responseTime: 'Medium',
    },
  };
  
  return modelSpecs[modelName] || {
    description: 'Unknown model',
    bestFor: 'Unknown',
    rateLimit: 'Unknown',
    responseTime: 'Unknown',
  };
}

// Export all constants and functions
export {
  GEMINI_API_BASE_URL,
  GENERATION_SCHEMA,
  REGENERATION_SCHEMA,
  DIRECTION_ANALYSIS_SCHEMA,
  DIRECTION_COMMENT_SCHEMA,
  getGenerateContentEndpoint,
  getValidModels,
  isValidModel,
  getModelTemperature,
  getModelSpecs
};
