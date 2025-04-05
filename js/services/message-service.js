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
 * @param {Object} iframePayload - The message payload from the iframe (contains reactionType, originalText)
 * @param {string} languageCode - The detected language code.
 * @param {Function} sendMessageToIframe - Function to send messages to the iframe
 * @returns {Promise<Object>} The response from the background script
 */
function handleRegenerationRequest(requestType, iframePayload, languageCode, sendMessageToIframe) {
  return new Promise((resolve, reject) => {
    // Map popup request type to background request type
    const backgroundRequestType =
      requestType === 'REQUEST_LONGER'
        ? 'REGENERATE_LONGER'
        : 'REGENERATE_SHORTER';

    // Ensure payload is valid before sending
    if (!iframePayload || !iframePayload.reactionType || !iframePayload.originalText) {
      console.error(
        'EngageIQ: Invalid payload received for regeneration request:',
        iframePayload
      );
      
      sendMessageToIframe({
        type: 'SHOW_ERROR',
        error: 'Internal Error',
        details: 'Invalid data received for regeneration request.',
        payload: { reactionType: iframePayload?.reactionType }, // Pass reactionType for context
      });
      
      reject(new Error('Invalid payload for regeneration request'));
      return;
    }

    // Construct the final payload for the background script
    const backgroundPayload = {
      ...iframePayload, // Spread existing payload (reactionType, originalText)
      languageCode: languageCode // Add the language code
    };

    // Relay message to background
    chrome.runtime.sendMessage(
      {
        type: backgroundRequestType, // Use the mapped type
        payload: backgroundPayload, // Send the combined payload
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
            payload: { reactionType: iframePayload?.reactionType }, // Pass reactionType for context
          });
          
          reject(chrome.runtime.lastError);
          return;
        }

        // Check only for success flag, as background doesn't send REGENERATION_SUCCESS type
        if (response && response.success) {
          // Format the suggestion object for updateSingleSuggestion
          const suggestion = {
            id: response.payload.reactionType || iframePayload.reactionType, // Use reactionType from payload if available
            text: response.payload.newText || '' // Use newText from payload
          };
          
          // Handle REGENERATION_SUCCESS
          sendMessageToIframe({
            type: 'UPDATE_SINGLE_SUGGESTION',
            suggestion: suggestion // Send properly formatted suggestion object
          });
          
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
              reactionType: iframePayload?.reactionType || response?.payload?.reactionType,
            }, // Pass reactionType for context
          });
          
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
    insertTextIntoCommentBox(activeCommentBox, data.text);
  } else {
    console.warn('EngageIQ: No active comment box reference found');
    // Fallback: Try to find the most recently interacted comment box
    const commentBoxes = findAllCommentBoxes();
    let targetBox;
    
    if (commentBoxes && commentBoxes.length > 0) {
      // Fallback: Try the last comment box found
      targetBox = commentBoxes[commentBoxes.length - 1]; 
      if(targetBox) {
        insertTextIntoCommentBox(targetBox, data.text);
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
 * Inserts text into the comment box
 * @param {HTMLElement} commentBox - The comment box element
 * @param {string} text - The text to insert
 */
function insertTextIntoCommentBox(commentBox, text) {
  const inputElement = findCommentInputElement(commentBox);
  if (inputElement) {
    if (inputElement.isContentEditable) {
      // Insert text into contenteditable div
      inputElement.focus();
      inputElement.textContent = text; // Replace content
      // Trigger input event to simulate typing
      inputElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    } else if (inputElement.tagName === 'TEXTAREA') {
      // Insert text into textarea
      inputElement.focus();
      inputElement.value = text; // Replace content
      // Trigger input event for potential listeners
      inputElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }
  } else {
    console.warn('EngageIQ: Could not find comment input element in the active comment box');
    // Optionally, provide feedback to the user, e.g., copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
      alert('Could not insert text directly. It has been copied to your clipboard.');
    }).catch(err => {
      console.error('EngageIQ: Failed to copy text to clipboard:', err);
      alert('Could not insert text directly and failed to copy to clipboard.');
    });
  }
}

/**
 * Finds the actual input element (contenteditable div or textarea) within a comment box container.
 * @param {HTMLElement} commentBox - The comment box container element.
 * @returns {HTMLElement|null} The input element or null if not found.
 */
function findCommentInputElement(commentBox) {
  if (!commentBox) return null;
  return commentBox.querySelector('div[contenteditable="true"], textarea');
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
