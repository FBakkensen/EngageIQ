# OpenAI Integration Implementation Plan

**Date:** May 6, 2025  
**Status:** In Progress  
**Related:** [OpenAI Integration PRD](openai_integration_prd.md)

## How to Use This Document

1. Complete steps in sequence (dependencies are noted in each step)
2. Use the provided LLM prompt for AI assistance with implementation
3. Verify the implementation using the verification steps
4. Mark steps as complete by replacing `[ ]` with `[x]` in the checkbox
5. Document any issues or notes in the comments section of each step

## Phase 1: Core Infrastructure

### Step 1.1: Create Basic OpenAI Model Module

- **Status:** [x] Complete
- **Dependencies:** None
- **Files:** Create `js/models/openai-model.js`

#### Task Description
Create the basic OpenAI model module with constants, model definitions, and utility functions similar to the existing `gemini-model.js`.  

#### LLM Prompt
```
Create a new file called 'openai-model.js' for the EngageIQ Chrome extension. This file should be similar to the existing 'gemini-model.js' but adapted for OpenAI API. 

The file should include:
1. Constants for OpenAI API base URL (default: 'https://api.openai.com/v1')
2. A default model constant (e.g., DEFAULT_OPENAI_MODEL = 'gpt-3.5-turbo')
3. Schema definitions for structured outputs (using the same format as in gemini-model.js)
4. Functions to get valid models, validate models, and get model specifications
5. A function to construct the API endpoint URL based on configuration

Ensure it follows the same structure as gemini-model.js but with appropriate modifications for OpenAI's API. Include proper JSDoc comments.
```

#### Verification
- File exists at `js/models/openai-model.js`
- Constants are properly defined (BASE_URL, DEFAULT_MODEL)
- All schemas match the corresponding ones in `gemini-model.js` but adapted for OpenAI
- Functions have proper JSDoc comments
- No JavaScript errors when loaded

#### Comments

---

### Step 1.2: Add Storage Utilities for OpenAI Configuration

- **Status:** [x] Complete
- **Dependencies:** None
- **Files:** Modify `js/utils/storage-utils.js`

#### Task Description
Add functions to the storage utilities to save and retrieve OpenAI API configuration including provider type, endpoint URL, API key, and model preference.

#### LLM Prompt
```
Update the storage-utils.js file in the EngageIQ Chrome extension to add support for storing and retrieving OpenAI API configuration.

Add the following functions:
1. getApiProvider() - Returns 'gemini' or 'openai' (default to 'gemini' for backward compatibility)
2. setApiProvider(provider) - Sets the API provider preference
3. getOpenAIApiKey() - Gets the OpenAI API key
4. setOpenAIApiKey(apiKey) - Sets the OpenAI API key
5. getOpenAIEndpoint() - Gets the OpenAI endpoint URL (default to 'https://api.openai.com/v1')
6. setOpenAIEndpoint(endpoint) - Sets the OpenAI endpoint URL
7. getCurrentOpenAIModel() - Gets the preferred OpenAI model
8. setPreferredOpenAIModel(modelName) - Sets the preferred OpenAI model

Ensure these functions use Chrome's storage API similar to the existing Gemini-related functions.
```

#### Verification
- All functions are implemented in `storage-utils.js`
- Functions properly save to and retrieve from Chrome storage
- Default values are provided for backward compatibility
- No JavaScript errors when function calls are made

#### Comments

---

### Step 1.3: Create API Provider Abstraction Layer

- **Status:** [ ] Complete
- **Dependencies:** Step 1.1, Step 1.2
- **Files:** Create `js/services/api-provider.js`

#### Task Description
Create a new abstraction layer that will select the appropriate API client based on user configuration and handle request/response transformations.

