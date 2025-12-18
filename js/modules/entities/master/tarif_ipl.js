// Tarif IPL master data module
// Main coordinating module for all tarif IPL functionality

// Import all submodules
import {
    loadTarifIpl,
    addTarifIpl,
    updateTarifIpl,
    deleteTarifIpl,
    confirmDeleteTarifIpl
} from './tarif_ipl-data.js';

import {
    showAddTarifIplForm,
    showEditTarifIplForm
} from './tarif_ipl-form.js';

import {
    changeTarifIplPage
} from './tarif_ipl-table.js';

// Export functions for global access
export {
    loadTarifIpl,
    showAddTarifIplForm,
    showEditTarifIplForm,
    confirmDeleteTarifIpl,
    changeTarifIplPage,
    addTarifIpl,
    updateTarifIpl,
    deleteTarifIpl
};

// Backward compatibility for global functions
window.showAddTarifIplForm = showAddTarifIplForm;
window.editTarifIpl = showEditTarifIplForm;
window.confirmDeleteTarifIpl = confirmDeleteTarifIpl;
