/**
 * EngageIQ Chrome Extension
 * Direction Service Module - Handles the direction analysis and selection for Smart Suggestions
 *
 * This module is responsible for:
 * - Analyzing post content to generate direction suggestions
 * - Processing direction selections
 * - Managing the communication flow for the two-step commenting process
 */

// Import API service
import { analyzePostDirections, generateDirectionComments } from './smart-suggestions-api.js';
import { saveDirections, saveSelectedDirection, saveSuggestions } from './state-persistence-service.js';

// Log module load confirmation
console.log('EngageIQ: Direction Service Module Loaded');

/**
 * Handles analyzing post content for direction suggestions
 * @param {Object} postContent - The post content to analyze
 * @param {Function} sendMessageToIframe - Function to send messages to the iframe
 * @returns {Promise<Object>} The response from the background script
 */
export function handleDirectionAnalysis(postContent, sendMessageToIframe) {
  return new Promise((resolve, reject) => {
    // Show directions loading UI
    sendMessageToIframe({
      type: 'SHOW_DIRECTIONS_LOADING',
    });
    console.log('EngageIQ: Sent SHOW_DIRECTIONS_LOADING message to iframe');

    // Call API to analyze post directions
    analyzePostDirections(postContent)
      .then((response) => {
        // Handle successful response
        console.log(
          'EngageIQ: Received direction analysis response from API:',
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
          // Send error to iframe
          sendMessageToIframe({
            type: 'SHOW_ERROR',
            error: response?.error || 'Failed to analyze post content',
            details: response?.details || 'Unknown error',
            actionHint: response?.actionHint || 'Please try again',
            errorType: response?.errorType || 'unknown_error'
          });
          console.log('EngageIQ: Sent SHOW_ERROR to iframe');
          reject(new Error('Failed to analyze post content'));
        }
      })
      .catch((error) => {
        console.error(
          'EngageIQ: Error analyzing post directions:',
          error
        );

        // Send error message to iframe
        sendMessageToIframe({
          type: 'SHOW_ERROR',
          error: 'Failed to analyze post content',
          details: error.message,
        });
        reject(error);
      });
  });
}

/**
 * Handles generating comments based on selected direction
 * @param {Object} selectedDirection - The selected direction object
 * @param {Object} postContent - The original post content
 * @param {Function} sendMessageToIframe - Function to send messages to the iframe
 * @returns {Promise<Object>} The response from the background script
 */
export function handleDirectionSelection(selectedDirection, postContent, sendMessageToIframe) {
  return new Promise((resolve, reject) => {
    // Save the selected direction to session storage
    saveSelectedDirection(selectedDirection);
    
    // Show loading state
    sendMessageToIframe({
      type: 'SHOW_LOADING',
      message: 'Generating comments based on direction...',
    });
    console.log('EngageIQ: Sent SHOW_LOADING message to iframe');

    // Prepare the payload
    const payload = {
      direction: selectedDirection,
      postContent: postContent
    };

    // Call API to generate direction comments
    generateDirectionComments(payload)
      .then((response) => {
        // Handle successful response
        console.log(
          'EngageIQ: Received direction comments response from API:',
          response
        );

        if (response && response.success) {
          // Save suggestions to session storage
          saveSuggestions(response.suggestions);
          
          // Extract model information if available
          const modelInfo = response.modelInfo || null;

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
          sendMessageToIframe({
            type: 'SHOW_ERROR',
            error: response?.error || 'Failed to generate direction-based comments',
            details: response?.details || 'Unknown error',
            actionHint: response?.actionHint || 'Please try again',
            errorType: response?.errorType || 'unknown_error'
          });
          console.log('EngageIQ: Sent SHOW_ERROR to iframe');
          reject(new Error('Failed to generate direction-based comments'));
        }
      })
      .catch((error) => {
        console.error(
          'EngageIQ: Error generating direction comments:',
          error
        );

        // Send error message to iframe
        sendMessageToIframe({
          type: 'SHOW_ERROR',
          error: 'Failed to generate direction-based comments',
          details: error.message,
        });
        reject(error);
      });
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
