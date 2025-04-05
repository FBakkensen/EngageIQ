/**
 * EngageIQ Chrome Extension
 * Popup Message Service Module
 * 
 * This module handles the communication between the popup UI and background script.
 * It processes messages, updates UI states, and manages the popup lifecycle.
 */

// Import UI components and services
import { displayDirections } from '../ui/direction-card.js';
import { displaySuggestions } from '../ui/suggestion-renderer.js';
import { getDirections, getSelectedDirection, getSuggestions } from './state-persistence-service.js';
import { initErrorHandler, displayError, createErrorAction, getApiKeyErrorAction, getNetworkErrorAction } from '../ui/error-handler.js';

// Log module load confirmation
console.log('EngageIQ: Popup Message Service Module Loaded');

// Element references
let loadingElement;
let loadingMessage;
let contentContainer;
let errorContainer;
let errorMessageElement;
let backButton;

// Tracking the current UI state
let currentState = 'initial';
let previousState = null;

/**
 * Initializes the popup message service
 * @param {Object} elements - References to DOM elements
 */
export function initPopupMessageService(elements) {
  loadingElement = elements.loadingElement;
  loadingMessage = elements.loadingMessage;
  contentContainer = elements.contentContainer;
  errorContainer = elements.errorContainer;
  errorMessageElement = elements.errorMessageElement;
  backButton = elements.backButton;
  
  // Initialize the error handler
  initErrorHandler({
    errorMessageElement: errorMessageElement,
    showStateFunction: showState
  });
  
  console.log('EngageIQ: Popup Message Service initialized');
  
  // Set up event listeners for retry button
  const retryButton = document.getElementById('retryButton');
  if (retryButton) {
    retryButton.addEventListener('click', handleRetry);
    
    // Add animation classes for better feedback
    retryButton.classList.add('focus-visible-pulse');
  }
  
  // Set up back button with keyboard accessibility and animations
  if (backButton) {
    backButton.classList.add('focus-visible-pulse');
    backButton.setAttribute('aria-label', 'Go back to directions selection');
  }
  
  // Check for any messages in the queue
  processQueuedMessages();
}

/**
 * Shows a specific UI state with smooth transitions
 * @param {string} state - The state to show ('loading', 'directions', 'suggestions', 'error')
 * @param {string} [message] - Optional message for loading state
 * @param {boolean} [skipAnimation] - Whether to skip animation (useful for initial states)
 */
