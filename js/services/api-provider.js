/**
 * API Provider Abstraction Layer for EngageIQ
 * Handles routing, request/response normalization, and error mapping for Gemini and OpenAI providers.
 *
 * @module api-provider
 */

import { getApiProvider } from '../utils/storage-utils.js';
import { callGeminiAPI } from './api-service.js';
import { callOpenAIAPI } from './api-service.js';
import {
  DIRECTION_ANALYSIS_SCHEMA,
  DIRECTION_COMMENT_SCHEMA,
  REGENERATION_SCHEMA,
  UNIFIED_COMMENT_SCHEMA
} from '../models/openai-model.js';

/**
 * Enum for supported API providers.
 * @readonly
 * @enum {string}
 */
export const PROVIDERS = {
  GEMINI: 'gemini',
  OPENAI: 'openai',
};

/**
 * Determines the current API provider from storage settings.
 * Defaults to 'gemini' for backward compatibility.
 * @returns {Promise<'gemini'|'openai'>}
 */
export async function getCurrentApiProvider() {
  try {
    const provider = await getApiProvider();
    return provider === PROVIDERS.OPENAI ? PROVIDERS.OPENAI : PROVIDERS.GEMINI;
  } catch (err) {
    // Default to Gemini on error
    return PROVIDERS.GEMINI;
  }
}

/**
 * Transforms a generic request to the provider-specific format.
 * @param {object} request - The generic request object.
 * @param {string} provider - Target provider ('gemini' or 'openai').
 * @returns {object} Provider-specific request.
 */
export function transformRequest(request, provider) {
  console.log(`EngageIQ: [transformRequest] Transforming request for provider: ${provider}`, request.operation);
  
  switch (provider) {
    case PROVIDERS.OPENAI:
      // Transform request based on operation type
      switch (request.operation) {
        case 'generateComments':
          return adaptCommentGenerationRequest({
            prompt: request.payload.contents[0].parts[0].text,
            model: request.model,
            systemPrompt: 'You are a helpful assistant that generates engaging LinkedIn comments.',
            schema: UNIFIED_COMMENT_SCHEMA
          });
        case 'analyzePostDirections':
          return adaptDirectionAnalysisRequest({
            prompt: request.payload.contents[0].parts[0].text,
            model: request.model,
            systemPrompt: 'You are a helpful assistant that analyzes LinkedIn posts and suggests commenting approaches.',
            schema: DIRECTION_ANALYSIS_SCHEMA
          });
        case 'generateDirectionComments':
          return adaptDirectionCommentsRequest({
            directionPrompt: request.payload.contents[0].parts[0].text,
            model: request.model,
            systemPrompt: 'You are a helpful assistant that generates engaging LinkedIn comments based on a specific direction.',
            schema: DIRECTION_COMMENT_SCHEMA
          });
        case 'regenerateComment':
          return adaptRegenerationRequest({
            originalText: request.originalText,
            requestType: request.requestType,
            model: request.model,
            systemPrompt: 'You are a helpful assistant that regenerates LinkedIn comments.',
            schema: REGENERATION_SCHEMA
          });
        default:
          console.warn(`EngageIQ: [transformRequest] Unknown operation for OpenAI: ${request.operation}`);
          // Default transformation - basic message format
          return {
            model: request.model || 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: 'You are a helpful assistant.' },
              { role: 'user', content: request.payload?.contents?.[0]?.parts?.[0]?.text || 'Please provide assistance.' }
            ]
          };
      }
    case PROVIDERS.GEMINI:
    default:
      // For Gemini, just pass through the payload
      return request.payload;
  }
}

/**
 * Normalizes a provider response to EngageIQ's internal format.
 * @param {object} response - Provider-specific response.
 * @param {string} provider - Provider name.
 * @param {object} options - Additional options passed from callApiProvider.
 * @returns {object} Normalized response.
 */
