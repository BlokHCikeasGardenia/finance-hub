// Penghuni entity module
// Main coordinating module for all penghuni functionality

// Import all submodules
import {
    loadPenghuni,
    confirmDeletePenghuni,
    getPenghuniData,
    getPenghuniAirData
} from './penghuni-data.js';

import {
    renderPenghuniTable,
    changePenghuniPage
} from './penghuni-table.js';

import {
    initializePenghuniSearchAndFilter,
    resetPenghuniFilters,
    applyPenghuniFilters,
    updatePenghuniItemsPerPage
} from './penghuni-filters.js';

import {
    showAddForm,
    editPenghuni
} from './penghuni-form.js';

// Export functions for global access
export {
    loadPenghuni,
    showAddForm,
    editPenghuni,
    confirmDeletePenghuni,
    initializePenghuniSearchAndFilter,
    resetPenghuniFilters,
    changePenghuniPage,
    applyPenghuniFilters,
    updatePenghuniItemsPerPage,
    getPenghuniData,
    getPenghuniAirData
};

// Backward compatibility for global functions
window.loadPenghuni = loadPenghuni;
window.showAddForm = showAddForm;
window.editPenghuni = editPenghuni;
window.confirmDeletePenghuni = confirmDeletePenghuni;
window.initializePenghuniSearchAndFilter = initializePenghuniSearchAndFilter;
window.resetPenghuniFilters = resetPenghuniFilters;
window.applyPenghuniFilters = applyPenghuniFilters;
window.changePenghuniPage = changePenghuniPage;
window.updatePenghuniItemsPerPage = updatePenghuniItemsPerPage;
window.getPenghuniData = getPenghuniData;
window.getPenghuniAirData = getPenghuniAirData;
