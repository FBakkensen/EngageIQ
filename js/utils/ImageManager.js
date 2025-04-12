// ImageManager.js
// Main module for managing images in the EngageIQ extension

import { ImageContextDebug } from './ImageContextDebug.js';
import { ImageSelector } from './ImageSelector.js';
import { ImageValidator } from './ImageValidator.js';
import { ImageProcessor } from './ImageProcessor.js';

/**
 * Result object for image extraction
 */
const ImageExtractionResult = {
  SUCCESS: 'success',
  NO_IMAGES: 'no_images',
  VALIDATION_FAILED: 'validation_failed',
  PROCESSING_FAILED: 'processing_failed',
  ERROR: 'error'
};

/**
 * Extract processable images from a LinkedIn post
 * @param {Element} postElement - The LinkedIn post element
 * @returns {Promise<Object>} Result object with extracted image data
 */
async function extractImagesFromPost(postElement) {
  try {
    if (!postElement) {
      return {
        success: false,
        resultType: ImageExtractionResult.ERROR,
        message: 'No post element provided'
      };
    }

    // Find images in the post
    const images = ImageSelector.findPostImages(postElement);

    if (!images || images.length === 0) {
      ImageContextDebug.logInfo('No images found in post');
      return {
        success: false,
        resultType: ImageExtractionResult.NO_IMAGES,
        message: 'No images found in post'
      };
    }

    ImageContextDebug.logInfo(`Found ${images.length} images in post`);

    // Validate and process images
    const validationResults = await ImageValidator.validateImages(images);

    // Filter for only valid images
    const validImages = images.filter((_, index) => validationResults[index].valid);

    if (validImages.length === 0) {
      ImageContextDebug.logWarning('No valid images found in post');
      return {
        success: false,
        resultType: ImageExtractionResult.VALIDATION_FAILED,
        message: 'No valid images found in post',
        validationResults
      };
    }

    ImageContextDebug.logInfo(`${validImages.length} valid images found in post`);

    // Process valid images to base64
    const processingOptions = {
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.85,
      maxSizeBytes: 2 * 1024 * 1024 // 2MB for API transmission
    };

    const processingResults = await ImageProcessor.processImages(validImages, processingOptions);

    // Filter for successfully processed images
    const processedImages = processingResults.filter(result => result.success);

    if (processedImages.length === 0) {
      ImageContextDebug.logWarning('Failed to process any images from post');
      return {
        success: false,
        resultType: ImageExtractionResult.PROCESSING_FAILED,
        message: 'Failed to process any images from post',
        processingResults
      };
    }

    // Return successfully processed images
    return {
      success: true,
      resultType: ImageExtractionResult.SUCCESS,
      message: `Successfully processed ${processedImages.length} images`,
      processedImages,
      totalFound: images.length,
      validCount: validImages.length,
      processedCount: processedImages.length,
      processingResults
    };

  } catch (error) {
    ImageContextDebug.logError(`Error extracting images from post: ${error.message}`, error);
    return {
      success: false,
      resultType: ImageExtractionResult.ERROR,
      message: `Error extracting images: ${error.message}`,
      error
    };
  }
}

/**
 * Extract useful information about the post containing images
 * @param {Element} postElement - The LinkedIn post element
 * @returns {Object} Post metadata including author, text content, etc.
 */
function extractPostMetadata(postElement) {
  try {
    if (!postElement) {
      return { success: false, message: 'No post element provided' };
    }

    // Extract post text content
    let postText = '';
    const textContainer = postElement.querySelector('.feed-shared-update-v2__description');
    if (textContainer) {
      postText = textContainer.textContent.trim();
    }

    // Extract author information
    let authorName = '';
    let authorTitle = '';
    let authorProfileUrl = '';

    // Try to find author name (with multiple selector strategies)
    const authorNameElement =
      postElement.querySelector('.update-components-actor__title .hoverable-link-text') ||
      postElement.querySelector('.update-components-actor__meta .hoverable-link-text') ||
      postElement.querySelector('.update-components-actor__name');

    if (authorNameElement) {
      authorName = authorNameElement.textContent.trim();
    }

    // Try to find author title/description
    const authorTitleElement = postElement.querySelector('.update-components-actor__description');
    if (authorTitleElement) {
      authorTitle = authorTitleElement.textContent.trim();
    }

    // Try to find author profile URL
    const authorLinkElement = postElement.querySelector('.update-components-actor__meta-link') ||
                             postElement.querySelector('.update-components-actor__image');
    if (authorLinkElement && authorLinkElement.href) {
      authorProfileUrl = authorLinkElement.href;
    }

    // Get post timestamp if available
    let timestamp = '';
    const timestampElement = postElement.querySelector('.update-components-actor__sub-description');
    if (timestampElement) {
      const timestampText = timestampElement.textContent.trim();
      // Extract time part (e.g., "1w", "2d", etc.)
      const timeMatch = timestampText.match(/(\d+[wdhm])/i);
      timestamp = timeMatch ? timeMatch[1] : timestampText;
    }

    return {
      success: true,
      postText,
      author: {
        name: authorName,
        title: authorTitle,
        profileUrl: authorProfileUrl
      },
      timestamp,
      url: window.location.href
    };
  } catch (error) {
    ImageContextDebug.logError(`Error extracting post metadata: ${error.message}`, error);
    return {
      success: false,
      message: `Error extracting post metadata: ${error.message}`,
      error
    };
  }
}