#### LLM Prompt
```
Create a new file called 'api-provider.js' for the EngageIQ Chrome extension. This file will serve as an abstraction layer between the application and different API providers (Gemini and OpenAI).

Implement the following functionality:
1. A function to determine the current API provider based on storage settings
2. Functions to transform requests between formats required by different providers
3. Functions to normalize responses from different providers into a consistent format
4. Helper functions to map error types between providers

The module should export a high-level function that takes a generic request object and provider-agnostic options, then routes it to the appropriate API client.

Include proper JSDoc comments and error handling.
```

#### Verification
- File exists at `js/services/api-provider.js`
- Provider detection function works correctly
- Request transformation functions handle all required fields
- Response normalization properly extracts all needed data
- Error handling is consistent across providers
- File can be imported without errors

#### Comments

---

## Phase 2: OpenAI API Implementation

### Step 2.1: Implement OpenAI API Client Function

- **Status:** [ ] Complete
- **Dependencies:** Step 1.1, Step 1.2, Step 1.3
- **Files:** Modify `js/services/api-service.js`

#### Task Description
Implement the `callOpenAIAPI` function in the API service module to make requests to OpenAI-compatible endpoints with proper error handling and retry logic.

#### LLM Prompt
```
Add a new function called 'callOpenAIAPI' to the api-service.js file in the EngageIQ Chrome extension. This function should be similar to the existing 'callGeminiAPI' but adapted for OpenAI API.

The function should:
1. Accept parameters for request body and operation name
2. Retrieve the OpenAI API key and endpoint from storage
3. Handle retry logic (similar to callGeminiAPI)
4. Implement proper error handling for OpenAI-specific error responses
5. Include timeout handling similar to the Gemini implementation
6. Return the response in a normalized format

Ensure the function is properly exported from the module.

Also add a uniform error type mapping to standardize error types between Gemini and OpenAI.
```

#### Verification
- Function is properly implemented in `api-service.js`
- Function correctly retrieves API key and endpoint
- Retry logic works as expected
- Error handling works for common OpenAI error types
- Function is properly exported
- No JavaScript errors when testing basic API calls

#### Comments

---

### Step 2.2: Update Service Functions to Use Provider Abstraction

- **Status:** [ ] Complete
- **Dependencies:** Step 2.1
- **Files:** Modify `js/services/api-service.js`

#### Task Description
Update the existing API service functions (generateComments, regenerateComment, etc.) to use the provider abstraction layer instead of directly calling `callGeminiAPI`.

#### LLM Prompt
```
Update the service functions in api-service.js for the EngageIQ Chrome extension to use the new provider abstraction layer. 

For each of these functions:
1. generateComments
2. regenerateComment
3. analyzeDirections
4. generateDirectionComments

Modify them to:
1. Determine the current API provider
2. Use the provider abstraction layer to format requests properly
3. Call the appropriate API client (callGeminiAPI or callOpenAIAPI)
4. Handle responses consistently across providers

Preserve all existing functionality while making these changes, ensuring backward compatibility with Gemini API.
```

#### Verification
- All functions are updated to use the provider abstraction
- Functions maintain their existing signatures for backward compatibility
- All functions work correctly with both Gemini and OpenAI providers
- Error handling is consistent across providers
- No regressions in existing functionality

#### Comments

---

### Step 2.3: Implement Request Format Adapters

- **Status:** [ ] Complete
- **Dependencies:** Step 1.3
- **Files:** Modify `js/services/api-provider.js`

#### Task Description
Implement adapter functions that convert EngageIQ's internal request formats to the specific formats required by OpenAI's API, particularly for the chat completion endpoint.

#### LLM Prompt
```
Implement request format adapter functions in the api-provider.js file for the EngageIQ Chrome extension. These adapters should convert internal request formats to OpenAI-specific formats.

Create the following adapter functions:
1. adaptCommentGenerationRequest - Converts a comment generation request to OpenAI format
2. adaptRegenerationRequest - Converts a regeneration request to OpenAI format
3. adaptDirectionAnalysisRequest - Converts a direction analysis request to OpenAI format
4. adaptDirectionCommentsRequest - Converts a direction-based comment generation request to OpenAI format

Each function should transform the internal request structure to OpenAI's expected format, particularly for the chat completion endpoint which uses the 'messages' array with 'role' and 'content' fields.

Ensure proper handling of function calling for structured outputs by converting our schema objects to OpenAI's function definitions.
```

