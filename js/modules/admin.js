// Admin Module
// Balance consistency checks and admin functions

import { supabase } from './config.js';
import { showToast, formatCurrency } from './utils.js';

// Balance calculation functions (extracted from app_old.js)

// Function to calculate total balance from categories
export async function calculateTotalKategoriSaldo() {
    try {
        // Get all categories with their transactions
        const { data: kategoriData, error: kategoriError } = await supabase
            .from('kategori_saldo')
            .select('id, saldo_awal');

        if (kategoriError) throw kategoriError;

        let totalSaldoKategori = 0;

        for (const kategori of kategoriData) {
            const saldoAwal = kategori.saldo_awal || 0;

            // Calculate total pemasukan for this category
            const { data: pemasukanData, error: pemasukanError } = await supabase
                .from('pemasukan')
                .select('nominal')
                .eq('kategori_id', kategori.id);

            if (pemasukanError) throw pemasukanError;

            const totalPemasukan = pemasukanData.reduce((sum, item) => sum + (item.nominal || 0), 0);

            // Calculate total pengeluaran for this category
            const { data: pengeluaranData, error: pengeluaranError } = await supabase
                .from('pengeluaran')
                .select('nominal')
                .eq('kategori_id', kategori.id);

            if (pengeluaranError) throw pengeluaranError;

            const totalPengeluaran = pengeluaranData.reduce((sum, item) => sum + (item.nominal || 0), 0);

            // Calculate saldo akhir for this category
            const saldoAkhir = saldoAwal + totalPemasukan - totalPengeluaran;
            totalSaldoKategori += saldoAkhir;
        }

        return totalSaldoKategori;
    } catch (error) {
        console.error('Error calculating total kategori saldo:', error);
        return 0;
    }
}

// Function to calculate total balance from accounts
export async function calculateTotalRekeningSaldo() {
    try {
        // Get all accounts with their transactions
        const { data: rekeningData, error: rekeningError } = await supabase
            .from('rekening')
            .select('id, saldo_awal');

        if (rekeningError) throw rekeningError;

        let totalSaldoRekening = 0;

        for (const rekening of rekeningData) {
            const saldoAwal = rekening.saldo_awal || 0;

            // Calculate total pemasukan credited to this account
            const { data: pemasukanData, error: pemasukanError } = await supabase
                .from('pemasukan')
                .select('nominal')
                .eq('rekening_id', rekening.id);

            if (pemasukanError) throw pemasukanError;

            const totalPemasukan = pemasukanData.reduce((sum, item) => sum + (item.nominal || 0), 0);

            // Calculate total pengeluaran debited from this account
            const { data: pengeluaranData, error: pengeluaranError } = await supabase
                .from('pengeluaran')
                .select('nominal')
                .eq('rekening_id', rekening.id);

            if (pengeluaranError) throw pengeluaranError;

            const totalPengeluaran = pengeluaranData.reduce((sum, item) => sum + (item.nominal || 0), 0);

            // Calculate total pemindahbukuan (transfers)
            const { data: transferMasukData, error: transferMasukError } = await supabase
                .from('pemindahbukuan')
                .select('nominal')
                .eq('rekening_ke_id', rekening.id);

            if (transferMasukError) throw transferMasukError;

            const totalTransferMasuk = transferMasukData.reduce((sum, item) => sum + (item.nominal || 0), 0);

            const { data: transferKeluarData, error: transferKeluarError } = await supabase
                .from('pemindahbukuan')
                .select('nominal')
                .eq('rekening_dari_id', rekening.id);

            if (transferKeluarError) throw transferKeluarError;

            const totalTransferKeluar = transferKeluarData.reduce((sum, item) => sum + (item.nominal || 0), 0);

            // Calculate saldo akhir for this account
            const saldoAkhir = saldoAwal + totalPemasukan - totalPengeluaran + totalTransferMasuk - totalTransferKeluar;
            totalSaldoRekening += saldoAkhir;
        }

        return totalSaldoRekening;
    } catch (error) {
        console.error('Error calculating total rekening saldo:', error);
        return 0;
    }
}

