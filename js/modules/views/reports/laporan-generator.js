// Laporan Generator Module
// Main UI module for report generation system

import { showToast } from '../../utils.js';

// Import query functions
import {
    getRekapSaldoData,
    getRincianPemasukanGlobal,
    getRincianPemasukanPerKategori,
    getRincianPengeluaranGlobal,
    getRincianPengeluaranPerKategori,
    getLaporanLabaRugi
} from './queries/financial-queries.js';

// Import billing query functions
import {
    getOutstandingIPL,
    getOutstandingAir,
    getLatePaymentReport,
    getCollectionEffectiveness
} from './queries/billing-queries.js';

// Import operational query functions
import {
    getDanaTitipanReport,
    getPemindahbukuanReport,
    getNeracaReport,
    getArusKasReport
} from './queries/operational-queries.js';

// Import PDF generation functions
import {
    generateRekapSaldoPDF,
    generateRincianPemasukanGlobalPDF,
    generateRincianPemasukanPerKategoriPDF,
    generateRincianPengeluaranGlobalPDF,
    generateLaporanLabaRugiPDF,
    generateOutstandingIPLPDF,
    generateOutstandingAirPDF,
    generateLatePaymentReportPDF,
    generateCollectionEffectivenessPDF
} from './templates/pdf-templates.js';

// Import Excel generation functions
import {
    generateRekapSaldoExcel,
    generateRincianPemasukanGlobalExcel,
    generateRincianPemasukanPerKategoriExcel,
    generateRincianPengeluaranGlobalExcel,
    generateLaporanLabaRugiExcel,
    generateOutstandingIPLPDF as generateOutstandingIPLExcel,
    generateOutstandingAirPDF as generateOutstandingAirExcel,
    generateLatePaymentReportPDF as generateLatePaymentReportExcel,
    generateCollectionEffectivenessPDF as generateCollectionEffectivenessExcel
} from './templates/excel-templates.js';

// Import operational PDF generation functions
import {
    generateDanaTitipanPDF,
    generatePemindahbukuanPDF,
    generateNeracaPDF,
    generateArusKasPDF
} from './templates/pdf-templates.js';

// Import operational Excel generation functions
import {
    generateDanaTitipanExcel,
    generatePemindahbukuanExcel,
    generateNeracaExcel,
    generateArusKasExcel
} from './templates/excel-templates.js';

// Report types configuration
const REPORT_TYPES = {
    // Fase 1: Core Financial Reports
    rekap_saldo: {
        label: 'Rekap Saldo per Kategori',
        description: 'Ringkasan saldo awal, pemasukan, pengeluaran, dan saldo akhir per kategori dengan data IPL',
        hasCategoryFilter: false,
        phase: 1
    },
    pemasukan_global: {
        label: 'Rincian Pemasukan Global',
        description: 'Detail semua transaksi pemasukan dalam periode tertentu',
        hasCategoryFilter: false,
        phase: 1
    },
    pemasukan_kategori: {
        label: 'Rincian Pemasukan per Kategori',
        description: 'Detail transaksi pemasukan dikelompokkan berdasarkan kategori',
        hasCategoryFilter: true,
        phase: 1
    },
    pengeluaran_global: {
        label: 'Rincian Pengeluaran Global',
        description: 'Detail semua transaksi pengeluaran dalam periode tertentu',
        hasCategoryFilter: false,
        phase: 1
    },
    pengeluaran_kategori: {
        label: 'Rincian Pengeluaran per Kategori',
        description: 'Detail transaksi pengeluaran dikelompokkan berdasarkan kategori',
        hasCategoryFilter: true,
        phase: 1
    },
    laba_rugi: {
        label: 'Laporan Laba Rugi',
        description: 'Income Statement - perbandingan total pemasukan vs pengeluaran',
        hasCategoryFilter: false,
        phase: 1
    },

    // Fase 2: Billing & Payment Reports
    outstanding_ipl: {
        label: 'Outstanding Tagihan IPL',
        description: 'Daftar tagihan IPL yang belum lunas beserta detail penghuni dan jumlah outstanding',
        hasCategoryFilter: false,
        phase: 2
    },
    outstanding_air: {
        label: 'Outstanding Tagihan Air',
        description: 'Daftar tagihan air yang belum lunas beserta detail penggunaan dan outstanding',
        hasCategoryFilter: false,
        phase: 2
    },
    pembayaran_terlambat: {
        label: 'Laporan Pembayaran Terlambat',
        description: 'Analisis pembayaran yang terlambat dan penghuni dengan pola pembayaran buruk',
        hasCategoryFilter: false,
        phase: 2
    },
    efektivitas_koleksi: {
        label: 'Efektivitas Koleksi',
        description: 'Tingkat keberhasilan penagihan tagihan IPL dan Air dalam periode tertentu',
        hasCategoryFilter: false,
        phase: 2
    },

    // Fase 3: Operational Reports
    dana_titipan: {
        label: 'Laporan Dana Titipan',
        description: 'Rekapitulasi dana titipan penghuni berdasarkan kategori dan rekening',
        hasCategoryFilter: false,
        phase: 3
    },
    pemindahbukuan: {
        label: 'Laporan Pemindahbukuan',
        description: 'Riwayat transfer antar rekening dengan analisis pola pemindahan dana',
        hasCategoryFilter: false,
        phase: 3
    },
    neraca: {
        label: 'Neraca (Balance Sheet)',
        description: 'Laporan posisi keuangan - aset, liabilitas, dan ekuitas per tanggal tertentu',
        hasCategoryFilter: false,
        phase: 3
    },
    arus_kas: {
        label: 'Arus Kas (Cash Flow)',
        description: 'Laporan arus kas masuk dan keluar dari rekening kas/bank',
        hasCategoryFilter: false,
        phase: 3
    }
};

