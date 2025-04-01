/**
 * EngageIQ Chrome Extension
 * Content Script - Runs in the context of LinkedIn pages
 */

console.log("EngageIQ: Content Script Loaded");

// Initial selectors for comment boxes (May need refinement based on LinkedIn updates)
// TODO: Refine selectors based on testing on live LinkedIn feed and single post pages.
const COMMENT_BOX_SELECTORS = [
    ".feed-shared-update-v2 .comments-comment-box__form", // Standard feed post comment form
    "div[aria-label=\"Write a comment\"]", // Common label for comment input areas
    // Add more selectors here if needed
].join(', '); // Combine selectors for a single query

/**
 * Finds potential LinkedIn comment box elements in the current document.
 * @returns {NodeList} A NodeList containing the found comment box elements.
 */
function findCommentBoxes() {
    // console.log(`EngageIQ: Searching for comment boxes with selectors: ${COMMENT_BOX_SELECTORS}`);
    return document.querySelectorAll(COMMENT_BOX_SELECTORS);
}

/**
 * Processes found comment boxes to potentially inject the EngageIQ button.
 * This function will be expanded in Step 2.4.
 */
function processCommentBoxes() {
    console.log("EngageIQ: Processing comment boxes...");
    const commentBoxes = findCommentBoxes();
    console.log(`EngageIQ: Found ${commentBoxes.length} potential comment boxes.`);

    commentBoxes.forEach(box => {
        // Check if the button has already been injected for this box
        if (box.dataset.engageiqButtonInjected === 'true') {
            // console.log("EngageIQ: Button already injected, skipping box:", box); // Optional logging
            return; // Skip this box if the marker attribute is present and true
        }

        console.log("EngageIQ: Injecting button into box:", box); // Add log for clarity
        const engageButton = document.createElement('button');
        
        // Add Bootstrap-like button classes
        engageButton.className = 'engageiq-btn engageiq-btn-icon';
        engageButton.type = 'button'; // Set button type
        
        // Create and add icon image
        const iconImg = document.createElement('img');
        const iconUrl = chrome.runtime.getURL('icons/icon48.png');
        iconImg.src = iconUrl;
        iconImg.alt = 'EngageIQ';
        iconImg.width = 16;
        iconImg.height = 16;
        console.log("EngageIQ: Using icon URL:", iconUrl);
        engageButton.appendChild(iconImg);
        
        // Add tooltip
        engageButton.title = 'Generate Comments with EngageIQ';

        // Determine insertion point and append button
        // Strategy 1: Look for action buttons container
        let insertionPoint = null;
        
        // Try to find action buttons container (common in LinkedIn comment boxes)
        const actionButtonsContainer = box.querySelector('.comments-comment-box__controls-container') || 
                                       box.querySelector('.comments-comment-texteditor__actions') ||
                                       box.querySelector('.comments-comment-box__form-container');
        
        if (actionButtonsContainer) {
            // Insert at the beginning of the action buttons container
            insertionPoint = actionButtonsContainer;
            insertionPoint.insertBefore(engageButton, insertionPoint.firstChild);
            console.log("EngageIQ: Button inserted into action buttons container");
        } else {
            // Strategy 2: Look for the comment input field and insert after it
            const commentInput = box.querySelector('div[contenteditable="true"]') ||
                               box.querySelector('textarea') ||
                               box.querySelector('input');
            
            if (commentInput && commentInput.parentNode) {
                // Insert after the comment input
                insertionPoint = commentInput.parentNode;
                insertionPoint.appendChild(engageButton);
                console.log("EngageIQ: Button inserted after comment input");
            } else {
                // Strategy 3: Fallback - just append to the comment box itself
                insertionPoint = box;
                box.appendChild(engageButton);
                console.log("EngageIQ: Button inserted using fallback strategy");
            }
        }
        
        // Add click event listener - Updated for Step 3.5
        engageButton.addEventListener('click', handleEngageIQButtonClick);

        // Mark the comment box as processed
        box.dataset.engageiqButtonInjected = 'true';
    });
}

// --- MutationObserver Setup --- 

// Options for the observer (which mutations to observe)
const observerConfig = {
    childList: true, // Observe additions/removals of child nodes
    subtree: true    // Observe the entire subtree under document.body
};

// Callback function to execute when mutations are observed
const mutationCallback = (_mutationsList, _observer) => {
    // We are simply re-processing all boxes on any change for simplicity in MVP.
    // A more optimized approach might inspect mutationsList directly.
    console.log("EngageIQ: DOM change detected, re-processing comment boxes.");
    processCommentBoxes(); 
};

// Create an observer instance linked to the callback function
const observer = new MutationObserver(mutationCallback);

