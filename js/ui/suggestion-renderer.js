/**
 * EngageIQ Chrome Extension - Suggestion Renderer Module (suggestion-renderer.js)
 *
 * This module handles the rendering and interaction with suggestion accordion elements in the popup UI.
 * It is responsible for:
 *  - Displaying suggestions in an accordion format
 *  - Managing accordion toggle behavior
 *  - Handling button interactions (accept, increase/decrease length)
 */

// Import accordion controller
import { initAccordion } from '/js/ui/accordion-controller.js';
import { getSelectedDirection } from '/js/services/state-persistence-service.js';

// Log module load confirmation
console.log('EngageIQ: Suggestion Renderer Module Loaded');

/**
 * References to DOM elements and controllers (to be initialized when module is used)
 */
let suggestionsAccordion;
let showStateFn; // Function to show different UI states
let sendMessageFn; // Function to send messages to content script
let accordionController; // Reference to accordion controller instance

/**
 * Initializes the module with required DOM elements and functions
 * @param {Object} config - Configuration object with required references
 * @param {HTMLElement} config.accordionElement - The accordion container element
 * @param {Function} config.showStateFunction - Function to switch UI states
 * @param {Function} config.sendMessageFunction - Function to send messages to content script
 */
export function initSuggestionRenderer(config) {
  suggestionsAccordion = config.accordionElement;
  showStateFn = config.showStateFunction;
  sendMessageFn = config.sendMessageFunction;
  
  console.log('EngageIQ: Suggestion Renderer initialized');
  
  // Initialize the accordion controller if the accordion element is available
  if (suggestionsAccordion) {
    accordionController = initAccordion(suggestionsAccordion);
  }
}

/**
 * Provides access to the accordion controller instance
 * @returns {Object|null} The accordion controller instance or null if not initialized
 */
export function getAccordionController() {
  return accordionController;
}

/**
 * Displays suggestions in the accordion
 * @param {Array} suggestions - Array of suggestion objects
 * @param {Object} [selectedDirection] - Optional selected direction object with title and description
 */
export function displaySuggestions(suggestions, selectedDirection) {
  // Safety check if DOM references aren't initialized yet
  if (!suggestionsAccordion || !showStateFn) {
    console.warn(
      'EngageIQ: Cannot display suggestions - Suggestion Renderer not initialized'
    );
    return;
  }

  console.log(`EngageIQ: Displaying ${suggestions.length} suggestions`);

  // Clear existing content
  suggestionsAccordion.innerHTML = '';
  
  // If no direction is provided, try to get it from session storage
  if (!selectedDirection) {
    selectedDirection = getSelectedDirection();
  }
  
  // Add direction context at the top if available
  if (selectedDirection && selectedDirection.title) {
    const directionContext = document.createElement('div');
    directionContext.className = 'direction-context mb-3';
    
    const directionHeader = document.createElement('div');
    directionHeader.className = 'direction-header d-flex align-items-center';
    
    const directionBadge = document.createElement('span');
    directionBadge.className = 'badge bg-primary me-2';
    directionBadge.textContent = 'Direction';
    
    const directionTitle = document.createElement('span');
    directionTitle.className = 'fw-bold';
    directionTitle.textContent = selectedDirection.title;
    
    directionHeader.appendChild(directionBadge);
    directionHeader.appendChild(directionTitle);
    directionContext.appendChild(directionHeader);
    
    if (selectedDirection.description) {
      const directionDescription = document.createElement('p');
      directionDescription.className = 'small text-muted mt-1 mb-0';
      directionDescription.textContent = selectedDirection.description;
      directionContext.appendChild(directionDescription);
    }
    
    suggestionsAccordion.appendChild(directionContext);
  }
  
  // Add the "Back to Directions" button after the direction context
  const backButtonContainer = document.createElement('div');
  backButtonContainer.className = 'mb-3 text-center';
  
  const backButton = document.createElement('button');
  backButton.className = 'btn btn-sm btn-outline-primary mb-2';
  backButton.textContent = '← Back to Directions';
  backButton.setAttribute('type', 'button');
  backButton.setAttribute('data-action', 'back-to-directions');
  
  backButtonContainer.appendChild(backButton);
  suggestionsAccordion.appendChild(backButtonContainer);

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
    // Add role for accessibility
    accordionItem.setAttribute('role', 'region');

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
    button.setAttribute('aria-label', `${reactionType} suggestion`);

    // Create title with reaction type
    const titleSpan = document.createElement('span');
    titleSpan.textContent = reactionType.charAt(0).toUpperCase() + reactionType.slice(1);
    button.appendChild(titleSpan);

    accordionHeader.appendChild(button);
    accordionItem.appendChild(accordionHeader);

    // Create collapsible content
    const collapseDiv = document.createElement('div');
    collapseDiv.id = `collapse-${itemId}`;
    collapseDiv.className = 'accordion-collapse collapse';
    collapseDiv.setAttribute('aria-labelledby', `heading-${itemId}`);
    collapseDiv.setAttribute('data-bs-parent', '#suggestionsAccordion');

    const accordionBody = document.createElement('div');
    accordionBody.className = 'accordion-body';

    // Create suggestion content with id for text replacement
    const contentDiv = document.createElement('div');
    contentDiv.className = 'suggestion-content';
    contentDiv.id = `suggestion-text-${reactionType}`;
    contentDiv.textContent = suggestion.text || 'No suggestion text available';

    accordionBody.appendChild(contentDiv);

    // Create length adjustment buttons
    const lengthAdjustmentDiv = document.createElement('div');
    lengthAdjustmentDiv.className = 'length-adjustment';

    // Shorter button
    const shorterButton = document.createElement('button');
    shorterButton.className = 'btn btn-sm';
    shorterButton.type = 'button';
    shorterButton.textContent = 'Shorter';
    shorterButton.setAttribute('data-action', 'decrease');
    shorterButton.setAttribute('data-reaction', reactionType);
    shorterButton.setAttribute('aria-label', 'Generate a shorter suggestion');

    // Longer button
    const longerButton = document.createElement('button');
    longerButton.className = 'btn btn-sm';
    longerButton.type = 'button';
    longerButton.textContent = 'Longer';
    longerButton.setAttribute('data-action', 'increase');
    longerButton.setAttribute('data-reaction', reactionType);
    longerButton.setAttribute('aria-label', 'Generate a longer suggestion');

    lengthAdjustmentDiv.appendChild(shorterButton);
    lengthAdjustmentDiv.appendChild(longerButton);

    accordionBody.appendChild(lengthAdjustmentDiv);

    // Create accept button
    const acceptButton = document.createElement('button');
    acceptButton.className = 'btn btn-primary btn-accept';
    acceptButton.type = 'button';
    acceptButton.textContent = 'Accept';
    acceptButton.setAttribute('data-action', 'accept');
    acceptButton.setAttribute('data-reaction', reactionType);
    acceptButton.setAttribute('aria-label', 'Accept this suggestion');

    accordionBody.appendChild(acceptButton);

    collapseDiv.appendChild(accordionBody);
    accordionItem.appendChild(collapseDiv);

    suggestionsAccordion.appendChild(accordionItem);
  });

  // Add accordion button listeners
  addAccordionButtonListeners();

  // Show the suggestions state
  if (showStateFn) {
    showStateFn('suggestions');
  }
}