// Global state
let availableCategories = [];
let availablePeriods = [];

// Load Laporan Generator View
async function loadLaporanGenerator() {
    const contentDiv = document.getElementById('laporan-content');

    try {
        // Load available categories and periods for filtering
        await loadAvailableCategories();
        await loadAvailablePeriods();

        const html = `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h4>🖨️ Generator Laporan</h4>
                            <p class="text-muted">Generate laporan keuangan dalam format PDF atau Excel</p>
                        </div>
                        <button class="btn btn-secondary" onclick="loadViewsSection()">
                            <i class="bi bi-arrow-left"></i> Kembali ke Views
                        </button>
                    </div>

                    <!-- Report Configuration Form -->
                    <div class="card mb-4">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="bi bi-gear"></i> Konfigurasi Laporan</h6>
                        </div>
                        <div class="card-body">
                            <form id="report-form">
                                <div class="row g-3">
                                    <!-- Report Type Selection -->
                                    <div class="col-md-6">
                                        <label for="report-type" class="form-label fw-bold">Jenis Laporan *</label>
                                        <select class="form-select" id="report-type" required>
                                            <option value="">Pilih jenis laporan...</option>
                                            ${Object.entries(REPORT_TYPES).map(([key, config]) => `
                                                <option value="${key}">${config.label}</option>
                                            `).join('')}
                                        </select>
                                        <div class="form-text" id="report-description"></div>
                                    </div>

                                    <!-- Category Filter (shown conditionally) -->
                                    <div class="col-md-6" id="category-filter-container" style="display: none;">
                                        <label for="category-filter" class="form-label fw-bold">Filter Kategori</label>
                                        <select class="form-select" id="category-filter">
                                            <option value="">Semua Kategori</option>
                                            <!-- Categories will be loaded dynamically -->
                                        </select>
                                        <div class="form-text">Opsional: filter berdasarkan kategori tertentu</div>
                                    </div>
                                </div>

                                <div class="row g-3">
                                    <!-- Periode Selection -->
                                    <div class="col-md-12">
                                        <label for="periode-input" class="form-label fw-bold">Periode Laporan</label>
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="periode-input" placeholder="Ketik untuk mencari periode..." autocomplete="off">
                                            <button class="btn btn-outline-secondary" type="button" id="periode-clear-btn" title="Clear selection">
                                                <i class="bi bi-x"></i>
                                            </button>
                                        </div>
                                        <div id="periode-dropdown" class="dropdown-menu w-100" style="max-height: 200px; overflow-y: auto; display: none;">
                                            <!-- Periode options will be loaded dynamically -->
                                        </div>
                                        <div class="form-text">Ketik untuk mencari periode atau pilih "Custom" untuk input manual tanggal</div>
                                    </div>

                                    <!-- Date Range -->
                                    <div class="col-md-6">
                                        <label for="start-date" class="form-label fw-bold">Tanggal Mulai *</label>
                                        <input type="date" class="form-control" id="start-date" required>
                                        <div class="form-text">Tanggal awal periode laporan</div>
                                    </div>

                                    <div class="col-md-6">
                                        <label for="end-date" class="form-label fw-bold">Tanggal Akhir *</label>
                                        <input type="date" class="form-control" id="end-date" required>
                                        <div class="form-text">Tanggal akhir periode laporan</div>
                                    </div>

                                    <!-- Output Format -->
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold">Format Output *</label>
                                        <div class="row g-2">
                                            <div class="col-6">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="radio" name="output-format" id="format-pdf" value="pdf" checked>
                                                    <label class="form-check-label" for="format-pdf">
                                                        📄 PDF
                                                    </label>
                                                </div>
                                            </div>
                                            <div class="col-6">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="radio" name="output-format" id="format-excel" value="excel">
                                                    <label class="form-check-label" for="format-excel">
                                                        📊 Excel
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Quick Date Presets -->
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold">Preset Periode</label>
                                        <div class="row g-1">
                                            <div class="col-6">
                                                <button type="button" class="btn btn-outline-secondary btn-sm w-100" onclick="setDatePreset('thisMonth')">
                                                    Bulan Ini
                                                </button>
                                            </div>
                                            <div class="col-6">
                                                <button type="button" class="btn btn-outline-secondary btn-sm w-100" onclick="setDatePreset('lastMonth')">
                                                    Bulan Lalu
                                                </button>
                                            </div>
                                            <div class="col-6">
                                                <button type="button" class="btn btn-outline-secondary btn-sm w-100" onclick="setDatePreset('thisYear')">
                                                    Tahun Ini
                                                </button>
                                            </div>
                                            <div class="col-6">
                                                <button type="button" class="btn btn-outline-secondary btn-sm w-100" onclick="setDatePreset('lastYear')">
                                                    Tahun Lalu
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Generate Button -->
                                <div class="mt-4 text-center">
                                    <button type="submit" class="btn btn-primary btn-lg" id="generate-btn">
                                        <i class="bi bi-file-earmark-arrow-down"></i> Generate Laporan
                                    </button>
                                    <div class="mt-2">
                                        <small class="text-muted">Laporan akan didownload secara otomatis</small>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    <!-- Report Types Info -->
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="bi bi-info-circle"></i> Jenis Laporan Tersedia</h6>
                        </div>
                        <div class="card-body">
                            <div class="row g-3">
                                ${Object.entries(REPORT_TYPES).map(([key, config]) => `
                                    <div class="col-md-6 col-lg-4">
                                        <div class="card h-100 border-primary">
                                            <div class="card-body">
                                                <h6 class="card-title text-primary">${config.label}</h6>
                                                <p class="card-text small">${config.description}</p>
                                                ${config.hasCategoryFilter ? '<span class="badge bg-info">Filter Kategori</span>' : ''}
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Loading indicator -->
                    <div id="loading-indicator" class="text-center mt-4" style="display: none;">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Generating report...</span>
                        </div>
                        <div class="mt-2">
                            <strong>Memproses laporan...</strong>
                            <div class="text-muted small">Mohon tunggu sebentar</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        contentDiv.innerHTML = html;

        // Initialize form functionality
        initializeReportForm();

    } catch (error) {
        console.error('Error loading laporan generator:', error);
        contentDiv.innerHTML = '<p class="text-danger">Error loading laporan generator</p>';
    }
}

