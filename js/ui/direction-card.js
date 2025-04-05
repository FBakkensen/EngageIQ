/**
 * EngageIQ Chrome Extension - Direction Card Module (direction-card.js)
 *
 * This module handles the rendering and interaction with the direction cards used in the
 * Smart Suggestions feature. Direction cards represent different commenting approaches
 * that the user can select before getting specific comment suggestions.
 *
 * It is responsible for:
 *  - Creating direction card UI elements
 *  - Handling card selection events
 *  - Managing visual feedback for card selection
 *  - Implementing keyboard navigation and accessibility
 */

// Log module load confirmation
console.log('EngageIQ: Direction Card Module Loaded');

// DOM references (to be initialized when module is used)
let directionsContainer;
let sendMessageFn;
let showStateFn;

// Keep track of keyboard navigation state
let focusedCardIndex = -1;
let directionCards = [];

/**
 * Initializes the direction card module with required DOM references and functions
 * @param {Object} config - Configuration object with required references
 * @param {HTMLElement} config.containerElement - The container element for direction cards
 * @param {Function} config.showStateFunction - Function to switch UI states
 * @param {Function} config.sendMessageFunction - Function to send messages to content script
 */
export function initDirectionCards(config) {
  directionsContainer = config.containerElement;
  showStateFn = config.showStateFunction;
  sendMessageFn = config.sendMessageFunction;
  
  // Set up global keyboard navigation handler
  document.addEventListener('keydown', handleGlobalKeyboardNavigation);
  
  console.log('EngageIQ: Direction Card module initialized');
}

/**
 * Renders a collection of direction cards in the container
 * @param {Array} directions - Array of direction objects with id, title, description, and icon properties
 * @param {Function} [onSelectionCallback] - Optional callback when a direction is selected
 */
export function displayDirections(directions, onSelectionCallback) {
  // Safety check if DOM references aren't initialized
  if (!directionsContainer || !showStateFn) {
    console.warn('EngageIQ: Cannot display directions - Direction Card module not initialized');
    return;
  }
  
  console.log(`EngageIQ: Displaying ${directions.length} direction cards`);
  
  // Reset keyboard navigation state
  focusedCardIndex = -1;
  directionCards = [];
  
  // Clear existing content
  directionsContainer.innerHTML = '';
  
  // Add entrance animation class
  directionsContainer.classList.add('fade-in');
  
  // Create header
  const header = document.createElement('h6');
  header.className = 'mb-3 text-center';
  header.textContent = 'Choose a commenting approach';
  header.setAttribute('role', 'heading');
  header.setAttribute('aria-level', '2');
  directionsContainer.appendChild(header);
  
  // Create screen reader instruction
  const srInstruction = document.createElement('div');
  srInstruction.className = 'visually-hidden';
  srInstruction.setAttribute('aria-live', 'polite');
  srInstruction.textContent = 'Use arrow keys to navigate between direction cards and Enter to select';
  directionsContainer.appendChild(srInstruction);
  
  // Create card row using Bootstrap grid
  const row = document.createElement('div');
  row.className = 'row g-2';
  row.setAttribute('role', 'grid');
  row.setAttribute('aria-label', 'Direction options grid');
  directionsContainer.appendChild(row);
  
  // Create each direction card
  directions.forEach((direction, index) => {
    // Create column for card (responsive grid)
    const column = document.createElement('div');
    column.className = 'col-sm-6';
    column.setAttribute('role', 'gridcell');
    
    // Create the card
    const card = document.createElement('div');
    card.className = 'card h-100 direction-card';
    card.setAttribute('data-direction-id', direction.id);
    card.setAttribute('data-direction-index', index);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', index === 0 ? '0' : '-1'); // First card is focusable by default
    card.setAttribute('aria-pressed', 'false');
    
    // Add focus ring container for animation
    const focusRing = document.createElement('div');
    focusRing.className = 'keyboard-focus-ring';
    card.appendChild(focusRing);
    
    // Create card body
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body p-3';
    
    // Create emoji icon if available
    if (direction.emoji) {
      const emojiContainer = document.createElement('div');
      emojiContainer.className = 'emoji-container mb-2 fs-3';
      emojiContainer.setAttribute('aria-hidden', 'true');
      emojiContainer.textContent = direction.emoji;
      cardBody.appendChild(emojiContainer);
    }
    
    // Create card title
    const cardTitle = document.createElement('h6');
    cardTitle.className = 'card-title mb-1';
    cardTitle.textContent = direction.title;
    
    // Create card description
    const cardText = document.createElement('p');
    cardText.className = 'card-text small mb-0';
    cardText.textContent = direction.description;
    
    // Assemble card
    cardBody.appendChild(cardTitle);
    cardBody.appendChild(cardText);
    card.appendChild(cardBody);
    column.appendChild(card);
    row.appendChild(column);
    
    // Add card to tracked array for keyboard navigation
    directionCards.push({
      element: card,
      direction: direction
    });
    
    // Add event listeners to the card
    card.addEventListener('click', () => {
      handleDirectionSelect(direction, onSelectionCallback);
    });
    
    // Add keyboard support for accessibility
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleDirectionSelect(direction, onSelectionCallback);
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        navigateCards(event.key, index);
      }
    });
    
    // Track focus changes
    card.addEventListener('focus', () => {
      focusedCardIndex = index;
      announceCardFocus(direction);
    });
  });
  
  // Add cancel button
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'text-center mt-3';
  
  const cancelButton = document.createElement('button');
  cancelButton.className = 'btn btn-sm btn-outline-secondary focus-visible-pulse';
  cancelButton.textContent = 'Cancel';
  cancelButton.setAttribute('type', 'button');
  
  cancelButton.addEventListener('click', () => {
    console.log('EngageIQ: Direction selection cancelled');
    sendMessageFn({
      type: 'CLOSE_POPUP'
    });
  });
  
  buttonContainer.appendChild(cancelButton);
  directionsContainer.appendChild(buttonContainer);
  
  // Show the directions container
  if (showStateFn) {
    showStateFn('directions');
  }
  
  // Announce to screen readers that directions are available
  setTimeout(() => {
    announceToScreenReader(`${directions.length} direction options available. Use arrow keys to navigate.`);
  }, 500);
}

