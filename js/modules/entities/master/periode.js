// Periode (Period) Management Module
// Handles CRUD operations for periods, with search, filter, pagination

import { supabase } from '../../config.js';
import { showToast, debounce } from '../../utils.js';
import { readRecords } from '../../crud.js';

// Global states
let periodeData = [];
let periodeCurrentPage = 1;
let periodeItemsPerPage = 10;
let periodeSearchTerm = '';

// Load Periode Data
async function loadPeriode() {
    try {
        const { data, error } = await supabase
            .from('periode')
            .select('*')
            .order('tanggal_awal', { ascending: false });

        if (error) throw error;

        // Store data globally for search/filter operations
        periodeData = data || [];

        // Reset search term and page when loading fresh data
        periodeSearchTerm = '';
        periodeCurrentPage = 1;

        filterAndDisplayPeriode();
    } catch (error) {
        console.error('Error loading periode:', error);
        document.getElementById('periode-table').innerHTML = '<p class="text-danger">Error loading data</p>';
    }
}

// Render Periode Table with pagination
function renderPeriodeTable(data) {
    const totalPages = Math.ceil(data.length / periodeItemsPerPage);
    const startIndex = (periodeCurrentPage - 1) * periodeItemsPerPage;
    const endIndex = startIndex + periodeItemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    const tableHtml = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th style="width: 60px;">No.</th>
                        <th class="sortable" data-column="nomor_urut">No. Urut <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th class="sortable" data-column="nama_periode">Nama Periode <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th class="sortable" data-column="tanggal_awal">Tanggal Awal <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th class="sortable" data-column="tanggal_akhir">Tanggal Akhir <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th style="width: 180px;">Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    ${paginatedData.map((item, index) => `
                        <tr>
                            <td>${startIndex + index + 1}</td>
                            <td>${item.nomor_urut}</td>
                            <td>${item.nama_periode}</td>
                            <td>${new Date(item.tanggal_awal).toLocaleDateString('id-ID')}</td>
                            <td>${new Date(item.tanggal_akhir).toLocaleDateString('id-ID')}</td>
                            <td>
                                <button onclick="editPeriode('${item.id}')" class="btn btn-sm btn-outline-primary me-2">Edit</button>
                                <button onclick="confirmDeletePeriode('${item.id}')" class="btn btn-sm btn-outline-danger">Hapus</button>
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
            ${renderPeriodePagination(periodeCurrentPage, totalPages)}
        </div>
    `;

    document.getElementById('periode-table').innerHTML = tableHtml;

    // Re-attach sort event listeners
    attachPeriodeSortListeners();
}

// Render pagination for periode
function renderPeriodePagination(currentPage, totalPages) {
    if (totalPages <= 1) return '';

    let paginationHtml = '<nav><ul class="pagination pagination-sm mb-0 justify-content-center">';

    // Previous button
    paginationHtml += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changePeriodePage(${currentPage - 1})">Previous</a>
    </li>`;

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="changePeriodePage(1)">1</a></li>`;
        if (startPage > 2) {
            paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="changePeriodePage(${i})">${i}</a>
        </li>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
        paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="changePeriodePage(${totalPages})">${totalPages}</a></li>`;
    }

    // Next button
    paginationHtml += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changePeriodePage(${currentPage + 1})">Next</a>
    </li>`;

    paginationHtml += '</ul></nav>';
    return paginationHtml;
}

// Filter and display periode data
function filterAndDisplayPeriode() {
    let filteredData = [...periodeData];

    // Apply search filter
    if (periodeSearchTerm) {
        filteredData = applySearchFilter(filteredData, periodeSearchTerm, [
            'nama_periode',
            'tanggal_awal',
            'tanggal_akhir'
        ]);
    }

    // Display filtered data
    const { data: paginatedData, pagination } = paginateData(filteredData, periodeCurrentPage, periodeItemsPerPage);
    renderPeriodeTableWithData(paginatedData, filteredData.length, pagination);
}

// Apply search filter to periode data
function applySearchFilter(data, searchTerm, searchFields) {
    if (!searchTerm || !searchFields || searchFields.length === 0) {
        return data;
    }

    const term = searchTerm.toLowerCase();
    return data.filter(item => {
        return searchFields.some(field => {
            const value = item[field];
            if (!value) return false;

            // Special handling for date fields - format them for search
            if (field === 'tanggal_awal' || field === 'tanggal_akhir') {
                const formattedDate = new Date(value).toLocaleDateString('id-ID');
                return formattedDate.toLowerCase().includes(term) ||
                       value.includes(term); // Also search raw date string
            }

            return String(value).toLowerCase().includes(term);
        });
    });
}

// Paginate data helper
function paginateData(data, currentPage, itemsPerPage) {
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedData = data.slice(startIndex, endIndex);

    return {
        data: paginatedData,
        pagination: {
            currentPage,
            totalPages,
            totalItems,
            startIndex,
            endIndex,
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1
        }
    };
}

// Render table with specific data (used by filterAndDisplayPeriode)
function renderPeriodeTableWithData(data, totalCount, pagination) {
    const totalPages = pagination.totalPages;
    const currentPage = pagination.currentPage;
    const startIndex = pagination.startIndex;
    const endIndex = pagination.endIndex;

    const tableHtml = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th style="width: 60px;">No.</th>
                        <th class="sortable" data-column="nomor_urut">No. Urut <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th class="sortable" data-column="nama_periode">Nama Periode <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th class="sortable" data-column="tanggal_awal">Tanggal Awal <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th class="sortable" data-column="tanggal_akhir">Tanggal Akhir <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th style="width: 180px;">Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map((item, index) => `
                        <tr>
                            <td>${startIndex + index + 1}</td>
                            <td>${item.nomor_urut}</td>
                            <td>${item.nama_periode}</td>
                            <td>${new Date(item.tanggal_awal).toLocaleDateString('id-ID')}</td>
                            <td>${new Date(item.tanggal_akhir).toLocaleDateString('id-ID')}</td>
                            <td>
                                <button onclick="editPeriode('${item.id}')" class="btn btn-sm btn-outline-primary me-2">Edit</button>
                                <button onclick="confirmDeletePeriode('${item.id}')" class="btn btn-sm btn-outline-danger">Hapus</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <div class="d-flex justify-content-between align-items-center mt-3">
            <div class="text-muted">
                Menampilkan ${data.length > 0 ? startIndex + 1 : 0}-${endIndex} dari ${totalCount} data${periodeSearchTerm ? ` (hasil pencarian: "${periodeSearchTerm}")` : ''}
            </div>
            ${renderPeriodePagination(currentPage, totalPages)}
        </div>
    `;

    document.getElementById('periode-table').innerHTML = tableHtml;

    // Re-attach sort event listeners
    attachPeriodeSortListeners();
}

// Change page
function changePeriodePage(page) {
    periodeCurrentPage = page;
    filterAndDisplayPeriode();
}

// Attach sort listeners
function attachPeriodeSortListeners() {
    const sortableHeaders = document.querySelectorAll('#periode-table th.sortable');

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
            sortPeriodeData(column, newSort);
        });
    });
}

