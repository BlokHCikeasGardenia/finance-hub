// Tagihan Air table module
// Handles bulk meter reading input for water billing per period
// Similar to IPL table but for meter readings instead of billing types

import { supabase } from '../../config.js';
import { showToast, formatCurrency } from '../../utils.js';
import { generateMeteranAirBilling } from './meteran_air_billing-data.js';
import { getTarifAirForDate } from '../../entities/master/tarif_air-data.js';
import { loadHunian } from '../master/hunian.js';

// Global state
let currentPeriodeId = null;
let currentHunianData = [];
let currentPeriodeData = null;

// Load bulk meter reading input for a period
async function loadTagihanAirInput(periodeId) {
    try {
        // Get periode details
        const { data: periode, error: periodeError } = await supabase
            .from('periode')
            .select('*')
            .eq('id', periodeId)
            .single();

        if (periodeError) throw periodeError;

        currentPeriodeId = periodeId;
        currentPeriodeData = periode;

        // Load household data (only water customers)
        const { success, data: hunianData } = await loadHunian(false);
        if (!success) {
            showToast('Gagal memuat data hunian', 'danger');
            return;
        }

        // Filter only households that are water customers
        const waterCustomers = hunianData.filter(h => h.pelanggan_air === true);

        currentHunianData = waterCustomers;

        // Display the input table
        displayTagihanAirInputTable(waterCustomers, periode);

    } catch (error) {
        console.error('Error loading tagihan air input:', error);
        showToast('Error loading tagihan air input', 'danger');
    }
}

