/**
 * EngageIQ Chrome Extension
 * Popup Communications Module
 * 
 * This module handles the communication between the popup UI and background script.
 * It processes messages, updates UI states, and manages the popup lifecycle.
 */

// Import UI components and services
import { displayDirections } from '../ui/direction-card.js';
import { displaySuggestions, updateSingleSuggestion } from '../ui/suggestion-renderer.js';
import { showState } from '../ui/state-controller.js'; // <<< IMPORT THE CORRECT showState
import { getDirections, getSelectedDirection, getSuggestions } from './state-persistence-service.js';
import { displayError, createErrorAction, getApiKeyErrorAction, getNetworkErrorAction } from '../ui/error-handler.js';

// Log module load confirmation
console.log('EngageIQ: Popup Communications Module Loaded');

// Element references
let backButton;

// Tracking the current UI state
let currentState = 'initial';

/**
 * Initializes the popup communications
 * @param {Object} elements - References to DOM elements
 */
export function initPopupComms(elements) {
  backButton = elements.backButton;
  
  console.log('EngageIQ: Popup Communications initialized');
  
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
      console.log('EngageIQ: [popup-message] Received SHOW_DIRECTIONS message.', data);
      try {
        // Use directions directly from the message data
        const directions = data.directions;
        console.log('EngageIQ: [popup-message] Retrieved directions from storage:', directions);
        
        if (!directions || !Array.isArray(directions) || directions.length === 0) {
          console.error('EngageIQ: [popup-message] No valid directions found in storage.');
          displayError(
            'Failed to load directions', 
            'Direction data is missing or invalid.', 
            createErrorAction('Please try reloading the extension or the page.')
          );
          break; // Exit the case
        }
        
        console.log('EngageIQ: [popup-message] Calling displayDirections...');
        displayDirections(directions);
        console.log('EngageIQ: [popup-message] displayDirections called.');
      } catch (error) {
        console.error('EngageIQ: [popup-message] Error processing SHOW_DIRECTIONS:', error);
        displayError(
          'UI Update Error', 
          'Failed to display direction cards.', 
          createErrorAction('Please try reloading the extension or the page.')
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

    case 'UPDATE_SINGLE_SUGGESTION':
      if (data.suggestion) {
        updateSingleSuggestion(data.suggestion); 
      } else {
        console.warn('EngageIQ: Received UPDATE_SINGLE_SUGGESTION without suggestion data.');
      }
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
export function processQueuedMessages() {
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
      displayDirections(directions);
      showState('directions', null, true); // Skip animation for initial state
    }
    // Otherwise, stay in initial state waiting for messages
  }
}

/**
 * Sends a message to the parent window (content script)
 * @param {Object} message - The message object to send
 */
export function sendMessageToContentScript(message) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(message, '*'); 
    console.log('EngageIQ: Message sent to content script:', message);
  } else {
    console.error('EngageIQ: Cannot send message, window.parent is not accessible.');
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
      displayDirections(directions);
      showState('directions');
    } else {
      // No directions, start fresh with loading state
      showState('loading', 'Retrying request...');
      
      // Send retry message to content script
      sendMessageToContentScript({ type: 'RETRY_REQUEST' });
    }
  }
}
