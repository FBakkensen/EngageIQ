/**
 * EngageIQ Chrome Extension
 * API Service Module
 *
 * This module provides functions for interacting with the Gemini API,
 * including request construction, error handling, and response processing.
 */

// --- DEBUG: Force provider check at top of API service ---
import { getApiProvider } from '../utils/storage-utils.js';
import { getCurrentModelByProvider } from '../utils/storage-utils.js';
(async () => {
  const provider = await getApiProvider();
  console.log('EngageIQ: [api-service.js] Forced provider check, value:', provider);
})();

// Import models and storage utilities
import { 
  DIRECTION_ANALYSIS_SCHEMA,
  DIRECTION_COMMENT_SCHEMA,
  getGenerateContentEndpoint
} from '../models/gemini-model.js';
import { getApiKey, getOpenAIApiKey, getOpenAIEndpoint } from '../utils/storage-utils.js';
import { ImageContextDebug } from '../utils/ImageContextDebug.js';
import { ImageConverter } from '../utils/ImageConverter.js';
import { callApiProvider } from './api-provider.js';

// Add verification log for API service module initialization
console.log('EngageIQ API Service: Module initialized, checking environment...');

// Feature flag for image context
const IMAGE_CONTEXT_ENABLED_KEY = 'engageiq_image_context_enabled';
// Set to true to enable image context support by default
const DEFAULT_IMAGE_CONTEXT_ENABLED = true;

/**
 * Determine if code is running in service worker context
 * @returns {boolean} True if in service worker context
 */
function isServiceWorkerContext() {
  return (typeof window === 'undefined') || 
         (typeof localStorage === 'undefined') ||
         (typeof self !== 'undefined' && self.constructor && self.constructor.name === 'ServiceWorkerGlobalScope');
}

/**
 * Check if image context feature is enabled
 * @param {Function} callback - Callback for async result in service worker context
 * @returns {boolean|void} True if image context is enabled, void if callback used
 */
function isImageContextEnabled(callback) {
  if (isServiceWorkerContext()) {
    // In service worker context, use chrome.storage.local
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([IMAGE_CONTEXT_ENABLED_KEY], result => {
        let enabled = result[IMAGE_CONTEXT_ENABLED_KEY];
        if (enabled === undefined) {
          // First time - set default
          const data = {};
          data[IMAGE_CONTEXT_ENABLED_KEY] = DEFAULT_IMAGE_CONTEXT_ENABLED;
          chrome.storage.local.set(data);
          enabled = DEFAULT_IMAGE_CONTEXT_ENABLED;
        }
        if (callback) callback(enabled === true);
      });
      return; // Return void since this is async
    }
    // Fallback if storage is not available
    if (callback) callback(DEFAULT_IMAGE_CONTEXT_ENABLED);
    return;
  } 
  
  // In content script or UI context, use localStorage
  try {
    const storedValue = localStorage.getItem(IMAGE_CONTEXT_ENABLED_KEY);
    if (storedValue === null) {
      // First time - set default
      localStorage.setItem(IMAGE_CONTEXT_ENABLED_KEY, DEFAULT_IMAGE_CONTEXT_ENABLED);
      if (callback) callback(DEFAULT_IMAGE_CONTEXT_ENABLED);
      return DEFAULT_IMAGE_CONTEXT_ENABLED;
    }
    const enabled = storedValue === 'true';
    if (callback) callback(enabled);
    return enabled;
  } catch (e) {
    // Fallback if localStorage fails
    ImageContextDebug.logError('Error accessing localStorage:', e);
    if (callback) callback(DEFAULT_IMAGE_CONTEXT_ENABLED);
    return DEFAULT_IMAGE_CONTEXT_ENABLED;
  }
}

/**
 * Toggle image context feature and return new state
 * @param {Function} callback - Callback for async result in service worker context
 * @returns {boolean|void} New state (true if enabled), void if callback used
 */
function toggleImageContext(callback) {
  if (isServiceWorkerContext()) {
    // In service worker context, use chrome.storage.local
    isImageContextEnabled(currentState => {
      const newState = !currentState;
      const data = {};
      data[IMAGE_CONTEXT_ENABLED_KEY] = newState;
      chrome.storage.local.set(data);
      ImageContextDebug.logInfo(`Image context ${newState ? 'enabled' : 'disabled'}`);
      if (callback) callback(newState);
    });
    return;
  }
  
  // In content script or UI context, use localStorage
  try {
    const currentState = isImageContextEnabled();
    const newState = !currentState;
    localStorage.setItem(IMAGE_CONTEXT_ENABLED_KEY, newState);
    ImageContextDebug.logInfo(`Image context ${newState ? 'enabled' : 'disabled'}`);
    if (callback) callback(newState);
    return newState;
  } catch (e) {
    ImageContextDebug.logError('Error toggling image context:', e);
    if (callback) callback(DEFAULT_IMAGE_CONTEXT_ENABLED);
    return DEFAULT_IMAGE_CONTEXT_ENABLED;
  }
}

