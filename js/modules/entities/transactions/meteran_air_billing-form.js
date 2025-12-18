// Meteran Air Billing form module
// Simplified form handling for consolidated meter readings and billing
// Replaces the complex meteran_air-form.js with direct table operations

import { showModal, closeModal, SearchableSelect } from '../../ui.js';
import { showToast } from '../../utils.js';
import {
    generateMeteranAirBilling
} from './meteran_air_billing-data.js';
import { supabase } from '../../config.js';

// Global callback for table refresh
let tableRefreshCallback = null;

// Global form state
let hunianSearchable, penghuniSearchable;

// Show form for creating meter readings and auto-generating bills
function showMeteranAirBillingForm(refreshCallback = null) {
    // Store the refresh callback
    tableRefreshCallback = refreshCallback;

    const formHtml = createMeteranAirBillingFormHtml();
    showModal('Input Meteran Air & Generate Tagihan', formHtml);

    setTimeout(() => {
        initializeMeteranAirBillingFormSelects();
        attachMeteranAirBillingFormEventListeners();
    }, 100);
}

// Create HTML for the simplified form
function createMeteranAirBillingFormHtml() {
    return `
        <div id="meteran_air_billing-form-error" class="alert alert-danger d-none" role="alert"></div>
        <form id="meteran_air_billing-form">
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label for="billing_hunian_id" class="form-label required-field">Rumah (Pelanggan Air):</label>
                    <select class="form-select" id="billing_hunian_id" name="hunian_id" required>
                        <option value="">Pilih Rumah</option>
                    </select>
                </div>
                <div class="col-md-6 mb-3">
                    <label for="billing_penghuni_id" class="form-label required-field">Penghuni:</label>
                    <select class="form-select" id="billing_penghuni_id" name="penghuni_id" required>
                        <option value="">Pilih Penghuni</option>
                    </select>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6 mb-3">
                    <label for="billing_periode_id" class="form-label required-field">Periode Tagihan:</label>
                    <select class="form-select" id="billing_periode_id" name="periode_id" required>
                        <option value="">Pilih Periode</option>
                    </select>
                </div>
                <div class="col-md-6 mb-3">
                    <label for="billing_meter_reading" class="form-label required-field">Angka Meteran Saat Ini:</label>
                    <input type="number" class="form-control" id="billing_meter_reading" name="meter_reading"
                           step="0.01" min="0" required placeholder="0.00">
                </div>
            </div>

            <div class="mb-3">
                <div class="form-check">
                    <input type="checkbox" class="form-check-input" id="billing_is_inisiasi" name="is_inisiasi">
                    <label class="form-check-label" for="billing_is_inisiasi">
                        <strong>📏 Meter Baru / Inisiasi</strong>
                        <small class="text-muted d-block">
                            Centang jika: Meter diganti, input meter pertama kali, atau mulai baseline baru
                        </small>
                    </label>
                </div>
            </div>

            <div class="alert alert-info">
                <small>
                    <i class="bi bi-info-circle"></i>
                    Sistem akan otomatis menghitung pemakaian berdasarkan pembacaan meter sebelumnya
                    dan membuat tagihan sesuai tarif air yang berlaku.
                </small>
            </div>

            <div class="d-flex gap-2">
                <button type="submit" class="btn btn-primary">
                    <i class="bi bi-calculator"></i> Hitung & Buat Tagihan
                </button>
                <button type="button" class="btn btn-warning" id="billing-reset-form-btn">Reset Form</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
            </div>
        </form>
    `;
}

