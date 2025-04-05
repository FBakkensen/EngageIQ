/**
 * EngageIQ Chrome Extension
 * Background Script Module - Main background script for the extension
 *
 * This script runs in the background and serves as a central coordinator.
 * It receives messages from content scripts and delegates to appropriate service modules.
 */

// Import service modules
import { generateComments, regenerateComment } from './services/comment-service.js';
import { analyzePostDirections, generateDirectionComments } from './services/smart-suggestions-api.js';

// Log background script initialization
console.log('EngageIQ: Background Script Initialized');

// Set up message listener for content script requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(`EngageIQ: Background received message: ${message.type}`);
  
  // Handle different message types
  switch (message.type) {
    // Standard comment generation
    case 'GENERATE_COMMENTS':
      handleGenerateComments(message, sendResponse);
      return true; // Keep channel open for async response
    
    // Comment regeneration (for length adjustment)
    case 'REGENERATE_COMMENT':
      handleRegenerateComment(message, sendResponse);
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
 * Handles 'GENERATE_COMMENTS' messages
 * @param {Object} message - The message from the content script
 * @param {Function} sendResponse - Function to send the response back
 */
async function handleGenerateComments(message, sendResponse) {
  try {
    console.log('EngageIQ: Handling GENERATE_COMMENTS request');
    
    // Validate message contains required data
    if (!message.postContent) {
      sendResponse({ success: false, error: 'Missing post content' });
      return;
    }
    
    // Call the comment service to generate suggestions
    const response = await generateComments(message.postContent);
    sendResponse(response);
    
  } catch (error) {
    console.error('EngageIQ: Error generating comments:', error);
    sendResponse({
      success: false,
      error: 'Failed to generate comments',
      details: error.message
    });
  }
}

/**
 * Handles 'REGENERATE_COMMENT' messages
 * @param {Object} message - The message from the content script
 * @param {Function} sendResponse - Function to send the response back
 */
async function handleRegenerateComment(message, sendResponse) {
  try {
    console.log('EngageIQ: Handling REGENERATE_COMMENT request');
    
    // Validate message contains required data
    if (!message.originalText || !message.lengthAction || !message.postContent) {
      sendResponse({
        success: false,
        error: 'Missing required data for regeneration'
      });
      return;
    }
    
    // Call the comment service to regenerate the comment
    const response = await regenerateComment(
      message.originalText,
      message.lengthAction,
      message.postContent
    );
    sendResponse(response);
    
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
    console.log('EngageIQ: Handling ANALYZE_DIRECTIONS request');
    
    // Validate message contains required data
    if (!message.postContent) {
      sendResponse({ success: false, error: 'Missing post content' });
      return;
    }
    
    // Call the API service to analyze directions
    const response = await analyzePostDirections(message.postContent);
    sendResponse(response);
    
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
    console.log('EngageIQ: Handling GENERATE_DIRECTION_COMMENTS request');
    
    // Validate message contains required data
    if (!message.payload || !message.payload.direction || !message.payload.postContent) {
      sendResponse({
        success: false,
        error: 'Missing required data for direction-based comment generation'
      });
      return;
    }
    
    // Call the API service to generate direction-based comments
    const response = await generateDirectionComments(
      message.payload.direction,
      message.payload.postContent
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
