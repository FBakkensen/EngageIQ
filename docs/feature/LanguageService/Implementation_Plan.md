# Implementation Plan: Dedicated Language Detection Service

**Version:** 1.0
**Date:** 2025-04-05
**Related PRD:** [LanguageService_PRD.md](./LanguageService_PRD.md)

This plan outlines the steps to implement the dedicated language detection service as specified in the PRD.

## Phase 1: Language Detection Service Implementation (`language-service.js`)

**Goal:** Create the core service responsible for detecting language via the Gemini API.

1.  **Setup File Structure**
    *   **Step 1.1:** Create the new file `js/services/language-service.js`.
        *   **Action:** Create the file.
        *   **Verification:** The file `d:\repos\EngageIQ\js\services\language-service.js` exists in the project structure.

2.  **Implement `detectLanguage` Function**
    *   **Step 2.1:** Add necessary imports.
        *   **Action:** Add `import { callGeminiAPI } from './api-service.js';` at the top of `language-service.js`.
        *   **Verification:** Code review confirms the import statement is present and correct.
    *   **Step 2.2:** Define the function signature.
        *   **Action:** Define `export async function detectLanguage(postText) { ... }`.
        *   **Verification:** Code review confirms the function is defined, exported, and accepts `postText`.
    *   **Step 2.3:** Implement input validation.
        *   **Action:** Add checks at the beginning of the function to ensure `postText` is a non-empty string. If invalid, log a warning and return the default language code ('en').
        *   **Verification:** Code review confirms validation logic. Test by calling `detectLanguage('')` and `detectLanguage(null)` - check console for warnings and confirm 'en' is returned.
    *   **Step 2.4:** Construct the language detection prompt.
        *   **Action:** Create a constant string containing the prompt text as specified in the PRD (Section 5.2), interpolating the `postText`.
        *   **Verification:** Code review confirms the prompt text matches the PRD specification.
    *   **Step 2.5:** Prepare the API request payload.
        *   **Action:** Create a `payload` object containing `contents: [{ parts: [{ text: prompt }] }]`. Include standard safety settings if required by `callGeminiAPI` or best practice.
        *   **Verification:** Code review confirms the payload structure is correct for a simple text request to the Gemini API.
    *   **Step 2.6:** Implement the API call within a `try...catch` block.
        *   **Action:** Call `await callGeminiAPI(payload, 'Language Detection')` inside a `try` block.
        *   **Verification:** Code review confirms the API call uses the correct payload and includes a descriptive operation name.
    *   **Step 2.7:** Parse and extract the text response.
        *   **Action:** Inside the `try` block after a successful API call, extract the language code from `response.candidates[0].content.parts[0].text`. Handle potential cases where this path doesn't exist.
        *   **Verification:** Code review confirms the response parsing logic. Add temporary `console.log` of the raw response and extracted text during testing.
    *   **Step 2.8:** Validate and clean the extracted language code.
        *   **Action:** Trim whitespace from the extracted code. Use a regex (e.g., `/^[a-z]{2}$/`) to validate it's a two-letter lowercase code. If valid, return the code.
        *   **Verification:** Code review confirms trimming and validation logic. Test with sample valid ('en') and invalid ('English', 'e', 'EN', ' e n ') API responses (can be mocked or logged from real calls).
    *   **Step 2.9:** Implement error handling and default return.
        *   **Action:** In the `catch` block for the API call, and after failed validation (Step 2.8), log the error clearly. Return the default language code ('en').
        *   **Verification:** Code review confirms error logging and default return path. Simulate API errors or invalid responses to test the `catch` block and default return.

## Phase 2: Integration with Background Script (`background.js`)

**Goal:** Call the new service during post processing and store the result.

1.  **Import Service**
    *   **Step 1.1:** Add the import statement.
        *   **Action:** Add `import { detectLanguage } from './services/language-service.js';` to `js/background.js`.
        *   **Verification:** Code review confirms the import.
2.  **Call `detectLanguage`**
    *   **Step 2.1:** Identify the correct handler function.
        *   **Action:** Locate the primary function that handles the initial processing of post content (likely `handleAnalyzeDirections` based on PRD analysis, confirm this).
        *   **Verification:** Code review confirms the identified handler is the one receiving raw `postContent`.
    *   **Step 2.2:** Call the detection function.
        *   **Action:** Inside the identified handler (e.g., `handleAnalyzeDirections`), before calling other services that need the language, add `const languageCode = await detectLanguage(message.postContent.text);` (adjust `message.postContent.text` based on the actual message structure).
        *   **Verification:** Add `console.log('Detected language:', languageCode);` immediately after the call. Trigger the extension flow and check the background script console for the expected language code or 'en' on error.

## Phase 3: Pass Language Code to Downstream Services

**Goal:** Ensure the detected `languageCode` is available where needed for prompt generation.

1.  **Update `background.js` Handlers**
    *   **Step 1.1:** Modify `handleGenerateDirectionComments` signature and call.
        *   **Action:** If `handleAnalyzeDirections` and `handleGenerateDirectionComments` are separate message handlers, ensure the `languageCode` detected in the first is passed along, potentially by adding it to the response of `handleAnalyzeDirections` and including it in the `'GENERATE_DIRECTION_COMMENTS'` message payload sent from the content script. Alternatively, if the flow is internal within `background.js`, pass `languageCode` as an argument when calling the relevant function (e.g., `generateDirectionComments` service function).
        *   **Verification:** Code review confirms `languageCode` is correctly passed. Add `console.log` inside `handleGenerateDirectionComments` (or the called service function) to verify it receives the code.
    *   **Step 1.2:** Modify `handleRegenerateComment` signature and call.
        *   **Action:** This handler likely *doesn't* need the *detected* language initially, as it regenerates based on existing text. However, the *service* it calls (`regenerateCommentService`) will need the language code. Determine how `handleRegenerateComment` gets the *original* comment's language. This might require adding `languageCode` to the `'REGENERATE_COMMENT'` message payload sent from the content script, assuming the content script knows the language of the comment it's asking to regenerate.
        *   **Verification:** Requires analyzing the content script logic. For now, focus on ensuring the service function called by `handleRegenerateComment` *can* accept a language code.

