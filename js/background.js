/**
 * EngageIQ Chrome Extension
 * Background Script - Service worker that runs in the background
 * 
 * This script serves as the central coordinator for the extension, handling messages
 * from content scripts and delegating to appropriate service modules.
 */

// Import service modules
import { generateComments, analyzeDirections, generateDirectionComments } from './services/api-service.js';
import { handleRegenerationRequest } from './services/regeneration-service.js';

console.log('EngageIQ: Background Script Loaded');

/**
 * Listen for messages from content scripts and route to appropriate handlers
 * This is the main entry point for all extension functionality triggered from the UI
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('EngageIQ: Background script received message:', message.type);

  // Handle different message types with switch statement
  switch (message.type) {
    case 'GENERATE_COMMENTS': {
      console.log('EngageIQ: Processing GENERATE_COMMENTS request');

      // Extract post content from message
      const postContent = message.postContent;
      if (!postContent) {
        console.error('EngageIQ: No post content provided in GENERATE_COMMENTS request');
        sendResponse({
          success: false,
          error: 'Missing post content',
          details: 'No content was provided to generate comments for',
        });
        return true;
      }

      // Call the generateComments function from api-service.js module
      generateComments(postContent, sendResponse);
      
      // Return true to indicate we'll respond asynchronously
      return true;
    }

    case 'ANALYZE_DIRECTIONS': {
      console.log('EngageIQ: Processing ANALYZE_DIRECTIONS request');

      // Extract post content from message
      const postContent = message.postContent;
      if (!postContent) {
        console.error('EngageIQ: No post content provided in ANALYZE_DIRECTIONS request');
        sendResponse({
          success: false,
          error: 'Missing post content',
          details: 'No content was provided to analyze for directions',
        });
        return true;
      }

      // Call the analyzeDirections function from api-service.js module
      analyzeDirections(postContent, sendResponse);
      
      // Return true to indicate we'll respond asynchronously
      return true;
    }

    case 'GENERATE_DIRECTION_COMMENTS': {
      console.log('EngageIQ: Processing GENERATE_DIRECTION_COMMENTS request');

      // Extract payload from message
      const payload = message.payload;
      if (!payload || !payload.direction || !payload.postContent) {
        console.error('EngageIQ: Invalid payload provided in GENERATE_DIRECTION_COMMENTS request');
        sendResponse({
          success: false,
          error: 'Missing required data',
          details: 'Direction and post content are required to generate comments',
        });
        return true;
      }

      // Call the generateDirectionComments function from api-service.js module
      generateDirectionComments(payload, sendResponse);
      
      // Return true to indicate we'll respond asynchronously
      return true;
    }

    case 'REGENERATE_LONGER':
    case 'REGENERATE_SHORTER': {
      console.log(`EngageIQ: Processing ${message.type} request`);
      
      // Call the handleRegenerationRequest function from regeneration-service.js module
      handleRegenerationRequest(message.type, message.payload, sendResponse);
      
      // Return true to indicate we'll respond asynchronously
      return true;
    }

    default: {
      console.warn('EngageIQ: Unknown message type received:', message.type);
      sendResponse({
        success: false,
        error: 'Unknown Command',
        details: `The command '${message.type}' is not recognized`,
      });
      return true;
    }
  }
});

/**
 * Listener for extension installation or update
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('EngageIQ: Extension installed or updated:', details.reason);
});
