# UI/UX Wireframes for Smart Suggestions

## Overview

This document provides detailed wireframes and UI considerations for the Smart Suggestions feature, focusing on Bootstrap 5 implementation and responsive design principles.

## Screen Flow

```
LinkedIn Post → EngageIQ Button → Direction Selection Screen → Comment Generation Screen → Comment Posted
```

## Direction Selection Screen

### Desktop/Tablet View

```
+-----------------------------------------------+
| EngageIQ                               [×]    |
+-----------------------------------------------+
| Select a comment direction:                   |
|                                               |
| +-------------------+  +-------------------+ |
| | 🔍                 |  | 💼                 | |
| | Technical Analysis |  | Business Impact   | |
| | Discuss technology |  | Discuss value     | |
| +-------------------+  +-------------------+ |
|                                               |
| +-------------------+  +-------------------+ |
| | 🙋                 |  | 🔄                 | |
| | Ask a Question    |  | Share Experience  | |
| | Inquire details   |  | Relate personally | |
| +-------------------+  +-------------------+ |
|                                               |
| Loading suggestions... (initially hidden)     |
+-----------------------------------------------+
|            Powered by Gemini                  |
+-----------------------------------------------+
```

### Mobile View

```
+--------------------------------+
| EngageIQ                  [×] |
+--------------------------------+
| Select a comment direction:    |
|                                |
| +----------------------------+ |
| | 🔍 Technical Analysis      | |
| | Discuss technology         | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | 💼 Business Impact         | |
| | Discuss value              | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | 🙋 Ask a Question          | |
| | Inquire details            | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | 🔄 Share Experience        | |
| | Relate personally          | |
| +----------------------------+ |
+--------------------------------+
|       Powered by Gemini        |
+--------------------------------+
```

## Comment Generation Screen

### Desktop/Tablet View

```
+-----------------------------------------------+
| EngageIQ             [← Back]          [×]    |
+-----------------------------------------------+
| Technical Analysis Comments:                  |
|                                               |
| +-------------------------------------------+ |
| | Comment Option 1                      [✓] | |
| | The AI technology used in this product     | |
| | demonstrates significant advances in...    | |
| | [Shorter] [Longer]                         | |
| +-------------------------------------------+ |
|                                               |
| +-------------------------------------------+ |
| | Comment Option 2                      [✓] | |
| | From a technical perspective, I appreciate | |
| | how they've addressed the challenge of...  | |
| | [Shorter] [Longer]                         | |
| +-------------------------------------------+ |
|                                               |
| +-------------------------------------------+ |
| | Comment Option 3                      [✓] | |
| | Looking at the technical implementation,   | |
| | there are several innovative approaches... | |
| | [Shorter] [Longer]                         | |
| +-------------------------------------------+ |
+-----------------------------------------------+
|            Powered by Gemini                  |
+-----------------------------------------------+
```

### Mobile View

```
+--------------------------------+
| EngageIQ     [← Back]     [×] |
+--------------------------------+
| Technical Analysis Comments:   |
|                                |
| +----------------------------+ |
| | Comment Option 1       [✓] | |
| | The AI technology used in   | |
| | this product demonstrates...| |
| |                            | |
| | [Shorter]    [Longer]      | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | Comment Option 2       [✓] | |
| | From a technical perspective,| |
| | I appreciate how they've... | |
| |                            | |
| | [Shorter]    [Longer]      | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | Comment Option 3       [✓] | |
| | Looking at the technical    | |
| | implementation, there are...| |
| |                            | |
| | [Shorter]    [Longer]      | |
| +----------------------------+ |
+--------------------------------+
|       Powered by Gemini        |
+--------------------------------+
```

## Loading States

### Direction Selection Loading

```
+-----------------------------------------------+
| EngageIQ                               [×]    |
+-----------------------------------------------+
| Select a comment direction:                   |
|                                               |
| [Cards are slightly faded with overlay]       |
|                                               |
| +---------------------------------------+     |
| |                                       |     |
| |       [Spinner]                       |     |
| |  Analyzing post content...            |     |
| |                                       |     |
| +---------------------------------------+     |
|                                               |
+-----------------------------------------------+
|            Powered by Gemini                  |
+-----------------------------------------------+
```

### Comment Generation Loading

```
+-----------------------------------------------+
| EngageIQ             [← Back]          [×]    |
+-----------------------------------------------+
| Technical Analysis Comments:                  |
|                                               |
| +---------------------------------------+     |
| |                                       |     |
| |       [Spinner]                       |     |
| |  Generating comments...               |     |
| |                                       |     |
| +---------------------------------------+     |
|                                               |
+-----------------------------------------------+
|            Powered by Gemini                  |
+-----------------------------------------------+
```

## Error States

### API Error

```
+-----------------------------------------------+
| EngageIQ                               [×]    |
+-----------------------------------------------+
| ⚠️ Something went wrong                       |
|                                               |
| We couldn't generate suggestions at this time.|
| Please try again later.                       |
|                                               |
| [Try Again]                                   |
+-----------------------------------------------+
|            Powered by Gemini                  |
+-----------------------------------------------+
```

## Bootstrap 5 Component Mapping

### Direction Selection Screen

| UI Element | Bootstrap 5 Component | Classes |
|------------|------------------------|------------|
| Direction Card | Card | `card`, `h-100` |
| Direction Icon | Icon | `bi-*` (Bootstrap Icons) |
| Direction Title | Card Title | `card-title` |
| Direction Description | Card Text | `card-text`, `small` |
| Card Container | Grid | `row`, `row-cols-1 row-cols-md-2 g-3` |
| Loading State | Spinner | `spinner-border`, `text-primary` |

### Comment Generation Screen

| UI Element | Bootstrap 5 Component | Classes |
|------------|------------------------|------------|
| Back Button | Button | `btn`, `btn-sm`, `btn-outline-secondary` |
| Comment Card | Card | `card`, `mb-3` |
| Accept Button | Button | `btn`, `btn-sm`, `btn-success` |
| Length Controls | Button Group | `btn-group`, `btn-group-sm` |
| Shorter/Longer Buttons | Button | `btn`, `btn-outline-secondary` |

## Accessibility Considerations

### Keyboard Navigation

- Ensure all cards and buttons are tabbable
- Implement arrow key navigation between direction cards
- Add keyboard shortcuts for common actions (Enter for select, Esc for back)

### Screen Readers

- Add proper ARIA labels to all interactive elements
- Ensure loading states are announced properly
- Provide clear feedback when direction is selected

### Color Contrast

- Ensure all text meets WCAG AA standards for contrast
- Don't rely solely on color to indicate selection state
- Add visual indicators beyond color (icons, borders)

## Animation and Transitions

### Between Screens

- Implement slide transition between direction and comment screens
- Use fade-in animation for newly loaded content
- Keep animations subtle and quick (200-300ms)

### Selection Feedback

- Highlight selected direction card with animation
- Use subtle scale transform on hover/focus
- Add micro-interactions for selection confirmation

## Responsive Design Breakpoints

| Breakpoint | Layout Adjustment |
|------------|---------------------|
| < 576px (xs) | Single column layout, stacked cards |
| ≥ 576px (sm) | Single column, larger spacing |
| ≥ 768px (md) | Two-column layout for direction cards |
| ≥ 992px (lg) | Larger text, more spacing |

## Implementation Notes

- Use Bootstrap 5 grid system for responsive layouts
- Leverage built-in Bootstrap utilities for spacing and alignment
- Avoid custom CSS wherever possible, use Bootstrap variables
- Ensure UI is consistent with existing EngageIQ styles
