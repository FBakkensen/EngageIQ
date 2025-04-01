/**
 * EngageIQ Chrome Extension
 * Background Script - Service worker that runs in the background
 */

console.log("EngageIQ Background Script Loaded");

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background script received message:", message);
  
  // Will be expanded in later steps according to the plan
  
  return true; // Indicates we'll respond asynchronously
});
