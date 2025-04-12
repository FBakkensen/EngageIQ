// ImageValidator.js
// Utility for validating images from LinkedIn posts for API compatibility

import { ImageContextDebug } from './ImageContextDebug.js';

/**
 * Constants for validation limits
 */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB in bytes
const MIN_WIDTH = 50;
const MAX_WIDTH = 4096;
const MIN_HEIGHT = 50;
const MAX_HEIGHT = 4096;
const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];

/**
 * Validation result object structure
 */
const ValidationResultType = {
  VALID: 'valid',
  INVALID_TOO_LARGE: 'invalid_too_large',
  INVALID_TOO_SMALL: 'invalid_too_small',
  INVALID_DIMENSIONS: 'invalid_dimensions',
  INVALID_FORMAT: 'invalid_format',
  ERROR: 'error'
};

/**
 * Validates if the image meets dimension requirements
 * @param {HTMLImageElement} imgElement - The image element to validate
 * @returns {Object} Validation result with status and reason
 */
function validateDimensions(imgElement) {
  const width = imgElement.naturalWidth || imgElement.width;
  const height = imgElement.naturalHeight || imgElement.height;

  if (!width || !height) {
    return {
      valid: false,
      reason: ValidationResultType.ERROR,
      message: 'Could not determine image dimensions'
    };
  }

  if (width < MIN_WIDTH || height < MIN_HEIGHT) {
    return {
      valid: false,
      reason: ValidationResultType.INVALID_TOO_SMALL,
      message: `Image too small (${width}x${height}). Minimum dimensions: ${MIN_WIDTH}x${MIN_HEIGHT}`,
      dimensions: { width, height }
    };
  }

  if (width > MAX_WIDTH || height > MAX_HEIGHT) {
    return {
      valid: false,
      reason: ValidationResultType.INVALID_DIMENSIONS,
      message: `Image too large (${width}x${height}). Maximum dimensions: ${MAX_WIDTH}x${MAX_HEIGHT}`,
      dimensions: { width, height }
    };
  }

  return {
    valid: true,
    dimensions: { width, height }
  };
}

/**
 * Estimates file size based on image dimensions and bit depth
 * @param {HTMLImageElement} imgElement - The image element to estimate size for
 * @returns {number} Estimated size in bytes
 */
function estimateFileSize(imgElement) {
  const width = imgElement.naturalWidth || imgElement.width;
  const height = imgElement.naturalHeight || imgElement.height;

  // Conservative estimate: assume 4 bytes per pixel (32-bit color)
  const estimatedBytes = width * height * 4;

  // Add 10% overhead for headers and metadata
  return estimatedBytes * 1.1;
}

/**
 * Attempt to get actual file size for an image when possible
 * Uses various methods to determine actual file size
 * @param {HTMLImageElement} imgElement - The image element to check
 * @returns {Promise<number|null>} Actual file size or null if can't be determined
 */
async function getActualFileSize(imgElement) {
  try {
    // Try to get actual file size by fetching the image
    const src = imgElement.src;

    // Skip for data: URLs, we already have the full data
    if (src.startsWith('data:')) {
      // Rough estimation for data URLs: the length of the string after removing the header
      const base64Data = src.split(',')[1];
      if (base64Data) {
        // Base64 encoded data is approximately 4/3 the size of the binary data
        return Math.ceil(base64Data.length * 0.75);
      }
      return null;
    }

    // For remote URLs, we can try a HEAD request to get Content-Length
    // This is limited by CORS, so it may not always work
    try {
      const response = await fetch(src, { method: 'HEAD', mode: 'no-cors' });
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        return parseInt(contentLength, 10);
      }
    } catch (e) {
      // Ignore fetch errors, we'll fall back to estimation
      ImageContextDebug.logWarning('Could not fetch image size via HEAD request', e);
    }

    // Fall back to estimation
    return estimateFileSize(imgElement);

  } catch (error) {
    ImageContextDebug.logError('Error getting file size', error);
    return null;
  }
}

/**
 * Validates the MIME type of an image
 * @param {HTMLImageElement} imgElement - The image element to validate
 * @returns {Object} Validation result with status and reason
 */
