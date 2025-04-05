/**
 * EngageIQ Chrome Extension - Error Handler Module (error-handler.js)
 *
 * This module handles error display and messaging in the popup UI.
 * It is responsible for:
 *  - Converting technical error messages to user-friendly formats
 *  - Displaying error messages in the UI with proper formatting
 *  - Handling error actions and guidance for users
 *  - Providing smooth animation transitions for error states
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
  
  // Initialize retry button animations
  const retryButton = document.getElementById('retryButton');
  if (retryButton) {
    retryButton.addEventListener('click', handleRetryClick);
  }
  
  console.log('EngageIQ: Error Handler initialized');
}

/**
 * Handles retry button click with animation
 * @param {Event} event - The click event
 */
function handleRetryClick(event) {
  const button = event.currentTarget;
  
  // Add animation class for visual feedback
  button.classList.add('btn-pulse');
  
  // Remove the animation class after it completes
  setTimeout(() => {
    button.classList.remove('btn-pulse');
  }, 500);
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

  // Get error elements
  const errorContainer = document.getElementById('errorState');
  const errorHeading = errorContainer?.querySelector('.alert-heading');
  const errorAction = document.getElementById('errorAction');
  const errorActionText = document.getElementById('errorActionText');
  const retryButton = document.getElementById('retryButton');

  // Check if we're already showing this exact error to avoid unnecessary animations
  const isShowingSameError = 
    errorMessage.textContent === getUserFriendlyErrorMessage(message);

  if (!isShowingSameError) {
    // Apply entrance animation
    errorContainer?.classList.add('fade-in');
    
    // Remove animation class after it completes
    setTimeout(() => {
      errorContainer?.classList.remove('fade-in');
    }, 300);
    
    // Display the main error message with subtle animation
    const friendlyMessage = getUserFriendlyErrorMessage(message) || 'Unknown error';
    errorMessage.textContent = friendlyMessage;
    
    // Add shake animation for new errors
    if (errorHeading) {
      errorHeading.classList.add('shake');
      setTimeout(() => {
        errorHeading.classList.remove('shake');
      }, 800);
    }
  }

  // Display action guidance if provided
  if (errorAction && errorActionText && actionData && actionData.text) {
    errorActionText.textContent = actionData.text;
    errorAction.style.display = 'block';
    
    // Highlight the action text briefly
    errorActionText.classList.add('highlight-text');
    setTimeout(() => {
      errorActionText.classList.remove('highlight-text');
    }, 1000);
  } else if (errorAction) {
    errorAction.style.display = 'none';
  }
  
  // Ensure retry button is properly styled and accessible
  if (retryButton) {
    retryButton.classList.add('focus-visible-pulse');
    retryButton.setAttribute('aria-label', 'Retry request');
  }

  // Log additional details if provided
  if (details) {
    console.log(`EngageIQ: Error details: ${details}`);
  }

  // Show the error state
  showStateFn('error');
  
  // Announce to screen readers
  announceErrorToScreenReader(message, actionData?.text);
}

/**
 * Announces error message to screen readers
 * @param {string} message - The error message
 * @param {string} [actionGuidance] - Optional action guidance
 */
function announceErrorToScreenReader(message, actionGuidance) {
  // Find or create the announcer element
  let announcer = document.getElementById('sr-error-announcer');
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'sr-error-announcer';
    announcer.className = 'visually-hidden';
    announcer.setAttribute('aria-live', 'assertive');
    announcer.setAttribute('aria-atomic', 'true');
    document.body.appendChild(announcer);
  }
  
  // Format the announcement
  const friendlyMessage = getUserFriendlyErrorMessage(message);
  let announcement = `Error: ${friendlyMessage}`;
  if (actionGuidance) {
    announcement += ` ${actionGuidance}`;
  }
  
  // Set the announcement text
  announcer.textContent = announcement;
  
  // Clear after a delay
  setTimeout(() => {
    announcer.textContent = '';
  }, 3000);
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
