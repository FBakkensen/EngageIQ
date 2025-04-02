/**
 * EngageIQ Chrome Extension
 * Background Script - Service worker that runs in the background
 * 
 * This script serves as the central coordinator for the extension, handling messages
 * from content scripts and delegating to appropriate service modules.
 */

// Import service modules
import { generateComments } from './services/api-service.js';
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
 * Performs manifest validation when extension is installed or updated
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('EngageIQ: Extension installed or updated:', details.reason);

  // Perform manifest and asset verification
  if (details.reason === 'install' || details.reason === 'update') {
    console.log('EngageIQ: Running manifest and asset verification...');
    // We'll execute the verification script in the next update cycle
    setTimeout(() => {
      chrome.scripting
        .executeScript({
          target: { tabId: -1 }, // Run in the background context
          files: ['js/manifest_check.js'],
        })
        .catch((err) => {
          console.error(
            'EngageIQ: Error executing manifest check script:',
            err
          );
        });
    }, 1000);
  }
});
