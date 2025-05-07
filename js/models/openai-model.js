/**
 * EngageIQ Chrome Extension
 * OpenAI Model Module
 * 
 * This module provides constants and functions related to the OpenAI API model selection and endpoint construction.
 * It centralizes model management for consistent handling across the extension.
 */

// Import storage utility to get model preferences
import { getCurrentOpenAIModel, getOpenAIApiKey } from '../utils/storage-utils.js';

// API Configuration Constants
const OPENAI_API_BASE_URL = 'https://api.openai.com/v1';
export const DEFAULT_OPENAI_MODEL = 'gpt-3.5-turbo';

/**
 * OpenAI API payload structure definition
 * @typedef {Object} OpenAIPayload
 * @property {string} model - The model to use
 * @property {Array<Object>} messages - Conversation messages
 * @property {Object} [functions] - Optional function calling
 * @property {Object} [tools] - Optional tool calling
 * @property {Object} [stream] - Optional streaming config
 */

// Schema for comment regeneration requests
const REGENERATION_SCHEMA = {
  name: "regenerate_comment",
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
  name: "generate_comment",
  type: 'object',
  properties: {
    commentText: {
      type: 'string',
      description: 'The generated or regenerated comment text.',
    },
  },
  required: ['commentText'],
};

// Schema for Smart Suggestions direction analysis
const DIRECTION_ANALYSIS_SCHEMA = {
  name: "generate_directions",
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
  name: "generate_direction_comments",
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
    const model = await getCurrentOpenAIModel();
    return `${OPENAI_API_BASE_URL}/chat/completions`; // OpenAI endpoint for chat completion
  } catch (error) {
    console.error(`EngageIQ: Error getting OpenAI model for API endpoint: ${error}`);
    // Fallback to default endpoint in case of any error
    return `${OPENAI_API_BASE_URL}/chat/completions`;
  }
}

/**
 * Returns the list of valid OpenAI models supported by the extension
 *
 * @returns {string[]} Array of valid model identifiers
 */