/**
 * Create an API payload with optional image context
 * @param {string} promptText - The text prompt for the API
 * @param {Object} options - Configuration options
 * @param {Object} [options.imageContext] - Optional image context data
 * @param {string} options.imageContext.base64Data - Base64 image data
 * @param {string} options.imageContext.mimeType - Image MIME type
 * @param {Object} [options.generationConfig] - Optional generation configuration
 * @param {Array} [options.safetySettings] - Optional safety settings
 * @param {Object} [options.functionDeclaration] - Optional function declaration for structured output
 * @returns {Object} API request payload
 */
function createPayloadWithImageContext(promptText, options = {}) {
  const { imageContext, generationConfig, safetySettings, functionDeclaration } = options;

  // Default safety settings if not provided
  const defaultSafetySettings = [
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
  ];

  // Base payload structure
  const payload = {
    contents: [],
    safety_settings: safetySettings || defaultSafetySettings
  };

  // Add generation config if provided
  if (generationConfig) {
    payload.generationConfig = generationConfig;
  }

  // Add function declaration for structured output if provided
  if (functionDeclaration) {
    payload.functionDeclarations = [functionDeclaration];
  }

  // Create the content parts array
  const parts = [];

  // Always add the text prompt
  parts.push({ text: promptText });

  // Add image if provided and feature is enabled
  if (imageContext && isImageContextEnabled()) {
    try {
      // Create the image part
      // Note: The base64Data should not include the "data:image/jpeg;base64," prefix
      // Extract just the base64 data without the MIME prefix if it exists
      let cleanBase64 = imageContext.base64Data;
      if (cleanBase64.includes('base64,')) {
        cleanBase64 = cleanBase64.split('base64,')[1];
      }

      // Add the image part to the content
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: imageContext.mimeType
        }
      });

      ImageContextDebug.logInfo('Added image context to payload', {
        mimeType: imageContext.mimeType,
        base64Preview: `${cleanBase64.substring(0, 20)}...` // Just log the first part for brevity
      });
    } catch (error) {
      ImageContextDebug.logError('Failed to add image context to payload', error);
      // Continue with just the text prompt
    }
  }

  // Add the parts to the contents
  payload.contents = [{ parts }];

  // Log the final payload structure for debugging
  ImageContextDebug.logInfo('Created API payload', {
    hasImage: parts.length > 1,
    generationConfigIncluded: !!generationConfig,
    functionDeclarationIncluded: !!functionDeclaration
  });

  return payload;
}

/**
 * Extract image context from post content if available
 * @param {Object} postContent - Post content which may include imageContext
 * @returns {Object|null} Image context object or null if not available/valid
 */
function extractImageContext(postContent) {
  // If feature is disabled, don't process images
  if (!isImageContextEnabled()) {
    ImageContextDebug.logInfo('Image context feature is disabled, skipping image extraction');
    return null;
  }

  // Check if image context is directly provided
  if (postContent.imageContext) {
    ImageContextDebug.logInfo('Found existing image context in post content');
    return postContent.imageContext;
  }

  // Return null if no image context available
  ImageContextDebug.logInfo('No image context available in post content');
  return null;
}

/**
 * Generate a sample API payload with the given post content and image (for testing)
 * @param {Object} postContent - Post content object
 * @returns {Object} Sample payload that would be sent to API
 */
function generateSamplePayload(postContent) {
  const imageContext = extractImageContext(postContent);
  const prompt = `Sample prompt for post: "${postContent.text?.substring(0, 50)}..."`;

  return createPayloadWithImageContext(prompt, {
    imageContext,
    generationConfig: { temperature: 0.7 }
  });
}

// Constants for API settings
const API_SETTINGS = {
  MAX_RETRIES: 2,       // Maximum number of retries on failure
  RETRY_DELAY_MS: 1000, // Base delay between retries (will be multiplied by retry count)
  TIMEOUT_MS: 20000,    // Timeout for the API request in milliseconds
};

