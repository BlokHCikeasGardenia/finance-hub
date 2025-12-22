// Ringkasan (Financial Summary) Reports Module
// Financial summary reports by category

import { supabase } from '../../config.js';
import { showToast, formatCurrency } from '../../utils.js';

// Load Ringkasan View
async function loadViewRingkasan(selectedYear = null) {
    const contentDiv = document.getElementById('views-content');

    // Aggressive content clearing to prevent showing dashboard cards
    contentDiv.innerHTML = '';
    contentDiv.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div><p>Loading Ringkasan data...</p></div>';

    try {
        // Get all periods for year filtering
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

        // filterYear is used for selector selection and display
        const filterYear = selectedYear;

        // Filter periods by selected year (for transaction filtering)
        let periodsToFilter = allPeriods;
        if (selectedYear !== 'all') {
            periodsToFilter = allPeriods.filter(p => p.nama_periode.includes(selectedYear));
        }

        // Get all categories with their current balances
        const { data: kategoriData, error: kategoriError } = await supabase
            .from('kategori_saldo')
            .select('id, nama_kategori, saldo_awal, keterangan');

        if (kategoriError) throw kategoriError;

        // Calculate current balance for each category
        const ringkasanData = [];

        for (const kategori of kategoriData || []) {
            let saldoAwal = kategori.saldo_awal || 0;
            let totalPemasukan = 0;
            let totalPengeluaran = 0;

            if (selectedYear === 'all') {
                // Original logic: all transactions
                const { data: pemasukanData, error: pemasukanError } = await supabase
                    .from('pemasukan')
                    .select('nominal')
                    .eq('kategori_id', kategori.id);

                if (pemasukanError) {
                    console.error('Error fetching pemasukan for category:', pemasukanError);
                    continue;
                }

                totalPemasukan = pemasukanData.reduce((sum, item) => sum + (item.nominal || 0), 0);

                const { data: pengeluaranData, error: pengeluaranError } = await supabase
                    .from('pengeluaran')
                    .select('nominal')
                    .eq('kategori_id', kategori.id);

                if (pengeluaranError) {
                    console.error('Error fetching pengeluaran for category:', pengeluaranError);
                    continue;
                }

                totalPengeluaran = pengeluaranData.reduce((sum, item) => sum + (item.nominal || 0), 0);
            } else {
                // Year-specific logic
                // Calculate saldo awal as: kategori.saldo_awal + cumulative transactions until end of previous year
                const previousYear = (parseInt(selectedYear) - 1).toString();
                const periodsUntilPreviousYear = allPeriods.filter(p =>
                    p.nama_periode.includes(previousYear) ||
                    parseInt(p.nama_periode.match(/(\d{4})$/)?.[1] || 0) < parseInt(selectedYear)
                );

                // Calculate cumulative transactions until end of previous year
                let cumulativePemasukanUntilPrevious = 0;
                let cumulativePengeluaranUntilPrevious = 0;

                if (periodsUntilPreviousYear.length > 0) {
                    // Get earliest and latest dates for previous periods
                    const sortedPeriods = periodsUntilPreviousYear.sort((a, b) =>
                        new Date(a.tanggal_awal) - new Date(b.tanggal_awal)
                    );
                    const earliestDate = sortedPeriods[0].tanggal_awal;
                    const latestDate = sortedPeriods[sortedPeriods.length - 1].tanggal_akhir;

                    const { data: pemasukanUntilPrevious, error: pemasukanPrevError } = await supabase
                        .from('pemasukan')
                        .select('nominal')
                        .eq('kategori_id', kategori.id)
                        .gte('tanggal', earliestDate)
                        .lte('tanggal', latestDate);

                    if (pemasukanPrevError) {
                        console.error('Error fetching pemasukan until previous year:', pemasukanPrevError);
                        continue;
                    }

                    cumulativePemasukanUntilPrevious = pemasukanUntilPrevious.reduce((sum, item) => sum + (item.nominal || 0), 0);

                    const { data: pengeluaranUntilPrevious, error: pengeluaranPrevError } = await supabase
                        .from('pengeluaran')
                        .select('nominal')
                        .eq('kategori_id', kategori.id)
                        .gte('tanggal', earliestDate)
                        .lte('tanggal', latestDate);

                    if (pengeluaranPrevError) {
                        console.error('Error fetching pengeluaran until previous year:', pengeluaranPrevError);
                        continue;
                    }

                    cumulativePengeluaranUntilPrevious = pengeluaranUntilPrevious.reduce((sum, item) => sum + (item.nominal || 0), 0);
                }

                // Saldo awal tahun ini = saldo sistem + kumulatif sampai akhir tahun sebelumnya
                saldoAwal = saldoAwal + cumulativePemasukanUntilPrevious - cumulativePengeluaranUntilPrevious;

                // Get transactions only for the selected year periods
                if (periodsToFilter.length > 0) {
                    const sortedPeriods = periodsToFilter.sort((a, b) =>
                        new Date(a.tanggal_awal) - new Date(b.tanggal_awal)
                    );
                    const yearStartDate = sortedPeriods[0].tanggal_awal;
                    const yearEndDate = sortedPeriods[sortedPeriods.length - 1].tanggal_akhir;

                    const { data: pemasukanYearData, error: pemasukanYearError } = await supabase
                        .from('pemasukan')
                        .select('nominal')
                        .eq('kategori_id', kategori.id)
                        .gte('tanggal', yearStartDate)
                        .lte('tanggal', yearEndDate);

                    if (pemasukanYearError) {
                        console.error('Error fetching pemasukan for year:', pemasukanYearError);
                        continue;
                    }

                    totalPemasukan = pemasukanYearData.reduce((sum, item) => sum + (item.nominal || 0), 0);

                    const { data: pengeluaranYearData, error: pengeluaranYearError } = await supabase
                        .from('pengeluaran')
                        .select('nominal')
                        .eq('kategori_id', kategori.id)
                        .gte('tanggal', yearStartDate)
                        .lte('tanggal', yearEndDate);

                    if (pengeluaranYearError) {
                        console.error('Error fetching pengeluaran for year:', pengeluaranYearError);
                        continue;
                    }

                    totalPengeluaran = pengeluaranYearData.reduce((sum, item) => sum + (item.nominal || 0), 0);
                }
            }

            // Calculate current balance
            const saldoSaatIni = saldoAwal + totalPemasukan - totalPengeluaran;

            ringkasanData.push({
                nama_kategori: kategori.nama_kategori,
                saldo_awal: saldoAwal,
                total_pemasukan: totalPemasukan,
                total_pengeluaran: totalPengeluaran,
                saldo_saat_ini: saldoSaatIni,
                keterangan: kategori.keterangan || '-'
            });
        }

        // Sort data by custom order: IPL, Air, Aula, Lainnya
        const categoryOrder = ['IPL', 'Air', 'Aula', 'Lainnya'];
        ringkasanData.sort((a, b) => {
            const orderA = categoryOrder.indexOf(a.nama_kategori);
            const orderB = categoryOrder.indexOf(b.nama_kategori);
            return orderA - orderB;
        });

        // Calculate total summary
        const totalSaldoAwal = ringkasanData.reduce((sum, item) => sum + item.saldo_awal, 0);
        const totalPemasukanAll = ringkasanData.reduce((sum, item) => sum + item.total_pemasukan, 0);
        const totalPengeluaranAll = ringkasanData.reduce((sum, item) => sum + item.total_pengeluaran, 0);
        const totalSaldoSaatIni = ringkasanData.reduce((sum, item) => sum + item.saldo_saat_ini, 0);

        // Create dynamic title and info text based on selected year
        const isAllYearsMode = selectedYear === 'all';

        const displayYear = isAllYearsMode ? null : selectedYear;

        const dynamicTitle = 'Ringkasan Saldo';

        const titleBadge = isAllYearsMode
            ? '<span class="badge bg-secondary ms-2">Semua Tahun</span>'
            : `<span class="badge bg-primary ms-2">${displayYear}</span>`;

        const infoText = isAllYearsMode
            ? 'Ringkasan saldo kumulatif dari semua periode'
            : `Ringkasan saldo tahun ${displayYear} (saldo awal dari akhir ${parseInt(displayYear) - 1} + transaksi ${displayYear})`;

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
                                <label for="ringkasan-year-select" class="form-label mb-0 fw-bold">Filter Tahun:</label>
                                <select class="${selectorClass}" id="ringkasan-year-select" style="width: auto;">
                                    <option value="all">📊 Semua Tahun</option>
                                    ${availableYears.map(year => `<option value="${year}" ${year === filterYear ? 'selected' : ''}>📅 ${year}</option>`).join('')}
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

                    <!-- Detailed Table -->
                    <div class="table-responsive">
                        <table class="table table-striped table-hover">
                            <thead class="table-secondary">
                                <tr>
                                    <th>Kategori</th>
                                    <th class="text-end">Saldo Awal</th>
                                    <th class="text-end">Total Pemasukan</th>
                                    <th class="text-end">Total Pengeluaran</th>
                                    <th class="text-end">Saldo Saat Ini</th>
                                    <th>Keterangan</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${ringkasanData.map(item => `
                                    <tr>
                                        <td><strong>${item.nama_kategori}</strong></td>
                                        <td class="text-end">${formatCurrency(item.saldo_awal)}</td>
                                        <td class="text-end text-success fw-bold">${formatCurrency(item.total_pemasukan)}</td>
                                        <td class="text-end text-danger fw-bold">${formatCurrency(item.total_pengeluaran)}</td>
                                        <td class="text-end fw-bold ${item.saldo_saat_ini >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(item.saldo_saat_ini)}</td>
                                        <td>${item.keterangan}</td>
                                    </tr>
                                `).join('')}
                                <tr class="table-secondary fw-bold">
                                    <td><strong>TOTAL</strong></td>
                                    <td class="text-end"><strong>${formatCurrency(totalSaldoAwal)}</strong></td>
                                    <td class="text-end text-success"><strong>${formatCurrency(totalPemasukanAll)}</strong></td>
                                    <td class="text-end text-danger"><strong>${formatCurrency(totalPengeluaranAll)}</strong></td>
                                    <td class="text-end ${totalSaldoSaatIni >= 0 ? 'text-success' : 'text-danger'}"><strong>${formatCurrency(totalSaldoSaatIni)}</strong></td>
                                    <td class="text-muted">Total semua kategori</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="mt-3">
                        <button class="btn btn-outline-primary" onclick="refreshViewRingkasan()">
                            <i class="bi bi-arrow-clockwise"></i> Refresh Data
                        </button>
                    </div>
                </div>
            </div>
        `;

        contentDiv.innerHTML = html;

        // Initialize year selector
        setTimeout(() => {
            initializeRingkasanYearSelector();
        }, 100);

    } catch (error) {
        console.error('Error loading ringkasan view:', error);
        contentDiv.innerHTML = '<p class="text-danger">Error loading ringkasan data</p>';
    }
}

// Refresh Ringkasan View
function refreshViewRingkasan() {
    const yearSelect = document.getElementById('ringkasan-year-select');
    const selectedYear = yearSelect ? yearSelect.value : 'all';
    loadViewRingkasan(selectedYear);
}

// Initialize year selector
function initializeRingkasanYearSelector() {
    const yearSelect = document.getElementById('ringkasan-year-select');
    if (yearSelect) {
        yearSelect.addEventListener('change', (e) => {
            const selectedYear = e.target.value;
            loadViewRingkasan(selectedYear);
        });
    }
}

export {
    loadViewRingkasan,
    refreshViewRingkasan,
    initializeRingkasanYearSelector
};

// Backward compatibility for global window functions
window.loadViewRingkasan = loadViewRingkasan;
window.refreshViewRingkasan = refreshViewRingkasan;
window.initializeRingkasanYearSelector = initializeRingkasanYearSelector;
