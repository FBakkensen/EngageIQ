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

// Load modules dynamically to ensure proper Chrome extension context
let modules = {};

console.log('EngageIQ: Content Script Loaded - Loading modules...');

// Initialize modules and start the application after all modules are loaded
Promise.all([
  import(buttonInjectorUrl),
  import(iframeManagerUrl),
  import(postExtractorUrl),
  import(messageServiceUrl)
])
.then(([buttonInjector, iframeManager, postExtractor, messageService]) => {
  // Store modules for easier access
  modules.buttonInjector = buttonInjector;
  modules.iframeManager = iframeManager;
  modules.postExtractor = postExtractor;
  modules.messageService = messageService;
  
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
      });
      return; // Stop processing if validation failed
    }

    // Content is valid, prepare it for the background script
    const postContent = modules.postExtractor.preparePostContent(extractedText);
    
    // Generate comment suggestions using the message service
    modules.messageService.generateCommentSuggestions(
      postContent, 
      modules.iframeManager.sendMessageToIframe
    )
    .catch(error => {
      console.error('EngageIQ: Error generating comment suggestions:', error);
    });
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
