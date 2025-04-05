/**
 * EngageIQ Chrome Extension
 * Comment Generation Module
 * 
 * This module provides functions and schemas specifically for generating LinkedIn comment suggestions.
 * It encapsulates the comment creation logic, formats, and specialized processing.
 */

// Import required dependencies
import { callGeminiAPI } from './api-service.js';
import { UNIFIED_COMMENT_SCHEMA } from '../models/gemini-model.js';

/**
 * Creates the prompt for regenerating a LinkedIn comment with adjusted length.
 * 
 * @param {string} originalText - The original comment text
 * @param {string} reactionType - The LinkedIn reaction type (like, celebrate, etc.)
 * @param {boolean} makeLonger - True to make comment longer, false to make it shorter
 * @param {string} languageCode - The ISO 639-1 language code (e.g., 'en', 'es').
 * @returns {string} - The formatted prompt for the AI model
 */
function createCommentRegenerationPrompt(originalText, reactionType, makeLonger, languageCode) {
  const lengthInstruction = makeLonger ? 'longer' : 'shorter';
  // Construct language instruction, handling potential null/undefined languageCode
  const languageInstruction = languageCode 
    ? `Ensure the regenerated comment is in the language with ISO code: ${languageCode}.`
    : 'Ensure the regenerated comment is in the same language as the original comment.'; // Fallback
  
  return `
    You are an AI assistant helping refine a comment for a LinkedIn post.
    The original comment provided is for the '${reactionType}' reaction.
    Original comment: "${originalText}"

    Please regenerate this comment to make it ${lengthInstruction} (roughly 1 sentence ${lengthInstruction} than the original).
    Maintain the original tone and professional style suitable for LinkedIn.
    Use paragraph breaks (double line breaks: \\n\\n) where appropriate to improve readability.
    Focus solely on adjusting the length based on the original comment's content and intent.
    ${languageInstruction}
    When calling the 'provideComment' function, ensure the 'commentText' argument contains the complete regenerated text, including the necessary \\n\\n line breaks for readability. Do not add any other text outside the function call.
  `;
}

/**
 * Creates a request body for the comment regeneration API call.
 * 
 * @param {string} prompt - The prompt text for the API
 * @returns {Object} Request body object
 * @private
 */
function createRegenerationRequestBody(prompt) {
  return {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [
      {
        function_declarations: [
          {
            name: 'provideComment',
            description: 'Provide the regenerated LinkedIn comment.',
            parameters: UNIFIED_COMMENT_SCHEMA,
          },
        ],
      },
    ],
    tool_config: {
      function_calling_config: {
        mode: 'ANY', // <-- Reverted back to ANY based on user correction
        allowed_function_names: ['provideComment'],
      },
    },
    safety_settings: [
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
    ],
  };
}

/**
 * Extracts the comment text from a Gemini API response using function calling for REGENERATION.
 * Assumes the response uses the 'provideComment' function with a 'commentText' argument, or provides direct text.
 * 
 * @param {Object} data - The raw API response data.
 * @param {string} operationName - A name for the operation (e.g., 'Regeneration') for logging.
 * @returns {string|null} The extracted comment text or null if it's empty or missing.
 * @throws {Error} If the response format is invalid (other than empty text) or blocked by safety settings.
 */
