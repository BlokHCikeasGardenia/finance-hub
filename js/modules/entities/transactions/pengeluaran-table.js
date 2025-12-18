// Pengeluaran table rendering and pagination module

import { renderPagination, formatCurrency, debounce } from '../../utils.js';
import {
    getPengeluaranData,
    getPengeluaranCategories,
    getPengeluaranSubcategories,
    getPengeluaranState,
    setPengeluaranState,
    getRekeningOptions
} from './pengeluaran-data.js';

// Table columns configuration
const pengeluaranTableColumns = [
    { key: 'id_transaksi', label: 'ID Transaksi', sortable: true },
    { key: 'tanggal', label: 'Tanggal', width: '100px', sortable: true, render: (item) => new Date(item.tanggal).toLocaleDateString('id-ID') },
    { key: 'kategori', label: 'Kategori', sortable: true, render: renderPengeluaranCategory },
    { key: 'subkategori', label: 'Subkategori', sortable: true, render: (item) => item.subkategori?.nama_subkategori || '-' },
    { key: 'nominal', label: 'Nominal', sortable: true, render: (item) => formatCurrency(item.nominal) },
    { key: 'penerima', label: 'Penerima', sortable: true },
    { key: 'rekening', label: 'Rekening', sortable: true, render: (item) => item.rekening?.jenis_rekening || '-' },
    { key: 'keterangan', label: 'Keterangan', sortable: false },
    { key: 'link_url', label: 'Bukti', sortable: false, render: renderPengeluaranLink }
];

// Category badge renderer
function renderPengeluaranCategory(item) {
    const categoryName = item.kategori?.nama_kategori || 'Lainnya';
    return `<span class="badge bg-danger">${categoryName}</span>`;
}

// Link URL renderer for expense receipts
function renderPengeluaranLink(item) {
    if (item.link_url) {
        // Check if it's a full URL or just a path
        const url = item.link_url.startsWith('http') ? item.link_url : `https://${item.link_url}`;
        return `<a href="${url}" target="_blank" class="btn btn-sm btn-outline-info" title="Lihat Bukti Pengeluaran"><i class="bi bi-link-45deg"></i> Bukti</a>`;
    }
    return '-';
}

// Filter and display pengeluaran data
function filterAndDisplayPengeluaran() {
    const state = getPengeluaranState();
    let filteredData = [...state.pengeluaranData];

    // Apply search filter
    if (state.pengeluaranSearchTerm) {
        filteredData = filteredData.filter(item =>
            ['id_transaksi', 'keterangan', 'penerima'].some(field =>
                item[field]?.toString().toLowerCase().includes(state.pengeluaranSearchTerm.toLowerCase())
            ) ||
            (item.kategori?.nama_kategori || '').toLowerCase().includes(state.pengeluaranSearchTerm.toLowerCase()) ||
            (item.subkategori?.nama_subkategori || '').toLowerCase().includes(state.pengeluaranSearchTerm.toLowerCase())
        );
    }

    // Apply category filter
    if (state.pengeluaranFilterCategory) {
        filteredData = filteredData.filter(item => item.kategori_id === state.pengeluaranFilterCategory);
    }

    // Apply subcategory filter
    if (state.pengeluaranFilterSubcategory) {
        filteredData = filteredData.filter(item => item.subkategori_id === state.pengeluaranFilterSubcategory);
    }

    // Apply account filter
    if (state.pengeluaranFilterAccount) {
        filteredData = filteredData.filter(item => item.rekening_id === state.pengeluaranFilterAccount);
    }

    // Apply date filters
    if (state.pengeluaranFilterDateFrom) {
        filteredData = filteredData.filter(item => new Date(item.tanggal) >= new Date(state.pengeluaranFilterDateFrom));
    }
    if (state.pengeluaranFilterDateTo) {
        filteredData = filteredData.filter(item => new Date(item.tanggal) <= new Date(state.pengeluaranFilterDateTo));
    }

    // Update total count display
    const totalNominal = filteredData.reduce((sum, item) => sum + (item.nominal || 0), 0);
    const totalCountElement = document.getElementById('pengeluaran-total-count');
    const totalNominalElement = document.getElementById('pengeluaran-total-nominal');

    if (totalCountElement) totalCountElement.textContent = `${filteredData.length} transaksi`;
    if (totalNominalElement) totalNominalElement.textContent = `Total: ${formatCurrency(totalNominal)}`;

    // Display filtered data
    displayPengeluaranTable(filteredData);
}

