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

// Import provider and model utilities
import { getApiProvider, getCurrentModelByProvider, getOpenAIEndpoint } from '../utils/storage-utils.js';
// Import connection monitor utility
import ConnectionMonitor from '../utils/connection-monitor.js';

// Reference to DOM element (to be initialized when module is used)
let modelIndicatorElement;
let connectionMonitor = null;
let currentEndpoint = null;
let connectionStatus = null;

/**
 * Initializes the model indicator component
 * - Stores the DOM element reference
 * - Sets up a listener for storage changes to keep the UI updated
 * - Initializes connection monitoring for local endpoints
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
    // Listen for provider or model changes
    if (areaName === 'sync' && (changes.geminiModel || changes.openaiModel || changes.apiProvider || changes.openaiEndpoint)) {
      // Use async update to get both provider & model
      displayCurrentModel();
      // Also re-initialize connection monitor if endpoint changes
      if (changes.openaiEndpoint) {
        maybeInitConnectionMonitor();
      }
    }
  });

  // Initial connection monitor setup
  maybeInitConnectionMonitor();
}

// Helper to initialize or stop connection monitoring based on endpoint
async function maybeInitConnectionMonitor() {
  const provider = await getApiProvider();
  let endpoint = null;
  if (provider === 'openai') {
    endpoint = await getOpenAIEndpoint();
  }
  if (connectionMonitor) {
    // Stop previous monitor if endpoint changed or not local
    connectionMonitor.stop();
    connectionMonitor = null;
    currentEndpoint = null;
  }
  if (provider === 'openai' && endpoint && (endpoint.includes('localhost') || endpoint.includes('127.0.0.1'))) {
    currentEndpoint = endpoint;
    connectionMonitor = new ConnectionMonitor({ serverUrl: endpoint, interval: 5000, retryInterval: 3000 });
    connectionMonitor.on('connected', () => setConnectionStatus('connected'));
    connectionMonitor.on('disconnected', () => setConnectionStatus('disconnected'));
    connectionMonitor.on('reconnected', () => setConnectionStatus('reconnecting'));
    connectionMonitor.start();
    // Set initial status as unknown until first event
    setConnectionStatus('checking');
  } else {
    setConnectionStatus(null); // Not local, no monitor
  }
}

function setConnectionStatus(status) {
  connectionStatus = status;
  // Update UI if already displaying a local endpoint
  displayCurrentModel();
}

/**
 * Updates the model indicator UI with the given provider and model
 * 
 * @param {string} provider - The provider name (e.g., 'gemini', 'openai')
 * @param {string} modelName - The model name (e.g., 'gemini-1.5-pro', 'gpt-4')
 * @param {boolean} isLocal - Whether the endpoint is a local deployment
 */
function updateModelIndicatorFull(provider, modelName, isLocal = false) {
  if (!modelIndicatorElement) {
    console.warn('EngageIQ: Cannot update model indicator - element not initialized');
    return;
  }

  if (!provider || !modelName) {
    modelIndicatorElement.style.display = 'none';
    return;
  }

  // Provider display name
  let providerDisplay = '';
  let modelDisplay = '';
  let colorClass = '';

  if (provider === 'openai') {
    providerDisplay = 'OpenAI';
    // Capitalize GPT model name
    if (modelName.startsWith('gpt')) {
      modelDisplay = modelName.replace(/gpt-(\d+(?:\.\d+)?)(-turbo|-preview)?/i, (m, v, t) => `GPT-${v}${t ? t.replace('-', ' ').toUpperCase() : ''}`);
    } else {
      modelDisplay = modelName;
    }
    colorClass = 'text-primary';
  } else if (provider === 'gemini') {
    providerDisplay = 'Gemini';
    // Format as "Gemini 1.5 Pro" from "gemini-1.5-pro"
    if (modelName.includes('gemini')) {
      const parts = modelName.split('-');
      const modelBase = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      modelDisplay = parts.length > 1 ? `${parts.slice(1).join(' ')}` : modelBase;
    } else {
      modelDisplay = modelName;
    }
    colorClass = 'text-info';
  } else {
    providerDisplay = provider.charAt(0).toUpperCase() + provider.slice(1);
    modelDisplay = modelName;
    colorClass = 'text-secondary';
  }

  let localBadge = '';
  let statusBadge = '';
  let helpText = '';

  if (isLocal) {
    localBadge = ' <span class="badge bg-warning text-dark ms-1">Local</span>';
    // Add connection status indicator
    if (connectionStatus === 'connected') {
      statusBadge = ' <span class="badge bg-success ms-1" title="Connected to local server">Connected</span>';
      helpText = '';
    } else if (connectionStatus === 'disconnected') {
      statusBadge = ' <span class="badge bg-danger ms-1" title="Cannot reach local server. Check LM Studio is running and endpoint is correct.">Disconnected</span>';
      helpText = '<span class="form-text text-danger">Cannot reach local LM Studio server. <a href="#" tabindex="-1" class="text-reset text-decoration-underline" data-bs-toggle="tooltip" title="Check that LM Studio is running and the endpoint is correct. See troubleshooting for more info.">Help</a></span>';
    } else if (connectionStatus === 'reconnecting') {
      statusBadge = ' <span class="badge bg-warning text-dark ms-1" title="Reconnecting to local server...">Reconnecting</span>';
      helpText = '<span class="form-text text-warning">Attempting to reconnect to LM Studio server...</span>';
    } else if (connectionStatus === 'checking') {
      statusBadge = ' <span class="badge bg-secondary ms-1" title="Checking local server status...">Checking</span>';
      helpText = '<span class="form-text text-muted">Checking connection to LM Studio...</span>';
    }
  }

  // Bootstrap 5: Use <span> for color, <span class="badge"> for local and status
  modelIndicatorElement.innerHTML = `<span class="${colorClass}">${providerDisplay}: ${modelDisplay}</span>${localBadge}${statusBadge}`;
  if (helpText) {
    modelIndicatorElement.innerHTML += `<br>${helpText}`;
  }
  modelIndicatorElement.style.display = 'inline-block';
}

/**
 * Retrieves and displays the current provider and model in the model indicator
 */
export async function displayCurrentModel() {
  console.log('EngageIQ: Retrieving current provider and model for indicator');
  try {
    const provider = await getApiProvider();
    const modelName = await getCurrentModelByProvider();
    let isLocal = false;
    if (provider === 'openai') {
      // Check endpoint for localhost or 127.0.0.1
      const endpoint = await getOpenAIEndpoint();
      if (endpoint && (endpoint.includes('localhost') || endpoint.includes('127.0.0.1'))) {
        isLocal = true;
      }
    }
    updateModelIndicatorFull(provider, modelName, isLocal);
    console.log(`EngageIQ: Model indicator updated for provider: ${provider}, model: ${modelName}, local: ${isLocal}`);
  } catch (err) {
    console.warn('EngageIQ: Error retrieving provider/model for indicator:', err);
    modelIndicatorElement.textContent = 'Model: Unknown';
    modelIndicatorElement.style.display = 'inline-block';
  }
}
