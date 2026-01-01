# 🔐 NotionVault: Technical Documentation & Architecture Reference

Welcome to the official technical documentation for **NotionVault**. This document provides an in-depth analysis of the system's architecture, security methodologies, data flow, and integration patterns.

---

## 📑 Table of Contents
1. [Executive Summary](#-executive-summary)
2. [System Architecture](#-system-architecture)
3. [Security Methodology](#-security-methodology)
4. [Data Layer & Schema](#-data-layer--schema)
5. [Component Breakdown](#-component-breakdown)
6. [API Reference](#-api-reference)
7. [Integration & Native Messaging](#-integration--native-messaging)
8. [Development Lifecycle](#-development-lifecycle)

---

## 🚀 Executive Summary

**NotionVault** is a modern, full-stack password management ecosystem designed to offer a seamless experience across desktop environments, web browsers, and browser extensions. It prioritizes local-first security while providing the flexibility of a web-based dashboard and the convenience of a Chrome extension for auto-filling credentials.

---

## 🏗 System Architecture

NotionVault follows a **Decentralized Multi-Client Architecture**. All clients (Desktop, Web, Extension) interface with a centralized encrypted SQLite database, but each client handles encryption/decryption locally or within its own session context.

### 🖼 Architectural Diagram
![NotionVault Architecture](./arch-diagram.png)

### Core Components:
1.  **Desktop App (Tkinter)**: The primary offline management tool. It interacts directly with the local SQLite database.
2.  **Web App (Flask)**: Provides a responsive dashboard and exposes a RESTful API for the browser extension.
3.  **Chrome Extension**: A browser-integrated client that fetches credentials via the Web API and supports auto-fill functionality.
4.  **Native Messaging Host**: A bridge between the browser extension and the local system, allowing for tighter integration (e.g., direct DB access or system-level actions).

---

## 🔒 Security Methodology

Security in NotionVault is built on industry-standard cryptographic primitives.

### 1. Key Derivation (PBKDF2)
Instead of storing the master password, NotionVault uses **PBKDF2-HMAC-SHA256** to derive a strong 256-bit encryption key.
- **Salt**: 16 bytes of cryptographically secure random data (`os.urandom(16)`).
- **Iterations**: 200,000 rounds to protect against brute-force and hardware acceleration attacks.
- **Storage**: The salt is stored in the `meta` table, but the derived key is never persisted to disk.

### 2. Encryption Layer (SimpleCipher)
NotionVault uses a modular encryption layer. Currently, it implements a high-performance XOR-based encryption using the PBKDF2 derived key.
- **Technique**: XOR bitwise operation against a cycled key stream derived from the PBKDF2 hash.
- **Metadata**: Encrypted data is Base64 encoded for safe storage in the SQLite text fields.

### 3. Session Security
- **Web App**: Uses Flask sessions with a cryptographically signed secret key.
- **Extension**: Communicates with the Web API using a session-based approach or a `X-Vault-Key` header for authenticated requests.

---

## 📊 Data Layer & Schema

The system uses **SQLite** for its reliability and zero-configuration nature.

### Table: `meta`
Stores system configuration and security artifacts.
| Column | Type | Description |
| :--- | :--- | :--- |
| `k` | TEXT | Key (e.g., 'salt', 'test') |
| `v` | TEXT | Value (Base64 encoded salt or encrypted test string) |

### Table: `folders`
Organizes blocks into user-defined categories.
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER | Primary Key |
| `name` | TEXT | Folder name |
| `sort` | INTEGER | Display order |

### Table: `blocks`
The core storage for encrypted data.
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER | Primary Key |
| `folder_id`| INTEGER | Foreign Key (folders) |
| `type` | TEXT | Type (Credential, Text, Table, etc.) |
| `content` | TEXT | **Encrypted JSON Payload** |
| `sort` | INTEGER | Display order within folder |

---

## 🧩 Component Breakdown

### 1. Desktop Application (`app.py`)
- **UI Framework**: `tkinter` + `ttkbootstrap`.
- **Primary Features**: Full CRUD for folders and blocks, search, and manual reordering.
- **Theming**: Sleek dark mode implemented via `styles.py`.

### 2. Web Application (`web_app.py`)
- **Framework**: `Flask` with `Waitress` for production-grade serving.
- **Frontend**: Tailwind CSS based responsive design.
- **API Engine**: Provides JSON endpoints for external integration.

### 3. Chrome Extension (`PM_chrome_Extension`)
- **Manifest**: Manifest V3 compliant.
- **Background**: Handles state management and API communication.
- **Content Scripts**: Detects login forms and performs DOM injection for auto-filling.

---

## 🌐 API Reference

The Web App exposes several endpoints for integration.

### Authentication
- `POST /api/login`
  - **Payload**: `{"password": "master_password"}`
  - **Returns**: `{"success": true, "key": "hex_encoded_key"}`

### Credential Management
- `GET /api/entries`
  - **Headers**: `X-Vault-Key: <hex_key>`
  - **Returns**: A list of all decrypted credentials for auto-fill matching.

- `POST /api/add`
  - **Payload**: `{"site": "...", "username": "...", "password": "..."}`
  - **Action**: Encrypts and adds a new credential to the default folder.

---

## 🌉 Integration & Native Messaging

To enable the Chrome Extension to talk to the local Python environment, NotionVault implements the **Chrome Native Messaging API**.

1.  **Host Registry**: `register_host.bat` adds the app to the Windows Registry.
2.  **Communication**: The extension sends JSON messages to `native_host.py` via standard input/output (stdin/stdout).
3.  **Bridge**: This allows the extension to verify if the desktop app is running or to trigger local system-level security prompts.

---

## 🛠 Development Lifecycle

### Prerequisites
- Python 3.8+
- Node.js (for extension development)
- SQLite3

### Setup & Installation
```bash
# Install core dependencies
pip install -r requirements.txt

# Register the Native Messaging host (Windows)
.\register_host.bat

# Launch the developer environment
python web_app.py --debug
```

### Build & Package
The project uses `PyInstaller` for creating standalone executables.
- Desktop App: `pyinstaller NotionVault.spec`
- Extension: Run `python package_extension.py` to bundle the Chrome Extension.

---

*Documentation generated by Antigravity AI - 2025*
