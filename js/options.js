/**
 * EngageIQ Chrome Extension - Options Page Script
 *
 * This script handles the options page functionality, including:
 * - Loading and saving the API key
 * - Loading and saving the Gemini model preference
 * - Displaying status messages to the user
 */

document.addEventListener('DOMContentLoaded', function () {
  // Get DOM references for all interactive elements
  const apiKeyInput = document.getElementById('apiKey');
  // const saveButton = document.getElementById('saveButton'); // ESLint: Commented out as unused (no-unused-vars). Ref'd in plan but not directly used in code.
  const statusMessage = document.getElementById('statusMessage');
  const settingsForm = document.getElementById('settingsForm');

  /**
   * Model Selection Feature: Get reference to the model dropdown
   * This dropdown allows users to select from different Gemini models:
   * - gemini-2.5-pro-exp-03-25: Latest experimental model (highest quality, stricter rate limits)
   * - gemini-2.0-flash: Default model (good balance of speed and quality)
   * - gemini-2.0-flash-lite: Fastest model (highest rate limits)
   * - gemini-1.5-pro: Previous generation model (for specific use cases)
   */
  const geminiModelSelect = document.getElementById('geminiModel');

  /**
   * Load saved settings from Chrome storage
   * Retrieves both the API key and model preference in a single storage call
   * for efficiency. If no model preference is found, the dropdown will remain
   * at its default value as specified in the HTML.
   */
  chrome.storage.sync.get(['apiKey', 'geminiModel'], function (result) {
    if (chrome.runtime.lastError) {
      console.error(
        'EngageIQ: Error retrieving settings:',
        chrome.runtime.lastError.message
      );
      statusMessage.textContent = 'Error loading settings.';
      statusMessage.style.color = 'red';
    } else {
      // Load API key if it exists
      if (result.apiKey) {
        apiKeyInput.value = result.apiKey;
        console.log('EngageIQ: API Key loaded.');
      } else {
        console.log('EngageIQ: No API Key found in storage.');
      }

      /**
       * Model Selection Feature: Set the dropdown value based on stored preference
       * If no preference is found, the dropdown will use the default value from HTML
       * This maintains backward compatibility with existing installations
       */
      if (result.geminiModel) {
        geminiModelSelect.value = result.geminiModel;
        console.log(
          'EngageIQ: Gemini model preference loaded:',
          result.geminiModel
        );
      } else {
        console.log('EngageIQ: No model preference found, using default.');
      }
    }
  });

  /**
   * Handle form submission to save settings
   * Saves both the API key and model preference in a single storage call
   */
  settingsForm.addEventListener('submit', function (event) {
    // Prevent default form submission
    event.preventDefault();

    // Get values from form fields
    const apiKey = apiKeyInput.value.trim(); // Trim whitespace

    /**
     * Model Selection Feature: Get the selected model value
     * This will be saved to Chrome storage and used by the background script
     * when making API calls to Gemini
     */
    const geminiModel = geminiModelSelect.value;

    /**
     * Save both settings to Chrome storage
     * Stores both the API key and model preference in a single operation
     */
    chrome.storage.sync.set(
      { apiKey: apiKey, geminiModel: geminiModel },
      function () {
        // Handle the storage callback
        if (chrome.runtime.lastError) {
          console.error(
            'EngageIQ: Error saving settings:',
            chrome.runtime.lastError.message
          );
          statusMessage.textContent = 'Error saving settings.';
          statusMessage.style.color = 'red';
        } else {
          console.log('EngageIQ: Settings saved successfully.');
          statusMessage.textContent = 'Settings saved successfully!';
          statusMessage.style.color = 'green';

          // Clear the message after a few seconds
          setTimeout(function () {
            statusMessage.textContent = '';
          }, 3000); // 3 seconds
        }
      }
    );
  });
});
