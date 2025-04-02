/**
 * EngageIQ Chrome Extension
 * Content Script - Runs in the context of LinkedIn pages
 * 
 * After refactoring, this file now orchestrates the different modules and
 * handles initialization of the extension's content script functionality.
 */

import { initializeButtonInjection } from './ui/button-injector.js';
import { 
  getOrCreateIframe,
  sendMessageToIframe,
  showIframe,
  hideIframe,
  setActiveCommentBox,
  getActiveCommentBox,
  resetActiveCommentBox,
  initializeIframeManager
} from './ui/iframe-manager.js';
import {
  extractPostContent,
  validatePostContent,
  preparePostContent
} from './services/post-extractor.js';
import {
  handleRegenerationRequest,
  handleAcceptedSuggestion,
  generateCommentSuggestions,
  findAllCommentBoxes
} from './services/message-service.js';

console.log('EngageIQ: Content Script Loaded');

/**
 * Custom message handler for iframe messages
 * @param {MessageEvent} event - The message event from the iframe
 */
function handleCustomIframeMessages(event) {
  switch (event.data.type) {
    case 'REQUEST_SHORTER':
    case 'REQUEST_LONGER':
      // Handle regeneration requests using the message service
      handleRegenerationRequest(event.data.type, event.data, sendMessageToIframe)
        .catch(error => {
          console.error('EngageIQ: Error handling regeneration request:', error);
        });
      break;

    case 'ACCEPT_SUGGESTION':
      // Handle accepted suggestion using the message service
      handleAcceptedSuggestion(
        event.data,
        getActiveCommentBox(),
        findAllCommentBoxes,
        hideIframe,
        resetActiveCommentBox
      );
      break;

    default:
      console.log(`EngageIQ: Unhandled iframe message type: ${event.data.type}`);
  }
}

/**
 * Handles the click event on the EngageIQ icon button.
 * Toggles the visibility of the popup iframe and handles communication.
 * @param {Event} event - The click event object.
 */
function handleEngageIQButtonClick(event) {
  // Prevent default button behavior and event propagation
  event.preventDefault();
  event.stopPropagation();

  console.log('EngageIQ: Button clicked.');

  // Store the active comment box reference
  const commentBox = event.currentTarget.closest('[data-engageiq-button-injected="true"]');
  setActiveCommentBox(commentBox);

  // Get or create the iframe
  const iframe = getOrCreateIframe();

  // Toggle iframe visibility
  if (iframe.style.display === 'none' || iframe.style.display === '') {
    showIframe();

    // Get the clicked button element
    const clickedButton = event.currentTarget;
    
    // Extract and validate post content
    const extractedText = extractPostContent(clickedButton);
    const validationResult = validatePostContent(extractedText);
    
    if (!validationResult.isValid) {
      console.error(`EngageIQ: ${validationResult.errorMessage}`);
      sendMessageToIframe({
        type: 'SHOW_ERROR',
        error: 'Extraction Failed',
        details: validationResult.errorMessage,
      });
      return; // Stop processing if validation failed
    }

    // Content is valid, prepare it for the background script
    const postContent = preparePostContent(extractedText);
    
    // Generate comment suggestions using the message service
    generateCommentSuggestions(postContent, sendMessageToIframe)
      .catch(error => {
        console.error('EngageIQ: Error generating comment suggestions:', error);
      });
  } else {
    hideIframe();
  }
}

// --- Initialize modules ---

// Initialize the iframe manager with custom message handler
initializeIframeManager(handleCustomIframeMessages);

// Initialize the button injection with the button click handler
initializeButtonInjection(handleEngageIQButtonClick);

// --- End of content_script.js ---
