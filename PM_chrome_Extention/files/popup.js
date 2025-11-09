// SecureVault - Smart Password Manager
// Main popup script with encryption and intelligent features

class SecureVault {
    constructor() {
        this.isAuthenticated = false;
        this.entries = [];
        this.masterKey = null;
        this.currentEditId = null;
        this.pendingCredentials = null;
        this.notifications = [];

        this.initializeElements();
        this.setupEventListeners();
        this.checkAuthentication();
        this.setupCredentialDetection();
    }

    initializeElements() {
        // Auth elements
        this.authSection = document.getElementById('authSection');
        this.masterPassword = document.getElementById('masterPassword');
        this.authBtn = document.getElementById('authBtn');
        this.setupBtn = document.getElementById('setupBtn');

        // Main elements
        this.mainSection = document.getElementById('mainSection');
        this.searchInput = document.getElementById('searchInput');
        this.searchBar = document.querySelector('.search-bar');
        this.entriesList = document.getElementById('entriesList');
        this.formSection = document.getElementById('formSection');
        this.generateSection = document.getElementById('generateSection');

        // Form elements
        this.category = document.getElementById('category');
        this.site = document.getElementById('site');
        this.username = document.getElementById('username');
        this.email = document.getElementById('email');
        this.password = document.getElementById('password');
        this.notes = document.getElementById('notes');
        this.customFields = document.getElementById('customFields');

        // Buttons
        this.generatePwdBtn = document.getElementById('generatePwdBtn');
        this.addFirstEntryBtn = document.getElementById('addFirstEntryBtn');
        this.saveBtn = document.getElementById('saveBtn');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.addFieldBtn = document.getElementById('addFieldBtn');
        this.regenerateBtn = document.getElementById('regenerateBtn');
        this.copyGeneratedBtn = document.getElementById('copyGeneratedBtn');
        this.generateFormBtn = document.getElementById('generateFormBtn');

        // Other elements
        this.loading = document.getElementById('loading');
        this.statusBar = document.getElementById('statusBar');
        this.notificationContainer = document.getElementById('notificationContainer');
        this.generatedPassword = document.getElementById('generatedPassword');
        this.passwordStrength = document.getElementById('passwordStrength');
        this.togglePassword = document.getElementById('togglePassword');
        this.toggleGenPwd = document.getElementById('toggleGenPwd');

        // Smart save elements
        this.smartSavePrompt = document.getElementById('smartSavePrompt');
        this.smartSaveDetails = document.getElementById('smartSaveDetails');
        this.smartSaveClose = document.getElementById('smartSaveClose');
        this.smartSaveLater = document.getElementById('smartSaveLater');
        this.smartSaveNow = document.getElementById('smartSaveNow');

        // Health dashboard elements
        this.healthDashboard = document.getElementById('healthDashboard');
        this.healthStats = document.getElementById('healthStats');
        this.healthClose = document.getElementById('healthClose');

        // Loading overlay
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.loadingText = document.getElementById('loadingText');
    }