/**
 * Handles keyboard navigation between direction cards
 * @param {string} key - The key pressed (ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
 * @param {number} currentIndex - Current focused card index
 */
function navigateCards(key, currentIndex) {
  // If no cards, do nothing
  if (directionCards.length === 0) return;
  
  let newIndex = currentIndex;
  const columns = 2; // We have 2 columns in the grid
  const rows = Math.ceil(directionCards.length / columns);
  
  // Calculate the current row and column
  const currentRow = Math.floor(currentIndex / columns);
  const currentCol = currentIndex % columns;
  
  switch (key) {
    case 'ArrowUp':
      // Move up a row, stay in same column
      newIndex = Math.max(0, currentRow - 1) * columns + currentCol;
      break;
    case 'ArrowDown':
      // Move down a row, stay in same column
      newIndex = Math.min(rows - 1, currentRow + 1) * columns + currentCol;
      break;
    case 'ArrowLeft':
      // Move left, same row
      newIndex = currentIndex - 1;
      break;
    case 'ArrowRight':
      // Move right, same row
      newIndex = currentIndex + 1;
      break;
  }
  
  // Make sure we have a valid index
  newIndex = Math.max(0, Math.min(directionCards.length - 1, newIndex));
  
  // If the index changed, update focus
  if (newIndex !== currentIndex && directionCards[newIndex]) {
    // Set all cards to non-focusable
    directionCards.forEach(card => {
      card.element.setAttribute('tabindex', '-1');
    });
    
    // Make new card focusable and focus it
    const newCard = directionCards[newIndex].element;
    newCard.setAttribute('tabindex', '0');
    newCard.focus();
    
    // Update the focused index
    focusedCardIndex = newIndex;
  }
}

/**
 * Handles global keyboard navigation for directions
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleGlobalKeyboardNavigation(event) {
  // Only handle when directions are visible
  if (!directionsContainer || 
      directionsContainer.style.display === 'none' || 
      directionsContainer.getAttribute('aria-hidden') === 'true') {
    return;
  }
  
  // If no card is focused but we have cards, focus the first one on arrow key
  if (focusedCardIndex === -1 && directionCards.length > 0 && 
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    // Focus the first card
    const firstCard = directionCards[0].element;
    firstCard.setAttribute('tabindex', '0');
    firstCard.focus();
    focusedCardIndex = 0;
    event.preventDefault();
  }
}

/**
 * Handles the selection of a direction card
 * @param {Object} direction - The selected direction object
 * @param {Function} [callback] - Optional callback to call after selection
 */
