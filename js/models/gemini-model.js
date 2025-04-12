/**
 * EngageIQ Chrome Extension
 * Gemini Model Module
 * 
 * This module provides constants and functions related to the Gemini API model selection and endpoint construction.
 * It centralizes model management for consistent handling across the extension.
 */

// Import storage utility to get model preferences
import { getCurrentModel } from '../utils/storage-utils.js';

// API Configuration Constants
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
export const DEFAULT_GEMINI_MODEL = 'gemini-1.5-pro';

/**
 * Image Context Part definition for Gemini API
 * Used when including images in API requests
 * @typedef {Object} ImagePart
 * @property {string} inlineData.data - Base64 encoded image data (without mime prefix)
 * @property {string} inlineData.mimeType - MIME type of the image (e.g., 'image/jpeg')
 */

/**
 * Standard text part definition for Gemini API
 * @typedef {Object} TextPart
 * @property {string} text - Text content for the API request
 */

/**
 * Gemini API payload structure definition
 * Now supports both text and image parts
 * @typedef {Object} GeminiPayload
 * @property {Array<Object>} contents - Array of content objects with parts
 * @property {Array<Object>} [safety_settings] - Optional safety settings
 * @property {Object} [generationConfig] - Optional generation configuration
 */

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

// Unified schema for providing a single comment (used for both generation and regeneration)
const UNIFIED_COMMENT_SCHEMA = {
  type: 'object',
  properties: {
    commentText: { // Unified argument name
      type: 'string',
      description: 'The generated or regenerated comment text.',
    },
  },
  required: ['commentText'],
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
          title: {
            type: 'string',
            description: 'A short, descriptive title for the comment (e.g., \'Quick Reply\').',
          },
        },
        required: ['text', 'type', 'title'],
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
  REGENERATION_SCHEMA,
  UNIFIED_COMMENT_SCHEMA,
  DIRECTION_ANALYSIS_SCHEMA,
  DIRECTION_COMMENT_SCHEMA,
  getGenerateContentEndpoint,
  getValidModels,
  isValidModel,
  getModelTemperature,
  getModelSpecs
};