// Start observing the target node for configured mutations
console.log("EngageIQ: Starting MutationObserver on document.body.");
observer.observe(document.body, observerConfig);

// Initial run to catch any comment boxes present on load
console.log("EngageIQ: Initial check for comment boxes.");
processCommentBoxes();

// --- Global variables ---
let engageIQIframe = null; // Renamed from _engageIQIframe for Step 3.5.1

// --- Iframe Management (Step 3.5) ---

/**
 * Gets the existing iframe or creates it if it doesn't exist.
 * Ensures only one instance of the iframe is added to the page.
 * @returns {HTMLIFrameElement} The EngageIQ popup iframe element.
 */
function getOrCreateIframe() {
    if (!engageIQIframe) {
        console.log("EngageIQ: Creating popup iframe.");
        engageIQIframe = document.createElement('iframe');
        engageIQIframe.id = 'engageiq-popup-iframe'; // ID matches css/content_style.css
        // Use chrome.runtime.getURL to access extension resources
        try {
            engageIQIframe.src = chrome.runtime.getURL('html/popup.html');
            console.log("EngageIQ: Iframe src set to:", engageIQIframe.src);
            engageIQIframe.style.display = 'none'; // Start hidden
            document.body.appendChild(engageIQIframe);
            console.log("EngageIQ: Iframe appended to body.");
        } catch (error) {
            console.error("EngageIQ: Error setting iframe src or appending to body:", error);
            // Handle error appropriately, maybe return null or throw
            return null; 
        }
    } else {
        console.log("EngageIQ: Reusing existing popup iframe.");
    }
    return engageIQIframe;
}

/**
 * Handles the click event on the EngageIQ icon button.
 * Toggles the visibility of the popup iframe and handles communication.
 * @param {Event} event - The click event object.
 */
function handleEngageIQButtonClick(event) {
    event.preventDefault();
    event.stopPropagation(); // Prevent event bubbling
    console.log("EngageIQ: handleEngageIQButtonClick triggered.");

    const iframe = getOrCreateIframe();

    if (iframe) {
        if (iframe.style.display === 'none' || iframe.style.display === '') {
            iframe.style.display = 'block';
            console.log("EngageIQ: Showing iframe.");
            
            // Step 4.1.2: Add dummy postContent extraction log
            // In a future implementation, this will extract actual post content
            const dummyPostContent = {
                text: "This is a dummy LinkedIn post content for testing purposes. It simulates what would be extracted from a real LinkedIn post.",
                author: "LinkedIn User",
                timestamp: new Date().toISOString()
            };
            console.log("EngageIQ: Extracted post content (dummy):", dummyPostContent);
            
            // Send SHOW_LOADING message to iframe
            // Make sure to specify the correct target origin for security
            const iframeOrigin = new URL(iframe.src).origin;
            iframe.contentWindow.postMessage({ 
                type: 'SHOW_LOADING',
                message: 'Generating comment suggestions...'
            }, iframeOrigin);
            console.log("EngageIQ: Sent SHOW_LOADING message to iframe");
            
            // Send GENERATE_COMMENTS message to background script
            chrome.runtime.sendMessage({
                type: 'GENERATE_COMMENTS',
                postContent: dummyPostContent
            }, response => {
                // Handle chrome.runtime.lastError first
                if (chrome.runtime.lastError) {
                    console.error("EngageIQ: Error sending message to background script:", chrome.runtime.lastError);
                    
                    // Send error message to iframe
                    iframe.contentWindow.postMessage({
                        type: 'SHOW_ERROR',
                        error: 'Failed to communicate with background script',
                        details: chrome.runtime.lastError.message
                    }, iframeOrigin);
                    return;
                }
                
                // Handle successful response
                console.log("EngageIQ: Received response from background script:", response);
                
                if (response && response.success) {
                    // Send suggestions to iframe
                    iframe.contentWindow.postMessage({
                        type: 'SHOW_SUGGESTIONS',
                        suggestions: response.suggestions
                    }, iframeOrigin);
                    console.log("EngageIQ: Sent SHOW_SUGGESTIONS to iframe");
                } else {
                    // Send error to iframe
                    iframe.contentWindow.postMessage({
                        type: 'SHOW_ERROR',
                        error: response?.error || 'Failed to generate suggestions',
                        details: response?.details || 'Unknown error'
                    }, iframeOrigin);
                    console.log("EngageIQ: Sent SHOW_ERROR to iframe");
                }
            });
            console.log("EngageIQ: Sent GENERATE_COMMENTS message to background script");
            
        } else {
            iframe.style.display = 'none';
            console.log("EngageIQ: Hiding iframe.");
        }
    } else {
        console.error("EngageIQ: Failed to get or create iframe.");
        // Optionally show an error to the user
    }
}

// --- Phase 2: Button Injection Logic (Implemented above) ---
