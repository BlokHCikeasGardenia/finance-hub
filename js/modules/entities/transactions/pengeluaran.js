// Pengeluaran transaction module
// Main coordinating module for all pengeluaran functionality

// Import all submodules
import {
    loadPengeluaran,
    deletePengeluaran
} from './pengeluaran-data.js';

import {
    showAddPengeluaranForm,
    showEditPengeluaranForm,
    confirmDeletePengeluaran
} from './pengeluaran-form.js';

import {
    initializePengeluaranSearchAndFilter,
    resetPengeluaranFilters,
    sortPengeluaranData
} from './pengeluaran-filters.js';

import {
    changePengeluaranPage
} from './pengeluaran-table.js';

// Function to initialize pengeluaran section completely
async function initializePengeluaranSection() {
    // Load data
    await loadPengeluaran();

    // Initialize filters
    setTimeout(() => {
        initializePengeluaranSearchAndFilter();
    }, 100);

    // Set up backward compatibility
    window.editPengeluaran = showEditPengeluaranForm;
    window.confirmDeletePengeluaran = confirmDeletePengeluaran;
    window.changePengeluaranPage = changePengeluaranPage;
    window.resetPengeluaranFilters = resetPengeluaranFilters;
}

// Export functions for global access
export {
    loadPengeluaran,
    showAddPengeluaranForm,
    showEditPengeluaranForm,
    confirmDeletePengeluaran,
    initializePengeluaranSearchAndFilter,
    changePengeluaranPage,
    resetPengeluaranFilters,
    sortPengeluaranData,
    initializePengeluaranSection
};

// Backward compatibility for global functions
window.editPengeluaran = showEditPengeluaranForm;
window.confirmDeletePengeluaran = confirmDeletePengeluaran;
window.changePengeluaranPage = changePengeluaranPage;
window.resetPengeluaranFilters = resetPengeluaranFilters;
window.sortPengeluaranData = sortPengeluaranData;
// Expose showAddPengeluaranForm globally for inline onclick in section-loader
window.showAddPengeluaranForm = showAddPengeluaranForm;
