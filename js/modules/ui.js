// UI Components and Navigation module for Keuangan RT Modern
// Handles navigation, modals, searchable selects, and UI utilities

import { supabase, APP_CONFIG } from './config.js';
import { showToast, debounce } from './utils.js';
import { isAuthenticated, showLoginModal, updateAuthUI } from './auth.js';

const ITEMS_PER_PAGE_OPTIONS = APP_CONFIG.ITEMS_PER_PAGE_OPTIONS;

// Navigation state
let currentSection = 'dashboard';

// Navigation functions
function showSection(sectionId) {
    // Check if section requires authentication
    const protectedSections = ['hunian', 'penghuni', 'lorong', 'kategori', 'rekening', 'pemasukan', 'pengeluaran', 'pemindahbukuan', 'admin'];

    if (protectedSections.includes(sectionId) && !isAuthenticated()) {
        showLoginModal();
        return;
    }

    // Define admin sections that should hide dashboard and views
    const adminSections = [
        'hunian', 'penghuni', 'lorong', 'kategori', 'subkategori', 'rekening', 'periode',
        'tarif_air', 'tarif_ipl', 'input_ipl', 'tagihan_ipl', 'tagihan_air', 'meteran_air_billing',
        'pemasukan', 'pengeluaran', 'dana_titipan', 'pemindahbukuan', 'pembayaran',
        'admin', 'laporan'
    ];

    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));

    // If showing admin section, hide dashboard and views sections completely
    if (adminSections.includes(sectionId)) {
        const dashboardSection = document.getElementById('dashboard');
        const viewsSection = document.getElementById('views');
        if (dashboardSection) {
            dashboardSection.classList.remove('active');
            dashboardSection.style.display = 'none';
        }
        if (viewsSection) {
            viewsSection.classList.remove('active');
            viewsSection.style.display = 'none';
        }
    } else {
        // If showing non-admin section, ensure dashboard and views are visible (if they should be)
        const dashboardSection = document.getElementById('dashboard');
        const viewsSection = document.getElementById('views');
        if (dashboardSection) dashboardSection.style.display = '';
        if (viewsSection) viewsSection.style.display = '';
    }

    // Show selected section
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.add('active');
        currentSection = sectionId;

        // Load content for the section
        loadSectionContent(sectionId);
    }
}

function showMultipleSections(sectionIds) {
    // Check authentication for protected sections
    const protectedSections = ['hunian', 'penghuni', 'lorong', 'kategori', 'rekening', 'pemasukan', 'pengeluaran', 'pemindahbukuan', 'admin'];

    for (const sectionId of sectionIds) {
        if (protectedSections.includes(sectionId) && !isAuthenticated()) {
            showLoginModal();
            return;
        }
    }

    // Hide all sections first
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));

    // Show multiple selected sections
    for (const sectionId of sectionIds) {
        const selectedSection = document.getElementById(sectionId);
        if (selectedSection) {
            selectedSection.classList.add('active');

            // Load content for the section
            loadSectionContent(sectionId);
        }
    }

    // Set current section to the first one (for navigation state)
    currentSection = sectionIds[0] || 'dashboard';
}

function getCurrentSection() {
    return currentSection;
}

// Section content loading - Delegates to sections.js for all content
async function loadSectionContent(sectionId) {
    const contentDiv = document.getElementById(`${sectionId}-content`);

    if (!contentDiv) {
        console.warn(`Content div for section ${sectionId} not found`);
        return;
    }

    // Clear existing content
    contentDiv.innerHTML = '';

    // Import sections.js and delegate all section loading there
    try {
        const { loadSectionContent: loadSectionsContent } = await import('./sections.js');
        await loadSectionsContent(sectionId);
    } catch (error) {
        console.error(`Error loading section ${sectionId}:`, error);
        contentDiv.innerHTML = '<p class="text-danger">Error loading section content</p>';
    }
}

// Modal functions
function showModal(title, content) {
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modal-body');

    if (!modalTitle || !modalBody) {
        console.warn('Modal elements not found');
        return;
    }

    modalTitle.textContent = title;
    modalBody.innerHTML = content;

    try {
        const modal = new bootstrap.Modal(document.getElementById('formModal'));
        modal.show();
    } catch (error) {
        console.error('Error showing modal:', error);
        showToast('Modal tidak tersedia', 'warning');
    }
}

function closeModal() {
    try {
        const modal = bootstrap.Modal.getInstance(document.getElementById('formModal'));
        if (modal) {
            modal.hide();
        }
    } catch (error) {
        console.warn('Error closing modal:', error);
    }
}

