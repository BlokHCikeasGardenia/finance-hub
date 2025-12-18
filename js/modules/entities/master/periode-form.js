// Periode form module
// Handles form creation, validation, and submission

import { showModal, closeModal } from '../../ui.js';
import { showToast } from '../../utils.js';
import {
    addPeriode,
    updatePeriode,
    loadPeriode
} from './periode.js';

// Show add form for periode
function showAddPeriodeForm() {
    showModal('Tambah Periode', createPeriodeFormHtml());

    // Initialize form
    setTimeout(() => {
        attachPeriodeFormEventListeners(false);
    }, 100);
}

// Show edit form for periode
async function showEditPeriodeForm(id) {
    try {
        const { supabase } = await import('../../config.js');

        const { data, error } = await supabase
            .from('periode')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        showModal('Edit Periode', createPeriodeFormHtml(data));

        // Initialize form
        setTimeout(() => {
            attachPeriodeFormEventListeners(true, id);
        }, 100);

    } catch (error) {
        console.error('Error loading periode for edit:', error);
        showToast('Error loading data', 'danger');
    }
}

// Create HTML for periode form
function createPeriodeFormHtml(periode = null) {
    const isEdit = !!periode;
    const title = isEdit ? 'Edit Periode' : 'Tambah Periode Baru';

    return `
        <div id="periode-form-error" class="alert alert-danger d-none" role="alert"></div>
        <form id="periode-form">
            <div class="mb-3">
                <label for="nomor_urut" class="form-label required-field">No. Urut:</label>
                <input type="number" class="form-control" id="nomor_urut" name="nomor_urut"
                       value="${periode?.nomor_urut || ''}" min="1" required>
            </div>

            <div class="mb-3">
                <label for="nama_periode" class="form-label required-field">Nama Periode:</label>
                <input type="text" class="form-control" id="nama_periode" name="nama_periode"
                       value="${periode?.nama_periode || ''}" required
                       placeholder="Contoh: Januari 2024">
            </div>

            <div class="mb-3">
                <label for="tanggal_awal" class="form-label required-field">Tanggal Awal:</label>
                <input type="date" class="form-control" id="tanggal_awal" name="tanggal_awal"
                       value="${periode?.tanggal_awal || ''}" required>
            </div>

            <div class="mb-3">
                <label for="tanggal_akhir" class="form-label required-field">Tanggal Akhir:</label>
                <input type="date" class="form-control" id="tanggal_akhir" name="tanggal_akhir"
                       value="${periode?.tanggal_akhir || ''}" required>
            </div>

            <div class="d-flex gap-2">
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Simpan'}</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
            </div>
        </form>
    `;
}

// Attach form event listeners
function attachPeriodeFormEventListeners(isEdit, editId = null) {
    const form = document.getElementById('periode-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handlePeriodeFormSubmit(isEdit, editId);
    });
}

// Handle form submission
async function handlePeriodeFormSubmit(isEdit, editId) {
    try {
        const formData = collectPeriodeFormData();

        let result;
        if (isEdit && editId) {
            result = await updatePeriode(editId, formData);
        } else {
            result = await addPeriode(formData);
        }

        if (result.success) {
            closeModal();
            await loadPeriode();
        } else {
            showPeriodeFormError(result.message);
        }

    } catch (error) {
        console.error('Form submission error:', error);
        showPeriodeFormError(error.message || 'Terjadi kesalahan saat menyimpan data');
    }
}

// Collect form data
function collectPeriodeFormData() {
    const nomorUrut = parseInt(document.getElementById('nomor_urut').value);
    const namaPeriode = document.getElementById('nama_periode').value.trim();
    const tanggalAwal = document.getElementById('tanggal_awal').value;
    const tanggalAkhir = document.getElementById('tanggal_akhir').value;

    return {
        nomor_urut: nomorUrut,
        nama_periode: namaPeriode,
        tanggal_awal: tanggalAwal,
        tanggal_akhir: tanggalAkhir
    };
}

// Show form error
function showPeriodeFormError(message) {
    const errorDiv = document.getElementById('periode-form-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('d-none');
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Backward compatibility for global functions
window.showAddPeriodeForm = showAddPeriodeForm;
window.showEditPeriodeForm = showEditPeriodeForm;

export {
    showAddPeriodeForm,
    showEditPeriodeForm,
    createPeriodeFormHtml,
    attachPeriodeFormEventListeners,
    handlePeriodeFormSubmit,
    collectPeriodeFormData,
    showPeriodeFormError
};