// Function to calculate detailed balance for each category
export async function calculateDetailedKategoriSaldo() {
    try {
        // Get all categories with their transactions
        const { data: kategoriData, error: kategoriError } = await supabase
            .from('kategori_saldo')
            .select('id, nama_kategori, saldo_awal, keterangan');

        if (kategoriError) throw kategoriError;

        const detailedResults = [];

        for (const kategori of kategoriData) {
            const saldoAwal = kategori.saldo_awal || 0;

            // Calculate total pemasukan for this category
            const { data: pemasukanData, error: pemasukanError } = await supabase
                .from('pemasukan')
                .select('nominal')
                .eq('kategori_id', kategori.id);

            if (pemasukanError) throw pemasukanError;

            const totalPemasukan = pemasukanData.reduce((sum, item) => sum + (item.nominal || 0), 0);

            // Calculate total pengeluaran for this category
            const { data: pengeluaranData, error: pengeluaranError } = await supabase
                .from('pengeluaran')
                .select('nominal')
                .eq('kategori_id', kategori.id);

            if (pengeluaranError) throw pengeluaranError;

            const totalPengeluaran = pengeluaranData.reduce((sum, item) => sum + (item.nominal || 0), 0);

            // Calculate saldo akhir for this category
            const saldoAkhir = saldoAwal + totalPemasukan - totalPengeluaran;

            detailedResults.push({
                nama_kategori: kategori.nama_kategori,
                saldo_awal: saldoAwal,
                total_pemasukan: totalPemasukan,
                total_pengeluaran: totalPengeluaran,
                saldo_akhir: saldoAkhir,
                keterangan: kategori.keterangan || '-'
            });
        }

        return detailedResults;
    } catch (error) {
        console.error('Error calculating detailed kategori saldo:', error);
        return [];
    }
}

// Function to calculate detailed balance for each account
export async function calculateDetailedRekeningSaldo() {
    try {
        // Get all accounts with their transactions
        const { data: rekeningData, error: rekeningError } = await supabase
            .from('rekening')
            .select('id, jenis_rekening, saldo_awal');

        if (rekeningError) throw rekeningError;

        const detailedResults = [];

        for (const rekening of rekeningData) {
            const saldoAwal = rekening.saldo_awal || 0;

            // Calculate total pemasukan credited to this account
            const { data: pemasukanData, error: pemasukanError } = await supabase
                .from('pemasukan')
                .select('nominal')
                .eq('rekening_id', rekening.id);

            if (pemasukanError) throw pemasukanError;

            const totalPemasukan = pemasukanData.reduce((sum, item) => sum + (item.nominal || 0), 0);

            // Calculate total pengeluaran debited from this account
            const { data: pengeluaranData, error: pengeluaranError } = await supabase
                .from('pengeluaran')
                .select('nominal')
                .eq('rekening_id', rekening.id);

            if (pengeluaranError) throw pengeluaranError;

            const totalPengeluaran = pengeluaranData.reduce((sum, item) => sum + (item.nominal || 0), 0);

            // Calculate total pemindahbukuan (transfers)
            const { data: transferMasukData, error: transferMasukError } = await supabase
                .from('pemindahbukuan')
                .select('nominal')
                .eq('rekening_ke_id', rekening.id);

            if (transferMasukError) throw transferMasukError;

            const totalTransferMasuk = transferMasukData.reduce((sum, item) => sum + (item.nominal || 0), 0);

            const { data: transferKeluarData, error: transferKeluarError } = await supabase
                .from('pemindahbukuan')
                .select('nominal')
                .eq('rekening_dari_id', rekening.id);

            if (transferKeluarError) throw transferKeluarError;

            const totalTransferKeluar = transferKeluarData.reduce((sum, item) => sum + (item.nominal || 0), 0);

            // Calculate saldo akhir for this account
            const saldoAkhir = saldoAwal + totalPemasukan - totalPengeluaran + totalTransferMasuk - totalTransferKeluar;

            detailedResults.push({
                jenis_rekening: rekening.jenis_rekening,
                saldo_awal: saldoAwal,
                total_pemasukan: totalPemasukan,
                total_pengeluaran: totalPengeluaran,
                total_transfer_masuk: totalTransferMasuk,
                total_transfer_keluar: totalTransferKeluar,
                saldo_akhir: saldoAkhir
            });
        }

        return detailedResults;
    } catch (error) {
        console.error('Error calculating detailed rekening saldo:', error);
        return [];
    }
}

