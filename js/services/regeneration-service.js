/**
 * EngageIQ Chrome Extension
 * Regeneration Service Module
 * 
 * This module provides functionality specifically for regenerating comments with adjusted length.
 * It handles the regeneration requests, processing, and response formatting.
 */

// Import required dependencies
import { getApiKey } from '../utils/storage-utils.js';
import { callGeminiAPI } from './api-service.js';
import { 
  createCommentRegenerationPrompt, 
  createRegenerationRequestBody,
  processRegenerationResponse 
} from './comment-generation.js';

/**
 * Handles a request to regenerate a comment, making it either longer or shorter.
 * 
 * @param {string} requestType - 'REGENERATE_LONGER' or 'REGENERATE_SHORTER'
 * @param {Object} payload - Contains originalText and reactionType
 * @param {function} sendResponse - Callback function to send the response back to the caller
 */
async function handleRegenerationRequest(requestType, payload, sendResponse) {
  console.log(`EngageIQ: Entering handleRegenerationRequest for ${requestType}`);

  try {
    // Get API key from storage
    const apiKey = await getApiKey();
    if (!apiKey) {
      console.error('EngageIQ: No API key found in storage for regeneration request');
      sendResponse({
        success: false,
        type: 'REGENERATION_ERROR',
        error: 'API_KEY_MISSING',
        details: 'API key is missing. Please set it in the extension options.',
        payload: { reactionType: payload?.reactionType },
      });
      return;
    }

    console.log('EngageIQ: API key retrieved successfully for regeneration.');

    // Validate payload
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

    const { originalText, reactionType } = payload;
    
    // Determine if we're making the comment longer or shorter
    const makeLonger = requestType === 'REGENERATE_LONGER';
    
    // Regenerate the comment
    const newText = await regenerateComment(originalText, reactionType, makeLonger, apiKey);
    console.log(`EngageIQ: Successfully regenerated comment for ${reactionType}`);

    // Send success response
    sendResponse({
      success: true,
      type: 'REGENERATION_SUCCESS',
      payload: {
        newText: newText,
        reactionType: reactionType,
      },
    });

  } catch (error) {
    console.error('EngageIQ: Error during regeneration process:', error);
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
 * Regenerates a comment with adjusted length.
 * 
 * @param {string} originalText - The original comment text
 * @param {string} reactionType - The LinkedIn reaction type (like, celebrate, etc.)
 * @param {boolean} makeLonger - True to make comment longer, false to make it shorter
 * @param {string} apiKey - The Gemini API key
 * @returns {Promise<string>} - Promise resolving to the regenerated comment text
 */
async function regenerateComment(originalText, reactionType, makeLonger, apiKey) {
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
 * Sanitizes the regenerated comment text.
 * Removes any unwanted characters, formatting, or inappropriate content.
 * 
 * @param {string} text - The regenerated comment text to sanitize
 * @returns {string} - The sanitized comment text
 */
function sanitizeRegeneratedText(text) {
  if (!text) return '';
  
  // Trim whitespace
  let sanitized = text.trim();
  
  // Remove any markdown formatting that might have been added
  sanitized = sanitized.replace(/\*\*/g, ''); // Remove bold formatting
  sanitized = sanitized.replace(/\*/g, '');    // Remove italic formatting
  sanitized = sanitized.replace(/^>\s/gm, ''); // Remove blockquote formatting
  
  // Remove any potential script tags or HTML
  sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Ensure the comment doesn't exceed a reasonable length
  const MAX_LENGTH = 500;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH) + '...';
  }
  
  return sanitized;
}

/**
 * Analyzes the difference between original and regenerated text.
 * 
 * @param {string} originalText - The original comment text
 * @param {string} regeneratedText - The regenerated comment text
 * @returns {Object} - An object containing analysis results
 */
function analyzeTextDifference(originalText, regeneratedText) {
  const originalLength = originalText.length;
  const regeneratedLength = regeneratedText.length;
  const lengthDifference = regeneratedLength - originalLength;
  const percentChange = Math.round((lengthDifference / originalLength) * 100);
  
  // Count sentences (roughly, by splitting on period, question mark, exclamation point)
  const sentenceEndPattern = /[.!?]+(?:\s|$)/;
  const originalSentences = originalText.split(sentenceEndPattern).filter(s => s.trim().length > 0).length;
  const regeneratedSentences = regeneratedText.split(sentenceEndPattern).filter(s => s.trim().length > 0).length;
  const sentenceDifference = regeneratedSentences - originalSentences;
  
  return {
    originalLength,
    regeneratedLength,
    lengthDifference,
    percentChange,
    originalSentences,
    regeneratedSentences,
    sentenceDifference,
    isLonger: lengthDifference > 0,
    isShorter: lengthDifference < 0,
    unchanged: lengthDifference === 0
  };
}

// Export functions for use by other modules
export {
  handleRegenerationRequest,
  regenerateComment,
  sanitizeRegeneratedText,
  analyzeTextDifference
};
