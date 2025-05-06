# High-Level Technical Design: EngageIQ Chrome Extension (Draft 4)

**Document Version:** 1.1 (MVP)
**Date:** 2025-05-06
**Status:** Draft Updated for Multi-Model Implementation

## 1. Overview

This document outlines the proposed technical architecture for the EngageIQ Chrome Extension (Manifest V3). It details the primary components, their responsibilities, communication flows, and key technical strategies based on the PRD (Draft 7). The architecture prioritizes security (API key handling), performance, **style isolation (via Iframe)**, and maintainability, utilizing pure HTML/JS/CSS (with Bootstrap 5) as specified. The extension now supports both Google's Gemini and OpenAI models for enhanced flexibility.

## 2. Core Components (Manifest V3)

*   **2.1. Manifest (`manifest.json`)**
    *   **Responsibilities:** Defines extension properties, permissions, components, icons, and content script matching patterns.
    *   **Key Declarations:**
        *   `manifest_version`: 3
        *   `name`: EngageIQ
        *   `version`: (e.g., 1.0.0)
        *   `description`: Generate AI comments for LinkedIn posts.
        *   `permissions`: `storage` (for API key), `activeTab` (to be confirmed during implementation if sufficient, otherwise `scripting`).
        *   `host_permissions`: `*://*.linkedin.com/*` (for content script injection), `https://generativelanguage.googleapis.com/` (or the specific Gemini API endpoint, for background script API calls), `https://api.openai.com/` (for OpenAI model API calls).
        *   `content_scripts`: Defines JS files injected into LinkedIn pages (e.g., `content_script.js`). Associated CSS might be minimal (primarily for iframe container styling).
            ```json
            "content_scripts": [{
              "matches": ["*://*.linkedin.com/*"],
              "js": ["content_script.js"],
              "css": ["content_style.css"] // Optional CSS for iframe container
            }]
            ```
        *   `background`: Defines the Service Worker script (`background.js`).
            ```json
            "background": {
              "service_worker": "background.js"
            }
            ```
        *   `options_page`: Points to the HTML file for the settings page (`options.html`).
        *   `icons`: Paths to extension icons (e.g., 16x16, 48x48, 128x128).
        *   `action`: (Likely *not* needed for MVP, as primary interaction is via injected button).
        *   **`web_accessible_resources`**: **Required**. Declares the `popup.html` file and its assets (JS, CSS) to allow the iframe on LinkedIn pages to load it.
            ```json
            "web_accessible_resources": [{
              "resources": [
                "popup.html",
                "popup.js",
                "popup.css",
                "assets/bootstrap.min.css", // Example path
                "assets/bootstrap.bundle.min.js" // Example path
               ],
              "matches": ["*://*.linkedin.com/*"]
            }]
            ```

*   **2.2. Content Script(s) (`content_script.js`, `content_style.css`)**
    *   **Context:** Runs in the isolated context of LinkedIn web pages (`*://*.linkedin.com/*`).
    *   **Responsibilities:**
        *   **DOM Monitoring/Interaction (O3):** Detect comment input fields on supported views (feed, single post).
        *   **Button Injection:** Add the EngageIQ icon button (F1) adjacent to detected fields. Add hover tooltip.
        *   **Event Handling:** Listen for clicks on the injected EngageIQ button.
        *   **Data Extraction:** On button click, extract the associated post's content text (O3).
        *   **Iframe Management:** Create, style (positioning, z-index, border, potentially using `content_style.css`), show, and hide an `<iframe>` element. Set the `iframe.src` to `chrome.runtime.getURL("popup.html")`.
        *   **Orchestration:** Manage the overall flow initiated by the button click - showing the iframe, triggering background tasks, relaying results to the iframe, and handling actions requested by the iframe (like inserting text).
        *   **Communication (To Background):** Send messages to Background SW:
            *   `{ type: "GENERATE_COMMENTS", payload: { postContent: "..." } }`
            *   `{ type: "REGENERATE_LONGER", payload: { reactionType: "...", currentText: "..."} }`
            *   `{ type: "REGENERATE_SHORTER", payload: { reactionType: "...", currentText: "..."} }`
        *   **Communication (To Iframe - via `iframe.contentWindow.postMessage(...)`):** Send messages to control the iframe UI state and provide data:
            *   `{ type: "SHOW_LOADING" }`
            *   `{ type: "SHOW_ERROR", payload: { message: "..." } }`
            *   `{ type: "SHOW_SUGGESTIONS", payload: { suggestions: { like: "...", ... } } }`
            *   `{ type: "UPDATE_SINGLE_SUGGESTION", payload: { reactionType: "...", newText: "..." } }`
        *   **Communication (From Iframe - via `window.addEventListener('message', ...)`):** Listen for user actions originating from within the iframe:
            *   `{ type: "REQUEST_LONGER", payload: { reactionType: "...", currentText: "..." } }`
            *   `{ type: "REQUEST_SHORTER", payload: { reactionType: "...", currentText: "..." } }`
            *   `{ type: "ACCEPT_SUGGESTION", payload: { text: "..." } }` (Triggers text insertion and iframe closure).
    *   **Libraries:** Custom JS. Minimal custom CSS (`content_style.css`) likely needed for the iframe container itself.

