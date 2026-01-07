// Dana Titipan table rendering module
// Handles table display, pagination, and sorting

import { getDanaTitipanState, setDanaTitipanState } from './dana_titipan-data.js';
import { renderPagination } from '../../utils.js';
import { filterAndDisplayDanaTitipan } from './dana_titipan-filters.js';

// Table columns configuration - matching app_old.js structure
const danaTitipanTableColumns = [
    { key: 'id_transaksi', label: 'ID Transaksi', sortable: true },
    { key: 'tanggal', label: 'Tanggal', width: '100px', sortable: true, render: (item) => new Date(item.tanggal).toLocaleDateString('id-ID') },
    { key: 'kategori', label: 'Kategori', sortable: true, render: renderDanaTitipanCategory },
    { key: 'periode', label: 'Periode', sortable: true, render: (item) => item.periode?.nama_periode || '-' },
    { key: 'nominal', label: 'Nominal', sortable: true, render: (item) => formatCurrency(item.nominal) },
    { key: 'penghuni', label: 'Penghuni', sortable: true, render: (item) => item.penghuni?.nama_kepala_keluarga || '-' },
    { key: 'hunian', label: 'Hunian', sortable: true, render: (item) => item.hunian?.nomor_blok_rumah || '-' },
    { key: 'rekening', label: 'Rekening', sortable: true, render: (item) => item.rekening?.jenis_rekening || '-' },
    { key: 'keterangan', label: 'Keterangan', sortable: false },
    { key: 'created_at', label: 'Dibuat', sortable: true, render: (item) => item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-' }
];

// Import formatCurrency function
let formatCurrency;
import('../../utils.js').then(utils => {
    formatCurrency = utils.formatCurrency;
});

// Helper function to get badge color based on category
function getCategoryBadgeColor(categoryName) {
    if (!categoryName) return 'bg-danger';

    const category = categoryName.toLowerCase();
    if (category.includes('ipl')) return 'bg-info';        // Light blue for IPL
    if (category.includes('air')) return 'bg-primary';     // Blue for Air
    if (category.includes('aula')) return 'bg-warning';    // Yellow for Aula
    if (category.includes('lainnya')) return 'bg-secondary'; // Gray for Lainnya

    return 'bg-danger'; // Red for other categories
}

// Category badge renderer
function renderDanaTitipanCategory(item) {
    const categoryName = item.kategori_saldo?.nama_kategori || 'Deposit';
    return `<span class="badge ${getCategoryBadgeColor(categoryName)}">${categoryName}</span>`;
}

// Display dana_titipan table with pagination (corrected function name)
function displayDanaTitipanTable(data) {
    const state = getDanaTitipanState();
    // Calculate pagination info
    const totalPages = Math.ceil(data.length / state.danaTitipanItemsPerPage);

    // Handle case where current page is beyond available pages (e.g., after filtering)
    let currentPage = state.danaTitipanCurrentPage;
    if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
        setDanaTitipanState({ danaTitipanCurrentPage: currentPage });
    } else if (totalPages === 0) {
        currentPage = 1;
    }

    const startIndex = (currentPage - 1) * state.danaTitipanItemsPerPage;
    const endIndex = startIndex + state.danaTitipanItemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    const tableHtml = createDanaTitipanTableHtml(paginatedData, {
        currentPage,
        totalPages,
        itemsPerPage: state.danaTitipanItemsPerPage
    });

    const tableElement = document.getElementById('dana_titipan-table');
    if (tableElement) {
        tableElement.innerHTML = tableHtml;
        // Re-attach sort event listeners
        attachDanaTitipanSortListeners();
    }
}

// Create HTML for dana_titipan table
function createDanaTitipanTableHtml(data, pagination) {
    let html = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        ${danaTitipanTableColumns.map(col => {
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
            const globalIndex = (pagination.currentPage - 1) * pagination.itemsPerPage + index + 1;
            html += `<tr>
                ${danaTitipanTableColumns.map(col => {
                    const value = col.render ? col.render(item, col.key) : getNestedValue(item, col.key) || '-';
                    return `<td>${value}</td>`;
                }).join('')}
                <td>
                    <button onclick="editDanaTitipan('${item.id}')" class="btn btn-sm btn-outline-primary me-1">Edit</button>
                    <button onclick="convertDanaTitipanToPembayaran('${item.id}')" class="btn btn-sm btn-outline-success me-1" title="Konversi ke Pembayaran">Konversi</button>
                    <button onclick="confirmDeleteDanaTitipan('${item.id}')" class="btn btn-sm btn-outline-danger">Hapus</button>
                </td>
            </tr>`;
        });
    } else {
        const colspan = danaTitipanTableColumns.length + 1;
        html += `<tr><td colspan="${colspan}" class="text-center text-muted">Tidak ada data dana titipan</td></tr>`;
    }

    html += `</tbody></table>`;

    // Add pagination controls
    const paginationHtml = renderPagination('dana_titipan', pagination.currentPage, pagination.totalPages);
    html += paginationHtml;

    return html;
}

// Helper function to get nested object value
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
    }, obj);
}

// Change page
function changeDanaTitipanPage(page) {
    // Set the page (validation will be handled by the display function)
    setDanaTitipanState({ danaTitipanCurrentPage: page });

    // Re-render table with filters applied
    filterAndDisplayDanaTitipan(false); // false = not a filter change, just pagination
}

// Attach sort listeners
function attachDanaTitipanSortListeners() {
    const sortableHeaders = document.querySelectorAll('#dana_titipan-table .sortable');

    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.column;
            const currentSort = header.dataset.sort || 'none';

            // Reset all sort indicators
            sortableHeaders.forEach(h => {
                h.dataset.sort = 'none';
                const icon = h.querySelector('.sort-icon');
                if (icon) icon.className = 'bi bi-chevron-expand sort-icon';
            });

            // Determine new sort direction
            let newSort = 'asc';
            if (currentSort === 'asc') newSort = 'desc';
            else if (currentSort === 'desc') newSort = 'none';

            header.dataset.sort = newSort;

            // Update icon
            const icon = header.querySelector('.sort-icon');
            if (icon) {
                if (newSort === 'asc') icon.className = 'bi bi-chevron-up sort-icon';
                else if (newSort === 'desc') icon.className = 'bi bi-chevron-down sort-icon';
                else icon.className = 'bi bi-chevron-expand sort-icon';
            }

            // Apply sorting
            if (typeof sortDanaTitipanData === 'function') {
                sortDanaTitipanData(column, newSort);
            }
        });
    });
}

export {
    danaTitipanTableColumns,
    renderDanaTitipanCategory,
    displayDanaTitipanTable,
    createDanaTitipanTableHtml,
    getNestedValue,
    changeDanaTitipanPage,
    attachDanaTitipanSortListeners
};

// Make changeDanaTitipanPage globally available for pagination
window.changeDanaTitipanPage = changeDanaTitipanPage;
