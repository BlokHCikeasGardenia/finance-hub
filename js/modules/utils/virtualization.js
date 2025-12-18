// Virtualization Module
// Provides virtualization for long lists, tables, and images to improve performance

// Virtualization configuration
const VIRTUALIZATION_CONFIG = {
    // Table virtualization
    TABLE_ROW_HEIGHT: 50, // px
    TABLE_BUFFER_SIZE: 10, // number of rows to render outside viewport
    
    // List virtualization
    LIST_ITEM_HEIGHT: 40, // px
    LIST_BUFFER_SIZE: 5,
    
    // Image lazy loading
    IMAGE_THRESHOLD: 0.1, // Intersection Observer threshold
    IMAGE_ROOT_MARGIN: '50px', // Load images 50px before they enter viewport
    
    // Dropdown virtualization
    DROPDOWN_ITEM_HEIGHT: 36, // px
    DROPDOWN_MAX_VISIBLE_ITEMS: 8
};

/**
 * Virtualized Table Component
 */
export class VirtualizedTable {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            rowHeight: options.rowHeight || VIRTUALIZATION_CONFIG.TABLE_ROW_HEIGHT,
            bufferSize: options.bufferSize || VIRTUALIZATION_CONFIG.TABLE_BUFFER_SIZE,
            data: options.data || [],
            renderRow: options.renderRow,
            ...options
        };
        
        this.init();
    }
    
    init() {
        this.setupContainer();
        this.setupScrollHandler();
        this.render();
    }
    
    setupContainer() {
        this.container.style.position = 'relative';
        this.container.style.overflow = 'auto';
        this.container.style.height = this.options.height || '400px';
        
        // Create virtual container
        this.virtualContainer = document.createElement('div');
        this.virtualContainer.style.position = 'relative';
        this.virtualContainer.style.width = '100%';
        this.container.appendChild(this.virtualContainer);
        
        // Create content container
        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'virtualized-content';
        this.virtualContainer.appendChild(this.contentContainer);
    }
    
    setupScrollHandler() {
        this.scrollHandler = this.handleScroll.bind(this);
        this.container.addEventListener('scroll', this.scrollHandler, { passive: true });
    }
    
    handleScroll() {
        this.render();
    }
    
    render() {
        const scrollTop = this.container.scrollTop;
        const containerHeight = this.container.clientHeight;
        
        const totalRows = this.options.data.length;
        const totalHeight = totalRows * this.options.rowHeight;
        
        // Calculate visible range
        const startIndex = Math.max(0, Math.floor(scrollTop / this.options.rowHeight) - this.options.bufferSize);
        const endIndex = Math.min(totalRows - 1, Math.ceil((scrollTop + containerHeight) / this.options.rowHeight) + this.options.bufferSize);
        
        // Set virtual container height
        this.virtualContainer.style.height = `${totalHeight}px`;
        this.virtualContainer.style.top = `${startIndex * this.options.rowHeight}px`;
        
        // Render visible rows
        const visibleData = this.options.data.slice(startIndex, endIndex + 1);
        
        this.contentContainer.innerHTML = '';
        visibleData.forEach((item, index) => {
            const rowElement = this.options.renderRow(item, startIndex + index);
            rowElement.style.height = `${this.options.rowHeight}px`;
            rowElement.style.display = 'block';
            this.contentContainer.appendChild(rowElement);
        });
    }
    
    updateData(newData) {
        this.options.data = newData;
        this.render();
    }
    
    destroy() {
        this.container.removeEventListener('scroll', this.scrollHandler);
        this.container.innerHTML = '';
    }
}

/**
 * Virtualized List Component
 */
