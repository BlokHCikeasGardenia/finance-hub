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
let hunianSearchable, penghuniSearchable;

// Arrays to store multiple period and tarif searchable selects
let periodSearchables = [];
let tarifIplSearchables = [];
let nextRowId = 2; // Start from 2 since first row is 1

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

// Create IPL input form HTML with searchable dropdowns and multiple periods
function createIplInputFormHtml() {
    return `
        <form id="ipl-input-form">
            <!-- Housing and Occupant Selection (Fixed at top) -->
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label for="ipl_hunian_id" class="form-label required-field">Nomor Rumah:</label>
                    <select class="form-select" id="ipl_hunian_id" name="hunian_id" required>
                        <option value="">Pilih Rumah</option>
                    </select>
                </div>
                <div class="col-md-6 mb-3">
                    <label for="ipl_penghuni_id" class="form-label" id="penghuni-label">Penghuni:</label>
                    <select class="form-select" id="ipl_penghuni_id" name="penghuni_id">
                        <option value="">Pilih Penghuni</option>
                    </select>
                    <div class="form-text" id="penghuni-help" style="display: none;">Opsional untuk rumah kosong</div>
                </div>
            </div>

            <!-- Multiple Periods Section -->
            <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <label class="form-label required-field">Periode dan Jenis Tarif IPL:</label>
                    <button type="button" class="btn btn-outline-primary btn-sm" id="add-period-btn">
                        <i class="bi bi-plus-lg"></i> Tambah Periode
                    </button>
                </div>

                <!-- Period rows container -->
                <div id="periods-container">
                    <!-- First period row (cannot be deleted) -->
                    <div class="period-row card mb-2" data-row-id="1">
                        <div class="card-body p-3">
                            <div class="row align-items-end">
                                <div class="col-md-5 mb-2">
                                    <label class="form-label required-field">Periode:</label>
                                    <select class="form-select period-select" name="periode_1" required>
                                        <option value="">Pilih Periode</option>
                                    </select>
                                </div>
                                <div class="col-md-5 mb-2">
                                    <label class="form-label required-field">Jenis Tarif IPL:</label>
                                    <select class="form-select tarif-select" name="tarif_1" required>
                                        <option value="">Pilih Jenis Tarif IPL</option>
                                    </select>
                                </div>
                                <div class="col-md-2 mb-2">
                                    <button type="button" class="btn btn-outline-danger btn-sm remove-period-btn d-none" disabled>
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
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
                        <strong>⚠️ Pilih rumah dan setidaknya satu periode terlebih dahulu</strong>
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
                text: `${getTypeDisplayName(item.type_tarif)} - ${formatCurrency(item.nominal)}`
            }));
        });
    }
}

// Initialize multiple period and tarif selects for dynamic rows
async function initializeMultiplePeriodSelects() {
    // Clear existing arrays
    periodSearchables = [];
    tarifIplSearchables = [];

    // Initialize first row (always exists)
    await initializePeriodRowSelects(1);

    // Setup add period button
    const addBtn = document.getElementById('add-period-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => addPeriodRow());
    }

    // Setup remove buttons for existing rows
    setupRemoveButtons();
}

// Initialize searchable selects for a specific period row
async function initializePeriodRowSelects(rowId) {
    const periodeSelect = document.querySelector(`select[name="periode_${rowId}"]`);
    const tarifSelect = document.querySelector(`select[name="tarif_${rowId}"]`);

    if (periodeSelect) {
        const periodeSearchable = new SearchableSelect(periodeSelect, {
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

        periodSearchables.push({ rowId, searchable: periodeSearchable });
    }

    if (tarifSelect) {
        const tarifSearchable = new SearchableSelect(tarifSelect, {
            placeholder: 'Pilih Jenis Tarif IPL',
            searchPlaceholder: 'Cari jenis tarif...'
        });

        tarifSearchable.loadData(async () => {
            // Get the most recent active tariff for each type (excluding 60,000)
            const tariffTypes = ['IPL', 'IPL_RUMAH_KOSONG', 'DAU'];
            const tariffs = [];

            for (const type of tariffTypes) {
                const { data, error } = await supabase
                    .from('tarif_ipl')
                    .select('id, type_tarif, nominal')
                    .eq('type_tarif', type)
                    .eq('aktif', true)
                    .neq('nominal', 60000) // Exclude 60,000 tariff
                    .order('tanggal_mulai_berlaku', { ascending: false })
                    .limit(1);

                if (!error && data && data.length > 0) {
                    tariffs.push(data[0]);
                }
            }

            return tariffs.map(item => ({
                value: item.id,
                text: `${getTypeDisplayName(item.type_tarif)} - ${formatCurrency(item.nominal)}`
            }));
        });

        tarifIplSearchables.push({ rowId, searchable: tarifSearchable });
    }
}

// Add a new period row
function addPeriodRow() {
    const container = document.getElementById('periods-container');
    if (!container) return;

    const rowId = nextRowId++;
    const rowHtml = createPeriodRowHtml(rowId);

    // Insert before the last child (to maintain order)
    const rows = container.querySelectorAll('.period-row');
    const lastRow = rows[rows.length - 1];
    lastRow.insertAdjacentHTML('afterend', rowHtml);

    // Initialize selects for the new row
    setTimeout(() => {
        initializePeriodRowSelects(rowId);
        setupRemoveButtons(); // Re-setup remove buttons
        updatePreview(); // Update preview with new row
    }, 100);
}

// Remove a period row
function removePeriodRow(rowId) {
    const row = document.querySelector(`.period-row[data-row-id="${rowId}"]`);
    if (!row) return;

    // Remove from searchable arrays
    periodSearchables = periodSearchables.filter(item => item.rowId !== rowId);
    tarifIplSearchables = tarifIplSearchables.filter(item => item.rowId !== rowId);

    // Remove the row
    row.remove();

    // Update preview after removal
    updatePreview();
}

// Create HTML for a period row
function createPeriodRowHtml(rowId) {
    return `
        <div class="period-row card mb-2" data-row-id="${rowId}">
            <div class="card-body p-3">
                <div class="row align-items-end">
                    <div class="col-md-5 mb-2">
                        <label class="form-label required-field">Periode:</label>
                        <select class="form-select period-select" name="periode_${rowId}" required>
                            <option value="">Pilih Periode</option>
                        </select>
                    </div>
                    <div class="col-md-5 mb-2">
                        <label class="form-label required-field">Jenis Tarif IPL:</label>
                        <select class="form-select tarif-select" name="tarif_${rowId}" required>
                            <option value="">Pilih Jenis Tarif IPL</option>
                        </select>
                    </div>
                    <div class="col-md-2 mb-2">
                        <button type="button" class="btn btn-outline-danger btn-sm remove-period-btn" data-row-id="${rowId}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Setup remove buttons for all rows
function setupRemoveButtons() {
    const removeButtons = document.querySelectorAll('.remove-period-btn');
    removeButtons.forEach(btn => {
        // Remove existing listeners
        btn.replaceWith(btn.cloneNode(true));
    });

    // Add new listeners
    const newRemoveButtons = document.querySelectorAll('.remove-period-btn');
    newRemoveButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const rowId = parseInt(e.currentTarget.getAttribute('data-row-id'));
            removePeriodRow(rowId);
        });
    });
}