export function showState(state, message, skipAnimation = false) {
  if (state === currentState && !message) {
    return; // No change needed
  }
  
  // Store the previous state for transition direction
  previousState = currentState;
  
  // Update the current state before animations
  currentState = state;
  
  console.log(`EngageIQ: UI state changing from ${previousState} to ${state}`);
  
  // Prepare for animation by determining the transition type
  const usingSlideAnimation = !skipAnimation && (state === 'suggestions' || previousState === 'suggestions');
  const slideDirection = (previousState === 'directions' && state === 'suggestions') ? 'right' : 'left';
  
  // Set up transition classes
  function getTransitionClasses(element, isCurrentState) {
    if (skipAnimation) return;
    
    if (usingSlideAnimation) {
      if (isCurrentState) {
        return slideDirection === 'right' ? 'slide-in-right' : 'slide-in-left';
      } else {
        return slideDirection === 'right' ? 'slide-out-left' : 'slide-out-right';
      }
    } else {
      return isCurrentState ? 'fade-in' : 'fade-out';
    }
  }
  
  // Function to handle the actual state change after animation
  function changeStateContent() {
    // Hide all states first
    loadingElement.style.display = 'none';
    contentContainer.style.display = 'none';
    errorContainer.style.display = 'none';
    
    // Remove any animation classes to prevent interference
    loadingElement.classList.remove('fade-in', 'fade-out', 'slide-in-right', 'slide-in-left', 'slide-out-left', 'slide-out-right');
    contentContainer.classList.remove('fade-in', 'fade-out', 'slide-in-right', 'slide-in-left', 'slide-out-left', 'slide-out-right');
    errorContainer.classList.remove('fade-in', 'fade-out', 'slide-in-right', 'slide-in-left', 'slide-out-left', 'slide-out-right');
    
    // Show appropriate state
    switch (state) {
      case 'loading':
        loadingElement.style.display = 'flex';
        if (message) {
          loadingMessage.textContent = message;
        } else {
          loadingMessage.textContent = 'Loading...';
        }
        // Add loading pulse animation
        loadingMessage.classList.add('loading-pulse');
        break;
      case 'directions':
        contentContainer.style.display = 'block';
        // Hide back button on directions screen
        if (backButton) backButton.style.display = 'none';
        break;
      case 'suggestions':
        contentContainer.style.display = 'block';
        // Show back button on suggestions screen with animation
        if (backButton) {
          backButton.style.display = 'inline-block';
          backButton.classList.add('fade-in');
          
          // Remove animation class after it completes
          setTimeout(() => {
            backButton.classList.remove('fade-in');
          }, 300);
        }
        break;
      case 'error':
        errorContainer.style.display = 'block';
        // Focus on retry button if available
        setTimeout(() => {
          const retryButton = document.getElementById('retryButton');
          if (retryButton) retryButton.focus();
        }, 100);
        break;
      default:
        console.warn(`EngageIQ: Unknown state: ${state}`);
        loadingElement.style.display = 'flex';
        loadingMessage.textContent = 'Loading...';
    }
    
    // Add entrance animation class to the newly visible element
    const newElement = state === 'loading' ? loadingElement : 
                       (state === 'error' ? errorContainer : contentContainer);
    
    if (!skipAnimation) {
      newElement.classList.add(getTransitionClasses(newElement, true));
      
      // Remove animation class after it completes
      setTimeout(() => {
        newElement.classList.remove('fade-in', 'fade-out', 'slide-in-right', 'slide-in-left', 'slide-out-left', 'slide-out-right');
      }, 300); // Duration matches CSS animation time
    }
    
    console.log(`EngageIQ: UI state changed to ${state}`);
    
    // Announce state change to screen readers
    announceStateChange(state, message);
  }
  
  // If we're skipping animation, just change the state immediately
  if (skipAnimation) {
    changeStateContent();
    return;
  }
  
  // Get the current visible element for exit animation
  const currentElement = previousState === 'loading' ? loadingElement : 
                        (previousState === 'error' ? errorContainer : contentContainer);
  
  // Add exit animation to current element
  currentElement.classList.add(getTransitionClasses(currentElement, false));
  
  // After exit animation completes, change content and play entrance animation
  setTimeout(changeStateContent, 300); // Duration matches CSS animation time
}

/**
 * Announces state changes to screen readers for accessibility
 * @param {string} state - The current state
 * @param {string} [message] - Optional message to include
 */
function announceStateChange(state, message) {
  let announcement = '';
  
  switch (state) {
    case 'loading':
      announcement = message || 'Loading content, please wait.';
      break;
    case 'directions':
      announcement = 'Direction options available. Use arrow keys to navigate between options.';
      break;
    case 'suggestions':
      announcement = 'Suggestions loaded. Use tab to navigate between suggestions.';
      break;
    case 'error':
      announcement = 'An error occurred. ' + (message || '');
      break;
  }
  
  // Create or get announcer element
  let announcer = document.getElementById('sr-state-announcer');
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'sr-state-announcer';
    announcer.className = 'visually-hidden';
    announcer.setAttribute('aria-live', 'assertive');
    announcer.setAttribute('aria-atomic', 'true');
    document.body.appendChild(announcer);
  }
  
  // Set the announcement
  announcer.textContent = announcement;
  
  // Clear after a delay
  setTimeout(() => {
    announcer.textContent = '';
  }, 3000);
}

/**
 * Process messages from the content script
 * @param {Object} data - Message data
 */
