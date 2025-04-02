/**
 * EngageIQ Chrome Extension
 * Button Injector Module - Handles the creation and injection of EngageIQ buttons into LinkedIn comment boxes
 */

console.log('EngageIQ: Button Injector Module Loaded');

// Initial selectors for comment boxes (May need refinement based on LinkedIn updates)
// TODO: Refine selectors based on testing on live LinkedIn feed and single post pages.
const COMMENT_BOX_SELECTORS = [
  '.feed-shared-update-v2 .comments-comment-box__form', // Standard feed post comment form
  'div[aria-label="Write a comment"]', // Common label for comment input areas
  '.comments-comment-box', // Additional LinkedIn comment box selector
  '.comments-comment-texteditor__container', // Another potential comment box container
  // Add more selectors here if needed
].join(', '); // Combine selectors for a single query

/**
 * Finds potential LinkedIn comment box elements in the current document.
 * @returns {NodeList} A NodeList containing the found comment box elements.
 */
function findCommentBoxes() {
  console.log(`EngageIQ: Searching for comment boxes with selectors: ${COMMENT_BOX_SELECTORS}`);
  const boxes = document.querySelectorAll(COMMENT_BOX_SELECTORS);
  console.log(`EngageIQ: Found ${boxes.length} potential comment boxes on initial search`);
  return boxes;
}

/**
 * Creates an EngageIQ button element with appropriate styling and icon.
 * @returns {HTMLButtonElement} The created button element.
 */
function createEngageIQButton() {
  const engageButton = document.createElement('button');

  // Add Bootstrap-like button classes
  engageButton.className = 'engageiq-btn engageiq-btn-icon';
  engageButton.type = 'button'; // Set button type

  // Create and add icon image
  const iconImg = document.createElement('img');
  const iconUrl = chrome.runtime.getURL('icons/icon48.png');
  iconImg.src = iconUrl;
  iconImg.alt = 'EngageIQ';
  iconImg.width = 20;
  iconImg.height = 20;
  console.log('EngageIQ: Using icon URL:', iconUrl);
  engageButton.appendChild(iconImg);

  // Add tooltip
  engageButton.title = 'Generate AI-powered comments with EngageIQ';
  // Add ARIA attributes for accessibility
  engageButton.setAttribute('aria-label', 'Generate comments with EngageIQ');
  engageButton.setAttribute('role', 'button');

  return engageButton;
}

/**
 * Inserts the EngageIQ button into the specified comment box using various strategies.
 * @param {HTMLElement} box - The comment box element to inject the button into.
 * @param {HTMLButtonElement} button - The button element to inject.
 * @returns {HTMLElement|null} The insertion point element where the button was inserted, or null if insertion failed.
 */
function insertButtonIntoCommentBox(box, button) {
  let insertionPoint = null;

  // Strategy 1: Look for action buttons container (common in LinkedIn comment boxes)
  const actionButtonsContainer =
    box.querySelector('.comments-comment-box__controls-container') ||
    box.querySelector('.comments-comment-texteditor__actions') ||
    box.querySelector('.comments-comment-box__form-container');

  if (actionButtonsContainer) {
    // Insert at the beginning of the action buttons container
    insertionPoint = actionButtonsContainer;
    insertionPoint.insertBefore(button, insertionPoint.firstChild);
    console.log('EngageIQ: Button inserted into action buttons container');
  } else {
    // Strategy 2: Look for the comment input field and insert after it
    const commentInput =
      box.querySelector('div[contenteditable="true"]') ||
      box.querySelector('textarea') ||
      box.querySelector('input');

    if (commentInput && commentInput.parentNode) {
      // Insert after the comment input
      insertionPoint = commentInput.parentNode;
      insertionPoint.appendChild(button);
      console.log('EngageIQ: Button inserted after comment input');
    } else {
      // Strategy 3: Fallback - just append to the comment box itself
      insertionPoint = box;
      box.appendChild(button);
      console.log('EngageIQ: Button inserted using fallback strategy');
    }
  }

  return insertionPoint;
}

/**
 * Processes found comment boxes to potentially inject the EngageIQ button.
 * @param {Function} clickHandler - The click event handler function for the injected buttons.
 */
function processCommentBoxes(clickHandler) {
  console.log('EngageIQ: Processing comment boxes...');
  const commentBoxes = findCommentBoxes();
  console.log(
    `EngageIQ: Found ${commentBoxes.length} potential comment boxes.`
  );

  commentBoxes.forEach((box) => {
    // Check if the button has already been injected for this box
    if (box.dataset.engageiqButtonInjected === 'true') {
      // console.log("EngageIQ: Button already injected, skipping box:", box); // Optional logging
      return; // Skip this box if the marker attribute is present and true
    }

    console.log('EngageIQ: Injecting button into box:', box); // Add log for clarity
    const engageButton = createEngageIQButton();
    
    // Insert the button into the comment box
    insertButtonIntoCommentBox(box, engageButton);

    // Add click event listener
    engageButton.addEventListener('click', clickHandler);

    // Mark the comment box as processed
    box.dataset.engageiqButtonInjected = 'true';
  });
}

/**
 * Sets up the MutationObserver to watch for new comment boxes and process them.
 * @param {Function} clickHandler - The click event handler function for the injected buttons.
 * @returns {MutationObserver} The created observer instance.
 */
function setupCommentBoxObserver(clickHandler) {
  // Options for the observer (which mutations to observe)
  const observerConfig = {
    childList: true, // Observe additions/removals of child nodes
    subtree: true, // Observe the entire subtree under document.body
  };

  // Callback function to execute when mutations are observed
  const mutationCallback = (_mutationsList, _observer) => {
    // We are simply re-processing all boxes on any change for simplicity in MVP.
    // A more optimized approach might inspect mutationsList directly.
    console.log('EngageIQ: DOM change detected, re-processing comment boxes.');
    processCommentBoxes(clickHandler);
  };

  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(mutationCallback);

  // Start observing the target node for configured mutations
  console.log('EngageIQ: Starting MutationObserver on document.body.');
  observer.observe(document.body, observerConfig);

  return observer;
}

/**
 * Initializes the button injection system.
 * @param {Function} buttonClickHandler - The click event handler function for the injected buttons.
 */
function initializeButtonInjection(buttonClickHandler) {
  if (!buttonClickHandler || typeof buttonClickHandler !== 'function') {
    console.error('EngageIQ: Button click handler must be a function');
    return;
  }
  
  // Initial run to catch any comment boxes present on load
  console.log('EngageIQ: Initial check for comment boxes.');
  processCommentBoxes(buttonClickHandler);
  
  // Set up the observer to catch new comment boxes
  setupCommentBoxObserver(buttonClickHandler);
}

// Export the module functions
export {
  findCommentBoxes,
  processCommentBoxes,
  createEngageIQButton,
  insertButtonIntoCommentBox,
  setupCommentBoxObserver,
  initializeButtonInjection,
  COMMENT_BOX_SELECTORS
};
