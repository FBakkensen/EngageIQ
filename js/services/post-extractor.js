/**
 * EngageIQ Chrome Extension
 * Post Extractor Module - Handles extracting content from LinkedIn posts
 */

console.log('EngageIQ: Post Extractor Module Loaded');

import { ImageSelector } from '../utils/ImageSelector.js';
import { ImageContextDebug } from '../utils/ImageContextDebug.js';

/**
 * Selectors for finding post elements
 */
const SELECTORS = {
  postAncestor: '.feed-shared-update-v2',
  textContent: '.update-components-text span[dir="ltr"]',
  // Updated selectors for metadata extraction based on current LinkedIn DOM
  authorName: '.update-components-actor__title .hoverable-link-text',
  authorNameFallback: '.update-components-actor__meta-link .t-bold',
  authorTitle: '.update-components-actor__description',
  authorTitleFallback: '.update-components-actor__meta .update-components-actor__sub-description',
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
    // Try primary selectors first, then fallback selectors
    const nameElement = postElement.querySelector(SELECTORS.authorName) ||
                        postElement.querySelector(SELECTORS.authorNameFallback);
    const titleElement = postElement.querySelector(SELECTORS.authorTitle) ||
                          postElement.querySelector(SELECTORS.authorTitleFallback);

    if (!nameElement) {
      console.warn('EngageIQ: Could not find author name element');
      return null;
    }

    // Extract and clean the text content
    let name = nameElement.textContent.trim();
    // Remove "Following" or other status indicators if present
    name = name.split('•')[0].trim();

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

  // Find the post element using progressively broader searches
  let postElement = null;

  // Try different strategies to locate the post element
  if (clickedButtonElement) {
    // Strategy 1: Direct ancestor search
    postElement = clickedButtonElement.closest(SELECTORS.postAncestor);

    // Strategy 2: If not found, look for a parent comment section and then find its post ancestor
    if (!postElement) {
      const commentSection = clickedButtonElement.closest('.comments-comment-item, .comments-comments-list, .social-details-social-activity');
      if (commentSection) {
        // Find the nearest post element that contains this comment section
        postElement = commentSection.closest(SELECTORS.postAncestor);
      }
    }

    // Strategy 3: If still not found, look upward in DOM tree for any post element
    if (!postElement) {
      // Walk up the DOM tree looking for the post element
      let currentElement = clickedButtonElement.parentElement;
      while (currentElement && !postElement) {
        if (currentElement.matches && currentElement.matches(SELECTORS.postAncestor)) {
          postElement = currentElement;
        } else {
          // If current element has any post elements as children, use the first one
          const childPosts = currentElement.querySelectorAll(SELECTORS.postAncestor);
          if (childPosts.length > 0) {
            postElement = childPosts[0];
          }
        }
        currentElement = currentElement.parentElement;
      }
    }
  }

  if (!postElement) {
    console.warn('EngageIQ: Could not find post element for image detection');
    return result;
  }

  console.log('EngageIQ: Found post element for image detection:', postElement);

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

  // Image detection - with extra debug logging
  console.log('EngageIQ: Starting image detection on post element');

  // DEBUG: Log if ImageContextDebug is enabled
  console.log('EngageIQ: ImageContextDebug enabled:', ImageContextDebug.isEnabled());

  // Find all images in the post
  const images = ImageSelector.findPostImages(postElement);

  console.log('EngageIQ: Image detection returned', images.length, 'images');

  if (images.length > 0) {
    const imageUrls = images.map(img => img.src);
    // Log using both standard console and ImageContextDebug
    console.log('EngageIQ: Found images in post:', imageUrls);
    ImageContextDebug.logInfo(`Detected ${images.length} image(s) in post.`, imageUrls);
    result.imageUrls = imageUrls;
  } else {
    console.log('EngageIQ: No images found in post');
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
