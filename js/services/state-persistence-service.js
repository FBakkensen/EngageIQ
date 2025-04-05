/**
 * EngageIQ Chrome Extension
 * State Persistence Service Module - Handles saving and restoring state during navigation
 *
 * This module is responsible for:
 * - Saving selected direction in session storage
 * - Preserving generated comments between navigation
 * - Managing state persistence during user session
 */

// Log module load confirmation
console.log('EngageIQ: State Persistence Service Module Loaded');

// Storage keys
const STORAGE_KEYS = {
  POST_CONTENT: 'engageiq_current_post',
  DIRECTIONS: 'engageiq_directions',
  SELECTED_DIRECTION: 'engageiq_selected_direction',
  SUGGESTIONS: 'engageiq_suggestions',
  LAST_STATE: 'engageiq_last_state'
};

/**
 * Saves the current post content to session storage
 * @param {Object} postContent - The current post content
 */
export function savePostContent(postContent) {
  if (!postContent) {
    console.warn('EngageIQ: Cannot save empty post content');
    return;
  }
  
  try {
    sessionStorage.setItem(STORAGE_KEYS.POST_CONTENT, JSON.stringify(postContent));
    console.log('EngageIQ: Post content saved to session storage');
  } catch (error) {
    console.error('EngageIQ: Error saving post content to session storage:', error);
  }
}

/**
 * Retrieves the saved post content from session storage
 * @returns {Object|null} The saved post content or null if not found
 */
export function getPostContent() {
  try {
    const savedContent = sessionStorage.getItem(STORAGE_KEYS.POST_CONTENT);
    if (!savedContent) return null;
    
    return JSON.parse(savedContent);
  } catch (error) {
    console.error('EngageIQ: Error retrieving post content from session storage:', error);
    return null;
  }
}

/**
 * Saves the generated directions to session storage
 * @param {Array} directions - Array of direction objects
 */
export function saveDirections(directions) {
  if (!directions || !Array.isArray(directions)) {
    console.warn('EngageIQ: Cannot save invalid directions');
    return;
  }
  
  try {
    sessionStorage.setItem(STORAGE_KEYS.DIRECTIONS, JSON.stringify(directions));
    console.log('EngageIQ: Directions saved to session storage');
  } catch (error) {
    console.error('EngageIQ: Error saving directions to session storage:', error);
  }
}

/**
 * Retrieves the saved directions from session storage
 * @returns {Array|null} The saved directions or null if not found
 */
export function getDirections() {
  try {
    const savedDirections = sessionStorage.getItem(STORAGE_KEYS.DIRECTIONS);
    if (!savedDirections) return null;
    
    return JSON.parse(savedDirections);
  } catch (error) {
    console.error('EngageIQ: Error retrieving directions from session storage:', error);
    return null;
  }
}

/**
 * Saves the selected direction to session storage
 * @param {Object} direction - The selected direction object
 */
export function saveSelectedDirection(direction) {
  if (!direction) {
    console.warn('EngageIQ: Cannot save empty selected direction');
    return;
  }
  
  try {
    sessionStorage.setItem(STORAGE_KEYS.SELECTED_DIRECTION, JSON.stringify(direction));
    console.log('EngageIQ: Selected direction saved to session storage');
  } catch (error) {
    console.error('EngageIQ: Error saving selected direction to session storage:', error);
  }
}

/**
 * Retrieves the saved selected direction from session storage
 * @returns {Object|null} The saved selected direction or null if not found
 */
export function getSelectedDirection() {
  try {
    const savedDirection = sessionStorage.getItem(STORAGE_KEYS.SELECTED_DIRECTION);
    if (!savedDirection) return null;
    
    return JSON.parse(savedDirection);
  } catch (error) {
    console.error('EngageIQ: Error retrieving selected direction from session storage:', error);
    return null;
  }
}

/**
 * Saves the generated suggestions to session storage
 * @param {Array} suggestions - Array of suggestion objects
 */
export function saveSuggestions(suggestions) {
  if (!suggestions || !Array.isArray(suggestions)) {
    console.warn('EngageIQ: Cannot save invalid suggestions');
    return;
  }
  
  try {
    sessionStorage.setItem(STORAGE_KEYS.SUGGESTIONS, JSON.stringify(suggestions));
    console.log('EngageIQ: Suggestions saved to session storage');
  } catch (error) {
    console.error('EngageIQ: Error saving suggestions to session storage:', error);
  }
}

/**
 * Retrieves the saved suggestions from session storage
 * @returns {Array|null} The saved suggestions or null if not found
 */
export function getSuggestions() {
  try {
    const savedSuggestions = sessionStorage.getItem(STORAGE_KEYS.SUGGESTIONS);
    if (!savedSuggestions) return null;
    
    return JSON.parse(savedSuggestions);
  } catch (error) {
    console.error('EngageIQ: Error retrieving suggestions from session storage:', error);
    return null;
  }
}

/**
 * Saves the current UI state to session storage
 * @param {string} state - The current UI state
 */
export function saveLastState(state) {
  if (!state) {
    console.warn('EngageIQ: Cannot save empty state');
    return;
  }
  
  try {
    sessionStorage.setItem(STORAGE_KEYS.LAST_STATE, state);
    console.log(`EngageIQ: Last state (${state}) saved to session storage`);
  } catch (error) {
    console.error('EngageIQ: Error saving last state to session storage:', error);
  }
}

/**
 * Retrieves the saved UI state from session storage
 * @returns {string|null} The saved UI state or null if not found
 */
export function getLastState() {
  try {
    return sessionStorage.getItem(STORAGE_KEYS.LAST_STATE);
  } catch (error) {
    console.error('EngageIQ: Error retrieving last state from session storage:', error);
    return null;
  }
}

/**
 * Clears all stored data from the current session
 */
export function clearSession() {
  try {
    Object.values(STORAGE_KEYS).forEach(key => sessionStorage.removeItem(key));
    console.log('EngageIQ: Session storage cleared');
  } catch (error) {
    console.error('EngageIQ: Error clearing session storage:', error);
  }
}

/**
 * Checks if a current session exists with valid data
 * @returns {boolean} True if a valid session exists, false otherwise
 */
export function hasActiveSession() {
  const postContent = getPostContent();
  const lastState = getLastState();
  
  return !!postContent && !!lastState;
}
