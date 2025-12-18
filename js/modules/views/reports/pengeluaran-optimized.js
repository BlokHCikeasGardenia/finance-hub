// Pengeluaran (Expense) Transaction Reports Module - OPTIMIZED VERSION
// All expense transaction reports with server-side pagination, search, sort, and filtering

import { supabase } from '../../config.js';
import { showToast, formatCurrency, renderPagination, debounce } from '../../utils.js';

// Global states for Pengeluaran view
let pengeluaranViewDataGlobal = [];
let pengeluaranCurrentPage = 1;
let pengeluaranItemsPerPage = 10;

// Load Pengeluaran View with Server-side Pagination
async function loadViewPengeluaran(selectedYear = null) {
    const contentDiv = document.getElementById('views-content');

    try {
        // Get all periods for year filtering
        const { data: allPeriods, error: periodsError } = await supabase
            .from('periode')
            .select('id, nama_periode, nomor_urut, tanggal_awal, tanggal_akhir')
            .order('nomor_urut');

        if (periodsError) throw periodsError;

        // Extract unique years from period names
        const availableYears = [...new Set(allPeriods.map(p => {
            const match = p.nama_periode.match(/(\d{4})$/);
            return match ? match[1] : null;
        }).filter(year => year !== null))].sort((a, b) => b - a);

        // Normalize selectedYear
        if (selectedYear == null) {
            const today = new Date();
            const activePeriod = allPeriods.find(p => {
                const startDate = new Date(p.tanggal_awal);
                const endDate = new Date(p.tanggal_akhir);
                return today >= startDate && today <= endDate;
            });
            selectedYear = activePeriod ? 
                activePeriod.nama_periode.match(/(\d{4})$/)?.[1] : 
                new Date().getFullYear().toString();
        }

        // Filter periods by selected year
        let periods = allPeriods;
        if (selectedYear !== 'all') {
            periods = allPeriods.filter(p => p.nama_periode.includes(selectedYear));
        }

        // Store data globally
        pengeluaranViewDataGlobal = [];
        pengeluaranCurrentPage = 1;

        // Create dynamic title and info text
        const isAllYearsMode = selectedYear === 'all';
        const displayYear = isAllYearsMode ? null : selectedYear;
        const dynamicTitle = isAllYearsMode ? 'View Data Pengeluaran' : `View Data Pengeluaran ${displayYear}`;
        const titleBadge = isAllYearsMode ? '<span class="badge bg-secondary ms-2">Semua Periode</span>' : `<span class="badge bg-primary ms-2">${displayYear}</span>`;
        const infoText = isAllYearsMode ? 'Data semua transaksi pengeluaran dari semua kategori dan periode' : `Data transaksi pengeluaran tahun ${displayYear} dari semua kategori`;

        const selectorClass = selectedYear === 'all' ? 'form-select form-select-sm' : 'form-select form-select-sm border-primary';

        const html = `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h4>${dynamicTitle}${titleBadge}</h4>
                        <div class="d-flex gap-2 align-items-center">
                            <div class="d-flex align-items-center gap-2">
                                <i class="bi bi-calendar3 text-primary"></i>
                                <label for="pengeluaran-year-select" class="form-label mb-0 fw-bold">Filter Tahun:</label>
                                <select class="${selectorClass}" id="pengeluaran-year-select" style="width: auto;">
                                    <option value="all">📊 Semua Periode</option>
                                    ${availableYears.map(year => `<option value="${year}" ${year === selectedYear ? 'selected' : ''}>📅 ${year}</option>`).join('')}
                                </select>
                            </div>
                            <button class="btn btn-secondary" onclick="loadViewsSection()">
                                <i class="bi bi-arrow-left"></i> Kembali ke Views
                            </button>
                        </div>
                    </div>

                    <!-- Info Banner -->
                    <div class="alert alert-info d-flex align-items-center mb-3">
                        <i class="bi bi-info-circle-fill me-2"></i>
                        <div>
                            <strong>Periode Data:</strong> ${infoText}
                        </div>
                    </div>

                    <p class="text-muted">Data semua transaksi pengeluaran dari semua kategori</p>

                    <!-- Search and Filter Section -->
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <label for="pengeluaran-search" class="form-label">Cari Transaksi:</label>
                                    <input type="text" class="form-control" id="pengeluaran-search" placeholder="Ketik tanggal, nominal, keterangan, penerima...">
                                </div>
                                <div class="col-md-2">
                                    <label for="pengeluaran-items-per-page" class="form-label">Data per Halaman:</label>
                                    <select class="form-select" id="pengeluaran-items-per-page">
                                        <option value="5">5</option>
                                        <option value="10" selected>10</option>
                                        <option value="25">25</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                    </select>
                                </div>
                                <div class="col-md-3 d-flex align-items-end gap-2">
                                    <button class="btn btn-outline-secondary" onclick="resetPengeluaranFilters()">Reset</button>
                                    <button class="btn btn-outline-primary" onclick="refreshViewPengeluaran()">
                                        <i class="bi bi-arrow-clockwise"></i> Refresh
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Summary Cards -->
                    <div class="row g-3 mb-3">
                        <div class="col-md-4">
                            <div class="card text-center">
                                <div class="card-body">
                                    <h6 class="card-title">Total Transaksi</h6>
                                    <p class="card-text fs-5 fw-bold text-primary" id="pengeluaran-total-count">0</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card text-center">
                                <div class="card-body">
                                    <h6 class="card-title">Total Pengeluaran</h6>
                                    <p class="card-text fs-5 fw-bold text-danger" id="pengeluaran-total-nominal">Total: Rp 0</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card text-center">
                                <div class="card-body">
                                    <h6 class="card-title">Rata-rata per Transaksi</h6>
                                    <p class="card-text fs-5 fw-bold text-warning">Rp 0</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="pengeluaran-table-container"></div>
                </div>
            </div>
        `;

        contentDiv.innerHTML = html;

        // Render initial table with server-side pagination
        await renderPengeluaranTableServerSide(1, selectedYear);

        // Initialize search and filter functionality
        setTimeout(() => {
            initializePengeluaranSearchAndFilterServerSide(selectedYear);
            initializePengeluaranYearSelector();
        }, 100);
    } catch (error) {
        console.error('Error loading pengeluaran view:', error);
        contentDiv.innerHTML = '<p class="text-danger">Error loading pengeluaran data</p>';
    }
}