export function normalizeResponse(response, provider, options = {}) {
  console.log(`EngageIQ: [normalizeResponse] Normalizing response for provider: ${provider}`, options.operation);
  
  switch (provider) {
    case PROVIDERS.OPENAI:
      // For OpenAI, transform the response to match the format expected by the rest of the app
      if (!response || !Array.isArray(response.choices) || response.choices.length === 0) {
        console.warn('EngageIQ: [normalizeResponse] Invalid OpenAI response format', response);
        return response; // Return as-is if invalid
      }
      
      const choice = response.choices[0];
      const content = choice.message?.content || '';
      
      // Create a Gemini-like response structure
      switch (options.operation) {
        case 'Analyze Post Directions':
          // For direction analysis, create a Gemini-like response with the content in the expected location
          return {
            candidates: [{
              content: {
                parts: [{
                  text: content
                }]
              }
            }]
          };
        case 'Generate Direction Comments':
          // For direction comments, create a Gemini-like response with the content in the expected location
          return {
            candidates: [{
              content: {
                parts: [{
                  text: content
                }]
              }
            }]
          };
        case 'regenerateComment':
          // For 'regenerateComment' with OpenAI, we now expect direct text output
          console.log("EngageIQ: [normalizeResponse] Normalizing OpenAI response for regenerateComment (expecting direct text):", response);
          if (response?.choices?.[0]?.message?.content) {
            const regeneratedText = response.choices[0].message.content.trim();
            console.log("EngageIQ: [normalizeResponse] Extracted regenerated text from OpenAI direct content:", regeneratedText);
            return regeneratedText;
          }
          console.warn("EngageIQ: [normalizeResponse] Could not extract regenerated text from OpenAI response's direct content for regenerateComment.");
          // Use createApiError for consistent error handling
          throw createApiError({
            provider: PROVIDERS.OPENAI,
            message: 'Could not extract regenerated text from OpenAI response for regenerateComment.',
            code: 'PARSE_ERROR',
            details: response // Include the full response for debugging
          });
        default:
          // For other operations, just return the content in the expected location
          return {
            candidates: [{
              content: {
                parts: [{
                  text: content
                }]
              }
            }]
          };
      }
      
    case PROVIDERS.GEMINI:
    default:
      // For Gemini, the response is already in the expected format
      return response;
  }
}

/**
 * Maps provider-specific errors to a standard error format.
 * @param {any} error - Error object or message.
 * @param {string} provider - Provider name.
 * @returns {object} Standardized error object.
 */
export function mapProviderError(error, provider) {
  // Placeholder: Expand with specific logic as needed in later steps
  return {
    provider,
    message: error?.message || String(error),
    code: error?.code || 'UNKNOWN',
  };
}

/**
 * Adapts a comment generation request to OpenAI's chat completion format.
 * @param {object} request - Internal comment generation request
 * @param {object} [schema] - Optional structured output schema
 * @returns {object} OpenAI chat completion request
 */
export function adaptCommentGenerationRequest(request, schema) {
  if (!request || !request.prompt) {
    throw new Error('Invalid comment generation request: missing prompt');
  }
  const messages = [
    { role: 'system', content: request.systemPrompt || 'You are a helpful assistant.' },
    { role: 'user', content: request.prompt }
  ];
  
  // Create the request with the appropriate format for structured output
  const openaiRequest = {
    model: request.model || 'gpt-3.5-turbo',
    messages
  };
  
  // Add tools if schema is provided
  if (schema) {
    openaiRequest.tools = [{
      type: 'function',
      function: schema
    }];
    openaiRequest.tool_choice = {
      type: 'function',
      function: { name: schema.name }
    };
  }
  
  return openaiRequest;
}

/**
 * Adapts a regeneration request to OpenAI's chat completion format.
 * @param {object} request - Internal regeneration request
 * @param {object} [schema] - Optional structured output schema
 * @returns {object} OpenAI chat completion request
 */
