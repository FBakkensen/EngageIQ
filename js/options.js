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
import { discoverLocalModels } from './models/openai-model.js';
import { initModelIndicator } from './ui/model-indicator.js';

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

  // Model indicator DOM element
  const modelIndicatorElement = document.getElementById('modelIndicator');
  // Initialize model indicator (connection status, provider, model)
  if (modelIndicatorElement) {
    initModelIndicator({ modelIndicatorElement });
  }

  // Helper: Show/hide provider-specific sections
  function updateProviderUI(selectedProvider) {
    if (selectedProvider === 'openai') {
      openaiConfigSection.style.display = '';
      apiKeyInput.closest('.mb-3').style.display = 'none';
      geminiModelSelect.closest('.mb-3').style.display = 'none';
      handleOpenAIModelDiscovery();
    } else {
      openaiConfigSection.style.display = 'none';
      apiKeyInput.closest('.mb-3').style.display = '';
      geminiModelSelect.closest('.mb-3').style.display = '';
    }
  }

  // --- LM Studio Model Discovery Logic ---
  const openaiModelSpinner = document.getElementById('openaiModelSpinner');
  const openaiModelError = document.getElementById('openaiModelError');

  function isLocalEndpoint(url) {
    try {
      const parsed = new URL(url);
      return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    } catch {
      return false;
    }
  }

  function getLMStudioModelsUrl(endpoint) {
    // Always trim to just the base /v1, then append /models
    let url = endpoint.trim();
    // Find index of /v1 in the URL
    const v1Index = url.indexOf('/v1');
    if (v1Index !== -1) {
      url = url.substring(0, v1Index + 3); // include '/v1'
    }
    // Remove trailing slash, if present
    url = url.replace(/\/$/, '');
    return url + '/models';
  }

  async function handleOpenAIModelDiscovery() {
    // Explicit UI Reset at the very beginning
    openaiModelError.textContent = '';
    openaiModelError.style.display = 'none';
    openaiModelSelect.innerHTML = ''; // Clear previous options / "Failed to load" from select itself
    openaiModelSpinner.style.display = 'inline-block';
    openaiModelSelect.disabled = true;

    const endpoint = openaiEndpointInput.value.trim();
    const apiKey = openaiApiKeyInput.value.trim(); // Get API Key from input

    console.log('[EngageIQ] Endpoint input value:', endpoint);
    console.log('[EngageIQ] API Key being used: ', apiKey ? '******' : 'Not provided'); // Log if API key is present

    if (!endpoint) {
      openaiModelError.textContent = 'Please enter an OpenAI Endpoint URL.';
      openaiModelError.style.display = 'block';
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'No endpoint configured';
      openaiModelSelect.appendChild(defaultOption);
      openaiModelSpinner.style.display = 'none';
      openaiModelSelect.disabled = false; // Re-enable so user can see the placeholder
      return;
    }

    // Specific check for OpenAI's public API without a key
    if (endpoint.includes('api.openai.com') && !apiKey) {
      openaiModelError.textContent = 'API Key is required for official OpenAI endpoints.';
      openaiModelError.style.display = 'block';
      console.warn('[EngageIQ] OpenAI endpoint specified but no API key provided. Model discovery aborted for this endpoint.');
      openaiModelSpinner.style.display = 'none';
      openaiModelSelect.disabled = false; // Re-enable so user can see the placeholder
      return;
    }

    const modelsUrl = getLMStudioModelsUrl(endpoint);
    console.log('[EngageIQ] Models URL being fetched:', modelsUrl);

    // Always try to discover models from the endpoint
    try {
      const models = await discoverLocalModels(modelsUrl, apiKey); // Pass API key
      openaiModelSelect.innerHTML = '';
      if (models.length === 0) {
        openaiModelError.textContent = 'No models found at the specified endpoint.';
        openaiModelError.style.display = 'block';
      } else {
        models.forEach(model => {
          const opt = document.createElement('option');
          opt.value = model.id;
          opt.textContent = model.description || model.id;
          openaiModelSelect.appendChild(opt);
        });
        // Try to reselect the previously saved model
        const previouslySelectedModel = await getCurrentOpenAIModel();
        if (previouslySelectedModel) {
          openaiModelSelect.value = previouslySelectedModel;
        }
      }
    } catch (err) {
      // Show a generic error and the actual error message
      openaiModelError.textContent = `Could not load models from ${getLMStudioModelsUrl(endpoint)}. Error: ${err.message}`;
      openaiModelError.style.display = 'block';
      openaiModelSelect.innerHTML = '<option value="">Failed to load models</option>';
    }
    openaiModelSpinner.style.display = 'none';
    openaiModelSelect.disabled = false;
  }

  // Re-discover models when endpoint changes
  openaiEndpointInput.addEventListener('change', () => {
    if (document.getElementById('providerOpenAI').checked) {
      handleOpenAIModelDiscovery();
    }
  });

  // Also on provider radio change
  providerRadios.forEach(radio => {
    radio.addEventListener('change', e => {
      updateProviderUI(e.target.value);
    });
  });

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
    openaiEndpointInput.value = openaiEndpoint || ''; // Default to empty string
    openaiModelSelect.value = openaiModel || openaiModelSelect.value;

    // Set debug
    imageContextDebugCheckbox.checked = !!imageContextDebug;

    // If OpenAI is selected, populate models from the endpoint
    if (provider === 'openai') {
      if (openaiEndpoint && openaiEndpoint.trim() !== '') {
        // A specific endpoint is configured, try to load models from it
        handleOpenAIModelDiscovery();
      } else {
        // OpenAI provider selected, but no specific endpoint configured yet.
        // Show the prompt to enter a URL directly, without an initial API call.
        openaiModelError.textContent = 'Please enter an OpenAI Endpoint URL.';
        openaiModelError.style.display = 'block';
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'No endpoint configured';
        openaiModelSelect.innerHTML = ''; // Clear previous options
        openaiModelSelect.appendChild(defaultOption);
        openaiModelSpinner.style.display = 'none';
        openaiModelSelect.disabled = false;
      }
    }
  }).catch(error => {
    console.error('EngageIQ: Error loading settings:', error);
    // Display a generic error to the user if settings load fails
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