// Initialize form selects
function initializeMeteranAirBillingFormSelects() {
    // Initialize hunian select (only air customers)
    const hunianSelect = document.getElementById('billing_hunian_id');
    if (hunianSelect) {
        hunianSearchable = new SearchableSelect(hunianSelect, {
            placeholder: 'Pilih Rumah',
            searchPlaceholder: 'Cari rumah...'
        });

        // Load hunian data with air customers only (based on house pelanggan_air status)
        hunianSearchable.loadData(async () => {
            const { data, error } = await supabase
                .from('hunian')
                .select('id, nomor_blok_rumah, pelanggan_air')
                .eq('pelanggan_air', true)
                .order('nomor_blok_rumah');

            if (error) return [];

            return data.map(item => ({
                value: item.id,
                text: item.nomor_blok_rumah
            }));
        });
    }

    // Initialize penghuni select
    const penghuniSelect = document.getElementById('billing_penghuni_id');
    if (penghuniSelect) {
        penghuniSearchable = new SearchableSelect(penghuniSelect, {
            placeholder: 'Pilih Penghuni',
            searchPlaceholder: 'Cari penghuni...'
        });

        // Load all penghuni data (not filtered by pelanggan_air since that's now on hunian)
        penghuniSearchable.loadData(async () => {
            const { data, error } = await supabase
                .from('penghuni')
                .select('id, nama_kepala_keluarga')
                .order('nama_kepala_keluarga');

            if (error) return [];

            return data.map(item => ({
                value: item.id,
                text: item.nama_kepala_keluarga
            }));
        });
    }

    // Initialize periode select
    const periodeSelect = document.getElementById('billing_periode_id');
    if (periodeSelect) {
        const periodeSearchable = new SearchableSelect(periodeSelect, {
            placeholder: 'Pilih Periode',
            searchPlaceholder: 'Cari periode...'
        });

        // Load periode data sorted by sequence number (Z-A)
        periodeSearchable.loadData(async () => {
            const { data, error } = await supabase
                .from('periode')
                .select('id, nama_periode, nomor_urut')
                .order('nomor_urut', { ascending: false });

            if (error) return [];

            return data.map(item => ({
                value: item.id,
                text: item.nama_periode
            }));
        });
    }
}

// Attach form event listeners
function attachMeteranAirBillingFormEventListeners() {
    const form = document.getElementById('meteran_air_billing-form');
    if (!form) return;

    // Set up auto-fill functionality
    setupAutoFill();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleMeteranAirBillingFormSubmit();
    });

    // Setup reset form functionality
    const resetBtn = document.getElementById('billing-reset-form-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetMeteranAirBillingForm();
        });
    }
}

// Setup auto-fill functionality
function setupAutoFill() {
    if (!hunianSearchable || !penghuniSearchable) return;

    let autoFillTimeout;

    // Auto-fill penghuni when hunian is selected
    hunianSearchable.selectElement.addEventListener('change', function(e) {
        if (e.detail && e.detail.source === 'searchable-select') return;

        clearTimeout(autoFillTimeout);
        autoFillTimeout = setTimeout(async () => {
            const hunianId = hunianSearchable.getValue();
            if (!hunianId) return;

            try {
                const { data, error } = await supabase
                    .from('hunian')
                    .select('penghuni_saat_ini:penghuni_saat_ini_id (id, nama_kepala_keluarga)')
                    .eq('id', hunianId)
                    .single();

                if (!error && data?.penghuni_saat_ini) {
                    penghuniSearchable.setValue(data.penghuni_saat_ini.id);
                } else {
                    penghuniSearchable.setValue('');
                }
            } catch (error) {
                console.error('Error auto-filling penghuni:', error);
            }
        }, 300);
    });

    // Enhanced auto-fill for penghuni
    const handlePenghuniSelection = async () => {
        clearTimeout(autoFillTimeout);

        autoFillTimeout = setTimeout(async () => {
            const penghuniId = penghuniSearchable.getValue();

            if (!penghuniId) return;

            try {
                const { data, error } = await supabase
                    .from('hunian')
                    .select('id, nomor_blok_rumah')
                    .eq('penghuni_saat_ini_id', penghuniId);

                if (!error && data) {
                    // If exactly one house found, auto-select it
                    if (data.length === 1) {
                        hunianSearchable.setValue(data[0].id);
                    } else if (data.length === 0) {
                        // No house found for this penghuni, clear the selection
                        hunianSearchable.setValue('');
                    }
                    // If multiple houses found, don't auto-select (let user choose)
                } else if (error) {
                    console.error('Error in house query:', error);
                    hunianSearchable.setValue('');
                }
            } catch (error) {
                console.error('Exception in penghuni auto-fill:', error);
                hunianSearchable.setValue('');
            }
        }, 200);
    };

    penghuniSearchable.selectElement.addEventListener('change', function(e) {
        if (e.detail && e.detail.source === 'searchable-select') return;
        handlePenghuniSelection();
    });

    penghuniSearchable.selectElement.addEventListener('input', function() {
        clearTimeout(autoFillTimeout);
        autoFillTimeout = setTimeout(() => {
            if (!penghuniSearchable.getValue()) return;
            handlePenghuniSelection();
        }, 500);
    });

    penghuniSearchable.selectElement.addEventListener('blur', function() {
        setTimeout(() => {
            if (!penghuniSearchable.getValue()) return;
            handlePenghuniSelection();
        }, 100);
    });
}

