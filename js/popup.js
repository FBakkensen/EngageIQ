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
import { initSuggestionRenderer } from '../js/ui/suggestion-renderer.js';
import { initErrorHandler } from '../js/ui/error-handler.js';
import { initAccordion } from '../js/ui/accordion-controller.js';

// Import message service module
import { 
  initPopupMessageService, 
  sendMessageToContentScript, 
  notifyPopupReady,
  processQueuedMessages 
} from '../js/services/popup-message-service.js';

// Log script load confirmation - Compliant with user preference MEMORY[e17fa962-c53a-4d19-ae3a-66c3cbc4dce7]
console.log('EngageIQ: Popup Script Loaded');

// Global element references (initialized in DOMContentLoaded)
let loadingState;
let errorState;
let errorMessage;
let suggestionsAccordion;

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
      console.warn(`EngageIQ: Unknown state: ${stateToShow}`);
  }
}

/**
 * Updates the model indicator with the provided model name
 * @param {string} modelName - The name of the model to display
 */
function updateModelIndicator(modelName) {
  const modelIndicator = document.getElementById('modelIndicator');
  if (!modelIndicator) {
    console.warn('EngageIQ: Cannot update model indicator - element not found');
    return;
  }

  if (!modelName) {
    modelIndicator.style.display = 'none';
    return;
  }

  // Customize display name for better readability
  let displayName = modelName;
  if (modelName.includes('gemini')) {
    displayName = modelName.split('-')[0].charAt(0).toUpperCase() + modelName.split('-')[0].slice(1);
  }

  console.log(`EngageIQ: Updating model indicator to ${displayName}`);
  modelIndicator.textContent = displayName;
  modelIndicator.style.display = 'inline-block';
}

/**
 * Retrieves and displays the current Gemini model in the model indicator
 */
function displayCurrentModel() {
  // Default model if none is selected
  const DEFAULT_GEMINI_MODEL = 'gemini-1.5-pro';

  console.log('EngageIQ: Retrieving current model setting');

  // Get stored model preference using chrome.storage.sync
  chrome.storage.sync.get(['geminiModel'], (result) => {
    let currentModel = DEFAULT_GEMINI_MODEL;

    if (chrome.runtime.lastError) {
      console.warn(
        'EngageIQ: Error retrieving model preference:',
        chrome.runtime.lastError
      );
    } else if (result.geminiModel) {
      currentModel = result.geminiModel;
      console.log(`EngageIQ: Retrieved model preference: ${currentModel}`);
    } else {
      console.log(
        `EngageIQ: No model preference found, using default: ${currentModel}`
      );
    }

    // Update the UI
    updateModelIndicator(currentModel);
  });
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

  // Initialize the message service
  initPopupMessageService({
    showStateFunction: showState,
    updateModelIndicatorFunction: updateModelIndicator
  });

  // Show initial loading state
  showState('loading');

  // Display current model in the UI
  displayCurrentModel();

  // Process any messages that were received before DOM was loaded
  processQueuedMessages();

  // Tell the content script we're ready
  notifyPopupReady();
});
