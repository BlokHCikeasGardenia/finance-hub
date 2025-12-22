// Pemindahbukuan table rendering and pagination module

import { renderPagination, formatCurrency } from '../../utils.js';
import {
    getPemindahbukuanData,
    getPemindahbukuanState,
    setPemindahbukuanState
} from './pemindahbukuan-data.js';

// Table columns configuration
const pemindahbukuanTableColumns = [
    { key: 'tanggal', label: 'Tanggal', width: '100px', sortable: true, render: (item) => new Date(item.tanggal).toLocaleDateString('id-ID') },
    { key: 'id_transaksi', label: 'ID Transaksi', sortable: true },
    { key: 'nominal', label: 'Nominal', sortable: true, render: (item) => formatCurrency(item.nominal) },
    { key: 'rekening_dari', label: 'Rekening Dari', sortable: true, render: (item) => item.rekening_dari?.jenis_rekening || '-' },
    { key: 'rekening_ke', label: 'Rekening Ke', sortable: true, render: (item) => item.rekening_ke?.jenis_rekening || '-' },
    { key: 'catatan', label: 'Catatan', sortable: false }
];

// Filter and display pemindahbukuan data
function filterAndDisplayPemindahbukuan() {
    const state = getPemindahbukuanState();
    let filteredData = [...state.pemindahbukuanData];

    // Apply search filter
    if (state.pemindahbukuanSearchTerm) {
        filteredData = filteredData.filter(item =>
            ['id_transaksi', 'catatan'].some(field =>
                item[field]?.toString().toLowerCase().includes(state.pemindahbukuanSearchTerm.toLowerCase())
            ) ||
            (item.rekening_dari?.jenis_rekening || '').toLowerCase().includes(state.pemindahbukuanSearchTerm) ||
            (item.rekening_ke?.jenis_rekening || '').toLowerCase().includes(state.pemindahbukuanSearchTerm)
        );
    }

    // Apply date filters
    if (state.pemindahbukuanFilterDateFrom) {
        filteredData = filteredData.filter(item => new Date(item.tanggal) >= new Date(state.pemindahbukuanFilterDateFrom));
    }
    if (state.pemindahbukuanFilterDateTo) {
        filteredData = filteredData.filter(item => new Date(item.tanggal) <= new Date(state.pemindahbukuanFilterDateTo));
    }

    // Update total count display
    const totalNominal = filteredData.reduce((sum, item) => sum + (item.nominal || 0), 0);
    const totalCountElement = document.getElementById('pemindahbukuan-total-count');
    const totalNominalElement = document.getElementById('pemindahbukuan-total-nominal');

    if (totalCountElement) totalCountElement.textContent = `${filteredData.length} transaksi`;
    if (totalNominalElement) totalNominalElement.textContent = `Total: ${formatCurrency(totalNominal)}`;

    // Display filtered data
    displayPemindahbukuanTable(filteredData);
}

// Display pemindahbukuan table with pagination
function displayPemindahbukuanTable(data) {
    const state = getPemindahbukuanState();
    const startIndex = (state.pemindahbukuanCurrentPage - 1) * state.pemindahbukuanItemsPerPage;
    const endIndex = startIndex + state.pemindahbukuanItemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    const totalPages = Math.ceil(data.length / state.pemindahbukuanItemsPerPage);

    const tableHtml = createPemindahbukuanTableHtml(paginatedData);
    const paginationHtml = renderPagination('pemindahbukuan', state.pemindahbukuanCurrentPage, totalPages);

    const tableElement = document.getElementById('pemindahbukuan-table');
    if (tableElement) {
        tableElement.innerHTML = tableHtml + paginationHtml;
    }

    // Attach sort listeners
    attachPemindahbukuanSortListeners();
}

// Create HTML for pemindahbukuan table
function createPemindahbukuanTableHtml(data) {
    let html = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        ${pemindahbukuanTableColumns.map(col => {
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
        data.forEach((item) => {
            const globalIndex = ((getPemindahbukuanState()).pemindahbukuanCurrentPage - 1) * (getPemindahbukuanState()).pemindahbukuanItemsPerPage + data.indexOf(item) + 1;
            html += `<tr>
                ${pemindahbukuanTableColumns.map(col => {
                    const value = col.render ? col.render(item) : getNestedValue(item, col.key) || '-';
                    return `<td>${value}</td>`;
                }).join('')}
                <td>
                    <button onclick="editPemindahbukuan('${item.id}')" class="btn btn-sm btn-outline-primary me-2">Edit</button>
                    <button onclick="confirmDeletePemindahbukuan('${item.id}')" class="btn btn-sm btn-outline-danger">Hapus</button>
                </td>
            </tr>`;
        });
    } else {
        const colspan = pemindahbukuanTableColumns.length + 1;
        html += `<tr><td colspan="${colspan}" class="text-center text-muted">Tidak ada data pemindahbukuan</td></tr>`;
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
function attachPemindahbukuanSortListeners() {
    const tableElement = document.getElementById('pemindahbukuan-table');
    if (!tableElement) return;

    // This would be implemented if sorting is needed
    // For now, sorting logic can be added later
}

// Change page function for pagination
function changePemindahbukuanPage(page) {
    const state = getPemindahbukuanState();
    setPemindahbukuanState({ pemindahbukuanCurrentPage: page });
    filterAndDisplayPemindahbukuan();
}

export {
    filterAndDisplayPemindahbukuan,
    displayPemindahbukuanTable,
    changePemindahbukuanPage,
    createPemindahbukuanTableHtml
};