// Load available categories for filtering
async function loadAvailableCategories() {
    try {
        const { data, error } = await supabase
            .from('kategori_saldo')
            .select('id, nama_kategori')
            .order('nama_kategori');

        if (error) throw error;
        availableCategories = data || [];
    } catch (error) {
        console.error('Error loading categories:', error);
        availableCategories = [];
    }
}

// Load available periods for periode selection
async function loadAvailablePeriods() {
    try {
        const { data, error } = await supabase
            .from('periode')
            .select('id, nama_periode, tanggal_awal, tanggal_akhir')
            .order('tanggal_awal', { ascending: false });

        if (error) throw error;
        availablePeriods = data || [];
    } catch (error) {
        console.error('Error loading periods:', error);
        availablePeriods = [];
    }
}

// Initialize form functionality
function initializeReportForm() {
    const reportTypeSelect = document.getElementById('report-type');
    const categoryFilterContainer = document.getElementById('category-filter-container');
    const categoryFilterSelect = document.getElementById('category-filter');
    const reportDescription = document.getElementById('report-description');
    const reportForm = document.getElementById('report-form');

    // Populate category filter options
    if (categoryFilterSelect) {
        categoryFilterSelect.innerHTML = '<option value="">Semua Kategori</option>' +
            availableCategories.map(cat => `<option value="${cat.id}">${cat.nama_kategori}</option>`).join('');
    }

    // Setup periode searchable input
    const periodeInput = document.getElementById('periode-input');
    const periodeDropdown = document.getElementById('periode-dropdown');
    const periodeClearBtn = document.getElementById('periode-clear-btn');

    if (periodeInput && periodeDropdown && periodeClearBtn) {
        // Add event listeners
        periodeInput.addEventListener('focus', () => {
            showPeriodeDropdown('');
        });

        periodeInput.addEventListener('input', (e) => {
            showPeriodeDropdown(e.target.value);
        });

        periodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                hidePeriodeDropdown();
            }
        });

        // Clear button
        periodeClearBtn.addEventListener('click', () => {
            periodeInput.value = '';
            hidePeriodeDropdown();
            handlePeriodeInput('');
        });

        // Hide dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!periodeInput.contains(e.target) && !periodeDropdown.contains(e.target) && !periodeClearBtn.contains(e.target)) {
                hidePeriodeDropdown();
            }
        });
    }

    // Report type change handler
    reportTypeSelect.addEventListener('change', (e) => {
        const selectedType = e.target.value;
        const config = REPORT_TYPES[selectedType];

        if (config) {
            reportDescription.textContent = config.description;

            // Show/hide category filter
            if (config.hasCategoryFilter) {
                categoryFilterContainer.style.display = 'block';
            } else {
                categoryFilterContainer.style.display = 'none';
                if (categoryFilterSelect) categoryFilterSelect.value = '';
            }
        } else {
            reportDescription.textContent = '';
            categoryFilterContainer.style.display = 'none';
        }
    });

    // Form submission handler
    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await generateReport();
    });

    // Set default dates to current month
    setDatePreset('thisMonth');
}