// Custom confirmation dialog - gets DOM elements dynamically
function showConfirm(message) {
    // Get DOM elements dynamically
    const confirmModal = document.getElementById('confirmModal');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmYesBtn = document.getElementById('confirm-yes');

    if (!confirmModal || !confirmMessage || !confirmYesBtn) {
        console.warn('Confirm modal elements not found in DOM');
        return Promise.reject(new Error('Confirm modal not available'));
    }

    return new Promise((resolve) => {
        // Set message
        confirmMessage.textContent = message;

        let modalInstance;

        // Handle yes button
        const handleYes = () => {
            if (modalInstance) modalInstance.hide();
            resolve(true);
            cleanup();
        };

        // Handle modal hide (no/cancel)
        const handleHide = () => {
            resolve(false);
            cleanup();
        };

        const cleanup = () => {
            confirmYesBtn.removeEventListener('click', handleYes);
            if (confirmModal && confirmModal.removeEventListener) {
                confirmModal.removeEventListener('hidden.bs.modal', handleHide);
            }
        };

        confirmYesBtn.addEventListener('click', handleYes);

        try {
            modalInstance = new bootstrap.Modal(confirmModal);
            confirmModal.addEventListener('hidden.bs.modal', handleHide);
            modalInstance.show();
        } catch (error) {
            console.warn('Bootstrap modal not available, defaulting to false');
            resolve(false);
        }
    });
}

// SearchableSelect Component Class
class SearchableSelect {
    constructor(selectElement, options = {}) {
        this.selectElement = selectElement;
        this.options = {
            placeholder: 'Pilih...',
            searchPlaceholder: 'Ketik untuk mencari...',
            noResultsText: 'Tidak ada hasil',
            ...options
        };
        this.data = [];
        this.filteredData = [];
        this.selectedValue = '';
        this.isOpen = false;

        this.init();
    }

    async loadData(fetchFunction) {
        try {
            this.data = await fetchFunction();
            this.filteredData = [...this.data];
            this.render();
        } catch (error) {
            console.error('Error loading data:', error);
            this.data = [];
            this.filteredData = [];
            this.render();
        }
    }

    init() {
        // Create wrapper
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'searchable-select-wrapper position-relative';
        this.selectElement.parentNode.insertBefore(this.wrapper, this.selectElement);
        this.wrapper.appendChild(this.selectElement);

        // Hide original select
        this.selectElement.style.display = 'none';

        // Create custom select
        this.createCustomSelect();

        // Add event listeners
        this.addEventListeners();
    }

    createCustomSelect() {
        this.customSelect = document.createElement('div');
        this.customSelect.className = 'form-select searchable-select d-flex align-items-center justify-content-between';
        this.customSelect.style.cursor = 'pointer';

        this.selectedText = document.createElement('span');
        this.selectedText.className = 'selected-text flex-grow-1';
        this.selectedText.textContent = this.options.placeholder;

        this.arrow = document.createElement('span');
        this.arrow.className = 'dropdown-arrow';
        this.arrow.innerHTML = '▼';

        this.customSelect.appendChild(this.selectedText);
        this.customSelect.appendChild(this.arrow);

        // Create dropdown
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'searchable-dropdown position-absolute top-100 start-0 w-100 bg-white border rounded-bottom shadow-sm';
        this.dropdown.style.display = 'none';
        this.dropdown.style.zIndex = '1050';
        this.dropdown.style.maxHeight = '200px';
        this.dropdown.style.overflowY = 'auto';

        // Search input
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.className = 'form-control border-0 border-bottom';
        this.searchInput.placeholder = this.options.searchPlaceholder;
        this.searchInput.style.borderRadius = '0';

        // Options list
        this.optionsList = document.createElement('div');
        this.optionsList.className = 'options-list';

        this.dropdown.appendChild(this.searchInput);
        this.dropdown.appendChild(this.optionsList);

        this.wrapper.appendChild(this.customSelect);
        this.wrapper.appendChild(this.dropdown);
    }

