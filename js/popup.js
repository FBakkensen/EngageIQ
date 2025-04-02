/**
 * EngageIQ Chrome Extension - Popup Script (popup.js)
 *
 * This script runs within the iframe (popup.html) displayed on LinkedIn pages.
 * It coordinates:
 *  - UI component initialization
 *  - Message service setup
 *  - Initial state configuration
 *
 * It serves as the primary entry point for the popup UI, integrating:
 *  - UI modules (suggestion-renderer, error-handler, accordion-controller, etc.)
 *  - Service modules (popup-message-service, etc.)
 *  - State and display controllers
 */

// Import UI modules
import { initSuggestionRenderer } from './ui/suggestion-renderer.js';
import { initErrorHandler } from './ui/error-handler.js';
import { initAccordion } from './ui/accordion-controller.js';
import { initStateController, showState } from './ui/state-controller.js';
import { initModelIndicator, displayCurrentModel } from './ui/model-indicator.js';

// Import message service module
import { 
  initPopupMessageService,
  notifyPopupReady,
  processQueuedMessages,
  sendMessageToContentScript
} from './services/popup-message-service.js';

// Log script load confirmation - Compliant with user preference for prefixing logs
console.log('EngageIQ: Popup Script Loaded');

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('EngageIQ: Popup DOM Loaded');

  // Get DOM element references
  const loadingState = document.getElementById('loadingState');
  const errorState = document.getElementById('errorState');
  const errorMessage = document.getElementById('errorMessage');
  const suggestionsAccordion = document.getElementById('suggestionsAccordion');
  const modelIndicator = document.getElementById('modelIndicator');

  // Initialize the state controller
  initStateController({
    loadingElement: loadingState,
    errorElement: errorState,
    suggestionsElement: suggestionsAccordion
  });

  // Initialize the model indicator
  initModelIndicator({
    modelIndicatorElement: modelIndicator
  });

  // Initialize the accordion controller 
  initAccordion(suggestionsAccordion);
  
  // Initialize the suggestion renderer module
  initSuggestionRenderer({
    accordionElement: suggestionsAccordion,
    showStateFunction: showState,
    sendMessageFunction: sendMessageToContentScript
  });
  
  // Initialize the error handler module
  initErrorHandler({
    errorMessageElement: errorMessage,
    showStateFunction: showState
  });

  // Initialize the message service
  initPopupMessageService({
    showStateFunction: showState
  });

  // Show initial loading state
  showState('loading');

  // Display current model in the UI
  displayCurrentModel();

  // Process any messages that were received before DOM was loaded
  processQueuedMessages();

  // Tell the content script we're ready
  notifyPopupReady();
  
  console.log('EngageIQ: Popup initialization complete');
});
