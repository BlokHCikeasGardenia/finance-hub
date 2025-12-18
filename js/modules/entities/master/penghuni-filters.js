// Penghuni search and filter module
// Handles search, filter, sort functionality

import { getPenghuniState, setPenghuniState, getPenghuniData } from './penghuni-data.js';
import { renderPenghuniTable } from './penghuni-table.js';
import { debounce } from '../../utils.js';

// Initialize search and filter functionality
function initializePenghuniSearchAndFilter() {
    const searchInput = document.getElementById('penghuni-search');
    const statusFilter = document.getElementById('penghuni-filter-status');
    const airFilter = document.getElementById('penghuni-filter-air');
    const itemsPerPageSelect = document.getElementById('penghuni-items-per-page');

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            applyPenghuniFilters();
        }, 300));
    }

    // Filter functionality
    if (statusFilter) {
        statusFilter.addEventListener('change', applyPenghuniFilters);
    }

    if (airFilter) {
        airFilter.addEventListener('change', applyPenghuniFilters);
    }

    // Items per page functionality
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', (e) => {
            updatePenghuniItemsPerPage(parseInt(e.target.value));
        });
    }
}

// Reset penghuni filters
function resetPenghuniFilters() {
    const searchInput = document.getElementById('penghuni-search');
    const statusFilter = document.getElementById('penghuni-filter-status');
    const airFilter = document.getElementById('penghuni-filter-air');

    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    if (airFilter) airFilter.value = '';

    setPenghuniState({ penghuniCurrentPage: 1 });
    applyPenghuniFilters();
}

// Apply penghuni filters
function applyPenghuniFilters(isFilterChange = true) {
    const searchTerm = document.getElementById('penghuni-search')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('penghuni-filter-status')?.value || '';
    const airFilter = document.getElementById('penghuni-filter-air')?.value || '';

    const sourceData = getPenghuniData();
    let filteredData = [...sourceData];

    // Apply search filter
    if (searchTerm) {
        filteredData = filteredData.filter(item =>
            item.nama_kepala_keluarga.toLowerCase().includes(searchTerm) ||
            (item.agama && item.agama.toLowerCase().includes(searchTerm))
        );
    }

    // Apply status filter
    if (statusFilter) {
        filteredData = filteredData.filter(item => item.status === statusFilter);
    }

    // Apply air filter
    if (airFilter) {
        const isPelangganAir = airFilter === 'true';
        filteredData = filteredData.filter(item => item.pelanggan_air === isPelangganAir);
    }

    // Reset to page 1 only when filters actually change
    if (isFilterChange) {
        setPenghuniState({ penghuniCurrentPage: 1 });
    }

    renderPenghuniTable(filteredData);
}


// Update items per page and refresh table
function updatePenghuniItemsPerPage(newItemsPerPage) {
    setPenghuniState({
        penghuniItemsPerPage: newItemsPerPage,
        penghuniCurrentPage: 1
    });
    localStorage.setItem('penghuniItemsPerPage', newItemsPerPage);
    applyPenghuniFilters(false); // false = not a filter change, just pagination refresh
}

export {
    initializePenghuniSearchAndFilter,
    resetPenghuniFilters,
    applyPenghuniFilters,
    updatePenghuniItemsPerPage
};
