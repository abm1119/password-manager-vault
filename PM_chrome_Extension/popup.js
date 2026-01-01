const API_URL = "http://localhost:5000/api";
const NATIVE_HOST = "com.notionvault.passwords";

class VaultExtension {
    constructor() {
        this.token = null;
        this.entries = [];
        this.mode = 'api'; // 'api' or 'native'

        this.views = {
            login: document.getElementById('loginView'),
            dashboard: document.getElementById('dashboardView'),
            detail: document.getElementById('detailView')
        };

        this.inputs = {
            password: document.getElementById('masterPassword'),
            search: document.getElementById('searchInput'),
            site: document.getElementById('entrySite'),
            username: document.getElementById('entryUsername'),
            passwordField: document.getElementById('entryPassword'),
            notes: document.getElementById('entryNotes')
        };

        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');

        this.init();
    }

    init() {
        this.bindEvents();
        this.checkConnection();
        this.checkPendingCredentials();

        chrome.storage.local.get(['vaultKey'], (result) => {
            if (result.vaultKey) {
                this.token = result.vaultKey;
                this.fetchEntries();
                this.switchView('dashboard');
            }
        });
    }

    async checkPendingCredentials() {
        try {
            chrome.runtime.sendMessage({ action: 'getPendingCredentials' }, (response) => {
                if (response && response.credentials) {
                    this.showAdd(response.credentials);
                }
            });
        } catch (error) {
            console.error('Error checking pending credentials:', error);
        }
    }

