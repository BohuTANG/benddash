// Databend Log Observer - Updated: 2025-06-22 13:13:40 - Connection check removed
// This file has been modified to remove connection status checks and enable direct API calls

// Shared utilities
class SharedUtils {
    static copyToClipboard(text, successElement) {
        navigator.clipboard.writeText(text).then(() => {
            if (successElement) {
                const originalText = successElement.textContent;
                successElement.textContent = 'Copied!';
                successElement.style.display = 'inline';
                successElement.classList.add('show');
                
                setTimeout(() => {
                    successElement.classList.remove('show');
                    successElement.style.display = 'none';
                    if (originalText !== 'Copied!') {
                        successElement.textContent = originalText;
                    }
                }, 2000);
            }
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            SharedUtils.fallbackCopyToClipboard(text);
        });
    }

    static fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            console.log(`Fallback copy ${successful ? 'successful' : 'failed'}`);
        } catch (err) {
            console.error('Fallback copy failed', err);
        } finally {
            document.body.removeChild(textArea);
        }
    }

    static formatTimestamp(timestamp, detailed = false) {
        if (!timestamp) return 'N/A';
        
        const date = new Date(timestamp);
        
        if (detailed) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
            
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
        } else {
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            
            return `${hours}:${minutes}:${seconds}`;
        }
    }

    static formatNumber(num) {
        return new Intl.NumberFormat().format(num);
    }

    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    static debounce(func, wait) {
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

    static prettifySQL(sql) {
        if (!sql) return '';
        
        let formatted = sql.replace(/\b(SELECT|FROM|WHERE|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|OUTER JOIN|GROUP BY|ORDER BY|HAVING|UNION|UNION ALL)\b/gi, '\n$1');
        formatted = formatted.replace(/\b(WITH)\b/gi, '$1\n');
        formatted = formatted.replace(/,\s*(?=\w)/g, ',\n    ');
        formatted = formatted.replace(/\n\s*\n/g, '\n').trim();
        
        let lines = formatted.split('\n');
        let indentLevel = 0;
        
        lines = lines.map((line, index) => {
            const trimmed = line.trim();
            if (!trimmed) return '';
            
            if (/^\s*\)/.test(trimmed)) {
                indentLevel = Math.max(0, indentLevel - 1);
            }
            
            const indented = '    '.repeat(indentLevel) + trimmed;
            
            if (/\(\s*$/.test(trimmed) || /\b(SELECT|FROM|WHERE|WITH)\b/i.test(trimmed)) {
                indentLevel++;
            }
            
            return indented;
        });
        
        return lines.join('\n');
    }

    static formatSQLQuery(sql) {
        return this.prettifySQL(sql);
    }

    static createCopyButton(text, buttonText = 'Copy', className = 'copy-all-btn') {
        const copyBtn = document.createElement('button');
        copyBtn.className = className;
        copyBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
        `;
        
        const copySuccess = document.createElement('span');
        copySuccess.className = 'copy-success';
        copySuccess.textContent = 'Copied!';
        copySuccess.style.display = 'none';
        copyBtn.appendChild(copySuccess);
        
        copyBtn.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => {
                    copySuccess.style.display = 'inline';
                    copySuccess.style.opacity = '1';
                    setTimeout(() => {
                        copySuccess.style.opacity = '0';
                        setTimeout(() => {
                            copySuccess.style.display = 'none';
                        }, 200);
                    }, 1500);
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                    SharedUtils.fallbackCopyToClipboard(text);
                });
            } else {
                SharedUtils.fallbackCopyToClipboard(text);
            }
        };
        
        return copyBtn;
    }

    // Search highlighting function
    static highlightSearchTerms(text, searchQuery) {
        if (!searchQuery || searchQuery.trim() === '') {
            return text;
        }
        
        const searchTerm = searchQuery.trim();
        if (searchTerm.length === 0) {
            return text;
        }
        
        const regex = new RegExp(`(${SharedUtils.escapeRegex(searchTerm)})`, 'gi');
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    }
    
    // Helper function to escape special regex characters
    static escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Generate time distribution chart
    static generateTimeChart(timeDistribution, chartContainerId, chartTitleId, totalRecords, colorMap) {
        const chartContainer = document.getElementById(chartContainerId);
        const chartTitle = document.getElementById(chartTitleId);
        
        if (!chartContainer || !chartTitle) return;
        
        chartTitle.textContent = `${totalRecords} Results`;
        chartContainer.innerHTML = '';
        
        if (!timeDistribution || timeDistribution.length === 0) {
            chartContainer.innerHTML = '<div class="chart-no-data">No data available</div>';
            return;
        }
        
        const maxValue = Math.max(...timeDistribution.map(item => item.total || 0));
        
        timeDistribution.forEach((item, index) => {
            const barContainer = document.createElement('div');
            barContainer.className = 'time-chart-bar-container';
            
            const totalHeight = maxValue > 0 ? (item.total / maxValue) * 100 : 0;
            
            let currentHeight = 0;
            Object.keys(colorMap).forEach(level => {
                const count = item[level] || 0;
                if (count > 0) {
                    const segment = document.createElement('div');
                    const segmentHeight = (count / item.total) * totalHeight;
                    
                    segment.style.height = `${segmentHeight}%`;
                    segment.style.backgroundColor = colorMap[level];
                    segment.style.borderRadius = currentHeight === 0 ? '2px 2px 0 0' : '0';
                    segment.style.minHeight = segmentHeight > 0 ? '1px' : '0';
                    
                    barContainer.appendChild(segment);
                    currentHeight += segmentHeight;
                }
            });
            
            const tooltip = document.createElement('div');
            tooltip.className = 'time-chart-tooltip';
            const tooltipContent = [
                `${SharedUtils.formatTimestamp(item.time_bucket, false)}`,
                `Total: ${item.total}`,
                ...Object.keys(colorMap).map(level => 
                    item[level] > 0 ? `${level.charAt(0).toUpperCase() + level.slice(1)}: ${item[level]}` : null
                ).filter(Boolean)
            ].join('<br>');
            
            tooltip.innerHTML = tooltipContent;
            barContainer.appendChild(tooltip);
            chartContainer.appendChild(barContainer);
        });
    }
}

// Universal UI Handler Class
class UIHandler {
    static showLoading(isLoading, config) {
        const { loadingOverlayId, buttonId, originalButtonText } = config;
        
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

        if (openButtonId) {
            UIHandler.bindButton(openButtonId, () => {
                modal.style.display = 'flex';
                if (onOpen) onOpen();
            });
        }

        closeButtonIds.forEach(buttonId => {
            UIHandler.bindButton(buttonId, () => {
                modal.style.display = 'none';
                if (onClose) onClose();
            });
        });

        if (closeOnBackdrop) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                    if (onClose) onClose();
                }
            });
        }

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

    static showError(message, duration = 5000) {
        let errorElement = document.getElementById('error-notification');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'error-notification';
            errorElement.className = 'error-notification';
            document.body.appendChild(errorElement);
        }

        errorElement.textContent = message;
        errorElement.style.display = 'block';

        setTimeout(() => {
            errorElement.style.display = 'none';
        }, duration);
    }
}

// Base Observer class with common functionality
class BaseObserver {
    constructor(config) {
        this.data = [];
        this.currentPage = 1;
        this.pageSize = 200;
        this.totalRecords = 0;
        this.searchQuery = '';
        this.selectedLevel = '';
        this.timeRange = '5m';
        this.autoRefreshSeconds = 'off';
        this.autoRefreshInterval = null;
        this.isLoading = false;
        this.stats = {};
        this.connectionStatus = { connected: false, error: null };
        
        // Configuration from child classes
        this.config = {
            apiEndpoint: '',
            listElementId: '',
            paginationElementId: '',
            countElementId: '',
            loadingStateId: '',
            emptyStateId: '',
            chartContainerId: '',
            chartTitleId: '',
            searchInputId: '',
            timeRangeSelectId: '',
            autoRefreshSelectId: '',
            levelFiltersSelector: '',
            prevButtonId: '',
            nextButtonId: '',
            pageNumbersId: '',
            paginationTextId: '',
            connectionMessageId: ''
        };
        
        Object.assign(this.config, config);
    }

    setupCommonEventListeners() {
        // Search input
        const searchInput = document.getElementById(this.config.searchInputId);
        if (searchInput) {
            // Store initial value to prevent auto-loading on initialization
            let previousSearchQuery = searchInput.value || '';
            
            searchInput.addEventListener('input', SharedUtils.debounce((e) => {
                const newSearchQuery = e.target.value.trim();
                // Only load data if the value actually changed from user interaction
                if (newSearchQuery !== previousSearchQuery) {
                    this.searchQuery = newSearchQuery;
                    previousSearchQuery = newSearchQuery;
                    this.currentPage = 1;
                    this.loadData();
                }
            }, 300));
        }

        // Level filters
        if (this.config.levelFiltersSelector) {
            const levelFilters = document.querySelectorAll(this.config.levelFiltersSelector);
            levelFilters.forEach(filter => {
                filter.addEventListener('click', (e) => {
                    const newLevel = e.target.dataset.level;
                    // Only load data if the level actually changed from user interaction
                    if (newLevel !== this.selectedLevel) {
                        this.setActiveFilter(e.target);
                        this.selectedLevel = newLevel;
                        this.currentPage = 1;
                        this.loadData();
                    }
                });
            });
        }

        // Time range selector
        const timeRangeSelect = document.getElementById(this.config.timeRangeSelectId);
        if (timeRangeSelect) {
            // Store initial value to prevent auto-loading on initialization
            let previousTimeRange = timeRangeSelect.value || this.timeRange;
            
            timeRangeSelect.addEventListener('change', (e) => {
                const newTimeRange = e.target.value;
                // Only load data if the value actually changed from user interaction
                if (newTimeRange !== previousTimeRange) {
                    this.timeRange = newTimeRange;
                    previousTimeRange = newTimeRange;
                    this.loadData();
                }
            });
        }

        // Auto refresh selector
        const autoRefreshSelect = document.getElementById(this.config.autoRefreshSelectId);
        if (autoRefreshSelect) {
            // Store initial value to prevent auto-loading on initialization
            let previousAutoRefreshSeconds = autoRefreshSelect.value || this.autoRefreshSeconds;
            
            autoRefreshSelect.addEventListener('change', (e) => {
                const newAutoRefreshSeconds = e.target.value;
                // Only set auto-refresh if the value actually changed from user interaction
                if (newAutoRefreshSeconds !== previousAutoRefreshSeconds) {
                    this.autoRefreshSeconds = newAutoRefreshSeconds;
                    previousAutoRefreshSeconds = newAutoRefreshSeconds;
                    this.setAutoRefresh(newAutoRefreshSeconds);
                }
            });
        }

        // Pagination
        const prevBtn = document.getElementById(this.config.prevButtonId);
        const nextBtn = document.getElementById(this.config.nextButtonId);
        
        if (prevBtn) prevBtn.addEventListener('click', () => this.previousPage());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextPage());
    }

    async loadData() {
        if (this.isLoading) return;
        
        this.data = [];
        this.renderData();
        
        this.isLoading = true;
        UIHandler.showLoading(true, {
            loadingOverlayId: this.config.loadingStateId,
            originalButtonText: 'Refresh'
        });

        try {
            const filters = this.buildFilters();
            const response = await fetch(this.config.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(filters)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            this.processLoadedData(data);
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load data: ' + error.message);
            this.data = [];
            this.totalRecords = 0;
        } finally {
            this.isLoading = false;
            UIHandler.showLoading(false, {
                loadingOverlayId: this.config.loadingStateId,
                originalButtonText: 'Refresh'
            });
        }
    }

    buildFilters() {
        const filters = {
            page: this.currentPage,
            pageSize: this.pageSize,
            timeRange: this.timeRange
        };
        
        if (this.selectedLevel !== 'all') {
            filters[this.getFilterKey()] = this.selectedLevel;
        }
        
        if (this.searchQuery.trim()) {
            filters.search = this.searchQuery.trim();
        }

        return filters;
    }

    processLoadedData(data) {
        const dataKey = this.getDataKey();
        this.data = data[dataKey] || [];
        this.totalRecords = data.total || 0;
        this.stats = data.stats || {};
        this.renderData();
        this.updateStats();
        this.updatePagination();
        
        if (data.timeDistribution) {
            this.generateTimeChart(data.timeDistribution);
        }
    }

    updatePagination() {
        const totalPages = Math.ceil(this.totalRecords / this.pageSize);
        const pagination = document.getElementById(this.config.paginationElementId);
        
        const paginationText = document.getElementById(this.config.paginationTextId);
        if (paginationText) {
            const start = (this.currentPage - 1) * this.pageSize + 1;
            const end = Math.min(start + this.pageSize - 1, this.totalRecords);
            
            if (totalPages === 1) {
                paginationText.textContent = `Showing ${this.totalRecords} ${this.getItemName()}`;
            } else {
                paginationText.textContent = `Showing ${start}-${end} of ${SharedUtils.formatNumber(this.totalRecords)} ${this.getItemName()}`;
            }
        }

        const prevBtn = document.getElementById(this.config.prevButtonId);
        const nextBtn = document.getElementById(this.config.nextButtonId);
        
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;
        
        if (pagination) {
            const tabManager = window.tabManager;
            const isActiveTab = tabManager && tabManager.activeTab === this.getTabName();
            const shouldShowPagination = this.totalRecords > 0 && isActiveTab;
            pagination.style.display = shouldShowPagination ? 'flex' : 'none';
        }

        this.renderPageNumbers(totalPages);
    }

    renderPageNumbers(totalPages) {
        const pageNumbers = document.getElementById(this.config.pageNumbersId);
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
        this.loadData();
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

    setAutoRefresh(seconds) {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }

        this.autoRefreshSeconds = seconds;

        if (seconds !== 'off') {
            const intervalMs = parseInt(seconds) * 1000;
            this.autoRefreshInterval = setInterval(() => {
                if (!this.isLoading) {
                    this.loadData();
                }
            }, intervalMs);
        }
    }

    setActiveFilter(activeElement) {
        const filters = document.querySelectorAll(this.config.levelFiltersSelector);
        filters.forEach(filter => filter.classList.remove('active'));
        activeElement.classList.add('active');
    }

    showError(message) {
        UIHandler.showError(message);
    }

    showConnectionMessage() {
        const connectionMessage = document.getElementById(this.config.connectionMessageId);
        if (connectionMessage) {
            connectionMessage.style.display = 'block';
        }
    }

    // Abstract methods to be implemented by child classes
    getDataKey() { throw new Error('getDataKey must be implemented by child class'); }
    getFilterKey() { throw new Error('getFilterKey must be implemented by child class'); }
    getItemName() { throw new Error('getItemName must be implemented by child class'); }
    getTabName() { throw new Error('getTabName must be implemented by child class'); }
    renderData() { throw new Error('renderData must be implemented by child class'); }
    updateStats() { throw new Error('updateStats must be implemented by child class'); }
    generateTimeChart() { throw new Error('generateTimeChart must be implemented by child class'); }
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
            button.replaceWith(button.cloneNode(true));
        });
        
        const newTabButtons = document.querySelectorAll('.tab-button');
        newTabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.setActiveTab(button.dataset.tab);
            });
        });
    }
    
    setActiveTab(tabId) {
        this.activeTab = tabId;
        
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            if (button.dataset.tab === tabId) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        const tabContents = document.querySelectorAll('[data-tab-content]');
        tabContents.forEach(content => {
            if (content.dataset.tabContent === tabId) {
                content.style.display = '';
            } else {
                content.style.display = 'none';
            }
        });
        
        if (tabId === 'logs') {
            const logsPagination = document.getElementById('pagination');
            const queryPagination = document.getElementById('query-pagination');
            if (logsPagination) logsPagination.style.display = 'flex';
            if (queryPagination) queryPagination.style.display = 'none';
        } else if (tabId === 'queries') {
            const logsPagination = document.getElementById('pagination');
            const queryPagination = document.getElementById('query-pagination');
            if (logsPagination) logsPagination.style.display = 'none';
            if (queryPagination) queryPagination.style.display = 'flex';
            
            // Trigger data loading for queries tab
            if (window.queryObserver) {
                window.queryObserver.loadData();
            }
        }
    }
}

class LogObserver extends BaseObserver {
    constructor() {
        super({
            apiEndpoint: '/api/logs',
            listElementId: 'logs-list',
            paginationElementId: 'pagination',
            countElementId: 'logs-count',
            loadingStateId: 'loading-state',
            emptyStateId: 'empty-state',
            chartContainerId: 'logs-time-chart',
            chartTitleId: 'logs-chart-title',
            searchInputId: 'search-input',
            timeRangeSelectId: 'time-range',
            autoRefreshSelectId: 'auto-refresh',
            levelFiltersSelector: '.level-filter',
            prevButtonId: 'prev-btn',
            nextButtonId: 'next-btn',
            pageNumbersId: 'page-numbers',
            paginationTextId: 'pagination-text',
            connectionMessageId: 'connection-message'
        });
        
        this.queryIdSearch = '';
        this.logs = this.data; // Alias for backward compatibility
        
        this.initialize();
    }

    getDataKey() { return 'logs'; }
    getFilterKey() { return 'level'; }
    getItemName() { return 'logs'; }
    getTabName() { return 'logs'; }

    initialize() {
        this.setupEventListeners();
        this.setupCommonEventListeners();
        this.updateLogsCount();
        this.loadData();
        this.checkConnectionStatus();
    }

    setupEventListeners() {
        // Override search to handle query ID format
        const searchInput = document.getElementById(this.config.searchInputId);
        if (searchInput) {
            // Store initial value to prevent auto-loading on initialization
            let previousSearchValue = searchInput.value || '';
            
            searchInput.addEventListener('input', SharedUtils.debounce((e) => {
                const value = e.target.value.trim();
                
                // Only load data if the value actually changed from user interaction
                if (value !== previousSearchValue) {
                    this.searchQuery = value;
                    
                    if (this.isQueryIdFormat(value)) {
                        this.queryIdSearch = value;
                        this.searchQuery = '';
                    } else {
                        this.queryIdSearch = '';
                    }
                    this.currentPage = 1;
                    previousSearchValue = value;
                    this.loadData();
                }
            }, 300));
        }

        // Modal close
        const modalClose = document.getElementById('modal-close');
        const modalOverlay = document.getElementById('modal-overlay');
        if (modalClose) modalClose.addEventListener('click', () => this.closeModal());
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) this.closeModal();
            });
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
            dsnInput.addEventListener('input', SharedUtils.debounce((e) => {
                this.updateDsnPreview(e.target.value);
            }, 200));
        }
        
        // Connection status click handler
        const connectionStatus = document.getElementById('connection-status');
        if (connectionStatus) {
            connectionStatus.addEventListener('click', () => {
                this.openConfigModal();
            });
        }
    }

    buildFilters() {
        const filters = super.buildFilters();
        
        if (this.queryIdSearch) {
            filters.queryId = this.queryIdSearch;
            delete filters.search; // Don't use regular search when using query ID search
        }

        return filters;
    }

    isQueryIdFormat(value) {
        if (!value) return false;
        
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const uuidNoDashRegex = /^[0-9a-f]{32}$/i;
        const numericIdRegex = /^[0-9]{6,}$/;
        
        return uuidRegex.test(value) || uuidNoDashRegex.test(value) || numericIdRegex.test(value);
    }

    renderData() {
        const logsList = document.getElementById(this.config.listElementId);
        const emptyState = document.getElementById(this.config.emptyStateId);
        
        if (!logsList) return;

        logsList.innerHTML = '';

        if (this.data.length === 0) {
            logsList.style.display = 'block';
            if (emptyState) emptyState.style.display = 'none';
            return;
        }

        logsList.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';

        logsList.className = 'logs-list';

        const startIndex = (this.currentPage - 1) * this.pageSize;
        this.data.forEach((log, index) => {
            const logEntry = this.createLogEntry(log, startIndex + index);
            logsList.appendChild(logEntry);
        });

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
        timestamp.textContent = SharedUtils.formatTimestamp(log.timestamp);

        // Query ID with copy icon
        const queryId = this.createQueryIdElement(log.query_id, (id) => this.filterByQueryId(id));

        // Content
        const content = document.createElement('div');
        content.className = 'log-content';

        // Message with truncation
        const message = document.createElement('div');
        message.className = 'log-message';
        const fullMessage = log.fields_message || log.message || 'No message';
        
        const truncatedMessage = fullMessage.length > 150 ? fullMessage.substring(0, 150) + '...' : fullMessage;
        const formattedTruncated = this.formatContent(truncatedMessage);
        const highlightedTruncated = SharedUtils.highlightSearchTerms(formattedTruncated, this.searchQuery);
        
        message.innerHTML = `<div class="message-preview">${highlightedTruncated}</div>`;

        // Expand/Collapse icon button for all logs
        const expandBtn = this.createExpandButton();
        expandBtn.onclick = (e) => {
            e.stopPropagation();
            this.toggleLogExpansion(entry, expandBtn);
        };
        message.appendChild(expandBtn);

        // Meta information
        const meta = this.createMetaElement(log);
        content.appendChild(message);

        // Create expanded content container
        const expandedContent = this.createExpandedContent(fullMessage, meta);

        // Add elements to entry
        entry.appendChild(levelBadge);
        entry.appendChild(timestamp);
        entry.appendChild(queryId);
        entry.appendChild(content);
        entry.appendChild(expandedContent);

        // Add click handler for expansion - all logs are expandable
        entry.style.cursor = 'pointer';
        entry.onclick = (e) => {
            const isExpanded = entry.classList.contains('expanded');
            const clickingExpandedContent = e.target.closest('.log-expanded-content');
            
            if (!e.target.closest('.expand-icon-btn') && !e.target.closest('.copy-icon') && !e.target.closest('.query-id-clickable') && !(isExpanded && clickingExpandedContent)) {
                this.toggleLogExpansion(entry, expandBtn);
            }
        };

        return entry;
    }

    createQueryIdElement(queryIdText, onClickCallback) {
        const queryId = document.createElement('div');
        queryId.className = 'log-query-id';
        
        if (queryIdText && queryIdText !== '-') {
            const queryIdSpan = document.createElement('span');
            queryIdSpan.textContent = queryIdText;
            queryIdSpan.className = 'query-id-clickable';
            queryIdSpan.style.cursor = 'pointer';
            queryIdSpan.title = 'Click to filter by this Query ID';
            queryIdSpan.addEventListener('click', (e) => {
                e.stopPropagation();
                onClickCallback(queryIdText);
            });
            
            const copyIcon = this.createCopyIcon();
            const copySuccess = this.createCopySuccessElement();
            
            copyIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                SharedUtils.copyToClipboard(queryIdText, copySuccess);
            });
            
            queryId.appendChild(queryIdSpan);
            queryId.appendChild(copyIcon);
            queryId.appendChild(copySuccess);
        } else {
            queryId.textContent = '-';
        }

        return queryId;
    }

    createCopyIcon() {
        const copyIcon = document.createElement('svg');
        copyIcon.className = 'copy-icon';
        copyIcon.setAttribute('width', '14');
        copyIcon.setAttribute('height', '14');
        copyIcon.setAttribute('viewBox', '0 0 24 24');
        copyIcon.setAttribute('fill', 'none');
        copyIcon.setAttribute('stroke', 'currentColor');
        copyIcon.setAttribute('stroke-width', '2');
        copyIcon.innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>';
        return copyIcon;
    }

    createCopySuccessElement() {
        const copySuccess = document.createElement('span');
        copySuccess.className = 'copy-success';
        copySuccess.textContent = 'Copied!';
        return copySuccess;
    }

    createExpandButton() {
        const expandBtn = document.createElement('button');
        expandBtn.className = 'expand-icon-btn';
        expandBtn.innerHTML = `
            <svg class="expand-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6,9 12,15 18,9"></polyline>
            </svg>
        `;
        return expandBtn;
    }

    createMetaElement(log) {
        const meta = document.createElement('div');
        meta.className = 'log-meta';
        meta.style.display = 'none';

        const metaItems = [];
        if (log.target) metaItems.push(`<div class="log-meta-item"><span class="meta-label">Target:</span> <span class="meta-value">${SharedUtils.escapeHtml(log.target)}</span></div>`);
        if (log.path) metaItems.push(`<div class="log-meta-item"><span class="meta-label">Path:</span> <span class="meta-value">${SharedUtils.escapeHtml(log.path)}</span></div>`);
        if (log.cluster_id) metaItems.push(`<div class="log-meta-item"><span class="meta-label">Cluster:</span> <span class="meta-value">${SharedUtils.escapeHtml(log.cluster_id)}</span></div>`);
        meta.innerHTML = metaItems.join('');
        return meta;
    }

    createExpandedContent(fullMessage, meta) {
        const expandedContent = document.createElement('div');
        expandedContent.className = 'log-expanded-content';
        expandedContent.style.display = 'none';
        
        if (fullMessage.length > 150) {
            const expandedMessage = document.createElement('div');
            expandedMessage.className = 'message-full-content';
            
            const copyAllBtn = SharedUtils.createCopyButton(fullMessage, 'Copy All');
            expandedMessage.appendChild(copyAllBtn);
            
            const messageTextarea = document.createElement('textarea');
            messageTextarea.className = 'log-detail-message-textarea';
            messageTextarea.value = fullMessage;
            messageTextarea.readOnly = true;
            messageTextarea.style.height = '200px';
            messageTextarea.style.marginTop = '2rem';
            
            expandedMessage.appendChild(messageTextarea);
            expandedContent.appendChild(expandedMessage);
            
            const expandedMeta = meta.cloneNode(true);
            expandedMeta.className = 'log-expanded-meta';
            expandedMeta.style.display = 'block';
            expandedContent.appendChild(expandedMeta);
        }

        return expandedContent;
    }

    toggleLogExpansion(entry, expandBtn) {
        const messagePreview = entry.querySelector('.message-preview');
        const expandedContent = entry.querySelector('.log-expanded-content');
        
        const isExpanded = expandedContent.style.display !== 'none';
        
        if (isExpanded) {
            messagePreview.style.display = 'block';
            expandedContent.style.display = 'none';
            entry.classList.remove('expanded');
            expandBtn.querySelector('.expand-icon').style.transform = 'rotate(0deg)';
        } else {
            messagePreview.style.display = 'none';
            expandedContent.style.display = 'block';
            entry.classList.add('expanded');
            expandBtn.querySelector('.expand-icon').style.transform = 'rotate(180deg)';
        }
    }

    updateStats() {
        Object.keys(this.stats).forEach(key => {
            const element = document.getElementById(`${key}-count`);
            if (element) {
                element.textContent = SharedUtils.formatNumber(this.stats[key]);
            }
        });
    }

    updateLogsCount() {
        const logsCount = document.getElementById(this.config.countElementId);
        if (logsCount) {
            const total = this.totalRecords || 0;
            const start = total > 0 ? (this.currentPage - 1) * this.pageSize + 1 : 0;
            const end = Math.min(start + this.pageSize - 1, total);
            
            if (total === 0) {
                logsCount.textContent = 'No logs found';
            } else {
                logsCount.textContent = `Showing ${start}-${end} of ${SharedUtils.formatNumber(total)} logs`;
            }
        }
    }

    generateTimeChart(timeDistribution) {
        const colorMap = {
            'error': 'var(--error)',
            'warning': 'var(--warning)',
            'info': 'var(--info)',
            'debug': 'var(--text-tertiary)'
        };
        
        SharedUtils.generateTimeChart(
            timeDistribution, 
            this.config.chartContainerId, 
            this.config.chartTitleId, 
            this.totalRecords, 
            colorMap
        );
    }

    formatContent(content) {
        if (!content) return '';
        
        try {
            const parsed = JSON.parse(content);
            return SharedUtils.escapeHtml(JSON.stringify(parsed, null, 2)).replace(/\n/g, '<br>');
        } catch (e) {
            return SharedUtils.escapeHtml(content).replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
        }
    }

    filterByQueryId(queryId) {
        const searchInput = document.getElementById(this.config.searchInputId);
        if (searchInput) {
            searchInput.value = queryId;
            this.searchQuery = '';
            this.queryIdSearch = queryId;
            this.currentPage = 1;
            this.loadData();
        }
    }

    closeModal() {
        const modal = document.getElementById('modal-overlay');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    openConfigModal() {
        const configModal = document.getElementById('config-modal-overlay');
        configModal.style.display = 'flex';
        const dsnInput = document.getElementById('dsn-input');
        dsnInput.focus();
        const connectionFeedback = document.getElementById('connection-feedback');
        connectionFeedback.style.display = 'none';
        
        this.updateCurrentConnectionDisplay();
    }

    updateCurrentConnectionDisplay() {
        const currentConnectionDiv = document.getElementById('current-connection');
        const connectionInfoGrid = document.getElementById('connection-info-grid');

        if (this.connectionStatus && this.connectionStatus.connected && this.connectionStatus.dsn_masked) {
            currentConnectionDiv.style.display = 'block';
            
            connectionInfoGrid.innerHTML = '';

            const parsedDsn = this.parseDsn(this.connectionStatus.dsn_masked);

            for (const [key, value] of Object.entries(parsedDsn)) {
                if (value) {
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

    closeConfigModal() {
        const configModal = document.getElementById('config-modal-overlay');
        configModal.style.display = 'none';
        const dsnInput = document.getElementById('dsn-input');
        dsnInput.value = '';
        const connectionFeedback = document.getElementById('connection-feedback');
        connectionFeedback.style.display = 'none';
    }

    connectDatabase() {
        const dsnInput = document.getElementById('dsn-input');
        const dsn = dsnInput.value.trim();
        if (!dsn) {
            alert('Please enter a DSN');
            return;
        }

        const connectBtn = document.getElementById('config-connect');
        if (!connectBtn) {
            console.error('Connect button not found');
            return;
        }
        
        const originalText = connectBtn.textContent;
        connectBtn.textContent = 'Connecting...';
        connectBtn.disabled = true;

        const connectionFeedback = document.getElementById('connection-feedback');
        connectionFeedback.style.display = 'none';

        // Update UI to show connecting status
        const statusDot = document.getElementById('connection-status-dot');
        const statusText = document.getElementById('connection-status-text');
        statusDot.className = 'status-dot status-connecting';
        statusText.textContent = 'Connecting...';

        fetch('/api/connection/configure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dsn })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                this.connectionStatus = result.status;
                this.updateConnectionUI();
                this.updateCurrentConnectionDisplay();
                connectionFeedback.textContent = 'Connected successfully!';
                connectionFeedback.className = 'connection-status success';
                connectionFeedback.style.display = 'block';
                setTimeout(() => {
                    this.closeConfigModal();
                }, 1500);
            } else {
                this.connectionStatus = result.status || { connected: false, error: result.error };
                this.updateConnectionUI();
                connectionFeedback.textContent = result.error || 'Connection failed';
                connectionFeedback.className = 'connection-status error';
                connectionFeedback.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Connection error:', error);
            this.connectionStatus = { connected: false, error: error.message };
            this.updateConnectionUI();
            connectionFeedback.textContent = 'Connection failed: ' + error.message;
            connectionFeedback.className = 'connection-status error';
            connectionFeedback.style.display = 'block';
        })
        .finally(() => {
            connectBtn.textContent = originalText;
            connectBtn.disabled = false;
        });
    }

    updateDsnPreview(dsn) {
        const previewDiv = document.getElementById('parsed-dsn-preview');
        if (!dsn.trim()) {
            previewDiv.style.display = 'none';
            return;
        }

        const parsed = this.parseDsn(dsn);
        
        const detailsToShow = Object.entries(parsed).filter(([key, value]) => value && key !== 'user' && key !== 'port');

        if (detailsToShow.length > 0) {
            previewDiv.style.display = 'grid';
            previewDiv.innerHTML = '';

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

    // Keep loadLogs method for backward compatibility
    loadLogs() {
        return this.loadData();
    }
    
    updateConnectionUI() {
        const statusDot = document.getElementById('connection-status-dot');
        const statusText = document.getElementById('connection-status-text');
        
        if (this.connectionStatus && this.connectionStatus.connected) {
            statusDot.className = 'status-dot';
            statusText.textContent = 'Connected';
        } else {
            statusDot.className = 'status-dot status-disconnected';
            statusText.textContent = 'Disconnected';
            
            if (this.connectionStatus && this.connectionStatus.error) {
                statusText.title = this.connectionStatus.error;
            }
        }
    }

    checkConnectionStatus() {
        fetch('/api/connection/status')
        .then(response => response.json())
        .then(result => {
            this.connectionStatus = result;
            this.updateConnectionUI();
            this.updateCurrentConnectionDisplay();
        })
        .catch(error => {
            console.error('Connection status check failed:', error);
            this.connectionStatus = { connected: false, error: error.message };
            this.updateConnectionUI();
        });
    }
}

// Query History Observer class
class QueryObserver extends BaseObserver {
    constructor() {
        super({
            apiEndpoint: '/api/queries',
            listElementId: 'queries-list',
            paginationElementId: 'query-pagination',
            countElementId: 'queries-count',
            loadingStateId: 'query-loading-state',
            emptyStateId: 'query-empty-state',
            chartContainerId: 'queries-time-chart',
            chartTitleId: 'queries-chart-title',
            searchInputId: 'query-search-input',
            timeRangeSelectId: 'query-time-range',
            autoRefreshSelectId: 'query-auto-refresh',
            levelFiltersSelector: '[data-tab-content="queries"] .level-filter',
            prevButtonId: 'query-prev-btn',
            nextButtonId: 'query-next-btn',
            pageNumbersId: 'query-page-numbers',
            paginationTextId: 'query-pagination-text',
            connectionMessageId: 'query-connection-message'
        });
        
        this.queries = this.data; // Alias for backward compatibility
        
        this.initialize();
    }

    getDataKey() { return 'queries'; }
    getFilterKey() { return 'status'; }
    getItemName() { return 'queries'; }
    getTabName() { return 'queries'; }

    initialize() {
        this.setupCommonEventListeners();
        this.updateQueriesCount();
        this.loadData();
    }

    renderData() {
        const queriesList = document.getElementById(this.config.listElementId);
        const emptyState = document.getElementById(this.config.emptyStateId);
        
        if (!queriesList) return;

        queriesList.innerHTML = '';

        // Always hide empty state for Query History
        if (emptyState) emptyState.style.display = 'none';
        
        // Always show queries list
        queriesList.style.display = 'block';
        queriesList.className = 'logs-list';

        if (this.data.length === 0) {
            // Don't show empty state, just leave the list empty
            return;
        }

        const startIndex = (this.currentPage - 1) * this.pageSize;
        this.data.forEach((query, index) => {
            const queryEntry = this.createQueryEntry(query, startIndex + index);
            queriesList.appendChild(queryEntry);
        });
    }

    createQueryEntry(query, index) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.dataset.queryIndex = index;

        // Status badge
        const statusBadge = document.createElement('div');
        const status = query.exception_code ? 'error' : 'success';
        statusBadge.className = `log-level-badge ${status}`;
        statusBadge.textContent = status.toUpperCase();

        // Start Time
        const timestamp = document.createElement('div');
        timestamp.className = 'log-timestamp';
        timestamp.textContent = SharedUtils.formatTimestamp(query.query_start_time || query.start_time || query.event_time);
        timestamp.title = 'Query Start Time';

        // Query ID with copy icon
        const queryId = this.createQueryIdElement(query.query_id, (id) => this.jumpToLogHistory(id));

        // Content
        const content = document.createElement('div');
        content.className = 'log-content';

        // SQL Query with enhanced formatting
        const message = document.createElement('div');
        message.className = 'log-message query-message-enhanced';
        const fullQuery = query.query_text || 'No query text';
        
        const queryType = this.extractQueryType(fullQuery);
        const truncatedQuery = fullQuery.length > 120 ? fullQuery.substring(0, 120) + '...' : fullQuery;
        const highlightedTruncated = SharedUtils.highlightSearchTerms(SharedUtils.escapeHtml(truncatedQuery), this.searchQuery);
        
        message.innerHTML = `
            <div class="query-header">
                <span class="query-type-badge ${queryType.toLowerCase()}">${queryType}</span>
                ${this.getPerformanceIndicator(query)}
                ${query.scan_rows ? `<span class="query-stat-mini">📊 ${SharedUtils.formatNumber(query.scan_rows)} rows</span>` : ''}
                ${query.result_bytes ? `<span class="query-stat-mini">💾 ${this.formatBytes(query.result_bytes)}</span>` : ''}
            </div>
            <div class="message-preview">${highlightedTruncated}</div>
        `;

        // Expand/Collapse button for all queries
        const expandBtn = document.createElement('button');
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

        // Meta information
        const meta = this.createQueryMeta(query);
        content.appendChild(message);

        // Expanded content
        const expandedContent = this.createQueryExpandedContent(fullQuery, meta, query);

        // Add elements to entry
        entry.appendChild(statusBadge);
        entry.appendChild(timestamp);
        entry.appendChild(queryId);
        entry.appendChild(content);
        entry.appendChild(expandedContent);

        // Click handlers - all queries use inline expansion
        entry.style.cursor = 'pointer';
        entry.onclick = (e) => {
            const isExpanded = entry.classList.contains('expanded');
            const clickingExpandedContent = e.target.closest('.log-expanded-content');
            
            if (!e.target.closest('.expand-icon-btn') && !e.target.closest('.copy-icon') && !e.target.closest('.query-id-clickable') && !(isExpanded && clickingExpandedContent)) {
                this.toggleQueryExpansion(entry, expandBtn);
            }
        };

        return entry;
    }

    createQueryIdElement(queryIdText, onClickCallback) {
        const queryId = document.createElement('div');
        queryId.className = 'log-query-id';
        
        if (queryIdText && queryIdText !== '-') {
            const queryIdSpan = document.createElement('span');
            queryIdSpan.textContent = queryIdText;
            queryIdSpan.className = 'query-id-clickable';
            queryIdSpan.style.cursor = 'pointer';
            queryIdSpan.title = 'Click to view logs for this Query ID';
            queryIdSpan.addEventListener('click', (e) => {
                e.stopPropagation();
                onClickCallback(queryIdText);
            });
            
            const copyIcon = document.createElement('svg');
            copyIcon.className = 'copy-icon';
            copyIcon.setAttribute('width', '14');
            copyIcon.setAttribute('height', '14');
            copyIcon.setAttribute('viewBox', '0 0 24 24');
            copyIcon.setAttribute('fill', 'none');
            copyIcon.setAttribute('stroke', 'currentColor');
            copyIcon.setAttribute('stroke-width', '2');
            copyIcon.innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>';
            
            const copySuccess = document.createElement('span');
            copySuccess.className = 'copy-success';
            copySuccess.textContent = 'Copied!';
            
            copyIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                SharedUtils.copyToClipboard(queryIdText, copySuccess);
            });
            
            queryId.appendChild(queryIdSpan);
            queryId.appendChild(copyIcon);
            queryId.appendChild(copySuccess);
        } else {
            queryId.textContent = '-';
        }

        return queryId;
    }

    createQueryMeta(query) {
        const meta = document.createElement('div');
        meta.className = 'log-meta';
        meta.style.display = 'none';

        const metaItems = [];
        const startTime = query.query_start_time || query.start_time || query.event_time;
        
        if (startTime) metaItems.push(`<div class="log-meta-item execution"><span class="meta-icon">🕒</span><span class="meta-label">Start Time:</span> <span class="meta-value">${SharedUtils.formatTimestamp(startTime, true)}</span></div>`);
        if (query.duration_ms) metaItems.push(`<div class="log-meta-item performance"><span class="meta-icon">⏱️</span><span class="meta-label">Duration:</span> <span class="meta-value">${query.duration_ms.toLocaleString()} ms</span></div>`);
        if (query.sql_user) metaItems.push(`<div class="log-meta-item context"><span class="meta-icon">👤</span><span class="meta-label">User:</span> <span class="meta-value">${SharedUtils.escapeHtml(query.sql_user)}</span></div>`);
        if (query.current_database) metaItems.push(`<div class="log-meta-item context"><span class="meta-icon">🗄️</span><span class="meta-label">Database:</span> <span class="meta-value">${SharedUtils.escapeHtml(query.current_database)}</span></div>`);
        if (query.result_rows) metaItems.push(`<div class="log-meta-item performance"><span class="meta-icon">📊</span><span class="meta-label">Result Rows:</span> <span class="meta-value">${SharedUtils.formatNumber(query.result_rows)}</span></div>`);
        if (query.result_bytes) metaItems.push(`<div class="log-meta-item performance"><span class="meta-icon">💾</span><span class="meta-label">Result Size:</span> <span class="meta-value">${this.formatBytes(query.result_bytes)}</span></div>`);
        if (query.scan_rows) metaItems.push(`<div class="log-meta-item performance"><span class="meta-icon">🔍</span><span class="meta-label">Scanned Rows:</span> <span class="meta-value">${SharedUtils.formatNumber(query.scan_rows)}</span></div>`);
        if (query.scan_bytes) metaItems.push(`<div class="log-meta-item performance"><span class="meta-icon">💽</span><span class="meta-label">Scanned Data:</span> <span class="meta-value">${this.formatBytes(query.scan_bytes)}</span></div>`);
        if (query.exception_text) metaItems.push(`<div class="log-meta-item error"><span class="meta-icon">⚠️</span><span class="meta-label">Error:</span> <span class="meta-value error-text">${SharedUtils.escapeHtml(query.exception_text)}</span></div>`);
        
        meta.innerHTML = metaItems.join('');
        return meta;
    }

    createQueryExpandedContent(fullQuery, meta, query) {
        const expandedContent = document.createElement('div');
        expandedContent.className = 'log-expanded-content';
        expandedContent.style.display = 'none';
        
        // Add SQL query section first
        const expandedMessage = document.createElement('div');
        expandedMessage.className = 'message-full-content sql-formatted';
        
        const copyAllBtn = document.createElement('button');
        copyAllBtn.className = 'copy-all-btn';
        copyAllBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
        `;
        
        const copySuccess = document.createElement('span');
        copySuccess.className = 'copy-success';
        copySuccess.textContent = 'Copied!';
        copySuccess.style.display = 'none';
        copyAllBtn.appendChild(copySuccess);
        
        copyAllBtn.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            if (navigator.clipboard) {
                navigator.clipboard.writeText(fullQuery).then(() => {
                    copySuccess.style.display = 'inline';
                    copySuccess.style.opacity = '1';
                    setTimeout(() => {
                        copySuccess.style.opacity = '0';
                        setTimeout(() => {
                            copySuccess.style.display = 'none';
                        }, 200);
                    }, 1500);
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                    SharedUtils.fallbackCopyToClipboard(fullQuery);
                });
            } else {
                SharedUtils.fallbackCopyToClipboard(fullQuery);
            }
        };
        
        expandedMessage.style.position = 'relative';
        expandedMessage.appendChild(copyAllBtn);
        
        const formattedQuery = SharedUtils.formatSQLQuery(fullQuery);
        const codeElement = document.createElement('code');
        codeElement.textContent = formattedQuery;
        expandedMessage.appendChild(codeElement);
        
        expandedContent.appendChild(expandedMessage);
        
        // Add detailed query information section below SQL
        const detailsSection = document.createElement('div');
        detailsSection.className = 'log-expanded-meta';
        
        const startTime = query.query_start_time || query.start_time || query.event_time;
        const details = [
            { label: 'Query ID', value: query.query_id },
            { label: 'Start Time', value: SharedUtils.formatTimestamp(startTime) },
            { label: 'User', value: query.sql_user || '-' },
            { label: 'Database', value: query.current_database || '-' },
            { label: 'Status', value: query.status === 'error' ? 'Error' : 'Success' },
            { label: 'Duration', value: query.duration_ms ? `${query.duration_ms.toLocaleString()} ms` : '-' },
            { label: 'Exception Code', value: query.exception_code || '-' },
            { label: 'Exception Message', value: query.exception_text || '-' }
        ];
        
        details.forEach(detail => {
            const metaItem = document.createElement('div');
            metaItem.className = 'log-meta-item';
            metaItem.innerHTML = `<span class="meta-label">${detail.label}:</span> <span class="meta-value">${SharedUtils.escapeHtml(detail.value)}</span>`;
            detailsSection.appendChild(metaItem);
        });
        
        expandedContent.appendChild(detailsSection);
        
        return expandedContent;
    }

    toggleQueryExpansion(entry, expandBtn) {
        const messagePreview = entry.querySelector('.message-preview');
        const expandedContent = entry.querySelector('.log-expanded-content');
        
        const isExpanded = expandedContent.style.display !== 'none';
        
        if (isExpanded) {
            messagePreview.style.display = 'block';
            expandedContent.style.display = 'none';
            entry.classList.remove('expanded');
            expandBtn.querySelector('.expand-icon').style.transform = 'rotate(0deg)';
        } else {
            messagePreview.style.display = 'none';
            expandedContent.style.display = 'block';
            entry.classList.add('expanded');
            expandBtn.querySelector('.expand-icon').style.transform = 'rotate(180deg)';
        }
    }

    closeModal() {
        const modal = document.getElementById('modal-overlay');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    updateStats() {
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
                    element.textContent = SharedUtils.formatNumber(this.stats[key]);
                }
            }
        });
    }

    updateQueriesCount() {
        const queriesCount = document.getElementById(this.config.countElementId);
        if (queriesCount) {
            const total = this.totalRecords || 0;
            const start = total > 0 ? (this.currentPage - 1) * this.pageSize + 1 : 0;
            const end = Math.min(start + this.pageSize - 1, total);
            
            if (total === 0) {
                queriesCount.textContent = 'No queries found';
            } else {
                queriesCount.textContent = `Showing ${start}-${end} of ${SharedUtils.formatNumber(total)} queries`;
            }
        }
    }

    generateTimeChart(timeDistribution) {
        const colorMap = {
            'error': 'var(--error)',
            'success': 'var(--success)'
        };
        
        SharedUtils.generateTimeChart(
            timeDistribution, 
            this.config.chartContainerId, 
            this.config.chartTitleId, 
            this.totalRecords, 
            colorMap
        );
    }

    jumpToLogHistory(queryId) {
        if (window.tabManager) {
            window.tabManager.setActiveTab('logs');
        }
        
        if (window.logObserver) {
            window.logObserver.filterByQueryId(queryId);
        }
    }

    // Helper methods
    extractQueryType(query) {
        if (!query) return 'UNKNOWN';
        const upperQuery = query.toUpperCase().trim();
        const types = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'SHOW', 'DESCRIBE', 'EXPLAIN'];
        return types.find(type => upperQuery.startsWith(type)) || 'QUERY';
    }

    getPerformanceIndicator(query) {
        if (!query.duration_ms) return '';
        
        const duration = query.duration_ms;
        let indicator = '';
        let className = '';
        
        if (duration < 100) {
            indicator = '🟢';
            className = 'fast';
        } else if (duration < 1000) {
            indicator = '🟡';
            className = 'medium';
        } else if (duration < 5000) {
            indicator = '🟠';
            className = 'slow';
        } else {
            indicator = '🔴';
            className = 'very-slow';
        }
        
        return `<span class="performance-indicator ${className}" title="Duration: ${duration}ms">${indicator} ${duration}ms</span>`;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Keep loadQueries method for backward compatibility
    loadQueries() {
        return this.loadData();
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    window.tabManager = new TabManager();
    window.logObserver = new LogObserver();
    window.queryObserver = new QueryObserver();
    
    const activeTabButton = document.querySelector('.tab-button.active');
    if (activeTabButton) {
        window.tabManager.setActiveTab(activeTabButton.dataset.tab);
    } else {
        window.tabManager.setActiveTab('logs');
    }
});
