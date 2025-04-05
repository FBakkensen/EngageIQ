/**
 * EngageIQ Chrome Extension
 * API Service Module
 * 
 * This module provides functions for interacting with the Gemini API,
 * including request construction, error handling, and response processing.
 */

// Import models and storage utilities
import { 
  GENERATION_SCHEMA, 
  REGENERATION_SCHEMA, 
  DIRECTION_ANALYSIS_SCHEMA,
  DIRECTION_COMMENT_SCHEMA,
  getGenerateContentEndpoint 
} from '../models/gemini-model.js';
import { getApiKey } from '../utils/storage-utils.js';

/**
 * Generates comment suggestions using the Gemini API.
 * 
 * @param {Object} postContent - Object containing the post text and metadata
 * @param {function} sendResponse - Callback function to send response back to the caller
 */
async function generateComments(postContent, sendResponse) {
  console.log('EngageIQ: Processing generate comments request');

  if (!postContent || !postContent.text) {
    console.error('EngageIQ: No post content provided in generate comments request');
    sendResponse({
      success: false,
      error: 'Missing post content',
      details: 'No content was provided to generate comments for',
    });
    return;
  }

  try {
    // Get API key from storage
    const apiKey = await getApiKey();
    if (!apiKey) {
      console.error('EngageIQ: No API key found in storage');
      sendResponse({
        success: false,
        error: 'API Key Missing',
        details: 'Please set your API key in the extension options',
      });
      return;
    }

    console.log('EngageIQ: API key found in storage');

    // Create prompt for Gemini API
    console.log('EngageIQ: Creating prompt for Gemini API');
    const prompt = `
      You are an AI assistant helping generate high-quality, contextually relevant comment suggestions for a LinkedIn post.
      
      Here is the LinkedIn post content to analyze:
      "${postContent.text}"
      
      Please generate 6 different comment suggestions, each corresponding to one of LinkedIn's standard reaction types:
      1. Like - A general positive comment about the post content
      2. Celebrate - A comment celebrating an achievement or milestone mentioned
      3. Support - A comment showing support or encouragement
      4. Love - A comment expressing enthusiasm or appreciation
      5. Insightful - A comment that adds depth or perspective
      6. Funny - A lighthearted or humorous comment (but still professional)
      
      Each comment should be:
      - Professional and appropriate for a business network
      - Contextually relevant to the post content
      - Between 1-3 sentences (not too long)
      - Natural sounding (as if written by a human)
      - Free of excessive emoji use (minimal emoji is ok)
      - Varying in length and style across the different suggestions
      
      Return your suggestions using the provided function call format. Do not include any additional text.
    `;

    // Create request body for Gemini API
    const requestBody = createGenerationRequestBody(prompt);
    console.log('EngageIQ: Gemini API request constructed and ready for fetch call');

    // Make the API call
    const response = await callGeminiAPI(requestBody, apiKey);
    console.log('EngageIQ: Processing Gemini API response');

    // Process the response from the API
    const suggestions = processGenerationResponse(response);
    
    // Format suggestions for UI presentation
    const formattedSuggestions = [
      {
        id: 'like',
        text: suggestions.like,
        tone: 'positive',
        emoji: '👍',
      },
      {
        id: 'celebrate',
        text: suggestions.celebrate,
        tone: 'congratulatory',
        emoji: '🎉',
      },
      {
        id: 'support',
        text: suggestions.support,
        tone: 'supportive',
        emoji: '🙌',
      },
      {
        id: 'love',
        text: suggestions.love,
        tone: 'enthusiastic',
        emoji: '❤️',
      },
      {
        id: 'insightful',
        text: suggestions.insightful,
        tone: 'thoughtful',
        emoji: '💡',
      },
      {
        id: 'funny',
        text: suggestions.funny,
        tone: 'humorous',
        emoji: '😄',
      },
    ];

    // Log the successfully processed suggestions
    console.log('EngageIQ: [api-service] Processed suggestions:', suggestions);

    // Log the final formatted suggestions before sending the response
    console.log('EngageIQ: [api-service] Final formattedSuggestions before sendResponse:', formattedSuggestions);

    // Get current model to return with response
    const endpoint = await getGenerateContentEndpoint();
    const modelMatch = endpoint.match(/models\/([^:]+):/); // Extract model name from endpoint
    const currentModel = modelMatch ? modelMatch[1] : 'unknown';

    // Send success response
    sendResponse({
      success: true,
      suggestions: formattedSuggestions,
      model: currentModel,
    });

  } catch (error) {
    console.error('EngageIQ: Error during comment generation:', error);
    
    // Send error response
    sendResponse({
      success: false,
      error: 'GENERATION_ERROR',
      details: error.message || 'Unknown error during comment generation',
    });
  }
}

