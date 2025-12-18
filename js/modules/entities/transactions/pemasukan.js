// Pemasukan transaction module
// Main coordinating module for all pemasukan functionality

// Import all submodules
import {
    loadPemasukan
} from './pemasukan-data.js';

import {
    showAddPemasukanForm,
    showEditPemasukanForm,
    confirmCancelPemasukan,
    confirmDeletePemasukan
} from './pemasukan-form.js';

import {
    initializePemasukanSearchAndFilter,
    resetPemasukanFilters,
    sortPemasukanData
} from './pemasukan-filters.js';

import {
    changePemasukanPage
} from './pemasukan-table.js';

// Export functions for global access
export {
    loadPemasukan,
    showAddPemasukanForm,
    showEditPemasukanForm,
    confirmCancelPemasukan,
    confirmDeletePemasukan,
    initializePemasukanSearchAndFilter,
    changePemasukanPage,
    resetPemasukanFilters,
    sortPemasukanData
};

// Backward compatibility for global functions
window.editPemasukan = showEditPemasukanForm;
window.confirmCancelPemasukan = confirmCancelPemasukan;
window.confirmDeletePemasukan = confirmDeletePemasukan;
window.sortPemasukanData = sortPemasukanData;
