// Section management and content loading module
// Main hub for section-related functionality

// Import modular section components
import { loadDashboard } from './dashboard.js';
import { loadAdminSection } from './admin.js';
import { loadSectionContent } from './section-loader.js';
import { calculateTotalSaldo, calculateDetailedKategoriSaldo, calculateDetailedRekeningSaldo } from './utils/balance-calculations.js';

// Import backward compatibility functions
import './backward-compatibility.js';
import { loadViewsSection } from './views/main.js';

// Re-export main functions for backward compatibility
export {
    loadDashboard,
    loadAdminSection,
    loadSectionContent,
    loadViewsSection,
    calculateTotalSaldo,
    calculateDetailedKategoriSaldo,
    calculateDetailedRekeningSaldo
};
