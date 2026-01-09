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

// Load data hunian dengan tagihan IPL dan Air
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

        // Query untuk tagihan IPL dengan detail pembayaran
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
            .order('tanggal_tagihan', { ascending: false });

        if (iplError) throw iplError;

        // Query untuk tagihan Air dengan detail pembayaran
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
            .order('tanggal_tagihan', { ascending: false });

        if (airError) throw airError;

        // Process data untuk setiap hunian
        const processedData = hunianData.map(hunian => {
            // Filter tagihan IPL untuk hunian ini
            const iplBills = tagihanIplData.filter(bill => bill.hunian_id === hunian.id);
            const airBills = tagihanAirData.filter(bill => bill.hunian_id === hunian.id);

            // Process IPL bills
            const iplDetails = iplBills.map(bill => ({
                type: 'IPL',
                periode: bill.periode?.nama_periode || 'Unknown',
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
                nominal_tagihan: bill.nominal_tagihan,
                sisa_tagihan: bill.sisa_tagihan,
                status: bill.status,
                tanggal_tagihan: bill.tanggal_tagihan,
                penghuni_nama: bill.penghuni?.nama_kepala_keluarga || 'Kosong',
                pembayaran: bill.pembayaran || []
            }));

            // Combine dan sort tagihan: periode terbaru ke terlama, IPL → Air dalam periode sama
            const semuaTagihan = sortTagihanByPeriode([...iplDetails, ...airDetails]);

            // Hitung summary
            const totalOutstanding = semuaTagihan.reduce((sum, tagihan) => sum + (tagihan.sisa_tagihan || 0), 0);
            const jumlahTagihanBelumLunas = semuaTagihan.filter(tagihan => tagihan.sisa_tagihan > 0).length;

            return {
                id: hunian.id,
                nomor_urut: hunian.nomor_urut,
                nomor_blok_rumah: hunian.nomor_blok_rumah,
                status: hunian.status,
                penghuni_saat_ini: hunian.penghuni_saat_ini?.nama_kepala_keluarga || '-',
                area: hunian.lorong?.nama_lorong || '-',
                tagihan: semuaTagihan,
                summary: {
                    total_outstanding: totalOutstanding,
                    jumlah_belum_lunas: jumlahTagihanBelumLunas
                }
            };
        });

        return { success: true, data: processedData };

    } catch (error) {
        console.error('Error loading hunian administrasi data:', error);
        return { success: false, message: error.message };
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

// Render cards hunian
function renderHunianAdminCards() {
    const container = document.getElementById('hunian-admin-cards-container');

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

    const cardsHtml = `
        <div class="row g-3">
            ${paginatedData.map(hunian => renderHunianCard(hunian)).join('')}
        </div>

        <!-- Pagination -->
        ${renderPagination(filteredData.length, totalPages)}
    `;

    container.innerHTML = cardsHtml;
}

// Render card untuk satu hunian
function renderHunianCard(hunian) {
    const { summary, tagihan } = hunian;

    // Tagihan sudah di-sort dari database query
    const sortedTagihan = tagihan;

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

                    <!-- Riwayat Tagihan Scrollable -->
                    <div class="tagihan-history flex-grow-1" style="overflow-y: auto; font-size: 0.8rem;">
                        ${sortedTagihan.length > 0 ?
                            sortedTagihan.map(tagihan => renderTagihanItemCompact(tagihan)).join('') :
                            '<div class="text-center text-muted py-3"><small>Tidak ada tagihan</small></div>'
                        }
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
}

// Reset filters
function resetHunianAdminFilters() {
    document.getElementById('hunian-admin-search').value = '';
    document.getElementById('hunian-admin-status-filter').value = '';
    document.getElementById('hunian-admin-area-filter').value = '';

    searchTerm = '';
    statusFilter = '';
    areaFilter = '';
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
    // Mapping bulan Indonesia ke angka untuk sorting yang benar
    const bulanMap = {
        'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4, 'Mei': 5, 'Juni': 6,
        'Juli': 7, 'Agustus': 8, 'September': 9, 'Oktober': 10, 'November': 11, 'Desember': 12,
        'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
        'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
    };

    // Fungsi untuk parse periode menjadi nilai sortable
    function parsePeriodeValue(periode) {
        // Format: "Bulan Tahun" atau "Month Year"
        const parts = periode.split(' ');
        if (parts.length >= 2) {
            const bulan = bulanMap[parts[0]] || 0;
            const tahun = parseInt(parts[parts.length - 1]) || 0;
            return tahun * 100 + bulan; // Tahun * 100 + bulan
        }
        return 0;
    }

    // Sort berdasarkan periode value (terbesar dulu = terbaru)
    const sortedTagihan = tagihanArray.sort((a, b) => {
        const valueA = parsePeriodeValue(a.periode);
        const valueB = parsePeriodeValue(b.periode);

        // Jika periode sama, urutkan IPL dulu baru Air
        if (valueA === valueB) {
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

export {
    loadViewHunianAdministrasi,
    refreshViewHunianAdministrasi,
    changeHunianAdminPage,
    resetHunianAdminFilters
};

// Backward compatibility
window.loadViewHunianAdministrasi = loadViewHunianAdministrasi;
window.refreshViewHunianAdministrasi = refreshViewHunianAdministrasi;
window.changeHunianAdminPage = changeHunianAdminPage;
window.resetHunianAdminFilters = resetHunianAdminFilters;
