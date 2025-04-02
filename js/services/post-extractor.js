/**
 * EngageIQ Chrome Extension
 * Post Extractor Module - Handles extracting content from LinkedIn posts
 */

console.log('EngageIQ: Post Extractor Module Loaded');

/**
 * Selectors for finding post elements
 */
const SELECTORS = {
  postAncestor: '.feed-shared-update-v2',
  textContent: '.update-components-text span[dir="ltr"]'
};

/**
 * Extracts the main text content from the LinkedIn post associated with the clicked button.
 * Follows the MVP strategy: grabs currently visible text only.
 * @param {HTMLElement} clickedButtonElement - The EngageIQ button element that was clicked.
 * @returns {string|null} The extracted post text, an empty string if text is empty/not found in a valid structure, or null if the post structure cannot be identified.
 */
function extractPostContent(clickedButtonElement) {
  console.log('EngageIQ: Attempting to extract post content.');

  // Step 1: Find the common ancestor post element
  const postElement = clickedButtonElement.closest(SELECTORS.postAncestor);

  if (!postElement) {
    console.error(
      `EngageIQ: Could not find post ancestor element using selector: ${SELECTORS.postAncestor}`
    );
    return null; // Indicate failure to find the post structure
  }
  console.log('EngageIQ: Found post ancestor element:', postElement);

  // Step 2: Find the text content element within the ancestor
  const textElement = postElement.querySelector(SELECTORS.textContent);

  if (!textElement) {
    console.warn(
      `EngageIQ: Could not find text content element using selector: ${SELECTORS.textContent} within ancestor. The post might have no text or a different structure.`
    );
    // Decide if this is an error or just a post without text.
    // For MVP, let's return empty string assuming it might be a valid post without text.
    // A more robust solution might differentiate.
    return '';
  }
  console.log('EngageIQ: Found text content element:', textElement);

  // Step 3: Extract, trim, and return text content
  const rawText = textElement.textContent || '';
  const trimmedText = rawText.trim();

  // console.log("EngageIQ: Raw extracted text:", rawText); // Commented out for privacy/cleanliness
  // console.log("EngageIQ: Trimmed extracted text:", trimmedText); // Commented out for privacy/cleanliness

  // Return trimmed text (even if empty)
  return trimmedText;
}

/**
 * Validates extracted post content to ensure it's usable
 * @param {string|null} extractedText - The extracted post text or null if extraction failed
 * @returns {Object} Object containing validation result with { isValid, errorMessage }
 */
function validatePostContent(extractedText) {
  if (extractedText === null) {
    return {
      isValid: false,
      errorMessage: 'Could not find post structure.'
    };
  }
  
  if (extractedText.trim() === '') {
    return {
      isValid: false,
      errorMessage: 'Post text appears empty or could not be extracted.'
    };
  }
  
  return {
    isValid: true,
    errorMessage: null
  };
}

/**
 * Prepares post content for sending to the background script
 * @param {string} extractedText - The validated text content
 * @returns {Object} The formatted post content object
 */
function preparePostContent(extractedText) {
  return {
    text: extractedText,
    // Add other fields like author/timestamp later if needed/possible
  };
}

// Export the module functions and constants
export {
  SELECTORS,
  extractPostContent,
  validatePostContent,
  preparePostContent
};