function validateMimeType(imgElement) {
  // Extract MIME type from src if it's a data URL
  let mimeType = null;

  if (imgElement.src.startsWith('data:')) {
    const match = imgElement.src.match(/^data:([^;]+);/);
    mimeType = match ? match[1] : null;
  } else {
    // Special handling for LinkedIn image URLs
    if (imgElement.src.includes('media.licdn.com/dms/image/')) {
      // LinkedIn images are typically JPEGs
      mimeType = 'image/jpeg';
      ImageContextDebug.logInfo('LinkedIn image URL detected, assuming JPEG format', imgElement.src);
    } else {
      // For regular URLs, try to guess from extension
      const extension = imgElement.src.split('.').pop().toLowerCase().split('?')[0];
      switch (extension) {
        case 'jpg':
        case 'jpeg':
          mimeType = 'image/jpeg';
          break;
        case 'png':
          mimeType = 'image/png';
          break;
        case 'gif':
          mimeType = 'image/gif';
          break;
        case 'webp':
          mimeType = 'image/webp';
          break;
      }
    }
  }

  if (!mimeType || !SUPPORTED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      reason: ValidationResultType.INVALID_FORMAT,
      message: `Unsupported image format${mimeType ? ': ' + mimeType : ''}. Supported formats: ${SUPPORTED_MIME_TYPES.join(', ')}`,
      mimeType
    };
  }

  return {
    valid: true,
    mimeType
  };
}

/**
 * Main validation function for images
 * Checks dimensions, size, and format
 * @param {HTMLImageElement} imgElement - The image element to validate
 * @returns {Promise<Object>} Validation result with status, reason, and details
 */
async function validateImage(imgElement) {
  if (!imgElement || !(imgElement instanceof HTMLImageElement)) {
    return {
      valid: false,
      reason: ValidationResultType.ERROR,
      message: 'Invalid image element provided'
    };
  }

  try {
    // Start with dimension validation
    const dimensionResult = validateDimensions(imgElement);
    if (!dimensionResult.valid) {
      ImageContextDebug.logWarning(dimensionResult.message, imgElement);
      return dimensionResult;
    }

    // Check MIME type
    const mimeResult = validateMimeType(imgElement);
    if (!mimeResult.valid) {
      ImageContextDebug.logWarning(mimeResult.message, imgElement);
      return mimeResult;
    }

    // Check file size - try actual size first, then estimate
    const fileSize = await getActualFileSize(imgElement) || estimateFileSize(imgElement);

    if (fileSize > MAX_FILE_SIZE_BYTES) {
      const result = {
        valid: false,
        reason: ValidationResultType.INVALID_TOO_LARGE,
        message: `Image file size (${Math.round(fileSize / 1024)} KB) exceeds maximum allowed (${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB)`,
        size: fileSize,
        maxSize: MAX_FILE_SIZE_BYTES
      };
      ImageContextDebug.logWarning(result.message, imgElement);
      return result;
    }

    // If we got here, the image is valid
    const validResult = {
      valid: true,
      size: fileSize,
      dimensions: dimensionResult.dimensions,
      mimeType: mimeResult.mimeType
    };

    ImageContextDebug.logInfo(`Image validation successful: ${Math.round(fileSize / 1024)} KB, ${validResult.dimensions.width}x${validResult.dimensions.height}, ${validResult.mimeType}`, imgElement);
    return validResult;

  } catch (error) {
    const errorResult = {
      valid: false,
      reason: ValidationResultType.ERROR,
      message: `Error validating image: ${error.message}`,
      error
    };

    ImageContextDebug.logError(errorResult.message, error);
    return errorResult;
  }
}

/**
 * Batch validate multiple images
 * @param {Array<HTMLImageElement>} imgElements - Array of image elements to validate
 * @returns {Promise<Array<Object>>} Array of validation results
 */
async function validateImages(imgElements) {
  if (!Array.isArray(imgElements)) {
    return [{
      valid: false,
      reason: ValidationResultType.ERROR,
      message: 'Invalid input: Expected array of image elements'
    }];
  }

  const results = await Promise.all(imgElements.map(img => validateImage(img)));

  const summary = {
    total: results.length,
    valid: results.filter(r => r.valid).length,
    invalid: results.filter(r => !r.valid).length
  };

  ImageContextDebug.logInfo(`Validated ${summary.total} images: ${summary.valid} valid, ${summary.invalid} invalid`);

  return results;
}

