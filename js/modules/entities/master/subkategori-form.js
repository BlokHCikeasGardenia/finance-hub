// Subkategori form module
// Handles form creation, validation, and submission

import { showModal, closeModal } from '../../ui.js';
import { SearchableSelect } from '../../ui.js';
import { showToast } from '../../utils.js';
import {
    addSubkategori,
    updateSubkategori,
    loadSubkategori
} from './subkategori.js';

// Show add form for subkategori
function showAddSubkategoriForm() {
    showModal('Tambah Subkategori', createSubkategoriFormHtml());

    // Initialize searchable selects
    setTimeout(() => {
        initializeSubkategoriFormSelects();
        attachSubkategoriFormEventListeners(false);
    }, 100);
}

// Show edit form for subkategori
async function showEditSubkategoriForm(id) {
    try {
        const { supabase } = await import('../../config.js');

        const { data, error } = await supabase
            .from('subkategori')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        showModal('Edit Subkategori', createSubkategoriFormHtml(data));

        // Initialize searchable selects and set values
        setTimeout(() => {
            initializeSubkategoriFormSelects();
            populateSubkategoriFormValues(data);
            attachSubkategoriFormEventListeners(true, id);
        }, 100);

    } catch (error) {
        console.error('Error loading subkategori for edit:', error);
        showToast('Error loading data', 'danger');
    }
}

// Create HTML for subkategori form
function createSubkategoriFormHtml(subkategori = null) {
    const isEdit = !!subkategori;
    const title = isEdit ? 'Edit Subkategori' : 'Tambah Subkategori Baru';

    return `
        <div id="subkategori-form-error" class="alert alert-danger d-none" role="alert"></div>
        <form id="subkategori-form">
            <div class="mb-3">
                <label for="kategori_id" class="form-label required-field">Kategori:</label>
                <select class="form-select" id="kategori_id" name="kategori_id" required>
                    <option value="">Pilih Kategori</option>
                </select>
            </div>

            <div class="mb-3">
                <label for="nama_subkategori" class="form-label required-field">Nama Subkategori:</label>
                <input type="text" class="form-control" id="nama_subkategori" name="nama_subkategori"
                       value="${subkategori?.nama_subkategori || ''}" required>
            </div>

            <div class="d-flex gap-2">
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Simpan'}</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
            </div>
        </form>
    `;
}

// Initialize searchable selects in form
function initializeSubkategoriFormSelects() {
    // Kategori select
    const kategoriSelect = document.getElementById('kategori_id');
    if (kategoriSelect) {
        const kategoriSearchable = new SearchableSelect(kategoriSelect, {
            placeholder: 'Pilih Kategori',
            searchPlaceholder: 'Cari kategori...'
        });
        kategoriSearchable.loadData(getKategoriData);
    }
}

// Populate form values for editing
function populateSubkategoriFormValues(subkategori) {
    // Set the value in the searchable select if it exists
    const kategoriSelect = document.getElementById('kategori_id');
    if (kategoriSelect && kategoriSelect.searchableSelect) {
        kategoriSelect.searchableSelect.setValue(subkategori.kategori_id || '');
    }
}

// Attach form event listeners
function attachSubkategoriFormEventListeners(isEdit, editId = null) {
    const form = document.getElementById('subkategori-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSubkategoriFormSubmit(isEdit, editId);
    });
}

// Handle form submission
async function handleSubkategoriFormSubmit(isEdit, editId) {
    try {
        const formData = collectSubkategoriFormData();

        let result;
        if (isEdit && editId) {
            result = await updateSubkategori(editId, formData);
        } else {
            result = await addSubkategori(formData);
        }

        if (result.success) {
            closeModal();
            await loadSubkategori();
        } else {
            showSubkategoriFormError(result.message);
        }

    } catch (error) {
        console.error('Form submission error:', error);
        showSubkategoriFormError(error.message || 'Terjadi kesalahan saat menyimpan data');
    }
}

// Collect form data
function collectSubkategoriFormData() {
    const kategoriId = document.getElementById('kategori_id').value;
    const namaSubkategori = document.getElementById('nama_subkategori').value.trim();

    return {
        kategori_id: kategoriId,
        nama_subkategori: namaSubkategori
    };
}

// Show form error
function showSubkategoriFormError(message) {
    const errorDiv = document.getElementById('subkategori-form-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('d-none');
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Get kategori data for selects
async function getKategoriData() {
    try {
        const { supabase } = await import('../../config.js');
        const { data, error } = await supabase
            .from('kategori_saldo')
            .select('id, nama_kategori')
            .order('nama_kategori');

        if (error) throw error;

        return data ? data.map(item => ({
            value: item.id,
            text: item.nama_kategori
        })) : [];
    } catch (error) {
        console.error('Error getting kategori data:', error);
        return [];
    }
}

// Backward compatibility for global functions
window.showAddSubkategoriForm = showAddSubkategoriForm;
window.showEditSubkategoriForm = showEditSubkategoriForm;

export {
    showAddSubkategoriForm,
    showEditSubkategoriForm,
    createSubkategoriFormHtml,
    initializeSubkategoriFormSelects,
    populateSubkategoriFormValues,
    attachSubkategoriFormEventListeners,
    handleSubkategoriFormSubmit,
    collectSubkategoriFormData,
    showSubkategoriFormError,
    getKategoriData
};