export class VirtualizedList {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            itemHeight: options.itemHeight || VIRTUALIZATION_CONFIG.LIST_ITEM_HEIGHT,
            bufferSize: options.bufferSize || VIRTUALIZATION_CONFIG.LIST_BUFFER_SIZE,
            data: options.data || [],
            renderItem: options.renderItem,
            ...options
        };
        
        this.init();
    }
    
    init() {
        this.setupContainer();
        this.setupScrollHandler();
        this.render();
    }
    
    setupContainer() {
        this.container.style.position = 'relative';
        this.container.style.overflow = 'auto';
        this.container.style.height = this.options.height || '300px';
        
        // Create virtual container
        this.virtualContainer = document.createElement('div');
        this.virtualContainer.style.position = 'relative';
        this.virtualContainer.style.width = '100%';
        this.container.appendChild(this.virtualContainer);
        
        // Create content container
        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'virtualized-list-content';
        this.virtualContainer.appendChild(this.contentContainer);
    }
    
    setupScrollHandler() {
        this.scrollHandler = this.handleScroll.bind(this);
        this.container.addEventListener('scroll', this.scrollHandler, { passive: true });
    }
    
    handleScroll() {
        this.render();
    }
    
    render() {
        const scrollTop = this.container.scrollTop;
        const containerHeight = this.container.clientHeight;
        
        const totalItems = this.options.data.length;
        const totalHeight = totalItems * this.options.itemHeight;
        
        // Calculate visible range
        const startIndex = Math.max(0, Math.floor(scrollTop / this.options.itemHeight) - this.options.bufferSize);
        const endIndex = Math.min(totalItems - 1, Math.ceil((scrollTop + containerHeight) / this.options.itemHeight) + this.options.bufferSize);
        
        // Set virtual container height
        this.virtualContainer.style.height = `${totalHeight}px`;
        this.virtualContainer.style.top = `${startIndex * this.options.itemHeight}px`;
        
        // Render visible items
        const visibleData = this.options.data.slice(startIndex, endIndex + 1);
        
        this.contentContainer.innerHTML = '';
        visibleData.forEach((item, index) => {
            const itemElement = this.options.renderItem(item, startIndex + index);
            itemElement.style.height = `${this.options.itemHeight}px`;
            itemElement.style.display = 'block';
            this.contentContainer.appendChild(itemElement);
        });
    }
    
    updateData(newData) {
        this.options.data = newData;
        this.render();
    }
    
    destroy() {
        this.container.removeEventListener('scroll', this.scrollHandler);
        this.container.innerHTML = '';
    }
}

/**
 * Image Lazy Loading
 */
export class ImageLazyLoader {
    constructor() {
        this.init();
    }
    
    init() {
        this.setupObserver();
        this.loadVisibleImages();
    }
    
    setupObserver() {
        const options = {
            root: null, // viewport
            rootMargin: VIRTUALIZATION_CONFIG.IMAGE_ROOT_MARGIN,
            threshold: VIRTUALIZATION_CONFIG.IMAGE_THRESHOLD
        };
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }, options);
    }
    
    loadImage(imgElement) {
        const src = imgElement.dataset.src;
        if (src) {
            imgElement.src = src;
            imgElement.classList.remove('lazy');
            imgElement.classList.add('loaded');
        }
    }
    
    observeImage(imgElement) {
        this.observer.observe(imgElement);
    }
    
    loadVisibleImages() {
        const lazyImages = document.querySelectorAll('img.lazy');
        lazyImages.forEach(img => this.observeImage(img));
    }
    
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

/**
 * Virtualized Dropdown Component
 */
export class VirtualizedDropdown {
    constructor(selectElement, options = {}) {
        this.selectElement = selectElement;
        this.options = {
            itemHeight: options.itemHeight || VIRTUALIZATION_CONFIG.DROPDOWN_ITEM_HEIGHT,
            maxVisibleItems: options.maxVisibleItems || VIRTUALIZATION_CONFIG.DROPDOWN_MAX_VISIBLE_ITEMS,
            ...options
        };
        
        this.init();
    }
    
    init() {
        this.createVirtualDropdown();
        this.setupEventListeners();
    }
    
