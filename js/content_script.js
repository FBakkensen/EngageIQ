/**
 * EngageIQ Chrome Extension
 * Content Script - Runs in the context of LinkedIn pages
 * 
 * After refactoring, this file now orchestrates the different modules and
 * handles initialization of the extension's content script functionality.
 */

// Use chrome.runtime.getURL to get absolute paths to modules
const buttonInjectorUrl = chrome.runtime.getURL('js/ui/button-injector.js');
const iframeManagerUrl = chrome.runtime.getURL('js/ui/iframe-manager.js');
const postExtractorUrl = chrome.runtime.getURL('js/services/post-extractor.js');
const messageServiceUrl = chrome.runtime.getURL('js/services/message-service.js');
const directionServiceUrl = chrome.runtime.getURL('js/services/direction-service.js');
const statePersistenceUrl = chrome.runtime.getURL('js/services/state-persistence-service.js');

// Global storage for app state
let appState = {
  currentPostContent: null,
  currentDirections: null,
  isTwoStepProcess: true // Enable the two-step process by default
};

// Load modules dynamically to ensure proper Chrome extension context
let modules = {};

console.log('EngageIQ: Content Script Loaded - Loading modules...');

// Initialize modules and start the application after all modules are loaded
Promise.all([
  import(buttonInjectorUrl),
  import(iframeManagerUrl),
  import(postExtractorUrl),
  import(messageServiceUrl),
  import(directionServiceUrl),
  import(statePersistenceUrl)
])
.then(([buttonInjector, iframeManager, postExtractor, messageService, directionService, statePersistence]) => {
  // Store modules for easier access
  modules.buttonInjector = buttonInjector;
  modules.iframeManager = iframeManager;
  modules.postExtractor = postExtractor;
  modules.messageService = messageService;
  modules.directionService = directionService;
  modules.statePersistence = statePersistence;
  
  console.log('EngageIQ: All modules loaded successfully');
  
  // Start the application with loaded modules
  initializeApp();
})
.catch(error => {
  console.error('EngageIQ: Error loading modules:', error);
});

/**
 * Custom message handler for iframe messages
 * @param {MessageEvent} event - The message event from the iframe
 */
