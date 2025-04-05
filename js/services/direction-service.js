/**
 * EngageIQ Chrome Extension
 * Direction Service Module - Handles the direction analysis and selection for Smart Suggestions
 *
 * This module is responsible for:
 * - Analyzing post content to generate direction suggestions
 * - Processing direction selections
 * - Managing the communication flow for the two-step commenting process
 */

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

    // Send ANALYZE_DIRECTIONS message to background script
    chrome.runtime.sendMessage(
      {
        type: 'ANALYZE_DIRECTIONS',
        postContent: postContent,
      },
      (response) => {
        // Handle chrome.runtime.lastError first
        if (chrome.runtime.lastError) {
          console.error(
            'EngageIQ: Error sending message to background script:',
            chrome.runtime.lastError
          );

          // Send error message to iframe
          sendMessageToIframe({
            type: 'SHOW_ERROR',
            error: 'Failed to analyze post content',
            details: chrome.runtime.lastError.message,
          });
          reject(chrome.runtime.lastError);
          return;
        }

        // Handle successful response
        console.log(
          'EngageIQ: Received direction analysis response from background script:',
          response
        );

        if (response && response.success) {
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
          });
          console.log('EngageIQ: Sent SHOW_ERROR to iframe');
          reject(new Error('Failed to analyze post content'));
        }
      }
    );
    console.log('EngageIQ: Sent ANALYZE_DIRECTIONS message to background script');
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

    // Send GENERATE_DIRECTION_COMMENTS message to background script
    chrome.runtime.sendMessage(
      {
        type: 'GENERATE_DIRECTION_COMMENTS',
        payload: payload,
      },
      (response) => {
        // Handle chrome.runtime.lastError first
        if (chrome.runtime.lastError) {
          console.error(
            'EngageIQ: Error sending message to background script:',
            chrome.runtime.lastError
          );

          // Send error message to iframe
          sendMessageToIframe({
            type: 'SHOW_ERROR',
            error: 'Failed to generate direction-based comments',
            details: chrome.runtime.lastError.message,
          });
          reject(chrome.runtime.lastError);
          return;
        }

        // Handle successful response
        console.log(
          'EngageIQ: Received direction comments response from background script:',
          response
        );

        if (response && response.success) {
          // Extract model information if available
          const modelInfo = response.modelInfo || null;

          // Send suggestions to iframe
          sendMessageToIframe({
            type: 'SHOW_SUGGESTIONS',
            suggestions: response.suggestions,
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
          });
          console.log('EngageIQ: Sent SHOW_ERROR to iframe');
          reject(new Error('Failed to generate direction-based comments'));
        }
      }
    );
    console.log('EngageIQ: Sent GENERATE_DIRECTION_COMMENTS message to background script');
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
