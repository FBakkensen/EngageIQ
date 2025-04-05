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
 * @returns {string} - The formatted prompt for the AI model
 */
function createCommentRegenerationPrompt(originalText, reactionType, makeLonger) {
  const lengthInstruction = makeLonger ? 'longer' : 'shorter';
  
  return `
    You are an AI assistant helping refine a comment for a LinkedIn post.
    The original comment provided is for the '${reactionType}' reaction.
    Original comment: "${originalText}"

    Please regenerate this comment to make it ${lengthInstruction} (roughly 1 sentence ${lengthInstruction} than the original).
    Maintain the original tone, language, and professional style suitable for LinkedIn.
    Use paragraph breaks (double line breaks: \n\n) where appropriate to improve readability.
    Focus solely on adjusting the length based on the original comment's content and intent.
    Ensure the regenerated comment is in the **same language** as the original comment.
    When calling the 'provideComment' function, ensure the 'commentText' argument contains the complete regenerated text, including the necessary \n\n line breaks for readability. Do not add any other text outside the function call.
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
        mode: 'ANY',
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
 * Returns the standard safety settings used for all comment generation/regeneration requests.
 * 
 * @returns {Array} Array of safety setting objects
 */
function getSafetySettings() {
  return [
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
}

/**
 * Extracts the comment text from a Gemini API response using function calling for REGENERATION.
 * Assumes the response uses the 'provideComment' function with a 'commentText' argument.
 * 
 * @param {Object} data - The raw API response data.
 * @param {string} operationName - A name for the operation (e.g., 'Regeneration') for logging.
 * @returns {string} The extracted comment text.
 * @throws {Error} If the response format is invalid, text is missing, or blocked by safety settings.
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
    if (functionCall && functionCall.name === 'provideComment' && functionCall.args?.commentText) {
      const commentText = functionCall.args.commentText.trim();
       console.log(`EngageIQ: [${operationName}] Extracted text from functionCall.args.commentText:`, JSON.stringify(commentText));
      if (!commentText) {
         throw new Error('Extracted comment text is empty.');
      }
      return commentText;
    }

    // Fallback: Check if text is directly available (shouldn't happen with function calling mode 'ANY' and correct prompt)
     if (candidate?.content?.parts?.[0]?.text) {
       const commentText = candidate.content.parts[0].text.trim();
       console.warn(`EngageIQ: [${operationName}] Extracted text from direct text path (unexpected):`, JSON.stringify(commentText));
       if (!commentText) {
         throw new Error('Extracted direct text is empty.');
       }
       return commentText; // Return direct text if found as a fallback
     }

    // If no text found in expected places
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
 * @returns {Promise<string>} - Promise resolving to the regenerated comment text
 */
async function regenerateCommentWithLength(originalText, reactionType, makeLonger) {
  console.log(`EngageIQ: Regenerating comment to make it ${makeLonger ? 'longer' : 'shorter'}`);
  
  // Create the prompt for regeneration
  const prompt = createCommentRegenerationPrompt(originalText, reactionType, makeLonger);
  
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
