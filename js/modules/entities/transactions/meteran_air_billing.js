// Meteran Air Billing main module
// Consolidated module replacing separate meteran_air and tagihan_air modules
// Provides unified interface for meter readings and billing operations

import { initializeMeteranAirBillingTable } from './meteran_air_billing-table.js';
import { showMeteranAirBillingForm } from './meteran_air_billing-form.js';
import {
    loadMeteranAirBilling,
    generateMeteranAirBilling,
    allocatePaymentToMeteranAirBilling,
    getOutstandingMeteranAirBillingByHunian,
    getMeteranAirBillingForPeriod
} from './meteran_air_billing-data.js';

// Main initialization function
async function initializeMeteranAirBilling() {
    try {
        // Initialize table display
        await initializeMeteranAirBillingTable();

        console.log('Meteran Air Billing module initialized successfully');
    } catch (error) {
        console.error('Error initializing Meteran Air Billing module:', error);
    }
}

// Export public API
export {
    initializeMeteranAirBilling,
    loadMeteranAirBilling,
    generateMeteranAirBilling,
    allocatePaymentToMeteranAirBilling,
    getOutstandingMeteranAirBillingByHunian,
    getMeteranAirBillingForPeriod,
    showMeteranAirBillingForm,
    initializeMeteranAirBillingTable
};

// Legacy compatibility exports (for gradual migration)
export { loadMeteranAirBilling as loadTagihanAir } from './meteran_air_billing-data.js';
export { allocatePaymentToMeteranAirBilling as allocatePaymentToTagihan } from './meteran_air_billing-data.js';
export { getOutstandingMeteranAirBillingByHunian as getOutstandingTagihanByHunian } from './meteran_air_billing-data.js';

// Initialize when DOM is ready (for direct script loading)
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Auto-initialize if container exists
        const container = document.getElementById('meteran_air_billing-section');
        if (container) {
            initializeMeteranAirBilling();
        }
    });
}