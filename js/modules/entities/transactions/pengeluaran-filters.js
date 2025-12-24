// Pengeluaran search and filter module
// Handles search, filter, sort functionality and initialization

import {
    getPengeluaranData,
    getPengeluaranCategories,
    getPengeluaranSubcategories,
    getPengeluaranState,
    setPengeluaranState,
    loadPengeluaranSubcategories,
    getRekeningOptions
} from './pengeluaran-data.js';
import { filterAndDisplayPengeluaran, pengeluaranTableColumns } from './pengeluaran-table.js';
import { formatCurrency, debounce } from '../../utils.js';
import { applySorting } from '../../crud.js';

// Helper function to get nested object value
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
    }, obj);
}

// Filter and display pengeluaran data (wrapper to work with state)
function filterAndDisplayPengeluaranWrapper(isFilterChange = true) {
    filterAndDisplayPengeluaran();
}

// Initialize search and filter functionality
function initializePengeluaranSearchAndFilter() {
    // Search filter
    const searchInput = document.getElementById('pengeluaran-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            const searchTerm = searchInput.value.trim().toLowerCase();
            setPengeluaranState({ pengeluaranSearchTerm: searchTerm });
            filterAndDisplayPengeluaranWrapper();
        }, 300));
    }

    // Category filter
    const categoryFilter = document.getElementById('pengeluaran-filter-category');
    if (categoryFilter) {
        const categories = getPengeluaranCategories();
        const optionsHtml = '<option value="">Semua Kategori</option>' +
            categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
        categoryFilter.innerHTML = optionsHtml;

        categoryFilter.addEventListener('change', async (e) => {
            const categoryId = e.target.value;
            setPengeluaranState({
                pengeluaranFilterCategory: categoryId,
                pengeluaranFilterSubcategory: '' // Reset subcategory filter when category changes
            });

            // Reload subcategories when category changes
            if (categoryId) {
                await loadPengeluaranSubcategories(categoryId);
            } else {
                await loadPengeluaranSubcategories(); // Load all subcategories if no category selected
            }

            // Update subcategory filter options
            loadPengeluaranSubcategoryOptionsForFilter();
            filterAndDisplayPengeluaranWrapper();
        });
    }

    // Subcategory filter
    loadPengeluaranSubcategoryOptionsForFilter();
    const subcategoryFilter = document.getElementById('pengeluaran-filter-subcategory');
    if (subcategoryFilter) {
        subcategoryFilter.addEventListener('change', (e) => {
            setPengeluaranState({ pengeluaranFilterSubcategory: e.target.value });
            filterAndDisplayPengeluaranWrapper();
        });
    }

    // Account filter - load options dynamically
    loadPengeluaranAccountOptionsForFilter();

    const accountFilter = document.getElementById('pengeluaran-filter-account');
    if (accountFilter) {
        accountFilter.addEventListener('change', (e) => {
            setPengeluaranState({ pengeluaranFilterAccount: e.target.value });
            filterAndDisplayPengeluaranWrapper();
        });
    }

    // Items per page
    const itemsPerPageSelect = document.getElementById('pengeluaran-items-per-page');
    if (itemsPerPageSelect) {
        const state = getPengeluaranState();
        itemsPerPageSelect.value = state.pengeluaranItemsPerPage;
        itemsPerPageSelect.addEventListener('change', (e) => {
            setPengeluaranState({ pengeluaranItemsPerPage: parseInt(e.target.value), pengeluaranCurrentPage: 1 });
            filterAndDisplayPengeluaranWrapper();
        });
    }
}

// Load rekening options for filter dropdown
async function loadPengeluaranAccountOptionsForFilter() {
    try {
        const rekeningOptions = await getRekeningOptions();
        const accountFilter = document.getElementById('pengeluaran-filter-account');
        if (accountFilter) {
            const state = getPengeluaranState();
            const optionsHtml = '<option value="">Semua Rekening</option>' +
                rekeningOptions.map(item => `<option value="${item.value}" ${item.value === state.pengeluaranFilterAccount ? 'selected' : ''}>${item.text}</option>`).join('');
            accountFilter.innerHTML = optionsHtml;
        }
    } catch (error) {
        console.error('Error loading account options for filter:', error);
    }
}

// Load subcategory options for filter dropdown
function loadPengeluaranSubcategoryOptionsForFilter() {
    try {
        const subcategories = getPengeluaranSubcategories();
        const subcategoryFilter = document.getElementById('pengeluaran-filter-subcategory');
        if (subcategoryFilter) {
            const state = getPengeluaranState();
            const optionsHtml = '<option value="">Semua Subkategori</option>' +
                subcategories.map(item => `<option value="${item.id}" ${item.id === state.pengeluaranFilterSubcategory ? 'selected' : ''}>${item.nama_subkategori} (${item.kategori_saldo?.nama_kategori || 'Unknown'})</option>`).join('');
            subcategoryFilter.innerHTML = optionsHtml;
        }
    } catch (error) {
        console.error('Error loading subcategory options for filter:', error);
    }
}

