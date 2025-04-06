# Image Context Feature - Implementation Plan
*Version 1.0 - Restructured for Manual Testing*

## Overview
This document outlines the implementation plan for adding image context to Gemini API requests to enhance comment suggestion quality. The plan is structured for incremental verification in Chrome, prioritizing early feedback through console logs or working functionality.

---

## Implementation Milestones

### Milestone 1: Development Setup & Image Detection
**Objective**: Create foundational infrastructure and verify image detection in LinkedIn posts

#### Steps:
1. **Setup Debug Infrastructure**
   - Implement a dedicated `ImageContextDebug` utility with console logging functions
   - Add feature flag for easy toggling during development
   - **Verification**: Toggle feature on/off with console message confirmation in Chrome
   
   **Atomic Tasks:**
   1. Create new file `js/utils/ImageContextDebug.js` with basic structure and export
   2. Implement prefix-standardized logging functions (`logInfo`, `logWarning`, `logError`)
   3. Add toggle functions to enable/disable debugging via localStorage
   4. Create global accessor through `window.EngageIQ.debug` namespace
   5. Add initialization code to activate debug tools when feature flag is enabled
   6. Create basic console styling for improved log readability
   7. Add simple verification message that appears when debug mode is toggled
   8. Document all available debug commands in code comments
   9. Test debug commands directly in Chrome console

2. **Implement Basic Image Selector**
   - Create function to locate post images in DOM
   - Use primary selector: `.update-components-image img` 
   - **Verification**: Console log image elements found on LinkedIn posts
   
   **Atomic Tasks:**
   1. Create new file `js/utils/ImageSelector.js` with basic structure
   2. Implement `findPostImages(postElement)` function to locate images within a post
   3. Add primary selector logic for standard post images (`.update-components-image img`)
   4. Add support for cached element references to improve performance
   5. Implement console logging of found image elements when in debug mode
   6. Create test function to run selector on current page posts
   7. Add export for the selector utility
   8. Connect with debug infrastructure to enable on-demand testing
   9. Test image detection on various LinkedIn post types and log results

3. **Add Image Validation**
   - Implement size and dimension checks
   - Add 5MB restriction verification
   - **Verification**: Console logs showing valid/invalid images with reason
   
   **Atomic Tasks:**
   1. Create new file `js/utils/ImageValidator.js` with validation functions
   2. Implement `validateImage(imgElement)` to check image properties
   3. Add size estimation function based on dimensions and bit depth
   4. Create dimension validation function to check width/height ranges
   5. Implement actual filesize check for images where possible
   6. Add detailed validation result object with status and reason codes
   7. Implement console logging of validation results when in debug mode
   8. Connect validation with selector utility to process found images
   9. Test validation with various image types and sizes
   10. Implement edge case handling for unusual image formats

### Milestone 2: Image Processing
**Objective**: Convert detected images to base64 format suitable for API requests

#### Steps:
1. **Create Base64 Conversion Utility**
   - Implement `imageToBase64()` function with canvas processing
   - Include dimension tracking
   - **Verification**: Console log sample of base64 output and image dimensions
   
   **Atomic Tasks:**
   1. Create new file `js/utils/ImageConverter.js` with conversion utilities
   2. Implement `createCanvas(width, height)` helper function
   3. Create `imageToBase64(imgElement, maxWidth, maxHeight)` function
   4. Add image loading to canvas with proper sizing
   5. Implement canvas-to-base64 conversion with quality settings
   6. Add dimension tracking object with original and scaled dimensions
   7. Create utility to truncate base64 string for console logging
   8. Add MIME type detection and appropriate format handling
   9. Implement console logging of conversion results when in debug mode
   10. Test conversion with various image types and dimensions

2. **Add Error Handling & Memory Management**
   - Implement try/catch with specific error types
   - Add canvas cleanup to prevent memory leaks
   - **Verification**: Console logs for conversion success/failure and memory usage
   
   **Atomic Tasks:**
   1. Create error type constants for different failure scenarios
   2. Add try/catch blocks around critical image operations
   3. Implement specific error handling for different failure types
   4. Create utility to explicitly release canvas resources after use
   5. Add tracking for canvas element count to detect leaks
   6. Implement canvas pooling to reduce allocations if needed
   7. Add console logging of memory usage statistics when in debug mode
   8. Create automated cleanup on page navigation events
   9. Implement error detail logging with suggestions for resolution
   10. Test with forced error scenarios to verify graceful handling

