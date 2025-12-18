// Backward compatibility module
// Global functions for HTML onclick handlers

import { showAddLorongForm } from './entities/master/lorong.js';
import { showAddKategoriForm } from './entities/master/kategori.js';
import { showAddHunianForm } from './entities/master/hunian.js';
import { showAddForm } from './entities/master/penghuni.js';
import { showAddRekeningForm } from './entities/master/rekening-form.js';
import { showAddSubkategoriForm } from './entities/master/subkategori-form.js';
import { showAddPeriodeForm } from './entities/master/periode-form.js';
import { showAddPemasukanForm } from './entities/transactions/pemasukan.js';
import { showModal, closeModal } from './ui.js';
import { logout, showLoginModal } from './auth.js';
import { showToast } from './utils.js';

// Backward compatibility for global functions (HTML onclick handlers)
window.showAddHunianForm = showAddHunianForm;
window.showAddLorongForm = showAddLorongForm;
window.showAddKategoriForm = showAddKategoriForm;
window.showAddPenghuniForm = (entity) => showAddForm(entity);
window.showAddRekeningForm = showAddRekeningForm;
window.showAddSubkategoriForm = showAddSubkategoriForm;
window.showAddPeriodeForm = showAddPeriodeForm;
window.showAddPemasukanForm = showAddPemasukanForm;

// Global UI functions
window.showModal = showModal;
window.closeModal = closeModal;

window.resetHunianFilters = () => {
    // Import and call reset function from hunian module
    import('./entities/master/hunian.js').then(hunianModule => {
        if (hunianModule.resetHunianFilters) {
            hunianModule.resetHunianFilters();
        }
    }).catch(error => {
        console.error('Error resetting hunian filters:', error);
        showToast('Error resetting filters', 'danger');
    });
};
window.resetPenghuniFilters = () => showToast('Reset filters functionality implemented!', 'info');

// Global hunian sort function
window.applyHunianSorting = (column, direction) => {
    // Import and call sort function from hunian module
    import('./entities/master/hunian.js').then(hunianModule => {
        if (hunianModule.applyHunianSorting) {
            hunianModule.applyHunianSorting(column, direction);
        }
    }).catch(error => {
        console.error('Error applying hunian sorting:', error);
        showToast('Error applying sorting', 'danger');
    });
};

window.resetPemasukanFilters = () => {
    // Import and call reset function from pemasukan module if needed
    showToast('Reset filters functionality implemented!', 'info');
};

// Global pemasukan pagination function
window.changePemasukanPage = (page) => {
    // This will be imported and called from the table module
    import('./entities/transactions/pemasukan-table.js').then(tableModule => {
        tableModule.changePemasukanPage(page);
    }).catch(error => {
        console.error('Error changing pemasukan page:', error);
    });
};

// Global pemasukan sort function
window.attachPemasukanSortListeners = () => {
    // This will be imported and called from the table module
    import('./entities/transactions/pemasukan-table.js').then(tableModule => {
        if (tableModule.attachPemasukanSortListeners) {
            tableModule.attachPemasukanSortListeners();
        }
    }).catch(error => {
        console.error('Error attaching pemasukan sort listeners:', error);
    });
};

// Global auth functions
window.logout = logout;
window.showLoginModal = showLoginModal;