    addEventListeners() {
        // Toggle dropdown
        this.customSelect.addEventListener('click', () => {
            this.toggleDropdown();
        });

        // Search input
        this.searchInput.addEventListener('input', debounce((e) => {
            this.filterOptions(e.target.value);
        }, 300));

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Prevent closing when clicking inside dropdown
        this.dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Keyboard navigation
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeDropdown();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const firstOption = this.optionsList.querySelector('.px-3');
                if (firstOption) {
                    firstOption.click();
                }
            }
        });
    }

    toggleDropdown() {
        if (this.isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    openDropdown() {
        this.dropdown.style.display = 'block';
        this.customSelect.classList.add('focused');
        this.searchInput.focus();
        this.searchInput.value = '';
        this.filteredData = [...this.data];
        this.renderOptions();
        this.isOpen = true;
    }

    closeDropdown() {
        this.dropdown.style.display = 'none';
        this.customSelect.classList.remove('focused');
        this.isOpen = false;
    }

    filterOptions(searchTerm) {
        if (!searchTerm) {
            this.filteredData = [...this.data];
        } else {
            this.filteredData = this.data.filter(item =>
                item.text.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        this.renderOptions();
    }

    renderOptions() {
        this.optionsList.innerHTML = '';

        if (this.filteredData.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'px-3 py-2 text-muted';
            noResults.textContent = this.options.noResultsText;
            this.optionsList.appendChild(noResults);
            return;
        }

        this.filteredData.forEach(item => {
            const option = document.createElement('div');
            option.className = 'px-3 py-2 cursor-pointer';
            option.textContent = item.text;
            option.style.cursor = 'pointer';

            option.addEventListener('click', () => {
                this.selectOption(item);
            });

            // Hover effect
            option.addEventListener('mouseenter', () => {
                option.classList.add('bg-light');
            });
            option.addEventListener('mouseleave', () => {
                option.classList.remove('bg-light');
            });

            this.optionsList.appendChild(option);
        });
    }

    selectOption(item) {
        this.selectedValue = item.value;
        this.selectedText.textContent = item.text;
        this.selectElement.value = item.value;

        // Ensure the select element has the option
        let option = this.selectElement.querySelector(`option[value="${item.value}"]`);
        if (!option) {
            option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.text;
            this.selectElement.appendChild(option);
        }

        this.selectElement.value = item.value;
        this.closeDropdown();

        // Trigger change event
        this.selectElement.dispatchEvent(new Event('change'));
    }

    render() {
        this.renderOptions();
    }

    setValue(value) {
        if (!value) {
            this.selectedValue = '';
            this.selectedText.textContent = this.options.placeholder;
            this.selectElement.value = '';
            return;
        }

        const item = this.data.find(item => item.value === value);
        if (item) {
            this.selectOption(item);
        } else {
            // If item not found in current data, set manually
            console.warn(`Value ${value} not found in SearchableSelect data`);
            this.selectedValue = value;
            this.selectedText.textContent = `ID: ${value}`;
            this.selectElement.value = value;

            // Ensure option exists
            let option = this.selectElement.querySelector(`option[value="${value}"]`);
            if (!option) {
                option = document.createElement('option');
                option.value = value;
                option.textContent = `ID: ${value}`;
                this.selectElement.appendChild(option);
            }
        }
    }

    getValue() {
        return this.selectedValue;
    }
}

// Form handling utilities
function createFormField(label, input, helpText = '', required = false) {
    const formGroup = document.createElement('div');
    formGroup.className = 'mb-3';

    if (label) {
        const labelElement = document.createElement('label');
        labelElement.className = 'form-label';
        if (required) labelElement.innerHTML = `${label} <span class="text-danger">*</span>`;
        else labelElement.textContent = label;
        formGroup.appendChild(labelElement);
    }

    if (typeof input === 'string') {
        formGroup.innerHTML += input;
    } else {
        formGroup.appendChild(input);
    }

    if (helpText) {
        const helpElement = document.createElement('div');
        helpElement.className = 'form-text';
        helpElement.textContent = helpText;
        formGroup.appendChild(helpElement);
    }

    return formGroup;
}

function createTextInput(name, placeholder = '', value = '', type = 'text') {
    const input = document.createElement('input');
    input.type = type;
    input.className = 'form-control';
    input.name = name;
    input.placeholder = placeholder;
    input.value = value;
    return input;
}

function createSelectInput(name, options = [], placeholder = '') {
    const select = document.createElement('select');
    select.className = 'form-select';
    select.name = name;

    if (placeholder) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = placeholder;
        select.appendChild(option);
    }

    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        select.appendChild(option);
    });

    return select;
}

function createTextarea(name, placeholder = '', value = '', rows = 3) {
    const textarea = document.createElement('textarea');
    textarea.className = 'form-control';
    textarea.name = name;
    textarea.placeholder = placeholder;
    textarea.value = value;
    textarea.rows = rows;
    return textarea;
}

// Export all UI functions and classes
export {
    // Navigation
    showSection,
    showMultipleSections,
    getCurrentSection,
    loadSectionContent,

    // Modals
    showModal,
    closeModal,
    showConfirm,

    // Components
    SearchableSelect,

    // Form helpers
    createFormField,
    createTextInput,
    createSelectInput,
    createTextarea
};

// Also export the global functions for direct access
export const showAddPeriodeForm = window.showAddPeriodeForm;
export const showAddSubkategoriForm = window.showAddSubkategoriForm;
export const showAddRekeningForm = window.showAddRekeningForm;