function handleCustomIframeMessages(event) {
  switch (event.data.type) {
    case 'REQUEST_SHORTER':
    case 'REQUEST_LONGER':
      // Handle regeneration requests using the message service
      modules.messageService.handleRegenerationRequest(
        event.data.type, 
        event.data, 
        modules.iframeManager.sendMessageToIframe
      )
      .catch(error => {
        console.error('EngageIQ: Error handling regeneration request:', error);
      });
      break;

    case 'ACCEPT_SUGGESTION':
      // Handle accepted suggestion using the message service
      modules.messageService.handleAcceptedSuggestion(
        event.data,
        modules.iframeManager.getActiveCommentBox(),
        modules.messageService.findAllCommentBoxes,
        modules.iframeManager.hideIframe,
        modules.iframeManager.resetActiveCommentBox
      );
      break;
      
    case 'DIRECTION_SELECTED': {
      // Retrieve the stored post content
      const postContent = modules.statePersistence.getPostContent();

      if (!postContent) {
        console.error('EngageIQ: Could not retrieve post content for direction selection.');
        modules.iframeManager.sendMessageToIframe({
          type: 'SHOW_ERROR',
          error: 'Missing Post Content',
          details: 'Could not retrieve the original post content to generate comments.',
          actionHint: 'Please close the popup and try activating it on the post again.'
        });
        break; // Stop processing if post content is missing
      }

      // Call the direction service to handle the selection, passing the post content
      modules.directionService.handleDirectionSelection(
        event.data.direction,
        postContent, // Pass the retrieved post content here
        modules.iframeManager.sendMessageToIframe
      )
      .catch(error => {
        console.error('EngageIQ: [content_script] Error calling handleDirectionSelection:', error);
        // Send error back to iframe
        modules.iframeManager.sendMessageToIframe({
          type: 'SHOW_ERROR',
          error: 'Error Handling Direction Selection',
          details: 'An error occurred while handling the direction selection.',
          actionHint: 'Please try again or contact support.'
        });
      });
      break;
    }
      
    case 'BACK_TO_DIRECTIONS':
      // Handle navigation back to directions screen
      
      // Show previously generated directions
      modules.directionService.handleBackToDirections(
        appState.currentDirections,
        modules.iframeManager.sendMessageToIframe
      );
      break;

    case 'RETRY_REQUEST': {
      // Handle retry request from the popup
      
      // Check for stored post content
      const storedPostContent = modules.statePersistence.getPostContent();
      
      if (storedPostContent) {
        // We have stored post content, use that
        appState.currentPostContent = storedPostContent;
      }
      
      // If we have post content, retry the direction analysis
      if (appState.currentPostContent) {
        // Show loading message
        modules.iframeManager.sendMessageToIframe({
          type: 'SHOW_LOADING',
          message: 'Retrying analysis...'
        });
        
        // Retry the direction analysis
        modules.directionService.handleDirectionAnalysis(
          appState.currentPostContent, 
          modules.iframeManager.sendMessageToIframe
        )
        .then(response => {
          // Store directions for possible back navigation
          if (response && response.directions) {
            appState.currentDirections = response.directions;
          }
        })
        .catch(error => {
          console.error('EngageIQ: Error retrying direction analysis:', error);
        });
      } else {
        // No stored post content, show error
        modules.iframeManager.sendMessageToIframe({
          type: 'SHOW_ERROR',
          error: 'Retry Failed',
          details: 'No post content available to retry',
          actionHint: 'Please close the popup and try again'
        });
      }
      break;
    }

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

  // Store the active comment box reference
  const commentBox = event.currentTarget.closest('[data-engageiq-button-injected="true"]');
  modules.iframeManager.setActiveCommentBox(commentBox);

  // Get or create the iframe
  const iframe = modules.iframeManager.getOrCreateIframe();

  // Toggle iframe visibility
  if (iframe.style.display === 'none' || iframe.style.display === '') {
    modules.iframeManager.showIframe();

    // Get the clicked button element
    const clickedButton = event.currentTarget;
    
    // Extract and validate post content
    const extractedText = modules.postExtractor.extractPostContent(clickedButton);
    const validationResult = modules.postExtractor.validatePostContent(extractedText);
    
    if (!validationResult.isValid) {
      console.error(`EngageIQ: ${validationResult.errorMessage}`);
      modules.iframeManager.sendMessageToIframe({
        type: 'SHOW_ERROR',
        error: 'Extraction Failed',
        details: validationResult.errorMessage,
        actionHint: 'Try with a different post'
      });
      return; // Stop processing if validation failed
    }

    // Content is valid, prepare it for the background script
    const postContent = modules.postExtractor.preparePostContent(extractedText);
    
    // Store post content in app state and persistence service
    appState.currentPostContent = postContent;
    modules.statePersistence.savePostContent(postContent);
    
    // Clear any previous session data when starting fresh
    modules.statePersistence.saveLastState('initial');
    
    // Check if we should use the one-step or two-step process
    if (appState.isTwoStepProcess) {
      // Use the two-step process with direction analysis first
      modules.directionService.handleDirectionAnalysis(
        postContent, 
        modules.iframeManager.sendMessageToIframe
      )
      .then(response => {
        // Store directions for possible back navigation
        if (response && response.directions) {
          appState.currentDirections = response.directions;
          // Save last state as 'directions'
          modules.statePersistence.saveLastState('directions');
        }
      })
      .catch(error => {
        console.error('EngageIQ: Error analyzing directions:', error);
      });
    } else {
      // Use the original one-step process
      modules.messageService.generateCommentSuggestions(
        postContent, 
        modules.iframeManager.sendMessageToIframe
      )
      .catch(error => {
        console.error('EngageIQ: Error generating comment suggestions:', error);
      });
    }
  } else {
    modules.iframeManager.hideIframe();
  }
}

/**
 * Initializes the application after all modules are loaded
 */
function initializeApp() {
  console.log('EngageIQ: Initializing application...');
  
  // Initialize the iframe manager with custom message handler
  modules.iframeManager.initializeIframeManager(handleCustomIframeMessages);

  // Initialize the button injection with the button click handler
  console.log('EngageIQ: Initializing button injection process');

  // First, perform an immediate check for any comment boxes already on the page
  const initialCommentBoxes = modules.buttonInjector.findCommentBoxes();
  console.log(`EngageIQ: Initial scan found ${initialCommentBoxes.length} comment boxes`);

  // Process any comment boxes found during initial scan
  if (initialCommentBoxes.length > 0) {
    modules.buttonInjector.processCommentBoxes(handleEngageIQButtonClick);
  }

  // Then initialize the observer to watch for future comment boxes
  modules.buttonInjector.initializeButtonInjection(handleEngageIQButtonClick);
  
  console.log('EngageIQ: Application initialization complete');
}

// --- End of content_script.js ---