/**
 * Regenerates a comment (longer or shorter) using the Gemini API.
 * 
 * @param {string} requestType - 'REGENERATE_LONGER' or 'REGENERATE_SHORTER'
 * @param {Object} payload - Contains originalText and reactionType
 * @param {function} sendResponse - Callback function to send response back to the caller
 */
async function regenerateComment(requestType, payload, sendResponse) {
  console.log(`EngageIQ: Processing ${requestType} request`);

  try {
    // Get API key from storage
    const apiKey = await getApiKey();
    if (!apiKey) {
      console.error('EngageIQ: No API key found in storage for regeneration request');
      sendResponse({
        success: false,
        type: 'REGENERATION_ERROR',
        error: 'API_KEY_MISSING',
        details: 'API key is missing. Please set it in the extension options.',
        payload: { reactionType: payload?.reactionType },
      });
      return;
    }

    console.log('EngageIQ: API key retrieved successfully for regeneration.');

    // Validate payload
    if (!payload || !payload.originalText || !payload.reactionType) {
      console.error('EngageIQ: Invalid payload for regeneration request:', payload);
      sendResponse({
        success: false,
        type: 'REGENERATION_ERROR',
        error: 'INVALID_PAYLOAD',
        details: 'Missing originalText or reactionType in regeneration request.',
        payload: { reactionType: payload?.reactionType },
      });
      return;
    }

    const { originalText, reactionType } = payload;

    // Construct regeneration prompt
    const lengthInstruction = requestType === 'REGENERATE_LONGER' ? 'longer' : 'shorter';
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

    // Create request body for regeneration
    const requestBody = createRegenerationRequestBody(prompt);
    console.log('EngageIQ: Created regeneration request body.');

    // Make the API call
    const response = await callGeminiAPI(requestBody, apiKey);
    console.log('EngageIQ: Processing regeneration API response');

    // Process the regeneration response
    const newText = processRegenerationResponse(response);
    console.log(`EngageIQ: Successfully regenerated comment for ${reactionType}`);

    // Log the successfully processed regenerated comment
    console.log('EngageIQ: [api-service] Processed regenerated comment:', newText);

    // Send success response
    sendResponse({
      success: true,
      type: 'REGENERATION_SUCCESS',
      payload: {
        newText: newText,
        reactionType: reactionType,
      },
    });

  } catch (error) {
    console.error('EngageIQ: Error during regeneration API call or processing:', error);
    sendResponse({
      success: false,
      type: 'REGENERATION_ERROR',
      error: 'API_ERROR',
      details: error.message || 'Unknown regeneration error occurred.',
      payload: {
        reactionType: payload?.reactionType,
      },
    });
  }
}

/**
 * Analyzes post content to generate direction suggestions using Gemini API.
 * 
 * @param {Object} postContent - Object containing the post text and metadata
 * @param {function} sendResponse - Callback function to send response back to the caller
 */
