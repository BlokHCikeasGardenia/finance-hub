// Kategori (Category) entity module - Master Data
// Complete CRUD operations with forms

import { supabase } from '../../config.js';
import {
    readRecords,
    createRecord,
    updateRecord,
    deleteRecord
} from '../../crud.js';
import {
    showConfirm,
    showToast
} from '../../utils.js';
import {
    showModal,
    closeModal
} from '../../ui.js';

// Global state for kategori
let kategoriData = [];

// Load kategori data
async function loadKategori(refreshUI = true) {
    try {
        const { success, data } = await readRecords('kategori_saldo', {
            select: 'id, nama_kategori, saldo_awal, keterangan',
            orderBy: 'nama_kategori'
        });

        if (!success) throw new Error('Failed to load kategori data');

        kategoriData = data || [];

        if (refreshUI) {
            displayKategoriTable(kategoriData);
        }

        return { success: true, data: kategoriData };
    } catch (error) {
        console.error('Error loading kategori:', error);
        showToast('Error loading data', 'danger');

        if (refreshUI) {
            document.getElementById('kategori-table').innerHTML = '<p>Error loading data</p>';
        }

        return { success: false, message: error.message };
    }
}

// Display kategori table
function displayKategoriTable(data) {
    const tableHtml = createKategoriTableHtml(data);
    document.getElementById('kategori-table').innerHTML = tableHtml;
}

// Create HTML for kategori table
function createKategoriTableHtml(data) {
    let html = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>Nama Kategori</th>
                        <th class="text-end">Saldo Awal</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (data.length > 0) {
        data.forEach((item) => {
            html += `<tr>
                <td>${item.nama_kategori}</td>
                <td class="text-end">Rp ${item.saldo_awal?.toLocaleString('id-ID') || 0}</td>
                <td>
                    <button onclick="editKategori('${item.id}')" class="btn btn-sm btn-outline-primary me-2">Edit</button>
                    <button onclick="confirmDeleteKategori('${item.id}')" class="btn btn-sm btn-outline-danger">Hapus</button>
                </td>
            </tr>`;
        });

        // Add total row
        const totalSaldoAwal = data.reduce((sum, item) => sum + (item.saldo_awal || 0), 0);
        html += `<tr class="table-active fw-bold">
            <td><strong>TOTAL</strong></td>
            <td class="text-end"><strong>Rp ${totalSaldoAwal.toLocaleString('id-ID')}</strong></td>
            <td></td>
        </tr>`;
    } else {
        html += '<tr><td colspan="3" class="text-center text-muted">Tidak ada data kategori</td></tr>';
    }

    html += `</tbody></table></div>`;
    return html;
}

// Add new kategori
async function addKategori(formData) {
    return await createRecord('kategori_saldo', formData, 'Kategori');
}

// Update kategori
async function updateKategori(id, formData) {
    return await updateRecord('kategori_saldo', id, formData, 'Kategori');
}

// Delete kategori
async function deleteKategori(id) {
    return await deleteRecord('kategori_saldo', id, 'Kategori');
}

// Form functions
function showAddKategoriForm() {
    showModal('Tambah Kategori', createKategoriFormHtml());
    setTimeout(() => attachKategoriFormEventListeners(false), 100);
}

async function showEditKategoriForm(id) {
    try {
        const { success, data } = await readRecords('kategori_saldo', {
            filters: { id },
            select: '*'
        });

        if (!success || !data?.length) {
            showToast('Data kategori tidak ditemukan', 'warning');
            return;
        }

        const kategori = data[0];
        showModal('Edit Kategori', createKategoriFormHtml(kategori));
        setTimeout(() => attachKategoriFormEventListeners(true, kategori.id), 100);

    } catch (error) {
        console.error('Error loading kategori for edit:', error);
        showToast('Error loading data', 'danger');
    }
}

function createKategoriFormHtml(kategori = null) {
    const isEdit = !!kategori;
    return `
        <div id="kategori-form-error" class="alert alert-danger d-none" role="alert"></div>
        <form id="kategori-form">
            <div class="mb-3">
                <label for="nama_kategori" class="form-label required-field">Nama Kategori:</label>
                <input type="text" class="form-control" id="nama_kategori" name="nama_kategori"
                       value="${kategori?.nama_kategori || ''}" required>
            </div>
            <div class="mb-3">
                <label for="saldo_awal" class="form-label">Saldo Awal:</label>
                <input type="number" class="form-control" id="saldo_awal" name="saldo_awal" step="0.01" min="0"
                       value="${kategori?.saldo_awal || 0}">
            </div>
            <div class="d-flex gap-2">
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Simpan'}</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
            </div>
        </form>
    `;
}

function attachKategoriFormEventListeners(isEdit, editId = null) {
    const form = document.getElementById('kategori-form');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleKategoriFormSubmit(isEdit, editId);
    });
}

async function handleKategoriFormSubmit(isEdit, editId) {
    try {
        const formData = {
            nama_kategori: document.getElementById('nama_kategori').value.trim(),
            saldo_awal: parseFloat(document.getElementById('saldo_awal').value) || 0
        };

        const result = isEdit ?
            await updateKategori(editId, formData) :
            await addKategori(formData);

        if (result.success) {
            closeModal();
            await loadKategori();
        } else {
            showKategoriFormError(result.message);
        }
    } catch (error) {
        showKategoriFormError(error.message || 'Terjadi kesalahan saat menyimpan data');
    }
}

function showKategoriFormError(message) {
    const errorDiv = document.getElementById('kategori-form-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('d-none');
    }
}

async function confirmDeleteKategori(id) {
    const confirmed = await showConfirm('Apakah Anda yakin ingin menghapus kategori ini?');
    if (confirmed) {
        const result = await deleteKategori(id);
        if (result.success) await loadKategori();
    }
}

export {
    loadKategori,
    showAddKategoriForm,
    showEditKategoriForm,
    confirmDeleteKategori
};

window.editKategori = showEditKategoriForm;
window.confirmDeleteKategori = confirmDeleteKategori;