    createVirtualDropdown() {
        // Create custom dropdown structure
        this.dropdownContainer = document.createElement('div');
        this.dropdownContainer.className = 'virtualized-dropdown-container';
        this.dropdownContainer.style.position = 'relative';
        
        // Create trigger button
        this.triggerButton = document.createElement('button');
        this.triggerButton.className = 'virtualized-dropdown-trigger';
        this.triggerButton.textContent = this.selectElement.options[this.selectElement.selectedIndex]?.text || 'Pilih...';
        this.triggerButton.style.width = '100%';
        this.triggerButton.style.padding = '8px 12px';
        this.triggerButton.style.border = '1px solid #ccc';
        this.triggerButton.style.borderRadius = '4px';
        this.triggerButton.style.background = 'white';
        this.triggerButton.style.cursor = 'pointer';
        
        // Create dropdown panel
        this.dropdownPanel = document.createElement('div');
        this.dropdownPanel.className = 'virtualized-dropdown-panel';
        this.dropdownPanel.style.position = 'absolute';
        this.dropdownPanel.style.top = '100%';
        this.dropdownPanel.style.left = '0';
        this.dropdownPanel.style.right = '0';
        this.dropdownPanel.style.background = 'white';
        this.dropdownPanel.style.border = '1px solid #ccc';
        this.dropdownPanel.style.borderRadius = '4px';
        this.dropdownPanel.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        this.dropdownPanel.style.zIndex = '1000';
        this.dropdownPanel.style.display = 'none';
        this.dropdownPanel.style.maxHeight = `${this.options.itemHeight * this.options.maxVisibleItems}px`;
        this.dropdownPanel.style.overflow = 'auto';
        
        // Create search input
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.placeholder = 'Cari...';
        this.searchInput.style.width = '100%';
        this.searchInput.style.padding = '8px';
        this.searchInput.style.borderBottom = '1px solid #eee';
        this.searchInput.style.boxSizing = 'border-box';
        
        // Create content container
        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'virtualized-dropdown-content';
        this.contentContainer.style.position = 'relative';
        
        this.dropdownPanel.appendChild(this.searchInput);
        this.dropdownPanel.appendChild(this.contentContainer);
        this.dropdownContainer.appendChild(this.triggerButton);
        this.dropdownContainer.appendChild(this.dropdownPanel);
        
        // Replace select element with custom dropdown
        this.selectElement.style.display = 'none';
        this.selectElement.parentNode.insertBefore(this.dropdownContainer, this.selectElement.nextSibling);
        
        // Populate dropdown
        this.populateDropdown();
    }
    
    populateDropdown() {
        this.originalOptions = Array.from(this.selectElement.options).map(option => ({
            value: option.value,
            text: option.text
        }));
        
        this.filteredOptions = [...this.originalOptions];
        this.renderDropdown();
    }
    
    renderDropdown() {
        const scrollTop = this.dropdownPanel.scrollTop;
        const panelHeight = this.dropdownPanel.clientHeight;
        
        const totalItems = this.filteredOptions.length;
        const totalHeight = totalItems * this.options.itemHeight;
        
        // Calculate visible range
        const startIndex = Math.max(0, Math.floor(scrollTop / this.options.itemHeight));
        const endIndex = Math.min(totalItems - 1, Math.ceil((scrollTop + panelHeight) / this.options.itemHeight));
        
        // Set virtual container height
        this.contentContainer.style.height = `${totalHeight}px`;
        
        // Render visible items
        const visibleOptions = this.filteredOptions.slice(startIndex, endIndex + 1);
        
        // Clear and rebuild
        this.contentContainer.innerHTML = '';
        
        visibleOptions.forEach((option, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'virtualized-dropdown-item';
            itemElement.style.height = `${this.options.itemHeight}px`;
            itemElement.style.padding = '8px 12px';
            itemElement.style.cursor = 'pointer';
            itemElement.style.display = 'flex';
            itemElement.style.alignItems = 'center';
            itemElement.style.borderBottom = '1px solid #f0f0f0';
            itemElement.textContent = option.text;
            
            itemElement.addEventListener('click', () => {
                this.selectOption(option);
            });
            
            itemElement.style.top = `${(startIndex + index) * this.options.itemHeight}px`;
            this.contentContainer.appendChild(itemElement);
        });
    }
    
