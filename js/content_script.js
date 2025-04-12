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
const imageContextDebugUrl = chrome.runtime.getURL('js/utils/ImageContextDebug.js');
const imageManagerUrl = chrome.runtime.getURL('js/utils/ImageManager.js');
const imageValidatorUrl = chrome.runtime.getURL('js/utils/ImageValidator.js');

// Global storage for app state
let appState = {
  currentPostContent: null,
  currentDirections: null,
  currentLanguageCode: null, // Added to store detected language
  currentImageData: null, // Added to store image data from post
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
  import(statePersistenceUrl),
  import(imageContextDebugUrl),
  import(imageManagerUrl),
  import(imageValidatorUrl)
])
.then(([buttonInjector, iframeManager, postExtractor, messageService, directionService,
        statePersistence, { ImageContextDebug }, { ImageManager }, { ImageValidator }]) => {
  // Store modules for easier access
  modules.buttonInjector = buttonInjector;
  modules.iframeManager = iframeManager;
  modules.postExtractor = postExtractor;
  modules.messageService = messageService;
  modules.directionService = directionService;
  modules.statePersistence = statePersistence;
  modules.ImageContextDebug = ImageContextDebug;
  modules.ImageManager = ImageManager;
  modules.ImageValidator = ImageValidator;

  console.log('EngageIQ: All modules loaded successfully');

  // Initialize debug features if enabled
  setTimeout(() => {
    console.log('EngageIQ: Checking image context debug status...');
    console.log('EngageIQ: Image context debug enabled:', modules.ImageContextDebug.isEnabled());

    // Force a debug message to verify logging is working
    modules.ImageContextDebug.logInfo('Content script initialization complete. Image context debug ready.');

    // Add global debug function for image validation
    window.debugImageValidation = async function() {
      if (modules.ImageValidator && typeof modules.ImageValidator.debugValidateAllImages === 'function') {
        console.log('Image validation debugging started...');
        const results = await modules.ImageValidator.debugValidateAllImages();
        console.log('Image validation complete!', results);
        return results;
      } else {
        console.warn('Image validation debugging not available');
        return 'Image validation debugging not available';
      }
    };
  }, 1000);

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
    case 'REQUEST_LONGER': {
      // Handle regeneration requests using the message service
      const iframePayload = event.data; // Contains reactionType, originalText
      const languageCode = appState.currentLanguageCode; // Get language from state

      // Basic check for languageCode
      if (!languageCode) {
          console.error('EngageIQ: Missing language code in appState for regeneration request.');
          modules.iframeManager.sendMessageToIframe({
            type: 'SHOW_ERROR',
            error: 'Internal Error',
            details: 'Could not find the language code needed for regeneration.',
            payload: { reactionType: iframePayload?.reactionType },
          });
          break; // Don't proceed without language code
      }

      modules.messageService.handleRegenerationRequest(
        iframePayload.type,
        iframePayload, // Pass the original iframe payload
        languageCode,  // Pass the language code separately
        modules.iframeManager.sendMessageToIframe
      )
      .catch(error => {
        console.error('EngageIQ: Error handling regeneration request:', error);
      });
      break;
    }

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
      console.log('EngageIQ: [content] Handling DIRECTION_SELECTED message');
      // Retrieve the stored post content and language code
      const postContent = appState.currentPostContent;
      const languageCode = appState.currentLanguageCode;
      console.log(`EngageIQ: [content] Retrieved for direction selection - PostContent: ${!!postContent}, LanguageCode: ${languageCode}`);

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
        languageCode, // Pass the retrieved language code here
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
    const postContent = modules.postExtractor.preparePostContent(extractedText, clickedButton);

    // Store post content in app state and persistence service
    appState.currentPostContent = postContent;
    modules.statePersistence.savePostContent(postContent);

    // Find the post element for image extraction
    const postElement = findPostElementFromButton(clickedButton);

    // Process the images from the post if present
    if (postElement) {
      // Show loading with image processing indication
      modules.iframeManager.sendMessageToIframe({
        type: 'SHOW_LOADING',
        message: 'Processing content and images...'
      });

      // Extract images and post content
      modules.ImageManager.extractPostContent(postElement)
        .then(imageResult => {
          if (imageResult.success && imageResult.hasImages) {
            console.log(`EngageIQ: Successfully extracted ${imageResult.images.length} images from post`);

            // Store image data in app state
            appState.currentImageData = {
              hasImages: true,
              count: imageResult.images.length,
              images: imageResult.images.map(img => ({
                base64Data: img.base64Data,
                dimensions: `${img.width}x${img.height}`,
                size: `${img.sizeKB}KB`,
                mimeType: img.mimeType
              }))
            };

            // Enhance post content with image data
            postContent.hasImages = true;
            postContent.imageData = appState.currentImageData;

            // Update stored content
            appState.currentPostContent = postContent;
            modules.statePersistence.savePostContent(postContent);

            console.log('EngageIQ: Post content enriched with image data');
          } else {
            console.log('EngageIQ: No valid images found in post');
            appState.currentImageData = { hasImages: false };
          }

          // Proceed with direction analysis
          proceedWithContentAnalysis(postContent);
        })
        .catch(error => {
          console.error('EngageIQ: Error extracting images:', error);
          // Continue without images if extraction fails
          appState.currentImageData = { hasImages: false, error: error.message };
          proceedWithContentAnalysis(postContent);
        });
    } else {
      // No post element found, continue without images
      appState.currentImageData = { hasImages: false };
      proceedWithContentAnalysis(postContent);
    }

    // Clear any previous session data when starting fresh
    modules.statePersistence.saveLastState('initial');
  } else {
    modules.iframeManager.hideIframe();
  }
}

