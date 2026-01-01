NotionVault v2.0.0 - Release
==============================

Installation Instructions:

1. Desktop App:
   - Run 'NotionVault.exe' to start the password manager.

2. Chrome Extension:
   - Open Chrome and go to chrome://extensions/
   - Enable "Developer mode" (top right).
   - Drag and drop 'NotionVault_v2.0.0.zip' into the window OR unzip it and click "Load unpacked".
   - Note the ID of the installed extension (a long string of characters).

3. Connect Extension to Desktop:
   - Close the Desktop App if running.
   - Run 'register_host.bat'.
   - Enter the Extension ID from step 2 when prompted.
   - Restart Chrome.
   
Troubleshooting:
   - If the extension says "Native host not found", try re-running register_host.bat.
   - Ensure NotionVault.exe is not blocking the database file.
