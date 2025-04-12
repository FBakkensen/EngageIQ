// ImageProcessor.js
// Utility for processing and converting images for API transmission

import { ImageContextDebug } from './ImageContextDebug.js';
import { ImageValidator } from './ImageValidator.js';

/**
 * Constants for image processing
 */
const DEFAULT_MAX_WIDTH = 1024;
const DEFAULT_MAX_HEIGHT = 1024;
const DEFAULT_QUALITY = 0.85;
const DEFAULT_MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1MB default limit for API transmission

/**
 * Process result object structure
 */
const ProcessResultType = {
  SUCCESS: 'success',
  ERROR_VALIDATION: 'error_validation',
  ERROR_CONVERSION: 'error_conversion',
  ERROR_SIZE: 'error_size',
  ERROR_OTHER: 'error_other',
  ERROR_CORS: 'error_cors' // Added new error type for CORS issues
};

/**
 * Fetch an image via proxy to avoid CORS issues
 * @param {string} imageUrl - URL of the image to fetch
 * @returns {Promise<string|null>} Base64 data URL of the image or null if failed
 */
async function fetchImageViaProxy(imageUrl) {
  try {
    // For LinkedIn images, we need to use a different approach since direct loading causes CORS issues
    ImageContextDebug.logInfo(`Attempting to fetch image via fetch API: ${imageUrl}`);
    
    // Create a new temporary image element
    const tempImg = new Image();
    
    // Set up a promise to wait for load or error
    const imgLoaded = new Promise((resolve, reject) => {
      tempImg.onload = () => resolve(tempImg);
      tempImg.onerror = () => reject(new Error("Failed to load image via proxy"));
      
      // Set crossOrigin attribute to anonymous to request CORS access
      tempImg.crossOrigin = "anonymous";
      tempImg.src = imageUrl;
    });
    
    try {
      // Wait for the image to load
      await imgLoaded;
      return tempImg;
    } catch (error) {
      ImageContextDebug.logError(`Failed to load image with CORS: ${error.message}`);
      
      // If this fails, try a different approach - using a blob URL from fetch
      // Note: This might only work in extensions with appropriate permissions
      try {
        const response = await fetch(imageUrl, { 
          mode: 'cors',  // Try with CORS mode
          credentials: 'omit' // Don't send cookies
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        // Create a new image from the blob URL
        const blobImg = new Image();
        const blobLoaded = new Promise((resolve, reject) => {
          blobImg.onload = () => resolve(blobImg);
          blobImg.onerror = () => reject(new Error("Failed to load blob URL"));
          blobImg.src = blobUrl;
        });
        
        await blobLoaded;
        return blobImg;
      } catch (fetchError) {
        ImageContextDebug.logError(`Failed to fetch image via proxy: ${fetchError.message}`);
        return null;
      }
    }
  } catch (e) {
    ImageContextDebug.logError(`Error in fetchImageViaProxy: ${e.message}`);
    return null;
  }
}

/**
 * Convert an image element to base64 format
 * @param {HTMLImageElement} imgElement - The image element to convert
 * @param {Object} options - Options for conversion
 * @param {number} options.maxWidth - Maximum width in pixels
 * @param {number} options.maxHeight - Maximum height in pixels
 * @param {number} options.quality - JPEG quality (0-1)
 * @param {number} options.maxSizeBytes - Maximum file size in bytes
 * @returns {Promise<Object>} Result object with base64 data and metadata
 */
async function imageToBase64(imgElement, options = {}) {
  try {
    if (!imgElement || !(imgElement instanceof HTMLImageElement)) {
      return {
        success: false,
        resultType: ProcessResultType.ERROR_OTHER,
        message: 'Invalid image element provided'
      };
    }

    // Set default options
    const opts = {
      maxWidth: options.maxWidth || DEFAULT_MAX_WIDTH,
      maxHeight: options.maxHeight || DEFAULT_MAX_HEIGHT,
      quality: options.quality || DEFAULT_QUALITY,
      maxSizeBytes: options.maxSizeBytes || DEFAULT_MAX_FILE_SIZE_BYTES
    };

    // First, validate the image
    const validationResult = await ImageValidator.validateImage(imgElement);
    if (!validationResult.valid) {
      return {
        success: false,
        resultType: ProcessResultType.ERROR_VALIDATION,
        message: validationResult.message,
        validationError: validationResult
      };
    }

    // Check if image is likely from a different origin
    const isCrossOrigin = imgElement.crossOrigin !== 'anonymous' && 
                          (imgElement.src.startsWith('http') || imgElement.src.startsWith('//'));
    
    let imageToUse = imgElement;
    
    // If it's potentially a cross-origin image, try to fetch it properly
    if (isCrossOrigin) {
      ImageContextDebug.logInfo(`Detected cross-origin image: ${imgElement.src}`);
      
      try {
        // Try to load the image with CORS settings
        const corsImage = await fetchImageViaProxy(imgElement.src);
        if (corsImage) {
          imageToUse = corsImage;
          ImageContextDebug.logInfo(`Successfully loaded image with CORS handling`);
        } else {
          // If we couldn't load with CORS, we'll try to proceed but may get a security error
          ImageContextDebug.logWarning(`Could not load image with CORS, proceeding with original but may fail`);
        }
      } catch (corsError) {
        ImageContextDebug.logWarning(`Error applying CORS handling: ${corsError.message}`);
      }
    }

    // Create a canvas for image manipulation
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Get original dimensions
    const origWidth = imageToUse.naturalWidth || imageToUse.width;
    const origHeight = imageToUse.naturalHeight || imageToUse.height;

    // Calculate dimensions while maintaining aspect ratio
    let newWidth = origWidth;
    let newHeight = origHeight;

    if (newWidth > opts.maxWidth) {
      const ratio = opts.maxWidth / newWidth;
      newWidth = opts.maxWidth;
      newHeight = Math.floor(newHeight * ratio);
    }

    if (newHeight > opts.maxHeight) {
      const ratio = opts.maxHeight / newHeight;
      newHeight = opts.maxHeight;
      newWidth = Math.floor(newWidth * ratio);
    }

    // Resize image on canvas if needed
    canvas.width = newWidth;
    canvas.height = newHeight;

    // Draw image on canvas
    try {
      ctx.drawImage(imageToUse, 0, 0, newWidth, newHeight);
    } catch (drawError) {
      ImageContextDebug.logError(`Error drawing image to canvas: ${drawError.message}`);
      return {
        success: false,
        resultType: ProcessResultType.ERROR_CONVERSION,
        message: `Error drawing image to canvas: ${drawError.message}`
      };
    }

    // Convert to base64, defaulting to JPEG for LinkedIn images
    const mimeType = validationResult.mimeType || 'image/jpeg';

    // Get base64 data - this is where CORS errors can happen
    let base64Data;
    try {
      base64Data = canvas.toDataURL(mimeType, opts.quality);
    } catch (securityError) {
      ImageContextDebug.logError(`Security error converting canvas to data URL: ${securityError.message}`);
      
      // Handle the security error from tainted canvas
      return {
        success: false,
        resultType: ProcessResultType.ERROR_CORS,
        message: "Cannot access image data due to cross-origin restrictions. LinkedIn's security policy prevents direct access to their images.",
        error: securityError
      };
    }

    // Check if resulting size meets requirements
    const base64Size = calculateBase64Size(base64Data);

    if (base64Size > opts.maxSizeBytes) {
      ImageContextDebug.logWarning(`Converted image size (${Math.round(base64Size / 1024)} KB) exceeds maximum size (${Math.round(opts.maxSizeBytes / 1024)} KB)`, imgElement);

      // Try with lower quality if it's a JPEG
      if (mimeType === 'image/jpeg' && opts.quality > 0.5) {
        // Recursively try again with lower quality
        const lowerQualityOpts = {
          ...opts,
          quality: opts.quality * 0.8  // Reduce quality by 20%
        };

        ImageContextDebug.logInfo(`Attempting conversion with lower quality: ${Math.round(lowerQualityOpts.quality * 100)}%`, imgElement);
        return imageToBase64(imageToUse, lowerQualityOpts);
      }

      // If we've already tried with low quality or it's not a JPEG, report failure
      return {
        success: false,
        resultType: ProcessResultType.ERROR_SIZE,
        message: `Converted image size (${Math.round(base64Size / 1024)} KB) exceeds maximum allowed size (${Math.round(opts.maxSizeBytes / 1024)} KB)`,
        base64Size,
        maxSize: opts.maxSizeBytes
      };
    }

    // Success - return the base64 data and metadata
    const result = {
      success: true,
      resultType: ProcessResultType.SUCCESS,
      base64Data,
      mimeType,
      width: newWidth,
      height: newHeight,
      originalWidth: origWidth,
      originalHeight: origHeight,
      quality: opts.quality,
      base64Size,
      sizeKB: Math.round(base64Size / 1024)
    };

    ImageContextDebug.logInfo(`Image successfully converted to base64: ${result.width}x${result.height}, ${result.sizeKB} KB`, imageToUse);
    return result;
  } catch (error) {
    ImageContextDebug.logError(`Error converting image to base64: ${error.message}`, error);

    return {
      success: false,
      resultType: ProcessResultType.ERROR_CONVERSION,
      message: `Error converting image: ${error.message}`,
      error
    };
  }
}

/**
 * Calculate approximate size of base64 data in bytes
 * @param {string} base64String - The base64 string to measure
 * @returns {number} Size in bytes
 */
function calculateBase64Size(base64String) {
  // Remove data URL prefix to get just the base64 data
  const base64Data = base64String.split(',')[1] || base64String;

  // Calculate size: each Base64 digit represents 6 bits, so 4 digits = 3 bytes
  return Math.floor(base64Data.length * 0.75);
}

/**
 * Process multiple images in batch, converting them to base64
 * @param {Array<HTMLImageElement>} imgElements - Array of image elements
 * @param {Object} options - Options for conversion
 * @returns {Promise<Array<Object>>} Array of processing results
 */
async function processImages(imgElements, options = {}) {
  if (!Array.isArray(imgElements)) {
    return [{
      success: false,
      resultType: ProcessResultType.ERROR_OTHER,
      message: 'Invalid input: Expected array of image elements'
    }];
  }

  const results = await Promise.all(imgElements.map(img => imageToBase64(img, options)));

  const summary = {
    total: results.length,
    success: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length
  };

  ImageContextDebug.logInfo(`Processed ${summary.total} images: ${summary.success} successful, ${summary.failed} failed`);

  return results;
}

/**
 * Test function to convert and display an image in base64 format
 * @param {string} imgUrl - URL of the image to test
 * @returns {Promise<Object>} Processing result
 */
async function testImageConversion(imgUrl) {
  try {
    // Create a new image element
    const img = new Image();

    // Wait for image to load
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imgUrl;
    });

    // Convert to base64
    const result = await imageToBase64(img);

    if (result.success) {
      console.log('%c[ImageProcessor Test]', 'color: #4CAF50; font-weight: bold',
                  `Successfully converted image: ${result.width}x${result.height}, ${result.sizeKB} KB`);

      // Optionally display the image in console for testing
      console.log('%c[ImageProcessor Test]', 'color: #4CAF50; font-weight: bold', 'Base64 result:');
      const previewImg = new Image();
      previewImg.src = result.base64Data;
      previewImg.style.maxWidth = '300px';
      console.log(previewImg);
    } else {
      console.error('%c[ImageProcessor Test]', 'color: #F44336; font-weight: bold',
                    `Failed to convert image: ${result.message}`);
    }

    return result;
  } catch (error) {
    console.error('%c[ImageProcessor Test]', 'color: #F44336; font-weight: bold',
                  'Error in test function:', error);
    return {
      success: false,
      resultType: ProcessResultType.ERROR_OTHER,
      message: `Test error: ${error.message}`,
      error
    };
  }
}

