// Dana Titipan form module
// Handles form creation, validation, and submission

import { showModal, closeModal, SearchableSelect } from '../../ui.js';
import { showToast, formatNumberInput, parseFormattedNumber } from '../../utils.js';
import {
    addDanaTitipan,
    updateDanaTitipan,
    loadDanaTitipan,
    generateTransactionId,
    getKategoriOptions,
    getRekeningOptions,
    getPenghuniOptions,
    getHunianOptions,
    getPeriodeOptions
} from './dana_titipan-data.js';

// Show add form for dana_titipan
function showAddDanaTitipanForm() {
    const formHtml = createDanaTitipanFormHtml();
    showModal('Tambah Dana Titipan', formHtml);

    setTimeout(() => {
        initializeDanaTitipanFormSelects();
        attachDanaTitipanFormEventListeners(false);
    }, 100);
}

// Show edit form for dana_titipan
async function showEditDanaTitipanForm(id) {
    try {
        const { readRecords } = await import('../../crud.js');

        const { success, data } = await readRecords('dana_titipan', {
            filters: { id },
            select: `*,
                     penghuni:penghuni_id (nama_kepala_keluarga),
                     hunian:hunian_id (nomor_blok_rumah),
                     rekening:rekening_id (jenis_rekening)`
        });

        if (!success || !data || data.length === 0) {
            showToast('Data dana titipan tidak ditemukan', 'warning');
            return;
        }

        const danaTitipan = data[0];
        const formHtml = createDanaTitipanFormHtml(danaTitipan);
        showModal('Edit Dana Titipan', formHtml);

        setTimeout(() => {
            initializeDanaTitipanFormSelects();
            populateDanaTitipanFormValues(danaTitipan);
            attachDanaTitipanFormEventListeners(true, danaTitipan.id);
        }, 100);

    } catch (error) {
        console.error('Error loading dana titipan for edit:', error);
        showToast('Error loading data', 'danger');
    }
}

// Create HTML for dana_titipan form
function createDanaTitipanFormHtml(danaTitipan = null) {
    const isEdit = !!danaTitipan;
    const today = new Date().toISOString().split('T')[0];

    // Load categories for the form (async update after render)
    const categories = danaTitipan ? [] : [];
    getKategoriOptions().then(cats => {
        categories.splice(0, categories.length, ...cats);
        updateFormCategories(categories, danaTitipan?.kategori_id || '');
    }).catch(console.error);

    return `
        <div id="dana_titipan-form-error" class="alert alert-danger d-none" role="alert"></div>
        <form id="dana_titipan-form">
            <div class="mb-3">
                <label for="id_transaksi" class="form-label">ID Transaksi:</label>
                <input type="text" class="form-control" id="id_transaksi" readonly>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="tanggal" class="form-label required-field">Tanggal:</label>
                        <input type="date" class="form-control" id="tanggal" name="tanggal"
                               value="${danaTitipan?.tanggal || today}" required>
                    </div>

                    <div class="mb-3">
                        <label for="nominal" class="form-label required-field">Nominal:</label>
                        <input type="text" class="form-control" id="nominal" name="nominal" placeholder="0" required>
                    </div>

                    <div class="mb-3">
                        <label for="kategori_id" class="form-label">Kategori:</label>
                        <select class="form-select" id="kategori_id" name="kategori_id">
                            <option value="">Pilih Kategori</option>
                            ${categories.map(cat =>
                                `<option value="${cat.id}" ${danaTitipan?.kategori_id === cat.id ? 'selected' : ''}>${cat.name}</option>`
                            ).join('')}
                        </select>
                    </div>

                    <div class="mb-3">
                        <label for="periode_id" class="form-label">Periode:</label>
                        <select class="form-select" id="periode_id" name="periode_id">
                            <option value="">Pilih Periode</option>
                        </select>
                    </div>

                    <div class="mb-3">
                        <label for="rekening_id" class="form-label required-field">Rekening:</label>
                        <select class="form-select" id="rekening_id" name="rekening_id">
                            <option value="">Pilih Rekening</option>
                        </select>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="penghuni_id" class="form-label">Penghuni:</label>
                        <select class="form-select" id="penghuni_id" name="penghuni_id">
                            <option value="">Tidak terkait penghuni</option>
                        </select>
                    </div>

                    <div class="mb-3">
                        <label for="hunian_id" class="form-label">Hunian:</label>
                        <select class="form-select" id="hunian_id" name="hunian_id">
                            <option value="">Tidak terkait hunian</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="mb-3">
                <label for="keterangan" class="form-label">Keterangan:</label>
                <textarea class="form-control" id="keterangan" name="keterangan" rows="3"
                          placeholder="Detail dana titipan">${danaTitipan?.keterangan || ''}</textarea>
            </div>

            <div class="d-flex gap-2">
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Simpan'}</button>
                <button type="button" class="btn btn-warning" onclick="resetDanaTitipanForm()">Reset</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
            </div>
        </form>
    `;
}

