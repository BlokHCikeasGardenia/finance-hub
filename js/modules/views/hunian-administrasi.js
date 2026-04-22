// Halaman Administrasi per Hunian
// Menampilkan riwayat tagihan IPL dan Air per hunian dalam bentuk card

import { supabase } from '../config.js';
import { showToast, formatCurrency, debounce } from '../utils.js';

// Global state
let hunianAdministrasiData = [];
let currentPage = 1;
let itemsPerPage = 10;
let searchTerm = '';
let statusFilter = '';
let areaFilter = '';
let periodFilter = '6periode'; // '6periode' (default) or 'semua'

// Load Halaman Administrasi per Hunian
async function loadViewHunianAdministrasi() {
    console.log('loadViewHunianAdministrasi called');

    // Clear dashboard content
    const dashboardContent = document.getElementById('dashboard-content');
    if (dashboardContent) {
        dashboardContent.innerHTML = '';
    }

    const contentDiv = document.getElementById('views-content');
    contentDiv.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div><p>Loading data administrasi hunian...</p></div>';

    try {
        // Load data hunian dengan tagihan IPL dan Air
        const result = await loadHunianAdministrasiData();
        if (!result.success) {
            throw new Error(result.message);
        }

        hunianAdministrasiData = result.data;

        // Render halaman
        renderHunianAdministrasiPage();

    } catch (error) {
        console.error('Error loading hunian administrasi:', error);
        contentDiv.innerHTML = '<p class="text-danger">Error loading data administrasi hunian</p>';
    }
}

// // Load data hunian dasar
async function loadHunianAdministrasiData() {
    try {
        // Query untuk mendapatkan semua hunian
        const { data: hunianData, error: hunianError } = await supabase
            .from('hunian')
            .select(`
                id,
                nomor_urut,
                nomor_blok_rumah,
                status,
                lorong:lorong_id (nama_lorong),
                penghuni_saat_ini:penghuni_saat_ini_id (nama_kepala_keluarga)
            `)
            .order('nomor_urut');

        if (hunianError) throw hunianError;

        // Pada tahap awal, data tagihan belum diisi (akan diisi on-demand per page)
        const processedData = hunianData.map(hunian => ({
            id: hunian.id,
            nomor_urut: hunian.nomor_urut,
            nomor_blok_rumah: hunian.nomor_blok_rumah,
            status: hunian.status,
            penghuni_saat_ini: hunian.penghuni_saat_ini?.nama_kepala_keluarga || '-',
            area: hunian.lorong?.nama_lorong || '-',
            tagihan: [],
            summary: {
                total_outstanding: 0,
                jumlah_belum_lunas: 0
            },
            isLoaded: false // Flag untuk menandai apakah tagihan sudah ditarik
        }));

        return { success: true, data: processedData };

    } catch (error) {
        console.error('Error loading hunian administrasi data:', error);
        return { success: false, message: error.message };
    }
}

