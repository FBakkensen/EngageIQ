/**
 * EngageIQ Chrome Extension
 * Comment Generation Module
 * 
 * This module provides functions and schemas specifically for generating LinkedIn comment suggestions.
 * It encapsulates the comment creation logic, formats, and specialized processing.
 */

// Import required dependencies
import { callGeminiAPI } from './api-service.js';
import { GENERATION_SCHEMA, REGENERATION_SCHEMA } from '../models/gemini-model.js';

/**
 * Creates the prompt for generating LinkedIn comment suggestions based on post content.
 * 
 * @param {string} postText - The LinkedIn post text to generate comments for
 * @returns {string} - The formatted prompt for the AI model
 */
function createCommentGenerationPrompt(postText) {
  return `
    You are an AI assistant helping generate high-quality, contextually relevant comment suggestions for a LinkedIn post.
    
    Here is the LinkedIn post content to analyze:
    "${postText}"
    
    Please generate 6 different comment suggestions, each corresponding to one of LinkedIn's standard reaction types:
    1. Like - A general positive comment about the post content
    2. Celebrate - A comment celebrating an achievement or milestone mentioned
    3. Support - A comment showing support or encouragement
    4. Love - A comment expressing enthusiasm or appreciation
    5. Insightful - A comment that adds depth or perspective
    6. Funny - A lighthearted or humorous comment (but still professional)
    
    Each comment should be:
    - Professional and appropriate for a business network
    - Contextually relevant to the post content
    - Between 1-3 sentences (not too long)
    - Natural sounding (as if written by a human)
    - Free of excessive emoji use (minimal emoji is ok)
    - Varying in length and style across the different suggestions
    
    Return your suggestions using the provided function call format. Do not include any additional text.
  `;
}

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
    Output *only* the regenerated comment text, nothing else.
  `;
}

/**
 * Creates a request body for the comment generation API call.
 * 
 * @param {string} prompt - The prompt text for the API
 * @returns {Object} Request body object
 */
function createGenerationRequestBody(prompt) {
  return {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [
      {
        function_declarations: [
          {
            name: 'generateLinkedInComments',
            description: 'Generate LinkedIn comment suggestions for different reaction types',
            parameters: GENERATION_SCHEMA,
          },
        ],
      },
    ],
    tool_config: {
      function_calling_config: {
        mode: 'ANY',
        allowed_function_names: ['generateLinkedInComments'],
      },
    },
    safety_settings: getSafetySettings(),
  };
}

/**
 * Creates a request body for the comment regeneration API call.
 * 
 * @param {string} prompt - The prompt text for the API
 * @returns {Object} Request body object
 */
function createRegenerationRequestBody(prompt) {
  return {
    contents: [{ parts: [{ text: prompt }] }],
    safety_settings: getSafetySettings(),
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
  
  // Check for safety blocks
  if (data.promptFeedback && data.promptFeedback.blockReason && data.promptFeedback.blockReason !== 'NONE') {
    console.error(`EngageIQ: Prompt blocked due to ${data.promptFeedback.blockReason}`);
    throw new Error(`Prompt blocked: ${data.promptFeedback.blockReason}`);
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
  
  return comments;
}

/**
 * Processes the API response from a comment regeneration request.
 * 
 * @param {Object} data - The API response data
 * @returns {string} The regenerated comment text
 * @throws {Error} If the response format is invalid
 */
function processRegenerationResponse(data) {
  if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
    const regeneratedText = data.candidates[0].content.parts[0].text.trim();
    console.log('EngageIQ: [comment-generation RAW RESPONSE] Text extracted:', JSON.stringify(regeneratedText)); 
    return regeneratedText;
  } else {
    // Handle potential errors or unexpected formats
    console.error('EngageIQ: Failed to extract text from regeneration response:', data);
    
    // Check for safety blocks
    if (data?.promptFeedback?.blockReason && data.promptFeedback.blockReason !== 'NONE') {
      console.error(`EngageIQ: Regeneration prompt blocked due to ${data.promptFeedback.blockReason}`);
      throw new Error(`Prompt blocked: ${data.promptFeedback.blockReason}`);
    }
    
    // Check finish reason if text is missing
    const finishReason = data?.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
       console.error(`EngageIQ: Regeneration stopped due to ${finishReason}`);
       throw new Error(`Generation stopped: ${finishReason}`);
    }

    throw new Error('Invalid regeneration response format or missing text content.');
  }
}

/**
 * Generates comment suggestions for a LinkedIn post.
 * 
 * @param {string} postText - The LinkedIn post text to generate comments for
 * @param {string} apiKey - The Gemini API key
 * @returns {Promise<Object>} - Promise resolving to an object containing comment suggestions
 */
async function generateCommentSuggestions(postText, apiKey) {
  console.log('EngageIQ: Generating comment suggestions');
  
  // Create the prompt for generation
  const prompt = createCommentGenerationPrompt(postText);
  
  // Create request body
  const requestBody = createGenerationRequestBody(prompt);
  
  // Make the API call
  const response = await callGeminiAPI(requestBody, apiKey);
  
  // Process the response
  return processGenerationResponse(response);
}

/**
 * Regenerates a comment with adjusted length.
 * 
 * @param {string} originalText - The original comment text
 * @param {string} reactionType - The LinkedIn reaction type (like, celebrate, etc.)
 * @param {boolean} makeLonger - True to make comment longer, false to make it shorter
 * @param {string} apiKey - The Gemini API key
 * @returns {Promise<string>} - Promise resolving to the regenerated comment text
 */
async function regenerateCommentWithLength(originalText, reactionType, makeLonger, apiKey) {
  console.log(`EngageIQ: Regenerating comment to make it ${makeLonger ? 'longer' : 'shorter'}`);
  
  // Create the prompt for regeneration
  const prompt = createCommentRegenerationPrompt(originalText, reactionType, makeLonger);
  
  // Create request body
  const requestBody = createRegenerationRequestBody(prompt);
  
  // Make the API call
  const response = await callGeminiAPI(requestBody, apiKey);
  
  // Process the response
  return processRegenerationResponse(response);
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
  generateCommentSuggestions,
  regenerateCommentWithLength,
  formatCommentSuggestions,
  processGenerationResponse,
  processRegenerationResponse,
  createGenerationRequestBody,
  createRegenerationRequestBody,
  createCommentRegenerationPrompt,
  createCommentGenerationPrompt
};
