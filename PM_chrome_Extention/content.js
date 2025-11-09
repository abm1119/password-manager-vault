// SecureVault Content Script
// Intelligent form detection and auto-fill functionality

class SecureVaultContent {
    constructor() {
        this.forms = [];
        this.currentDomain = '';
        this.indicators = new Map();
        this.autoFillRequested = false;

        this.initialize();
        this.setupMessageListener();
        this.observeDOMChanges();
    }

    initialize() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.scanForForms());
        } else {
            this.scanForForms();
        }

        // Get current domain
        this.currentDomain = this.extractDomain(window.location.href);

        // Inject styles for SecureVault indicators
        this.injectStyles();

        // Setup credential detection
        this.setupCredentialDetection();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open
        });
    }

    handleMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'ping':
                sendResponse({ ready: true });
                break;

            case 'updateTabInfo':
                this.handleTabUpdate(message.tabInfo);
                sendResponse({ success: true });
                break;

            case 'fillForm':
                this.fillForm(message.credentials);
                sendResponse({ success: true });
                break;

            case 'requestAutoFill':
                this.requestAutoFill();
                sendResponse({ success: true });
                break;

            case 'showSuggestions':
                this.showCredentialSuggestions(message.credentials);
                sendResponse({ success: true });
                break;

            default:
                sendResponse({ error: 'Unknown action' });
        }
    }

    handleTabUpdate(tabInfo) {
        this.currentDomain = tabInfo.domain;
        // Re-scan forms if domain changed
        if (this.currentDomain !== tabInfo.domain) {
            this.scanForForms();
        }
    }

    scanForForms() {
        // Clear existing indicators
        this.clearIndicators();

        // Find all forms
        const forms = document.querySelectorAll('form');
        this.forms = [];

        forms.forEach((form, index) => {
            const formData = this.analyzeForm(form, index);
            if (formData && formData.confidence > 0.2) { // Only consider forms with decent confidence
                this.forms.push(formData);

                // Add SecureVault indicators to password fields
                this.addSecureVaultIndicators(formData);
            }
        });

    }

    analyzeForm(form, formIndex) {
        const inputs = form.querySelectorAll('input, select, textarea');
        const fields = [];

        inputs.forEach((input, inputIndex) => {
            const fieldData = this.analyzeField(input, inputIndex);
            if (fieldData) {
                fields.push(fieldData);
            }
        });

        if (fields.length === 0) return null;

        const analysis = this.analyzeFormFields(fields);
        const formRect = form.getBoundingClientRect();

        return {
            element: form,
            index: formIndex,
            fields: fields,
            analysis: analysis,
            confidence: analysis.confidence,
            rect: formRect,
            visible: this.isElementVisible(form)
        };
    }

    analyzeField(input, inputIndex) {
        const type = input.type?.toLowerCase();
        const name = input.name?.toLowerCase();
        const id = input.id?.toLowerCase();
        const placeholder = input.placeholder?.toLowerCase();
        const autocomplete = input.autocomplete?.toLowerCase();

        // Skip hidden, submit, and button inputs
        if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'image') {
            return null;
        }

        let fieldType = 'unknown';
        let confidence = 0;

        // Determine field type with confidence scoring
        if (type === 'password') {
            fieldType = 'password';
            confidence = 0.9;
        } else if (type === 'email') {
            fieldType = 'email';
            confidence = 0.8;
        } else if (name?.includes('password') || id?.includes('password') || placeholder?.includes('password')) {
            fieldType = 'password';
            confidence = 0.8;
        } else if (name?.includes('email') || id?.includes('email') || placeholder?.includes('email')) {
            fieldType = 'email';
            confidence = 0.8;
        } else if (name?.includes('username') || id?.includes('username') ||
                   name?.includes('login') || id?.includes('login') ||
                   name?.includes('user') || id?.includes('user') ||
                   placeholder?.includes('username') || placeholder?.includes('login')) {
            fieldType = 'username';
            confidence = 0.7;
        } else if (autocomplete?.includes('username') || autocomplete?.includes('email')) {
            fieldType = autocomplete.includes('email') ? 'email' : 'username';
            confidence = 0.8;
        } else if (type === 'text' && (name?.includes('user') || placeholder?.includes('user'))) {
            fieldType = 'username';
            confidence = 0.6;
        }

        if (fieldType === 'unknown') return null;

        return {
            element: input,
            index: inputIndex,
            type: fieldType,
            confidence: confidence,
            rect: input.getBoundingClientRect(),
            visible: this.isElementVisible(input),
            name: input.name,
            id: input.id,
            placeholder: input.placeholder,
            autocomplete: input.autocomplete
        };
    }

    analyzeFormFields(fields) {
        let hasUsername = false;
        let hasPassword = false;
        let hasEmail = false;
        let formType = 'unknown';
        let confidence = 0;

        fields.forEach(field => {
            confidence += field.confidence;

            switch (field.type) {
                case 'username':
                    hasUsername = true;
                    break;
                case 'password':
                    hasPassword = true;
                    break;
                case 'email':
                    hasEmail = true;
                    break;
            }
        });

        confidence = confidence / fields.length;

        // Determine form type
        if (hasPassword && hasUsername) {
            formType = 'login';
            confidence += 0.2;
        } else if (hasPassword && hasEmail) {
            formType = 'login_signup';
            confidence += 0.15;
        } else if (hasPassword) {
            formType = 'password_only';
            confidence += 0.1;
        }

        // Boost confidence for common login patterns
        if (fields.length >= 2 && hasPassword) {
            confidence += 0.1;
        }

        return {
            formType,
            hasUsername,
            hasPassword,
            hasEmail,
            confidence: Math.min(confidence, 1)
        };
    }

    addSecureVaultIndicators(formData) {
        formData.fields.forEach(field => {
            if (field.type === 'password' && field.visible) {
                this.addIndicator(field.element, field);
            }
        });
    }

    addIndicator(inputElement, fieldData) {
        // Create indicator element
        const indicator = document.createElement('div');
        indicator.className = 'securevault-indicator';
        indicator.innerHTML = `
            <div class="securevault-icon" title="SecureVault - Click to auto-fill">
                🔐
            </div>
            <div class="securevault-tooltip">
                Click to fill credentials for ${this.currentDomain}
            </div>
        `;

        // Position the indicator
        const rect = inputElement.getBoundingClientRect();
        const inputStyle = window.getComputedStyle(inputElement);

        indicator.style.position = 'absolute';
        indicator.style.left = `${rect.right - 30}px`;
        indicator.style.top = `${rect.top + (rect.height / 2) - 12}px`;
        indicator.style.zIndex = '999999';
        indicator.style.pointerEvents = 'all';

        // Add click handler
        indicator.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleIndicatorClick(fieldData);
        });

        // Store reference
        this.indicators.set(inputElement, indicator);

        // Add to page
        document.body.appendChild(indicator);

        // Add input event listeners for dynamic positioning
        inputElement.addEventListener('focus', () => this.updateIndicatorPosition(inputElement));
        inputElement.addEventListener('blur', () => this.updateIndicatorPosition(inputElement));
        window.addEventListener('resize', () => this.updateIndicatorPosition(inputElement));
    }

    updateIndicatorPosition(inputElement) {
        const indicator = this.indicators.get(inputElement);
        if (!indicator) return;

        const rect = inputElement.getBoundingClientRect();
        indicator.style.left = `${rect.right - 30}px`;
        indicator.style.top = `${rect.top + (rect.height / 2) - 12}px`;
    }

    clearIndicators() {
        this.indicators.forEach(indicator => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        });
        this.indicators.clear();
    }

    handleIndicatorClick(fieldData) {
        // Request auto-fill for this form
        this.requestAutoFill();
    }

    async requestAutoFill() {
        if (this.autoFillRequested) return;

        this.autoFillRequested = true;

        try {
            // Request credentials from background script
            const response = await chrome.runtime.sendMessage({
                action: 'getCredentialsForSite',
                domain: this.currentDomain
            });

            if (response.credentials && response.credentials.length > 0) {
                this.showCredentialSuggestions(response.credentials);
            } else {
                this.showNoCredentialsMessage();
            }
        } catch (error) {
            console.error('Error requesting auto-fill:', error);
            this.showNotification('Unable to retrieve credentials', 'error');
        } finally {
            setTimeout(() => {
                this.autoFillRequested = false;
            }, 1000);
        }
    }

    showCredentialSuggestions(credentials) {
        // Create suggestions dropdown
        const suggestions = document.createElement('div');
        suggestions.className = 'securevault-suggestions';
        suggestions.innerHTML = `
            <div class="securevault-suggestions-header">
                <span>Choose credentials for ${this.currentDomain}</span>
                <button class="securevault-close-btn">&times;</button>
            </div>
            <div class="securevault-credentials-list">
                ${credentials.map((cred, index) => `
                    <div class="securevault-credential-item" data-index="${index}">
                        <div class="securevault-cred-info">
                            <div class="securevault-cred-site">${this.escapeHtml(cred.site || 'Unknown')}</div>
                            <div class="securevault-cred-user">${this.escapeHtml(cred.username || cred.email || 'No username')}</div>
                        </div>
                        <div class="securevault-cred-actions">
                            <button class="securevault-fill-btn" data-index="${index}">Fill</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Position suggestions near the first password field
        const firstPasswordField = this.findFirstPasswordField();
        if (firstPasswordField) {
            const rect = firstPasswordField.getBoundingClientRect();
            suggestions.style.position = 'absolute';
            suggestions.style.left = `${rect.left}px`;
            suggestions.style.top = `${rect.bottom + 5}px`;
            suggestions.style.zIndex = '1000000';
        }

        // Add event listeners
        suggestions.querySelector('.securevault-close-btn').addEventListener('click', () => {
            suggestions.remove();
        });

        suggestions.addEventListener('click', (e) => {
            if (e.target.classList.contains('securevault-fill-btn')) {
                const index = parseInt(e.target.dataset.index);
                this.fillForm(credentials[index]);
                suggestions.remove();
            }
        });

        // Add to page
        document.body.appendChild(suggestions);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (suggestions.parentNode) {
                suggestions.remove();
            }
        }, 10000);
    }

    findFirstPasswordField() {
        for (const form of this.forms) {
            for (const field of form.fields) {
                if (field.type === 'password') {
                    return field.element;
                }
            }
        }
        return null;
    }

    showNoCredentialsMessage() {
        this.showNotification('No saved credentials found for this site. Add them in SecureVault first.', 'info');
    }

    async fillForm(credentials) {
        // Find the most likely form to fill
        const targetForm = this.findBestFormForCredentials(credentials);

        if (!targetForm) {
            this.showNotification('Could not find a suitable form to fill', 'error');
            return;
        }

        // Fill the form fields
        let filledCount = 0;

        targetForm.fields.forEach(field => {
            const value = this.getValueForField(field, credentials);
            if (value !== null) {
                field.element.value = value;
                field.element.dispatchEvent(new Event('input', { bubbles: true }));
                field.element.dispatchEvent(new Event('change', { bubbles: true }));
                filledCount++;
            }
        });

        if (filledCount > 0) {
            this.showNotification(`Filled ${filledCount} field${filledCount > 1 ? 's' : ''} successfully!`);
        } else {
            this.showNotification('No matching fields found to fill', 'warning');
        }
    }

    findBestFormForCredentials(credentials) {
        // Find the form with the highest confidence and most matching fields
        let bestForm = null;
        let bestScore = 0;

        this.forms.forEach(form => {
            let score = form.confidence;
            let matchingFields = 0;

            form.fields.forEach(field => {
                if (this.getValueForField(field, credentials) !== null) {
                    matchingFields++;
                }
            });

            score += matchingFields * 0.1; // Bonus for each matching field

            if (score > bestScore) {
                bestScore = score;
                bestForm = form;
            }
        });

        return bestForm;
    }

    getValueForField(field, credentials) {
        switch (field.type) {
            case 'password':
                return credentials.password || null;
            case 'username':
                return credentials.username || null;
            case 'email':
                return credentials.email || credentials.username || null;
            default:
                return null;
        }
    }

    observeDOMChanges() {
        // Watch for dynamically added forms
        const observer = new MutationObserver((mutations) => {
            let shouldRescan = false;

            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'FORM' || node.querySelector('form')) {
                            shouldRescan = true;
                        }
                    }
                });
            });

            if (shouldRescan) {
                setTimeout(() => this.scanForForms(), 100);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    setupCredentialDetection() {
        // Listen for form submissions
        document.addEventListener('submit', (e) => {
            this.handleFormSubmission(e);
        });

        // Listen for password field changes
        document.addEventListener('input', (e) => {
            if (e.target.type === 'password') {
                this.debouncedCredentialCheck(e.target.form);
            }
        });

        // Listen for login button clicks
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (target.matches('[type="submit"], button, input[type="submit"]') ||
                target.textContent.toLowerCase().includes('login') ||
                target.textContent.toLowerCase().includes('sign in')) {
                this.checkForCredentials();
            }
        });
    }

    handleFormSubmission(e) {
        // Extract credentials from submitted form
        const form = e.target;
        const credentials = this.extractCredentialsFromForm(form);

        if (credentials && this.isValidCredentials(credentials)) {
            // Store credentials temporarily and show save prompt
            this.pendingCredentials = credentials;
            this.showSavePrompt(credentials);
        }
    }

    debouncedCredentialCheck = this.debounce((form) => {
        if (form) {
            const credentials = this.extractCredentialsFromForm(form);
            if (credentials && this.isValidCredentials(credentials)) {
                // Optional: Show immediate feedback for credential detection
                this.showCredentialHint();
            }
        }
    }, 1500);

    checkForCredentials() {
        // Check all forms on the page for credentials
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const credentials = this.extractCredentialsFromForm(form);
            if (credentials && this.isValidCredentials(credentials)) {
                chrome.runtime.sendMessage({
                    action: 'credentialsDetected',
                    credentials: credentials
                });
            }
        });
    }

    extractCredentialsFromForm(form) {
        const inputs = form.querySelectorAll('input, select');
        let username = '';
        let email = '';
        let password = '';

        inputs.forEach(input => {
            const type = input.type?.toLowerCase();
            const name = input.name?.toLowerCase();
            const placeholder = input.placeholder?.toLowerCase();
            const value = input.value?.trim();

            if (!value) return;

            if (type === 'password') {
                password = value;
            } else if (type === 'email' ||
                      name?.includes('email') ||
                      placeholder?.includes('email')) {
                email = value;
            } else if (name?.includes('username') ||
                      name?.includes('login') ||
                      name?.includes('user') ||
                      placeholder?.includes('username') ||
                      placeholder?.includes('login')) {
                username = value;
            } else if (type === 'text' && !username && !email) {
                // Fallback for username-like fields
                username = value;
            }
        });

        if (password) {
            return {
                site: this.currentDomain,
                username: username,
                email: email,
                password: password
            };
        }

        return null;
    }

    isValidCredentials(credentials) {
        // Basic validation
        return credentials.password &&
               credentials.password.length >= 4 &&
               (credentials.username || credentials.email) &&
               credentials.site;
    }

    showCredentialHint() {
        // Show a subtle hint that credentials are detected
        if (this.credentialHint) return;

        this.credentialHint = document.createElement('div');
        this.credentialHint.className = 'securevault-credential-hint';
        this.credentialHint.innerHTML = `
            <div class="securevault-hint-icon">🔍</div>
            <div class="securevault-hint-text">SecureVault detected login info</div>
        `;

        this.credentialHint.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(99, 102, 241, 0.9);
            backdrop-filter: blur(10px);
            color: white;
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 8px;
            animation: slideInRight 0.3s ease-out;
        `;

        document.body.appendChild(this.credentialHint);

        setTimeout(() => {
            if (this.credentialHint && this.credentialHint.parentNode) {
                this.credentialHint.remove();
                this.credentialHint = null;
            }
        }, 3000);
    }

    showSavePrompt(credentials) {
        // Create a save prompt on the page
        if (this.savePrompt) return;

        this.savePrompt = document.createElement('div');
        this.savePrompt.className = 'securevault-save-prompt';
        this.savePrompt.innerHTML = `
            <div class="securevault-save-content">
                <div class="securevault-save-header">
                    <div class="securevault-save-icon">💾</div>
                    <div class="securevault-save-title">Save Password?</div>
                    <button class="securevault-save-close">&times;</button>
                </div>
                <div class="securevault-save-body">
                    <div class="securevault-save-message">
                        SecureVault detected login credentials for <strong>${this.escapeHtml(this.currentDomain)}</strong>
                    </div>
                    <div class="securevault-save-details">
                        <div class="securevault-save-detail">
                            <span class="securevault-save-label">Username:</span>
                            <span class="securevault-save-value">${this.escapeHtml(credentials.username || credentials.email || 'Not detected')}</span>
                        </div>
                        <div class="securevault-save-detail">
                            <span class="securevault-save-label">Password:</span>
                            <span class="securevault-save-value">••••••••</span>
                        </div>
                    </div>
                </div>
                <div class="securevault-save-actions">
                    <button class="securevault-save-btn secondary">Not Now</button>
                    <button class="securevault-save-btn primary">Save to SecureVault</button>
                </div>
            </div>
        `;

        this.savePrompt.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            animation: fadeIn 0.3s ease-out;
        `;

        // Add event listeners
        const closeBtn = this.savePrompt.querySelector('.securevault-save-close');
        const notNowBtn = this.savePrompt.querySelector('.secondary');
        const saveBtn = this.savePrompt.querySelector('.primary');

        closeBtn.addEventListener('click', () => this.hideSavePrompt());
        notNowBtn.addEventListener('click', () => this.hideSavePrompt());
        saveBtn.addEventListener('click', () => this.saveCredentialsToVault(credentials));

        document.body.appendChild(this.savePrompt);
    }

    hideSavePrompt() {
        if (this.savePrompt) {
            this.savePrompt.remove();
            this.savePrompt = null;
            this.pendingCredentials = null;
        }
    }

    async saveCredentialsToVault(credentials) {
        try {
            // Open the extension popup
            await chrome.runtime.sendMessage({ action: 'openPopup' });

            // Send credentials to popup after a short delay
            setTimeout(() => {
                chrome.runtime.sendMessage({
                    action: 'credentialsDetected',
                    credentials: credentials
                });
            }, 500);

            this.hideSavePrompt();

            // Show success message
            this.showNotification('Opening SecureVault to save credentials...', 'info');
        } catch (error) {
            console.error('Error saving credentials:', error);
            this.showNotification('Failed to save credentials', 'error');
        }
    }

    showNotification(message, type = 'success') {
        // Remove existing notifications
        const existing = document.querySelectorAll('.securevault-page-notification');
        existing.forEach(el => el.remove());

        const notification = document.createElement('div');
        notification.className = `securevault-page-notification ${type}`;
        notification.innerHTML = `
            <div class="securevault-notif-icon">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
            </div>
            <div class="securevault-notif-message">${message}</div>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'rgba(16, 185, 129, 0.9)' : type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(99, 102, 241, 0.9)'};
            backdrop-filter: blur(10px);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10002;
            display: flex;
            align-items: center;
            gap: 8px;
            animation: slideInRight 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => notification.remove(), 300);
            }
        }, 4000);
    }

    injectStyles() {
        const styles = document.createElement('style');
        styles.textContent = `
            .securevault-indicator {
                font-size: 16px;
                cursor: pointer;
                user-select: none;
                transition: opacity 0.3s;
            }

            .securevault-indicator:hover {
                opacity: 0.8;
            }

            .securevault-icon {
                background: linear-gradient(135deg, #4c8bf5, #3b7be0);
                color: white;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(76, 139, 245, 0.3);
                transition: transform 0.2s;
            }

            .securevault-icon:hover {
                transform: scale(1.1);
            }

            .securevault-tooltip {
                position: absolute;
                background: #333;
                color: white;
                padding: 5px 8px;
                border-radius: 4px;
                font-size: 12px;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s;
                top: -30px;
                left: 50%;
                transform: translateX(-50%);
            }

            .securevault-indicator:hover .securevault-tooltip {
                opacity: 1;
            }

            .securevault-suggestions {
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                min-width: 300px;
                max-width: 400px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .securevault-suggestions-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid #eee;
                background: #f8f9fa;
                border-radius: 8px 8px 0 0;
            }

            .securevault-close-btn {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #666;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .securevault-close-btn:hover {
                color: #333;
            }

            .securevault-credentials-list {
                max-height: 200px;
                overflow-y: auto;
            }

            .securevault-credential-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid #f0f0f0;
                cursor: pointer;
                transition: background 0.2s;
            }

            .securevault-credential-item:hover {
                background: #f8f9fa;
            }

            .securevault-credential-item:last-child {
                border-bottom: none;
            }

            .securevault-cred-info {
                flex: 1;
            }

            .securevault-cred-site {
                font-weight: bold;
                color: #333;
                font-size: 14px;
            }

            .securevault-cred-user {
                color: #666;
                font-size: 12px;
            }

            .securevault-fill-btn {
                background: #4c8bf5;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: background 0.2s;
            }

            .securevault-fill-btn:hover {
                background: #3b7be0;
            }

            .securevault-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #4c8bf5;
                color: white;
                padding: 12px 16px;
                border-radius: 6px;
                font-size: 14px;
                z-index: 1000001;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                animation: slideIn 0.3s ease-out;
            }

            .securevault-notification.error {
                background: #ff6b6b;
            }

            .securevault-notification.warning {
                background: #ffcc00;
                color: #333;
            }

            .securevault-notification.info {
                background: #17a2b8;
            }

            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            /* Save Prompt Styles */
            .securevault-save-prompt .securevault-save-content {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(99, 102, 241, 0.2);
                border-radius: 16px;
                padding: 24px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
                animation: slideInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .securevault-save-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
            }

            .securevault-save-icon {
                font-size: 24px;
            }

            .securevault-save-title {
                font-size: 18px;
                font-weight: 600;
                color: #1f2937;
                flex: 1;
            }

            .securevault-save-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #6b7280;
                padding: 4px;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }

            .securevault-save-close:hover {
                background: #f3f4f6;
                color: #374151;
            }

            .securevault-save-body {
                margin-bottom: 20px;
            }

            .securevault-save-message {
                color: #4b5563;
                margin-bottom: 12px;
                line-height: 1.4;
            }

            .securevault-save-details {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 12px;
            }

            .securevault-save-detail {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 0;
                border-bottom: 1px solid #f1f5f9;
            }

            .securevault-save-detail:last-child {
                border-bottom: none;
            }

            .securevault-save-label {
                font-weight: 500;
                color: #64748b;
                font-size: 14px;
            }

            .securevault-save-value {
                font-weight: 600;
                color: #1f2937;
                font-size: 14px;
                font-family: 'Monaco', 'Menlo', monospace;
            }

            .securevault-save-actions {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }

            .securevault-save-btn {
                padding: 10px 16px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
            }

            .securevault-save-btn.primary {
                background: linear-gradient(135deg, #6366f1, #4f46e5);
                color: white;
            }

            .securevault-save-btn.primary:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
            }

            .securevault-save-btn.secondary {
                background: #f1f5f9;
                color: #64748b;
                border: 1px solid #e2e8f0;
            }

            .securevault-save-btn.secondary:hover {
                background: #e2e8f0;
            }

            /* Page Notification Styles */
            .securevault-page-notification {
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
            }

            .securevault-notif-icon {
                flex-shrink: 0;
            }

            .securevault-notif-message {
                flex: 1;
                font-weight: 500;
            }

            @keyframes slideInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(styles);
    }

    showNotification(message, type = 'success') {
        // Remove existing notifications
        const existing = document.querySelectorAll('.securevault-notification');
        existing.forEach(el => el.remove());

        const notification = document.createElement('div');
        notification.className = `securevault-notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 &&
               rect.top >= 0 && rect.left >= 0 &&
               rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
    }

    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (error) {
            return '';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

// Initialize content script
const secureVaultContent = new SecureVaultContent();