// Fetch bills for a batch of hunian IDs (no period filtering - client-side filtering applied later)
async function fetchBillsForBatch(hunianIds) {
    if (!hunianIds || hunianIds.length === 0) return { ipl: [], air: [] };

    try {
        // Query untuk tagihan IPL (ALL bills, no period filter)
        const { data: tagihanIplData, error: iplError } = await supabase
            .from('tagihan_ipl')
            .select(`
                id,
                hunian_id,
                periode_id,
                penghuni_id,
                nominal_tagihan,
                sisa_tagihan,
                status,
                tanggal_tagihan,
                periode:periode_id (nama_periode),
                penghuni:penghuni_id (nama_kepala_keluarga),
                pembayaran:tagihan_ipl_pembayaran (
                    nominal_dialokasikan,
                    tanggal_alokasi,
                    pemasukan:pemasukan_id (tanggal)
                )
            `)
            .in('hunian_id', hunianIds)
            .order('tanggal_tagihan', { ascending: false });

        if (iplError) throw iplError;

        // Query untuk tagihan Air (ALL bills, no period filter)
        const { data: tagihanAirData, error: airError } = await supabase
            .from('meteran_air_billing')
            .select(`
                id,
                hunian_id,
                periode_id,
                penghuni_id,
                nominal_tagihan,
                sisa_tagihan,
                status,
                tanggal_tagihan,
                periode:periode_id (nama_periode),
                penghuni:penghuni_id (nama_kepala_keluarga),
                pembayaran:meteran_air_billing_pembayaran (
                    nominal_dialokasikan,
                    tanggal_alokasi,
                    pemasukan:pemasukan_id (tanggal)
                )
            `)
            .in('hunian_id', hunianIds)
            .order('tanggal_tagihan', { ascending: false });

        if (airError) throw airError;

        console.log(`Fetched ${tagihanIplData.length} IPL bills and ${tagihanAirData.length} Air bills for batch`);

        return { ipl: tagihanIplData || [], air: tagihanAirData || [] };
    } catch (error) {
        console.error('Error fetching bills batch:', error);
        return { ipl: [], air: [] };
    }
}