async function analyzeDirections(postContent, sendResponse) {
  console.log('EngageIQ: Processing direction analysis request');

  if (!postContent || !postContent.text) {
    console.error('EngageIQ: No post content provided in direction analysis request');
    sendResponse({
      success: false,
      error: 'Missing post content',
      details: 'No content was provided to analyze for directions',
    });
    return;
  }

  try {
    // Get API key from storage
    const apiKey = await getApiKey();
    if (!apiKey) {
      console.error('EngageIQ: No API key found in storage');
      sendResponse({
        success: false,
        error: 'API Key Missing',
        details: 'Please set your API key in the extension options',
      });
      return;
    }

    console.log('EngageIQ: API key found in storage');

    // Create prompt for direction analysis
    console.log('EngageIQ: Creating prompt for direction analysis');
    const prompt = `
      You are an AI assistant helping analyze a LinkedIn post to suggest different approaches for commenting.
      
      Here is the LinkedIn post content to analyze:
      "${postContent.text}"
      ${postContent.author ? `\nPost author: ${postContent.author}` : ''}
      ${postContent.engagementStats ? `\nPost engagement: ${postContent.engagementStats}` : ''}
      
      Please suggest 3-4 different directions or approaches for commenting on this post.
      Each direction should be distinct and appropriate for a professional networking context.
      
      For each direction, provide:
      1. A concise title (2-4 words)
      2. A brief description explaining the approach (15-25 words)
      3. A single relevant emoji
      
      Return your suggestions using the provided function call format with a 'directions' array. Do not include any additional text.
    `;

    // Create request body with lower temperature for more focused results
    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024
      },
      systemInstruction: {
        parts: [{
          text: 'You are an AI assistant that helps professionals engage effectively on LinkedIn.'
        }]
      },
      functionDeclarations: [
        {
          name: 'suggestDirections',
          description: 'Provide 3-4 distinct directions for commenting on a LinkedIn post',
          parameters: DIRECTION_ANALYSIS_SCHEMA
        }
      ]
    };
    
    console.log('EngageIQ: Direction analysis request constructed and ready for fetch call');

    // Make the API call
    const response = await callGeminiAPI(requestBody, apiKey);
    console.log('EngageIQ: Processing direction analysis response');

    // Process the response from the API
    const directions = processDirectionAnalysisResponse(response);
    
    // Log the successfully processed directions
    console.log('EngageIQ: [api-service] Processed directions:', directions);

    // Send the response
    sendResponse({
      success: true,
      type: 'DIRECTION_ANALYSIS_SUCCESS',
      directions: directions
    });
    
  } catch (error) {
    console.error('EngageIQ: Error in direction analysis:', error);
    sendResponse({
      success: false,
      error: 'Direction Analysis Failed',
      details: error.message || 'An unexpected error occurred while analyzing the post',
    });
  }
}

/**
 * Generates comments based on a selected direction using the Gemini API.
 * 
 * @param {Object} payload - Contains postContent and selectedDirection
 * @param {function} sendResponse - Callback function to send response back to the caller
 */
