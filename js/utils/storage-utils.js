/**
 * EngageIQ Chrome Extension
 * Storage Utilities Module
 * 
 * This module provides utility functions for handling Chrome storage operations
 * related to the EngageIQ extension settings, such as API key and model preferences.
 */

import { DEFAULT_GEMINI_MODEL } from '../models/gemini-model.js'; // Import the default model constant

/**
 * Gets the currently selected Gemini model from storage
 * This function is part of the model selection feature that allows users to choose
 * different Gemini models based on their needs (speed vs quality vs rate limits).
 *
 * The function performs the following steps:
 * 1. Retrieves the model preference from Chrome storage
 * 2. Falls back to DEFAULT_GEMINI_MODEL if no preference is found
 * 3. Validates the model against a list of supported models
 * 4. Falls back to DEFAULT_GEMINI_MODEL if the stored model is invalid
 *
 * @returns {Promise<string>} The selected model or default if none is found
 */
async function getCurrentModel() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['geminiModel'], (result) => {
      if (chrome.runtime.lastError) {
        console.error(
          'EngageIQ: Error retrieving model from storage:',
          chrome.runtime.lastError
        );
        resolve(DEFAULT_GEMINI_MODEL);
        return;
      }

      // Get the model from storage or use default
      const model = result.geminiModel || DEFAULT_GEMINI_MODEL;

      // Validate the model name against allowed models
      // These are the four models supported by the extension as specified in the requirements
      const validModels = [
        'gemini-2.5-pro-exp-03-25', // Latest experimental model with highest quality but stricter rate limits
        'gemini-2.0-flash', // Default model with good balance of speed and quality
        'gemini-2.0-flash-lite', // Fastest model with highest rate limits
        'gemini-1.5-pro', // Previous generation model for specific use cases
      ];

      if (!validModels.includes(model)) {
        console.error(
          `EngageIQ: Invalid model name: ${model}. Falling back to default model.`
        );
        resolve(DEFAULT_GEMINI_MODEL);
        return;
      }

      console.log(`EngageIQ: Using model: ${model}`);
      resolve(model);
    });
  });
}

/**
 * Gets the API key from storage
 * 
 * @returns {Promise<string|null>} The API key or null if not found
 */
async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiKey'], (result) => {
      if (chrome.runtime.lastError) {
        console.error(
          'EngageIQ: Error retrieving API key from storage:',
          chrome.runtime.lastError
        );
        resolve(null);
        return;
      }

      resolve(result.apiKey || null);
    });
  });
}

/**
 * Stores the API key in Chrome storage
 * 
 * @param {string} apiKey - The API key to store
 * @returns {Promise<boolean>} Promise that resolves to true if successful
 */
async function setApiKey(apiKey) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ apiKey }, () => {
      if (chrome.runtime.lastError) {
        console.error(
          'EngageIQ: Error storing API key:',
          chrome.runtime.lastError
        );
        resolve(false);
        return;
      }
      
      console.log('EngageIQ: API key stored successfully');
      resolve(true);
    });
  });
}

/**
 * Sets the preferred Gemini model in storage
 * 
 * @param {string} modelName - The name of the model to set as preferred
 * @returns {Promise<boolean>} Promise that resolves to true if successful
 */
async function setPreferredModel(modelName) {
  // Validate the model name first
  const validModels = [
    'gemini-2.5-pro-exp-03-25',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-pro',
  ];

  if (!validModels.includes(modelName)) {
    console.error(`EngageIQ: Invalid model name: ${modelName}`);
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    chrome.storage.sync.set({ geminiModel: modelName }, () => {
      if (chrome.runtime.lastError) {
        console.error(
          'EngageIQ: Error storing model preference:',
          chrome.runtime.lastError
        );
        resolve(false);
        return;
      }
      
      console.log(`EngageIQ: Model preference set to ${modelName}`);
      resolve(true);
    });
  });
}

/**
 * Gets a value from Chrome storage by key
 * 
 * @param {string} key - The key to retrieve
 * @param {*} defaultValue - The default value to return if key is not found
 * @returns {Promise<*>} The value from storage or defaultValue if not found
 */
