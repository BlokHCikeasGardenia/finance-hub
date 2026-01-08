// Pemasukan table rendering module
// Handles table display, pagination, and custom renderers

import { getPemasukanState, setPemasukanState } from './pemasukan-data.js';
import { filterAndDisplayPemasukan } from './pemasukan-filters.js';
import { paginateData } from '../../crud.js';
import { formatCurrency, globalPeriodeCache } from '../../utils.js';
import { supabase } from '../../config.js';

// Use global periode cache shared across modules
const pemasukanPeriodeCache = globalPeriodeCache;

// Table columns configuration - maximum compact for mobile (only essentials)
const pemasukanTableColumns = [
    { key: 'id_transaksi', label: 'ID Transaksi', sortable: true },
    { key: 'tanggal', label: 'Tanggal', width: '100px', sortable: true, render: (item) => new Date(item.tanggal).toLocaleDateString('id-ID'), mobileClass: 'd-none-mobile' },
    { key: 'penghuni', label: 'Penghuni', sortable: true, render: (item) => item.penghuni?.nama_kepala_keluarga || item.nama_pembayar || '-' },
    { key: 'kategori', label: 'Kategori', sortable: true, render: renderPemasukanCategory },
    { key: 'nominal', label: 'Nominal', sortable: true, render: (item) => formatCurrency(item.nominal) },
    { key: 'periode', label: 'Periode', sortable: false, render: renderPeriodeColumn },
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

// Render periode column with conditional display
function renderPeriodeColumn(item) {
    // Use id_transaksi as fallback if id is not available
    const itemId = item.id || item.id_transaksi;

    // Exit early if no valid ID to avoid unnecessary lookups
    if (!itemId) {
        return '<span class="text-muted">-</span>';
    }

    const periodeData = pemasukanPeriodeCache.get(itemId);

    if (!periodeData || periodeData.count === 0) {
        return '<span class="text-muted">-</span>';
    }

    if (periodeData.count === 1) {
        // Single periode - display directly
        return `<span class="badge bg-light text-dark">${periodeData.periodes[0]}</span>`;
    } else {
        // Multiple periode - show "Multiple" with info icon
        return `<span class="badge bg-warning text-dark" onclick="showPemasukanPeriodeDetail('${itemId}')" style="cursor: pointer;" title="Klik untuk detail periode">
            Multiple ⓘ
        </span>`;
    }
}

// Get periode data from payment allocations
async function getPeriodeData(pemasukanId) {
    try {
        // Validate pemasukanId
        if (!pemasukanId || pemasukanId === 'undefined') {
            return {
                periodes: [],
                details: [],
                isMultiple: false,
                count: 0
            };
        }

        // UUID regex pattern - must be a valid UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(pemasukanId)) {
            // Not a valid UUID format, skip the query
            return {
                periodes: [],
                details: [],
                isMultiple: false,
                count: 0
            };
        }

        // Query IPL payment allocations
        const { data: iplAllocations, error: iplError } = await supabase
            .from('tagihan_ipl_pembayaran')
            .select(`
                nominal_dialokasikan,
                tagihan_ipl:tagihan_ipl_id (
                    periode:periode_id (nama_periode)
                )
            `)
            .eq('pemasukan_id', pemasukanId);

        if (iplError) {
            // Silent fail - no valid periode data for this transaction
        }

        // Query consolidated Air billing allocations (corrected table name)
        const { data: meteranAirAllocations, error: meteranAirError } = await supabase
            .from('meteran_air_billing_pembayaran')
            .select(`
                nominal_dialokasikan,
                meteran_air_billing:meteran_air_billing_id (
                    periode:periode_id (nama_periode)
                )
            `)
            .eq('pemasukan_id', pemasukanId);

        if (meteranAirError) {
            // Silent fail - no valid periode data for this transaction
        }

        // Collect all unique periode names
        const periodeSet = new Set();
        const periodeDetails = [];

        // Process IPL allocations
        if (iplAllocations && Array.isArray(iplAllocations)) {
            iplAllocations.forEach(allocation => {
                if (allocation.tagihan_ipl?.periode?.nama_periode) {
                    periodeSet.add(allocation.tagihan_ipl.periode.nama_periode);
                    periodeDetails.push({
                        periode: allocation.tagihan_ipl.periode.nama_periode,
                        nominal: allocation.nominal_dialokasikan,
                        type: 'IPL'
                    });
                }
            });
        }

        // Process Meteran Air allocations
        if (meteranAirAllocations && Array.isArray(meteranAirAllocations)) {
            meteranAirAllocations.forEach(allocation => {
                if (allocation.meteran_air_billing?.periode?.nama_periode) {
                    periodeSet.add(allocation.meteran_air_billing.periode.nama_periode);
                    periodeDetails.push({
                        periode: allocation.meteran_air_billing.periode.nama_periode,
                        nominal: allocation.nominal_dialokasikan,
                        type: 'Air'
                    });
                }
            });
        }

        const uniquePeriodes = Array.from(periodeSet);

        return {
            periodes: uniquePeriodes,
            details: periodeDetails,
            isMultiple: uniquePeriodes.length > 1,
            count: uniquePeriodes.length
        };

    } catch (error) {
        // Silent fail - return empty periode data on error
        return {
            periodes: [],
            details: [],
            isMultiple: false,
            count: 0
        };
    }
}