#### Verification
- All adapter functions are implemented
- Functions correctly transform internal formats to OpenAI formats
- Structured output schemas are properly converted to OpenAI function definitions
- System prompts and user messages are correctly formatted
- All required parameters (temperature, functions, etc.) are included
- No JavaScript errors when transforming requests

#### Comments

---

### Step 2.4: Implement Response Parsing Adapters

- **Status:** [ ] Complete
- **Dependencies:** Step 1.3
- **Files:** Modify `js/services/api-provider.js`

#### Task Description
Implement adapter functions that parse responses from OpenAI's API into EngageIQ's internal formats used by the rest of the application.

#### LLM Prompt
```
Implement response parsing adapter functions in the api-provider.js file for the EngageIQ Chrome extension. These adapters should convert OpenAI API responses to EngageIQ's internal formats.

Create the following adapter functions:
1. parseOpenAIGenerationResponse - Parses a response from comment generation
2. parseOpenAIRegenerationResponse - Parses a response from comment regeneration
3. parseOpenAIDirectionAnalysisResponse - Parses a response from direction analysis
4. parseOpenAIDirectionCommentsResponse - Parses a response from direction-based comment generation

Each function should handle both regular text responses and function call responses from OpenAI's API. For function call responses, extract the function arguments and map them to our internal structure.

Ensure proper error handling for various response formats and validation of required fields.
```

#### Verification
- All parsing functions are implemented
- Functions correctly extract content from OpenAI responses
- Function call responses are properly parsed and arguments extracted
- Validation is performed to ensure required fields are present
- Error handling works for malformed responses
- No JavaScript errors when parsing sample responses

#### Comments

---

## Phase 3: UI Updates

### Step 3.1: Update Options Page HTML

- **Status:** [ ] Complete
- **Dependencies:** None
- **Files:** Modify `html/options.html`

#### Task Description
Update the options page HTML to include UI elements for API provider selection and OpenAI-specific configuration.

#### LLM Prompt
```
Update the options.html file for the EngageIQ Chrome extension to add UI elements for OpenAI API configuration.

Add the following UI elements:
1. A radio button or dropdown to select the API provider (Gemini or OpenAI)
2. An input field for the OpenAI API key (with appropriate masking)
3. An input field for the OpenAI endpoint URL (with default value and placeholder)
4. A dropdown for selecting OpenAI models (gpt-3.5-turbo, gpt-4, etc.)
5. Help text explaining each option
6. A section title and description for the new OpenAI options

Keep the existing Gemini configuration section, and use similar Bootstrap styling to maintain consistency. Make sure all form elements have proper labels and IDs for JavaScript interaction.
```

#### Verification
- Options page has new UI elements for OpenAI configuration
- All elements have appropriate IDs for JavaScript interaction
- Bootstrap styling is consistent with existing UI
- Help text is provided for new options
- Layout is responsive and visually appealing
- HTML validation passes with no errors

#### Comments

---

### Step 3.2: Update Options Page JavaScript

- **Status:** [ ] Complete
- **Dependencies:** Step 1.2, Step 3.1
- **Files:** Modify `js/options.js`

#### Task Description
Update the options page JavaScript to handle saving and loading OpenAI configuration settings and toggling visibility of provider-specific fields.

#### LLM Prompt
```
Update the options.js file for the EngageIQ Chrome extension to handle the new OpenAI configuration UI elements.

Implement the following functionality:
1. When the page loads, retrieve and populate all OpenAI-related settings (provider selection, API key, endpoint, model)
2. Add event listeners for the provider selection to show/hide appropriate fields
3. Update the form submission handler to save all OpenAI-related settings
4. Add validation for the OpenAI endpoint URL
5. Implement any provider-specific logic (e.g., disabling irrelevant fields)

Ensure all settings are properly saved to Chrome storage using the functions from storage-utils.js.
```

