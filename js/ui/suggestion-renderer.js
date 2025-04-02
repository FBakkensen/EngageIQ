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
 */
export function displaySuggestions(suggestions) {
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
    button.setAttribute('data-reaction-type', reactionType); // Store reaction type for manual toggle
    // Add additional aria attributes for improved accessibility
    button.setAttribute('aria-describedby', `suggestion-text-${reactionType}`);

    // Capitalize first letter of reaction type for display
    const displayType =
      reactionType.charAt(0).toUpperCase() + reactionType.slice(1);
    button.textContent = displayType;

    accordionHeader.appendChild(button);

    // Create body
    const collapseDiv = document.createElement('div');
    collapseDiv.id = `collapse-${itemId}`;
    collapseDiv.className = 'accordion-collapse collapse';
    collapseDiv.setAttribute('aria-labelledby', `heading-${itemId}`);
    collapseDiv.setAttribute('data-bs-parent', '#suggestionsAccordion');
    // Add role for accessibility
    collapseDiv.setAttribute('role', 'region');

    const accordionBody = document.createElement('div');
    accordionBody.className = 'accordion-body';

    // Add suggestion text paragraph
    const textParagraph = document.createElement('p');
    textParagraph.id = `suggestion-text-${reactionType}`;
    textParagraph.className = 'suggestion-text mb-2';
    textParagraph.textContent =
      suggestion.text || 'No suggestion text available';
    // Add tabindex for keyboard accessibility
    textParagraph.setAttribute('tabindex', '0');
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
    // Add ARIA attributes for screen readers
    decreaseBtn.setAttribute(
      'aria-label',
      `Make ${displayType} suggestion shorter`
    );

    buttonGroup.appendChild(decreaseBtn);

    // Add increase length button
    const increaseBtn = document.createElement('button');
    increaseBtn.type = 'button';
    increaseBtn.className = 'btn btn-outline-secondary';
    increaseBtn.textContent = '+';
    increaseBtn.setAttribute('data-reaction', reactionType);
    increaseBtn.setAttribute('data-action', 'increase');
    increaseBtn.title = 'Make suggestion longer';
    // Add ARIA attributes for screen readers
    increaseBtn.setAttribute(
      'aria-label',
      `Make ${displayType} suggestion longer`
    );

    buttonGroup.appendChild(increaseBtn);

    // Add accept button
    const acceptBtn = document.createElement('button');
    acceptBtn.type = 'button';
    acceptBtn.className = 'btn btn-primary ms-2';
    acceptBtn.textContent = 'Accept';
    acceptBtn.setAttribute('data-reaction', reactionType);
    acceptBtn.setAttribute('data-action', 'accept');
    acceptBtn.title = 'Use this suggestion';
    // Add ARIA attributes for screen readers
    acceptBtn.setAttribute('aria-label', `Use ${displayType} suggestion`);

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

  showStateFn('suggestions');
}

/**
 * Adds event listeners to the buttons in the suggestions accordion
 * Uses event delegation to handle all button clicks with a single listener
 */
function addAccordionButtonListeners() {
  // Safety check if DOM references aren't initialized yet
  if (!suggestionsAccordion) {
    console.warn(
      'EngageIQ: Cannot add button listeners - Suggestion Renderer not initialized'
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