// Load periode data for multiple items at once
async function loadPemasukanPeriodeData(items) {
    // Only process items that have a valid ID and are not already cached
    const uncachedItems = items.filter(item => {
        const itemId = item.id || item.id_transaksi;
        return itemId && !pemasukanPeriodeCache.has(itemId);
    });

    if (uncachedItems.length === 0) return;

    // Load periode data for uncached items
    const periodePromises = uncachedItems.map(item => {
        const itemId = item.id || item.id_transaksi;
        return getPeriodeData(itemId);
    });
    const periodeResults = await Promise.all(periodePromises);

    // Store results in cache
    uncachedItems.forEach((item, index) => {
        const itemId = item.id || item.id_transaksi;
        pemasukanPeriodeCache.set(itemId, periodeResults[index]);
    });
}

// Display pemasukan table with pagination support
async function displayPemasukanTable(data, pagination = null) {
    let displayData = data;
    let finalPagination = pagination;

    // If pagination is provided, slice the data for display
    if (pagination) {
        const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
        const endIndex = startIndex + pagination.itemsPerPage;
        displayData = data.slice(startIndex, endIndex);
    }

    // Pre-load periode data for displayed items only
    await loadPemasukanPeriodeData(displayData);

    const tableHtml = createPemasukanTableHtml(displayData, finalPagination);
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
    } else {
        const colspan = pemasukanTableColumns.length + 2;
        html += `<tr><td colspan="${colspan}" class="text-center text-muted">Tidak ada data pemasukan</td></tr>`;
    }

    html += `</tbody></table></div>`;

    // Add pagination controls if pagination is provided (below the table, like in view pemasukan)
    if (pagination && pagination.totalPages > 1) {
        const totalData = pagination.totalPages * pagination.itemsPerPage; // Approximate total
        const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
        const endIndex = startIndex + data.length;

        html += `
            <!-- Pagination -->
            <div class="d-flex justify-content-between align-items-center mt-3">
                <div class="text-muted">
                    Menampilkan ${data.length > 0 ? startIndex + 1 : 0}-${endIndex} dari ${totalData} data
                </div>
                ${renderPemasukanPagination(pagination.currentPage, pagination.totalPages)}
            </div>
        `;
    }

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

    // Update page in state
    setPemasukanState({ pemasukanCurrentPage: page });

    // Re-apply filters and display with new page (this will use existing filters and pagination)
    filterAndDisplayPemasukan(false);
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

// Show periode detail modal for multiple periode transactions
function showPemasukanPeriodeDetail(pemasukanId) {
    const periodeData = pemasukanPeriodeCache.get(pemasukanId);

    if (!periodeData || periodeData.count <= 1) {
        return;
    }

    // Calculate total nominal from all periode details
    const totalNominal = periodeData.details.reduce((sum, detail) => sum + detail.nominal, 0);

    // Group details by periode for cleaner display
    const periodeGroups = {};
    periodeData.details.forEach(detail => {
        if (!periodeGroups[detail.periode]) {
            periodeGroups[detail.periode] = [];
        }
        periodeGroups[detail.periode].push(detail);
    });

    const modalContent = `
        <div class="modal-header">
            <h5 class="modal-title">Detail Periode Pembayaran</h5>
            <button type="button" class="btn-close" onclick="closeModal()"></button>
        </div>
        <div class="modal-body">
            <div class="alert alert-info">
                <strong>Total Pembayaran:</strong> ${formatCurrency(totalNominal)}
            </div>

            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Periode</th>
                            <th>Jenis</th>
                            <th class="text-end">Nominal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${periodeData.details.map(detail => `
                            <tr>
                                <td><span class="badge bg-light text-dark">${detail.periode}</span></td>
                                <td><span class="badge ${detail.type === 'IPL' ? 'bg-info' : 'bg-primary'}">${detail.type}</span></td>
                                <td class="text-end">${formatCurrency(detail.nominal)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="table-primary">
                            <th colspan="2">Total</th>
                            <th class="text-end">${formatCurrency(totalNominal)}</th>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Tutup</button>
        </div>
    `;

    // Import and use modal functionality
    import('../../ui.js').then(({ showModal }) => {
        showModal('Detail Periode Pembayaran', modalContent);
    }).catch(error => {
        console.error('Error showing modal:', error);
    });
}

export {
    pemasukanTableColumns,
    renderPemasukanCategory,
    displayPemasukanTable,
    createPemasukanTableHtml,
    renderPemasukanPagination,
    changePemasukanPage,
    attachPemasukanSortListeners,
    showPemasukanPeriodeDetail
};
