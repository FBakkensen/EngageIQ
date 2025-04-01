/**
 * EngageIQ Chrome Extension
 * Background Script - Service worker that runs in the background
 */

console.log("EngageIQ: Background Script Loaded");

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("EngageIQ: Background script received message:", message);
  
  // Handle different message types with switch statement
  switch (message.type) {
    case 'GENERATE_COMMENTS': {
      console.log("EngageIQ: Processing GENERATE_COMMENTS request");
      
      // Extract post content from message
      const postContent = message.postContent;
      if (!postContent) {
        console.error("EngageIQ: No post content provided in GENERATE_COMMENTS request");
        sendResponse({
          success: false,
          error: 'Missing post content',
          details: 'No content was provided to generate comments for'
        });
        return true;
      }
      
      // Get API key from storage
      chrome.storage.sync.get(['apiKey'], (result) => {
        if (!result.apiKey) {
          console.error("EngageIQ: No API key found in storage");
          sendResponse({
            success: false,
            error: 'API Key Missing',
            details: 'Please set your API key in the extension options'
          });
          return;
        }
        
        // Log key presence (not the actual key for security)
        console.log("EngageIQ: API key found in storage");
        
        // Create dummy suggestions response
        // This will be replaced with actual API calls in later phases
        const dummySuggestions = [
          {
            id: 'suggestion-1',
            text: 'Great insights shared in this post! I particularly appreciate the point about ' + 
                  postContent.text.substring(0, 30) + '... Have you considered how this applies in different industries?',
            tone: 'professional',
            length: 'medium'
          },
          {
            id: 'suggestion-2',
            text: 'Thanks for sharing these thoughts! This resonates with some work we\'ve been doing at my company.',
            tone: 'friendly',
            length: 'short'
          },
          {
            id: 'suggestion-3',
            text: 'This is a fascinating perspective. I\'ve been researching this topic recently and found that ' + 
                  'many professionals are shifting towards the approach you\'ve outlined. Would love to discuss this ' + 
                  'further and perhaps collaborate on some ideas.',
            tone: 'enthusiastic',
            length: 'long'
          }
        ];
        
        // Send success response with dummy suggestions
        console.log("EngageIQ: Sending dummy suggestions as response");
        sendResponse({
          success: true,
          suggestions: dummySuggestions
        });
      });
      
      // Return true to indicate we'll respond asynchronously
      return true;
    }
      
    // Ready for future message types to be added in subsequent phases
    default: {
      console.warn("EngageIQ: Unknown message type received:", message.type);
      sendResponse({
        success: false,
        error: 'Unknown Command',
        details: `The command '${message.type}' is not recognized`
      });
      return true;
    }
  }
});
