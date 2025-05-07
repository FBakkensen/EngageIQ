/**
 * EngageIQ Chrome Extension
 * Direction Service Module - Handles the direction analysis and selection for Smart Suggestions
 *
 * This module is responsible for:
 * - Analyzing post content to generate direction suggestions
 * - Processing direction selections
 * - Managing the communication flow for the two-step commenting process
 */

// Import utility functions
import { saveDirections, saveSelectedDirection, saveSuggestions } from './state-persistence-service.js';

// Log module load confirmation
console.log('EngageIQ: Direction Service Module Loaded');

/**
 * Handles analyzing post content for direction suggestions by sending a message to the background script
 * @param {Object} postContent - The post content to analyze
 * @param {Function} sendMessageToIframe - Function to send messages to the iframe
 * @returns {Promise<Object>} A promise that resolves with the background script's response
 */
export function handleDirectionAnalysis(postContent, sendMessageToIframe) {
  return new Promise((resolve, reject) => {
    // Show directions loading UI
    sendMessageToIframe({
      type: 'SHOW_DIRECTIONS_LOADING',
    });
    console.log('EngageIQ: Sent SHOW_DIRECTIONS_LOADING message to iframe');
    console.log('EngageIQ: Sending ANALYZE_DIRECTIONS message to background script...');

    // Send message to background script to analyze post directions
    chrome.runtime.sendMessage(
      { type: 'ANALYZE_DIRECTIONS', postContent: postContent },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            'EngageIQ: Error sending ANALYZE_DIRECTIONS message:', 
            chrome.runtime.lastError.message
          );
          // Send error to iframe
          sendMessageToIframe({
            type: 'SHOW_ERROR',
            error: 'Communication Error',
            details: 'Failed to communicate with the background script.',
            actionHint: 'Please try reloading the extension or browser.',
            errorType: 'communication_error'
          });
          return reject(new Error(chrome.runtime.lastError.message));
        }
        
        // Handle response from background script
        console.log(
          'EngageIQ: Received direction analysis response from background script:',
          response
        );

        if (response && response.success) {
          // Save directions to session storage
          saveDirections(response.directions);
          
          // Extract model information if available
          const modelInfo = response.modelInfo || null;

          // Send directions to iframe
          sendMessageToIframe({
            type: 'SHOW_DIRECTIONS',
            directions: response.directions,
            modelInfo: modelInfo,
          });
          console.log('EngageIQ: Sent SHOW_DIRECTIONS to iframe');
          resolve(response);
        } else {
          // If the background script reported an error, pass its details to the iframe
          console.error('EngageIQ: Background script reported error during direction analysis:', response);
          sendMessageToIframe({
            type: 'SHOW_ERROR',
            error: response.error || 'Failed to analyze directions.', // Main error message
            details: response.details || 'No specific details provided by background script.', // Technical details
            actionHint: response.actionHint || 'Please try again or check model/API key.', // Action hint if available
            errorType: response.errorType || 'unknown_background_error' // Specific error type
          });
          console.log('EngageIQ: Sent SHOW_ERROR to iframe due to background script failure');
          // Reject with an error object if possible, otherwise a generic message
          const errorMsg = response?.error || 'Background script failed to analyze directions';
          const errorDetails = response?.details || '';
          reject(new Error(`${errorMsg}${errorDetails ? ': ' + errorDetails : ''}`));
        }
      }
    );
  });
}

/**
 * Handles generating comments based on selected direction
 * @param {Object} selectedDirection - The selected direction object
 * @param {Object} postContent - The original post content
 * @param {string | null} languageCode - The detected language code for the post
 * @param {Function} sendMessageToIframe - Function to send messages to the iframe
 * @returns {Promise<Object>} The response from the background script
 */
export function handleDirectionSelection(selectedDirection, postContent, languageCode, sendMessageToIframe) {
  console.log('EngageIQ: [direction-service] handleDirectionSelection called with:', { selectedDirection, postContent: !!postContent, languageCode: languageCode, sendMessageToIframe: typeof sendMessageToIframe });
  return new Promise((resolve, reject) => {
    // Save the selected direction to session storage
    saveSelectedDirection(selectedDirection);
    
    // Show loading state
    sendMessageToIframe({
      type: 'SHOW_LOADING',
      message: 'Generating comments...',
    });
    console.log('EngageIQ: Sent SHOW_LOADING message to iframe');

    // Send message to background script to generate comments
    console.log('EngageIQ: [direction-service] Sending GENERATE_DIRECTION_COMMENTS message to background...');
    chrome.runtime.sendMessage(
      {
        type: 'GENERATE_DIRECTION_COMMENTS',
        payload: {
          direction: selectedDirection,
          postContent: postContent,
          languageCode: languageCode || 'en', // Pass language code, default to 'en' if null
        },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            'EngageIQ: [direction-service] Error sending GENERATE_DIRECTION_COMMENTS message:',
            chrome.runtime.lastError.message
          );
          sendMessageToIframe({
            type: 'SHOW_ERROR',
            error: 'Communication Error',
            details: 'Failed to communicate with the background script.',
          });
          return reject(new Error(chrome.runtime.lastError.message));
        }
        
        // Handle response from background script
        console.log(
          'EngageIQ: [direction-service] Received comment generation response from background:',
          response
        );

        if (response && response.success) {
          // Save suggestions to session storage
          saveSuggestions(response.suggestions);
          
          // Extract model information if available
          const modelInfo = response.modelInfo || null;

          // Log suggestions just before sending
          console.log('EngageIQ: [direction-service] Sending suggestions to iframe:', response.suggestions);

          // Send suggestions to iframe
          sendMessageToIframe({
            type: 'SHOW_SUGGESTIONS',
            suggestions: response.suggestions,
            direction: selectedDirection,
            modelInfo: modelInfo,
          });
          console.log('EngageIQ: Sent SHOW_SUGGESTIONS to iframe');
          resolve(response);
        } else {
          // Send error to iframe
          const errorMsg = response?.error || 'Failed to generate comments';
          const errorDetails = response?.details || 'Unknown error from background script';
          sendMessageToIframe({
            type: 'SHOW_ERROR',
            error: errorMsg,
            details: errorDetails,
            actionHint: response?.actionHint || 'Please try again',
            errorType: response?.errorType || 'unknown_error'
          });
          console.log('EngageIQ: [direction-service] Sent SHOW_ERROR to iframe due to background failure');
          reject(new Error(`${errorMsg}${errorDetails ? ': ' + errorDetails : ''}`));
        }
      }
    );
  });
}

/**
 * Handles returning to the directions selection screen
 * @param {Object} storedDirections - Previously generated directions
 * @param {Function} sendMessageToIframe - Function to send messages to the iframe
 */
export function handleBackToDirections(storedDirections, sendMessageToIframe) {
  if (!storedDirections || !Array.isArray(storedDirections) || storedDirections.length === 0) {
    console.error('EngageIQ: No stored directions available to return to');
    sendMessageToIframe({
      type: 'SHOW_ERROR',
      error: 'Navigation Failed',
      details: 'Cannot return to directions - no data available.',
    });
    return;
  }
  
  // Display the stored directions
  sendMessageToIframe({
    type: 'SHOW_DIRECTIONS',
    directions: storedDirections,
  });
  console.log('EngageIQ: Returned to directions screen');
}
