// Hunian entity module
// Main coordinating module for all hunian functionality

// Import all submodules
import {
    loadHunian,
    confirmDeleteHunian
} from './hunian-data.js';

import {
    showAddHunianForm,
    showEditHunianForm
} from './hunian-form.js';

import {
    initializeHunianSearchAndFilter,
    resetHunianFilters,
    applyHunianSorting,
    changeHunianPage
} from './hunian-filters.js';

import { showConfirm } from '../../utils.js';

// Export functions for global access
export {
    loadHunian,
    showAddHunianForm,
    showEditHunianForm,
    confirmDeleteHunian,
    initializeHunianSearchAndFilter,
    resetHunianFilters,
    applyHunianSorting,
    changeHunianPage
};

// Backward compatibility for global functions
window.editHunian = showEditHunianForm;
window.confirmDeleteHunian = confirmDeleteHunian;
window.applyHunianSorting = applyHunianSorting;
