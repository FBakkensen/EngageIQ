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
