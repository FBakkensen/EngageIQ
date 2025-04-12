// ImageContextTest.js
// Standalone test mode for image context functionality

import { ImageContextDebug } from './ImageContextDebug.js';
import { ImageConverter } from './ImageConverter.js';
import { PerformanceTracker } from './PerformanceTracker.js';

/**
 * Test mode states
 */
const TestModes = {
  INACTIVE: 'inactive',
  POST_SELECTION: 'post_selection',
  IMAGE_DETECTION: 'image_detection',
  IMAGE_CONVERSION: 'image_conversion'
};

/**
 * Stores the current test mode state
 */
let currentTestMode = TestModes.INACTIVE;
let testOverlays = [];

/**
 * Activate post selection mode
 * Applies overlay to posts for user selection
 */
function activatePostSelectionMode() {
  // Clean up any existing overlays
  cleanupOverlays();

  // Set mode
  currentTestMode = TestModes.POST_SELECTION;

  // Find all posts in the feed
  const posts = document.querySelectorAll('.feed-shared-update-v2');

  if (!posts || posts.length === 0) {
    ImageContextDebug.logWarning('No LinkedIn posts found on current page');
    return false;
  }

  ImageContextDebug.logInfo(`Found ${posts.length} posts. Click on a post to test image context.`);

  // Create overlays for each post
  posts.forEach((post, index) => {
    const overlay = createPostOverlay(post, index);
    if (overlay) {
      testOverlays.push(overlay);
    }
  });

  // Display instructions
  showTestInstructions(`Click on a post to test, or type 'window.EngageIQ.debug.cancelImageTest()' to cancel.`);

  return true;
}

/**
 * Create an overlay for a post element
 * @param {HTMLElement} postElement - The LinkedIn post element
 * @param {number} index - Index of the post
 * @returns {HTMLElement} The created overlay element
 */
function createPostOverlay(postElement, index) {
  try {
    const overlay = document.createElement('div');
    const rect = postElement.getBoundingClientRect();

    // Style the overlay
    Object.assign(overlay.style, {
      position: 'absolute',
      top: `${window.scrollY + rect.top}px`,
      left: `${window.scrollX + rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      background: 'rgba(75, 192, 192, 0.2)',
      border: '2px solid #4BC0C0',
      zIndex: '9999',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    });

    // Create label
    const label = document.createElement('div');
    Object.assign(label.style, {
      background: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: 'bold'
    });
    label.textContent = `Test Post #${index + 1}`;
    overlay.appendChild(label);

    // Add click handler
    overlay.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectPostForTesting(postElement);
    });

    document.body.appendChild(overlay);
    return overlay;
  } catch (error) {
    ImageContextDebug.logError('Error creating post overlay', error);
    return null;
  }
}

/**
 * Handle post selection for testing
 * @param {HTMLElement} postElement - The LinkedIn post element
 */
function selectPostForTesting(postElement) {
  cleanupOverlays();
  currentTestMode = TestModes.IMAGE_DETECTION;

  ImageContextDebug.logInfo('Post selected for testing', postElement);

  // Find images in the post
  const timerId = PerformanceTracker.startTiming('imageDetection');
  const images = findPostImages(postElement);
  PerformanceTracker.endTiming(timerId);

  if (!images || images.length === 0) {
    ImageContextDebug.logWarning('No images found in selected post');
    showTestResult('No images found', 'warning');
    currentTestMode = TestModes.INACTIVE;
    return;
  }

  ImageContextDebug.logInfo(`Found ${images.length} images in post`, images);
  highlightImages(postElement, images);

  // Display image count
  showTestResult(`Found ${images.length} image${images.length > 1 ? 's' : ''}. Processing...`, 'info');

  // Process after a short delay to allow UI to update
  setTimeout(() => {
    processImages(postElement, images);
  }, 500);
}

/**
 * Find all images within a LinkedIn post
 * @param {HTMLElement} postElement - LinkedIn post element
 * @returns {HTMLImageElement[]} Array of image elements
 */
