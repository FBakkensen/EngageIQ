/**
 * Image Validator Service
 *
 * This service provides functionality to validate images in LinkedIn posts
 * and ensures they meet requirements for processing.
 */

const ImageValidator = (() => {
  /**
   * Validates a single image element
   * @param {HTMLImageElement} imageElement - The image element to validate
   * @returns {Object} Validation results with status and metadata
   */
  const validateImage = (imageElement) => {
    if (!imageElement || !(imageElement instanceof HTMLImageElement)) {
      return { valid: false, reason: 'Not a valid image element' };
    }

    // Check if image is loaded
    if (!imageElement.complete) {
      return { valid: false, reason: 'Image not fully loaded' };
    }

    // Check for broken images
    if (imageElement.naturalWidth === 0 || imageElement.naturalHeight === 0) {
      return { valid: false, reason: 'Image has zero dimensions (possibly broken)' };
    }

    // Validate image size (LinkedIn typically uses images at least 400px wide)
    if (imageElement.naturalWidth < 200 || imageElement.naturalHeight < 150) {
      return {
        valid: false,
        reason: 'Image too small',
        dimensions: {
          width: imageElement.naturalWidth,
          height: imageElement.naturalHeight
        }
      };
    }

    // All checks passed
    return {
      valid: true,
      dimensions: {
        width: imageElement.naturalWidth,
        height: imageElement.naturalHeight
      },
      src: imageElement.src
    };
  };

  /**
   * Finds all LinkedIn post images in the current page
   * @returns {Array<HTMLImageElement>} Array of image elements
   */
  const findAllLinkedInPostImages = () => {
    // LinkedIn post images are typically found within feed-shared-update-v2__content
    const postContainers = document.querySelectorAll('.feed-shared-update-v2__content');
    const images = [];

    postContainers.forEach(container => {
      const imageElements = container.querySelectorAll('img');
      imageElements.forEach(img => {
        if (img.src && !img.src.includes('profile-displayphoto')) {
          // Exclude profile photos
          images.push(img);
        }
      });
    });

    return images;
  };

  /**
   * Debug function to validate all LinkedIn post images on the page
   * @returns {Object} Validation results for all images
   */
  const debugValidateAllImages = async () => {
    try {
      const images = findAllLinkedInPostImages();

      if (images.length === 0) {
        return {
          success: false,
          message: 'No LinkedIn post images found on the page',
          timestamp: new Date().toISOString()
        };
      }

      const validationResults = images.map((img, index) => ({
        imageIndex: index,
        imageSource: img.src,
        validationResult: validateImage(img)
      }));

      return {
        success: true,
        message: `Validated ${images.length} LinkedIn post images`,
        timestamp: new Date().toISOString(),
        results: validationResults
      };
    } catch (error) {
      console.error('Error in image validation:', error);
      return {
        success: false,
        message: `Error validating images: ${error.message}`,
        timestamp: new Date().toISOString(),
        error: error.toString()
      };
    }
  };

  // Public API
  return {
    validateImage,
    findAllLinkedInPostImages,
    debugValidateAllImages
  };
})();

// Make it available in the global scope for the content script
if (typeof window !== 'undefined') {
  window.ImageValidator = ImageValidator;
}