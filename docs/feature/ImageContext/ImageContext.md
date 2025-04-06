# Image Context for Gemini - Feature PRD
*Version 1.0*

## Objective
Enhance EngageIQ's suggestion quality by incorporating LinkedIn post images as context for Gemini.

## Phase 1 Implementation
### Core Functionality
- Single-image support (direct base64 conversion)
- Automatic opt-in (default enabled)
- DOM-based image capture:
  ```javascript
  document.querySelector('.update-components-image img')
  ```

### Technical Specifications
- Max size: 5MB (LinkedIn's limit)
- Format: JPEG/PNG
- Payload field: `image_context: { base64: string }`

### Error Handling
- Skip if >5MB
- Fallback to text-only on processing failure

## Metrics
- Image usage rate (success/fail)
- Suggestion quality impact (A/B test)

## Future Considerations
- Multi-image carousel support
- User preference toggle