async function generateDirectionComments(payload, sendResponse) {
  console.log('EngageIQ: Processing direction-based comment generation request');

  if (!payload || !payload.postContent || !payload.postContent.text || !payload.selectedDirection) {
    console.error('EngageIQ: Missing data in direction-based comment generation request');
    sendResponse({
      success: false,
      error: 'Missing required data',
      details: 'Post content or selected direction is missing',
    });
    return;
  }

  const { postContent, selectedDirection } = payload;

  try {
    // Get API key from storage
    const apiKey = await getApiKey();
    if (!apiKey) {
      console.error('EngageIQ: No API key found in storage');
      sendResponse({
        success: false,
        error: 'API Key Missing',
        details: 'Please set your API key in the extension options',
      });
      return;
    }

    console.log('EngageIQ: API key found in storage');

    // Create a brief summary of the post for context
    const postSummary = postContent.text.length > 100 
      ? postContent.text.substring(0, 100) + '...'
      : postContent.text;

    // Create prompt for direction-based comment generation
    console.log('EngageIQ: Creating prompt for direction-based comment generation');
    const prompt = `
      You are an AI assistant helping generate high-quality, contextually relevant comment suggestions for a LinkedIn post.
      
      Generate 3 different comments for this LinkedIn post about ${postSummary}:
      "${postContent.text}"
      ${postContent.author ? `\nPost author: ${postContent.author}` : ''}
      ${postContent.engagementStats ? `\nPost engagement: ${postContent.engagementStats}` : ''}
      
      The comments should focus on the selected direction: "${selectedDirection.title} - ${selectedDirection.description}"
      
      Create three distinct comments with different lengths and perspectives:
      1. Short (1 sentence) - Give this a descriptive title (e.g., 'Quick Reply')
      2. Medium (2-3 sentences) - Give this a descriptive title (e.g., 'Balanced View')
      3. Detailed (4-5 sentences) - Give this a descriptive title (e.g., 'In-depth Comment')
      
      Each comment should be:
      - Professional and appropriate for LinkedIn
      - Contextually relevant to the post content
      - Focused on the selected direction approach
      - Natural sounding (as if written by a human)
      - Free of excessive emoji use
      
      Return your suggestions using the provided function call format with a 'comments' array. Each comment object in the array must have 'type' (short, medium, detailed), 'text' (the comment itself), and 'title' (the descriptive title). Do not include any additional text.
    `;

    // Create request body with higher temperature for more diverse comments
    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024
      },
      systemInstruction: {
        parts: [{
          text: 'You are an AI assistant that helps professionals engage effectively on LinkedIn.'
        }]
      },
      functionDeclarations: [
        {
          name: 'generateDirectionComments',
          description: 'Generate comments for a LinkedIn post based on a selected direction',
          parameters: DIRECTION_COMMENT_SCHEMA
        }
      ]
    };
    
    console.log('EngageIQ: Direction-based comment generation request constructed and ready for fetch call');

    // Make the API call
    const response = await callGeminiAPI(requestBody, apiKey);
    console.log('EngageIQ: Processing direction-based comment generation response');

    // Process the response from the API
    const comments = processDirectionCommentsResponse(response);
    
    // Log the successfully processed comments
    console.log('EngageIQ: [api-service] Processed comments:', comments);

    // Format the comments for UI presentation
    const formattedComments = comments.map(comment => ({
      id: comment.type,
      text: comment.text,
      type: comment.type,
      direction: selectedDirection.title,
      title: comment.title
    }));
    
    // Log the final formatted comments before sending the response
    console.log('EngageIQ: [api-service] Final formattedComments before sendResponse:', formattedComments);

    // Send the response
    sendResponse({
      success: true,
      type: 'DIRECTION_COMMENTS_SUCCESS',
      comments: formattedComments,
      direction: selectedDirection
    });
    
  } catch (error) {
    console.error('EngageIQ: Error in direction-based comment generation:', error);
    sendResponse({
      success: false,
      error: 'Comment Generation Failed',
      details: error.message || 'An unexpected error occurred while generating comments',
    });
  }
}

/**
 * Creates a request body for the comment generation API call.
 * 
 * @param {string} prompt - The prompt text for the API
 * @returns {Object} Request body object
 */