// Display bulk meter reading input table
function displayTagihanAirInputTable(hunianData, periode) {
    const tableContainer = document.getElementById('tagihan_air-content');

    if (!tableContainer) return;

    const html = `
        <div class="row">
            <div class="col-12">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h4>Input Meteran Air - ${periode.nama_periode}</h4>
                    <div>
                        <button class="btn btn-success" onclick="generateTagihanAirForCurrentPeriode()">
                            <i class="bi bi-plus-lg"></i> Generate Tagihan Air
                        </button>
                    </div>
                </div>

                <div class="alert alert-info">
                    <strong>Petunjuk:</strong> Masukkan angka meteran air bulan ini untuk setiap rumah.
                    Sistem akan otomatis menghitung pemakaian dan tagihan berdasarkan tarif air aktif.
                </div>

                <div class="card">
                    <div class="card-body">
                        <div id="tagihan_air-table-container">
                            ${generateTagihanAirInputTableHtml(hunianData, periode)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    tableContainer.innerHTML = html;

    // Setup input event listeners after DOM is updated
    setTimeout(() => setupBulkInputEventListeners(), 200);
}

// Generate table for bulk meter reading input
function generateTagihanAirInputTableHtml(hunianData, periode) {
    if (!hunianData || hunianData.length === 0) {
        return `
            <div class="text-center py-4">
                <p class="text-muted">Tidak ada data rumah pelanggan air</p>
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
                        <th>Penghuni</th>
                        <th>Area</th>
                        <th>Meteran Bulan Lalu</th>
                        <th>Meteran Bulan Ini</th>
                        <th>Pemakaian (m³)</th>
                        <th>Tagihan</th>
                    </tr>
                </thead>
                <tbody>
                    ${hunianData.map((hunian, index) => `
                        <tr data-hunian-id="${hunian.id}">
                            <td>${index + 1}</td>
                            <td>${hunian.nomor_blok_rumah}</td>
                            <td>${hunian.penghuni_saat_ini?.nama_kepala_keluarga || '-'}</td>
                            <td>${hunian.lorong?.nama_lorong || '-'}</td>
                            <td>
                                <span class="previous-reading" data-hunian-id="${hunian.id}">
                                    ${getPreviousReadingText(hunian.id)}
                                </span>
                            </td>
                            <td>
                                <input type="number"
                                       class="form-control form-control-sm current-reading-input"
                                       data-hunian-id="${hunian.id}"
                                       placeholder="0"
                                       min="0"
                                       step="0.01">
                            </td>
                            <td>
                                <span class="usage-preview" data-hunian-id="${hunian.id}">0 m³</span>
                            </td>
                            <td>
                                <span class="billing-preview" data-hunian-id="${hunian.id}">Rp 0</span>
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
                            <p id="air-summary">Total rumah: ${hunianData.length}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <h6>Preview Total Tagihan:</h6>
                            <p id="air-total-preview">Rp 0</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Get previous reading text (from previous period)
function getPreviousReadingText(hunianId) {
    // This will be populated asynchronously
    // For now return loading text, will be updated when data loads
    setTimeout(() => loadPreviousReadingsForAll(), 100);
    return '<small class="text-muted">Loading...</small>';
}

// Load previous readings for all households
async function loadPreviousReadingsForAll() {
    if (!currentPeriodeData || !currentHunianData.length) return;

    try {
        // Get all periods ordered by sequence
        const { data: allPeriods, error: periodsError } = await supabase
            .from('periode')
            .select('id, nama_periode, nomor_urut')
            .order('nomor_urut', { ascending: false });

        if (periodsError) throw periodsError;

        const currentPeriodIndex = allPeriods.findIndex(p => p.id === currentPeriodeData.id);

        // For each household, find the most recent previous reading
        for (const hunian of currentHunianData) {
            let previousReading = null;
            let found = false;

            // Look through previous periods
            for (let i = currentPeriodIndex + 1; i < allPeriods.length && !found; i++) {
                const { data: billingData, error } = await supabase
                    .from('meteran_air_billing')
                    .select('id, meteran_periode_ini')
                    .eq('hunian_id', hunian.id)
                    .eq('periode_id', allPeriods[i].id)
                    .limit(1);

                if (!error && billingData && billingData.length > 0) {
                    const reading = billingData[0].meteran_periode_ini;
                    if (reading !== null && reading !== undefined) {
                        previousReading = reading;
                        found = true;
                    }
                }
            }

            // Update the UI
            const previousReadingElement = document.querySelector(`.previous-reading[data-hunian-id="${hunian.id}"]`);
            if (previousReadingElement) {
                previousReadingElement.innerHTML = previousReading !== null ? previousReading : '<small class="text-warning">Belum ada data</small>';
            }
        }
    } catch (error) {
        console.error('Error loading previous readings:', error);
        // Update all to show error
        document.querySelectorAll('.previous-reading').forEach(el => {
            el.innerHTML = '<small class="text-danger">Error</small>';
        });
    }
}

// Update usage and billing preview when meter reading changes
async function updateAirUsagePreview(inputElement) {
    const hunianId = inputElement.getAttribute('data-hunian-id');
    const currentReading = parseFloat(inputElement.value) || 0;

    // Get previous reading
    const previousReadingElement = document.querySelector(`.previous-reading[data-hunian-id="${hunianId}"]`);
    const previousReadingText = previousReadingElement ? previousReadingElement.textContent : '0';

    let previousReading = 0;
    if (!previousReadingText.includes('Belum ada') && !previousReadingText.includes('Loading') && !previousReadingText.includes('Error')) {
        previousReading = parseFloat(previousReadingText) || 0;
    }

    // Calculate usage
    const usage = Math.max(0, currentReading - previousReading);

    // Get current tariff
    const { success: tariffSuccess, data: tariff } = await getTarifAirForDate(currentPeriodeData.tanggal_awal);
    const tariffRate = tariffSuccess && tariff ? tariff.harga_per_kubik : 0;

    // Calculate billing
    const billingAmount = usage * tariffRate;

    // Update UI
    const usageElement = document.querySelector(`.usage-preview[data-hunian-id="${hunianId}"]`);
    const billingElement = document.querySelector(`.billing-preview[data-hunian-id="${hunianId}"]`);

    if (usageElement) {
        usageElement.textContent = `${usage} m³`;
    }

    if (billingElement) {
        billingElement.textContent = formatCurrency(billingAmount);
    }

    updateTotalPreview();
}

// Update total preview
function updateTotalPreview() {
    const inputs = document.querySelectorAll('.current-reading-input');
    let totalBilling = 0;
    let validReadings = 0;

    inputs.forEach(input => {
        const value = parseFloat(input.value) || 0;
        if (value > 0) {
            const hunianId = input.getAttribute('data-hunian-id');
            const billingElement = document.querySelector(`.billing-preview[data-hunian-id="${hunianId}"]`);
            if (billingElement) {
                const billingText = billingElement.textContent.replace(/[^\d]/g, '');
                const billingAmount = parseFloat(billingText) || 0;
                totalBilling += billingAmount;
                validReadings++;
            }
        }
    });

    const totalElement = document.getElementById('air-total-preview');
    const summaryElement = document.getElementById('air-summary');

    if (totalElement) {
        totalElement.textContent = formatCurrency(totalBilling);
    }

    if (summaryElement) {
        summaryElement.innerHTML = `
            Total rumah: ${inputs.length}<br>
            Sudah input: ${validReadings}<br>
            Belum input: ${inputs.length - validReadings}
        `;
    }
}

// Generate air billing for current period
async function generateTagihanAirForCurrentPeriode() {
    if (!currentPeriodeId || !currentHunianData.length) {
        showToast('Data periode atau hunian tidak tersedia', 'warning');
        return;
    }

    // Force commit any pending input values before collecting data
    forceCommitInputValues();

    // Collect meter readings for each household
    const billingData = [];
    const inputs = document.querySelectorAll('.current-reading-input');

    inputs.forEach(input => {
        const hunianId = input.getAttribute('data-hunian-id');
        const currentReading = parseFloat(input.value) || 0;

        if (currentReading > 0) {
            // Find hunian data
            const hunian = currentHunianData.find(h => h.id === hunianId);
            if (hunian) {
                billingData.push({
                    ...hunian,
                    currentReading: currentReading
                });
            }
        }
    });

    if (billingData.length === 0) {
        showToast('Masukkan minimal 1 pembacaan meter', 'warning');
        return;
    }

    // Show loading
    const generateBtn = document.querySelector('button[onclick="generateTagihanAirForCurrentPeriode()"]');
    const originalText = generateBtn.innerHTML;
    generateBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Generating...';
    generateBtn.disabled = true;

    try {
        const result = await generateMeteranAirBilling(billingData, currentPeriodeId, {
            useInputData: true // Flag to use currentReading from hunian data
        });

        if (result.success) {
            showToast(`Berhasil generate ${result.count} tagihan air`, 'success');

            // Refresh the page or show results
            setTimeout(() => {
                showToast('Tagihan air berhasil dibuat!', 'success');
                // Refresh related views to show new data
                if (window.refreshViewAir) {
                    window.refreshViewAir();
                }
            }, 1000);
        } else {
            showToast(result.message || 'Gagal generate tagihan', 'danger');
        }
    } catch (error) {
        console.error('Error generating air bills:', error);
        showToast('Terjadi kesalahan saat generate tagihan', 'danger');
    } finally {
        generateBtn.innerHTML = originalText;
        generateBtn.disabled = false;
    }
}

export {
    loadTagihanAirInput,
    generateTagihanAirForCurrentPeriode
};

// Setup robust event listeners for bulk input fields
function setupBulkInputEventListeners() {
    const inputs = document.querySelectorAll('.current-reading-input');

    inputs.forEach(input => {
        // Remove any existing listeners first
        input.removeEventListener('input', handleInputEvent);
        input.removeEventListener('change', handleInputEvent);
        input.removeEventListener('blur', handleInputEvent);
        input.removeEventListener('keyup', handleInputEvent);

        // Add multiple event listeners for robustness
        input.addEventListener('input', handleInputEvent);
        input.addEventListener('change', handleInputEvent);
        input.addEventListener('blur', handleInputEvent);
        input.addEventListener('keyup', handleInputEvent);
    });

    // Event listeners setup complete
}

// Force commit all input values (fallback for event listener issues)
function forceCommitInputValues() {
    const inputs = document.querySelectorAll('.current-reading-input');

    inputs.forEach(input => {
        // Force trigger change event to ensure value is committed
        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);

        // Also force update preview
        updateAirUsagePreview(input);
    });

    // Input values committed
}

// Handle input events with debouncing
let inputTimeout;
function handleInputEvent(event) {
    clearTimeout(inputTimeout);
    inputTimeout = setTimeout(() => {
        updateAirUsagePreview(event.target);
    }, 300); // Debounce for 300ms
}

// Global functions for HTML onclick
window.generateTagihanAirForCurrentPeriode = generateTagihanAirForCurrentPeriode;
window.updateAirUsagePreview = updateAirUsagePreview;
