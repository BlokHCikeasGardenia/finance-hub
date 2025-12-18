// IPL (Kebersihan/Lingkungan) Reports Module
// Advanced IPL payment tracking with search, filter, pagination, and sorting

import { supabase } from '../../config.js';
import { showToast, formatCurrency, renderPagination, debounce } from '../../utils.js';
import { getOutstandingTagihanIplByHunian } from '../../entities/transactions/tagihan_ipl-data.js';

// Global states for IPL view
let iplViewDataGlobal = [];
let iplCurrentPage = 1;
let iplItemsPerPage = 10;

// Load IPL View - Optimized for performance
async function loadViewIPL() {
    console.log('loadViewIPL called'); // Debug log
    const contentDiv = document.getElementById('views-content');

    try {
        // PERFORMANCE OPTIMIZATION: Pre-load all required data in parallel
        const [
            hunianDataResult,
            allBillsResult,
            allPaymentsResult
        ] = await Promise.all([
            // Get all households
            supabase.from('hunian').select(`
                id,
                nomor_urut,
                nomor_blok_rumah,
                status,
                penghuni_saat_ini:penghuni_saat_ini_id (
                    nama_kepala_keluarga
                ),
                lorong:lorong_id (
                    nama_lorong,
                    ketua_lorong
                )
            `).order('nomor_urut'),

            // Get ALL IPL bills
            supabase.from('tagihan_ipl').select(`
                id,
                hunian_id,
                nominal_tagihan,
                sisa_tagihan,
                status,
                tanggal_tagihan,
                periode:periode_id (
                    nama_periode,
                    tanggal_awal,
                    tanggal_akhir
                )
            `).order('tanggal_tagihan', { ascending: false }),

            // Get ALL IPL payments (from allocation table)
            supabase.from('tagihan_ipl_pembayaran').select(`
                tagihan_ipl_id,
                nominal_dialokasikan,
                tanggal_alokasi,
                pemasukan:pemasukan_id (
                    tanggal,
                    id_transaksi
                )
            `)
        ]);

        // Extract results
        const hunianData = hunianDataResult.data;
        const allBills = allBillsResult.data || [];
        const allPayments = allPaymentsResult.data || [];

        // Create lookup maps for fast access
        const billsMap = new Map();
        allBills.forEach(bill => {
            const hunianId = bill.hunian_id;
            if (!billsMap.has(hunianId)) {
                billsMap.set(hunianId, []);
            }
            billsMap.get(hunianId).push(bill);
        });

        const paymentsMap = new Map();
        allPayments.forEach(payment => {
            const billId = payment.tagihan_ipl_id;
            if (!paymentsMap.has(billId)) {
                paymentsMap.set(billId, []);
            }
            paymentsMap.get(billId).push(payment);
        });

        // Process all households using pre-loaded data
        const iplViewData = (hunianData || []).map(hunian => {
            const bills = billsMap.get(hunian.id) || [];

            // Process billing details for each period
            const billingDetails = {};
            let totalOutstanding = 0;
            let outstandingBillsCount = 0;

            bills.forEach(bill => {
                const periodeName = bill.periode?.nama_periode || 'Unknown';
                const billPayments = paymentsMap.get(bill.id) || [];

                // Calculate total paid for this bill
                const totalPaidForBill = billPayments.reduce((sum, payment) => sum + payment.nominal_dialokasikan, 0);
                const paymentDates = billPayments.map(payment =>
                    new Date(payment.tanggal_alokasi).toLocaleDateString('id-ID')
                );

                billingDetails[periodeName] = {
                    nominal_tagihan: bill.nominal_tagihan,
                    nominal_bayar: totalPaidForBill,
                    sisa_tagihan: bill.sisa_tagihan,
                    status: bill.status,
                    tanggal_bayar: paymentDates.length > 0 ? paymentDates : null
                };

                // Count bills with remaining balance (not fully paid)
                if (bill.sisa_tagihan > 0) {
                    totalOutstanding += bill.sisa_tagihan;
                    outstandingBillsCount++;
                }
            });

            return {
                nomor_urut: hunian.nomor_urut,
                nomor_blok_rumah: hunian.nomor_blok_rumah,
                status: hunian.status,
                nama_kepala_keluarga: hunian.penghuni_saat_ini?.nama_kepala_keluarga || '-',
                area: hunian.lorong?.nama_lorong || '-',
                ketua_lorong: hunian.lorong?.ketua_lorong || '-',
                detail: billingDetails,
                kewajiban_pembayaran: {
                    jumlah_bulan: outstandingBillsCount,
                    nominal: totalOutstanding
                }
            };
        });

        // Store data globally for search/filter operations
        iplViewDataGlobal = iplViewData;

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

                    <!-- Search and Filter Section -->
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label for="ipl-search" class="form-label">Cari Rumah/Penghuni:</label>
                                    <input type="text" class="form-control" id="ipl-search" placeholder="Ketik nomor rumah atau nama...">
                                </div>
                                <div class="col-md-2">
                                    <label for="ipl-filter-status" class="form-label">Filter Status:</label>
                                    <select class="form-select" id="ipl-filter-status">
                                        <option value="">Semua Status</option>
                                        <option value="berpenghuni">Berpenghuni</option>
                                        <option value="kosong">Kosong</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label for="ipl-filter-area" class="form-label">Filter Area:</label>
                                    <select class="form-select" id="ipl-filter-area">
                                        <option value="">Semua Area</option>
                                    </select>
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

        // Render initial table
        renderIPLTable(iplViewData);

        // Initialize search and filter functionality
        setTimeout(() => {
            initializeIPLSearchAndFilter();
        }, 100);
    } catch (error) {
        console.error('Error loading IPL view:', error);
        contentDiv.innerHTML = '<p class="text-danger">Error loading IPL data</p>';
    }
}