// Reset filters
function resetPengeluaranFilters() {
    setPengeluaranState({
        pengeluaranSearchTerm: '',
        pengeluaranFilterCategory: '',
        pengeluaranFilterSubcategory: '',
        pengeluaranFilterAccount: '',
        pengeluaranFilterDateFrom: '',
        pengeluaranFilterDateTo: ''
    });

    // Reset UI elements
    const searchInput = document.getElementById('pengeluaran-search');
    const categoryFilter = document.getElementById('pengeluaran-filter-category');
    const subcategoryFilter = document.getElementById('pengeluaran-filter-subcategory');
    const accountFilter = document.getElementById('pengeluaran-filter-account');
    const dateFromFilter = document.getElementById('pengeluaran-date-from');

    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (subcategoryFilter) subcategoryFilter.value = '';
    if (accountFilter) accountFilter.value = '';
    if (dateFromFilter) dateFromFilter.value = '';

    filterAndDisplayPengeluaranWrapper();
}

// Sort pengeluaran data
function sortPengeluaranData(column, direction) {
    if (direction === 'none') {
        filterAndDisplayPengeluaranWrapper(false);
        return;
    }

    let filteredData = [...getPengeluaranData()];

    // Apply current filters first
    const state = getPengeluaranState();

    if (state.pengeluaranSearchTerm) {
        filteredData = filteredData.filter(item =>
            ['id_transaksi', 'keterangan', 'penerima'].some(field =>
                item[field]?.toString().toLowerCase().includes(state.pengeluaranSearchTerm.toLowerCase())
            ) ||
            (item.kategori?.nama_kategori || '').toLowerCase().includes(state.pengeluaranSearchTerm.toLowerCase()) ||
            (item.subkategori?.nama_subkategori || '').toLowerCase().includes(state.pengeluaranSearchTerm.toLowerCase())
        );
    }

    if (state.pengeluaranFilterCategory) {
        filteredData = filteredData.filter(item => item.kategori_id === state.pengeluaranFilterCategory);
    }

    if (state.pengeluaranFilterSubcategory) {
        filteredData = filteredData.filter(item => item.subkategori_id === state.pengeluaranFilterSubcategory);
    }

    if (state.pengeluaranFilterAccount) {
        filteredData = filteredData.filter(item => item.rekening_id === state.pengeluaranFilterAccount);
    }

    if (state.pengeluaranFilterDateFrom) {
        filteredData = filteredData.filter(item => new Date(item.tanggal) >= new Date(state.pengeluaranFilterDateFrom));
    }
    if (state.pengeluaranFilterDateTo) {
        filteredData = filteredData.filter(item => new Date(item.tanggal) <= new Date(state.pengeluaranFilterDateTo));
    }

    // Apply sorting logic based on column and direction
    filteredData = applySorting(filteredData, column, direction, [
        // Custom sorting for date columns
        'tanggal', 'created_at'
    ]);

    // Update sort state
    setPengeluaranState({
        pengeluaranSortColumn: column,
        pengeluaranSortDirection: direction
    });

    // Update total count display
    const totalNominal = filteredData.reduce((sum, item) => sum + (item.nominal || 0), 0);
    const totalCountElement = document.getElementById('pengeluaran-total-count');
    const totalNominalElement = document.getElementById('pengeluaran-total-nominal');

    if (totalCountElement) totalCountElement.textContent = `${filteredData.length} transaksi`;
    if (totalNominalElement) totalNominalElement.textContent = `Total: ${formatCurrency(totalNominal)}`;

    // Create and display table HTML
    let tableHtml = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>No</th>
                        ${pengeluaranTableColumns.map(col => {
                            const sortableClass = col.sortable ? 'sortable' : '';
                            const sortIcon = col.sortable ? ' <i class="bi bi-chevron-expand sort-icon"></i>' : '';
                            return `<th class="${sortableClass}" data-column="${col.key}">${col.label}${sortIcon}</th>`;
                        }).join('')}
                        <th width="150px">Aksi</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (filteredData.length > 0) {
        filteredData.forEach((item, index) => {
            const displayIndex = index + 1;
            tableHtml += `<tr>
                <td>${displayIndex}</td>
                ${pengeluaranTableColumns.map(col => {
                    const value = col.render ? col.render(item) : getNestedValue(item, col.key) || '-';
                    return `<td>${value}</td>`;
                }).join('')}
                <td>
                    <button onclick="editPengeluaran('${item.id}')" class="btn btn-sm btn-outline-primary me-2">Edit</button>
                    <button onclick="confirmDeletePengeluaran('${item.id}')" class="btn btn-sm btn-outline-danger">Hapus</button>
                </td>
            </tr>`;
        });
    } else {
        const colspan = pengeluaranTableColumns.length + 2;
        tableHtml += `<tr><td colspan="${colspan}" class="text-center text-muted">Tidak ada data pengeluaran</td></tr>`;
    }

    tableHtml += `</tbody></table></div>`;

    const tableElement = document.getElementById('pengeluaran-table');
    if (tableElement) {
        tableElement.innerHTML = tableHtml;
    }

    // Attach sort listeners
    attachPengeluaranSortListeners();
}

export {
    filterAndDisplayPengeluaranWrapper as filterAndDisplayPengeluaran,
    initializePengeluaranSearchAndFilter,
    resetPengeluaranFilters,
    sortPengeluaranData,
    loadPengeluaranAccountOptionsForFilter,
    loadPengeluaranSubcategoryOptionsForFilter
};
