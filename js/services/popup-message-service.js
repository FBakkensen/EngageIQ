/**
 * EngageIQ Chrome Extension
 * Popup Message Service Module - Handles communications between popup and content script
 *
 * This module is responsible for:
 * - Sending messages from the popup to the content script
 * - Processing incoming messages from the content script
 * - Managing the message queue for messages received before DOM is ready
 */

import { displaySuggestions } from '../ui/suggestion-renderer.js';
import { displayError } from '../ui/error-handler.js';

// Log module load confirmation
console.log('EngageIQ: Popup Message Service Module Loaded');

// Queue to store messages received before DOM is loaded
let messageQueue = [];

// References to state elements (to be initialized)
let showStateFn;
let updateModelIndicatorFn;

/**
 * Initializes the message service with required functions
 * @param {Object} config - Configuration object
 * @param {Function} config.showStateFunction - Function to switch UI states
 * @param {Function} config.updateModelIndicatorFunction - Function to update model indicator
 */
export function initPopupMessageService(config) {
  showStateFn = config.showStateFunction;
  updateModelIndicatorFn = config.updateModelIndicatorFunction;
  
  console.log('EngageIQ: Popup Message Service initialized');
  
  // Set up message listener
  setupMessageListener();
}

/**
 * Sends a message to the parent content script
 * @param {Object} message - The message to send
 * @returns {boolean} True if message was sent, false otherwise
 */
export function sendMessageToContentScript(message) {
  // Check if we're in an iframe
  if (window !== window.parent) {
    console.log(`EngageIQ: Sending message to content script: ${message.type}`);
    window.parent.postMessage(message, '*');
    return true;
  } else {
    console.warn('EngageIQ: Not in iframe, cannot send message to parent');
    return false;
  }
}

/**
 * Tell the content script that the popup is ready
 */
export function notifyPopupReady() {
  sendMessageToContentScript({ type: 'POPUP_READY' });
}

/**
 * Process any messages that were received before DOM was loaded
 */
export function processQueuedMessages() {
  if (messageQueue.length > 0) {
    console.log(
      `EngageIQ: Processing ${messageQueue.length} queued messages from before DOM loaded`
    );
    messageQueue.forEach((data) => processMessage(data));
    messageQueue.length = 0; // Clear the queue
  }
}

/**
 * Sets up the event listener for messages from the content script
 */
function setupMessageListener() {
  // Listen for messages from the content script via window.postMessage
  window.addEventListener('message', (event) => {
    // Only process messages from our parent
    if (event.source !== window.parent) {
      return;
    }

    const data = event.data;
    if (!data || !data.type) {
      console.warn('EngageIQ: Received invalid message:', data);
      return;
    }

    console.log(`EngageIQ: Received message: ${data.type}`);

    // If show state function is not initialized yet, queue message for later processing
    if (!showStateFn) {
      console.log(
        `EngageIQ: Message service not fully initialized yet, queueing message: ${data.type}`
      );
      messageQueue.push(data);
      return;
    }

    // Process the message
    processMessage(data);
  });
  
  console.log('EngageIQ: Message listener set up');
}

/**
 * Process a message from the content script
 * @param {Object} data - Message data object
 */
export function processMessage(data) {
  console.log(`EngageIQ: Processing message: ${data.type}`);

  switch (data.type) {
    case 'SHOW_LOADING':
      if (showStateFn) showStateFn('loading');
      break;

    case 'SHOW_ERROR':
      if (displayError) {
        displayError(data.message || data.error, data.details, data.actionData || data.payload);
      } else {
        console.error('EngageIQ: Cannot display error - displayError function not available');
        if (showStateFn) showStateFn('error');
      }
      break;

    case 'SHOW_SUGGESTIONS':
      if (!data.suggestions || !Array.isArray(data.suggestions)) {
        console.error('EngageIQ: Invalid suggestions data:', data);
        if (displayError) displayError('Invalid suggestions data received');
        return;
      }

      // Use the displaySuggestions function
      if (displaySuggestions) {
        displaySuggestions(data.suggestions);
      } else {
        console.error('EngageIQ: Cannot display suggestions - displaySuggestions function not available');
      }
      break;

    case 'UPDATE_SUGGESTION':
    case 'UPDATE_SINGLE_SUGGESTION':
      // This is handled by updating the entire suggestions list
      // for simplicity in this phase, but could be optimized later
      if (data.suggestions && Array.isArray(data.suggestions)) {
        if (displaySuggestions) displaySuggestions(data.suggestions);
      }
      break;

    case 'UPDATE_MODEL':
      if (data.model && updateModelIndicatorFn) {
        updateModelIndicatorFn(data.model);
      }
      break;

    default:
      console.warn(`EngageIQ: Unknown message type: ${data.type}`);
  }
}
