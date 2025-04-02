/**
 * EngageIQ Chrome Extension
 * Content Script - Runs in the context of LinkedIn pages
 */

console.log('EngageIQ: Content Script Loaded');

// Initial selectors for comment boxes (May need refinement based on LinkedIn updates)
// TODO: Refine selectors based on testing on live LinkedIn feed and single post pages.
const COMMENT_BOX_SELECTORS = [
  '.feed-shared-update-v2 .comments-comment-box__form', // Standard feed post comment form
  'div[aria-label="Write a comment"]', // Common label for comment input areas
  // Add more selectors here if needed
].join(', '); // Combine selectors for a single query

/**
 * Finds potential LinkedIn comment box elements in the current document.
 * @returns {NodeList} A NodeList containing the found comment box elements.
 */
function findCommentBoxes() {
  // console.log(`EngageIQ: Searching for comment boxes with selectors: ${COMMENT_BOX_SELECTORS}`);
  return document.querySelectorAll(COMMENT_BOX_SELECTORS);
}

/**
 * Processes found comment boxes to potentially inject the EngageIQ button.
 * This function will be expanded in Step 2.4.
 */
function processCommentBoxes() {
  console.log('EngageIQ: Processing comment boxes...');
  const commentBoxes = findCommentBoxes();
  console.log(
    `EngageIQ: Found ${commentBoxes.length} potential comment boxes.`
  );

  commentBoxes.forEach((box) => {
    // Check if the button has already been injected for this box
    if (box.dataset.engageiqButtonInjected === 'true') {
      // console.log("EngageIQ: Button already injected, skipping box:", box); // Optional logging
      return; // Skip this box if the marker attribute is present and true
    }

    console.log('EngageIQ: Injecting button into box:', box); // Add log for clarity
    const engageButton = document.createElement('button');

    // Add Bootstrap-like button classes
    engageButton.className = 'engageiq-btn engageiq-btn-icon';
    engageButton.type = 'button'; // Set button type

    // Create and add icon image
    const iconImg = document.createElement('img');
    const iconUrl = chrome.runtime.getURL('icons/icon48.png');
    iconImg.src = iconUrl;
    iconImg.alt = 'EngageIQ';
    iconImg.width = 20;
    iconImg.height = 20;
    console.log('EngageIQ: Using icon URL:', iconUrl);
    engageButton.appendChild(iconImg);

    // Add tooltip
    engageButton.title = 'Generate AI-powered comments with EngageIQ';
    // Add ARIA attributes for accessibility
    engageButton.setAttribute('aria-label', 'Generate comments with EngageIQ');
    engageButton.setAttribute('role', 'button');

    // Determine insertion point and append button
    // Strategy 1: Look for action buttons container
    let insertionPoint = null;

    // Try to find action buttons container (common in LinkedIn comment boxes)
    const actionButtonsContainer =
      box.querySelector('.comments-comment-box__controls-container') ||
      box.querySelector('.comments-comment-texteditor__actions') ||
      box.querySelector('.comments-comment-box__form-container');

    if (actionButtonsContainer) {
      // Insert at the beginning of the action buttons container
      insertionPoint = actionButtonsContainer;
      insertionPoint.insertBefore(engageButton, insertionPoint.firstChild);
      console.log('EngageIQ: Button inserted into action buttons container');
    } else {
      // Strategy 2: Look for the comment input field and insert after it
      const commentInput =
        box.querySelector('div[contenteditable="true"]') ||
        box.querySelector('textarea') ||
        box.querySelector('input');

      if (commentInput && commentInput.parentNode) {
        // Insert after the comment input
        insertionPoint = commentInput.parentNode;
        insertionPoint.appendChild(engageButton);
        console.log('EngageIQ: Button inserted after comment input');
      } else {
        // Strategy 3: Fallback - just append to the comment box itself
        insertionPoint = box;
        box.appendChild(engageButton);
        console.log('EngageIQ: Button inserted using fallback strategy');
      }
    }

    // Add click event listener - Updated for Step 3.5
    engageButton.addEventListener('click', handleEngageIQButtonClick);

    // Mark the comment box as processed
    box.dataset.engageiqButtonInjected = 'true';
  });
}

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

// --- MutationObserver Setup ---

// Options for the observer (which mutations to observe)
const observerConfig = {
  childList: true, // Observe additions/removals of child nodes
  subtree: true, // Observe the entire subtree under document.body
};

// Callback function to execute when mutations are observed
const mutationCallback = (_mutationsList, _observer) => {
  // We are simply re-processing all boxes on any change for simplicity in MVP.
  // A more optimized approach might inspect mutationsList directly.
  console.log('EngageIQ: DOM change detected, re-processing comment boxes.');
  processCommentBoxes();
};

// Create an observer instance linked to the callback function
const observer = new MutationObserver(mutationCallback);

// Start observing the target node for configured mutations
console.log('EngageIQ: Starting MutationObserver on document.body.');
observer.observe(document.body, observerConfig);

