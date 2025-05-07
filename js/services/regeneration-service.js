/**
 * EngageIQ Chrome Extension
 * Regeneration Service Module
 * 
 * This module provides functionality specifically for regenerating comments with adjusted length.
 * It handles the regeneration requests, processing, and response formatting.
 */


/**
 * Handles the regeneration request logic.
 * This function is now async and contains the core logic previously split.
 * 
 * @param {Object} message - The message object containing request details.
 * @returns {Promise<string>} - Promise resolving to the regenerated text.
 * @throws {ApiError} If validation or API call fails.
 */
async function handleRegenerateRequest(message) {
  console.log('EngageIQ: Handling regeneration request');
  const { originalText, reactionType, type: requestType, languageCode } = message.data; // Access data payload

  // Basic validation
  if (!originalText || !reactionType) {
    console.error('EngageIQ: Invalid regeneration request - missing originalText or reactionType in message.data');
    // Use createApiError if available and appropriate, otherwise a standard Error
    // Assuming createApiError is NOT imported here, use standard Error
    throw new Error('Invalid regeneration request payload.'); 
  }

  console.log(`EngageIQ: Regenerating for reaction: ${reactionType}`);

  const makeLonger = requestType === 'REGENERATE_LONGER';

  // Regenerate the comment directly calling the internal function
  const newText = await regenerateComment(originalText, reactionType, makeLonger, languageCode);
  console.log(`EngageIQ: Successfully regenerated comment for ${reactionType}`);
  return newText;
}

/**
 * Internal function to regenerate a comment.
 * 
 * @param {string} originalText - The original comment text.
 * @param {string} reactionType - The LinkedIn reaction associated with the comment.
 * @param {boolean} makeLonger - Whether to make the comment longer (true) or shorter (false).
 * @param {string} languageCode - The ISO 639-1 language code (e.g., 'en', 'es').
 * @returns {Promise<string>} A promise that resolves with the regenerated comment text.
 * @throws {ApiError} Throws an ApiError if any step fails.
 */
async function regenerateComment(originalText, reactionType, makeLonger, languageCode) {
  const operationName = `Regenerate Comment (${makeLonger ? 'Longer' : 'Shorter'})`;
  console.log(`EngageIQ: [${operationName}] Starting regeneration with language code: ${languageCode || 'Not provided'}.`);
 
  // 1. Validate Input (Could add more checks if needed)
  if (typeof originalText !== 'string' || originalText.trim() === '' || typeof reactionType !== 'string' || reactionType.trim() === '') {
    // Assuming createApiError is NOT imported, throw standard Error
    console.error(`EngageIQ: [${operationName}] Invalid input provided.`);
    throw new Error('Invalid input: Original text and reaction type are required.');
  }

  try {
    const model = await getCurrentModelByProvider(); // Get current model
    const requestType = makeLonger ? 'REGENERATE_LONGER' : 'REGENERATE_SHORTER';

    const apiRequest = {
        operation: 'regenerateComment', // Matches operation in api-service & api-provider
        requestType: requestType,
        originalText: originalText,
        reactionType: reactionType,
        model: model,
        // TODO: Propagate languageCode through apiRequest if OpenAI path is updated to use it
        // languageCode: languageCode, 
    };

    // Call the provider-agnostic API handler
    // The result should be the normalized string from callApiProvider
    const regeneratedText = await callApiProvider(apiRequest, { operation: 'regenerateComment' });

    // Check if the regeneration actually produced text
    if (!regeneratedText || (typeof regeneratedText === 'string' && regeneratedText.trim() === '')) {
      console.warn(`EngageIQ: [${operationName}] Regeneration returned null or empty text from callApiProvider.`);
      throw new Error('Failed to regenerate comment: The AI did not provide a new comment.');
    }

    console.log(`EngageIQ: [${operationName}] Regeneration successful via callApiProvider.`);
    return regeneratedText; // Directly return the string result
  } catch (error) {
    // Log the error here as well for context
    console.error(`EngageIQ: [${operationName}] Failed:`, error);
    // Re-throw the error to be handled by the caller (e.g., background.js)
    throw error; 
  }
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

// Import required dependencies
import { callApiProvider } from './api-provider.js';
import { getCurrentModelByProvider } from '../utils/storage-utils.js';

// Export functions for use by other modules
export {
  handleRegenerateRequest,
  regenerateComment,
  sanitizeRegeneratedText,
  analyzeTextDifference
};
