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
        
        // Step 5.2.2: Create prompt string with instructions
        console.log("EngageIQ: Creating prompt for Gemini API");
        const prompt = `
          You are an AI assistant helping generate high-quality, contextually relevant comment suggestions for a LinkedIn post.
          
          Here is the LinkedIn post content to analyze:
          "${postContent.text}"
          
          Please generate 6 different comment suggestions, each corresponding to one of LinkedIn's standard reaction types:
          1. Like - A general positive comment about the post content
          2. Celebrate - A comment celebrating an achievement or milestone mentioned
          3. Support - A supportive comment showing empathy or encouragement
          4. Love - A comment expressing appreciation or admiration
          5. Insightful - A comment that adds depth or perspective to the topic
          6. Funny - A light-hearted or humorous comment relevant to the post
          
          Important instructions:
          - Match the language of the post in your responses
          - Make all comments medium length (around 2-3 sentences)
          - Maintain a professional tone appropriate for LinkedIn
          - Ensure comments are unique from each other
          - Never include generic phrases like "Thanks for sharing"
          - Ground comments in the specific content of the post
        `;
        
        // Step 5.2.3: Create requestBody object for fetch
        console.log("EngageIQ: Creating request body for Gemini API");
        const requestBody = {
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          tools: [
            {
              function_declarations: [
                {
                  name: "generateLinkedInComments",
                  description: "Generate 6 comment suggestions for LinkedIn post, each matching a different reaction type",
                  parameters: GENERATION_SCHEMA
                }
              ]
            }
          ],
          tool_config: {
            function_calling_config: {
              mode: "ANY",
              allowed_function_names: ["generateLinkedInComments"]
            }
          },
          safety_settings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        };
        
        console.log("EngageIQ: Gemini API request constructed and ready for fetch call");
        
        // Log that we're still using dummy data for now until Step 5.3 is implemented
        console.log("EngageIQ: Step 5.2 completed, but still returning dummy suggestions until Step 5.3 is implemented");
        
        // This dummy data will be replaced with the actual API call in Step 5.3
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
