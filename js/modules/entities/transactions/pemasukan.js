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
    showPemasukanPeriodeDetail,
    changePemasukanPage
} from './pemasukan-table.js';

import {
    initializePemasukanSearchAndFilter,
    resetPemasukanFilters
} from './pemasukan-filters.js';

// Export functions for global access
export {
    loadPemasukan,
    showAddPemasukanForm,
    showEditPemasukanForm,
    confirmCancelPemasukan,
    confirmDeletePemasukan,
    showPemasukanPeriodeDetail,
    initializePemasukanSearchAndFilter,
    resetPemasukanFilters
};

// Backward compatibility for global functions
window.editPemasukan = showEditPemasukanForm;
window.confirmCancelPemasukan = confirmCancelPemasukan;
window.confirmDeletePemasukan = confirmDeletePemasukan;
window.showPemasukanPeriodeDetail = showPemasukanPeriodeDetail;
window.changePemasukanPage = changePemasukanPage;
window.initializePemasukanSearchAndFilter = initializePemasukanSearchAndFilter;
window.resetPemasukanFilters = resetPemasukanFilters;
