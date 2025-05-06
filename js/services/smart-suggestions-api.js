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
  getModelTemperature,
} from '../models/gemini-model.js';
import { getCurrentModelByProvider } from '../utils/storage-utils.js';
import {
  callGeminiAPI,
  ERROR_TYPES as API_ERROR_TYPES, // Alias to avoid name collision if needed later
  createApiError as createBaseApiError // Alias for clarity
} from './api-service.js';
import { callApiProvider } from './api-provider.js';

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
 * @param {string} languageCode - The detected language code (e.g., 'en', 'es').
 * @returns {Promise<Object>} - Object containing an array of direction suggestions
 */
export async function analyzePostDirections(postContent, languageCode) {
  console.log('EngageIQ: Analyzing post for direction suggestions');
  
  try {
    // Prepare request data
    const model = await getCurrentModelByProvider();
    const temperature = getModelTemperature(model);
    
    if (!postContent || !postContent.text) {
      throw createBaseApiError(
        ERROR_TYPES.INTERNAL,
        'Post content is missing or invalid',
        'Please try again with a valid post'
      );
    }
    
    // Validate or default language code
    const targetLanguageCode = languageCode && typeof languageCode === 'string' && languageCode.length === 2 ? languageCode : 'en';
    console.log(`EngageIQ: [api-service] Generating directions in language: ${targetLanguageCode}`);

    // Process post text to extract meaningful content
    const processedText = cleanPostContent(postContent.text);
    
    // Build the API request payload
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `Analyze this LinkedIn post and suggest 3-5 different commenting approaches. Post content: "${processedText}"\n\n**CRITICAL: Generate the response ENTIRELY in the language with ISO code: ${targetLanguageCode}.**\n\nFor each approach, provide:\n1.  A short, catchy TITLE (2-5 words). **THIS TITLE MUST BE IN ${targetLanguageCode.toUpperCase()}.**\n2.  A brief DESCRIPTION (15-25 words) in ${targetLanguageCode}.\n3.  A single relevant EMOJI.\n\nFormat each suggestion like this, using "---" as a separator between suggestions:\nTITLE: [**Title MUST be in ${targetLanguageCode}**]\nDESCRIPTION: [Description in ${targetLanguageCode}]\nEMOJI: [Emoji]\n---\nTITLE: [**Title MUST be in ${targetLanguageCode}**]\nDESCRIPTION: [Description in ${targetLanguageCode}]\nEMOJI: [Emoji]\n---\n(Include 3-5 suggestions total)\n\n**REMINDER: ALL text, especially the TITLES, MUST be in the language: ${targetLanguageCode}.**`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: 1024, // Adjust as needed for text response
      },
      // Removed toolConfig and tools for plain text generation
    };
    
    // Make the API request with retry logic
    const request = {
      operation: 'analyzePostDirections',
      payload,
      model,
    };
    const response = await callApiProvider(request, { operation: 'Analyze Post Directions' });
    
    // --- New Logic: Parse plain text response ---
    let rawTextResponse;
    let parsedDirections = [];
    try {
      if (!response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error('EngageIQ: Missing text content in API response for directions.', response);
        throw new Error('Missing text content in API response for directions.');
      }
      rawTextResponse = response.candidates[0].content.parts[0].text.trim();
      
      // Remove <think>...</think> blocks if present
      rawTextResponse = rawTextResponse.replace(/<think>[\s\S]*?<\/think>\s*/g, '');
      
      // Split into individual suggestion blocks
      const suggestionBlocks = rawTextResponse.split('---').map(block => block.trim()).filter(Boolean);

      for (const block of suggestionBlocks) {
        const titleMatch = block.match(/^TITLE:\s*(.*)/im);
        const descriptionMatch = block.match(/^DESCRIPTION:\s*(.*)/im);
        const emojiMatch = block.match(/^EMOJI:\s*(.*)/im);

        if (titleMatch && descriptionMatch && emojiMatch) {
          parsedDirections.push({
            title: titleMatch[1].trim(),
            description: descriptionMatch[1].trim(),
            emoji: emojiMatch[1].trim(),
          });
        } else {
          console.warn('EngageIQ: Could not parse block:', block); // Log malformed blocks
        }
      }

      if (parsedDirections.length === 0) {
         throw new Error('Could not parse any valid directions from the text response.');
      }

    } catch (parseError) {
       console.error('EngageIQ: Failed to parse plain text response for directions:', parseError);
       console.error('EngageIQ: Raw text received:', rawTextResponse); // Log the text that failed parsing
       throw createBaseApiError(
         ERROR_TYPES.PARSING,
         `Failed to parse direction suggestions from text response. Details: ${parseError.message}`,
         'Try again or use a different post'
       );
    }
    // --- End New Logic ---
    
    // Format the parsed directions using the existing formatter
    const directions = formatDirections(parsedDirections); 
    
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
 * @param {string | null} languageCode - The desired language for the comments (e.g., 'en', 'es')
 * @returns {Promise<Object>} - Object containing an array of suggested comments
 */