3. **Create Standalone Test Mode**
   - Add function to manually trigger conversion on any LinkedIn post
   - **Verification**: Invoke via console command to test conversion on demand
   
   **Atomic Tasks:**
   1. Add `testImageConversion(postElement)` function to debug utility
   2. Create DOM event handler to attach to LinkedIn post elements
   3. Implement visual feedback for selecting posts in test mode
   4. Add direct console command to process visible posts
   5. Create convenience method to test current visible post
   6. Implement results display in console with timing information
   7. Add option to save results to clipboard for sharing
   8. Create test report format with all relevant metrics
   9. Implement manual test initiation via debug commands
   10. Test the test mode in various LinkedIn post scenarios

### Milestone 3: Post Extractor Integration
**Objective**: Extend Post Extractor to include image context alongside text

#### Steps:
1. **Add Image Context Method**
   - Create `getImageContext()` in Post Extractor service
   - Integrate with image selection and conversion utilities
   - **Verification**: Console log complete context object with both text and image
   
   **Atomic Tasks:**
   1. Locate existing Post Extractor service file
   2. Analyze current methods to understand integration points
   3. Add import statements for image utilities created earlier
   4. Create new method `getImageContext(postElement)` in Post Extractor
   5. Implement integration logic with image selector and validator
   6. Add conditional conversion when valid image is found
   7. Create standard image context object structure
   8. Implement console logging of extracted context when in debug mode
   9. Add export for the new method through existing service interface
   10. Test with various LinkedIn posts to verify extraction

2. **Implement Performance Tracking**
   - Add timing measurements for image processing
   - Create performance logging utility
   - **Verification**: Console logs showing processing time for extraction and conversion
   
   **Atomic Tasks:**
   1. Create new file `js/utils/PerformanceTracker.js` for timing utilities
   2. Implement `startTiming(operationName)` and `endTiming(timerId)` functions
   3. Add high-precision timing using Performance API
   4. Create measuring points around key image operations
   5. Implement moving average calculation for operation types
   6. Add threshold warnings for operations exceeding time budget
   7. Create console visualization for timing data when in debug mode
   8. Implement persistent stats across page navigations
   9. Add export for the performance utilities
   10. Test timing accuracy with controlled operations

3. **Add Fallback Mechanism**
   - Implement graceful degradation to text-only when image processing fails
   - **Verification**: Console logs indicating fallback with reason
   
   **Atomic Tasks:**
   1. Add fallback state tracking in Post Extractor
   2. Implement detection of image processing failures
   3. Create mechanism to retry with degraded quality before falling back
   4. Add complete fallback logic to use text-only when needed
   5. Implement reason tracking for fallback decisions
   6. Create utility to analyze common fallback patterns
   7. Add console logging of fallback events with details
   8. Implement recovery mechanism to retry image processing later
   9. Create silent fallback mode for production use
   10. Test fallback behavior with various failure scenarios

### Milestone 4: API Integration
**Objective**: Modify API service to include image context in requests

#### Steps:
1. **Update Payload Structure**
   - Extend GeminiPayload interface to include image_context
   - Make field optional for backward compatibility
   - **Verification**: Console log API payload structure before sending
   
   **Atomic Tasks:**
   1. Locate existing API service file
   2. Analyze current payload structure to understand integration points
   3. Add import statements for image context utilities created earlier
   4. Create new field `image_context` in GeminiPayload interface
   5. Implement logic to include image context when available
   6. Add backward compatibility for existing API endpoints
   7. Implement console logging of updated payload structure when in debug mode
   8. Add export for the updated payload interface
   9. Test with various API requests to verify payload structure
   10. Implement payload validation to ensure correct image context format

2. **Create API Test Mode**
   - Add function to generate sample payload without sending
   - **Verification**: Console log complete API payload for inspection
   
   **Atomic Tasks:**
   1. Add `generateSamplePayload(postElement)` function to API service
   2. Implement logic to create sample payload with image context
   3. Add console logging of generated payload when in debug mode
   4. Create convenience method to test current visible post
   5. Implement results display in console with payload details
   6. Add option to save results to clipboard for sharing
   7. Create test report format with all relevant metrics
   8. Implement manual test initiation via debug commands
   9. Test the test mode in various LinkedIn post scenarios
   10. Implement payload validation to ensure correct image context format

3. **Implement Conditional API Requests**
   - Update request builder to include image when available
   - Add feature flag check before including image data
   - **Verification**: Console log differences between requests with/without images
   
   **Atomic Tasks:**
   1. Locate existing request builder file
   2. Analyze current request logic to understand integration points
   3. Add import statements for image context utilities created earlier
   4. Create new logic to include image context when available
   5. Implement feature flag check to enable/disable image inclusion
   6. Add console logging of request differences when in debug mode
   7. Implement request validation to ensure correct image context format
   8. Add export for the updated request builder
   9. Test with various API requests to verify request structure
   10. Implement request logging to track image inclusion

### Milestone 5: End-to-End Functionality
**Objective**: Complete the feature with error handling and full integration

