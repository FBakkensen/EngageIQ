/**
 * EngageIQ Chrome Extension
 * Smart Suggestions API Service Module
 * 
 * This module provides API integration for the Smart Suggestions feature:
 * - Direction analysis API integration
 * - Direction-based comment generation API integration
 * - Error handling for API interactions
 */

// Import required modules
import {
  DIRECTION_ANALYSIS_SCHEMA,
  getGenerateContentEndpoint,
  getModelTemperature
} from '../models/gemini-model.js';
import { getApiKey } from '../utils/storage-utils.js';
import { getCurrentModel } from '../utils/storage-utils.js';

// Log module load confirmation
console.log('EngageIQ: Smart Suggestions API Service Module Loaded');

// Constants for error types and retry settings
const ERROR_TYPES = {
  NETWORK: 'network_error',
  API_KEY: 'api_key_error',
  RATE_LIMIT: 'rate_limit_error',
  TIMEOUT: 'timeout_error',
  CONTENT_FILTER: 'content_filter_error',
  PARSING: 'parsing_error',
  INTERNAL: 'internal_error',
};

const API_SETTINGS = {
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 1000,
  TIMEOUT_MS: 20000,
};

/**
 * Analyzes post content to generate direction suggestions
 * 
 * @param {Object} postContent - The LinkedIn post content to analyze
 * @returns {Promise<Object>} - Object containing an array of direction suggestions
 */
export async function analyzePostDirections(postContent) {
  console.log('EngageIQ: Analyzing post for direction suggestions');
  
  try {
    // Prepare request data
    const endpoint = await getGenerateContentEndpoint();
    const apiKey = await getApiKey();
    const model = await getCurrentModel();
    const temperature = getModelTemperature(model);
    
    if (!apiKey) {
      throw createApiError(
        ERROR_TYPES.API_KEY,
        'API key not found. Please check your API key settings.',
        'Go to extension options to set up your API key'
      );
    }
    
    if (!postContent || !postContent.text) {
      throw createApiError(
        ERROR_TYPES.INTERNAL,
        'Post content is missing or invalid',
        'Please try again with a valid post'
      );
    }
    
    // Process post text to extract meaningful content
    const processedText = cleanPostContent(postContent.text);
    
    // Build the API request payload
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `Analyze this LinkedIn post and suggest 3-5 different commenting approaches. Keep the response in the same language as the post. Post content: "${processedText}"

Generate an array of direction objects where each has:
- A short, catchy title (2-5 words). **This title MUST be in the same language as the post content.**
- A brief description explaining the approach (15-25 words). **This description MUST be in the same language as the post content.**
- A relevant emoji that fits with the direction

Make sure the directions are diverse and appropriate for professional networking on LinkedIn.`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: 1024,
      },
      toolConfig: {
        functionCallingConfig: {
          mode: 'ANY',
          allowedFunctionNames: ["generateDirections"]
        }
      },
      tools: [
        {
          functionDeclarations: [
            {
              name: "generateDirections",
              description: "Generate directional suggestions for commenting on a LinkedIn post",
              parameters: DIRECTION_ANALYSIS_SCHEMA
            }
          ]
        }
      ]
    };
    
    // Make the API request with retry logic
    const response = await makeRequestWithRetry(
      endpoint,
      apiKey,
      payload,
      'analyzePostDirections'
    );
    
    // Extract the function call result from the response
    const directionsFunctionCall = extractFunctionCall(response, "generateDirections");
    
    if (!directionsFunctionCall) {
      throw createApiError(
        ERROR_TYPES.PARSING,
        'Failed to extract direction suggestions from API response',
        'Try again or use a different post'
      );
    }
    
    // Format and validate the direction suggestions
    // Correctly access the directions array within the 'args' property
    const directions = formatDirections(directionsFunctionCall.args.directions);
    
    console.log(`EngageIQ: Successfully generated ${directions.length} direction suggestions`);
    
    return {
      success: true,
      directions: directions,
      modelInfo: {
        name: model,
        temperature: temperature
      }
    };
    
  } catch (error) {
    console.error('EngageIQ: Error analyzing post directions:', error);
    return handleApiError(error, 'direction analysis');
  }
}

/**
 * Generates comments based on a selected direction and post content
 * 
 * @param {Object} direction - The selected direction object
 * @param {Object} postContent - The original LinkedIn post content
 * @returns {Promise<Object>} - Object containing an array of suggested comments
 */
