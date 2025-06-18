// Modern Log Viewer - Clean & Minimal Design

// Universal UI Handler Class
class UIHandler {
    // Universal refresh button handler
    static setupRefreshButton(buttonId, loadCallback) {
        const refreshBtn = document.getElementById(buttonId);
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                // Call load callback function
                if (typeof loadCallback === 'function') {
                    loadCallback();
                }
                
                // Add visual feedback
                refreshBtn.classList.add('refreshing');
                setTimeout(() => {
                    refreshBtn.classList.remove('refreshing');
                }, 1000);
            });
        }
    }
    
    // Universal loading state handler
    static showLoading(isLoading, config) {
        const { 
            loadingOverlayId, 
            buttonId, 
            originalButtonText 
        } = config;
        
        if (loadingOverlayId) {
            const overlay = document.getElementById(loadingOverlayId);
            if (overlay) {
                overlay.style.display = isLoading ? 'flex' : 'none';
            }
        }
        
        if (buttonId) {
            const button = document.getElementById(buttonId);
            if (button) {
                if (isLoading) {
                    button.disabled = true;
                    button.innerHTML = `
                        <svg class="loading-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 12a9 9 0 11-6.219-8.56"/>
                        </svg>
                        ${originalButtonText || 'Loading...'}
                    `;
                } else {
                    button.disabled = false;
                    button.innerHTML = originalButtonText || 'Submit';
                }
            }
        }
    }

    // Universal button handler with error handling and loading states
    static bindButton(buttonId, handler, options = {}) {
        const {
            preventDefault = true,
            showLoading = false,
            loadingText = 'Processing...',
            errorHandler = null
        } = options;

        const button = document.getElementById(buttonId);
        if (!button) {
            console.warn(`Button with ID '${buttonId}' not found`);
            return false;
        }

        button.addEventListener('click', async (e) => {
            if (preventDefault) {
                e.preventDefault();
            }

            try {
                if (showLoading) {
                    UIHandler.showLoading(true, {
                        buttonId: buttonId,
                        originalButtonText: button.innerHTML
                    });
                }

                await handler(e);
            } catch (error) {
                console.error(`Error in button handler for '${buttonId}':`, error);
                if (errorHandler) {
                    errorHandler(error);
                } else {
                    // Default error handling
                    UIHandler.showError(`Operation failed: ${error.message}`);
                }
            } finally {
                if (showLoading) {
                    UIHandler.showLoading(false, {
                        buttonId: buttonId,
                        originalButtonText: button.innerHTML
                    });
                }
            }
        });

        return true;
    }

    // Universal modal handler
    static bindModal(modalId, options = {}) {
        const {
            openButtonId = null,
            closeButtonIds = [],
            closeOnBackdrop = true,
            closeOnEscape = true,
            onOpen = null,
            onClose = null
        } = options;

        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modal with ID '${modalId}' not found`);
            return false;
        }

        // Open button handler
        if (openButtonId) {
            UIHandler.bindButton(openButtonId, () => {
                modal.style.display = 'flex';
                if (onOpen) onOpen();
            });
        }

        // Close button handlers
        closeButtonIds.forEach(buttonId => {
            UIHandler.bindButton(buttonId, () => {
                modal.style.display = 'none';
                if (onClose) onClose();
            });
        });

        // Backdrop click handler
        if (closeOnBackdrop) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                    if (onClose) onClose();
                }
            });
        }

        // Escape key handler
        if (closeOnEscape) {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.style.display === 'flex') {
                    modal.style.display = 'none';
                    if (onClose) onClose();
                }
            });
        }

        return true;
    }

    // Universal error display
    static showError(message, duration = 5000) {
        // Create or get error notification element
        let errorElement = document.getElementById('error-notification');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'error-notification';
            errorElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--error);
                color: white;
                padding: 12px 16px;
                border-radius: 4px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                display: none;
                max-width: 400px;
                word-wrap: break-word;
            `;
            document.body.appendChild(errorElement);
        }

        errorElement.textContent = message;
        errorElement.style.display = 'block';

        // Auto-hide after duration
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, duration);
    }
}

// Tab management for switching between logs and queries
class TabManager {
    constructor() {
        this.activeTab = 'logs';
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            // Remove any existing event listeners first
            button.replaceWith(button.cloneNode(true));
        });
        
        // Re-query the buttons after replacing them
        const newTabButtons = document.querySelectorAll('.tab-button');
        newTabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.setActiveTab(button.dataset.tab);
            });
        });
        
        // Don't set initial active tab here - it's now handled in the main initialization
        // to avoid duplicate calls to setActiveTab
    }
    
    setActiveTab(tabId) {
        // Update active tab
        this.activeTab = tabId;
        
        // Update tab buttons
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            if (button.dataset.tab === tabId) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        // Update tab content
        const tabContents = document.querySelectorAll('[data-tab-content]');
        tabContents.forEach(content => {
            if (content.dataset.tabContent === tabId) {
                content.style.display = '';
            } else {
                content.style.display = 'none';
            }
        });
        
        // Show/hide the appropriate pagination
        if (tabId === 'logs') {
            // Show logs pagination, hide query pagination
            const logsPagination = document.getElementById('pagination');
            const queryPagination = document.getElementById('query-pagination');
            if (logsPagination) logsPagination.style.display = 'flex';
            if (queryPagination) queryPagination.style.display = 'none';
        } else if (tabId === 'queries') {
            // Show query pagination, hide logs pagination
            const logsPagination = document.getElementById('pagination');
            const queryPagination = document.getElementById('query-pagination');
            if (logsPagination) logsPagination.style.display = 'none';
            if (queryPagination) queryPagination.style.display = 'flex';
        }
        
        // Don't trigger content loading when switching tabs
        // Only initialize if data hasn't been loaded yet
        if (tabId === 'logs' && window.logObserver && window.logObserver.logs.length === 0) {
            window.logObserver.loadLogs();
        } else if (tabId === 'queries' && window.queryHistoryObserver && window.queryHistoryObserver.queries.length === 0) {
            window.queryHistoryObserver.loadQueries();
        }
    }
}

class LogObserver {
    constructor() {
        this.logs = [];
        this.filteredLogs = [];
        this.currentPage = 1;
        this.pageSize = 50;
        this.totalRecords = 0;
        this.stats = {total: 0, error: 0, warning: 0, info: 0, debug: 0};
        this.searchQuery = '';
        this.queryIdSearch = ''; // Store query ID search value
        this.selectedLevel = 'all';
        this.timeRange = '5m'; // Default to 5 minutes
        this.autoRefreshInterval = null;
        this.autoRefreshSeconds = 'off';
        this.isLoading = false;
        this.connectionStatus = { connected: false, error: null };
        
        this.initialize();
    }

    initialize() {
        this.checkConnectionStatus();
        this.setupEventListeners();
        this.updateLogsCount(); // Initialize with clean state
        this.loadLogs();
    }
    
