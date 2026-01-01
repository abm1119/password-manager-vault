import os
import shutil
import subprocess
import sys

def run_command(command):
    print(f"Running: {command}")
    result = subprocess.run(command, shell=True)
    if result.returncode != 0:
        print(f"Error running command: {command}")
        sys.exit(1)

def main():
    print("Starting Release Build Process...")

    # Define paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dist_dir = os.path.join(base_dir, 'dist')
    build_dir = os.path.join(base_dir, 'build')
    release_dir = os.path.join(base_dir, 'NotionVault_v2.0.0_Release')

    # 1. Clean previous builds
    # We clean dist/NotionVault.exe specifically or just the folders if we want a fresh start
    # But packaging extension uses dist/ too (dist_extension).
    # package_extension.py writes to dist/NotionVault_v2.0.0.zip
    
    # Let's simple rely on PyInstaller cleaning or overwrite
    if os.path.exists(release_dir):
        shutil.rmtree(release_dir)
    os.makedirs(release_dir)

    # 2. Package Extension
    print("\n--- Packaging Extension ---")
    run_command("python package_extension.py")
    
    # 3. Build Desktop App
    print("\n--- Building Desktop App ---")
    run_command(f'"{sys.executable}" -m PyInstaller NotionVault.spec --clean --noconfirm')

    # 4. Build Native Host
    print("\n--- Building Native Host ---")
    run_command(f'"{sys.executable}" -m PyInstaller native_host.py --onefile --name notionvault_host --clean --noconfirm')

    # 5. Organize Release Artifacts
    print("\n--- Organizing Artifacts ---")
    
    # Copy Extension ZIP
    ext_zip_name = "NotionVault_v2.0.0.zip"
    ext_zip_src = os.path.join(dist_dir, ext_zip_name)
    if os.path.exists(ext_zip_src):
        shutil.copy(ext_zip_src, release_dir)
        print(f"Copied {ext_zip_name}")
    else:
        print(f"Warning: {ext_zip_name} not found in dist/")

    # Copy Desktop App EXE
    desktop_exe_src = os.path.join(dist_dir, "NotionVault.exe")
    if os.path.exists(desktop_exe_src):
        shutil.copy(desktop_exe_src, release_dir)
        print(f"Copied NotionVault.exe")
    else:
         print("Warning: NotionVault.exe not found in dist/")

    # Copy Native Host EXE
    host_exe_src = os.path.join(dist_dir, "notionvault_host.exe")
    if os.path.exists(host_exe_src):
        shutil.copy(host_exe_src, release_dir)
        print(f"Copied notionvault_host.exe")
    else:
        print("Warning: notionvault_host.exe not found in dist/")
        
    # Create a new register_host.bat for the release
    register_bat_content = r"""@echo off
setlocal

:: Name of the native messaging host
set "HOST_NAME=com.notionvault.passwords"

echo --------------------------------------------------------
echo      NotionVault Native Host Registration
echo --------------------------------------------------------

:: 1. Prompt user for Extension ID
set /p EXT_ID="Enter Chrome Extension ID (found at chrome://extensions/): "

if "%EXT_ID%"=="" (
    echo Error: Extension ID is required.
    pause
    exit /b
)

:: 2. Create the JSON manifest
set "MANIFEST_PATH=%~dp0com.notionvault.passwords.json"
set "EXE_PATH=%~dp0notionvault_host.exe"
:: Escape backslashes for JSON
set "EXE_PATH=%EXE_PATH:\=\\%"

(
echo {
echo   "name": "%HOST_NAME%",
echo   "description": "NotionVault Native Messaging Host",
echo   "path": "%EXE_PATH%",
echo   "type": "stdio",
echo   "allowed_origins": [ "chrome-extension://%EXT_ID%/" ]
echo }
) > "%MANIFEST_PATH%"

:: 3. Add Registry Key
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\%HOST_NAME%" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f

echo.
echo ========================================================
echo  Native Host Registered Successfully!
echo ========================================================
pause
"""
    with open(os.path.join(release_dir, "register_host.bat"), "w") as f:
        f.write(register_bat_content)

    # Create README
    readme_content = """NotionVault v2.0.0 - Release
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
"""
    with open(os.path.join(release_dir, "README.txt"), "w") as f:
        f.write(readme_content)

    print(f"\nRelease created successfully at: {release_dir}")

if __name__ == "__main__":
    main()
