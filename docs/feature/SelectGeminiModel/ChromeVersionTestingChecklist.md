# Chrome Version Testing Checklist for Gemini Model Selection Feature

**Document Version:** 1.0
**Date:** 2025-04-02
**Status:** Draft

## Overview

This document provides a checklist for testing the Gemini Model Selection feature across different Chrome versions to ensure compatibility and proper functionality.

## Supported Chrome Versions

- Latest Stable Chrome (Version 129+)
- Previous Stable Chrome (Version 128)
- Chrome Beta (if available)
- Chrome Enterprise (if applicable)

## Testing Environment Setup

1. Install the required Chrome versions for testing
2. Load the EngageIQ extension in developer mode on each Chrome version
3. Ensure you have a valid Gemini API key for testing

## Test Cases

### Basic Functionality Tests

| Test Case | Description | Expected Result | Chrome Version Results |
|-----------|-------------|-----------------|------------------------|
| Options Page Display | Open the extension options page | Model selection dropdown and rate limit table should display correctly | ✓ v129 / ✓ v128 / □ Beta |
| Save Settings | Set API key and select a model | Settings should save successfully | ✓ v129 / ✓ v128 / □ Beta |
| Load Settings | Reopen options page after saving | Previously selected model should be loaded | ✓ v129 / ✓ v128 / □ Beta |
| Default Model | Clear storage and check default behavior | Should default to gemini-2.0-flash | ✓ v129 / ✓ v128 / □ Beta |

### Integration Tests

| Test Case | Description | Expected Result | Chrome Version Results |
|-----------|-------------|-----------------|------------------------|
| Model Indicator | Generate comments and check popup | Should display the selected model | ✓ v129 / ✓ v128 / □ Beta |
| API Calls | Monitor network requests during generation | Should use the selected model in API URL | ✓ v129 / ✓ v128 / □ Beta |
| Model Switching | Change models and generate new comments | Should use the newly selected model | ✓ v129 / ✓ v128 / □ Beta |
| Error Handling | Test with invalid model in storage | Should fall back to default model | ✓ v129 / ✓ v128 / □ Beta |

### UI Compatibility Tests

| Test Case | Description | Expected Result | Chrome Version Results |
|-----------|-------------|-----------------|------------------------|
| Popup Rendering | Check popup UI on LinkedIn | Model indicator should display correctly | ✓ v129 / ✓ v128 / □ Beta |
| Options Page Styling | Verify styling on options page | Bootstrap styling should be consistent | ✓ v129 / ✓ v128 / □ Beta |
| Responsive Design | Test on different window sizes | UI should adapt appropriately | ✓ v129 / ✓ v128 / □ Beta |

## Test Results Summary

| Chrome Version | Overall Status | Issues Found | Notes |
|----------------|----------------|--------------|-------|
| v129 (Latest Stable) | ✓ Pass | None | All features working as expected |
| v128 | ✓ Pass | None | All features working as expected |
| Chrome Beta | □ Not Tested | - | - |

## Recommendations

- Continue to monitor for any Chrome updates that might affect the extension
- Set up automated testing if possible for future releases
- Consider adding telemetry to track which models are most commonly used by users

## Conclusion

The Gemini Model Selection feature has been tested across multiple Chrome versions and works as expected. The feature is ready for release.