function extractCommentFromFunctionCall(data, operationName = 'Comment Processing') {
  console.log(`EngageIQ: [${operationName}] Processing API response:`, JSON.stringify(data, null, 2));

  try {
    // Basic validation
    if (!data || !data.candidates || !data.candidates.length) {
      throw new Error('Invalid response structure: Missing candidates.');
    }

    const candidate = data.candidates[0];

    // Check for safety blocks first
    if (candidate.finishReason === 'SAFETY' || (data.promptFeedback && data.promptFeedback.blockReason && data.promptFeedback.blockReason !== 'NONE')) {
      const reason = candidate?.finishReason || data?.promptFeedback?.blockReason || 'Unknown Safety Reason';
      console.error(`EngageIQ: [${operationName}] Prompt blocked due to safety settings: ${reason}`);
      throw new Error(`Prompt blocked by safety settings: ${reason}`);
    }
    
    // Check for other non-STOP finish reasons
    if (candidate.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'FUNCTION_CALL') {
        console.error(`EngageIQ: [${operationName}] Stopped due to ${candidate.finishReason}`);
        throw new Error(`${operationName} stopped unexpectedly: ${candidate.finishReason}`);
    }

    // Extract from function call
    const functionCall = candidate?.content?.parts?.[0]?.functionCall;
    if (functionCall && functionCall.name === 'provideComment') {
      // Handle case where function call exists but args or commentText might be missing/empty
      const commentText = functionCall.args?.commentText?.trim(); 
      if (!commentText) {
        console.warn(`EngageIQ: [${operationName}] Function call 'provideComment' received but 'commentText' argument is missing or empty. Returning null.`);
        return null; // Return null if commentText is empty or missing
      }
      console.log(`EngageIQ: [${operationName}] Extracted text from functionCall.args.commentText:`, JSON.stringify(commentText));
      return commentText;
    }

    // Fallback: Check if text is directly available (can happen with AUTO mode)
     if (candidate?.content?.parts?.[0]?.text) {
       const commentText = candidate.content.parts[0].text.trim();
       if (!commentText) {
         console.warn(`EngageIQ: [${operationName}] Extracted direct text is empty. Returning null.`);
         return null; // Return null if direct text is empty
       }
       console.warn(`EngageIQ: [${operationName}] Extracted text from direct text path (using AUTO mode):`, JSON.stringify(commentText));
       return commentText; // Return direct text if found
     }

    // If no function call AND no direct text found
    throw new Error('Invalid response format: Could not find commentText in function call arguments or direct text.');

  } catch (error) {
    console.error(`EngageIQ: Error processing ${operationName} response:`, error);
    // Re-throw the error to be handled by the calling function
    throw error; 
  }
}

/**
 * Regenerates a comment with a specified length adjustment (longer or shorter).
 * This function handles prompt creation, API call, and response processing.
 * 
 * @param {string} originalText - The original comment text
 * @param {string} reactionType - The LinkedIn reaction type (like, celebrate, etc.)
 * @param {boolean} makeLonger - True to make comment longer, false to make it shorter
 * @param {string} languageCode - The ISO 639-1 language code (e.g., 'en', 'es').
 * @returns {Promise<string|null>} - Promise resolving to the regenerated comment text or null if empty/missing.
 */
async function regenerateCommentWithLength(originalText, reactionType, makeLonger, languageCode) {
  console.log(`EngageIQ: Regenerating comment to make it ${makeLonger ? 'longer' : 'shorter'}`);
  
  // Create the prompt for regeneration
  const prompt = createCommentRegenerationPrompt(originalText, reactionType, makeLonger, languageCode);
  
  // Create request body
  const requestBody = createRegenerationRequestBody(prompt);
  
  // Make the API call
  const response = await callGeminiAPI(requestBody);
  
  // Process the response using the unified function
  return extractCommentFromFunctionCall(response, 'Regeneration');
}

/**
 * Formats the raw comment suggestions into a structured format for the UI.
 * 
 * @param {Object} comments - Raw comment suggestions object
 * @returns {Array} - Array of formatted suggestion objects
 */
function formatCommentSuggestions(comments) {
  return [
    {
      id: 'like',
      text: comments.like,
      tone: 'positive',
      emoji: 'ud83dudc4d', // 👍
    },
    {
      id: 'celebrate',
      text: comments.celebrate,
      tone: 'congratulatory',
      emoji: 'ud83cudf89', // 🎉
    },
    {
      id: 'support',
      text: comments.support,
      tone: 'supportive',
      emoji: 'ud83dude4c', // 🙌
    },
    {
      id: 'love',
      text: comments.love,
      tone: 'enthusiastic',
      emoji: 'u2764ufe0f', // ❤️
    },
    {
      id: 'insightful',
      text: comments.insightful,
      tone: 'thoughtful',
      emoji: 'ud83dudca1', // 💡
    },
    {
      id: 'funny',
      text: comments.funny,
      tone: 'humorous',
      emoji: 'ud83dude04', // 😄
    },
  ];
}

// Export functions for use by other modules
export {
  regenerateCommentWithLength,
  extractCommentFromFunctionCall,
  formatCommentSuggestions,
  createRegenerationRequestBody,
  createCommentRegenerationPrompt
};