// Render IPL Table with pagination
function renderIPLTable(data) {
    const totalPages = Math.ceil(data.length / iplItemsPerPage);
    const startIndex = (iplCurrentPage - 1) * iplItemsPerPage;
    const endIndex = startIndex + iplItemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    const tableHtml = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-success">
                    <tr>
                        <th style="width: 60px;">No.</th>
                        <th class="sortable" data-column="nomor_blok_rumah">No. Rumah <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th class="sortable" data-column="status">Status <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th class="sortable" data-column="nama_kepala_keluarga">Penghuni/Pemilik <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th class="sortable" data-column="area">Area <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th class="sortable" data-column="ketua_lorong">Ketua Lorong <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th>Detail Tagihan</th>
                        <th>Kewajiban s/d Bulan Berjalan</th>
                    </tr>
                </thead>
                <tbody>
                    ${paginatedData.map((item, index) => `
                        <tr>
                            <td>${startIndex + index + 1}</td>
                            <td>${item.nomor_blok_rumah}</td>
                            <td><span class="badge bg-${item.status === 'berpenghuni' ? 'success' : 'secondary'}">${item.status}</span></td>
                            <td>${item.nama_kepala_keluarga}</td>
                            <td>${item.area}</td>
                            <td>${item.ketua_lorong}</td>
                            <td>
                                <details>
                                    <summary class="text-primary" style="cursor: pointer;">
                                        ${Object.keys(item.detail).length} periode tagihan
                                    </summary>
                                    <div class="mt-2">
                                        ${Object.entries(item.detail).map(([periode, detail]) => `
                                            <div class="mb-2 p-2 border rounded">
                                                <strong>${periode}</strong><br>
                                                <span class="fw-bold">Tagihan: ${formatCurrency(detail.nominal_tagihan)}</span><br>
                                                ${detail.nominal_bayar > 0 ?
                                                    `<span class="text-success">✓ Dibayar: ${formatCurrency(detail.nominal_bayar)}</span><br>
                                                     <small class="text-muted">Tanggal: ${detail.tanggal_bayar?.join(', ') || 'N/A'}</small>` :
                                                    `<span class="text-danger">Belum dibayar</span>`
                                                }
                                                ${detail.sisa_tagihan > 0 && detail.nominal_bayar > 0 ?
                                                    `<br><small class="text-warning">Sisa: ${formatCurrency(detail.sisa_tagihan)}</small>` :
                                                    ''
                                                }
                                            </div>
                                        `).join('')}
                                    </div>
                                </details>
                            </td>
                            <td>
                                <div class="text-end">
                                    <strong>${item.kewajiban_pembayaran.jumlah_bulan} bulan</strong><br>
                                    <span class="text-danger">${formatCurrency(item.kewajiban_pembayaran.nominal)}</span>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <div class="d-flex justify-content-between align-items-center mt-3">
            <div class="text-muted">
                Menampilkan ${paginatedData.length > 0 ? startIndex + 1 : 0}-${startIndex + paginatedData.length} dari ${data.length} data
            </div>
            ${renderPagination('ipl', iplCurrentPage, totalPages)}
        </div>
    `;

    document.getElementById('ipl-table-container').innerHTML = tableHtml;

    // Re-attach sort event listeners
    attachIPLSortListeners();
}

// Initialize IPL Search and Filter
function initializeIPLSearchAndFilter() {
    const searchInput = document.getElementById('ipl-search');
    const statusFilter = document.getElementById('ipl-filter-status');
    const areaFilter = document.getElementById('ipl-filter-area');
    const itemsPerPageSelect = document.getElementById('ipl-items-per-page');

    // Load area options for filter
    loadIPLAreaOptionsForFilter();

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            applyIPLFilters();
        }, 300));
    }

    // Filter functionality
    if (statusFilter) {
        statusFilter.addEventListener('change', applyIPLFilters);
    }

    if (areaFilter) {
        areaFilter.addEventListener('change', applyIPLFilters);
    }

    // Items per page functionality
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', (e) => {
            updateIPLItemsPerPage(parseInt(e.target.value));
        });
    }
}