// New function: Render Pengeluaran Table with Server-side Pagination
async function renderPengeluaranTableServerSide(page, selectedYear) {
    try {
        // Get periods for date range
        const { data: allPeriods, error: periodsError } = await supabase
            .from('periode')
            .select('id, tanggal_awal, tanggal_akhir')
            .order('tanggal_awal');

        if (periodsError) throw periodsError;

        let dateFrom = null;
        let dateTo = null;

        if (selectedYear !== 'all') {
            const periods = allPeriods.filter(p => p.nama_periode.includes(selectedYear));
            if (periods.length > 0) {
                dateFrom = periods[0].tanggal_awal;
                dateTo = periods[periods.length - 1].tanggal_akhir;
            }
        }

        // Get search and filter values
        const searchTerm = document.getElementById('pengeluaran-search')?.value || '';
        const itemsPerPage = parseInt(document.getElementById('pengeluaran-items-per-page')?.value || '10');

        // Call stored procedure
        const { data, error } = await supabase.rpc('get_pengeluaran_paginated_v2', {
            page_num: page,
            page_size: itemsPerPage,
            search_term: searchTerm,
            date_from: dateFrom,
            date_to: dateTo
        });

        if (error) throw error;

        if (!data || data.length === 0) {
            document.getElementById('pengeluaran-table-container').innerHTML = `
                <div class="alert alert-info">Tidak ada data pengeluaran ditemukan.</div>
            `;
            return;
        }

        // Extract total count from first row
        const total_count = data[0].total_count || 0;
        const totalPages = Math.ceil(total_count / itemsPerPage);

        // Render table
        const tableHtml = `
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-danger">
                        <tr>
                            <th style="width: 60px;">No.</th>
                            <th class="sortable" data-column="tanggal">Tanggal <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable text-end" data-column="nominal">Nominal <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable" data-column="keterangan">Keterangan <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable" data-column="nama_kategori">Kategori <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable" data-column="nama_subkategori">Subkategori <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th class="sortable" data-column="penerima">Penerima <i class="bi bi-chevron-expand sort-icon"></i></th>
                            <th>Bukti Transaksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map((item, index) => {
                            const startIndex = (page - 1) * itemsPerPage;
                            return `
                                <tr>
                                    <td>${startIndex + index + 1}</td>
                                    <td>${new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                                    <td class="text-end text-danger fw-bold">${formatCurrency(item.nominal)}</td>
                                    <td>${item.keterangan || '-'}</td>
                                    <td><span class="badge bg-danger">${item.nama_kategori || '-'}</span></td>
                                    <td>${item.nama_subkategori || '-'}</td>
                                    <td>${item.penerima || '-'}</td>
                                    <td>
                                        ${item.link_url ? `<a href="${item.link_url}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="bi bi-link-45deg"></i> Lihat</a>` : '-'}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="d-flex justify-content-between align-items-center mt-3">
                <div class="text-muted">
                    Menampilkan ${data.length > 0 ? (page - 1) * itemsPerPage + 1 : 0}-${(page - 1) * itemsPerPage + data.length} dari ${total_count} data
                </div>
                ${renderPagination('pengeluaran', page, totalPages)}
            </div>
        `;

        document.getElementById('pengeluaran-table-container').innerHTML = tableHtml;

        // Update summary cards
        const totalNominal = data.reduce((sum, item) => sum + (item.nominal || 0), 0);
        const totalCountElement = document.getElementById('pengeluaran-total-count');
        const totalNominalElement = document.getElementById('pengeluaran-total-nominal');

        if (totalCountElement) totalCountElement.textContent = `${total_count} transaksi`;
        if (totalNominalElement) totalNominalElement.textContent = `Total: ${formatCurrency(totalNominal)}`;

        // Attach sort event listeners
        attachPengeluaranSortListenersServerSide(selectedYear);

    } catch (error) {
        console.error('Error rendering pengeluaran table:', error);
        document.getElementById('pengeluaran-table-container').innerHTML = `
            <div class="alert alert-danger">Error loading data: ${error.message}</div>
        `;
    }
}

// New function: Initialize Server-side Search and Filter
function initializePengeluaranSearchAndFilterServerSide(selectedYear) {
    const searchInput = document.getElementById('pengeluaran-search');
    const itemsPerPageSelect = document.getElementById('pengeluaran-items-per-page');

    // Search functionality with debounce
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            renderPengeluaranTableServerSide(1, selectedYear);
        }, 500));
    }

    // Items per page functionality
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', () => {
            renderPengeluaranTableServerSide(1, selectedYear);
        });
    }
}

// New function: Attach Server-side Sort Listeners
function attachPengeluaranSortListenersServerSide(selectedYear) {
    const sortableHeaders = document.querySelectorAll('#pengeluaran-table-container .sortable');

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
            if (newSort !== 'none') {
                renderPengeluaranTableServerSide(1, selectedYear);
            }
        });
    });
}

// Update changePengeluaranPage function
async function changePengeluaranPage(page, selectedYear = null) {
    // Get current year filter
    const yearSelect = document.getElementById('pengeluaran-year-select');
    const currentYear = yearSelect ? yearSelect.value : (selectedYear || 'all');
    await renderPengeluaranTableServerSide(page, currentYear);
}

// Update resetPengeluaranFilters function
function resetPengeluaranFilters() {
    document.getElementById('pengeluaran-search').value = '';
    document.getElementById('pengeluaran-items-per-page').value = '10';
    renderPengeluaranTableServerSide(1, 'all');
}

// Update refreshViewPengeluaran function
async function refreshViewPengeluaran() {
    const yearSelect = document.getElementById('pengeluaran-year-select');
    const selectedYear = yearSelect ? yearSelect.value : 'all';
    await loadViewPengeluaran(selectedYear);
}

// Export functions
export {
    loadViewPengeluaran,
    refreshViewPengeluaran,
    initializePengeluaranYearSelector,
    changePengeluaranPage
};

// Backward compatibility for global window functions
window.loadViewPengeluaran = loadViewPengeluaran;
window.refreshViewPengeluaran = refreshViewPengeluaran;
window.resetPengeluaranFilters = resetPengeluaranFilters;
window.changePengeluaranPage = changePengeluaranPage;
