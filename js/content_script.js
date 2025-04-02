/**
 * EngageIQ Chrome Extension
 * Content Script - Runs in the context of LinkedIn pages
 */

import { initializeButtonInjection } from './ui/button-injector.js';
import { 
  getOrCreateIframe,
  sendMessageToIframe,
  showIframe,
  hideIframe,
  setActiveCommentBox,
  getActiveCommentBox,
  resetActiveCommentBox,
  initializeIframeManager
} from './ui/iframe-manager.js';

console.log('EngageIQ: Content Script Loaded');

// --- Function to Extract Post Content (Step 8.2) ---

/**
 * Extracts the main text content from the LinkedIn post associated with the clicked button.
 * Follows the MVP strategy: grabs currently visible text only.
 * @param {HTMLElement} clickedButtonElement - The EngageIQ button element that was clicked.
 * @returns {string|null} The extracted post text, an empty string if text is empty/not found in a valid structure, or null if the post structure cannot be identified.
 */
function extractPostContent(clickedButtonElement) {
  console.log('EngageIQ: Attempting to extract post content.');

  // Sub-step 8.2.2: Find the common ancestor post element
  const postAncestorSelector = '.feed-shared-update-v2'; // From Step 8.1.2
  const postElement = clickedButtonElement.closest(postAncestorSelector);

  if (!postElement) {
    console.error(
      `EngageIQ: Could not find post ancestor element using selector: ${postAncestorSelector}`
    );
    return null; // Indicate failure to find the post structure
  }
  console.log('EngageIQ: Found post ancestor element:', postElement);

  // Sub-step 8.2.3: Find the text content element within the ancestor
  const textContentSelector = '.update-components-text span[dir="ltr"]'; // From Step 8.1.3
  // We query *from* the found postElement
  const textElement = postElement.querySelector(textContentSelector);

  if (!textElement) {
    console.warn(
      `EngageIQ: Could not find text content element using selector: ${textContentSelector} within ancestor. The post might have no text or a different structure.`
    );
    // Decide if this is an error or just a post without text.
    // For MVP, let's return empty string assuming it might be a valid post without text.
    // A more robust solution might differentiate.
    return '';
  }
  console.log('EngageIQ: Found text content element:', textElement);

  // Sub-step 8.2.4: Extract, trim, and return text content
  const rawText = textElement.textContent || '';
  const trimmedText = rawText.trim();

  // console.log("EngageIQ: Raw extracted text:", rawText); // Commented out for privacy/cleanliness
  // console.log("EngageIQ: Trimmed extracted text:", trimmedText); // Commented out for privacy/cleanliness

  // Return trimmed text (even if empty, as per 8.2.4 handling)
  return trimmedText;
}

/**
 * Custom message handler for iframe messages
 * @param {MessageEvent} event - The message event from the iframe
 */