*   **2.3. Background Service Worker (`background.js`)**
    *   **Context:** Runs in a separate background process, event-driven (Manifest V3). No direct DOM access.
    *   **Responsibilities:**
        *   **API Key Management:** Retrieve the stored API keys (Gemini and OpenAI) from `chrome.storage`.
        *   **API Provider Selection:** Determine which model provider to use based on user settings.
        *   **Communication (Incoming):** Listen for messages (`chrome.runtime.onMessage`) from Content Script(s) (e.g., "GENERATE_COMMENTS", "REGENERATE_LONGER", "REGENERATE_SHORTER").
        *   **API Interaction (F3, F5):** Construct and send requests to the selected API (Gemini or OpenAI) using `fetch`, including the prompt, post content, JSON schema instruction, language instruction, and the user's API key. Handle API responses (success, errors, rate limits). *API key is handled securely here.*
        *   **Data Processing:** Parse the JSON response from the API.
        *   **Communication (Outgoing):** Send messages (`chrome.tabs.sendMessage` or response callback) back to the requesting Content Script containing the processed suggestions (JSON data) or error information.
    *   **Libraries:** None directly, uses `fetch` API, `chrome.runtime.onMessage`, `chrome.storage.sync.get`.

*   **2.4. Options Page (`options.html`, `options.js`, `options.css`)**
    *   **Context:** Runs in its own tab when accessed via Chrome extensions menu.
    *   **Responsibilities:**
        *   **UI:** Provide an input field for the Gemini API Key (F7) and an input field for the OpenAI API Key. Provide a dropdown or radio buttons to select the preferred model provider. A save button. Styled with Bootstrap.
        *   **API Key Storage:** On save, store the entered API keys securely using `chrome.storage.sync.set()`. Provide user feedback on save (success/failure).
        *   **API Key Retrieval:** On load, attempt to retrieve and display the currently saved API keys (consider masking).
    *   **Libraries:** Bootstrap 5 CSS/JS, custom JS (`options.js`), `chrome.storage`.

*   **2.5. Popup UI Frame (`popup.html`, `popup.js`, `popup.css`)**
    *   **Context:** Runs inside the iframe created by the Content Script. Loaded as a `web_accessible_resource`.
    *   **Responsibilities:**
        *   **UI Structure:** Contains the HTML for the modal content (header with "EngageIQ", Bootstrap Accordion, loading indicators, error message areas). Links to required CSS (Bootstrap, `popup.css`) and JS (Bootstrap, `popup.js`).
        *   **Rendering:** Listens (`window.addEventListener('message', ...)`) for messages (`SHOW_LOADING`, `SHOW_ERROR`, `SHOW_SUGGESTIONS`, `UPDATE_SINGLE_SUGGESTION`) from the Content Script. Updates the DOM to display suggestions in the accordion, show/hide loading states, or show error messages.
        *   **Internal Event Handling:** Handles clicks on the Bootstrap accordion headers, '+' / '-' buttons, and 'Accept' buttons within the iframe's document.
        *   **Communication (To Content Script - via `window.parent.postMessage(...)`):** Sends messages back to the parent window (Content Script) indicating user actions *requiring external action* (API calls or DOM manipulation on main page):
            *   `{ type: "REQUEST_LONGER", payload: { reactionType: "...", currentText: "..."} }`
            *   `{ type: "REQUEST_SHORTER", payload: { reactionType: "...", currentText: "..."} }`
            *   `{ type: "ACCEPT_SUGGESTION", payload: { text: "..." } }`
    *   **Libraries:** Bootstrap 5 CSS/JS, custom JS (`popup.js`), custom CSS (`popup.css`).

