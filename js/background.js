/**
 * EngageIQ Chrome Extension
 * Background Script - Service worker that runs in the background
 */

// API Configuration Constants
const GEMINI_MODEL = 'gemini-2.0-flash'; // Using Gemini 2.0 Flash for faster responses
const GEMINI_API_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_GENERATE_CONTENT_ENDPOINT = `${GEMINI_API_BASE_URL}/${GEMINI_MODEL}:generateContent`; // Will append ?key=API_KEY when making the request

// JSON Schema for Gemini API function calling - defines the expected structure of the response
const GENERATION_SCHEMA = {
  type: 'object',
  properties: {
    comments: {
      type: 'object',
      properties: {
        like: {
          type: 'string',
          description: "Comment suggestion for 'Like' reaction.",
        },
        celebrate: {
          type: 'string',
          description: "Comment suggestion for 'Celebrate' reaction.",
        },
        support: {
          type: 'string',
          description: "Comment suggestion for 'Support' reaction.",
        },
        love: {
          type: 'string',
          description: "Comment suggestion for 'Love' reaction.",
        },
        insightful: {
          type: 'string',
          description: "Comment suggestion for 'Insightful' reaction.",
        },
        funny: {
          type: 'string',
          description: "Comment suggestion for 'Funny' reaction.",
        },
      },
      required: ['like', 'celebrate', 'support', 'love', 'insightful', 'funny'],
    },
  },
  required: ['comments'],
};

// Define schema for length adjustment requests as well
// const LENGTH_ADJUSTMENT_SCHEMA = { // ESLint: Commented out as unused (no-unused-vars)
//   type: 'object',
//   properties: {
//     regeneratedComment: {
//       type: 'string',
//       description: 'The regenerated comment with adjusted length.'
//     }
//   },
//   required: ['regeneratedComment']
// };

// Step 7.1.4: Define REGENERATION_SCHEMA constant
const REGENERATION_SCHEMA = {
  type: 'object',
  properties: {
    regeneratedComment: {
      type: 'string',
      description: 'The regenerated comment with adjusted length.',
    },
  },
  required: ['regeneratedComment'],
};

// Response handling constants - these represent the different sub-steps in the generation process
// const GENERATION_STEPS = { // ESLint: Commented out as unused (no-unused-vars)
//   EXTRACT_POST_CONTENT: 'Extracting and analyzing LinkedIn post content',
//   GENERATE_SUGGESTIONS: 'Generating personalized comment suggestions',
//   FORMAT_RESPONSES: 'Formatting responses for different engagement styles',
//   FINAL_VALIDATION: 'Performing final validation and quality checks'
// };

