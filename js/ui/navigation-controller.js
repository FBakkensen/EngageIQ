/**
 * EngageIQ Chrome Extension - Navigation Controller Module (navigation-controller.js)
 *
 * This module handles navigation between different UI states in the popup.
 * It is responsible for:
 *  - Managing back button functionality
 *  - Preserving state during navigation
 *  - Handling keyboard navigation
 */

// Import state controller for state management
import { goToPreviousState, getCurrentState } from '/js/ui/state-controller.js';
import { sendMessageToContentScript } from '/js/services/popup-message-service.js';

// Log module load confirmation
console.log('EngageIQ: Navigation Controller Module Loaded');

// Reference to back button element (if exists)
let backButton;

/**
 * Initializes the navigation controller with required DOM references
 * @param {Object} config - Configuration object with DOM element references
 * @param {HTMLElement} [config.backButtonElement] - The back button element (optional)
 */
export function initNavigationController(config) {
  backButton = config.backButtonElement || null;
  
  // Set up listeners
  setupEventListeners();
  
  console.log('EngageIQ: Navigation Controller initialized');
}

/**
 * Sets up event listeners for navigation
 */
function setupEventListeners() {
  // Back button click handler
  if (backButton) {
    backButton.addEventListener('click', handleBackButtonClick);
  }
  
  // Keyboard navigation handler
  window.addEventListener('keydown', handleKeyboardNavigation);
  
  console.log('EngageIQ: Navigation event listeners set up');
}

/**
 * Handles back button clicks
 * @param {Event} event - The click event
 */
function handleBackButtonClick(event) {
  event.preventDefault();
  navigateBack();
}

/**
 * Handles keyboard navigation events
 * @param {KeyboardEvent} event - The keyboard event
 */
function handleKeyboardNavigation(event) {
  // ESC key for back navigation
  if (event.key === 'Escape') {
    navigateBack();
  }
  
  // We could add more keyboard shortcuts here if needed
}

/**
 * Navigates back based on current state
 * @returns {boolean} True if navigation was successful, false otherwise
 */
export function navigateBack() {
  const currentState = getCurrentState();
  
  // Handle navigation based on current state
  if (currentState === 'suggestions') {
    // When in suggestions, navigate back to directions
    console.log('EngageIQ: Navigating back from suggestions to directions');
    sendMessageToContentScript({
      type: 'BACK_TO_DIRECTIONS'
    });
    return true;
  } else {
    // For other states, use the general state controller's back functionality
    return goToPreviousState();
  }
}

/**
 * Disables the back button
 */
export function disableBackButton() {
  if (backButton) {
    backButton.disabled = true;
    backButton.classList.add('disabled');
  }
}

/**
 * Enables the back button
 */
export function enableBackButton() {
  if (backButton) {
    backButton.disabled = false;
    backButton.classList.remove('disabled');
  }
}

/**
 * Updates back button visibility based on current state
 * @param {string} state - Current UI state
 */
export function updateBackButtonVisibility(state) {
  if (!backButton) return;
  
  // Only show back button in certain states
  if (state === 'suggestions' || state === 'directions') {
    backButton.style.display = 'block';
    enableBackButton();
  } else {
    backButton.style.display = 'none';
  }
}
