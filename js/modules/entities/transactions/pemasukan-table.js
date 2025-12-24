// Pemasukan table rendering module
// Handles table display, pagination, and custom renderers

import { getPemasukanState, setPemasukanState } from './pemasukan-data.js';
import { filterAndDisplayPemasukan } from './pemasukan-filters.js';
import { paginateData } from '../../crud.js';
import { formatCurrency } from '../../utils.js';

// Table columns configuration - maximum compact for mobile (only essentials)
const pemasukanTableColumns = [
    { key: 'id_transaksi', label: 'ID Transaksi', sortable: true },
    { key: 'tanggal', label: 'Tanggal', width: '100px', sortable: true, render: (item) => new Date(item.tanggal).toLocaleDateString('id-ID'), mobileClass: 'd-none-mobile' },
    { key: 'penghuni', label: 'Penghuni', sortable: true, render: (item) => item.penghuni?.nama_kepala_keluarga || item.nama_pembayar || '-' },
    { key: 'kategori', label: 'Kategori', sortable: true, render: renderPemasukanCategory },
    { key: 'nominal', label: 'Nominal', sortable: true, render: (item) => formatCurrency(item.nominal) },
    { key: 'hunian', label: 'Rumah', sortable: true, render: (item) => item.hunian?.nomor_blok_rumah || '-', mobileClass: 'd-none-mobile' },
    { key: 'rekening', label: 'Rekening', sortable: true, render: (item) => item.rekening?.jenis_rekening || '-', mobileClass: 'd-none-mobile' },
    { key: 'keterangan', label: 'Keterangan', sortable: false, mobileClass: 'd-none-mobile' }
];

// Custom renderers

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

// Render pemasukan category badge
function renderPemasukanCategory(item) {
    const categoryName = item.kategori_saldo?.nama_kategori || 'Lain-lain';
    return `<span class="badge ${getCategoryBadgeColor(categoryName)}">${categoryName}</span>`;
}

// Display pemasukan table with pagination support
function displayPemasukanTable(data, pagination = null) {
    const tableHtml = createPemasukanTableHtml(data, pagination);
    const tableElement = document.getElementById('pemasukan-table');
    if (tableElement) {
        tableElement.innerHTML = tableHtml;
    }

    // Attach sort listeners after rendering so headers are clickable
    attachPemasukanSortListeners();

    // Ensure indicators reflect current state immediately
    try {
        const state = (typeof getPemasukanState === 'function') ? getPemasukanState() : null;
        if (state) updateSortIndicators(state.pemasukanSortColumn, state.pemasukanSortDirection);
    } catch (e) {
        // ignore
    }

    // Also attach delegated sort handler automatically (safe no-op if not available)
    try {
        if (typeof window !== 'undefined' && typeof window._pemasukanAttachDelegatedSort === 'function') {
            window._pemasukanAttachDelegatedSort();
        }
    } catch (e) {
        // ignore
    }
}

