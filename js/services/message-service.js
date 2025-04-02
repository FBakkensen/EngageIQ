/**
 * EngageIQ Chrome Extension
 * Message Service Module - Handles communications between content script, iframe, and background script
 *
 * This module is part of the message service architecture that handles:
 * - Communication between the content script and background script
 * - Processing suggestion acceptances and regeneration requests
 * - Managing comment insertion into the LinkedIn interface
 */

// Log module load confirmation
console.log('EngageIQ: Message Service Module Loaded');

/**
 * Handles message requests for shorter or longer comments
 * @param {string} requestType - The request type ('REQUEST_SHORTER' or 'REQUEST_LONGER')
 * @param {Object} payload - The message payload (contains reactionType, originalText)
 * @param {Function} sendMessageToIframe - Function to send messages to the iframe
 * @returns {Promise<Object>} The response from the background script
 */
function handleRegenerationRequest(requestType, payload, sendMessageToIframe) {
  return new Promise((resolve, reject) => {
    // Map popup request type to background request type
    const backgroundRequestType =
      requestType === 'REQUEST_LONGER'
        ? 'REGENERATE_LONGER'
        : 'REGENERATE_SHORTER';

    console.log(
      `EngageIQ: Relaying ${backgroundRequestType} message to background script for reaction type: ${payload?.reactionType}`
    );

    // Ensure payload is valid before sending
    if (!payload || !payload.reactionType || !payload.originalText) {
      console.error(
        'EngageIQ: Invalid payload received for regeneration request:',
        payload
      );
      
      sendMessageToIframe({
        type: 'SHOW_ERROR',
        error: 'Internal Error',
        details: 'Invalid data received for regeneration request.',
        payload: { reactionType: payload?.reactionType }, // Pass reactionType for context
      });
      
      reject(new Error('Invalid payload for regeneration request'));
      return;
    }

    // Relay message to background
    chrome.runtime.sendMessage(
      {
        type: backgroundRequestType, // Use the mapped type
        payload: payload, // Forward the payload containing originalText, reactionType etc.
      },
      (response) => {
        // Implement callback
        if (chrome.runtime.lastError) {
          console.error(
            `EngageIQ: Error sending ${backgroundRequestType} message to background:`,
            chrome.runtime.lastError
          );
          
          // Send error back to iframe
          sendMessageToIframe({
            type: 'SHOW_ERROR',
            error: 'Communication Error',
            details: `Failed to contact background script: ${chrome.runtime.lastError.message}`,
            payload: { reactionType: payload?.reactionType }, // Pass reactionType for context
          });
          
          reject(chrome.runtime.lastError);
          return;
        }

        console.log(
          `EngageIQ: Received response from background for ${backgroundRequestType}:`,
          response
        );

        if (
          response &&
          response.success &&
          response.type === 'REGENERATION_SUCCESS'
        ) {
          // Format the suggestion object for updateSingleSuggestion
          const suggestion = {
            id: response.payload?.reactionType || payload.reactionType,
            text: response.payload?.newText || ''
          };
          
          // Handle REGENERATION_SUCCESS
          sendMessageToIframe({
            type: 'UPDATE_SINGLE_SUGGESTION',
            suggestion: suggestion // Send properly formatted suggestion object
          });
          
          console.log(
            `EngageIQ: Sent UPDATE_SINGLE_SUGGESTION to iframe for reaction type: ${suggestion.id}`
          );
          
          resolve(response);
        } else {
          // Handle REGENERATION_ERROR
          console.error(
            `EngageIQ: Regeneration failed for ${backgroundRequestType}. Error:`,
            response?.error,
            response?.details
          );
          
          sendMessageToIframe({
            type: 'SHOW_ERROR',
            error: response?.error || 'Regeneration Failed',
            details: response?.details || 'An unknown error occurred during regeneration.',
            payload: {
              reactionType: payload?.reactionType || response?.payload?.reactionType,
            }, // Pass reactionType for context
          });
          
          console.log(
            `EngageIQ: Sent SHOW_ERROR to iframe for reaction type: ${payload?.reactionType || response?.payload?.reactionType}`
          );
          
          reject(new Error('Regeneration failed'));
        }
      }
    );
  });
}

/**
 * Handles accepted suggestion from iframe and inserts it into the comment box
 * @param {Object} data - The message data from iframe containing the text
 * @param {HTMLElement} activeCommentBox - The active comment box element
 * @param {Function} findAllCommentBoxes - Function to find all comment boxes as fallback
 * @param {Function} hideIframe - Function to hide the iframe
 * @param {Function} resetActiveCommentBox - Function to reset active comment box reference
 */
