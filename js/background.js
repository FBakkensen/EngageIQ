/**
 * EngageIQ Chrome Extension
 * Background Script Module - Main background script for the extension
 *
 * This script runs in the background and serves as a central coordinator.
 * It receives messages from content scripts and delegates to appropriate service modules.
 */

// Import service modules
import { regenerateComment as regenerateCommentService } from './services/regeneration-service.js';
import { analyzePostDirections, generateDirectionComments } from './services/smart-suggestions-api.js';
import { detectLanguage } from './services/language-service.js';

// Log background script initialization
console.log('EngageIQ: Background Script Initialized');

// Set up message listener for content script requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Basic validation
  if (!message || !message.type) {
    console.warn('EngageIQ: Received invalid message format');
    sendResponse({ success: false, error: 'Invalid message format' });
    return false; // Indicate synchronous response is not needed
  }

  // Handle different message types
  switch (message.type) {
    // Comment regeneration (for length adjustment)
    case 'REGENERATE_COMMENT':
      handleRegenerateComment(message, sendResponse);
      return true; // Keep channel open for async response

    // Regeneration for specific length adjustments (longer/shorter)
    // Note: These messages originate from message-service.js relayRegenerationRequest
    case 'REGENERATE_LONGER':
      // Construct the expected message format for handleRegenerateComment explicitly
      // Access data correctly from message.payload
      handleRegenerateComment(
        {
          reactionType: message.payload.reactionType, 
          originalText: message.payload.originalText,
          lengthAction: 'longer', // Explicitly set lengthAction
          languageCode: message.payload.languageCode // Include language code
        },
        sendResponse
      );
      return true; // Keep channel open for async response

    case 'REGENERATE_SHORTER':
      // Construct the expected message format for handleRegenerateComment explicitly
      // Access data correctly from message.payload
      handleRegenerateComment(
        {
          reactionType: message.payload.reactionType, 
          originalText: message.payload.originalText,
          lengthAction: 'shorter', // Explicitly set lengthAction
          languageCode: message.payload.languageCode // Include language code
        },
        sendResponse
      );
      return true; // Keep channel open for async response

    // Direction analysis for Smart Suggestions
    case 'ANALYZE_DIRECTIONS':
      handleAnalyzeDirections(message, sendResponse);
      return true; // Keep channel open for async response
    
    // Direction-based comment generation for Smart Suggestions
    case 'GENERATE_DIRECTION_COMMENTS':
      handleGenerateDirectionComments(message, sendResponse);
      return true; // Keep channel open for async response
    
    // Unknown message type
    default:
      console.warn(`EngageIQ: Unknown message type: ${message.type}`);
      sendResponse({ success: false, error: 'Unknown message type' });
      return false;
  }
});

/**
 * Handles 'REGENERATE_COMMENT' messages
 * @param {Object} message - The message from the content script (should include originalText, lengthAction, reactionType, languageCode)
 * @param {Function} sendResponse - Function to send the response back
 */
async function handleRegenerateComment(message, sendResponse) {
  try {
    // Validate message contains required data
    if (!message.originalText || !message.lengthAction || !message.reactionType || !message.languageCode) { 
      console.error('EngageIQ: Missing required data for regeneration:', message); // Log missing data
      sendResponse({
        success: false,
        error: 'Missing required data for regeneration (originalText, lengthAction, reactionType, languageCode)' 
      });
      return;
    }
    
    // Determine length adjustment
    const makeLonger = message.lengthAction === 'longer';

    // Call the comment service to regenerate the comment
    // API Key is handled internally by api-service.js now
    const newText = await regenerateCommentService(
      message.originalText,
      message.reactionType, 
      makeLonger,
      message.languageCode // Pass language code
    );
    sendResponse({ success: true, payload: { newText: newText, reactionType: message.reactionType } });
    
  } catch (error) {
    console.error('EngageIQ: Error regenerating comment:', error);
    sendResponse({
      success: false,
      error: 'Failed to regenerate comment',
      details: error.message
    });
  }
}

/**
 * Handles 'ANALYZE_DIRECTIONS' messages
 * @param {Object} message - The message from the content script
 * @param {Function} sendResponse - Function to send the response back
 */
async function handleAnalyzeDirections(message, sendResponse) {
  try {
    // Validate message contains required data
    if (!message.postContent || !message.postContent.text) {
      sendResponse({ success: false, error: 'Missing post content text' });
      return;
    }

    // --- Phase 2 Integration: Detect Language ---
    const languageCode = await detectLanguage(message.postContent.text);
    console.log(`EngageIQ: Detected language code: ${languageCode}`);
    // --- End Phase 2 Integration ---

    // Call the API service to analyze directions
    const apiResponse = await analyzePostDirections(message.postContent, languageCode);

    // Send the response back to the content script
    if (apiResponse.success) {
      sendResponse({
        success: true,
        directions: apiResponse.directions,
        modelInfo: apiResponse.modelInfo || null,
        languageCode: languageCode, // Include language code here
      });
    } else {
      sendResponse({
        success: false,
        error: apiResponse.error || 'Failed to analyze directions',
        details: apiResponse.details,
        actionHint: apiResponse.actionHint,
        errorType: apiResponse.errorType
      });
    }
    
  } catch (error) {
    console.error('EngageIQ: Error analyzing directions:', error);
    sendResponse({
      success: false,
      error: 'Failed to analyze post for directions',
      details: error.message,
      actionHint: error.actionHint || 'Please try again',
      errorType: error.type || 'unknown_error'
    });
  }
}

/**
 * Handles 'GENERATE_DIRECTION_COMMENTS' messages
 * @param {Object} message - The message from the content script
 * @param {Function} sendResponse - Function to send the response back
 */
async function handleGenerateDirectionComments(message, sendResponse) {
  try {
    // Validate message contains required data
    if (!message.payload || !message.payload.direction || !message.payload.postContent || typeof message.payload.languageCode === 'undefined') {
      sendResponse({
        success: false,
        error: 'Missing required data for direction-based comment generation'
      });
      return;
    }
    
    const { direction, postContent, languageCode } = message.payload;

    // Call the API service to generate direction-based comments
    const response = await generateDirectionComments(
      direction,
      postContent,
      languageCode // Pass language code here
    );
    sendResponse(response);
    
  } catch (error) {
    console.error('EngageIQ: Error generating direction comments:', error);
    sendResponse({
      success: false,
      error: 'Failed to generate direction-based comments',
      details: error.message,
      actionHint: error.actionHint || 'Please try again',
      errorType: error.type || 'unknown_error'
    });
  }
}

/**
 * Listener for extension installation or update
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('EngageIQ: Extension installed or updated:', details.reason);
});
