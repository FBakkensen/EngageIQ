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

/**
 * Shows a specific state element and hides the others
 * @param {string} stateToShow - 'loading', 'error', or 'suggestions'
 */
function showState(stateToShow) {
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
    errorMessage.textContent = message;
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
 * Listen for messages from the parent window (content script).
 */
window.addEventListener('message', (event) => {
    // IMPORTANT: Always verify the origin of the message for security.
    // In this basic setup, we might expect messages from the same origin (LinkedIn),
    // but a more robust check might be needed depending on the final architecture.
    // For now, we'll log the origin and data for debugging.
    console.log('EngageIQ: Message received in popup:', event.origin, event.data);

    // Basic origin check - adjust if necessary
    // Example: if (!event.origin.startsWith('https://www.linkedin.com')) {
    //     console.warn('EngageIQ: Discarding message from unexpected origin:', event.origin);
    //     return;
    // }

    const { type, error, details, suggestions } = event.data;

    if (!type) {
        console.warn('EngageIQ: Received message without a type:', event.data);
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
});

/**
 * Sends a message to the parent content script
 * (Currently unused in Phase 4, will be used in later phases for user interactions)
 * @param {Object} message - The message to send
 */
function sendMessageToContentScript(message) {
    // IMPORTANT: Specify the target origin for security.
    // '*' is insecure and should be replaced with the actual origin of the parent window (LinkedIn).
    console.log('EngageIQ: Sending message to content script:', message);
    // Example: window.parent.postMessage(message, 'https://www.linkedin.com');
    window.parent.postMessage(message, '*'); // Replace '*' with target origin
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
    }
});