function findPostImages(postElement) {
  if (!postElement) return [];

  // Primary selector for standard post images
  const images = Array.from(postElement.querySelectorAll('.update-components-image img'));

  // Secondary selector for other potential image containers
  if (images.length === 0) {
    const altImages = Array.from(postElement.querySelectorAll('img'));
    // Filter out small icons, avatars, etc.
    return altImages.filter(img => {
      const width = img.width || img.naturalWidth;
      const height = img.height || img.naturalHeight;
      return width >= 100 && height >= 100; // Minimum size threshold
    });
  }

  return images;
}

/**
 * Highlight images in the post for visualization
 * @param {HTMLElement} postElement - LinkedIn post element
 * @param {HTMLImageElement[]} images - Array of found images
 */
function highlightImages(postElement, images) {
  images.forEach((img, index) => {
    try {
      const rect = img.getBoundingClientRect();

      // Create highlight overlay
      const overlay = document.createElement('div');
      Object.assign(overlay.style, {
        position: 'absolute',
        top: `${window.scrollY + rect.top}px`,
        left: `${window.scrollX + rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        border: '3px solid #4CAF50',
        boxShadow: '0 0 10px rgba(76, 175, 80, 0.5)',
        zIndex: '9998',
        pointerEvents: 'none',
        boxSizing: 'border-box'
      });

      // Create label
      const label = document.createElement('div');
      Object.assign(label.style, {
        position: 'absolute',
        top: '0',
        right: '0',
        background: '#4CAF50',
        color: 'white',
        padding: '2px 6px',
        fontSize: '12px',
        fontWeight: 'bold',
        borderBottomLeftRadius: '4px'
      });
      label.textContent = `Image #${index + 1}`;
      overlay.appendChild(label);

      document.body.appendChild(overlay);
      testOverlays.push(overlay);
    } catch (error) {
      ImageContextDebug.logError(`Error highlighting image ${index}`, error);
    }
  });
}

/**
 * Process images for conversion test
 * @param {HTMLElement} postElement - LinkedIn post element
 * @param {HTMLImageElement[]} images - Array of found images
 */
async function processImages(postElement, images) {
  currentTestMode = TestModes.IMAGE_CONVERSION;

  try {
    const totalTimer = PerformanceTracker.startTiming('totalProcessing');
    const results = await ImageConverter.testImageConversion(postElement);
    PerformanceTracker.endTiming(totalTimer);

    // Visualize performance
    PerformanceTracker.visualizePerformance();

    // Show results
    if (results.success) {
      const successRate = (results.successfulConversions / results.totalImages) * 100;
      showTestResult(
        `Successfully processed ${results.successfulConversions}/${results.totalImages} images ` +
        `(${successRate.toFixed(0)}%) in ${results.totalProcessingTime}`,
        successRate === 100 ? 'success' : 'warning'
      );
    } else {
      showTestResult(`Test failed: ${results.message}`, 'error');
    }
  } catch (error) {
    ImageContextDebug.logError('Error processing images', error);
    showTestResult('Error processing images. Check console for details.', 'error');
  }

  // Reset test mode after a delay
  setTimeout(() => {
    currentTestMode = TestModes.INACTIVE;
    cleanupOverlays();
  }, 5000);
}

/**
 * Display test instructions/information to the user
 * @param {string} message - Message to display
 */
function showTestInstructions(message) {
  showFloatingMessage(message, 'info');
}

/**
 * Display test results to the user
 * @param {string} message - Result message
 * @param {string} type - Message type (success, warning, error, info)
 */
function showTestResult(message, type = 'info') {
  showFloatingMessage(message, type);
}

/**
 * Show a floating message on screen
 * @param {string} message - Message to display
 * @param {string} type - Message type (success, warning, error, info)
 */
function showFloatingMessage(message, type = 'info') {
  try {
    // Remove any existing messages
    const existingMsg = document.querySelector('.engageiq-test-message');
    if (existingMsg) {
      existingMsg.remove();
    }

    // Create message element
    const msgEl = document.createElement('div');
    msgEl.className = 'engageiq-test-message';

    // Set styles based on type
    const bgColor = {
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
      info: '#2196F3'
    }[type] || '#2196F3';

    Object.assign(msgEl.style, {
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: bgColor,
      color: 'white',
      padding: '12px 24px',
      borderRadius: '4px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
      zIndex: '10000',
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      textAlign: 'center',
      maxWidth: '80%',
      opacity: '0',
      transition: 'opacity 0.3s ease'
    });

    msgEl.textContent = message;
    document.body.appendChild(msgEl);
    testOverlays.push(msgEl);

    // Fade in
    setTimeout(() => {
      msgEl.style.opacity = '1';
    }, 10);

    // Auto remove after 8 seconds if it's just an info message
    if (type === 'info') {
      setTimeout(() => {
        if (msgEl.parentNode) {
          msgEl.style.opacity = '0';
          setTimeout(() => {
            if (msgEl.parentNode) {
              msgEl.remove();
            }
          }, 300);
        }
      }, 8000);
    }
  } catch (error) {
    ImageContextDebug.logError('Error showing floating message', error);
  }
}

/**
 * Clean up all test overlays
 */
function cleanupOverlays() {
  // Remove all overlays
  testOverlays.forEach(overlay => {
    try {
      if (overlay && overlay.parentNode) {
        overlay.remove();
      }
    } catch (e) {
      // Ignore errors during cleanup
    }
  });

  testOverlays = [];
}

/**
 * Cancel current image test
 */
function cancelImageTest() {
  cleanupOverlays();
  currentTestMode = TestModes.INACTIVE;
  ImageContextDebug.logInfo('Image context test cancelled');
  return true;
}

/**
 * Get current test mode
 * @returns {string} Current test mode name
 */
function getCurrentTestMode() {
  return currentTestMode;
}

/**
 * Test image context on the current visible post
 * @returns {boolean} Success status
 */
function testCurrentPost() {
  // Find the most visible post
  const posts = document.querySelectorAll('.feed-shared-update-v2');
  if (!posts || posts.length === 0) {
    ImageContextDebug.logWarning('No posts found on current page');
    return false;
  }

  // Find the post most visible in viewport
  let mostVisiblePost = null;
  let maxVisibility = 0;

  posts.forEach(post => {
    const rect = post.getBoundingClientRect();
    const viewport = {
      height: window.innerHeight,
      width: window.innerWidth
    };

    // Check if in viewport
    if (rect.top <= viewport.height && rect.bottom >= 0) {
      // Calculate percentage in viewport
      const visibleHeight = Math.min(rect.bottom, viewport.height) - Math.max(rect.top, 0);
      const percentVisible = (visibleHeight / rect.height) * 100;

      if (percentVisible > maxVisibility) {
        maxVisibility = percentVisible;
        mostVisiblePost = post;
      }
    }
  });

  if (!mostVisiblePost) {
    ImageContextDebug.logWarning('No posts visible in viewport');
    return false;
  }

  // Select this post for testing
  selectPostForTesting(mostVisiblePost);
  return true;
}

// Register global test functions when debug is enabled
if (typeof window !== 'undefined' && ImageContextDebug.isEnabled()) {
  window.EngageIQ = window.EngageIQ || {};
  window.EngageIQ.debug = window.EngageIQ.debug || {};

  // Register test commands
  window.EngageIQ.debug.testImageContext = activatePostSelectionMode;
  window.EngageIQ.debug.cancelImageTest = cancelImageTest;
  window.EngageIQ.debug.testCurrentPost = testCurrentPost;

  ImageContextDebug.logInfo('Image context test module initialized. Use window.EngageIQ.debug.testImageContext() to start testing.');
}

// Export test module
export const ImageContextTest = {
  activatePostSelectionMode,
  cancelImageTest,
  testCurrentPost,
  findPostImages,
  getCurrentTestMode,
  TestModes
};

// Export for direct import
export {
  activatePostSelectionMode,
  cancelImageTest,
  testCurrentPost,
  findPostImages
};