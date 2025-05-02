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
| ![Master Password Screen](Screenshorts/MasterPassword.png) | ![Vault Overview](Screenshorts/Vault.png) |![Creating a New Folder](Screenshorts/NewFolder.png) | ![Credentials View](Screenshorts/Credentails.png) |

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

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**
   ```bash
   python app.py
   ```

## 💻 Usage

1. Set a **master password** on first launch
2. Create folders for organizing your credentials
3. Add new entries with site, username, password, and custom fields
4. Use the search bar to quickly locate items
5. Export all or selected entries to Excel or JSON for backup

## 📁 Project Structure

```
password-manager-vault/
├── app.py            # Main Tkinter GUI + logic
├── db_handler.py     # SQLite operations
├── styles.py         # UI themes & styles
├── requirements.txt  # Python dependencies
├── LICENSE           # MIT License
└── screenshots/      # README images
```

## 🗃️ Database Schema

- **users**
  - id, username, password_hash
- **passwords**
  - id, user_id, title, username, password_encrypted, custom_fields

_All sensitive fields are encrypted with PBKDF2._

## 🔐 Security Features

- **PBKDF2 Hashing** for master and entry passwords
- **Input Sanitization** to prevent SQL injection
- **Offline-First** design; no third-party servers by default

## 🔮 Future Development

- Multi-user vaults on a single machine
- Secure sharing with encrypted exports
- Two-Factor Authentication (TOTP)
- CSV bulk import/export
- Plugin system for UI themes

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Tkinter** – Python's built-in GUI toolkit
- **sqlite3** – Embedded SQL database
- **openpyxl** – Excel file handling
- **json** – Built-in JSON serialization

---

*Created by Abdul Basit Memon*
