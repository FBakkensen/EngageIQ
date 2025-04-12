// ImageConverter.js
// Utility for converting images to base64 format for API requests

import { ImageContextDebug } from './ImageContextDebug.js';

/**
 * Constants for image conversion
 */
const DEFAULT_QUALITY = 0.85;
const MAX_WIDTH = 800;  // Maximum width for converted images
const MAX_HEIGHT = 600; // Maximum height for converted images
const MIME_TYPE_JPEG = 'image/jpeg';
const MIME_TYPE_PNG = 'image/png';
const MIME_TYPE_WEBP = 'image/webp';

/**
 * Error types for conversion failures
 */
const ErrorTypes = {
  IMAGE_LOAD_ERROR: 'image_load_error',
  CANVAS_CREATION_ERROR: 'canvas_creation_error',
  CONVERSION_ERROR: 'conversion_error',
  INVALID_INPUT: 'invalid_input',
  MEMORY_ERROR: 'memory_error'
};

/**
 * Tracking for canvas elements to help with memory management
 */
let activeCanvases = 0;
const MAX_ACTIVE_CANVASES = 5;

/**
 * Creates a canvas element with specified dimensions
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {HTMLCanvasElement} Canvas element or null if creation fails
 */
function createCanvas(width, height) {
  try {
    if (activeCanvases >= MAX_ACTIVE_CANVASES) {
      ImageContextDebug.logWarning(`Too many active canvases (${activeCanvases}). Consider releasing resources.`);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    activeCanvases++;

    ImageContextDebug.logInfo(`Canvas created (${width}x${height}). Active canvases: ${activeCanvases}`);
    return canvas;
  } catch (error) {
    ImageContextDebug.logError('Failed to create canvas', error);
    return null;
  }
}

/**
 * Release canvas resources to prevent memory leaks
 * @param {HTMLCanvasElement} canvas - Canvas to release
 */
function releaseCanvas(canvas) {
  if (!canvas) return;

  try {
    // Clear canvas context to help GC
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Remove any references
    canvas.width = 0;
    canvas.height = 0;

    activeCanvases = Math.max(0, activeCanvases - 1);
    ImageContextDebug.logInfo(`Canvas released. Active canvases: ${activeCanvases}`);
  } catch (error) {
    ImageContextDebug.logError('Error releasing canvas', error);
  }
}

/**
 * Calculate dimensions that maintain aspect ratio within max bounds
 * @param {number} originalWidth - Original image width
 * @param {number} originalHeight - Original image height
 * @param {number} maxWidth - Maximum allowed width
 * @param {number} maxHeight - Maximum allowed height
 * @returns {Object} Object with scaled width and height
 */
function calculateScaledDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
  // Start with original dimensions
  let width = originalWidth;
  let height = originalHeight;

  // Scale down if needed
  if (width > maxWidth) {
    // Scale based on width
    const ratio = maxWidth / width;
    width = maxWidth;
    height = Math.floor(height * ratio);
  }

  if (height > maxHeight) {
    // Scale based on height
    const ratio = maxHeight / height;
    height = maxHeight;
    width = Math.floor(width * ratio);
  }

  return { width, height };
}

/**
 * Determine output format based on input image
 * @param {HTMLImageElement} imgElement - Image element to analyze
 * @returns {string} Mime type for conversion output
 */
function determineOutputFormat(imgElement) {
  // Check if the image URL contains format information
  const src = imgElement.src || '';

  // Default to JPEG for most cases
  let outputFormat = MIME_TYPE_JPEG;

  // Check for PNG format (preserve transparency)
  if (src.toLowerCase().includes('.png') ||
      src.match(/data:image\/png/i)) {
    outputFormat = MIME_TYPE_PNG;
  }
  // Check for WebP support and use it if the source is webp
  else if ((src.toLowerCase().includes('.webp') ||
            src.match(/data:image\/webp/i)) &&
           'toBlob' in HTMLCanvasElement.prototype) {
    outputFormat = MIME_TYPE_WEBP;
  }

  ImageContextDebug.logInfo(`Output format determined: ${outputFormat}`);
  return outputFormat;
}

