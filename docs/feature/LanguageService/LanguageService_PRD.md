# PRD: Dedicated Language Detection Service

**Version:** 1.0
**Date:** 2025-04-05
**Author:** Cascade / EngageIQ Team

## 1. Introduction

This document outlines the requirements for implementing a dedicated language detection service within the EngageIQ Chrome Extension. The goal is to improve the consistency and accuracy of the language used in generated comment suggestions, ensuring they match the language of the original LinkedIn post being commented on.

## 2. Problem Statement

Currently, the language of generated comments can be inconsistent. While prompts attempt to instruct the AI (Gemini) to match the source language, the detection and adherence seem unreliable when combined with the generation task in a single API call. Users experience comments generated in a language different from the original post, reducing the feature's usability and quality.

## 3. Goals

*   Ensure generated comment suggestions reliably match the language of the original LinkedIn post text.
*   Improve the user experience by providing contextually appropriate comments.
*   Implement a robust and maintainable solution for language detection.

## 4. Proposed Solution: Two-Step Detection & Generation

Implement a dedicated language detection step using a separate, initial API call to Gemini before generating comment suggestions or regenerating existing ones.

1.  **Detect Language:** When processing a LinkedIn post, make a specific API call to Gemini with the post text, solely asking for the language identification (ISO 639-1 code).
2.  **Store Language:** Temporarily store the detected language code.
3.  **Generate/Regenerate with Context:** In subsequent API calls for comment generation or regeneration, include the detected language code explicitly in the prompt, instructing Gemini to use that specific language.

## 5. Detailed Requirements

### 5.1. New Service: `language-service.js`

*   Create a new file: `js/services/language-service.js`.
*   This service will encapsulate the language detection logic.
*   It should import `callGeminiAPI` from `js/services/api-service.js`.

### 5.2. Function: `detectLanguage(postText)`

*   Implement and export `async function detectLanguage(postText)` within `language-service.js`.
*   **Input:** `postText` (string): The text content of the LinkedIn post.
*   **Functionality:**
    *   Perform basic input validation (check if `postText` is a non-empty string).
    *   Construct a specific prompt for Gemini asking *only* for the ISO 639-1 language code of the input text.
        *   *Example Prompt:* `Identify the predominant language of the following text and return only its two-letter ISO 639-1 code (e.g., 'en' for English, 'da' for Danish, 'es' for Spanish). Do not include any other text, explanations, or formatting. Just return the code.

Text:
"${postText}"`
    *   Prepare the minimal API request payload (contents, potentially safety settings).
    *   Call `callGeminiAPI` with the detection prompt and payload.
    *   Parse the text response from Gemini.
    *   Validate the response (e.g., trim whitespace, check if it's a 2-letter lowercase string `^[a-z]{2}$`).
*   **Output:**
    *   On success: Return the validated 2-letter ISO 639-1 language code (string, e.g., "en", "da").
    *   On failure (API error, invalid response, validation failure):
        *   Log the error clearly.
        *   Return a default language code (e.g., "en"). *Decision: Default to 'en' for now.*
*   **Error Handling:** Implement `try...catch` blocks for API calls and parsing.

### 5.3. Integration with Background Script (`background.js`)

*   Import `detectLanguage` into `background.js`.
*   Identify the point where the initial processing of LinkedIn post content occurs (likely related to the `'ANALYZE_DIRECTIONS'` or a similar initial message type).
*   In that handler:
    *   Call `await detectLanguage(postContent.text)` to get the language code.
    *   Store this `languageCode` variable.
*   Modify the subsequent message handling logic (e.g., for `'GENERATE_DIRECTION_COMMENTS'`, `'REGENERATE_COMMENT'`) to include this `languageCode`. This might involve:
    *   Passing `languageCode` in function calls within `background.js`.
    *   Potentially adding `languageCode` to the payload of messages sent between background/content scripts or internal function calls if state isn't maintained within a single handler flow. *TBD based on implementation details.*

### 5.4. Update Comment Generation (`smart-suggestions-api.js`)

*   Modify the `generateDirectionComments` function:
    *   Accept `languageCode` as a new parameter.
*   Modify the `createPromptText` helper function:
    *   Accept `languageCode` as a new parameter.
    *   Remove the implicit language detection instruction.
    *   Add an explicit instruction using the provided code. *Example:* `Generate the response (including comment text and titles) strictly in the language specified by this code: ${languageCode}. Original post content for context: ...`

### 5.5. Update Comment Regeneration (`comment-generation.js` / `regeneration-service.js`)

*   *(Dependency: Check where `regenerateCommentService` is defined - likely `regeneration-service.js` based on `background.js` imports)*
*   Modify the primary regeneration function (e.g., `regenerateCommentService` or `regenerateCommentWithLength` if called directly):
    *   Accept `languageCode` as a new parameter.
*   Modify the `createCommentRegenerationPrompt` function:
    *   Accept `languageCode` as a new parameter.
    *   Remove the implicit "same language" instruction.
    *   Add an explicit instruction using the provided code. *Example:* `Regenerate this comment strictly in the language specified by this code: ${languageCode}. Original comment: ...`

### 5.6 Message Passing (If Required)

*   If the detected `languageCode` needs to be passed between message handlers (e.g., from direction analysis to comment generation), update the relevant `chrome.runtime.sendMessage` calls and `onMessage` listeners to include `languageCode` in the message payload.

## 6. Success Criteria

*   Generated comment suggestions consistently appear in the same language as the original LinkedIn post text provided for analysis.
*   Regenerated comments consistently appear in the same language as the original comment being regenerated (which should match the original post).
*   The system gracefully handles errors during language detection by defaulting to English ('en').

## 7. Out of Scope

*   Client-side language detection libraries (e.g., `franc`).
*   Browser-native language detection APIs.
*   User interface elements for manually selecting or overriding the language.
*   Support for languages not identifiable by the Gemini API.

## 8. Technical Considerations & Open Questions

*   **Latency:** Introduces an additional API call, increasing the time to first suggestion. Monitor impact.
*   **API Cost:** Doubles the number of API calls per comment generation cycle.
*   **Gemini Reliability:** Assess the reliability of Gemini for the single task of language code detection.
*   **Default Language:** Confirm 'en' is the appropriate default.
*   **Error Propagation:** How should language detection failures be communicated to the user, if at all? (Current plan: silent default to 'en').

## 9. Future Considerations

*   Caching detected language per post URL/ID to avoid re-detection on subsequent actions within the same post.
*   Allowing user override if detection is incorrect.
