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
  textContent: '.update-components-text span[dir="ltr"]',
  // New selectors for metadata extraction
  authorName: '.feed-shared-actor__name',
  authorTitle: '.feed-shared-actor__description',
  engagementSection: '.social-details-social-counts',
  likeCount: '.social-details-social-counts__reactions-count',
  commentCount: '.social-details-social-counts__comments button',
  repostCount: '.social-details-social-counts__comments ~ div'  
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
 * Extracts author information from the LinkedIn post
 * @param {HTMLElement} postElement - The post element to extract author info from
 * @returns {Object|null} Author information or null if not found
 */
function extractAuthorInfo(postElement) {
  if (!postElement) return null;
  
  try {
    const nameElement = postElement.querySelector(SELECTORS.authorName);
    const titleElement = postElement.querySelector(SELECTORS.authorTitle);
    
    if (!nameElement) {
      console.warn('EngageIQ: Could not find author name element');
      return null;
    }
    
    const name = nameElement.textContent.trim();
    const title = titleElement ? titleElement.textContent.trim() : '';
    
    return {
      name,
      title,
      fullTitle: title ? `${name}, ${title}` : name
    };
  } catch (error) {
    console.error('EngageIQ: Error extracting author info:', error);
    return null;
  }
}

/**
 * Extracts engagement metrics from the LinkedIn post
 * @param {HTMLElement} postElement - The post element to extract metrics from
 * @returns {Object|null} Engagement metrics or null if not found
 */
function extractEngagementMetrics(postElement) {
  if (!postElement) return null;
  
  try {
    const engagementSection = postElement.querySelector(SELECTORS.engagementSection);
    if (!engagementSection) {
      console.warn('EngageIQ: Could not find engagement section');
      return null;
    }
    
    // Extract metrics text, defaults to '0' if not found
    const likeCountText = postElement.querySelector(SELECTORS.likeCount)?.textContent?.trim() || '0';
    const commentCountText = postElement.querySelector(SELECTORS.commentCount)?.textContent?.trim() || '0';
    const repostCountText = postElement.querySelector(SELECTORS.repostCount)?.textContent?.trim() || '0';
    
    // Parse numeric values (handle cases like '1K', '2.5K', etc.)
    const parseMetric = (text) => {
      if (!text) return 0;
      if (text.includes('K')) {
        return parseFloat(text.replace('K', '')) * 1000;
      }
      return parseInt(text.replace(/[^0-9]/g, '')) || 0;
    };
    
    const likes = parseMetric(likeCountText);
    const comments = parseMetric(commentCountText);
    const reposts = parseMetric(repostCountText);
    
    // Calculate engagement score (simple weighted sum)
    const engagementScore = likes + (comments * 2) + (reposts * 3);
    
    return {
      likes,
      comments,
      reposts,
      engagementScore,
      summary: `${likes} likes, ${comments} comments, ${reposts} reposts`
    };
  } catch (error) {
    console.error('EngageIQ: Error extracting engagement metrics:', error);
    return null;
  }
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
 * @param {HTMLElement} clickedButtonElement - The button element that was clicked
 * @returns {Object} The formatted post content object with metadata
 */
function preparePostContent(extractedText, clickedButtonElement) {
  // Initialize with basic text content
  const result = {
    text: extractedText,
  };
  
  // Find post element
  const postElement = clickedButtonElement?.closest(SELECTORS.postAncestor);
  if (!postElement) {
    return result;
  }
  
  // Add author information if available
  const authorInfo = extractAuthorInfo(postElement);
  if (authorInfo) {
    result.author = authorInfo.fullTitle;
    result.authorName = authorInfo.name;
    result.authorTitle = authorInfo.title;
  }
  
  // Add engagement metrics if available
  const engagementInfo = extractEngagementMetrics(postElement);
  if (engagementInfo) {
    result.engagementStats = engagementInfo.summary;
    result.engagementScore = engagementInfo.engagementScore;
    result.engagementDetails = {
      likes: engagementInfo.likes,
      comments: engagementInfo.comments,
      reposts: engagementInfo.reposts
    };
  }
  
  return result;
}

// Export the module functions and constants
export {
  SELECTORS,
  extractPostContent,
  extractAuthorInfo,
  extractEngagementMetrics,
  validatePostContent,
  preparePostContent
};
