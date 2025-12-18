// Tarif Air master data module
// Main coordinating module for all tarif air functionality

// Import all submodules
import {
    loadTarifAir,
    addTarifAir,
    updateTarifAir,
    deleteTarifAir,
    confirmDeleteTarifAir
} from './tarif_air-data.js';

import {
    showAddTarifAirForm,
    showEditTarifAirForm
} from './tarif_air-form.js';

import {
    changeTarifAirPage
} from './tarif_air-table.js';

// Export functions for global access
export {
    loadTarifAir,
    showAddTarifAirForm,
    showEditTarifAirForm,
    confirmDeleteTarifAir,
    changeTarifAirPage,
    addTarifAir,
    updateTarifAir,
    deleteTarifAir
};

// Backward compatibility for global functions
window.showAddTarifAirForm = showAddTarifAirForm;
window.editTarifAir = showEditTarifAirForm;
window.confirmDeleteTarifAir = confirmDeleteTarifAir;
