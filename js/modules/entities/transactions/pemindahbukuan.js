// Pemindahbukuan transaction module
// Main coordinating module for all pemindahbukuan functionality

// Import all submodules
import {
    loadPemindahbukuan,
    deletePemindahbukuan
} from './pemindahbukuan-data.js';

import {
    showAddPemindahbukuanForm,
    showEditPemindahbukuanForm,
    confirmDeletePemindahbukuan
} from './pemindahbukuan-form.js';

import {
    initializePemindahbukuanSearchAndFilter,
    resetPemindahbukuanFilters
} from './pemindahbukuan-filters.js';

import {
    changePemindahbukuanPage
} from './pemindahbukuan-table.js';

// Function to initialize pemindahbukuan section completely
async function initializePemindahbukuanSection() {
    // Load data
    await loadPemindahbukuan();

    // Initialize filters
    setTimeout(() => {
        initializePemindahbukuanSearchAndFilter();
    }, 100);

    // Set up backward compatibility
    window.editPemindahbukuan = showEditPemindahbukuanForm;
    window.confirmDeletePemindahbukuan = confirmDeletePemindahbukuan;
    window.changePemindahbukuanPage = changePemindahbukuanPage;
    window.resetPemindahbukuanFilters = resetPemindahbukuanFilters;
}

// Export functions for global access
export {
    loadPemindahbukuan,
    showAddPemindahbukuanForm,
    showEditPemindahbukuanForm,
    confirmDeletePemindahbukuan,
    initializePemindahbukuanSearchAndFilter,
    changePemindahbukuanPage,
    resetPemindahbukuanFilters,
    initializePemindahbukuanSection
};

// Backward compatibility for global functions
window.showAddPemindahbukuanForm = showAddPemindahbukuanForm;
window.editPemindahbukuan = showEditPemindahbukuanForm;
window.confirmDeletePemindahbukuan = confirmDeletePemindahbukuan;
window.changePemindahbukuanPage = changePemindahbukuanPage;
window.resetPemindahbukuanFilters = resetPemindahbukuanFilters;
