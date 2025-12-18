// Tagihan IPL form module
// Handles single IPL billing type input form with searchable dropdowns and smart autofill

import { supabase } from '../../config.js';
import { showModal, closeModal, SearchableSelect } from '../../ui.js';
import { showToast } from '../../utils.js';
import {
    generateTagihanIplForPeriod
} from './tagihan_ipl-data.js';

// Show single IPL input form
function showInputIplForm(hunianId = null) {
    // If hunianId provided, show form for specific household
    // Otherwise show selection form
    if (hunianId) {
        showIplInputFormForHunian(hunianId);
    } else {
        showHunianSelectionForIplInput();
    }
}

// Show hunian selection form
async function showHunianSelectionForIplInput() {
    try {
        const { loadHunian } = await import('../master/hunian.js');
        const { success, data: hunianData } = await loadHunian(false);

        if (!success) {
            showToast('Gagal memuat data hunian', 'danger');
            return;
        }

        const html = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Pilih Rumah untuk Input IPL</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label for="hunian-search" class="form-label">Cari Rumah:</label>
                            <input type="text" class="form-control" id="hunian-search" placeholder="Ketik nomor rumah...">
                        </div>
                        <div class="hunian-list" style="max-height: 300px; overflow-y: auto;">
                            ${hunianData.map(hunian => `
                                <div class="hunian-item p-2 border-bottom cursor-pointer"
                                     onclick="selectHunianForIpl('${hunian.id}')">
                                    <strong>${hunian.nomor_blok_rumah}</strong>
                                    <span class="text-muted ms-2">
                                        ${hunian.penghuni_saat_ini?.nama_kepala_keluarga || 'Kosong'}
                                    </span>
                                    <small class="text-muted d-block">
                                        ${hunian.lorong?.nama_lorong || '-'}
                                    </small>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Show modal using the standard showModal function
        showModal('Pilih Rumah untuk Input IPL', html);

        // Add search functionality after modal is shown
        setTimeout(() => {
            const searchInput = document.getElementById('hunian-search');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    const items = document.querySelectorAll('.hunian-item');

                    items.forEach(item => {
                        const text = item.textContent.toLowerCase();
                        item.style.display = text.includes(searchTerm) ? 'block' : 'none';
                    });
                });
            }
        }, 100);

    } catch (error) {
        console.error('Error showing hunian selection:', error);
        showToast('Error memuat data hunian', 'danger');
    }
}

// Global form state for smart autofill
let hunianSearchable, penghuniSearchable, periodeSearchable, tarifIplSearchable;

// Show IPL input form with searchable dropdowns and smart autofill
async function showIplInputForm() {
    const formHtml = createIplInputFormHtml();
    showModal('Input Tagihan IPL', formHtml);

    setTimeout(() => {
        initializeIplInputFormSelects();
        attachIplInputFormEventListeners();
    }, 100);
}

// Show IPL input form for specific hunian (backward compatibility)
async function showIplInputFormForHunian(hunianId) {
    // For now, redirect to the new form
    // TODO: Could pre-select the hunian if needed
    showIplInputForm();
}

// Create IPL input form HTML with searchable dropdowns
function createIplInputFormHtml() {
    return `
        <form id="ipl-input-form">
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label for="ipl_hunian_id" class="form-label required-field">Nomor Rumah:</label>
                    <select class="form-select" id="ipl_hunian_id" name="hunian_id" required>
                        <option value="">Pilih Rumah</option>
                    </select>
                </div>
                <div class="col-md-6 mb-3">
                    <label for="ipl_penghuni_id" class="form-label required-field">Penghuni:</label>
                    <select class="form-select" id="ipl_penghuni_id" name="penghuni_id" required>
                        <option value="">Pilih Penghuni</option>
                    </select>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6 mb-3">
                    <label for="ipl_periode_id" class="form-label required-field">Periode:</label>
                    <select class="form-select" id="ipl_periode_id" name="periode_id" required>
                        <option value="">Pilih Periode</option>
                    </select>
                </div>
                <div class="col-md-6 mb-3">
                    <label for="ipl_tarif_id" class="form-label required-field">Jenis Tarif IPL:</label>
                    <select class="form-select" id="ipl_tarif_id" name="tarif_id" required>
                        <option value="">Pilih Jenis Tarif IPL</option>
                    </select>
                </div>
            </div>

            <!-- Inline error message in the middle of form -->
            <div id="ipl-form-inline-error" class="alert alert-danger text-center d-none mb-3" role="alert">
                <strong>Mohon lengkapi semua field yang diperlukan</strong>
            </div>

            <div class="mb-3">
                <label class="form-label">Preview Tagihan:</label>
                <div id="preview-container" class="alert alert-warning">
                    <div id="preview-content">
                        <strong>⚠️ Pilih semua field terlebih dahulu</strong>
                    </div>
                </div>
            </div>

            <div class="d-flex gap-2">
                <button type="submit" class="btn btn-success">
                    <i class="bi bi-plus-lg"></i> Buat Tagihan IPL
                </button>
                <button type="button" class="btn btn-warning" id="ipl-reset-form-btn">Reset Form</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
            </div>
        </form>
    `;
}

// Initialize form selects with SearchableSelect components
async function initializeIplInputFormSelects() {
    // Initialize hunian select
    const hunianSelect = document.getElementById('ipl_hunian_id');
    if (hunianSelect) {
        hunianSearchable = new SearchableSelect(hunianSelect, {
            placeholder: 'Pilih Rumah',
            searchPlaceholder: 'Cari rumah...'
        });

        hunianSearchable.loadData(async () => {
            const { data, error } = await supabase
                .from('hunian')
                .select('id, nomor_blok_rumah')
                .order('nomor_blok_rumah');

            if (error) return [];

            return data.map(item => ({
                value: item.id,
                text: item.nomor_blok_rumah
            }));
        });
    }

    // Initialize penghuni select
    const penghuniSelect = document.getElementById('ipl_penghuni_id');
    if (penghuniSelect) {
        penghuniSearchable = new SearchableSelect(penghuniSelect, {
            placeholder: 'Pilih Penghuni',
            searchPlaceholder: 'Cari penghuni...'
        });

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
    const periodeSelect = document.getElementById('ipl_periode_id');
    if (periodeSelect) {
        periodeSearchable = new SearchableSelect(periodeSelect, {
            placeholder: 'Pilih Periode',
            searchPlaceholder: 'Cari periode...'
        });

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

    // Initialize tarif IPL select
    const tarifSelect = document.getElementById('ipl_tarif_id');
    if (tarifSelect) {
        tarifIplSearchable = new SearchableSelect(tarifSelect, {
            placeholder: 'Pilih Jenis Tarif IPL',
            searchPlaceholder: 'Cari jenis tarif...'
        });

        tarifIplSearchable.loadData(async () => {
            const { data, error } = await supabase
                .from('tarif_ipl')
                .select('id, type_tarif, nominal')
                .eq('aktif', true)
                .order('type_tarif');

            if (error) return [];

            return data.map(item => ({
                value: item.id,
                text: `${getTypeDisplayName(item.type_tarif)} - Rp ${formatCurrency(item.nominal)}`
            }));
        });
    }
}

// Attach form event listeners
async function attachIplInputFormEventListeners() {
    const form = document.getElementById('ipl-input-form');

    if (!form) return;

    // Setup smart autofill
    setupIplSmartAutofill();

    // Setup preview updates
    setupIplPreviewUpdates();

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleIplInputFormSubmit();
    });

    // Setup reset form functionality
    const resetBtn = document.getElementById('ipl-reset-form-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetIplInputForm();
        });
    }
}

// Setup smart autofill functionality
function setupIplSmartAutofill() {
    if (!hunianSearchable || !penghuniSearchable) return;

    let autoFillTimeout;
    let isAutofilling = false; // Flag to prevent recursive autofill

    // Auto-fill penghuni when hunian is selected
    hunianSearchable.selectElement.addEventListener('change', function(e) {
        if (e.detail && e.detail.source === 'searchable-select') return;
        if (isAutofilling) return; // Prevent recursive calls

        clearTimeout(autoFillTimeout);
        autoFillTimeout = setTimeout(async () => {
            isAutofilling = true;

            const hunianId = hunianSearchable.getValue();
            if (!hunianId) {
                penghuniSearchable.setValue('');
                isAutofilling = false;
                return;
            }

            try {
                // Get current resident for this house
                const { data, error } = await supabase
                    .from('hunian')
                    .select('penghuni_saat_ini:penghuni_saat_ini_id (id, nama_kepala_keluarga)')
                    .eq('id', hunianId)
                    .single();

                if (!error && data?.penghuni_saat_ini) {
                    // Check if this resident exists in the penghuni dropdown data
                    const residentExists = penghuniSearchable.data.some(item => item.value === data.penghuni_saat_ini.id);
                    if (residentExists) {
                        penghuniSearchable.setValue(data.penghuni_saat_ini.id);
                    } else {
                        // Resident not in dropdown, clear selection
                        penghuniSearchable.setValue('');
                    }
                } else {
                    // No current resident, clear selection
                    penghuniSearchable.setValue('');
                }
            } catch (error) {
                console.error('Error auto-filling penghuni:', error);
                penghuniSearchable.setValue('');
            }

            isAutofilling = false;
        }, 300);
    });

    // Auto-fill hunian when penghuni is selected (TWO-WAY)
    penghuniSearchable.selectElement.addEventListener('change', function(e) {
        if (e.detail && e.detail.source === 'searchable-select') return;
        if (isAutofilling) return; // Prevent recursive calls

        clearTimeout(autoFillTimeout);
        autoFillTimeout = setTimeout(async () => {
            isAutofilling = true;

            const penghuniId = penghuniSearchable.getValue();
            if (!penghuniId) {
                // Don't clear hunian when penghuni is cleared - let user control both
                isAutofilling = false;
                return;
            }

            try {
                // Find houses associated with this resident
                const { data, error } = await supabase
                    .from('hunian')
                    .select('id, nomor_blok_rumah')
                    .eq('penghuni_saat_ini_id', penghuniId);

                if (!error && data && data.length > 0) {
                    // If exactly one house found, auto-select it
                    if (data.length === 1) {
                        // Check if this house exists in the hunian dropdown data
                        const houseExists = hunianSearchable.data.some(item => item.value === data[0].id);
                        if (houseExists) {
                            hunianSearchable.setValue(data[0].id);
                        }
                    }
                    // If multiple houses or no house found, don't auto-select (let user choose)
                }
            } catch (error) {
                console.error('Error auto-filling hunian:', error);
            }

            isAutofilling = false;
        }, 300);
    });
}

// Setup preview updates
function setupIplPreviewUpdates() {
    const updatePreview = async () => {
        const hunianId = hunianSearchable?.getValue();
        const penghuniId = penghuniSearchable?.getValue();
        const periodeId = periodeSearchable?.getValue();
        const tarifId = tarifIplSearchable?.getValue();

        const previewContainer = document.getElementById('preview-container');
        const previewContent = document.getElementById('preview-content');

        if (!previewContainer || !previewContent) return;

        // Check if all fields are complete
        const allFieldsComplete = hunianId && penghuniId && periodeId && tarifId;

        if (!allFieldsComplete) {
            // Show warning state - red background
            previewContainer.className = 'alert alert-danger';
            previewContent.innerHTML = '<strong>⚠️ Pilih semua field terlebih dahulu</strong>';
            return;
        }

        // All fields complete - show detailed information
        try {
            // Get detailed information for the selected items
            const [hunianData, penghuniData, periodeData] = await Promise.all([
                // Get hunian details
                supabase.from('hunian').select('nomor_blok_rumah').eq('id', hunianId).single(),
                // Get penghuni details
                supabase.from('penghuni').select('nama_kepala_keluarga').eq('id', penghuniId).single(),
                // Get periode details
                supabase.from('periode').select('nama_periode').eq('id', periodeId).single()
            ]);

            const hunian = hunianData.data;
            const penghuni = penghuniData.data;
            const periode = periodeData.data;

            // Get tariff details
            const tarifOptions = tarifIplSearchable.selectElement.options;
            const selectedOption = Array.from(tarifOptions).find(opt => opt.value === tarifId);
            const tarifText = selectedOption ? selectedOption.text : '';

            // Change to success/info styling
            previewContainer.className = 'alert alert-success';

            // Show detailed preview
            previewContent.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-2"><strong>🏠 No Rumah:</strong> ${hunian?.nomor_blok_rumah || '-'}</div>
                        <div class="mb-2"><strong>👤 Penghuni:</strong> ${penghuni?.nama_kepala_keluarga || '-'}</div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-2"><strong>📅 Periode:</strong> ${periode?.nama_periode || '-'}</div>
                        <div class="mb-2"><strong>🏷️ Jenis IPL:</strong> ${tarifText.split(' - Rp ')[0] || '-'}</div>
                        <div class="mb-0"><strong>💰 Tagihan:</strong> <span class="text-primary">${tarifText.split(' - Rp ')[1] ? 'Rp ' + tarifText.split(' - Rp ')[1] : '-'}</span></div>
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('Error updating preview:', error);
            // Fallback to simple preview
            previewContainer.className = 'alert alert-info';
            const tarifOptions = tarifIplSearchable.selectElement.options;
            const selectedOption = Array.from(tarifOptions).find(opt => opt.value === tarifId);
            if (selectedOption) {
                const textParts = selectedOption.text.split(' - Rp ');
                previewContent.innerHTML = `
                    <strong>${textParts[0] || '-'}</strong><br>
                    <span>${textParts[1] ? 'Rp ' + textParts[1] : '-'}</span>
                `;
            }
        }
    };

    // Add change listeners to all searchable selects
    if (hunianSearchable) hunianSearchable.selectElement.addEventListener('change', updatePreview);
    if (penghuniSearchable) penghuniSearchable.selectElement.addEventListener('change', updatePreview);
    if (periodeSearchable) periodeSearchable.selectElement.addEventListener('change', updatePreview);
    if (tarifIplSearchable) tarifIplSearchable.selectElement.addEventListener('change', updatePreview);
}

// Reset form
function resetIplInputForm() {
    // Clear error messages
    const errorDiv = document.getElementById('ipl-input-form-error');
    if (errorDiv) {
        errorDiv.classList.add('d-none');
        errorDiv.textContent = '';
    }

    // Clear inline error message
    const inlineErrorDiv = document.getElementById('ipl-form-inline-error');
    if (inlineErrorDiv) {
        inlineErrorDiv.classList.add('d-none');
        inlineErrorDiv.innerHTML = '<strong>Mohon lengkapi semua field yang diperlukan</strong>';
    }

    // Clear SearchableSelect components
    if (hunianSearchable) hunianSearchable.setValue('');
    if (penghuniSearchable) penghuniSearchable.setValue('');
    if (periodeSearchable) periodeSearchable.setValue('');
    if (tarifIplSearchable) tarifIplSearchable.setValue('');

    showToast('Form berhasil direset', 'info');
}

// Load available periods
async function loadPeriodsForIplInput() {
    try {
        const { data: periods, error } = await supabase
            .from('periode')
            .select('id, nama_periode, tanggal_awal, tanggal_akhir')
            .order('tanggal_awal', { ascending: false });

        if (error) throw error;

        const selectElement = document.getElementById('periode_select');
        if (selectElement && periods) {
            const options = periods.map(periode => `
                <option value="${periode.id}">${periode.nama_periode} (${periode.tanggal_awal} - ${periode.tanggal_akhir})</option>
            `).join('');

            selectElement.innerHTML = '<option value="">Pilih Periode</option>' + options;
        }
    } catch (error) {
        console.error('Error loading periods:', error);
    }
}

// Update preview
function updateIplPreview() {
    const typeSelect = document.getElementById('ipl_type');
    const previewType = document.getElementById('preview-type');
    const previewAmount = document.getElementById('preview-amount');

    if (!typeSelect || !previewType || !previewAmount) return;

    const selectedOption = typeSelect.options[typeSelect.selectedIndex];
    if (!selectedOption || !selectedOption.value) {
        previewType.textContent = 'Pilih type IPL terlebih dahulu';
        previewAmount.textContent = '-';
        return;
    }

    const typeName = selectedOption.textContent.split(' (')[0];
    const amount = selectedOption.getAttribute('data-amount') || '0';

    previewType.textContent = typeName;
    previewAmount.textContent = `Rp ${formatCurrency(parseFloat(amount))}`;
}

// Handle form submission
async function handleIplInputFormSubmit() {
    try {
        // Get values from SearchableSelect components
        const hunianId = hunianSearchable?.getValue();
        const penghuniId = penghuniSearchable?.getValue();
        const periodeId = periodeSearchable?.getValue();
        const tarifId = tarifIplSearchable?.getValue();

        // Validate required fields
        if (!hunianId || !penghuniId || !periodeId || !tarifId) {
            showIplInlineFormError('Mohon lengkapi semua field yang diperlukan');
            return;
        }

        showToast('Memproses tagihan IPL...', 'info');

        // Get hunian data with relations
        const { readRecords } = await import('../../crud.js');
        const { success, data: hunianData } = await readRecords('hunian', {
            filters: { id: hunianId },
            select: `
                *,
                lorong:lorong_id (nama_lorong),
                penghuni_saat_ini:penghuni_saat_ini_id (nama_kepala_keluarga)
            `
        });

        if (!success || !hunianData || hunianData.length === 0) {
            showIplInlineFormError('Data hunian tidak ditemukan');
            return;
        }

        const hunian = hunianData[0];

        // Get tariff details
        const { data: tariffData, error: tariffError } = await supabase
            .from('tarif_ipl')
            .select('type_tarif, nominal')
            .eq('id', tarifId)
            .single();

        if (tariffError || !tariffData) {
            showIplInputFormError('Data tarif IPL tidak ditemukan');
            return;
        }

        // Create billing data for this household with selected tariff type and penghuni
        const billingData = [{
            ...hunian,
            selectedType: tariffData.type_tarif,
            selectedPenghuniId: penghuniId // Use the selected penghuni from form
        }];

        // Generate bill
        const result = await generateTagihanIplForPeriod(billingData, periodeId);

        if (result.success) {
            // Don't close modal - keep it open for next input
            // Reset form for next input
            resetIplInputForm();

            // Show success message with indication for next input
            showToast(`Tagihan IPL berhasil dibuat (${result.count} tagihan) - Siap input berikutnya`, 'success');

            // Refresh the IPL bills table to show new bill
            if (window.loadIplBillsManagement) {
                window.loadIplBillsManagement();
            }

            // Check if any bills were actually created or all were skipped
            if (result.count === 0 && result.skippedCount > 0) {
                // All bills were skipped (duplicates) - show warning
                showToast(`Tagihan sudah ada untuk periode ini (${result.skippedCount} dilewati)`, 'warning');
            }
        } else {
            showIplInputFormError(result.message || 'Gagal generate tagihan');
        }

    } catch (error) {
        console.error('Error submitting IPL input form:', error);
        showIplInputFormError('Terjadi kesalahan saat memproses form');
    }
}

// Show inline form error (in the middle of form)
function showIplInlineFormError(message) {
    const errorDiv = document.getElementById('ipl-form-inline-error');
    if (errorDiv) {
        errorDiv.innerHTML = `<strong>${message}</strong>`;
        errorDiv.classList.remove('d-none');
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Show form error (legacy function)
function showIplInputFormError(message) {
    const errorDiv = document.getElementById('ipl-input-form-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('d-none');
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Helper functions
function getTypeDisplayName(typeTarif) {
    switch (typeTarif) {
        case 'IPL': return 'IPL Normal';
        case 'IPL_RUMAH_KOSONG': return 'IPL Rumah Kosong';
        case 'DAU': return 'DAU';
        default: return typeTarif;
    }
}

function getTariffAmount(type, tariffMap) {
    return tariffMap[type]?.nominal || 0;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Show billing summary modal after successful creation
async function showBillingSummaryModal(billingResults, hunian, periodeId, iplType) {
    try {
        // Get periode details
        const { data: periodeData, error } = await supabase
            .from('periode')
            .select('nama_periode, tanggal_awal, tanggal_akhir')
            .eq('id', periodeId)
            .single();

        if (error) throw error;

        // Get successful billing creation
        const successfulBill = billingResults.find(r => r.type === 'bill');
        if (!successfulBill) {
            showToast('Tidak ada tagihan yang berhasil dibuat', 'warning');
            return;
        }

        const billData = successfulBill.data;

        // createRecord returns an array, so get the first item
        const actualBillData = Array.isArray(billData) ? billData[0] : billData;

        // IPL type is passed as parameter

        const modalHtml = `
            <div class="text-center mb-4">
                <i class="bi bi-check-circle-fill text-success" style="font-size: 3rem;"></i>
                <h4 class="mt-3">Tagihan IPL Berhasil Dibuat!</h4>
                <p class="text-muted">Tagihan IPL telah berhasil dibuat untuk rumah yang dipilih.</p>
            </div>

            <div class="card mb-4">
                <div class="card-header">
                    <h6 class="mb-0">Detail Tagihan IPL</h6>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <table class="table table-sm">
                                <tr>
                                    <td><strong>No. Rumah:</strong></td>
                                    <td>${hunian.nomor_blok_rumah}</td>
                                </tr>
                                <tr>
                                    <td><strong>Penghuni:</strong></td>
                                    <td>${hunian.penghuni_saat_ini?.nama_kepala_keluarga || 'Tidak ada penghuni'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Periode:</strong></td>
                                    <td>${periodeData.nama_periode}</td>
                                </tr>
                                <tr>
                                    <td><strong>Status:</strong></td>
                                    <td><span class="badge bg-warning">Belum Bayar</span></td>
                                </tr>
                            </table>
                        </div>
                        <div class="col-md-6">
                            <table class="table table-sm">
                                <tr>
                                    <td><strong>Type IPL:</strong></td>
                                    <td>${getTypeDisplayName(iplType)}</td>
                                </tr>
                                <tr>
                                    <td><strong>Nominal Tagihan:</strong></td>
                                    <td><strong class="text-danger">${formatCurrency(parseFloat(actualBillData.nominal_tagihan) || 0)}</strong></td>
                                </tr>
                                <tr>
                                    <td><strong>Area:</strong></td>
                                    <td>${hunian.lorong?.nama_lorong || '-'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Status Rumah:</strong></td>
                                    <td><span class="badge bg-${hunian.status === 'berpenghuni' ? 'success' : 'secondary'}">${hunian.status}</span></td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div class="d-flex gap-2 justify-content-center">
                <button class="btn btn-primary" onclick="viewAllIplBills()">
                    <i class="bi bi-eye"></i> Lihat Semua Tagihan IPL
                </button>
                <button class="btn btn-success" onclick="createAnotherIplBill()">
                    <i class="bi bi-plus-lg"></i> Buat Tagihan Lagi
                </button>
                <button class="btn btn-secondary" onclick="closeModal()">
                    <i class="bi bi-x-lg"></i> Tutup
                </button>
            </div>
        `;

        showModal('Tagihan IPL Berhasil Dibuat', modalHtml);

    } catch (error) {
        console.error('Error showing billing summary:', error);
        showToast('Error menampilkan ringkasan tagihan', 'danger');
    }
}

// Show duplicate warning modal when bill already exists
async function showDuplicateWarningModal(billingResults, hunian, periodeId) {
    try {
        // Get periode details
        const { data: periodeData, error } = await supabase
            .from('periode')
            .select('nama_periode, tanggal_awal, tanggal_akhir')
            .eq('id', periodeId)
            .single();

        if (error) throw error;

        // Get the skipped result message
        const skippedResult = billingResults.find(r => r.type === 'skipped');
        const skipMessage = skippedResult ? skippedResult.message : 'Tagihan sudah ada';

        // Try to get existing bill details
        let existingBillInfo = '';
        try {
            const { data: existingBills, error: billError } = await supabase
                .from('tagihan_ipl')
                .select(`
                    *,
                    periode:periode_id (nama_periode),
                    penghuni:penghuni_id (nama_kepala_keluarga)
                `)
                .eq('hunian_id', hunian.id)
                .eq('periode_id', periodeId)
                .limit(1);

            if (!billError && existingBills && existingBills.length > 0) {
                const existingBill = existingBills[0];
                existingBillInfo = `
                    <div class="alert alert-info mt-3">
                        <h6><i class="bi bi-info-circle"></i> Tagihan Existing:</h6>
                        <small>
                            <strong>Status:</strong> <span class="badge bg-${existingBill.status === 'lunas' ? 'success' : existingBill.status === 'sebagian' ? 'warning' : 'danger'}">${existingBill.status}</span><br>
                            <strong>Nominal:</strong> Rp ${formatCurrency(parseFloat(existingBill.nominal_tagihan) || 0)}<br>
                            <strong>Sisa Tagihan:</strong> Rp ${formatCurrency(parseFloat(existingBill.sisa_tagihan) || 0)}
                        </small>
                    </div>
                `;
            }
        } catch (billError) {
            console.log('Could not fetch existing bill details:', billError);
        }

        const modalHtml = `
            <div class="text-center mb-4">
                <i class="bi bi-exclamation-triangle-fill text-warning" style="font-size: 3rem;"></i>
                <h4 class="mt-3">Tagihan IPL Sudah Ada</h4>
                <p class="text-muted">Tagihan IPL untuk rumah ini pada periode yang dipilih sudah pernah dibuat sebelumnya.</p>
            </div>

            <div class="card mb-4">
                <div class="card-header">
                    <h6 class="mb-0">Detail Permintaan</h6>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <table class="table table-sm">
                                <tr>
                                    <td><strong>No. Rumah:</strong></td>
                                    <td>${hunian.nomor_blok_rumah}</td>
                                </tr>
                                <tr>
                                    <td><strong>Penghuni:</strong></td>
                                    <td>${hunian.penghuni_saat_ini?.nama_kepala_keluarga || 'Tidak ada penghuni'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Periode:</strong></td>
                                    <td>${periodeData.nama_periode}</td>
                                </tr>
                            </table>
                        </div>
                        <div class="col-md-6">
                            <table class="table table-sm">
                                <tr>
                                    <td><strong>Area:</strong></td>
                                    <td>${hunian.lorong?.nama_lorong || '-'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Status Rumah:</strong></td>
                                    <td><span class="badge bg-${hunian.status === 'berpenghuni' ? 'success' : 'secondary'}">${hunian.status}</span></td>
                                </tr>
                                <tr>
                                    <td><strong>Pesan:</strong></td>
                                    <td><span class="text-warning">${skipMessage}</span></td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    ${existingBillInfo}
                </div>
            </div>

            <div class="d-flex gap-2 justify-content-center">
                <button class="btn btn-primary" onclick="viewAllIplBills()">
                    <i class="bi bi-eye"></i> Lihat Tagihan IPL
                </button>
                <button class="btn btn-success" onclick="createAnotherIplBill()">
                    <i class="bi bi-plus-lg"></i> Buat Tagihan Lain
                </button>
                <button class="btn btn-secondary" onclick="closeModal()">
                    <i class="bi bi-x-lg"></i> Tutup
                </button>
            </div>
        `;

        showModal('Tagihan IPL Sudah Ada', modalHtml);

    } catch (error) {
        console.error('Error showing duplicate warning:', error);
        showToast('Error menampilkan peringatan duplikat', 'danger');
    }
}

export {
    showInputIplForm,
    showHunianSelectionForIplInput,
    showIplInputFormForHunian,
    showIplInputForm,
    setupIplSmartAutofill
};

// Global functions for HTML onclick
window.showInputIplForm = showInputIplForm;
window.showIplInputForm = showIplInputForm;
window.selectHunianForIpl = (hunianId) => {
    // Close current modal and show IPL input form
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
    });

    setTimeout(() => showIplInputFormForHunian(hunianId), 300);
};

// Show IPL bills table after successful creation
async function showIplBillsTable() {
    try {
        // Load recent IPL bills (last 10 created bills)
        const { data: bills, error } = await supabase
            .from('tagihan_ipl')
            .select(`
                *,
                periode:periode_id (nama_periode),
                hunian:hunian_id (nomor_blok_rumah),
                penghuni:penghuni_id (nama_kepala_keluarga)
            `)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        const tableHtml = createIplBillsTableHtml(bills || []);
        const modalContent = `
            <div class="text-center mb-4">
                <i class="bi bi-receipt" style="font-size: 3rem; color: #0d6efd;"></i>
                <h4 class="mt-3">Tagihan IPL yang Telah Dibuat</h4>
                <p class="text-muted">Menampilkan 10 tagihan IPL terbaru</p>
            </div>

            <div class="table-responsive">
                ${tableHtml}
            </div>

            <div class="d-flex gap-2 justify-content-center mt-3">
                <button class="btn btn-success" onclick="createAnotherIplBill()">
                    <i class="bi bi-plus-lg"></i> Buat Tagihan Lagi
                </button>
                <button class="btn btn-secondary" onclick="closeModal()">Tutup</button>
            </div>
        `;

        showModal('Tagihan IPL Terbaru', modalContent);
    } catch (error) {
        console.error('Error showing IPL bills table:', error);
        showToast('Error memuat data tagihan IPL', 'danger');
    }
}

// Create table HTML for IPL bills
function createIplBillsTableHtml(bills) {
    let html = `
        <table class="table table-striped table-hover">
            <thead class="table-dark">
                <tr>
                    <th>Rumah</th>
                    <th>Penghuni</th>
                    <th>Periode</th>
                    <th>Tagihan</th>
                    <th>Status</th>
                    <th>Dibuat</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (bills.length > 0) {
        bills.forEach(bill => {
            const statusBadge = getStatusBadge(bill.status);
            const createdDate = new Date(bill.created_at).toLocaleDateString('id-ID');

            html += `
                <tr>
                    <td>${bill.hunian?.nomor_blok_rumah || '-'}</td>
                    <td>${bill.penghuni?.nama_kepala_keluarga || '-'}</td>
                    <td>${bill.periode?.nama_periode || '-'}</td>
                    <td class="text-end fw-bold text-danger">${formatCurrency(bill.nominal_tagihan)}</td>
                    <td>${statusBadge}</td>
                    <td>${createdDate}</td>
                </tr>
            `;
        });
    } else {
        html += `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="bi bi-inbox"></i> Belum ada tagihan IPL
                </td>
            </tr>
        `;
    }

    html += `
            </tbody>
        </table>
    `;

    return html;
}

// Get status badge for table
function getStatusBadge(status) {
    const badges = {
        'belum_bayar': '<span class="badge bg-danger">Belum Bayar</span>',
        'sebagian': '<span class="badge bg-warning text-dark">Sebagian</span>',
        'lunas': '<span class="badge bg-success">Lunas</span>'
    };
    return badges[status] || `<span class="badge bg-secondary">${status}</span>`;
}

// Navigation functions for billing summary modal
window.viewAllIplBills = () => {
    closeModal();
    // Show IPL bills table instead of navigating to separate view
    setTimeout(() => showIplBillsTable(), 300);
};

window.createAnotherIplBill = () => {
    closeModal();
    // Show IPL input form for another bill
    setTimeout(() => showIplInputForm(), 300);
};
