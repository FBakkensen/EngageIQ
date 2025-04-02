/**
 * EngageIQ Chrome Extension - Popup Script (popup.js)
 *
 * This script runs within the iframe (popup.html) displayed on LinkedIn pages.
 * It handles:
 *  - Receiving messages from the content script (e.g., show loading, display suggestions).
 *  - Sending messages back to the content script (e.g., accept suggestion, request regeneration).
 *  - Managing the UI elements within the popup (accordion, buttons, etc.).
 */

// Log script load confirmation - Compliant with user preference MEMORY[e17fa962-c53a-4d19-ae3a-66c3cbc4dce7]
console.log('EngageIQ: Popup Script Loaded');

// Global element references (initialized in DOMContentLoaded)
let loadingState;
let errorState;
let errorMessage;
let suggestionsAccordion;

// Queue to store messages received before DOM is loaded
const messageQueue = [];

/**
 * Shows a specific state element and hides the others
 * @param {string} stateToShow - 'loading', 'error', or 'suggestions'
 */
function showState(stateToShow) {
  // Safety check if DOM references aren't initialized yet
  if (!loadingState || !errorState || !suggestionsAccordion) {
    console.warn(
      `EngageIQ: Cannot change UI state to ${stateToShow} - DOM references not initialized`
    );
    return;
  }

  console.log(`EngageIQ: Changing UI state to: ${stateToShow}`);

  // Hide all states first
  loadingState.style.display = 'none';
  errorState.style.display = 'none';
  suggestionsAccordion.style.display = 'none';

  // Show the requested state
  switch (stateToShow) {
    case 'loading':
      loadingState.style.display = 'block';
      break;
    case 'error':
      errorState.style.display = 'block';
      break;
    case 'suggestions':
      suggestionsAccordion.style.display = 'block';
      break;
    default:
      console.warn(`EngageIQ: Unknown state requested: ${stateToShow}`);
  }
}

/**
 * Displays error message in the error state element with improved user experience
 * @param {string} message - The error message to display
 * @param {string} [details] - Optional error details
 * @param {Object} [actionData] - Optional action guidance { text: string }
 */
function displayError(message, details, actionData) {
  // Safety check if DOM references aren't initialized yet
  if (!errorMessage) {
    console.warn(
      'EngageIQ: Cannot display error - DOM references not initialized'
    );
    return;
  }

  console.log(`EngageIQ: Displaying error: ${message}`);
  
  // Get error action elements
  const errorAction = document.getElementById('errorAction');
  const errorActionText = document.getElementById('errorActionText');
  
  // Display the main error message
  errorMessage.textContent = getUserFriendlyErrorMessage(message) || 'Unknown error';

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

  showState('error');
}

/**
 * Converts technical error messages to user-friendly messages
 * @param {string} technicalMessage - The original error message
 * @returns {string} A user-friendly error message
 */
