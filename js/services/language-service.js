/**
 * EngageIQ Chrome Extension
 * Language Detection Service
 * 
 * This service is responsible for detecting the language of a given text using the Gemini API.
 */

import { callGeminiAPI } from './api-service.js';

// Standard safety settings (consistent with other services)
const standardSafetySettings = [
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
];

const DEFAULT_LANGUAGE_CODE = 'en';

/**
 * Detects the primary language of the provided text using the Gemini API.
 * 
 * @param {string} postText The text content to analyze.
 * @returns {Promise<string>} The detected language code (e.g., "en", "da"). Defaults to "en".
 */
export async function detectLanguage(postText) {
  // Step 2.3: Input Validation
  if (!postText || typeof postText !== 'string' || postText.trim().length === 0) {
    console.warn('EngageIQ: [Language Service] Invalid or empty input provided for language detection. Defaulting to ', DEFAULT_LANGUAGE_CODE);
    return DEFAULT_LANGUAGE_CODE;
  }

  // Step 2.4: Construct the language detection prompt
  const prompt = `Identify the predominant language of the following text and return only its two-letter ISO 639-1 code (e.g., 'en' for English, 'da' for Danish, 'es' for Spanish). Do not include any other text, explanations, or formatting. Just return the code.

Text:
"${postText}"`;

  // Step 2.5: Prepare the API request payload
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    safety_settings: standardSafetySettings,
    // No generationConfig needed for this type of request usually, but check if API requires it
    // No tools or tool_config needed
  };

  try {
    // Step 2.6: Implement the API call
    const response = await callGeminiAPI(payload, 'Language Detection');

    // Step 2.7: Parse and extract the text response
    const candidate = response?.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
        console.error(`EngageIQ: [Language Service] Language detection stopped due to ${candidate.finishReason}`);
        // Potentially check for safety block reason
        if (candidate.finishReason === 'SAFETY') {
            console.error('EngageIQ: [Language Service] Blocked due to safety settings.');
        }
        throw new Error(`Language detection stopped unexpectedly: ${candidate.finishReason}`);
    }

    const extractedText = candidate?.content?.parts?.[0]?.text;

    if (!extractedText) {
      console.error('EngageIQ: [Language Service] Failed to extract text from API response.', response);
      throw new Error('Missing text content in language detection API response.');
    }
    
    // Step 2.8: Validate and clean the extracted language code
    const potentialCode = extractedText.trim().toLowerCase();
    const languageCodeRegex = /^[a-z]{2}$/;

    if (languageCodeRegex.test(potentialCode)) {
      console.log(`EngageIQ: [Language Service] Detected language code: ${potentialCode}`);
      return potentialCode;
    } else {
      console.warn(`EngageIQ: [Language Service] Invalid language code format received: "${extractedText}". Defaulting to ${DEFAULT_LANGUAGE_CODE}.`);
      return DEFAULT_LANGUAGE_CODE;
    }

  } catch (error) {
    // Step 2.9: Implement error handling and default return
    console.error('EngageIQ: [Language Service] Error during language detection:', error);
    console.warn(`EngageIQ: [Language Service] Defaulting to language code: ${DEFAULT_LANGUAGE_CODE}`);
    return DEFAULT_LANGUAGE_CODE;
  }
}
