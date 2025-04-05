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
let directionsState;

// Current state tracking (for state transitions)
let currentState = null;
let previousState = null;

/**
 * Initializes the state controller with required DOM references
 * @param {Object} config - Configuration object with DOM element references
 * @param {HTMLElement} config.loadingElement - The loading state container element
 * @param {HTMLElement} config.errorElement - The error state container element
 * @param {HTMLElement} config.suggestionsElement - The suggestions state container element
 * @param {HTMLElement} [config.directionsElement] - The directions state container element (optional)
 */
export function initStateController(config) {
  loadingState = config.loadingElement;
  errorState = config.errorElement;
  suggestionsState = config.suggestionsElement;
  directionsState = config.directionsElement || null;
  
  console.log('EngageIQ: State Controller initialized');
}

/**
 * Shows a specific state element and hides the others
 * @param {string} stateToShow - 'loading', 'error', 'suggestions', 'directions', 
 *                             'loading_directions', 'loading_comments'
 */
export function showState(stateToShow) {
  // Safety check if DOM references aren't initialized yet
  if (!loadingState || !errorState || !suggestionsState) {
    console.warn(
      `EngageIQ: Cannot change UI state to ${stateToShow} - DOM references not initialized`
    );
    return;
  }

  // Save previous state for potential navigation
  if (currentState !== stateToShow) {
    previousState = currentState;
    currentState = stateToShow;
  }

  console.log(`EngageIQ: Changing UI state to: ${stateToShow}`);

  // Hide all states first
  loadingState.style.display = 'none';
  errorState.style.display = 'none';
  suggestionsState.style.display = 'none';
  if (directionsState) {
    directionsState.style.display = 'none';
  }

  // Update loading message based on the state
  const loadingSpan = loadingState.querySelector('span:not(.visually-hidden)');
  if (loadingSpan) {
    if (stateToShow === 'loading_directions') {
      loadingSpan.textContent = 'Analyzing post content...';
    } else if (stateToShow === 'loading_comments') {
      loadingSpan.textContent = 'Generating comment suggestions...';
    } else {
      loadingSpan.textContent = 'Loading...';
    }
  }

  // Show the requested state
  switch (stateToShow) {
    case 'loading':
    case 'loading_directions':
    case 'loading_comments':
      loadingState.style.display = 'block';
      break;
    case 'error':
      errorState.style.display = 'block';
      break;
    case 'suggestions':
      suggestionsState.style.display = 'block';
      break;
    case 'directions':
      if (directionsState) {
        directionsState.style.display = 'block';
      } else {
        console.warn('EngageIQ: Directions state container not initialized');
      }
      break;
    default:
      console.warn(`EngageIQ: Unknown state: ${stateToShow}`);
  }
}

/**
 * Returns to the previous state (if available)
 * @returns {boolean} True if successfully navigated to previous state, false otherwise
 */
export function goToPreviousState() {
  if (previousState) {
    console.log(`EngageIQ: Going back to previous state: ${previousState}`);
    const temp = currentState; // Save current state before switching
    currentState = previousState;
    previousState = temp;
    showState(currentState);
    return true;
  }
  
  console.log('EngageIQ: No previous state available');
  return false;
}

/**
 * Gets the current state
 * @returns {string|null} Current state or null if not set
 */
export function getCurrentState() {
  return currentState;
}

/**
 * Gets the previous state
 * @returns {string|null} Previous state or null if not available
 */
export function getPreviousState() {
  return previousState;
}
