// ImageSelector.js
// Utility for finding images in LinkedIn post DOM elements
import { ImageContextDebug } from './ImageContextDebug.js';
import { ImageValidator } from './ImageValidator.js';

// Cache for found images per post element
const imageCache = new WeakMap();

// Cache for validation results per image
const validationCache = new WeakMap();

/**
 * Find post images within a LinkedIn post element.
 * @param {Element} postElement - The root element of the LinkedIn post
 * @returns {HTMLImageElement[]} Array of found image elements
 */
export function findPostImages(postElement) {
  if (!postElement) return [];
  if (imageCache.has(postElement)) {
    ImageContextDebug.logInfo('Returning cached images for post', postElement);
    return imageCache.get(postElement);
  }

  ImageContextDebug.logInfo('Searching for images in post element:', postElement);

  // Try multiple selector strategies to find images
  let images = [];

  // Strategy 1: Look for update-components-image containers
  const imageContainers = postElement.querySelectorAll('.update-components-image');
  if (imageContainers.length > 0) {
    ImageContextDebug.logInfo('Found update-components-image containers:', imageContainers.length);

    // Look for images inside these containers
    imageContainers.forEach(container => {
      const containerImages = container.querySelectorAll('img.ivm-view-attr__img--centered');
      images = [...images, ...containerImages];

      if (containerImages.length > 0) {
        ImageContextDebug.logInfo(`Found ${containerImages.length} images in container`);
      }
    });
  }

  // Strategy 2: Direct search for specific LinkedIn image classes
  if (images.length === 0) {
    const specificImages = postElement.querySelectorAll([
      // Standard post image classes
      'img.ivm-view-attr__img--centered',
      'img.update-components-image__image',
      'img.feed-shared-image__image',
      'img.feed-shared-article__image',
      // Profile and entity images
      'img.ivm-view-attr__img--centered.EntityPhoto-circle-3',
      'img.ivm-view-attr__img--centered.evi-image'
    ].join(', '));

    if (specificImages.length > 0) {
      ImageContextDebug.logInfo(`Found ${specificImages.length} images with specific classes`);
      images = [...images, ...specificImages];
    }
  }

  // Strategy 3: Fallback to any images that appear to be content (filtering out icons/small images)
  if (images.length === 0) {
    const allImages = postElement.querySelectorAll('img');
    const contentImages = Array.from(allImages).filter(img => {
      const width = parseInt(img.getAttribute('width') || '0', 10);
      const height = parseInt(img.getAttribute('height') || '0', 10);
      // Only consider images that are reasonably large (likely content, not icons)
      return (width > 100 && height > 100) || img.classList.contains('evi-image');
    });

    if (contentImages.length > 0) {
      ImageContextDebug.logInfo(`Found ${contentImages.length} content images in fallback search`);
      images = [...images, ...contentImages];
    }
  }

  // Cache the results
  imageCache.set(postElement, images);

  // Log results
  if (images.length > 0) {
    ImageContextDebug.logInfo(`Found ${images.length} total images in post:`, images);
    // Log image URLs for debugging
    const imageUrls = Array.from(images).map(img => img.src);
    ImageContextDebug.logInfo('Image URLs:', imageUrls);
  } else {
    ImageContextDebug.logWarning('No images found in post element:', postElement);
  }

  return images;
}

/**
 * Find and validate post images within a LinkedIn post element
 * @param {Element} postElement - The root element of the LinkedIn post
 * @returns {Promise<Array<Object>>} Array of objects with image and validation result
 */
export async function findAndValidatePostImages(postElement) {
  // First find all images using existing function
  const images = findPostImages(postElement);

  if (images.length === 0) {
    ImageContextDebug.logInfo('No images to validate in post');
    return [];
  }

  // Check cache first
  const validatedResults = [];
  const imagesToValidate = [];

  // Check which images need validation
  for (const img of images) {
    if (validationCache.has(img)) {
      ImageContextDebug.logInfo('Using cached validation result for image', img.src);
      validatedResults.push({
        image: img,
        validationResult: validationCache.get(img)
      });
    } else {
      imagesToValidate.push(img);
    }
  }

  // Validate remaining images
  if (imagesToValidate.length > 0) {
    ImageContextDebug.logInfo(`Validating ${imagesToValidate.length} new images`);

    // Run validation for all remaining images
    const validationResults = await ImageValidator.validateImages(imagesToValidate);

    // Store results in cache and add to return array
    imagesToValidate.forEach((img, index) => {
      const result = validationResults[index];
      validationCache.set(img, result);
      validatedResults.push({
        image: img,
        validationResult: result
      });
    });
  }

  // Log summary of validation
  const valid = validatedResults.filter(item => item.validationResult.valid).length;
  const invalid = validatedResults.length - valid;

  ImageContextDebug.logInfo(`Image validation complete: ${valid} valid, ${invalid} invalid images`);

  return validatedResults;
}

/**
 * Test function: Run selector on all visible LinkedIn posts on the page.
 * Logs results in debug mode.
 */
export function testFindImagesOnPage() {
  // Heuristic: LinkedIn posts often have class 'feed-shared-update-v2'
  const posts = document.querySelectorAll('.feed-shared-update-v2');
  posts.forEach((post, idx) => {
    const images = findPostImages(post);
    ImageContextDebug.logInfo(`[Test] Post #${idx + 1}: Found ${images.length} images`, images);
  });
  ImageContextDebug.logInfo(`[Test] Ran image selector on ${posts.length} posts.`);
}