// Display pengeluaran table with pagination
function displayPengeluaranTable(data) {
    const state = getPengeluaranState();
    const startIndex = (state.pengeluaranCurrentPage - 1) * state.pengeluaranItemsPerPage;
    const endIndex = startIndex + state.pengeluaranItemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    const totalPages = Math.ceil(data.length / state.pengeluaranItemsPerPage);

    const tableHtml = createPengeluaranTableHtml(paginatedData);
    const paginationHtml = renderPagination('pengeluaran', state.pengeluaranCurrentPage, totalPages);

    const tableElement = document.getElementById('pengeluaran-table');
    if (tableElement) {
        tableElement.innerHTML = tableHtml + paginationHtml;
    }

    // Attach sort listeners
    attachPengeluaranSortListeners();
}

// Create HTML for pengeluaran table
function createPengeluaranTableHtml(data) {
    let html = `
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

    if (data.length > 0) {
        data.forEach((item, index) => {
            const state = getPengeluaranState();
            let displayIndex = index + 1;
            if (state && state.pengeluaranCurrentPage) {
                displayIndex = (state.pengeluaranCurrentPage - 1) * state.pengeluaranItemsPerPage + index + 1;
            }

            html += `<tr>
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
        html += `<tr><td colspan="${colspan}" class="text-center text-muted">Tidak ada data pengeluaran</td></tr>`;
    }

    html += `</tbody></table></div>`;
    return html;
}

// Helper function to get nested object value
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
    }, obj);
}

// Attach sort listeners to table headers
function attachPengeluaranSortListeners() {
    const sortableHeaders = document.querySelectorAll('#pengeluaran-table .sortable');

    sortableHeaders.forEach(header => {
        // Avoid attaching duplicate per-header listeners when re-rendering
        if (header._pengeluaranClickAttached) return;
        header._pengeluaranClickAttached = true;

        header.addEventListener('click', () => {
            const column = header.dataset.column;
            const state = getPengeluaranState();

            // Determine new sort direction (cycle asc -> desc -> none)
            let newDirection = 'asc';
            if (state.pengeluaranSortColumn === column) {
                if (state.pengeluaranSortDirection === 'asc') {
                    newDirection = 'desc';
                } else if (state.pengeluaranSortDirection === 'desc') {
                    newDirection = 'none';
                }
            }

            // Update sort state
            setPengeluaranState({
                pengeluaranSortColumn: newDirection !== 'none' ? column : '',
                pengeluaranSortDirection: newDirection
            });

            // Update UI indicators
            updateSortIndicators(column, newDirection);

            // Re-filter and display data
            if (typeof filterAndDisplayPengeluaran === 'function') {
                filterAndDisplayPengeluaran();
            }
        });
    });

    // Reflect current sort state immediately after attaching listeners
    try {
        const state = (typeof getPengeluaranState === 'function') ? getPengeluaranState() : null;
        if (state) updateSortIndicators(state.pengeluaranSortColumn, state.pengeluaranSortDirection);
    } catch (e) {
        // ignore
    }
}

// Update sort indicators in table headers
function updateSortIndicators(activeColumn, direction) {
    const sortableHeaders = document.querySelectorAll('#pengeluaran-table .sortable');

    sortableHeaders.forEach(header => {
        const icon = header.querySelector('.sort-icon');
        // clear state classes
        header.classList.remove('sort-asc', 'sort-desc', 'sort-neutral');

        if (header.dataset.column === activeColumn) {
            if (direction === 'asc') {
                if (icon) icon.className = 'bi bi-sort-up sort-icon';
                header.classList.add('sort-asc');
            } else if (direction === 'desc') {
                if (icon) icon.className = 'bi bi-sort-down sort-icon';
                header.classList.add('sort-desc');
            } else {
                if (icon) icon.className = 'bi bi-chevron-expand sort-icon';
                header.classList.add('sort-neutral');
            }
        } else {
            if (icon) icon.className = 'bi bi-chevron-expand sort-icon';
            header.classList.add('sort-neutral');
        }
    });
}

// Change page function for pagination
function changePengeluaranPage(page) {
    const state = getPengeluaranState();
    setPengeluaranState({ pengeluaranCurrentPage: page });
    filterAndDisplayPengeluaran();
}

export {
    pengeluaranTableColumns,
    filterAndDisplayPengeluaran,
    displayPengeluaranTable,
    changePengeluaranPage,
    createPengeluaranTableHtml,
    attachPengeluaranSortListeners,
    updateSortIndicators
};