/**
 * Debug function: Process all images in LinkedIn posts
 * @returns {Promise<Object>} Processing results
 */
async function debugProcessAllPostImages() {
  console.log('%c[ImageProcessor Debug]', 'color: #2196F3; font-weight: bold',
              'Processing all images in LinkedIn posts...');

  // Force debug mode
  const oldDebugMode = ImageContextDebug.isEnabled();
  ImageContextDebug.enableDebug();

  try {
    // Find all posts
    const posts = document.querySelectorAll('.feed-shared-update-v2');
    console.log('%c[ImageProcessor Debug]', 'color: #2196F3; font-weight: bold',
                `Found ${posts.length} posts to process`);

    const allResults = [];

    // Process each post
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      console.log('%c[ImageProcessor Debug]', 'color: #2196F3; font-weight: bold',
                  `Processing post #${i + 1}:`);

      // Find images in the post
      const images = await import('./ImageSelector.js')
                          .then(module => module.ImageSelector.findPostImages(post));

      if (images.length === 0) {
        console.log('%c[ImageProcessor Debug]', 'color: #2196F3; font-weight: bold',
                    `No images found in post #${i + 1}`);
        continue;
      }

      console.log('%c[ImageProcessor Debug]', 'color: #2196F3; font-weight: bold',
                  `Found ${images.length} images in post #${i + 1}`);

      // Process images
      const results = await processImages(images);

      console.log('%c[ImageProcessor Debug]', 'color: #2196F3; font-weight: bold',
                  `Processed ${results.length} images from post #${i + 1}`);

      // Check results
      results.forEach((result, idx) => {
        const status = result.success ? '✅ Success' : '❌ Failed';
        console.log(`Image #${idx + 1}: ${status}`);

        if (result.success) {
          console.log(`- Dimensions: ${result.width}x${result.height}`);
          console.log(`- Size: ${result.sizeKB} KB`);
          console.log(`- Type: ${result.mimeType}`);

          // Show small preview
          const previewImg = new Image();
          previewImg.src = result.base64Data;
          previewImg.style.maxWidth = '100px';
          previewImg.style.maxHeight = '100px';
          console.log('- Preview:', previewImg);
        } else {
          console.log(`- Error: ${result.message}`);
        }
      });

      allResults.push(...results);
      console.log('----------------------------');
    }

    // Restore original debug mode
    if (!oldDebugMode) {
      ImageContextDebug.disableDebug();
    }

    return {
      success: true,
      totalPosts: posts.length,
      totalImages: allResults.length,
      successCount: allResults.filter(r => r.success).length,
      failedCount: allResults.filter(r => !r.success).length,
      results: allResults
    };
  } catch (error) {
    console.error('%c[ImageProcessor Debug]', 'color: #F44336; font-weight: bold',
                  'Error processing images:', error);

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
export const ImageProcessor = {
  imageToBase64,
  processImages,
  testImageConversion,
  debugProcessAllPostImages,
  ProcessResultType,
  DEFAULT_MAX_WIDTH,
  DEFAULT_MAX_HEIGHT,
  DEFAULT_QUALITY,
  DEFAULT_MAX_FILE_SIZE_BYTES
};

// Export for direct import
export {
  imageToBase64,
  processImages,
  testImageConversion,
  debugProcessAllPostImages,
  ProcessResultType
};