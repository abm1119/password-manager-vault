@echo off
setlocal

:: Name of the native messaging host
set "HOST_NAME=com.notionvault.passwords"

:: 1. Prompt user for Extension ID
set /p EXT_ID="Enter Chrome Extension ID (found at chrome://extensions/): "

:: 2. Update the JSON manifest with the ID
powershell -Command "(Get-Content 'com.notionvault.passwords.json') -replace '<YOUR_EXTENSION_ID_HERE>', '%EXT_ID%' | Set-Content 'com.notionvault.passwords.json'"

:: 3. Get absolute path to the manifest file
set "MANIFEST_PATH=%~dp0com.notionvault.passwords.json"
set "MANIFEST_PATH=%MANIFEST_PATH:\=\\%"

:: 4. Add Registry Key
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\%HOST_NAME%" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f

echo.
echo ========================================================
echo  Native Host Registered Successfully!
echo  You can now use the extension without the Web App running.
echo ========================================================
pause
