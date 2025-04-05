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
import { initSuggestionRenderer } from '/js/ui/suggestion-renderer.js';
import { initErrorHandler } from '/js/ui/error-handler.js';
import { initAccordion } from '/js/ui/accordion-controller.js';
import { initStateController, showState } from '/js/ui/state-controller.js';
import { initModelIndicator, displayCurrentModel } from '/js/ui/model-indicator.js';
import { initDirectionCards } from '/js/ui/direction-card.js';
import { initNavigationController, updateBackButtonVisibility } from '/js/ui/navigation-controller.js';

// Import service modules
import { 
  initPopupComms,
  processQueuedMessages,
  sendMessageToContentScript,
  processMessage
} from '/js/services/popup-comms.js';
import {
  hasActiveSession,
  getLastState,
  getDirections,
  getSuggestions
} from '/js/services/state-persistence-service.js';

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
  const directionsContainer = document.getElementById('directionsContainer');
  const modelIndicator = document.getElementById('modelIndicator');
  const backButton = document.getElementById('backButton');
  const loadingMessage = document.getElementById('loadingMessage');
  const contentContainer = document.getElementById('contentContainer');

  // Initialize the state controller
  initStateController({
    loadingElement: loadingState,
    errorElement: errorState,
    suggestionsElement: suggestionsAccordion,
    directionsElement: directionsContainer
  });

  // Initialize the navigation controller
  initNavigationController({
    backButtonElement: backButton
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
  
  // Initialize the direction cards module
  initDirectionCards({
    containerElement: directionsContainer,
    showStateFunction: showState,
    sendMessageFunction: sendMessageToContentScript
  });
  
  // Initialize the error handler module
  initErrorHandler({
    errorMessageElement: errorMessage,
    showStateFunction: showState
  });

  // Initialize the popup comms
  initPopupComms({
    loadingElement: loadingState,
    loadingMessage: loadingMessage,
    contentContainer: contentContainer,
    errorContainer: errorState,
    errorMessageElement: errorMessage,
    backButton: backButton
  });

  // Wrapper function to ensure processMessage is called from the current context
  function handleMessageFromContentScript(eventData) {
    if (eventData && eventData.type) {
      processMessage(eventData); // Call the imported function
    } else {
      console.warn('EngageIQ: [popup message handler] Received message without type:', eventData);
    }
  }

  // *** Add the crucial message listener ***
  window.addEventListener('message', (event) => {
    // Basic security check: Ensure the message is from the expected source if possible,
    // though for extensions, checking if it's from the parent might suffice.
    // IMPORTANT: In a production scenario, origin checking is critical.
    if (event.source !== window.parent) {
      // Ignore messages not from the parent window (content script)
      // console.warn('EngageIQ: Ignoring message from unexpected source.');
      return;
    }

    // Call the wrapper function instead of processMessage directly
    handleMessageFromContentScript(event.data);
  });
  
  // Add close button functionality
  const closeButton = document.getElementById('closeButton');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      sendMessageToContentScript({ type: 'CLOSE_POPUP' });
    });
  }

  // Add ESC key functionality (handled by navigation controller now)
  
  // Determine initial state based on session persistence
  let initialState = 'loading';
  
  // Check if there's an active session and restore state if possible
  if (hasActiveSession()) {
    const lastState = getLastState();
    
    // If the last state was showing directions and we have them, show them
    if (lastState === 'directions') {
      const directions = getDirections();
      if (directions && directions.length > 0) {
        console.log('EngageIQ: Restoring directions from previous session');
        // The direction-cards module will handle showing the directions
        // once they've been loaded from storage
        initialState = 'directions';
      }
    }
    // If the last state was showing suggestions and we have them, show them
    else if (lastState === 'suggestions') {
      const suggestions = getSuggestions();
      if (suggestions && suggestions.length > 0) {
        console.log('EngageIQ: Restoring suggestions from previous session');
        // The suggestion-renderer module will handle showing the suggestions
        // once they've been loaded from storage
        initialState = 'suggestions';
      }
    }
  }

  // Show initial state
  showState(initialState);
  
  // Update back button visibility based on initial state
  updateBackButtonVisibility(initialState);

  // Display current model in the UI
  displayCurrentModel();

  // Process any messages that were received before DOM was loaded
  processQueuedMessages();

  // Tell the content script we're ready
  sendMessageToContentScript({ type: 'POPUP_READY' });
  
  console.log('EngageIQ: Popup initialization complete');
});