function getUserFriendlyErrorMessage(technicalMessage) {
  if (!technicalMessage) return 'An unknown error occurred';
  
  // Map of technical error messages to user-friendly messages
  const errorMessageMap = {
    'API key not found': 'No API key has been set. Please go to the extension options to set your API key.',
    'Invalid API key': 'The API key you provided appears to be invalid. Please check your API key in the extension options.',
    'Network error': 'Could not connect to the AI service. Please check your internet connection and try again.',
    'Rate limit exceeded': 'You have made too many requests. Please wait a few minutes and try again.',
    'Content extraction failed': 'We couldn\'t analyze the post content. Please try again or use a different post.',
    'No suggestions available': 'We couldn\'t generate suggestions for this post. The content may be too short or not appropriate for comments.',
    'Content policy violation': 'We couldn\'t generate suggestions because the content may violate our content policy.',
    'Generation failed': 'We encountered an issue while generating suggestions. Please try again.',
    'SAFETY': 'We couldn\'t generate suggestions because the content may contain sensitive topics.'    
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
 * Displays suggestions in the accordion
 * @param {Array} suggestions - Array of suggestion objects
 */
function displaySuggestions(suggestions) {
  // Safety check if DOM references aren't initialized yet
  if (!suggestionsAccordion) {
    console.warn(
      'EngageIQ: Cannot display suggestions - DOM references not initialized'
    );
    return;
  }

  console.log(`EngageIQ: Displaying ${suggestions.length} suggestions`);

  // Clear existing content
  suggestionsAccordion.innerHTML = '';

  // Define reaction type order (LinkedIn standard reactions)
  const reactionOrder = [
    'like',
    'celebrate',
    'support',
    'funny',
    'love',
    'insightful',
  ];

  // Convert suggestions array to an object keyed by reaction type for easy access
  const suggestionsByType = {};
  suggestions.forEach((suggestion) => {
    // Use the id property instead of type
    if (suggestion.id) {
      suggestionsByType[suggestion.id.toLowerCase()] = suggestion;
    }
  });

  // Iterate through ordered reaction types
  reactionOrder.forEach((reactionType) => {
    const suggestion = suggestionsByType[reactionType];

    // Skip if no suggestion for this reaction type
    if (!suggestion) {
      console.log(`EngageIQ: No suggestion for reaction type: ${reactionType}`);
      return;
    }

    // Create unique IDs for this reaction type
    const itemId = `suggestion-${reactionType}`;

    // Create accordion item
    const accordionItem = document.createElement('div');
    accordionItem.className = 'accordion-item';

    // Create header
    const accordionHeader = document.createElement('h2');
    accordionHeader.className = 'accordion-header';
    accordionHeader.id = `heading-${itemId}`;

    const button = document.createElement('button');
    button.className = 'accordion-button collapsed';
    button.type = 'button';
    button.setAttribute('data-bs-toggle', 'collapse');
    button.setAttribute('data-bs-target', `#collapse-${itemId}`);
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', `collapse-${itemId}`);
    button.setAttribute('data-reaction-type', reactionType); // Store reaction type for manual toggle

    // Capitalize first letter of reaction type for display
    const displayType =
      reactionType.charAt(0).toUpperCase() + reactionType.slice(1);
    button.textContent = displayType;

    // Add manual click handler to toggle collapse
    button.addEventListener('click', toggleAccordion);

    accordionHeader.appendChild(button);

    // Create body
    const collapseDiv = document.createElement('div');
    collapseDiv.id = `collapse-${itemId}`;
    collapseDiv.className = 'accordion-collapse collapse';
    collapseDiv.setAttribute('aria-labelledby', `heading-${itemId}`);
    collapseDiv.setAttribute('data-bs-parent', '#suggestionsAccordion');

    const accordionBody = document.createElement('div');
    accordionBody.className = 'accordion-body';

    // Add suggestion text paragraph
    const textParagraph = document.createElement('p');
    textParagraph.id = `suggestion-text-${reactionType}`;
    textParagraph.className = 'suggestion-text mb-2';
    textParagraph.textContent =
      suggestion.text || 'No suggestion text available';
    accordionBody.appendChild(textParagraph);

    // Add button group for controls
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'btn-group btn-group-sm';
    buttonGroup.setAttribute('role', 'group');
    buttonGroup.setAttribute('aria-label', 'Suggestion controls');

    // Add decrease length button
    const decreaseBtn = document.createElement('button');
    decreaseBtn.type = 'button';
    decreaseBtn.className = 'btn btn-outline-secondary';
    decreaseBtn.textContent = '-';
    decreaseBtn.setAttribute('data-reaction', reactionType);
    decreaseBtn.setAttribute('data-action', 'decrease');
    decreaseBtn.title = 'Make suggestion shorter';
    buttonGroup.appendChild(decreaseBtn);

    // Add increase length button
    const increaseBtn = document.createElement('button');
    increaseBtn.type = 'button';
    increaseBtn.className = 'btn btn-outline-secondary';
    increaseBtn.textContent = '+';
    increaseBtn.setAttribute('data-reaction', reactionType);
    increaseBtn.setAttribute('data-action', 'increase');
    increaseBtn.title = 'Make suggestion longer';
    buttonGroup.appendChild(increaseBtn);

    // Add accept button
    const acceptBtn = document.createElement('button');
    acceptBtn.type = 'button';
    acceptBtn.className = 'btn btn-primary ms-2';
    acceptBtn.textContent = 'Accept';
    acceptBtn.setAttribute('data-reaction', reactionType);
    acceptBtn.setAttribute('data-action', 'accept');
    acceptBtn.title = 'Use this suggestion';
    buttonGroup.appendChild(acceptBtn);

    // Add button group to accordion body
    accordionBody.appendChild(buttonGroup);
    collapseDiv.appendChild(accordionBody);

    // Add header and body to the accordion item
    accordionItem.appendChild(accordionHeader);
    accordionItem.appendChild(collapseDiv);

    // Add the complete item to the accordion
    suggestionsAccordion.appendChild(accordionItem);
  });

  // Add event listeners to the buttons
  addAccordionButtonListeners();

  // Try to initialize Bootstrap's Collapse, but we have a fallback toggle handler too
  try {
    if (window.bootstrap && window.bootstrap.Collapse) {
      const accordionButtons =
        suggestionsAccordion.querySelectorAll('.accordion-button');
      accordionButtons.forEach((button) => {
        const targetId = button.getAttribute('data-bs-target');
        if (targetId) {
          const collapseElement = document.querySelector(targetId);
          if (collapseElement) {
            new window.bootstrap.Collapse(collapseElement, {
              toggle: false,
            });
            console.log(
              `EngageIQ: Initialized Bootstrap collapse for ${targetId}`
            );
          }
        }
      });
    }
  } catch (error) {
    console.error('EngageIQ: Error initializing Bootstrap:', error);
  }

  showState('suggestions');
}

/**
 * Manual toggle handler for accordion items
 * @param {Event} event - Click event
 */
function toggleAccordion(event) {
  event.preventDefault(); // Prevent default behavior

  const button = event.currentTarget;
  const targetId = button.getAttribute('data-bs-target');

  if (!targetId) return;

  const collapseElement = document.querySelector(targetId);
  if (!collapseElement) return;

  // Check if Bootstrap's Collapse is available
  if (window.bootstrap && window.bootstrap.Collapse) {
    // Try to use Bootstrap
    try {
      const bsCollapse = window.bootstrap.Collapse.getInstance(collapseElement);
      if (bsCollapse) {
        bsCollapse.toggle();
      } else {
        new window.bootstrap.Collapse(collapseElement).toggle();
      }
      return;
    } catch (error) {
      console.warn(
        'EngageIQ: Bootstrap Collapse error, using manual toggle:',
        error
      );
    }
  }

  // Manual toggle as fallback
  const isExpanded = button.getAttribute('aria-expanded') === 'true';

  // First collapse all items (for accordion behavior)
  document.querySelectorAll('.accordion-collapse.show').forEach((item) => {
    // Skip if this is our target
    if (item.id === collapseElement.id) return;

    // Close this item
    item.classList.remove('show');
    const headerButton = document.querySelector(
      `[data-bs-target="#${item.id}"]`
    );
    if (headerButton) {
      headerButton.classList.add('collapsed');
      headerButton.setAttribute('aria-expanded', 'false');
    }
  });

  // Now toggle our target
  if (isExpanded) {
    collapseElement.classList.remove('show');
    button.classList.add('collapsed');
    button.setAttribute('aria-expanded', 'false');
  } else {
    collapseElement.classList.add('show');
    button.classList.remove('collapsed');
    button.setAttribute('aria-expanded', 'true');
  }

  console.log(`EngageIQ: Manually toggled accordion for ${button.textContent}`);
}

/**
 * Adds event listeners to the buttons in the suggestions accordion
 * Uses event delegation to handle all button clicks with a single listener
 */
function addAccordionButtonListeners() {
  // Safety check if DOM references aren't initialized yet
  if (!suggestionsAccordion) {
    console.warn(
      'EngageIQ: Cannot add button listeners - DOM references not initialized'
    );
    return;
  }

  console.log(
    'EngageIQ: Adding button event listeners to suggestion accordion'
  );

  // Remove any existing listeners to prevent duplicates (if re-adding)
  suggestionsAccordion.removeEventListener('click', handleAccordionButtonClick);

  // Add event listener using event delegation
  suggestionsAccordion.addEventListener('click', handleAccordionButtonClick);
}

/**
 * Event handler for accordion button clicks
 * @param {Event} event - The click event
 */
function handleAccordionButtonClick(event) {
  // Identify if a button was clicked
  const button = event.target.closest('button[data-action]');

  // If not a button with data-action, ignore
  if (!button) return;

  // Get the action and reaction from the button's data attributes
  const action = button.getAttribute('data-action');
  const reactionType = button.getAttribute('data-reaction');

  // Find the text element for this reaction type
  const textElement = document.getElementById(
    `suggestion-text-${reactionType}`
  );

  if (!textElement) {
    console.warn(
      `EngageIQ: Could not find text element for reaction type: ${reactionType}`
    );
    return;
  }

  // Get the current text content
  const currentText = textElement.textContent;

  console.log(
    `EngageIQ: Button clicked - Action: ${action}, Reaction: ${reactionType}`
  );

  // Handle different actions
  switch (action) {
    case 'decrease':
      console.log(
        `EngageIQ: Requesting shorter suggestion for ${reactionType}`
      );
      sendMessageToContentScript({
        type: 'REQUEST_SHORTER',
        reactionType: reactionType,
        originalText: currentText,
      });
      break;

    case 'increase':
      console.log(`EngageIQ: Requesting longer suggestion for ${reactionType}`);
      sendMessageToContentScript({
        type: 'REQUEST_LONGER',
        reactionType: reactionType,
        originalText: currentText,
      });
      break;

    case 'accept':
      console.log(
        `EngageIQ: Copying suggestion for ${reactionType} to clipboard: ${currentText}`
      );
      // Use clipboard API to copy the text
      navigator.clipboard
        .writeText(currentText)
        .then(() => {
          console.log('EngageIQ: Suggestion copied to clipboard successfully!');
          // Optional: Provide visual feedback to the user (e.g., change button text)
          // button.textContent = 'Copied!';
          // setTimeout(() => { button.textContent = 'Accept'; }, 1500);
        })
        .catch((err) => {
          console.error(
            'EngageIQ: Failed to copy suggestion to clipboard:',
            err
          );
          // Optional: Provide error feedback to the user
        });
      break;

    default:
      console.warn(`EngageIQ: Unknown button action: ${action}`);
  }
}

/**
 * Process a message from the content script
 * @param {Object} data - Message data object
 */
function processMessage(data) {
  const { type, error, details, suggestions, payload } = data;
  let actionData = null;

  if (!type) {
    console.warn('EngageIQ: Received message without a type:', data);
    return;
  }

  console.log(`EngageIQ: Processing message type: ${type}`);

  // Handle different message types
  switch (type) {
    case 'SHOW_LOADING':
      console.log('EngageIQ: Showing loading state');
      showState('loading');
      break;

    case 'SHOW_ERROR':
      console.log('EngageIQ: Showing error state:', error);
      // Ensure loading is explicitly hidden before showing error
      if (loadingState) loadingState.style.display = 'none';
      
      // Handle specific error cases with actionable guidance
      actionData = null;
      
      if (error.includes('API key')) {
        actionData = {
          text: 'Open the extension options page to set or update your API key.'
        };
      } else if (error.includes('Network error')) {
        actionData = {
          text: 'Please check your internet connection and try again later.'
        };
      }
      
      displayError(error, details, actionData);
      break;

    case 'SHOW_SUGGESTIONS':
      console.log('EngageIQ: Showing suggestions');
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        displaySuggestions(suggestions);
      } else {
        console.warn(
          'EngageIQ: Received SHOW_SUGGESTIONS but suggestions array is empty or invalid:',
          suggestions
        );
        displayError(
          'No suggestions available',
          'The API returned an empty or invalid response'
        );
      }
      break;

    case 'UPDATE_SINGLE_SUGGESTION':
      console.log('EngageIQ: Handling UPDATE_SINGLE_SUGGESTION');
      if (payload && payload.reactionType && payload.newText) {
        const { reactionType, newText } = payload;
        const textElementId = `suggestion-text-${reactionType}`;
        const textElement = document.getElementById(textElementId);

        if (textElement) {
          console.log(
            `EngageIQ: Updating text for ${reactionType} with: ${newText.substring(0, 50)}...`
          );
          textElement.textContent = newText;
        } else {
          console.error(
            `EngageIQ: Could not find text element with ID: ${textElementId} to update.`
          );
          // Show an error to the user if text element can't be found
          displayError(
            'Failed to update suggestion',
            `Could not find element for ${reactionType}`
          );
        }
      } else {
        console.error(
          'EngageIQ: Received UPDATE_SINGLE_SUGGESTION with invalid payload:',
          payload
        );
        // Show an error to the user for invalid payload
        displayError(
          'Failed to update suggestion',
          'Invalid response format'
        );
      }
      break;

    default:
      console.log('EngageIQ: Received unhandled message type:', type);
  }
}

/**
 * Sends a message to the parent content script
 * (Currently unused in Phase 4, will be used in later phases for user interactions)
 * @param {Object} message - The message to send
 */
function sendMessageToContentScript(message) {
  // Use '*' for postMessage when sending from extension iframe to content script
  // This is needed for Chrome extension architecture with content scripts
  console.log('EngageIQ: Sending message to content script:', message);
  window.parent.postMessage(message, '*');
}

// Tell the content script that the popup is ready
function notifyPopupReady() {
  console.log('EngageIQ: Notifying content script that popup is ready');
  sendMessageToContentScript({ type: 'POPUP_READY' });
}

// Initialize DOM element references when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('EngageIQ: Popup DOM Loaded');

  // Get references to UI elements
  loadingState = document.getElementById('loadingState');
  errorState = document.getElementById('errorState');
  errorMessage = document.getElementById('errorMessage');
  suggestionsAccordion = document.getElementById('suggestionsAccordion');

  console.log('EngageIQ: UI element references initialized');

  // Verify elements were found
  if (!loadingState || !errorState || !errorMessage || !suggestionsAccordion) {
    console.error('EngageIQ: One or more UI elements not found in DOM');
  } else {
    // Process any queued messages now that the DOM is ready
    console.log(`EngageIQ: Processing ${messageQueue.length} queued messages`);
    while (messageQueue.length > 0) {
      processMessage(messageQueue.shift());
    }

    // Set initial state to loading as fallback if no messages were received
    if (messageQueue.length === 0) {
      showState('loading');
    }

    // Notify the content script that the popup is ready
    notifyPopupReady();
  }
});

/**
 * Listen for messages from the parent window (content script).
 */
window.addEventListener('message', (event) => {
  // Log all received messages for debugging
  console.log('EngageIQ: Message received in popup from origin:', event.origin);
  // console.log('EngageIQ: Message data:', event.data); // Commented out for potentially sensitive/verbose data

  // If DOM is not yet loaded, queue the message for later processing
  if (!loadingState) {
    console.log(
      'EngageIQ: DOM not ready, queuing message for later processing'
    );
    messageQueue.push(event.data);
    return;
  }

  // Process the message
  processMessage(event.data);
});
