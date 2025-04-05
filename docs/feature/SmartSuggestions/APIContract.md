# Smart Suggestions API Contract

## Overview

This document defines the formal API contract for the Smart Suggestions feature's integration with the Gemini API. It includes the detailed request and response formats, error handling, and integration specifications.

## Direction Analysis API

### Request Format

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "Analyze this LinkedIn post and suggest 3-4 different approaches for commenting on it. For each approach, provide a title, a brief description, and a relevant emoji. The post is: [POST_CONTENT]"
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.2,
    "topK": 40,
    "topP": 0.95,
    "maxOutputTokens": 1024
  }
}
```

### Expected Response Format

```json
{
  "directions": [
    {
      "title": "Supportive Feedback",
      "description": "Offer encouragement and positive reinforcement on the ideas shared",
      "emoji": "👏"
    },
    {
      "title": "Ask for Clarification",
      "description": "Pose thoughtful questions to better understand specific points",
      "emoji": "🤔"
    },
    {
      "title": "Share Personal Experience",
      "description": "Relate to the post with a relevant personal anecdote",
      "emoji": "🔗"
    },
    {
      "title": "Add Industry Insight",
      "description": "Contribute additional context from industry knowledge or trends",
      "emoji": "💡"
    }
  ]
}
```

## Comment Generation API

### Request Format

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "Generate 3 different comments for a LinkedIn post about [POST_SUMMARY]. The comments should focus on [SELECTED_DIRECTION]. Make each comment distinct in perspective and length (short, medium, and detailed). Original post: [POST_CONTENT]"
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.7,
    "topK": 40,
    "topP": 0.95,
    "maxOutputTokens": 1024
  }
}
```

### Expected Response Format

```json
{
  "comments": [
    {
      "text": "Great insights! I've found similar approaches work well in my experience too.",
      "type": "short"
    },
    {
      "text": "I appreciate you sharing these thoughts. In my team, we've implemented something similar last quarter and saw a 20% improvement in engagement. Have you measured the impact in your organization?",
      "type": "medium"
    },
    {
      "text": "This resonates strongly with my experiences in the field. When our company adopted this approach three years ago, we initially struggled with X challenge but ultimately found that by focusing on Y aspect, we were able to achieve significant improvements in Z metrics. I'd be curious to hear if others have encountered similar patterns when implementing these strategies across different industries.",
      "type": "detailed"
    }
  ],
  "direction": "Share Personal Experience"
}
```

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional error context or troubleshooting information"
  }
}
```

### Common Error Codes

| Error Code | Description | Recommended Handling |
|------------|-------------|----------------------|
| `RATE_LIMIT_EXCEEDED` | API rate limit reached | Implement exponential backoff, retry after delay |
| `INVALID_REQUEST` | Malformed request | Check request format and parameters |
| `TOKEN_LIMIT_EXCEEDED` | Input too large | Truncate input content |
| `API_ERROR` | Gemini API error | Display generic error to user, retry with fallback |
| `TIMEOUT` | Request timed out | Retry with exponential backoff |

## Integration Notes

1. **Authentication**: All requests must include the user's Gemini API key in the Authorization header
2. **Content Processing**: Post content should be sanitized to remove HTML and excessive whitespace
3. **Response Parsing**: Implement robust parsing with fallbacks for unexpected response formats
4. **Caching**: Cache both direction analysis and comment generation responses with appropriate TTLs
5. **Monitoring**: Track API usage and error rates to optimize performance