// Sort periode data
function sortPeriodeData(column, direction) {
    if (direction === 'none') {
        filterAndDisplayPeriode();
        return;
    }

    let sortedData = [...periodeData];

    // Sort the data
    sortedData.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];

        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return direction === 'asc' ? 1 : -1;
        if (bVal == null) return direction === 'asc' ? -1 : 1;

        // Special handling for date columns
        if (column === 'tanggal_awal' || column === 'tanggal_akhir') {
            aVal = new Date(aVal).getTime();
            bVal = new Date(bVal).getTime();
            return direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // Special handling for numeric columns
        if (column === 'nomor_urut') {
            aVal = parseInt(aVal) || 0;
            bVal = parseInt(bVal) || 0;
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

    periodeData = sortedData;
    filterAndDisplayPeriode();
}

// Initialize search and filter functionality
function initializePeriodeSearchAndFilter() {
    // Search input
    const searchInput = document.getElementById('periode-search');
    if (searchInput) {
        searchInput.value = periodeSearchTerm;
        searchInput.addEventListener('input', debounce((e) => {
            periodeSearchTerm = e.target.value.trim().toLowerCase();
            periodeCurrentPage = 1; // Reset to first page when searching
            filterAndDisplayPeriode();
        }, 300));
    }
}

// CRUD Functions

// Add new periode
async function addPeriode(formData) {
    try {
        const { data, error } = await supabase
            .from('periode')
            .insert([formData])
            .select();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error adding periode:', error);
        return { success: false, message: error.message };
    }
}

// Update periode
async function updatePeriode(id, formData) {
    try {
        const { data, error } = await supabase
            .from('periode')
            .update(formData)
            .eq('id', id)
            .select();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error updating periode:', error);
        return { success: false, message: error.message };
    }
}

// Delete periode
async function deletePeriode(id) {
    try {
        const { error } = await supabase
            .from('periode')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting periode:', error);
        return { success: false, message: error.message };
    }
}


async function editPeriode(id) {
    try {
        const { data, error } = await supabase
            .from('periode')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        const { showModal } = await import('../../ui.js');

        const formHtml = `
            <form id="periode-form">
                <div class="mb-3">
                    <label for="nomor_urut" class="form-label">No. Urut:</label>
                    <input type="number" class="form-control" id="nomor_urut" value="${data.nomor_urut}" required min="1">
                </div>
                <div class="mb-3">
                    <label for="nama_periode" class="form-label">Nama Periode:</label>
                    <input type="text" class="form-control" id="nama_periode" value="${data.nama_periode}" required>
                </div>
                <div class="mb-3">
                    <label for="tanggal_awal" class="form-label">Tanggal Awal:</label>
                    <input type="date" class="form-control" id="tanggal_awal" value="${data.tanggal_awal}" required>
                </div>
                <div class="mb-3">
                    <label for="tanggal_akhir" class="form-label">Tanggal Akhir:</label>
                    <input type="date" class="form-control" id="tanggal_akhir" value="${data.tanggal_akhir}" required>
                </div>
                <div class="d-flex gap-2">
                    <button type="submit" class="btn btn-primary">Update</button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                </div>
            </form>
        `;

        showModal('Edit Periode', formHtml);

        setTimeout(() => {
            const form = document.getElementById('periode-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleFormSubmit(entity, id);
            });
        }, 100);

    } catch (error) {
        console.error('Error loading periode for edit:', error);
        showToast('Error loading data', 'danger');
    }
}

