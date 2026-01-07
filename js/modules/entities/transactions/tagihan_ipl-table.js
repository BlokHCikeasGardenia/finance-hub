// Tagihan IPL table module
// Handles table display for IPL billing input per period

import { showToast, formatCurrency } from '../../utils.js';
import { generateTagihanIplForPeriod } from './tagihan_ipl-data.js';

// Global state
let currentPeriodeId = null;
let currentHunianData = [];

// Display tagihan IPL input form
function displayTagihanIplTable(periodeId, hunianData) {
    currentPeriodeId = periodeId;
    currentHunianData = hunianData;

    const tableContainer = document.getElementById('tagihan_ipl-content');

    if (!tableContainer) return;

    const html = `
        <div class="row">
            <div class="col-12">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h4>Input Tagihan IPL per Periode</h4>
                    <div>
                        <button class="btn btn-success" onclick="generateTagihanIplForCurrentPeriode()">
                            <i class="bi bi-plus-lg"></i> Generate Tagihan IPL
                        </button>
                    </div>
                </div>

                <div class="alert alert-info">
                    <strong>Petunjuk:</strong> Pilih type tagihan untuk setiap rumah. Sistem akan otomatis generate tagihan berdasarkan tarif aktif.
                </div>

                <div class="card">
                    <div class="card-body">
                        <div id="tagihan_ipl-table-container">
                            ${generateTagihanIplInputTableHtml(hunianData)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    tableContainer.innerHTML = html;
}

// Generate table for IPL billing type input
function generateTagihanIplInputTableHtml(hunianData) {
    if (!hunianData || hunianData.length === 0) {
        return `
            <div class="text-center py-4">
                <p class="text-muted">Tidak ada data hunian</p>
            </div>
        `;
    }

    return `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th style="width: 50px;">No</th>
                        <th>No. Rumah</th>
                        <th>Status</th>
                        <th>Penghuni</th>
                        <th>Area</th>
                        <th>Type Tagihan IPL</th>
                        <th>Preview Nominal</th>
                    </tr>
                </thead>
                <tbody>
                    ${hunianData.map((hunian, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${hunian.nomor_blok_rumah}</td>
                            <td>
                                <span class="badge ${hunian.status === 'berpenghuni' ? 'bg-success' : 'bg-secondary'}">
                                    ${hunian.status}
                                </span>
                            </td>
                            <td>${hunian.penghuni_saat_ini?.nama_kepala_keluarga || '-'}</td>
                            <td>${hunian.lorong?.nama_lorong || '-'}</td>
                            <td>
                                <select class="form-select form-select-sm ipl-type-select"
                                        data-hunian-id="${hunian.id}"
                                        onchange="updateIplTypePreview(this)">
                                    <option value="">Pilih Type</option>
                                    <option value="IPL" ${getDefaultType(hunian) === 'IPL' ? 'selected' : ''}>
                                        IPL Normal (Rp 60,000)
                                    </option>
                                    <option value="IPL_RUMAH_KOSONG" ${getDefaultType(hunian) === 'IPL_RUMAH_KOSONG' ? 'selected' : ''}>
                                        IPL Rumah Kosong (Rp 30,000)
                                    </option>
                                    <option value="DAU" ${getDefaultType(hunian) === 'DAU' ? 'selected' : ''}>
                                        DAU (Rp 5,000)
                                    </option>
                                </select>
                            </td>
                            <td>
                                <span class="ipl-preview" data-hunian-id="${hunian.id}">
                                    ${getPreviewAmount(getDefaultType(hunian))}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="mt-3">
            <div class="row">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <h6>Summary:</h6>
                            <p id="ipl-summary">Total rumah: ${hunianData.length}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <h6>Preview Total Tagihan:</h6>
                            <p id="ipl-total-preview">0</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Get default IPL type based on household conditions
function getDefaultType(hunian) {
    if (hunian.status === 'kosong') {
        return 'IPL_RUMAH_KOSONG';
    }
    if (hunian.penghuni_saat_ini?.kondisi_khusus) {
        return 'DAU';
    }
    return 'IPL';
}

// Get preview amount for type
function getPreviewAmount(type) {
    switch (type) {
        case 'IPL': return '60,000';
        case 'IPL_RUMAH_KOSONG': return '30,000';
        case 'DAU': return '5,000';
        default: return '0';
    }
}

// Update preview when type changes
function updateIplTypePreview(selectElement) {
    const hunianId = selectElement.getAttribute('data-hunian-id');
    const type = selectElement.value;
    const previewElement = document.querySelector(`.ipl-preview[data-hunian-id="${hunianId}"]`);

    if (previewElement) {
        previewElement.textContent = getPreviewAmount(type);
    }

    updateTotalPreview();
}

// Update total preview
function updateTotalPreview() {
    const selects = document.querySelectorAll('.ipl-type-select');
    let total = 0;
    let normal = 0, kosong = 0, dau = 0;

    selects.forEach(select => {
        const type = select.value;
        switch (type) {
            case 'IPL': total += 60000; normal++; break;
            case 'IPL_RUMAH_KOSONG': total += 30000; kosong++; break;
            case 'DAU': total += 5000; dau++; break;
        }
    });

    const totalElement = document.getElementById('ipl-total-preview');
    const summaryElement = document.getElementById('ipl-summary');

    if (totalElement) {
        totalElement.textContent = formatCurrency(total);
    }

    if (summaryElement) {
        summaryElement.innerHTML = `
            Total rumah: ${selects.length}<br>
            IPL Normal: ${normal}<br>
            IPL Kosong: ${kosong}<br>
            DAU: ${dau}
        `;
    }
}

// Generate IPL bills for current period
async function generateTagihanIplForCurrentPeriode() {
    if (!currentPeriodeId || !currentHunianData.length) {
        showToast('Data periode atau hunian tidak tersedia', 'warning');
        return;
    }

    // Collect selected types for each household
    const billingData = [];
    const selects = document.querySelectorAll('.ipl-type-select');

    selects.forEach(select => {
        const hunianId = select.getAttribute('data-hunian-id');
        const type = select.value;

        if (type) {
            // Find hunian data
            const hunian = currentHunianData.find(h => h.id === hunianId);
            if (hunian) {
                billingData.push({
                    ...hunian,
                    selectedType: type
                });
            }
        }
    });

    if (billingData.length === 0) {
        showToast('Pilih type tagihan untuk minimal 1 rumah', 'warning');
        return;
    }

    // Show loading
    const generateBtn = document.querySelector('button[onclick="generateTagihanIplForCurrentPeriode()"]');
    const originalText = generateBtn.innerHTML;
    generateBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Generating...';
    generateBtn.disabled = true;

    try {
        const result = await generateTagihanIplForPeriod(billingData, currentPeriodeId);

        if (result.success) {
            showToast(`Berhasil generate ${result.count} tagihan IPL`, 'success');

            // Refresh the page or show results
            setTimeout(() => {
                // Could redirect to tagihan IPL view or refresh current page
                showToast('Tagihan IPL berhasil dibuat!', 'success');
            }, 1000);
        } else {
            showToast(result.message || 'Gagal generate tagihan', 'danger');
        }
    } catch (error) {
        console.error('Error generating IPL bills:', error);
        showToast('Terjadi kesalahan saat generate tagihan', 'danger');
    } finally {
        generateBtn.innerHTML = originalText;
        generateBtn.disabled = false;
    }
}

export {
    displayTagihanIplTable,
    generateTagihanIplForCurrentPeriode
};

// Global functions for HTML onclick
window.generateTagihanIplForCurrentPeriode = generateTagihanIplForCurrentPeriode;
window.updateIplTypePreview = updateIplTypePreview;