// Standardized error types
const ERROR_TYPES = {
  NETWORK: 'network_error',          // General network issue
  API_KEY: 'api_key_error',          // Invalid or missing API key
  BAD_REQUEST: 'bad_request_error',    // 400 Bad Request
  AUTH: 'auth_error',                // 401/403 Authentication/Authorization
  NOT_FOUND: 'not_found_error',        // 404 Not Found (e.g., model)
  RATE_LIMIT: 'rate_limit_error',    // 429 Rate Limit Exceeded
  SERVER: 'server_error',            // 5xx Server Error
  TIMEOUT: 'timeout_error',          // Request timed out
  CONTENT_FILTER: 'content_filter_error', // Response blocked due to content filters
  PARSING: 'parsing_error',          // Failed to parse API response
  UNKNOWN: 'unknown_error',          // Other unexpected errors
  MISSING_API_KEY: 'missing_api_key_error', // API Key not found
};

/**
 * Creates a standardized API error object.
 *
 * @param {string} type - One of the ERROR_TYPES keys
 * @param {string} message - Primary error message
 * @param {number|null} status - HTTP status code, if applicable
 * @param {string|Object|null} details - Additional error details (e.g., raw response text or parsed error object)
 * @returns {Error} An Error object with additional properties (isApiError, errorType, status, details)
 */
function createApiError(type, message, status = null, details = null) {
  const error = new Error(message);
  error.isApiError = true; // Flag to identify these specific errors
  error.errorType = type;
  error.status = status;
  error.details = details;
  console.error(`EngageIQ: API Error Created - Type: ${type}, Status: ${status}, Message: ${message}`, { details });
  return error;
}

/**
 * Makes a call to the Gemini API with retry and timeout logic.
 *
 * @param {Object} requestBody - The payload for the API request.
 * @param {string} operationName - A descriptive name for the operation (for logging).
 * @returns {Promise<Object>} - The JSON response from the API.
 * @throws {ApiError} - Throws an ApiError if the request fails after retries or times out.
 */
