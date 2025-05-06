/**
 * API Provider Abstraction Layer for EngageIQ
 * Handles routing, request/response normalization, and error mapping for Gemini and OpenAI providers.
 *
 * @module api-provider
 */

import { getApiProvider } from '../utils/storage-utils.js';
import { callGeminiAPI } from './api-service.js';
import { callOpenAIAPI } from './api-service.js';

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
  // Placeholder: Expand with specific logic as needed in later steps
  switch (provider) {
    case PROVIDERS.OPENAI:
      // TODO: Implement OpenAI-specific transformation
      return { ...request };
    case PROVIDERS.GEMINI:
    default:
      // TODO: Implement Gemini-specific transformation
      return { ...request };
  }
}

/**
 * Normalizes a provider response to EngageIQ's internal format.
 * @param {object} response - Provider-specific response.
 * @param {string} provider - Provider name.
 * @returns {object} Normalized response.
 */
export function normalizeResponse(response, provider) {
  // Placeholder: Expand with specific logic as needed in later steps
  switch (provider) {
    case PROVIDERS.OPENAI:
      // TODO: Implement OpenAI-specific normalization
      return { ...response };
    case PROVIDERS.GEMINI:
    default:
      // TODO: Implement Gemini-specific normalization
      return { ...response };
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
  const openaiRequest = {
    model: request.model || 'gpt-3.5-turbo',
    messages,
    ...(schema ? { functions: [schema] } : {})
  };
  return openaiRequest;
}

/**
 * Adapts a regeneration request to OpenAI's chat completion format.
 * @param {object} request - Internal regeneration request
 * @param {object} [schema] - Optional structured output schema
 * @returns {object} OpenAI chat completion request
 */
export function adaptRegenerationRequest(request, schema) {
  if (!request || !request.previousMessage) {
    throw new Error('Invalid regeneration request: missing previousMessage');
  }
  const messages = [
    { role: 'system', content: request.systemPrompt || 'You are a helpful assistant.' },
    { role: 'user', content: request.previousMessage }
  ];
  const openaiRequest = {
    model: request.model || 'gpt-3.5-turbo',
    messages,
    ...(schema ? { functions: [schema] } : {})
  };
  return openaiRequest;
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
  const openaiRequest = {
    model: request.model || 'gpt-3.5-turbo',
    messages,
    ...(schema ? { functions: [schema] } : {})
  };
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
  const openaiRequest = {
    model: request.model || 'gpt-3.5-turbo',
    messages,
    ...(schema ? { functions: [schema] } : {})
  };
  return openaiRequest;
}

/**
 * High-level function to route a generic request to the correct provider.
 * @param {object} request - Generic request object.
 * @param {object} [options] - Additional options.
 * @returns {Promise<object>} Normalized response.
 */
export async function callApiProvider(request, options = {}) {
  const provider = options.provider || (await getCurrentApiProvider());
  let providerRequest, providerResponse;
  try {
    providerRequest = transformRequest(request, provider);
    if (provider === PROVIDERS.OPENAI) {
      providerResponse = await callOpenAIAPI(providerRequest, options);
    } else {
      providerResponse = await callGeminiAPI(providerRequest, options);
    }
    return normalizeResponse(providerResponse, provider);
  } catch (err) {
    throw mapProviderError(err, provider);
  }
}
