// Main Views Module
// Handles views section loading and routing

import { supabase } from '../config.js';
import { loadViewIPL } from './reports/ipl.js';
import { loadViewAir } from './reports/air.js';
import { loadViewAula } from './reports/aula.js';
import { loadViewLainnya } from './reports/lainnya.js';
import { loadViewPemasukan } from './reports/pemasukan.js';
import { loadViewPengeluaran } from './reports/pengeluaran.js';
import { loadViewRingkasan } from './reports/ringkasan.js';
import { loadViewRekap } from './reports/rekap.js';
import { loadViewRekapIPL } from './reports/rekap-ipl.js';

// Load Views Section
async function loadViewsSection() {
    const contentDiv = document.getElementById('views-content');

    contentDiv.innerHTML = `
        <div class="row">
            <div class="col-12">
                <!-- Data Iuran Lingkungan -->
                <h4 class="mb-3 text-primary"><i class="bi bi-house-door"></i> Data Iuran Lingkungan</h4>
                <div class="row g-3 mb-4">
                    <div class="col-md-6">
                        <div class="card h-100">
                            <div class="card-body text-center">
                                <i class="bi bi-cash-stack fs-2 text-primary mb-3"></i>
                                <h5 class="card-title">IPL</h5>
                                <p class="card-text">Laporan pembayaran IPL per rumah</p>
                                <button class="btn btn-primary" onclick="loadViewIPL()">
                                    <i class="bi bi-eye"></i> Lihat IPL
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card h-100">
                            <div class="card-body text-center">
                                <i class="bi bi-droplet fs-2 text-info mb-3"></i>
                                <h5 class="card-title">Air</h5>
                                <p class="card-text">Laporan pemakaian air dan pembayaran</p>
                                <button class="btn btn-info" onclick="loadViewAir()">
                                    <i class="bi bi-eye"></i> Lihat Air
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Transaksi -->
                <h4 class="mb-3 text-success"><i class="bi bi-arrow-left-right"></i> Transaksi</h4>
                <div class="row g-3 mb-4">
                    <div class="col-md-6">
                        <div class="card h-100">
                            <div class="card-body text-center">
                                <i class="bi bi-graph-up-arrow fs-2 text-success mb-3"></i>
                                <h5 class="card-title">Pemasukan</h5>
                                <p class="card-text">Laporan semua transaksi pemasukan</p>
                                <button class="btn btn-success" onclick="loadViewPemasukan()">
                                    <i class="bi bi-eye"></i> Lihat Pemasukan
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card h-100">
                            <div class="card-body text-center">
                                <i class="bi bi-graph-down-arrow fs-2 text-danger mb-3"></i>
                                <h5 class="card-title">Pengeluaran</h5>
                                <p class="card-text">Laporan semua transaksi pengeluaran</p>
                                <button class="btn btn-danger" onclick="loadViewPengeluaran()">
                                    <i class="bi bi-eye"></i> Lihat Pengeluaran
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Rekap -->
                <h4 class="mb-3 text-warning"><i class="bi bi-bar-chart"></i> Rekap</h4>
                <div class="row g-3">
                    <div class="col-md-4">
                        <div class="card h-100">
                            <div class="card-body text-center">
                                <i class="bi bi-bar-chart fs-2 text-success mb-3"></i>
                                <h5 class="card-title">Ringkasan Saldo</h5>
                                <p class="card-text">Ringkasan saldo per kategori</p>
                                <button class="btn btn-success" onclick="loadViewRingkasan()">
                                    <i class="bi bi-eye"></i> Lihat Ringkasan
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card h-100 border-primary">
                            <div class="card-body text-center">
                                <i class="bi bi-bar-chart-fill fs-2 text-primary mb-3"></i>
                                <h5 class="card-title">Rekap IPL</h5>
                                <p class="card-text">Rekap IPL lengkap dengan DAU & status warga</p>
                                <button class="btn btn-primary" onclick="loadViewRekapIPL()">
                                    <i class="bi bi-eye"></i> Lihat Detail
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card h-100">
                            <div class="card-body text-center">
                                <i class="bi bi-droplet-fill fs-2 text-info mb-3"></i>
                                <h5 class="card-title">Rekap Air</h5>
                                <p class="card-text">Rekap pembayaran air bulanan</p>
                                <button class="btn btn-info" onclick="loadViewRekapAir()">
                                    <i class="bi bi-eye"></i> Lihat Rekap
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card h-100">
                            <div class="card-body text-center">
                                <i class="bi bi-building fs-2 text-warning mb-3"></i>
                                <h5 class="card-title">Rekap Aula</h5>
                                <p class="card-text">Rekap transaksi aula bulanan</p>
                                <button class="btn btn-warning" onclick="loadViewRekapAula()">
                                    <i class="bi bi-eye"></i> Lihat Rekap
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card h-100">
                            <div class="card-body text-center">
                                <i class="bi bi-list-check fs-2 text-secondary mb-3"></i>
                                <h5 class="card-title">Rekap Lainnya</h5>
                                <p class="card-text">Rekap transaksi lainnya bulanan</p>
                                <button class="btn btn-secondary" onclick="loadViewRekapLainnya()">
                                    <i class="bi bi-eye"></i> Lihat Rekap
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Load specific view based on type
async function loadView(viewType) {
    const contentDiv = document.getElementById('views-content');

    contentDiv.innerHTML = `<p>Loading ${viewType} view...</p>`;

    try {
        switch (viewType) {
            case 'ipl':
                await loadViewIPL();
                break;
            case 'air':
                await loadViewAir();
                break;
            case 'aula':
                await loadViewAula();
                break;
            case 'lainnya':
                await loadViewLainnya();
                break;
            case 'ringkasan':
                await loadViewRingkasan();
                break;
            case 'rekap':
                await loadViewRekap();
                break;
            default:
                contentDiv.innerHTML = '<p>View not implemented yet.</p>';
        }
    } catch (error) {
        console.error(`Error loading ${viewType} view:`, error);
        contentDiv.innerHTML = '<p class="text-danger">Error loading view data</p>';
    }
}

export {
    loadViewsSection,
    loadView
};

// Event listeners for view buttons
window.addEventListener('loadViewIPL', async () => {
    await loadViewIPL();
});

window.addEventListener('loadViewAir', async () => {
    await loadViewAir();
});

// Backward compatibility for global window functions
window.loadViewsSection = loadViewsSection;
window.loadView = loadView;
window.loadViewIPL = loadViewIPL;
window.loadViewAir = loadViewAir;
window.loadViewRekapAir = window.loadViewRekapAir;
window.loadViewAula = loadViewAula;
window.loadViewRekapAula = window.loadViewRekapAula;
window.loadViewLainnya = loadViewLainnya;
window.loadViewRekapLainnya = window.loadViewRekapLainnya;
window.loadViewPemasukan = loadViewPemasukan;
window.loadViewPengeluaran = loadViewPengeluaran;
window.loadViewRingkasan = loadViewRingkasan;
window.loadViewRekap = loadViewRekap;
window.loadViewRekapIPL = loadViewRekapIPL;
