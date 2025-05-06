# OpenAI API Integration PRD for EngageIQ

**Date:** May 6, 2025  
**Version:** 1.0  
**Status:** Draft  

## 1. Executive Summary

This document outlines the product requirements for integrating OpenAI-compatible REST APIs into the EngageIQ Chrome extension. This enhancement will enable the extension to work with both cloud-based LLMs (via OpenAI) and local models (via LM Studio), in addition to the current Gemini API integration.

### 1.1 Problem Statement

Currently, EngageIQ exclusively relies on Google's Gemini API for AI-powered LinkedIn interactions. This dependency creates several limitations:

1. Users are restricted to Gemini's model offerings and pricing tiers
2. Local model deployment is not supported
3. No flexibility to leverage alternative AI providers or self-hosted models

### 1.2 Solution Overview

Add support for OpenAI-compatible REST APIs in EngageIQ, allowing users to:

1. Select their preferred AI provider (Gemini or OpenAI-compatible)
2. Configure cloud-based OpenAI endpoints
3. Connect to local models through LM Studio using its OpenAI-compatible API
4. Maintain all current EngageIQ functionality with either provider

## 2. Use Cases

### 2.1 Primary Use Cases

1. **Cloud Provider Flexibility**
   - User wants to use OpenAI's GPT models instead of Gemini
   - User can switch between providers based on performance, cost, or availability

2. **Local Model Usage**
   - User wants to run models locally for privacy or cost reasons
   - User can connect EngageIQ to LM Studio for offline access

3. **Custom Endpoint Configuration**
   - User wants to use a different OpenAI-compatible API endpoint
   - User can specify custom URLs and authentication

### 2.2 User Flows

1. **Setting Up OpenAI API**
   - User navigates to options page
   - Selects "OpenAI" as API provider
   - Enters API key and optionally changes endpoint URL
   - Selects preferred model
   - Saves settings

2. **Setting Up LM Studio**
   - User launches LM Studio locally
   - Loads preferred model in LM Studio
   - In EngageIQ options, selects "OpenAI Compatible" as provider
   - Enters local endpoint URL (e.g., `http://localhost:1234/v1`)
   - Optionally provides API key (typically "lm-studio")
   - Saves settings

3. **Switching Between Providers**
   - User can change provider in options at any time
   - Extension immediately begins using the new provider
   - All feature functionality remains the same

## 3. Functional Requirements

### 3.1 API Configuration

1. **Provider Selection**
   - Add option to select between "Gemini" and "OpenAI Compatible" providers
   - Store selection in extension settings

2. **Endpoint Configuration**
   - Field to enter custom endpoint URL
   - Default to `https://api.openai.com/v1` for OpenAI
   - Validate URL format

3. **Authentication**
   - Field to enter API key
   - Securely store using Chrome's Storage API
   - Handle authentication errors appropriately

4. **Model Selection**
   - Dynamic dropdown of available models based on selected provider
   - For OpenAI: Include standard models (gpt-3.5-turbo, gpt-4, etc.)
   - For LM Studio: Option to fetch available models from `/v1/models` endpoint

### 3.2 API Integration

1. **Request Formatting**
   - Create adapter for OpenAI's chat completion format:
   ```json
   {
     "model": "model-identifier",
     "messages": [
       {"role": "system", "content": "System prompt"},
       {"role": "user", "content": "User input"}
     ],
     "temperature": 0.7
   }
   ```

2. **Response Handling**
   - Parse OpenAI response format:
   ```json
   {
     "id": "chatcmpl-123",
     "object": "chat.completion",
     "created": 1677652288,
     "choices": [{
       "index": 0,
       "message": {
         "role": "assistant",
         "content": "Response content"
       },
       "finish_reason": "stop"
     }]
   }
   ```

3. **Function Calling**
   - Support structured output via OpenAI function calling
   - Map existing Gemini schemas to OpenAI function definitions

4. **Error Handling**
   - Standardize error responses between providers
   - Implement retry logic with appropriate backoff
   - Provide clear user feedback for API issues

### 3.3 UI/UX Enhancements

1. **Options Page Updates**
   - Add provider selection radio buttons/dropdown
   - Add fields for OpenAI endpoint configuration
   - Add model selection for OpenAI/LM Studio
   - Include help text explaining each option

2. **Model Indicator Updates**
   - Show current provider along with model name
   - Differentiate between cloud and local models visually
   - Include connection status indicator for local models

3. **Error Messaging**
   - Provide clear error messages for connection issues
   - Guide users through fixing common configuration problems

## 4. Technical Architecture

### 4.1 New Files

1. **`js/models/openai-model.js`**
   - Constants for OpenAI API
   - Model definitions and specifications
   - Request/response schemas

2. **`js/services/api-provider.js`**
   - API provider abstraction layer
   - Method to select appropriate API client
   - Unified response format

### 4.2 Modified Files