// Helper function to update form categories after async load
function updateFormCategories(categories, selectedValue = '') {
    const categorySelect = document.getElementById('kategori_id');
    if (categorySelect) {
        const optionsHtml = '<option value="">Pilih Kategori</option>' +
            categories.map(cat =>
                `<option value="${cat.id}" ${cat.id === selectedValue ? 'selected' : ''}>${cat.name}</option>`
            ).join('');
        categorySelect.innerHTML = optionsHtml;
    }
}

// Initialize searchable selects in form with smart auto-fill
let penghuniSearchable, hunianSearchable, kategoriSearchable, rekeningSearchable, periodeSearchable;
async function initializeDanaTitipanFormSelects() {
    try {
        // Load and initialize SearchableSelect for rekening
        const rekeningOptions = await getRekeningOptions();
        const rekeningSelect = document.getElementById('rekening_id');
        if (rekeningSelect) {
            rekeningSearchable = new SearchableSelect(rekeningSelect, {
                placeholder: 'Pilih Rekening',
                searchPlaceholder: 'Cari nama rekening...'
            });
            await rekeningSearchable.loadData(async () => rekeningOptions.map(opt => ({ value: opt.value, text: opt.text })));
        }

        // Load and initialize penghuni searchable
        const penghuniOptions = await getPenghuniOptions();
        const penghuniSelect = document.getElementById('penghuni_id');
        if (penghuniSelect) {
            penghuniSearchable = new SearchableSelect(penghuniSelect, {
                placeholder: 'Pilih Penghuni',
                searchPlaceholder: 'Cari nama penghuni...'
            });
            await penghuniSearchable.loadData(async () => penghuniOptions.map(opt => ({ value: opt.value, text: opt.text })));
        }

        // Load hunian options for hunian select
        const hunianOptions = await getHunianOptions();
        const hunianSelect = document.getElementById('hunian_id');
        if (hunianSelect) {
            hunianSearchable = new SearchableSelect(hunianSelect, {
                placeholder: 'Pilih Hunian',
                searchPlaceholder: 'Cari nomor rumah...'
            });
            await hunianSearchable.loadData(async () => hunianOptions.map(opt => ({ value: opt.value, text: opt.text })));
        }

        // Load kategori options as searchable select
        const kategoriOptions = await getKategoriOptions();
        const kategoriSelect = document.getElementById('kategori_id');
        if (kategoriSelect) {
            kategoriSearchable = new SearchableSelect(kategoriSelect, {
                placeholder: 'Pilih Kategori',
                searchPlaceholder: 'Cari kategori...'
            });
            await kategoriSearchable.loadData(async () => kategoriOptions.map(opt => ({ value: opt.id || opt.value, text: opt.name || opt.text })));
        }

        // Load periode options as searchable select
        const periodeOptions = await getPeriodeOptions();
        const periodeSelect = document.getElementById('periode_id');
        if (periodeSelect) {
            periodeSearchable = new SearchableSelect(periodeSelect, {
                placeholder: 'Pilih Periode',
                searchPlaceholder: 'Cari periode...'
            });
            await periodeSearchable.loadData(async () => periodeOptions.map(opt => ({ value: opt.value, text: opt.text })));
        }

        // Initialize advanced number formatting for nominal input
        initializeAdvancedNumberFormatting();

        // Setup smart auto-fill functionality
        setupSmartAutoFill();

    } catch (error) {
        console.error('Error loading form select options:', error);
        showToast('Error loading form data', 'danger');
    }
}

