// Pemasukan search and filter module
// Handles search, filter, sort functionality and initialization

import {
    getPemasukanState,
    setPemasukanState,
    getPemasukanCategories,
    getRekeningOptions
} from './pemasukan-data.js';
import { displayPemasukanTable } from './pemasukan-table.js';
import { applySearchFilter, applySorting, paginateData } from '../../crud.js';
import { formatCurrency, debounce } from '../../utils.js';

// Filter and display pemasukan data
function filterAndDisplayPemasukan(isFilterChange = true) {
    const state = getPemasukanState();
    let filteredData = [...state.pemasukanData];

    // Apply search filter
    if (state.pemasukanSearchTerm) {
        filteredData = applySearchFilter(filteredData, state.pemasukanSearchTerm, [
            'id_transaksi',
            'keterangan',
            'penghuni.nama_kepala_keluarga',
            'nama_pembayar',
            'hunian.nomor_blok_rumah',
            'kategori_saldo.nama_kategori',
            'rekening.jenis_rekening'
        ]);
    }

    // Apply category filter
    if (state.pemasukanFilterCategory) {
        filteredData = filteredData.filter(item => item.kategori_id === state.pemasukanFilterCategory);
    }

    // Apply account filter
    if (state.pemasukanFilterAccount) {
        filteredData = filteredData.filter(item => item.rekening_id === state.pemasukanFilterAccount);
    }

    // Apply date filters
    if (state.pemasukanFilterDateFrom) {
        filteredData = filteredData.filter(item => new Date(item.tanggal) >= new Date(state.pemasukanFilterDateFrom));
    }
    if (state.pemasukanFilterDateTo) {
        filteredData = filteredData.filter(item => new Date(item.tanggal) <= new Date(state.pemasukanFilterDateTo));
    }

    // Apply sorting if specified
    if (state.pemasukanSortColumn && state.pemasukanSortDirection !== 'none') {
        filteredData = applySorting(filteredData, state.pemasukanSortColumn, state.pemasukanSortDirection, [
            'tanggal', 'created_at'
        ]);
    }

    // Update total count display
    const totalNominal = filteredData.reduce((sum, item) => sum + (item.nominal || 0), 0);
    const totalCountElement = document.getElementById('pemasukan-total-count');
    const totalNominalElement = document.getElementById('pemasukan-total-nominal');

    if (totalCountElement) totalCountElement.textContent = `${filteredData.length} transaksi`;
    if (totalNominalElement) totalNominalElement.textContent = `Total: ${formatCurrency(totalNominal)}`;

    // Update filtered count in state
    setPemasukanState({ pemasukanFilteredCount: filteredData.length });

    // Display filtered data (pagination handled by displayPemasukanTable)
    displayPemasukanTable(filteredData);

    // Reset to page 1 only when filters actually change
    if (isFilterChange) {
        setPemasukanState({ pemasukanCurrentPage: 1 });
    }
}

