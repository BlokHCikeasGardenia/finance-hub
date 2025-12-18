// Rekap (Monthly Recap) Reports Module
// Monthly IPL payment recap reports with transaction details

import { supabase } from '../../config.js';
import { showToast, formatCurrency } from '../../utils.js';

// Load Rekap View
async function loadViewRekap() {
    const contentDiv = document.getElementById('views-content');

    try {
        // First, get the IPL category ID
        const { data: iplCategory, error: categoryError } = await supabase
            .from('kategori_saldo')
            .select('id')
            .eq('nama_kategori', 'IPL')
            .single();

        if (categoryError || !iplCategory) {
            console.error('IPL category not found:', categoryError);
            contentDiv.innerHTML = '<p class="text-danger">Kategori IPL tidak ditemukan. Pastikan data master kategori sudah diisi.</p>';
            return;
        }

        // Get all periods for rekap
        const { data: periodeData, error: periodeError } = await supabase
            .from('periode')
            .select('id, nama_periode, tanggal_awal, tanggal_akhir')
            .order('tanggal_awal');

        if (periodeError) throw periodeError;

        // Create rekap data structure
        const rekapData = [];

        for (const periode of periodeData || []) {
            // Get IPL payments for this period
            // Filter by payment date falling within the period's date range
            const { data: payments, error: paymentError } = await supabase
                .from('pemasukan')
                .select(`
                    nominal,
                    hunian:hunian_id (
                        nomor_blok_rumah,
                        penghuni_saat_ini:penghuni_saat_ini_id (nama_kepala_keluarga)
                    )
                `)
                .eq('kategori_id', iplCategory.id)
                .gte('tanggal', periode.tanggal_awal)
                .lte('tanggal', periode.tanggal_akhir);

            if (paymentError) {
                console.error('Error fetching payments for period:', paymentError);
                continue;
            }

            const totalPayments = (payments || []).reduce((sum, payment) => sum + (payment.nominal || 0), 0);
            const paymentCount = (payments || []).length;
            const averagePayment = paymentCount > 0 ? totalPayments / paymentCount : 0;

            rekapData.push({
                nama_periode: periode.nama_periode,
                tanggal_awal: periode.tanggal_awal,
                tanggal_akhir: periode.tanggal_akhir,
                total_pembayaran: totalPayments,
                jumlah_transaksi: paymentCount,
                rata_rata_pembayaran: averagePayment,
                transaction_details: payments || []
            });
        }

        const html = `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h4>Rekap Pembayaran IPL Bulanan</h4>
                        <button class="btn btn-secondary" onclick="loadViewsSection()">
                            <i class="bi bi-arrow-left"></i> Kembali ke Views
                        </button>
                    </div>
                    <p class="text-muted">Rekap bulan per bulan pembayaran IPL oleh penghuni</p>

                    <!-- Summary Info -->
                    <div class="alert alert-info">
                        <h6><i class="bi bi-info-circle"></i> Ringkasan Rekap IPL</h6>
                        <p class="mb-1">Total Periode: <strong>${rekapData.length}</strong></p>
                        <p class="mb-1">Total Pembayaran: <strong>${formatCurrency(rekapData.reduce((sum, item) => sum + item.total_pembayaran, 0))}</strong></p>
                        <p class="mb-1">Total Transaksi: <strong>${rekapData.reduce((sum, item) => sum + item.jumlah_transaksi, 0)}</strong></p>
                        <p class="mb-0">Rata-rata Pembayaran: <strong>${formatCurrency(rekapData.reduce((sum, item) => sum + item.rata_rata_pembayaran, 0) / Math.max(1, rekapData.length))}</strong></p>
                    </div>

                    <!-- Detailed Table -->
                    <div class="table-responsive">
                        <table class="table table-striped table-hover">
                            <thead class="table-dark">
                                <tr>
                                    <th>Periode</th>
                                    <th>Tanggal</th>
                                    <th class="text-end">Total Pembayaran</th>
                                    <th class="text-center">Jumlah Transaksi</th>
                                    <th class="text-end">Rata-rata</th>
                                    <th class="text-center">Detail Transaksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rekapData.map(item => `
                                    <tr>
                                        <td><strong>${item.nama_periode}</strong></td>
                                        <td>
                                            ${new Date(item.tanggal_awal).toLocaleDateString('id-ID')} - ${new Date(item.tanggal_akhir).toLocaleDateString('id-ID')}
                                        </td>
                                        <td class="text-end fw-bold text-success">${formatCurrency(item.total_pembayaran)}</td>
                                        <td class="text-center"><span class="badge bg-primary">${item.jumlah_transaksi}</span></td>
                                        <td class="text-end">${formatCurrency(item.rata_rata_pembayaran)}</td>
                                        <td class="text-center">
                                            ${item.jumlah_transaksi > 0 ? `<button class="btn btn-sm btn-outline-info" onclick="showRekapDetails('${item.nama_periode}')">Lihat Detail</button>` : '-'}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <!-- Hidden details container -->
                    <div id="rekap-details-container" class="mt-3" style="display: none;"></div>

                    <div class="mt-3">
                        <button class="btn btn-outline-primary" onclick="refreshViewRekap()">
                            <i class="bi bi-arrow-clockwise"></i> Refresh Data
                        </button>
                    </div>
                </div>
            </div>
        `;

        contentDiv.innerHTML = html;

        // Store rekap data globally for detail view
        window.rekapViewData = rekapData;

    } catch (error) {
        console.error('Error loading rekap view:', error);
        contentDiv.innerHTML = '<p class="text-danger">Error loading rekap data</p>';
    }
}

// Show rekap details for a specific period
function showRekapDetails(periodeName) {
    const detailsContainer = document.getElementById('rekap-details-container');
    const periodeData = window.rekapViewData?.find(item => item.nama_periode === periodeName);

    if (!periodeData) {
        detailsContainer.innerHTML = '<div class="alert alert-warning">Data periode tidak ditemukan.</div>';
        return;
    }

    const detailsHtml = `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">Detail Transaksi IPL - ${periodeName}</h6>
                <button class="btn btn-sm btn-outline-secondary" onclick="hideRekapDetails()">
                    <i class="bi bi-x"></i> Tutup
                </button>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead class="table-light">
                            <tr>
                                <th>No. Rumah</th>
                                <th>Penghuni</th>
                                <th class="text-end">Nominal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${periodeData.transaction_details.map(transaction => `
                                <tr>
                                    <td>${transaction.hunian?.nomor_blok_rumah || '-'}</td>
                                    <td>${transaction.hunian?.penghuni_saat_ini?.nama_kepala_keluarga || '-'}</td>
                                    <td class="text-end fw-bold text-success">${formatCurrency(transaction.nominal)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="table-active fw-bold">
                                <td colspan="2">TOTAL</td>
                                <td class="text-end">${formatCurrency(periodeData.total_pembayaran)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    `;

    detailsContainer.innerHTML = detailsHtml;
    detailsContainer.style.display = 'block';
    detailsContainer.scrollIntoView({ behavior: 'smooth' });
}

// Hide rekap details
function hideRekapDetails() {
    const detailsContainer = document.getElementById('rekap-details-container');
    detailsContainer.style.display = 'none';
}

// Refresh Rekap View
function refreshViewRekap() {
    loadViewRekap();
}

export {
    loadViewRekap,
    refreshViewRekap,
    showRekapDetails,
    hideRekapDetails
};

// Backward compatibility for global window functions
window.loadViewRekap = loadViewRekap;
window.refreshViewRekap = refreshViewRekap;
window.showRekapDetails = showRekapDetails;
window.hideRekapDetails = hideRekapDetails;