/**
 * Full extraction of post content with images and metadata
 * @param {Element} postElement - The LinkedIn post element
 * @returns {Promise<Object>} Complete post data including images and metadata
 */
async function extractPostContent(postElement) {
  try {
    // Extract metadata
    const metadata = extractPostMetadata(postElement);

    // Extract images
    const imageResult = await extractImagesFromPost(postElement);

    return {
      success: metadata.success && imageResult.success,
      hasImages: imageResult.success,
      metadata,
      images: imageResult.success ? imageResult.processedImages : [],
      imageResults: imageResult
    };
  } catch (error) {
    ImageContextDebug.logError(`Error extracting post content: ${error.message}`, error);
    return {
      success: false,
      message: `Error extracting post content: ${error.message}`,
      error
    };
  }
}

/**
 * Debug function that extracts content from all visible LinkedIn posts
 * @returns {Promise<Object>} Extraction results
 */
async function debugExtractAllPosts() {
  console.log('%c[ImageManager Debug]', 'color: #673AB7; font-weight: bold',
              'Extracting content from all visible LinkedIn posts...');

  // Force debug mode
  const oldDebugMode = ImageContextDebug.isEnabled();
  ImageContextDebug.enableDebug();

  try {
    // Find all posts
    const posts = document.querySelectorAll('.feed-shared-update-v2');
    console.log('%c[ImageManager Debug]', 'color: #673AB7; font-weight: bold',
                `Found ${posts.length} posts to analyze`);

    const results = [];

    // Process each post
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      console.log('%c[ImageManager Debug]', 'color: #673AB7; font-weight: bold',
                  `Analyzing post #${i + 1}:`);

      // Extract content
      const content = await extractPostContent(post);
      results.push(content);

      console.log('%c[ImageManager Debug]', 'color: #673AB7; font-weight: bold',
                  `Post #${i + 1} extraction ${content.success ? 'successful' : 'failed'}`);

      if (content.success) {
        console.log('Author:', content.metadata.author.name);
        console.log('Title:', content.metadata.author.title);
        console.log('Post text preview:', content.metadata.postText.substring(0, 100) + '...');
        console.log('Images:', content.images.length);

        // Show image previews if present
        if (content.images.length > 0) {
          console.group('Images:');
          content.images.forEach((img, idx) => {
            console.log(`Image #${idx + 1}: ${img.width}x${img.height}, ${img.sizeKB}KB`);

            // Show small preview
            const previewImg = new Image();
            previewImg.src = img.base64Data;
            previewImg.style.maxWidth = '100px';
            previewImg.style.maxHeight = '100px';
            console.log('Preview:', previewImg);
          });
          console.groupEnd();
        }
      } else {
        console.log('Error:', content.message || 'Failed to extract content');
      }

      console.log('----------------------------');
    }

    // Summary
    const successful = results.filter(r => r.success).length;

    console.log('%c[ImageManager Debug]', 'color: #673AB7; font-weight: bold',
                `Processed ${posts.length} posts: ${successful} successful, ${posts.length - successful} failed`);

    // Restore original debug mode
    if (!oldDebugMode) {
      ImageContextDebug.disableDebug();
    }

    return {
      success: true,
      totalPosts: posts.length,
      successfulPosts: successful,
      failedPosts: posts.length - successful,
      postResults: results
    };

  } catch (error) {
    console.error('%c[ImageManager Debug]', 'color: #F44336; font-weight: bold',
                  'Error processing posts:', error);

    // Restore original debug mode
    if (!oldDebugMode) {
      ImageContextDebug.disableDebug();
    }

    return {
      success: false,
      message: `Debug error: ${error.message}`,
      error
    };
  }
}

// Export as a module
export const ImageManager = {
  extractImagesFromPost,
  extractPostMetadata,
  extractPostContent,
  debugExtractAllPosts,
  ImageExtractionResult
};

// Export for direct import
export {
  extractImagesFromPost,
  extractPostMetadata,
  extractPostContent,
  debugExtractAllPosts,
  ImageExtractionResult
};