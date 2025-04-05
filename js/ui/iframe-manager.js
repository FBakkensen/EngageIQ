/**
 * EngageIQ Chrome Extension
 * Iframe Manager Module - Handles the creation and management of the popup iframe
 */

console.log('EngageIQ: Iframe Manager Module Loaded');

// --- Module level variables ---
let engageIQIframe = null; // Reference to the iframe element
let pendingIframeMessages = []; // Store messages that need to be sent to the iframe
let popupReady = false; // Track if the popup has reported it's ready to receive messages
let activeCommentBox = null; // Track the active comment box that was clicked
let messageHandler = null; // External message handler callback

/**
 * Gets the existing iframe or creates it if it doesn't exist.
 * Ensures only one instance of the iframe is added to the page.
 * @returns {HTMLIFrameElement} The EngageIQ popup iframe element.
 */
function getOrCreateIframe() {
  if (!engageIQIframe) {
    console.log('EngageIQ: Creating popup iframe.');
    engageIQIframe = document.createElement('iframe');
    engageIQIframe.id = 'engageiq-popup-iframe'; // ID matches css/content_style.css

    // Apply Bootstrap utility classes
    engageIQIframe.classList.add(
      'position-fixed',
      'border-0',
      'bg-white',
      'shadow-lg',
      'overflow-hidden',
      'd-none' // Bootstrap class for display: none
    );

    // Use chrome.runtime.getURL to access extension resources
    try {
      engageIQIframe.src = chrome.runtime.getURL('html/popup.html');
      engageIQIframe.allow = 'clipboard-write'; // Grant clipboard permission to the iframe
      console.log('EngageIQ: Iframe src set to:', engageIQIframe.src);
      document.body.appendChild(engageIQIframe);
      console.log('EngageIQ: Iframe appended to body.');

      // Reset popup ready state when creating a new iframe
      popupReady = false;

      // Setup message listener for communication from iframe
      setupIframeMessageListener();
    } catch (error) {
      console.error(
        'EngageIQ: Error setting iframe src or appending to body:',
        error
      );
      // Handle error appropriately, maybe return null or throw
      return null;
    }
  } else {
    console.log('EngageIQ: Reusing existing popup iframe.');
  }
  return engageIQIframe;
}

/**
 * Sets up a listener for messages from the popup iframe
 */
function setupIframeMessageListener() {
  window.addEventListener('message', handleIframeMessage);
}

/**
 * Handles messages received from the popup iframe
 * @param {MessageEvent} event - The message event object
 */
function handleIframeMessage(event) {
  // Check if the message is from our iframe
  if (!engageIQIframe || !event.data || !event.data.type) {
    return; // Not for us or not properly formatted
  }

  console.log('EngageIQ: Received message from iframe:', event.data.type);

  switch (event.data.type) {
    case 'POPUP_READY':
      console.log('EngageIQ: Popup reported ready to receive messages');
      popupReady = true;

      // Send any pending messages
      if (pendingIframeMessages.length > 0) {
        console.log(
          `EngageIQ: Sending ${pendingIframeMessages.length} pending messages to popup`
        );
        pendingIframeMessages.forEach((message) => {
          sendMessageToIframe(message);
        });
        pendingIframeMessages = [];
      }
      break;

    default:
      // Handle any other message type through the provided message handler
      if (messageHandler && typeof messageHandler === 'function') {
        messageHandler(event);
      } else {
        console.log(
          `EngageIQ: Unhandled iframe message type: ${event.data.type}`
        );
      }
  }
}

/**
 * Sends a message to the popup iframe, queuing it if the popup isn't ready yet
 * @param {Object} message - The message to send to the iframe
 */
function sendMessageToIframe(message) {
  if (!engageIQIframe) {
    console.warn('EngageIQ: Cannot send message - iframe does not exist');
    return;
  }

  // If popup isn't ready, queue the message for later
  if (!popupReady) {
    console.log('EngageIQ: Popup not ready, queuing message:', message.type);
    pendingIframeMessages.push(message);
    return;
  }

  // Popup is ready, send the message directly
  try {
    engageIQIframe.contentWindow.postMessage(message, '*');
    console.log(`EngageIQ: Message sent to iframe: ${message.type}`);
  } catch (error) {
    console.error('EngageIQ: Error sending message to iframe:', error);
  }
}

/**
 * Shows the iframe
 */
function showIframe() {
  const iframe = getOrCreateIframe();
  // Use Bootstrap classes instead of direct style manipulation
  iframe.classList.remove('d-none');
  iframe.classList.add('visible'); // Add animation class
}

/**
 * Hides the iframe with optional animation
 * @param {boolean} animated - Whether to animate the hiding
 */
function hideIframe(animated = true) {
  if (!engageIQIframe) return;
  
  console.log('EngageIQ: Hiding popup iframe.');
  if (animated) {
    engageIQIframe.classList.remove('visible'); // Remove animation class
    // Add a small delay before hiding to allow animation to complete
    setTimeout(() => {
      engageIQIframe.classList.add('d-none');
    }, 200); // 200ms delay for animation to complete
  } else {
    engageIQIframe.classList.add('d-none');
  }
}

/**
 * Sets the active comment box
 * @param {HTMLElement} commentBox - The comment box element
 */
function setActiveCommentBox(commentBox) {
  activeCommentBox = commentBox;
}

/**
 * Gets the active comment box
 * @returns {HTMLElement} The active comment box element
 */
function getActiveCommentBox() {
  return activeCommentBox;
}

/**
 * Resets the active comment box reference
 */
function resetActiveCommentBox() {
  activeCommentBox = null;
}

/**
 * Initializes the iframe manager with a custom message handler
 * @param {Function} customMessageHandler - Function to handle custom iframe messages
 */
function initializeIframeManager(customMessageHandler) {
  // Store the custom message handler
  messageHandler = customMessageHandler;
  
  // Clean up any existing event listeners before setting up new ones
  window.removeEventListener('message', handleIframeMessage);
  
  // Setup the iframe message listener
  setupIframeMessageListener();
  
  console.log('EngageIQ: Iframe Manager initialized');
}

// Export the module functions
export {
  getOrCreateIframe,
  sendMessageToIframe,
  showIframe,
  hideIframe,
  setActiveCommentBox,
  getActiveCommentBox,
  resetActiveCommentBox,
  initializeIframeManager
};