// Initialize search and filter functionality
function initializePemasukanSearchAndFilter() {
    // Search filter
    const searchInput = document.getElementById('pemasukan-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            const searchTerm = searchInput.value.trim().toLowerCase();
            setPemasukanState({ pemasukanSearchTerm: searchTerm, pemasukanCurrentPage: 1 });
            filterAndDisplayPemasukan();
        }, 300));
    }

    // Category filter
    const categoryFilter = document.getElementById('pemasukan-filter-category');
    if (categoryFilter) {
        const categories = getPemasukanCategories();
        const optionsHtml = '<option value="">Semua Kategori</option>' +
            categories.map(cat => `<option value="${cat.value}">${cat.text}</option>`).join('');
        categoryFilter.innerHTML = optionsHtml;

        categoryFilter.addEventListener('change', (e) => {
            setPemasukanState({ pemasukanFilterCategory: e.target.value, pemasukanCurrentPage: 1 });
            filterAndDisplayPemasukan();
        });
    }

    // Account filter - will load options dynamically
    loadPemasukanAccountOptionsForFilter();

    const accountFilter = document.getElementById('pemasukan-filter-account');
    if (accountFilter) {
        accountFilter.addEventListener('change', (e) => {
            setPemasukanState({ pemasukanFilterAccount: e.target.value, pemasukanCurrentPage: 1 });
            filterAndDisplayPemasukan();
        });
    }

    // Date filters
    const dateFromFilter = document.getElementById('pemasukan-date-from');
    const dateToFilter = document.getElementById('pemasukan-date-to');

    if (dateFromFilter) {
        dateFromFilter.addEventListener('change', (e) => {
            setPemasukanState({ pemasukanFilterDateFrom: e.target.value, pemasukanCurrentPage: 1 });
            filterAndDisplayPemasukan();
        });
    }

    if (dateToFilter) {
        dateToFilter.addEventListener('change', (e) => {
            setPemasukanState({ pemasukanFilterDateTo: e.target.value, pemasukanCurrentPage: 1 });
            filterAndDisplayPemasukan();
        });
    }

    // Items per page
    const itemsPerPageSelect = document.getElementById('pemasukan-items-per-page');
    if (itemsPerPageSelect) {
        const state = getPemasukanState();
        itemsPerPageSelect.value = state.pemasukanItemsPerPage;
        itemsPerPageSelect.addEventListener('change', (e) => {
            setPemasukanState({ pemasukanItemsPerPage: parseInt(e.target.value), pemasukanCurrentPage: 1 });
            filterAndDisplayPemasukan();
        });
    }
}

// Load rekening options for filter dropdown
async function loadPemasukanAccountOptionsForFilter() {
    try {
        const rekeningOptions = await getRekeningOptions();
        const accountFilter = document.getElementById('pemasukan-filter-account');
        if (accountFilter) {
            const state = getPemasukanState();
            const optionsHtml = '<option value="">Semua Rekening</option>' +
                rekeningOptions.map(item => `<option value="${item.value}" ${item.value === state.pemasukanFilterAccount ? 'selected' : ''}>${item.text}</option>`).join('');
            accountFilter.innerHTML = optionsHtml;
        }
    } catch (error) {
        console.error('Error loading account options for filter:', error);
    }
}

// Reset filters
function resetPemasukanFilters() {
    setPemasukanState({
        pemasukanSearchTerm: '',
        pemasukanFilterCategory: '',
        pemasukanFilterAccount: '',
        pemasukanFilterDateFrom: '',
        pemasukanFilterDateTo: '',
        pemasukanSortColumn: '',
        pemasukanSortDirection: 'none',
        pemasukanCurrentPage: 1
    });

    // Reset UI elements
    const searchInput = document.getElementById('pemasukan-search');
    const categoryFilter = document.getElementById('pemasukan-filter-category');
    const accountFilter = document.getElementById('pemasukan-filter-account');
    const dateFromFilter = document.getElementById('pemasukan-date-from');
    const dateToFilter = document.getElementById('pemasukan-date-to');

    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (accountFilter) accountFilter.value = '';
    if (dateFromFilter) dateFromFilter.value = '';
    if (dateToFilter) dateToFilter.value = '';

    filterAndDisplayPemasukan();
}

// Sort pemasukan data
function sortPemasukanData(column, direction) {
    if (direction === 'none') {
        setPemasukanState({ pemasukanSortColumn: '', pemasukanSortDirection: 'none' });
        filterAndDisplayPemasukan(false);
        return;
    }

    // Update sort state
    setPemasukanState({
        pemasukanSortColumn: column,
        pemasukanSortDirection: direction
    });

    // Re-apply filters and sorting
    filterAndDisplayPemasukan(false);
}

export {
    filterAndDisplayPemasukan,
    initializePemasukanSearchAndFilter,
    resetPemasukanFilters,
    sortPemasukanData,
    loadPemasukanAccountOptionsForFilter
};
