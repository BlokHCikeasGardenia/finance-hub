// Section loader module
// Handles loading of different section contents

import { isAuthenticated } from './auth.js';

// Import section modules
import { loadDashboard } from './dashboard.js';
import { loadAdminSection } from './admin.js';
import { loadAdminKonsistensiSaldo } from './admin/balance-consistency.js';

// Import entity modules
import { loadLorong, showAddLorongForm } from './entities/master/lorong.js';
import { loadKategori, showAddKategoriForm } from './entities/master/kategori.js';
import { loadHunian, showAddHunianForm, initializeHunianSearchAndFilter } from './entities/master/hunian.js';
import { loadPenghuni, showAddForm, initializePenghuniSearchAndFilter } from './entities/master/penghuni.js';
import { renderPenghuniTable } from './entities/master/penghuni-table.js';
import { loadRekening } from './entities/master/rekening.js';
import { showAddRekeningForm } from './entities/master/rekening-form.js';
import { loadSubkategori } from './entities/master/subkategori.js';
import { showAddSubkategoriForm } from './entities/master/subkategori-form.js';
import { loadPeriode } from './entities/master/periode.js';
import { showAddPeriodeForm } from './entities/master/periode-form.js';
import { loadTarifAir } from './entities/master/tarif-air.js';
import { loadTarifIpl } from './entities/master/tarif_ipl.js';
import { loadPemasukan, showAddPemasukanForm, initializePemasukanSearchAndFilter } from './entities/transactions/pemasukan.js';
import { loadPengeluaran, showAddPengeluaranForm, initializePengeluaranSearchAndFilter } from './entities/transactions/pengeluaran.js';
import { loadDanaTitipan, showAddDanaTitipanForm, initializeDanaTitipanSearchAndFilter, filterAndDisplayDanaTitipan } from './entities/transactions/dana_titipan.js';
import { loadPemindahbukuan, showAddPemindahbukuanForm, initializePemindahbukuanSearchAndFilter } from './entities/transactions/pemindahbukuan.js';
import { initializeMeteranAirBilling } from './entities/transactions/meteran_air_billing.js';
import { loadTagihanIplInput } from './entities/transactions/tagihan_ipl.js';
import { showInputIplForm, showIplInputForm } from './entities/transactions/tagihan_ipl-form.js';
import { loadTagihanAirInputForPeriod } from './entities/transactions/tagihan_air.js';

// Import views
import { loadViewsSection } from './views/main.js';
import { loadLaporanGenerator } from './views/reports/laporan-generator.js';