async function callGeminiAPI(requestBody, operationName = 'API Call') {
  let retries = 0;

  // Get API Key internally
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.error(`EngageIQ: [${operationName}] API Key not found.`);
    throw createApiError(ERROR_TYPES.MISSING_API_KEY, 'API Key not found. Please configure it in the extension options.', 401); // Use 401 Unauthorized conceptually
  }

  const endpoint = await getGenerateContentEndpoint();

  const fullApiUrl = `${endpoint}?key=${apiKey}`;

  // Prepare fetch options with timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_SETTINGS.TIMEOUT_MS);

  while (retries <= API_SETTINGS.MAX_RETRIES) {
    try {
      if (retries > 0) {
        const delay = API_SETTINGS.RETRY_DELAY_MS * retries;
        console.log(`EngageIQ: [${operationName}] Retry attempt ${retries} after ${delay}ms delay.`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      console.debug(`EngageIQ: [${operationName}] Sending payload (attempt ${retries + 1}):`, JSON.stringify(requestBody).substring(0, 300) + '...'); // Log truncated payload

      const response = await fetch(fullApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal // Link fetch to AbortController
      });

      clearTimeout(timeoutId); // Clear the timeout if fetch completes

      // --- Handle HTTP errors ---
      if (!response.ok) {
        let errorType = ERROR_TYPES.UNKNOWN;
        let errorMessage = `API call failed with status ${response.status}`;
        let errorDetails = null;
        try {
          // Attempt to get detailed error message from response body
          const errorText = await response.text();
          console.warn(`EngageIQ: [${operationName}] API Error Response Text:`, errorText);
          try {
             errorDetails = JSON.parse(errorText); // Try parsing as JSON
             // Check for specific Gemini error structures if applicable
             if (errorDetails.error && errorDetails.error.message) {
               errorMessage = `API Error: ${errorDetails.error.message}`;
             }
          } catch (parseError) {
             errorDetails = errorText; // Use raw text if not JSON
             errorMessage = `API call failed with status ${response.status}. Unable to parse error details.`;
          }
        } catch (textError) {
          console.error(`EngageIQ: [${operationName}] Could not read error response body.`, textError);
          errorMessage = `API call failed with status ${response.status}. Could not read error details.`;
        }

        // Map status codes to specific error types
        switch (response.status) {
          case 400:
            errorType = ERROR_TYPES.BAD_REQUEST;
            break;
          case 401:
          case 403:
            errorType = ERROR_TYPES.AUTH;
            errorMessage = 'Authentication Error: Invalid or expired API key.';
            break;
          case 404:
            errorType = ERROR_TYPES.NOT_FOUND;
            errorMessage = 'API Endpoint/Model Not Found.';
            break;
          case 429:
            errorType = ERROR_TYPES.RATE_LIMIT;
            errorMessage = 'Rate Limit Exceeded: Too many requests.';
            break;
          case 500:
          case 501:
          case 502:
          case 503:
          case 504:
            errorType = ERROR_TYPES.SERVER;
            errorMessage = 'Gemini API Server Error: Service unavailable.';
            break;
        }

        // Throw a structured error
        throw createApiError(errorType, errorMessage, response.status, errorDetails);
      }

      // --- Handle Successful Response ---
      const responseData = await response.json();
      console.log(`EngageIQ: [${operationName}] API request successful.`);

      // --- Check for Content Filtering ---
      // Gemini indicates blocking via `promptFeedback.blockReason`
      if (responseData.promptFeedback && responseData.promptFeedback.blockReason) {
          const reason = responseData.promptFeedback.blockReason;
          const safetyRatings = responseData.promptFeedback.safetyRatings || [];
          console.warn(`EngageIQ: [${operationName}] Response blocked due to content filter: ${reason}`, { safetyRatings });
          throw createApiError(
              ERROR_TYPES.CONTENT_FILTER,
              `Request blocked due to content filtering: ${reason}. Check safety ratings for details.`,
              null,
              responseData.promptFeedback // Include feedback as details
          );
      }
      // Also check if candidates array is missing or empty (another sign of blocking without explicit reason sometimes)
      if (!responseData.candidates || responseData.candidates.length === 0) {
         console.warn(`EngageIQ: [${operationName}] API response missing candidates array, potentially due to filtering or other issue.`);
         // Check for finishReason if available
         const finishReason = responseData.candidates?.[0]?.finishReason;
         if (finishReason && finishReason !== 'STOP') {
            throw createApiError(
               ERROR_TYPES.CONTENT_FILTER, // Assume filter or safety issue
               `API response generation stopped unexpectedly. Reason: ${finishReason}`,
               null,
               responseData // Include full response as details
            );
         } else {
             // Throw a more general parsing/content error if no specific reason found
            throw createApiError(
               ERROR_TYPES.PARSING,
               'API response received successfully but contained no valid candidates or content.',
               response.status,
               responseData
            );
         }
      }

      return responseData; // Success!

    } catch (error) {
      console.error(`EngageIQ: [${operationName}] Error during API request (attempt ${retries + 1}):`, error);

      // --- Handle specific error types for retry logic ---
      // Handle Fetch Abort (Timeout)
      if (error.name === 'AbortError') {
        console.warn(`EngageIQ: [${operationName}] Request timed out.`);
        const timeoutError = createApiError(ERROR_TYPES.TIMEOUT, 'Request timed out', null, { timeoutMs: API_SETTINGS.TIMEOUT_MS });
        if (retries >= API_SETTINGS.MAX_RETRIES) throw timeoutError; // Throw if max retries reached
        retries++;
        continue; // Retry on timeout
      }

      // Handle our structured API errors
      if (error.isApiError) {
        // Retry on rate limit or server errors if retries remain
        if ((error.errorType === ERROR_TYPES.RATE_LIMIT || error.errorType === ERROR_TYPES.SERVER) && retries < API_SETTINGS.MAX_RETRIES) {
          console.warn(`EngageIQ: [${operationName}] Retrying after API error: ${error.errorType}`);
          retries++;
          continue;
        }
        // Otherwise, throw the structured API error (non-retryable or max retries)
        throw error;
      }

      // Handle general network errors (TypeError often indicates network issues)
      if (error instanceof TypeError) {
         console.warn(`EngageIQ: [${operationName}] Encountered potential network error: ${error.message}`);
         const networkError = createApiError(ERROR_TYPES.NETWORK, `Network error: ${error.message}`, null, error);
         if (retries >= API_SETTINGS.MAX_RETRIES) throw networkError; // Throw if max retries reached
         retries++;
         continue; // Retry on network errors
      }

      // If it's an unknown error or we've exhausted retries, wrap and throw
      console.error(`EngageIQ: [${operationName}] Unhandled or non-retryable error after ${retries + 1} attempts.`);
      throw createApiError(ERROR_TYPES.UNKNOWN, `An unexpected error occurred during the API call: ${error.message}`, null, error);
    }
  }
  // Should not be reached if loop logic is correct, but as a safeguard:
  throw createApiError(ERROR_TYPES.UNKNOWN, 'Max retries reached without success or specific error.', null, null);
}

export { callGeminiAPI, ERROR_TYPES, createApiError };

/**
 * Generates comment suggestions using the Gemini API.
 *
 * @param {Object} postContent - Object containing the post text and metadata
 * @param {function} sendResponse - Callback function to send response back to the caller
 */
