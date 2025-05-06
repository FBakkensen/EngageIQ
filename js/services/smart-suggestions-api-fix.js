/**
 * This function contains the improved JSON parsing logic for handling code fences in OpenAI responses.
 * It should be used to update the existing code in smart-suggestions-api.js
 */
export async function generateDirectionComments(direction, postContent, languageCode) {
  console.log('EngageIQ: Generating comments for selected direction');
  
  try {
    // Prepare request data
    const model = await getCurrentModelByProvider();
    const temperature = getModelTemperature(model);
    
    if (!direction || !direction.title) {
      throw createBaseApiError(
        ERROR_TYPES.INTERNAL,
        'Direction information is missing or invalid',
        'Please select a valid direction'
      );
    }
    
    if (!postContent || !postContent.text) {
      throw createBaseApiError(
        ERROR_TYPES.INTERNAL,
        'Post content is missing or invalid',
        'Please try again with a valid post'
      );
    }
    
    // Validate or default language code
    const targetLanguageCode = languageCode && typeof languageCode === 'string' && languageCode.length === 2 ? languageCode : 'en';
    console.log(`EngageIQ: [api-service] Generating comments for direction: ${direction.title} in language: ${targetLanguageCode}`);
    
    // Process post text to extract meaningful content
    const processedText = cleanPostContent(postContent.text);
    
    // Create the prompt text
    const promptText = createPromptText(direction.title, processedText, targetLanguageCode);
    
    // Build the API request payload
    const payload = {
      contents: [
        {
          parts: [
            {
              text: promptText
            }
          ]
        }
      ],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: 1024, // Adjust as needed for text response
      },
    };
    
    // Make the API request with retry logic
    const request = {
      operation: 'generateDirectionComments',
      payload,
      model,
    };
    const response = await callApiProvider(request, { operation: 'Generate Direction Comments' });
    
    // --- New Logic: Parse raw text response ---
    let rawTextResponse;
    let commentsArray;
    try {
      if (!response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error('EngageIQ: Missing text content in API response.', response);
        throw new Error('Missing text content in API response.');
      }
      rawTextResponse = response.candidates[0].content.parts[0].text.trim();
      
      // Remove <think>...</think> blocks if present
      rawTextResponse = rawTextResponse.replace(/<think>[\s\S]*?<\/think>\s*/g, '');
      
      // IMPROVED: Extract JSON content from markdown code blocks if present
      let cleanedText = rawTextResponse;
      
      // Check if the response contains a code block
      const codeBlockMatch = rawTextResponse.match(/```(?:json)?([\s\S]*?)```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        // Use the content inside the code block
        cleanedText = codeBlockMatch[1].trim();
      } else {
        // Otherwise try to remove code fences if they exist
        cleanedText = cleanedText.replace(/```json\s*/g, '');
        cleanedText = cleanedText.replace(/```\s*/g, '');
        cleanedText = cleanedText.trim();
      }
      
      // Attempt to parse the raw text as JSON
      commentsArray = JSON.parse(cleanedText);
      
      // Basic validation
      if (!Array.isArray(commentsArray)) {
         throw new Error('Parsed response is not an array.');
      }

    } catch (parseError) {
       console.error('EngageIQ: Failed to parse JSON from text response:', parseError);
       console.error('EngageIQ: Raw text received:', rawTextResponse); // Log the text that failed parsing
       throw createBaseApiError(
         ERROR_TYPES.PARSING,
         `Failed to parse comment suggestions from API response. Details: ${parseError.message}`,
         'Try again or select a different direction'
       );
    }
    // --- End New Logic ---
    
    // Format the suggestions
    const formattedSuggestions = formatSuggestions(commentsArray);
    
    // Return the formatted suggestions
    console.log(`EngageIQ: Successfully generated ${formattedSuggestions.length} comment suggestions`);
    return {
      success: true,
      suggestions: formattedSuggestions,
      usedDirection: direction.title
    };
    
  } catch (error) {
    console.error('EngageIQ: [api-service] Error in generateDirectionComments:', error);
    console.error('EngageIQ: Error generating direction comments:', error);
    return handleApiError(error, 'comment generation');
  }
}