// Initialize advanced number formatting with cursor preservation
function initializeAdvancedNumberFormatting() {
    const nominalInput = document.getElementById('nominal');
    if (!nominalInput) return;

    // Format on input
    nominalInput.addEventListener('input', function(e) {
        let value = e.target.value;

        // Store raw value for database storage
        nominalInput.dataset.rawValue = parseFormattedNumber(value);

        // Format for display without storing formatted string in the value
        const formattedValue = formatNumberInput(value);
        if (formattedValue !== value) {
            const cursorPos = e.target.selectionStart;
            e.target.value = formattedValue;
            // Restore cursor position approximately
            setTimeout(() => {
                e.target.setSelectionRange(cursorPos, cursorPos);
            }, 0);
        }
    });

    // Handle focus/blur to clean up formatting
    nominalInput.addEventListener('blur', function(e) {
        const rawValue = e.target.dataset.rawValue || e.target.value;
        e.target.dataset.rawValue = rawValue > 0 ? rawValue : '';
        e.target.value = rawValue > 0 ? rawValue : '';
    });

    nominalInput.addEventListener('focus', function(e) {
        const rawValue = e.target.dataset.rawValue || e.target.value;
        const formattedValue = formatNumberInput(rawValue);
        if (formattedValue) {
            e.target.value = formattedValue;
            e.target.setSelectionRange(formattedValue.length, formattedValue.length);
        }
    });
}

// Setup smart auto-fill functionality for penghuni ↔ hunian
function setupSmartAutoFill() {
    if (!penghuniSearchable || !hunianSearchable) return;

    // Helper function to get penghuni data from hunian
    async function getPenghuniByHunian(hunianId) {
        try {
            const { readRecords } = await import('../../crud.js');
            const { success, data } = await readRecords('hunian', {
                filters: { id: hunianId },
                select: `*, penghuni:penghuni_saat_ini_id (nama_kepala_keluarga, id)`
            });

            if (success && data.length > 0) {
                const hunian = data[0];
                if (hunian.penghuni) {
                    return {
                        id: hunian.penghuni.id,
                        nama: hunian.penghuni.nama_kepala_keluarga
                    };
                }
            }
            return null;
        } catch (error) {
            console.warn('Error getting penghuni by hunian:', error);
            return null;
        }
    }

    // Helper function to get hunian data from penghuni
    async function getHunianByPenghuni(penghuniId) {
        try {
            const { readRecords } = await import('../../crud.js');
            // Query hunian table where penghuni_saat_ini_id matches the penghuniId
            const { success, data } = await readRecords('hunian', {
                filters: { penghuni_saat_ini_id: penghuniId },
                select: `*, lorong:lorong_id (nama_lorong)`
            });

            if (success && data.length > 0) {
                const hunian = data[0];
                if (hunian) {
                    return {
                        id: hunian.id,
                        lokasi: `${hunian.nomor_blok_rumah} (${hunian.lorong?.nama_lorong || 'N/A'})`
                    };
                }
            }
            return null;
        } catch (error) {
            console.warn('Error getting hunian by penghuni:', error);
            return null;
        }
    }

    // Auto-fill penghuni when hunian is selected
    hunianSearchable.selectElement.addEventListener('change', async function() {
        const hunianId = hunianSearchable.getValue();
        if (!hunianId) return;

        const penghuni = await getPenghuniByHunian(hunianId);
        if (penghuni) {
            // Find the option in penghuni dropdown and select it
            const options = penghuniSearchable.data;
            const optionToSelect = options.find(opt => opt.value === penghuni.id.toString());
            if (optionToSelect) {
                penghuniSearchable.setValue(optionToSelect.value);
            }
        }
    });

    // Auto-fill hunian when penghuni is selected
    penghuniSearchable.selectElement.addEventListener('change', async function() {
        const penghuniId = penghuniSearchable.getValue();
        if (!penghuniId) return;

        const hunian = await getHunianByPenghuni(penghuniId);
        if (hunian) {
            // Find the option in hunian dropdown and select it
            const options = hunianSearchable.data;
            const optionToSelect = options.find(opt => opt.value === hunian.id.toString());
            if (optionToSelect) {
                hunianSearchable.setValue(optionToSelect.value);
            }
        }
    });
}