    setupEventListeners() {
        // Authentication
        this.authBtn.addEventListener('click', () => this.authenticate());
        this.setupBtn.addEventListener('click', () => this.setupVault());
        this.masterPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.authenticate();
        });

        // Search
        this.searchInput.addEventListener('input', () => this.filterEntries());

        // Password generation
        this.generatePwdBtn.addEventListener('click', () => this.togglePasswordGenerator());
        this.regenerateBtn.addEventListener('click', () => this.generatePassword());
        this.copyGeneratedBtn.addEventListener('click', () => this.copyGeneratedPassword());

        // Form operations
        this.addFirstEntryBtn.addEventListener('click', () => this.showForm());
        this.saveBtn.addEventListener('click', () => this.saveEntry());
        this.cancelBtn.addEventListener('click', () => this.hideForm());
        this.addFieldBtn.addEventListener('click', () => this.addCustomField());
        this.generateFormBtn.addEventListener('click', () => this.generatePasswordForForm());

        // Password visibility toggles
        this.togglePassword.addEventListener('click', () => this.togglePasswordVisibility(this.password, this.togglePassword));
        this.toggleGenPwd.addEventListener('click', () => this.togglePasswordVisibility(this.generatedPassword, this.toggleGenPwd));

        // Listen for messages from background script and content script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'credentialsDetected') {
                this.handleCredentialsDetected(message.credentials);
                sendResponse({ received: true });
            } else if (message.action === 'generatedPassword') {
                this.handleGeneratedPassword(message.password);
                sendResponse({ received: true });
            } else if (message.action === 'requestAutoFill') {
                this.handleAutoFillRequest(message.tabId);
                sendResponse({ received: true });
            }
        });

        // Custom fields delegation
        this.customFields.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-field')) {
                e.target.parentElement.remove();
            }
        });

        // Smart save prompt
        this.smartSaveClose.addEventListener('click', () => this.hideSmartSavePrompt());
        this.smartSaveLater.addEventListener('click', () => this.hideSmartSavePrompt());
        this.smartSaveNow.addEventListener('click', () => this.savePendingCredentials());

        // Health dashboard
        this.healthClose.addEventListener('click', () => this.hideHealthDashboard());

        // Add health check button to search bar
        if (this.searchBar) {
            const healthBtn = document.createElement('button');
            healthBtn.className = 'btn btn-secondary';
            healthBtn.textContent = 'Health';
            healthBtn.addEventListener('click', () => this.showHealthDashboard());
            this.searchBar.appendChild(healthBtn);
        }
    }

    async checkAuthentication() {
        try {
            const result = await chrome.storage.local.get(['vault_initialized', 'salt']);
            if (result.vault_initialized && result.salt) {
                this.showAuthSection();
            } else {
                this.showSetupSection();
            }
        } catch (error) {
            console.error('Error checking authentication:', error);
            this.showSetupSection();
        }
    }

    showAuthSection() {
        this.authSection.classList.add('show');
        this.mainSection.classList.remove('show');
        this.masterPassword.focus();
    }

    showSetupSection() {
        this.authSection.classList.add('show');
        this.setupBtn.style.display = 'block';
        this.authBtn.style.display = 'none';
        this.masterPassword.focus();
    }

    async authenticate() {
        const password = this.masterPassword.value.trim();
        if (!password) {
            this.showNotification('Please enter your master password', 'error');
            return;
        }

        this.showLoading(true);
        try {
            const result = await chrome.storage.local.get(['salt', 'test_encrypted']);
            if (!result.salt || !result.test_encrypted) {
                throw new Error('Vault not properly initialized');
            }

            const salt = this.base64ToArrayBuffer(result.salt);
            this.masterKey = await this.deriveKey(password, salt);

            // Test decryption
            const testDecrypted = await this.decryptData(result.test_encrypted);
            if (testDecrypted !== 'vault-test') {
                throw new Error('Invalid password');
            }

            this.isAuthenticated = true;
            await this.loadEntries();
            this.showMainSection();
            this.showNotification('Vault unlocked successfully!');
        } catch (error) {
            console.error('Authentication failed:', error);
            this.showNotification('Invalid master password', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async setupVault() {
        const password = this.masterPassword.value.trim();
        if (!password) {
            this.showNotification('Please enter a master password', 'error');
            return;
        }

        if (password.length < 8) {
            this.showNotification('Master password must be at least 8 characters', 'error');
            return;
        }

        this.showLoading(true);
        try {
            const salt = crypto.getRandomValues(new Uint8Array(16));
            this.masterKey = await this.deriveKey(password, salt);

            // Encrypt test value
            const testEncrypted = await this.encryptData('vault-test');

            await chrome.storage.local.set({
                vault_initialized: true,
                salt: this.arrayBufferToBase64(salt),
                test_encrypted: testEncrypted,
                entries: []
            });

            this.isAuthenticated = true;
            this.entries = [];
            this.showMainSection();
            this.showNotification('Vault created successfully!');
        } catch (error) {
            console.error('Vault setup failed:', error);
            this.showNotification('Failed to create vault', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    showMainSection() {
        this.authSection.classList.remove('show');
        this.mainSection.classList.add('show');
        this.renderEntries();
        this.updateStatusBar();
    }

    async loadEntries() {
        try {
            const result = await chrome.storage.local.get(['entries_encrypted']);
            if (result.entries_encrypted) {
                const decrypted = await this.decryptData(result.entries_encrypted);
                this.entries = JSON.parse(decrypted);
            } else {
                this.entries = [];
            }
        } catch (error) {
            console.error('Error loading entries:', error);
            this.entries = [];
        }
    }

    async saveEntries() {
        try {
            const encrypted = await this.encryptData(JSON.stringify(this.entries));
            await chrome.storage.local.set({ entries_encrypted: encrypted });
        } catch (error) {
            console.error('Error saving entries:', error);
            throw error;
        }
    }

    renderEntries() {
        if (this.entries.length === 0) {
            this.entriesList.innerHTML = `
                <div class="empty-state">
                    <div class="icon">🔒</div>
                    <div>No passwords stored yet</div>
                    <button class="btn btn-primary" id="addFirstEntryBtn">Add Your First Password</button>
                </div>
            `;
            document.getElementById('addFirstEntryBtn').addEventListener('click', () => this.showForm());
            return;
        }

        this.entriesList.innerHTML = this.entries.map(entry => `
            <div class="entry-item" data-id="${entry.id}">
                <div class="entry-info">
                    <div class="entry-site">${this.escapeHtml(entry.site || 'No Site')}</div>
                    <div class="entry-username">${this.escapeHtml(entry.username || entry.email || 'No Username')}</div>
                    ${entry.category ? `<span class="entry-category">${this.escapeHtml(entry.category)}</span>` : ''}
                </div>
                <div class="entry-actions">
                    <button class="action-btn copy-username" title="Copy Username">👤</button>
                    <button class="action-btn copy-password" title="Copy Password">🔑</button>
                    <button class="action-btn edit" title="Edit">✏️</button>
                    <button class="action-btn delete" title="Delete">🗑️</button>
                </div>
            </div>
        `).join('');

        // Add event listeners to entry actions
        this.entriesList.querySelectorAll('.entry-item').forEach(item => {
            const id = parseInt(item.dataset.id);
            const entry = this.entries.find(e => e.id === id);

            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('action-btn')) {
                    this.editEntry(id);
                }
            });

            item.querySelector('.copy-username').addEventListener('click', (e) => {
                e.stopPropagation();
                this.copyToClipboard(entry.username || entry.email || '');
            });

            item.querySelector('.copy-password').addEventListener('click', (e) => {
                e.stopPropagation();
                this.copyToClipboard(entry.password);
            });

            item.querySelector('.edit').addEventListener('click', (e) => {
                e.stopPropagation();
                this.editEntry(id);
            });

            item.querySelector('.delete').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteEntry(id);
            });
        });
    }

    showForm(entry = null) {
        this.currentEditId = entry ? entry.id : null;
        this.formSection.classList.add('show');
        this.entriesList.style.display = 'none';

        if (entry) {
            this.category.value = entry.category || '';
            this.site.value = entry.site || '';
            this.username.value = entry.username || '';
            this.email.value = entry.email || '';
            this.password.value = entry.password || '';
            this.notes.value = entry.notes || '';
            this.renderCustomFields(entry.custom_fields || {});
        } else {
            this.clearForm();
        }

        this.site.focus();
    }

    hideForm() {
        this.formSection.classList.remove('show');
        this.entriesList.style.display = 'block';
        this.clearForm();
        this.currentEditId = null;
    }

    clearForm() {
        this.category.value = '';
        this.site.value = '';
        this.username.value = '';
        this.email.value = '';
        this.password.value = '';
        this.notes.value = '';
        this.customFields.innerHTML = `
            <div class="custom-field-item">
                <input type="text" class="custom-field-input" placeholder="Field name">
                <input type="text" class="custom-field-input" placeholder="Value">
                <button class="remove-field">×</button>
            </div>
        `;
    }

    renderCustomFields(fields) {
        this.customFields.innerHTML = '';

        if (Object.keys(fields).length === 0) {
            this.addCustomField();
            return;
        }

        Object.entries(fields).forEach(([key, value]) => {
            const fieldItem = document.createElement('div');
            fieldItem.className = 'custom-field-item';
            fieldItem.innerHTML = `
                <input type="text" class="custom-field-input" placeholder="Field name" value="${this.escapeHtml(key)}">
                <input type="text" class="custom-field-input" placeholder="Value" value="${this.escapeHtml(value)}">
                <button class="remove-field">×</button>
            `;
            this.customFields.appendChild(fieldItem);
        });
    }

    addCustomField(key = '', value = '') {
        const fieldItem = document.createElement('div');
        fieldItem.className = 'custom-field-item';
        fieldItem.innerHTML = `
            <input type="text" class="custom-field-input" placeholder="Field name" value="${this.escapeHtml(key)}">
            <input type="text" class="custom-field-input" placeholder="Value" value="${this.escapeHtml(value)}">
            <button class="remove-field">×</button>
        `;
        this.customFields.appendChild(fieldItem);
    }

    async saveEntry() {
        const entry = {
            id: this.currentEditId || Date.now(),
            category: this.category.value.trim(),
            site: this.site.value.trim(),
            username: this.username.value.trim(),
            email: this.email.value.trim(),
            password: this.password.value,
            notes: this.notes.value.trim(),
            custom_fields: this.getCustomFields(),
            created_at: this.currentEditId ? undefined : new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (!entry.site || !entry.password) {
            this.showNotification('Site and Password are required', 'error');
            return;
        }

        this.showLoading(true);
        try {
            if (this.currentEditId) {
                const index = this.entries.findIndex(e => e.id === this.currentEditId);
                if (index !== -1) {
                    this.entries[index] = entry;
                }
            } else {
                this.entries.push(entry);
            }

            await this.saveEntries();
            this.hideForm();
            this.renderEntries();
            this.updateStatusBar();
            this.showNotification(`Entry ${this.currentEditId ? 'updated' : 'added'} successfully!`);
        } catch (error) {
            console.error('Error saving entry:', error);
            this.showNotification('Failed to save entry', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    editEntry(id) {
        const entry = this.entries.find(e => e.id === id);
        if (entry) {
            this.showForm(entry);
        }
    }

    async deleteEntry(id) {
        if (!confirm('Are you sure you want to delete this entry?')) {
            return;
        }

        this.showLoading(true);
        try {
            this.entries = this.entries.filter(e => e.id !== id);
            await this.saveEntries();
            this.renderEntries();
            this.updateStatusBar();
            this.showNotification('Entry deleted successfully!');
        } catch (error) {
            console.error('Error deleting entry:', error);
            this.showNotification('Failed to delete entry', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    getCustomFields() {
        const fields = {};
        const fieldItems = this.customFields.querySelectorAll('.custom-field-item');

        fieldItems.forEach(item => {
            const inputs = item.querySelectorAll('.custom-field-input');
            const key = inputs[0].value.trim();
            const value = inputs[1].value.trim();

            if (key) {
                fields[key] = value;
            }
        });

        return fields;
    }

    filterEntries() {
        const query = this.searchInput.value.toLowerCase();
        const filtered = this.entries.filter(entry =>
            (entry.site || '').toLowerCase().includes(query) ||
            (entry.username || '').toLowerCase().includes(query) ||
            (entry.email || '').toLowerCase().includes(query) ||
            (entry.category || '').toLowerCase().includes(query)
        );

        this.renderFilteredEntries(filtered);
        this.updateStatusBar(filtered.length);
    }

    renderFilteredEntries(entries) {
        if (entries.length === 0) {
            this.entriesList.innerHTML = `
                <div class="empty-state">
                    <div class="icon">🔍</div>
                    <div>No matching entries found</div>
                </div>
            `;
            return;
        }

        this.entriesList.innerHTML = entries.map(entry => {
            const strength = this.calculatePasswordStrength(entry.password);
            const strengthClass = strength < 3 ? 'weak' : strength < 4 ? 'medium' : 'strong';

            return `
                <div class="entry-item" data-id="${entry.id}">
                    <div class="entry-info">
                        <div class="entry-site">${this.escapeHtml(entry.site || 'No Site')}</div>
                        <div class="entry-username">${this.escapeHtml(entry.username || entry.email || 'No Username')}</div>
                        <div class="entry-meta">
                            ${entry.category ? `<span class="entry-category">${this.escapeHtml(entry.category)}</span>` : ''}
                            <div class="entry-strength">
                                <div class="strength-bar">
                                    <div class="strength-fill ${strengthClass}"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="entry-actions">
                        <button class="action-btn copy-username" title="Copy Username">👤</button>
                        <button class="action-btn copy-password" title="Copy Password">🔑</button>
                        <button class="action-btn edit" title="Edit">✏️</button>
                        <button class="action-btn delete" title="Delete">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners (simplified version)
        this.entriesList.querySelectorAll('.entry-item').forEach(item => {
            const id = parseInt(item.dataset.id);
            const entry = entries.find(e => e.id === id);

            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('action-btn')) {
                    this.editEntry(id);
                }
            });

            item.querySelector('.copy-username')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.copyToClipboard(entry.username || entry.email || '');
            });

            item.querySelector('.copy-password')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.copyToClipboard(entry.password);
            });

            item.querySelector('.edit')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editEntry(id);
            });

            item.querySelector('.delete')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteEntry(id);
            });
        });
    }

    togglePasswordGenerator() {
        const isVisible = this.generateSection.style.display !== 'none';
        this.generateSection.style.display = isVisible ? 'none' : 'block';

        if (!isVisible) {
            this.generatePassword();
        }
    }

    generatePassword() {
        const password = this.generateSecurePassword();
        this.generatedPassword.value = password;
        this.updatePasswordStrength(password);
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

    updatePasswordStrength(password) {
        const strength = this.calculatePasswordStrength(password);
        let strengthText = '';
        let strengthClass = '';

        if (strength < 3) {
            strengthText = 'Weak';
            strengthClass = 'strength-weak';
        } else if (strength < 4) {
            strengthText = 'Medium';
            strengthClass = 'strength-medium';
        } else {
            strengthText = 'Strong';
            strengthClass = 'strength-strong';
        }

        this.passwordStrength.textContent = `Strength: ${strengthText}`;
        this.passwordStrength.className = `password-strength ${strengthClass}`;
    }

    calculatePasswordStrength(password) {
        let score = 0;

        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        return score;
    }

    generatePasswordForForm() {
        const password = this.generateSecurePassword();
        this.password.value = password;
        this.showNotification('Password generated and filled!');
    }

    async copyGeneratedPassword() {
        await this.copyToClipboard(this.generatedPassword.value);
        this.showNotification('Generated password copied to clipboard!');
    }

    async handleGeneratedPassword(password) {
        try {
            await this.copyToClipboard(password);
            this.showNotification('Password generated and copied to clipboard!');
            // Also show the generator section with the password
            this.generatedPassword.value = password;
            this.updatePasswordStrength(password);
            this.generateSection.style.display = 'block';
        } catch (error) {
            console.error('Failed to handle generated password:', error);
            this.showNotification('Failed to copy password to clipboard', 'error');
        }
    }

    async handleAutoFillRequest(tabId) {
        if (!this.isAuthenticated) {
            this.showNotification('Please unlock SecureVault first', 'error');
            return;
        }

        try {
            const tab = await chrome.tabs.get(tabId);
            const domain = this.extractDomain(tab.url);

            // Filter entries for this domain
            const relevantEntries = this.entries.filter(entry => {
                const entryDomain = this.extractDomain(entry.site);
                return entryDomain === domain;
            });

            if (relevantEntries.length === 0) {
                this.showNotification(`No saved credentials found for ${domain}`, 'info');
                return;
            }

            // Show filtered entries
            this.showAutoFillInterface(relevantEntries, tabId);
        } catch (error) {
            console.error('Error handling auto-fill request:', error);
            this.showNotification('Failed to get credentials for auto-fill', 'error');
        }
    }

    showAutoFillInterface(entries, tabId) {
        // Temporarily filter the entries list to show only relevant entries
        const originalEntries = this.entries;
        this.entries = entries;
        this.renderEntries();

        // Add auto-fill buttons to each entry
        this.entriesList.querySelectorAll('.entry-item').forEach((item, index) => {
            const autoFillBtn = document.createElement('button');
            autoFillBtn.className = 'action-btn auto-fill';
            autoFillBtn.title = 'Auto-fill this credential';
            autoFillBtn.textContent = '🚀';
            autoFillBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.autoFillCredential(entries[index], tabId);
            });

            const actionsDiv = item.querySelector('.entry-actions');
            actionsDiv.insertBefore(autoFillBtn, actionsDiv.firstChild);
        });

        this.showNotification(`Found ${entries.length} credential${entries.length > 1 ? 's' : ''} for this site`, 'info');

        // Restore original entries after 10 seconds
        setTimeout(() => {
            this.entries = originalEntries;
            this.renderEntries();
            this.filterEntries(); // Reapply any search filter
        }, 10000);
    }

    async autoFillCredential(credential, tabId) {
        try {
            await chrome.tabs.sendMessage(tabId, {
                action: 'fillForm',
                credentials: credential
            });
            this.showNotification('Credentials filled successfully!');
        } catch (error) {
            console.error('Error auto-filling credentials:', error);
            this.showNotification('Failed to fill credentials', 'error');
        }
    }

    togglePasswordVisibility(input, button) {
        const isVisible = input.type === 'text';
        input.type = isVisible ? 'password' : 'text';
        button.textContent = isVisible ? '👁' : '🙈';
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showNotification('Failed to copy to clipboard', 'error');
        }
    }

    updateStatusBar(count) {
        const totalCount = count !== undefined ? count : this.entries.length;
        const searchQuery = this.searchInput.value.trim();
        let status = `${totalCount} password${totalCount !== 1 ? 's' : ''}`;

        if (searchQuery) {
            status += ` matching "${searchQuery}"`;
        }

        this.statusBar.textContent = status;
    }

    showLoading(show) {
        this.loading.classList.toggle('show', show);
    }

    // Intelligent Features
    setupCredentialDetection() {
        // Listen for form submissions and input changes
        document.addEventListener('input', (e) => {
            if (e.target.type === 'password' || e.target.type === 'email' || e.target.type === 'text') {
                this.debouncedCredentialCheck();
            }
        });
    }

    debouncedCredentialCheck = this.debounce(() => {
        // This would be enhanced to detect actual credential patterns
        // For now, it's a placeholder for the intelligent detection
    }, 1000);

    handleCredentialsDetected(credentials) {
        if (!this.isAuthenticated) return;

        this.pendingCredentials = credentials;
        this.showSmartSavePrompt(credentials);
    }

    showSmartSavePrompt(credentials) {
        this.smartSaveDetails.innerHTML = `
            <div class="smart-save-detail">
                <span class="smart-save-label">Site:</span>
                <span class="smart-save-value">${this.escapeHtml(credentials.site || 'Unknown')}</span>
            </div>
            <div class="smart-save-detail">
                <span class="smart-save-label">Username:</span>
                <span class="smart-save-value">${this.escapeHtml(credentials.username || credentials.email || 'Not detected')}</span>
            </div>
            <div class="smart-save-detail">
                <span class="smart-save-label">Password:</span>
                <span class="smart-save-value">${'•'.repeat(Math.min(credentials.password?.length || 0, 12))}</span>
            </div>
        `;

        this.smartSavePrompt.classList.add('show');
        this.showNotification('Login credentials detected! Save them to SecureVault?', 'info');
    }

    hideSmartSavePrompt() {
        this.smartSavePrompt.classList.remove('show');
        this.pendingCredentials = null;
    }

    async savePendingCredentials() {
        if (!this.pendingCredentials) return;

        const credentials = this.pendingCredentials;
        this.hideSmartSavePrompt();

        this.showLoadingOverlay(true, 'Saving credentials...');

        try {
            const entry = {
                id: Date.now(),
                category: this.detectCategory(credentials.site),
                site: credentials.site,
                username: credentials.username,
                email: credentials.email,
                password: credentials.password,
                notes: '',
                custom_fields: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            this.entries.push(entry);
            await this.saveEntries();
            this.renderEntries();
            this.updateStatusBar();

            this.showNotification('Credentials saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving credentials:', error);
            this.showNotification('Failed to save credentials', 'error');
        } finally {
            this.showLoadingOverlay(false);
        }
    }

    detectCategory(site) {
        const categories = {
            'gmail.com': 'Personal',
            'outlook.com': 'Personal',
            'yahoo.com': 'Personal',
            'amazon.com': 'Shopping',
            'netflix.com': 'Entertainment',
            'github.com': 'Work',
            'linkedin.com': 'Work',
            'facebook.com': 'Social',
            'twitter.com': 'Social',
            'instagram.com': 'Social'
        };

        for (const [domain, category] of Object.entries(categories)) {
            if (site.includes(domain)) {
                return category;
            }
        }

        return 'Other';
    }

    showHealthDashboard() {
        const stats = this.calculateHealthStats();
        this.healthStats.innerHTML = `
            <div class="health-stat">
                <div class="health-stat-info">
                    <div class="health-stat-icon">🔒</div>
                    <div class="health-stat-details">
                        <div class="health-stat-label">Total Passwords</div>
                        <div class="health-stat-desc">Stored securely</div>
                    </div>
                </div>
                <div class="health-stat-value">${this.entries.length}</div>
            </div>
            <div class="health-stat">
                <div class="health-stat-info">
                    <div class="health-stat-icon">🟢</div>
                    <div class="health-stat-details">
                        <div class="health-stat-label">Strong Passwords</div>
                        <div class="health-stat-desc">High security score</div>
                    </div>
                </div>
                <div class="health-stat-value">${stats.strong}</div>
            </div>
            <div class="health-stat">
                <div class="health-stat-info">
                    <div class="health-stat-icon">🟡</div>
                    <div class="health-stat-details">
                        <div class="health-stat-label">Medium Strength</div>
                        <div class="health-stat-desc">Needs improvement</div>
                    </div>
                </div>
                <div class="health-stat-value">${stats.medium}</div>
            </div>
            <div class="health-stat">
                <div class="health-stat-info">
                    <div class="health-stat-icon">🔴</div>
                    <div class="health-stat-details">
                        <div class="health-stat-label">Weak Passwords</div>
                        <div class="health-stat-desc">High risk</div>
                    </div>
                </div>
                <div class="health-stat-value">${stats.weak}</div>
            </div>
            <div class="health-stat">
                <div class="health-stat-info">
                    <div class="health-stat-icon">🔄</div>
                    <div class="health-stat-details">
                        <div class="health-stat-label">Reused Passwords</div>
                        <div class="health-stat-desc">Security risk</div>
                    </div>
                </div>
                <div class="health-stat-value">${stats.reused}</div>
            </div>
        `;

        this.healthDashboard.classList.add('show');
    }

    hideHealthDashboard() {
        this.healthDashboard.classList.remove('show');
    }

    calculateHealthStats() {
        const stats = { strong: 0, medium: 0, weak: 0, reused: 0 };
        const passwordMap = new Map();

        this.entries.forEach(entry => {
            const strength = this.calculatePasswordStrength(entry.password);

            if (strength >= 4) stats.strong++;
            else if (strength >= 3) stats.medium++;
            else stats.weak++;

            // Check for reused passwords
            if (passwordMap.has(entry.password)) {
                stats.reused++;
            } else {
                passwordMap.set(entry.password, entry.id);
            }
        });

        return stats;
    }

    showLoadingOverlay(show, text = 'Processing...') {
        this.loadingText.textContent = text;
        this.loadingOverlay.classList.toggle('show', show);
    }

    showNotification(message, type = 'success') {
        // Keep backward compatibility
        this.showEnhancedNotification(message, type);
    }

    showEnhancedNotification(message, type = 'success', title = '') {
        const notification = document.createElement('div');
        notification.className = `notification ${type} show`;

        const icon = this.getNotificationIcon(type);
        const defaultTitle = title || this.getNotificationTitle(type);

        notification.innerHTML = `
            <div class="notification-icon">${icon}</div>
            <div class="notification-content">
                <div class="notification-title">${defaultTitle}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        this.notificationContainer.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 400);
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }

    getNotificationTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Information'
        };
        return titles[type] || 'Notification';
    }

    // Encryption/Decryption methods using Web Crypto API
    async deriveKey(password, salt) {
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 200000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    async encryptData(data) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            this.masterKey,
            new TextEncoder().encode(data)
        );

        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);

        return this.arrayBufferToBase64(combined);
    }

    async decryptData(encryptedData) {
        const combined = this.base64ToArrayBuffer(encryptedData);
        const iv = combined.slice(0, 12);
        const encrypted = combined.slice(12);

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            this.masterKey,
            encrypted
        );

        return new TextDecoder().decode(decrypted);
    }

    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
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

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SecureVault();
});
