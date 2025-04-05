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
 */

// Log module load confirmation
console.log('EngageIQ: Direction Card Module Loaded');

// DOM references (to be initialized when module is used)
let directionsContainer;
let sendMessageFn;
let showStateFn;

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
  
  console.log('EngageIQ: Direction Card module initialized');
}

/**
 * Renders a collection of direction cards in the container
 * @param {Array} directions - Array of direction objects with id, title, description, and icon properties
 */
export function displayDirections(directions) {
  // Safety check if DOM references aren't initialized
  if (!directionsContainer || !showStateFn) {
    console.warn('EngageIQ: Cannot display directions - Direction Card module not initialized');
    return;
  }
  
  console.log(`EngageIQ: Displaying ${directions.length} direction cards`);
  
  // Clear existing content
  directionsContainer.innerHTML = '';
  
  // Create header
  const header = document.createElement('h6');
  header.className = 'mb-3 text-center';
  header.textContent = 'Choose a commenting approach';
  directionsContainer.appendChild(header);
  
  // Create card row using Bootstrap grid
  const row = document.createElement('div');
  row.className = 'row g-2';
  directionsContainer.appendChild(row);
  
  // Create each direction card
  directions.forEach(direction => {
    // Create column for card (responsive grid)
    const column = document.createElement('div');
    column.className = 'col-sm-6';
    
    // Create the card
    const card = document.createElement('div');
    card.className = 'card h-100 direction-card';
    card.setAttribute('data-direction-id', direction.id);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-pressed', 'false');
    
    // Create card body
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body p-3';
    
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
    
    // Add event listeners to the card
    card.addEventListener('click', () => handleDirectionSelect(direction));
    
    // Add keyboard support for accessibility
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleDirectionSelect(direction);
      }
    });
  });
  
  // Add cancel button
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'text-center mt-3';
  
  const cancelButton = document.createElement('button');
  cancelButton.className = 'btn btn-sm btn-outline-secondary';
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
}

/**
 * Handles the selection of a direction card
 * @param {Object} direction - The selected direction object
 */
function handleDirectionSelect(direction) {
  // Safety check
  if (!sendMessageFn) {
    console.warn('EngageIQ: Cannot handle direction selection - messaging function not initialized');
    return;
  }
  
  console.log(`EngageIQ: Direction selected: ${direction.id} - ${direction.title}`);
  
  // Provide visual feedback by highlighting the selected card
  const allCards = document.querySelectorAll('.direction-card');
  allCards.forEach(card => {
    card.classList.remove('border-primary', 'bg-light');
    card.setAttribute('aria-pressed', 'false');
  });
  
  const selectedCard = document.querySelector(`.direction-card[data-direction-id="${direction.id}"]`);
  if (selectedCard) {
    selectedCard.classList.add('border-primary', 'bg-light');
    selectedCard.setAttribute('aria-pressed', 'true');
  }
  
  // Show loading state
  if (showStateFn) {
    showStateFn('loading');
  }
  
  // Send message to request comments based on the selected direction
  sendMessageFn({
    type: 'DIRECTION_SELECTED',
    direction: direction
  });
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
  
  // Create header
  const header = document.createElement('h6');
  header.className = 'mb-3 text-center';
  header.textContent = 'Analyzing post content...';
  directionsContainer.appendChild(header);
  
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
