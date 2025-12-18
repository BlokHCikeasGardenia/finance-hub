// Tarif Air table module
// Handles table display, pagination, and sorting for tarif_air

import { showToast, formatCurrency } from '../../utils.js';
import { confirmDeleteTarifAir } from './tarif_air-data.js';

// Display tarif air table
function displayTarifAirTable(data) {
    const tableContainer = document.getElementById('tarif_air-content');

    if (!tableContainer) return;

    const html = `
        <div class="row">
            <div class="col-12">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h4>Manajemen Tarif Air</h4>
                    <div>
                        <button class="btn btn-primary" onclick="showAddTarifAirForm()">
                            <i class="bi bi-plus-lg"></i> Tambah Tarif Baru
                        </button>
                    </div>
                </div>

                <div class="card">
                    <div class="card-body">
                        <div id="tarif_air-table-container">
                            ${generateTarifAirTableHtml(data)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    tableContainer.innerHTML = html;
}

// Generate table HTML
function generateTarifAirTableHtml(data) {
    if (!data || data.length === 0) {
        return `
            <div class="text-center py-4">
                <p class="text-muted mb-3">Belum ada data tarif air</p>
                <button class="btn btn-primary" onclick="showAddTarifAirForm()">
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
                        <th>Harga per Kubik</th>
                        <th>Tanggal Mulai Berlaku</th>
                        <th>Status</th>
                        <th>Dibuat</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => `
                        <tr>
                            <td>${formatCurrency(item.harga_per_kubik)}</td>
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
                                            onclick="editTarifAir('${item.id}')"
                                            title="Edit">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger"
                                            onclick="confirmDeleteTarifAir('${item.id}')"
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
                Total: ${data.length} tarif air
                ${data.filter(item => item.aktif).length > 0 ?
                    ` (Aktif: ${formatCurrency(data.find(item => item.aktif)?.harga_per_kubik || 0)} per m³)` :
                    ' (Tidak ada tarif aktif)'
                }
            </p>
        </div>
    `;
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
    displayTarifAirTable,
    generateTarifAirTableHtml,
    changeTarifAirPage
};

function changeTarifAirPage(page) {
    // This function can be implemented later if pagination is needed
    console.log('Change tariff page to:', page);
}