/**
 * Debug function to be called from the console to test image detection
 */
export function debugImageDetection() {
  console.log('%c[ImageContext Debug]', 'color: #ff5722; font-weight: bold', 'Testing image detection on all visible posts...');

  // Force debug mode
  const oldDebugMode = ImageContextDebug.isEnabled();
  ImageContextDebug.enableDebug();

  // Find all posts
  const posts = document.querySelectorAll('.feed-shared-update-v2');
  console.log('%c[ImageContext Debug]', 'color: #ff5722; font-weight: bold', `Found ${posts.length} posts to analyze`);

  // Test image detection on each post
  posts.forEach((post, idx) => {
    console.log('%c[ImageContext Debug]', 'color: #ff5722; font-weight: bold', `Analyzing post #${idx + 1}:`);
    console.log(post);

    // Check if post contains image container
    const imageContainers = post.querySelectorAll('.update-components-image');
    console.log('%c[ImageContext Debug]', 'color: #ff5722; font-weight: bold',
      `Post #${idx + 1} has ${imageContainers.length} image containers`);

    // Log all img elements
    const allImgs = post.querySelectorAll('img');
    console.log('%c[ImageContext Debug]', 'color: #ff5722; font-weight: bold',
      `Post #${idx + 1} has ${allImgs.length} total img elements`);

    if (allImgs.length > 0) {
      const imgSrcs = Array.from(allImgs).map(img => img.src);
      console.log('%c[ImageContext Debug]', 'color: #ff5722; font-weight: bold', 'Image sources:', imgSrcs);
    }

    // Run the actual detection
    const images = findPostImages(post);
    console.log('%c[ImageContext Debug]', 'color: #ff5722; font-weight: bold',
      `Detection result for post #${idx + 1}: Found ${images.length} images using findPostImages()`);

    if (images.length > 0) {
      console.log('%c[ImageContext Debug]', 'color: #ff5722; font-weight: bold', 'Detected images:', images);
    } else {
      console.log('%c[ImageContext Debug]', 'color: #ff5722; font-weight: bold', 'No images detected in this post');
    }

    console.log('----------------------------');
  });

  // Restore original debug mode if needed
  if (!oldDebugMode) {
    ImageContextDebug.disableDebug();
  }

  return 'Image detection test complete. Check the console for results.';
}

/**
 * Debug function to test image validation on all visible LinkedIn posts
 */
export async function debugImageValidation() {
  console.log('%c[ImageContext Debug]', 'color: #ff5722; font-weight: bold', 'Testing image validation on all visible posts...');

  // Force debug mode
  const oldDebugMode = ImageContextDebug.isEnabled();
  ImageContextDebug.enableDebug();

  // Find all posts
  const posts = document.querySelectorAll('.feed-shared-update-v2');
  console.log('%c[ImageContext Debug]', 'color: #ff5722; font-weight: bold', `Found ${posts.length} posts to analyze`);

  // Test image validation on each post
  for (let idx = 0; idx < posts.length; idx++) {
    const post = posts[idx];
    console.log('%c[ImageContext Debug]', 'color: #ff5722; font-weight: bold', `Analyzing post #${idx + 1}:`);

    // Find and validate images
    const validatedImages = await findAndValidatePostImages(post);

    console.log('%c[ImageContext Debug]', 'color: #ff5722; font-weight: bold',
      `Validation results for post #${idx + 1}: Found ${validatedImages.length} images`);

    // Print detailed validation results
    if (validatedImages.length > 0) {
      console.group('%c[ImageContext Debug]', 'color: #ff5722; font-weight: bold', 'Validated images:');

      validatedImages.forEach((item, imgIdx) => {
        const { image, validationResult } = item;
        const status = validationResult.valid ? '✅ Valid' : '❌ Invalid';
        const reason = validationResult.valid ? '' : ` - ${validationResult.reason}`;

        console.log(`Image #${imgIdx + 1}: ${status}${reason}`);
        console.log('- Source:', image.src);

        if (validationResult.valid) {
          console.log('- Size:', Math.round(validationResult.size / 1024), 'KB');
          console.log('- Dimensions:', `${validationResult.dimensions.width}x${validationResult.dimensions.height}`);
          console.log('- Type:', validationResult.mimeType);
        } else {
          console.log('- Message:', validationResult.message);
        }
      });

      console.groupEnd();
    } else {
      console.log('%c[ImageContext Debug]', 'color: #ff5722; font-weight: bold', 'No images detected in this post');
    }

    console.log('----------------------------');
  }

  // Restore original debug mode if needed
  if (!oldDebugMode) {
    ImageContextDebug.disableDebug();
  }

  return 'Image validation test complete. Check the console for results.';
}

// Export as a utility object for easier integration
export const ImageSelector = {
  findPostImages,
  findAndValidatePostImages,
  testFindImagesOnPage,
  debugImageDetection,
  debugImageValidation
};

// Make debug functions available in the global scope for console access
if (typeof window !== 'undefined') {
  window.debugImageDetection = debugImageDetection;
  window.debugImageValidation = debugImageValidation;
}
