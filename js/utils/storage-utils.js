/**
 * EngageIQ Chrome Extension
 * Storage Utilities Module
 * 
 * This module provides utility functions for storage operations used throughout the extension.
 * It abstracts all Chrome storage API interactions to provide a consistent interface.
 */

// Default model to use if none is specified in storage
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash'; // Using Gemini 2.0 Flash as default for faster responses

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
  clearAllStorage
};
