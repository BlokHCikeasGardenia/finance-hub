// Pengeluaran form handling module
// Handles form creation, submission, and dynamic subcategory loading

import { supabase } from '../../config.js';
import {
    showModal,
    closeModal
} from '../../ui.js';
import {
    getPengeluaranData,
    getPengeluaranCategories,
    addPengeluaran,
    updatePengeluaran,
    deletePengeluaran,
    generateTransactionId,
    loadPengeluaran,
    loadPengeluaranSubcategories,
    getPengeluaranSubcategories,
    getRekeningOptions
} from './pengeluaran-data.js';
import { showConfirm, showToast, formatNumberInput, parseFormattedNumber } from '../../utils.js';

// Form functions
function showAddPengeluaranForm() {
    const categories = getPengeluaranCategories();
    const today = new Date().toISOString().split('T')[0];

    const formHtml = `
        <div id="pengeluaran-form-error" class="alert alert-danger d-none" role="alert"></div>
        <form id="pengeluaran-form">
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="tanggal" class="form-label required-field">Tanggal:</label>
                        <input type="date" class="form-control" id="tanggal" name="tanggal" value="${today}" required>
                    </div>

                    <div class="mb-3">
                        <label for="nominal" class="form-label required-field">Nominal:</label>
                        <input type="text" class="form-control" id="nominal" name="nominal" required>
                    </div>

                    <div class="mb-3">
                        <label for="kategori_id" class="form-label required-field">Kategori:</label>
                        <select class="form-select" id="kategori_id" name="kategori_id" required>
                            <option value="">Pilih Kategori</option>
                            ${categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('')}
                        </select>
                    </div>

                    <div class="mb-3">
                        <label for="subkategori_id" class="form-label">Subkategori:</label>
                        <select class="form-select" id="subkategori_id" name="subkategori_id">
                            <option value="">Tidak menggunakan subkategori</option>
                        </select>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="rekening_id" class="form-label required-field">Rekening:</label>
                        <select class="form-select" id="rekening_id" name="rekening_id" required>
                            <option value="">Pilih Rekening</option>
                        </select>
                    </div>

                    <div class="mb-3">
                        <label for="penerima" class="form-label">Penerima:</label>
                        <input type="text" class="form-control" id="penerima" name="penerima" placeholder="Nama penerima">
                    </div>

                    <div class="mb-3">
                        <label for="link_url" class="form-label">Link Bukti (Google Drive):</label>
                        <input type="url" class="form-control" id="link_url" name="link_url" placeholder="https://drive.google.com/...">
                    </div>
                </div>
            </div>

            <div class="mb-3">
                <label for="keterangan" class="form-label">Keterangan:</label>
                <textarea class="form-control" id="keterangan" name="keterangan" rows="3" placeholder="Detail pengeluaran"></textarea>
            </div>

            <div class="d-flex gap-2">
                <button type="submit" class="btn btn-primary">Simpan</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
            </div>
        </form>
    `;

    showModal('Tambah Pengeluaran', formHtml);

    setTimeout(() => {
        initializePengeluaranFormSelects(false);
        attachPengeluaranFormEventListeners(false);
        // Initialize thousand-separator formatting for nominal input
        initializePengeluaranNumberFormatting();
    }, 100);
}