function handleDirectionSelect(direction, callback) {
  // Safety check
  if (!sendMessageFn) {
    console.warn('EngageIQ: Cannot handle direction selection - messaging function not initialized');
    return;
  }
  
  console.log(`EngageIQ: Direction selected: ${direction.id} - ${direction.title}`);
  
  // Provide visual feedback by highlighting the selected card
  const allCards = document.querySelectorAll('.direction-card');
  allCards.forEach(card => {
    card.classList.remove('border-primary', 'bg-light', 'selected');
    card.setAttribute('aria-pressed', 'false');
  });
  
  const selectedCard = document.querySelector(`.direction-card[data-direction-id="${direction.id}"]`);
  if (selectedCard) {
    selectedCard.classList.add('border-primary', 'bg-light', 'selected');
    selectedCard.setAttribute('aria-pressed', 'true');
    
    // Announce the selection to screen readers
    announceToScreenReader(`Selected direction: ${direction.title}. Loading suggestions...`);
  }
  
  // Allow animations to complete before showing loading state
  setTimeout(() => {
    // Show loading state
    if (showStateFn) {
      // Use slide transition for smoother experience
      directionsContainer.classList.add('slide-out-left');
      
      // After animation completes, show loading state
      setTimeout(() => {
        directionsContainer.classList.remove('slide-out-left', 'fade-in');
        showStateFn('loading');
        
        // Call the callback if provided
        if (typeof callback === 'function') {
          callback(direction);
        } else {
          // Otherwise send the default message
          sendMessageFn({
            type: 'DIRECTION_SELECTED',
            direction: direction
          });
        }
      }, 300); // Match the animation duration
    } else {
      // Without showStateFn, just trigger the callback or send the message
      if (typeof callback === 'function') {
        callback(direction);
      } else {
        sendMessageFn({
          type: 'DIRECTION_SELECTED',
          direction: direction
        });
      }
    }
  }, 150); // Small delay for selection animation to be visible
}

/**
 * Announces focus on a specific card to screen readers
 * @param {Object} direction - The direction object of the focused card
 */
function announceCardFocus(direction) {
  const announcement = `${direction.title}: ${direction.description}`;
  announceToScreenReader(announcement, false);
}

/**
 * Announces a message to screen readers
 * @param {string} message - The message to announce
 * @param {boolean} assertive - Whether to use assertive (true) or polite (false) live region
 */
function announceToScreenReader(message, assertive = false) {
  // Find or create a dedicated screen reader announcement element
  let announcer = document.getElementById('sr-announcer');
  
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'sr-announcer';
    announcer.className = 'visually-hidden';
    announcer.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    document.body.appendChild(announcer);
  }
  
  // Update aria-live if needed
  announcer.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
  
  // Set the message
  announcer.textContent = message;
  
  // Clear after a delay (optional)
  setTimeout(() => {
    announcer.textContent = '';
  }, 3000);
}

/**
 * Displays a loading state specifically for direction cards
 */
export function showDirectionsLoading() {
  // Safety check
  if (!directionsContainer) {
    console.warn('EngageIQ: Cannot show directions loading - Direction Card module not initialized');
    return;
  }
  
  // Clear container
  directionsContainer.innerHTML = '';
  
  // Add entrance animation class
  directionsContainer.classList.add('fade-in');
  
  // Create header
  const header = document.createElement('h6');
  header.className = 'mb-3 text-center loading-pulse';
  header.textContent = 'Analyzing post content...';
  directionsContainer.appendChild(header);
  
  // Create screen reader announcement
  announceToScreenReader('Analyzing post content. Please wait while we generate direction options.');
  
  // Create card row
  const row = document.createElement('div');
  row.className = 'row g-2';
  directionsContainer.appendChild(row);
  
  // Create 4 skeleton cards (2x2 grid)
  for (let i = 0; i < 4; i++) {
    // Create column
    const column = document.createElement('div');
    column.className = 'col-sm-6';
    
    // Create skeleton card
    const card = document.createElement('div');
    card.className = 'card h-100 direction-card skeleton-card';
    
    // Create card body
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body p-3';
    
    // Create placeholder elements with loading animation
    const titlePlaceholder = document.createElement('div');
    titlePlaceholder.className = 'placeholder-glow mb-2';
    
    const titleSpan = document.createElement('span');
    titleSpan.className = 'placeholder col-7';
    titlePlaceholder.appendChild(titleSpan);
    
    const textPlaceholder = document.createElement('div');
    textPlaceholder.className = 'placeholder-glow';
    
    const textSpan1 = document.createElement('span');
    textSpan1.className = 'placeholder col-12';
    
    const textSpan2 = document.createElement('span');
    textSpan2.className = 'placeholder col-10';
    
    textPlaceholder.appendChild(textSpan1);
    textPlaceholder.appendChild(document.createElement('br'));
    textPlaceholder.appendChild(textSpan2);
    
    // Assemble card
    cardBody.appendChild(titlePlaceholder);
    cardBody.appendChild(textPlaceholder);
    card.appendChild(cardBody);
    column.appendChild(card);
    row.appendChild(column);
  }
  
  // Show the directions container with loading state
  if (showStateFn) {
    showStateFn('directions');
  }
}
