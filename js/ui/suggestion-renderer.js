/**
 * EngageIQ Chrome Extension - Suggestion Renderer Module (suggestion-renderer.js)
 *
 * This module handles the rendering and interaction with suggestion accordion elements in the popup UI.
 * It is responsible for:
 *  - Displaying suggestions in an accordion format
 *  - Managing accordion toggle behavior
 *  - Handling button interactions (accept, increase/decrease length)
 *  - Implementing keyboard navigation and animations for accessibility
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
  
  // Add event listener for accordion item focus for keyboard navigation
  document.addEventListener('keydown', handleGlobalKeyNavigation);
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
  
  // Add entrance animation class
  suggestionsAccordion.classList.add('fade-in');
  
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

  // Create accordion items for each suggestion
  const screenReaderInstruction = document.createElement('div');
  screenReaderInstruction.className = 'visually-hidden';
  screenReaderInstruction.setAttribute('aria-live', 'polite');
  screenReaderInstruction.textContent = 'Use tab key to navigate between suggestions and Enter key to expand or collapse';
  suggestionsAccordion.appendChild(screenReaderInstruction);
  
  suggestions.forEach((suggestion, index) => {
    // Add console log to inspect the suggestion object
    console.log('EngageIQ: [suggestion-renderer] Processing suggestion:', suggestion);

    const reactionType = suggestion.id.toLowerCase();

    // Create accordion item
    const accordionItem = document.createElement('div');
    accordionItem.className = 'accordion-item mb-2';
    accordionItem.setAttribute('data-suggestion-id', reactionType);

    // Create accordion header
    const accordionHeader = document.createElement('h2');
    accordionHeader.className = 'accordion-header';
    accordionHeader.id = `heading-${reactionType}`;

    // Create accordion button
    const accordionButton = document.createElement('button');
    accordionButton.className = 'accordion-button collapsed focus-visible-pulse';
    accordionButton.setAttribute('type', 'button');
    accordionButton.setAttribute('data-bs-toggle', 'collapse');
    accordionButton.setAttribute('data-bs-target', `#collapse-${reactionType}`);
    accordionButton.setAttribute('aria-expanded', 'false');
    accordionButton.setAttribute('aria-controls', `collapse-${reactionType}`);
    // First item should be focusable by default
    accordionButton.setAttribute('tabindex', index === 0 ? '0' : '0');
    accordionButton.textContent = suggestion.title || `Suggestion ${index + 1}`; // Use title from suggestion
    accordionButton.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
      }
    });
    // Add keyboard accessibility attributes
    accordionButton.setAttribute('role', 'button');
    accordionButton.setAttribute('aria-label', `${suggestion.title} suggestion. Press Enter to expand`);

    // Assemble accordion button
    accordionHeader.appendChild(accordionButton);
    accordionItem.appendChild(accordionHeader);

    // Create accordion collapse container
    const collapseContainer = document.createElement('div');
    collapseContainer.id = `collapse-${reactionType}`;
    collapseContainer.className = 'accordion-collapse collapse';
    collapseContainer.setAttribute('aria-labelledby', `heading-${reactionType}`);
    collapseContainer.setAttribute('data-bs-parent', '#suggestionsAccordion');

    // Create accordion body
    const accordionBody = document.createElement('div');
    accordionBody.className = 'accordion-body';

    // Create suggestion text container
    const suggestionText = document.createElement('div');
    suggestionText.className = 'suggestion-content mb-2';
    suggestionText.id = `suggestion-text-${reactionType}`;
    suggestionText.textContent = suggestion.text || 'No suggestion text available';

    // Create length adjustment buttons
    const lengthAdjustment = document.createElement('div');
    lengthAdjustment.className = 'length-adjustment mb-2';

    const decreaseButton = document.createElement('button');
    decreaseButton.className = 'btn btn-sm btn-light focus-visible-pulse';
    decreaseButton.setAttribute('type', 'button');
    decreaseButton.setAttribute('data-action', 'decrease');
    decreaseButton.setAttribute('data-reaction', reactionType);
    decreaseButton.setAttribute('aria-label', 'Make suggestion shorter');
    decreaseButton.innerHTML = '<i class="bi bi-dash-lg"></i> Shorter';

    const increaseButton = document.createElement('button');
    increaseButton.className = 'btn btn-sm btn-light focus-visible-pulse';
    increaseButton.setAttribute('type', 'button');
    increaseButton.setAttribute('data-action', 'increase');
    increaseButton.setAttribute('data-reaction', reactionType);
    increaseButton.setAttribute('aria-label', 'Make suggestion longer');
    increaseButton.innerHTML = '<i class="bi bi-plus-lg"></i> Longer';

    lengthAdjustment.appendChild(decreaseButton);
    lengthAdjustment.appendChild(increaseButton);

    // Create accept button
    const acceptButton = document.createElement('button');
    acceptButton.className = 'btn btn-sm btn-primary btn-accept focus-visible-pulse';
    acceptButton.setAttribute('type', 'button');
    acceptButton.setAttribute('data-action', 'accept');
    acceptButton.setAttribute('data-reaction', reactionType);
    acceptButton.innerHTML = '<i class="bi bi-check-lg"></i> Use this suggestion';

    // Assemble accordion body
    accordionBody.appendChild(suggestionText);
    accordionBody.appendChild(lengthAdjustment);
    accordionBody.appendChild(acceptButton);
    collapseContainer.appendChild(accordionBody);
    accordionItem.appendChild(collapseContainer);

    // Add accordion item to the container
    suggestionsAccordion.appendChild(accordionItem);
    
    // Apply entrance animation with delay based on index
    setTimeout(() => {
      accordionItem.style.animation = `fadeInUp 0.3s ease forwards ${index * 0.1}s`;
    }, 10);
  });

  // Add back to directions button if we have a selected direction
  if (selectedDirection) {
    const backContainer = document.createElement('div');
    backContainer.className = 'text-center mt-3';

    const backButton = document.createElement('button');
    backButton.className = 'btn btn-sm btn-outline-secondary focus-visible-pulse';
    backButton.setAttribute('type', 'button');
    backButton.setAttribute('data-action', 'back-to-directions');
    backButton.setAttribute('aria-label', 'Go back to direction selection');
    backButton.innerHTML = '<i class="bi bi-arrow-left-short"></i> Back to directions';

    backContainer.appendChild(backButton);
    suggestionsAccordion.appendChild(backContainer);
  }

  // Show suggestion state and attach event listeners
  showStateFn('suggestions');
  addAccordionButtonListeners();
  
  // Initialize any Bootstrap components that need JS initialization
  if (window.bootstrap && window.bootstrap.Collapse) {
    const collapseElements = suggestionsAccordion.querySelectorAll('.accordion-collapse');
    collapseElements.forEach(element => {
      // Add transition classes for smooth animations
      element.addEventListener('show.bs.collapse', () => {
        const header = document.getElementById(element.getAttribute('aria-labelledby'));
        if (header) {
          const button = header.querySelector('.accordion-button');
          if (button) {
            button.setAttribute('aria-expanded', 'true');
            button.setAttribute('aria-label', `${button.textContent} suggestion. Press Enter to collapse`);
          }
        }
      });
      
      element.addEventListener('hide.bs.collapse', () => {
        const header = document.getElementById(element.getAttribute('aria-labelledby'));
        if (header) {
          const button = header.querySelector('.accordion-button');
          if (button) {
            button.setAttribute('aria-expanded', 'false');
            button.setAttribute('aria-label', `${button.textContent} suggestion. Press Enter to expand`);
          }
        }
      });
    });
  }
  
  // Announce that suggestions are available
  announceToScreenReader(`${suggestions.length} suggestions are now available. Use tab to navigate between them.`);
}

/**
 * Handles global keyboard navigation for accordion items
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleGlobalKeyNavigation(event) {
  // Only process when suggestions are visible
  if (!suggestionsAccordion || suggestionsAccordion.style.display === 'none') {
    return;
  }
  
  const accordionButtons = suggestionsAccordion.querySelectorAll('.accordion-button');
  if (accordionButtons.length === 0) return;
  
  // Get the currently focused element
  const focusedElement = document.activeElement;
  const isAccordionButton = focusedElement && focusedElement.classList.contains('accordion-button');
  
  // Handle arrow key navigation between accordion items
  if (isAccordionButton) {
    let focusIndex = Array.from(accordionButtons).indexOf(focusedElement);
    
    if (event.key === 'ArrowDown' && focusIndex < accordionButtons.length - 1) {
      event.preventDefault();
      accordionButtons[focusIndex + 1].focus();
    } else if (event.key === 'ArrowUp' && focusIndex > 0) {
      event.preventDefault();
      accordionButtons[focusIndex - 1].focus();
    }
  }
}

/**
 * Announces a message to screen readers
 * @param {string} message - The message to announce
 * @param {boolean} assertive - Whether to use assertive (true) or polite (false) live region
 */