export async function generateDirectionComments(direction, postContent) {
  console.log('EngageIQ: [api-service] generateDirectionComments called with:', { directionTitle: direction?.title, hasPostContent: !!postContent?.text });
  console.log(`EngageIQ: Generating comments for direction: ${direction.title}`);
  
  try {
    // Prepare request data
    const endpoint = await getGenerateContentEndpoint();
    const apiKey = await getApiKey();
    const model = await getCurrentModel();
    const temperature = getModelTemperature(model);
    
    if (!apiKey) {
      throw createApiError(
        ERROR_TYPES.API_KEY,
        'API key not found. Please check your API key settings.',
        'Go to extension options to set up your API key'
      );
    }
    
    if (!direction || !direction.title) {
      throw createApiError(
        ERROR_TYPES.INTERNAL,
        'Direction is missing or invalid',
        'Please select a valid direction'
      );
    }
    
    if (!postContent || !postContent.text) {
      throw createApiError(
        ERROR_TYPES.INTERNAL,
        'Post content is missing or invalid',
        'Please try again with a valid post'
      );
    }
    
    // Process post text to extract meaningful content
    const processedText = cleanPostContent(postContent.text);
    
    // Build the API request payload
    const payload = {
      contents: [
        {
          parts: [
            {
              text: createPromptText(direction.title, processedText)
            }
          ]
        }
      ],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: 1024,
      },
      // Remove toolConfig and tools for standard text generation
    };
    
    // Make the API request with retry logic
    const response = await makeRequestWithRetry(
      endpoint,
      apiKey,
      payload,
      'generateDirectionComments'
    );
    
    console.log('EngageIQ: [api-service] Raw API response for comments:', response);
    
    // --- New Logic: Parse raw text response ---
    let rawTextResponse;
    let commentsArray;
    try {
      if (!response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error('EngageIQ: Missing text content in API response.', response);
        throw new Error('Missing text content in API response.');
      }
      rawTextResponse = response.candidates[0].content.parts[0].text.trim();
      console.log('EngageIQ: [api-service] Raw text extracted for comments:', JSON.stringify(rawTextResponse));
      
      // Clean potential markdown code fences
      let cleanedText = rawTextResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      console.log('EngageIQ: [api-service] Cleaned text for JSON parsing:', JSON.stringify(cleanedText));
      
      // Attempt to parse the raw text as JSON
      commentsArray = JSON.parse(cleanedText);
      console.log('EngageIQ: [api-service] Parsed comments array from text:', commentsArray);

      // Basic validation
      if (!Array.isArray(commentsArray)) {
         throw new Error('Parsed response is not an array.');
      }

    } catch (parseError) {
       console.error('EngageIQ: Failed to parse JSON from text response:', parseError);
       console.error('EngageIQ: Raw text received:', rawTextResponse); // Log the text that failed parsing
       throw createApiError(
         ERROR_TYPES.PARSING,
         `Failed to parse comment suggestions from API response. Details: ${parseError.message}`,
         'Try again or select a different direction'
       );
    }
    // --- End New Logic ---
    
    // Format and validate the comment suggestions using the parsed array
    const suggestions = formatSuggestions(commentsArray);
    
    // Log the suggestions after formatting to confirm titles are included
    console.log('EngageIQ: [smart-suggestions-api] Formatted suggestions (should have titles):', suggestions);

    // Get current model info (using existing declarations from earlier in the function)
    const modelMatch = endpoint.match(/models\/([^:]+):/);
    const modelInfo = modelMatch ? { name: modelMatch[1] } : null;

    console.log(`EngageIQ: Successfully generated ${suggestions.length} comment suggestions`);
    
    return {
      success: true,
      suggestions: suggestions,
      direction: direction,
      modelInfo: modelInfo // Use correctly scoped modelInfo
    };
    
  } catch (error) {
    console.error('EngageIQ: [api-service] Error in generateDirectionComments:', error);
    console.error('EngageIQ: Error generating direction comments:', error);
    return handleApiError(error, 'comment generation');
  }
}

/**
 * Makes an API request with retry logic
 * 
 * @param {string} endpoint - The API endpoint URL
 * @param {string} apiKey - The API key
 * @param {Object} payload - The request payload
 * @param {string} operationName - Name of the operation for logging
 * @returns {Promise<Object>} - The API response
 * @private
 */
