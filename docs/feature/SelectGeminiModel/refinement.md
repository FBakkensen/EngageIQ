# Feature Refinement: Gemini Model Selection in Options Pane

**Document Version:** 1.0
**Date:** 2025-04-02
**Status:** Draft

## Overview
This document outlines the refinement of the EngageIQ Chrome Extension to include a model selection feature in the options pane, allowing users to choose between different Gemini AI models for comment generation.

## Background
Currently, the EngageIQ extension uses a fixed Gemini model (`gemini-2.0-flash`) for generating LinkedIn comment suggestions. This model is defined as a constant in the background.js file. Providing users with the ability to select different models will enhance flexibility and allow for different performance/quality tradeoffs.

## Feature Requirements

### Functional Requirements
1. **Model Selection UI**
   - Add a dropdown selection component to the options page
   - Include the following Gemini model options:
     - gemini-2.5-pro-exp-03-25
     - gemini-2.0-flash (current default)
     - gemini-2.0-flash-lite
     - gemini-1.5-pro
   - Provide brief descriptions of each model's characteristics

2. **Settings Persistence**
   - Save the selected model preference to Chrome storage
   - Load the saved preference when the options page is opened
   - Default to "gemini-2.0-flash" if no preference is saved

3. **Model Application**
   - Use the selected model for all API calls to Gemini
   - Apply the model selection to both initial comment generation and regeneration requests

4. **Rate Limit Information**
   - Include information about different rate limits for each model
   - Provide guidance on model selection based on usage patterns

### Non-Functional Requirements
1. **User Experience**
   - Provide clear, concise descriptions of each model option
   - Include tooltips explaining the tradeoffs (speed vs. quality)
   - Ensure the UI is consistent with the existing options page design

2. **Performance Considerations**
   - Document expected response time differences between models
   - Note potential cost implications of different models (if applicable)

## Technical Design Considerations

### Storage
- Store the model preference in Chrome's sync storage alongside the API key
- Key: `geminiModel`
- Value: String identifier of the selected model (e.g., "gemini-2.5-pro-exp-03-25")

### Background Script Changes
- Replace the hardcoded `GEMINI_MODEL` constant with a dynamic value retrieved from storage
- Implement a fallback to the default model if no preference is found
- Update the API URL construction to use the selected model
- Ensure model selection is applied to both initial generation and regeneration requests

### Options Page Changes
- Add the model selection dropdown after the API key input
- Include descriptive text about each model option
- Update the save functionality to include the model preference
- Add rate limit information for each model

## User Interface Mockup
+---------------------------------------+ 
| EngageIQ Settings                     | 
| Configure your settings here.         | 
|                                       | 
| Gemini API Key                        |
| [••••••••••••••••••••••••••••••] 🔒   |
|                                       | 
| Gemini Model                          | 
| [gemini-2.0-flash (Default) ▼]        | 
| Select the Gemini model to use for    | 
| generating comments.                  | 
|                                       | 
| [Save Settings]                       | 
|                                       | 
| Settings saved successfully!          | 
+---------------------------------------+


## Model Descriptions and Recommendations

### Recommended Model: gemini-2.0-flash
Based on the current implementation and usage patterns of EngageIQ, I recommend keeping `gemini-2.0-flash` as the default model for the following reasons:
- Excellent balance of speed and quality for comment generation
- Optimized for quick responses, which is important for a good user experience
- Sufficient capabilities for understanding LinkedIn post context and generating relevant comments
- More generous rate limits compared to the Pro models
- Already proven to work well in the current implementation

### All Model Options:

1. **gemini-2.5-pro-exp-03-25**
   - Latest experimental model with advanced capabilities
   - Highest quality responses with nuanced understanding
   - Best for complex, technical, or specialized content
   - Slower response times compared to Flash models
   - Most restrictive rate limits
   - **Best for**: Users who prioritize quality over speed and don't generate many comments per day

2. **gemini-2.0-flash** (Recommended Default)
   - Fast response times
   - Good balance of quality and performance
   - Optimized for efficiency in common scenarios
   - More generous rate limits than Pro models
   - **Best for**: Most users who want reliable, quick comment suggestions

3. **gemini-2.0-flash-lite**
   - Fastest response times of all models
   - Lightweight model optimized for efficiency
   - Slightly reduced quality compared to standard Flash
   - Most generous rate limits
   - **Best for**: Users who generate many comments and prioritize speed

4. **gemini-1.5-pro**
   - Previous generation full-capability model
   - Comprehensive understanding of context
   - Slower response times than Flash models
   - Restricted rate limits similar to 2.5 Pro
   - **Best for**: Users who prefer the 1.5 architecture for specific use cases

## Rate Limit Considerations
Different Gemini models have varying rate limits that may affect user experience:

| Model                     | Queries per Minute (QPM) | Queries per Day (QPD) |
|---------------------------|--------------------------|-----------------------|
| gemini-2.5-pro-exp-03-25  | 10 QPM                   | 60 QPD                |
| gemini-2.0-flash          | 60 QPM                   | 1,000 QPD             |
| gemini-2.0-flash-lite     | 120 QPM                  | 2,000 QPD             |
| gemini-1.5-pro            | 10 QPM                   | 60 QPD                |

*Note: Rate limits are approximate and subject to change by Google. Users should refer to the official Gemini API documentation for the most up-to-date information.*

## Implementation Considerations
- The change should be backward compatible with existing saved API keys
- Clear feedback should be provided when settings are saved
- Consider adding a small info icon with a tooltip next to the dropdown for additional model information
- Ensure proper error handling if an invalid or deprecated model is stored
- Add a note about rate limits to help users make informed decisions

## Visual Indicator for Active Model
Consider adding a small indicator in the popup UI that shows which model is currently being used. This could be:
- A small text label at the bottom of the popup
- A model-specific icon or color scheme
- A tooltip on hover over the EngageIQ logo in the popup

## Testing Plan
1. Verify dropdown displays correctly in the options page
2. Confirm model selection is saved to Chrome storage
3. Validate that the selected model is correctly used in API calls
4. Test with each model to ensure compatibility
5. Verify behavior when switching between models
6. Test rate limit scenarios (simulated) to ensure proper error handling

## Next Steps
1. Finalize the model list and descriptions based on stakeholder feedback
2. Create detailed technical specifications for implementation
3. Implement the feature according to the approved design
4. Test thoroughly with all supported models
5. Document the feature for users in the extension's help resources