async function showEditPengeluaranForm(id) {
    try {
        const { data, error } = await supabase
            .from('pengeluaran')
            .select(`
                *,
                kategori:kategori_id (nama_kategori),
                subkategori:subkategori_id (nama_subkategori),
                rekening:rekening_id (jenis_rekening)
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Supabase error:', error);
            showToast(`Error: ${error.message}`, 'danger');
            return;
        }

        if (!data) {
            showToast('Data pengeluaran tidak ditemukan', 'warning');
            return;
        }

        const pengeluaran = data;
        const categories = getPengeluaranCategories();

        const formHtml = `
            <div id="pengeluaran-form-error" class="alert alert-danger d-none" role="alert"></div>
            <form id="pengeluaran-form">
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="tanggal" class="form-label required-field">Tanggal:</label>
                            <input type="date" class="form-control" id="tanggal" name="tanggal" value="${pengeluaran.tanggal || ''}" required>
                        </div>

                        <div class="mb-3">
                            <label for="nominal" class="form-label required-field">Nominal:</label>
                            <input type="text" class="form-control" id="nominal" name="nominal" value="${pengeluaran.nominal || ''}" required>
                        </div>

                        <div class="mb-3">
                            <label for="kategori_id" class="form-label required-field">Kategori:</label>
                            <select class="form-select" id="kategori_id" name="kategori_id" required>
                                <option value="">Pilih Kategori</option>
                                ${categories.map(cat => `<option value="${cat.id}" ${pengeluaran.kategori_id === cat.id ? 'selected' : ''}>${cat.name}</option>`).join('')}
                            </select>
                        </div>

                        <div class="mb-3">
                            <label for="subkategori_id" class="form-label">Subkategori:</label>
                            <select class="form-select" id="subkategori_id" name="subkategori_id">
                                <option value="">Tidak menggunakan subkategori</option>
                            </select>
                        </div>
                    </div>

                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="rekening_id" class="form-label required-field">Rekening:</label>
                            <select class="form-select" id="rekening_id" name="rekening_id" required>
                                <option value="">Pilih Rekening</option>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label for="penerima" class="form-label">Penerima:</label>
                            <input type="text" class="form-control" id="penerima" name="penerima" value="${pengeluaran.penerima || ''}" placeholder="Nama penerima">
                        </div>

                        <div class="mb-3">
                            <label for="link_url" class="form-label">Link Bukti (Google Drive):</label>
                            <input type="url" class="form-control" id="link_url" name="link_url" value="${pengeluaran.link_url || ''}" placeholder="https://drive.google.com/...">
                        </div>
                    </div>
                </div>

                <div class="mb-3">
                    <label for="keterangan" class="form-label">Keterangan:</label>
                    <textarea class="form-control" id="keterangan" name="keterangan" rows="3" placeholder="Detail pengeluaran">${pengeluaran.keterangan || ''}</textarea>
                </div>

                <div class="d-flex gap-2">
                    <button type="submit" class="btn btn-primary">Update</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
                </div>
            </form>
        `;

        showModal('Edit Pengeluaran', formHtml);

        setTimeout(() => {
            initializePengeluaranFormSelects(true, pengeluaran);
            attachPengeluaranFormEventListeners(true, pengeluaran.id);
            // Populate nominal formatting after selects are ready
            populatePengeluaranFormValues(pengeluaran);
            initializePengeluaranNumberFormatting();
        }, 100);

    } catch (error) {
        console.error('Error loading pengeluaran for edit:', error);
        showToast('Error loading data', 'danger');
    }
}

function initializePengeluaranFormSelects(isEdit, pengeluaranData = null) {
    // Load rekening options
    loadRekeningOptionsForPengeluaran();

    // Load initial subcategories (all or filtered by category if editing)
    const initialCategoryId = isEdit && pengeluaranData ? pengeluaranData.kategori_id : null;
    loadSubkategoriOptionsForPengeluaran(initialCategoryId);

    // Set up dynamic subcategory loading based on category selection
    const kategoriSelect = document.getElementById('kategori_id');
    if (kategoriSelect) {
        kategoriSelect.addEventListener('change', async (e) => {
            const kategoriId = e.target.value;
            if (kategoriId) {
                await loadSubkategoriOptionsForPengeluaran(kategoriId);
            } else {
                document.getElementById('subkategori_id').innerHTML = '<option value="">Tidak menggunakan subkategori</option>';
            }
        });
    }
}

// Initialize number formatting for nominal input field
function initializePengeluaranNumberFormatting() {
    const nominalInput = document.getElementById('nominal');
    if (!nominalInput) return;

    nominalInput.addEventListener('input', function(e) {
        let value = e.target.value;

        // Store raw value for database storage
        nominalInput.dataset.rawValue = parseFormattedNumber(value);

        // Format for display
        const formattedValue = formatNumberInput(value);
        if (formattedValue !== value) {
            const cursorPos = e.target.selectionStart;
            e.target.value = formattedValue;
            // Restore cursor position approximately
            setTimeout(() => {
                try { e.target.setSelectionRange(cursorPos, cursorPos); } catch (err) {}
            }, 0);
        }
    });

    nominalInput.addEventListener('blur', function(e) {
        const rawValue = parseFormattedNumber(e.target.value);
        e.target.dataset.rawValue = rawValue > 0 ? rawValue : '';
        e.target.value = rawValue > 0 ? rawValue : '';
    });

    nominalInput.addEventListener('focus', function(e) {
        const rawValue = e.target.dataset.rawValue || e.target.value;
        const formattedValue = formatNumberInput(rawValue);
        if (formattedValue) {
            e.target.value = formattedValue;
            try { e.target.setSelectionRange(formattedValue.length, formattedValue.length); } catch (err) {}
        }
    });
}

function populatePengeluaranFormValues(pengeluaran) {
    // Set values for searchable selects if available
    const rekeningSelect = document.getElementById('rekening_id');
    const subkategoriSelect = document.getElementById('subkategori_id');
    const nominalInput = document.getElementById('nominal');

    if (rekeningSelect && rekeningSelect.searchableSelect) {
        rekeningSelect.searchableSelect.setValue(pengeluaran.rekening_id || '');
    }

    if (subkategoriSelect) {
        // For edit mode, we need to wait for subcategory options to load
        setTimeout(() => {
            if (subkategoriSelect.searchableSelect) {
                subkategoriSelect.searchableSelect.setValue(pengeluaran.subkategori_id || '');
            } else {
                subkategoriSelect.value = pengeluaran.subkategori_id || '';
            }
        }, 200); // Small delay to ensure options are loaded
    }

    // Set nominal formatted value and raw dataset
    if (nominalInput) {
        const raw = pengeluaran.nominal !== undefined && pengeluaran.nominal !== null ? String(pengeluaran.nominal) : '';
        nominalInput.dataset.rawValue = raw;
        nominalInput.value = raw ? formatNumberInput(String(raw)) : '';
    }
}

function attachPengeluaranFormEventListeners(isEdit, editId = null) {
    const form = document.getElementById('pengeluaran-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handlePengeluaranFormSubmit(isEdit, editId);
    });
}

async function handlePengeluaranFormSubmit(isEdit, editId) {
    try {
        const formData = await collectPengeluaranFormData(isEdit);

        let result;
        if (isEdit && editId) {
            result = await updatePengeluaran(editId, formData);
        } else {
            result = await addPengeluaran(formData);
        }

        if (result.success) {
            closeModal();
            // Trigger data reload - this will be imported from the data module
            if (typeof loadPengeluaran === 'function') {
                await loadPengeluaran();
            }
        } else {
            showPengeluaranFormError(result.message);
        }

    } catch (error) {
        console.error('Form submission error:', error);
        showPengeluaranFormError(error.message || 'Terjadi kesalahan saat menyimpan data');
    }
}

async function collectPengeluaranFormData(isEdit) {
    const tanggal = document.getElementById('tanggal').value;
    const nominalEl = document.getElementById('nominal');
    const nominal = nominalEl ? parseFormattedNumber(nominalEl.value || nominalEl.dataset.rawValue || '') : 0;
    const kategoriId = document.getElementById('kategori_id').value;
    const subkategoriId = document.getElementById('subkategori_id').value;
    const rekeningId = document.getElementById('rekening_id').value;
    const penerima = document.getElementById('penerima').value.trim();
    const linkUrl = document.getElementById('link_url').value.trim();
    const keterangan = document.getElementById('keterangan').value.trim();

    const formData = {
        tanggal,
        nominal,
        kategori_id: kategoriId,
        rekening_id: rekeningId,
        keterangan
    };

    // Generate transaction ID for new records
    if (!isEdit) {
        formData.id_transaksi = await generateTransactionId();
    }

    // Optional fields
    if (subkategoriId) formData.subkategori_id = subkategoriId;
    if (penerima) formData.penerima = penerima;
    if (linkUrl) formData.link_url = linkUrl;

    return formData;
}

function showPengeluaranFormError(message) {
    const errorDiv = document.getElementById('pengeluaran-form-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('d-none');
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Data loading functions for selects
async function loadRekeningOptionsForPengeluaran() {
    try {
        const rekeningOptions = await getRekeningOptions();
        const rekeningSelect = document.getElementById('rekening_id');
        if (rekeningSelect) {
            const optionsHtml = '<option value="">Pilih Rekening</option>' +
                rekeningOptions.map(item => `<option value="${item.value}">${item.text}</option>`).join('');
            rekeningSelect.innerHTML = optionsHtml;
        }
    } catch (error) {
        console.error('Error loading rekening options:', error);
        showToast('Error loading rekening data', 'danger');
    }
}

async function loadSubkategoriOptionsForPengeluaran(kategoriId = null) {
    try {
        let subcategories = [];

        if (kategoriId) {
            // Load subcategories for specific category
            subcategories = await loadPengeluaranSubcategories(kategoriId);
        } else {
            // Load all subcategories
            subcategories = await loadPengeluaranSubcategories();
        }

        const subkategoriSelect = document.getElementById('subkategori_id');
        if (subkategoriSelect) {
            const optionsHtml = '<option value="">Tidak menggunakan subkategori</option>' +
                subcategories.map(item =>
                    `<option value="${item.id}">${item.nama_subkategori} (${item.kategori_saldo?.nama_kategori || 'Unknown'})</option>`
                ).join('');
            subkategoriSelect.innerHTML = optionsHtml;
        }
    } catch (error) {
        console.error('Error loading subkategori options:', error);
        showToast('Error loading subkategori data', 'danger');
    }
}

async function confirmDeletePengeluaran(id) {
    const confirmed = await showConfirm('Apakah Anda yakin ingin menghapus transaksi pengeluaran ini?');
    if (confirmed) {
        // This will be imported from the data module
        if (typeof deletePengeluaran === 'function') {
            const result = await deletePengeluaran(id);
            if (result.success) {
                if (typeof loadPengeluaran === 'function') {
                    await loadPengeluaran();
                }
            }
        }
    }
}

export {
    showAddPengeluaranForm,
    showEditPengeluaranForm,
    confirmDeletePengeluaran,
    loadRekeningOptionsForPengeluaran,
    loadSubkategoriOptionsForPengeluaran
};
