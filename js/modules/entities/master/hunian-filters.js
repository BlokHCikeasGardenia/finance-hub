// Hunian search and filter module
// Handles search, filter, sort, and pagination functionality

import { applySearchFilter, applySorting, paginateData } from '../../crud.js';
import {
    getHunianData,
    getHunianState,
    setHunianState,
    resetHunianFilters as resetFilters,
    getLorongData
} from './hunian-data.js';
import { displayHunianTable } from './hunian-table.js';

// Filter and display hunian data
function filterAndDisplayHunian() {
    const state = getHunianState();
    let filteredData = [...state.hunianData];

    // Apply search filter
    if (state.hunianSearchTerm) {
        filteredData = applySearchFilter(filteredData, state.hunianSearchTerm, [
            'nomor_blok_rumah',
            'lorong.nama_lorong',
            'penghuni_saat_ini.nama_kepala_keluarga'
        ]);
    }

    // Apply status filter
    if (state.hunianStatusFilter) {
        filteredData = filteredData.filter(item => item.status === state.hunianStatusFilter);
    }

    // Apply lorong filter
    if (state.hunianLorongFilter) {
        filteredData = filteredData.filter(item => item.lorong_id === state.hunianLorongFilter);
    }

    // Apply air filter
    if (state.hunianAirFilter) {
        const isPelangganAir = state.hunianAirFilter === 'true';
        filteredData = filteredData.filter(item => item.penghuni_saat_ini?.pelanggan_air === isPelangganAir);
    }

    // Update total count display
    document.getElementById('hunian-total-count').textContent = filteredData.length;

    // Display filtered data
    const { data: paginatedData, pagination } = paginateData(filteredData, state.hunianCurrentPage, state.hunianItemsPerPage);
    displayHunianTable(paginatedData, {
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        itemsPerPage: state.hunianItemsPerPage
    });
}

// Initialize search and filter functionality
function initializeHunianSearchAndFilter() {
    // Search input
    const searchInput = document.getElementById('hunian-search');
    if (searchInput) {
        const state = getHunianState();
        searchInput.value = state.hunianSearchTerm;
        searchInput.addEventListener('input', (e) => {
            setHunianState({ hunianSearchTerm: e.target.value.trim().toLowerCase(), hunianCurrentPage: 1 });
            filterAndDisplayHunian();
        });
    }

    // Status filter
    const statusFilter = document.getElementById('hunian-filter-status');
    if (statusFilter) {
        const state = getHunianState();
        statusFilter.value = state.hunianStatusFilter;
        statusFilter.addEventListener('change', (e) => {
            setHunianState({ hunianStatusFilter: e.target.value, hunianCurrentPage: 1 });
            filterAndDisplayHunian();
        });
    }

    // Lorong filter - Load options first
    loadLorongOptionsForFilter();

    const lorongFilter = document.getElementById('hunian-filter-lorong');
    if (lorongFilter) {
        const state = getHunianState();
        lorongFilter.value = state.hunianLorongFilter;
        lorongFilter.addEventListener('change', (e) => {
            setHunianState({ hunianLorongFilter: e.target.value, hunianCurrentPage: 1 });
            filterAndDisplayHunian();
        });
    }

    // Air filter
    const airFilter = document.getElementById('hunian-filter-air');
    if (airFilter) {
        const state = getHunianState();
        airFilter.value = state.hunianAirFilter;
        airFilter.addEventListener('change', (e) => {
            setHunianState({ hunianAirFilter: e.target.value, hunianCurrentPage: 1 });
            filterAndDisplayHunian();
        });
    }

    // Items per page
    const itemsPerPageSelect = document.getElementById('hunian-items-per-page');
    if (itemsPerPageSelect) {
        const state = getHunianState();
        itemsPerPageSelect.value = state.hunianItemsPerPage;
        itemsPerPageSelect.addEventListener('change', (e) => {
            setHunianState({ hunianItemsPerPage: parseInt(e.target.value), hunianCurrentPage: 1 });
            filterAndDisplayHunian();
        });
    }
}

// Load lorong options for filter
async function loadLorongOptionsForFilter() {
    try {
        const lorongData = await getLorongData();
        const lorongFilter = document.getElementById('hunian-filter-lorong');
        if (lorongFilter) {
            const state = getHunianState();
            const optionsHtml = '<option value="">Semua Lorong</option>' +
                lorongData.map(item => `<option value="${item.value}" ${item.value === state.hunianLorongFilter ? 'selected' : ''}>${item.text}</option>`).join('');
            lorongFilter.innerHTML = optionsHtml;
        }
    } catch (error) {
        console.error('Error loading lorong options for filter:', error);
    }
}

// Reset filters - UI update function
function resetHunianFilters() {
    resetFilters();

    // Reset UI elements
    const searchInput = document.getElementById('hunian-search');
    const statusFilter = document.getElementById('hunian-filter-status');
    const lorongFilter = document.getElementById('hunian-filter-lorong');
    const airFilter = document.getElementById('hunian-filter-air');

    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    if (lorongFilter) lorongFilter.value = '';
    if (airFilter) airFilter.value = '';

    filterAndDisplayHunian();
}

// Sorting functionality
function applyHunianSorting(columnKey, direction) {
    if (direction === 'none') {
        filterAndDisplayHunian();
        return;
    }

    const state = getHunianState();
    let filteredData = [...state.hunianData];

    // Apply current filters first
    if (state.hunianSearchTerm) {
        filteredData = applySearchFilter(filteredData, state.hunianSearchTerm, [
            'nomor_blok_rumah',
            'lorong.nama_lorong',
            'penghuni_saat_ini.nama_kepala_keluarga'
        ]);
    }

    if (state.hunianStatusFilter) {
        filteredData = filteredData.filter(item => item.status === state.hunianStatusFilter);
    }

    if (state.hunianLorongFilter) {
        filteredData = filteredData.filter(item => item.lorong_id === state.hunianLorongFilter);
    }

    if (state.hunianAirFilter) {
        const isPelangganAir = state.hunianAirFilter === 'true';
        filteredData = filteredData.filter(item => item.penghuni_saat_ini?.pelanggan_air === isPelangganAir);
    }

    // Apply sorting
    filteredData = applySorting(filteredData, columnKey, direction);

    // Display sorted data
    const { data: paginatedData, pagination } = paginateData(filteredData, state.hunianCurrentPage, state.hunianItemsPerPage);
    displayHunianTable(paginatedData, {
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        itemsPerPage: state.hunianItemsPerPage
    });
}

// Change page
function changeHunianPage(page) {
    setHunianState({ hunianCurrentPage: page });
    filterAndDisplayHunian();
}

export {
    filterAndDisplayHunian,
    initializeHunianSearchAndFilter,
    resetHunianFilters,
    applyHunianSorting,
    changeHunianPage,
    loadLorongOptionsForFilter
};
