/**
 * EngageIQ Chrome Extension - Model Indicator Module (model-indicator.js)
 *
 * This module handles the model indicator display in the popup UI.
 * It is responsible for:
 *  - Updating the model indicator with the current model name
 *  - Retrieving the current model preference from storage
 */

// Log module load confirmation
console.log('EngageIQ: Model Indicator Module Loaded');

// Default model if none is selected
const DEFAULT_GEMINI_MODEL = 'gemini-1.5-pro';

// Reference to DOM element (to be initialized when module is used)
let modelIndicatorElement;

/**
 * Initializes the model indicator module with required DOM reference
 * @param {Object} config - Configuration object
 * @param {HTMLElement} config.modelIndicatorElement - The model indicator DOM element
 */
export function initModelIndicator(config) {
  modelIndicatorElement = config.modelIndicatorElement;
  
  console.log('EngageIQ: Model Indicator initialized');
}

/**
 * Updates the model indicator with the provided model name
 * @param {string} modelName - The name of the model to display
 */
export function updateModelIndicator(modelName) {
  if (!modelIndicatorElement) {
    console.warn('EngageIQ: Cannot update model indicator - element not initialized');
    return;
  }

  if (!modelName) {
    modelIndicatorElement.style.display = 'none';
    return;
  }

  // Customize display name for better readability
  let displayName = modelName;
  if (modelName.includes('gemini')) {
    displayName = modelName.split('-')[0].charAt(0).toUpperCase() + modelName.split('-')[0].slice(1);
  }

  console.log(`EngageIQ: Updating model indicator to ${displayName}`);
  modelIndicatorElement.textContent = displayName;
  modelIndicatorElement.style.display = 'inline-block';
}

/**
 * Retrieves and displays the current Gemini model in the model indicator
 */
export function displayCurrentModel() {
  console.log('EngageIQ: Retrieving current model setting');

  // Get stored model preference using chrome.storage.sync
  chrome.storage.sync.get(['geminiModel'], (result) => {
    let currentModel = DEFAULT_GEMINI_MODEL;

    if (chrome.runtime.lastError) {
      console.warn(
        'EngageIQ: Error retrieving model preference:',
        chrome.runtime.lastError
      );
    } else if (result.geminiModel) {
      currentModel = result.geminiModel;
      console.log(`EngageIQ: Retrieved model preference: ${currentModel}`);
    } else {
      console.log(
        `EngageIQ: No model preference found, using default: ${currentModel}`
      );
    }

    // Update the UI
    updateModelIndicator(currentModel);
  });
}