// Set date preset
function setDatePreset(preset) {
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const periodeInput = document.getElementById('periode-input');
    const today = new Date();

    let startDate, endDate;

    switch (preset) {
        case 'thisMonth':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
        case 'lastMonth':
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
        case 'thisYear':
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear(), 11, 31);
            break;
        case 'lastYear':
            startDate = new Date(today.getFullYear() - 1, 0, 1);
            endDate = new Date(today.getFullYear() - 1, 11, 31);
            break;
        default:
            return;
    }

    // Set dates
    startDateInput.value = startDate.toISOString().split('T')[0];
    endDateInput.value = endDate.toISOString().split('T')[0];

    // Enable manual input and set periode to custom
    startDateInput.disabled = false;
    endDateInput.disabled = false;
    if (periodeInput) {
        periodeInput.value = 'Custom';
    }
}

// Generate report
async function generateReport() {
    const reportType = document.getElementById('report-type').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const categoryId = document.getElementById('category-filter').value;
    const outputFormat = document.querySelector('input[name="output-format"]:checked').value;

    if (!reportType || !startDate || !endDate) {
        showToast('Harap lengkapi semua field yang wajib diisi', 'warning');
        return;
    }

    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
        showToast('Tanggal mulai tidak boleh lebih besar dari tanggal akhir', 'warning');
        return;
    }

    // Show loading indicator
    const loadingIndicator = document.getElementById('loading-indicator');
    const generateBtn = document.getElementById('generate-btn');
    loadingIndicator.style.display = 'block';
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Memproses...';

    try {
        const dateRange = `${new Date(startDate).toLocaleDateString('id-ID')} - ${new Date(endDate).toLocaleDateString('id-ID')}`;

        // Fetch report data based on type
        let reportData;
        switch (reportType) {
            // Fase 1: Core Financial Reports
            case 'rekap_saldo':
                reportData = await getRekapSaldoData(startDate, endDate);
                break;
            case 'pemasukan_global':
                reportData = await getRincianPemasukanGlobal(startDate, endDate);
                break;
            case 'pemasukan_kategori':
                reportData = await getRincianPemasukanPerKategori(startDate, endDate, categoryId || null);
                break;
            case 'pengeluaran_global':
                reportData = await getRincianPengeluaranGlobal(startDate, endDate);
                break;
            case 'pengeluaran_kategori':
                reportData = await getRincianPengeluaranPerKategori(startDate, endDate, categoryId || null);
                break;
            case 'laba_rugi':
                reportData = await getLaporanLabaRugi(startDate, endDate);
                break;

            // Fase 2: Billing & Payment Reports
            case 'outstanding_ipl':
                reportData = await getOutstandingIPL();
                break;
            case 'outstanding_air':
                reportData = await getOutstandingAir();
                break;
            case 'pembayaran_terlambat':
                reportData = await getLatePaymentReport(startDate, endDate);
                break;
            case 'efektivitas_koleksi':
                reportData = await getCollectionEffectiveness(startDate, endDate);
                break;

            // Fase 3: Operational Reports
            case 'dana_titipan':
                reportData = await getDanaTitipanReport(startDate, endDate);
                break;
            case 'pemindahbukuan':
                reportData = await getPemindahbukuanReport(startDate, endDate);
                break;
            case 'neraca':
                reportData = await getNeracaReport(endDate); // Use end date as "as of" date
                break;
            case 'arus_kas':
                reportData = await getArusKasReport(startDate, endDate);
                break;

            default:
                throw new Error('Tipe laporan tidak valid');
        }

        // Generate file based on format
        if (outputFormat === 'pdf') {
            await generatePDFReport(reportType, reportData, dateRange);
        } else {
            await generateExcelReport(reportType, reportData, dateRange);
        }

        showToast('Laporan berhasil di-generate!', 'success');

    } catch (error) {
        console.error('Error generating report:', error);
        showToast('Terjadi kesalahan saat generate laporan: ' + error.message, 'error');
    } finally {
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="bi bi-file-earmark-arrow-down"></i> Generate Laporan';
    }
}

