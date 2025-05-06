/**
 * EngageIQ Chrome Extension - Options Page Script
 *
 * This script handles the options page functionality, including:
 * - Loading and saving the API key
 * - Loading and saving the Gemini model preference
 * - Displaying status messages to the user
 * - Loading, saving, and toggling OpenAI provider settings
 */

import {
  getApiProvider,
  setApiProvider,
  getOpenAIApiKey,
  setOpenAIApiKey,
  getOpenAIEndpoint,
  setOpenAIEndpoint,
  getCurrentOpenAIModel,
  setPreferredOpenAIModel
} from './utils/storage-utils.js';

document.addEventListener('DOMContentLoaded', function () {
  // Get DOM references for all interactive elements
  const apiKeyInput = document.getElementById('apiKey');
  const statusMessage = document.getElementById('statusMessage');
  const settingsForm = document.getElementById('settingsForm');
  const imageContextDebugCheckbox = document.getElementById('imageContextDebug');
  const geminiModelSelect = document.getElementById('geminiModel');

  // OpenAI-specific DOM elements
  const openaiConfigSection = document.getElementById('openaiConfigSection');
  const openaiApiKeyInput = document.getElementById('openaiApiKey');
  const openaiEndpointInput = document.getElementById('openaiEndpoint');
  const openaiModelSelect = document.getElementById('openaiModel');
  const providerRadios = document.getElementsByName('apiProvider');

  // Helper: Show/hide provider-specific sections
  function updateProviderUI(selectedProvider) {
    if (selectedProvider === 'openai') {
      openaiConfigSection.style.display = '';
      apiKeyInput.closest('.mb-3').style.display = 'none';
      geminiModelSelect.closest('.mb-3').style.display = 'none';
    } else {
      openaiConfigSection.style.display = 'none';
      apiKeyInput.closest('.mb-3').style.display = '';
      geminiModelSelect.closest('.mb-3').style.display = '';
    }
  }

  // On load: Populate all settings
  Promise.all([
    getApiProvider(),
    chrome.storage.sync.get(['apiKey']),
    chrome.storage.sync.get(['geminiModel']),
    getOpenAIApiKey(),
    getOpenAIEndpoint(),
    getCurrentOpenAIModel(),
    new Promise(resolve => {
      chrome.storage.sync.get(['imageContextDebug'], result => resolve(result.imageContextDebug));
    })
  ]).then(([provider, geminiApiKey, geminiModel, openaiApiKey, openaiEndpoint, openaiModel, imageContextDebug]) => {
    // Set provider radio
    if (provider === 'openai') {
      document.getElementById('providerOpenAI').checked = true;
    } else {
      document.getElementById('providerGemini').checked = true;
    }
    updateProviderUI(provider);

    // Set Gemini fields
    apiKeyInput.value = geminiApiKey.apiKey || '';
    geminiModelSelect.value = geminiModel.geminiModel || geminiModelSelect.value;

    // Set OpenAI fields
    openaiApiKeyInput.value = openaiApiKey || '';
    openaiEndpointInput.value = openaiEndpoint || 'https://api.openai.com/v1/chat/completions';
    openaiModelSelect.value = openaiModel || openaiModelSelect.value;

    // Set debug
    imageContextDebugCheckbox.checked = !!imageContextDebug;
  });

  // Provider radio change: toggle UI
  providerRadios.forEach(radio => {
    radio.addEventListener('change', e => {
      updateProviderUI(e.target.value);
    });
  });

  // Validate OpenAI endpoint (simple URL check)
  function isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Load saved settings from Chrome storage
  chrome.storage.sync.get(['apiKey', 'geminiModel', 'imageContextDebug'], function (result) {
    if (chrome.runtime.lastError) {
      console.error(
        'EngageIQ: Error retrieving settings:',
        chrome.runtime.lastError.message
      );
      statusMessage.textContent = 'Error loading settings.';
      statusMessage.classList.remove('alert-success'); // Ensure success class is not present
      statusMessage.classList.add('alert-danger'); // Add Bootstrap error class
    } else {
      // Load API key if it exists
      if (result.apiKey) {
        apiKeyInput.value = result.apiKey;
        console.log('EngageIQ: API Key loaded.');
      } else {
        console.log('EngageIQ: No API Key found in storage.');
      }

      // Load Gemini model preference
      if (result.geminiModel) {
        geminiModelSelect.value = result.geminiModel;
        console.log(
          'EngageIQ: Gemini model preference loaded:',
          result.geminiModel
        );
      } else {
        console.log('EngageIQ: No model preference found, using default.');
      }

      // Load Image Context Debug Mode
      if (typeof result.imageContextDebug === 'boolean') {
        imageContextDebugCheckbox.checked = result.imageContextDebug;
        console.log('EngageIQ: Image Context Debug Mode loaded:', result.imageContextDebug);
      } else {
        imageContextDebugCheckbox.checked = false;
        console.log('EngageIQ: No Image Context Debug Mode setting found, using default (off).');
      }
    }
  });

  // Handle form submission to save settings
  settingsForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const selectedProvider = Array.from(providerRadios).find(r => r.checked).value;
    const geminiApiKey = apiKeyInput.value.trim();
    const geminiModel = geminiModelSelect.value;
    const openaiApiKey = openaiApiKeyInput.value.trim();
    const openaiEndpoint = openaiEndpointInput.value.trim();
    const openaiModel = openaiModelSelect.value;
    const imageContextDebug = imageContextDebugCheckbox.checked;

    // Validate OpenAI endpoint if OpenAI is selected
    if (selectedProvider === 'openai' && !isValidUrl(openaiEndpoint)) {
      statusMessage.textContent = 'Please enter a valid OpenAI endpoint URL.';
      statusMessage.classList.remove('alert-success');
      statusMessage.classList.add('alert-danger');
      return;
    }

    // Save provider and settings
    const promises = [
      setApiProvider(selectedProvider),
      chrome.storage.sync.set({ apiKey: geminiApiKey }),
      chrome.storage.sync.set({ geminiModel: geminiModel }),
      setOpenAIApiKey(openaiApiKey),
      setOpenAIEndpoint(openaiEndpoint),
      setPreferredOpenAIModel(openaiModel),
      chrome.storage.sync.set({ imageContextDebug })
    ];
    Promise.all(promises).then(() => {
      statusMessage.textContent = 'Settings saved successfully!';
      statusMessage.classList.remove('alert-danger');
      statusMessage.classList.add('alert-success');
      setTimeout(function () {
        statusMessage.textContent = '';
        statusMessage.classList.remove('alert-success', 'alert-danger');
      }, 3000);
    }).catch(err => {
      console.error('EngageIQ: Error saving settings:', err);
      statusMessage.textContent = 'Error saving settings.';
      statusMessage.classList.remove('alert-success');
      statusMessage.classList.add('alert-danger');
    });
  });
});
