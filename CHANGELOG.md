# Changelog

All notable changes to the EngageIQ Chrome Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-04-02

### Changed

- Refactored entire codebase to adhere to a 200-line limit per file
- Implemented ES6 module system across all JavaScript files
- Updated HTML files to support ES6 modules
- Restructured codebase into organized directories:
  - `js/models/`: Data models and API configurations
  - `js/services/`: Business logic and data processing
  - `js/ui/`: User interface components
  - `js/utils/`: Helper functions and utilities

### Added

- Added comprehensive documentation on code structure in README.md
- Created module dependency visualization

### Security

- Improved code organization for better maintainability and security

## [1.0.0] - 2025

### Added

- Initial release of EngageIQ Chrome Extension
- AI-powered comment generation for LinkedIn posts
- Six different comment types based on LinkedIn reactions
- Contextual understanding of post content
- Model selection for Gemini API
- Comment length adjustment feature
- One-click comment insertion
