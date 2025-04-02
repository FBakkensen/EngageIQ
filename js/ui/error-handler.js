/**
 * EngageIQ Chrome Extension - Error Handler Module (error-handler.js)
 *
 * This module handles error display and messaging in the popup UI.
 * It is responsible for:
 *  - Converting technical error messages to user-friendly formats
 *  - Displaying error messages in the UI with proper formatting
 *  - Handling error actions and guidance for users
 */

// Log module load confirmation - Compliant with user preference
console.log('EngageIQ: Error Handler Module Loaded');

/**
 * References to DOM elements (to be initialized when module is used)
 */
let errorMessage;
let showStateFn; // Function to show different UI states

/**
 * Initializes the module with required DOM elements and functions
 * @param {Object} config - Configuration object with required references
 * @param {HTMLElement} config.errorMessageElement - The error message element
 * @param {Function} config.showStateFunction - Function to switch UI states
 */
export function initErrorHandler(config) {
  errorMessage = config.errorMessageElement;
  showStateFn = config.showStateFunction;
  
  console.log('EngageIQ: Error Handler initialized');
}

/**
 * Displays error message in the error state element with improved user experience
 * @param {string} message - The error message to display
 * @param {string} [details] - Optional error details
 * @param {Object} [actionData] - Optional action guidance { text: string }
 */
export function displayError(message, details, actionData) {
  // Safety check if DOM references aren't initialized yet
  if (!errorMessage || !showStateFn) {
    console.warn(
      'EngageIQ: Cannot display error - Error Handler not initialized'
    );
    return;
  }

  console.log(`EngageIQ: Displaying error: ${message}`);

  // Get error action elements
  const errorAction = document.getElementById('errorAction');
  const errorActionText = document.getElementById('errorActionText');

  // Display the main error message
  errorMessage.textContent =
    getUserFriendlyErrorMessage(message) || 'Unknown error';

  // Display action guidance if provided
  if (errorAction && errorActionText && actionData && actionData.text) {
    errorActionText.textContent = actionData.text;
    errorAction.style.display = 'block';
  } else if (errorAction) {
    errorAction.style.display = 'none';
  }

  // Log additional details if provided
  if (details) {
    console.log(`EngageIQ: Error details: ${details}`);
  }

  showStateFn('error');
}

/**
 * Converts technical error messages to user-friendly messages
 * @param {string} technicalMessage - The original error message
 * @returns {string} A user-friendly error message
 */
export function getUserFriendlyErrorMessage(technicalMessage) {
  if (!technicalMessage) return 'An unknown error occurred';

  // Map of technical error messages to user-friendly messages
  const errorMessageMap = {
    'API key not found':
      'No API key has been set. Please go to the extension options to set your API key.',
    'Invalid API key':
      'The API key you provided appears to be invalid. Please check your API key in the extension options.',
    'Network error':
      'Could not connect to the AI service. Please check your internet connection and try again.',
    'Rate limit exceeded':
      'You have made too many requests. Please wait a few minutes and try again.',
    'Content extraction failed':
      "We couldn't analyze the post content. Please try again or use a different post.",
    'No suggestions available':
      "We couldn't generate suggestions for this post. The content may be too short or not appropriate for comments.",
    'Content policy violation':
      "We couldn't generate suggestions because the content may violate our content policy.",
    'Generation failed':
      'We encountered an issue while generating suggestions. Please try again.',
    SAFETY:
      "We couldn't generate suggestions because the content may contain sensitive topics.",
  };

  // Check for exact matches in our map
  if (errorMessageMap[technicalMessage]) {
    return errorMessageMap[technicalMessage];
  }

  // Check for partial matches
  for (const key in errorMessageMap) {
    if (technicalMessage.includes(key)) {
      return errorMessageMap[key];
    }
  }

  // Return the original message if no mapping found
  return technicalMessage;
}

/**
 * Creates a standardized error action guidance object
 * @param {string} actionText - The text describing the action users can take
 * @returns {Object} An action data object for displayError
 */
export function createErrorAction(actionText) {
  return {
    text: actionText
  };
}

/**
 * Common error action factory for API key issues
 * @returns {Object} Formatted error action for API key issues
 */
export function getApiKeyErrorAction() {
  return createErrorAction('Open the extension options page to set or update your API key.');
}

/**
 * Common error action factory for network issues
 * @returns {Object} Formatted error action for network issues
 */
export function getNetworkErrorAction() {
  return createErrorAction('Please check your internet connection and try again later.');
}
