// Meteran Air Billing table module
// Handles table display, filtering, and actions for consolidated billing data

import { showToast } from '../../utils.js';
import {
    loadMeteranAirBilling,
    confirmDeleteMeteranAirBilling,
    getOutstandingMeteranAirBillingByHunian
} from './meteran_air_billing-data.js';
import { showMeteranAirBillingForm } from './meteran_air_billing-form.js';

// Global table state
let meteranAirBillingTableData = [];
let meteranAirBillingCurrentPage = 1;
let meteranAirBillingItemsPerPage = 10;

// Initialize table display
async function initializeMeteranAirBillingTable(containerId = 'meteran_air_billing-table') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Load initial data
    await loadMeteranAirBillingTableData();

    // Render table
    renderMeteranAirBillingTable(container);

    // Setup filters and search
    setupMeteranAirBillingTableFilters();
}

// Load table data with current filters
async function loadMeteranAirBillingTableData(filters = {}) {
    try {
        const { success, data } = await loadMeteranAirBilling(filters);
        if (success) {
            meteranAirBillingTableData = data;
            return true;
        } else {
            showToast('Error loading data', 'danger');
            return false;
        }
    } catch (error) {
        console.error('Error loading table data:', error);
        showToast('Error loading data', 'danger');
        return false;
    }
}