async function getStorageValue(key, defaultValue = null) {
  return new Promise((resolve) => {
    chrome.storage.sync.get([key], (result) => {
      if (chrome.runtime.lastError) {
        console.error(
          `EngageIQ: Error retrieving ${key} from storage:`,
          chrome.runtime.lastError
        );
        resolve(defaultValue);
        return;
      }

      resolve(result[key] !== undefined ? result[key] : defaultValue);
    });
  });
}

/**
 * Sets a value in Chrome storage by key
 * 
 * @param {string} key - The key to set
 * @param {*} value - The value to store
 * @returns {Promise<boolean>} Promise that resolves to true if successful
 */
async function setStorageValue(key, value) {
  return new Promise((resolve) => {
    const data = {};
    data[key] = value;
    
    chrome.storage.sync.set(data, () => {
      if (chrome.runtime.lastError) {
        console.error(
          `EngageIQ: Error storing ${key}:`,
          chrome.runtime.lastError
        );
        resolve(false);
        return;
      }
      
      console.log(`EngageIQ: Successfully stored ${key}`);
      resolve(true);
    });
  });
}

/**
 * Removes a value from Chrome storage by key
 * 
 * @param {string} key - The key to remove
 * @returns {Promise<boolean>} Promise that resolves to true if successful
 */
async function removeStorageValue(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.remove(key, () => {
      if (chrome.runtime.lastError) {
        console.error(
          `EngageIQ: Error removing ${key} from storage:`,
          chrome.runtime.lastError
        );
        resolve(false);
        return;
      }
      
      console.log(`EngageIQ: Successfully removed ${key} from storage`);
      resolve(true);
    });
  });
}

/**
 * Clears all extension storage
 * 
 * @returns {Promise<boolean>} Promise that resolves to true if successful
 */
async function clearAllStorage() {
  return new Promise((resolve) => {
    chrome.storage.sync.clear(() => {
      if (chrome.runtime.lastError) {
        console.error(
          'EngageIQ: Error clearing storage:',
          chrome.runtime.lastError
        );
        resolve(false);
        return;
      }
      
      console.log('EngageIQ: Storage cleared successfully');
      resolve(true);
    });
  });
}

/**
 * Gets the current API provider from storage
 * Defaults to 'gemini' for backward compatibility
 * @returns {Promise<string>} 'gemini' or 'openai'
 */
async function getApiProvider() {
  // Log the execution context for debugging
  let context = 'unknown';
  if (typeof window !== 'undefined') context = 'window';
  if (typeof self !== 'undefined') context = 'service worker';
  console.log('EngageIQ: [getApiProvider] called in context:', context);
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiProvider'], (result) => {
      console.log('EngageIQ: [getApiProvider] chrome.storage.sync.get result:', result);
      if (chrome.runtime.lastError) {
        console.error('EngageIQ: Error retrieving apiProvider from storage:', chrome.runtime.lastError);
        resolve('gemini');
        return;
      }
      console.log('EngageIQ: [getApiProvider] resolved value:', result.apiProvider || 'gemini');
      resolve(result.apiProvider || 'gemini');
    });
  });
}

/**
 * Sets the API provider preference in storage
 * @param {string} provider - 'gemini' or 'openai'
 * @returns {Promise<boolean>} True if successful
 */
async function setApiProvider(provider) {
  if (provider !== 'gemini' && provider !== 'openai') {
    console.error(`EngageIQ: Invalid provider: ${provider}`);
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    chrome.storage.sync.set({ apiProvider: provider }, () => {
      if (chrome.runtime.lastError) {
        console.error('EngageIQ: Error storing apiProvider:', chrome.runtime.lastError);
        resolve(false);
        return;
      }
      console.log(`EngageIQ: API provider set to ${provider}`);
      resolve(true);
    });
  });
}

/**
 * Gets the OpenAI API key from storage
 * @returns {Promise<string|null>} The OpenAI API key or null if not found
 */
async function getOpenAIApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['openaiApiKey'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('EngageIQ: Error retrieving OpenAI API key:', chrome.runtime.lastError);
        resolve(''); // Resolve with empty string on error, as API keys are strings
        return;
      }
      resolve(result.openaiApiKey || ''); // Resolve with the stored value or empty string
    });
  });
}