## 3. Communication Flow Examples

*   **Initial Generation (Simplified Push):**
    1.  **User:** Clicks EngageIQ icon button on LinkedIn page.
    2.  **Content Script:** Extracts post content. Creates/shows `<iframe>` (`src="popup.html"`). Sends `{ type: "SHOW_LOADING" }` to Iframe. Sends `{ type: "GENERATE_COMMENTS", ... }` to Background SW.
    3.  **Iframe:** Receives `SHOW_LOADING`, displays loading UI.
    4.  **Background SW:** Gets API key. Calls selected API (Gemini or OpenAI). Gets response. Sends result (`GENERATION_SUCCESS` or `GENERATION_ERROR`) back to Content Script.
    5.  **Content Script:** Receives result. Relays corresponding message (`SHOW_SUGGESTIONS` or `SHOW_ERROR`) to Iframe via `postMessage`.
    6.  **Iframe:** Receives message. Hides loading UI. Renders suggestions in accordion or displays error.

*   **Accept Suggestion:**
    1.  **User:** Clicks "Accept" button inside the Iframe.
    2.  **Iframe (`popup.js`):** Sends `{ type: "ACCEPT_SUGGESTION", payload: { text: "..." } }` to Content Script via `postMessage`.
    3.  **Content Script:** Receives message. Inserts `payload.text` into the target LinkedIn comment field. Removes/hides the `<iframe>`.

## 4. Key Technical Strategies

*   **UI Isolation:** **Iframe (`popup.html`)** used to host the Bootstrap-based UI, preventing CSS conflicts.
*   **Cross-Frame Communication:** `window.postMessage` API used for secure communication between Content Script and Iframe. **Simplified Push model** where Content Script sends data/state updates to the Iframe. Implement origin checks in listeners for security:
    ```javascript
    // In popup.js (iframe) listener
    window.addEventListener('message', (event) => {
      // IMPORTANT: Check the origin of the sender
      if (event.origin !== window.location.origin) { // In this case, iframe origin is chrome-extension://...
         // Or check if event.source === window.parent for direct parent check
         // console.warn("Discarding message from unknown origin:", event.origin);
         // return;
         // NOTE: For chrome-extension iframes, source check might be more reliable than origin string comparison. Test this.
      }
      // Process event.data ({ type: ..., payload: ... })
    });

    // In content_script.js postMessage call
    const iframeOrigin = new URL(chrome.runtime.getURL("popup.html")).origin;
    iframeElement.contentWindow.postMessage({ type: "...", payload: ... }, iframeOrigin);
    ```
*   **API Calls:** Made exclusively from the Background Service Worker to protect the user's API key.
*   **Storage:** `chrome.storage.sync` used for the API key.
*   **DOM Interaction (O3):** Handled by the Content Script. Implementation starts with simplest viable selectors and iterates as needed.
*   **Modularity:** Clear separation of concerns between Content Script (Orchestration, DOM), Background SW (API Logic), Options Page (Settings), and Popup UI Frame (UI Rendering).

## 5. Open Areas / Considerations for Implementation Plan

*   **Refine Permissions:** Confirm `activeTab` vs `scripting` based on final DOM interaction needs. Ensure `web_accessible_resources` correctly lists all files needed by `popup.html`.
*   **Background SW Lifecycle:** Design for potential termination/restart of the service worker (Manifest V3 characteristic). Avoid relying on global variables in SW for persistent state between events. Fetch API key when needed.
*   **Iframe Styling:** Define CSS rules in `content_style.css` (or applied via JS) to style the `<iframe>` element itself (size, position, z-index, border, background) so it appears correctly as a modal overlay on LinkedIn.
*   **`postMessage` Robustness:** Implement clear message formats (`type`, `payload`). Handle potential errors during message passing. Thoroughly test origin/source checks.
*   **DOM Selector Strategy (O3):** Allocate time for initial investigation and expect ongoing maintenance as LinkedIn's site structure evolves. Define fallback strategies if primary selectors fail.