// Render table HTML
function renderMeteranAirBillingTable(container) {
    const tableHtml = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5>Data Meteran Air & Tagihan</h5>
            <button type="button" class="btn btn-primary" onclick="showMeteranAirBillingForm()">
                <i class="bi bi-plus-circle"></i> Input Meteran & Generate Tagihan
            </button>
        </div>

        <!-- Filters -->
        <div class="row mb-3" id="meteran_air_billing-filters">
            <div class="col-md-3">
                <select class="form-select" id="billing-filter-status">
                    <option value="">Semua Status</option>
                    <option value="belum_bayar">Belum Bayar</option>
                    <option value="sebagian">Sebagian</option>
                    <option value="lunas">Lunas</option>
                </select>
            </div>
            <div class="col-md-3">
                <input type="text" class="form-control" id="billing-filter-hunian"
                       placeholder="Cari rumah...">
            </div>
            <div class="col-md-3">
                <input type="text" class="form-control" id="billing-filter-periode"
                       placeholder="Cari periode...">
            </div>
            <div class="col-md-3">
                <button type="button" class="btn btn-outline-secondary" onclick="clearMeteranAirBillingFilters()">
                    <i class="bi bi-x-circle"></i> Clear
                </button>
            </div>
        </div>

        <!-- Table -->
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>Rumah</th>
                        <th>Penghuni</th>
                        <th>Periode</th>
                        <th>Meter Saat Ini</th>
                        <th>Meter Sebelumnya</th>
                        <th>Pemakaian (m³)</th>
                        <th>Tarif (Rp/m³)</th>
                        <th>Tagihan (Rp)</th>
                        <th>Status</th>
                        <th>Tanggal Tagihan</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody id="meteran_air_billing-table-body">
                    ${renderMeteranAirBillingTableRows()}
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <div class="d-flex justify-content-between align-items-center mt-3">
            <div>
                <small class="text-muted">
                    Menampilkan ${getMeteranAirBillingDisplayRange()} dari ${meteranAirBillingTableData.length} data
                </small>
            </div>
            <nav aria-label="Meteran Air Billing pagination">
                <ul class="pagination pagination-sm mb-0" id="meteran_air_billing-pagination">
                    ${renderMeteranAirBillingPagination()}
                </ul>
            </nav>
        </div>
    `;

    container.innerHTML = tableHtml;
}

// Render table rows
function renderMeteranAirBillingTableRows() {
    if (!meteranAirBillingTableData || meteranAirBillingTableData.length === 0) {
        return `
            <tr>
                <td colspan="11" class="text-center text-muted py-4">
                    <i class="bi bi-inbox"></i> Tidak ada data meteran air billing
                </td>
            </tr>
        `;
    }

    const startIndex = (meteranAirBillingCurrentPage - 1) * meteranAirBillingItemsPerPage;
    const endIndex = startIndex + meteranAirBillingItemsPerPage;
    const pageData = meteranAirBillingTableData.slice(startIndex, endIndex);

    return pageData.map(item => `
        <tr>
            <td>${item.hunian?.nomor_blok_rumah || '-'}</td>
            <td>${item.penghuni?.nama_kepala_keluarga || '-'}</td>
            <td>${item.periode?.nama_periode || '-'}</td>
            <td>${formatNumber(item.meteran_periode_ini)}</td>
            <td>${formatNumber(item.meteran_periode_sebelumnya)}</td>
            <td>${formatNumber(item.pemakaian_m3)}</td>
            <td>${formatCurrency(item.tarif_per_kubik)}</td>
            <td>${formatCurrency(item.nominal_tagihan)}</td>
            <td>
                <span class="badge ${getStatusBadgeClass(item.status)}">
                    ${formatStatus(item.status)}
                </span>
            </td>
            <td>${formatDate(item.tanggal_tagihan)}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button type="button" class="btn btn-outline-primary btn-sm"
                            onclick="viewMeteranAirBillingDetail('${item.id}')"
                            title="Lihat Detail">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger btn-sm"
                            onclick="confirmDeleteMeteranAirBilling('${item.id}')"
                            title="Hapus">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Render pagination
function renderMeteranAirBillingPagination() {
    const totalPages = Math.ceil(meteranAirBillingTableData.length / meteranAirBillingItemsPerPage);
    if (totalPages <= 1) return '';

    let paginationHtml = '';

    // Previous button
    if (meteranAirBillingCurrentPage > 1) {
        paginationHtml += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changeMeteranAirBillingPage(${meteranAirBillingCurrentPage - 1})">
                    <i class="bi bi-chevron-left"></i>
                </a>
            </li>
        `;
    }

    // Page numbers
    const startPage = Math.max(1, meteranAirBillingCurrentPage - 2);
    const endPage = Math.min(totalPages, meteranAirBillingCurrentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `
            <li class="page-item ${i === meteranAirBillingCurrentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changeMeteranAirBillingPage(${i})">${i}</a>
            </li>
        `;
    }

    // Next button
    if (meteranAirBillingCurrentPage < totalPages) {
        paginationHtml += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changeMeteranAirBillingPage(${meteranAirBillingCurrentPage + 1})">
                    <i class="bi bi-chevron-right"></i>
                </a>
            </li>
        `;
    }

    return paginationHtml;
}

// Setup table filters
function setupMeteranAirBillingTableFilters() {
    const statusFilter = document.getElementById('billing-filter-status');
    const hunianFilter = document.getElementById('billing-filter-hunian');
    const periodeFilter = document.getElementById('billing-filter-periode');

    if (statusFilter) {
        statusFilter.addEventListener('change', () => applyMeteranAirBillingFilters());
    }

    if (hunianFilter) {
        hunianFilter.addEventListener('input', debounce(() => applyMeteranAirBillingFilters(), 300));
    }

    if (periodeFilter) {
        periodeFilter.addEventListener('input', debounce(() => applyMeteranAirBillingFilters(), 300));
    }
}

// Apply filters to table data
async function applyMeteranAirBillingFilters() {
    const statusFilter = document.getElementById('billing-filter-status')?.value || '';
    const hunianFilter = document.getElementById('billing-filter-hunian')?.value?.toLowerCase() || '';
    const periodeFilter = document.getElementById('billing-filter-periode')?.value?.toLowerCase() || '';

    const filters = {};

    if (statusFilter) filters.status = statusFilter;
    if (hunianFilter) filters.hunian_search = hunianFilter;
    if (periodeFilter) filters.periode_search = periodeFilter;

    await loadMeteranAirBillingTableData(filters);
    meteranAirBillingCurrentPage = 1; // Reset to first page
    updateMeteranAirBillingTableDisplay();
}

// Clear all filters
function clearMeteranAirBillingFilters() {
    const statusFilter = document.getElementById('billing-filter-status');
    const hunianFilter = document.getElementById('billing-filter-hunian');
    const periodeFilter = document.getElementById('billing-filter-periode');

    if (statusFilter) statusFilter.value = '';
    if (hunianFilter) hunianFilter.value = '';
    if (periodeFilter) periodeFilter.value = '';

    applyMeteranAirBillingFilters();
}

// Change page
function changeMeteranAirBillingPage(page) {
    meteranAirBillingCurrentPage = page;
    updateMeteranAirBillingTableDisplay();
}

// Update table display after data changes
function updateMeteranAirBillingTableDisplay() {
    const tableBody = document.getElementById('meteran_air_billing-table-body');
    const pagination = document.getElementById('meteran_air_billing-pagination');

    if (tableBody) {
        tableBody.innerHTML = renderMeteranAirBillingTableRows();
    }

    if (pagination) {
        pagination.innerHTML = renderMeteranAirBillingPagination();
    }

    // Update display range info
    const rangeElement = document.querySelector('.text-muted');
    if (rangeElement) {
        rangeElement.textContent = `Menampilkan ${getMeteranAirBillingDisplayRange()} dari ${meteranAirBillingTableData.length} data`;
    }
}

// Get display range text
function getMeteranAirBillingDisplayRange() {
    const startIndex = (meteranAirBillingCurrentPage - 1) * meteranAirBillingItemsPerPage + 1;
    const endIndex = Math.min(startIndex + meteranAirBillingItemsPerPage - 1, meteranAirBillingTableData.length);
    return `${startIndex}-${endIndex}`;
}

// View billing detail (placeholder for future enhancement)
function viewMeteranAirBillingDetail(id) {
    showToast('Detail view akan diimplementasikan', 'info');
}

// Helper functions
function formatNumber(value) {
    if (value === null || value === undefined) return '-';
    return parseFloat(value).toFixed(2);
}

function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID');
}

function formatStatus(status) {
    const statusMap = {
        'belum_bayar': 'Belum Bayar',
        'sebagian': 'Sebagian',
        'lunas': 'Lunas'
    };
    return statusMap[status] || status;
}

function getStatusBadgeClass(status) {
    const classMap = {
        'belum_bayar': 'bg-danger',
        'sebagian': 'bg-warning text-dark',
        'lunas': 'bg-success'
    };
    return classMap[status] || 'bg-secondary';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export functions for global access
window.showMeteranAirBillingForm = showMeteranAirBillingForm;
window.confirmDeleteMeteranAirBilling = confirmDeleteMeteranAirBilling;
window.changeMeteranAirBillingPage = changeMeteranAirBillingPage;
window.clearMeteranAirBillingFilters = clearMeteranAirBillingFilters;
window.viewMeteranAirBillingDetail = viewMeteranAirBillingDetail;

export {
    initializeMeteranAirBillingTable,
    loadMeteranAirBillingTableData,
    renderMeteranAirBillingTable,
    applyMeteranAirBillingFilters,
    clearMeteranAirBillingFilters,
    changeMeteranAirBillingPage,
    updateMeteranAirBillingTableDisplay
};