console.log('EngageIQ: Background Script Loaded');

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('EngageIQ: Background script received message:', message);

  // Handle different message types with switch statement
  switch (message.type) {
    case 'GENERATE_COMMENTS': {
      console.log('EngageIQ: Processing GENERATE_COMMENTS request');

      // Extract post content from message
      const postContent = message.postContent;
      if (!postContent) {
        console.error(
          'EngageIQ: No post content provided in GENERATE_COMMENTS request'
        );
        sendResponse({
          success: false,
          error: 'Missing post content',
          details: 'No content was provided to generate comments for',
        });
        return true;
      }

      // Get API key from storage
      chrome.storage.sync.get(['apiKey'], (result) => {
        if (!result.apiKey) {
          console.error('EngageIQ: No API key found in storage');
          sendResponse({
            success: false,
            error: 'API Key Missing',
            details: 'Please set your API key in the extension options',
          });
          return;
        }

        // Log key presence (not the actual key for security)
        console.log('EngageIQ: API key found in storage');

        // Step 5.2.2: Create prompt string with instructions
        console.log('EngageIQ: Creating prompt for Gemini API');
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
        console.log('EngageIQ: Creating request body for Gemini API');
        const requestBody = {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          tools: [
            {
              function_declarations: [
                {
                  name: 'generateLinkedInComments',
                  description:
                    'Generate 6 comment suggestions for LinkedIn post, each matching a different reaction type',
                  parameters: GENERATION_SCHEMA,
                },
              ],
            },
          ],
          tool_config: {
            function_calling_config: {
              mode: 'ANY',
              allowed_function_names: ['generateLinkedInComments'],
            },
          },
          safety_settings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
          ],
        };

        console.log(
          'EngageIQ: Gemini API request constructed and ready for fetch call'
        );

        console.log('EngageIQ: Executing API call to Gemini');

        // Construct the full API URL with the API key
        const apiUrl = `${GEMINI_GENERATE_CONTENT_ENDPOINT}?key=${result.apiKey}`;

        // Execute the fetch call
        fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Note: Using API key in URL query parameter instead of x-goog-api-key header
            // as it's simpler for extension contexts and both are secure over HTTPS
          },
          body: JSON.stringify(requestBody),
        })
          // Sub-step 5.4.1: Implement .then(response => ...) block
          .then((response) => {
            // Sub-step 5.4.2: Check response.ok and handle specific status codes
            if (!response.ok) {
              console.error(
                `EngageIQ: API call failed with status ${response.status}`
              );

              // Handle specific error status codes
              let errorMessage;
              switch (response.status) {
                case 400:
                  errorMessage =
                    'Bad Request: The API request was malformed or invalid';
                  break;
                case 401:
                case 403:
                  errorMessage =
                    'Authentication Error: Invalid or expired API key';
                  break;
                case 429:
                  errorMessage =
                    'Rate Limit Exceeded: Too many requests to the Gemini API';
                  break;
                case 500:
                case 501:
                case 502:
                case 503:
                case 504:
                  errorMessage =
                    'Gemini API Server Error: The service is currently unavailable';
                  break;
                default:
                  errorMessage = `Unexpected Error: HTTP status ${response.status}`;
              }

              // Get more details from response text if available
              return response.text().then((errorText) => {
                console.error(`EngageIQ: API error details: ${errorText}`);
                throw new Error(errorMessage);
              });
            }

            // Parse JSON response if status is OK
            return response.json();
          })
          .then((data) => {
            console.log('EngageIQ: Received API response');

            // Sub-step 5.5.2: Navigate response structure
            if (!data || !data.candidates || data.candidates.length === 0) {
              console.error(
                'EngageIQ: Invalid response format - no candidates found'
              );
              throw new Error('Invalid response format: No candidates found');
            }

            const candidate = data.candidates[0];

            // Sub-step 5.5.3: Check finishReason (SAFETY blocks, etc)
            if (candidate.finishReason && candidate.finishReason !== 'STOP') {
              console.error(
                `EngageIQ: Generation stopped due to ${candidate.finishReason}`
              );
              throw new Error(`Generation stopped: ${candidate.finishReason}`);
            }

            // Check promptFeedback for safety issues
            if (
              data.promptFeedback &&
              data.promptFeedback.blockReason &&
              data.promptFeedback.blockReason !== 'NONE'
            ) {
              console.error(
                `EngageIQ: Prompt blocked due to ${data.promptFeedback.blockReason}`
              );
              throw new Error(
                `Prompt blocked: ${data.promptFeedback.blockReason}`
              );
            }

            // Extract functionCall and args
            if (
              !candidate.content ||
              !candidate.content.parts ||
              candidate.content.parts.length === 0 ||
              !candidate.content.parts[0].functionCall
            ) {
              console.error(
                'EngageIQ: Invalid response format - functionCall not found'
              );
              throw new Error(
                'Invalid response format: Function call data not found'
              );
            }

            const functionCall = candidate.content.parts[0].functionCall;

            if (functionCall.name !== 'generateLinkedInComments') {
              console.error(
                `EngageIQ: Unexpected function name: ${functionCall.name}`
              );
              throw new Error(`Unexpected function name: ${functionCall.name}`);
            }

            // Extract and validate args
            let args = functionCall.args;

            // Check if args is a string and parse it if needed
            if (typeof args === 'string') {
              try {
                args = JSON.parse(args);
              } catch (error) {
                console.error('EngageIQ: Failed to parse args string:', error);
                throw new Error('Failed to parse response data');
              }
            }

            // Validate structure (.comments object exists)
            if (!args || !args.comments) {
              console.error('EngageIQ: Missing comments object in response');
              throw new Error(
                'Invalid response format: Missing comments object'
              );
            }

            const comments = args.comments;

            // Validate all required reaction types exist
            const requiredTypes = [
              'like',
              'celebrate',
              'support',
              'love',
              'insightful',
              'funny',
            ];
            const missingTypes = requiredTypes.filter(
              (type) => !comments[type]
            );

            if (missingTypes.length > 0) {
              console.error(
                `EngageIQ: Missing comment types in response: ${missingTypes.join(', ')}`
              );
              throw new Error(
                `Missing comment types: ${missingTypes.join(', ')}`
              );
            }

            // Format the response expected by the content script
            const formattedSuggestions = [
              {
                id: 'like',
                text: comments.like,
                tone: 'positive',
                length: 'medium',
              },
              {
                id: 'celebrate',
                text: comments.celebrate,
                tone: 'celebratory',
                length: 'medium',
              },
              {
                id: 'support',
                text: comments.support,
                tone: 'supportive',
                length: 'medium',
              },
              {
                id: 'love',
                text: comments.love,
                tone: 'appreciative',
                length: 'medium',
              },
              {
                id: 'insightful',
                text: comments.insightful,
                tone: 'thoughtful',
                length: 'medium',
              },
              {
                id: 'funny',
                text: comments.funny,
                tone: 'humorous',
                length: 'medium',
              },
            ];

            console.log('EngageIQ: Successfully parsed API response');

            // Send success response with real suggestions
            sendResponse({
              success: true,
              suggestions: formattedSuggestions,
            });
          })
          // Sub-step 5.4.3: Implement .catch(error => ...) block
          .catch((error) => {
            // Log network or processing error
            console.error('EngageIQ: Error during API call:', error);

            // Determine if it's a network error or a handled HTTP error
            const errorMessage =
              error.message || 'Unknown network or processing error';

            // Send error response back to content script
            sendResponse({
              success: false,
              error: 'GENERATION_ERROR',
              details: errorMessage,
            });
          });
      });

      // Return true to indicate we'll respond asynchronously
      return true;
    }

    // Step 7.1.1: Add REGENERATE_LONGER and REGENERATE_SHORTER cases
    case 'REGENERATE_LONGER':
    case 'REGENERATE_SHORTER': {
      console.log(`EngageIQ: Processing ${message.type} request`);
      // Step 7.1.1 / 7.1.2: Call handler function
      handleRegenerationRequest(message.type, message.payload, sendResponse);
      // Step 7.1.1: Return true for async response
      return true;
    }

    // Ready for future message types to be added in subsequent phases
    default: {
      console.warn('EngageIQ: Unknown message type received:', message.type);
      sendResponse({
        success: false,
        error: 'Unknown Command',
        details: `The command '${message.type}' is not recognized`,
      });
      return true;
    }
  }
});

