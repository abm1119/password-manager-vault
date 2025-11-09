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
        this.autoLockTimer = null;
        this.autoLockDelay = 10 * 60 * 1000; // 10 minutes
        this.vaultStatus = 'loading';

        this.initializeElements();
        this.setupEventListeners();
        this.updateStatusIndicator('loading', 'Loading...');
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
        this.formTitle = document.getElementById('formTitle');
        this.backToListBtn = document.getElementById('backToListBtn');
        this.generateSection = document.getElementById('generateSection');

        // Form elements
        this.category = document.getElementById('category');
        this.site = document.getElementById('site');
        this.username = document.getElementById('username');
        this.email = document.getElementById('email');
        this.password = document.getElementById('password');
        this.totpSecret = document.getElementById('totpSecret');
        this.totpCode = document.getElementById('totpCode');
        this.notes = document.getElementById('notes');
        this.customFields = document.getElementById('customFields');

        // Buttons
        this.generatePwdBtn = document.getElementById('generatePwdBtn');
        this.addFirstEntryBtn = document.getElementById('addFirstEntryBtn');
        this.addNewBtn = document.getElementById('addNewBtn');
        this.importBtn = document.getElementById('importBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.saveBtn = document.getElementById('saveBtn');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.addFieldBtn = document.getElementById('addFieldBtn');
        this.regenerateBtn = document.getElementById('regenerateBtn');
        this.copyGeneratedBtn = document.getElementById('copyGeneratedBtn');
        this.generateFormBtn = document.getElementById('generateFormBtn');
        this.generateTotpBtn = document.getElementById('generateTotpBtn');

        // Other elements
        this.loading = document.getElementById('loading');
        this.statusBar = document.getElementById('statusBar');
        this.notificationContainer = document.getElementById('notificationContainer');
        this.generatedPassword = document.getElementById('generatedPassword');
        this.passwordStrength = document.getElementById('passwordStrength');
        this.togglePassword = document.getElementById('togglePassword');
        this.toggleGenPwd = document.getElementById('toggleGenPwd');

        // Password generator options
        this.includeLowercase = document.getElementById('includeLowercase');
        this.includeUppercase = document.getElementById('includeUppercase');
        this.includeNumbers = document.getElementById('includeNumbers');
        this.includeSymbols = document.getElementById('includeSymbols');
        this.passwordLength = document.getElementById('passwordLength');

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

        // Status indicator
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
    }

    setupEventListeners() {
        // Authentication
        this.authBtn.addEventListener('click', () => this.authenticate());
        this.setupBtn.addEventListener('click', () => this.setupVault());
        this.masterPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.authenticate();
        });

        // Activity tracking for auto-lock
        document.addEventListener('click', () => this.resetAutoLockTimer());
        document.addEventListener('keypress', () => this.resetAutoLockTimer());
        document.addEventListener('scroll', () => this.resetAutoLockTimer());

        // Search
        this.searchInput.addEventListener('input', () => this.filterEntries());

        // Password generation
        this.generatePwdBtn.addEventListener('click', () => this.togglePasswordGenerator());
        this.regenerateBtn.addEventListener('click', () => this.generatePassword());
        this.copyGeneratedBtn.addEventListener('click', () => this.copyGeneratedPassword());

        // Import/Export
        this.importBtn.addEventListener('click', () => this.importPasswords());
        this.exportBtn.addEventListener('click', () => this.exportPasswords());

        // Form operations
        this.addFirstEntryBtn.addEventListener('click', () => this.showForm());
        this.addNewBtn.addEventListener('click', () => this.showForm());
        this.saveBtn.addEventListener('click', () => this.saveEntry());
        this.cancelBtn.addEventListener('click', () => this.hideForm());
        this.addFieldBtn.addEventListener('click', () => this.addCustomField());
        this.generateFormBtn.addEventListener('click', () => this.generatePasswordForForm());
        this.generateTotpBtn.addEventListener('click', () => this.generateTotpCode());
        this.backToListBtn.addEventListener('click', () => this.hideForm());

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
            const result = await chrome.storage.local.get(['vault_initialized', 'salt', 'test_encrypted']);
            console.log('Vault check result:', result);

            if (result.vault_initialized && result.salt && result.test_encrypted) {
                console.log('Vault exists, showing auth section');
                this.showAuthSection();
                this.updateStatusIndicator('locked', 'Locked');
            } else {
                console.log('Vault not initialized, showing setup section');
                this.showSetupSection();
                this.updateStatusIndicator('setup', 'Setup required');
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
        this.updateStatusIndicator('locked', 'Locked');
    }

    showSetupSection() {
        this.authSection.classList.add('show');
        this.setupBtn.style.display = 'block';
        this.authBtn.style.display = 'none';
        this.masterPassword.focus();

        // Add a reset button for troubleshooting
        if (!document.getElementById('resetBtn')) {
            const resetBtn = document.createElement('button');
            resetBtn.id = 'resetBtn';
            resetBtn.className = 'btn btn-secondary';
            resetBtn.textContent = 'Reset Vault (Debug)';
            resetBtn.style.marginTop = 'var(--space-4)';
            resetBtn.style.fontSize = 'var(--font-size-xs)';
            resetBtn.addEventListener('click', () => this.resetVault());
            this.authSection.appendChild(resetBtn);
        }
    }

    async authenticate() {
        const password = this.masterPassword.value.trim();
        if (!password) {
            this.showNotification('Please enter your master password', 'error');
            return;
        }

        this.showLoading(true, 'Unlocking vault...');
        try {
            console.log('Starting authentication...');

            // Get vault data
            const result = await chrome.storage.local.get(['vault_initialized', 'salt', 'test_encrypted', 'entries_encrypted']);
            console.log('Retrieved vault data:', result);

            if (!result.vault_initialized) {
                throw new Error('No vault found. Please create a new vault first.');
            }

            if (!result.salt || !result.test_encrypted) {
                throw new Error('Vault is corrupted. Please create a new vault.');
            }

            console.log('Converting salt from base64...');
            const salt = this.base64ToArrayBuffer(result.salt);
            console.log('Salt converted:', salt);

            console.log('Deriving master key...');
            this.masterKey = await this.deriveKey(password, salt);
            console.log('Master key derived');

            console.log('Testing decryption...');
            const testDecrypted = await this.decryptData(result.test_encrypted);
            console.log('Test decryption result:', testDecrypted);

            if (testDecrypted !== 'vault-test') {
                throw new Error('Invalid master password');
            }

            console.log('Loading entries...');
            await this.loadEntries();

            this.isAuthenticated = true;
            this.showMainSection();
            this.showNotification('Vault unlocked successfully!');

            console.log('Authentication completed successfully');

        } catch (error) {
            console.error('Authentication failed:', error);

            // Provide more specific error messages
            let errorMessage = 'Authentication failed';
            if (error.message.includes('Invalid master password')) {
                errorMessage = 'Invalid master password';
            } else if (error.message.includes('No vault found')) {
                errorMessage = 'No vault found. Please create a new vault first.';
            } else if (error.message.includes('corrupted')) {
                errorMessage = 'Vault appears to be corrupted. Please create a new vault.';
            }

            this.showNotification(errorMessage, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async resetVault() {
        if (!confirm('This will permanently delete all stored passwords and reset the vault. Are you sure?')) {
            return;
        }

        this.showLoading(true, 'Resetting vault...');
        try {
            console.log('Resetting vault...');

            // Clear all vault-related data
            await chrome.storage.local.remove([
                'vault_initialized',
                'salt',
                'test_encrypted',
                'entries_encrypted',
                'vault_version',
                'created_at'
            ]);

            // Reset instance state
            this.isAuthenticated = false;
            this.entries = [];
            this.masterKey = null;
            this.currentEditId = null;

            console.log('Vault reset successfully');
            this.showNotification('Vault reset successfully. Please create a new vault.', 'info');

            // Refresh the UI
            this.checkAuthentication();

        } catch (error) {
            console.error('Vault reset failed:', error);
            this.showNotification('Failed to reset vault', 'error');
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

        this.showLoading(true, 'Creating secure vault...');
        try {
            console.log('Starting vault creation...');

            // Generate salt
            const salt = crypto.getRandomValues(new Uint8Array(16));
            console.log('Generated salt:', salt);

            // Derive master key
            console.log('Deriving master key...');
            this.masterKey = await this.deriveKey(password, salt);
            console.log('Master key derived successfully');

            // Encrypt test value
            console.log('Encrypting test value...');
            const testEncrypted = await this.encryptData('vault-test');
            console.log('Test value encrypted:', testEncrypted);

            // Encrypt empty entries array
            console.log('Encrypting empty entries...');
            const entriesEncrypted = await this.encryptData(JSON.stringify([]));
            console.log('Entries encrypted:', entriesEncrypted);

            // Store vault data
            const vaultData = {
                vault_initialized: true,
                salt: this.arrayBufferToBase64(salt),
                test_encrypted: testEncrypted,
                entries_encrypted: entriesEncrypted,
                vault_version: '1.0',
                created_at: new Date().toISOString()
            };

            console.log('Storing vault data:', vaultData);
            await chrome.storage.local.set(vaultData);

            // Verify storage
            const verification = await chrome.storage.local.get(['vault_initialized', 'salt', 'test_encrypted', 'entries_encrypted']);
            console.log('Storage verification:', verification);

            if (!verification.vault_initialized || !verification.salt || !verification.test_encrypted || !verification.entries_encrypted) {
                throw new Error('Vault storage verification failed');
            }

            // Test decryption immediately
            console.log('Testing decryption...');
            const testDecrypted = await this.decryptData(testEncrypted);
            if (testDecrypted !== 'vault-test') {
                throw new Error('Decryption test failed');
            }
            console.log('Decryption test passed');

            this.isAuthenticated = true;
            this.entries = [];
            this.showMainSection();
            this.showNotification('Secure vault created successfully!');

            console.log('Vault creation completed successfully');

        } catch (error) {
            console.error('Vault setup failed:', error);
            this.showNotification(`Failed to create vault: ${error.message}`, 'error');

            // Clean up on failure
            try {
                await chrome.storage.local.remove(['vault_initialized', 'salt', 'test_encrypted', 'entries_encrypted']);
            } catch (cleanupError) {
                console.error('Cleanup failed:', cleanupError);
            }
        } finally {
            this.showLoading(false);
        }
    }

    showMainSection() {
        this.authSection.classList.remove('show');
        this.mainSection.classList.add('show');
        this.renderEntries();
        this.updateStatusBar();
        this.setupAutoLock();
        this.updateStatusIndicator('unlocked', `${this.entries.length} entries`);
    }

    async loadEntries() {
        try {
            console.log('Loading entries...');
            const result = await chrome.storage.local.get(['entries_encrypted']);
            console.log('Entries storage result:', result);

            if (result.entries_encrypted) {
                console.log('Decrypting entries...');
                const decrypted = await this.decryptData(result.entries_encrypted);
                console.log('Decrypted entries:', decrypted);

                this.entries = JSON.parse(decrypted);
                console.log('Parsed entries:', this.entries);

                // Validate entries structure
                if (!Array.isArray(this.entries)) {
                    console.warn('Entries is not an array, resetting to empty array');
                    this.entries = [];
                }
            } else {
                console.log('No encrypted entries found, initializing empty array');
                this.entries = [];
            }

            console.log(`Loaded ${this.entries.length} entries`);
        } catch (error) {
            console.error('Error loading entries:', error);
            this.showNotification('Warning: Could not load all entries. Some data may be corrupted.', 'warning');
            this.entries = [];
        }
    }

    async saveEntries() {
        try {
            console.log('Saving entries...');

            // Validate entries before saving
            if (!Array.isArray(this.entries)) {
                throw new Error('Entries is not a valid array');
            }

            const entriesJson = JSON.stringify(this.entries);
            console.log('Entries JSON:', entriesJson);

            console.log('Encrypting entries...');
            const encrypted = await this.encryptData(entriesJson);
            console.log('Entries encrypted successfully');

            console.log('Storing encrypted entries...');
            await chrome.storage.local.set({ entries_encrypted: encrypted });

            // Verify storage
            const verification = await chrome.storage.local.get(['entries_encrypted']);
            if (!verification.entries_encrypted) {
                throw new Error('Storage verification failed');
            }

            console.log('Entries saved successfully');
        } catch (error) {
            console.error('Error saving entries:', error);
            this.showNotification('Failed to save entries. Please try again.', 'error');
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
        this.formTitle.textContent = entry ? 'Edit Password' : 'Add New Password';
        this.formSection.classList.add('show');
        this.entriesList.style.display = 'none';

        if (entry) {
            this.category.value = entry.category || '';
            this.site.value = entry.site || '';
            this.username.value = entry.username || '';
            this.email.value = entry.email || '';
            this.password.value = entry.password || '';
            this.totpSecret.value = entry.totp_secret || '';
            this.totpCode.value = '';
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
    this.totpSecret.value = '';
    this.totpCode.value = '';
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
            totp_secret: this.totpSecret.value.trim(),
            notes: this.notes.value.trim(),
            custom_fields: this.getCustomFields(),
            password_history: this.currentEditId ? this.trackPasswordChange(this.currentEditId, this.password.value) : [],
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
        const options = {
            length: parseInt(this.passwordLength.value) || 16,
            includeLowercase: this.includeLowercase.checked,
            includeUppercase: this.includeUppercase.checked,
            includeNumbers: this.includeNumbers.checked,
            includeSymbols: this.includeSymbols.checked
        };
        const password = this.generateSecurePassword(options);
        this.generatedPassword.value = password;
        this.updatePasswordStrength(password);
    }

    generateSecurePassword(options = {}) {
        const {
            length = 16,
            includeLowercase = true,
            includeUppercase = true,
            includeNumbers = true,
            includeSymbols = true
        } = options;

        const charSets = [];
        let requiredChars = [];

        if (includeLowercase) {
            charSets.push('abcdefghijklmnopqrstuvwxyz');
            requiredChars.push('abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]);
        }
        if (includeUppercase) {
            charSets.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
            requiredChars.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]);
        }
        if (includeNumbers) {
            charSets.push('0123456789');
            requiredChars.push('0123456789'[Math.floor(Math.random() * 10)]);
        }
        if (includeSymbols) {
            charSets.push('!@#$%^&*()_+-=[]{}|;:,.<>?');
            requiredChars.push('!@#$%^&*()_+-=[]{}|;:,.<>?'[Math.floor(Math.random() * 27)]);
        }

        if (charSets.length === 0) {
            // Fallback if no character sets selected
            charSets.push('abcdefghijklmnopqrstuvwxyz');
            requiredChars.push('abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]);
        }

        const allChars = charSets.join('');
        let password = requiredChars.join('');

        // Fill the rest randomly
        for (let i = password.length; i < length; i++) {
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
        const options = {
            length: parseInt(this.passwordLength.value) || 16,
            includeLowercase: this.includeLowercase.checked,
            includeUppercase: this.includeUppercase.checked,
            includeNumbers: this.includeNumbers.checked,
            includeSymbols: this.includeSymbols.checked
        };
        const password = this.generateSecurePassword(options);
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

    async exportPasswords() {
        if (this.entries.length === 0) {
            this.showNotification('No passwords to export', 'warning');
            return;
        }

        try {
            // Create CSV content
            const headers = ['Category', 'Site', 'Username', 'Email', 'Password', 'Notes', 'Created At', 'Updated At'];
            const csvContent = [
                headers.join(','),
                ...this.entries.map(entry => [
                    `"${(entry.category || '').replace(/"/g, '""')}"`,
                    `"${(entry.site || '').replace(/"/g, '""')}"`,
                    `"${(entry.username || '').replace(/"/g, '""')}"`,
                    `"${(entry.email || '').replace(/"/g, '""')}"`,
                    `"${(entry.password || '').replace(/"/g, '""')}"`,
                    `"${(entry.notes || '').replace(/"/g, '""')}"`,
                    `"${entry.created_at || ''}"`,
                    `"${entry.updated_at || ''}"`
                ].join(','))
            ].join('\n');

            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `securevault_export_${new Date().toISOString().split('T')[0]}.csv`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showNotification(`Exported ${this.entries.length} passwords successfully!`);
        } catch (error) {
            console.error('Export failed:', error);
            this.showNotification('Failed to export passwords', 'error');
        }
    }

    async importPasswords() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.style.display = 'none';

        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const lines = text.split('\n').filter(line => line.trim());
                if (lines.length < 2) {
                    throw new Error('Invalid CSV format');
                }

                const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
                const expectedHeaders = ['Category', 'Site', 'Username', 'Email', 'Password'];

                // Check if required headers are present
                const hasRequiredHeaders = expectedHeaders.every(header =>
                    headers.some(h => h.toLowerCase().includes(header.toLowerCase()))
                );

                if (!hasRequiredHeaders) {
                    throw new Error('CSV must contain Category, Site, Username, Email, and Password columns');
                }

                let imported = 0;
                for (let i = 1; i < lines.length; i++) {
                    const values = this.parseCSVLine(lines[i]);
                    if (values.length >= 5) {
                        const entry = {
                            id: Date.now() + i, // Ensure unique IDs
                            category: values[0] || 'Other',
                            site: values[1] || '',
                            username: values[2] || '',
                            email: values[3] || '',
                            password: values[4] || '',
                            notes: values[5] || '',
                            custom_fields: {},
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        };

                        // Only import if site and password are present
                        if (entry.site && entry.password) {
                            this.entries.push(entry);
                            imported++;
                        }
                    }
                }

                if (imported > 0) {
                    await this.saveEntries();
                    this.renderEntries();
                    this.updateStatusBar();
                    this.showNotification(`Imported ${imported} passwords successfully!`);
                } else {
                    this.showNotification('No valid passwords found to import', 'warning');
                }
            } catch (error) {
                console.error('Import failed:', error);
                this.showNotification(`Import failed: ${error.message}`, 'error');
            }
        });

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.replace(/^"|"$/g, ''));
        return result;
    }

    async generateTotpCode() {
        const secret = this.totpSecret.value.trim();
        if (!secret) {
            this.showNotification('Please enter a TOTP secret first', 'warning');
            return;
        }

        try {
            const code = await this.generateTOTP(secret);
            this.totpCode.value = code;
            this.showNotification('TOTP code generated!');
        } catch (error) {
            console.error('TOTP generation failed:', error);
            this.showNotification('Failed to generate TOTP code', 'error');
        }
    }

    generateTOTP(secret, digits = 6) {
        // Decode base32 secret
        const key = this.base32Decode(secret.toUpperCase());

        // Get current time window (30 seconds)
        const time = Math.floor(Date.now() / 1000 / 30);

        // Convert time to 8-byte big-endian
        const timeBytes = new ArrayBuffer(8);
        const view = new DataView(timeBytes);
        view.setUint32(4, time, false); // big-endian

        // HMAC-SHA1
        return crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
            .then(key => crypto.subtle.sign('HMAC', key, timeBytes))
            .then(signature => {
                const hash = new Uint8Array(signature);
                const offset = hash[hash.length - 1] & 0xf;

                const code = ((hash[offset] & 0x7f) << 24) |
                           ((hash[offset + 1] & 0xff) << 16) |
                           ((hash[offset + 2] & 0xff) << 8) |
                           (hash[offset + 3] & 0xff);

                const totp = code % Math.pow(10, digits);
                return totp.toString().padStart(digits, '0');
            });
    }

    base32Decode(encoded) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let bits = 0;
        let value = 0;
        const result = [];

        for (let i = 0; i < encoded.length; i++) {
            const char = encoded[i];
            const index = alphabet.indexOf(char);
            if (index === -1) continue;

            value = (value << 5) | index;
            bits += 5;

            if (bits >= 8) {
                result.push((value >>> (bits - 8)) & 0xff);
                bits -= 8;
            }
        }

        return new Uint8Array(result);
    }

    trackPasswordChange(entryId, newPassword) {
        const existingEntry = this.entries.find(e => e.id === entryId);
        if (!existingEntry) return [];

        const history = existingEntry.password_history || [];

        // Only track if password actually changed
        if (existingEntry.password !== newPassword) {
            history.push({
                password: existingEntry.password,
                changed_at: new Date().toISOString()
            });

            // Keep only last 5 password changes
            if (history.length > 5) {
                history.shift();
            }
        }

        return history;
    }

    setupAutoLock() {
        // Only setup auto-lock when authenticated
        if (this.isAuthenticated) {
            this.resetAutoLockTimer();
        }
    }

    updateStatusIndicator(status, text) {
        if (!this.statusDot || !this.statusText) return;

        this.vaultStatus = status;
        this.statusDot.className = `status-dot ${status}`;
        this.statusText.textContent = text;
    }

    resetAutoLockTimer() {
        if (!this.isAuthenticated) return;

        // Clear existing timer
        if (this.autoLockTimer) {
            clearTimeout(this.autoLockTimer);
        }

        // Set new timer
        this.autoLockTimer = setTimeout(() => {
            this.autoLock();
        }, this.autoLockDelay);
    }

    autoLock() {
        this.isAuthenticated = false;
        this.masterKey = null;
        this.entries = [];
        this.currentEditId = null;

        // Clear timer
        if (this.autoLockTimer) {
            clearTimeout(this.autoLockTimer);
            this.autoLockTimer = null;
        }

        // Show auth section
        this.showAuthSection();
        this.updateStatusIndicator('locked', 'Auto-locked');
        this.showNotification('Vault auto-locked due to inactivity', 'info');
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