#### Steps:
1. **Implement API Error Recovery**
   - Add fallback to text-only on API rejection
   - Create specific error handling for image-related failures
   - **Verification**: Force errors and verify fallback behavior via console logs
   
   **Atomic Tasks:**
   1. Locate existing API error handling file
   2. Analyze current error handling logic to understand integration points
   3. Add import statements for image context utilities created earlier
   4. Create new logic to handle API rejection with fallback to text-only
   5. Implement specific error handling for image-related failures
   6. Add console logging of error recovery when in debug mode
   7. Implement error detail logging with suggestions for resolution
   8. Add export for the updated error handling
   9. Test with forced error scenarios to verify fallback behavior
   10. Implement error tracking to detect recurring issues

2. **Optimize Performance**
   - Review timing logs and optimize slow operations
   - Implement caching if needed
   - **Verification**: Console logs comparing before/after optimizations
   
   **Atomic Tasks:**
   1. Review timing logs to identify slow operations
   2. Analyze code to understand performance bottlenecks
   3. Implement optimizations for slow operations
   4. Add caching for frequently accessed data
   5. Implement console logging of performance improvements when in debug mode
   6. Add export for the optimized code
   7. Test with various scenarios to verify performance improvements
   8. Implement performance tracking to detect regressions
   9. Create automated testing for performance-critical code
   10. Implement continuous integration to ensure performance

3. **Complete End-to-End Testing**
   - Test with various LinkedIn post types
   - Verify with different image sizes/types
   - **Verification**: Feature works correctly with console logs at each step
   
   **Atomic Tasks:**
   1. Create test suite for end-to-end testing
   2. Implement tests for various LinkedIn post types
   3. Add tests for different image sizes and types
   4. Implement console logging of test results when in debug mode
   5. Add export for the test suite
   6. Test with various scenarios to verify feature functionality
   7. Implement test tracking to detect recurring issues
   8. Create automated testing for critical code paths
   9. Implement continuous integration to ensure feature stability
   10. Verify feature functionality with console logs at each step

### Milestone 6: Analytics & Refinement
**Objective**: Add measurement capabilities and refine based on real usage

#### Steps:
1. **Implement Success Tracking**
   - Add counters for successful image inclusions
   - Track and categorize failure reasons
   - **Verification**: Console logs showing usage statistics
   
   **Atomic Tasks:**
   1. Create new file `js/utils/SuccessTracker.js` for tracking utilities
   2. Implement `trackSuccess()` function to increment success counters
   3. Add logic to track and categorize failure reasons
   4. Implement console logging of usage statistics when in debug mode
   5. Add export for the tracking utilities
   6. Test with various scenarios to verify tracking functionality
   7. Implement tracking to detect recurring issues
   8. Create automated testing for tracking-critical code
   9. Implement continuous integration to ensure tracking accuracy
   10. Verify tracking functionality with console logs

2. **Add User Preference Toggle**
   - Create UI setting to enable/disable image context
   - Implement storage for preference
   - **Verification**: Toggle setting and verify via console logs
   
   **Atomic Tasks:**
   1. Create new file `js/utils/UserPreference.js` for preference utilities
   2. Implement `toggleImageContext()` function to enable/disable image context
   3. Add logic to store preference in localStorage
   4. Implement console logging of preference changes when in debug mode
   5. Add export for the preference utilities
   6. Test with various scenarios to verify preference functionality
   7. Implement preference tracking to detect recurring issues
   8. Create automated testing for preference-critical code
   9. Implement continuous integration to ensure preference stability
   10. Verify preference functionality with console logs

3. **Prepare for Production**
   - Clean up debug logs
   - Finalize feature flag settings
   - **Verification**: Final verification in Chrome with production settings
   
   **Atomic Tasks:**
   1. Review code to remove debug logs and console statements
   2. Finalize feature flag settings for production use
   3. Implement console logging of production settings when in debug mode
   4. Add export for the production-ready code
   5. Test with various scenarios to verify production functionality
   6. Implement production tracking to detect recurring issues
   7. Create automated testing for production-critical code
   8. Implement continuous integration to ensure production stability
   9. Verify production functionality with console logs
   10. Finalize documentation for production use

---

## Testing Commands

The following console commands can be used for manual testing during development:

```javascript
// Toggle image context feature
window.EngageIQ.debug.toggleImageContext();

// Test image detection on current post
window.EngageIQ.debug.detectPostImages();

// Test full image context generation
window.EngageIQ.debug.generateImageContext();

// Show API payload with image included
window.EngageIQ.debug.showImageApiPayload();
```

## Implementation Notes

- All verification steps should include console logs with prefix `[ImageContext]` for easy filtering
- Each milestone should be testable independently in Chrome
- Use localStorage-based feature flag for easy toggling during development
- Performance goal: image processing should complete within 300ms
- Memory usage should not exceed 50MB for image processing