/**
 * Adds event listeners to the buttons in the suggestions accordion
 * Uses event delegation to handle all button clicks with a single listener
 */
function addAccordionButtonListeners() {
  // Remove any existing event listener first to prevent duplicates
  suggestionsAccordion.removeEventListener('click', handleAccordionButtonClick);

  // Add event listener using event delegation
  suggestionsAccordion.addEventListener('click', handleAccordionButtonClick);
}

/**
 * Event handler for accordion button clicks
 * @param {Event} event - The click event
 */
function handleAccordionButtonClick(event) {
  // Safety check if messaging function isn't initialized
  if (!sendMessageFn) {
    console.warn(
      'EngageIQ: Cannot handle button click - messaging function not initialized'
    );
    return;
  }
  
  // Identify if a button was clicked
  const button = event.target.closest('button[data-action]');

  // If not a button with data-action, ignore
  if (!button) return;

  // Get the action and reaction from the button's data attributes
  const action = button.getAttribute('data-action');
  
  // Handle the back to directions action differently
  if (action === 'back-to-directions') {
    console.log('EngageIQ: Back to directions button clicked');
    sendMessageFn({
      type: 'BACK_TO_DIRECTIONS'
    });
    return;
  }
  
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
      sendMessageFn({
        type: 'REQUEST_SHORTER',
        reactionType: reactionType,
        originalText: currentText,
      });
      break;

    case 'increase':
      console.log(`EngageIQ: Requesting longer suggestion for ${reactionType}`);
      sendMessageFn({
        type: 'REQUEST_LONGER',
        reactionType: reactionType,
        originalText: currentText,
      });
      break;

    case 'accept':
      console.log(
        `EngageIQ: Accepting suggestion for ${reactionType}: ${currentText}`
      );
      // Send message to content script to insert text into comment box
      sendMessageFn({
        type: 'ACCEPT_SUGGESTION',
        text: currentText,
      });
      // Optional: Still copy to clipboard as a fallback
      navigator.clipboard
        .writeText(currentText)
        .then(() => {
          console.log('EngageIQ: Suggestion copied to clipboard as fallback');
        })
        .catch((err) => {
          console.error(
            'EngageIQ: Failed to copy suggestion to clipboard:',
            err
          );
        });
      break;

    default:
      console.warn(`EngageIQ: Unknown button action: ${action}`);
  }
}

/**
 * Updates a single suggestion in the accordion without re-rendering everything
 * @param {Object} suggestion - The updated suggestion object
 */
export function updateSingleSuggestion(suggestion) {
  // Safety check if DOM references aren't initialized yet
  if (!suggestionsAccordion) {
    console.warn(
      'EngageIQ: Cannot update suggestion - Suggestion Renderer not initialized'
    );
    return;
  }

  if (!suggestion || !suggestion.id) {
    console.warn('EngageIQ: Cannot update suggestion - Invalid suggestion object');
    return;
  }

  const reactionType = suggestion.id.toLowerCase();
  console.log(`EngageIQ: Updating single suggestion for ${reactionType}`);

  // Find the text element for this reaction type
  const textElement = document.getElementById(`suggestion-text-${reactionType}`);

  if (!textElement) {
    console.warn(
      `EngageIQ: Could not find text element for reaction type: ${reactionType}`
    );
    return;
  }

  // Update the text content
  textElement.textContent = suggestion.text || 'No suggestion text available';
  console.log(`EngageIQ: Updated suggestion text for ${reactionType}`);

  // No need to update the whole accordion or change state
  // Just ensure the suggestion state is showing
  if (showStateFn) {
    showStateFn('suggestions');
  }
}
