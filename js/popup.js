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

    const { type, payload } = event.data; // Assuming message format { type: '...', payload: ... }

    if (!type) {
        console.warn('EngageIQ: Received message without a type:', event.data);
        return;
    }

    console.log(`EngageIQ: Processing message type: ${type}`);

    // TODO: Add switch statement here later to handle different message types
    // (e.g., SHOW_LOADING, SHOW_ERROR, SHOW_SUGGESTIONS)
    switch (type) {
        // case 'SHOW_LOADING':
        //    // handle showing loading indicator
        //    break;
        // case 'SHOW_ERROR':
        //    // handle showing error message
        //    break;
        // case 'SHOW_SUGGESTIONS':
        //    // handle rendering suggestions
        //    break;
        default:
            console.log('EngageIQ: Received unhandled message type:', type);
    }
});

// Placeholder for sending messages back to the content script
function sendMessageToContentScript(message) {
    // IMPORTANT: Specify the target origin for security.
    // '*' is insecure and should be replaced with the actual origin of the parent window (LinkedIn).
    console.log('EngageIQ: Sending message to content script:', message);
    // Example: window.parent.postMessage(message, 'https://www.linkedin.com');
    window.parent.postMessage(message, '*'); // Replace '*' with target origin
}

// Example usage (will be triggered by UI events later)
// sendMessageToContentScript({ type: 'POPUP_READY' });

// --- DOM Element References (Get them when DOM is ready) ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('EngageIQ: Popup DOM Loaded');
    // Get references to UI elements here later (loading, error, accordion)
    // const loadingState = document.getElementById('loadingState');
    // const errorState = document.getElementById('errorState');
    // const errorMessage = document.getElementById('errorMessage');
    // const suggestionAccordion = document.getElementById('suggestionAccordion');
});