    bindEvents() {
        document.getElementById('loginBtn').addEventListener('click', () => this.login());
        this.inputs.password.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });

        document.getElementById('addBtn').addEventListener('click', () => this.showAdd());
        document.getElementById('backBtn').addEventListener('click', () => this.switchView('dashboard'));

        this.inputs.search.addEventListener('input', (e) => this.renderList(e.target.value));

        document.getElementById('togglePassBtn').addEventListener('click', () => {
            const type = this.inputs.passwordField.type;
            this.inputs.passwordField.type = type === 'password' ? 'text' : 'password';
            document.getElementById('togglePassBtn').innerText = type === 'password' ? 'Hide' : 'Show';
        });

        document.getElementById('generateBtn').addEventListener('click', () => {
            const pwd = this.generatePassword();
            this.inputs.passwordField.value = pwd;
            this.inputs.passwordField.type = 'text';
        });

        document.getElementById('saveEntryBtn').addEventListener('click', () => this.saveEntry());

        document.querySelectorAll('.copy-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                const targetId = e.target.dataset.target;
                const el = document.getElementById(targetId);
                navigator.clipboard.writeText(el.value);
                this.showNotification('Copied!');
            });
        });
    }

    async checkConnection() {
        this.statusText.innerText = "Checking connection...";
        this.statusDot.className = "status-dot";

        // 1. Try API with timeout
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1000); // 1s timeout

            const res = await fetch(API_URL.replace('/api', '/'), {
                method: 'HEAD',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                this.mode = 'api';
                this.statusDot.classList.add('connected');
                this.statusText.innerText = "Connected (Web)";
                return;
            }
        } catch (e) {
            console.log("Web API not reachable, switching to Native check...");
        }

        // 2. Try Native
        try {
            chrome.runtime.sendNativeMessage(NATIVE_HOST, { command: 'ping' }, (response) => {
                if (chrome.runtime.lastError) {
                    this.statusDot.classList.remove('connected');
                    this.statusText.innerText = "Offline (Run register_host.bat)";
                } else if (response && response.pong) {
                    this.mode = 'native';
                    this.statusDot.classList.add('connected');
                    this.statusText.innerText = "Connected (Native)";
                }
            });
        } catch (e) {
            this.statusText.innerText = "Error checking connection";
        }
    }

    async login() {
        const password = this.inputs.password.value;
        if (!password) return;

        document.getElementById('loginBtn').innerText = "Verifying...";

        if (this.mode === 'api') {
            try {
                const res = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                });
                const data = await res.json();
                this.handleLoginResult(data);
            } catch {
                // Fallback to native if API dies mid-session
                this.mode = 'native';
                this.login();
            }
        } else {
            chrome.runtime.sendNativeMessage(NATIVE_HOST, { command: 'login', password }, (response) => {
                this.handleLoginResult(response || { success: false, error: "Native Host Error" });
            });
        }
    }

    handleLoginResult(data) {
        document.getElementById('loginBtn').innerText = "Unlock Vault";
        if (data.success) {
            this.token = data.key;
            chrome.storage.local.set({ vaultKey: this.token });
            this.fetchEntries();
            this.switchView('dashboard');
            this.inputs.password.value = '';
        } else {
            document.getElementById('loginError').innerText = data.error || "Incorrect Password";
        }
    }

    async fetchEntries() {
        if (this.mode === 'api') {
            try {
                const res = await fetch(`${API_URL}/entries`, {
                    headers: { 'X-Vault-Key': this.token }
                });
                const data = await res.json();
                if (data.entries) {
                    this.entries = data.entries;
                    this.renderList();
                }
            } catch (e) { console.error(e); }
        } else {
            chrome.runtime.sendNativeMessage(NATIVE_HOST, { command: 'fetch', key: this.token }, (response) => {
                if (response && response.entries) {
                    this.entries = response.entries;
                    this.renderList();
                }
            });
        }
    }

    renderList(filter = '') {
        const container = document.getElementById('entriesList');
        container.innerHTML = '';

        const filtered = this.entries.filter(e =>
            (e.site || '').toLowerCase().includes(filter.toLowerCase()) ||
            (e.username || '').toLowerCase().includes(filter.toLowerCase())
        );

        filtered.forEach(entry => {
            const el = document.createElement('div');
            el.className = 'entry-card';
            el.innerHTML = `
                <div class="entry-info">
                    <div class="entry-title">${entry.site || 'Unknown Site'}</div>
                    <div class="entry-subtitle">${entry.username || 'No Username'}</div>
                </div>
                <div class="entry-actions">
                    <button class="icon-btn copy-user">👤</button>
                    <button class="icon-btn copy-pass">🔑</button>
                </div>
            `;

            el.querySelector('.entry-info').addEventListener('click', () => this.showDetail(entry));

            el.querySelector('.copy-user').addEventListener('click', (e) => {
                e.stopPropagation();
                if (entry.username) {
                    navigator.clipboard.writeText(entry.username);
                    this.showNotification('Username Copied');
                }
            });

            el.querySelector('.copy-pass').addEventListener('click', (e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(entry.password);
                this.showNotification('Password Copied');
            });

            container.appendChild(el);
        });
    }

    showDetail(entry) {
        this.inputs.site.value = entry.site || '';
        this.inputs.username.value = entry.username || '';
        this.inputs.passwordField.value = entry.password || '';
        this.inputs.notes.value = entry.notes || '';

        document.getElementById('detailTitle').innerText = 'Entry Details';
        document.getElementById('saveEntryBtn').style.display = 'none'; // Read-only for now
        this.switchView('detail');
    }

    showAdd(credentials = null) {
        this.inputs.site.value = credentials ? credentials.site : '';
        this.inputs.username.value = credentials ? (credentials.username || credentials.email) : '';
        this.inputs.passwordField.value = credentials ? credentials.password : '';
        this.inputs.notes.value = '';
        document.getElementById('detailTitle').innerText = 'Add Entry';
        document.getElementById('saveEntryBtn').style.display = 'block';
        this.switchView('detail');
    }

    async saveEntry() {
        const data = {
            site: this.inputs.site.value,
            username: this.inputs.username.value,
            password: this.inputs.passwordField.value,
            notes: this.inputs.notes.value
        };

        if (this.mode === 'native') {
            chrome.runtime.sendNativeMessage(NATIVE_HOST, {
                command: 'add',
                key: this.token,
                entry: data
            }, (response) => {
                if (response && response.success) {
                    this.showNotification('Saved (Native)!');
                    this.fetchEntries();
                    this.switchView('dashboard');
                } else {
                    this.showNotification(response?.error || 'Native Save Failed', 'error');
                }
            });
            return;
        }

        try {
            const res = await fetch(`${API_URL}/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Vault-Key': this.token
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                this.showNotification('Saved!');
                await this.fetchEntries();
                this.switchView('dashboard');
            } else {
                const errData = await res.json().catch(() => ({}));
                this.showNotification(errData.error || 'Server error', 'error');
            }
        } catch (e) {
            this.showNotification('Failed to save entry', 'error');
        }
    }

    switchView(viewName) {
        Object.values(this.views).forEach(el => el.classList.remove('active'));
        this.views[viewName].classList.add('active');
        const addBtn = document.getElementById('addBtn');
        addBtn.style.display = viewName === 'dashboard' ? 'block' : 'none';

        // Hide Back button on Dashboard
        document.getElementById('backBtn').style.visibility = viewName === 'dashboard' ? 'hidden' : 'visible';
    }

    showNotification(msg) {
        const el = document.getElementById('notification');
        el.innerText = msg;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 2000);
    }

    generatePassword(length = 16) {
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let retVal = "";
        for (let i = 0, n = charset.length; i < length; ++i) {
            retVal += charset.charAt(Math.floor(Math.random() * n));
        }
        return retVal;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new VaultExtension();
});