    // Initialize application settings
    initializeRefreshDropdown() {
        // This function is kept for compatibility but simplified
        // as we no longer need refresh dropdown functionality
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                const value = e.target.value.trim();
                this.searchQuery = value;
                
                // Check if the input is a query ID format (UUID format or numeric ID)
                if (this.isQueryIdFormat(value)) {
                    this.queryIdSearch = value;
                    this.searchQuery = ''; // If it's a query ID, clear regular search
                } else {
                    this.queryIdSearch = ''; // If not a query ID, clear query ID search
                }
                this.currentPage = 1; // Reset to first page
                this.loadLogs();
            }, 300));
        }

        // Level filters
        const levelFilters = document.querySelectorAll('.level-filter');
        levelFilters.forEach(filter => {
            filter.addEventListener('click', (e) => {
                this.setActiveFilter(e.target);
                this.selectedLevel = e.target.dataset.level;
                this.currentPage = 1; // Reset to first page
                this.loadLogs();
            });
        });

        // Time range selector
        const timeRangeSelect = document.getElementById('time-range');
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', (e) => {
                this.timeRange = e.target.value;
                this.loadLogs();
            });
        }

        // Auto refresh selector
        const autoRefreshSelect = document.getElementById('auto-refresh');
        if (autoRefreshSelect) {
            autoRefreshSelect.addEventListener('change', (e) => {
                this.setAutoRefresh(e.target.value);
            });
        }
        // View toggles removed

        // Modal close
        const modalClose = document.getElementById('modal-close');
        const modalOverlay = document.getElementById('modal-overlay');
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeModal());
        }
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.closeModal();
                }
            });
        }

        // Pagination
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousPage());
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextPage());
        }

        // Page size selector
        const pageSizeSelect = document.getElementById('page-size');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.pageSize = parseInt(e.target.value);
                this.currentPage = 1; // Reset to first page
                this.loadLogs();
            });
        }

        // Connection status
        const connectionStatusElement = document.getElementById('connection-status');
        if (connectionStatusElement) {
            connectionStatusElement.addEventListener('click', () => this.openConfigModal());
        }

        // Config modal
        UIHandler.bindModal('config-modal-overlay', {
            openButtonId: 'config-btn',
            closeButtonIds: ['config-modal-close', 'config-cancel'],
            closeOnBackdrop: true,
            closeOnEscape: true,
            onOpen: () => this.updateCurrentConnectionDisplay(),
            onClose: () => this.closeConfigModal()
        });

        // Config connect button
        UIHandler.bindButton('config-connect', () => this.connectDatabase(), {
            showLoading: true,
            loadingText: 'Connecting...'
        });

        // DSN input real-time parser
        const dsnInput = document.getElementById('dsn-input');
        if (dsnInput) {
            dsnInput.addEventListener('input', this.debounce((e) => {
                this.updateDsnPreview(e.target.value);
            }, 200));
        }
    }

    updateDsnPreview(dsn) {
        const previewDiv = document.getElementById('parsed-dsn-preview');
        if (!dsn.trim()) {
            previewDiv.style.display = 'none';
            return;
        }

        const parsed = this.parseDsn(dsn);
        
        // Filter out empty values and the user property
        const detailsToShow = Object.entries(parsed).filter(([key, value]) => value && key !== 'user' && key !== 'port');

        if (detailsToShow.length > 0) {
            previewDiv.style.display = 'grid';
            previewDiv.innerHTML = ''; // Clear previous content

            detailsToShow.forEach(([key, value]) => {
                const labelEl = document.createElement('div');
                labelEl.className = 'preview-info-label';
                labelEl.textContent = `${key.charAt(0).toUpperCase() + key.slice(1)}:`;

                const valueEl = document.createElement('div');
                valueEl.className = 'preview-info-value';
                valueEl.textContent = value;

                previewDiv.appendChild(labelEl);
                previewDiv.appendChild(valueEl);
            });
        } else {
            previewDiv.style.display = 'none';
        }
    }

    // Detect if it's a query ID format (UUID or numeric ID)
    isQueryIdFormat(value) {
        if (!value) return false;
        
        // Check if it's UUID format (8-4-4-4-12 hexadecimal characters)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        // Check if it's a numeric ID
        const numericIdRegex = /^[0-9]{6,}$/; // At least 6 digits
        
        return uuidRegex.test(value) || numericIdRegex.test(value);
    }
    
    async loadLogs() {
        if (this.isLoading) return;
        
        // Check if database is connected
        if (!this.connectionStatus.connected) {
            this.showConnectionMessage();
            return;
        }
        
        // Clear current logs content before showing loading
        this.logs = [];
        this.renderLogs(); // This will clear the display
        
        this.isLoading = true;
        UIHandler.showLoading(true, {
            loadingOverlayId: 'loading-state',
            buttonId: 'refresh-btn',
            originalButtonText: 'Refresh'
        });

        try {
            const filters = {
                page: this.currentPage,
                pageSize: this.pageSize,
                timeRange: this.timeRange,
                level: this.selectedLevel !== 'all' ? this.selectedLevel : null
            };
            
            // If it's a query ID format, prioritize queryId search
            if (this.queryIdSearch) {
                filters.queryId = this.queryIdSearch;
                // When using query ID search, don't use regular search
            } else if (this.searchQuery.trim()) {
                // Only use regular search when it's not a query ID search
                filters.search = this.searchQuery.trim();
            }

            const response = await fetch('/api/logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(filters)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (data.logs) {
                this.logs = data.logs;
                this.totalRecords = data.total || 0;
                this.stats = data.stats || {total: 0, error: 0, warning: 0, info: 0, debug: 0};
                this.renderLogs();
                this.updateStats();
                this.updatePagination();
                
                // Generate time distribution chart if data is available
                if (data.timeDistribution) {
                    this.generateTimeChart(data.timeDistribution);
                }
            } else {
                console.error('No logs data received');
            }
        } catch (error) {
            console.error('Error loading logs:', error);
            this.showError('Failed to load logs: ' + error.message);
            this.logs = [];
            this.filteredLogs = [];
            this.totalRecords = 0;
        } finally {
            this.isLoading = false;
            UIHandler.showLoading(false, {
                loadingOverlayId: 'loading-state',
                buttonId: 'refresh-btn',
                originalButtonText: 'Refresh'
            });
        }
    }

    filterLogs() {
        // Server-side filtering is now handled, just render the logs
        this.renderLogs();
    }

    renderLogs() {
        const logsList = document.getElementById('logs-list');
        const emptyState = document.getElementById('empty-state');
        
        if (!logsList) return;

        // Clear existing content
        logsList.innerHTML = '';

        if (this.logs.length === 0) {
            // Simply keep logs list visible but empty for cleaner UI
            logsList.style.display = 'block';
            if (emptyState) {
                emptyState.style.display = 'none';
            }
            return;
        }

        logsList.style.display = 'block';
        if (emptyState) {
            emptyState.style.display = 'none';
        }

        // Reset logs list class
        logsList.className = 'logs-list';

        // Render log entries (server-side pagination, render all data)
        const startIndex = (this.currentPage - 1) * this.pageSize;
        this.logs.forEach((log, index) => {
            const logEntry = this.createLogEntry(log, startIndex + index);
            logsList.appendChild(logEntry);
        });

        // Update logs count
        this.updateLogsCount();
    }

    createLogEntry(log, index) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.dataset.logIndex = index;

        // Level badge
        const levelBadge = document.createElement('div');
        levelBadge.className = `log-level-badge ${log.log_level ? log.log_level.toLowerCase() : 'info'}`;
        levelBadge.textContent = log.log_level || 'INFO';

        // Timestamp
        const timestamp = document.createElement('div');
        timestamp.className = 'log-timestamp';
        timestamp.textContent = this.formatTimestamp(log.timestamp);

        // Query ID with copy icon
        const queryId = document.createElement('div');
        queryId.className = 'log-query-id';
        
        const queryIdText = log.query_id || '-';
        if (queryIdText !== '-') {
            // Create query ID text and copy icon
            queryId.textContent = queryIdText;
            
            // Add copy icon
            const copyIcon = document.createElement('svg');
            copyIcon.className = 'copy-icon';
            copyIcon.setAttribute('width', '14');
            copyIcon.setAttribute('height', '14');
            copyIcon.setAttribute('viewBox', '0 0 24 24');
            copyIcon.setAttribute('fill', 'none');
            copyIcon.setAttribute('stroke', 'currentColor');
            copyIcon.setAttribute('stroke-width', '2');
            copyIcon.innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>';
            
            // Add copy success notification
            const copySuccess = document.createElement('span');
            copySuccess.className = 'copy-success';
            copySuccess.textContent = 'Copied!';
            
            // Add click event for copy
            copyIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                this.copyToClipboard(queryIdText, copySuccess);
            });
            
            // Add click event for query ID text to filter by this query ID
            const queryIdSpan = document.createElement('span');
            queryIdSpan.textContent = queryIdText;
            queryIdSpan.className = 'query-id-clickable';
            queryIdSpan.style.cursor = 'pointer';
            queryIdSpan.title = 'Click to filter logs by this Query ID';
            queryIdSpan.addEventListener('click', (e) => {
                e.stopPropagation();
                this.filterByQueryId(queryIdText);
            });
            
            queryId.innerHTML = '';
            queryId.appendChild(queryIdSpan);
            queryId.appendChild(copyIcon);
            queryId.appendChild(copySuccess);
        } else {
            queryId.textContent = '-';
        }

        // Content
        const content = document.createElement('div');
        content.className = 'log-content';

        // Message with truncation
        const message = document.createElement('div');
        message.className = 'log-message';
        const fullMessage = log.fields_message || log.message || 'No message';
        
        // Truncate message for preview
        const truncatedMessage = fullMessage.length > 150 ? fullMessage.substring(0, 150) + '...' : fullMessage;
        
        // Apply search highlighting to truncated message
        const highlightedTruncated = this.highlightSearchTerms(truncatedMessage);
        
        message.innerHTML = `
            <div class="message-preview">${highlightedTruncated}</div>
        `;

        // Expand/Collapse icon button (only if message is long)
        let expandBtn = null;
        if (fullMessage.length > 150) {
            expandBtn = document.createElement('button');
            expandBtn.className = 'expand-icon-btn';
            expandBtn.innerHTML = `
                <svg class="expand-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6,9 12,15 18,9"></polyline>
                </svg>
            `;
            expandBtn.onclick = (e) => {
                e.stopPropagation();
                this.toggleLogExpansion(entry, expandBtn);
            };
            message.appendChild(expandBtn);
        }

        // Meta information (initially hidden)
        const meta = document.createElement('div');
        meta.className = 'log-meta';
        meta.style.display = 'none';

        // Build meta items array and set innerHTML once
        const metaItems = [];
        if (log.target) metaItems.push(`<div class="log-meta-item"><span>Target:</span> <span>${this.escapeHtml(log.target)}</span></div>`);
        if (log.path) metaItems.push(`<div class="log-meta-item"><span>Path:</span> <span>${this.escapeHtml(log.path)}</span></div>`);
        if (log.cluster_id) metaItems.push(`<div class="log-meta-item"><span>Cluster:</span> <span>${this.escapeHtml(log.cluster_id)}</span></div>`);
        meta.innerHTML = metaItems.join('');

        content.appendChild(message);

        // Create expanded content container (full width, initially hidden)
        const expandedContent = document.createElement('div');
        expandedContent.className = 'log-expanded-content';
        expandedContent.style.display = 'none';
        
        if (fullMessage.length > 150) {
            // Add message content without line numbers
            const expandedMessage = document.createElement('div');
            expandedMessage.className = 'message-full-content';
            
            // Create line elements with copy icon for each line
            const lines = fullMessage.split('\n');
            expandedMessage.innerHTML = lines.map(line => {
                const escapedLine = this.escapeHtml(line);
                const highlightedLine = this.highlightSearchTerms(escapedLine);
                return `<div class="message-line"><span class="line-content">${highlightedLine}<svg class="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span class="copy-success">Copied!</span></span></div>`;
            }).join('');
            
            expandedContent.appendChild(expandedMessage);
            
            // Add event listeners for copy icons in each line
            setTimeout(() => {
                const copyIcons = expandedMessage.querySelectorAll('.copy-icon');
                copyIcons.forEach((icon, i) => {
                    icon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const lineContent = lines[i];
                        const successElement = icon.nextElementSibling; // Copy success notification element
                        this.copyToClipboard(lineContent, successElement);
                    });
                });
            }, 0);
            
            // Add expanded meta information to expanded content
            const expandedMeta = meta.cloneNode(true);
            expandedMeta.className = 'log-expanded-meta';
            expandedMeta.style.display = 'block';
            expandedContent.appendChild(expandedMeta);
        }

        // Add elements to entry in the correct order
        entry.appendChild(levelBadge);
        entry.appendChild(timestamp);
        entry.appendChild(queryId);
        entry.appendChild(content);
        entry.appendChild(expandedContent);

        // Add click handler to entire entry for expand/collapse (only if message is long)
        if (fullMessage.length > 150) {
            entry.style.cursor = 'pointer';
            entry.onclick = (e) => {
                // Don't trigger if clicking on the expand button (it has its own handler)
                // Don't trigger if entry is already expanded and clicking on expanded content
                const isExpanded = entry.classList.contains('expanded');
                const clickingExpandedContent = e.target.closest('.log-expanded-content');
                
                if (!e.target.closest('.expand-icon-btn') && !(isExpanded && clickingExpandedContent)) {
                    this.toggleLogExpansion(entry, expandBtn);
                }
            };
        }

        return entry;
    }

    toggleLogExpansion(entry, expandBtn) {
        const messagePreview = entry.querySelector('.message-preview');
        const expandedContent = entry.querySelector('.log-expanded-content');
        
        const isExpanded = expandedContent.style.display !== 'none';
        
        if (isExpanded) {
            // Collapse
            messagePreview.style.display = 'block';
            expandedContent.style.display = 'none';
            entry.classList.remove('expanded');
            expandBtn.querySelector('.expand-icon').style.transform = 'rotate(0deg)';
        } else {
            // Expand
            messagePreview.style.display = 'none';
            expandedContent.style.display = 'block';
            entry.classList.add('expanded');
            expandBtn.querySelector('.expand-icon').style.transform = 'rotate(180deg)';
        }
    }

    showLogDetail(log) {
        const modal = document.getElementById('modal-overlay');
        const modalContent = document.getElementById('modal-content');
        
        if (!modal || !modalContent) return;

        // Create detail content
        modalContent.innerHTML = this.createLogDetailContent(log);
        
        // Show modal
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    createLogDetailContent(log) {
        const fields = [
            { label: 'Timestamp', value: this.formatTimestamp(log.timestamp, true) },
            { label: 'Level', value: log.log_level || 'INFO' },
            { label: 'Target', value: log.target || 'N/A' },
            { label: 'Message', value: log.fields_message || log.message || 'No message' },
            { label: 'Query ID', value: log.query_id || 'N/A' },
            { label: 'Session ID', value: log.session_id || 'N/A' },
            { label: 'User', value: log.user || 'N/A' },
            { label: 'Database', value: log.database || 'N/A' }
        ];

        let content = '<div class="log-detail-fields">';
        
        fields.forEach(field => {
            if (field.value && field.value !== 'N/A') {
                if (field.label === 'Message') {
                    content += `
                        <div class="log-detail-field">
                            <div class="log-detail-label">${field.label}:</div>
                            <textarea class="log-detail-message-textarea" readonly>${this.escapeHtml(field.value)}</textarea>
                        </div>
                    `;
                } else {
                    content += `
                        <div class="log-detail-field">
                            <div class="log-detail-label">${field.label}:</div>
                            <div class="log-detail-value">${this.escapeHtml(field.value)}</div>
                        </div>
                    `;
                }
            }
        });

        content += '</div>';

        // Add query section if available
        if (log.query_text) {
            content += `
                <div class="log-detail-section">
                    <h3>Query</h3>
                    <pre class="log-detail-code">${this.escapeHtml(log.query_text)}</pre>
                </div>
            `;
        }

        // Add profile data if available
        if (log.profile_data) {
            try {
                const profileData = typeof log.profile_data === 'string' 
                    ? JSON.parse(log.profile_data) 
                    : log.profile_data;
                
                content += `
                    <div class="log-detail-section">
                        <h3>Profile Data</h3>
                        <pre class="log-detail-code">${JSON.stringify(profileData, null, 2)}</pre>
                    </div>
                `;
            } catch (e) {
                content += `
                    <div class="log-detail-section">
                        <h3>Profile Data</h3>
                        <pre class="log-detail-code">${this.escapeHtml(log.profile_data)}</pre>
                    </div>
                `;
            }
        }

        return content;
    }

    closeModal() {
        const modal = document.getElementById('modal-overlay');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    updateStats() {
        // Use server-provided statistics
        Object.keys(this.stats).forEach(key => {
            const element = document.getElementById(`${key}-count`);
            if (element) {
                element.textContent = this.formatNumber(this.stats[key]);
            }
        });
    }

    updateLogsCount() {
        const logsCount = document.getElementById('logs-count');
        if (logsCount) {
            const total = this.totalRecords || 0;
            const start = total > 0 ? (this.currentPage - 1) * this.pageSize + 1 : 0;
            const end = Math.min(start + this.logs.length - 1, total);
            
            if (total === 0) {
                logsCount.textContent = 'No logs found';
            } else {
                logsCount.textContent = `Showing ${start}-${end} of ${this.formatNumber(total)} logs`;
            }
        }
    }

    updatePagination() {
        const totalPages = Math.ceil(this.totalRecords / this.pageSize);
        const logsPagination = document.getElementById('pagination');
        
        // Update pagination info
        const paginationText = document.getElementById('pagination-text');
        if (paginationText) {
            const start = (this.currentPage - 1) * this.pageSize + 1;
            const end = Math.min(start + this.pageSize - 1, this.totalRecords);
            paginationText.textContent = `Showing ${start}-${end} of ${this.formatNumber(this.totalRecords)} logs`;
        }

        // Update pagination buttons
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= totalPages;
        }
        
        // Only show pagination if we have records and on the logs tab
        if (logsPagination) {
            const tabManager = window.tabManager;
            const isLogsTabActive = tabManager && tabManager.activeTab === 'logs';
            const shouldShowPagination = this.totalRecords > 0 && isLogsTabActive;
            logsPagination.style.display = shouldShowPagination ? 'flex' : 'none';
        }

        // Update page numbers
        this.renderPageNumbers(totalPages);
    }

    renderPageNumbers(totalPages) {
        const pageNumbers = document.getElementById('page-numbers');
        if (!pageNumbers) return;

        pageNumbers.innerHTML = '';

        if (totalPages <= 1) return;

        const maxVisible = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-number ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => this.goToPage(i));
            pageNumbers.appendChild(pageBtn);
        }
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadLogs(); // Reload data from server
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.totalRecords / this.pageSize);
        if (this.currentPage < totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    }

    // Removed auto-refresh related functions as they are no longer needed

    showError(message) {
        console.error('LogObserver Error:', message);
        // You could implement a toast notification system here
        alert('Error: ' + message);
    }

    setActiveFilter(activeElement) {
        const filters = document.querySelectorAll('.level-filter');
        filters.forEach(filter => filter.classList.remove('active'));
        activeElement.classList.add('active');
    }

    // View toggle function removed

    formatTimestamp(timestamp, detailed = false) {
        if (!timestamp) return 'N/A';
        
        const date = new Date(timestamp);
        
        if (detailed) {
            // Format as YYYY-MM-DD HH:mm:ss.SSS
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
            
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
        } else {
            // Short format for chart labels: HH:mm:ss
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            
            return `${hours}:${minutes}:${seconds}`;
        }
    }

    formatNumber(num) {
        return new Intl.NumberFormat().format(num);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Copy content to clipboard
    copyToClipboard(text, successElement) {
        navigator.clipboard.writeText(text).then(() => {
            // Show copy success notification
            successElement.classList.add('show');
            
            // Remove notification after a delay
            setTimeout(() => {
                successElement.classList.remove('show');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }

    filterByQueryId(queryId) {
        // Set the search input to the query ID
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = queryId;
            this.searchQuery = '';
            this.queryIdSearch = queryId;
            this.currentPage = 1; // Reset to first page
            this.loadLogs();
        }
    }

    setAutoRefresh(seconds) {
        // Clear existing interval
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }

        this.autoRefreshSeconds = seconds;

        if (seconds !== 'off') {
            const intervalMs = parseInt(seconds) * 1000;
            this.autoRefreshInterval = setInterval(() => {
                if (!this.isLoading && this.connectionStatus.connected) {
                    this.loadLogs();
                }
            }, intervalMs);
        }
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

    initPageSizeSelector() {
        const pageSizeSelect = document.getElementById('page-size');
        if (pageSizeSelect) {
            pageSizeSelect.value = this.pageSize;
        }
    }

    async checkConnectionStatus() {
        try {
            const response = await fetch('/api/connection/status');
            this.connectionStatus = await response.json();
            this.updateConnectionUI();
            
            if (this.connectionStatus.connected) {
                this.loadLogs();
            }
        } catch (error) {
            console.error('Failed to check connection status:', error);
            this.connectionStatus = { connected: false, error: 'Failed to check connection' };
            this.updateConnectionUI();
        }
    }

    updateConnectionUI() {
        const statusDot = document.getElementById('connection-status-dot');
        const statusText = document.getElementById('connection-status-text');
        const connectionMessage = document.getElementById('connection-message');
        
        if (this.connectionStatus.connected) {
            statusDot.className = 'status-dot';
            statusText.textContent = 'Connected';
            
            // Hide connection message when connected
            if (connectionMessage) {
                connectionMessage.style.display = 'none';
            }
        } else {
            statusDot.className = 'status-dot status-disconnected';
            statusText.textContent = 'Disconnected';
            
            // Show error if available
            if (this.connectionStatus.error) {
                statusText.title = this.connectionStatus.error;
            }
            
            // Show connection message when disconnected
            if (connectionMessage) {
                connectionMessage.style.display = 'block';
            }
        }
    }

    openConfigModal() {
        const configModal = document.getElementById('config-modal-overlay');
        configModal.style.display = 'flex';
        const dsnInput = document.getElementById('dsn-input');
        dsnInput.focus();
        const connectionFeedback = document.getElementById('connection-feedback');
        connectionFeedback.style.display = 'none';
        
        // Show current connection info
        this.updateCurrentConnectionDisplay();
    }

    updateCurrentConnectionDisplay() {
        const currentConnectionDiv = document.getElementById('current-connection');
        const connectionInfoGrid = document.getElementById('connection-info-grid');

        if (this.connectionStatus.connected && this.connectionStatus.dsn) {
            currentConnectionDiv.style.display = 'block';
            
            // Clear previous entries
            connectionInfoGrid.innerHTML = '';

            // Parse the DSN
            const parsedDsn = this.parseDsn(this.connectionStatus.dsn);

            // Create and append new grid items
            for (const [key, value] of Object.entries(parsedDsn)) {
                if (value) { // Only display if value exists
                    const labelEl = document.createElement('div');
                    labelEl.className = 'connection-info-label';
                    labelEl.textContent = `${key.charAt(0).toUpperCase() + key.slice(1)}:`;

                    const valueEl = document.createElement('div');
                    valueEl.className = 'connection-info-value';
                    valueEl.textContent = value;

                    connectionInfoGrid.appendChild(labelEl);
                    connectionInfoGrid.appendChild(valueEl);
                }
            }
        } else {
            currentConnectionDiv.style.display = 'none';
            connectionInfoGrid.innerHTML = '';
        }
    }

    parseDsn(dsn) {
        const result = {
            user: '',
            host: '',
            port: '',
            database: '',
            warehouse: ''
        };

        try {
            const url = new URL(dsn.replace('databend://', 'http://'));
            
            result.user = url.username || '';
            result.host = url.hostname || '';
            result.port = url.port || '';
            result.database = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
            result.warehouse = url.searchParams.get('warehouse') || '';

        } catch (e) {
            console.error("Could not parse DSN:", e);
            // Fallback for simple regex if URL parsing fails, though less robust
            const match = dsn.match(/databend:\/\/([^:]+):[^@]+@([^:]+):(\d+)\/([^?]+)\?warehouse=(.*)/);
            if (match) {
                result.user = match[1];
                result.host = match[2];
                result.port = match[3];
                result.database = match[4];
                result.warehouse = match[5];
            }
        }
        
        return result;
    }

    closeConfigModal() {
        const configModal = document.getElementById('config-modal-overlay');
        configModal.style.display = 'none';
        const dsnInput = document.getElementById('dsn-input');
        dsnInput.value = '';
        const connectionFeedback = document.getElementById('connection-feedback');
        connectionFeedback.style.display = 'none';
    }

    async connectDatabase() {
        const dsnInput = document.getElementById('dsn-input');
        const dsn = dsnInput.value.trim();
        if (!dsn) {
            const connectionFeedback = document.getElementById('connection-feedback');
            connectionFeedback.textContent = 'Please enter a DSN connection string';
            connectionFeedback.className = 'connection-status error';
            connectionFeedback.style.display = 'block';
            return;
        }

        const connectBtn = document.getElementById('config-connect');
        const originalText = connectBtn.textContent;
        connectBtn.textContent = 'Connecting...';
        connectBtn.disabled = true;

        // Update status to connecting
        const statusDot = document.getElementById('connection-status-dot');
        const statusText = document.getElementById('connection-status-text');
        statusDot.className = 'status-dot status-connecting';
        statusText.textContent = 'Connecting...';

        try {
            const response = await fetch('/api/connection/configure', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dsn })
            });

            const result = await response.json();
            
            if (result.success) {
                this.connectionStatus = result.status;
                this.updateConnectionUI();
                const connectionFeedback = document.getElementById('connection-feedback');
                connectionFeedback.textContent = 'Connected successfully!';
                connectionFeedback.className = 'connection-status success';
                connectionFeedback.style.display = 'block';
                setTimeout(() => {
                    this.closeConfigModal();
                    this.loadLogs();
                }, 1500);
            } else {
                this.connectionStatus = result.status || { connected: false, error: result.error };
                this.updateConnectionUI();
                const connectionFeedback = document.getElementById('connection-feedback');
                connectionFeedback.textContent = result.error || 'Connection failed';
                connectionFeedback.className = 'connection-status error';
                connectionFeedback.style.display = 'block';
            }
        } catch (error) {
            console.error('Connection error:', error);
            this.connectionStatus = { connected: false, error: error.message };
            this.updateConnectionUI();
            const connectionFeedback = document.getElementById('connection-feedback');
            connectionFeedback.textContent = 'Connection failed: ' + error.message;
            connectionFeedback.className = 'connection-status error';
            connectionFeedback.style.display = 'block';
        } finally {
            connectBtn.textContent = originalText;
            connectBtn.disabled = false;
        }
    }

    showConnectionMessage() {
        const connectionMessage = document.getElementById('connection-message');
        if (connectionMessage) {
            connectionMessage.style.display = 'block';
        }
    }

    // Removed refresh dropdown related functions as they are no longer needed

    // Removed setAutoRefreshInterval function as it is no longer needed
    
    // Removed getIntervalText function as it is no longer needed

    // Search highlighting function
    highlightSearchTerms(text) {
        if (!this.searchQuery || this.searchQuery.trim() === '') {
            return text;
        }
        
        const searchTerm = this.searchQuery.trim();
        if (searchTerm.length === 0) {
            return text;
        }
        
        // Create a case-insensitive regex to find all occurrences
        const regex = new RegExp(`(${this.escapeRegex(searchTerm)})`, 'gi');
        
        // Replace matches with highlighted version
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    }
    
    // Helper function to escape special regex characters
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Generate time distribution chart
    generateTimeChart(timeDistribution) {
        const chartContainer = document.getElementById('logs-time-chart');
        const chartTitle = document.getElementById('logs-chart-title');
        
        if (!chartContainer || !chartTitle) return;
        
        // Update title
        chartTitle.textContent = `${this.totalRecords} Results`;
        
        // Clear existing chart
        chartContainer.innerHTML = '';
        
        // Debug logging
        console.log('Log time distribution data:', timeDistribution);
        
        if (!timeDistribution || timeDistribution.length === 0) {
            chartContainer.innerHTML = '<div style="text-align: center; color: var(--text-tertiary); padding: var(--space-4);">No data available</div>';
            return;
        }
        
        // Find max value for scaling
        const maxValue = Math.max(...timeDistribution.map(item => item.total || 0));
        
        // Create bars
        timeDistribution.forEach((item, index) => {
            const barContainer = document.createElement('div');
            barContainer.className = 'time-chart-bar-container';
            barContainer.style.flex = '1';
            barContainer.style.display = 'flex';
            barContainer.style.flexDirection = 'column';
            barContainer.style.justifyContent = 'flex-end';
            barContainer.style.height = '100%';
            barContainer.style.position = 'relative';
            
            const totalHeight = maxValue > 0 ? (item.total / maxValue) * 100 : 0;
            
            // Create stacked segments for each log level
            const levels = ['error', 'warning', 'info', 'debug'];
            const colors = {
                'error': 'var(--error)',
                'warning': 'var(--warning)',
                'info': 'var(--info)',
                'debug': 'var(--text-tertiary)'
            };
            
            let currentHeight = 0;
            levels.forEach(level => {
                const count = item[level] || 0;
                if (count > 0) {
                    const segment = document.createElement('div');
                    const segmentHeight = (count / item.total) * totalHeight;
                    
                    segment.style.height = `${segmentHeight}%`;
                    segment.style.backgroundColor = colors[level];
                    segment.style.borderRadius = currentHeight === 0 ? '2px 2px 0 0' : '0';
                    segment.style.minHeight = segmentHeight > 0 ? '1px' : '0';
                    
                    barContainer.appendChild(segment);
                    currentHeight += segmentHeight;
                }
            });
            
            // Add tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'time-chart-tooltip';
            const tooltipContent = [
                `${this.formatTimestamp(item.time_bucket, false)}`,
                `Total: ${item.total}`,
                item.error > 0 ? `Errors: ${item.error}` : null,
                item.warning > 0 ? `Warnings: ${item.warning}` : null,
                item.info > 0 ? `Info: ${item.info}` : null,
                item.debug > 0 ? `Debug: ${item.debug}` : null
            ].filter(Boolean).join('<br>');
            
            tooltip.innerHTML = tooltipContent;
            barContainer.appendChild(tooltip);
            
            chartContainer.appendChild(barContainer);
        });
        
        // Add time labels
        const labelsContainer = document.createElement('div');
        labelsContainer.className = 'time-chart-labels';
        
        if (timeDistribution.length > 0) {
            const firstTime = this.formatTimestamp(timeDistribution[0].time_bucket, false);
            const lastTime = this.formatTimestamp(timeDistribution[timeDistribution.length - 1].time_bucket, false);
            
            labelsContainer.innerHTML = `
                <span>${firstTime}</span>
                <span>${lastTime}</span>
            `;
        }
        
        chartContainer.parentNode.appendChild(labelsContainer);
    }
}

