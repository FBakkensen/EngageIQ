/**
 * EngageIQ Chrome Extension - State Controller Module (state-controller.js)
 *
 * This module handles the state management for the popup UI.
 * It is responsible for:
 *  - Showing and hiding different UI states (loading, error, suggestions)
 *  - Managing DOM references to state elements
 */

// Log module load confirmation
console.log('EngageIQ: State Controller Module Loaded');

// References to DOM elements (to be initialized when module is used)
let loadingState;
let errorState;
let suggestionsState;

/**
 * Initializes the state controller with required DOM references
 * @param {Object} config - Configuration object with DOM element references
 * @param {HTMLElement} config.loadingElement - The loading state container element
 * @param {HTMLElement} config.errorElement - The error state container element
 * @param {HTMLElement} config.suggestionsElement - The suggestions state container element
 */
export function initStateController(config) {
  loadingState = config.loadingElement;
  errorState = config.errorElement;
  suggestionsState = config.suggestionsElement;
  
  console.log('EngageIQ: State Controller initialized');
}

/**
 * Shows a specific state element and hides the others
 * @param {string} stateToShow - 'loading', 'error', or 'suggestions'
 */
export function showState(stateToShow) {
  // Safety check if DOM references aren't initialized yet
  if (!loadingState || !errorState || !suggestionsState) {
    console.warn(
      `EngageIQ: Cannot change UI state to ${stateToShow} - DOM references not initialized`
    );
    return;
  }

  console.log(`EngageIQ: Changing UI state to: ${stateToShow}`);

  // Hide all states first
  loadingState.style.display = 'none';
  errorState.style.display = 'none';
  suggestionsState.style.display = 'none';

  // Show the requested state
  switch (stateToShow) {
    case 'loading':
      loadingState.style.display = 'block';
      break;
    case 'error':
      errorState.style.display = 'block';
      break;
    case 'suggestions':
      suggestionsState.style.display = 'block';
      break;
    default:
      console.warn(`EngageIQ: Unknown state: ${stateToShow}`);
  }
}
