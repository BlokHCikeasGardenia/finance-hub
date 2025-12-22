// Lainnya (Miscellaneous) Transaction Reports Module
// Other miscellaneous transaction reports

import { supabase } from '../../config.js';
import { showToast, formatCurrency } from '../../utils.js';

// Global state for Rekap Lainnya
let lainnyaRekapDataGlobal = [];

// Load Lainnya View
async function loadViewLainnya() {
    const contentDiv = document.getElementById('views-content');

    try {
        // First, get the Lainnya category ID
        const { data: lainnyaCategory, error: categoryError } = await supabase
            .from('kategori_saldo')
            .select('id')
            .eq('nama_kategori', 'Lainnya')
            .single();

        if (categoryError || !lainnyaCategory) {
            console.error('Lainnya category not found:', categoryError);
            contentDiv.innerHTML = '<p class="text-danger">Kategori Lainnya tidak ditemukan. Pastikan data master kategori sudah diisi.</p>';
            return;
        }

        // Get all lainnya-related transactions (both income and expenses)
        const lainnyaTransactions = [];

        // Get pemasukan (income) for lainnya
        const { data: pemasukanData, error: pemasukanError } = await supabase
            .from('pemasukan')
            .select(`
                id_transaksi,
                tanggal,
                nominal,
                penghuni:penghuni_id (nama_kepala_keluarga),
                rekening:rekening_id (jenis_rekening),
                keterangan
            `)
            .eq('kategori_id', lainnyaCategory.id)
            .order('tanggal', { ascending: false });

        if (pemasukanError) throw pemasukanError;

        // Add pemasukan transactions
        (pemasukanData || []).forEach(item => {
            lainnyaTransactions.push({
                id_transaksi: item.id_transaksi,
                tanggal: item.tanggal,
                nominal_pemasukan: item.nominal,
                diterima_dari: item.penghuni?.nama_kepala_keluarga || 'Sumber External',
                dikredit_ke: item.rekening?.jenis_rekening || '-',
                nominal_pengeluaran: null,
                subkategori: null,
                penerima: null,
                didebet_dari: null,
                keterangan: item.keterangan || '-'
            });
        });

        // Get pengeluaran (expenses) for lainnya
        const { data: pengeluaranData, error: pengeluaranError } = await supabase
            .from('pengeluaran')
            .select(`
                id_transaksi,
                tanggal,
                nominal,
                subkategori:subkategori_id (nama_subkategori),
                penerima,
                rekening:rekening_id (jenis_rekening),
                keterangan
            `)
            .eq('kategori_id', lainnyaCategory.id)
            .order('tanggal', { ascending: false });

        if (pengeluaranError) throw pengeluaranError;

        // Add pengeluaran transactions
        (pengeluaranData || []).forEach(item => {
            lainnyaTransactions.push({
                id_transaksi: item.id_transaksi,
                tanggal: item.tanggal,
                nominal_pemasukan: null,
                diterima_dari: null,
                dikredit_ke: null,
                nominal_pengeluaran: item.nominal,
                subkategori: item.subkategori?.nama_subkategori || '-',
                penerima: item.penerima || '-',
                didebet_dari: item.rekening?.jenis_rekening || '-',
                keterangan: item.keterangan || '-'
            });
        });

        // Sort all transactions by date (newest first)
        lainnyaTransactions.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

        const html = `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h4>View Data Lainnya</h4>
                            <button class="btn btn-warning text-dark" onclick="loadViewsSection()">
                                <i class="bi bi-arrow-left"></i> Back
                            </button>
                    </div>
                    <p class="text-muted">Data transaksi pemasukan dan pengeluaran kategori lainnya</p>

                    <div class="table-responsive">
                        <table class="table table-striped table-hover">
                            <thead class="table-dark">
                                <tr>
                                    <th>ID Transaksi</th>
                                    <th>Tanggal</th>
                                    <th class="text-end">Pemasukan</th>
                                    <th>Diterima Dari</th>
                                    <th>Dikredit Ke</th>
                                    <th class="text-end">Pengeluaran</th>
                                    <th>Subkategori</th>
                                    <th>Penerima</th>
                                    <th>Didebet Dari</th>
                                    <th>Keterangan</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${lainnyaTransactions.map(item => `
                                    <tr>
                                        <td>${item.id_transaksi}</td>
                                        <td>${new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                                        <td class="text-end text-success fw-bold">
                                            ${item.nominal_pemasukan ? formatCurrency(item.nominal_pemasukan) : '-'}
                                        </td>
                                        <td>${item.diterima_dari || '-'}</td>
                                        <td>${item.dikredit_ke || '-'}</td>
                                        <td class="text-end text-danger fw-bold">
                                            ${item.nominal_pengeluaran ? formatCurrency(item.nominal_pengeluaran) : '-'}
                                        </td>
                                        <td>${item.subkategori || '-'}</td>
                                        <td>${item.penerima || '-'}</td>
                                        <td>${item.didebet_dari || '-'}</td>
                                        <td>${item.keterangan}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    ${lainnyaTransactions.length === 0 ? '<p class="text-muted">Belum ada transaksi lainnya.</p>' : ''}

                    <div class="mt-3">
                        <button class="btn btn-outline-primary" onclick="refreshViewLainnya()">
                            <i class="bi bi-arrow-clockwise"></i> Refresh Data
                        </button>
                    </div>
                </div>
            </div>
        `;

        contentDiv.innerHTML = html;
    } catch (error) {
        console.error('Error loading lainnya view:', error);
        contentDiv.innerHTML = '<p class="text-danger">Error loading lainnya data</p>';
    }
}

// Load Rekap Lainnya View - Summary table by period
async function loadViewRekapLainnya(selectedYear = null) {
    const contentDiv = document.getElementById('views-content');

    try {
        // Get Lainnya category ID
        const { data: lainnyaCategory, error: categoryError } = await supabase
            .from('kategori_saldo')
            .select('id')
            .eq('nama_kategori', 'Lainnya')
            .single();

        if (categoryError || !lainnyaCategory) {
            console.error('Lainnya category not found:', categoryError);
            contentDiv.innerHTML = '<p class="text-danger">Kategori Lainnya tidak ditemukan. Pastikan data master kategori sudah diisi.</p>';
            return;
        }

        // Get all periods ordered by sequence
        const { data: allPeriods, error: periodsError } = await supabase
            .from('periode')
            .select('id, nama_periode, nomor_urut, tanggal_awal, tanggal_akhir')
            .order('nomor_urut');

        if (periodsError) throw periodsError;

        // Extract unique years from period names (e.g., "Jan2025" -> "2025")
        const availableYears = [...new Set(allPeriods.map(p => {
            const match = p.nama_periode.match(/(\d{4})$/);
            return match ? match[1] : null;
        }).filter(year => year !== null))].sort((a, b) => b - a); // Sort descending (newest first)

        // Find current active period based on today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

        const activePeriod = allPeriods.find(p => {
            const startDate = new Date(p.tanggal_awal);
            const endDate = new Date(p.tanggal_akhir);
            return today >= startDate && today <= endDate;
        });

        // Get year from active period, or fallback to current calendar year
        let defaultYear;
        if (activePeriod) {
            const yearMatch = activePeriod.nama_periode.match(/(\d{4})$/);
            defaultYear = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
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
            periods = allPeriods.filter(p => p.nama_periode.includes(selectedYear));
        }

        // Aggregate data for each period
        const rekapData = [];
        let totalPemasukan = 0;
        let totalPengeluaran = 0;

        for (const period of periods || []) {
            // Sum pemasukan (income) for this period and category
            // Filter by payment date falling within the period's date range
            const { data: pemasukanData, error: pemasukanError } = await supabase
                .from('pemasukan')
                .select('tanggal, nominal, hunian:hunian_id(nomor_blok_rumah, penghuni_saat_ini:penghuni_saat_ini_id(nama_kepala_keluarga)), keterangan')
                .eq('kategori_id', lainnyaCategory.id)
                .gte('tanggal', period.tanggal_awal)
                .lte('tanggal', period.tanggal_akhir);

            if (pemasukanError) {
                console.error('Error fetching pemasukan for period:', pemasukanError);
                continue;
            }

            const pemasukan = (pemasukanData || []).reduce((sum, item) => sum + (item.nominal || 0), 0);

            // Sum pengeluaran (expenses) for this period and category
            // Filter by expense date falling within the period's date range
            const { data: pengeluaranData, error: pengeluaranError } = await supabase
                .from('pengeluaran')
                .select('tanggal, nominal, keterangan')
                .eq('kategori_id', lainnyaCategory.id)
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

        const dynamicTitle = 'Rekap Lainnya';

        const titleBadge = isAllYearsMode
            ? '<span class="badge bg-secondary ms-2">Semua Periode</span>'
            : `<span class="badge bg-primary ms-2">${displayYear}</span>`;

        const infoText = isAllYearsMode
            ? 'Rekap pemasukan dan pengeluaran lainnya dari semua periode'
            : `Rekap pemasukan dan pengeluaran lainnya tahun ${displayYear} per periode`;

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
                                <label for="rekap-lainnya-year-select" class="form-label mb-0 fw-bold">Filter Tahun:</label>
                                <select class="${selectorClass}" id="rekap-lainnya-year-select" style="width: auto;">
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

                    <p class="text-muted">Rekap pemasukan dan pengeluaran lainnya per periode</p>

                    <div class="table-responsive">
                        <table class="table table-striped table-hover">
                            <thead class="table-primary">
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
                                                `<button class="btn btn-link text-success fw-bold p-0" onclick="showRekapLainnyaPemasukanDetails(${index})">${formatCurrency(item.pemasukan)}</button>` :
                                                formatCurrency(item.pemasukan)}
                                        </td>
                                        <td class="text-end">
                                            ${item.pengeluaran > 0 ?
                                                `<button class="btn btn-link text-danger fw-bold p-0" onclick="showRekapLainnyaPengeluaranDetails(${index})">${formatCurrency(item.pengeluaran)}</button>` :
                                                formatCurrency(item.pengeluaran)}
                                        </td>
                                        <td class="text-end ${item.selisih_kas >= 0 ? 'text-success' : 'text-danger'} fw-bold">${formatCurrency(item.selisih_kas)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot class="table-primary">
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
                        <button class="btn btn-outline-primary" onclick="refreshViewRekapLainnya()">
                            <i class="bi bi-arrow-clockwise"></i> Refresh Data
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Store rekap data globally for detail views
        lainnyaRekapDataGlobal = rekapData;

        contentDiv.innerHTML = html;

        // Initialize year selector functionality
        setTimeout(() => {
            initializeRekapLainnyaYearSelector();
        }, 100);
    } catch (error) {
        console.error('Error loading rekap lainnya view:', error);
        contentDiv.innerHTML = '<p class="text-danger">Error loading rekap lainnya data</p>';
    }
}

// Initialize Rekap Lainnya Year Selector
function initializeRekapLainnyaYearSelector() {
    const yearSelect = document.getElementById('rekap-lainnya-year-select');
    if (yearSelect) {
        yearSelect.addEventListener('change', (e) => {
            const selectedYear = e.target.value;
            loadViewRekapLainnya(selectedYear);
        });
    }
}

// Refresh Rekap Lainnya View
async function refreshViewRekapLainnya() {
    const yearSelect = document.getElementById('rekap-lainnya-year-select');
    const selectedYear = yearSelect ? yearSelect.value : null;
    await loadViewRekapLainnya(selectedYear);
}

// Refresh Lainnya View
function refreshViewLainnya() {
    loadViewLainnya();
}

export {
    loadViewLainnya,
    refreshViewLainnya,
    loadViewRekapLainnya,
    refreshViewRekapLainnya,
    initializeRekapLainnyaYearSelector
};

// Show Rekap Lainnya Pemasukan Details
function showRekapLainnyaPemasukanDetails(periodIndex) {
    const periodData = lainnyaRekapDataGlobal[periodIndex];
    if (!periodData || !periodData.pemasukan_details || periodData.pemasukan_details.length === 0) {
        showToast('Tidak ada detail pemasukan untuk periode ini', 'info');
        return;
    }

    const detailsHtml = `
        <div class="modal fade" id="rekapLainnyaPemasukanModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Detail Pemasukan Lainnya - ${periodData.periode}</h5>
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
    const existingModal = document.getElementById('rekapLainnyaPemasukanModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', detailsHtml);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('rekapLainnyaPemasukanModal'));
    modal.show();
}

// Show Rekap Lainnya Pengeluaran Details
function showRekapLainnyaPengeluaranDetails(periodIndex) {
    const periodData = lainnyaRekapDataGlobal[periodIndex];
    if (!periodData || !periodData.pengeluaran_details || periodData.pengeluaran_details.length === 0) {
        showToast('Tidak ada detail pengeluaran untuk periode ini', 'info');
        return;
    }

    const detailsHtml = `
        <div class="modal fade" id="rekapLainnyaPengeluaranModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Detail Pengeluaran Lainnya - ${periodData.periode}</h5>
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
    const existingModal = document.getElementById('rekapLainnyaPengeluaranModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', detailsHtml);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('rekapLainnyaPengeluaranModal'));
    modal.show();
}

// Backward compatibility for global window functions
window.loadViewLainnya = loadViewLainnya;
window.refreshViewLainnya = refreshViewLainnya;
window.loadViewRekapLainnya = loadViewRekapLainnya;
window.refreshViewRekapLainnya = refreshViewRekapLainnya;
window.showRekapLainnyaPemasukanDetails = showRekapLainnyaPemasukanDetails;
window.showRekapLainnyaPengeluaranDetails = showRekapLainnyaPengeluaranDetails;