// Initial run to catch any comment boxes present on load
console.log('EngageIQ: Initial check for comment boxes.');
processCommentBoxes();

// --- Global variables ---
let engageIQIframe = null; // Renamed from _engageIQIframe for Step 3.5.1
let pendingIframeMessages = []; // Store messages that need to be sent to the iframe
let popupReady = false; // Track if the popup has reported it's ready to receive messages

// --- Iframe Management (Step 3.5) ---

/**
 * Gets the existing iframe or creates it if it doesn't exist.
 * Ensures only one instance of the iframe is added to the page.
 * @returns {HTMLIFrameElement} The EngageIQ popup iframe element.
 */
function getOrCreateIframe() {
  if (!engageIQIframe) {
    console.log('EngageIQ: Creating popup iframe.');
    engageIQIframe = document.createElement('iframe');
    engageIQIframe.id = 'engageiq-popup-iframe'; // ID matches css/content_style.css
    // Use chrome.runtime.getURL to access extension resources
    try {
      engageIQIframe.src = chrome.runtime.getURL('html/popup.html');
      engageIQIframe.allow = 'clipboard-write'; // Grant clipboard permission to the iframe
      console.log('EngageIQ: Iframe src set to:', engageIQIframe.src);
      engageIQIframe.style.display = 'none'; // Start hidden
      document.body.appendChild(engageIQIframe);
      console.log('EngageIQ: Iframe appended to body.');

      // Reset popup ready state when creating a new iframe
      popupReady = false;

      // Setup message listener for communication from iframe
      setupIframeMessageListener();
    } catch (error) {
      console.error(
        'EngageIQ: Error setting iframe src or appending to body:',
        error
      );
      // Handle error appropriately, maybe return null or throw
      return null;
    }
  } else {
    console.log('EngageIQ: Reusing existing popup iframe.');
  }
  return engageIQIframe;
}

/**
 * Sets up a listener for messages from the popup iframe
 */
function setupIframeMessageListener() {
  window.addEventListener('message', handleIframeMessage);
}

/**
 * Handles messages received from the popup iframe
 * @param {MessageEvent} event - The message event object
 */
function handleIframeMessage(event) {
  // Check if the message is from our iframe
  if (!engageIQIframe || !event.data || !event.data.type) {
    return; // Not for us or not properly formatted
  }

  console.log('EngageIQ: Received message from iframe:', event.data.type);

  switch (event.data.type) {
    case 'POPUP_READY':
      console.log('EngageIQ: Popup reported ready to receive messages');
      popupReady = true;

      // Send any pending messages
      if (pendingIframeMessages.length > 0) {
        console.log(
          `EngageIQ: Sending ${pendingIframeMessages.length} pending messages to popup`
        );
        pendingIframeMessages.forEach((message) => {
          sendMessageToIframe(message);
        });
        pendingIframeMessages = [];
      }
      break;

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

          // Handle background response
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

    case 'ACCEPT_SUGGESTION':
      console.log(
        `EngageIQ: Suggestion accepted - Type: ${event.data.reactionType}`
      );
      console.log(`EngageIQ: Text to use: ${event.data.textToAccept}`);
      // Will be implemented in Phase 8
      // TODO: Close the popup and insert the text into the comment box

      // For now, just hide the iframe to simulate completion
      if (engageIQIframe) {
        engageIQIframe.style.display = 'none';
      }
      break;

    default:
      console.log(
        `EngageIQ: Unhandled iframe message type: ${event.data.type}`
      );
  }
}

/**
 * Sends a message to the popup iframe, queuing it if the popup isn't ready yet
 * @param {Object} message - The message to send to the iframe
 */
function sendMessageToIframe(message) {
  if (!engageIQIframe) {
    console.warn('EngageIQ: Cannot send message - iframe does not exist');
    return;
  }

  // If popup isn't ready, queue the message for later
  if (!popupReady) {
    console.log('EngageIQ: Popup not ready, queuing message:', message.type);
    pendingIframeMessages.push(message);
    return;
  }

  // Send the message
  console.log('EngageIQ: Sending message to iframe:', message.type);
  engageIQIframe.contentWindow.postMessage(message, '*');
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

  // Get or create the iframe
  const iframe = getOrCreateIframe();

  // Toggle iframe visibility
  if (iframe.style.display === 'none' || iframe.style.display === '') {
    iframe.style.display = 'block';
    iframe.classList.add('visible'); // Add animation class
    
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
          // Send suggestions to iframe
          sendMessageToIframe({
            type: 'SHOW_SUGGESTIONS',
            suggestions: response.suggestions,
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
    console.log('EngageIQ: Hiding popup iframe.');
    iframe.classList.remove('visible'); // Remove animation class
    // Add a small delay before hiding to allow animation to complete
    setTimeout(() => {
      iframe.style.display = 'none';
    }, 200); // 200ms delay for animation to complete
    return;
  }
}

// --- Phase 2: Button Injection Logic (Implemented above) ---
