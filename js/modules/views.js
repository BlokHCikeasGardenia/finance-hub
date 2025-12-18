// Views and Reports module - Main Entry Point
// Now delegates to modular views system for better maintainability

// Re-export all views functionality from the new modular system
export { loadViewsSection, loadView } from './views/main.js';
export { loadViewIPL, refreshViewIPL } from './views/reports/ipl.js';
export { loadViewAir, refreshViewAir, loadViewRekapAir, refreshViewRekapAir } from './views/reports/air.js';
export { loadViewAula, refreshViewAula, loadViewRekapAula, refreshViewRekapAula } from './views/reports/aula.js';
export { loadViewLainnya, refreshViewLainnya, loadViewRekapLainnya, refreshViewRekapLainnya } from './views/reports/lainnya.js';
export { loadViewPemasukan, refreshViewPemasukan } from './views/reports/pemasukan.js';
export { loadViewPengeluaran, refreshViewPengeluaran } from './views/reports/pengeluaran.js';
export { loadViewRingkasan, refreshViewRingkasan } from './views/reports/ringkasan.js';
export { loadViewRekap, refreshViewRekap, showRekapDetails, hideRekapDetails } from './views/reports/rekap.js';
export { loadViewRekapIPL, refreshViewRekapIPL } from './views/reports/rekap-ipl.js';

// Re-export utilities for backward compatibility
export * from './views/utils.js';

// Backward compatibility for global window functions
// Note: These assignments are handled in each individual module to ensure proper initialization
window.loadViewsSection = window.loadViewsSection || (() => { throw new Error('loadViewsSection not yet initialized'); });
window.loadViewIPL = window.loadViewIPL || (() => { throw new Error('loadViewIPL not yet initialized'); });
window.loadViewAir = window.loadViewAir || (() => { throw new Error('loadViewAir not yet initialized'); });
window.loadViewRekapAir = window.loadViewRekapAir || (() => { throw new Error('loadViewRekapAir not yet initialized'); });
window.loadViewAula = window.loadViewAula || (() => { throw new Error('loadViewAula not yet initialized'); });
window.loadViewRekapAula = window.loadViewRekapAula || (() => { throw new Error('loadViewRekapAula not yet initialized'); });
window.loadViewLainnya = window.loadViewLainnya || (() => { throw new Error('loadViewLainnya not yet initialized'); });
window.loadViewRekapLainnya = window.loadViewRekapLainnya || (() => { throw new Error('loadViewRekapLainnya not yet initialized'); });
window.loadViewPemasukan = window.loadViewPemasukan || (() => { throw new Error('loadViewPemasukan not yet initialized'); });
window.loadViewPengeluaran = window.loadViewPengeluaran || (() => { throw new Error('loadViewPengeluaran not yet initialized'); });
window.loadViewRingkasan = window.loadViewRingkasan || (() => { throw new Error('loadViewRingkasan not yet initialized'); });
window.loadViewRekap = window.loadViewRekap || (() => { throw new Error('loadViewRekap not yet initialized'); });
window.showRekapDetails = window.showRekapDetails || (() => { throw new Error('showRekapDetails not yet initialized'); });
window.hideRekapDetails = window.hideRekapDetails || (() => { throw new Error('hideRekapDetails not yet initialized'); });
window.refreshViewIPL = window.refreshViewIPL || (() => { throw new Error('refreshViewIPL not yet initialized'); });
window.refreshViewAir = window.refreshViewAir || (() => { throw new Error('refreshViewAir not yet initialized'); });
window.refreshViewRekapAir = window.refreshViewRekapAir || (() => { throw new Error('refreshViewRekapAir not yet initialized'); });
window.refreshViewAula = window.refreshViewAula || (() => { throw new Error('refreshViewAula not yet initialized'); });
window.refreshViewRekapAula = window.refreshViewRekapAula || (() => { throw new Error('refreshViewRekapAula not yet initialized'); });
window.refreshViewLainnya = window.refreshViewLainnya || (() => { throw new Error('refreshViewLainnya not yet initialized'); });
window.refreshViewRekapLainnya = window.refreshViewRekapLainnya || (() => { throw new Error('refreshViewRekapLainnya not yet initialized'); });
window.refreshViewPemasukan = window.refreshViewPemasukan || (() => { throw new Error('refreshViewPemasukan not yet initialized'); });
window.refreshViewPengeluaran = window.refreshViewPengeluaran || (() => { throw new Error('refreshViewPengeluaran not yet initialized'); });
window.refreshViewRingkasan = window.refreshViewRingkasan || (() => { throw new Error('refreshViewRingkasan not yet initialized'); });
window.refreshViewRekap = window.refreshViewRekap || (() => { throw new Error('refreshViewRekap not yet initialized'); });
window.loadViewRekapIPL = window.loadViewRekapIPL || (() => { throw new Error('loadViewRekapIPL not yet initialized'); });
window.refreshViewRekapIPL = window.refreshViewRekapIPL || (() => { throw new Error('refreshViewRekapIPL not yet initialized'); });
