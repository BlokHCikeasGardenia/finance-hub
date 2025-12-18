// Hunian table rendering module
// Handles table configuration, rendering, and display logic

import { renderPagination } from '../../utils.js';

// Table columns configuration - matching app_old.js structure
const hunianTableColumns = [
    { key: 'nomor_urut', label: 'No. Urut', width: '80px', sortable: true },
    { key: 'nomor_blok_rumah', label: 'No. Rumah', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: renderStatusBadge },
    { key: 'lorong.nama_lorong', label: 'Lorong', sortable: true },
    { key: 'penghuni_saat_ini.nama_kepala_keluarga', label: 'Penghuni/Pemilik Saat Ini', sortable: true },
    { key: 'pelanggan_air', label: 'Pelanggan Air', sortable: true, render: renderAirBadge },
    { key: 'penghuni_saat_ini.kondisi_khusus', label: 'Kondisi Khusus', sortable: true, render: renderKondisiBadge }
];

// Status badge renderer
function renderStatusBadge(item) {
    const statusMap = {
        'berpenghuni': { text: 'Berpenghuni', class: 'success' },
        'kosong': { text: 'Kosong', class: 'secondary' }
    };
    const { text, class: badgeClass } = statusMap[item.status] || { text: item.status, class: 'secondary' };
    return `<span class="badge bg-${badgeClass}">${text}</span>`;
}

// Air customer badge renderer - matching app_old.js
function renderAirBadge(item) {
    const value = item.pelanggan_air ?? false;
    const text = value ? 'Ya' : 'Tidak';
    const badgeClass = value ? 'info' : 'secondary';
    return `<span class="badge bg-${badgeClass}">${text}</span>`;
}

// Special condition badge renderer - matching app_old.js
function renderKondisiBadge(item) {
    const value = item.penghuni_saat_ini?.kondisi_khusus ?? false;
    const text = value ? 'Ya' : 'Tidak';
    const badgeClass = value ? 'warning' : 'secondary';
    return `<span class="badge bg-${badgeClass}">${text}</span>`;
}

// Display hunian table with pagination
function displayHunianTable(data, pagination) {
    const tableHtml = createHunianTableHtml(data, pagination);
    document.getElementById('hunian-table').innerHTML = tableHtml;

    // Attach sort listeners
    attachHunianSortListeners();
}

// Create HTML for hunian table
function createHunianTableHtml(data, pagination) {
    let html = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th width="60px">No.</th>
                        ${hunianTableColumns.map(col => {
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
                <td>${globalIndex}</td>
                ${hunianTableColumns.map(col => {
                    const value = col.render ? col.render(item, col.key) : getNestedValue(item, col.key) || '-';
                    return `<td>${value}</td>`;
                }).join('')}
                <td>
                    <button onclick="editHunian('${item.id}')" class="btn btn-sm btn-outline-primary me-2">Edit</button>
                    <button onclick="confirmDeleteHunian('${item.id}')" class="btn btn-sm btn-outline-danger">Hapus</button>
                </td>
            </tr>`;
        });
    } else {
        const colspan = hunianTableColumns.length + 2;
        html += `<tr><td colspan="${colspan}" class="text-center text-muted">Tidak ada data hunian</td></tr>`;
    }

    html += `</tbody></table>`;

    // Add pagination controls
    const paginationHtml = renderPagination('hunian', pagination.currentPage, pagination.totalPages);
    html += paginationHtml;

    return html;
}

// Get nested object value (helper)
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
    }, obj);
}

// Attach sort listeners
function attachHunianSortListeners() {
    const sortableHeaders = document.querySelectorAll('#hunian-table .sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', (e) => {
            const column = e.currentTarget.dataset.column;
            const currentSort = e.currentTarget.dataset.sort || 'none';

            // Reset all sort indicators
            sortableHeaders.forEach(h => h.dataset.sort = 'none');

            let newSort = 'asc';
            if (currentSort === 'asc') newSort = 'desc';
            else if (currentSort === 'desc') newSort = 'none';

            e.currentTarget.dataset.sort = newSort;

            // Update sort icons
            updateSortIcons(sortableHeaders);

            // Apply sorting - this will be handled by the filters module
            if (typeof applyHunianSorting === 'function') {
                applyHunianSorting(column, newSort);
            }
        });
    });
}

function updateSortIcons(headers) {
    headers.forEach(header => {
        const sortIcon = header.querySelector('.sort-icon');
        if (sortIcon) {
            const sort = header.dataset.sort;
            switch (sort) {
                case 'asc':
                    sortIcon.className = 'bi bi-chevron-up sort-icon';
                    break;
                case 'desc':
                    sortIcon.className = 'bi bi-chevron-down sort-icon';
                    break;
                default:
                    sortIcon.className = 'bi bi-chevron-expand sort-icon';
            }
        }
    });
}

export {
    hunianTableColumns,
    renderStatusBadge,
    renderAirBadge,
    renderKondisiBadge,
    displayHunianTable,
    createHunianTableHtml,
    getNestedValue,
    attachHunianSortListeners,
    updateSortIcons
};