async function generateComments(postContent, sendResponse) {
  console.log('EngageIQ: Processing generate comments request');
  const model = await getCurrentModelByProvider();
  const provider = await getApiProvider();
  console.log(`EngageIQ: Using model: ${model} for provider: ${provider}`);
  if (!postContent || !postContent.text) {
    console.error('EngageIQ: No post content provided in generate comments request');
    sendResponse({
      success: false,
      error: 'Missing post content',
      details: 'No content was provided to generate comments for',
    });
    return;
  }

  try {
    // Prepare generic request for provider abstraction
    const imageContext = extractImageContext(postContent);
    const request = {
      operation: 'generateComments',
      postContent,
      imageContext,
    };
    // Use provider abstraction
    const response = await callApiProvider(request, { operation: 'generateComments' });
    // Assume normalized response shape
    sendResponse({
      ...response,
      usedImageContext: !!imageContext,
    });
  } catch (error) {
    console.error('EngageIQ: Error during comment generation:', error);
    sendResponse({
      success: false,
      error: 'GENERATION_ERROR',
      details: error.message || 'Unknown error during comment generation',
    });
  }
}

/**
 * Regenerates a comment (longer or shorter) using the Gemini API.
 *
 * @param {string} requestType - 'REGENERATE_LONGER' or 'REGENERATE_SHORTER'
 * @param {Object} payload - Contains originalText and reactionType
 * @param {function} sendResponse - Callback function to send response back to the caller
 */
async function regenerateComment(requestType, payload, sendResponse) {
  console.log(`EngageIQ: Processing ${requestType} request`);
  const model = await getCurrentModelByProvider();
  const provider = await getApiProvider();
  console.log(`EngageIQ: Using model: ${model} for provider: ${provider}`);
  try {
    if (!payload || !payload.originalText || !payload.reactionType) {
      console.error('EngageIQ: Invalid payload for regeneration request:', payload);
      sendResponse({
        success: false,
        type: 'REGENERATION_ERROR',
        error: 'INVALID_PAYLOAD',
        details: 'Missing originalText or reactionType in regeneration request.',
        payload: { reactionType: payload?.reactionType },
      });
      return;
    }
    // Prepare generic request for provider abstraction
    const request = {
      operation: 'regenerateComment',
      requestType,
      ...payload,
    };
    // Use provider abstraction
    const response = await callApiProvider(request, { operation: 'regenerateComment' });
    sendResponse({ ...response });
  } catch (error) {
    console.error('EngageIQ: Error during regeneration API call or processing:', error);
    sendResponse({
      success: false,
      type: 'REGENERATION_ERROR',
      error: 'API_ERROR',
      details: error.message || 'Unknown regeneration error occurred.',
      payload: {
        reactionType: payload?.reactionType,
      },
    });
  }
}

/**
 * Analyzes post content to generate direction suggestions using Gemini API.
 *
 * @param {Object} postContent - Object containing the post text and metadata
 * @param {function} sendResponse - Callback function to send response back to the caller
 */
async function analyzeDirections(postContent, sendResponse) {
  console.log('EngageIQ: Processing direction analysis request');
  const model = await getCurrentModelByProvider();
  const provider = await getApiProvider();
  console.log(`EngageIQ: Using model: ${model} for provider: ${provider}`);
  if (!postContent || !postContent.text) {
    console.error('EngageIQ: No post content provided in direction analysis request');
    sendResponse({
      success: false,
      error: 'Missing post content',
      details: 'No content was provided to analyze for directions',
    });
    return;
  }

  try {
    // Prepare generic request for provider abstraction
    const imageContext = extractImageContext(postContent);
    const request = {
      operation: 'analyzeDirections',
      postContent,
      imageContext,
    };
    // Use provider abstraction
    const response = await callApiProvider(request, { operation: 'analyzeDirections' });
    sendResponse({ ...response, usedImageContext: !!imageContext });
  } catch (error) {
    console.error('EngageIQ: Error in direction analysis:', error);
    sendResponse({
      success: false,
      error: 'Direction Analysis Failed',
      details: error.message || 'An unexpected error occurred while analyzing the post',
    });
  }
}

/**
 * Generates comments based on a selected direction using the Gemini API.
 * 
 * @param {Object} payload - Contains postContent and selectedDirection
 * @param {function} sendResponse - Callback function to send response back to the caller
 */