// Load Admin Section with Balance Consistency Checks
export async function loadAdminSection() {
    const contentDiv = document.getElementById('admin-content');

    contentDiv.innerHTML = '<p>Loading konsistensi saldo...</p>';

    try {
        // Calculate detailed balance consistency
        const [kategoriDetails, rekeningDetails] = await Promise.all([
            calculateDetailedKategoriSaldo(),
            calculateDetailedRekeningSaldo()
        ]);

        const totalKategori = kategoriDetails.reduce((sum, item) => sum + item.saldo_akhir, 0);
        const totalRekening = rekeningDetails.reduce((sum, item) => sum + item.saldo_akhir, 0);
        const difference = Math.abs(totalKategori - totalRekening);

        const html = `
            <div class="row">
                <div class="col-12">
                    <h3>Konsistensi Saldo</h3>
                    <p class="text-muted">Perbandingan saldo antara kategori dan rekening untuk memastikan konsistensi data</p>



                    <!-- Detailed Tables -->
                    <div class="row">
                        <div class="col-md-6">
                            <h4>Detail Saldo per Kategori</h4>
                            <div class="table-responsive">
                                <table class="table table-striped table-hover">
                                    <thead class="table-dark">
                                        <tr>
                                            <th>Kategori</th>
                                            <th>Saldo Awal</th>
                                            <th>Pemasukan</th>
                                            <th>Pengeluaran</th>
                                            <th>Saldo Akhir</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${kategoriDetails.map(item => `
                                            <tr>
                                                <td>${item.nama_kategori}</td>
                                                <td>${formatCurrency(item.saldo_awal)}</td>
                                                <td>${formatCurrency(item.total_pemasukan)}</td>
                                                <td>${formatCurrency(item.total_pengeluaran)}</td>
                                                <td>${formatCurrency(item.saldo_akhir)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div class="col-md-6">
                            <h4>Detail Saldo per Rekening</h4>
                            <div class="table-responsive">
                                <table class="table table-striped table-hover">
                                    <thead class="table-dark">
                                        <tr>
                                            <th>Rekening</th>
                                            <th>Saldo Awal</th>
                                            <th>Pemasukan</th>
                                            <th>Pengeluaran</th>
                                            <th>Transfer Masuk</th>
                                            <th>Transfer Keluar</th>
                                            <th>Saldo Akhir</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${rekeningDetails.map(item => `
                                            <tr>
                                                <td>${item.jenis_rekening}</td>
                                                <td>${formatCurrency(item.saldo_awal)}</td>
                                                <td>${formatCurrency(item.total_pemasukan)}</td>
                                                <td>${formatCurrency(item.total_pengeluaran)}</td>
                                                <td>${formatCurrency(item.total_transfer_masuk)}</td>
                                                <td>${formatCurrency(item.total_transfer_keluar)}</td>
                                                <td>${formatCurrency(item.saldo_akhir)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    ${difference > 0.01 ? `
                        <div class="alert alert-warning mt-4" role="alert">
                            <h5><i class="bi bi-exclamation-triangle"></i> Peringatan Konsistensi Data</h5>
                            <p>Ada selisih sebesar ${formatCurrency(difference)} antara total saldo kategori dan rekening.</p>
                            <p><strong>Penyebab yang mungkin:</strong></p>
                            <ul>
                                <li>Transaksi yang belum tercatat dengan benar</li>
                                <li>Kesalahan dalam pengkategorian transaksi</li>
                                <li>Data rekening atau kategori yang belum lengkap</li>
                                <li>Perbedaan dalam perhitungan saldo awal</li>
                            </ul>
                            <p><strong>Saran:</strong> Periksa kembali transaksi dan pastikan semua data telah tercatat dengan benar.</p>
                        </div>
                    ` : `
                        <div class="alert alert-success mt-4" role="alert">
                            <h5><i class="bi bi-check-circle"></i> Data Konsisten</h5>
                            <p>Semua saldo antara kategori dan rekening sudah sesuai. Tidak ada selisih yang perlu diperbaiki.</p>
                        </div>
                    `}
                </div>
            </div>
        `;

        contentDiv.innerHTML = html;
    } catch (error) {
        console.error('Error loading konsistensi view:', error);
        contentDiv.innerHTML = '<p class="text-danger">Error loading konsistensi data</p>';
    }
}

// Functions are already exported above - no additional exports needed
