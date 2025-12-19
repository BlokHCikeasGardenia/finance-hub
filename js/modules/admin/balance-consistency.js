// Admin balance consistency module
// Handles balance consistency analysis and reporting

import { formatCurrency } from '../utils.js';
import { calculateDetailedKategoriSaldo, calculateDetailedRekeningSaldo } from '../utils/balance-calculations.js';

async function loadAdminKonsistensiSaldo() {
    const contentDiv = document.getElementById('admin-content');

    try {
        // Calculate detailed balance consistency
        const [kategoriDetails, rekeningDetails] = await Promise.all([
            calculateDetailedKategoriSaldo(),
            calculateDetailedRekeningSaldo()
        ]);

        const totalKategori = kategoriDetails.reduce((sum, item) => sum + item.saldo_akhir, 0);

        // Calculate total dana titipan across all accounts
        const totalDanaTitipan = rekeningDetails.reduce((sum, item) => sum + (item.total_dana_titipan || 0), 0);

        const totalRekening = rekeningDetails.reduce((sum, item) => sum + item.saldo_akhir, 0);
        const expectedTotalRekening = totalKategori + totalDanaTitipan;
        const difference = Math.abs(expectedTotalRekening - totalRekening);

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
                                            <th>Dana Titipan</th>
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
                                                <td>${formatCurrency(item.total_dana_titipan || 0)}</td>
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
                            <p>Ada selisih sebesar ${formatCurrency(difference)} antara perhitungan yang diharapkan.</p>
                            <p><strong>Rumus konsistensi:</strong> Σ(Saldo Akhir Kategori) + Σ(Dana Titipan) = Σ(Saldo Akhir Rekening)</p>
                            <p><strong>Detail perhitungan:</strong></p>
                            <ul>
                                <li>Total Saldo Kategori: ${formatCurrency(totalKategori)}</li>
                                <li>Total Dana Titipan: ${formatCurrency(totalDanaTitipan)}</li>
                                <li>Harus sama dengan Total Saldo Rekening: ${formatCurrency(expectedTotalRekening)}</li>
                                <li>Total Saldo Rekening saat ini: ${formatCurrency(totalRekening)}</li>
                            </ul>
                            <p><strong>Penyebab yang mungkin:</strong></p>
                            <ul>
                                <li>Transaksi yang belum tercatat dengan benar</li>
                                <li>Kesalahan dalam pengkategorian transaksi dana titipan</li>
                                <li>Data rekening atau kategori yang belum lengkap</li>
                                <li>Perbedaan dalam perhitungan saldo awal</li>
                                <li>Dana titipan yang belum dialokasikan dengan benar</li>
                            </ul>
                            <p><strong>Saran:</strong> Periksa kembali transaksi dan pastikan semua data telah tercatat dengan benar.</p>
                        </div>
                    ` : `
                        <div class="alert alert-success mt-4" role="alert">
                            <h5><i class="bi bi-check-circle"></i> Data Konsisten</h5>
                            <p>Semua saldo sudah sesuai dengan rumus: Σ(Kategori) + Σ(Dana Titipan) = Σ(Rekening)</p>
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

export {
    loadAdminKonsistensiSaldo
};
