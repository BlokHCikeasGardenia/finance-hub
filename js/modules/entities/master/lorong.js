// Lorong (Alley/Lane) entity module - Master Data
// Complete CRUD operations with search, filter, and forms

import { supabase } from '../../config.js';
import {
    readRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    applySearchFilter,
    applySorting,
    paginateData
} from '../../crud.js';
import {
    showConfirm,
    showToast,
    renderPagination
} from '../../utils.js';
import {
    showModal,
    closeModal
} from '../../ui.js';

// Global state for lorong
let lorongData = [];
let lorongCurrentPage = 1;
let lorongItemsPerPage = 10;

// Table columns configuration
const lorongTableColumns = [
    { key: 'nama_lorong', label: 'Nama Lorong', sortable: true },
    { key: 'ketua_lorong', label: 'Ketua Lorong', sortable: true }
];

// Load lorong data
async function loadLorong(refreshUI = true) {
    try {
        const { success, data } = await readRecords('lorong', {
            select: 'id, nama_lorong, ketua_lorong',
            orderBy: 'nama_lorong'
        });

        if (!success) throw new Error('Failed to load lorong data');

        lorongData = data || [];

        if (refreshUI) {
            displayLorongTable(lorongData);
        }

        return { success: true, data: lorongData };
    } catch (error) {
        console.error('Error loading lorong:', error);
        showToast('Error loading data', 'danger');

        if (refreshUI) {
            document.getElementById('lorong-table').innerHTML = '<p>Error loading data</p>';
        }

        return { success: false, message: error.message };
    }
}

// Display lorong table with pagination
function displayLorongTable(data) {
    const { data: paginatedData, pagination } = paginateData(data, lorongCurrentPage, lorongItemsPerPage);

    const tableHtml = createLorongTableHtml(paginatedData);
    const paginationHtml = renderPagination('lorong', pagination.currentPage, pagination.totalPages);

    document.getElementById('lorong-table').innerHTML = tableHtml + paginationHtml;
}

// Create HTML for lorong table
function createLorongTableHtml(data) {
    let html = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th width="60px">No.</th>
                        ${lorongTableColumns.map(col => {
                            const sortableClass = col.sortable ? 'sortable' : '';
                            const sortIcon = col.sortable ? ' <i class="bi bi-chevron-expand sort-icon"></i>' : '';
                            return `<th class="${sortableClass}" data-column="${col.key}">${col.label}${sortIcon}</th>`;
                        }).join('')}
                        <th width="150px">Aksi</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (data.length > 0) {
        data.forEach((item, index) => {
            const globalIndex = (lorongCurrentPage - 1) * lorongItemsPerPage + index + 1;
            html += `<tr>
                <td>${globalIndex}</td>
                ${lorongTableColumns.map(col => `<td>${item[col.key] || '-'}</td>`).join('')}
                <td>
                    <button onclick="editLorong('${item.id}')" class="btn btn-sm btn-outline-primary me-2">Edit</button>
                    <button onclick="confirmDeleteLorong('${item.id}')" class="btn btn-sm btn-outline-danger">Hapus</button>
                </td>
            </tr>`;
        });
    } else {
        const colspan = lorongTableColumns.length + 2;
        html += `<tr><td colspan="${colspan}" class="text-center text-muted">Tidak ada data lorong</td></tr>`;
    }

    html += `</tbody></table></div>`;
    return html;
}

// Add new lorong
async function addLorong(formData) {
    return await createRecord('lorong', formData, 'Lorong');
}

// Update lorong
async function updateLorong(id, formData) {
    return await updateRecord('lorong', id, formData, 'Lorong');
}

// Delete lorong
async function deleteLorong(id) {
    return await deleteRecord('lorong', id, 'Lorong');
}

// Confirm delete lorong
async function confirmDeleteLorong(id) {
    const confirmed = await showConfirm('Apakah Anda yakin ingin menghapus lorong ini?');
    if (confirmed) {
        const result = await deleteLorong(id);
        if (result.success) {
            await loadLorong();
        }
    }
}

// Show add form for lorong
function showAddLorongForm() {
    showModal('Tambah Lorong', createLorongFormHtml());

    setTimeout(() => {
        attachLorongFormEventListeners(false);
    }, 100);
}

// Show edit form for lorong
async function showEditLorongForm(id) {
    try {
        const { success, data } = await readRecords('lorong', {
            filters: { id },
            select: '*'
        });

        if (!success || !data || data.length === 0) {
            showToast('Data lorong tidak ditemukan', 'warning');
            return;
        }

        const lorong = data[0];
        showModal('Edit Lorong', createLorongFormHtml(lorong));

        setTimeout(() => {
            attachLorongFormEventListeners(true, lorong.id);
        }, 100);

    } catch (error) {
        console.error('Error loading lorong for edit:', error);
        showToast('Error loading data', 'danger');
    }
}

// Create HTML for lorong form
function createLorongFormHtml(lorong = null) {
    const isEdit = !!lorong;

    return `
        <div id="lorong-form-error" class="alert alert-danger d-none" role="alert"></div>
        <form id="lorong-form">
            <div class="mb-3">
                <label for="nama_lorong" class="form-label required-field">Nama Lorong:</label>
                <input type="text" class="form-control" id="nama_lorong" name="nama_lorong"
                       value="${lorong?.nama_lorong || ''}" required>
            </div>

            <div class="mb-3">
                <label for="ketua_lorong" class="form-label">Ketua Lorong:</label>
                <input type="text" class="form-control" id="ketua_lorong" name="ketua_lorong"
                       value="${lorong?.ketua_lorong || ''}" placeholder="Nama ketua lorong">
            </div>

            <div class="d-flex gap-2">
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Simpan'}</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
            </div>
        </form>
    `;
}

// Attach form event listeners
function attachLorongFormEventListeners(isEdit, editId = null) {
    const form = document.getElementById('lorong-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleLorongFormSubmit(isEdit, editId);
    });
}

// Handle form submission
async function handleLorongFormSubmit(isEdit, editId) {
    try {
        const formData = collectLorongFormData();

        let result;
        if (isEdit && editId) {
            result = await updateLorong(editId, formData);
        } else {
            result = await addLorong(formData);
        }

        if (result.success) {
            closeModal();
            await loadLorong();
        } else {
            showLorongFormError(result.message);
        }

    } catch (error) {
        console.error('Form submission error:', error);
        showLorongFormError(error.message || 'Terjadi kesalahan saat menyimpan data');
    }
}

// Collect form data
function collectLorongFormData() {
    const namaLorong = document.getElementById('nama_lorong').value.trim();
    const ketuaLorong = document.getElementById('ketua_lorong').value.trim();

    const formData = {
        nama_lorong: namaLorong
    };

    // Optional field
    if (ketuaLorong) formData.ketua_lorong = ketuaLorong;

    return formData;
}

// Show form error
function showLorongFormError(message) {
    const errorDiv = document.getElementById('lorong-form-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('d-none');
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Change page
function changeLorongPage(page) {
    lorongCurrentPage = page;
    displayLorongTable(lorongData);
}

// Export functions for global access
export {
    loadLorong,
    showAddLorongForm,
    showEditLorongForm,
    confirmDeleteLorong,
    changeLorongPage
};

// Backward compatibility for global functions
window.editLorong = showEditLorongForm;
window.confirmDeleteLorong = confirmDeleteLorong;