export function adaptRegenerationRequest(request, schema) { 
  console.log('EngageIQ: [adaptRegenerationRequest] Adapting regeneration request for OpenAI. Input:', request);
  const { originalText, requestType, model, systemPrompt, schema: regenerationSchemaFromArgs } = request;

  let lengthModifier = '';
  if (requestType === 'REGENERATE_LONGER') {
    lengthModifier = 'longer';
  } else if (requestType === 'REGENERATE_SHORTER') {
    lengthModifier = 'shorter';
  } else {
    console.warn(`EngageIQ: [adaptRegenerationRequest] Unexpected requestType: ${requestType}, defaulting to 'different'.`);
    lengthModifier = 'different'; 
  }

  let userPrompt = `The previous comment was: "${originalText}". `;
  userPrompt += `Please regenerate this comment to be ${lengthModifier}. IMPORTANT: Respond ONLY with the regenerated comment text and nothing else. Do not use any conversational filler or markdown.`;

  // Use the schema passed in the request object; REGENERATION_SCHEMA is a fallback if not directly provided.
  const currentSchema = regenerationSchemaFromArgs || REGENERATION_SCHEMA;

  return {
    model: model || 'gpt-3.5-turbo', 
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  };
}

/**
 * Adapts a direction analysis request to OpenAI's chat completion format.
 * @param {object} request - Internal direction analysis request
 * @param {object} [schema] - Optional structured output schema
 * @returns {object} OpenAI chat completion request
 */
export function adaptDirectionAnalysisRequest(request, schema) {
  if (!request || !request.prompt) {
    throw new Error('Invalid direction analysis request: missing prompt');
  }
  const messages = [
    { role: 'system', content: request.systemPrompt || 'You are a helpful assistant.' },
    { role: 'user', content: request.prompt }
  ];
  
  // Create the request with the appropriate format for structured output
  const openaiRequest = {
    model: request.model || 'gpt-3.5-turbo',
    messages
  };
  
  // Add tools if schema is provided
  if (schema) {
    openaiRequest.tools = [{
      type: 'function',
      function: schema
    }];
    openaiRequest.tool_choice = {
      type: 'function',
      function: { name: schema.name }
    };
  }
  
  return openaiRequest;
}

/**
 * Adapts a direction-based comment generation request to OpenAI's chat completion format.
 * @param {object} request - Internal direction-based comment generation request
 * @param {object} [schema] - Optional structured output schema
 * @returns {object} OpenAI chat completion request
 */
export function adaptDirectionCommentsRequest(request, schema) {
  if (!request || !request.directionPrompt) {
    throw new Error('Invalid direction comments request: missing directionPrompt');
  }
  const messages = [
    { role: 'system', content: request.systemPrompt || 'You are a helpful assistant.' },
    { role: 'user', content: request.directionPrompt }
  ];
  
  // Create the request with the appropriate format for structured output
  const openaiRequest = {
    model: request.model || 'gpt-3.5-turbo',
    messages
  };
  
  // Add tools if schema is provided
  if (schema) {
    openaiRequest.tools = [{
      type: 'function',
      function: schema
    }];
    openaiRequest.tool_choice = {
      type: 'function',
      function: { name: schema.name }
    };
  }
  
  return openaiRequest;
}

// --- OpenAI Response Parsing Adapters ---
/**
 * Parses an OpenAI chat completion response for comment generation into EngageIQ's internal comment format.
 * @param {object} response - Raw OpenAI API response
 * @returns {object} EngageIQ comment object
 */
export function parseOpenAICommentResponse(response) {
  if (!response || !Array.isArray(response.choices) || response.choices.length === 0) {
    throw new Error('Invalid OpenAI response: No choices found');
  }
  const choice = response.choices[0];
  
  // Check for tool_call result (newer OpenAI API)
  if (choice.message && choice.message.tool_calls && choice.message.tool_calls.length > 0) {
    const toolCall = choice.message.tool_calls[0];
    if (toolCall.function) {
      let args = toolCall.function.arguments;
      if (typeof args === 'string') {
        try {
          args = JSON.parse(args);
        } catch (err) {
          throw new Error('Failed to parse tool_call arguments as JSON');
        }
      }
      if (args.commentText) return { like: { text: args.commentText } };
      if (args.comments) return args.comments;
      throw new Error('Missing comment data in tool_call arguments');
    }
  }
  
  // Check for function_call result (older OpenAI API)
  if (choice.message && choice.message.function_call) {
    let args = choice.message.function_call.arguments;
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args);
      } catch (err) {
        throw new Error('Failed to parse function_call arguments as JSON');
      }
    }
    if (args.commentText) return { like: { text: args.commentText } };
    if (args.comments) return args.comments;
    throw new Error('Missing comments in function_call arguments');
  }
  
  // Direct text result fallback
  if (choice.message && choice.message.content) {
    return { like: { text: choice.message.content } };
  }
  
  throw new Error('OpenAI response did not contain expected comment data');
}

