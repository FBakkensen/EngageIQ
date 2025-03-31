# Product Requirements Document: EngageIQ - LinkedIn AI Comment Generator (Draft 7 - MVP Focus)

**Document Version:** 1.0 (MVP)
**Date:** 2025-03-31
**Status:** Draft Finalized for MVP Development

## 1. Introduction

*   **Product:** EngageIQ - A Chrome extension that assists users in generating relevant and engaging comments for LinkedIn posts.
*   **Purpose:** To save users time and effort in crafting comments, encouraging more meaningful engagement on LinkedIn.
*   **Vision:** To become a helpful tool for LinkedIn users who want to participate actively in discussions but may struggle with formulating comments quickly or effectively.

## 2. Goals (MVP)

*   **Goal 1:** Provide users with contextually relevant comment suggestions based on the content of a LinkedIn post, with Gemini handling language matching based on the post content.
*   **Goal 2:** Offer six comment suggestions reflecting the standard LinkedIn reaction types (Like, Celebrate, Support, Love, Insightful, Funny).
*   **Goal 3:** Allow users to adjust the length of suggested comments via regeneration through Gemini.
*   **Goal 4:** Enable seamless insertion of the chosen comment into the LinkedIn comment field.
*   **Goal 5:** Provide a simple interface for users to configure their Gemini API key.

## 3. Target Audience

*   Active LinkedIn users who regularly engage with posts (commenting, reacting).
*   Users who want to increase their engagement but find comment writing time-consuming.
*   Professionals looking to build their network presence through active participation.
*   Non-native speakers who may want assistance in formulating professional comments in the post's language.

## 4. Features (MVP)

*   **F1: Comment Generator Button**
    *   **F1.1:** The extension shall detect standard LinkedIn comment input fields on the feed and single post pages.
    *   **F1.2:** An icon button, using the **EngageIQ extension logo**, shall be dynamically added below or adjacent to the detected LinkedIn comment input field. **This button will contain no text.** A tooltip displaying "Generate Comments with EngageIQ" (or similar) should appear on hover for clarity.
*   **F2: Comment Generation Trigger**
    *   **F2.1:** Clicking the EngageIQ icon button shall trigger the comment generation process.
    *   **F2.2:** The extension must extract the main content of the specific LinkedIn post associated with the comment box using defined DOM selectors (see O3).
*   **F3: AI Comment Suggestion (Gemini Integration)**
    *   **F3.1:** The extracted post content shall be sent to the Google Gemini API using the user-provided API key.
    *   **F3.2:** The request to Gemini should ask for multiple comment suggestions based on the post content. The prompt **must instruct Gemini to generate the suggestions in the same language as the provided post content.**
    *   **F3.3:** Specifically, the request should solicit one suggestion corresponding to each of the six standard LinkedIn reaction types: Like, Celebrate, Support, Love, Insightful, Funny.
    *   **F3.4:** The API request to Gemini **must specify a JSON schema** to structure the output, ensuring reliably parseable responses containing the six comments associated with their reaction types (See Section 10, O5).
    *   **F3.5:** The extension will parse the JSON response from Gemini to extract the suggestions.
    *   **F3.6:** Initial generated comments should be of a default medium length, as requested in the prompt.
*   **F4: Suggestion Display Popup**
    *   **F4.1:** Generated comment suggestions shall be displayed in a modal popup window overlaid on the LinkedIn page, styled with Bootstrap.
    *   **F4.2:** The popup shall be clearly branded "EngageIQ".
    *   **F4.3:** The popup shall utilize a **Bootstrap Accordion** component. Each of the six reaction types will form the header of an accordion item.
    *   **F4.4:** Clicking an accordion header (labeled with the reaction type) shall expand that item to reveal the corresponding generated comment, length adjustment buttons ('+' and '-'), and the 'Accept' button within the accordion body. Only one accordion item should be open at a time by default.
*   **F5: Comment Length Adjustment**
    *   **F5.1:** Within the expanded body of each accordion item, there shall be a '+' (increase length) button and a '-' (decrease length) button next to the displayed comment suggestion.
    *   **F5.2:** Clicking '+' shall trigger a new API call to Gemini. The prompt will request regeneration of *that specific comment* to be longer, instructing Gemini to maintain the original language, context, and reaction tone. JSON output format required.
    *   **F5.3:** Clicking '-' shall trigger a new API call to Gemini. The prompt will request regeneration of *that specific comment* to be shorter, instructing Gemini to maintain the original language, context, and reaction tone. JSON output format required.
    *   **F5.4:** The comment text within the accordion item's body shall update to show the newly generated comment after parsing the JSON response.
*   **F6: Comment Insertion**
    *   **F6.1:** Within the expanded body of each accordion item, there shall be an "Accept" or "Use this comment" button.
    *   **F6.2:** Clicking this button shall close the popup and insert the currently displayed text of that suggestion directly into the LinkedIn comment input field the user initially clicked the generator button for.
*   **F7: Settings**
    *   **F7.1:** The extension shall have an options/settings page accessible via the Chrome extensions menu, branded "EngageIQ Settings".
    *   **F7.2:** The settings page shall contain an input field labeled "Gemini API Key".
    *   **F7.3:** Users shall be able to enter and save their Gemini API key using `chrome.storage.sync` or `chrome.storage.local`.
    *   **F7.4:** Basic "field not empty" validation on save.

## 5. Design & UI/UX