// Generate PDF report
async function generatePDFReport(reportType, data, dateRange) {
    switch (reportType) {
        // Fase 1: Core Financial Reports
        case 'rekap_saldo':
            await generateRekapSaldoPDF(data, dateRange);
            break;
        case 'pemasukan_global':
            await generateRincianPemasukanGlobalPDF(data, dateRange);
            break;
        case 'pemasukan_kategori':
            await generateRincianPemasukanPerKategoriPDF(data, dateRange);
            break;
        case 'pengeluaran_global':
            await generateRincianPengeluaranGlobalPDF(data, dateRange);
            break;
        case 'laba_rugi':
            await generateLaporanLabaRugiPDF(data);
            break;

        // Fase 2: Billing & Payment Reports
        case 'outstanding_ipl':
            await generateOutstandingIPLPDF(data);
            break;
        case 'outstanding_air':
            await generateOutstandingAirPDF(data);
            break;
        case 'pembayaran_terlambat':
            await generateLatePaymentReportPDF(data);
            break;
        case 'efektivitas_koleksi':
            await generateCollectionEffectivenessPDF(data);
            break;

        // Fase 3: Operational Reports
        case 'dana_titipan':
            await generateDanaTitipanPDF(data);
            break;
        case 'pemindahbukuan':
            await generatePemindahbukuanPDF(data);
            break;
        case 'neraca':
            await generateNeracaPDF(data);
            break;
        case 'arus_kas':
            await generateArusKasPDF(data);
            break;

        default:
            throw new Error('PDF generation not implemented for this report type');
    }
}

// Generate Excel report
async function generateExcelReport(reportType, data, dateRange) {
    switch (reportType) {
        // Fase 1: Core Financial Reports
        case 'rekap_saldo':
            await generateRekapSaldoExcel(data, dateRange);
            break;
        case 'pemasukan_global':
            await generateRincianPemasukanGlobalExcel(data, dateRange);
            break;
        case 'pemasukan_kategori':
            await generateRincianPemasukanPerKategoriExcel(data, dateRange);
            break;
        case 'pengeluaran_global':
            generateRincianPengeluaranGlobalExcel(data, dateRange);
            break;
        case 'laba_rugi':
            generateLaporanLabaRugiExcel(data);
            break;

        // Fase 2: Billing & Payment Reports
        case 'outstanding_ipl':
            generateOutstandingIPLExcel(data);
            break;
        case 'outstanding_air':
            generateOutstandingAirExcel(data);
            break;
        case 'pembayaran_terlambat':
            generateLatePaymentReportExcel(data);
            break;
        case 'efektivitas_koleksi':
            generateCollectionEffectivenessExcel(data);
            break;

        // Fase 3: Operational Reports
        case 'dana_titipan':
            await generateDanaTitipanExcel(data);
            break;
        case 'pemindahbukuan':
            generatePemindahbukuanExcel(data);
            break;
        case 'neraca':
            await generateNeracaExcel(data);
            break;
        case 'arus_kas':
            generateArusKasExcel(data);
            break;

        default:
            throw new Error('Excel generation not implemented for this report type');
    }
}