/**
 * Truncates base64 string for log-friendly output
 * @param {string} base64String - Full base64 string
 * @param {number} maxLength - Maximum length to show (default 100)
 * @returns {string} Truncated string
 */
function truncateForLog(base64String, maxLength = 100) {
  if (!base64String) return '';
  if (base64String.length <= maxLength) return base64String;
  return `${base64String.substring(0, maxLength)}...`;
}

/**
 * Convert an image element to base64 string
 * @param {HTMLImageElement} imgElement - The image element to convert
 * @param {Object} options - Conversion options
 * @param {number} options.maxWidth - Maximum width for the converted image
 * @param {number} options.maxHeight - Maximum height for the converted image
 * @param {number} options.quality - JPEG quality (0-1)
 * @returns {Promise<Object>} Promise resolving to object with base64 data and metadata
 */
async function imageToBase64(imgElement, options = {}) {
  const startTime = performance.now();

  // Validate input
  if (!imgElement || !(imgElement instanceof HTMLImageElement)) {
    ImageContextDebug.logError('Invalid image element provided', imgElement);
    return Promise.reject({
      error: ErrorTypes.INVALID_INPUT,
      message: 'Invalid image element provided'
    });
  }

  // Merge options with defaults
  const settings = {
    maxWidth: options.maxWidth || MAX_WIDTH,
    maxHeight: options.maxHeight || MAX_HEIGHT,
    quality: options.quality || DEFAULT_QUALITY
  };

  try {
    // Ensure image is loaded
    if (!imgElement.complete) {
      ImageContextDebug.logInfo('Image not loaded, waiting for load event');
      await new Promise((resolve, reject) => {
        imgElement.onload = resolve;
        imgElement.onerror = () => reject(new Error('Image failed to load'));

        // Add timeout in case image never loads
        setTimeout(() => reject(new Error('Image load timeout')), 5000);
      });
    }

    // Get original dimensions
    const originalWidth = imgElement.naturalWidth || imgElement.width;
    const originalHeight = imgElement.naturalHeight || imgElement.height;

    if (!originalWidth || !originalHeight) {
      throw new Error('Cannot determine image dimensions');
    }

    // Calculate scaled dimensions
    const scaledDimensions = calculateScaledDimensions(
      originalWidth,
      originalHeight,
      settings.maxWidth,
      settings.maxHeight
    );

    // Create canvas
    const canvas = createCanvas(scaledDimensions.width, scaledDimensions.height);
    if (!canvas) {
      throw new Error('Failed to create canvas for conversion');
    }

    // Get context and draw image
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgElement, 0, 0, scaledDimensions.width, scaledDimensions.height);

    // Determine output format
    const outputFormat = determineOutputFormat(imgElement);

    // Convert to base64
    const base64Data = canvas.toDataURL(outputFormat, settings.quality);

    // Cleanup resources
    releaseCanvas(canvas);

    // Calculate size (rough estimation)
    const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
    const sizeKB = (sizeInBytes / 1024).toFixed(2);

    // Calculate processing time
    const endTime = performance.now();
    const processingTime = endTime - startTime;

    const result = {
      base64Data,
      originalDimensions: {
        width: originalWidth,
        height: originalHeight
      },
      scaledDimensions: {
        width: scaledDimensions.width,
        height: scaledDimensions.height
      },
      sizeKB: parseFloat(sizeKB),
      mimeType: outputFormat,
      processingTime
    };

    ImageContextDebug.logInfo(
      `Image converted to base64 in ${processingTime.toFixed(2)}ms, ` +
      `${result.scaledDimensions.width}x${result.scaledDimensions.height}, ` +
      `${result.sizeKB}KB, ${result.mimeType}`,
      {
        base64Preview: truncateForLog(base64Data, 100),
        dimensions: result.scaledDimensions
      }
    );

    return result;
  } catch (error) {
    ImageContextDebug.logError('Error converting image to base64', error);
    return Promise.reject({
      error: ErrorTypes.CONVERSION_ERROR,
      message: error.message || 'Error converting image to base64',
      details: error
    });
  }
}

