// Pemindahbukuan search and filter module
// Handles search, filter, sort functionality and initialization

import {
    getPemindahbukuanData,
    getPemindahbukuanState,
    setPemindahbukuanState
} from './pemindahbukuan-data.js';
import { filterAndDisplayPemindahbukuan } from './pemindahbukuan-table.js';
import { formatCurrency, debounce, resolveItemsPerPage } from '../../utils.js';

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
            setPemindahbukuanState({ pemindahbukuanItemsPerPage: resolveItemsPerPage(e.target.value, 10), pemindahbukuanCurrentPage: 1 });
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
        pemindahbukuanCurrentPage: 1,
        pemindahbukuanSortColumn: '',
        pemindahbukuanSortDirection: 'none'
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
        setPemindahbukuanState({ pemindahbukuanSortColumn: '', pemindahbukuanSortDirection: 'none' });
        filterAndDisplayPemindahbukuanWrapper(false);
        return;
    }

    // Update sort state
    setPemindahbukuanState({
        pemindahbukuanSortColumn: column,
        pemindahbukuanSortDirection: direction
    });

    // Re-apply filters and sorting
    filterAndDisplayPemindahbukuanWrapper(false);
}

export {
    filterAndDisplayPemindahbukuanWrapper as filterAndDisplayPemindahbukuan,
    initializePemindahbukuanSearchAndFilter,
    resetPemindahbukuanFilters,
    sortPemindahbukuanData
};
