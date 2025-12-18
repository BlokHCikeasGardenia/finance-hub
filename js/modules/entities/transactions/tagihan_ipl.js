// Tagihan IPL main module
// Main coordinating module for IPL billing functionality

// Import all submodules
import {
    loadTagihanIpl,
    generateTagihanIplForPeriod
} from './tagihan_ipl-data.js';

import {
    displayTagihanIplTable
} from './tagihan_ipl-table.js';

import { loadHunian } from '../master/hunian.js';
import { showToast } from '../../utils.js';

// Main function to load IPL billing input for a period
async function loadTagihanIplInput(periodeId) {
    try {
        // Load household data without UI updates (since we're not on the hunian page)
        const { success, data: hunianData } = await loadHunian(false);
        if (!success) {
            showToast('Gagal memuat data hunian', 'danger');
            return;
        }

        // Display the input table
        displayTagihanIplTable(periodeId, hunianData);

    } catch (error) {
        console.error('Error loading IPL billing input:', error);
        showToast('Error loading IPL billing input', 'danger');
    }
}

export {
    loadTagihanIplInput,
    loadTagihanIpl,
    generateTagihanIplForPeriod
};

// Backward compatibility for global functions
window.loadTagihanIplInput = loadTagihanIplInput;