/**
 * Test function to convert all images on a post and report metrics
 * @param {HTMLElement} postElement - LinkedIn post element
 * @returns {Promise<Object>} Results of the conversion test
 */
async function testImageConversion(postElement) {
  if (!postElement) {
    ImageContextDebug.logWarning('No post element provided for conversion test');
    return { success: false, message: 'No post element provided' };
  }

  // Find all images in the post
  const images = postElement.querySelectorAll('img');

  if (images.length === 0) {
    ImageContextDebug.logInfo('No images found in post for conversion test');
    return { success: false, message: 'No images found in post' };
  }

  ImageContextDebug.logInfo(`Testing conversion for ${images.length} images in post`);

  const results = [];
  let totalTime = 0;
  let totalSize = 0;

  // Process each image
  for (let i = 0; i < images.length; i++) {
    const img = images[i];

    try {
      const startTime = performance.now();
      const result = await imageToBase64(img);
      const endTime = performance.now();

      const conversionTime = endTime - startTime;
      totalTime += conversionTime;
      totalSize += result.sizeKB || 0;

      results.push({
        index: i,
        success: true,
        originalDimensions: result.originalDimensions,
        scaledDimensions: result.scaledDimensions,
        sizeKB: result.sizeKB,
        mimeType: result.mimeType,
        conversionTime: conversionTime.toFixed(2) + 'ms'
      });
    } catch (error) {
      results.push({
        index: i,
        success: false,
        error: error.message || 'Unknown error'
      });
    }
  }

  const successCount = results.filter(r => r.success).length;

  // Log summary
  console.group('%c[ImageContext] Conversion Test Results', 'color: #4CAF50; font-weight: bold');
  console.log(`Successfully converted ${successCount} of ${images.length} images`);
  console.log(`Total processing time: ${totalTime.toFixed(2)}ms, Average: ${(totalTime / images.length).toFixed(2)}ms`);
  console.log(`Total size: ${totalSize.toFixed(2)}KB, Average: ${(totalSize / successCount).toFixed(2)}KB`);

  // Log individual results
  results.forEach((result, i) => {
    if (result.success) {
      console.log(
        `%c✓ Image ${i + 1}`, 'color: green',
        `${result.originalDimensions.width}x${result.originalDimensions.height} → ` +
        `${result.scaledDimensions.width}x${result.scaledDimensions.height}, ` +
        `${result.sizeKB}KB, ${result.conversionTime}`
      );
    } else {
      console.log(
        `%c✗ Image ${i + 1}`, 'color: red',
        `Error: ${result.error}`
      );
    }
  });

  console.groupEnd();

  return {
    success: true,
    totalImages: images.length,
    successfulConversions: successCount,
    failedConversions: images.length - successCount,
    totalProcessingTime: totalTime.toFixed(2) + 'ms',
    averageProcessingTime: (totalTime / images.length).toFixed(2) + 'ms',
    totalSizeKB: totalSize.toFixed(2),
    averageSizeKB: (totalSize / successCount).toFixed(2),
    results
  };
}

// Export converter utilities as a module
export const ImageConverter = {
  imageToBase64,
  calculateScaledDimensions,
  determineOutputFormat,
  createCanvas,
  releaseCanvas,
  testImageConversion,
  ErrorTypes,
  constants: {
    MAX_WIDTH,
    MAX_HEIGHT,
    DEFAULT_QUALITY
  }
};

// Export for direct import
export {
  imageToBase64,
  calculateScaledDimensions,
  determineOutputFormat,
  createCanvas,
  releaseCanvas,
  testImageConversion,
  ErrorTypes
};