// Main section loader - Following the pattern from app_old.js
async function loadSectionContent(sectionId) {
    const contentDiv = document.getElementById(`${sectionId}-content`);

    switch (sectionId) {
        case 'dashboard':
            contentDiv.innerHTML = '<p>Loading dashboard...</p>';
            await loadDashboard();
            break;

        case 'hunian':
            contentDiv.innerHTML = `
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h2>Master Data Hunian</h2>
                            <button class="btn btn-primary" onclick="showAddHunianForm()">Tambah Hunian</button>
                        </div>

                        <!-- Search and Filter Section -->
                        <div class="card mb-3">
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label for="hunian-search" class="form-label">Cari Hunian:</label>
                                        <input type="text" class="form-control" id="hunian-search" placeholder="Ketik nomor rumah...">
                                    </div>
                                    <div class="col-md-2">
                                        <label for="hunian-filter-status" class="form-label">Filter Status:</label>
                                        <select class="form-select" id="hunian-filter-status">
                                            <option value="">Semua Status</option>
                                            <option value="berpenghuni">Berpenghuni</option>
                                            <option value="kosong">Kosong</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label for="hunian-filter-lorong" class="form-label">Filter Lorong:</label>
                                        <select class="form-select" id="hunian-filter-lorong">
                                            <option value="">Semua Lorong</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label for="hunian-filter-air" class="form-label">Pelanggan Air:</label>
                                        <select class="form-select" id="hunian-filter-air">
                                            <option value="">Semua</option>
                                            <option value="true">Ya</option>
                                            <option value="false">Tidak</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label for="hunian-items-per-page" class="form-label">Per Halaman:</label>
                                        <select class="form-select" id="hunian-items-per-page">
                                            <option value="5">5</option>
                                            <option value="10" selected>10</option>
                                            <option value="25">25</option>
                                            <option value="50">50</option>
                                            <option value="100">100</option>
                                        </select>
                                    </div>
                                    <div class="col-md-1 d-flex align-items-end">
                                        <button class="btn btn-outline-secondary btn-sm" onclick="resetHunianFilters()">Reset</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="hunian-table"><div class="text-center"><div class="spinner-border" role="status"></div></div></div>
                        <div id="hunian-total-count" class="mt-2 text-muted">Memuat data...</div>
                    </div>
                </div>
            `;
            await loadHunian();
            initializeHunianSearchAndFilter();
            break;

        case 'penghuni':
            contentDiv.innerHTML = `
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h2>Master Data Penghuni</h2>
                            <button class="btn btn-primary" onclick="showAddPenghuniForm('penghuni')">Tambah Penghuni</button>
                        </div>

                        <!-- Search and Filter Section -->
                        <div class="card mb-3">
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-4">
                                        <label for="penghuni-search" class="form-label">Cari Penghuni:</label>
                                        <input type="text" class="form-control" id="penghuni-search" placeholder="Ketik nama penghuni...">
                                    </div>
                                    <div class="col-md-2">
                                        <label for="penghuni-filter-status" class="form-label">Filter Status:</label>
                                        <select class="form-select" id="penghuni-filter-status">
                                            <option value="">Semua Status</option>
                                            <option value="pemilik">Pemilik</option>
                                            <option value="pengontrak">Pengontrak</option>
                                            <option value="lainnya">Lainnya</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label for="penghuni-filter-air" class="form-label">Pelanggan Air:</label>
                                        <select class="form-select" id="penghuni-filter-air">
                                            <option value="">Semua</option>
                                            <option value="true">Ya</option>
                                            <option value="false">Tidak</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label for="penghuni-items-per-page" class="form-label">Per Halaman:</label>
                                        <select class="form-select" id="penghuni-items-per-page"></select>
                                    </div>
                                    <div class="col-md-2 d-flex align-items-end gap-2">
                                        <button class="btn btn-outline-secondary" onclick="resetPenghuniFilters()">Reset Filter</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="penghuni-table"><div class="text-center"><div class="spinner-border" role="status"></div></div></div>
                    </div>
                </div>
            `;
            const result = await loadPenghuni();
            if (result && result.success) {
                renderPenghuniTable(result.data);
            }
            initializePenghuniSearchAndFilter();
            break;

        case 'lorong':
            contentDiv.innerHTML = `
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h2>Master Data Lorong</h2>
                            <button class="btn btn-primary" onclick="showAddLorongForm()">Tambah Lorong</button>
                        </div>
                        <div id="lorong-table"><div class="text-center"><div class="spinner-border" role="status"></div></div></div>
                    </div>
                </div>
            `;
            await loadLorong();
            break;

        case 'kategori':
            contentDiv.innerHTML = `
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h2>Master Data Kategori Saldo</h2>
                            <button class="btn btn-primary" onclick="showAddKategoriForm()">Tambah Kategori</button>
                        </div>
                        <div id="kategori-table"><div class="text-center"><div class="spinner-border" role="status"></div></div></div>
                    </div>
                </div>
            `;
            await loadKategori();
            break;

        case 'rekening':
            contentDiv.innerHTML = `
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h2>Master Data Rekening</h2>
                            <button class="btn btn-primary" onclick="showAddRekeningForm()">Tambah Rekening</button>
                        </div>
                        <div id="rekening-table"><div class="text-center"><div class="spinner-border" role="status"></div></div></div>
                    </div>
                </div>
            `;
            await loadRekening();
            break;

        case 'subkategori':
            contentDiv.innerHTML = `
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h2>Master Data Subkategori</h2>
                            <button class="btn btn-primary" onclick="showAddSubkategoriForm()">Tambah Subkategori</button>
                        </div>
                        <div id="subkategori-table"><div class="text-center"><div class="spinner-border" role="status"></div></div></div>
                    </div>
                </div>
            `;
            await loadSubkategori();
            break;

        case 'periode':
            contentDiv.innerHTML = `
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h2>Master Data Periode</h2>
                            <button class="btn btn-primary" onclick="showAddPeriodeForm()">Tambah Periode</button>
                        </div>

                        <!-- Search Section -->
                        <div class="card mb-3">
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-4">
                                        <label for="periode-search" class="form-label">Cari Periode:</label>
                                        <input type="text" class="form-control" id="periode-search" placeholder="Ketik nama periode, tanggal...">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="periode-table"><div class="text-center"><div class="spinner-border" role="status"></div></div></div>
                    </div>
                </div>
            `;
            await loadPeriode();
            const { initializePeriodeSearchAndFilter } = await import('./entities/master/periode.js');
            initializePeriodeSearchAndFilter();
            break;

        case 'tarif_air':
            contentDiv.innerHTML = `
                <div id="tarif_air-table-container">
                    <div class="text-center"><div class="spinner-border" role="status"></div></div>
                </div>
            `;
            await loadTarifAir();
            break;

        case 'tarif_ipl':
            contentDiv.innerHTML = `
                <div id="tarif_ipl-table-container">
                    <div class="text-center"><div class="spinner-border" role="status"></div></div>
                </div>
            `;
            await loadTarifIpl();
            break;

        case 'meteran_air_billing':
            contentDiv.innerHTML = `
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h2>Pemakaian Air</h2>
                            <button class="btn btn-primary" onclick="showMeteranAirBillingForm()">
                                <i class="bi bi-plus-lg"></i> Tambah Pemakaian Air
                            </button>
                        </div>

                        <div id="meteran_air_billing-table">
                            <div class="text-center"><div class="spinner-border" role="status"></div></div>
                        </div>
                    </div>
                </div>
            `;

            // Initialize the consolidated meteran air billing module
            await initializeMeteranAirBilling();
            break;

        case 'pemindahbukuan':
            contentDiv.innerHTML = `
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h2>Pemindahbukuan</h2>
                            <button class="btn btn-primary" onclick="showAddPemindahbukuanForm()">Tambah Pemindahbukuan</button>
                        </div>

                        <!-- Search and Filter Section - Pemindahbukuan -->
                        <div class="card mb-3">
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label for="pemindahbukuan-search" class="form-label">Cari Pemindahbukuan:</label>
                                        <input type="text" class="form-control" id="pemindahbukuan-search" placeholder="Ketik ID transaksi atau catatan...">
                                    </div>
                                    <div class="col-md-3">
                                        <label for="pemindahbukuan-filter-account-from" class="form-label">Dari Rekening:</label>
                                        <select class="form-select" id="pemindahbukuan-filter-account-from">
                                            <option value="">Semua Rekening</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label for="pemindahbukuan-filter-account-to" class="form-label">Ke Rekening:</label>
                                        <select class="form-select" id="pemindahbukuan-filter-account-to">
                                            <option value="">Semua Rekening</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label for="pemindahbukuan-date-from" class="form-label">Tanggal Dari:</label>
                                        <input type="date" class="form-control" id="pemindahbukuan-date-from">
                                    </div>
                                    <div class="col-md-1">
                                        <label for="pemindahbukuan-date-to" class="form-label">Sampai:</label>
                                        <input type="date" class="form-control" id="pemindahbukuan-date-to">
                                    </div>
                                    <div class="col-md-1 d-flex align-items-end">
                                        <button class="btn btn-outline-secondary btn-sm" onclick="resetPemindahbukuanFilters()">Reset</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="pemindahbukuan-table"><div class="text-center"><div class="spinner-border" role="status"></div></div></div>
                        <div id="pemindahbukuan-total-count" class="mt-2 text-muted">Memuat data...</div>
                        <div id="pemindahbukuan-total-nominal" class="mt-1 text-primary fw-bold"></div>
                    </div>
                </div>
            `;
            await loadPemindahbukuan();
            initializePemindahbukuanSearchAndFilter();
            break;

        case 'pembayaran':
            contentDiv.innerHTML = `
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h2>Pembayaran Tagihan</h2>
                        </div>
                        <p class="text-muted">Pilih rumah dan bayar tagihan IPL/Air yang belum lunas</p>

                        <div id="pembayaran-content">
                            <div class="text-center"><div class="spinner-border" role="status"></div></div>
                        </div>
                    </div>
                </div>
            `;

            // Load the payment module
            const { loadViewPayments } = await import('./views/payments.js');
            await loadViewPayments();
            break;

        case 'dana_titipan':
            contentDiv.innerHTML = `
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h2>Dana Titipan</h2>
                            <button class="btn btn-primary" onclick="showAddDanaTitipanForm()">Tambah Dana Titipan</button>
                        </div>

                        <!-- Search and Filter Section - Dana Titipan -->
                        <div class="card mb-3">
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label for="dana_titipan-search" class="form-label">Cari Dana Titipan:</label>
                                        <input type="text" class="form-control" id="dana_titipan-search" placeholder="Ketik ID transaksi, keterangan atau penghuni...">
                                    </div>
                                    <div class="col-md-2">
                                        <label for="dana_titipan-filter-category" class="form-label">Filter Kategori:</label>
                                        <select class="form-select" id="dana_titipan-filter-category">
                                            <option value="">Semua Kategori</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label for="dana_titipan-filter-account" class="form-label">Filter Rekening:</label>
                                        <select class="form-select" id="dana_titipan-filter-account">
                                            <option value="">Semua Rekening</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label for="dana_titipan-date-from" class="form-label">Tanggal Dari:</label>
                                        <input type="date" class="form-control" id="dana_titipan-date-from">
                                    </div>
                                    <div class="col-md-2">
                                        <label for="dana_titipan-date-to" class="form-label">Sampai:</label>
                                        <input type="date" class="form-control" id="dana_titipan-date-to">
                                    </div>
                                    <div class="col-md-1">
                                        <label for="dana_titipan-items-per-page" class="form-label">Per Halaman:</label>
                                        <select class="form-select" id="dana_titipan-items-per-page">
                                            <option value="5">5</option>
                                            <option value="10" selected>10</option>
                                            <option value="25">25</option>
                                            <option value="50">50</option>
                                            <option value="100">100</option>
                                        </select>
                                    </div>
                                    <div class="col-md-1 d-flex align-items-end">
                                        <button class="btn btn-outline-secondary btn-sm" onclick="resetDanaTitipanFilters()">Reset</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="dana_titipan-table"><div class="text-center"><div class="spinner-border" role="status"></div></div></div>
                        <div id="dana_titipan-total-count" class="mt-2 text-muted">Memuat data...</div>
                        <div id="dana_titipan-total-nominal" class="mt-1 text-primary fw-bold"></div>
                    </div>
                </div>
            `;
            await loadDanaTitipan();
            initializeDanaTitipanSearchAndFilter();
            filterAndDisplayDanaTitipan();
            break;

        case 'pengeluaran':
            contentDiv.innerHTML = `
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h2>Transaksi Pengeluaran</h2>
                            <button class="btn btn-danger" onclick="showAddPengeluaranForm()">Tambah Pengeluaran</button>
                        </div>

                        <!-- Search and Filter Section - Pengeluaran -->
                        <div class="card mb-3">
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label for="pengeluaran-search" class="form-label">Cari Pengeluaran:</label>
                                        <input type="text" class="form-control" id="pengeluaran-search" placeholder="Ketik ID transaksi, penerima atau keterangan...">
                                    </div>
                                    <div class="col-md-2">
                                        <label for="pengeluaran-filter-category" class="form-label">Filter Kategori:</label>
                                        <select class="form-select" id="pengeluaran-filter-category">
                                            <option value="">Semua Kategori</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label for="pengeluaran-filter-subcategory" class="form-label">Filter Subkategori:</label>
                                        <select class="form-select" id="pengeluaran-filter-subcategory">
                                            <option value="">Semua Subkategori</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label for="pengeluaran-filter-account" class="form-label">Filter Rekening:</label>
                                        <select class="form-select" id="pengeluaran-filter-account">
                                            <option value="">Semua Rekening</option>
                                        </select>
                                    </div>
                                    <div class="col-md-1">
                                        <label for="pengeluaran-date-from" class="form-label">Tanggal Dari:</label>
                                        <input type="date" class="form-control" id="pengeluaran-date-from">
                                    </div>
                                    <div class="col-md-1">
                                        <label for="pengeluaran-date-to" class="form-label">Sampai:</label>
                                        <input type="date" class="form-control" id="pengeluaran-date-to">
                                    </div>
                                    <div class="col-md-1">
                                        <label for="pengeluaran-items-per-page" class="form-label">Per Halaman:</label>
                                        <select class="form-select" id="pengeluaran-items-per-page">
                                            <option value="5">5</option>
                                            <option value="10" selected>10</option>
                                            <option value="25">25</option>
                                            <option value="50">50</option>
                                            <option value="100">100</option>
                                        </select>
                                    </div>
                                    <div class="col-md-1 d-flex align-items-end">
                                        <button class="btn btn-outline-secondary btn-sm" onclick="resetPengeluaranFilters()">Reset</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="pengeluaran-table"><div class="text-center"><div class="spinner-border" role="status"></div></div></div>
                        <div id="pengeluaran-total-count" class="mt-2 text-muted">Memuat data...</div>
                        <div id="pengeluaran-total-nominal" class="mt-1 text-danger fw-bold"></div>
                    </div>
                </div>
            `;
            await loadPengeluaran();
            initializePengeluaranSearchAndFilter();
            break;

        case 'pemasukan':
            contentDiv.innerHTML = `
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h2>Transaksi Pemasukan</h2>
                            <button class="btn btn-success" onclick="showAddPemasukanForm()">Tambah Pemasukan</button>
                        </div>

                        <!-- Search and Filter Section - Enhanced for Pemasukan -->
                        <div class="card mb-3">
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label for="pemasukan-search" class="form-label">Cari Pemasukan:</label>
                                        <input type="text" class="form-control" id="pemasukan-search" placeholder="Ketik ID transaksi atau keterangan...">
                                    </div>
                                    <div class="col-md-2">
                                        <label for="pemasukan-filter-category" class="form-label">Filter Kategori:</label>
                                        <select class="form-select" id="pemasukan-filter-category">
                                            <option value="">Semua Kategori</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label for="pemasukan-filter-account" class="form-label">Filter Rekening:</label>
                                        <select class="form-select" id="pemasukan-filter-account">
                                            <option value="">Semua Rekening</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label for="pemasukan-date-from" class="form-label">Tanggal Dari:</label>
                                        <input type="date" class="form-control" id="pemasukan-date-from">
                                    </div>
                                    <div class="col-md-1">
                                        <label for="pemasukan-date-to" class="form-label">Sampai:</label>
                                        <input type="date" class="form-control" id="pemasukan-date-to">
                                    </div>
                                    <div class="col-md-1">
                                        <label for="pemasukan-items-per-page" class="form-label">Per Halaman:</label>
                                        <select class="form-select" id="pemasukan-items-per-page">
                                            <option value="5">5</option>
                                            <option value="10" selected>10</option>
                                            <option value="25">25</option>
                                            <option value="50">50</option>
                                            <option value="100">100</option>
                                        </select>
                                    </div>
                                    <div class="col-md-1 d-flex align-items-end">
                                        <button class="btn btn-outline-secondary btn-sm" onclick="resetPemasukanFilters()">Reset</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="pemasukan-table"><div class="text-center"><div class="spinner-border" role="status"></div></div></div>
                        <div id="pemasukan-total-count" class="mt-2 text-muted">Memuat data...</div>
                        <div id="pemasukan-total-nominal" class="mt-1 text-success fw-bold"></div>
                    </div>
                </div>
            `;
            await loadPemasukan();
            initializePemasukanSearchAndFilter();
            break;

        case 'tagihan_ipl':
            contentDiv.innerHTML = `
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h4>Input Tagihan IPL per Periode</h4>
                            <div class="d-flex gap-2">
                                <select class="form-select" id="periode-select" style="width: auto;">
                                    <option value="">Pilih Periode</option>
                                </select>
                                <button class="btn btn-primary" onclick="loadTagihanIplForSelectedPeriode()">
                                    <i class="bi bi-upload"></i> Load Data Periode
                                </button>
                            </div>
                        </div>

                        <div id="tagihan_ipl-content">
                            <div class="alert alert-info">
                                <strong>Petunjuk:</strong> Pilih periode terlebih dahulu untuk mulai input tagihan IPL.
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Load available periods
            loadAvailablePeriodsForIPL();
            break;



        case 'tagihan_air':
            contentDiv.innerHTML = `
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h4>Input Meteran Air per Periode</h4>
                            <div class="d-flex gap-2">
                                <select class="form-select" id="periode-air-select" style="width: auto;">
                                    <option value="">Pilih Periode</option>
                                </select>
                                <button class="btn btn-primary" onclick="loadTagihanAirForSelectedPeriode()">
                                    <i class="bi bi-upload"></i> Load Data Periode
                                </button>
                            </div>
                        </div>

                        <div id="tagihan_air-content">
                            <div class="alert alert-info">
                                <strong>Petunjuk:</strong> Pilih periode terlebih dahulu untuk mulai input meteran air.
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Load available periods
            loadAvailablePeriodsForAir();
            break;

        case 'input_ipl':
            contentDiv.innerHTML = `
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h4>Input & Kelola Tagihan IPL</h4>
                            <button class="btn btn-primary" onclick="showIplInputForm()">
                                <i class="bi bi-plus-lg"></i> Buat Tagihan IPL Baru
                            </button>
                        </div>

                        <div class="alert alert-info">
                            <strong>Petunjuk:</strong> Klik "Buat Tagihan IPL Baru" untuk membuat tagihan IPL dengan form yang telah disederhanakan.
                        </div>

                        <div id="input_ipl-content">
                            <!-- Content will be loaded dynamically -->
                        </div>

                        <!-- IPL Bills Management Table -->
                        <div class="mt-4">
                            <h5>Kelola Tagihan IPL</h5>
                            <p class="text-muted">Kelola semua tagihan IPL yang sudah dibuat - lihat, edit, dan hapus</p>

                            <!-- Search and Filter Section -->
                            <div class="card mb-3">
                                <div class="card-body">
                                    <div class="row g-3">
                                        <div class="col-md-3">
                                            <label for="ipl-bills-search" class="form-label">Cari:</label>
                                            <input type="text" class="form-control" id="ipl-bills-search"
                                                   placeholder="Rumah, penghuni, periode...">
                                        </div>
                                        <div class="col-md-2">
                                            <label for="ipl-bills-filter-status" class="form-label">Status:</label>
                                            <select class="form-select" id="ipl-bills-filter-status">
                                                <option value="">Semua Status</option>
                                                <option value="belum_bayar">Belum Bayar</option>
                                                <option value="sebagian">Sebagian</option>
                                                <option value="lunas">Lunas</option>
                                            </select>
                                        </div>
                                        <div class="col-md-2">
                                            <label for="ipl-bills-filter-periode" class="form-label">Periode:</label>
                                            <select class="form-select" id="ipl-bills-filter-periode">
                                                <option value="">Semua Periode</option>
                                            </select>
                                        </div>
                                        <div class="col-md-2">
                                            <label for="ipl-bills-items-per-page" class="form-label">Per Halaman:</label>
                                            <select class="form-select" id="ipl-bills-items-per-page">
                                                <option value="5">5</option>
                                                <option value="10" selected>10</option>
                                                <option value="25">25</option>
                                                <option value="50">50</option>
                                                <option value="100">100</option>
                                            </select>
                                        </div>
                                        <div class="col-md-3 d-flex align-items-end gap-2">
                                            <button class="btn btn-outline-secondary" onclick="resetIplBillsFilters()">Reset</button>
                                            <button class="btn btn-outline-primary" onclick="refreshIplBillsData()">
                                                <i class="bi bi-arrow-clockwise"></i> Refresh
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Bills Table -->
                            <div id="ipl-bills-table-container">
                                <div class="text-center"><div class="spinner-border" role="status"></div></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Load the IPL bills management interface
            const { loadIplBillsManagement } = await import('./entities/transactions/tagihan_ipl-manage.js');
            await loadIplBillsManagement();
            break;

        case 'views':
            await loadViewsSection();
            break;

        case 'admin':
            contentDiv.innerHTML = '<p>Loading admin konsistensi saldo...</p>';
            await loadAdminKonsistensiSaldo();
            break;

        case 'laporan':
            contentDiv.innerHTML = '<p>Loading generator laporan...</p>';
            await loadLaporanGenerator();
            break;

        default:
            contentDiv.innerHTML = '<p>Section not implemented yet.</p>';
    }
}

// Helper functions for IPL billing
async function loadAvailablePeriodsForIPL() {
    try {
        const { data: periods, error } = await supabase
            .from('periode')
            .select('id, nama_periode, tanggal_awal, tanggal_akhir')
            .order('tanggal_awal', { ascending: false });

        if (error) throw error;

        const selectElement = document.getElementById('periode-select');
        if (selectElement && periods) {
            const options = periods.map(periode => `
                <option value="${periode.id}">${periode.nama_periode} (${periode.tanggal_awal} - ${periode.tanggal_akhir})</option>
            `).join('');

            selectElement.innerHTML = '<option value="">Pilih Periode</option>' + options;
        }
    } catch (error) {
        console.error('Error loading periods for IPL:', error);
    }
}

async function loadTagihanIplForSelectedPeriode() {
    const periodeSelect = document.getElementById('periode-select');
    const selectedPeriodeId = periodeSelect?.value;

    if (!selectedPeriodeId) {
        alert('Pilih periode terlebih dahulu!');
        return;
    }

    try {
        // Load the IPL input interface for the selected period
        await loadTagihanIplInput(selectedPeriodeId);
    } catch (error) {
        console.error('Error loading IPL input for period:', error);
        alert('Gagal memuat input IPL untuk periode tersebut.');
    }
}

// Helper functions for Air billing
async function loadAvailablePeriodsForAir() {
    try {
        const { data: periods, error } = await supabase
            .from('periode')
            .select('id, nama_periode, tanggal_awal, tanggal_akhir')
            .order('tanggal_awal', { ascending: false });

        if (error) throw error;

        const selectElement = document.getElementById('periode-air-select');
        if (selectElement && periods) {
            const options = periods.map(periode => `
                <option value="${periode.id}">${periode.nama_periode} (${periode.tanggal_awal} - ${periode.tanggal_akhir})</option>
            `).join('');

            selectElement.innerHTML = '<option value="">Pilih Periode</option>' + options;
        }
    } catch (error) {
        console.error('Error loading periods for Air:', error);
    }
}

async function loadTagihanAirForSelectedPeriode() {
    const periodeSelect = document.getElementById('periode-air-select');
    const selectedPeriodeId = periodeSelect?.value;

    if (!selectedPeriodeId) {
        alert('Pilih periode terlebih dahulu!');
        return;
    }

    try {
        // Load the air meter reading input interface for the selected period
        await loadTagihanAirInputForPeriod(selectedPeriodeId);
    } catch (error) {
        console.error('Error loading air input for period:', error);
        alert('Gagal memuat input meteran air untuk periode tersebut.');
    }
}



export {
    loadSectionContent,
    loadAvailablePeriodsForIPL,
    loadTagihanIplForSelectedPeriode,
    loadAvailablePeriodsForAir,
    loadTagihanAirForSelectedPeriode
};

// Global functions for HTML onclick
window.loadAvailablePeriodsForIPL = loadAvailablePeriodsForIPL;
window.loadTagihanIplForSelectedPeriode = loadTagihanIplForSelectedPeriode;
window.loadAvailablePeriodsForAir = loadAvailablePeriodsForAir;
window.loadTagihanAirForSelectedPeriode = loadTagihanAirForSelectedPeriode;

// Meteran Air Billing functions
window.showMeteranAirBillingForm = async () => {
    const { showMeteranAirBillingForm } = await import('./entities/transactions/meteran_air_billing.js');

    // Create refresh callback that reloads the table data
    const refreshCallback = async () => {
        try {
            const { loadMeteranAirBillingTableData } = await import('./entities/transactions/meteran_air_billing-table.js');
            await loadMeteranAirBillingTableData();
            // Update the table display
            const { updateMeteranAirBillingTableDisplay } = await import('./entities/transactions/meteran_air_billing-table.js');
            updateMeteranAirBillingTableDisplay();
        } catch (error) {
            console.error('Error refreshing table:', error);
        }
    };

    showMeteranAirBillingForm(refreshCallback);
};
