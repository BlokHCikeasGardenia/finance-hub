// Rekap IPL (IPL Recap) Reports Module
// Comprehensive IPL financial monitoring with detailed breakdowns

import { supabase } from '../../config.js';
import { showToast, formatCurrency, renderPagination, debounce } from '../../utils.js';

// Global state for Rekap IPL
let rekapIplDataGlobal = [];
let iplCurrentPage = 1;
let iplItemsPerPage = 10;

// Load Rekap IPL View - Main comprehensive IPL recap
async function loadViewRekapIPL(selectedYear = null) {
    // Clear dashboard content when showing individual view
    const dashboardContent = document.getElementById('dashboard-content');
    if (dashboardContent) {
        dashboardContent.innerHTML = '';
    }

    const contentDiv = document.getElementById('views-content');

    // Aggressive content clearing to prevent showing dashboard cards
    contentDiv.innerHTML = '';
    contentDiv.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div><p>Loading Rekap IPL...</p></div>';

    try {

        // Get all periods for the recap
        const { data: allPeriods, error: periodsError } = await supabase
            .from('periode')
            .select('id, nama_periode, nomor_urut, tanggal_awal, tanggal_akhir')
            .order('nomor_urut');

        if (periodsError) throw periodsError;

        // Extract unique years from period names for filter
        const availableYears = [...new Set(allPeriods.map(p => {
            const match = p.nama_periode.match(/(\d{4})$/);
            return match ? match[1] : null;
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
            const yearMatch = activePeriod.nama_periode.match(/(\d{4})$/);
            defaultYear = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
        } else {
            defaultYear = new Date().getFullYear().toString();
        }

        // Use selectedYear if provided, otherwise use default year from active period
        const yearToUse = selectedYear || defaultYear;

        // Filter periods by selected year
        let periodsToShow = allPeriods;
        if (yearToUse !== 'all') {
            periodsToShow = allPeriods.filter(p => p.nama_periode.includes(yearToUse));
        }

        // Process each period to calculate all required metrics
        const rekapData = [];

        for (const period of periodsToShow) {
            const periodData = await calculatePeriodData(period);
            rekapData.push(periodData);
        }

        // Store data globally for detail views
        rekapIplDataGlobal = rekapData;

        // Create dynamic title and info text based on selected year
        const isAllYearsMode = yearToUse === 'all';

        const displayYear = isAllYearsMode ? null : yearToUse;

        const dynamicTitle = 'Rekap IPL';

        const titleBadge = isAllYearsMode
            ? '<span class="badge bg-secondary ms-2">Semua Periode</span>'
            : `<span class="badge bg-primary ms-2">${displayYear}</span>`;

        const infoText = isAllYearsMode
            ? 'Rekap komprehensif IPL dari semua periode'
            : `Rekap IPL tahun ${displayYear} per periode dengan detail pembayaran, DAU, dan status warga`;

        const selectorClass = yearToUse === 'all'
            ? 'form-select form-select-sm'
            : 'form-select form-select-sm border-primary';

        // Generate HTML
        const html = `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h4>${dynamicTitle}${titleBadge}</h4>
                        <div class="d-flex gap-2 align-items-center">
                            <div class="d-flex align-items-center gap-2">
                                <i class="bi bi-calendar3 text-primary"></i>
                                <label for="rekap-ipl-year-select" class="form-label mb-0 fw-bold">Filter Tahun:</label>
                                <select class="${selectorClass}" id="rekap-ipl-year-select" style="width: auto;">
                                    <option value="all">📊 Semua Periode</option>
                                    ${availableYears.map(year => `<option value="${year}" ${year === yearToUse ? 'selected' : ''}>📅 ${year}</option>`).join('')}
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

                    <p class="text-muted">Rekap komprehensif IPL per periode dengan detail pembayaran, DAU, dan status warga</p>



                    <!-- Main Rekap Table -->
                    <div class="table-responsive">
                        <table class="table table-striped table-hover">
                            <thead class="table-success">
                                <tr>
                                    <th rowspan="2" class="text-center align-middle">Periode</th>
                                    <th colspan="3" class="text-center">Keuangan</th>
                                    <th colspan="3" class="text-center">Pembayaran</th>
                                    <th colspan="3" class="text-center">Status Warga</th>
                                    <th rowspan="2" class="text-center align-middle">Rumah Kosong</th>
                                </tr>
                                <tr>
                                    <th class="text-end">Pemasukan</th>
                                    <th class="text-end">Pengeluaran</th>
                                    <th class="text-end">Selisih Kas</th>
                                    <th class="text-center">Warga Bayar</th>
                                    <th class="text-center">Periode Dibayar</th>
                                    <th class="text-end">DAU Terkumpul</th>
                                    <th class="text-center">Lunas IPL</th>
                                    <th class="text-center">Belum Lunas</th>
                                    <th class="text-center">Total Warga</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rekapData.map((item, index) => `
                                    <tr>
                                        <td class="text-center fw-bold">${item.periode}</td>
                                        <td class="text-end">
                                            ${item.pemasukan > 0 ?
                                                `<button class="btn btn-link text-success fw-bold p-0" onclick="showRekapIplPemasukanDetails(${index})">${formatCurrency(item.pemasukan)}</button>` :
                                                formatCurrency(item.pemasukan)}
                                        </td>
                                        <td class="text-end">
                                            ${item.pengeluaran > 0 ?
                                                `<button class="btn btn-link text-danger fw-bold p-0" onclick="showRekapIplPengeluaranDetails(${index})">${formatCurrency(item.pengeluaran)}</button>` :
                                                formatCurrency(item.pengeluaran)}
                                        </td>
                                        <td class="text-end ${item.selisih_kas >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(item.selisih_kas)}</td>
                                        <td class="text-center"><span class="badge bg-primary">${item.jumlah_warga_bayar}</span></td>
                                        <td class="text-center"><span class="badge bg-secondary">${item.jumlah_periode_dibayar}</span></td>
                                        <td class="text-end text-info fw-bold">${formatCurrency(item.dau_terkumpul)}</td>
                                        <td class="text-center"><span class="badge bg-success">${item.warga_lunas_ipl}</span></td>
                                        <td class="text-center"><span class="badge bg-warning">${item.warga_belum_lunas_ipl}</span></td>
                                        <td class="text-center"><span class="badge bg-dark">${item.total_warga}</span></td>
                                        <td class="text-center"><span class="badge bg-light text-dark">${item.rumah_kosong}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot class="table-success">
                                <tr>
                                    <td class="text-center fw-bold">TOTAL</td>
                                    <td class="text-end text-success fw-bold">${formatCurrency(rekapData.reduce((sum, item) => sum + item.pemasukan, 0))}</td>
                                    <td class="text-end text-danger fw-bold">${formatCurrency(rekapData.reduce((sum, item) => sum + item.pengeluaran, 0))}</td>
                                    <td class="text-end ${rekapData.reduce((sum, item) => sum + item.selisih_kas, 0) >= 0 ? 'text-success' : 'text-danger'} fw-bold">${formatCurrency(rekapData.reduce((sum, item) => sum + item.selisih_kas, 0))}</td>
                                    <td class="text-center fw-bold">${rekapData.reduce((sum, item) => sum + item.jumlah_warga_bayar, 0)}</td>
                                    <td class="text-center fw-bold">${rekapData.reduce((sum, item) => sum + item.jumlah_periode_dibayar, 0)}</td>
                                    <td class="text-end text-info fw-bold">${formatCurrency(rekapData.reduce((sum, item) => sum + item.dau_terkumpul, 0))}</td>
                                    <td class="text-center fw-bold">${rekapData.reduce((sum, item) => sum + item.warga_lunas_ipl, 0)}</td>
                                    <td class="text-center fw-bold">${rekapData.reduce((sum, item) => sum + item.warga_belum_lunas_ipl, 0)}</td>
                                    <td class="text-center fw-bold">${rekapData.reduce((sum, item) => sum + item.total_warga, 0)}</td>
                                    <td class="text-center fw-bold">${rekapData.reduce((sum, item) => sum + item.rumah_kosong, 0)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <!-- IPL Terbayar di Muka Section -->
                    <div class="card mt-4">
                        <div class="card-header">
                            <h6 class="mb-0">IPL Terbayar di Muka</h6>
                        </div>
                        <div class="card-body">
                            ${await generateAdvancePaymentSection(defaultYear)}
                        </div>
                    </div>

                    <!-- Pengeluaran Rutin Section -->
                    <div class="card mt-4">
                        <div class="card-header">
                            <h6 class="mb-0">Pengeluaran Rutin per Bulan</h6>
                        </div>
                        <div class="card-body">
                            ${generateRoutineExpensesSection()}
                        </div>
                    </div>

                    <div class="mt-3">
                        <button class="btn btn-outline-primary" onclick="refreshViewRekapIPL()">
                            <i class="bi bi-arrow-clockwise"></i> Refresh Data
                        </button>
                    </div>
                </div>
            </div>
        `;

        contentDiv.innerHTML = html;

        // Initialize year selector
        setTimeout(() => {
            initializeRekapIPLYearSelector();
        }, 100);

    } catch (error) {
        console.error('Error loading rekap IPL view:', error);
        contentDiv.innerHTML = '<p class="text-danger">Error loading rekap IPL data</p>';
    }
}

// Calculate all data for a specific period
async function calculatePeriodData(period) {
    try {
        // Get IPL and DAU categories
        const { data: categories, error: catError } = await supabase
            .from('kategori_saldo')
            .select('id, nama_kategori')
            .in('nama_kategori', ['IPL', 'DAU']);

        if (catError) throw catError;

        const iplCategory = categories.find(c => c.nama_kategori === 'IPL');
        const dauCategory = categories.find(c => c.nama_kategori === 'DAU');

        // 1. Pemasukan: IPL + DAU dalam periode tanggal
        const pemasukan = await calculatePeriodIncome(period, iplCategory?.id, dauCategory?.id);

        // 2. Pengeluaran: IPL + DAU dalam periode tanggal
        const pengeluaran = await calculatePeriodExpenses(period, iplCategory?.id, dauCategory?.id);

        // 3. Selisih Kas
        const selisih_kas = pemasukan.total - pengeluaran.total;

        // 4. Jumlah warga bayar (unik)
        const jumlah_warga_bayar = pemasukan.unique_households;

        // 5. Jumlah periode dibayar (total transaksi)
        const jumlah_periode_dibayar = pemasukan.transaction_count;

        // 6. DAU terkumpul (periode dibayar × 5000)
        const dau_terkumpul = jumlah_periode_dibayar * 5000;

        // 7-9. Status warga IPL untuk periode ini
        const wargaStatus = await calculateWargaStatus(period);

        // 10. Rumah kosong
        const rumah_kosong = await calculateRumahKosong(period);

        return {
            periode: period.nama_periode,
            pemasukan: pemasukan.total,
            pengeluaran: pengeluaran.total,
            selisih_kas,
            jumlah_warga_bayar,
            jumlah_periode_dibayar,
            dau_terkumpul,
            warga_lunas_ipl: wargaStatus.lunas,
            warga_belum_lunas_ipl: wargaStatus.belum_lunas,
            total_warga: wargaStatus.total,
            rumah_kosong,
            pemasukan_details: pemasukan.details,
            pengeluaran_details: pengeluaran.details
        };

    } catch (error) {
        console.error('Error calculating period data:', error);
        return {
            periode: period.nama_periode,
            pemasukan: 0,
            pengeluaran: 0,
            selisih_kas: 0,
            jumlah_warga_bayar: 0,
            jumlah_periode_dibayar: 0,
            dau_terkumpul: 0,
            warga_lunas_ipl: 0,
            warga_belum_lunas_ipl: 0,
            total_warga: 0,
            rumah_kosong: 0
        };
    }
}

// Calculate period income (IPL + DAU)
async function calculatePeriodIncome(period, iplCategoryId, dauCategoryId) {
    const categoryIds = [iplCategoryId, dauCategoryId].filter(id => id);

    const { data, error } = await supabase
        .from('pemasukan')
        .select(`
            nominal,
            hunian_id,
            tanggal,
            keterangan,
            hunian:hunian_id (
                nomor_blok_rumah,
                penghuni_saat_ini:penghuni_saat_ini_id (nama_kepala_keluarga)
            )
        `)
        .in('kategori_id', categoryIds)
        .gte('tanggal', period.tanggal_awal)
        .lte('tanggal', period.tanggal_akhir);

    if (error) throw error;

    const total = data.reduce((sum, item) => sum + (item.nominal || 0), 0);
    const unique_households = new Set(data.map(item => item.hunian_id)).size;
    const transaction_count = data.length;

    // Prepare detail data for modal
    const details = data.map(item => ({
        tanggal: item.tanggal,
        nominal: item.nominal,
        hunian: item.hunian,
        keterangan: item.keterangan || `Pembayaran IPL/DAU`
    }));

    return { total, unique_households, transaction_count, details };
}

// Calculate period expenses (IPL + DAU)
async function calculatePeriodExpenses(period, iplCategoryId, dauCategoryId) {
    const categoryIds = [iplCategoryId, dauCategoryId].filter(id => id);

    const { data, error } = await supabase
        .from('pengeluaran')
        .select('nominal, tanggal, keterangan')
        .in('kategori_id', categoryIds)
        .gte('tanggal', period.tanggal_awal)
        .lte('tanggal', period.tanggal_akhir);

    if (error) throw error;

    const total = data.reduce((sum, item) => sum + (item.nominal || 0), 0);

    // Prepare detail data for modal
    const details = data.map(item => ({
        tanggal: item.tanggal,
        nominal: item.nominal,
        keterangan: item.keterangan || 'Pengeluaran IPL/DAU'
    }));

    return { total, details };
}

// Calculate warga status for period
async function calculateWargaStatus(period) {
    // Count tagihan IPL for this period
    const { data, error } = await supabase
        .from('tagihan_ipl')
        .select('status, nominal_tagihan')
        .eq('periode_id', period.id);

    if (error) throw error;

    const lunas = data.filter(item => item.status === 'lunas' && item.nominal_tagihan !== 30000).length;
    const belum_lunas = data.filter(item => item.status !== 'lunas' && item.nominal_tagihan !== 30000).length;
    const total = data.filter(item => item.nominal_tagihan !== 30000).length;

    return { lunas, belum_lunas, total };
}

// Calculate rumah kosong
async function calculateRumahKosong(period) {
    // For now, count houses with status 'kosong'
    // This might need adjustment based on actual logic
    const { data, error } = await supabase
        .from('hunian')
        .select('id')
        .eq('status', 'kosong');

    if (error) throw error;

    return data.length;
}

// Helper function to get current IPL tariff for advance payment calculation
async function getCurrentIplTariffForAdvancePayment() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data: tariff, error } = await supabase
            .from('tarif_ipl')
            .select('nominal')
            .eq('type_tarif', 'IPL')
            .eq('aktif', true)
            .lte('tanggal_mulai_berlaku', today)
            .order('tanggal_mulai_berlaku', { ascending: false })
            .limit(1);

        if (error) throw error;
        
        if (!tariff || tariff.length === 0) {
            throw new Error('Tarif IPL tidak ditemukan');
        }

        // Return full IPL nominal (TANPA dikurangi DAU)
        return tariff[0].nominal; // Hanya return nominal penuh
    } catch (error) {
        console.error('Error getting current IPL tariff for advance payment:', error);
        return 60000; // Default fallback (bukan 55000)
    }
}

// Generate IPL Terbayar di Muka section
async function generateAdvancePaymentSection(currentYear) {
    try {
        const today = new Date();
        
        // Get all advance payments for future periods
        const { data: advancePayments, error: advanceError } = await supabase
            .from('tagihan_ipl')
            .select(`
                id,
                nominal_tagihan,
                type_tarif,
                periode:periode_id (tanggal_awal, tanggal_akhir, nama_periode)
            `)
            .eq('status', 'lunas')
            .eq('type_tarif', 'IPL')
            .gte('periode.tanggal_awal', '2026-01-01')
            .gt('periode.tanggal_awal', today.toISOString().split('T')[0]); // Hanya periode masa depan

        if (advanceError) throw advanceError;

        // Filter payments with valid period
        const validPayments = advancePayments.filter(payment => payment.periode && payment.periode.nama_periode);

        // Calculate total nominal and DAU
        const nominal = validPayments.reduce((sum, payment) => {
            return sum + (payment.nominal_tagihan || 0);
        }, 0);
        
        const dau = validPayments.length * 5000;

        return `
            <div class="row text-center">
                <div class="col-md-6">
                    <div class="p-3 bg-light rounded">
                        <div class="fw-bold">Jumlah Bulan Dibayar di Muka</div>
                        <div class="fs-4 text-primary">${validPayments.length} bulan</div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="p-3 bg-light rounded">
                        <div class="fw-bold">Nominal Disimpan</div>
                        <div class="fs-4 text-success">${formatCurrency(nominal)}</div>
                        <small class="text-muted">70.000 × ${validPayments.length} bulan</small>
                    </div>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Error calculating advance payments:', error);
        return '<p class="text-danger">Error menghitung pembayaran dimuka</p>';
    }
}

// Generate Pengeluaran Rutin section
function generateRoutineExpensesSection() {
    const expenses = [
        { name: 'IURAN SAMPAH', amount: 2360000 },
        { name: 'GAJI SECURITY 2 ORANG', amount: 3060000 },
        { name: 'LEMBUR SECURITY 2 ORANG', amount: 280000 },
        { name: 'BPJS SECURITY 2 ORANG', amount: 176500 },
        { name: 'POSYANDU', amount: 200000 },
        { name: 'KERJA BAKTI', amount: 100000 },
        { name: 'SEWA TANAH LAP. VOLI', amount: 100000 },
        { name: 'BANTUAN SOSIAL TETAP', amount: 150000 }
    ];

    const total = expenses.reduce((sum, item) => sum + item.amount, 0);

    return `
        <div class="table-responsive">
            <table class="table table-sm">
                <thead class="table-light">
                    <tr>
                        <th>Pengeluaran Rutin Tetap</th>
                        <th class="text-end">Nominal</th>
                    </tr>
                </thead>
                <tbody>
                    ${expenses.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td class="text-end">${formatCurrency(item.amount)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr class="table-light">
                        <td class="fw-bold">TOTAL</td>
                        <td class="text-end fw-bold">${formatCurrency(total)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
        <div class="mt-2">
            <div class="alert alert-info">
                <small><i class="bi bi-info-circle"></i> DAU (Dana Abadi Umat) dihitung terpisah berdasarkan periode pembayaran IPL</small>
            </div>
        </div>
    `;
}

// Initialize year selector
function initializeRekapIPLYearSelector() {
    const yearSelect = document.getElementById('rekap-ipl-year-select');
    if (yearSelect) {
        yearSelect.addEventListener('change', (e) => {
            const selectedYear = e.target.value;
            loadViewRekapIPL(selectedYear);
        });
    }
}

// Refresh view
async function refreshViewRekapIPL() {
    const yearSelect = document.getElementById('rekap-ipl-year-select');
    const selectedYear = yearSelect ? yearSelect.value : null;
    await loadViewRekapIPL(selectedYear);
}

export {
    loadViewRekapIPL,
    refreshViewRekapIPL
};

// Show Rekap IPL Pemasukan Details
function showRekapIplPemasukanDetails(periodIndex) {
    const periodData = rekapIplDataGlobal[periodIndex];
    if (!periodData || !periodData.pemasukan_details || periodData.pemasukan_details.length === 0) {
        showToast('Tidak ada detail pemasukan untuk periode ini', 'info');
        return;
    }

    const detailsHtml = `
        <div class="modal fade" id="rekapIplPemasukanModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Detail Pemasukan IPL/DAU - ${periodData.periode}</h5>
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
    const existingModal = document.getElementById('rekapIplPemasukanModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', detailsHtml);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('rekapIplPemasukanModal'));
    modal.show();
}

// Show Rekap IPL Pengeluaran Details
function showRekapIplPengeluaranDetails(periodIndex) {
    const periodData = rekapIplDataGlobal[periodIndex];
    if (!periodData || !periodData.pengeluaran_details || periodData.pengeluaran_details.length === 0) {
        showToast('Tidak ada detail pengeluaran untuk periode ini', 'info');
        return;
    }

    const detailsHtml = `
        <div class="modal fade" id="rekapIplPengeluaranModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Detail Pengeluaran IPL/DAU - ${periodData.periode}</h5>
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
    const existingModal = document.getElementById('rekapIplPengeluaranModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', detailsHtml);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('rekapIplPengeluaranModal'));
    modal.show();
}

// Backward compatibility for global window functions
window.loadViewRekapIPL = loadViewRekapIPL;
window.refreshViewRekapIPL = refreshViewRekapIPL;
window.showRekapIplPemasukanDetails = showRekapIplPemasukanDetails;
window.showRekapIplPengeluaranDetails = showRekapIplPengeluaranDetails;