async function confirmDeletePeriode(id) {
    const { showConfirm } = await import('../../ui.js');

    const confirmed = await showConfirm('Apakah Anda yakin ingin menghapus periode ini?');
    if (confirmed) {
        const result = await deletePeriode(id);
        if (result.success) {
            await loadPeriode(); // Reload the table
            showToast('Periode berhasil dihapus', 'success');
        } else {
            showToast('Error deleting: ' + result.message, 'danger');
        }
    }
}

async function handleFormSubmit(entity, id) {
    const formData = {
        nomor_urut: parseInt(document.getElementById('nomor_urut').value),
        nama_periode: document.getElementById('nama_periode').value,
        tanggal_awal: document.getElementById('tanggal_awal').value,
        tanggal_akhir: document.getElementById('tanggal_akhir').value
    };

    let result;
    if (id) {
        result = await updatePeriode(id, formData);
    } else {
        result = await addPeriode(formData);
    }

    if (result.success) {
        const { closeModal } = await import('../../ui.js');
        closeModal();
        await loadPeriode(); // Reload the table
        showToast(`${entity.charAt(0).toUpperCase() + entity.slice(1)} ${id ? 'updated' : 'added'} successfully`, 'success');
    } else {
        showToast('Error: ' + result.message, 'danger');
    }
}

// Export functions for global access
export {
    loadPeriode,
    addPeriode,
    updatePeriode,
    deletePeriode,
    editPeriode,
    confirmDeletePeriode,
    changePeriodePage,
    initializePeriodeSearchAndFilter,
    filterAndDisplayPeriode
};

// Backward compatibility for global functions
window.loadPeriode = loadPeriode;
window.editPeriode = editPeriode;
window.confirmDeletePeriode = confirmDeletePeriode;