async function makeRequestWithRetry(endpoint, apiKey, payload, operationName) {
  console.log(`EngageIQ: [api-service] Making API request for ${operationName} to ${endpoint}`, { payload: JSON.stringify(payload).substring(0, 200) + '...' }); // Log truncated payload
  let retries = 0;
  
  while (retries <= API_SETTINGS.MAX_RETRIES) {
    try {
      if (retries > 0) {
        console.log(`EngageIQ: Retry attempt ${retries} for ${operationName}`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, API_SETTINGS.RETRY_DELAY_MS * retries));
      }
      
      console.debug(`EngageIQ: [api-service] Sending payload for ${operationName}:`, JSON.stringify(payload)); // Log the stringified payload
      
      // Make the API request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_SETTINGS.TIMEOUT_MS);
      
      const response = await fetch(`${endpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Handle HTTP error responses
      if (!response.ok) {
        let errorData = null;
        let responseText = '';
        try {
          responseText = await response.text(); // Get raw text first
          console.debug(`EngageIQ: [api-service] Raw error response text for ${operationName}:`, responseText); // Log raw text
          errorData = JSON.parse(responseText); // Try to parse as JSON
        } catch (e) {
          console.error(`EngageIQ: [api-service] Failed to parse error response body for ${operationName}:`, e);
        }
        throw createApiError(response.status, errorData, operationName, responseText);
      }
      
      // Parse and return the successful response
      const data = await response.json();
      console.log(`EngageIQ: [api-service] API request successful for ${operationName}`);
      return data;
      
    } catch (error) {
      console.error(`EngageIQ: [api-service] Error during API request for ${operationName} (retry ${retries}):`, error);
      // Handle abort (timeout) errors
      if (error.name === 'AbortError') {
        throw createApiError(
          ERROR_TYPES.TIMEOUT,
          'Request timed out',
          'Check your internet connection and try again'
        );
      }
      
      // If it's already an API error and not the last retry, continue retrying
      if (error.isApiError && retries < API_SETTINGS.MAX_RETRIES) {
        retries++;
        continue;
      }
      
      // For network errors, retry if possible
      if (error instanceof TypeError && error.message.includes('network') && retries < API_SETTINGS.MAX_RETRIES) {
        retries++;
        continue;
      }
      
      // For other errors or if we've exhausted retries, throw the error
      throw error;
    }
  }
}

/**
 * Extracts the function call result from the API response
 * 
 * @param {Object} response - The API response object
 * @param {string} functionName - The expected function name
 * @returns {Object|null} - The function call result or null if not found
 * @private
 */
function extractFunctionCall(response, functionName) {
  console.log(`EngageIQ: [api-service] Attempting to extract function call '${functionName}'`, { response: JSON.stringify(response).substring(0, 200) + '...' }); // Log truncated response
  try {
    // Check if response has the expected structure
    if (!response || !response.candidates || !response.candidates[0] ||
        !response.candidates[0].content || !response.candidates[0].content.parts) {
      console.error('EngageIQ: Invalid API response structure', response);
      return null;
    }
    
    // Look for the function call in the parts
    const parts = response.candidates[0].content.parts;
    
    for (const part of parts) {
      if (part.functionCall && part.functionCall.name === functionName) {
        try {
          // Return the entire functionCall object, not just the args
          return part.functionCall; 
        } catch (error) { // Keep catch block for unexpected issues
          console.error('EngageIQ: Error processing function call:', error);
          return null;
        }
      }
    }
    
    console.error(`EngageIQ: Function call '${functionName}' not found in response`);
    return null;
    
  } catch (error) {
    console.error('EngageIQ: Error extracting function call:', error);
    return null;
  }
}

/**
 * Creates a standardized API error object
 * 
 * @param {string} type - The error type from ERROR_TYPES
 * @param {string} message - The error message
 * @param {string} actionHint - Suggested action to resolve the error
 * @returns {Error} - Error object with additional properties
 * @private
 */
function createApiError(type, message, actionHint) {
  const error = new Error(message);
  error.isApiError = true;
  error.type = type;
  error.actionHint = actionHint;
  return error;
}

/**
 * Handles API errors by returning a standardized error response
 * 
 * @param {Error} error - The caught error
 * @param {string} operation - The operation that failed (for user messaging)
 * @returns {Object} - Standardized error response object
 * @private
 */
function handleApiError(error, operation) {
  // Default error information
  let errorType = ERROR_TYPES.INTERNAL;
  let errorMessage = `An unexpected error occurred during ${operation}.`;
  let actionHint = 'Please try again later.';
  
  // Use the structured error info if available
  if (error.isApiError) {
    errorType = error.type;
    errorMessage = error.message;
    actionHint = error.actionHint;
  } 
  // Handle network errors
  else if (error instanceof TypeError && error.message.includes('network')) {
    errorType = ERROR_TYPES.NETWORK;
    errorMessage = 'Network error. Unable to reach the API server.';
    actionHint = 'Check your internet connection and try again.';
  }
  // Handle unexpected errors
  else {
    console.error(`EngageIQ: Unhandled error in ${operation}:`, error);
  }
  
  return {
    success: false,
    error: errorMessage,
    errorType: errorType,
    actionHint: actionHint,
  };
}

/**
 * Cleans and processes post content for API requests
 * 
 * @param {string} text - The raw post text
 * @returns {string} - The processed text
 * @private
 */
function cleanPostContent(text) {
  if (!text) return '';

  // 1. Trim whitespace
  let processed = text.trim();

  // 2. Collapse multiple whitespace characters into a single space
  processed = processed.replace(/\s+/g, ' ');

  // 3. Escape characters that would break JSON strings when interpolated
  //    (specifically backslash and double quote)
  //    Also escape common control characters like newline, carriage return, tab
  processed = processed.replace(/\\/g, '\\\\') // Escape backslashes FIRST
                     .replace(/"/g, '\\"')  // Escape double quotes
                     .replace(/\n/g, '\\n')  // Escape newlines
                     .replace(/\r/g, '\\r')  // Escape carriage returns
                     .replace(/\t/g, '\\t'); // Escape tabs

  // 4. Limit length to prevent token overflow (after escaping)
  const MAX_LENGTH = 2000;
  if (processed.length > MAX_LENGTH) {
    // Find the last space within the limit to avoid cutting mid-word
    const lastSpaceIndex = processed.substring(0, MAX_LENGTH).lastIndexOf(' ');
    const cutOffIndex = lastSpaceIndex !== -1 ? lastSpaceIndex : MAX_LENGTH;
    processed = processed.substring(0, cutOffIndex) + '...';
  }

  return processed;
}

/**
 * Formats and validates direction suggestions
 * 
 * @param {Array} directions - Raw direction objects from API
 * @returns {Array} - Formatted and validated directions
 * @private
 */
function formatDirections(directions) {
  if (!directions || !Array.isArray(directions)) {
    console.error('EngageIQ: Invalid directions data:', directions);
    return [];
  }
  
  // Process each direction and ensure it has required fields
  return directions.map((direction, index) => {
    // Ensure all required fields exist
    return {
      id: `direction_${index + 1}`,
      title: direction.title || `Direction ${index + 1}`,
      description: direction.description || 'No description available',
      emoji: direction.emoji || '💬',
    };
  });
}

/**
 * Formats and validates comment suggestions
 * 
 * @param {Array} comments - Raw comment objects from API
 * @returns {Array} - Formatted and validated comment suggestions
 * @private
 */
function formatSuggestions(comments) {
  if (!comments || !Array.isArray(comments)) {
    console.error('EngageIQ: Invalid comment suggestions data:', comments);
    return [];
  }
  
  // Map comment types to LinkedIn reaction types
  const reactionTypes = ['like', 'celebrate', 'support', 'love', 'insightful', 'funny'];
  
  // Process each comment and map to reaction types
  return comments.map((comment, index) => {
    // Use index to assign a reaction type (cycling through available types)
    const reactionType = reactionTypes[index % reactionTypes.length];
    
    return {
      id: reactionType,
      text: comment.text || 'No suggestion available',
      type: comment.type || 'medium',
      title: comment.title || `Suggestion ${index + 1}` // Add title here, with a fallback
    };
  });
}

/**
 * Helper function to create the prompt text requesting JSON output with escaped strings.
 * @param {string} directionTitle - The title of the selected direction
 * @param {string} processedText - The processed post content (or empty string)
 * @returns {string} The constructed prompt text.
 */
function createPromptText(directionTitle, processedText) {
  // Context text to include if post content is available
  const contextText = processedText
    ? `\n\nKeep the response in the same language as the original post if provided.\nOriginal post content for context: "${processedText}"`
    : '';

  // Construct the prompt
  return `Generate an array containing exactly 3 comment suggestion objects based on the direction "${directionTitle}".

 Each object in the array must have the following properties:
   - text: The comment text itself. Use paragraph breaks (double line breaks: \\n\\n) where appropriate for readability, especially for medium and detailed comments.
   - **Crucially, subtly include 1-2 relevant and professionally appropriate emojis within the comment text to add a human touch.** Avoid overuse or unprofessional emojis.
   - type: A string indicating the comment length (e.g., "short", "medium", "detailed").
   - title: A unique and descriptive title (3-6 words) that accurately summarizes the specific comment's content and tone. Do NOT use generic titles like "Short Comment" or "Suggestion 1".

 The output MUST be ONLY the JSON array, enclosed in \`\`\`json ... \`\`\` markers. Do NOT include any other text or explanations.
 Each "text" value in the JSON objects must be a valid JSON string, meaning any special characters within the comment text itself (like newlines, quotes, backslashes) MUST be properly escaped (e.g., newlines should be represented as \\n, quotes as ", backslashes as \\).${contextText}
   `;
}