export async function generateDirectionComments(direction, postContent, languageCode) {
  
  try {
    // Prepare request data
    const model = await getCurrentModelByProvider();
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
    
    // Validate or default language code
    const targetLanguageCode = languageCode && typeof languageCode === 'string' && languageCode.length === 2 ? languageCode : 'en';
    console.log(`EngageIQ: [api-service] Generating comments for direction: ${direction?.title} in language: ${targetLanguageCode}`);
    
    // Process post text to extract meaningful content
    const processedText = cleanPostContent(postContent.text);
    
    // Build the API request payload
    const payload = {
      contents: [
        {
          parts: [
            {
              text: createPromptText(direction.title, processedText, targetLanguageCode) // Pass language code
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
    const request = {
      operation: 'generateDirectionComments',
      payload,
      model,
    };
    const response = await callApiProvider(request, { operation: 'Generate Direction Comments' });
    
    // --- New Logic: Parse raw text response ---
    let rawTextResponse;
    let commentsArray;
    try {
      if (!response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error('EngageIQ: Missing text content in API response.', response);
        throw new Error('Missing text content in API response.');
      }
      rawTextResponse = response.candidates[0].content.parts[0].text.trim();
      
      // Remove <think>...</think> blocks if present
      rawTextResponse = rawTextResponse.replace(/<think>[\s\S]*?<\/think>\s*/g, '');
      
      // IMPROVED: Extract JSON content from markdown code blocks if present
      let cleanedText = rawTextResponse;
      
      // Check if the response contains a code block
      const codeBlockMatch = rawTextResponse.match(/```(?:json)?([\s\S]*?)```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        // Use the content inside the code block
        cleanedText = codeBlockMatch[1].trim();
      } else {
        // Otherwise try to remove code fences if they exist
        cleanedText = cleanedText.replace(/```json\s*/g, '');
        cleanedText = cleanedText.replace(/```\s*/g, '');
        cleanedText = cleanedText.trim();
      }
      
      // Attempt to parse the raw text as JSON
      commentsArray = JSON.parse(cleanedText);
      
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
 * Extracts meaningful content from post text
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
 * @param {string} targetLanguageCode - The target language code (e.g., 'en', 'es')
 * @returns {string} The constructed prompt text.
 */
function createPromptText(directionTitle, processedText, targetLanguageCode) {
  // Determine the language instruction based on the code
  const languageInstruction = targetLanguageCode === 'en'
    ? 'Generate the comments and titles in English.'
    : `Generate the comments AND TITLES in the language identified by the code: ${targetLanguageCode}.`;

  // Context text to include if post content is available
  const contextText = processedText
    ? `\n\nOriginal post content for context: "${processedText}"`
    : '';

  // Construct the prompt
  return `You are an AI assistant generating comment suggestions for a LinkedIn post based on a chosen direction.
The user chose the direction: "${directionTitle}".
${languageInstruction}
Generate 3 diverse comment suggestions following this direction.
Format the response STRICTLY as a JSON array of objects, with each object containing:
- text: The comment text itself (in ${targetLanguageCode}). Use paragraph breaks (double line breaks: \\n\\n) where appropriate for readability, especially for medium and detailed comments.
- type: A string indicating the comment length (e.g., "short", "medium", "detailed").
- title: A unique and descriptive title (3-6 words) that accurately summarizes the specific comment's content and tone. **THIS TITLE MUST ALSO BE IN ${targetLanguageCode.toUpperCase()}.** Do NOT use generic titles like "Short Comment" or "Suggestion 1".

JSON Output requirements:
- Output ONLY the JSON array.
- Do NOT include any introductory text like "Here are the suggestions:".
- Ensure all strings within the JSON are properly escaped (e.g., use \\" for quotes inside the comment strings).${contextText}`;
}
