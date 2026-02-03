// Air (Water) Usage Reports Module
// Advanced water consumption and billing reports with search, filter, pagination, and sorting

import { supabase } from '../../config.js';
import { showToast, formatCurrency, renderPagination, debounce } from '../../utils.js';
import { getTarifAirForDate } from '../../entities/master/tarif_air-data.js';

// Global states for Air view
let airViewDataGlobal = [];
let airCurrentPage = 1;
let airItemsPerPage = 10;

// Global state for Rekap Air
let airRekapDataGlobal = [];

// Load Air View - Optimized for performance
async function loadViewAir() {
    console.log('loadViewAir called'); // Debug log

    // Clear dashboard content when showing individual view
    const dashboardContent = document.getElementById('dashboard-content');
    if (dashboardContent) {
        dashboardContent.innerHTML = '';
    }

    const contentDiv = document.getElementById('views-content');

    // Aggressive content clearing to prevent showing dashboard cards
    contentDiv.innerHTML = '';
    contentDiv.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div><p>Loading Air data...</p></div>';

    try {
        // PERFORMANCE OPTIMIZATION: Pre-load all required data in parallel
        const [
            airCategoryResult,
            hunianDataResult,
            allPeriodsResult,
            tariffCacheResult,
            allMeterDataResult,
            allPaymentsResult
        ] = await Promise.all([
            // Get Air category ID
            supabase.from('kategori_saldo').select('id').eq('nama_kategori', 'Air').single(),

            // Get all households that are water customers
            supabase.from('hunian').select(`
                id,
                nomor_blok_rumah,
                penghuni_saat_ini:penghuni_saat_ini_id (
                    nama_kepala_keluarga
                ),
                lorong:lorong_id (
                    nama_lorong,
                    ketua_lorong
                )
            `).eq('pelanggan_air', true).order('nomor_blok_rumah'),

            // Get all periods
            supabase.from('periode').select('id, nama_periode, tanggal_awal, nomor_urut').order('tanggal_awal'),

            // Pre-load all tariff data for caching
            loadTariffCache(),

            // Get ALL meter data from consolidated billing table with payment info
            supabase.from('meteran_air_billing').select(`
                *,
                periode:periode_id (nama_periode, tanggal_awal, nomor_urut),
                meteran_air_billing_pembayaran (
                    nominal_dialokasikan,
                    tanggal_alokasi,
                    pemasukan:pemasukan_id (
                        tanggal,
                        keterangan
                    )
                )
            `),

            // Get ALL payments for air category in one query (will filter by household later)
            supabase.from('kategori_saldo').select('id').eq('nama_kategori', 'Air').single()
                .then(async (categoryResult) => {
                    if (categoryResult.data) {
                        return supabase.from('pemasukan').select(`
                            nominal, tanggal, hunian_id,
                            periode:periode_id (id, nama_periode, nomor_urut, tanggal_awal)
                        `).eq('kategori_id', categoryResult.data.id);
                    }
                    return { data: [] };
                })
        ]);

        // Extract results
        const airCategory = airCategoryResult.data;
        const hunianData = hunianDataResult.data;
        const allPeriods = allPeriodsResult.data || [];
        const tariffCache = tariffCacheResult;
        const allMeterData = allMeterDataResult.data || [];
        const allPayments = (await allPaymentsResult)?.data || [];

        console.log('=== AIR VIEW DEBUG ===');
        console.log('Air category:', airCategory);
        console.log('Hunian data sample:', hunianData?.slice(0, 3));
        console.log('All meter data sample:', allMeterData?.slice(0, 3));

        if (!airCategory) {
            console.error('Air category not found');
            contentDiv.innerHTML = '<p class="text-danger">Kategori Air tidak ditemukan. Pastikan data master kategori sudah diisi.</p>';
            return;
        }

        // PERFORMANCE OPTIMIZATION: Create lookup maps for fast access
        const meterDataMap = new Map();
        const billingDataMap = new Map();

        // Sort billing data by period sequence first
        const sortedBillingData = allMeterData.sort((a, b) => {
            const seqA = a.periode?.nomor_urut || 0;
            const seqB = b.periode?.nomor_urut || 0;
            return seqA - seqB; // Ascending: oldest first for processing
        });

        // Group meter data by household
        sortedBillingData.forEach(billing => {
            const hunianId = billing.hunian_id;
            if (!meterDataMap.has(hunianId)) {
                meterDataMap.set(hunianId, {});
            }
            if (!billingDataMap.has(hunianId)) {
                billingDataMap.set(hunianId, []);
            }

            // Store meter reading by period name
            const periodName = billing.periode?.nama_periode;
            if (periodName) {
                meterDataMap.get(hunianId)[periodName] = billing.meteran_periode_ini || 0;
                billingDataMap.get(hunianId).push(billing);
            }
        });

        const paymentsMap = new Map();
        allPayments.forEach(payment => {
            const hunianId = payment.hunian_id;
            if (!paymentsMap.has(hunianId)) {
                paymentsMap.set(hunianId, []);
            }
            paymentsMap.get(hunianId).push(payment);
        });

        // Filter households to only include those with meter readings (now instant lookup)
        const householdsWithMeters = (hunianData || []).filter(hunian =>
            meterDataMap.has(hunian.id)
        );

        // PERFORMANCE OPTIMIZATION: Process all households using pre-loaded billing data
        const airViewData = householdsWithMeters.map(hunian => {
            const billingRecords = billingDataMap.get(hunian.id) || [];
            const payments = paymentsMap.get(hunian.id) || [];

            // Group payments by period
            const paymentsByPeriod = new Map();
            payments.forEach(payment => {
                const periodName = payment.periode?.nama_periode;
                if (periodName) {
                    if (!paymentsByPeriod.has(periodName)) {
                        paymentsByPeriod.set(periodName, []);
                    }
                    paymentsByPeriod.get(periodName).push(payment);
                }
            });

            // Create payment details from billing records (now includes payment allocations)
            const paymentDetails = {};

            // Get penghuni name from hunian data
            const penghuniName = hunian.penghuni_saat_ini?.nama_kepala_keluarga || '-';

            // Sort billing records by period sequence (newest first for display)
            const sortedBillingRecords = billingRecords.sort((a, b) => {
                const seqA = a.periode?.nomor_urut || 0;
                const seqB = b.periode?.nomor_urut || 0;
                return seqB - seqA; // Descending: newest first
            });

            sortedBillingRecords.forEach(billing => {
                const periodName = billing.periode?.nama_periode;
                if (!periodName) return;

                // Get payment allocations from the billing record (included in query)
                const paymentAllocations = billing.meteran_air_billing_pembayaran || [];
                const totalPaid = paymentAllocations.reduce((sum, allocation) => sum + (allocation.nominal_dialokasikan || 0), 0);
                const paymentDates = paymentAllocations.map(allocation =>
                    new Date(allocation.tanggal_alokasi || allocation.pemasukan?.tanggal).toLocaleDateString('id-ID')
                );

                paymentDetails[periodName] = {
                    meteran_bulan_ini: billing.meteran_periode_ini || 0,
                    meteran_bulan_sebelumnya: billing.meteran_periode_sebelumnya || 0,
                    pemakaian_air: billing.pemakaian_m3 || 0,
                    tagihan: billing.nominal_tagihan || 0,
                    nominal_bayar: totalPaid,
                    tanggal_bayar: paymentDates,
                    is_inisiasi: billing.billing_type === 'inisiasi' || billing.billing_type === 'baseline'
                };
            });

            // Calculate outstanding payments
            const currentDate = new Date();
            let outstandingMonths = 0;
            let outstandingAmount = 0;

            billingRecords.forEach(billing => {
                // Skip initiation/baseline records
                if (billing.billing_type === 'inisiasi' || billing.billing_type === 'baseline') {
                    return;
                }

                // Check if period has started
                const periodStart = new Date(billing.periode?.tanggal_awal);
                if (periodStart > currentDate) {
                    return; // Future period
                }

                // Check if bill is outstanding
                if (billing.status === 'belum_bayar' || billing.status === 'sebagian') {
                    outstandingMonths++;
                    outstandingAmount += (billing.sisa_tagihan || 0);
                }
            });

            const result = {
                nomor_blok_rumah: hunian.nomor_blok_rumah,
                nama_kepala_keluarga: penghuniName,
                area: hunian.lorong?.nama_lorong || '-',
                ketua_lorong: hunian.lorong?.ketua_lorong || '-',
                detail: paymentDetails,
                kewajiban_pembayaran: {
                    jumlah_bulan: outstandingMonths,
                    nominal: outstandingAmount
                }
            };

            // Debug penghuni data
            if (result.nama_kepala_keluarga === '-') {
                console.log('Penghuni kosong untuk rumah:', hunian.nomor_blok_rumah, {
                    penghuni_saat_ini: hunian.penghuni_saat_ini,
                    penghuni_saat_ini_id: hunian.penghuni_saat_ini_id
                });
            }

            return result;
        });

        // Store data globally for search/filter operations
        airViewDataGlobal = airViewData;

        const html = `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h4>Detail Data Air</h4>
                        <button class="btn btn-warning text-dark" onclick="loadViewsSection()">
                            <i class="bi bi-arrow-left"></i> Back
                        </button>
                    </div>
                    <p class="text-muted">Data pemakaian air per rumah beserta pembayaran</p>

                    <!-- Search and Filter Section -->
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <label for="air-search" class="form-label">Cari Rumah/Penghuni:</label>
                                    <input type="text" class="form-control" id="air-search" placeholder="Ketik nomor rumah atau nama...">
                                </div>
                                <div class="col-md-3">
                                    <label for="air-filter-area" class="form-label">Filter Area:</label>
                                    <select class="form-select" id="air-filter-area">
                                        <option value="">Semua Area</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label for="air-items-per-page" class="form-label">Data per Halaman:</label>
                                    <select class="form-select" id="air-items-per-page">
                                        <option value="5">5</option>
                                        <option value="10" selected>10</option>
                                        <option value="25">25</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                    </select>
                                </div>
                                <div class="col-md-3 d-flex align-items-end gap-2">
                                    <button class="btn btn-outline-secondary" onclick="resetAirFilters()">Reset</button>
                                    <button class="btn btn-outline-primary" onclick="refreshViewAir()">
                                        <i class="bi bi-arrow-clockwise"></i> Refresh
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="air-table-container"></div>
                </div>
            </div>
        `;

        contentDiv.innerHTML = html;

        // Render initial table
        renderAirTable(airViewData);

        // Initialize search and filter functionality
        setTimeout(() => {
            initializeAirSearchAndFilter();
        }, 100);
    } catch (error) {
        console.error('Error loading air view:', error);
        contentDiv.innerHTML = '<p class="text-danger">Error loading air data</p>';
    }
}

