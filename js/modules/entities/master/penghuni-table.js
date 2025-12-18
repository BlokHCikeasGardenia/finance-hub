// Penghuni table rendering module
// Handles table display, pagination, and related UI logic

import { getPenghuniState, setPenghuniState } from './penghuni-data.js';

// Render penghuni table with pagination
function renderPenghuniTable(data) {
    const state = getPenghuniState();
    const totalPages = Math.ceil(data.length / state.penghuniItemsPerPage);
    const startIndex = (state.penghuniCurrentPage - 1) * state.penghuniItemsPerPage;
    const endIndex = startIndex + state.penghuniItemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    const tableHtml = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th style="width: 60px;">No.</th>
                        <th>Nama Kepala Keluarga</th>
                        <th>Agama</th>
                        <th>Status</th>
                        <th>Kondisi Khusus</th>
                        <th style="width: 180px;">Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    ${paginatedData.map((item, index) => `
                        <tr>
                            <td>${startIndex + index + 1}</td>
                            <td>${item.nama_kepala_keluarga}</td>
                            <td>${item.agama || '-'}</td>
                            <td>${item.status || '-'}</td>
                            <td><span class="badge bg-${item.kondisi_khusus ? 'warning' : 'secondary'}">${item.kondisi_khusus ? 'Ya' : 'Tidak'}</span></td>
                            <td>
                                <button onclick="editPenghuni('${item.id}')" class="btn btn-sm btn-outline-primary me-2">Edit</button>
                                <button onclick="confirmDeletePenghuni('${item.id}')" class="btn btn-sm btn-outline-danger">Hapus</button>
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
            ${renderPenghuniPagination(state.penghuniCurrentPage, totalPages)}
        </div>
    `;

    const tableElement = document.getElementById('penghuni-table');
    if (tableElement) {
        tableElement.innerHTML = tableHtml;
    }
}

// Render pagination for penghuni
function renderPenghuniPagination(currentPage, totalPages) {
    if (totalPages <= 1) return '';

    let paginationHtml = '<nav><ul class="pagination pagination-sm mb-0 justify-content-center">';

    // Previous button
    paginationHtml += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changePenghuniPage(${currentPage - 1})">Previous</a>
    </li>`;

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="changePenghuniPage(1)">1</a></li>`;
        if (startPage > 2) {
            paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="changePenghuniPage(${i})">${i}</a>
        </li>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
        paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="changePenghuniPage(${totalPages})">${totalPages}</a></li>`;
    }

    // Next button
    paginationHtml += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changePenghuniPage(${currentPage + 1})">Next</a>
    </li>`;

    paginationHtml += '</ul></nav>';
    return paginationHtml;
}

// Change page
function changePenghuniPage(page) {
    const state = getPenghuniState();
    const totalPages = Math.ceil(state.penghuniData.length / state.penghuniItemsPerPage);

    if (page < 1 || page > totalPages) return;

    setPenghuniState({ penghuniCurrentPage: page });

    // Re-render table with filters applied
    if (typeof applyPenghuniFilters === 'function') {
        applyPenghuniFilters(false); // false = not a filter change, just pagination
    }
}

export {
    renderPenghuniTable,
    renderPenghuniPagination,
    changePenghuniPage
};