#### Verification
- Settings are properly loaded when the page opens
- Provider selection toggles visibility of relevant fields
- All settings are saved correctly when the form is submitted
- URL validation works for the endpoint field
- Error handling shows appropriate messages for invalid inputs
- No JavaScript errors in the console

#### Comments

---

### Step 3.3: Update Model Indicator Component

- **Status:** [ ] Complete
- **Dependencies:** Step 1.2
- **Files:** Modify `js/ui/model-indicator.js`

#### Task Description
Update the model indicator component to display provider information alongside the model name and handle provider-specific formatting.

#### LLM Prompt
```
Update the model-indicator.js file for the EngageIQ Chrome extension to display provider information alongside the model name.

Modify the component to:
1. Retrieve the current API provider along with the model name
2. Update the display format to include provider information (e.g., "OpenAI: GPT-4" or "Gemini: 1.5 Pro")
3. Add provider-specific styling (optional: different colors for different providers)
4. For local models (when endpoint is localhost), add an indicator for local deployment
5. Update the storage change listener to respond to changes in both provider and model

Maintain backward compatibility with existing code.
```

#### Verification
- Model indicator shows both provider and model information
- Formatting is appropriate for each provider (OpenAI vs Gemini)
- Local models are indicated appropriately
- Component updates when either provider or model changes
- Component falls back gracefully if information is missing
- No visual glitches or layout issues

#### Comments

---

## Phase 4: LM Studio Integration

### Step 4.1: Implement Model Discovery for LM Studio

- **Status:** [ ] Complete
- **Dependencies:** Step 2.1
- **Files:** Modify `js/models/openai-model.js`

#### Task Description
Implement functionality to discover available models from LM Studio's `/v1/models` endpoint and populate the model selection dropdown.

#### LLM Prompt
```
Add model discovery functionality to the openai-model.js file in the EngageIQ Chrome extension. This will allow fetching available models from LM Studio's /v1/models endpoint.

Implement the following:
1. A function called 'discoverLocalModels' that fetches models from a specified endpoint (defaulting to 'http://localhost:1234/v1/models')
2. A function to transform the LM Studio model response into a format compatible with our application
3. Add caching for discovered models to avoid unnecessary API calls
4. Add error handling for connection issues
5. Export the new functions for use in the options page

Ensure this only runs when the user has selected a local endpoint configuration.
```

#### Verification
- Functions are properly implemented in `openai-model.js`
- Model discovery works with LM Studio running locally
- Response transformation correctly extracts model information
- Caching works as expected
- Error handling provides helpful messages for connection issues
- Functions are properly exported

#### Comments

---

### Step 4.2: Add Local Connection Status Monitoring

- **Status:** [ ] Complete
- **Dependencies:** Step 2.1
- **Files:** Create `js/utils/connection-monitor.js`

#### Task Description
Implement a utility to monitor the connection status to local LM Studio server and provide visual feedback when the connection is lost or regained.

#### LLM Prompt
```
Create a new file called 'connection-monitor.js' for the EngageIQ Chrome extension. This utility will monitor connection status to a local LM Studio server.

Implement the following functionality:
1. A function to check connection status by making a lightweight request to the server
2. Periodic monitoring with configurable interval
3. Event emitters for connection status changes (connected, disconnected, reconnected)
4. Methods to start and stop monitoring
5. Optional retry logic for reconnection attempts

Design this as a reusable utility that can be used by other components to react to connection status changes.
```

#### Verification
- File exists at `js/utils/connection-monitor.js`
- Connection checking works correctly for local endpoints
- Monitoring can be started and stopped
- Events are properly emitted on status changes
- Reconnection attempts work as expected
- No excessive resource usage from monitoring

#### Comments

---

