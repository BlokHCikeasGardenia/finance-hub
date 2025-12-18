// Tarif IPL table module
// Handles table display, pagination, and sorting for tarif_ipl

import { showToast, formatCurrency } from '../../utils.js';
import { confirmDeleteTarifIpl } from './tarif_ipl-data.js';

// Display tarif IPL table
function displayTarifIplTable(data) {
    const tableContainer = document.getElementById('tarif_ipl-content');

    if (!tableContainer) return;

    const html = `
        <div class="row">
            <div class="col-12">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h4>Manajemen Tarif IPL</h4>
                    <div>
                        <button class="btn btn-primary" onclick="showAddTarifIplForm()">
                            <i class="bi bi-plus-lg"></i> Tambah Tarif Baru
                        </button>
                    </div>
                </div>

                <div class="card">
                    <div class="card-body">
                        <div id="tarif_ipl-table-container">
                            ${generateTarifIplTableHtml(data)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    tableContainer.innerHTML = html;
}

// Generate table HTML
function generateTarifIplTableHtml(data) {
    if (!data || data.length === 0) {
        return `
            <div class="text-center py-4">
                <p class="text-muted mb-3">Belum ada data tarif IPL</p>
                <button class="btn btn-primary" onclick="showAddTarifIplForm()">
                    <i class="bi bi-plus-lg"></i> Tambah Tarif Pertama
                </button>
            </div>
        `;
    }

    return `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>Type Tarif</th>
                        <th>Nama Tarif</th>
                        <th>Nominal</th>
                        <th>Tanggal Mulai Berlaku</th>
                        <th>Status</th>
                        <th>Dibuat</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => `
                        <tr>
                            <td>
                                <span class="badge ${getTypeBadgeClass(item.type_tarif)}">
                                    ${getTypeDisplayName(item.type_tarif)}
                                </span>
                            </td>
                            <td>${item.nama_tarif}</td>
                            <td>${formatCurrency(item.nominal)}</td>
                            <td>${formatDate(item.tanggal_mulai_berlaku)}</td>
                            <td>
                                <span class="badge ${item.aktif ? 'bg-success' : 'bg-secondary'}">
                                    ${item.aktif ? 'Aktif' : 'Tidak Aktif'}
                                </span>
                            </td>
                            <td>${formatDate(item.created_at)}</td>
                            <td>
                                <div class="btn-group" role="group">
                                    <button class="btn btn-sm btn-outline-primary"
                                            onclick="editTarifIpl('${item.id}')"
                                            title="Edit">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger"
                                            onclick="confirmDeleteTarifIpl('${item.id}')"
                                            title="Hapus">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="mt-3">
            <p class="text-muted">
                Total: ${data.length} tarif IPL
                ${data.filter(item => item.aktif).length > 0 ?
                    ` (Aktif: ${formatCurrency(data.find(item => item.aktif)?.harga_per_bulan || 0)} per bulan)` :
                    ' (Tidak ada tarif aktif)'
                }
            </p>
        </div>
    `;
}

// Helper function for type badge classes
function getTypeBadgeClass(typeTarif) {
    switch (typeTarif) {
        case 'IPL': return 'bg-primary';
        case 'IPL_RUMAH_KOSONG': return 'bg-warning text-dark';
        case 'DAU': return 'bg-info';
        default: return 'bg-secondary';
    }
}

// Helper function for type display names
function getTypeDisplayName(typeTarif) {
    switch (typeTarif) {
        case 'IPL': return 'IPL Normal';
        case 'IPL_RUMAH_KOSONG': return 'IPL Rumah Kosong';
        case 'DAU': return 'DAU';
        default: return typeTarif;
    }
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

export {
    displayTarifIplTable,
    generateTarifIplTableHtml,
    changeTarifIplPage
};

function changeTarifIplPage(page) {
    // This function can be implemented later if pagination is needed
    console.log('Change tariff page to:', page);
}
