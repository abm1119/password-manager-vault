// SecureVault Background Script
// Handles extension coordination, messaging, and intelligent features

class SecureVaultBackground {
    constructor() {
        this.activeTabId = null;
        this.setupEventListeners();
        this.initializeExtension();
    }

    setupEventListeners() {
        // Extension installation
        chrome.runtime.onInstalled.addListener(this.handleInstallation.bind(this));

        // Tab events
        chrome.tabs.onActivated.addListener(this.handleTabActivated.bind(this));
        chrome.tabs.onUpdated.addListener(this.handleTabUpdated.bind(this));

        // Message handling
        chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

        // Command handling (keyboard shortcuts)
        chrome.commands.onCommand.addListener(this.handleCommand.bind(this));

        // Context menu (if needed in future)
        // chrome.contextMenus.onClicked.addListener(this.handleContextMenu.bind(this));
    }

    async initializeExtension() {
        // Get current active tab
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                this.activeTabId = tab.id;
                this.updateTabInfo(tab);
            }
        } catch (error) {
            console.error('Error initializing extension:', error);
        }
    }

    handleInstallation(details) {
        if (details.reason === 'install') {
            // Create context menu (optional feature for future)
            this.createContextMenu();

            // Open welcome page or show notification
            this.showWelcomeMessage();
        }
    }

    createContextMenu() {
        // Create context menu for quick password generation
        chrome.contextMenus.create({
            id: 'generatePassword',
            title: 'Generate Secure Password',
            contexts: ['editable']
        });
    }

    showWelcomeMessage() {
        // Show notification to user
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'SecureVault Installed!',
            message: 'Your smart password manager is ready. Click the extension icon to get started.',
            priority: 2
        });
    }

    handleTabActivated(activeInfo) {
        this.activeTabId = activeInfo.tabId;
        this.updateTabInfoFromId(activeInfo.tabId);
    }

    handleTabUpdated(tabId, changeInfo, tab) {
        if (tabId === this.activeTabId && changeInfo.status === 'complete') {
            this.updateTabInfo(tab);
        }
    }

    async updateTabInfo(tab) {
        if (!tab || !tab.url) return;

        try {
            // Send tab info to content script
            await chrome.tabs.sendMessage(tab.id, {
                action: 'updateTabInfo',
                tabInfo: {
                    url: tab.url,
                    title: tab.title,
                    domain: this.extractDomain(tab.url)
                }
            });
        } catch (error) {
            // Content script might not be loaded yet, which is fine
        }
    }

    async updateTabInfoFromId(tabId) {
        try {
            const tab = await chrome.tabs.get(tabId);
            this.updateTabInfo(tab);
        } catch (error) {
            console.error('Error getting tab info:', error);
        }
    }

    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (error) {
            return '';
        }
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'getCredentialsForSite':
                    const credentials = await this.getCredentialsForSite(message.domain);
                    sendResponse({ credentials });
                    break;

                case 'fillCredentials':
                    await this.fillCredentials(sender.tab.id, message.credentials);
                    sendResponse({ success: true });
                    break;

                case 'saveCredentials':
                    await this.saveCredentials(message.credentials);
                    sendResponse({ success: true });
                    break;

                case 'generatePassword':
                    const password = this.generateSecurePassword();
                    sendResponse({ password });
                    break;

                case 'getTabInfo':
                    const tabInfo = await this.getCurrentTabInfo();
                    sendResponse({ tabInfo });
                    break;

                case 'showNotification':
                    this.showNotification(message.message, message.type);
                    sendResponse({ success: true });
                    break;

                case 'requestAutoFill':
                    await this.requestAutoFill(sender.tab.id);
                    sendResponse({ success: true });
                    break;

                case 'openPopup':
                    await this.openExtensionPopup();
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ error: error.message });
        }

        return true; // Keep message channel open for async responses
    }

    async handleCommand(command) {
        switch (command) {
            case 'fill_credentials':
                await this.requestAutoFill(this.activeTabId);
                break;

            case 'generate_password':
                const password = this.generateSecurePassword();
                // Send password to popup for clipboard handling
                try {
                    await this.openExtensionPopup();
                    // Let popup handle clipboard operations
                    setTimeout(() => {
                        chrome.runtime.sendMessage({
                            action: 'generatedPassword',
                            password: password
                        });
                    }, 500);
                } catch (error) {
                    console.error('Failed to generate password:', error);
                }
                break;
        }
    }

    async getCredentialsForSite(domain) {
        try {
            // This would typically decrypt and return credentials
            // For now, return empty array as actual decryption happens in popup
            const result = await chrome.storage.local.get(['entries_encrypted']);
            if (!result.entries_encrypted) {
                return [];
            }

            // Send request to popup to decrypt (since background can't access master key)
            // This is a simplified approach - in practice, you'd need to coordinate with popup
            return [];

        } catch (error) {
            return [];
        }
    }

    async fillCredentials(tabId, credentials) {
        try {
            await chrome.tabs.sendMessage(tabId, {
                action: 'fillForm',
                credentials: credentials
            });
        } catch (error) {
            console.error('Error filling credentials:', error);
        }
    }

    async saveCredentials(credentials) {
        // This would coordinate with the popup to save credentials
        // For now, we'll let the popup handle the saving
    }

    generateSecurePassword(length = 16) {
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

        let password = '';
        const allChars = lowercase + uppercase + numbers + symbols;

        // Ensure at least one character from each set
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += symbols[Math.floor(Math.random() * symbols.length)];

        // Fill the rest randomly
        for (let i = 4; i < length; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }

        // Shuffle the password
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }

    async getCurrentTabInfo() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                return {
                    url: tab.url,
                    title: tab.title,
                    domain: this.extractDomain(tab.url),
                    favicon: tab.favIconUrl
                };
            }
        } catch (error) {
            console.error('Error getting tab info:', error);
        }
        return null;
    }

    async requestAutoFill(tabId) {
        try {
            // Check if content script is ready
            const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
            if (response.ready) {
                // Open popup for user to select credentials
                await this.openExtensionPopup();
                // Notify popup about auto-fill request
                setTimeout(() => {
                    chrome.runtime.sendMessage({
                        action: 'requestAutoFill',
                        tabId: tabId
                    });
                }, 500);
            }
        } catch (error) {
            console.error('Auto-fill request failed:', error);
            this.showNotification('Unable to auto-fill on this page. Make sure SecureVault is unlocked.', 'error');
        }
    }

    async openExtensionPopup() {
        try {
            // Create a new window with the extension popup
            // This is a workaround since we can't directly open the action popup programmatically
            await chrome.windows.create({
                url: chrome.runtime.getURL('popup.html'),
                type: 'popup',
                width: 520,
                height: 680,
                focused: true
            });
        } catch (error) {
            console.error('Failed to open extension popup:', error);
        }
    }

    showNotification(message, type = 'success') {
        const notificationId = 'securevault-notification-' + Date.now();

        chrome.notifications.create(notificationId, {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'SecureVault',
            message: message,
            priority: type === 'error' ? 2 : 1
        });

        // Auto-close after 3 seconds
        setTimeout(() => {
            chrome.notifications.clear(notificationId);
        }, 3000);
    }

    // Intelligent features
    analyzeFormFields(formData) {
        // Analyze form fields to determine login/signup context
        const fields = formData.fields || [];
        let hasUsername = false;
        let hasPassword = false;
        let hasEmail = false;
        let formType = 'unknown';

        fields.forEach(field => {
            const type = field.type?.toLowerCase();
            const name = field.name?.toLowerCase();
            const id = field.id?.toLowerCase();

            if (type === 'password' || name?.includes('password') || id?.includes('password')) {
                hasPassword = true;
            }

            if (type === 'email' || name?.includes('email') || id?.includes('email')) {
                hasEmail = true;
            }

            if (name?.includes('username') || id?.includes('username') ||
                name?.includes('login') || id?.includes('login') ||
                name?.includes('user') || id?.includes('user')) {
                hasUsername = true;
            }
        });

        if (hasPassword && (hasUsername || hasEmail)) {
            formType = 'login';
        } else if (hasPassword && hasEmail) {
            formType = 'signup';
        }

        return {
            formType,
            hasUsername,
            hasPassword,
            hasEmail,
            confidence: this.calculateFormConfidence(fields)
        };
    }

    calculateFormConfidence(fields) {
        // Calculate confidence score for form detection
        let score = 0;
        const totalFields = fields.length;

        if (totalFields === 0) return 0;

        fields.forEach(field => {
            const type = field.type?.toLowerCase();
            const name = field.name?.toLowerCase();

            if (type === 'password') score += 0.4;
            if (type === 'email') score += 0.3;
            if (name?.includes('password')) score += 0.4;
            if (name?.includes('email')) score += 0.3;
            if (name?.includes('username') || name?.includes('login')) score += 0.3;
        });

        return Math.min(score / totalFields, 1);
    }

    // Utility methods
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize the background script
const secureVault = new SecureVaultBackground();