// Initialize global functions immediately on module load
(function initializeGlobalFunctions() {
    // Make modal functions globally available
    window.showModal = showModal;
    window.closeModal = closeModal;
    window.closeModalFn = closeModal;

    // Make formatCurrency globally available
    import('./utils.js').then(({ formatCurrency }) => {
        window.formatCurrency = formatCurrency;
    }).catch(error => {
        console.warn('Could not load formatCurrency:', error);
        // Fallback formatter
        window.formatCurrency = (value) => {
            return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value);
        };
    });
    
    window.showAddPeriodeForm = async function(entity) {
        try {
            const { showAddForm } = await import('./entities/master/periode.js');
            const result = await showAddForm(entity);
            return result;
        } catch (error) {
            console.error('Error in showAddPeriodeForm:', error);
            throw error;
        }
    };

    window.showAddSubkategoriForm = async function(entity) {
        try {
            const { showAddForm } = await import('./entities/master/subkategori.js');
            const result = await showAddForm(entity);
            return result;
        } catch (error) {
            console.error('Error in showAddSubkategoriForm:', error);
            throw error;
        }
    };

    window.showAddRekeningForm = async function(entity) {
        try {
            const { showAddForm } = await import('./entities/master/rekening.js');
            const result = await showAddForm(entity);
            return result;
        } catch (error) {
            console.error('Error in showAddRekeningForm:', error);
            throw error;
        }
    };
})();

// Global pagination handler for HTML onclick - defined outside functions for modularity
window.changePage = async (tableType, page) => {
    try {
        // Route to appropriate module-specific page change function
        switch (tableType) {
            case 'hunian':
                // Import and call hunian page change function
                const { changeHunianPage } = await import('./entities/master/hunian.js');
                changeHunianPage(page);
                break;

            case 'pemasukan':
                // Import and call pemasukan page change function
                const { changePemasukanPage } = await import('./views/reports/pemasukan.js');
                changePemasukanPage(page);
                break;

            case 'pengeluaran':
                // Check if we're in views section (reports) or admin section (CRUD)
                const currentSection = getCurrentSection();
                if (currentSection === 'views') {
                    // Views pengeluaran (reports)
                    const { changePengeluaranPage } = await import('./views/reports/pengeluaran.js');
                    changePengeluaranPage(page);
                } else {
                    // Admin pengeluaran (CRUD)
                    const { changePengeluaranPage } = await import('./entities/transactions/pengeluaran-table.js');
                    changePengeluaranPage(page);
                }
                break;

            case 'ipl':
                // Import and call IPL page change function
                const { changeIPLPage } = await import('./views/reports/ipl.js');
                changeIPLPage(page);
                break;

            case 'air':
                // Import and call Air page change function
                const { changeAirPage } = await import('./views/reports/air.js');
                changeAirPage(page);
                break;

            case 'dana_titipan':
                // Call the globally available Dana Titipan page change function
                if (window.changeDanaTitipanPage) {
                    window.changeDanaTitipanPage(page);
                }
                break;

            default:
                console.warn(`Page change not implemented for table type: ${tableType}`);
                const { showToast } = await import('./utils.js');
                showToast(`Pagination not yet implemented for ${tableType}`, 'warning');
        }
    } catch (error) {
        console.error(`Error changing page for ${tableType}:`, error);
        const { showToast } = await import('./utils.js');
        showToast('Error changing page', 'danger');
    }
};

// Backward compatibility for global functions (HTML onclick handlers)
window.showAddHunianForm = async () => {
    const { showAddHunianForm } = await import('./entities/master/hunian.js');
    showAddHunianForm();
};

window.showAddLorongForm = async () => {
    const { showAddLorongForm } = await import('./entities/master/lorong.js');
    showAddLorongForm();
};

window.showAddKategoriForm = async () => {
    const { showAddKategoriForm } = await import('./entities/master/kategori.js');
    showAddKategoriForm();
};

window.showAddPemasukanForm = async () => {
    const { showAddPemasukanForm } = await import('./entities/transactions/pemasukan.js');
    showAddPemasukanForm();
};

window.showAddPenghuniForm = async () => {
    const { showToast } = await import('./utils.js');
    showToast('Penghuni form coming soon!', 'info');
};

window.resetHunianFilters = async () => {
    const { resetHunianFilters } = await import('./entities/master/hunian.js');
    resetHunianFilters();
};

window.resetPemasukanFilters = async () => {
    const { resetPemasukanFilters } = await import('./entities/transactions/pemasukan.js');
    resetPemasukanFilters();
};



// Pagination function mappings for master data tables
window.changePeriodePage = async (page) => {
    const { changePeriodePage } = await import('./entities/master/periode.js');
    changePeriodePage(page);
};

window.changeSubkategoriPage = async (page) => {
    const { changeSubkategoriPage } = await import('./entities/master/subkategori.js');
    changeSubkategoriPage(page);
};

window.changeRekeningPage = async (page) => {
    const { changeRekeningPage } = await import('./entities/master/rekening.js');
    changeRekeningPage(page);
};