export function processMessage(data) {
  console.log(`EngageIQ: Processing message: ${data.type}`);
  
  switch (data.type) {
    case 'SHOW_LOADING':
      showState('loading', data.message || 'Generating suggestions...');
      break;
      
    case 'SHOW_DIRECTIONS_LOADING':
      showState('loading', 'Analyzing post content for directions...');
      break;
      
    case 'SHOW_DIRECTIONS':
      if (data.directions && Array.isArray(data.directions)) {
        displayDirections(data.directions, _event => {
          // Direction selection is handled by direction-card.js
          // which will trigger a message to generate comments
        });
        showState('directions');
      } else {
        displayError(
          'Failed to load directions', 
          'No direction data available', 
          createErrorAction('Please try again or refresh the page.')
        );
      }
      break;
      
    case 'SHOW_SUGGESTIONS':
      if (data.suggestions) {
        displaySuggestions(data.suggestions, data.direction);
        showState('suggestions');
      } else {
        // Try to get suggestions from session storage as fallback
        const suggestions = getSuggestions();
        const selectedDirection = getSelectedDirection();
        
        if (suggestions && selectedDirection) {
          displaySuggestions(suggestions, selectedDirection);
          showState('suggestions');
        } else {
          displayError(
            'Failed to load suggestions', 
            'No suggestion data available', 
            createErrorAction('Please try again or select a different direction.')
          );
        }
      }
      break;
      
    case 'SHOW_ERROR':
      handleErrorMessage(data);
      break;
      
    default:
      console.warn(`EngageIQ: Unknown message type: ${data.type}`);
  }
}

/**
 * Handles error messages with improved contextual feedback
 * @param {Object} data - Error message data
 */
function handleErrorMessage(data) {
  console.error('EngageIQ: Error message received:', data);
  
  let actionData;
  
  // Check for specific error types and provide appropriate action guidance
  if (data.errorType) {
    switch (data.errorType) {
      case 'api_key_error':
        actionData = getApiKeyErrorAction();
        break;
      case 'network_error':
      case 'timeout_error':
        actionData = getNetworkErrorAction();
        break;
      case 'rate_limit_error':
        actionData = createErrorAction('Please wait a few minutes and try again.');
        break;
      case 'content_filter_error':
        actionData = createErrorAction('Try with different content or approach.');
        break;
      default:
        // Use action hint from API if available
        if (data.actionHint) {
          actionData = createErrorAction(data.actionHint);
        } else {
          actionData = createErrorAction('Please try again later.');
        }
    }
  } else if (data.actionHint) {
    // Use action hint from data if error type not specified
    actionData = createErrorAction(data.actionHint);
  }
  
  // Display the error with details and action guidance
  displayError(data.error || 'Unknown error', data.details, actionData);
}

/**
 * Process any queued messages (e.g., from previous actions)
 */
function processQueuedMessages() {
  // Check if we have stored directions and no current state
  if (currentState === 'initial') {
    const directions = getDirections();
    const suggestions = getSuggestions();
    const selectedDirection = getSelectedDirection();
    
    if (suggestions && selectedDirection) {
      // We have suggestions, so show them
      displaySuggestions(suggestions, selectedDirection);
      showState('suggestions', null, true); // Skip animation for initial state
    } else if (directions && directions.length > 0) {
      // We have directions but no suggestions, so show directions
      displayDirections(directions, _event => {
        // Direction selection is handled by direction-card.js
      });
      showState('directions', null, true); // Skip animation for initial state
    }
    // Otherwise, stay in initial state waiting for messages
  }
}

/**
 * Handles retry attempts for failed API requests
 */
function handleRetry() {
  console.log('EngageIQ: User initiated retry');
  
  // Add animation feedback for the retry button
  const retryButton = document.getElementById('retryButton');
  if (retryButton) {
    retryButton.classList.add('btn-pulse');
    setTimeout(() => retryButton.classList.remove('btn-pulse'), 500);
  }
  
  // Check what state we should retry
  if (currentState === 'error') {
    const directions = getDirections();
    
    if (directions && directions.length > 0) {
      // We have previous directions, so show those first
      displayDirections(directions, _event => {
        // Direction selection is handled by direction-card.js
      });
      showState('directions');
    } else {
      // No directions, start fresh with loading state
      showState('loading', 'Retrying request...');
      
      // Send retry message to content script
      window.parent.postMessage({ type: 'RETRY_REQUEST' }, '*');
    }
  }
}