// Render halaman utama
function renderHunianAdministrasiPage() {
    const contentDiv = document.getElementById('views-content');

    const html = `
        <div class="row">
            <div class="col-12">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h4>Administrasi per Hunian</h4>
                    <button class="btn btn-warning text-dark" onclick="loadViewsSection()">
                        <i class="bi bi-arrow-left"></i> Back
                    </button>
                </div>
                <p class="text-muted">Riwayat tagihan IPL dan Air per hunian</p>

                <!-- Search and Filter Section -->
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="row g-3">
                            <div class="col-md-3">
                                <label for="hunian-admin-search" class="form-label">Cari Hunian/Penghuni:</label>
                                <input type="text" class="form-control" id="hunian-admin-search" placeholder="Ketik nomor rumah atau nama...">
                            </div>
                            <div class="col-md-2">
                                <label for="hunian-admin-status-filter" class="form-label">Status Hunian:</label>
                                <select class="form-select" id="hunian-admin-status-filter">
                                    <option value="">Semua Status</option>
                                    <option value="berpenghuni">Berpenghuni</option>
                                    <option value="kosong">Kosong</option>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <label for="hunian-admin-area-filter" class="form-label">Area:</label>
                                <select class="form-select" id="hunian-admin-area-filter">
                                    <option value="">Semua Area</option>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <label for="hunian-admin-period-filter" class="form-label">Periode:</label>
                                <select class="form-select" id="hunian-admin-period-filter">
                                    <option value="6periode" selected>6 Periode Terakhir</option>
                                    <option value="semua">Semua Periode</option>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <label for="hunian-admin-items-per-page" class="form-label">Per Halaman:</label>
                                <select class="form-select" id="hunian-admin-items-per-page">
                                    <option value="5">5</option>
                                    <option value="10" selected>10</option>
                                    <option value="25">25</option>
                                    <option value="50">50</option>
                                </select>
                            </div>
                            <div class="col-md-3 d-flex align-items-end gap-2">
                                <button class="btn btn-outline-secondary" onclick="resetHunianAdminFilters()">Reset</button>
                                <button class="btn btn-outline-primary" onclick="refreshViewHunianAdministrasi()">
                                    <i class="bi bi-arrow-clockwise"></i> Refresh
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="hunian-admin-cards-container"></div>

                <!-- Modal for detailed tagihan history -->
                <div class="modal fade" id="detailedModal" tabindex="-1" aria-labelledby="detailedModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg modal-dialog-scrollable">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="detailedModalLabel">Riwayat Lengkap Tagihan</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body" id="detailedModalBody">
                                <div class="text-center py-5">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                    <p class="mt-2">Memuat data tagihan...</p>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    contentDiv.innerHTML = html;

    // Initialize filters dan render cards
    setTimeout(() => {
        initializeHunianAdminFilters();
        renderHunianAdminCards();
    }, 100);
}

// Apply client-side period filtering to bills
async function applyPeriodFilter(allBills, filter) {
    if (filter === 'semua') {
        return sortTagihanByPeriode(allBills);
    }

    // Get unique period IDs from bills
    const periodIdsWithBills = [...new Set(allBills.map(b => b.periode_id).filter(id => id))];

    if (periodIdsWithBills.length === 0) {
        return []; // No bills with period IDs
    }

    // Fetch period details for these IDs (only if we need to filter)
    const { data: periodData, error } = await supabase
        .from('periode')
        .select('id, nama_periode, tanggal_awal')
        .in('id', periodIdsWithBills);

    if (error) {
        console.error('Error fetching period details:', error);
        return sortTagihanByPeriode(allBills); // Fallback to all bills
    }

    // Sort periods by tanggal_awal DESC (most recent first)
    const sortedPeriods = (periodData || []).sort((a, b) =>
        new Date(b.tanggal_awal) - new Date(a.tanggal_awal)
    );

    // Take top 6 periods (or all available if less than 6)
    const selectedPeriodIds = sortedPeriods.slice(0, 6).map(p => p.id);

    // Filter bills to only those belonging to selected periods
    const filteredBills = allBills.filter(bill =>
        bill.periode_id && selectedPeriodIds.includes(bill.periode_id)
    );

    // Sort and return
    return sortTagihanByPeriode(filteredBills);
}

// Render cards hunian
async function renderHunianAdminCards() {
    const container = document.getElementById('hunian-admin-cards-container');
    if (!container) return;

    // Apply filters
    let filteredData = [...hunianAdministrasiData];

    if (searchTerm) {
        const search = searchTerm.toLowerCase();
        filteredData = filteredData.filter(item =>
            item.nomor_blok_rumah.toLowerCase().includes(search) ||
            item.penghuni_saat_ini.toLowerCase().includes(search) ||
            item.area.toLowerCase().includes(search)
        );
    }

    if (statusFilter) {
        filteredData = filteredData.filter(item => item.status === statusFilter);
    }

    if (areaFilter) {
        filteredData = filteredData.filter(item => item.area === areaFilter);
    }

    // Pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    // Fetch bills for paginated data if not already loaded
    const idsToFetch = paginatedData.filter(h => !h.isLoaded).map(h => h.id);

    if (idsToFetch.length > 0) {
        container.innerHTML = '<div class="text-center py-5"><div class="spinner-border spinner-border-sm" role="status"></div><small class="ms-2">Loading detail tagihan...</small></div>';

        // Fetch ALL bills (no period filter) - we'll filter client-side
        const { ipl, air } = await fetchBillsForBatch(idsToFetch);
        console.log('Batch fetch result:', { iplCount: ipl.length, airCount: air.length });

        // Update hunianAdministrasiData with fetched bills
        paginatedData.forEach(hunian => {
            if (!hunian.isLoaded) {
                const iplBills = ipl.filter(b => b.hunian_id === hunian.id);
                const airBills = air.filter(b => b.hunian_id === hunian.id);

                // Process IPL bills
                const iplDetails = iplBills.map(bill => ({
                    type: 'IPL',
                    periode: bill.periode?.nama_periode || 'Unknown',
                    periode_id: bill.periode_id, // Add periode_id for filtering
                    nominal_tagihan: bill.nominal_tagihan,
                    sisa_tagihan: bill.sisa_tagihan,
                    status: bill.status,
                    tanggal_tagihan: bill.tanggal_tagihan,
                    penghuni_nama: bill.penghuni?.nama_kepala_keluarga || 'Kosong',
                    pembayaran: bill.pembayaran || []
                }));

                // Process Air bills
                const airDetails = airBills.map(bill => ({
                    type: 'Air',
                    periode: bill.periode?.nama_periode || 'Unknown',
                    periode_id: bill.periode_id, // Add periode_id for filtering
                    nominal_tagihan: bill.nominal_tagihan,
                    sisa_tagihan: bill.sisa_tagihan,
                    status: bill.status,
                    tanggal_tagihan: bill.tanggal_tagihan,
                    penghuni_nama: bill.penghuni?.nama_kepala_keluarga || 'Kosong',
                    pembayaran: bill.pembayaran || []
                }));

                // Combine ALL bills (no period filtering yet)
                const semuaTagihan = sortTagihanByPeriode([...iplDetails, ...airDetails]);

                // Update original object in hunianAdministrasiData
                const originalHunian = hunianAdministrasiData.find(h => h.id === hunian.id);
                if (originalHunian) {
                    // Store ALL bills - filtering will happen in renderHunianCard()
                    originalHunian.allTagihan = semuaTagihan;

                    // Calculate summary from ALL bills
                    const totalOutstanding = semuaTagihan.reduce((sum, tagihan) => sum + (tagihan.sisa_tagihan || 0), 0);
                    const jumlahTagihanBelumLunas = semuaTagihan.filter(tagihan => tagihan.sisa_tagihan > 0).length;

                    originalHunian.summary = {
                        total_outstanding: totalOutstanding,
                        jumlah_belum_lunas: jumlahTagihanBelumLunas
                    };
                    originalHunian.isLoaded = true;
                }
            }
        });
    }

    // Render cards asynchronously
    const cardPromises = paginatedData.map(hunian => renderHunianCard(hunian));
    const cardHtmls = await Promise.all(cardPromises);

    const cardsHtml = `
        <div class="row g-3">
            ${cardHtmls.join('')}
        </div>

        <!-- Pagination -->
        ${renderPagination(filteredData.length, totalPages)}
    `;

    container.innerHTML = cardsHtml;
}

// Render card untuk satu hunian
async function renderHunianCard(hunian) {
    const { summary, allTagihan } = hunian;

    // If no bills loaded yet, show empty
    if (!allTagihan) {
        return `
            <div class="col-md-6 col-lg-4 col-xl-3">
                <div class="card shadow-sm" style="max-height: 500px;">
                    <div class="card-header bg-primary text-white py-2">
                        <h6 class="mb-0 fs-6">${hunian.nomor_blok_rumah}</h6>
                        <small class="text-white-50 d-block" style="font-size: 0.7rem;">${hunian.penghuni_saat_ini}</small>
                    </div>
                    <div class="card-body text-center">
                        <div class="spinner-border spinner-border-sm" role="status"></div>
                    </div>
                </div>
            </div>
        `;
    }

    // Apply client-side period filtering
    const filteredTagihan = await applyPeriodFilter(allTagihan, periodFilter);

    // Determine if showing limited view
    const isLimited = periodFilter === '6periode';

    return `
        <div class="col-md-6 col-lg-4 col-xl-3">
            <div class="card shadow-sm" style="max-height: 500px;">
                <div class="card-header bg-primary text-white py-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="mb-0 fs-6">${hunian.nomor_blok_rumah}</h6>
                        <span class="badge bg-${hunian.status === 'berpenghuni' ? 'success' : 'secondary'} fs-7">${hunian.status}</span>
                    </div>
                    <small class="text-white-50 d-block" style="font-size: 0.7rem;">${hunian.penghuni_saat_ini}</small>
                    <small class="text-white-50 d-block" style="font-size: 0.7rem;">${hunian.area}</small>
                </div>

                <div class="card-body p-2 d-flex flex-column" style="height: 400px;">
                    <!-- Summary Compact -->
                    <div class="row g-1 mb-2 flex-shrink-0">
                        <div class="col-6 text-center border-end">
                            <div class="fw-bold text-danger" style="font-size: 0.9rem;">${formatCurrency(summary.total_outstanding)}</div>
                            <small class="text-muted" style="font-size: 0.7rem;">Outstanding</small>
                        </div>
                        <div class="col-6 text-center">
                            <div class="fw-bold text-warning" style="font-size: 0.9rem;">${summary.jumlah_belum_lunas}</div>
                            <small class="text-muted" style="font-size: 0.7rem;">Belum Lunas</small>
                        </div>
                    </div>

                    <!-- Limited view indicator -->
                    ${isLimited ? '<small class="text-muted text-center d-block mb-1" style="font-size: 0.7rem;">Menampilkan 6 periode terakhir</small>' : ''}

                    <!-- Riwayat Tagihan Scrollable -->
                    <div class="tagihan-history flex-grow-1" style="overflow-y: auto; font-size: 0.8rem;">
                        ${filteredTagihan.length > 0 ?
                            filteredTagihan.map(tagihan => renderTagihanItemCompact(tagihan)).join('') :
                            '<div class="text-center text-muted py-3"><small>Tidak ada tagihan</small></div>'
                        }
                    </div>

                    <!-- Selengkapnya button -->
                    <div class="mt-2 text-center flex-shrink-0">
                        <button class="btn btn-sm btn-outline-primary" onclick="showDetailedModal('${hunian.id}')">
                            Selengkapnya
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render item tagihan compact
function renderTagihanItemCompact(tagihan) {
    const statusIcon = tagihan.status === 'lunas' ? '✓' : '⚠';
    const statusColor = tagihan.status === 'lunas' ? 'success' : 'warning';

    // Warna font berbeda untuk IPL (biru) dan Air (hijau)
    const typeColor = tagihan.type === 'IPL' ? 'text-primary' : 'text-info';

    // Get payment info
    const pembayaran = tagihan.pembayaran || [];
    const tanggalBayar = pembayaran.length > 0 ?
        new Date(pembayaran[0].tanggal_alokasi).toLocaleDateString('id-ID') :
        null;

    return `
        <div class="d-flex justify-content-between align-items-center py-1 border-bottom">
            <div class="flex-grow-1">
                <small class="fw-bold ${typeColor}">${tagihan.type} ${tagihan.periode}</small>
                <br>
                <small class="text-muted">${tagihan.penghuni_nama}</small>
            </div>
            <div class="text-end">
                <small class="fw-bold">${formatCurrency(tagihan.nominal_tagihan)}</small>
                ${tagihan.sisa_tagihan > 0 ?
                    `<br><small class="text-danger">${formatCurrency(tagihan.sisa_tagihan)}</small>` :
                    tanggalBayar ?
                        `<br><small class="text-success">${tanggalBayar}</small>` :
                        ''
                }
            </div>
            <span class="badge bg-${statusColor} ms-1">${statusIcon}</span>
        </div>
    `;
}

// Render item tagihan (full version untuk reference)
function renderTagihanItem(tagihan) {
    const statusIcon = tagihan.status === 'lunas' ? '✓' : '⚠';
    const statusColor = tagihan.status === 'lunas' ? 'success' : 'warning';

    // Get payment info
    const pembayaran = tagihan.pembayaran || [];
    const totalDibayar = pembayaran.reduce((sum, p) => sum + (p.nominal_dialokasikan || 0), 0);
    const tanggalBayar = pembayaran.length > 0 ?
        pembayaran.map(p => new Date(p.tanggal_alokasi).toLocaleDateString('id-ID')).join(', ') :
        null;

    return `
        <div class="mb-2 p-2 border rounded bg-white">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <small class="fw-bold text-primary">${tagihan.type} ${tagihan.periode}</small><br>
                    <small class="text-muted">Ditagih ke: ${tagihan.penghuni_nama}</small>
                </div>
                <span class="badge bg-${statusColor}">${statusIcon}</span>
            </div>

            <div class="mt-1">
                <span class="fw-bold">${formatCurrency(tagihan.nominal_tagihan)}</span>
                ${tagihan.sisa_tagihan > 0 ?
                    `<br><small class="text-danger">Sisa: ${formatCurrency(tagihan.sisa_tagihan)}</small>` :
                    ''
                }
                ${tanggalBayar ?
                    `<br><small class="text-success">Dibayar: ${tanggalBayar}</small>` :
                    ''
                }
            </div>
        </div>
    `;
}

// Render pagination
function renderPagination(totalItems, totalPages) {
    if (totalPages <= 1) return '';

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return `
        <div class="d-flex justify-content-between align-items-center mt-3">
            <div class="text-muted">
                Menampilkan ${startItem}-${endItem} dari ${totalItems} hunian
            </div>
            <nav>
                <ul class="pagination pagination-sm mb-0">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeHunianAdminPage(${currentPage - 1})">«</a>
                    </li>
                    ${Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                        const pageNum = Math.max(1, currentPage - 2) + i;
                        if (pageNum > totalPages) return '';
                        return `
                            <li class="page-item ${pageNum === currentPage ? 'active' : ''}">
                                <a class="page-link" href="#" onclick="changeHunianAdminPage(${pageNum})">${pageNum}</a>
                            </li>
                        `;
                    }).join('')}
                    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeHunianAdminPage(${currentPage + 1})">»</a>
                    </li>
                </ul>
            </nav>
        </div>
    `;
}

// Initialize filters
function initializeHunianAdminFilters() {
    // Load area options
    const areas = [...new Set(hunianAdministrasiData.map(h => h.area).filter(a => a && a !== '-'))];
    const areaSelect = document.getElementById('hunian-admin-area-filter');
    if (areaSelect && areas.length > 0) {
        const options = areas.map(area => `<option value="${area}">${area}</option>`).join('');
        areaSelect.innerHTML = '<option value="">Semua Area</option>' + options;
    }

    // Event listeners
    document.getElementById('hunian-admin-search').addEventListener('input',
        debounce(() => {
            searchTerm = document.getElementById('hunian-admin-search').value;
            currentPage = 1;
            renderHunianAdminCards();
        }, 300)
    );

    document.getElementById('hunian-admin-status-filter').addEventListener('change', () => {
        statusFilter = document.getElementById('hunian-admin-status-filter').value;
        currentPage = 1;
        renderHunianAdminCards();
    });

    document.getElementById('hunian-admin-area-filter').addEventListener('change', () => {
        areaFilter = document.getElementById('hunian-admin-area-filter').value;
        currentPage = 1;
        renderHunianAdminCards();
    });

    document.getElementById('hunian-admin-items-per-page').addEventListener('change', () => {
        itemsPerPage = parseInt(document.getElementById('hunian-admin-items-per-page').value);
        currentPage = 1;
        renderHunianAdminCards();
    });

    document.getElementById('hunian-admin-period-filter').addEventListener('change', () => {
        periodFilter = document.getElementById('hunian-admin-period-filter').value;
        currentPage = 1;
        // Reset loaded state so cards refetch and re-apply period filtering
        hunianAdministrasiData.forEach(h => h.isLoaded = false);
        renderHunianAdminCards();
    });
}

// Reset filters
function resetHunianAdminFilters() {
    document.getElementById('hunian-admin-search').value = '';
    document.getElementById('hunian-admin-status-filter').value = '';
    document.getElementById('hunian-admin-area-filter').value = '';
    document.getElementById('hunian-admin-period-filter').value = '6periode';

    searchTerm = '';
    statusFilter = '';
    areaFilter = '';
    periodFilter = '6periode';
    // Reset loaded data to refetch and re-apply default period filter
    hunianAdministrasiData.forEach(h => h.isLoaded = false);
    currentPage = 1;

    renderHunianAdminCards();
}

// Change page
function changeHunianAdminPage(page) {
    currentPage = page;
    renderHunianAdminCards();
}

// Sort tagihan: periode terbaru ke terlama, IPL → Air dalam periode sama
function sortTagihanByPeriode(tagihanArray) {
    if (!tagihanArray || tagihanArray.length === 0) return [];

    // Mapping bulan Indonesia ke angka untuk sorting yang benar
    const bulanMap = {
        'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4, 'Mei': 5, 'Juni': 6,
        'Juli': 7, 'Agustus': 8, 'September': 9, 'Oktober': 10, 'November': 11, 'Desember': 12,
        'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
        'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12,
        // Abbreviations
        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'Mei': 5, 'Mei': 5, 'Jun': 6, 'Jul': 7, 'Agu': 8, 'Sep': 9, 'Okt': 10, 'Nov': 11, 'Des': 12,
        'Aug': 8, 'Oct': 10, 'Dec': 12
    };

    // Fungsi untuk parse periode menjadi nilai sortable
    function parsePeriodeValue(periode) {
        if (!periode || typeof periode !== 'string') return 0;

        // Format: "Bulan Tahun" atau "Month Year" or "Abbr 'YY"
        const parts = periode.trim().split(/\s+/);
        if (parts.length >= 2) {
            const bulanStr = parts[0];
            const tahunStr = parts[parts.length - 1];
            
            const bulan = bulanMap[bulanStr] || 0;
            
            // Handle 'YY or YYYY
            let tahun = 0;
            if (tahunStr.startsWith("'")) {
                tahun = 2000 + parseInt(tahunStr.substring(1));
            } else {
                tahun = parseInt(tahunStr);
                if (tahun < 100) tahun += 2000;
            }
            
            if (isNaN(tahun)) tahun = 0;
            
            return tahun * 100 + bulan;
        }
        return 0;
    }

    // Sort berdasarkan periode value (terbesar dulu = terbaru)
    const sortedTagihan = [...tagihanArray].sort((a, b) => {
        const valueA = parsePeriodeValue(a.periode);
        const valueB = parsePeriodeValue(b.periode);

        // Jika periode sama, urutkan IPL dulu baru Air
        if (valueA === valueB) {
            // Jika tanggal tagihan ada, gunakan itu sebagai tie-breaker
            if (a.tanggal_tagihan && b.tanggal_tagihan && a.tanggal_tagihan !== b.tanggal_tagihan) {
                return b.tanggal_tagihan.localeCompare(a.tanggal_tagihan);
            }
            
            if (a.type === 'IPL' && b.type === 'Air') return -1;
            if (a.type === 'Air' && b.type === 'IPL') return 1;
            return 0;
        }

        // Periode terbaru (nilai lebih besar) dulu
        return valueB - valueA;
    });

    return sortedTagihan;
}

// Refresh view
async function refreshViewHunianAdministrasi() {
    await loadViewHunianAdministrasi();
}

// Show detailed modal with full billing history for a hunian
async function showDetailedModal(hunianId) {
    // Show modal with loading state
    const modalBody = document.getElementById('detailedModalBody');
    const modal = new bootstrap.Modal(document.getElementById('detailedModal'));
    modalBody.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Memuat data tagihan lengkap...</p>
        </div>
    `;
    modal.show();

    try {
        // Fetch ALL bills for this hunian (no period filter)
        const { ipl, air } = await fetchBillsForBatch([hunianId]);
        
        // Get hunian info for title
        const hunian = hunianAdministrasiData.find(h => h.id === hunianId);
        const title = document.getElementById('detailedModalLabel');
        if (title && hunian) {
            title.textContent = `Riwayat Lengkap Tagihan - ${hunian.nomor_blok_rumah} (${hunian.penghuni_saat_ini})`;
        }

        // Combine and sort all bills
        const allBills = sortTagihanByPeriode([
            ...ipl.map(bill => ({
                type: 'IPL',
                periode: bill.periode?.nama_periode || 'Unknown',
                nominal_tagihan: bill.nominal_tagihan,
                sisa_tagihan: bill.sisa_tagihan,
                status: bill.status,
                tanggal_tagihan: bill.tanggal_tagihan,
                penghuni_nama: bill.penghuni?.nama_kepala_keluarga || 'Kosong',
                pembayaran: bill.pembayaran || []
            })),
            ...air.map(bill => ({
                type: 'Air',
                periode: bill.periode?.nama_periode || 'Unknown',
                nominal_tagihan: bill.nominal_tagihan,
                sisa_tagihan: bill.sisa_tagihan,
                status: bill.status,
                tanggal_tagihan: bill.tanggal_tagihan,
                penghuni_nama: bill.penghuni?.nama_kepala_keluarga || 'Kosong',
                pembayaran: bill.pembayaran || []
            }))
        ]);

        // Calculate totals
        const totalOutstanding = allBills.reduce((sum, bill) => sum + (bill.sisa_tagihan || 0), 0);
        const totalBills = allBills.length;
        const paidBills = allBills.filter(b => b.status === 'lunas').length;
        const unpaidBills = allBills.filter(b => b.status !== 'lunas').length;

        // Render modal content
        modalBody.innerHTML = `
            <!-- Summary -->
            <div class="row mb-3 g-2">
                <div class="col-4">
                    <div class="border rounded p-2 text-center">
                        <strong>${formatCurrency(totalOutstanding)}</strong><br>
                        <small class="text-muted">Outstanding</small>
                    </div>
                </div>
                <div class="col-4">
                    <div class="border rounded p-2 text-center">
                        <strong>${totalBills}</strong><br>
                        <small class="text-muted">Total Tagihan</small>
                    </div>
                </div>
                <div class="col-4">
                    <div class="border rounded p-2 text-center">
                        <strong>${paidBills} / ${unpaidBills}</strong><br>
                        <small class="text-muted">Lunas / Belum</small>
                    </div>
                </div>
            </div>

            <!-- Detailed list -->
            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                <table class="table table-sm table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Type</th>
                            <th>Periode</th>
                            <th>Nominal</th>
                            <th>Sisa</th>
                            <th>Status</th>
                            <th>Tanggal Bayar</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allBills.map(bill => {
                            const pembayaran = bill.pembayaran || [];
                            const tanggalBayar = pembayaran.length > 0 ?
                                new Date(pembayaran[0].tanggal_alokasi).toLocaleDateString('id-ID') : '-';
                            const statusBadge = bill.status === 'lunas' ?
                                '<span class="badge bg-success">Lunas</span>' :
                                '<span class="badge bg-warning text-dark">Belum</span>';
                            const typeColor = bill.type === 'IPL' ? 'text-primary' : 'text-info';
                            
                            return `
                                <tr>
                                    <td><small class="fw-bold ${typeColor}">${bill.type}</small></td>
                                    <td><small>${bill.periode}</small></td>
                                    <td><small>${formatCurrency(bill.nominal_tagihan)}</small></td>
                                    <td><small class="${bill.sisa_tagihan > 0 ? 'text-danger' : ''}">${formatCurrency(bill.sisa_tagihan)}</small></td>
                                    <td>${statusBadge}</td>
                                    <td><small>${tanggalBayar}</small></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                            </div>
        `;

    } catch (error) {
        console.error('Error loading detailed modal:', error);
        modalBody.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> Gagal memuat data tagihan.
                <br><small>${error.message}</small>
            </div>
        `;
    }
}

export {
    loadViewHunianAdministrasi,
    refreshViewHunianAdministrasi,
    changeHunianAdminPage,
    resetHunianAdminFilters,
    showDetailedModal
};

// Backward compatibility
window.loadViewHunianAdministrasi = loadViewHunianAdministrasi;
window.refreshViewHunianAdministrasi = refreshViewHunianAdministrasi;
window.changeHunianAdminPage = changeHunianAdminPage;
window.resetHunianAdminFilters = resetHunianAdminFilters;
window.showDetailedModal = showDetailedModal;
