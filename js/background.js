/**
 * EngageIQ Chrome Extension
 * Background Script - Service worker that runs in the background
 */

// API Configuration Constants
const GEMINI_MODEL = 'gemini-2.0-flash'; // Using Gemini 2.0 Flash for faster responses
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_GENERATE_CONTENT_ENDPOINT = `${GEMINI_API_BASE_URL}/${GEMINI_MODEL}:generateContent`; // Will append ?key=API_KEY when making the request

// JSON Schema for Gemini API function calling - defines the expected structure of the response
const GENERATION_SCHEMA = {
  type: 'object',
  properties: {
    comments: {
      type: 'object',
      properties: {
        like: { type: 'string', description: 'Comment suggestion for \'Like\' reaction.' },
        celebrate: { type: 'string', description: 'Comment suggestion for \'Celebrate\' reaction.' },
        support: { type: 'string', description: 'Comment suggestion for \'Support\' reaction.' },
        love: { type: 'string', description: 'Comment suggestion for \'Love\' reaction.' },
        insightful: { type: 'string', description: 'Comment suggestion for \'Insightful\' reaction.' },
        funny: { type: 'string', description: 'Comment suggestion for \'Funny\' reaction.' }
      },
      required: ['like', 'celebrate', 'support', 'love', 'insightful', 'funny']
    }
  },
  required: ['comments']
};

// Define schema for length adjustment requests as well
const LENGTH_ADJUSTMENT_SCHEMA = {
  type: 'object',
  properties: {
    regeneratedComment: {
      type: 'string',
      description: 'The regenerated comment with adjusted length.'
    }
  },
  required: ['regeneratedComment']
};

// Response handling constants - these represent the different sub-steps in the generation process
const GENERATION_STEPS = {
  EXTRACT_POST_CONTENT: 'Extracting and analyzing LinkedIn post content',
  GENERATE_SUGGESTIONS: 'Generating personalized comment suggestions',
  FORMAT_RESPONSES: 'Formatting responses for different engagement styles',
  FINAL_VALIDATION: 'Performing final validation and quality checks'
};

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