/**
 * Parses an OpenAI chat completion response for direction analysis into EngageIQ's internal directions array format.
 * @param {object} response - Raw OpenAI API response
 * @returns {Array} EngageIQ directions array
 */
export function parseOpenAIDirectionResponse(response) {
  if (!response || !Array.isArray(response.choices) || response.choices.length === 0) {
    throw new Error('Invalid OpenAI response: No choices found');
  }
  const choice = response.choices[0];
  
  // Check for tool_call result (newer OpenAI API)
  if (choice.message && choice.message.tool_calls && choice.message.tool_calls.length > 0) {
    const toolCall = choice.message.tool_calls[0];
    if (toolCall.function) {
      let args = toolCall.function.arguments;
      if (typeof args === 'string') {
        try {
          args = JSON.parse(args);
        } catch (err) {
          throw new Error('Failed to parse tool_call arguments as JSON');
        }
      }
      if (!Array.isArray(args.directions)) throw new Error('Missing directions array in tool_call arguments');
      return args.directions.map(direction => ({
        ...direction,
        headerText: direction.headerText || 'Choose a commenting approach'
      }));
    }
  }
  
  // Check for function_call result (older OpenAI API)
  if (choice.message && choice.message.function_call) {
    let args = choice.message.function_call.arguments;
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args);
      } catch (err) {
        throw new Error('Failed to parse function_call arguments as JSON');
      }
    }
    if (!Array.isArray(args.directions)) throw new Error('Missing directions array in function_call arguments');
    return args.directions.map(direction => ({
      ...direction,
      headerText: direction.headerText || 'Choose a commenting approach'
    }));
  }
  
  throw new Error('OpenAI response did not contain expected direction data');
}

/**
 * Parses an OpenAI chat completion response for direction-based comment generation into EngageIQ's internal format (array of comments).
 * @param {object} response - Raw OpenAI API response
 * @returns {Array} EngageIQ comments array
 */
export function parseOpenAIDirectionCommentsResponse(response) {
  if (!response || !Array.isArray(response.choices) || response.choices.length === 0) {
    throw new Error('Invalid OpenAI response: No choices found');
  }
  const choice = response.choices[0];
  
  // Check for tool_call result (newer OpenAI API)
  if (choice.message && choice.message.tool_calls && choice.message.tool_calls.length > 0) {
    const toolCall = choice.message.tool_calls[0];
    if (toolCall.function) {
      let args = toolCall.function.arguments;
      if (typeof args === 'string') {
        try {
          args = JSON.parse(args);
        } catch (err) {
          throw new Error('Failed to parse tool_call arguments as JSON');
        }
      }
      if (!Array.isArray(args.comments)) throw new Error('Missing comments array in tool_call arguments');
      return args.comments;
    }
  }
  
  // Check for function_call result (older OpenAI API)
  if (choice.message && choice.message.function_call) {
    let args = choice.message.function_call.arguments;
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args);
      } catch (err) {
        throw new Error('Failed to parse function_call arguments as JSON');
      }
    }
    if (!Array.isArray(args.comments)) throw new Error('Missing comments array in function_call arguments');
    return args.comments;
  }
  
  throw new Error('OpenAI response did not contain expected direction-based comment data');
}

/**
 * High-level function to route a generic request to the correct provider.
 * @param {object} request - Generic request object.
 * @param {object} [options] - Additional options.
 * @returns {Promise<object>} Normalized response.
 */
export async function callApiProvider(request, options = {}) {
  const provider = options.provider || (await getCurrentApiProvider());
  console.log('EngageIQ: [callApiProvider] Using provider:', provider);
  let providerRequest, providerResponse;
  try {
    providerRequest = transformRequest(request, provider);
    if (provider === PROVIDERS.OPENAI) {
      providerResponse = await callOpenAIAPI(providerRequest, options);
    } else {
      providerResponse = await callGeminiAPI(providerRequest, options);
    }
    return normalizeResponse(providerResponse, provider, options);
  } catch (err) {
    throw mapProviderError(err, provider);
  }
}
