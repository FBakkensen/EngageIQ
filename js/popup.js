/**
 * EngageIQ Chrome Extension - Popup Script (popup.js)
 *
 * This script runs within the iframe (popup.html) displayed on LinkedIn pages.
 * It handles:
 *  - Receiving messages from the content script (e.g., show loading, display suggestions).
 *  - Sending messages back to the content script (e.g., accept suggestion, request regeneration).
 *  - Managing the UI elements within the popup (accordion, buttons, etc.).
 */

// Import the UI modules
import { initSuggestionRenderer, displaySuggestions } from '../js/ui/suggestion-renderer.js';
import { initErrorHandler, displayError } from '../js/ui/error-handler.js';
import { initAccordion } from '../js/ui/accordion-controller.js';

// Log script load confirmation - Compliant with user preference MEMORY[e17fa962-c53a-4d19-ae3a-66c3cbc4dce7]
console.log('EngageIQ: Popup Script Loaded');

// Global element references (initialized in DOMContentLoaded)
let loadingState;
let errorState;
let errorMessage;
let suggestionsAccordion;

// Queue to store messages received before DOM is loaded
const messageQueue = [];

/**
 * Shows a specific state element and hides the others
 * @param {string} stateToShow - 'loading', 'error', or 'suggestions'
 */
function showState(stateToShow) {
  // Safety check if DOM references aren't initialized yet
  if (!loadingState || !errorState || !suggestionsAccordion) {
    console.warn(
      `EngageIQ: Cannot change UI state to ${stateToShow} - DOM references not initialized`
    );
    return;
  }

  console.log(`EngageIQ: Changing UI state to: ${stateToShow}`);

  // Hide all states first
  loadingState.style.display = 'none';
  errorState.style.display = 'none';
  suggestionsAccordion.style.display = 'none';

  // Show the requested state
  switch (stateToShow) {
    case 'loading':
      loadingState.style.display = 'block';
      break;
    case 'error':
      errorState.style.display = 'block';
      break;
    case 'suggestions':
      suggestionsAccordion.style.display = 'block';
      break;
    default:
      console.warn(`EngageIQ: Unknown state requested: ${stateToShow}`);
  }
}

/**
 * Updates the model indicator with the provided model name
 * Part of the model selection feature that displays the currently selected model in the popup UI.
 * This provides users with visual confirmation of which model is being used for their comment generation.
 * 
 * @param {string} modelName - The name of the model to display (e.g., 'gemini-2.0-flash')
 */
function updateModelIndicator(modelName) {
  const modelIndicator = document.getElementById('modelIndicator');
  if (!modelIndicator) {
    console.warn('EngageIQ: Model indicator element not found');
    return;
  }

  // Format model name for display (e.g., "Gemini 2.0 Flash")
  const displayName = modelName
    .replace(/gemini-/i, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  modelIndicator.textContent = displayName;
  console.log(`EngageIQ: Updated model indicator to: ${displayName}`);
}

/**
 * Retrieves and displays the current Gemini model in the model indicator
 * This function is part of the model selection feature and ensures that users
 * can see which model is currently being used for comment generation.
 * 
 * The function performs the following steps:
 * 1. Retrieves the model preference from Chrome storage
 * 2. Falls back to DEFAULT_GEMINI_MODEL if no preference is found
 * 3. Updates the UI to display the model name
 * 
 * This provides transparency to users about which model is processing their requests,
 * which is especially important when different models have different rate limits and capabilities.
 */
function displayCurrentModel() {
  console.log('EngageIQ: Retrieving current model for display');
  
  chrome.storage.sync.get(['geminiModel'], (result) => {
    const currentModel = result.geminiModel || 'gemini-2.0-flash'; // Default model
    updateModelIndicator(currentModel);
  });
}

/**
 * Sends a message to the parent content script
 * (Currently unused in Phase 4, will be used in later phases for user interactions)
 * @param {Object} message - The message to send
 */
function sendMessageToContentScript(message) {
  // Check if we're in an iframe
  if (window !== window.parent) {
    console.log(`EngageIQ: Sending message to content script: ${message.type}`);
    window.parent.postMessage(message, '*');
  } else {
    console.warn('EngageIQ: Not in iframe, cannot send message to parent');
  }
}

/**
 * Tell the content script that the popup is ready
 */
function notifyPopupReady() {
  sendMessageToContentScript({ type: 'POPUP_READY' });
}

// Initialize DOM element references when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('EngageIQ: Popup DOM Loaded');

  // Initialize DOM element references
  loadingState = document.getElementById('loadingState');
  errorState = document.getElementById('errorState');
  errorMessage = document.getElementById('errorMessage');
  suggestionsAccordion = document.getElementById('suggestionsAccordion');

  // Initialize the accordion controller directly
  initAccordion(suggestionsAccordion);
  
  // Initialize UI modules with the required references
  initSuggestionRenderer({
    accordionElement: suggestionsAccordion,
    showStateFunction: showState,
    sendMessageFunction: sendMessageToContentScript
  });
  
  initErrorHandler({
    errorMessageElement: errorMessage,
    showStateFunction: showState
  });

  // Show initial loading state
  showState('loading');

  // Display current model in the UI
  displayCurrentModel();

  // Process any messages that were received before DOM was loaded
  if (messageQueue.length > 0) {
    console.log(
      `EngageIQ: Processing ${messageQueue.length} queued messages from before DOM loaded`
    );
    messageQueue.forEach((data) => processMessage(data));
    messageQueue.length = 0; // Clear the queue
  }

  // Tell the content script we're ready
  notifyPopupReady();
});

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

  // If DOM is not loaded yet, queue message for later processing
  if (
    !document.body ||
    !loadingState ||
    !errorState ||
    !suggestionsAccordion
  ) {
    console.log(
      `EngageIQ: DOM not loaded yet, queueing message: ${data.type}`
    );
    messageQueue.push(data);
    return;
  }

  // Process the message
  processMessage(data);
});

/**
 * Process a message from the content script
 * @param {Object} data - Message data object
 */
function processMessage(data) {
  console.log(`EngageIQ: Processing message: ${data.type}`);

  switch (data.type) {
    case 'SHOW_LOADING':
      showState('loading');
      break;

    case 'SHOW_ERROR':
      displayError(data.message, data.details, data.actionData);
      break;

    case 'SHOW_SUGGESTIONS':
      if (!data.suggestions || !Array.isArray(data.suggestions)) {
        console.error('EngageIQ: Invalid suggestions data:', data);
        displayError('Invalid suggestions data received');
        return;
      }

      // Use the imported displaySuggestions function
      displaySuggestions(data.suggestions);
      break;

    case 'UPDATE_SUGGESTION':
      // This is handled by updating the entire suggestions list
      // for simplicity in this phase, but could be optimized later
      if (data.suggestions && Array.isArray(data.suggestions)) {
        displaySuggestions(data.suggestions);
      }
      break;

    case 'UPDATE_MODEL':
      if (data.model) {
        updateModelIndicator(data.model);
      }
      break;

    default:
      console.warn(`EngageIQ: Unknown message type: ${data.type}`);
  }
}
