/**
 * EngageIQ Chrome Extension - Popup Script (popup.js)
 *
 * This script runs within the iframe (popup.html) displayed on LinkedIn pages.
 * It handles:
 *  - Receiving messages from the content script (e.g., show loading, display suggestions).
 *  - Sending messages back to the content script (e.g., accept suggestion, request regeneration).
 *  - Managing the UI elements within the popup (accordion, buttons, etc.).
 */

// Log script load confirmation - Compliant with user preference MEMORY[e17fa962-c53a-4d19-ae3a-66c3cbc4dce7]
console.log('EngageIQ: Popup Script Loaded');

// Global element references (initialized in DOMContentLoaded)
let loadingState;
let errorState;
let errorMessage;
let suggestionAccordion;

// Queue to store messages received before DOM is loaded
const messageQueue = [];

/**
 * Shows a specific state element and hides the others
 * @param {string} stateToShow - 'loading', 'error', or 'suggestions'
 */
function showState(stateToShow) {
    // Safety check if DOM references aren't initialized yet
    if (!loadingState || !errorState) {
        console.warn(`EngageIQ: Cannot change UI state to ${stateToShow} - DOM references not initialized`);
        return;
    }
    
    console.log(`EngageIQ: Changing UI state to: ${stateToShow}`);
    
    // Hide all states first
    loadingState.style.display = 'none';
    errorState.style.display = 'none';
    
    // Show the requested state
    switch (stateToShow) {
        case 'loading':
            loadingState.style.display = 'block';
            break;
        case 'error':
            errorState.style.display = 'block';
            break;
        case 'suggestions':
            // The accordion container itself doesn't need to be hidden/shown
            // as it's the individual items that matter
            break;
        default:
            console.warn(`EngageIQ: Unknown state requested: ${stateToShow}`);
    }
}

/**
 * Displays error message in the error state element
 * @param {string} message - The error message to display
 * @param {string} [details] - Optional error details 
 */
function displayError(message, details) {
    // Safety check if DOM references aren't initialized yet
    if (!errorMessage) {
        console.warn('EngageIQ: Cannot display error - DOM references not initialized');
        return;
    }
    
    console.log(`EngageIQ: Displaying error: ${message}`);
    errorMessage.textContent = message || 'Unknown error';
    
    // Could add more UI elements for details if needed
    if (details) {
        console.log(`EngageIQ: Error details: ${details}`);
    }
    
    showState('error');
}

/**
 * Displays suggestions in the accordion
 * @param {Array} suggestions - Array of suggestion objects
 */
function displaySuggestions(suggestions) {
    // Safety check if DOM references aren't initialized yet
    if (!suggestionAccordion) {
        console.warn('EngageIQ: Cannot display suggestions - DOM references not initialized');
        return;
    }
    
    console.log(`EngageIQ: Displaying ${suggestions.length} suggestions`);
    
    // Clear existing content
    suggestionAccordion.innerHTML = '';
    
    // For the MVP, we'll just stringify and display the suggestions
    // This will be replaced with proper accordion items in later steps
    const pre = document.createElement('pre');
    pre.className = 'suggestion-json';
    pre.textContent = JSON.stringify(suggestions, null, 2);
    suggestionAccordion.appendChild(pre);
    
    showState('suggestions');
}

/**
 * Process a message from the content script
 * @param {Object} data - Message data object
 */
function processMessage(data) {
    const { type, error, details, suggestions } = data;

    if (!type) {
        console.warn('EngageIQ: Received message without a type:', data);
        return;
    }

    console.log(`EngageIQ: Processing message type: ${type}`);

    // Handle different message types
    switch (type) {
        case 'SHOW_LOADING':
            console.log('EngageIQ: Showing loading state');
            showState('loading');
            break;
            
        case 'SHOW_ERROR':
            console.log('EngageIQ: Showing error state:', error);
            displayError(error, details);
            break;
            
        case 'SHOW_SUGGESTIONS':
            console.log('EngageIQ: Showing suggestions');
            displaySuggestions(suggestions);
            break;
            
        default:
            console.log('EngageIQ: Received unhandled message type:', type);
    }
}

/**
 * Listen for messages from the parent window (content script).
 */
window.addEventListener('message', (event) => {
    // Log all received messages for debugging
    console.log('EngageIQ: Message received in popup from origin:', event.origin);
    console.log('EngageIQ: Message data:', event.data);
    
    // If DOM is not yet loaded, queue the message for later processing
    if (!loadingState) {
        console.log('EngageIQ: DOM not ready, queuing message for later processing');
        messageQueue.push(event.data);
        return;
    }
    
    // Process the message
    processMessage(event.data);
});

/**
 * Sends a message to the parent content script
 * (Currently unused in Phase 4, will be used in later phases for user interactions)
 * @param {Object} message - The message to send
 */
function sendMessageToContentScript(message) {
    // Use '*' for postMessage when sending from extension iframe to content script
    // This is needed for Chrome extension architecture with content scripts
    console.log('EngageIQ: Sending message to content script:', message);
    window.parent.postMessage(message, '*');
}

// Tell the content script that the popup is ready
function notifyPopupReady() {
    console.log('EngageIQ: Notifying content script that popup is ready');
    sendMessageToContentScript({ type: 'POPUP_READY' });
}

// Initialize DOM element references when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('EngageIQ: Popup DOM Loaded');
    
    // Get references to UI elements
    loadingState = document.getElementById('loadingState');
    errorState = document.getElementById('errorState');
    errorMessage = document.getElementById('errorMessage');
    suggestionAccordion = document.getElementById('suggestionAccordion');
    
    console.log('EngageIQ: UI element references initialized');
    
    // Verify elements were found
    if (!loadingState || !errorState || !errorMessage || !suggestionAccordion) {
        console.error('EngageIQ: One or more UI elements not found in DOM');
    } else {
        // Process any queued messages now that the DOM is ready
        console.log(`EngageIQ: Processing ${messageQueue.length} queued messages`);
        while (messageQueue.length > 0) {
            processMessage(messageQueue.shift());
        }
        
        // Set initial state to loading as fallback if no messages were received
        if (messageQueue.length === 0) {
            showState('loading');
        }
        
        // Notify the content script that the popup is ready
        notifyPopupReady();
    }
});