/**
 * Sets the OpenAI API key in storage
 * @param {string} apiKey - The OpenAI API key
 * @returns {Promise<boolean>} True if successful
 */
async function setOpenAIApiKey(apiKey) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ openaiApiKey: apiKey }, () => {
      if (chrome.runtime.lastError) {
        console.error('EngageIQ: Error storing OpenAI API key:', chrome.runtime.lastError);
        resolve(false);
        return;
      }
      console.log('EngageIQ: OpenAI API key stored successfully');
      resolve(true);
    });
  });
}

/**
 * Gets the OpenAI endpoint URL from storage
 * @returns {Promise<string|null>} The OpenAI endpoint URL or null if not set
 */
async function getOpenAIEndpoint() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['openaiEndpointUrl'], (result) => { 
      if (chrome.runtime.lastError) {
        console.error('EngageIQ: Error retrieving OpenAI endpoint URL:', chrome.runtime.lastError);
        resolve(null); 
        return;
      }
      resolve(result.openaiEndpointUrl || null); 
    });
  });
}

/**
 * Sets the OpenAI endpoint URL in storage
 * @param {string} endpoint - The OpenAI endpoint URL
 * @returns {Promise<boolean>} True if successful
 */
async function setOpenAIEndpoint(endpoint) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ openaiEndpointUrl: endpoint }, () => {
      if (chrome.runtime.lastError) {
        console.error('EngageIQ: Error storing OpenAI endpoint:', chrome.runtime.lastError);
        resolve(false);
        return;
      }
      console.log('EngageIQ: OpenAI endpoint stored successfully');
      resolve(true);
    });
  });
}

/**
 * Gets the preferred OpenAI model from storage
 * @returns {Promise<string|null>} The OpenAI model name or null if not set
 */
async function getCurrentOpenAIModel() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['openaiModel'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('EngageIQ: Error retrieving OpenAI model:', chrome.runtime.lastError);
        resolve(''); 
        return;
      }
      resolve(result.openaiModel || ''); 
    });
  });
}

/**
 * Sets the preferred OpenAI model in storage
 * @param {string} modelName - The OpenAI model name
 * @returns {Promise<boolean>} True if successful
 */
async function setPreferredOpenAIModel(modelName) {
  // Optionally: Validate modelName against a list of supported OpenAI models
  return new Promise((resolve) => {
    chrome.storage.sync.set({ openaiModel: modelName }, () => {
      if (chrome.runtime.lastError) {
        console.error('EngageIQ: Error storing OpenAI model:', chrome.runtime.lastError);
        resolve(false);
        return;
      }
      console.log(`EngageIQ: OpenAI model preference set to ${modelName}`);
      resolve(true);
    });
  });
}

/**
 * Gets the currently selected model based on provider
 * If provider is openai, gets OpenAI model, else gets Gemini model
 * @returns {Promise<string>} The selected model name
 */
async function getCurrentModelByProvider() {
  const provider = await getApiProvider();
  console.log(`EngageIQ: [getCurrentModelByProvider] provider: ${provider}`);
  if (provider === 'openai') {
    const openaiModel = await getCurrentOpenAIModel();
    console.log(`EngageIQ: [getCurrentModelByProvider] returning OpenAI model: ${openaiModel}`);
    return openaiModel;
  } else {
    const geminiModel = await getCurrentModel();
    console.log(`EngageIQ: [getCurrentModelByProvider] returning Gemini model: ${geminiModel}`);
    return geminiModel;
  }
}

// Export all functions to be used by other modules
export {
  DEFAULT_GEMINI_MODEL,
  getCurrentModel,
  getApiKey,
  setApiKey,
  setPreferredModel,
  getStorageValue,
  setStorageValue,
  removeStorageValue,
  clearAllStorage,
  // OpenAI support
  getApiProvider,
  setApiProvider,
  getOpenAIApiKey,
  setOpenAIApiKey,
  getOpenAIEndpoint,
  setOpenAIEndpoint,
  getCurrentOpenAIModel,
  setPreferredOpenAIModel,
  getCurrentModelByProvider
};
