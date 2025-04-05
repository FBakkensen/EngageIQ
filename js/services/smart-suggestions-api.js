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
  getModelTemperature,
} from '../models/gemini-model.js';
import { getCurrentModel } from '../utils/storage-utils.js';
import {
  callGeminiAPI,
  ERROR_TYPES as API_ERROR_TYPES, // Alias to avoid name collision if needed later
  createApiError as createBaseApiError // Alias for clarity
} from './api-service.js';

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
    const model = await getCurrentModel();
    const temperature = getModelTemperature(model);
    
    if (!postContent || !postContent.text) {
      throw createBaseApiError(
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
    const response = await callGeminiAPI(payload, 'Analyze Post Directions');
    
    // Extract the function call result from the response
    const directionsFunctionCall = extractFunctionCall(response, "generateDirections");
    
    if (!directionsFunctionCall) {
      throw createBaseApiError(
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
    const model = await getCurrentModel();
    const temperature = getModelTemperature(model);
    
    if (!direction || !direction.title) {
      throw createBaseApiError(
        ERROR_TYPES.INTERNAL,
        'Direction data is missing or invalid',
        'Please select a valid direction'
      );
    }
    
    if (!postContent || !postContent.text) {
      throw createBaseApiError(
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
    const response = await callGeminiAPI(payload, `Generate Direction Comments (${direction.title})`);
    
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
       throw createBaseApiError(
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
    const modelMatch = model.match(/models\/([^:]+):/);
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
 * Handles API errors by returning a standardized error response
 * 
 * @param {Error} error - The caught error
 * @param {string} operation - The operation that failed (for user messaging)
 * @returns {Object} - Standardized error response object
 * @private
 */
function handleApiError(error, operation) {
  console.error(`EngageIQ: Error during ${operation}:`, error);
  
  // Default error response
  let errorResponse = {
    success: false,
    error: 'An unexpected error occurred.',
    errorType: 'unknown_error',
    actionHint: 'Check console logs for more details',
  };
  
  // If it's a structured API error from our service or the centralized one
  if (error.isApiError) {
    errorResponse.error = error.message;
    errorResponse.errorType = error.errorType || API_ERROR_TYPES.UNKNOWN; // Use the type from the error
    errorResponse.details = error.details || {}; // Include details if available
    errorResponse.actionHint = error.actionHint || 'Check console logs for more details';
    
    switch (error.errorType) {
      case ERROR_TYPES.API_KEY:
      case 'api_key_error': // Check alias if needed
        errorResponse.actionHint = error.actionHint || 'Please verify your API key in the extension settings.';
        break;
      case ERROR_TYPES.RATE_LIMIT:
      case 'rate_limit_error':
        errorResponse.actionHint = error.actionHint || 'You have exceeded the API rate limit. Please wait and try again later.';
        break;
      case ERROR_TYPES.TIMEOUT:
      case 'timeout_error':
        errorResponse.actionHint = error.actionHint || 'The request timed out. Check your connection or try again.';
        break;
      case ERROR_TYPES.CONTENT_FILTER:
      case 'content_filter_error':
        errorResponse.actionHint = error.actionHint || 'The content was filtered. Please adjust your input and try again.';
        break;
      case ERROR_TYPES.PARSING:
      case 'parsing_error':
        errorResponse.actionHint = error.actionHint || 'Failed to parse the response. Please try again or contact support.';
        break;
      case ERROR_TYPES.INTERNAL:
      case 'internal_error':
        errorResponse.actionHint = error.actionHint || 'An internal error occurred. Please try again later.';
        break;
    }
  }
  
  return errorResponse;
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