function getValidModels() {
  return [
    'gpt-4o',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
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
 * Gets model specifics like description, capabilities, and rate limits
 *
 * @param {string} modelName - The model to get details for
 * @returns {Object} Object containing model specifications
 */
function getModelSpecs(modelName) {
  const modelSpecs = {
    'gpt-4o': {
      description: 'OpenAI flagship model, multimodal, fast and cost-effective',
      bestFor: 'Premium quality, multimodal tasks',
      rateLimit: 'High',
      responseTime: 'Very fast',
    },
    'gpt-4-turbo': {
      description: 'Optimized GPT-4, fast and less expensive',
      bestFor: 'Everyday comment generation',
      rateLimit: 'High',
      responseTime: 'Fast',
    },
    'gpt-4': {
      description: 'Standard GPT-4 model',
      bestFor: 'High quality comment generation',
      rateLimit: 'Medium',
      responseTime: 'Medium',
    },
    'gpt-3.5-turbo': {
      description: 'Fast, cost-effective, and widely available',
      bestFor: 'Legacy compatibility and cost-sensitive use cases',
      rateLimit: 'Very high',
      responseTime: 'Very fast',
    },
  };
  return modelSpecs[modelName] || {
    description: 'Unknown model',
    bestFor: 'Unknown',
    rateLimit: 'Unknown',
    responseTime: 'Unknown',
  };
}

/**
 * Discover available models from a given /v1/models endpoint.
 * Caches results to avoid unnecessary API calls.
 *
 * @param {string} endpoint - The API endpoint (e.g., 'http://localhost:1234/v1/models' or 'https://api.openai.com/v1/models')
 * @param {string} [apiKey] - The API key to use for authorization (if required by the endpoint).
 * @returns {Promise<Array<Object>>} Array of model objects or throws error
 */
let _modelCache = {}; // Renamed from _lmStudioModelCache for generic use
let _modelCacheTime = {}; // Store timestamps per cacheKey
const MODELS_CACHE_TTL = 60 * 1000; // Renamed from LM_STUDIO_MODELS_CACHE_TTL

async function discoverLocalModels(endpoint, apiKey = '') { // Added apiKey parameter
  console.log(`[EngageIQ/openai-model.js] discoverLocalModels called with endpoint: ${endpoint} and apiKey: ${apiKey ? '******' : 'none'}`);
  const cacheKey = `${endpoint}_${apiKey || 'no_key'}`;
  const now = Date.now();

  if (_modelCache[cacheKey] && _modelCacheTime[cacheKey] && (now - _modelCacheTime[cacheKey] < MODELS_CACHE_TTL)) {
    console.log(`[EngageIQ/openai-model.js] Returning cached models for ${cacheKey}`);
    return _modelCache[cacheKey];
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, { method: 'GET', headers: headers });

    if (!response.ok) {
      let errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        errorText = errorJson.error?.message || errorJson.message || errorText;
      } catch (e) {
        // Not JSON, or no specific message field
      }
      // Construct a more informative error message including the status code
      const errorMessage = `Failed to fetch models from ${endpoint}: ${response.status} ${response.statusText}. Server: ${errorText}`;
      console.error(`[EngageIQ/openai-model.js] Error: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    // The transformLMStudioModels function might need to be generalized if different endpoints return different structures.
    // For now, we assume a compatible structure or that transformLMStudioModels can handle it.
    const models = transformLMStudioModels(data);

    _modelCache[cacheKey] = models;
    _modelCacheTime[cacheKey] = now;
    console.log(`[EngageIQ/openai-model.js] Fetched and cached models for ${cacheKey}`);
    return models;
  } catch (error) {
    // Log the error with more context if it's not already the detailed one we threw
    if (!error.message.startsWith('Failed to fetch models from')) {
        console.error(`[EngageIQ/openai-model.js] Error discovering models from ${endpoint}:`, error);
    }
    // Re-throw the error to be handled by the caller
    // If it's our custom error, it's already informative. If it's a network error, wrap it.
    throw new Error(error.message.startsWith('Failed to fetch models from') ? error.message : `Unable to connect or fetch models from ${endpoint}. Original error: ${error.message}`);
  }
}

/**
 * Transform LM Studio /v1/models response to EngageIQ model format.
 *
 * @param {Object} response - The raw response from LM Studio
 * @returns {Array<Object>} Array of model objects: { id, description }
 */
function transformLMStudioModels(response) {
  console.log('[EngageIQ/openai-model.js] transformLMStudioModels received raw response:', JSON.stringify(response, null, 2));
  if (!response || !Array.isArray(response.data)) {
    console.warn('[EngageIQ/openai-model.js] transformLMStudioModels: Raw response is not in expected format (missing data array). Returning empty array.');
    return [];
  }

  // Filter models to only include those that support 'structured_outputs'
  const supportedModels = response.data.filter(model => 
    model.supported_parameters && 
    Array.isArray(model.supported_parameters) && 
    model.supported_parameters.includes('structured_outputs')
  );

  console.log('[EngageIQ/openai-model.js] transformLMStudioModels: Filtered models supporting structured_outputs:', JSON.stringify(supportedModels, null, 2));

  const transformed = supportedModels.map(model => ({
    id: model.id,
    // Use model.name for display. If name is not present, fallback to model.id.
    description: model.name || model.id 
  }));

  console.log('[EngageIQ/openai-model.js] transformLMStudioModels transformed models for dropdown:', JSON.stringify(transformed, null, 2));
  return transformed;
}

// Export all constants and functions
export {
  OPENAI_API_BASE_URL,
  REGENERATION_SCHEMA,
  UNIFIED_COMMENT_SCHEMA,
  DIRECTION_ANALYSIS_SCHEMA,
  DIRECTION_COMMENT_SCHEMA,
  getGenerateContentEndpoint,
  getValidModels,
  isValidModel,
  getModelSpecs,
  discoverLocalModels,
  transformLMStudioModels
};
