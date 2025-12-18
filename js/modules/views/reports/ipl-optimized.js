// IPL (Kebersihan/Lingkungan) Reports Module - OPTIMIZED VERSION
// Advanced IPL payment tracking with server-side pagination, search, filter, and sorting

import { supabase } from '../../config.js';
import { showToast, formatCurrency, renderPagination, debounce } from '../../utils.js';

// Global states for IPL view
let iplViewDataGlobal = [];
let iplCurrentPage = 1;
let iplItemsPerPage = 10;

// Load IPL View with Server-side Pagination
async function loadViewIPL() {
    console.log('loadViewIPL called'); // Debug log
    const contentDiv = document.getElementById('views-content');

    try {
        // Get all periods for period selection
        const { data: allPeriods, error: periodsError } = await supabase
            .from('periode')
            .select('id, nama_periode, nomor_urut, tanggal_awal, tanggal_akhir')
            .order('nomor_urut');

        if (periodsError) throw periodsError;

        // Store data globally
        iplViewDataGlobal = [];
        iplCurrentPage = 1;

        const html = `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h4>View Data IPL</h4>
                        <button class="btn btn-secondary" onclick="loadViewsSection()">
                            <i class="bi bi-arrow-left"></i> Kembali ke Views
                        </button>
                    </div>
                    <p class="text-muted">Data pembayaran IPL per rumah beserta kewajiban pembayaran</p>

                    <!-- Period Selection -->
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label for="ipl-period-select" class="form-label">Pilih Periode:</label>
                                    <select class="form-select" id="ipl-period-select">
                                        <option value="">Pilih Periode...</option>
                                        ${allPeriods.map(period => `<option value="${period.id}">${period.nama_periode}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label for="ipl-search" class="form-label">Cari Rumah/Penghuni:</label>
                                    <input type="text" class="form-control" id="ipl-search" placeholder="Ketik nomor rumah atau nama...">
                                </div>
                                <div class="col-md-2">
                                    <label for="ipl-items-per-page" class="form-label">Data per Halaman:</label>
                                    <select class="form-select" id="ipl-items-per-page">
                                        <option value="5">5</option>
                                        <option value="10" selected>10</option>
                                        <option value="25">25</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                    </select>
                                </div>
                                <div class="col-md-3 d-flex align-items-end gap-2">
                                    <button class="btn btn-outline-secondary" onclick="resetIPLFilters()">Reset</button>
                                    <button class="btn btn-outline-primary" onclick="refreshViewIPL()">
                                        <i class="bi bi-arrow-clockwise"></i> Refresh
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="ipl-table-container"></div>
                </div>
            </div>
        `;

        contentDiv.innerHTML = html;

        // Initialize search and filter functionality
        setTimeout(() => {
            initializeIPLSearchAndFilterServerSide();
        }, 100);
    } catch (error) {
        console.error('Error loading IPL view:', error);
        contentDiv.innerHTML = '<p class="text-danger">Error loading IPL data</p>';
    }
}

// New function: Render IPL Table with Server-side Pagination
async function renderIPLTableServerSide(page) {
    try {
        const periodId = document.getElementById('ipl-period-select')?.value;
        if (!periodId) {
            document.getElementById('ipl-table-container').innerHTML = `
                <div class="alert alert-info">Silakan pilih periode terlebih dahulu.</div>
            `;
            return;
        }

        const searchTerm = document.getElementById('ipl-search')?.value || '';
        const itemsPerPage = parseInt(document.getElementById('ipl-items-per-page')?.value || '10');

        // Call stored procedure
        const { data, error } = await supabase.rpc('get_ipl_summary_for_period_v2', {
            periode_param: periodId,
            page_num: page,
            page_size: itemsPerPage,
            search_term: searchTerm
        });

        if (error) throw error;

        if (!data || data.length === 0) {
            document.getElementById('ipl-table-container').innerHTML = `
                <div class="alert alert-info">Tidak ada data IPL ditemukan untuk periode ini.</div>
            `;
            return;
        }

        // Extract total count from first row
        const total_count = data[0].total_count || 0;
        const totalPages = Math.ceil(total_count / itemsPerPage);

        // Render table
        const tableHtml = `
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-success">
                        <tr>
                            <th style="width: 60px;">No.</th>
                            <th class="sortable" data-column="nomor_blok_rumah">No. Rumah <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable" data-column="nama_kepala_keluarga">Penghuni/Pemilik <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable" data-column="total_tagihan">Total Tagihan <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable" data-column="total_bayar">Total Bayar <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable" data-column="sisa_tagihan">Sisa Tagihan <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable" data-column="status">Status <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th>Detail</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map((item, index) => {
                            const startIndex = (page - 1) * itemsPerPage;
                            return `
                                <tr>
                                    <td>${startIndex + index + 1}</td>
                                    <td>${item.nomor_blok_rumah}</td>
                                    <td>${item.nama_kepala_keluarga || '-'}</td>
                                    <td class="text-end fw-bold">${formatCurrency(item.total_tagihan)}</td>
                                    <td class="text-end text-success fw-bold">${formatCurrency(item.total_bayar)}</td>
                                    <td class="text-end ${item.sisa_tagihan > 0 ? 'text-danger' : 'text-success'} fw-bold">${formatCurrency(item.sisa_tagihan)}</td>
                                    <td><span class="badge ${item.status === 'LUNAS' ? 'bg-success' : 'bg-warning'}">${item.status}</span></td>
                                    <td>
                                        <details>
                                            <summary class="text-primary" style="cursor: pointer;">Detail Tagihan</summary>
                                            <div class="mt-2">
                                                <div class="p-2 border rounded">
                                                    <strong>Periode:</strong> ${item.detail.periode}<br>
                                                    <strong>Tanggal Tagihan:</strong> ${item.detail.tanggal_tagihan ? new Date(item.detail.tanggal_tagihan).toLocaleDateString('id-ID') : '-'}<br>
                                                    <strong>Tanggal Jatuh Tempo:</strong> ${item.detail.tanggal_jatuh_tempo ? new Date(item.detail.tanggal_jatuh_tempo).toLocaleDateString('id-ID') : '-'}<br>
                                                    <strong>Jumlah Tagihan:</strong> ${item.detail.jumlah_tagihan}
                                                </div>
                                            </div>
                                        </details>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="d-flex justify-content-between align-items-center mt-3">
                <div class="text-muted">
                    Menampilkan ${data.length > 0 ? (page - 1) * itemsPerPage + 1 : 0}-${(page - 1) * itemsPerPage + data.length} dari ${total_count} data
                </div>
                ${renderPagination('ipl', page, totalPages)}
            </div>
        `;

        document.getElementById('ipl-table-container').innerHTML = tableHtml;

        // Attach sort event listeners
        attachIPLSortListenersServerSide();

    } catch (error) {
        console.error('Error rendering IPL table:', error);
        document.getElementById('ipl-table-container').innerHTML = `
            <div class="alert alert-danger">Error loading data: ${error.message}</div>
        `;
    }
}