function handleCustomIframeMessages(event) {
  switch (event.data.type) {
    case 'REQUEST_SHORTER':
    case 'REQUEST_LONGER': {
      const requestType = event.data.type; // 'REQUEST_SHORTER' or 'REQUEST_LONGER'
      const payload = event.data; // Should contain reactionType, originalText

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
          'EngageIQ: Invalid payload received from iframe for regeneration request:',
          payload
        );
        sendMessageToIframe({
          type: 'SHOW_ERROR',
          error: 'Internal Error',
          details: 'Invalid data received from popup for regeneration request.',
          payload: { reactionType: payload?.reactionType }, // Pass reactionType for context
        });
        break; // Exit the case
      }

      // Step 7.2.3: Relay message to background
      chrome.runtime.sendMessage(
        {
          type: backgroundRequestType, // Use the mapped type
          payload: payload, // Forward the payload containing originalText, reactionType etc.
        },
        (response) => {
          // Step 7.2.3: Implement callback
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
            // Step 7.2.3: Handle REGENERATION_SUCCESS
            sendMessageToIframe({
              type: 'UPDATE_SINGLE_SUGGESTION',
              payload: response.payload, // Contains newText, reactionType
            });
            console.log(
              `EngageIQ: Sent UPDATE_SINGLE_SUGGESTION to iframe for reaction type: ${response.payload?.reactionType}`
            );
          } else {
            // Step 7.2.3: Handle REGENERATION_ERROR
            console.error(
              `EngageIQ: Regeneration failed for ${backgroundRequestType}. Error:`,
              response?.error,
              response?.details
            );
            sendMessageToIframe({
              type: 'SHOW_ERROR',
              error: response?.error || 'Regeneration Failed',
              details:
                response?.details ||
                'An unknown error occurred during regeneration.',
              payload: {
                reactionType:
                  payload?.reactionType || response?.payload?.reactionType,
              }, // Pass reactionType for context
            });
            console.log(
              `EngageIQ: Sent SHOW_ERROR to iframe for reaction type: ${payload?.reactionType || response?.payload?.reactionType}`
            );
          }
        }
      );
      break;
    }

    case 'ACCEPT_SUGGESTION': {
      console.log(`EngageIQ: Suggestion accepted - Text: ${event.data.text}`);

      // Use the activeCommentBox reference
      const activeCommentBox = getActiveCommentBox();
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
            commentInput.textContent = event.data.text;
            // Trigger input event to notify LinkedIn the field has changed
            commentInput.dispatchEvent(new Event('input', { bubbles: true }));
            console.log(
              'EngageIQ: Text inserted into contenteditable comment box'
            );
          } else {
            // For textarea
            commentInput.value = event.data.text;
            // Trigger input event
            commentInput.dispatchEvent(new Event('input', { bubbles: true }));
            console.log('EngageIQ: Text inserted into textarea comment box');
          }
        } else {
          console.warn(
            'EngageIQ: Could not find comment input element in the active comment box'
          );
          // Fallback to clipboard only
          alert(
            'Could not insert text directly. The text has been copied to your clipboard.'
          );
        }
      } else {
        console.warn('EngageIQ: No active comment box reference found');
        // Fallback: Try to find the most recently interacted comment box
        const commentBoxes = document.querySelectorAll(
          '[data-engageiq-button-injected="true"]'
        );
        console.log(
          `EngageIQ: Found ${commentBoxes.length} comment boxes as fallback`
        );

        if (commentBoxes.length > 0) {
          // Attempt to use the last comment box as a fallback
          const lastCommentBox = commentBoxes[commentBoxes.length - 1];
          console.log(
            'EngageIQ: Attempting to use last comment box as fallback'
          );
          const commentInput =
            lastCommentBox.querySelector('div[contenteditable="true"]') ||
            lastCommentBox.querySelector('textarea');

          if (commentInput) {
            // Insert text using the same logic as above
            if (commentInput.tagName.toLowerCase() === 'div') {
              commentInput.textContent = event.data.text;
              commentInput.dispatchEvent(new Event('input', { bubbles: true }));
              console.log(
                'EngageIQ: Text inserted into contenteditable comment box (fallback method)'
              );
            } else {
              commentInput.value = event.data.text;
              commentInput.dispatchEvent(new Event('input', { bubbles: true }));
              console.log(
                'EngageIQ: Text inserted into textarea comment box (fallback method)'
              );
            }
          } else {
            console.warn(
              'EngageIQ: Could not find comment input element in fallback comment box'
            );
            alert(
              'Could not insert text directly. The text has been copied to your clipboard.'
            );
          }
        } else {
          console.warn('EngageIQ: No comment boxes found as fallback');
          alert(
            'Could not insert text directly. The text has been copied to your clipboard.'
          );
        }
      }

      // Hide the iframe and reset the active comment box reference
      hideIframe();
      resetActiveCommentBox();
      break;
    }

    default:
      console.log(
        `EngageIQ: Unhandled iframe message type: ${event.data.type}`
      );
  }
}

/**
 * Handles the click event on the EngageIQ icon button.
 * Toggles the visibility of the popup iframe and handles communication.
 * @param {Event} event - The click event object.
 */
function handleEngageIQButtonClick(event) {
  // Prevent default button behavior and event propagation
  event.preventDefault();
  event.stopPropagation();

  console.log('EngageIQ: Button clicked.');

  // Store the active comment box reference
  const commentBox = event.currentTarget.closest(
    '[data-engageiq-button-injected="true"]'
  );
  setActiveCommentBox(commentBox);

  // Get or create the iframe
  const iframe = getOrCreateIframe();

  // Toggle iframe visibility
  if (iframe.style.display === 'none' || iframe.style.display === '') {
    showIframe();

    // Get the clicked button element
    const clickedButton = event.currentTarget;
    // Step 8.3.2: Extract real post content
    const extractedText = extractPostContent(clickedButton);

    // Step 8.3.3: Check if content is valid
    if (extractedText === null || extractedText.trim() === '') {
      const errorMessage =
        extractedText === null
          ? 'Could not find post structure.'
          : 'Post text appears empty or could not be extracted.';
      console.error(`EngageIQ: ${errorMessage}`);
      sendMessageToIframe({
        type: 'SHOW_ERROR',
        error: 'Extraction Failed',
        details: errorMessage,
      });
      // Keep iframe open but show error, do not proceed to background
      return;
    }

    // Content is valid, prepare it for the background script
    const postContent = {
      text: extractedText,
      // Add other fields like author/timestamp later if needed/possible
    };
    // console.log("EngageIQ: Extracted post content:", postContent); // Commented out for privacy/cleanliness

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
        } else {
          // Send error to iframe
          sendMessageToIframe({
            type: 'SHOW_ERROR',
            error: response?.error || 'Failed to generate suggestions',
            details: response?.details || 'Unknown error',
          });
          console.log('EngageIQ: Sent SHOW_ERROR to iframe');
        }
      }
    );
    console.log(
      'EngageIQ: Sent GENERATE_COMMENTS message to background script'
    );
  } else {
    hideIframe();
  }
}

// --- Initialize the iframe manager with custom message handler ---
initializeIframeManager(handleCustomIframeMessages);

// --- Initialize the button injection with the button click handler ---
initializeButtonInjection(handleEngageIQButtonClick);

// --- Phase 3: Iframe Management (Now handled by iframe-manager.js) ---