async function generateDirectionComments(payload, sendResponse) {
  console.log('EngageIQ: Processing direction-based comment generation request');
  const model = await getCurrentModelByProvider();
  const provider = await getApiProvider();
  console.log(`EngageIQ: Using model: ${model} for provider: ${provider}`);
  if (!payload || !payload.postContent || !payload.postContent.text || !payload.selectedDirection) {
    console.error('EngageIQ: Missing data in direction-based comment generation request');
    sendResponse({
      success: false,
      error: 'Missing required data',
      details: 'Post content or selected direction is missing',
    });
    return;
  }

  const { postContent, selectedDirection } = payload;

  try {
    // Prepare generic request for provider abstraction
    const imageContext = extractImageContext(postContent);
    const request = {
      operation: 'generateDirectionComments',
      postContent,
      selectedDirection,
      imageContext,
    };
    // Use provider abstraction
    const response = await callApiProvider(request, { operation: 'generateDirectionComments' });
    sendResponse({ ...response, usedImageContext: !!imageContext });
  } catch (error) {
    console.error('EngageIQ: Error in direction-based comment generation:', error);
    sendResponse({
      success: false,
      error: 'Comment Generation Failed',
      details: error.message || 'An unexpected error occurred while generating comments',
    });
  }
}

/**
 * Processes the API response from a comment generation request.
 *
 * @param {Object} data - The API response data
 * @returns {Object} The extracted comments object
 * @throws {Error} If the response format is invalid
 */
function processGenerationResponse(data) {
  // Check for candidate data
  if (!data || !data.candidates || data.candidates.length === 0) {
    console.error('EngageIQ: Invalid response format - no candidates found');
    throw new Error('Invalid response format: No candidates found');
  }

  const candidate = data.candidates[0];

  // Check finish reason
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    console.error(`EngageIQ: Generation stopped due to ${candidate.finishReason}`);
    throw new Error(`Generation stopped: ${candidate.finishReason}`);
  }

  // Extract function call
  if (!candidate.content || !candidate.content.parts ||
      candidate.content.parts.length === 0 ||
      !candidate.content.parts[0].functionCall) {
    console.error('EngageIQ: Invalid response format - functionCall not found');
    throw new Error('Invalid response format: Function call data not found');
  }

  const functionCall = candidate.content.parts[0].functionCall;

  // Verify function name
  if (functionCall.name !== 'generateLinkedInComments') {
    console.error(`EngageIQ: Unexpected function name: ${functionCall.name}`);
    throw new Error(`Unexpected function name: ${functionCall.name}`);
  }

  // Extract and parse arguments
  let args = functionCall.args;

  // Parse args if it's a string
  if (typeof args === 'string') {
    try {
      args = JSON.parse(args);
    } catch (error) {
      console.error('EngageIQ: Failed to parse args string:', error);
      throw new Error('Failed to parse response data');
    }
  }

  // Validate structure
  if (!args || !args.comments) {
    console.error('EngageIQ: Missing comments object in response');
    throw new Error('Invalid response format: Missing comments object');
  }

  const comments = args.comments;

  // Validate all required reaction types
  const requiredTypes = ['like', 'celebrate', 'support', 'love', 'insightful', 'funny'];
  const missingTypes = requiredTypes.filter(type => !comments[type]);

  if (missingTypes.length > 0) {
    console.error(`EngageIQ: Missing comment types in response: ${missingTypes.join(', ')}`);
    throw new Error(`Missing comment types: ${missingTypes.join(', ')}`);
  }

  // Log the successfully processed comments
  console.log('EngageIQ: [api-service] Processed comments:', comments);

  return comments;
}

/**
 * Processes the API response from a direction analysis request.
 *
 * @param {Object} data - The API response data
 * @returns {Array} The extracted directions array
 * @throws {Error} If the response format is invalid
 */
function processDirectionAnalysisResponse(data) {
  // Check for candidate data
  if (!data || !data.candidates || data.candidates.length === 0) {
    console.error('EngageIQ: Invalid response format - no candidates found');
    throw new Error('Invalid response format: No candidates found');
  }

  const candidate = data.candidates[0];

  // Check finish reason
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    console.error(`EngageIQ: Analysis stopped due to ${candidate.finishReason}`);
    throw new Error(`Analysis stopped: ${candidate.finishReason}`);
  }

  // Extract function call
  if (!candidate.content || !candidate.content.parts ||
      candidate.content.parts.length === 0 ||
      !candidate.content.parts[0].functionCall) {
    console.error('EngageIQ: Invalid response format - functionCall not found');
    throw new Error('Invalid response format: Function call data not found');
  }

  const functionCall = candidate.content.parts[0].functionCall;

  // Verify function name
  if (functionCall.name !== 'suggestDirections') {
    console.error(`EngageIQ: Unexpected function name: ${functionCall.name}`);
    throw new Error(`Unexpected function name: ${functionCall.name}`);
  }

  // Extract and parse arguments
  let args = functionCall.args;

  // Parse args if it's a string
  if (typeof args === 'string') {
    try {
      args = JSON.parse(args);
    } catch (error) {
      console.error('EngageIQ: Failed to parse args string:', error);
      throw new Error('Failed to parse response data');
    }
  }

  // Validate structure
  if (!args || !args.directions || !Array.isArray(args.directions)) {
    console.error('EngageIQ: Missing directions array in response');
    throw new Error('Invalid response format: Missing directions array');
  }

  // Ensure each direction maintains its original language context
  const directions = args.directions.map(direction => ({
    ...direction,
    headerText: direction.headerText || `Choose a commenting approach` // Fallback
  }));

  // Log the successfully processed directions
  console.log('EngageIQ: [api-service] Processed directions:', directions);

  return directions;
}

