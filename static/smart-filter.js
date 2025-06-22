// SmartFilter.js - Version 3.0.2 - 2025-06-22 19:58
// Smart Filter Component for Advanced WHERE Conditions with dropdown suggestions
console.log('SmartFilter.js Version 3.0.2 loaded at', new Date().toLocaleTimeString());

class SmartFilter {
    constructor(containerId, tableType = 'logs', onFilterChange, placeholder = 'Enter filter condition...', addFilterButtonId) {
        console.log('SmartFilter v3.0.2 initializing for container:', containerId, 'tableType:', tableType, 'buttonId:', addFilterButtonId);
        
        this.containerId = containerId;
        this.tableType = tableType;
        this.onFilterChange = onFilterChange;
        this.placeholder = placeholder;
        this.filters = [];
        this.nextFilterId = 1;
        this.isDropdownOpen = false;
        this.elementIds = {};
        this.addFilterButtonId = addFilterButtonId;
        
        this.init();
        console.log('SmartFilter v3.0.2 initialization complete for:', containerId, 'with button:', addFilterButtonId);
    }
    
    init() {
        this.createFilterInterface();
        this.createAddButton();
    }
    
    createAddButton() {
        // Don't create a new button - use the existing one from HTML
        // The button is already in the HTML template with the correct ID
        console.log('Looking for add filter button with ID:', this.addFilterButtonId);
        const existingButton = document.getElementById(this.addFilterButtonId);
        if (existingButton) {
            console.log('Found add filter button:', existingButton);
            // Remove any existing event listeners and add our handler
            existingButton.onclick = () => {
                console.log('Add filter button clicked');
                this.showFilterInput();
            };
        } else {
            console.warn('Add filter button not found:', this.addFilterButtonId);
        }
        
        // Ensure initialization is complete
        if (!this.elementIds.input) {
            this.init();
        }
    }
    