function createGenerationRequestBody(prompt) {
  return {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [
      {
        function_declarations: [
          {
            name: 'generateLinkedInComments',
            description: 'Generate LinkedIn comment suggestions for different reaction types',
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
}

/**
 * Creates a request body for the comment regeneration API call.
 * 
 * @param {string} prompt - The prompt text for the API
 * @returns {Object} Request body object
 */
function createRegenerationRequestBody(prompt) {
  return {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [
      {
        function_declarations: [
          {
            name: 'regenerateComment',
            description: 'Regenerate the provided LinkedIn comment',
            parameters: REGENERATION_SCHEMA,
          },
        ],
      },
    ],
    tool_config: {
      function_calling_config: {
        mode: 'ANY',
        allowed_function_names: ['regenerateComment'],
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
}

/**
 * Makes a call to the Gemini API.
 * 
 * @param {Object} requestBody - The request body to send
 * @param {string} apiKey - The API key to use for the request
 * @returns {Object} The parsed JSON response
 * @throws {Error} If the API call fails
 */
async function callGeminiAPI(requestBody, apiKey) {
  // Get the API endpoint URL
  const apiUrl = await getGenerateContentEndpoint();
  const fullApiUrl = `${apiUrl}?key=${apiKey}`;
  
  console.log('EngageIQ: Executing API call to Gemini');
  
  // Execute the fetch call
  const response = await fetch(fullApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  
  // Handle error responses
  if (!response.ok) {
    console.error(`EngageIQ: API call failed with status ${response.status}`);
    
    // Handle specific error status codes
    let errorMessage;
    switch (response.status) {
      case 400:
        errorMessage = 'Bad Request: The API request was malformed or invalid';
        break;
      case 401:
      case 403:
        errorMessage = 'Authentication Error: Invalid or expired API key';
        break;
      case 404:
        errorMessage = 'Model Not Found: The selected Gemini model may not exist or be deprecated';
        break;
      case 429:
        errorMessage = 'Rate Limit Exceeded: Too many requests to the Gemini API';
        break;
      case 500:
      case 501:
      case 502:
      case 503:
      case 504:
        errorMessage = 'Gemini API Server Error: The service is currently unavailable';
        break;
      default:
        errorMessage = `Unexpected Error: HTTP status ${response.status}`;
    }
    
    // Get more details from response text if available
    try {
      const errorText = await response.text();
      console.error(`EngageIQ: API error details: ${errorText}`);
      throw new Error(`${errorMessage}. Details: ${errorText}`);
    } catch (textError) {
      // If we can't get the response text, just throw with the status message
      throw new Error(errorMessage);
    }
  }
  
  // Parse and return JSON response
  return await response.json();
}

/**
 * Processes the API response from a comment generation request.
 * 
 * @param {Object} data - The API response data
 * @returns {Object} The extracted comments object
 * @throws {Error} If the response format is invalid
 */
function processGenerationResponse(data) {
  // Check for candidate data
  if (!data || !data.candidates || data.candidates.length === 0) {
    console.error('EngageIQ: Invalid response format - no candidates found');
    throw new Error('Invalid response format: No candidates found');
  }
  
  const candidate = data.candidates[0];
  
  // Check finish reason
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    console.error(`EngageIQ: Generation stopped due to ${candidate.finishReason}`);
    throw new Error(`Generation stopped: ${candidate.finishReason}`);
  }
  
  // Check for safety blocks
  if (data.promptFeedback && data.promptFeedback.blockReason && data.promptFeedback.blockReason !== 'NONE') {
    console.error(`EngageIQ: Prompt blocked due to ${data.promptFeedback.blockReason}`);
    throw new Error(`Prompt blocked: ${data.promptFeedback.blockReason}`);
  }
  
  // Extract function call
  if (!candidate.content || !candidate.content.parts || 
      candidate.content.parts.length === 0 || 
      !candidate.content.parts[0].functionCall) {
    console.error('EngageIQ: Invalid response format - functionCall not found');
    throw new Error('Invalid response format: Function call data not found');
  }
  
  const functionCall = candidate.content.parts[0].functionCall;
  
  // Verify function name
  if (functionCall.name !== 'generateLinkedInComments') {
    console.error(`EngageIQ: Unexpected function name: ${functionCall.name}`);
    throw new Error(`Unexpected function name: ${functionCall.name}`);
  }
  
  // Extract and parse arguments
  let args = functionCall.args;
  
  // Parse args if it's a string
  if (typeof args === 'string') {
    try {
      args = JSON.parse(args);
    } catch (error) {
      console.error('EngageIQ: Failed to parse args string:', error);
      throw new Error('Failed to parse response data');
    }
  }
  
  // Validate structure
  if (!args || !args.comments) {
    console.error('EngageIQ: Missing comments object in response');
    throw new Error('Invalid response format: Missing comments object');
  }
  
  const comments = args.comments;
  
  // Validate all required reaction types
  const requiredTypes = ['like', 'celebrate', 'support', 'love', 'insightful', 'funny'];
  const missingTypes = requiredTypes.filter(type => !comments[type]);
  
  if (missingTypes.length > 0) {
    console.error(`EngageIQ: Missing comment types in response: ${missingTypes.join(', ')}`);
    throw new Error(`Missing comment types: ${missingTypes.join(', ')}`);
  }
  
  // Log the successfully processed comments
  console.log('EngageIQ: [api-service] Processed comments:', comments);

  return comments;
}

/**
 * Processes the API response from a comment regeneration request.
 * 
 * @param {Object} data - The API response data
 * @returns {string} The regenerated comment text
 * @throws {Error} If the response format is invalid
 */
function processRegenerationResponse(data) {
  // Check for candidate data
  if (!data || !data.candidates || data.candidates.length === 0) {
    console.error('EngageIQ: Invalid regeneration response format - no candidates found');
    throw new Error('Invalid response format: No candidates found');
  }
  
  const candidate = data.candidates[0];
  
  // Check finish reason
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    console.error(`EngageIQ: Regeneration stopped due to ${candidate.finishReason}`);
    throw new Error(`Generation stopped: ${candidate.finishReason}`);
  }
  
  // Check for safety blocks
  if (data.promptFeedback && data.promptFeedback.blockReason && data.promptFeedback.blockReason !== 'NONE') {
    console.error(`EngageIQ: Regeneration prompt blocked due to ${data.promptFeedback.blockReason}`);
    throw new Error(`Prompt blocked: ${data.promptFeedback.blockReason}`);
  }
  
  // Extract function call
  if (!candidate.content || !candidate.content.parts || 
      candidate.content.parts.length === 0 || 
      !candidate.content.parts[0].functionCall) {
    console.error('EngageIQ: Invalid regeneration response format - functionCall not found');
    throw new Error('Invalid response format: Function call data not found');
  }
  
  const functionCall = candidate.content.parts[0].functionCall;
  
  // Verify function name
  if (functionCall.name !== 'regenerateComment') {
    console.error(`EngageIQ: Unexpected regeneration function name: ${functionCall.name}`);
    throw new Error(`Unexpected function name: ${functionCall.name}`);
  }
  
  // Extract and parse arguments
  let args = functionCall.args;
  
  // Parse args if it's a string
  if (typeof args === 'string') {
    try {
      args = JSON.parse(args);
    } catch (error) {
      console.error('EngageIQ: Failed to parse regeneration args string:', error);
      throw new Error('Failed to parse response data');
    }
  }
  
  // Validate structure
  if (!args || !args.regeneratedComment) {
    console.error('EngageIQ: Missing regeneratedComment in response');
    throw new Error('Invalid response format: Missing regeneratedComment');
  }
  
  // Log the successfully processed regenerated comment
  console.log('EngageIQ: [api-service] Processed regenerated comment:', args.regeneratedComment);

  return args.regeneratedComment;
}

/**
 * Processes the API response from a direction analysis request.
 * 
 * @param {Object} data - The API response data
 * @returns {Array} The extracted directions array
 * @throws {Error} If the response format is invalid
 */
function processDirectionAnalysisResponse(data) {
  // Check for candidate data
  if (!data || !data.candidates || data.candidates.length === 0) {
    console.error('EngageIQ: Invalid response format - no candidates found');
    throw new Error('Invalid response format: No candidates found');
  }
  
  const candidate = data.candidates[0];
  
  // Check finish reason
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    console.error(`EngageIQ: Analysis stopped due to ${candidate.finishReason}`);
    throw new Error(`Analysis stopped: ${candidate.finishReason}`);
  }
  
  // Extract function call
  if (!candidate.content || !candidate.content.parts || 
      candidate.content.parts.length === 0 || 
      !candidate.content.parts[0].functionCall) {
    console.error('EngageIQ: Invalid response format - functionCall not found');
    throw new Error('Invalid response format: Function call data not found');
  }
  
  const functionCall = candidate.content.parts[0].functionCall;
  
  // Verify function name
  if (functionCall.name !== 'suggestDirections') {
    console.error(`EngageIQ: Unexpected function name: ${functionCall.name}`);
    throw new Error(`Unexpected function name: ${functionCall.name}`);
  }
  
  // Extract and parse arguments
  let args = functionCall.args;
  
  // Parse args if it's a string
  if (typeof args === 'string') {
    try {
      args = JSON.parse(args);
    } catch (error) {
      console.error('EngageIQ: Failed to parse args string:', error);
      throw new Error('Failed to parse response data');
    }
  }
  
  // Validate structure
  if (!args || !args.directions || !Array.isArray(args.directions)) {
    console.error('EngageIQ: Missing directions array in response');
    throw new Error('Invalid response format: Missing directions array');
  }
  
  // Ensure each direction maintains its original language context
  const directions = args.directions.map(direction => ({
    ...direction,
    headerText: direction.headerText || `Choose a commenting approach` // Fallback
  }));
  
  // Log the successfully processed directions
  console.log('EngageIQ: [api-service] Processed directions:', directions);

  return directions;
}

/**
 * Processes the API response from a direction-based comment generation request.
 * 
 * @param {Object} data - The API response data
 * @returns {Array} The extracted comments array
 * @throws {Error} If the response format is invalid
 */
function processDirectionCommentsResponse(data) {
  // Check for candidate data
  if (!data || !data.candidates || data.candidates.length === 0) {
    console.error('EngageIQ: Invalid response format - no candidates found');
    throw new Error('Invalid response format: No candidates found');
  }
  
  const candidate = data.candidates[0];
  
  // Check finish reason
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    console.error(`EngageIQ: Generation stopped due to ${candidate.finishReason}`);
    throw new Error(`Generation stopped: ${candidate.finishReason}`);
  }
  
  // Extract function call
  if (!candidate.content || !candidate.content.parts || 
      candidate.content.parts.length === 0 || 
      !candidate.content.parts[0].functionCall) {
    console.error('EngageIQ: Invalid response format - functionCall not found');
    throw new Error('Invalid response format: Function call data not found');
  }
  
  const functionCall = candidate.content.parts[0].functionCall;
  
  // Verify function name
  if (functionCall.name !== 'generateDirectionComments') {
    console.error(`EngageIQ: Unexpected function name: ${functionCall.name}`);
    throw new Error(`Unexpected function name: ${functionCall.name}`);
  }
  
  // Extract and parse arguments
  let args = functionCall.args;
  
  // Parse args if it's a string
  if (typeof args === 'string') {
    try {
      args = JSON.parse(args);
    } catch (error) {
      console.error('EngageIQ: Failed to parse args string:', error);
      throw new Error('Failed to parse response data');
    }
  }
  
  // Validate structure
  if (!args || !args.comments || !Array.isArray(args.comments)) {
    console.error('EngageIQ: Missing comments array in response');
    throw new Error('Invalid response format: Missing comments array');
  }
  
  // Validate that we have all required comment types and titles
  const requiredTypes = ['short', 'medium', 'detailed'];
  const missingTypes = requiredTypes.filter(type => 
    !args.comments.some(comment => comment.type === type && comment.title)
  );
  
  if (missingTypes.length > 0) {
    console.error(`EngageIQ: Missing comment types or titles in response: ${missingTypes.join(', ')}`);
    throw new Error(`Missing comment data: ${missingTypes.join(', ')}`);
  }
  
  // Log the successfully processed comments
  console.log('EngageIQ: [api-service] Processed comments:', args.comments);

  return args.comments;
}

// Export functions for use by other modules
export { 
  generateComments,
  regenerateComment,
  analyzeDirections,
  generateDirectionComments,
  callGeminiAPI
};
