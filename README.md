# 🔐 Password Manager Vault

**Password Manager Vault** is a Notion-style password management desktop application created by **Abdul Basit Memon**. It enables users to securely store passwords, API keys, and other credentials _offline_, offering folder organization, custom fields, rich content blocks, and an interactive, customizable interface.

---

## 🌟 Features

- **Secure Storage**  
  Store passwords, API keys, and other sensitive data locally.

- **Folder Organization**  
  Create multiple folders and categorize credentials.

- **Custom Fields**  
  Add arbitrary fields to any credential entry (e.g., “Security Question,” “PIN,” etc.).

- **Rich Content Blocks**  
  Insert and style headings, paragraphs, quotes, tables, and free-form text within any folder.

- **Powerful Search**  
  Quickly find entries across all folders by keyword or tag.

- **Export**  
  Export your vault to **Excel (.xlsx)** or **JSON** for backup and portability.

- **Themes & Templates**  
  Apply built-in UI themes or import your own templates to change the look and feel.

---

## 🖥️ Screenshots

| Master Password Screen                | Vault Overview                         | Creating a New Folder                  | Credentials View                       |
|---------------------------------------|----------------------------------------|----------------------------------------|----------------------------------------|
| ![Master Password](screenshots/MasterPassword.png) | ![Vault](screenshots/Vault.png)             | ![New Folder](screenshots/NewFolder.png)     | ![Credentials](screenshots/Credentials.png) |

---

## ⚙️ System Requirements

- **Python** ≥ 3.12  
- **Tkinter** (built-in)  
- **sqlite3** (built-in)  
- **openpyxl** (for Excel export)  
- **json** (built-in)

---

## 📦 Installation

1. **Clone the repository**  
   ```bash
   git clone https://github.com/abm1119/password-manager-vault.git
   cd password-manager-vault
Install dependencies

bash
Copy
Edit
pip install -r requirements.txt
Run the application

bash
Copy
Edit
python app.py
📁 Project Structure
text
Copy
Edit
password-manager-vault/
├── app.py              # Main application (Tkinter GUI + logic)
├── db_handler.py       # SQLite database operations
├── styles.py           # UI themes and style definitions
├── requirements.txt    # Python dependencies
├── LICENSE             # MIT License
└── screenshots/        # Images for README documentation
🗃️ Database Schema
users
Stores usernames and hashed master passwords.

passwords
Stores credential entries: site, username, encrypted password, and custom fields.
All passwords and sensitive fields are encrypted using PBKDF2.

🔐 Security
PBKDF2 Hashing
Master passwords and individual credentials are hashed and salted using PBKDF2.

Input Validation
Sanitizes all user inputs to prevent SQL injection and other attacks.

Offline-First
Entire vault resides locally; no cloud or external servers by default.

🚀 Future Development
Multi-User Support
Separate vaults for different profiles on the same machine.

Secure Sharing
Encrypted export/import for sharing specific credentials with others.

Two-Factor Authentication
Add 2FA (TOTP) for unlocking the vault.

Bulk Import/Export
CSV and encrypted backup formats.

Additional Themes & Plugins
Allow third-party UI themes and extensions.

📄 License
This project is licensed under the MIT License. See the LICENSE file for details.

🙏 Acknowledgments
Tkinter – Python’s built-in GUI toolkit
sqlite3 – Embedded SQL database
openpyxl – Excel (.xlsx) read/write library
json – Native JSON serialization

Created by Abdul Basit Memon