// Populate form values for editing
function populateDanaTitipanFormValues(danaTitipan) {
    // Set transaction ID
    const transactionIdField = document.getElementById('id_transaksi');
    if (transactionIdField) transactionIdField.value = danaTitipan.id_transaksi || '';

    // Set basic form fields
    const tanggalField = document.getElementById('tanggal');
    if (tanggalField) tanggalField.value = danaTitipan.tanggal || '';

    const nominalField = document.getElementById('nominal');
    if (nominalField) {
        const nominalValue = danaTitipan.nominal ? danaTitipan.nominal.toString() : '';
        nominalField.value = nominalValue;
        nominalField.dataset.rawValue = nominalValue;
    }

    const keteranganField = document.getElementById('keterangan');
    if (keteranganField) keteranganField.value = danaTitipan.keterangan || '';

    // Set SearchableSelect values for dropdowns after they initialize
    setTimeout(() => {
        if (kategoriSearchable && danaTitipan.kategori_id) {
            kategoriSearchable.setValue(danaTitipan.kategori_id.toString());
        }
        if (periodeSearchable && danaTitipan.periode_id) {
            periodeSearchable.setValue(danaTitipan.periode_id.toString());
        }
        if (rekeningSearchable && danaTitipan.rekening_id) {
            rekeningSearchable.setValue(danaTitipan.rekening_id.toString());
        }
        if (penghuniSearchable && danaTitipan.penghuni_id) {
            penghuniSearchable.setValue(danaTitipan.penghuni_id.toString());
        }
        if (hunianSearchable && danaTitipan.hunian_id) {
            hunianSearchable.setValue(danaTitipan.hunian_id.toString());
        }
    }, 500);
}

// Attach form event listeners
function attachDanaTitipanFormEventListeners(isEdit, editId = null) {
    const form = document.getElementById('dana_titipan-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleDanaTitipanFormSubmit(isEdit, editId);
    });
}

// Handle form submission
async function handleDanaTitipanFormSubmit(isEdit, editId) {
    try {
        const formData = await collectDanaTitipanFormData(isEdit);
        if (!formData) return; // Error in form data collection

        let result;
        if (isEdit && editId) {
            result = await updateDanaTitipan(editId, formData);
        } else {
            result = await addDanaTitipan(formData);
        }

        if (result.success) {
            closeModal();
            await loadDanaTitipan();
            showToast(`Dana titipan ${isEdit ? 'updated' : 'added'} successfully`, 'success');
        } else {
            showDanaTitipanFormError('Error: ' + result.message);
        }

    } catch (error) {
        console.error('Form submission error:', error);
        showDanaTitipanFormError(error.message || 'Terjadi kesalahan saat menyimpan data');
    }
}

// Collect form data
async function collectDanaTitipanFormData(isEdit) {
    try {
        const tanggalEl = document.getElementById('tanggal');
        const tanggal = tanggalEl ? tanggalEl.value : '';

        // Use raw value for database storage instead of formatted display value
        const nominalEl = document.getElementById('nominal');
        const nominal = nominalEl ? parseFloat(nominalEl.dataset.rawValue || parseFormattedNumber(nominalEl.value) || 0) : 0;

        const kategoriEl = document.getElementById('kategori_id');
        const kategoriId = kategoriEl ? kategoriEl.value : '';

        const rekeningEl = document.getElementById('rekening_id');
        const rekeningId = rekeningEl ? rekeningEl.value : '';

        const penghuniEl = document.getElementById('penghuni_id');
        const penghuniId = penghuniEl ? penghuniEl.value : '';

        const hunianEl = document.getElementById('hunian_id');
        const hunianId = hunianEl ? hunianEl.value : '';

        const keteranganEl = document.getElementById('keterangan');
        const keterangan = keteranganEl ? keteranganEl.value.trim() : '';

        // Validation
        if (!tanggal) {
            showDanaTitipanFormError('Tanggal harus diisi');
            return null;
        }

        if (isNaN(nominal) || nominal <= 0) {
            showDanaTitipanFormError('Nominal harus angka positif');
            return null;
        }

        if (!rekeningId) {
            showDanaTitipanFormError('Rekening harus dipilih');
            return null;
        }

        // Required fields
        const formData = {
            tanggal,
            nominal,
            rekening_id: rekeningId,
            keterangan
        };

        // Optional fields
        if (kategoriId) formData.kategori_id = kategoriId;

        // Generate transaction ID for new records
        if (!isEdit) {
            formData.id_transaksi = await generateTransactionId();
        }

        // Optional fields
        if (penghuniId) formData.penghuni_id = penghuniId;
        if (hunianId) formData.hunian_id = hunianId;

        // Get periode value
        const periodeEl = document.getElementById('periode_id');
        const periodeId = periodeEl ? periodeEl.value : '';
        if (periodeId) formData.periode_id = periodeId;

        return formData;
    } catch (error) {
        console.error('Error collecting form data:', error);
        showDanaTitipanFormError('Gagal mengumpulkan data form');
        return null;
    }
}