### Step 4.3: Integrate Connection Status with UI

- **Status:** [ ] Complete
- **Dependencies:** Step 3.3, Step 4.2
- **Files:** Modify `js/ui/model-indicator.js`

#### Task Description
Integrate the connection monitor with the model indicator UI to provide visual feedback about local server connection status.

#### LLM Prompt
```
Update the model-indicator.js file to integrate with the connection-monitor.js utility and provide visual feedback about local server connection status.

Implement the following:
1. Initialize connection monitoring when a local endpoint is configured
2. Update the model indicator UI based on connection status events
3. Add visual indicators for connected, disconnected, and reconnecting states
4. Include tooltip or help text explaining connection issues
5. Stop monitoring when switching to a non-local endpoint

Ensure the UI updates are non-intrusive but clearly visible to users.
```

#### Verification
- Connection monitoring is initialized for local endpoints only
- UI updates correctly when connection status changes
- Visual indicators are clear and intuitive
- Help text provides useful information about connection issues
- Monitoring is properly stopped when not needed
- No visual glitches or layout issues

#### Comments

---

## Phase 5: Testing & Refinement

### Step 5.1: Create Test Suite for OpenAI Integration

- **Status:** [ ] Complete
- **Dependencies:** All implementation steps
- **Files:** Create `tests/openai-integration.test.js`

#### Task Description
Create a test suite to verify that all aspects of the OpenAI integration work correctly, including API calls, provider switching, and UI updates.

#### LLM Prompt
```
Create a comprehensive test suite for the OpenAI integration in the EngageIQ Chrome extension. The tests should verify that all components work correctly with both Gemini and OpenAI providers.

Include tests for:
1. API client functions (callOpenAIAPI)
2. Request and response adapters
3. Storage utility functions for OpenAI configuration
4. Provider abstraction layer
5. UI components (options page, model indicator)
6. Integration tests for end-to-end workflows

Mock API responses where appropriate and test error handling scenarios. Include tests for both cloud OpenAI and local LM Studio configurations.
```

#### Verification
- Test suite is comprehensive and covers all components
- Tests pass with both Gemini and OpenAI providers
- Error scenarios are properly tested
- Mocking is used appropriately to avoid actual API calls
- All UI components are tested
- End-to-end workflows validate complete functionality

#### Comments

---

### Step 5.2: Optimize Performance

- **Status:** [ ] Complete
- **Dependencies:** All implementation steps
- **Files:** Various files as needed

#### Task Description
Review and optimize the OpenAI integration for performance, focusing on reducing overhead, minimizing duplicate API calls, and improving response times.

#### LLM Prompt
```
Review and optimize the OpenAI integration in the EngageIQ Chrome extension for performance. Focus on the following areas:

1. Review all API calls for unnecessary requests or duplicates
2. Implement or improve caching where appropriate
3. Optimize request and response transformations to minimize overhead
4. Ensure proper cleanup of resources (e.g., connection monitoring)
5. Profile the code to identify potential bottlenecks
6. Review and optimize any loops or recursive functions

Make specific, targeted changes to improve performance while maintaining functionality and code readability.
```

#### Verification
- Performance profiling shows improvement after changes
- No duplicate API calls for the same operation
- Caching is effective and appropriate
- Resource usage is minimized
- All functionality still works correctly
- Code remains readable and maintainable

#### Comments

---

### Step 5.3: Create Troubleshooting Guide

- **Status:** [ ] Complete
- **Dependencies:** All implementation steps
- **Files:** Create `docs/openai_troubleshooting.md`

#### Task Description
Create a troubleshooting guide for common issues with the OpenAI integration, including API key problems, connection issues, and compatibility concerns.

