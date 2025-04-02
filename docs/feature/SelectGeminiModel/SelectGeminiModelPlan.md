# Implementation Plan: Gemini Model Selection Feature

**Document Version:** 1.0
**Date:** 2025-04-02
**Status:** Draft

## Phase 1: Options Page Updates

### Step 1.1: Update Options Page HTML
- **Goal:** Add model selection dropdown to the options page

- **Sub-step 1.1.1:** Create a new form group in `html/options.html` for model selection after the API key input
  - *Verification:* HTML element with id "geminiModel" exists in options.html

- **Sub-step 1.1.2:** Add dropdown options for all four specified Gemini models
  - *Verification:* Four option elements exist with correct values and descriptions

- **Sub-step 1.1.3:** Add descriptive text below the dropdown
  - *Verification:* Form-text element exists with appropriate guidance

- **Sub-step 1.1.4:** Add a rate limit information table
  - *Verification:* Table exists with four rows (one per model) showing QPM and QPD limits

### Step 1.2: Update Options Page JavaScript
- **Goal:** Enable saving and loading of model preference

- **Sub-step 1.2.1:** Add DOM reference for the model selection dropdown in `js/options.js`
  - *Verification:* Code contains `const geminiModelSelect = document.getElementById('geminiModel');`

- **Sub-step 1.2.2:** Update the storage retrieval to load model preference
  - *Verification:* `chrome.storage.sync.get()` call includes 'geminiModel' in the array of keys

- **Sub-step 1.2.3:** Add code to set the dropdown value based on stored preference
  - *Verification:* Code sets `geminiModelSelect.value` if result.geminiModel exists

- **Sub-step 1.2.4:** Update form submission handler to save model preference
  - *Verification:* `chrome.storage.sync.set()` call includes geminiModel in the object being saved

- **Sub-step 1.2.5:** Test saving and loading of model preference
  - *Verification:* Select a model, save settings, reload page, and verify the correct model is selected

## Phase 2: Background Script Updates

### Step 2.1: Modify Model Selection Logic
- **Goal:** Replace hardcoded model with dynamic selection from storage

- **Sub-step 2.1.1:** Replace the hardcoded `GEMINI_MODEL` constant with a variable in `js/background.js`
  - *Verification:* `const GEMINI_MODEL = 'gemini-2.0-flash';` is removed or commented out

- **Sub-step 2.1.2:** Add a function to get the current model from storage with default fallback
  - *Verification:* New function exists that retrieves model from storage and returns default if not found

- **Sub-step 2.1.3:** Update API URL construction to use the dynamic model
  - *Verification:* API endpoint URL uses the retrieved model instead of hardcoded value

### Step 2.2: Update API Request Functions
- **Goal:** Ensure all API calls use the selected model

- **Sub-step 2.2.1:** Update initial comment generation function to use dynamic model
  - *Verification:* Function retrieves model preference before constructing API URL

- **Sub-step 2.2.2:** Update regeneration functions to use dynamic model
  - *Verification:* Regeneration functions retrieve model preference before API calls

- **Sub-step 2.2.3:** Add appropriate error handling for invalid models
  - *Verification:* Code includes validation and fallback to default model if invalid

## Phase 3: Popup UI Updates

### Step 3.1: Add Model Indicator to Popup
- **Goal:** Display currently used model in the popup UI

- **Sub-step 3.1.1:** Add a container element for the model indicator in `html/popup.html`
  - *Verification:* HTML element with appropriate id exists at the bottom of the popup

- **Sub-step 3.1.2:** Add styling for the model indicator in `css/popup.css`
  - *Verification:* CSS rules exist for styling the model indicator (small, subtle)

- **Sub-step 3.1.3:** Update popup JavaScript to display the current model
  - *Verification:* Code in `js/popup.js` retrieves and displays the current model name

### Step 3.2: Message Passing for Model Information
- **Goal:** Pass model information from background to popup

- **Sub-step 3.2.1:** Update message passing to include model information
  - *Verification:* Messages from background script include the current model name

- **Sub-step 3.2.2:** Update popup message handler to extract and display model info
  - *Verification:* Popup code extracts model info from messages and updates the UI

## Phase 4: Testing and Validation

### Step 4.1: Component Testing
- **Goal:** Verify each component works correctly

- **Sub-step 4.1.1:** Test options page saves and loads model preference
  - *Verification:* Select different models, save, reload, and verify selection persists

- **Sub-step 4.1.2:** Test background script uses the selected model
  - *Verification:* Check console logs to confirm correct model is being used in API calls

- **Sub-step 4.1.3:** Test popup UI displays the correct model
  - *Verification:* Visual confirmation that model indicator shows the selected model

### Step 4.2: Integration Testing
- **Goal:** Verify all components work together correctly

- **Sub-step 4.2.1:** Test end-to-end flow with different models
  - *Verification:* Change model, generate comments, verify correct model is used and displayed

- **Sub-step 4.2.2:** Test error handling with invalid model
  - *Verification:* Manually set an invalid model in storage, verify system falls back to default

- **Sub-step 4.2.3:** Test backward compatibility
  - *Verification:* Clear model preference but keep API key, verify system uses default model

## Phase 5: Documentation and Finalization

### Step 5.1: Update Documentation
- **Goal:** Document the new feature for users and developers

- **Sub-step 5.1.1:** Update README.md with information about model selection
  - *Verification:* README includes section on model selection feature

- **Sub-step 5.1.2:** Add inline code comments explaining model selection logic
  - *Verification:* Code has clear comments explaining how model selection works

### Step 5.2: Final Review and Cleanup
- **Goal:** Ensure code quality and readiness for release

- **Sub-step 5.2.1:** Run linting and formatting tools
  - *Verification:* No linting errors or warnings related to new code

- **Sub-step 5.2.2:** Review all changes for consistency and completeness
  - *Verification:* All required changes are implemented according to specification

- **Sub-step 5.2.3:** Test on different Chrome versions
  - *Verification:* Feature works correctly on latest stable Chrome version