// Handle form submission
async function handleMeteranAirBillingFormSubmit() {
    try {
        console.log('Starting form submission...');
        const formData = collectMeteranAirBillingFormData();
        console.log('Form data collected:', formData);

        // Note: Table existence check removed - will fail gracefully if table doesn't exist

        // Get hunian data for bill generation
        const { data: hunianData, error: hunianError } = await supabase
            .from('hunian')
            .select(`
                id,
                nomor_blok_rumah,
                penghuni_saat_ini:penghuni_saat_ini_id (
                    id,
                    nama_kepala_keluarga
                )
            `)
            .eq('id', formData.hunian_id)
            .single();

        if (hunianError) throw hunianError;
        console.log('Hunian data retrieved:', hunianData);

        // Generate billing record
        console.log('Calling generateMeteranAirBilling...');
        const billResult = await generateMeteranAirBilling(
            [hunianData],
            formData.periode_id,
            {
                isInisiasi: formData.is_inisiasi,
                currentReading: formData.meter_reading
            }
        );
        console.log('Bill generation result:', billResult);

        if (billResult.success) {
            closeModal();

            const billCount = billResult.count || 0;
            const baselineCount = billResult.baselineCount || 0;
            const totalRecords = billResult.totalRecords || 0;

            let message = 'Data meteran air berhasil diproses';

            if (formData.is_inisiasi && baselineCount > 0) {
                message += ` - Meter baseline tercatat (${baselineCount} record) - billing mulai bulan depan`;
            } else if (billCount > 0) {
                message += ` - ${billCount} tagihan berhasil dibuat`;
            } else if (baselineCount > 0) {
                message += ` - ${baselineCount} baseline record berhasil dibuat`;
            }

            showToast(message, totalRecords > 0 ? 'success' : 'info');

            // Refresh the table immediately after successful submission
            if (tableRefreshCallback && typeof tableRefreshCallback === 'function') {
                setTimeout(() => {
                    tableRefreshCallback();
                }, 500); // Small delay to ensure modal is closed
            }
        } else {
            showMeteranAirBillingFormError(billResult.message);
        }

    } catch (error) {
        console.error('Form submission error:', error);
        showMeteranAirBillingFormError(error.message || 'Terjadi kesalahan saat memproses data');
    }
}

// Collect form data
function collectMeteranAirBillingFormData() {
    const hunianId = document.getElementById('billing_hunian_id').value;
    const penghuniId = document.getElementById('billing_penghuni_id').value;
    const periodeId = document.getElementById('billing_periode_id').value;
    const meterReading = parseFloat(document.getElementById('billing_meter_reading').value) || 0;
    const isInisiasi = document.getElementById('billing_is_inisiasi').checked;

    return {
        hunian_id: hunianId,
        penghuni_id: penghuniId,
        periode_id: periodeId,
        meter_reading: meterReading,
        is_inisiasi: isInisiasi
    };
}

// Show form error
function showMeteranAirBillingFormError(message) {
    const errorDiv = document.getElementById('meteran_air_billing-form-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('d-none');
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Reset form
function resetMeteranAirBillingForm() {
    // Clear error messages
    const errorDiv = document.getElementById('meteran_air_billing-form-error');
    if (errorDiv) {
        errorDiv.classList.add('d-none');
        errorDiv.textContent = '';
    }

    // Clear SearchableSelect components
    if (hunianSearchable) hunianSearchable.setValue('');
    if (penghuniSearchable) penghuniSearchable.setValue('');

    // Clear inputs
    const periodeSelect = document.getElementById('billing_periode_id');
    const meterInput = document.getElementById('billing_meter_reading');
    const inisiasiCheckbox = document.getElementById('billing_is_inisiasi');

    if (periodeSelect) periodeSelect.value = '';
    if (meterInput) meterInput.value = '';
    if (inisiasiCheckbox) inisiasiCheckbox.checked = false;

    showToast('Form berhasil direset', 'info');
}

export {
    showMeteranAirBillingForm,
    createMeteranAirBillingFormHtml,
    initializeMeteranAirBillingFormSelects,
    attachMeteranAirBillingFormEventListeners,
    handleMeteranAirBillingFormSubmit,
    collectMeteranAirBillingFormData,
    showMeteranAirBillingFormError,
    resetMeteranAirBillingForm
};