# EngageIQ - LinkedIn AI Comment Generator

## Description

EngageIQ is a Chrome extension that helps users generate contextually relevant and engaging comments for LinkedIn posts. It uses Google's Gemini AI to analyze post content and suggest comments that match the tone and context of the conversation, saving time and effort while encouraging meaningful engagement on LinkedIn.

## Features

- **AI-Powered Comment Generation**: Generate six different comment suggestions based on LinkedIn's standard reaction types (Like, Celebrate, Support, Love, Insightful, Funny).
- **Contextual Understanding**: Suggestions are based on the specific content of the LinkedIn post.
- **Language Matching**: Comments are generated in the same language as the post.
- **Model Selection**: Choose from different Gemini AI models to optimize for speed, quality, or rate limits.
- **Length Adjustment**: Easily adjust the length of suggestions to be longer or shorter.
- **Seamless Integration**: Simple one-click insertion of chosen comments into LinkedIn's comment field.
- **User-Friendly Interface**: Clean, Bootstrap-styled popup with an intuitive accordion interface.

## Installation Instructions

### From Chrome Web Store (Coming Soon)

1. Visit the Chrome Web Store (link will be provided upon publication)
2. Click "Add to Chrome"
3. Follow the prompts to complete installation

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked"
5. Select the EngageIQ directory
6. The extension should now appear in your extensions list

## Usage

1. **Set Up Your API Key**:

   - Click on the extension options/settings
   - Enter your Gemini API key and save
   - Select your preferred Gemini model from the dropdown menu
   - If you don't have a Gemini API key, you can obtain one from [Google AI Studio](https://makersuite.google.com/app/apikey)

2. **Generate Comments**:

   - Navigate to LinkedIn
   - Find a post you want to comment on
   - Click the EngageIQ icon button near the comment field
   - View the generated comment suggestions in the popup

3. **Customize and Use Comments**:
   - Click on any reaction type to expand and view the suggestion
   - Use the '+' and '-' buttons to adjust comment length
   - Click "Accept" to insert the comment into LinkedIn's comment field
   - Post your comment through LinkedIn as usual

## API Key Requirement

EngageIQ requires a Google Gemini API key to function. You can obtain a key from [Google AI Studio](https://makersuite.google.com/app/apikey). Your API key is stored securely in your browser using Chrome's storage API and is only used to make requests to the Gemini API when you generate or adjust comments.

## Gemini Model Selection

EngageIQ allows you to choose from different Gemini AI models to tailor the experience to your needs:

- **gemini-2.5-pro-exp-03-25**: Latest experimental model with advanced capabilities and highest quality responses. Best for complex content but has more restrictive rate limits (10 QPM, 60 QPD).

- **gemini-2.0-flash** (Default): Offers a good balance of quality and performance with fast response times. Suitable for most users with moderate rate limits (60 QPM, 1,000 QPD).

- **gemini-2.0-flash-lite**: Fastest response times optimized for efficiency. Slightly reduced quality but with the most generous rate limits (120 QPM, 2,000 QPD).

- **gemini-1.5-pro**: Previous generation model with comprehensive understanding. Slower response times with restricted rate limits (10 QPM, 60 QPD).

You can change your model selection at any time through the extension options page.

## Privacy Note

EngageIQ only accesses LinkedIn post content when you explicitly click the generation button. The extension sends this content to the Gemini API (using your API key) to generate comment suggestions. No data is stored on any servers, and all processing happens through your browser and the Gemini API. Your API key is stored securely in your browser's local storage and is never shared with any third parties.

## Known Issues/Limitations

- The extension currently works best on LinkedIn feed and single post pages.
- LinkedIn's DOM structure may change, which could affect the extension's ability to detect comment fields or extract post content. Updates will be provided as needed.
- API rate limits may apply depending on your Gemini API plan.
- The extension requires a valid Gemini API key to function.
- Comment generation quality depends on the clarity and context of the LinkedIn post.

## License

MIT License

Copyright (c) 2025 EngageIQ

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