// Show form error
function showDanaTitipanFormError(message) {
    const errorDiv = document.getElementById('dana_titipan-form-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('d-none');
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Reset dana titipan form including SearchableSelect components
function resetDanaTitipanForm() {
    const form = document.getElementById('dana_titipan-form');
    if (!form) return;

    // Reset native form fields
    form.reset();

    // Reset transaction ID field
    const transactionIdField = document.getElementById('id_transaksi');
    if (transactionIdField) {
        transactionIdField.value = '';
    }

    // Clear any form errors
    const errorDiv = document.getElementById('dana_titipan-form-error');
    if (errorDiv) {
        errorDiv.classList.add('d-none');
    }

    // Reset SearchableSelect components with delay to ensure they're ready
    setTimeout(() => {
        if (penghuniSearchable) {
            penghuniSearchable.setValue('');
        }
        if (hunianSearchable) {
            hunianSearchable.setValue('');
        }
        if (kategoriSearchable) {
            kategoriSearchable.setValue('');
        }
        if (periodeSearchable) {
            periodeSearchable.setValue('');
        }
        if (rekeningSearchable) {
            rekeningSearchable.setValue('');
        }

        // Also reset the underlying select elements directly
        const penghuniSelect = document.getElementById('penghuni_id');
        const hunianSelect = document.getElementById('hunian_id');
        const kategoriSelect = document.getElementById('kategori_id');
        const periodeSelect = document.getElementById('periode_id');
        const rekeningSelect = document.getElementById('rekening_id');

        if (penghuniSelect) penghuniSelect.value = '';
        if (hunianSelect) hunianSelect.value = '';
        if (kategoriSelect) kategoriSelect.value = '';
        if (periodeSelect) periodeSelect.value = '';
        if (rekeningSelect) rekeningSelect.value = '';
    }, 100);

    showToast('Form berhasil direset', 'info');
}

// Confirm delete dana_titipan
async function confirmDeleteDanaTitipan(id) {
    let showConfirm;
    try {
        const utils = await import('../../utils.js');
        showConfirm = utils.showConfirm;
    } catch (error) {
        showConfirm = () => Promise.resolve(true);
    }

    const confirmed = await showConfirm('Apakah Anda yakin ingin menghapus dana titipan ini?');
    if (confirmed) {
        const { deleteDanaTitipan } = await import('./dana_titipan-data.js');
        const result = await deleteDanaTitipan(id);
        if (result.success) {
            await loadDanaTitipan();
            showToast('Dana titipan berhasil dihapus', 'success');
        } else {
            showToast('Error deleting: ' + result.error, 'danger');
        }
    }
}

export {
    showAddDanaTitipanForm,
    showEditDanaTitipanForm,
    createDanaTitipanFormHtml,
    initializeDanaTitipanFormSelects,
    populateDanaTitipanFormValues,
    attachDanaTitipanFormEventListeners,
    handleDanaTitipanFormSubmit,
    collectDanaTitipanFormData,
    showDanaTitipanFormError,
    confirmDeleteDanaTitipan
};

// Global function for HTML onclick
window.resetDanaTitipanForm = resetDanaTitipanForm;
