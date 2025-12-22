// Rekening Management Module
// Handles CRUD operations for accounts

import { supabase } from '../../config.js';
import { showToast, debounce, formatCurrency } from '../../utils.js';
import { readRecords } from '../../crud.js';

// Global states
let rekeningData = [];
let rekeningCurrentPage = 1;
let rekeningItemsPerPage = 10;

// Load Rekening Data
async function loadRekening() {
    try {
        const { data, error } = await supabase
            .from('rekening')
            .select('*')
            .order('jenis_rekening');

        if (error) throw error;

        // Store data globally for search/filter operations
        rekeningData = data || [];

        renderRekeningTable(rekeningData);
    } catch (error) {
        console.error('Error loading rekening:', error);
        document.getElementById('rekening-table').innerHTML = '<p class="text-danger">Error loading data</p>';
    }
}

// Render Rekening Table with pagination
function renderRekeningTable(data) {
    const totalPages = Math.ceil(data.length / rekeningItemsPerPage);
    const startIndex = (rekeningCurrentPage - 1) * rekeningItemsPerPage;  // FIXED: was periodeItemsPerPage
    const endIndex = startIndex + rekeningItemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    const tableHtml = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th style="width: 60px;">No.</th>
                        <th>Jenis Rekening</th>
                        <th class="text-end">Saldo Awal</th>
                        <th style="width: 180px;">Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    ${paginatedData.map((item, index) => `
                        <tr>
                            <td>${startIndex + index + 1}</td>
                            <td>${item.jenis_rekening}</td>
                            <td class="text-end">${formatCurrency(item.saldo_awal || 0)}</td>
                            <td>
                                <button onclick="editRekening('${item.id}')" class="btn btn-sm btn-outline-primary me-2">Edit</button>
                                <button onclick="confirmDeleteRekening('${item.id}')" class="btn btn-sm btn-outline-danger">Hapus</button>
                            </td>
                        </tr>
                    `).join('')}

                    <!-- Total row -->
                    <tr class="table-active fw-bold">
                        <td colspan="2"><strong>TOTAL</strong></td>
                        <td class="text-end"><strong>${formatCurrency(data.reduce((sum, item) => sum + (item.saldo_awal || 0), 0))}</strong></td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <div class="d-flex justify-content-between align-items-center mt-3">
            <div class="text-muted">
                Menampilkan ${paginatedData.length > 0 ? startIndex + 1 : 0}-${startIndex + paginatedData.length} dari ${data.length} data
            </div>
            ${renderRekeningPagination(rekeningCurrentPage, totalPages)}
        </div>
    `;

    document.getElementById('rekening-table').innerHTML = tableHtml;

    // Re-attach sort event listeners
    attachRekeningSortListeners();
}

// Render pagination for rekening
function renderRekeningPagination(currentPage, totalPages) {
    if (totalPages <= 1) return '';

    let paginationHtml = '<nav><ul class="pagination pagination-sm mb-0 justify-content-center">';

    // Previous button
    paginationHtml += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changeRekeningPage(${currentPage - 1})">Previous</a>
    </li>`;

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="changeRekeningPage(1)">1</a></li>`;
        if (startPage > 2) {
            paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="changeRekeningPage(${i})">${i}</a>
        </li>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
        paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="changeRekeningPage(${totalPages})">${totalPages}</a></li>`;
    }

    // Next button
    paginationHtml += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changeRekeningPage(${currentPage + 1})">Next</a>
    </li>`;

    paginationHtml += '</ul></nav>';
    return paginationHtml;
}

// Change page
function changeRekeningPage(page) {
    rekeningCurrentPage = page;
    renderRekeningTable(rekeningData);
}

// Attach sort listeners
function attachRekeningSortListeners() {
    const sortableHeaders = document.querySelectorAll('#rekening-table th.sortable');

    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.column;
            const currentSort = header.dataset.sort || 'none';

            // Reset all sort indicators
            sortableHeaders.forEach(h => {
                h.dataset.sort = 'none';
                const icon = h.querySelector('.sort-icon');
                if (icon) icon.className = 'bi bi-chevron-expand sort-icon';
            });

            // Determine new sort direction
            let newSort = 'asc';
            if (currentSort === 'asc') newSort = 'desc';
            else if (currentSort === 'desc') newSort = 'none';

            header.dataset.sort = newSort;

            // Update icon
            const icon = header.querySelector('.sort-icon');
            if (icon) {
                if (newSort === 'asc') icon.className = 'bi bi-chevron-up sort-icon';
                else if (newSort === 'desc') icon.className = 'bi bi-chevron-down sort-icon';
                else icon.className = 'bi bi-chevron-expand sort-icon';
            }

            // Apply sorting
            sortRekeningData(column, newSort);
        });
    });
}

// Sort rekening data
function sortRekeningData(column, direction) {
    if (direction === 'none') {
        renderRekeningTable(rekeningData);
        return;
    }

    let sortedData = [...rekeningData];

    // Sort the data
    sortedData.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];

        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return direction === 'asc' ? 1 : -1;
        if (bVal == null) return direction === 'asc' ? -1 : 1;

        // Special handling for numeric columns
        if (column === 'saldo_awal') {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
            return direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // Convert to strings for comparison
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();

        if (direction === 'asc') {
            return aVal.localeCompare(bVal);
        } else {
            return bVal.localeCompare(aVal);
        }
    });

    rekeningData = sortedData;
    renderRekeningTable(sortedData);
}

// CRUD Functions

// Show add form for rekening
async function showAddForm(entity) {
    // Use global showModal directly
    const formHtml = `
        <form id="rekening-form">
            <div class="mb-3">
                <label for="jenis_rekening" class="form-label">Jenis Rekening:</label>
                <input type="text" class="form-control" id="jenis_rekening" value="" required>
            </div>
            <div class="mb-3">
                <label for="saldo_awal" class="form-label">Saldo Awal:</label>
                <input type="number" class="form-control" id="saldo_awal" step="0.01" min="0" value="" required>
            </div>
            <div class="d-flex gap-2">
                <button type="submit" class="btn btn-primary">Simpan</button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
            </div>
        </form>
    `;

    // Call global showModal
    if (window.showModal) {
        window.showModal('Tambah Rekening', formHtml);
    } else {
        console.error('showModal function not available');
        showToast('Modal function not available', 'error');
        return;
    }

    setTimeout(() => {
        const form = document.getElementById('rekening-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleFormSubmit('rekening', null);
            });
        }
    }, 100);
}

// Add new rekening
async function addRekening(formData) {
    try {
        const { data, error } = await supabase
            .from('rekening')
            .insert([formData])
            .select();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error adding rekening:', error);
        return { success: false, message: error.message };
    }
}

// Update rekening
async function updateRekening(id, formData) {
    try {
        const { data, error } = await supabase
            .from('rekening')
            .update(formData)
            .eq('id', id)
            .select();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error updating rekening:', error);
        return { success: false, message: error.message };
    }
}

// Delete rekening
async function deleteRekening(id) {
    try {
        const { error } = await supabase
            .from('rekening')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting rekening:', error);
        return { success: false, message: error.message };
    }
}


async function editRekening(id) {
    try {
        const { data, error } = await supabase
            .from('rekening')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Use global showModal directly
        const formHtml = `
            <form id="rekening-form">
                <div class="mb-3">
                    <label for="jenis_rekening" class="form-label">Jenis Rekening:</label>
                    <input type="text" class="form-control" id="jenis_rekening" value="${data.jenis_rekening}" required>
                </div>
                <div class="mb-3">
                    <label for="saldo_awal" class="form-label">Saldo Awal:</label>
                    <input type="number" class="form-control" id="saldo_awal" step="0.01" min="0" value="${data.saldo_awal || 0}" required>
                </div>
                <div class="d-flex gap-2">
                    <button type="submit" class="btn btn-primary">Update</button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                </div>
            </form>
        `;

        // Call global showModal
        if (window.showModal) {
            window.showModal('Edit Rekening', formHtml);
        } else {
            console.error('showModal function not available');
            showToast('Modal function not available', 'error');
            return;
        }

        setTimeout(() => {
            const form = document.getElementById('rekening-form');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await handleFormSubmit('rekening', id);
                });
            }
        }, 100);

    } catch (error) {
        console.error('Error loading rekening for edit:', error);
        showToast('Error loading data', 'danger');
    }
}

async function confirmDeleteRekening(id) {
    // Use global showConfirm
    if (window.showConfirm) {
        const confirmed = await window.showConfirm('Apakah Anda yakin ingin menghapus rekening ini?\n\nPeringatan: Menghapus rekening yang masih memiliki transaksi dapat menyebabkan inkonsistensi data.');
        if (confirmed) {
            const result = await deleteRekening(id);
            if (result.success) {
                await loadRekening(); // Reload the table
                showToast('Rekening berhasil dihapus', 'success');
            } else {
                showToast('Error deleting: ' + result.message, 'danger');
            }
        }
    } else {
        console.error('showConfirm function not available');
        showToast('Confirmation function not available', 'error');
    }
}

async function handleFormSubmit(entity, id) {
    const formData = {
        jenis_rekening: document.getElementById('jenis_rekening').value,
        saldo_awal: parseFloat(document.getElementById('saldo_awal').value) || 0
    };

    let result;
    if (id) {
        result = await updateRekening(id, formData);
    } else {
        result = await addRekening(formData);
    }

    if (result.success) {
        // Use global closeModal
        if (window.closeModal) {
            window.closeModal();
        }
        await loadRekening(); // Reload the table
        showToast(`${entity.charAt(0).toUpperCase() + entity.slice(1)} ${id ? 'updated' : 'added'} successfully`, 'success');
    } else {
        showToast('Error: ' + result.message, 'danger');
    }
}

// Get rekening data for selects
async function getRekeningData() {
    try {
        const { data, error } = await supabase
            .from('rekening')
            .select('id, jenis_rekening')
            .order('jenis_rekening');

        if (error) throw error;

        return data ? data.map(item => ({
            value: item.id,
            text: item.jenis_rekening
        })) : [];
    } catch (error) {
        console.error('Error getting rekening data:', error);
        return [];
    }
}

// Export functions for global access
export {
    loadRekening,
    addRekening,
    updateRekening,
    deleteRekening,
    editRekening,
    confirmDeleteRekening,
    getRekeningData,
    showAddForm
};

// Backward compatibility for global functions
window.loadRekening = loadRekening;
window.editRekening = editRekening;
window.confirmDeleteRekening = confirmDeleteRekening;
window.getRekeningData = getRekeningData;
