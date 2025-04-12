// ImageContextDebug.js
// Debug utility for image context feature development and troubleshooting

/**
 * Constants for debug settings
 */
const STORAGE_KEY = 'engageiq_image_context_debug';
const LOG_PREFIX = '[ImageContext]';

// Add verification log on module load
console.log(`${LOG_PREFIX} Module loaded, detecting environment...`);

/**
 * Determine if code is running in service worker context
 * @returns {boolean} True if in service worker context
 */
function isServiceWorkerContext() {
  const isServiceWorker = (typeof window === 'undefined') || 
         (typeof localStorage === 'undefined') ||
         (typeof self !== 'undefined' && self.constructor && self.constructor.name === 'ServiceWorkerGlobalScope');
  
  // Log the environment detection result
  console.log(`${LOG_PREFIX} Environment detection: ${isServiceWorker ? 'Service Worker' : 'Browser/Content Script'} context`);
  
  return isServiceWorker;
}

/**
 * Get value from appropriate storage based on context
 * @param {string} key - Key to retrieve
 * @param {function} callback - Callback for async storage (for service worker context)
 * @returns {Promise<string|null>} Value from storage, null if not found or pending
 */
function getStorageValue(key, callback) {
  if (isServiceWorkerContext()) {
    // In service worker context, use chrome.storage.local
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([key], result => {
        const value = result[key] || null;
        if (callback) callback(value);
        return value;
      });
      return null; // Return null since this is async
    }
    return null;
  } else {
    // In content script or UI context, use localStorage
    try {
      const value = localStorage.getItem(key);
      if (callback) callback(value);
      return value;
    } catch (e) {
      console.error(`${LOG_PREFIX} Error accessing localStorage:`, e);
      return null;
    }
  }
}

/**
 * Set value in appropriate storage based on context
 * @param {string} key - Key to set
 * @param {any} value - Value to store
 * @returns {Promise<boolean>} True if successful
 */
function setStorageValue(key, value) {
  if (isServiceWorkerContext()) {
    // In service worker context, use chrome.storage.local
    if (chrome && chrome.storage && chrome.storage.local) {
      const data = {};
      data[key] = value;
      return chrome.storage.local.set(data);
    }
    return false;
  } else {
    // In content script or UI context, use localStorage
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.error(`${LOG_PREFIX} Error setting localStorage:`, e);
      return false;
    }
  }
}

/**
 * Helper to check if debug mode is enabled
 * @param {function} callback - Callback for async check (service worker context)
 * @returns {boolean|void} True if debug mode is enabled, void if async
 */
function isEnabled(callback) {
  if (isServiceWorkerContext() && callback) {
    getStorageValue(STORAGE_KEY, value => {
      callback(value === 'true');
    });
    return;
  }
  return getStorageValue(STORAGE_KEY) === 'true';
}

/**
 * Enable debug mode
 */
function enableDebug() {
  setStorageValue(STORAGE_KEY, 'true');
  console.log(`${LOG_PREFIX} Debug mode enabled`);
}

/**
 * Disable debug mode
 */
function disableDebug() {
  setStorageValue(STORAGE_KEY, 'false');
  console.log(`${LOG_PREFIX} Debug mode disabled`);
}

/**
 * Toggle debug mode
 * @param {function} callback - Optional callback with new state (for service worker context)
 * @returns {boolean|void} New state (true if enabled) or void if async
 */
function toggleDebug(callback) {
  if (isServiceWorkerContext() && callback) {
    isEnabled(currentState => {
      const newState = !currentState;
      setStorageValue(STORAGE_KEY, newState);
      console.log(`${LOG_PREFIX} Debug mode ${newState ? 'enabled' : 'disabled'}`);
      callback(newState);
    });
    return;
  } else {
    const newState = !isEnabled();
    setStorageValue(STORAGE_KEY, newState);
    console.log(`${LOG_PREFIX} Debug mode ${newState ? 'enabled' : 'disabled'}`);
    return newState;
  }
}

/**
 * Log info message when debug mode is enabled
 * @param {string} message - The message to log
 * @param {any} data - Optional data to include in the log
 */
function logInfo(message, data) {
  // For performance in service worker, avoid storage access if possible
  if (isServiceWorkerContext()) {
    // Always log in service worker for now, could be made async
    if (data !== undefined) {
      console.log(`${LOG_PREFIX} ${message}`, data);
    } else {
      console.log(`${LOG_PREFIX} ${message}`);
    }
    return;
  }
  
  // Normal path for content scripts
  if (!isEnabled()) return;

  if (data !== undefined) {
    console.log(`${LOG_PREFIX} ${message}`, data);
  } else {
    console.log(`${LOG_PREFIX} ${message}`);
  }
}

/**
 * Log warning message when debug mode is enabled
 * @param {string} message - The message to log
 * @param {any} data - Optional data to include in the log
 */
function logWarning(message, data) {
  // For performance in service worker, avoid storage access if possible
  if (isServiceWorkerContext()) {
    // Always log warnings in service worker for now
    if (data !== undefined) {
      console.warn(`${LOG_PREFIX} ${message}`, data);
    } else {
      console.warn(`${LOG_PREFIX} ${message}`);
    }
    return;
  }
  
  if (!isEnabled()) return;

  if (data !== undefined) {
    console.warn(`${LOG_PREFIX} ${message}`, data);
  } else {
    console.warn(`${LOG_PREFIX} ${message}`);
  }
}

/**
 * Log error message when debug mode is enabled
 * @param {string} message - The message to log
 * @param {any} data - Optional data to include in the log
 */
function logError(message, data) {
  // Always log errors regardless of debug mode
  if (data !== undefined) {
    console.error(`${LOG_PREFIX} ${message}`, data);
  } else {
    console.error(`${LOG_PREFIX} ${message}`);
  }
}

/**
 * Initialize debug features when the module loads
 */
function initialize() {
  // Service worker initialization
  if (isServiceWorkerContext()) {
    console.log(`${LOG_PREFIX} Initialized in service worker context`);
    return;
  }
  
  // Browser context initialization
  if (isEnabled()) {
    console.log(`${LOG_PREFIX} Debug mode is active`);
  }

  // Make debug functions available in global scope when in a window context
  if (typeof window !== 'undefined') {
    // Ensure EngageIQ namespace exists
    window.EngageIQ = window.EngageIQ || {};
    window.EngageIQ.debug = window.EngageIQ.debug || {};

    // Add debug functions to global namespace
    window.EngageIQ.debug.toggleImageContext = toggleDebug;
  }
}

// Run initialization when module loads
initialize();

// Export as a module
export const ImageContextDebug = {
  isEnabled,
  enableDebug,
  disableDebug,
  toggleDebug,
  logInfo,
  logWarning,
  logError
};

// Export for direct import where needed
export {
  isEnabled,
  enableDebug,
  disableDebug,
  toggleDebug,
  logInfo,
  logWarning,
  logError
};
