// Modern Log Viewer - Clean & Minimal Design
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
        this.timeRange = '1h';
        this.isLoading = false;
        this.connectionStatus = { connected: false, error: null };
        
        this.initialize();
    }

    initialize() {
        this.checkConnectionStatus();
        this.setupEventListeners();
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
                this.currentPage = 1; // 重置到第一页
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

        // Refresh button in filters bar
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadLogs();
                
                // Add visual feedback when clicked
                refreshBtn.classList.add('refreshing');
                setTimeout(() => {
                    refreshBtn.classList.remove('refreshing');
                }, 1000);
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
        const configModal = document.getElementById('config-modal-overlay');
        if (configModal) {
            configModal.addEventListener('click', (e) => {
                if (e.target === configModal) {
                    this.closeConfigModal();
                }
            });
        }

        // Config buttons
        const configBtn = document.getElementById('config-btn');
        if (configBtn) {
            configBtn.addEventListener('click', () => this.openConfigModal());
        }
        const configModalClose = document.getElementById('config-modal-close');
        if (configModalClose) {
            configModalClose.addEventListener('click', () => this.closeConfigModal());
        }
        const configCancel = document.getElementById('config-cancel');
        if (configCancel) {
            configCancel.addEventListener('click', () => this.closeConfigModal());
        }
        const configConnect = document.getElementById('config-connect');
        if (configConnect) {
            configConnect.addEventListener('click', () => this.connectDatabase());
        }
    }

    // 检测是否是查询ID格式（UUID或纯数字ID）
    isQueryIdFormat(value) {
        if (!value) return false;
        
        // 检查是否是UUID格式 (8-4-4-4-12格式的十六进制字符)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        // 检查是否是纯数字ID
        const numericIdRegex = /^[0-9]{6,}$/; // 至少6位数字
        
        return uuidRegex.test(value) || numericIdRegex.test(value);
    }
    
    async loadLogs() {
        if (this.isLoading) return;
        
        // Check if database is connected
        if (!this.connectionStatus.connected) {
            this.showConnectionMessage();
            return;
        }
        
        this.isLoading = true;
        this.showLoading(true);

        try {
            const filters = {
                page: this.currentPage,
                pageSize: this.pageSize,
                timeRange: this.timeRange,
                level: this.selectedLevel !== 'all' ? this.selectedLevel : null
            };
            
            // 如果是查询ID格式，优先使用queryId搜索
            if (this.queryIdSearch) {
                filters.queryId = this.queryIdSearch;
                // 当使用查询ID搜索时，不使用普通搜索
            } else if (this.searchQuery.trim()) {
                // 只有当不是查询ID搜索时，才使用普通搜索
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
            this.showLoading(false);
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
            logsList.style.display = 'none';
            if (emptyState) {
                emptyState.style.display = 'flex';
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
            
            // Add click event
            copyIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                this.copyToClipboard(queryIdText, copySuccess);
            });
            
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
        
        message.innerHTML = `
            <div class="message-preview">${truncatedMessage}</div>
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
                return `<div class="message-line"><span class="line-content">${escapedLine}<svg class="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span class="copy-success">Copied!</span></span></div>`;
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
        
        console.log('Pagination update - Total records:', this.totalRecords, 'Page size:', this.pageSize, 'Total pages:', totalPages, 'Current page:', this.currentPage);
        
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
        this.loadLogs(); // 重新从服务器加载数据
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

    showLoading(show) {
        const loadingState = document.getElementById('loading-state');
        const logsList = document.getElementById('logs-list');
        
        if (loadingState) {
            loadingState.style.display = show ? 'flex' : 'none';
        }
        
        if (logsList && show) {
            logsList.style.display = 'none';
        }
    }

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
        
        // Format as YYYY-MM-DD HH:mm:ss.SSS
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
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
        const currentConnection = document.getElementById('current-connection');
        const currentDsn = document.getElementById('current-dsn');
        
        if (this.connectionStatus.connected) {
            currentConnection.style.display = 'block';
            currentDsn.textContent = 'Connected to Databend';
        } else {
            currentConnection.style.display = 'none';
        }
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
}

// Initialize the log observer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.logObserver = new LogObserver();
});

// Add some additional CSS for the modal content
const additionalStyles = `
<style>
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
    padding: 1rem;
    font-family: var(--font-mono);
    font-size: 0.875rem;
    color: var(--text-primary);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-md);
    overflow-y: auto;
    resize: vertical;
}

.log-detail-section {
    margin-bottom: 2rem;
}

.log-detail-section h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 1rem;
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
</style>
`;

// Inject additional styles
document.head.insertAdjacentHTML('beforeend', additionalStyles);