#### LLM Prompt
```
Create a comprehensive troubleshooting guide for the OpenAI integration in the EngageIQ Chrome extension. The guide should help users resolve common issues they might encounter.

Include sections for:
1. API configuration issues (invalid API keys, endpoint URLs)
2. Local server connection problems (LM Studio)
3. Model compatibility issues
4. Rate limiting and quota errors
5. Common error messages and their meaning
6. Step-by-step resolution procedures for each issue
7. How to report bugs that aren't covered by the guide

Make the guide user-friendly with clear headings, examples, and screenshots where helpful.
```

#### Verification
- Guide covers all common issue categories
- Solutions are clear and actionable
- Error messages are accurately described
- Procedures are step-by-step and easy to follow
- Guide is well-formatted and readable
- Information is technically accurate

#### Comments

---

## Final Integration

### Step 6.1: Update Extension Manifest

- **Status:** [ ] Complete
- **Dependencies:** All implementation steps
- **Files:** Modify `manifest.json`

#### Task Description
Update the extension manifest to include any new permissions, host permissions, or content security policies required for the OpenAI integration.

#### LLM Prompt
```
Update the manifest.json file for the EngageIQ Chrome extension to include any new permissions or configurations needed for the OpenAI integration.

Make the following updates:
1. Add host permissions for OpenAI API (https://*.openai.com) and local servers (http://localhost:*)
2. Update content security policy if needed for connecting to these endpoints
3. Ensure web_accessible_resources includes any new JavaScript files
4. Increment the version number to reflect the new feature
5. Update the description to mention the new OpenAI capability

Make sure to maintain all existing permissions and configurations while adding only what's necessary for the new functionality.
```

#### Verification
- Manifest includes necessary host permissions
- Content security policy allows connections to required endpoints
- All new JavaScript files are included in web_accessible_resources
- Version number is incremented
- Description is updated
- Manifest validation passes with no errors

#### Comments

---

### Step 6.2: Final Testing and Documentation

- **Status:** [ ] Complete
- **Dependencies:** All implementation steps
- **Files:** Various files as needed

#### Task Description
Perform comprehensive testing of the entire OpenAI integration and update all relevant documentation to reflect the new functionality.

#### LLM Prompt
```
Perform comprehensive testing of the OpenAI integration in the EngageIQ Chrome extension and update all relevant documentation.

Testing tasks:
1. Test all features with both Gemini and OpenAI providers
2. Test with cloud OpenAI and local LM Studio configurations
3. Verify that all error scenarios are handled gracefully
4. Test performance with various models and configurations
5. Ensure backward compatibility for existing users

Documentation updates:
1. Update README.md to mention OpenAI integration
2. Add a section about API provider configuration to the user guide
3. Update developer documentation with new architecture details
4. Document any new settings or preferences
5. Include information about local model setup with LM Studio
```

#### Verification
- All features work with both providers
- All configurations (cloud, local) are tested
- Error handling works as expected
- Performance is acceptable across configurations
- All documentation is updated accurately
- User guide clearly explains new options
- Developer documentation reflects new architecture

#### Comments

---

## Implementation Checklist Overview

- [ ] 1.1: Create Basic OpenAI Model Module
- [ ] 1.2: Add Storage Utilities for OpenAI Configuration
- [ ] 1.3: Create API Provider Abstraction Layer
- [ ] 2.1: Implement OpenAI API Client Function
- [ ] 2.2: Update Service Functions to Use Provider Abstraction
- [ ] 2.3: Implement Request Format Adapters
- [ ] 2.4: Implement Response Parsing Adapters
- [ ] 3.1: Update Options Page HTML
- [ ] 3.2: Update Options Page JavaScript
- [ ] 3.3: Update Model Indicator Component
- [ ] 4.1: Implement Model Discovery for LM Studio
- [ ] 4.2: Add Local Connection Status Monitoring
- [ ] 4.3: Integrate Connection Status with UI
- [ ] 5.1: Create Test Suite for OpenAI Integration
- [ ] 5.2: Optimize Performance
- [ ] 5.3: Create Troubleshooting Guide
- [ ] 6.1: Update Extension Manifest
- [ ] 6.2: Final Testing and Documentation
