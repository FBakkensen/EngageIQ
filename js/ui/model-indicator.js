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

// Import the centralized default model constant
import { DEFAULT_GEMINI_MODEL } from '../models/gemini-model.js'; // Corrected relative path

// Reference to DOM element (to be initialized when module is used)
let modelIndicatorElement;

/**
 * Initializes the model indicator component
 * - Stores the DOM element reference
 * - Sets up a listener for storage changes to keep the UI updated
 * 
 * @param {Object} config - Configuration object
 * @param {HTMLElement} config.modelIndicatorElement - The DOM element for the indicator
 */
export function initModelIndicator({ modelIndicatorElement: element }) {
  if (!element) {
    console.error("EngageIQ: Model indicator element not provided during initialization.");
    return;
  }
  modelIndicatorElement = element;
  console.log("EngageIQ: Model indicator initialized.");

  // Add listener for storage changes
  chrome.storage.onChanged.addListener((changes, areaName) => {
    // Check if the change is in 'sync' storage and affects 'geminiModel'
    if (areaName === 'sync' && changes.geminiModel) {
      const newModel = changes.geminiModel.newValue || DEFAULT_GEMINI_MODEL;
      console.log(`EngageIQ: Detected model change in storage: ${newModel}`);
      updateModelIndicator(newModel);
    }
  });
}

/**
 * Updates the model indicator UI with the given model ID
 * 
 * @param {string} modelId - The ID of the model (e.g., 'gemini-1.5-pro')
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
    // Format as "Gemini 1.5 Pro" from "gemini-1.5-pro"
    const parts = modelName.split('-');
    // Capitalize first letter of model name
    const modelBase = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    
    // Add version and variant if available
    if (parts.length > 1) {
      displayName = `${modelBase} ${parts.slice(1).join(' ')}`;
    } else {
      displayName = modelBase;
    }
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

  // Use the imported DEFAULT_GEMINI_MODEL for fallback
  chrome.storage.sync.get({ geminiModel: DEFAULT_GEMINI_MODEL }, (result) => {
    // The result.geminiModel will either be the stored value or the default we provided
    const currentModel = result.geminiModel;
    
    if (chrome.runtime.lastError) {
      console.warn(
        'EngageIQ: Error retrieving model preference:',
        chrome.runtime.lastError
      );
    } else {
      console.log(`EngageIQ: Retrieved model preference: ${currentModel}`);
    }

    // Update the UI
    updateModelIndicator(currentModel);
  });
}
