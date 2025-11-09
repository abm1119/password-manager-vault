---
description: Repository Information Overview
alwaysApply: true
---

# Repository Information Overview

## Repository Summary
NotionVault is a secure, feature-rich password manager offering desktop (Tkinter) and web (Flask) applications, along with a Chrome extension for browser integration. It uses AES encryption with PBKDF2 for security, storing data in an encrypted SQLite database.

## Repository Structure
- **templates/**: HTML templates for the Flask web app
- **test/**: Test files for the Python application
- **PM_chrome_Extention/**: Chrome extension files including manifest, scripts, and assets
- **app.py**: Main desktop application entry point
- **web_app.py**: Flask web application entry point
- **db_handler.py**: Database operations module
- **password_utils.py**: Password encryption utilities
- **requirements.txt**: Main Python dependencies
- **requirements-dev.txt**: Development dependencies

### Main Repository Components
- **Desktop App**: Tkinter-based GUI with TTKBootstrap theming
- **Web App**: Flask-based responsive web interface
- **Chrome Extension**: Browser extension for password management
- **Database Layer**: SQLite with encryption

## Projects

### Main Python Application
**Configuration File**: requirements.txt

#### Language & Runtime
**Language**: Python
**Version**: 3.8+
**Build System**: None
**Package Manager**: pip

#### Dependencies
**Main Dependencies**:
- pyperclip==1.8.2
- ttkbootstrap==1.10.1
- flask==3.0.0
- waitress==3.0.0
**Development Dependencies**:
- black==23.12.1
- flake8==7.0.0
- pytest==7.4.4
- pytest-cov==4.1.0

#### Build & Installation
```bash
pip install -r requirements.txt
```

#### Main Files & Resources
**Entry Points**:
- Desktop: app.py
- Web: web_app.py
**Configuration**: Environment variables (SECRET_KEY, PORT, FLASK_ENV)

#### Testing
**Framework**: pytest
**Test Location**: test/
**Naming Convention**: test_*.py
**Configuration**: None specific
**Run Command**:
```bash
python -m pytest
```

### Chrome Extension
**Configuration File**: PM_chrome_Extention/manifest.json

#### Language & Runtime
**Language**: JavaScript
**Version**: Not specified
**Build System**: None
**Package Manager**: None

#### Dependencies
**Main Dependencies**: None
**Development Dependencies**: None

#### Build & Installation
Load the PM_chrome_Extention/ directory as an unpacked extension in Chrome developer mode.

#### Main Files & Resources
**Entry Points**:
- Background: background.js
- Content: content.js
- Popup: popup.html, popup.js
**Configuration**: manifest.json (v3)

#### Testing
No testing framework or files found.