// Tagihan Air main module
// Bulk meter reading input for water billing per period
// Similar pattern to IPL billing but for meter readings instead of billing types

import { loadTagihanAirInput } from './tagihan_air-table.js';

// Main function to load bulk meter reading input for a period
async function loadTagihanAirInputForPeriod(periodeId) {
    try {
        await loadTagihanAirInput(periodeId);
    } catch (error) {
        console.error('Error loading tagihan air input:', error);
        showToast('Error loading tagihan air input', 'danger');
    }
}

export {
    loadTagihanAirInputForPeriod
};

// Backward compatibility for global functions
window.loadTagihanAirInputForPeriod = loadTagihanAirInputForPeriod;
