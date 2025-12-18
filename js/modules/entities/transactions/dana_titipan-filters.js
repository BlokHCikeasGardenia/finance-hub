// Dana Titipan search and filter module
// Handles search, filter, sort functionality and initialization

import {
    getDanaTitipanData,
    getDanaTitipanCategories,
    getDanaTitipanState,
    setDanaTitipanState,
    getRekeningOptions,
    resetDanaTitipanFilters as resetFilters
} from './dana_titipan-data.js';
import { displayDanaTitipanTable } from './dana_titipan-table.js';
import { applySearchFilter, applySorting, paginateData } from '../../crud.js';
import { debounce, formatCurrency } from '../../utils.js';

// Filter and display dana_titipan data
function filterAndDisplayDanaTitipan(isFilterChange = true) {
    const state = getDanaTitipanState();
    let filteredData = [...state.danaTitipanData];

    // Apply search filter
    if (state.danaTitipanSearchTerm) {
        filteredData = applySearchFilter(filteredData, state.danaTitipanSearchTerm, [
            'id_transaksi',
            'keterangan',
            'penghuni.nama_kepala_keluarga',
            'hunian.nomor_blok_rumah'
        ]);
    }

    // Apply category filter
    if (state.danaTitipanFilterCategory) {
        filteredData = filteredData.filter(item => item.kategori_id === state.danaTitipanFilterCategory);
    }

    // Apply account filter
    if (state.danaTitipanFilterAccount) {
        filteredData = filteredData.filter(item => item.rekening_id === state.danaTitipanFilterAccount);
    }

    // Apply date filters
    if (state.danaTitipanFilterDateFrom) {
        filteredData = filteredData.filter(item => new Date(item.tanggal) >= new Date(state.danaTitipanFilterDateFrom));
    }
    if (state.danaTitipanFilterDateTo) {
        filteredData = filteredData.filter(item => new Date(item.tanggal) <= new Date(state.danaTitipanFilterDateTo));
    }

    // Update total count display
    const totalNominal = filteredData.reduce((sum, item) => sum + (item.nominal || 0), 0);
    const totalCountElement = document.getElementById('dana_titipan-total-count');
    const totalNominalElement = document.getElementById('dana_titipan-total-nominal');

    if (totalCountElement) totalCountElement.textContent = `${filteredData.length} transaksi`;
    if (totalNominalElement) totalNominalElement.textContent = `Total: ${formatCurrency(totalNominal)}`;

    // Display filtered data
    const { data: paginatedData } = paginateData(filteredData, state.danaTitipanCurrentPage, state.danaTitipanItemsPerPage);
    displayDanaTitipanTable(paginatedData);

    // Reset to page 1 only when filters actually change
    if (isFilterChange) {
        setDanaTitipanState({ danaTitipanCurrentPage: 1 });
    }
}

// Initialize search and filter functionality
function initializeDanaTitipanSearchAndFilter() {
    // Search filter
    const searchInput = document.getElementById('dana_titipan-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            const searchTerm = searchInput.value.trim().toLowerCase();
            setDanaTitipanState({ danaTitipanSearchTerm: searchTerm, danaTitipanCurrentPage: 1 });
            filterAndDisplayDanaTitipan();
        }, 300));
    }

    // Category filter
    const categoryFilter = document.getElementById('dana_titipan-filter-category');
    if (categoryFilter) {
        const categories = getDanaTitipanCategories();
        const optionsHtml = '<option value="">Semua Kategori</option>' +
            categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
        categoryFilter.innerHTML = optionsHtml;

        categoryFilter.addEventListener('change', (e) => {
            setDanaTitipanState({ danaTitipanFilterCategory: e.target.value, danaTitipanCurrentPage: 1 });
            filterAndDisplayDanaTitipan();
        });
    }

    // Account filter - will load options dynamically
    loadDanaTitipanAccountOptionsForFilter();

    const accountFilter = document.getElementById('dana_titipan-filter-account');
    if (accountFilter) {
        accountFilter.addEventListener('change', (e) => {
            setDanaTitipanState({ danaTitipanFilterAccount: e.target.value, danaTitipanCurrentPage: 1 });
            filterAndDisplayDanaTitipan();
        });
    }

    // Items per page
    const itemsPerPageSelect = document.getElementById('dana_titipan-items-per-page');
    if (itemsPerPageSelect) {
        const state = getDanaTitipanState();
        itemsPerPageSelect.value = state.danaTitipanItemsPerPage;
        itemsPerPageSelect.addEventListener('change', (e) => {
            setDanaTitipanState({ danaTitipanItemsPerPage: parseInt(e.target.value), danaTitipanCurrentPage: 1 });
            filterAndDisplayDanaTitipan();
        });
    }
}