    setupEventListeners() {
        // Toggle dropdown
        this.triggerButton.addEventListener('click', () => {
            this.toggleDropdown();
        });
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.dropdownContainer.contains(e.target)) {
                this.closeDropdown();
            }
        });
        
        // Search functionality
        this.searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        
        // Virtualization scroll
        this.dropdownPanel.addEventListener('scroll', () => {
            this.renderDropdown();
        });
    }
    
    handleSearch(searchTerm) {
        if (!searchTerm.trim()) {
            this.filteredOptions = [...this.originalOptions];
        } else {
            this.filteredOptions = this.originalOptions.filter(option =>
                option.text.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        // Reset scroll and re-render
        this.dropdownPanel.scrollTop = 0;
        this.renderDropdown();
    }
    
    selectOption(option) {
        // Update select element
        this.selectElement.value = option.value;
        
        // Update trigger button text
        this.triggerButton.textContent = option.text;
        
        // Dispatch change event
        this.selectElement.dispatchEvent(new Event('change'));
        
        // Close dropdown
        this.closeDropdown();
    }
    
    toggleDropdown() {
        if (this.dropdownPanel.style.display === 'none') {
            this.openDropdown();
        } else {
            this.closeDropdown();
        }
    }
    
    openDropdown() {
        this.dropdownPanel.style.display = 'block';
        this.renderDropdown();
        this.searchInput.focus();
        this.searchInput.select();
    }
    
    closeDropdown() {
        this.dropdownPanel.style.display = 'none';
    }
    
    destroy() {
        this.dropdownContainer.remove();
        this.selectElement.style.display = '';
    }
}

/**
 * Memory Usage Monitor
 */
export class MemoryMonitor {
    constructor(options = {}) {
        this.options = {
            checkInterval: options.checkInterval || 5000, // 5 seconds
            warningThreshold: options.warningThreshold || 50 * 1024 * 1024, // 50MB
            ...options
        };
        
        this.init();
    }
    
    init() {
        this.setupMemoryMonitoring();
    }
    
    setupMemoryMonitoring() {
        if ('memory' in performance) {
            this.memoryCheckInterval = setInterval(() => {
                this.checkMemoryUsage();
            }, this.options.checkInterval);
        }
    }
    
    checkMemoryUsage() {
        if ('memory' in performance) {
            const memory = performance.memory;
            const usedMB = memory.usedJSHeapSize / 1024 / 1024;
            
            if (usedMB > this.options.warningThreshold) {
                console.warn(`High memory usage detected: ${usedMB.toFixed(2)}MB`);
                
                // Trigger cleanup
                this.triggerCleanup();
            }
            
            // Log memory stats
            if (this.options.debug) {
                console.log(`Memory: ${usedMB.toFixed(2)}MB / ${memory.totalJSHeapSize / 1024 / 1024}MB`);
            }
        }
    }
    
    triggerCleanup() {
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
        
        // Clear caches
        if (window.cacheManager) {
            window.cacheManager.clearAll();
        }
        
        // Notify cleanup event
        window.dispatchEvent(new CustomEvent('memoryCleanup'));
    }
    
    destroy() {
        if (this.memoryCheckInterval) {
            clearInterval(this.memoryCheckInterval);
        }
    }
}

/**
 * Virtualization Manager - Unified virtualization operations
 */
export class VirtualizationManager {
    constructor() {
        this.components = new Map();
        this.memoryMonitor = new MemoryMonitor();
    }
    
    /**
     * Create virtualized table
     */
    createVirtualizedTable(container, options) {
        const table = new VirtualizedTable(container, options);
        this.components.set(`table-${Date.now()}`, table);
        return table;
    }
    
    /**
     * Create virtualized list
     */
    createVirtualizedList(container, options) {
        const list = new VirtualizedList(container, options);
        this.components.set(`list-${Date.now()}`, list);
        return list;
    }
    
    /**
     * Create virtualized dropdown
     */
    createVirtualizedDropdown(selectElement, options) {
        const dropdown = new VirtualizedDropdown(selectElement, options);
        this.components.set(`dropdown-${Date.now()}`, dropdown);
        return dropdown;
    }
    
    /**
     * Initialize image lazy loading
     */
    initImageLazyLoading() {
        if (!this.imageLazyLoader) {
            this.imageLazyLoader = new ImageLazyLoader();
        }
        return this.imageLazyLoader;
    }
    
    /**
     * Cleanup all virtualization components
     */
    cleanup() {
        this.components.forEach(component => {
            if (component.destroy) {
                component.destroy();
            }
        });
        this.components.clear();
        
        if (this.imageLazyLoader) {
            this.imageLazyLoader.destroy();
        }
        
        if (this.memoryMonitor) {
            this.memoryMonitor.destroy();
        }
    }
}

// Auto-initialize image lazy loading for existing images
document.addEventListener('DOMContentLoaded', () => {
    const virtualizationManager = new VirtualizationManager();
    virtualizationManager.initImageLazyLoading();
    
    // Make manager available globally
    window.virtualizationManager = virtualizationManager;
});

// Export default manager
export default new VirtualizationManager();