/**
 * Continue with content analysis after handling image extraction
 * @param {Object} postContent - The prepared post content object
 */
function proceedWithContentAnalysis(postContent) {
  // Check if we should use the one-step or two-step process
  if (appState.isTwoStepProcess) {
    // Use the two-step process with direction analysis first
    modules.directionService.handleDirectionAnalysis(
      postContent,
      modules.iframeManager.sendMessageToIframe
    )
    .then(response => {
      // Store directions for possible back navigation
      if (response && response.success) { // Check for success before storing
        appState.currentDirections = response.directions;
        appState.currentLanguageCode = response.languageCode; // Store language code
        console.log(`EngageIQ: Stored language code in appState: ${appState.currentLanguageCode}`); // Log stored code
        // Save last state as 'directions'
        modules.statePersistence.saveLastState('directions');
      } // No need for else here, error is handled by catch or background script response
    })
    .catch(error => {
      console.error('EngageIQ: Error analyzing directions:', error);
      // Error should have already been sent to iframe by directionService
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
}

/**
 * Find the LinkedIn post element from a clicked EngageIQ button
 * @param {HTMLElement} button - The clicked EngageIQ button
 * @returns {HTMLElement|null} - The parent post element or null if not found
 */
function findPostElementFromButton(button) {
  if (!button) return null;

  // Walk up the DOM to find the post element
  let element = button;

  // First check if inside a comment box
  const commentBox = element.closest('[data-engageiq-button-injected="true"]');
  if (commentBox) {
    // From comment box, go up to find the post
    element = commentBox;
  }

  // Try to find the LinkedIn post container
  const post = element.closest('.feed-shared-update-v2');
  if (post) return post;

  // Alternative selectors if the first one doesn't work
  return element.closest('.occludable-update') ||
         element.closest('.feed-item-container') ||
         null;
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

  // Set up debug features in global window scope
  setupDebugHelpers();

  console.log('EngageIQ: Application initialization complete');
}

/**
 * Setup debug helpers by exposing key functionality to window object
 * This allows testing and debugging from the developer console
 */
function setupDebugHelpers() {
  // Only expose in development mode
  const isDevelopment = true; // Set based on your build configuration or environment variables

  if (isDevelopment) {
    // Create a namespace for all debug functionality
    window.EngageIQDebug = {
      // Debug flags
      enableImageDebug: () => {
        modules.ImageContextDebug.enableDebug();
        console.log('Image context debug mode enabled');
        return 'Debug mode activated';
      },

      disableImageDebug: () => {
        modules.ImageContextDebug.disableDebug();
        console.log('Image context debug mode disabled');
        return 'Debug mode deactivated';
      },

      // Image detection and validation
      debugImageDetection: () => {
        const ImageSelector = modules.ImageManager.ImageSelector || {};
        if (typeof ImageSelector.debugFindAllPostImages === 'function') {
          return ImageSelector.debugFindAllPostImages();
        } else {
          return modules.ImageSelector?.debugFindAllPostImages() ||
                 'Image detection debugging not available';
        }
      },

      // Use the ImageValidator module's debugValidateAllImages function directly
      debugImageValidation: async () => {
        try {
          console.log('Image validation debugging started...');
          if (modules.ImageValidator && typeof modules.ImageValidator.debugValidateAllImages === 'function') {
            const results = await modules.ImageValidator.debugValidateAllImages();
            console.log('Image validation complete!', results);
            return results;
          } else {
            console.warn('Image validation debugging not available - ImageValidator module not properly loaded');
            return 'Image validation debugging not available - module not loaded';
          }
        } catch (error) {
          console.error('Error during image validation debugging:', error);
          return `Error during image validation: ${error.message}`;
        }
      },

      // Image processing
      debugProcessImages: () => {
        const ImageProcessor = modules.ImageManager.ImageProcessor || {};
        if (typeof ImageProcessor.debugProcessAllPostImages === 'function') {
          return ImageProcessor.debugProcessAllPostImages();
        } else {
          return modules.ImageProcessor?.debugProcessAllPostImages() ||
                 'Image processing debugging not available';
        }
      },

      // Full flow testing
      debugExtractAllPosts: () => {
        if (modules.ImageManager && typeof modules.ImageManager.debugExtractAllPosts === 'function') {
          return modules.ImageManager.debugExtractAllPosts();
        }
        return 'Post extraction debugging not available';
      },

      // Get current app state
      getAppState: () => {
        // Remove base64 data from the returned state to avoid console overload
        const safeState = {...appState};
        if (safeState.currentImageData && safeState.currentImageData.images) {
          safeState.currentImageData.images = safeState.currentImageData.images.map(img => {
            const {base64Data, ...rest} = img;
            return {
              ...rest,
              base64Data: base64Data ? '[BASE64_DATA]' : null
            };
          });
        }
        return safeState;
      },

      // Module access for debugging
      modules: {
        ImageContextDebug: modules.ImageContextDebug,
        ImageManager: modules.ImageManager,
        ImageValidator: modules.ImageValidator
      }
    };

    // Add direct access to commonly used debug functions
    window.debugImageDetection = window.EngageIQDebug.debugImageDetection;
    window.debugImageValidation = window.EngageIQDebug.debugImageValidation;
    window.debugProcessImages = window.EngageIQDebug.debugProcessImages;
    window.debugExtractAllPosts = window.EngageIQDebug.debugExtractAllPosts;

    console.log('%cEngageIQ Debug Tools Available:', 'color: #4CAF50; font-weight: bold');
    console.log('- window.debugImageDetection()');
    console.log('- window.debugImageValidation()');
    console.log('- window.debugProcessImages()');
    console.log('- window.debugExtractAllPosts()');
    console.log('- window.EngageIQDebug.enableImageDebug()');
    console.log('- window.EngageIQDebug.disableImageDebug()');
    console.log('- window.EngageIQDebug.getAppState()');
  }
}

// --- End of content_script.js ---