// Show periode dropdown with filtered results
function showPeriodeDropdown(searchTerm) {
    const periodeDropdown = document.getElementById('periode-dropdown');
    if (!periodeDropdown) return;

    // Filter periods based on search term
    let filteredPeriods = availablePeriods;
    if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        filteredPeriods = availablePeriods.filter(p =>
            p.nama_periode.toLowerCase().includes(term)
        );
    }

    // Create dropdown HTML
    let dropdownHtml = '';

    // Always show "Custom" option first
    dropdownHtml += `
        <a class="dropdown-item" href="#" data-value="custom">
            <div class="d-flex align-items-center">
                <span class="me-2">🔧</span>
                <div>
                    <div class="fw-bold">Custom</div>
                    <small class="text-muted">Manual input tanggal</small>
                </div>
            </div>
        </a>
    `;

    // Add filtered periods
    if (filteredPeriods.length > 0) {
        filteredPeriods.forEach(periode => {
            dropdownHtml += `
                <a class="dropdown-item" href="#" data-value="${periode.nama_periode}">
                    <div class="d-flex align-items-center">
                        <span class="me-2">📅</span>
                        <div>
                            <div class="fw-bold">${periode.nama_periode}</div>
                            <small class="text-muted">${periode.tanggal_awal} - ${periode.tanggal_akhir}</small>
                        </div>
                    </div>
                </a>
            `;
        });
    } else if (searchTerm && searchTerm.trim()) {
        // Show no results message
        dropdownHtml += `
            <div class="dropdown-item text-muted">
                <em>Tidak ada periode yang cocok</em>
            </div>
        `;
    }

    periodeDropdown.innerHTML = dropdownHtml;

    // Add click handlers to dropdown items
    periodeDropdown.querySelectorAll('.dropdown-item[data-value]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const value = item.getAttribute('data-value');
            selectPeriodeOption(value);
        });
    });

    // Show dropdown
    periodeDropdown.style.display = 'block';
}

// Hide periode dropdown
function hidePeriodeDropdown() {
    const periodeDropdown = document.getElementById('periode-dropdown');
    if (periodeDropdown) {
        periodeDropdown.style.display = 'none';
    }
}

// Select periode option from dropdown
function selectPeriodeOption(value) {
    const periodeInput = document.getElementById('periode-input');
    if (!periodeInput) return;

    periodeInput.value = value;
    hidePeriodeDropdown();
    handlePeriodeInput(value);
}

// Handle periode input changes (searchable functionality)
function handlePeriodeInput(inputValue) {
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');

    // If input is empty or "Custom"
    if (!inputValue || inputValue.toLowerCase() === 'custom') {
        // Enable manual input
        startDateInput.disabled = false;
        endDateInput.disabled = false;
        return;
    }

    // Find periode by nama_periode (case insensitive search)
    const selectedPeriode = availablePeriods.find(p =>
        p.nama_periode.toLowerCase() === inputValue.toLowerCase()
    );

    if (selectedPeriode) {
        // Auto-fill dates from selected periode
        startDateInput.value = selectedPeriode.tanggal_awal;
        endDateInput.value = selectedPeriode.tanggal_akhir;

        // Disable manual input when periode is selected
        startDateInput.disabled = true;
        endDateInput.disabled = true;

        showToast(`Periode ${selectedPeriode.nama_periode} dipilih`, 'info');
    } else {
        // If no exact match, enable manual input
        startDateInput.disabled = false;
        endDateInput.disabled = false;
    }
}

// Handle periode selection and auto-fill dates (legacy function for backward compatibility)
function handlePeriodeSelection(periodeId) {
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');

    if (!periodeId || periodeId === 'custom') {
        // Enable manual input for custom or no selection
        startDateInput.disabled = false;
        endDateInput.disabled = false;
        return;
    }

    // Find selected periode
    const selectedPeriode = availablePeriods.find(p => p.id === periodeId);
    if (selectedPeriode) {
        // Auto-fill dates from selected periode
        startDateInput.value = selectedPeriode.tanggal_awal;
        endDateInput.value = selectedPeriode.tanggal_akhir;

        // Disable manual input when periode is selected
        startDateInput.disabled = true;
        endDateInput.disabled = true;

        showToast(`Periode ${selectedPeriode.nama_periode} dipilih`, 'info');
    }
}

// Export functions for global access
export { loadLaporanGenerator, setDatePreset, handlePeriodeSelection };

// Backward compatibility for global window functions
window.loadLaporanGenerator = loadLaporanGenerator;
window.setDatePreset = setDatePreset;
window.handlePeriodeSelection = handlePeriodeSelection;