// Query History Observer class - Using same controls and styles as LogObserver
class QueryHistoryObserver {
    constructor() {
        this.queries = [];
        this.filteredQueries = [];
        this.currentPage = 1;
        this.pageSize = 50;
        this.totalRecords = 0;
        this.stats = {total: 0, success: 0, error: 0, avgDuration: 0};
        this.searchQuery = '';
        this.selectedLevel = 'all'; // Changed from selectedStatus to selectedLevel to match LogObserver
        this.timeRange = '5m'; // Default to 5 minutes
        this.autoRefreshInterval = null;
        this.autoRefreshSeconds = 'off';
        this.isLoading = false;
        this.connectionStatus = { connected: false, error: null };
        
        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
        this.updateQueriesCount(); // Initialize with clean state
        // Don't auto-load queries here, let tab switching handle it
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('query-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.searchQuery = e.target.value.trim();
                this.currentPage = 1; // Reset to first page
                this.loadQueries();
            }, 300));
        }

        // Level filters - Changed to use data-level instead of data-status
        const levelFilters = document.querySelectorAll('[data-tab-content="queries"] .level-filter');
        levelFilters.forEach(filter => {
            filter.addEventListener('click', (e) => {
                this.setActiveFilter(e.target);
                this.selectedLevel = e.target.dataset.level;
                this.currentPage = 1; // Reset to first page
                this.loadQueries();
            });
        });

        // Time range selector
        const timeRangeSelect = document.getElementById('query-time-range');
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', (e) => {
                this.timeRange = e.target.value;
                this.loadQueries();
            });
        }

        // Auto refresh selector
        const autoRefreshSelect = document.getElementById('query-auto-refresh');
        if (autoRefreshSelect) {
            autoRefreshSelect.addEventListener('change', (e) => {
                this.setAutoRefresh(e.target.value);
            });
        }

        // Pagination
        const prevBtn = document.getElementById('query-prev-btn');
        const nextBtn = document.getElementById('query-next-btn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousPage());
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextPage());
        }

        // Page size selector
        const pageSizeSelect = document.getElementById('query-page-size');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.pageSize = parseInt(e.target.value);
                this.currentPage = 1; // Reset to first page
                this.loadQueries();
            });
        }
    }

    setActiveFilter(activeElement) {
        const filters = document.querySelectorAll('[data-tab-content="queries"] .level-filter');
        filters.forEach(filter => filter.classList.remove('active'));
        activeElement.classList.add('active');
    }

    async loadQueries() {
        if (this.isLoading) return;
        
        // Check if database is connected
        if (!window.logObserver.connectionStatus.connected) {
            this.showConnectionMessage();
            return;
        }
        
        // Clear current queries content before showing loading
        this.queries = [];
        this.renderQueries(); // This will clear the display
        
        this.isLoading = true;
        UIHandler.showLoading(true, {
            loadingOverlayId: 'query-loading-state',
            buttonId: 'query-refresh-btn',
            originalButtonText: 'Refresh'
        });

        try {
            const filters = {
                page: this.currentPage,
                pageSize: this.pageSize,
                timeRange: this.timeRange
            };
            
            if (this.selectedLevel !== 'all') {
                filters.status = this.selectedLevel; // Map level to status for backend
            }
            
            if (this.searchQuery.trim()) {
                filters.search = this.searchQuery.trim();
            }

            const response = await fetch('/api/queries', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(filters)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (data.queries) {
                this.queries = data.queries;
                this.totalRecords = data.total || 0;
                this.stats = data.stats || {total: 0, success: 0, error: 0, avgDuration: 0};
                this.renderQueries();
                this.updateStats();
                this.updatePagination();
                
                // Generate time distribution chart if data is available
                if (data.timeDistribution) {
                    this.generateTimeChart(data.timeDistribution);
                }
            } else {
                console.error('No query data received');
            }
        } catch (error) {
            console.error('Error loading queries:', error);
            this.showError('Failed to load queries: ' + error.message);
            this.queries = [];
            this.filteredQueries = [];
            this.totalRecords = 0;
        } finally {
            this.isLoading = false;
            UIHandler.showLoading(false, {
                loadingOverlayId: 'query-loading-state',
                buttonId: 'query-refresh-btn',
                originalButtonText: 'Refresh'
            });
        }
    }

    renderQueries() {
        const queriesList = document.getElementById('queries-list');
        const emptyState = document.getElementById('query-empty-state');
        
        if (!queriesList) return;

        // Clear existing content
        queriesList.innerHTML = '';

        if (this.queries.length === 0) {
            // Simply keep queries list visible but empty for cleaner UI
            queriesList.style.display = 'block';
            if (emptyState) {
                emptyState.style.display = 'none';
            }
            return;
        }

        queriesList.style.display = 'block';
        if (emptyState) {
            emptyState.style.display = 'none';
        }

        // Reset queries list class
        queriesList.className = 'logs-list';

        // Render query entries (server-side pagination, render all data)
        const startIndex = (this.currentPage - 1) * this.pageSize;
        this.queries.forEach((query, index) => {
            const queryEntry = this.createQueryEntry(query, startIndex + index);
            queriesList.appendChild(queryEntry);
        });

        // Update queries count
        this.updateQueriesCount();
    }

    createQueryEntry(query, index) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.dataset.queryIndex = index;

        // Status badge (success/error instead of log level)
        const statusBadge = document.createElement('div');
        const status = query.exception_code ? 'error' : 'success';
        statusBadge.className = `log-level-badge ${status}`;
        statusBadge.textContent = status.toUpperCase();

        // Start Time (显示查询开始时间)
        const timestamp = document.createElement('div');
        timestamp.className = 'log-timestamp';
        timestamp.textContent = this.formatTimestamp(query.query_start_time || query.start_time || query.event_time);
        timestamp.title = 'Query Start Time'; // 添加提示文本

        // Query ID with copy icon
        const queryId = document.createElement('div');
        queryId.className = 'log-query-id';
        
        const queryIdText = query.query_id || '-';
        if (queryIdText !== '-') {
            // Create query ID text and copy icon
            queryId.textContent = queryIdText;
            
            // Add copy icon
            const copyIcon = document.createElement('svg');
            copyIcon.className = 'copy-icon';
            copyIcon.setAttribute('width', '14');
            copyIcon.setAttribute('height', '14');
            copyIcon.setAttribute('viewBox', '0 0 24 24');
            copyIcon.setAttribute('fill', 'none');
            copyIcon.setAttribute('stroke', 'currentColor');
            copyIcon.setAttribute('stroke-width', '2');
            copyIcon.innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>';
            
            // Add copy success notification
            const copySuccess = document.createElement('span');
            copySuccess.className = 'copy-success';
            copySuccess.textContent = 'Copied!';
            
            // Add click event for copy
            copyIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                this.copyToClipboard(queryIdText, copySuccess);
            });
            
            // Add click event for query ID text to jump to log history
            const queryIdSpan = document.createElement('span');
            queryIdSpan.textContent = queryIdText;
            queryIdSpan.className = 'query-id-clickable';
            queryIdSpan.style.cursor = 'pointer';
            queryIdSpan.title = 'Click to view logs for this Query ID';
            queryIdSpan.addEventListener('click', (e) => {
                e.stopPropagation();
                this.jumpToLogHistory(queryIdText);
            });
            
            queryId.innerHTML = '';
            queryId.appendChild(queryIdSpan);
            queryId.appendChild(copyIcon);
            queryId.appendChild(copySuccess);
        } else {
            queryId.textContent = '-';
        }

        // Content
        const content = document.createElement('div');
        content.className = 'log-content';

        // SQL Query with truncation
        const message = document.createElement('div');
        message.className = 'log-message';
        const fullQuery = query.query_text || 'No query text';
        
        // Truncate query for preview
        const truncatedQuery = fullQuery.length > 150 ? fullQuery.substring(0, 150) + '...' : fullQuery;
        
        // Apply search highlighting to truncated query
        const highlightedTruncated = this.highlightSearchTerms(this.escapeHtml(truncatedQuery));
        
        message.innerHTML = `
            <div class="message-preview">${highlightedTruncated}</div>
        `;

        // Expand/Collapse icon button (only if query is long)
        let expandBtn = null;
        if (fullQuery.length > 150) {
            expandBtn = document.createElement('button');
            expandBtn.className = 'expand-icon-btn';
            expandBtn.innerHTML = `
                <svg class="expand-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6,9 12,15 18,9"></polyline>
                </svg>
            `;
            expandBtn.onclick = (e) => {
                e.stopPropagation();
                this.toggleQueryExpansion(entry, expandBtn);
            };
            message.appendChild(expandBtn);
        }

        // Meta information (initially hidden)
        const meta = document.createElement('div');
        meta.className = 'log-meta';
        meta.style.display = 'none';

        // Build meta items array and set innerHTML once
        const metaItems = [];
        const startTime = query.query_start_time || query.start_time || query.event_time;
        if (startTime) metaItems.push(`<div class="log-meta-item"><span>Start Time:</span> <span>${this.formatTimestamp(startTime, true)}</span></div>`);
        if (query.sql_user) metaItems.push(`<div class="log-meta-item"><span>User:</span> <span>${this.escapeHtml(query.sql_user)}</span></div>`);
        if (query.current_database) metaItems.push(`<div class="log-meta-item"><span>Database:</span> <span>${this.escapeHtml(query.current_database)}</span></div>`);
        if (query.duration_ms) metaItems.push(`<div class="log-meta-item"><span>Duration:</span> <span>${query.duration_ms.toLocaleString()} ms</span></div>`);
        if (query.exception_text) metaItems.push(`<div class="log-meta-item"><span>Error:</span> <span>${this.escapeHtml(query.exception_text)}</span></div>`);
        meta.innerHTML = metaItems.join('');

        content.appendChild(message);

        // Create expanded content container (full width, initially hidden)
        const expandedContent = document.createElement('div');
        expandedContent.className = 'log-expanded-content';
        expandedContent.style.display = 'none';
        
        if (fullQuery.length > 150) {
            // Add query content without line numbers
            const expandedMessage = document.createElement('div');
            expandedMessage.className = 'message-full-content';
            
            // Create line elements with copy icon for each line
            const lines = fullQuery.split('\n');
            expandedMessage.innerHTML = lines.map(line => {
                const escapedLine = this.escapeHtml(line);
                const highlightedLine = this.highlightSearchTerms(escapedLine);
                return `<div class="message-line"><span class="line-content">${highlightedLine}<svg class="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span class="copy-success">Copied!</span></span></div>`;
            }).join('');
            
            expandedContent.appendChild(expandedMessage);
            
            // Add event listeners for copy icons in each line
            setTimeout(() => {
                const copyIcons = expandedMessage.querySelectorAll('.copy-icon');
                copyIcons.forEach((icon, i) => {
                    icon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const lineContent = lines[i];
                        const successElement = icon.nextElementSibling; // Copy success notification element
                        this.copyToClipboard(lineContent, successElement);
                    });
                });
            }, 0);
            
            // Add expanded meta information to expanded content
            const expandedMeta = meta.cloneNode(true);
            expandedMeta.className = 'log-expanded-meta';
            expandedMeta.style.display = 'block';
            expandedContent.appendChild(expandedMeta);
        }

        // Add elements to entry in the correct order
        entry.appendChild(statusBadge);
        entry.appendChild(timestamp);
        entry.appendChild(queryId);
        entry.appendChild(content);
        entry.appendChild(expandedContent);

        // Add click handler to entire entry for expand/collapse (only if query is long)
        if (fullQuery.length > 150) {
            entry.style.cursor = 'pointer';
            entry.onclick = (e) => {
                // Don't trigger if clicking on the expand button (it has its own handler)
                // Don't trigger if entry is already expanded and clicking on expanded content
                const isExpanded = entry.classList.contains('expanded');
                const clickingExpandedContent = e.target.closest('.log-expanded-content');
                
                if (!e.target.closest('.expand-icon-btn') && !(isExpanded && clickingExpandedContent)) {
                    this.toggleQueryExpansion(entry, expandBtn);
                }
            };
        }

        return entry;
    }

    toggleQueryExpansion(entry, expandBtn) {
        const messagePreview = entry.querySelector('.message-preview');
        const expandedContent = entry.querySelector('.log-expanded-content');
        
        const isExpanded = expandedContent.style.display !== 'none';
        
        if (isExpanded) {
            // Collapse
            messagePreview.style.display = 'block';
            expandedContent.style.display = 'none';
            entry.classList.remove('expanded');
            expandBtn.querySelector('.expand-icon').style.transform = 'rotate(0deg)';
        } else {
            // Expand
            messagePreview.style.display = 'none';
            expandedContent.style.display = 'block';
            entry.classList.add('expanded');
            expandBtn.querySelector('.expand-icon').style.transform = 'rotate(180deg)';
        }
    }

    showQueryDetails(query) {
        // Create modal for query details
        const modal = document.getElementById('modal-overlay');
        const modalContent = document.getElementById('modal-content');
        const modalTitle = document.getElementById('modal-title');
        
        if (!modal || !modalContent || !modalTitle) return;
        
        modalTitle.textContent = `Query Details: ${query.query_id}`;
        
        // Create content for modal
        modalContent.innerHTML = '';
        
        // Create details table
        const detailsTable = document.createElement('table');
        detailsTable.className = 'details-table';
        
        // Add rows for each property
        const startTime = query.query_start_time || query.start_time || query.event_time;
        const details = [
            { label: 'Query ID', value: query.query_id },
            { label: 'Start Time', value: this.formatTimestamp(startTime) },
            { label: 'User', value: query.sql_user || '-' },
            { label: 'Database', value: query.current_database || '-' },
            { label: 'Status', value: query.status === 'error' ? 'Error' : 'Success' },
            { label: 'Duration', value: query.duration_ms ? `${query.duration_ms.toLocaleString()} ms` : '-' },
            { label: 'Exception Code', value: query.exception_code || '-' },
            { label: 'Exception Message', value: query.exception_text || '-' }
        ];
        
        details.forEach(detail => {
            const row = document.createElement('tr');
            
            const labelCell = document.createElement('td');
            labelCell.className = 'detail-label';
            labelCell.textContent = detail.label;
            row.appendChild(labelCell);
            
            const valueCell = document.createElement('td');
            valueCell.className = 'detail-value';
            valueCell.textContent = detail.value;
            row.appendChild(valueCell);
            
            detailsTable.appendChild(row);
        });
        
        modalContent.appendChild(detailsTable);
        
        // Add SQL query with syntax highlighting
        const sqlSection = document.createElement('div');
        sqlSection.className = 'log-detail-section';
        
        const sqlTitle = document.createElement('h3');
        sqlTitle.textContent = 'SQL Query';
        sqlSection.appendChild(sqlTitle);
        
        const sqlContainer = document.createElement('div');
        sqlContainer.className = 'log-detail-content';
        
        const sqlPre = document.createElement('pre');
        sqlPre.className = 'log-detail-code';
        
        // Add copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg>';
        copyBtn.title = 'Copy to clipboard';
        copyBtn.onclick = (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(query.query_text || '');
            copyBtn.innerHTML = '<span class="copy-success">Copied!</span>';
            setTimeout(() => {
                copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg>';
            }, 2000);
        };
        
        sqlPre.textContent = query.query_text || '-';
        sqlPre.appendChild(copyBtn);
        
        sqlContainer.appendChild(sqlPre);
        sqlSection.appendChild(sqlContainer);
        
        modalContent.appendChild(sqlSection);
        
        // Show modal
        modal.style.display = 'flex';
    }

    updateStats() {
        // Use server-provided statistics
        Object.keys(this.stats).forEach(key => {
            let elementId;
            if (key === 'avgDuration') {
                elementId = 'query-avg-duration';
            } else {
                elementId = `query-${key}-count`;
            }
            const element = document.getElementById(elementId);
            if (element) {
                if (key === 'avgDuration') {
                    element.textContent = Math.round(this.stats[key]).toLocaleString();
                } else {
                    element.textContent = this.formatNumber(this.stats[key]);
                }
            }
        });
    }

    updateQueriesCount() {
        const queriesCount = document.getElementById('queries-count');
        if (queriesCount) {
            const total = this.totalRecords || 0;
            const start = total > 0 ? (this.currentPage - 1) * this.pageSize + 1 : 0;
            const end = Math.min(start + this.queries.length - 1, total);
            
            if (total === 0) {
                queriesCount.textContent = 'No queries found';
            } else {
                queriesCount.textContent = `Showing ${start}-${end} of ${this.formatNumber(total)} queries`;
            }
        }
    }

    updatePagination() {
        const totalPages = Math.ceil(this.totalRecords / this.pageSize);
        const queryPagination = document.getElementById('query-pagination');
        
        // Update pagination info
        const paginationText = document.getElementById('query-pagination-text');
        if (paginationText) {
            const start = (this.currentPage - 1) * this.pageSize + 1;
            const end = Math.min(start + this.pageSize - 1, this.totalRecords);
            paginationText.textContent = `Showing ${start}-${end} of ${this.formatNumber(this.totalRecords)} queries`;
        }

        // Update pagination buttons
        const prevBtn = document.getElementById('query-prev-btn');
        const nextBtn = document.getElementById('query-next-btn');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= totalPages;
        }
        
        // Only show pagination if we have records and on the queries tab
        if (queryPagination) {
            const tabManager = window.tabManager;
            const isQueriesTabActive = tabManager && tabManager.activeTab === 'queries';
            const shouldShowPagination = this.totalRecords > 0 && isQueriesTabActive;
            queryPagination.style.display = shouldShowPagination ? 'flex' : 'none';
        }

        // Update page numbers
        this.renderPageNumbers(totalPages);
    }

    renderPageNumbers(totalPages) {
        const pageNumbers = document.getElementById('query-page-numbers');
        if (!pageNumbers) return;

        pageNumbers.innerHTML = '';

        if (totalPages <= 1) return;

        const maxVisible = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-number ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => this.goToPage(i));
            pageNumbers.appendChild(pageBtn);
        }
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadQueries(); // Reload data from server
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.totalRecords / this.pageSize);
        if (this.currentPage < totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    }

    jumpToLogHistory(queryId) {
        // Switch to logs tab
        if (window.tabManager) {
            window.tabManager.setActiveTab('logs');
        }
        
        // Filter logs by query ID
        if (window.logObserver) {
            window.logObserver.filterByQueryId(queryId);
        }
    }

    setAutoRefresh(seconds) {
        // Clear existing interval
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }

        this.autoRefreshSeconds = seconds;

        if (seconds !== 'off') {
            const intervalMs = parseInt(seconds) * 1000;
            this.autoRefreshInterval = setInterval(() => {
                if (!this.isLoading && window.logObserver && window.logObserver.connectionStatus.connected) {
                    this.loadQueries();
                }
            }, intervalMs);
        }
    }

    showError(message) {
        console.error('QueryHistoryObserver Error:', message);
        // You could implement a toast notification system here
        alert('Error: ' + message);
    }

    showConnectionMessage() {
        const connectionMessage = document.getElementById('query-connection-message');
        if (connectionMessage) {
            connectionMessage.style.display = 'block';
        }
    }

    formatTimestamp(timestamp, detailed = false) {
        if (!timestamp) return 'N/A';
        
        const date = new Date(timestamp);
        
        if (detailed) {
            // Format as YYYY-MM-DD HH:mm:ss.SSS
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
            
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
        } else {
            // Short format for chart labels: HH:mm:ss
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            
            return `${hours}:${minutes}:${seconds}`;
        }
    }

    formatNumber(num) {
        return new Intl.NumberFormat().format(num);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Copy content to clipboard
    copyToClipboard(text, successElement) {
        navigator.clipboard.writeText(text).then(() => {
            // Show copy success notification
            successElement.classList.add('show');
            
            // Remove notification after a delay
            setTimeout(() => {
                successElement.classList.remove('show');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
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

    // Search highlighting function
    highlightSearchTerms(text) {
        if (!this.searchQuery || this.searchQuery.trim() === '') {
            return text;
        }
        
        const searchTerm = this.searchQuery.trim();
        if (searchTerm.length === 0) {
            return text;
        }
        
        // Create a case-insensitive regex to find all occurrences
        const regex = new RegExp(`(${this.escapeRegex(searchTerm)})`, 'gi');
        
        // Replace matches with highlighted version
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    }
    
    // Helper function to escape special regex characters
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Generate time distribution chart
    generateTimeChart(timeDistribution) {
        const chartContainer = document.getElementById('queries-time-chart');
        const chartTitle = document.getElementById('queries-chart-title');
        
        if (!chartContainer || !chartTitle) return;
        
        // Update title
        chartTitle.textContent = `${this.totalRecords} Results`;
        
        // Clear existing chart
        chartContainer.innerHTML = '';
        
        // Debug logging
        console.log('Query time distribution data:', timeDistribution);
        
        if (!timeDistribution || timeDistribution.length === 0) {
            chartContainer.innerHTML = '<div style="text-align: center; color: var(--text-tertiary); padding: var(--space-4);">No data available</div>';
            return;
        }
        
        // Find max value for scaling
        const maxValue = Math.max(...timeDistribution.map(item => item.total || 0));
        
        // Create bars
        timeDistribution.forEach((item, index) => {
            const barContainer = document.createElement('div');
            barContainer.className = 'time-chart-bar-container';
            barContainer.style.flex = '1';
            barContainer.style.display = 'flex';
            barContainer.style.flexDirection = 'column';
            barContainer.style.justifyContent = 'flex-end';
            barContainer.style.height = '100%';
            barContainer.style.position = 'relative';
            
            const totalHeight = maxValue > 0 ? (item.total / maxValue) * 100 : 0;
            
            // Create stacked segments for success and error
            const levels = ['error', 'success'];
            const colors = {
                'error': 'var(--error)',
                'success': 'var(--success)'
            };
            
            let currentHeight = 0;
            levels.forEach(level => {
                const count = item[level] || 0;
                if (count > 0) {
                    const segment = document.createElement('div');
                    const segmentHeight = (count / item.total) * totalHeight;
                    
                    segment.style.height = `${segmentHeight}%`;
                    segment.style.backgroundColor = colors[level];
                    segment.style.borderRadius = currentHeight === 0 ? '2px 2px 0 0' : '0';
                    segment.style.minHeight = segmentHeight > 0 ? '1px' : '0';
                    
                    barContainer.appendChild(segment);
                    currentHeight += segmentHeight;
                }
            });
            
            // Add tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'time-chart-tooltip';
            const tooltipContent = [
                `${this.formatTimestamp(item.time_bucket, false)}`,
                `Total: ${item.total}`,
                item.success > 0 ? `Success: ${item.success}` : null,
                item.error > 0 ? `Errors: ${item.error}` : null
            ].filter(Boolean).join('<br>');
            
            tooltip.innerHTML = tooltipContent;
            barContainer.appendChild(tooltip);
            
            chartContainer.appendChild(barContainer);
        });
        
        // Add time labels
        const labelsContainer = document.createElement('div');
        labelsContainer.className = 'time-chart-labels';
        
        if (timeDistribution.length > 0) {
            const firstTime = this.formatTimestamp(timeDistribution[0].time_bucket, false);
            const lastTime = this.formatTimestamp(timeDistribution[timeDistribution.length - 1].time_bucket, false);
            
            labelsContainer.innerHTML = `
                <span>${firstTime}</span>
                <span>${lastTime}</span>
            `;
        }
        
        chartContainer.parentNode.appendChild(labelsContainer);
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tab manager first
    window.tabManager = new TabManager();

    // Initialize log observer
    window.logObserver = new LogObserver();
    
    // Initialize query history observer
    window.queryHistoryObserver = new QueryHistoryObserver();
    
    // Auto refresh functionality is now handled by the individual observers
    // No need for manual refresh buttons
    
    // Ensure initial tab state is correct
    const activeTabButton = document.querySelector('.tab-button.active');
    if (activeTabButton) {
        window.tabManager.setActiveTab(activeTabButton.dataset.tab);
    } else {
        // Default to logs tab if no active tab is set
        window.tabManager.setActiveTab('logs');
    }
    
    // Add additional CSS styles via proper style element creation
    const additionalStyles = document.createElement('style');
    additionalStyles.textContent = `
    .log-detail-fields {
        display: grid;
        gap: 1rem;
        margin-bottom: 2rem;
    }

    .log-detail-field {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 1rem;
        align-items: start;
    }

    .log-detail-label {
        font-weight: 600;
        color: var(--text-secondary);
        font-size: 0.875rem;
    }

    .log-detail-value {
        font-family: var(--font-mono);
        font-size: 0.875rem;
        color: var(--text-primary);
        word-break: break-word;
    }

    .log-detail-message-textarea {
        width: 100%;
        height: 200px;
        padding: 0.75rem;
        font-family: var(--font-mono);
        font-size: 0.875rem;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        background-color: var(--bg-secondary);
        color: var(--text-primary);
        resize: vertical;
    }

    .log-detail-code {
        background: var(--bg-tertiary);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-md);
        padding: 1rem;
        font-family: var(--font-mono);
        font-size: 0.875rem;
        color: var(--text-primary);
        overflow-x: auto;
        white-space: pre-wrap;
        line-height: 1.5;
    }

    .message-full-content {
        width: 100%;
        padding: 1rem;
        font-family: var(--font-mono);
        font-size: 0.875rem;
        color: var(--text-primary);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-md);
        overflow-y: auto;
        resize: vertical;
    }

    .message-line {
        display: flex;
        align-items: baseline;
    }

    .line-number {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin-right: 0.5rem;
    }

    .line-content {
        font-family: var(--font-mono);
        font-size: 0.875rem;
        color: var(--text-primary);
        word-break: break-word;
    }

    @media (max-width: 768px) {
        .log-detail-field {
            grid-template-columns: 1fr;
            gap: 0.5rem;
        }
    }
    `;

    // Inject the CSS properly
    document.head.appendChild(additionalStyles);
});