*   **UI Library:** Bootstrap 5 (latest stable version).
*   **Consistency:** Aim for a clean look that fits reasonably well with LinkedIn's UI. The injected icon button and popup should be clearly identifiable as EngageIQ features.
*   **Popup Layout:** Bootstrap Accordion for the six suggestions.
*   **User Flow:** Click EngageIQ icon -> Popup appears with loading state -> Accordion with 6 reaction types displays -> User expands one -> User optionally adjusts length (+/- triggers API call & updates text) -> User clicks 'Accept' -> Popup closes, text inserted into LinkedIn comment field -> User posts comment via LinkedIn normally.
*   **Error Handling:** Clear messages within the popup for missing/invalid API key, Gemini API errors (network, rate limits, content policy), and failure to extract post content.

## 6. Technical Requirements

*   **Platform:** Google Chrome Extension (Manifest V3).
*   **Core Technologies:** HTML5, CSS3, JavaScript (ES6+). No external JS frameworks (like React, Vue, Angular).
*   **Styling:** Bootstrap 5 CSS.
*   **APIs:** Google Gemini API (user key required). Must support specifying JSON output schema and follow language instructions.
*   **Data Handling:** Construct API requests (JSON schema, prompts) and parse JSON responses.
*   **DOM Interaction (O3):** Requires JavaScript logic to inject the icon button and extract post content. **Implementation will start with the simplest viable selectors and iterate as needed, acknowledging LinkedIn UI changes may require ongoing maintenance.** Focus on feed (`.feed-shared-update-v2`) and single post page structures initially.
*   **Chrome Extension APIs:**
    *   `manifest.json`: Permissions (`activeTab`, `storage`, `scripting`), content scripts, options page, background service worker (for API calls if needed), icons.
    *   `content_scripts`: To inject button and potentially handle DOM interaction directly or trigger background script.
    *   `chrome.storage`: For API key (`sync` preferred for cross-device, `local` as fallback).
    *   `chrome.runtime`: For messaging between content scripts, background, options page.
    *   `chrome.scripting`: For executing scripts or inserting CSS programmatically if needed.
*   **API Key Security:** Store securely via `chrome.storage`, never hardcode. Use HTTPS for all API calls. Ensure API key is *not* exposed in client-side code accessible via browser dev tools where possible (e.g., by making API calls from a background service worker if complexity allows).

## 7. Non-Functional Requirements (MVP)

*   **Performance:** Minimize impact on browser performance and LinkedIn page load/interaction speed. Asynchronous operations for API calls and DOM manipulations where appropriate. Efficient button injection logic.
*   **Security:** Secure API key handling. Request minimum necessary permissions in `manifest.json`. Sanitize any data inserted into the DOM if applicable (though mainly inserting text into input fields).
*   **Privacy:** Access only necessary post content upon user action (button click). No extraneous data collection or transmission, except to the Gemini API as per user action. Clearly state data handling in privacy policy.
*   **Reliability:** Core functionality should work reliably on main LinkedIn feed and single post views on the latest stable Chrome version. Robustness of DOM selectors (O3) is key and subject to iteration and maintenance.

## 8. Future Considerations (Post-MVP)

*   More robust language handling (e.g., manual override if Gemini misinterprets).
*   Tone customization (Formal, Casual, Humorous sliders/options).
*   Allowing users to add custom instructions/prompts to refine suggestions.
*   Saving user preferences (e.g., default length, preferred tones).
*   Support for other LinkedIn views (e.g., Groups posts, Article comments).
*   More granular error handling and user feedback.
*   Developing a more resilient DOM selector strategy (e.g., using multiple fallback selectors).
*   Potential integration with other AI models.

## 9. Release Criteria (MVP)

*   All features F1-F7 implemented as described in Section 4.
*   The core user flow (click icon -> get accordion suggestions -> adjust length -> accept -> insert) is functional and intuitive on the main LinkedIn feed and single post pages.
*   Gemini integration correctly uses JSON schema and handles basic language matching via prompt instructions.
*   Basic error handling for common failure points (API key, API errors, content extraction failure) is present and provides user feedback.
*   The settings page allows users to successfully save and retrieve their Gemini API key.
*   The extension passes manual testing on the latest stable version of Google Chrome against target LinkedIn views.
*   Basic extension assets (icons) are included.
*   A minimal privacy policy is available.

## 10. Open Issues / Items to Finalize During Development

*   **O3:** **(Implementation Task)** Develop and refine the specific DOM selectors and JavaScript logic for button injection and post content extraction. Start simple and iterate based on testing against the live LinkedIn interface. Document chosen selectors.
*   **O5:** **(Implementation Task)** Finalize the exact wording of Gemini prompts (initial generation and length adjustment) and confirm/adjust the proposed JSON schemas based on testing Gemini's API responses for consistency and quality.
    *   *Initial Schema Proposal:*
        ```json
        {
          "type": "object",
          "properties": {
            "comments": {
              "type": "object",
              "properties": {
                "like": { "type": "string", "description": "Comment suggestion for 'Like' reaction." },
                "celebrate": { "type": "string", "description": "Comment suggestion for 'Celebrate' reaction." },
                "support": { "type": "string", "description": "Comment suggestion for 'Support' reaction." },
                "love": { "type": "string", "description": "Comment suggestion for 'Love' reaction." },
                "insightful": { "type": "string", "description": "Comment suggestion for 'Insightful' reaction." },
                "funny": { "type": "string", "description": "Comment suggestion for 'Funny' reaction." }
              },
              "required": ["like", "celebrate", "support", "love", "insightful", "funny"]
            }
          },
          "required": ["comments"]
        }
        ```
    *   *Length Adjustment Schema Proposal:*
        ```json
        {
          "type": "object",
          "properties": {
            "regeneratedComment": {
              "type": "string",
              "description": "The regenerated comment with adjusted length."
            }
          },
          "required": ["regeneratedComment"]
        }
        ```