function handleAcceptedSuggestion(data, activeCommentBox, findAllCommentBoxes, hideIframe, resetActiveCommentBox) {
  console.log(`EngageIQ: Suggestion accepted - Text: ${data.text}`);

  // Use the activeCommentBox reference
  if (activeCommentBox) {
    console.log('EngageIQ: Using stored active comment box reference');
    // Find the contenteditable div or textarea for the comment
    const commentInput =
      activeCommentBox.querySelector('div[contenteditable="true"]') ||
      activeCommentBox.querySelector('textarea');

    if (commentInput) {
      // Insert text into the comment input
      if (commentInput.tagName.toLowerCase() === 'div') {
        // For contenteditable div
        commentInput.textContent = data.text;
        // Trigger input event to notify LinkedIn the field has changed
        commentInput.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('EngageIQ: Text inserted into contenteditable comment box');
      } else {
        // For textarea
        commentInput.value = data.text;
        // Trigger input event
        commentInput.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('EngageIQ: Text inserted into textarea comment box');
      }
    } else {
      console.warn('EngageIQ: Could not find comment input element in the active comment box');
      // Fallback to clipboard only
      alert('Could not insert text directly. The text has been copied to your clipboard.');
    }
  } else {
    console.warn('EngageIQ: No active comment box reference found');
    // Fallback: Try to find the most recently interacted comment box
    const commentBoxes = findAllCommentBoxes();
    console.log(`EngageIQ: Found ${commentBoxes.length} comment boxes as fallback`);

    if (commentBoxes.length > 0) {
      // Attempt to use the last comment box as a fallback
      const lastCommentBox = commentBoxes[commentBoxes.length - 1];
      console.log('EngageIQ: Attempting to use last comment box as fallback');
      const commentInput =
        lastCommentBox.querySelector('div[contenteditable="true"]') ||
        lastCommentBox.querySelector('textarea');

      if (commentInput) {
        // Insert text using the same logic as above
        if (commentInput.tagName.toLowerCase() === 'div') {
          commentInput.textContent = data.text;
          commentInput.dispatchEvent(new Event('input', { bubbles: true }));
          console.log('EngageIQ: Text inserted into contenteditable comment box (fallback method)');
        } else {
          commentInput.value = data.text;
          commentInput.dispatchEvent(new Event('input', { bubbles: true }));
          console.log('EngageIQ: Text inserted into textarea comment box (fallback method)');
        }
      } else {
        console.warn('EngageIQ: Could not find comment input element in fallback comment box');
        alert('Could not insert text directly. The text has been copied to your clipboard.');
      }
    } else {
      console.warn('EngageIQ: No comment boxes found as fallback');
      alert('Could not insert text directly. The text has been copied to your clipboard.');
    }
  }

  // Hide the iframe and reset the active comment box reference
  hideIframe();
  resetActiveCommentBox();
}

/**
 * Handles generating comment suggestions by sending request to background script
 * @param {Object} postContent - The post content to generate comments for
 * @param {Function} sendMessageToIframe - Function to send messages to the iframe
 * @returns {Promise<Object>} The response from the background script
 */
function generateCommentSuggestions(postContent, sendMessageToIframe) {
  return new Promise((resolve, reject) => {
    // Send SHOW_LOADING message to iframe
    sendMessageToIframe({
      type: 'SHOW_LOADING',
      message: 'Generating comment suggestions...',
    });
    console.log('EngageIQ: Sent SHOW_LOADING message to iframe');

    // Send GENERATE_COMMENTS message to background script
    chrome.runtime.sendMessage(
      {
        type: 'GENERATE_COMMENTS',
        postContent: postContent, // Use the real extracted content
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
            error: 'Failed to communicate with background script',
            details: chrome.runtime.lastError.message,
          });
          reject(chrome.runtime.lastError);
          return;
        }

        // Handle successful response
        console.log(
          'EngageIQ: Received response from background script:',
          response
        );

        if (response && response.success) {
          // Extract model information if available
          const modelInfo = response.modelInfo || null;

          // Send suggestions to iframe
          sendMessageToIframe({
            type: 'SHOW_SUGGESTIONS',
            suggestions: response.suggestions,
            modelInfo: modelInfo, // Include model info in the message
          });
          console.log('EngageIQ: Sent SHOW_SUGGESTIONS to iframe');
          resolve(response);
        } else {
          // Send error to iframe
          sendMessageToIframe({
            type: 'SHOW_ERROR',
            error: response?.error || 'Failed to generate suggestions',
            details: response?.details || 'Unknown error',
          });
          console.log('EngageIQ: Sent SHOW_ERROR to iframe');
          reject(new Error('Failed to generate suggestions'));
        }
      }
    );
    console.log('EngageIQ: Sent GENERATE_COMMENTS message to background script');
  });
}

/**
 * Find all comment boxes with the injected flag
 * @returns {NodeList} Collection of comment box elements
 */
function findAllCommentBoxes() {
  return document.querySelectorAll('[data-engageiq-button-injected="true"]');
}

/**
 * Sends a message to the iframe
 * Helper function to standardize iframe messaging
 * @param {Object} message - The message to send
 */
function sendMessageToIframe(message) {
  if (!message || !message.type) {
    console.warn('EngageIQ: Cannot send invalid message to iframe:', message);
    return;
  }
  
  // Find the iframe
  const iframe = document.getElementById('engageiq-iframe');
  if (!iframe || !iframe.contentWindow) {
    console.warn('EngageIQ: Cannot find iframe to send message');
    return;
  }
  
  console.log(`EngageIQ: Sending message to iframe: ${message.type}`);
  iframe.contentWindow.postMessage(message, '*');
}

// Export the module functions
export {
  handleRegenerationRequest,
  handleAcceptedSuggestion,
  generateCommentSuggestions,
  findAllCommentBoxes,
  sendMessageToIframe
};
