// Rekening form module
// Handles form creation, validation, and submission

import { showModal, closeModal } from '../../ui.js';
import { showToast } from '../../utils.js';
import {
    addRekening,
    updateRekening,
    loadRekening
} from './rekening.js';

// Show add form for rekening
function showAddRekeningForm() {
    showModal('Tambah Rekening', createRekeningFormHtml());

    // Initialize form
    setTimeout(() => {
        attachRekeningFormEventListeners(false);
    }, 100);
}

// Show edit form for rekening
async function showEditRekeningForm(id) {
    try {
        const { supabase } = await import('../../config.js');

        const { data, error } = await supabase
            .from('rekening')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        showModal('Edit Rekening', createRekeningFormHtml(data));

        // Initialize form
        setTimeout(() => {
            attachRekeningFormEventListeners(true, id);
        }, 100);

    } catch (error) {
        console.error('Error loading rekening for edit:', error);
        showToast('Error loading data', 'danger');
    }
}

// Create HTML for rekening form
function createRekeningFormHtml(rekening = null) {
    const isEdit = !!rekening;
    const title = isEdit ? 'Edit Rekening' : 'Tambah Rekening Baru';

    return `
        <div id="rekening-form-error" class="alert alert-danger d-none" role="alert"></div>
        <form id="rekening-form">
            <div class="mb-3">
                <label for="jenis_rekening" class="form-label required-field">Jenis Rekening:</label>
                <input type="text" class="form-control" id="jenis_rekening" name="jenis_rekening"
                       value="${rekening?.jenis_rekening || ''}" required
                       placeholder="Contoh: Kas RT, Bank BCA, Bank Mandiri">
            </div>

            <div class="mb-3">
                <label for="saldo_awal" class="form-label required-field">Saldo Awal:</label>
                <input type="number" class="form-control" id="saldo_awal" name="saldo_awal"
                       value="${rekening?.saldo_awal || 0}" step="0.01" min="0" required>
            </div>

            <div class="d-flex gap-2">
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Simpan'}</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
            </div>
        </form>
    `;
}

// Attach form event listeners
function attachRekeningFormEventListeners(isEdit, editId = null) {
    const form = document.getElementById('rekening-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleRekeningFormSubmit(isEdit, editId);
    });
}

// Handle form submission
async function handleRekeningFormSubmit(isEdit, editId) {
    try {
        const formData = collectRekeningFormData();

        let result;
        if (isEdit && editId) {
            result = await updateRekening(editId, formData);
        } else {
            result = await addRekening(formData);
        }

        if (result.success) {
            closeModal();
            await loadRekening();
        } else {
            showRekeningFormError(result.message);
        }

    } catch (error) {
        console.error('Form submission error:', error);
        showRekeningFormError(error.message || 'Terjadi kesalahan saat menyimpan data');
    }
}

// Collect form data
function collectRekeningFormData() {
    const jenisRekening = document.getElementById('jenis_rekening').value.trim();
    const saldoAwal = parseFloat(document.getElementById('saldo_awal').value) || 0;

    return {
        jenis_rekening: jenisRekening,
        saldo_awal: saldoAwal
    };
}

// Show form error
function showRekeningFormError(message) {
    const errorDiv = document.getElementById('rekening-form-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('d-none');
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Backward compatibility for global functions
window.showAddRekeningForm = showAddRekeningForm;
window.showEditRekeningForm = showEditRekeningForm;

export {
    showAddRekeningForm,
    showEditRekeningForm,
    createRekeningFormHtml,
    attachRekeningFormEventListeners,
    handleRekeningFormSubmit,
    collectRekeningFormData,
    showRekeningFormError
};