/**
 * Processes the API response from a direction-based comment generation request.
 *
 * @param {Object} data - The API response data
 * @returns {Array} The extracted comments array
 * @throws {Error} If the response format is invalid
 */
function processDirectionCommentsResponse(data) {
  // Check for candidate data
  if (!data || !data.candidates || data.candidates.length === 0) {
    console.error('EngageIQ: Invalid response format - no candidates found');
    throw new Error('Invalid response format: No candidates found');
  }

  const candidate = data.candidates[0];

  // Check finish reason
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    console.error(`EngageIQ: Generation stopped due to ${candidate.finishReason}`);
    throw new Error(`Generation stopped: ${candidate.finishReason}`);
  }

  // Extract function call
  if (!candidate.content || !candidate.content.parts ||
      candidate.content.parts.length === 0 ||
      !candidate.content.parts[0].functionCall) {
    console.error('EngageIQ: Invalid response format - functionCall not found');
    throw new Error('Invalid response format: Function call data not found');
  }

  const functionCall = candidate.content.parts[0].functionCall;

  // Verify function name
  if (functionCall.name !== 'generateDirectionComments') {
    console.error(`EngageIQ: Unexpected function name: ${functionCall.name}`);
    throw new Error(`Unexpected function name: ${functionCall.name}`);
  }

  // Extract and parse arguments
  let args = functionCall.args;

  // Parse args if it's a string
  if (typeof args === 'string') {
    try {
      args = JSON.parse(args);
    } catch (error) {
      console.error('EngageIQ: Failed to parse args string:', error);
      throw new Error('Failed to parse response data');
    }
  }

  // Validate structure
  if (!args || !args.comments || !Array.isArray(args.comments)) {
    console.error('EngageIQ: Missing comments array in response');
    throw new Error('Invalid response format: Missing comments array');
  }

  // Validate that we have all required comment types and titles
  const requiredTypes = ['short', 'medium', 'detailed'];
  const missingTypes = requiredTypes.filter(type =>
    !args.comments.some(comment => comment.type === type && comment.title)
  );

  if (missingTypes.length > 0) {
    console.error(`EngageIQ: Missing comment types or titles in response: ${missingTypes.join(', ')}`);
    throw new Error(`Missing comment data: ${missingTypes.join(', ')}`);
  }

  // Log the successfully processed comments
  console.log('EngageIQ: [api-service] Processed comments:', args.comments);

  return args.comments;
}

// --- Temporary stub for Step 1.3: OpenAI API client ---
/**
 * Makes a call to the OpenAI API with retry and timeout logic.
 *
 * @param {Object} requestBody - The payload for the API request (OpenAI format).
 * @param {string} operationName - A descriptive name for the operation (for logging).
 * @returns {Promise<Object>} - The JSON response from the API.
 * @throws {ApiError} - Throws an ApiError if the request fails after retries or times out.
 */