// Load IPL Area Options for Filter
async function loadIPLAreaOptionsForFilter() {
    try {
        const areas = [...new Set(iplViewDataGlobal.map(item => item.area).filter(area => area && area !== '-'))];
        const areaFilter = document.getElementById('ipl-filter-area');
        if (areaFilter && areas.length > 0) {
            const options = areas.map(area => `<option value="${area}">${area}</option>`).join('');
            areaFilter.innerHTML = '<option value="">Semua Area</option>' + options;
        }
    } catch (error) {
        console.error('Error loading IPL area options for filter:', error);
    }
}

// Reset IPL Filters
function resetIPLFilters() {
    document.getElementById('ipl-search').value = '';
    document.getElementById('ipl-filter-status').value = '';
    document.getElementById('ipl-filter-area').value = '';
    iplCurrentPage = 1;
    applyIPLFilters();
}

// Apply IPL Filters
function applyIPLFilters(isFilterChange = true) {
    const searchTerm = document.getElementById('ipl-search')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('ipl-filter-status')?.value || '';
    const areaFilter = document.getElementById('ipl-filter-area')?.value || '';

    let filteredData = [...iplViewDataGlobal];

    // Apply search filter
    if (searchTerm) {
        filteredData = filteredData.filter(item =>
            item.nomor_blok_rumah.toLowerCase().includes(searchTerm) ||
            item.nama_kepala_keluarga.toLowerCase().includes(searchTerm) ||
            item.area.toLowerCase().includes(searchTerm) ||
            item.ketua_lorong.toLowerCase().includes(searchTerm)
        );
    }

    // Apply status filter
    if (statusFilter) {
        filteredData = filteredData.filter(item => item.status === statusFilter);
    }

    // Apply area filter
    if (areaFilter) {
        filteredData = filteredData.filter(item => item.area === areaFilter);
    }

    // Reset to page 1 only when filters actually change
    if (isFilterChange) {
        iplCurrentPage = 1;
    }

    renderIPLTable(filteredData);
}

// Update IPL Items Per Page
function updateIPLItemsPerPage(newItemsPerPage) {
    iplItemsPerPage = newItemsPerPage;
    iplCurrentPage = 1; // Reset to first page
    applyIPLFilters(false);
}

// Attach IPL Sort Listeners
function attachIPLSortListeners() {
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
            sortIPLData(column, newSort);
        });
    });
}

// Sort IPL Data
function sortIPLData(column, direction) {
    if (direction === 'none') {
        renderIPLTable(iplViewDataGlobal);
        return;
    }

    let filteredData = [...iplViewDataGlobal];

    // Apply current filters first
    const searchTerm = document.getElementById('ipl-search')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('ipl-filter-status')?.value || '';
    const areaFilter = document.getElementById('ipl-filter-area')?.value || '';

    if (searchTerm) {
        filteredData = filteredData.filter(item =>
            item.nomor_blok_rumah.toLowerCase().includes(searchTerm) ||
            item.nama_kepala_keluarga.toLowerCase().includes(searchTerm) ||
            item.area.toLowerCase().includes(searchTerm) ||
            item.ketua_lorong.toLowerCase().includes(searchTerm)
        );
    }

    if (statusFilter) {
        filteredData = filteredData.filter(item => item.status === statusFilter);
    }

    if (areaFilter) {
        filteredData = filteredData.filter(item => item.area === areaFilter);
    }

    // Sort the filtered data
    filteredData.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];

        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return direction === 'asc' ? 1 : -1;
        if (bVal == null) return direction === 'asc' ? -1 : 1;

        // Convert to strings for comparison
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();

        if (direction === 'asc') {
            return aVal.localeCompare(bVal);
        } else {
            return bVal.localeCompare(aVal);
        }
    });

    renderIPLTable(filteredData);
}

// Change IPL Page
function changeIPLPage(page) {
    iplCurrentPage = page;
    applyIPLFilters(false); // false = not a filter change, just pagination
}

// Refresh IPL View
async function refreshViewIPL() {
    await loadViewIPL();
}

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