// Create HTML for pemasukan table
function createPemasukanTableHtml(data, pagination = null) {
    let html = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>No</th>
                        ${pemasukanTableColumns.map(col => {
                            const sortableClass = col.sortable ? 'sortable' : '';
                            const mobileClass = col.mobileClass || '';
                            const sortIcon = col.sortable ? ' <i class="bi bi-chevron-expand sort-icon"></i>' : '';
                            return `<th class="${sortableClass} ${mobileClass}" data-column="${col.key}">${col.label}${sortIcon}</th>`;
                        }).join('')}
                        <th width="150px">Aksi</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (data.length > 0) {
        data.forEach((item, index) => {
            // If pagination is provided, calculate global index, otherwise just use local index
            let displayIndex = index + 1;
            if (pagination) {
                displayIndex = (pagination.currentPage - 1) * pagination.itemsPerPage + index + 1;
            }

            html += `<tr>
                <td>${displayIndex}</td>
                ${pemasukanTableColumns.map(col => {
                    const value = col.render ? col.render(item, col.key) : getNestedValue(item, col.key) || '-';
                    return `<td>${value}</td>`;
                }).join('')}
                <td>
                    <div class="btn-action-mobile-stack">
                        <button onclick="editPemasukan('${item.id}')" class="btn btn-sm btn-outline-primary">Edit</button>
                        <button onclick="confirmCancelPemasukan('${item.id}')" class="btn btn-sm btn-outline-warning" title="Batalkan transaksi yang sudah dialokasikan">Batalkan</button>
                        <button onclick="confirmDeletePemasukan('${item.id}')" class="btn btn-sm btn-outline-danger">Hapus</button>
                    </div>
                </td>
            </tr>`;
        });

        // Add pagination controls if pagination is provided
        if (pagination) {
            const paginationHtml = renderPemasukanPagination(pagination.currentPage,
                Math.ceil(data.length / pagination.itemsPerPage));
            html += paginationHtml;
        }
    } else {
        const colspan = pemasukanTableColumns.length + 2;
        html += `<tr><td colspan="${colspan}" class="text-center text-muted">Tidak ada data pemasukan</td></tr>`;
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

// Render pagination for pemasukan
function renderPemasukanPagination(currentPage, totalPages) {
    if (totalPages <= 1) return '';

    let paginationHtml = '<nav><ul class="pagination pagination-sm mb-0 justify-content-center mt-3">';

    // Previous button
    paginationHtml += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changePemasukanPage(${currentPage - 1})">Previous</a>
    </li>`;

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="changePemasukanPage(1)">1</a></li>`;
        if (startPage > 2) {
            paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="changePemasukanPage(${i})">${i}</a>
        </li>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
        paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="changePemasukanPage(${totalPages})">${totalPages}</a></li>`;
    }

    // Next button
    paginationHtml += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changePemasukanPage(${currentPage + 1})">Next</a>
    </li>`;

    paginationHtml += '</ul></nav>';
    return paginationHtml;
}

// Change page
function changePemasukanPage(page) {
    const state = getPemasukanState();
    const totalPages = Math.ceil(state.pemasukanData.length / state.pemasukanItemsPerPage);

    if (page < 1 || page > totalPages) return;

    setPemasukanState({ pemasukanCurrentPage: page });

    // Re-render table with applied state
    displayPemasukanTable(state.pemasukanData);
}

// Attach sort listeners to table headers
function attachPemasukanSortListeners() {
    const sortableHeaders = document.querySelectorAll('#pemasukan-table .sortable');

    sortableHeaders.forEach(header => {
        // Avoid attaching duplicate per-header listeners when re-rendering
        if (header._pemasukanClickAttached) return;
        header._pemasukanClickAttached = true;

        header.addEventListener('click', () => {
            const column = header.dataset.column;
            const state = getPemasukanState();

            // Determine new sort direction (cycle asc -> desc -> none)
            let newDirection = 'asc';
            if (state.pemasukanSortColumn === column) {
                if (state.pemasukanSortDirection === 'asc') {
                    newDirection = 'desc';
                } else if (state.pemasukanSortDirection === 'desc') {
                    newDirection = 'none';
                }
            }

            // Update sort state
            setPemasukanState({
                pemasukanSortColumn: newDirection !== 'none' ? column : '',
                pemasukanSortDirection: newDirection
            });

            // Update UI indicators
            updateSortIndicators(column, newDirection);

            // Re-filter and display data
            if (typeof filterAndDisplayPemasukan === 'function') {
                filterAndDisplayPemasukan();
            }
        });
    });

    // Reflect current sort state immediately after attaching listeners
    try {
        const state = (typeof getPemasukanState === 'function') ? getPemasukanState() : null;
        if (state) updateSortIndicators(state.pemasukanSortColumn, state.pemasukanSortDirection);
    } catch (e) {
        // ignore
    }
}

// Update sort indicators in table headers
function updateSortIndicators(activeColumn, direction) {
    const sortableHeaders = document.querySelectorAll('#pemasukan-table .sortable');

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

// Expose attach and indicator updater globally so filters can call them after render
if (typeof window !== 'undefined') {
    window.attachPemasukanSortListeners = attachPemasukanSortListeners;
    window.updatePemasukanSortIndicators = updateSortIndicators;

    // Delegated click handler on table THEAD for sortable headers
    window._pemasukanAttachDelegatedSort = function() {
        try {
            const container = document.getElementById('pemasukan-table');
            if (!container) return;

            // Attach once on the container (container persists across re-renders)
            if (container._pemasukanDelegationAttached) return;
            container._pemasukanDelegationAttached = true;

            container.addEventListener('click', (e) => {
                const th = e.target.closest('th.sortable');
                if (!th) return;
                const column = th.dataset.column;
                if (!column) return;

                const state = getPemasukanState();
                let newDirection = 'asc';
                if (state.pemasukanSortColumn === column) {
                    if (state.pemasukanSortDirection === 'asc') newDirection = 'desc';
                    else if (state.pemasukanSortDirection === 'desc') newDirection = 'none';
                }

                setPemasukanState({
                    pemasukanSortColumn: newDirection !== 'none' ? column : '',
                    pemasukanSortDirection: newDirection
                });
                updateSortIndicators(column, newDirection);

                
                if (typeof filterAndDisplayPemasukan === 'function') filterAndDisplayPemasukan();
            });

            
        } catch (err) {
            console.error('Failed to attach delegated sort handler:', err);
        }
    };
}

export {
    pemasukanTableColumns,
    renderPemasukanCategory,
    displayPemasukanTable,
    createPemasukanTableHtml,
    renderPemasukanPagination,
    changePemasukanPage,
    attachPemasukanSortListeners
};
