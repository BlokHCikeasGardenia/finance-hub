// Pemindahbukuan search and filter module
// Handles search, filter, sort functionality and initialization

import {
    getPemindahbukuanData,
    getPemindahbukuanState,
    setPemindahbukuanState
} from './pemindahbukuan-data.js';
import { filterAndDisplayPemindahbukuan } from './pemindahbukuan-table.js';
import { formatCurrency, debounce } from '../../utils.js';

// Filter and display pemindahbukuan data (wrapper to work with state)
function filterAndDisplayPemindahbukuanWrapper(isFilterChange = true) {
    filterAndDisplayPemindahbukuan();

    // Reset to page 1 only when filters actually change
    if (isFilterChange) {
        setPemindahbukuanState({ pemindahbukuanCurrentPage: 1 });
    }
}

// Initialize search and filter functionality
function initializePemindahbukuanSearchAndFilter() {
    // Search filter
    const searchInput = document.getElementById('pemindahbukuan-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            const searchTerm = searchInput.value.trim().toLowerCase();
            setPemindahbukuanState({ pemindahbukuanSearchTerm: searchTerm, pemindahbukuanCurrentPage: 1 });
            filterAndDisplayPemindahbukuanWrapper();
        }, 300));
    }

    // Items per page
    const itemsPerPageSelect = document.getElementById('pemindahbukuan-items-per-page');
    if (itemsPerPageSelect) {
        const state = getPemindahbukuanState();
        itemsPerPageSelect.value = state.pemindahbukuanItemsPerPage;
        itemsPerPageSelect.addEventListener('change', (e) => {
            setPemindahbukuanState({ pemindahbukuanItemsPerPage: parseInt(e.target.value), pemindahbukuanCurrentPage: 1 });
            filterAndDisplayPemindahbukuanWrapper();
        });
    }
}

// Reset filters
function resetPemindahbukuanFilters() {
    setPemindahbukuanState({
        pemindahbukuanSearchTerm: '',
        pemindahbukuanFilterDateFrom: '',
        pemindahbukuanFilterDateTo: '',
        pemindahbukuanCurrentPage: 1
    });

    // Reset UI elements
    const searchInput = document.getElementById('pemindahbukuan-search');
    const dateFromFilter = document.getElementById('pemindahbukuan-date-from');

    if (searchInput) searchInput.value = '';
    if (dateFromFilter) dateFromFilter.value = '';

    filterAndDisplayPemindahbukuanWrapper();
}

// Sort pemindahbukuan data
function sortPemindahbukuanData(column, direction) {
    if (direction === 'none') {
        filterAndDisplayPemindahbukuanWrapper(false);
        return;
    }

    let filteredData = [...getPemindahbukuanData()];

    // Apply current filters first
    const state = getPemindahbukuanState();

    if (state.pemindahbukuanSearchTerm) {
        filteredData = filteredData.filter(item =>
            ['id_transaksi', 'catatan'].some(field =>
                item[field]?.toString().toLowerCase().includes(state.pemindahbukuanSearchTerm.toLowerCase())
            ) ||
            (item.rekening_dari?.jenis_rekening || '').toLowerCase().includes(state.pemindahbukuanSearchTerm) ||
            (item.rekening_ke?.jenis_rekening || '').toLowerCase().includes(state.pemindahbukuanSearchTerm)
        );
    }

    if (state.pemindahbukuanFilterDateFrom) {
        filteredData = filteredData.filter(item => new Date(item.tanggal) >= new Date(state.pemindahbukuanFilterDateFrom));
    }
    if (state.pemindahbukuanFilterDateTo) {
        filteredData = filteredData.filter(item => new Date(item.tanggal) <= new Date(state.pemindahbukuanFilterDateTo));
    }

    // Apply sorting logic based on column and direction
    // This would be implemented based on the sorting requirements

    // For now, just redisplay the filtered data
    filterAndDisplayPemindahbukuanWrapper(false);
}

export {
    filterAndDisplayPemindahbukuanWrapper as filterAndDisplayPemindahbukuan,
    initializePemindahbukuanSearchAndFilter,
    resetPemindahbukuanFilters,
    sortPemindahbukuanData
};