/**
 * Debug function to find and validate all images in LinkedIn posts
 * @returns {Promise<Object>} Debug results with validation details
 */
async function debugValidateAllImages() {
  console.log('%c[ImageValidator Debug]', 'color: #4CAF50; font-weight: bold',
              'Validating all LinkedIn post images...');

  // Force debug mode
  const oldDebugMode = ImageContextDebug.isEnabled();
  ImageContextDebug.enableDebug();

  try {
    // Find LinkedIn post containers
    const posts = document.querySelectorAll('.feed-shared-update-v2');
    console.log('%c[ImageValidator Debug]', 'color: #4CAF50; font-weight: bold',
                `Found ${posts.length} posts to analyze`);

    let allImages = [];
    let validationResults = [];

    // Find images in each post
    for (const post of posts) {
      // Look for image containers (several possible classes in LinkedIn)
      const imgContainers = post.querySelectorAll(
        '.feed-shared-image, .feed-shared-update-v2__content, ' +
        '.update-components-image, .feed-shared-linkedin-video__thumbnail, ' +
        '.feed-shared-article__image'
      );

      console.log('%c[ImageValidator Debug]', 'color: #4CAF50; font-weight: bold',
                  `Found ${imgContainers.length} image containers in post`);

      // Extract actual image elements from containers
      for (const container of imgContainers) {
        const images = container.querySelectorAll('img');
        for (const image of images) {
          allImages.push(image);
        }
      }
    }

    console.log('%c[ImageValidator Debug]', 'color: #4CAF50; font-weight: bold',
                `Total images found: ${allImages.length}`);

    // Validate each image
    if (allImages.length > 0) {
      validationResults = await validateImages(allImages);

      // Display validation results
      console.group('Image Validation Results:');

      validationResults.forEach((result, index) => {
        const image = allImages[index];
        const srcPreview = image.src.substring(0, 50) + (image.src.length > 50 ? '...' : '');

        if (result.valid) {
          console.log(
            '%c✓ Valid', 'color: green',
            `Image ${index + 1}: ${result.dimensions?.width}x${result.dimensions?.height}, ` +
            `${Math.round((result.size || 0) / 1024)}KB, ${result.mimeType}`,
            `\nSource: ${srcPreview}`
          );
        } else {
          console.log(
            '%c✗ Invalid', 'color: red',
            `Image ${index + 1}: ${result.message}`,
            `\nSource: ${srcPreview}`
          );
        }
      });

      console.groupEnd();
    } else {
      console.log('%c[ImageValidator Debug]', 'color: #FF9800; font-weight: bold',
                  'No images found in any posts');
    }

    // Validation summary
    const valid = validationResults.filter(r => r.valid).length;
    const invalid = validationResults.filter(r => !r.valid).length;

    console.log('%c[ImageValidator Debug]', 'color: #4CAF50; font-weight: bold',
                `Validation complete: ${valid} valid, ${invalid} invalid images`);

    // Restore original debug mode
    if (!oldDebugMode) {
      ImageContextDebug.disableDebug();
    }

    return {
      success: true,
      totalImages: allImages.length,
      validImages: valid,
      invalidImages: invalid,
      results: validationResults.map((result, index) => ({
        ...result,
        imageSource: allImages[index].src
      }))
    };
  } catch (error) {
    console.error('%c[ImageValidator Debug]', 'color: #F44336; font-weight: bold',
                  'Error during validation:', error);

    // Restore original debug mode
    if (!oldDebugMode) {
      ImageContextDebug.disableDebug();
    }

    return {
      success: false,
      error: error.message
    };
  }
}

// Export the validation utilities
export const ImageValidator = {
  validateImage,
  validateImages,
  validateDimensions,
  estimateFileSize,
  getActualFileSize,
  ValidationResultType,
  limits: {
    MAX_FILE_SIZE_BYTES,
    MIN_WIDTH,
    MAX_WIDTH,
    MIN_HEIGHT,
    MAX_HEIGHT,
    SUPPORTED_MIME_TYPES
  },
  // Add the debug function to the export
  debugValidateAllImages
};

// Export for direct import
export {
  validateImage,
  validateImages,
  validateDimensions,
  estimateFileSize,
  getActualFileSize,
  ValidationResultType,
  // Add the debug function to named exports
  debugValidateAllImages
};