// Load rekening options for filter dropdown
async function loadDanaTitipanAccountOptionsForFilter() {
    try {
        const rekeningOptions = await getRekeningOptions();
        const accountFilter = document.getElementById('dana_titipan-filter-account');
        if (accountFilter) {
            const state = getDanaTitipanState();
            const optionsHtml = '<option value="">Semua Rekening</option>' +
                rekeningOptions.map(item => `<option value="${item.value}" ${item.value === state.danaTitipanFilterAccount ? 'selected' : ''}>${item.text}</option>`).join('');
            accountFilter.innerHTML = optionsHtml;
        }
    } catch (error) {
        console.error('Error loading account options for filter:', error);
    }
}

// Reset filters
function resetDanaTitipanFilters() {
    resetFilters();

    // Reset UI elements
    const searchInput = document.getElementById('dana_titipan-search');
    const categoryFilter = document.getElementById('dana_titipan-filter-category');
    const accountFilter = document.getElementById('dana_titipan-filter-account');
    const dateFromFilter = document.getElementById('dana_titipan-date-from');

    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (accountFilter) accountFilter.value = '';

    setDanaTitipanState({ danaTitipanCurrentPage: 1 });
    filterAndDisplayDanaTitipan();
}

// Sort dana_titipan data
function sortDanaTitipanData(column, direction) {
    if (direction === 'none') {
        displayDanaTitipanTable(getDanaTitipanData());
        return;
    }

    let filteredData = [...getDanaTitipanData()];

    // Apply current filters first
    const state = getDanaTitipanState();

    if (state.danaTitipanSearchTerm) {
        filteredData = applySearchFilter(filteredData, state.danaTitipanSearchTerm, [
            'id_transaksi',
            'keterangan',
            'penghuni.nama_kepala_keluarga',
            'hunian.nomor_blok_rumah'
        ]);
    }

    if (state.danaTitipanFilterCategory) {
        filteredData = filteredData.filter(item => item.kategori_id === state.danaTitipanFilterCategory);
    }

    if (state.danaTitipanFilterAccount) {
        filteredData = filteredData.filter(item => item.rekening_id === state.danaTitipanFilterAccount);
    }

    if (state.danaTitipanFilterDateFrom) {
        filteredData = filteredData.filter(item => new Date(item.tanggal) >= new Date(state.danaTitipanFilterDateFrom));
    }
    if (state.danaTitipanFilterDateTo) {
        filteredData = filteredData.filter(item => new Date(item.tanggal) <= new Date(state.danaTitipanFilterDateTo));
    }

    // Apply sorting
    filteredData = applySorting(filteredData, column, direction, [
        // Custom sorting for date columns
        'tanggal', 'created_at'
    ]);

    // Display sorted data
    const { data: paginatedData } = paginateData(filteredData, state.danaTitipanCurrentPage, state.danaTitipanItemsPerPage);
    displayDanaTitipanTable(paginatedData);
}

export {
    filterAndDisplayDanaTitipan,
    initializeDanaTitipanSearchAndFilter,
    resetDanaTitipanFilters,
    sortDanaTitipanData,
    loadDanaTitipanAccountOptionsForFilter
};