// Attach form event listeners
async function attachIplInputFormEventListeners() {
    const form = document.getElementById('ipl-input-form');

    if (!form) return;

    // Setup smart autofill
    setupIplSmartAutofill();

    // Setup multiple period selects
    initializeMultiplePeriodSelects();

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
                updatePenghuniFieldRequirement(false); // Reset to optional
                isAutofilling = false;
                return;
            }

            try {
                // Get current resident and status for this house
                const { data, error } = await supabase
                    .from('hunian')
                    .select('status, penghuni_saat_ini:penghuni_saat_ini_id (id, nama_kepala_keluarga)')
                    .eq('id', hunianId)
                    .single();

                const isEmptyHouse = data?.status === 'kosong';
                updatePenghuniFieldRequirement(isEmptyHouse);

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
                updatePenghuniFieldRequirement(false); // Reset to optional on error
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

// Global function to update preview (accessible from other functions)
window.updatePreview = updatePreview;

// Setup preview updates for multiple bills
function setupIplPreviewUpdates() {
    // Add change listeners to main selects
    if (hunianSearchable) hunianSearchable.selectElement.addEventListener('change', updatePreview);
    if (penghuniSearchable) penghuniSearchable.selectElement.addEventListener('change', updatePreview);

    // Add listeners for dynamic period selects
    document.addEventListener('change', (e) => {
        if (e.target.matches('.period-select, .tarif-select')) {
            updatePreview();
        }
    });

    // Initial preview update
    updatePreview();
}

// Update preview for multiple bills
async function updatePreview() {
    const previewContainer = document.getElementById('preview-container');
    const previewContent = document.getElementById('preview-content');

    if (!previewContainer || !previewContent) return;

    const hunianId = hunianSearchable?.getValue();
    const penghuniId = penghuniSearchable?.getValue();

    // Check if basic fields are complete
    if (!hunianId) {
        previewContainer.className = 'alert alert-warning';
        previewContent.innerHTML = '<strong>⚠️ Pilih rumah dan setidaknya satu periode terlebih dahulu</strong>';
        return;
    }

    // Check if penghuni is required for occupied houses
    let penghuniRequired = true;
    if (penghuniId === '') {
        const hunianStatusData = await getHunianData(hunianId);
        const isEmptyHouse = hunianStatusData?.status === 'kosong';
        if (isEmptyHouse) {
            penghuniRequired = false; // penghuni is optional for empty houses
        }
    }

    if (penghuniRequired && !penghuniId) {
        previewContainer.className = 'alert alert-warning';
        previewContent.innerHTML = '<strong>⚠️ Pilih rumah dan setidaknya satu periode terlebih dahulu</strong>';
        return;
    }

    // Collect all period-tarif combinations
    const billPreviews = [];
    let totalAmount = 0;
    let hasIncompleteRows = false;

    for (const periodItem of periodSearchables) {
        const periodeId = periodItem.searchable.getValue();
        const tarifItem = tarifIplSearchables.find(t => t.rowId === periodItem.rowId);

        if (!periodeId || !tarifItem || !tarifItem.searchable.getValue()) {
            hasIncompleteRows = true;
            continue;
        }

        const tarifId = tarifItem.searchable.getValue();

        try {
            // Get periode and tariff details
            const [periodeData, tarifData] = await Promise.all([
                supabase.from('periode').select('nama_periode').eq('id', periodeId).single(),
                supabase.from('tarif_ipl').select('type_tarif, nominal').eq('id', tarifId).single()
            ]);

            const periode = periodeData.data;
            const tarif = tarifData.data;

            if (periode && tarif) {
                const amount = parseFloat(tarif.nominal) || 0;
                totalAmount += amount;

                billPreviews.push({
                    periode: periode.nama_periode,
                    type: getTypeDisplayName(tarif.type_tarif),
                    amount: amount
                });
            }
        } catch (error) {
            console.error('Error getting preview data:', error);
            hasIncompleteRows = true;
        }
    }

    // Get hunian details
    let hunianData;
    try {
        const result = await supabase.from('hunian').select('nomor_blok_rumah').eq('id', hunianId).single();
        hunianData = result.data;
    } catch (error) {
        console.error('Error getting hunian data:', error);
    }

    // Get penghuni details if available
    let penghuniData;
    if (penghuniId) {
        try {
            const result = await supabase.from('penghuni').select('nama_kepala_keluarga').eq('id', penghuniId).single();
            penghuniData = result.data;
        } catch (error) {
            console.error('Error getting penghuni data:', error);
        }
    }

    // Show preview based on collected data
    if (billPreviews.length === 0) {
        previewContainer.className = 'alert alert-warning';
        previewContent.innerHTML = '<strong>⚠️ Pilih rumah dan setidaknya satu periode terlebih dahulu</strong>';
        return;
    }

    // Show detailed preview for all bills
    previewContainer.className = 'alert alert-success';

    let previewHtml = `
        <div class="row">
            <div class="col-md-6">
                <div class="mb-2"><strong>🏠 No Rumah:</strong> ${hunianData?.nomor_blok_rumah || '-'}</div>
                <div class="mb-2"><strong>👤 Penghuni:</strong> ${penghuniData?.nama_kepala_keluarga || '-'}</div>
            </div>
            <div class="col-md-6">
                <div class="mb-2"><strong>📋 Total Tagihan:</strong> <span class="text-primary fw-bold">${formatCurrency(totalAmount)}</span></div>
                <div class="mb-2"><strong>📄 Jumlah Periode:</strong> ${billPreviews.length}</div>
            </div>
        </div>
        <hr>
        <div class="mb-0"><strong>Detail Tagihan:</strong></div>
        <div style="max-height: 200px; overflow-y: auto;">
    `;

    billPreviews.forEach((bill, index) => {
        previewHtml += `
            <div class="d-flex justify-content-between align-items-center py-1 border-bottom">
                <small><strong>${index + 1}. ${bill.periode}</strong> - ${bill.type}</small>
                <small class="text-primary fw-bold">${formatCurrency(bill.amount)}</small>
            </div>
        `;
    });

    previewHtml += '</div>';

    if (hasIncompleteRows) {
        previewHtml += '<div class="mt-2"><small class="text-muted">⚠️ Beberapa baris periode belum lengkap</small></div>';
    }

    previewContent.innerHTML = previewHtml;
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

    // Reset field requirements
    updatePenghuniFieldRequirement(false);

    // Clear main SearchableSelect components
    if (hunianSearchable) hunianSearchable.setValue('');
    if (penghuniSearchable) penghuniSearchable.setValue('');

    // Remove all additional period rows (keep only the first one)
    const container = document.getElementById('periods-container');
    if (container) {
        const rows = container.querySelectorAll('.period-row');
        // Remove all rows except the first one
        for (let i = 1; i < rows.length; i++) {
            rows[i].remove();
        }

        // Reset the first row selects
        const firstPeriodSelect = container.querySelector('select[name="periode_1"]');
        const firstTarifSelect = container.querySelector('select[name="tarif_1"]');

        if (firstPeriodSelect && periodSearchables[0]?.searchable) {
            periodSearchables[0].searchable.setValue('');
        }
        if (firstTarifSelect && tarifIplSearchables[0]?.searchable) {
            tarifIplSearchables[0].searchable.setValue('');
        }
    }

    // Reset arrays and counters
    periodSearchables = periodSearchables.slice(0, 1); // Keep only first item
    tarifIplSearchables = tarifIplSearchables.slice(0, 1); // Keep only first item
    nextRowId = 2; // Reset counter

    // Re-setup remove buttons (first row should not have remove button)
    setupRemoveButtons();

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
    previewAmount.textContent = formatCurrency(parseFloat(amount));
}

// Handle form submission for multiple bills
async function handleIplInputFormSubmit() {
    try {
        // Get main form values
        const hunianId = hunianSearchable?.getValue();
        const penghuniId = penghuniSearchable?.getValue();

        // Validate main fields
        if (!hunianId) {
            showIplInlineFormError('Mohon pilih rumah terlebih dahulu');
            return;
        }

        // Check if penghuni is required (only for occupied houses)
        const hunianStatusData = await getHunianData(hunianId);
        const isEmptyHouse = hunianStatusData?.status === 'kosong';
        if (!isEmptyHouse && !penghuniId) {
            showIplInlineFormError('Mohon pilih penghuni untuk rumah berpenghuni');
            return;
        }

        // Collect all period-tarif combinations
        const billRequests = [];
        const periodIds = new Set(); // For duplicate validation

        for (const periodItem of periodSearchables) {
            const periodeId = periodItem.searchable.getValue();
            const tarifItem = tarifIplSearchables.find(t => t.rowId === periodItem.rowId);
            const tarifId = tarifItem?.searchable.getValue();

            // Skip incomplete rows
            if (!periodeId || !tarifId) {
                continue;
            }

            // Check for duplicate periods in form
            if (periodIds.has(periodeId)) {
                showIplInlineFormError('Tidak boleh ada periode yang sama dalam satu form');
                return;
            }
            periodIds.add(periodeId);

            // Check if bill already exists for this household and period
            const existingBill = await checkExistingBill(hunianId, periodeId);
            if (existingBill) {
                showIplInlineFormError(`Tagihan IPL sudah ada untuk periode ini. Silakan pilih periode yang berbeda.`);
                return;
            }

            billRequests.push({
                periodeId,
                tarifId
            });
        }

        // Validate that at least one complete period row exists
        if (billRequests.length === 0) {
            showIplInlineFormError('Mohon lengkapi setidaknya satu baris periode dan jenis tarif IPL');
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

        // Process each bill request
        const results = [];
        let totalCreated = 0;
        let totalSkipped = 0;

        for (const request of billRequests) {
            try {
                // Get tariff details for this request
                const { data: tariffData, error: tariffError } = await supabase
                    .from('tarif_ipl')
                    .select('type_tarif, nominal')
                    .eq('id', request.tarifId)
                    .single();

                if (tariffError || !tariffData) {
                    results.push({
                        periodeId: request.periodeId,
                        success: false,
                        message: 'Data tarif IPL tidak ditemukan'
                    });
                    continue;
                }

                // Create billing data for this household with selected tariff type and penghuni
                const billingData = [{
                    ...hunian,
                    selectedType: tariffData.type_tarif,
                    selectedPenghuniId: penghuniId // Use the selected penghuni from form
                }];

                // Generate bill for this specific period
                const result = await generateTagihanIplForPeriod(billingData, request.periodeId);

                if (result.success) {
                    totalCreated += result.count;
                    totalSkipped += result.skippedCount;
                    results.push({
                        periodeId: request.periodeId,
                        success: true,
                        count: result.count,
                        skipped: result.skippedCount
                    });
                } else {
                    results.push({
                        periodeId: request.periodeId,
                        success: false,
                        message: result.message || 'Gagal generate tagihan'
                    });
                }

            } catch (error) {
                console.error('Error processing bill request:', error);
                results.push({
                    periodeId: request.periodeId,
                    success: false,
                    message: 'Terjadi kesalahan saat memproses'
                });
            }
        }

        // Check results
        const successfulResults = results.filter(r => r.success);
        const failedResults = results.filter(r => !r.success);

        if (successfulResults.length > 0) {
            // Reset form for next input
            resetIplInputForm();

            // Show success message
            let message = `Tagihan IPL berhasil dibuat (${totalCreated} tagihan)`;
            if (totalSkipped > 0) {
                message += `, ${totalSkipped} dilewati (sudah ada)`;
            }
            showToast(message, 'success');

            // Refresh the IPL bills table to show new bills
            if (window.loadIplBillsManagement) {
                window.loadIplBillsManagement();
            }

            // Show detailed results if there were failures
            if (failedResults.length > 0) {
                showToast(`${failedResults.length} tagihan gagal dibuat`, 'warning');
            }

        } else {
            // All failed
            showIplInlineFormError('Semua tagihan IPL gagal dibuat. Silakan coba lagi.');
        }

    } catch (error) {
        console.error('Error submitting IPL input form:', error);
        showIplInlineFormError('Terjadi kesalahan saat memproses form');
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

// Update penghuni field requirement based on house status
function updatePenghuniFieldRequirement(isEmptyHouse) {
    const label = document.getElementById('penghuni-label');
    const help = document.getElementById('penghuni-help');

    if (label && help) {
        if (isEmptyHouse) {
            label.textContent = 'Penghuni (Opsional):';
            help.style.display = 'block';
        } else {
            label.textContent = 'Penghuni:';
            help.style.display = 'none';
        }
    }
}

// Check if bill already exists for household and period
async function checkExistingBill(hunianId, periodeId) {
    try {
        const { data, error } = await supabase
            .from('tagihan_ipl')
            .select('id')
            .eq('hunian_id', hunianId)
            .eq('periode_id', periodeId)
            .limit(1);

        if (error) throw error;
        return data && data.length > 0;
    } catch (error) {
        console.error('Error checking existing bill:', error);
        return false;
    }
}

// Get hunian data for status check
async function getHunianData(hunianId) {
    try {
        const { data, error } = await supabase
            .from('hunian')
            .select('status')
            .eq('id', hunianId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error getting hunian data:', error);
        return null;
    }
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
                            <strong>Nominal:</strong> ${formatCurrency(parseFloat(existingBill.nominal_tagihan) || 0)}<br>
                            <strong>Sisa Tagihan:</strong> ${formatCurrency(parseFloat(existingBill.sisa_tagihan) || 0)}
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
