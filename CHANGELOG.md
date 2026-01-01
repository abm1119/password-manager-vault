# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-12-31
### Added
- Complete rewrite of the Chrome Extension using Manifest V3.
- Integrated Native Messaging for seamless communication between browser and desktop.
- Responsive Web Dashboard built with Tailwind CSS.
- Enhanced security with PBKDF2 (200,000 iterations).
- Modular "Blocks" system for storing notes, tables, and credentials.
- Dark mode support for Desktop App using ttkbootstrap.

### Fixed
- Fixed password saving bug in the Chrome extension.
- Improved credential detection in various web forms.
- Resolved database locking issues when multiple clients are open.

### Changed
- Migrated from simple JSON storage to SQLite for the main vault.
- Updated project structure for better maintainability.

## [1.0.0] - 2024-06-15
### Added
- Initial release of NotionVault Desktop.
- Basic password storage and encryption.
- Simple Chrome extension for auto-fill.