export async function callOpenAIAPI(requestBody, operationName = 'OpenAI API Call') {
  let retries = 0;

  // Get OpenAI API Key and Endpoint from storage
  const openAIEndpoint = await getOpenAIEndpoint();
  const apiKey = await getOpenAIApiKey();

  if (!apiKey) {
    console.error(`EngageIQ: [${operationName}] OpenAI API Key not found.`);
    throw createApiError(ERROR_TYPES.MISSING_API_KEY, 'OpenAI API Key not found. Please configure it in the extension options.', 401);
  }

  // Ensure the base endpoint does not have a trailing slash
  const cleanOpenAIEndpoint = openAIEndpoint.replace(/\/+$/, '');

  const fullUrl = `${cleanOpenAIEndpoint}/chat/completions`;
  console.log(`EngageIQ: [${operationName}] OpenAI API Full URL:`, fullUrl); // Added log for verification

  // Prepare fetch options with timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_SETTINGS.TIMEOUT_MS);

  while (retries <= API_SETTINGS.MAX_RETRIES) {
    try {
      if (retries > 0) {
        const delay = API_SETTINGS.RETRY_DELAY_MS * retries;
        console.log(`EngageIQ: [${operationName}] Retry attempt ${retries} after ${delay}ms delay.`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      console.debug(`EngageIQ: [${operationName}] Sending OpenAI payload (attempt ${retries + 1}):`, JSON.stringify(requestBody).substring(0, 300) + '...');

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // --- Handle HTTP errors ---
      if (!response.ok) {
        let errorType = ERROR_TYPES.UNKNOWN;
        let errorMessage = `OpenAI API call failed with status ${response.status}`;
        let errorDetails = null;
        try {
          const errorText = await response.text();
          console.warn(`EngageIQ: [${operationName}] OpenAI Error Response Text:`, errorText);
          try {
            errorDetails = JSON.parse(errorText);
            if (errorDetails.error && errorDetails.error.message) {
              errorMessage = `OpenAI API Error: ${errorDetails.error.message}`;
            }
          } catch (parseError) {
            errorDetails = errorText;
            errorMessage = `OpenAI API call failed with status ${response.status}. Unable to parse error details.`;
          }
        } catch (textError) {
          console.error(`EngageIQ: [${operationName}] Could not read OpenAI error response body.`, textError);
          errorMessage = `OpenAI API call failed with status ${response.status}. Could not read error details.`;
        }

        // Map status codes to specific error types
        switch (response.status) {
          case 400:
            errorType = ERROR_TYPES.BAD_REQUEST;
            break;
          case 401:
          case 403:
            errorType = ERROR_TYPES.AUTH;
            errorMessage = 'OpenAI Authentication Error: Invalid or expired API key.';
            break;
          case 404:
            errorType = ERROR_TYPES.NOT_FOUND;
            errorMessage = 'OpenAI API Endpoint/Model Not Found.';
            break;
          case 429:
            errorType = ERROR_TYPES.RATE_LIMIT;
            errorMessage = 'OpenAI Rate Limit Exceeded: Too many requests.';
            break;
          case 500:
          case 501:
          case 502:
          case 503:
          case 504:
            errorType = ERROR_TYPES.SERVER;
            errorMessage = 'OpenAI API Server Error: Service unavailable.';
            break;
        }

        throw createApiError(errorType, errorMessage, response.status, errorDetails);
      }

      // --- Handle Successful Response ---
      const responseData = await response.json();
      console.log(`EngageIQ: [${operationName}] OpenAI API request successful.`);
      return responseData;
    } catch (error) {
      console.error(`EngageIQ: [${operationName}] Error during OpenAI API request (attempt ${retries + 1}):`, error);

      // --- Handle specific error types for retry logic ---
      if (error.name === 'AbortError') {
        console.warn(`EngageIQ: [${operationName}] OpenAI request timed out.`);
        const timeoutError = createApiError(ERROR_TYPES.TIMEOUT, 'OpenAI request timed out', null, { timeoutMs: API_SETTINGS.TIMEOUT_MS });
        if (retries >= API_SETTINGS.MAX_RETRIES) throw timeoutError;
        retries++;
        continue;
      }
      if (error.isApiError) {
        if ((error.errorType === ERROR_TYPES.RATE_LIMIT || error.errorType === ERROR_TYPES.SERVER) && retries < API_SETTINGS.MAX_RETRIES) {
          console.warn(`EngageIQ: [${operationName}] Retrying after OpenAI API error: ${error.errorType}`);
          retries++;
          continue;
        }
        throw error;
      }
      if (error instanceof TypeError) {
        console.warn(`EngageIQ: [${operationName}] Encountered potential OpenAI network error: ${error.message}`);
        const networkError = createApiError(ERROR_TYPES.NETWORK, `OpenAI network error: ${error.message}`, null, error);
        if (retries >= API_SETTINGS.MAX_RETRIES) throw networkError;
        retries++;
        continue;
      }
      console.error(`EngageIQ: [${operationName}] Unhandled or non-retryable OpenAI error after ${retries + 1} attempts.`);
      throw createApiError(ERROR_TYPES.UNKNOWN, `An unexpected error occurred during the OpenAI API call: ${error.message}`, null, error);
    }
  }
  throw createApiError(ERROR_TYPES.UNKNOWN, 'Max retries reached for OpenAI API without success or specific error.', null, null);
}

// Export functions for use by other modules
export {
  generateComments,
  regenerateComment,
  analyzeDirections,
  generateDirectionComments
};