// Render Air Table with pagination
function renderAirTable(data) {
    const totalPages = Math.ceil(data.length / airItemsPerPage);
    const startIndex = (airCurrentPage - 1) * airItemsPerPage;
    const endIndex = startIndex + airItemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    const tableHtml = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-info">
                    <tr>
                        <th style="width: 60px;">No.</th>
                        <th class="sortable" data-column="nomor_blok_rumah">No. Rumah <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th class="sortable" data-column="nama_kepala_keluarga">Penghuni <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th>Detail Pemakaian & Pembayaran</th>
                        <th>Kewajiban s/d Bulan Berjalan</th>
                        <th class="sortable" data-column="area">Area <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th class="sortable" data-column="ketua_lorong">Ketua Lorong <i class="bi bi-chevron-expand sort-icon"></i></th>
                    </tr>
                </thead>
                <tbody>
                    ${paginatedData.map((item, index) => `
                        <tr>
                            <td>${startIndex + index + 1}</td>
                            <td>${item.nomor_blok_rumah}</td>
                            <td>${item.nama_kepala_keluarga}</td>
                            <td>
                                <details>
                                    <summary class="text-primary" style="cursor: pointer;">
                                        ${Object.keys(item.detail).length} periode
                                    </summary>
                                    <div class="mt-2">
                                        ${Object.entries(item.detail).map(([periode, detail]) => `
                                            <div class="mb-2 p-2 border rounded ${detail.is_inisiasi ? 'bg-light' : ''}">
                                                <strong>${periode}</strong> ${detail.is_inisiasi ? '<small class="text-muted">(Inisiasi)</small>' : ''}<br>
                                                <span class="compact-air-info">
                                                    📊 ${detail.meteran_bulan_sebelumnya}→${detail.meteran_bulan_ini} (${detail.pemakaian_air}m³) | 💰 ${formatCurrency(detail.tagihan)} | 💸 ${formatCurrency(detail.nominal_bayar)}${detail.nominal_bayar > 0 ? ` | 📅 (${detail.tanggal_bayar?.join(', ') || 'N/A'})` : ` | ⏳`}
                                                </span>
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
                            <td>${item.area}</td>
                            <td>${item.ketua_lorong}</td>
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
            ${renderPagination('air', airCurrentPage, totalPages)}
        </div>
    `;

    document.getElementById('air-table-container').innerHTML = tableHtml;

    // Re-attach sort event listeners
    attachAirSortListeners();
}

// Initialize Air Search and Filter
function initializeAirSearchAndFilter() {
    const searchInput = document.getElementById('air-search');
    const areaFilter = document.getElementById('air-filter-area');
    const itemsPerPageSelect = document.getElementById('air-items-per-page');

    // Load area options for filter
    loadAirAreaOptionsForFilter();

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            applyAirFilters();
        }, 300));
    }

    // Filter functionality
    if (areaFilter) {
        areaFilter.addEventListener('change', applyAirFilters);
    }

    // Items per page functionality
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', (e) => {
            updateAirItemsPerPage(parseInt(e.target.value));
        });
    }
}

// Load Air Area Options for Filter
async function loadAirAreaOptionsForFilter() {
    try {
        const areas = [...new Set(airViewDataGlobal.map(item => item.area).filter(area => area && area !== '-'))];
        const areaFilter = document.getElementById('air-filter-area');
        if (areaFilter && areas.length > 0) {
            const options = areas.map(area => `<option value="${area}">${area}</option>`).join('');
            areaFilter.innerHTML = '<option value="">Semua Area</option>' + options;
        }
    } catch (error) {
        console.error('Error loading air area options for filter:', error);
    }
}

// Reset Air Filters
function resetAirFilters() {
    document.getElementById('air-search').value = '';
    document.getElementById('air-filter-area').value = '';
    airCurrentPage = 1;
    applyAirFilters();
}

// Apply Air Filters
function applyAirFilters(isFilterChange = true) {
    const searchTerm = document.getElementById('air-search')?.value.toLowerCase() || '';
    const areaFilter = document.getElementById('air-filter-area')?.value || '';

    let filteredData = [...airViewDataGlobal];

    // Apply search filter
    if (searchTerm) {
        filteredData = filteredData.filter(item =>
            item.nomor_blok_rumah.toLowerCase().includes(searchTerm) ||
            item.nama_kepala_keluarga.toLowerCase().includes(searchTerm) ||
            item.area.toLowerCase().includes(searchTerm) ||
            item.ketua_lorong.toLowerCase().includes(searchTerm)
        );
    }

    // Apply area filter
    if (areaFilter) {
        filteredData = filteredData.filter(item => item.area === areaFilter);
    }

    // Reset to page 1 only when filters actually change
    if (isFilterChange) {
        airCurrentPage = 1;
    }

    renderAirTable(filteredData);
}

// Update Air Items Per Page
function updateAirItemsPerPage(newItemsPerPage) {
    airItemsPerPage = newItemsPerPage;
    airCurrentPage = 1; // Reset to first page
    applyAirFilters(false);
}

// Attach Air Sort Listeners
function attachAirSortListeners() {
    const sortableHeaders = document.querySelectorAll('#air-table-container .sortable');

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
            sortAirData(column, newSort);
        });
    });
}

// Sort Air Data
function sortAirData(column, direction) {
    if (direction === 'none') {
        renderAirTable(airViewDataGlobal);
        return;
    }

    let filteredData = [...airViewDataGlobal];

    // Apply current filters first
    const searchTerm = document.getElementById('air-search')?.value.toLowerCase() || '';
    const areaFilter = document.getElementById('air-filter-area')?.value || '';

    if (searchTerm) {
        filteredData = filteredData.filter(item =>
            item.nomor_blok_rumah.toLowerCase().includes(searchTerm) ||
            item.nama_kepala_keluarga.toLowerCase().includes(searchTerm) ||
            item.area.toLowerCase().includes(searchTerm) ||
            item.ketua_lorong.toLowerCase().includes(searchTerm)
        );
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

    renderAirTable(filteredData);
}

// Change Air Page
function changeAirPage(page) {
    airCurrentPage = page;
    applyAirFilters(false); // false = not a filter change, just pagination
}

// Load Rekap Air View - Summary table by period
async function loadViewRekapAir(selectedYear = null) {
    // Clear dashboard content when showing individual view
    const dashboardContent = document.getElementById('dashboard-content');
    if (dashboardContent) {
        dashboardContent.innerHTML = '';
    }

    const contentDiv = document.getElementById('views-content');

    try {
        // Get Air category ID
        const { data: airCategory, error: categoryError } = await supabase
            .from('kategori_saldo')
            .select('id')
            .eq('nama_kategori', 'Air')
            .single();

        if (categoryError || !airCategory) {
            console.error('Air category not found:', categoryError);
            contentDiv.innerHTML = '<p class="text-danger">Kategori Air tidak ditemukan. Pastikan data master kategori sudah diisi.</p>';
            return;
        }

        // Get all periods ordered by sequence
        const { data: allPeriods, error: periodsError } = await supabase
            .from('periode')
            .select('id, nama_periode, nomor_urut, tanggal_awal, tanggal_akhir')
            .order('nomor_urut');

        if (periodsError) throw periodsError;

        // Extract unique years from period names for filter
        const availableYears = [...new Set(allPeriods.map(p => {
            // Cari tahun dalam format 4 digit (2026) atau 2 digit ('26) di mana saja dalam nama periode
            const match4Digit = p.nama_periode.match(/(\d{4})/);
            const match2Digit = p.nama_periode.match(/'(\d{2})/);
            
            if (match4Digit) {
                return match4Digit[1];
            } else if (match2Digit) {
                return '20' + match2Digit[1]; // Konversi 2 digit ke 4 digit dengan awalan 20
            }
            
            return null;
        }).filter(year => year !== null))].sort((a, b) => b - a);

        // Find current active period
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activePeriod = allPeriods.find(p => {
            const startDate = new Date(p.tanggal_awal);
            const endDate = new Date(p.tanggal_akhir);
            return today >= startDate && today <= endDate;
        });

        // Determine default year from active period
        let defaultYear;
        if (activePeriod) {
            const yearMatch4 = activePeriod.nama_periode.match(/(\d{4})/);
            const yearMatch2 = activePeriod.nama_periode.match(/'(\d{2})/);
            
            if (yearMatch4) {
                defaultYear = yearMatch4[1];
            } else if (yearMatch2) {
                defaultYear = '20' + yearMatch2[1];
            } else {
                defaultYear = new Date().getFullYear().toString();
            }
        } else {
            defaultYear = new Date().getFullYear().toString();
        }

        // Normalize selectedYear: null/undefined means current active period year
        if (selectedYear == null) {
            selectedYear = defaultYear; // Use current active period year as default
        }

        // Filter periods by selected year
        let periods = allPeriods;
        if (selectedYear !== 'all') {
            periods = allPeriods.filter(p => {
                // Cari tahun dalam format 4 digit (2026) atau 2 digit ('26) di mana saja dalam nama periode
                const yearMatch4 = p.nama_periode.match(/(\d{4})/);
                const yearMatch2 = p.nama_periode.match(/'(\d{2})/);
                
                let periodYear;
                if (yearMatch4) {
                    periodYear = yearMatch4[1];
                } else if (yearMatch2) {
                    periodYear = '20' + yearMatch2[1];
                } else {
                    return false; // Skip jika tidak ada tahun yang ditemukan
                }
                
                return periodYear === selectedYear;
            });
        }

        // Aggregate data for each period
        const rekapData = [];
        let totalPemasukan = 0;
        let totalPengeluaran = 0;

        // OPTIMIZATION: Fetch air category once at the beginning
        const airCategoryResult = await supabase
            .from('kategori_saldo')
            .select('id')
            .eq('nama_kategori', 'Air')
            .single();

        if (airCategoryResult.error || !airCategoryResult.data) {
            console.error('Air category not found:', airCategoryResult.error);
            contentDiv.innerHTML = '<p class="text-danger">Kategori Air tidak ditemukan</p>';
            return;
        }

        const airCategoryId = airCategoryResult.data.id;

        // OPTIMIZATION: Batch fetch BOTH old and new format payments for all periods
        // Old format (periode_id): single periode per record
        // New format (periode_list): multiple periode per record
        const { data: allPayments, error: allPaymentsError } = await supabase
            .from('pemasukan')
            .select(`
                id,
                tanggal,
                nominal,
                keterangan,
                periode_id,
                periode_list,
                hunian:hunian_id (
                    nomor_blok_rumah,
                    penghuni_saat_ini:penghuni_saat_ini_id (nama_kepala_keluarga)
                )
            `)
            .eq('kategori_id', airCategoryId);

        const paymentsByPeriod = new Map();
        if (!allPaymentsError && allPayments) {
            // Organize payments by period based on PAYMENT DATE (when payment was made)
            // instead of billing period (which period the payment belongs to)
            (periods || []).forEach(period => {
                const paymentsForPeriod = (allPayments || []).filter(payment => {
                    // Filter payments by payment date falling within period's date range
                    const paymentDate = new Date(payment.tanggal);
                    const periodStart = new Date(period.tanggal_awal);
                    const periodEnd = new Date(period.tanggal_akhir);
                    return paymentDate >= periodStart && paymentDate <= periodEnd;
                });
                paymentsByPeriod.set(period.id, paymentsForPeriod);
            });
        }

        for (const period of periods || []) {
            // Get payments for this period from the batch-fetched data
            const periodPayments = paymentsByPeriod.get(period.id) || [];

            // Get allocations for these specific payments
            const paymentIds = periodPayments.map(p => p.id);
            let airPaymentAllocations = [];

            if (paymentIds.length > 0) {
                const { data: allocations, error: allocError } = await supabase
                    .from('meteran_air_billing_pembayaran')
                    .select('nominal_dialokasikan, pemasukan_id')
                    .in('pemasukan_id', paymentIds);

                if (allocError) {
                    console.error('Error fetching allocations:', allocError);
                } else {
                    airPaymentAllocations = allocations || [];
                }
            }

            // 3. Calculate totals and prepare data
            const pemasukan = periodPayments.reduce((sum, payment) => sum + (payment.nominal || 0), 0);

            const pemasukanData = periodPayments.map(payment => {
                // Find allocations for this payment
                const paymentAllocations = airPaymentAllocations.filter(a => a.pemasukan_id === payment.id);
                const totalAllocated = paymentAllocations.reduce((sum, a) => sum + (a.nominal_dialokasikan || 0), 0);

                return {
                    tanggal: payment.tanggal,
                    nominal: payment.nominal,
                    hunian: payment.hunian,
                    keterangan: payment.keterangan || `Pembayaran Air: ${payment.nominal}`
                };
            }).filter(item => item.nominal > 0); // Include all payments with nominal > 0

            // Sum pengeluaran (expenses) for this period and category
            // Filter by expense date falling within the period's date range
            const { data: pengeluaranData, error: pengeluaranError } = await supabase
                .from('pengeluaran')
                .select('tanggal, nominal, keterangan')
                .eq('kategori_id', airCategory.id)
                .gte('tanggal', period.tanggal_awal)
                .lte('tanggal', period.tanggal_akhir);

            if (pengeluaranError) {
                console.error('Error fetching pengeluaran for period:', pengeluaranError);
                continue;
            }

            const pengeluaran = (pengeluaranData || []).reduce((sum, item) => sum + (item.nominal || 0), 0);

            const selisihKas = pemasukan - pengeluaran;

            rekapData.push({
                periode: period.nama_periode,
                pemasukan: pemasukan,
                pengeluaran: pengeluaran,
                selisih_kas: selisihKas,
                pemasukan_details: pemasukanData || [],
                pengeluaran_details: pengeluaranData || []
            });

            totalPemasukan += pemasukan;
            totalPengeluaran += pengeluaran;
        }

        const totalSelisihKas = totalPemasukan - totalPengeluaran;

        // Create dynamic title and info text based on selected year
        const isAllYearsMode = selectedYear === 'all';

        const displayYear = isAllYearsMode ? null : selectedYear;

        const dynamicTitle = 'Rekap Air';

        const titleBadge = isAllYearsMode
            ? '<span class="badge bg-secondary ms-2">Semua Periode</span>'
            : `<span class="badge bg-primary ms-2">${displayYear}</span>`;

        const infoText = isAllYearsMode
            ? 'Rekap pemasukan dan pengeluaran air dari semua periode'
            : `Rekap pemasukan dan pengeluaran air tahun ${displayYear} per periode`;

        const selectorClass = selectedYear === 'all'
            ? 'form-select form-select-sm'
            : 'form-select form-select-sm border-primary';

        const html = `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h4>${dynamicTitle}${titleBadge}</h4>
                        <div class="d-flex gap-2 align-items-center">
                            <div class="d-flex align-items-center gap-2">
                                <i class="bi bi-calendar3 text-primary"></i>
                                <label for="rekap-air-year-select" class="form-label mb-0 fw-bold">Filter Tahun:</label>
                                <select class="${selectorClass}" id="rekap-air-year-select" style="width: auto;">
                                    <option value="all">📊 Semua Periode</option>
                                    ${availableYears.map(year => `<option value="${year}" ${year === selectedYear ? 'selected' : ''}>📅 ${year}</option>`).join('')}
                                </select>
                            </div>
                            <button class="btn btn-warning text-dark" onclick="loadViewsSection()">
                                <i class="bi bi-arrow-left"></i> Back
                            </button>
                        </div>
                    </div>

                    <!-- Info Banner -->
                    <div class="alert alert-info d-flex align-items-center mb-3">
                        <i class="bi bi-info-circle-fill me-2"></i>
                        <div>
                            <strong>Periode Data:</strong> ${infoText}
                        </div>
                    </div>

                    <p class="text-muted">Rekap pemasukan dan pengeluaran air per periode</p>

                    <div class="table-responsive">
                        <table class="table table-striped table-hover">
                            <thead class="table-info">
                                <tr>
                                    <th class="text-center">PERIODE</th>
                                    <th class="text-end">PEMASUKAN</th>
                                    <th class="text-end">PENGELUARAN</th>
                                    <th class="text-end">SELISIH KAS</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rekapData.map((item, index) => `
                                    <tr>
                                        <td class="text-center fw-bold">${item.periode}</td>
                                        <td class="text-end">
                                            ${item.pemasukan > 0 ?
                                                `<button class="btn btn-link text-success fw-bold p-0" onclick="showRekapAirPemasukanDetails(${index})">${formatCurrency(item.pemasukan)}</button>` :
                                                formatCurrency(item.pemasukan)}
                                        </td>
                                        <td class="text-end">
                                            ${item.pengeluaran > 0 ?
                                                `<button class="btn btn-link text-danger fw-bold p-0" onclick="showRekapAirPengeluaranDetails(${index})">${formatCurrency(item.pengeluaran)}</button>` :
                                                formatCurrency(item.pengeluaran)}
                                        </td>
                                        <td class="text-end ${item.selisih_kas >= 0 ? 'text-success' : 'text-danger'} fw-bold">${formatCurrency(item.selisih_kas)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot class="table-info">
                                <tr>
                                    <td class="text-center fw-bold">TOTAL</td>
                                    <td class="text-end text-success fw-bold">${formatCurrency(totalPemasukan)}</td>
                                    <td class="text-end text-danger fw-bold">${formatCurrency(totalPengeluaran)}</td>
                                    <td class="text-end ${totalSelisihKas >= 0 ? 'text-success' : 'text-danger'} fw-bold">${formatCurrency(totalSelisihKas)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div class="mt-3">
                        <button class="btn btn-outline-primary" onclick="refreshViewRekapAir()">
                            <i class="bi bi-arrow-clockwise"></i> Refresh Data
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Store rekap data globally for detail views
        airRekapDataGlobal = rekapData;

        contentDiv.innerHTML = html;

        // Initialize year selector functionality
        setTimeout(() => {
            initializeRekapAirYearSelector();
        }, 100);
    } catch (error) {
        console.error('Error loading rekap air view:', error);
        contentDiv.innerHTML = '<p class="text-danger">Error loading rekap air data</p>';
    }
}

// Show Rekap Air Pemasukan Details
function showRekapAirPemasukanDetails(periodIndex) {
    const periodData = airRekapDataGlobal[periodIndex];
    if (!periodData || !periodData.pemasukan_details || periodData.pemasukan_details.length === 0) {
        showToast('Tidak ada detail pemasukan untuk periode ini', 'info');
        return;
    }

    const detailsHtml = `
        <div class="modal fade" id="rekapAirPemasukanModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Detail Pemasukan Air - ${periodData.periode}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead class="table-light">
                                    <tr>
                                        <th>Tanggal</th>
                                        <th class="text-end">Nominal</th>
                                        <th>Rumah</th>
                                        <th>Penghuni</th>
                                        <th>Keterangan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${periodData.pemasukan_details.map(item => `
                                        <tr>
                                            <td>${new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                                            <td class="text-end text-success fw-bold">${formatCurrency(item.nominal)}</td>
                                            <td>${item.hunian?.nomor_blok_rumah || '-'}</td>
                                            <td>${item.hunian?.penghuni_saat_ini?.nama_kepala_keluarga || '-'}</td>
                                            <td>${item.keterangan || '-'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                                <tfoot>
                                    <tr class="table-active fw-bold">
                                        <td colspan="4">TOTAL PEMASUKAN</td>
                                        <td class="text-end text-success">${formatCurrency(periodData.pemasukan)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('rekapAirPemasukanModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', detailsHtml);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('rekapAirPemasukanModal'));
    modal.show();
}

// Show Rekap Air Pengeluaran Details
function showRekapAirPengeluaranDetails(periodIndex) {
    const periodData = airRekapDataGlobal[periodIndex];
    if (!periodData || !periodData.pengeluaran_details || periodData.pengeluaran_details.length === 0) {
        showToast('Tidak ada detail pengeluaran untuk periode ini', 'info');
        return;
    }

    const detailsHtml = `
        <div class="modal fade" id="rekapAirPengeluaranModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Detail Pengeluaran Air - ${periodData.periode}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead class="table-light">
                                    <tr>
                                        <th>Tanggal</th>
                                        <th class="text-end">Nominal</th>
                                        <th>Keterangan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${periodData.pengeluaran_details.map(item => `
                                        <tr>
                                            <td>${new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                                            <td class="text-end text-danger fw-bold">${formatCurrency(item.nominal)}</td>
                                            <td>${item.keterangan || '-'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                                <tfoot>
                                    <tr class="table-active fw-bold">
                                        <td colspan="2">TOTAL PENGELUARAN</td>
                                        <td class="text-end text-danger">${formatCurrency(periodData.pengeluaran)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('rekapAirPengeluaranModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', detailsHtml);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('rekapAirPengeluaranModal'));
    modal.show();
}

// Initialize Rekap Air Year Selector
function initializeRekapAirYearSelector() {
    const yearSelect = document.getElementById('rekap-air-year-select');
    if (yearSelect) {
        yearSelect.addEventListener('change', (e) => {
            const selectedYear = e.target.value;
            loadViewRekapAir(selectedYear);
        });
    }
}

// Refresh Rekap Air View
async function refreshViewRekapAir() {
    const yearSelect = document.getElementById('rekap-air-year-select');
    const selectedYear = yearSelect ? yearSelect.value : null;
    await loadViewRekapAir(selectedYear);
}

// Refresh Air View
async function refreshViewAir() {
    await loadViewAir();
}

export {
    loadViewAir,
    refreshViewAir,
    loadViewRekapAir,
    refreshViewRekapAir,
    initializeRekapAirYearSelector,
    changeAirPage
};

// Load and cache all tariff data for performance
async function loadTariffCache() {
    try {
        const { data: tariffs, error } = await supabase
            .from('tarif_air')
            .select('harga_per_kubik, tanggal_mulai_berlaku, aktif')
            .eq('aktif', true)
            .order('tanggal_mulai_berlaku', { ascending: false });

        if (error) {
            console.error('Error loading tariff cache:', error);
            return {};
        }

        // console.log('Tariff data loaded:', tariffs); // DEBUG

        // Create a cache map: date -> tariff
        const cache = {};
        (tariffs || []).forEach(tariff => {
            const dateKey = tariff.tanggal_mulai_berlaku;
            if (!cache[dateKey] || new Date(tariff.tanggal_mulai_berlaku) > new Date(cache[dateKey].tanggal_mulai_berlaku)) {
                cache[dateKey] = tariff;
            }
        });

        // Tariff cache created successfully

        return cache;
    } catch (error) {
        console.error('Error creating tariff cache:', error);
        return {};
    }
}

// Backward compatibility for global window functions
window.loadViewAir = loadViewAir;
window.refreshViewAir = refreshViewAir;
window.loadViewRekapAir = loadViewRekapAir;
window.refreshViewRekapAir = refreshViewRekapAir;
window.showRekapAirPemasukanDetails = showRekapAirPemasukanDetails;
window.showRekapAirPengeluaranDetails = showRekapAirPengeluaranDetails;
window.resetAirFilters = resetAirFilters;
window.changeAirPage = changeAirPage;