1. **`js/services/api-service.js`**
   - Add `callOpenAIAPI` function
   - Update existing functions to use provider abstraction

2. **`js/utils/storage-utils.js`**
   - Add methods to get/set API provider
   - Add methods to get/set OpenAI endpoint and key
   - Modify model selection to be provider-aware

3. **`js/options.js`**
   - Update UI to include provider selection
   - Handle provider-specific settings

4. **`js/ui/model-indicator.js`**
   - Update to display provider information
   - Add connection status for local models

### 4.3 Data Model

1. **Chrome Storage Keys**
   - `apiProvider`: "gemini" or "openai"
   - `openaiEndpoint`: URL string
   - `openaiApiKey`: API key string
   - `openaiModel`: Selected model name
   - `geminiModel`: (existing) Selected Gemini model

2. **Provider Configuration Object**
   ```javascript
   {
     type: "gemini" | "openai",
     endpoint: String,
     apiKey: String,
     model: String,
     temperature: Number
   }
   ```

### 4.4 API Abstraction

Create a unified API interface that:
1. Selects the appropriate API client based on configuration
2. Transforms requests to the correct format
3. Normalizes responses to a consistent format
4. Provides consistent error handling

## 5. Implementation Plan

### 5.1 Phase 1: Core Infrastructure

**Objective:** Create the foundation for multi-provider support

**Tasks:**
1. Create `openai-model.js` with core constants and schemas
2. Implement `api-provider.js` abstraction layer
3. Add provider selection to storage utilities
4. Update model storage and retrieval to be provider-aware

### 5.2 Phase 2: OpenAI API Implementation

**Objective:** Implement the OpenAI API client

**Tasks:**
1. Create `callOpenAIAPI` function in `api-service.js`
2. Implement request formatting adapters
3. Implement response parsing adapters
4. Add error handling specific to OpenAI responses

### 5.3 Phase 3: UI Updates

**Objective:** Update the user interface to support provider selection

**Tasks:**
1. Modify options page to include provider selection
2. Add OpenAI-specific configuration fields
3. Update model indicator to show provider information
4. Add validation and help text for configuration fields

### 5.4 Phase 4: LM Studio Integration

**Objective:** Add support for local models via LM Studio

**Tasks:**
1. Implement model discovery from LM Studio's `/v1/models` endpoint
2. Add connection status monitoring for local server
3. Handle offline/reconnection scenarios
4. Create validation logic for local endpoints

### 5.5 Phase 5: Testing & Refinement

**Objective:** Ensure reliability and performance across providers

**Tasks:**
1. Test all extension features with both providers
2. Optimize performance and error handling
3. Refine user experience based on testing feedback
4. Document common issues and troubleshooting steps

## 6. Success Criteria

1. Users can successfully switch between Gemini and OpenAI-compatible providers
2. All existing EngageIQ features work with either provider
3. Local model connections via LM Studio function reliably
4. Error messages are clear and actionable
5. Performance remains comparable between providers

## 7. Technical Considerations

### 7.1 API Differences

1. **Response Format Differences**
   - Gemini and OpenAI have different response structures
   - Function calling implementation varies between providers
   - Error reporting differs significantly

2. **Rate Limiting**
   - Different rate limit behaviors between providers
   - Local models may have different performance characteristics

3. **Authentication**
   - OpenAI uses Bearer token authentication
   - LM Studio typically uses a simple API key in the header

### 7.2 Performance Considerations

1. **Local Model Performance**
   - Local models may be slower depending on hardware
   - Connection latency will be lower for local models
   - Response streaming might behave differently

2. **API Overhead**
   - Additional abstraction layer may add minimal overhead
   - Provider switching should be immediate with no performance penalty

### 7.3 Security Considerations

1. **API Key Storage**
   - Continue using Chrome's secure storage for API keys
   - Consider adding option for session-only keys

2. **Local Connection Security**
   - Warn users about potential risks of connecting to unknown endpoints
   - Validate endpoint URLs for basic security issues

## 8. Future Enhancements

1. **Response Streaming**
   - Add support for streaming API responses for both providers
   - Implement progressive UI updates during streaming

2. **Multi-Model Pipelines**
   - Allow different features to use different providers/models
   - Example: Use local models for some features, cloud for others

3. **Additional Providers**
   - Extend architecture to support other OpenAI-compatible APIs
   - Support for Anthropic Claude API
   - Support for Mistral API

4. **Model Performance Metrics**
   - Track and display performance metrics by provider/model
   - Allow data-driven provider selection

## 9. Appendix

### 9.1 OpenAI API Reference

- [Chat Completions API](https://platform.openai.com/docs/api-reference/chat)
- [Models API](https://platform.openai.com/docs/api-reference/models)

### 9.2 LM Studio API Reference

- [OpenAI Compatibility API](https://lmstudio.ai/docs/app/api/endpoints/openai)