    createFilterInterface() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error('Container not found:', this.containerId);
            return;
        }
        
        const uniqueId = Math.random().toString(36).substr(2, 9);
        const inputContainerId = `smart-filter-input-container-${uniqueId}`;
        const inputId = `smart-filter-input-${uniqueId}`;
        const dropdownId = `smart-filter-dropdown-${uniqueId}`;
        const activeFiltersId = `active-filters-${uniqueId}`;
        const wrapperId = `smart-filter-wrapper-${uniqueId}`;
        
        this.elementIds = {
            inputContainer: inputContainerId,
            input: inputId,
            dropdown: dropdownId,
            activeFilters: activeFiltersId,
            wrapper: wrapperId
        };
        
        // Create input container and active filters container
        container.innerHTML = `
            <div class="smart-filter-input-container" style="display: none;" id="${inputContainerId}">
                <div class="smart-filter-input-wrapper" id="${wrapperId}">
                    <input type="text" 
                           class="smart-filter-input" 
                           id="${inputId}" 
                           placeholder="${this.placeholder}"
                           autocomplete="off">
                </div>
            </div>
            
            <div class="smart-filter-active-filters" id="${activeFiltersId}">
                <!-- Active filters will be displayed here -->
            </div>
        `;
        
        // Attach dropdown to body to avoid overflow hidden issues
        const dropdownHtml = `
            <div class="smart-filter-dropdown" id="${dropdownId}" style="display: none; position: fixed; z-index: 9999;">
                <!-- Suggestions will be populated here -->
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', dropdownHtml);
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const input = document.getElementById(this.elementIds.input);
        const dropdown = document.getElementById(this.elementIds.dropdown);
        
        if (!input || !dropdown) {
            console.error('Input or dropdown element not found');
            return;
        }
        
        // Input events
        input.addEventListener('input', (e) => {
            this.updateDropdownContent(e.target.value);
            if (!this.isDropdownOpen) {
                this.showDropdown();
            }
        });
        
        input.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
        
        input.addEventListener('focus', () => {
            if (!this.isDropdownOpen) {
                this.updateDropdownContent('');
                this.showDropdown();
            }
        });
        
        input.addEventListener('click', () => {
            if (!this.isDropdownOpen) {
                this.updateDropdownContent('');
                this.showDropdown();
            }
        });
        
        input.addEventListener('blur', () => {
            // Delay hiding to allow dropdown clicks
            setTimeout(() => {
                this.hideDropdown();
            }, 150);
        });
        
        // Click outside to hide dropdown
        document.addEventListener('click', (e) => {
            const inputContainer = document.getElementById(this.elementIds.inputContainer);
            if (inputContainer && !inputContainer.contains(e.target) && !dropdown.contains(e.target)) {
                this.hideDropdown();
            }
        });
    }
    
    handleKeyDown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.addFilterFromInput();
        } else if (e.key === 'Escape') {
            this.hideDropdown();
        }
    }
    
    showFilterInput() {
        console.log('SmartFilter v3.0.0 - showFilterInput called');
        const container = document.getElementById(this.elementIds.inputContainer);
        if (container) {
            container.style.display = 'block';
            const input = document.getElementById(this.elementIds.input);
            if (input) {
                input.focus();
                // Small delay to prevent duplicate calls
                setTimeout(() => {
                    if (!this.isDropdownOpen) {
                        this.updateDropdownContent('');
                        this.showDropdown();
                    }
                }, 50);
            }
        }
    }
    
    updateDropdownContent(value) {
        const dropdown = document.getElementById(this.elementIds.dropdown);
        
        if (typeof FilterHelper === 'undefined') {
            dropdown.innerHTML = '<div class="empty-state">FilterHelper not loaded</div>';
            return;
        }
        
        const suggestions = FilterHelper.generateSuggestions(value, this.tableType);
        
        if (suggestions.length === 0) {
            dropdown.innerHTML = '<div class="empty-state">No suggestions available</div>';
            return;
        }
        
        const grouped = suggestions.reduce((acc, suggestion) => {
            const type = suggestion.type || 'other';
            if (!acc[type]) acc[type] = [];
            acc[type].push(suggestion);
            return acc;
        }, {});
        
        let html = '';
        
        if (grouped.field) {
            html += `
                <div class="dropdown-group">
                    <div class="dropdown-group-header">Available Fields</div>
                    ${grouped.field.map(item => `
                        <div class="dropdown-item" data-value="${this.escapeHtml(item.text)}">
                            <div class="dropdown-item-name">${this.escapeHtml(item.text)}</div>
                            <div class="dropdown-item-type">${this.escapeHtml(item.fieldType || 'string')}</div>
                            <div class="dropdown-item-description">${this.escapeHtml(item.description)}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (grouped.operator) {
            html += `
                <div class="dropdown-group">
                    <div class="dropdown-group-header">SQL Operators</div>
                    ${grouped.operator.map(item => `
                        <div class="dropdown-item" data-value="${this.escapeHtml(item.text)}">
                            <div class="dropdown-item-name">${this.escapeHtml(item.text)}</div>
                            <div class="dropdown-item-description">${this.escapeHtml(item.description)}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (grouped.value) {
            html += `
                <div class="dropdown-group">
                    <div class="dropdown-group-header">Suggested Values</div>
                    ${grouped.value.map(item => `
                        <div class="dropdown-item" data-value="${this.escapeHtml(item.text)}">
                            <div class="dropdown-item-name">${this.escapeHtml(item.text)}</div>
                            <div class="dropdown-item-description">${this.escapeHtml(item.description)}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        dropdown.innerHTML = html;
        
        // Attach click listeners to dropdown items
        dropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectDropdownItem(item);
            });
        });
    }
    
    selectDropdownItem(item) {
        const value = item.dataset.value;
        const input = document.getElementById(this.elementIds.input);
        if (input && value) {
            input.value = value;
            input.focus();
            this.hideDropdown();
        }
    }
    
    addFilterFromInput() {
        const input = document.getElementById(this.elementIds.input);
        if (input && input.value.trim()) {
            this.addFilter(input.value.trim());
            input.value = '';
            this.hideDropdown();
        }
    }
    
    addFilter(condition) {
        const filter = {
            id: this.nextFilterId++,
            condition: condition,
            isValid: this.validateFilter(condition),
            error: this.validateFilter(condition) ? null : 'Invalid filter syntax'
        };
        
        this.filters.push(filter);
        this.renderActiveFilters();
        this.notifyFilterChange();
    }
    
    removeFilter(filterId) {
        this.filters = this.filters.filter(f => f.id != filterId);
        this.renderActiveFilters();
        this.notifyFilterChange();
    }
    
    validateFilter(condition) {
        // Basic validation - can be enhanced
        return condition && condition.trim().length > 0;
    }
    
    notifyFilterChange() {
        if (this.onFilterChange) {
            const validFilters = this.filters.filter(f => f.isValid);
            this.onFilterChange(validFilters.map(f => f.condition));
        }
    }
    
    renderActiveFilters() {
        const container = document.getElementById(this.elementIds.activeFilters);
        if (!container) {
            console.error('Active filters container not found');
            return;
        }
        
        if (this.filters.length === 0) {
            const exampleFilters = [
                { text: 'level = "ERROR"', description: 'Show only error logs' },
                { text: 'timestamp > "2024-01-01"', description: 'Recent logs' },
                { text: 'message LIKE "%exception%"', description: 'Find exceptions' },
                { text: 'level IN ("ERROR", "WARN")', description: 'Errors and warnings' }
            ];
            
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-text">No active filters. Try these examples:</div>
                    <div class="example-filters">
                        ${exampleFilters.map(example => `
                            <button class="example-filter-btn" data-filter="${this.escapeHtml(example.text)}" title="${this.escapeHtml(example.description)}">
                                ${this.escapeHtml(example.text)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
            
            // Attach click listeners to example filter buttons
            container.querySelectorAll('.example-filter-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const filterText = btn.dataset.filter;
                    this.showFilterInput();
                    const input = document.getElementById(this.elementIds.input);
                    if (input) {
                        input.value = filterText;
                        input.focus();
                        // Trigger input event to show suggestions
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                });
            });
        } else {
            container.innerHTML = this.filters.map(filter => `
                <div class="filter-tag ${filter.isValid ? 'valid' : 'invalid'}" data-filter-id="${filter.id}">
                    <span>${this.escapeHtml(filter.condition)}</span>
                    <button class="filter-tag-remove" data-filter-id="${filter.id}"></button>
                    ${!filter.isValid ? `<div class="smart-filter-error">${this.escapeHtml(filter.error)}</div>` : ''}
                </div>
            `).join('');
            
            // Attach remove button listeners
            container.querySelectorAll('.filter-tag-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeFilter(btn.dataset.filterId);
                });
            });
        }
    }
    
    showDropdown() {
        console.log('SmartFilter v3.0.2 - showDropdown called');
        const dropdown = document.getElementById(this.elementIds.dropdown);
        const inputWrapper = document.getElementById(this.elementIds.wrapper);
        
        console.log('Dropdown element:', dropdown);
        console.log('Input wrapper element:', inputWrapper);
        console.log('Dropdown ID:', this.elementIds.dropdown);
        
        if (dropdown && inputWrapper) {
            // Get input wrapper position for fixed positioning
            const inputRect = inputWrapper.getBoundingClientRect();
            console.log('Input rect:', inputRect);
            
            // Position dropdown using fixed positioning
            dropdown.style.display = 'block';
            dropdown.style.position = 'fixed';
            dropdown.style.top = `${inputRect.bottom + 2}px`;
            dropdown.style.left = `${inputRect.left}px`;
            dropdown.style.width = `${inputRect.width}px`;
            dropdown.style.zIndex = '9999';
            
            console.log('Dropdown positioned at:', {
                top: dropdown.style.top,
                left: dropdown.style.left,
                width: dropdown.style.width,
                display: dropdown.style.display
            });
            
            this.isDropdownOpen = true;
            console.log('SmartFilter v3.0.2 - dropdown displayed, content length:', dropdown.innerHTML.length);
        } else {
            console.error('SmartFilter v3.0.2 - dropdown or input wrapper not found');
            console.error('Available element IDs:', this.elementIds);
        }
    }
    
    hideDropdown() {
        const dropdown = document.getElementById(this.elementIds.dropdown);
        if (dropdown) {
            dropdown.style.display = 'none';
            this.isDropdownOpen = false;
        }
    }
    
    // Utility method to escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Get placeholder text based on table type
    getPlaceholder() {
        const placeholders = {
            logs: 'e.g., level = "ERROR" OR message LIKE "%timeout%"',
            queries: 'e.g., query_type = "SELECT" AND duration > 1000'
        };
        return placeholders[this.tableType] || 'Enter filter condition...';
    }
    
    // Cleanup method to remove dropdown from body
    cleanup() {
        const dropdown = document.getElementById(this.elementIds.dropdown);
        if (dropdown && dropdown.parentElement === document.body) {
            dropdown.remove();
        }
    }
    
    // Public API methods
    getFilters() {
        return this.filters.filter(f => f.isValid).map(f => f.condition);
    }
    
    clearFilters() {
        this.filters = [];
        this.renderActiveFilters();
        this.notifyFilterChange();
    }
    
    setFilters(conditions) {
        this.filters = conditions.map((condition, index) => ({
            id: this.nextFilterId++,
            condition: condition,
            isValid: this.validateFilter(condition),
            error: this.validateFilter(condition) ? null : 'Invalid filter syntax'
        }));
        this.renderActiveFilters();
        this.notifyFilterChange();
    }
}

// Export for Node.js if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartFilter;
}