// Step 7.1.2: Create handleRegenerationRequest function
/**
 * Handles requests to regenerate comments (longer or shorter).
 * Retrieves API key and prepares for the API call (actual call implemented later).
 * @param {string} requestType - The type of regeneration request ('REGENERATE_LONGER' or 'REGENERATE_SHORTER').
 * @param {object} payload - Data associated with the request (e.g., original comment, post content).
 * @param {function} sendResponse - Callback function to send the response asynchronously.
 */
function handleRegenerationRequest(requestType, payload, sendResponse) {
  console.log(
    `EngageIQ: Entering handleRegenerationRequest for ${requestType}`
  );

  // Step 7.1.3: Retrieve API key
  chrome.storage.sync.get(['apiKey'], (result) => {
    if (chrome.runtime.lastError) {
      // Handle potential errors accessing storage
      console.error(
        'EngageIQ: Error retrieving API key from storage:',
        chrome.runtime.lastError
      );
      sendResponse({
        success: false,
        type: 'REGENERATION_ERROR', // Consistent error type
        error: 'STORAGE_ERROR',
        details: 'Failed to access Chrome storage to retrieve API key.',
        payload: { reactionType: payload?.reactionType }, // Include reactionType if available
      });
      return;
    }

    if (!result.apiKey) {
      // Step 7.1.3: Handle missing key error
      console.error(
        'EngageIQ: No API key found in storage for regeneration request'
      );
      sendResponse({
        success: false,
        type: 'REGENERATION_ERROR', // Consistent error type
        error: 'API_KEY_MISSING',
        details: 'API key is missing. Please set it in the extension options.',
        payload: { reactionType: payload?.reactionType }, // Include reactionType
      });
      return; // Stop execution if key is missing
    }

    const apiKey = result.apiKey;
    console.log('EngageIQ: API key retrieved successfully for regeneration.');

    // --- Start Implementation of 7.1.5 - 7.1.9 ---

    // Ensure payload contains necessary data
    if (!payload || !payload.originalText || !payload.reactionType) {
      console.error(
        'EngageIQ: Invalid payload for regeneration request:',
        payload
      );
      sendResponse({
        success: false,
        type: 'REGENERATION_ERROR',
        error: 'INVALID_PAYLOAD',
        details:
          'Missing originalText or reactionType in regeneration request.',
        payload: { reactionType: payload?.reactionType },
      });
      return;
    }

    const { originalText, reactionType } = payload;

    // Step 7.1.5: Construct regeneration prompt
    const lengthInstruction =
      requestType === 'REGENERATE_LONGER' ? 'longer' : 'shorter';
    const prompt = `
      You are an AI assistant helping refine a comment for a LinkedIn post.
      The original comment provided is for the '${reactionType}' reaction.
      Original comment: "${originalText}"

      Please regenerate this comment to make it ${lengthInstruction} (roughly 1 sentence ${lengthInstruction} than the original).
      Maintain the original tone, language, and professional style suitable for LinkedIn.
      Focus solely on adjusting the length based on the original comment's content and intent.
      Output the single regenerated comment using the provided function tool.
    `;
    console.log('EngageIQ: Constructed regeneration prompt.');

    // Step 7.1.6: Create requestBody for regeneration
    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      tools: [
        {
          function_declarations: [
            {
              name: 'regenerateComment', // Function name for the tool
              description: `Regenerate the provided LinkedIn comment to be ${lengthInstruction}`,
              parameters: REGENERATION_SCHEMA, // Use the schema defined earlier (Sub-step 7.1.4)
            },
          ],
        },
      ],
      tool_config: {
        function_calling_config: {
          mode: 'ANY',
          allowed_function_names: ['regenerateComment'], // Match the function name above
        },
      },
      // Re-use safety settings from the initial generation for consistency
      safety_settings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
      ],
    };
    console.log('EngageIQ: Created regeneration request body.');

    // Step 7.1.7: Perform fetch call to Gemini API
    const apiUrl = `${GEMINI_GENERATE_CONTENT_ENDPOINT}?key=${apiKey}`;
    console.log(`EngageIQ: Performing regeneration API call to ${apiUrl}`);

    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })
      // Step 7.1.8: Handle fetch response/errors (Initial check)
      .then((response) => {
        if (!response.ok) {
          console.error(
            `EngageIQ: Regeneration API call failed with status ${response.status}`
          );
          // Attempt to get more details from the response body
          return response
            .text()
            .then((errorText) => {
              console.error(`EngageIQ: API error details: ${errorText}`);
              // Throw an error that will be caught by the .catch block
              throw new Error(
                `API Error: Status ${response.status}. ${errorText ? errorText.substring(0, 150) : 'No details available.'}`
              );
            })
            .catch((parsingError) => {
              // Handle cases where reading the error text fails
              console.error(
                `EngageIQ: Could not parse error response body: ${parsingError}`
              );
              throw new Error(
                `API Error: Status ${response.status}. Failed to get error details.`
              );
            });
        }
        // If response is ok, parse JSON
        return response.json();
      })
      // Step 7.1.9: Parse successful response
      .then((data) => {
        console.log('EngageIQ: Received regeneration API response:', data);

        // Basic validation of response structure
        if (!data || !data.candidates || data.candidates.length === 0) {
          throw new Error('Invalid API response format: No candidates found.');
        }
        const candidate = data.candidates[0];

        // Check finishReason
        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
          throw new Error(
            `Generation stopped unexpectedly: ${candidate.finishReason}`
          );
        }

        // Check promptFeedback for safety issues
        if (
          data.promptFeedback &&
          data.promptFeedback.blockReason &&
          data.promptFeedback.blockReason !== 'NONE'
        ) {
          throw new Error(
            `Prompt blocked by safety filters: ${data.promptFeedback.blockReason}`
          );
        }

        // Extract function call details
        if (
          !candidate.content ||
          !candidate.content.parts ||
          candidate.content.parts.length === 0 ||
          !candidate.content.parts[0].functionCall
        ) {
          throw new Error(
            'Invalid API response format: Function call data not found.'
          );
        }
        const functionCall = candidate.content.parts[0].functionCall;

        // Verify the correct function was called
        if (functionCall.name !== 'regenerateComment') {
          throw new Error(
            `Unexpected function called by API: ${functionCall.name}`
          );
        }

        // Extract arguments
        let args = functionCall.args;
        if (typeof args === 'string') {
          try {
            args = JSON.parse(args);
          } catch (e) {
            throw new Error('Failed to parse function arguments string.');
          }
        }

        // Validate the expected argument is present
        if (!args || !args.regeneratedComment) {
          throw new Error(
            "Invalid API response format: Missing 'regeneratedComment' in arguments."
          );
        }

        const newText = args.regeneratedComment;
        console.log(
          `EngageIQ: Successfully regenerated comment for ${reactionType}`
        );

        // Send success response back to the caller (content script)
        sendResponse({
          success: true,
          type: 'REGENERATION_SUCCESS', // Specific type for content script handling
          payload: {
            newText: newText,
            reactionType: reactionType, // Pass back the reactionType for UI update
          },
        });
      })
      // Step 7.1.8: Handle fetch errors (Catch block for fetch/parsing/validation errors)
      .catch((error) => {
        console.error(
          'EngageIQ: Error during regeneration API call or processing:',
          error
        );
        sendResponse({
          success: false,
          type: 'REGENERATION_ERROR', // Consistent error type
          error: 'API_ERROR', // General API error category
          details: error.message || 'Unknown regeneration error occurred.',
          payload: {
            // Include reactionType in error payload for context
            reactionType: reactionType,
          },
        });
      });

    // --- End Implementation of 7.1.5 - 7.1.9 ---
  }); // End of chrome.storage.sync.get callback
}

// Optional: Listener for extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('EngageIQ: Extension installed or updated:', details.reason);
  
  // Perform manifest and asset verification
  if (details.reason === 'install' || details.reason === 'update') {
    console.log('EngageIQ: Running manifest and asset verification...');
    // We'll execute the verification script in the next update cycle
    setTimeout(() => {
      chrome.scripting.executeScript({
        target: { tabId: -1 }, // Run in the background context
        files: ['js/manifest_check.js']
      }).catch(err => {
        console.error('EngageIQ: Error executing manifest check script:', err);
      });
    }, 1000);
  }
});
