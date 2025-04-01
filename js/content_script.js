/**
 * EngageIQ Chrome Extension
 * Content Script - Runs in the context of LinkedIn pages
 */

console.log("EngageIQ Content Script Loaded");

// Global variables
let engageIQIframe = null;

/**
 * Target CSS selectors for LinkedIn comment boxes
 * Note: These selectors will likely need iteration as LinkedIn updates their DOM structure
 */
const COMMENT_BOX_SELECTORS = [
  '.feed-shared-update-v2 .comments-comment-box__form',
  'div[aria-label="Write a comment"]',
  '.comments-comment-texteditor__content' // Potential additional selector
];

/**
 * Find all comment boxes on the page using the defined selectors
 * @returns {NodeList} List of comment box elements found on the page
 */
function findCommentBoxes() {
  let allCommentBoxes = [];
  
  // Try each selector and collect results
  COMMENT_BOX_SELECTORS.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      allCommentBoxes = [...allCommentBoxes, ...elements];
    }
  });
  
  return allCommentBoxes;
}

/**
 * Process all comment boxes to inject the EngageIQ button if not already done
 */
function processCommentBoxes() {
  const commentBoxes = findCommentBoxes();
  console.log(`EngageIQ found ${commentBoxes.length} comment boxes`);
  
  commentBoxes.forEach(commentBox => {
    // Check if already processed to avoid duplicates
    if (commentBox.getAttribute('data-engageiq-button-injected') === 'true') {
      return; // Skip this box, already processed
    }
    
    // Create the button element
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'engageiq-button';
    button.title = 'Generate Comments with EngageIQ';
    
    // Create the icon image
    const icon = document.createElement('img');
    icon.src = chrome.runtime.getURL('icons/icon16.png');
    icon.alt = 'EngageIQ';
    icon.width = 16;
    icon.height = 16;
    
    // Append icon to button
    button.appendChild(icon);
    
    // Add click event listener
    button.addEventListener('click', handleEngageIQButtonClick);
    
    // Find the most appropriate insertion point (direct parent of the input element or its immediate child)
    // This is a simplified approach; might need adjustment for specific LinkedIn DOM structure
    const insertionPoint = commentBox;
    insertionPoint.appendChild(button);
    
    // Mark as processed
    commentBox.setAttribute('data-engageiq-button-injected', 'true');
    
    console.log('EngageIQ button injected for a comment box');
  });
}

/**
 * Creates or returns the existing iframe for the EngageIQ popup
 * @returns {HTMLIFrameElement} The iframe element
 */
function getOrCreateIframe() {
  if (engageIQIframe === null) {
    engageIQIframe = document.createElement('iframe');
    engageIQIframe.id = 'engageiq-popup-iframe';
    engageIQIframe.src = chrome.runtime.getURL('html/popup.html');
    document.body.appendChild(engageIQIframe);
    console.log('EngageIQ iframe created');
  }
  return engageIQIframe;
}

/**
 * Handle clicks on the EngageIQ button
 * @param {Event} event - The click event
 */
function handleEngageIQButtonClick(event) {
  event.preventDefault();
  event.stopPropagation();
  
  const iframe = getOrCreateIframe();
  
  // Toggle the iframe visibility
  if (iframe.style.display === 'block') {
    iframe.style.display = 'none';
    console.log('EngageIQ iframe hidden');
  } else {
    iframe.style.display = 'block';
    console.log('EngageIQ iframe shown');
  }
}

/**
 * Set up a MutationObserver to watch for DOM changes that might introduce new comment boxes
 */
function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        processCommentBoxes();
        break; // Process once per batch of mutations
      }
    }
  });
  
  // Observe the body for changes, looking for added comment boxes
  observer.observe(document.body, { childList: true, subtree: true });
  console.log('EngageIQ MutationObserver set up');
}

// Initial processing after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  processCommentBoxes();
  setupMutationObserver();
});

// Also process immediately in case the script loads after DOMContentLoaded
processCommentBoxes();
setupMutationObserver();
