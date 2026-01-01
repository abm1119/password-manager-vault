@echo off
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
