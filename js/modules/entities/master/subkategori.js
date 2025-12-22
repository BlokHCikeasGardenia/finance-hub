// Subkategori Management Module
// Handles CRUD operations for subcategories with category filtering

import { supabase } from '../../config.js';
import { showToast, debounce } from '../../utils.js';
import { readRecords } from '../../crud.js';

// Global states
let subkategoriData = [];
let subkategoriCurrentPage = 1;
let subkategoriItemsPerPage = 10;

// Load Subkategori Data
async function loadSubkategori() {
    try {
        const { data, error } = await supabase
            .from('subkategori')
            .select(`
                *,
                kategori_saldo: kategori_id (nama_kategori)
            `)
            .order('nama_subkategori');

        if (error) throw error;

        // Store data globally for search/filter operations
        subkategoriData = data || [];

        renderSubkategoriTable(subkategoriData);
    } catch (error) {
        console.error('Error loading subkategori:', error);
        document.getElementById('subkategori-table').innerHTML = '<p class="text-danger">Error loading data</p>';
    }
}

// Render Subkategori Table with pagination
function renderSubkategoriTable(data) {
    const totalPages = Math.ceil(data.length / subkategoriItemsPerPage);
    const startIndex = (subkategoriCurrentPage - 1) * subkategoriItemsPerPage;
    const endIndex = startIndex + subkategoriItemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    const tableHtml = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th style="width: 60px;">No.</th>
                        <th>Kategori</th>
                        <th>Nama Subkategori</th>
                        <th style="width: 180px;">Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    ${paginatedData.map((item, index) => `
                        <tr>
                            <td>${startIndex + index + 1}</td>
                            <td>${item.kategori_saldo?.nama_kategori || '-'}</td>
                            <td>${item.nama_subkategori}</td>
                            <td>
                                <button onclick="editSubkategori('${item.id}')" class="btn btn-sm btn-outline-primary me-2">Edit</button>
                                <button onclick="confirmDeleteSubkategori('${item.id}')" class="btn btn-sm btn-outline-danger">Hapus</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <div class="d-flex justify-content-between align-items-center mt-3">
            <div class="text-muted">
                Menampilkan ${paginatedData.length > 0 ? startIndex + 1 : 0}-${startIndex + paginatedData.length} dari ${data.length} data
            </div>
            ${renderSubkategoriPagination(subkategoriCurrentPage, totalPages)}
        </div>
    `;

    document.getElementById('subkategori-table').innerHTML = tableHtml;
}

// Render pagination for subkategori
function renderSubkategoriPagination(currentPage, totalPages) {
    if (totalPages <= 1) return '';

    let paginationHtml = '<nav><ul class="pagination pagination-sm mb-0 justify-content-center">';

    // Previous button
    paginationHtml += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changeSubkategoriPage(${currentPage - 1})">Previous</a>
    </li>`;

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="changeSubkategoriPage(1)">1</a></li>`;
        if (startPage > 2) {
            paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="changeSubkategoriPage(${i})">${i}</a>
        </li>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
        paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="changeSubkategoriPage(${totalPages})">${totalPages}</a></li>`;
    }

    // Next button
    paginationHtml += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changeSubkategoriPage(${currentPage + 1})">Next</a>
    </li>`;

    paginationHtml += '</ul></nav>';
    return paginationHtml;
}

// Change page
function changeSubkategoriPage(page) {
    subkategoriCurrentPage = page;
    renderSubkategoriTable(subkategoriData);
}

// CRUD Functions

// Show add form for subkategori
async function showAddForm(entity) {
    const { showModal } = await import('../../ui.js');

    const formHtml = `
        <form id="subkategori-form">
            <div class="mb-3">
                <label for="kategori_id" class="form-label">Kategori:</label>
                <select class="form-select" id="kategori_id" required>
                    <option value="">Pilih Kategori</option>
                </select>
            </div>
            <div class="mb-3">
                <label for="nama_subkategori" class="form-label">Nama Subkategori:</label>
                <input type="text" class="form-control" id="nama_subkategori" value="" required>
            </div>
            <div class="d-flex gap-2">
                <button type="submit" class="btn btn-primary">Simpan</button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
            </div>
        </form>
    `;

    showModal('Tambah Subkategori', formHtml);

    // Load kategori options
    setTimeout(async () => {
        await loadKategoriOptionsForSubkategori();

        const form = document.getElementById('subkategori-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleFormSubmit('subkategori', null);
        });
    }, 100);
}

// Add new subkategori
async function addSubkategori(formData) {
    try {
        const { data, error } = await supabase
            .from('subkategori')
            .insert([formData])
            .select();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error adding subkategori:', error);
        return { success: false, message: error.message };
    }
}

// Update subkategori
async function updateSubkategori(id, formData) {
    try {
        const { data, error } = await supabase
            .from('subkategori')
            .update(formData)
            .eq('id', id)
            .select();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error updating subkategori:', error);
        return { success: false, message: error.message };
    }
}

// Delete subkategori
async function deleteSubkategori(id) {
    try {
        const { error } = await supabase
            .from('subkategori')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting subkategori:', error);
        return { success: false, message: error.message };
    }
}


// Load kategori options for subkategori form
async function loadKategoriOptionsForSubkategori() {
    try {
        const { data, error } = await supabase
            .from('kategori_saldo')
            .select('id, nama_kategori')
            .order('nama_kategori');

        if (error) throw error;

        const selectElement = document.getElementById('kategori_id');
        if (selectElement && data) {
            const options = data.map(item =>
                `<option value="${item.id}">${item.nama_kategori}</option>`
            ).join('');

            selectElement.innerHTML = '<option value="">Pilih Kategori</option>' + options;
        }
    } catch (error) {
        console.error('Error loading kategori options:', error);
    }
}

async function editSubkategori(id) {
    try {
        const { data, error } = await supabase
            .from('subkategori')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        const { showModal } = await import('../../ui.js');

        const formHtml = `
            <form id="subkategori-form">
                <div class="mb-3">
                    <label for="kategori_id" class="form-label">Kategori:</label>
                    <select class="form-select" id="kategori_id" required>
                        <option value="">Pilih Kategori</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label for="nama_subkategori" class="form-label">Nama Subkategori:</label>
                    <input type="text" class="form-control" id="nama_subkategori" value="${data.nama_subkategori}" required>
                </div>
                <div class="d-flex gap-2">
                    <button type="submit" class="btn btn-primary">Update</button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                </div>
            </form>
        `;

        showModal('Edit Subkategori', formHtml);

        // Load kategori options and set selected value
        setTimeout(async () => {
            await loadKategoriOptionsForSubkategori();
            document.getElementById('kategori_id').value = data.kategori_id || '';

            const form = document.getElementById('subkategori-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleFormSubmit('subkategori', id);
            });
        }, 100);

    } catch (error) {
        console.error('Error loading subkategori for edit:', error);
        showToast('Error loading data', 'danger');
    }
}

async function confirmDeleteSubkategori(id) {
    const { showConfirm } = await import('../../ui.js');

    const confirmed = await showConfirm('Apakah Anda yakin ingin menghapus subkategori ini?');
    if (confirmed) {
        const result = await deleteSubkategori(id);
        if (result.success) {
            await loadSubkategori(); // Reload the table
            showToast('Subkategori berhasil dihapus', 'success');
        } else {
            showToast('Error deleting: ' + result.message, 'danger');
        }
    }
}

async function handleFormSubmit(entity, id) {
    const formData = {
        kategori_id: document.getElementById('kategori_id').value,
        nama_subkategori: document.getElementById('nama_subkategori').value
    };

    let result;
    if (id) {
        result = await updateSubkategori(id, formData);
    } else {
        result = await addSubkategori(formData);
    }

    if (result.success) {
        const { closeModal } = await import('../../ui.js');
        closeModal();
        await loadSubkategori(); // Reload the table
        showToast(`${entity.charAt(0).toUpperCase() + entity.slice(1)} ${id ? 'updated' : 'added'} successfully`, 'success');
    } else {
        showToast('Error: ' + result.message, 'danger');
    }
}

// Export functions for global access
export {
    loadSubkategori,
    addSubkategori,
    updateSubkategori,
    deleteSubkategori,
    editSubkategori,
    confirmDeleteSubkategori,
    loadKategoriOptionsForSubkategori,
    showAddForm
};

// Backward compatibility for global functions
window.loadSubkategori = loadSubkategori;
window.editSubkategori = editSubkategori;
window.confirmDeleteSubkategori = confirmDeleteSubkategori;