// New function: Initialize Server-side Search and Filter
function initializeIPLSearchAndFilterServerSide() {
    const periodSelect = document.getElementById('ipl-period-select');
    const searchInput = document.getElementById('ipl-search');
    const itemsPerPageSelect = document.getElementById('ipl-items-per-page');

    // Period selection
    if (periodSelect) {
        periodSelect.addEventListener('change', () => {
            iplCurrentPage = 1;
            renderIPLTableServerSide(1);
        });
    }

    // Search functionality with debounce
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            renderIPLTableServerSide(1);
        }, 500));
    }

    // Items per page functionality
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', () => {
            renderIPLTableServerSide(1);
        });
    }
}

// New function: Attach Server-side Sort Listeners
function attachIPLSortListenersServerSide() {
    const sortableHeaders = document.querySelectorAll('#ipl-table-container .sortable');

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
            if (newSort !== 'none') {
                renderIPLTableServerSide(1);
            }
        });
    });
}

// Update changeIPLPage function
async function changeIPLPage(page) {
    await renderIPLTableServerSide(page);
}

// Update resetIPLFilters function
function resetIPLFilters() {
    document.getElementById('ipl-period-select').value = '';
    document.getElementById('ipl-search').value = '';
    document.getElementById('ipl-items-per-page').value = '10';
    iplCurrentPage = 1;
    renderIPLTableServerSide(1);
}

// Update refreshViewIPL function
async function refreshViewIPL() {
    await loadViewIPL();
    const periodSelect = document.getElementById('ipl-period-select');
    if (periodSelect?.value) {
        await renderIPLTableServerSide(1);
    }
}

// Export functions
export {
    loadViewIPL,
    refreshViewIPL,
    changeIPLPage
};

// Backward compatibility for global window functions
window.loadViewIPL = loadViewIPL;
window.refreshViewIPL = refreshViewIPL;
window.resetIPLFilters = resetIPLFilters;
window.changeIPLPage = changeIPLPage;