function announceToScreenReader(message, assertive = false) {
  // Find or create a dedicated screen reader announcement element
  let announcer = document.getElementById('sr-suggestions-announcer');
  
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'sr-suggestions-announcer';
    announcer.className = 'visually-hidden';
    announcer.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    document.body.appendChild(announcer);
  }
  
  // Update aria-live if needed
  announcer.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
  
  // Set the message
  announcer.textContent = message;
  
  // Clear after a delay
  setTimeout(() => {
    announcer.textContent = '';
  }, 3000);
}

/**
 * Adds event listeners to the buttons in the suggestions accordion
 * Uses event delegation to handle all button clicks with a single listener
 */
function addAccordionButtonListeners() {
  // Safety check
  if (!suggestionsAccordion) return;

  // Remove existing listener if any
  suggestionsAccordion.removeEventListener('click', handleAccordionButtonClick);

  // Add the listener to the container using event delegation
  suggestionsAccordion.addEventListener('click', handleAccordionButtonClick);
  
  // Add animation and focus effects to all action buttons
  const actionButtons = suggestionsAccordion.querySelectorAll('button[data-action]');
  actionButtons.forEach(button => {
    // Ensure all buttons have appropriate focus and animation classes
    if (!button.classList.contains('focus-visible-pulse')) {
      button.classList.add('focus-visible-pulse');
    }
    
    // Add visual feedback effect on click
    button.addEventListener('click', function() {
      // Add temporary animation
      if (button.getAttribute('data-action') === 'accept') {
        button.classList.add('btn-pulse');
        setTimeout(() => button.classList.remove('btn-pulse'), 500);
      }
    });
  });
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
    
    // Add animation feedback
    button.classList.add('btn-pulse');
    
    // Add slide transition to the accordion
    suggestionsAccordion.classList.add('slide-out-right');
    
    // Wait for animation to complete
    setTimeout(() => {
      // Remove animation classes
      suggestionsAccordion.classList.remove('slide-out-right');
      
      // Send message to go back to directions
      sendMessageFn({
        type: 'BACK_TO_DIRECTIONS'
      });
    }, 300);
    
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
      // Add loading animation
      textElement.classList.add('loading-pulse');
      button.disabled = true;
      
      // Announce to screen readers
      announceToScreenReader(`Generating shorter suggestion for ${reactionType}`, true);
      
      sendMessageFn({
        type: 'REQUEST_SHORTER',
        reactionType: reactionType,
        originalText: currentText,
      });
      break;

    case 'increase':
      console.log(`EngageIQ: Requesting longer suggestion for ${reactionType}`);
      // Add loading animation
      textElement.classList.add('loading-pulse');
      button.disabled = true;
      
      // Announce to screen readers
      announceToScreenReader(`Generating longer suggestion for ${reactionType}`, true);
      
      sendMessageFn({
        type: 'REQUEST_LONGER',
        reactionType: reactionType,
        originalText: currentText,
      });
      break;

    case 'accept': {
      console.log(
        `EngageIQ: Accepting suggestion for ${reactionType}: ${currentText}`
      );
      
      // Add acceptance animation and feedback
      const accordionItem = button.closest('.accordion-item');
      if (accordionItem) {
        accordionItem.classList.add('border-success');
        setTimeout(() => accordionItem.classList.remove('border-success'), 1000);
      }
      
      // Announce to screen readers
      announceToScreenReader(`Suggestion accepted and will be applied`, true);
      
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
    }

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
  
  // Find length adjustment buttons and re-enable them
  const accordionItem = textElement.closest('.accordion-item');
  if (accordionItem) {
    const buttons = accordionItem.querySelectorAll('button[data-action]');
    buttons.forEach(button => button.disabled = false);
  }

  // Add update animation
  textElement.classList.remove('loading-pulse');
  textElement.classList.add('fade-transition');
  textElement.classList.add('fade-out');
  
  // After fade out, update content and fade back in
  setTimeout(() => {
    // Update the text content
    textElement.textContent = suggestion.text || 'No suggestion text available';
    
    // Remove fade out and add fade in
    textElement.classList.remove('fade-out');
    textElement.classList.add('fade-in');
    
    // Remove animation classes after animation completes
    setTimeout(() => {
      textElement.classList.remove('fade-in', 'fade-transition');
    }, 300);
    
    console.log(`EngageIQ: Updated suggestion text for ${reactionType}`);
    
    // Announce update to screen readers
    announceToScreenReader(`Updated ${reactionType} suggestion is now available`);
  }, 300);

  // No need to update the whole accordion or change state
  // Just ensure the suggestion state is showing
  if (showStateFn) {
    showStateFn('suggestions');
  }
}