## Phase 4: Update Comment Generation Service (`smart-suggestions-api.js`)

**Goal:** Use the explicit `languageCode` in comment generation prompts.

1.  **Modify Service Functions**
    *   **Step 1.1:** Update `generateDirectionComments` signature.
        *   **Action:** Change `async function generateDirectionComments(direction, postContent)` to `async function generateDirectionComments(direction, postContent, languageCode)`.
        *   **Verification:** Code review confirms the signature change.
    *   **Step 1.2:** Update `createPromptText` signature.
        *   **Action:** Change `function createPromptText(directionTitle, processedText)` to `function createPromptText(directionTitle, processedText, languageCode)`.
        *   **Verification:** Code review confirms the signature change.
    *   **Step 1.3:** Pass `languageCode` down.
        *   **Action:** Update the call inside `generateDirectionComments` to `createPromptText(direction.title, processedText, languageCode)`.
        *   **Verification:** Code review confirms the argument is passed.
2.  **Update Prompt Logic**
    *   **Step 2.1:** Modify `createPromptText` implementation.
        *   **Action:** Remove the old implicit language instruction. Add the new explicit instruction using the `languageCode` parameter as detailed in PRD Section 5.4.
        *   **Verification:** Code review confirms the prompt text is updated correctly. Add `console.log` of the final prompt text before the API call to verify the language instruction and code are present.

## Phase 5: Update Comment Regeneration Service (`regeneration-service.js` or similar)

**Goal:** Use the explicit `languageCode` in comment regeneration prompts.

1.  **Identify Service File**
    *   **Step 1.1:** Confirm the file containing the core regeneration logic called by `background.js` (e.g., `regenerateCommentService`). Assume `js/services/regeneration-service.js` for now.
        *   **Action:** Check imports in `background.js`.
        *   **Verification:** Locate the definition of the imported regeneration function.
2.  **Modify Service Functions**
    *   **Step 2.1:** Update regeneration service function signature.
        *   **Action:** Change the signature (e.g., `async function regenerateComment(originalText, reactionType, makeLonger)`) to include `languageCode` (e.g., `async function regenerateComment(originalText, reactionType, makeLonger, languageCode)`).
        *   **Verification:** Code review confirms signature change.
    *   **Step 2.2:** Update `createCommentRegenerationPrompt` signature.
        *   **Action:** Locate this function (likely in `comment-generation.js` or `regeneration-service.js`). Change its signature to accept `languageCode`.
        *   **Verification:** Code review confirms signature change.
    *   **Step 2.3:** Pass `languageCode` down.
        *   **Action:** Ensure the `languageCode` received by the main regeneration service function is passed when calling `createCommentRegenerationPrompt`.
        *   **Verification:** Code review confirms the argument is passed.
3.  **Update Prompt Logic**
    *   **Step 3.1:** Modify `createCommentRegenerationPrompt` implementation.
        *   **Action:** Remove the old implicit language instruction. Add the new explicit instruction using the `languageCode` parameter as detailed in PRD Section 5.5.
        *   **Verification:** Code review confirms the prompt text is updated correctly. Add `console.log` of the final prompt text before the API call.

## Phase 6: Testing and Verification

**Goal:** Ensure the feature works correctly across different scenarios.

1.  **Core Functionality Testing**
    *   **Step 1.1:** Test with English post.
        *   **Action:** Use the extension on a standard English LinkedIn post.
        *   **Verification:** Verify console logs show `languageCode: 'en'` (or similar). Verify generated suggestions are in English.
    *   **Step 1.2:** Test with non-English post (e.g., Danish).
        *   **Action:** Use the extension on a Danish LinkedIn post.
        *   **Verification:** Verify console logs show `languageCode: 'da'`. Verify generated suggestions (text and titles) are in Danish.
    *   **Step 1.3:** Test with another non-English post (e.g., Spanish).
        *   **Action:** Use the extension on a Spanish LinkedIn post.
        *   **Verification:** Verify console logs show `languageCode: 'es'`. Verify generated suggestions are in Spanish.
2.  **Regeneration Testing**
    *   **Step 2.1:** Regenerate English comment.
        *   **Action:** Generate suggestions for an English post, then use the regenerate (longer/shorter) feature.
        *   **Verification:** Verify the regenerated comment is still in English.
    *   **Step 2.2:** Regenerate non-English comment.
        *   **Action:** Generate suggestions for a non-English post, then use the regenerate feature.
        *   **Verification:** Verify the regenerated comment is still in the correct non-English language.
3.  **Error Handling Testing**
    *   **Step 3.1:** Test with very short/empty post text.
        *   **Action:** Attempt to generate comments for a post with minimal or no text content.
        *   **Verification:** Verify `language-service.js` returns the default ('en'). Verify suggestions are generated in English (or fail gracefully depending on other logic).
    *   **Step 3.2:** Simulate API error during detection.
        *   **Action:** Temporarily modify `language-service.js` to throw an error or return an invalid response before the final return.
        *   **Verification:** Verify the error is caught, logged, and the default language ('en') is used for subsequent generation. Verify suggestions are generated in English.

