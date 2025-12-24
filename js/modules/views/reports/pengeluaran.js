// Pengeluaran (Expense) Transaction Reports Module
// All expense transaction reports across categories with search, sort, pagination

import { supabase } from '../../config.js';
import { showToast, formatCurrency, renderPagination, debounce } from '../../utils.js';

// Global states for Pengeluaran view
let pengeluaranViewDataGlobal = [];
let pengeluaranCurrentPage = 1;
let pengeluaranItemsPerPage = 10;

// Helper function to get badge color based on category
function getCategoryBadgeColor(categoryName) {
    if (!categoryName) return 'bg-danger';

    const category = categoryName.toLowerCase();
    if (category.includes('ipl')) return 'bg-info';        // Light blue for IPL
    if (category.includes('air')) return 'bg-primary';     // Blue for Air
    if (category.includes('aula')) return 'bg-warning';    // Yellow for Aula
    if (category.includes('lainnya')) return 'bg-secondary'; // Gray for Lainnya

    return 'bg-danger'; // Red for other categories
}

// Load Pengeluaran View
async function loadViewPengeluaran(selectedYear = null) {
    // Clear dashboard content when showing individual view
    const dashboardContent = document.getElementById('dashboard-content');
    if (dashboardContent) {
        dashboardContent.innerHTML = '';
    }

    const contentDiv = document.getElementById('views-content');

    // Clear content immediately to prevent showing dashboard cards
    contentDiv.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div><p>Loading Pengeluaran data...</p></div>';

    try {
        // Get all periods ordered by sequence
        const { data: allPeriods, error: periodsError } = await supabase
            .from('periode')
            .select('id, nama_periode, nomor_urut, tanggal_awal, tanggal_akhir')
            .order('nomor_urut');

        if (periodsError) throw periodsError;

        // Extract unique years from period names (e.g., "Jan2025" -> "2025")
        const availableYears = [...new Set(allPeriods.map(p => {
            const match = p.nama_periode.match(/(\d{4})$/);
            return match ? match[1] : null;
        }).filter(year => year !== null))].sort((a, b) => b - a); // Sort descending (newest first)

        // Find current active period based on today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

        const activePeriod = allPeriods.find(p => {
            const startDate = new Date(p.tanggal_awal);
            const endDate = new Date(p.tanggal_akhir);
            return today >= startDate && today <= endDate;
        });

        // Get year from active period, or fallback to current calendar year
        let defaultYear;
        if (activePeriod) {
            const yearMatch = activePeriod.nama_periode.match(/(\d{4})$/);
            defaultYear = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
        } else {
            defaultYear = new Date().getFullYear().toString();
        }

        // Normalize selectedYear: null/undefined means current active period year
        if (selectedYear == null) {
            selectedYear = defaultYear; // Use current active period year as default
        }

        // Filter periods by selected year
        let periods = allPeriods;
        if (selectedYear !== 'all') {
            periods = allPeriods.filter(p => p.nama_periode.includes(selectedYear));
        }

        // Initialize transactions variable
        let transactions = [];

        // Get all pengeluaran transactions within the selected periods
        let pengeluaranQuery = supabase
            .from('pengeluaran')
            .select(`
                tanggal,
                nominal,
                keterangan,
                kategori:kategori_id (nama_kategori),
                subkategori:subkategori_id (nama_subkategori),
                penerima,
                link_url
            `);

        // If specific periods are selected, filter by date range
        if (defaultYear !== 'all' && periods.length > 0) {
            // Create date ranges from selected periods
            const dateRanges = periods.map(p => ({
                start: p.tanggal_awal,
                end: p.tanggal_akhir
            }));

            // For multiple periods, we need to use OR logic
            // Supabase doesn't support complex OR in single query easily, so we'll filter client-side for now
            const { data: allPengeluaranData, error: allPengeluaranError } = await pengeluaranQuery;

            if (allPengeluaranError) throw allPengeluaranError;

            // Filter transactions that fall within any of the selected period ranges
            const filteredTransactions = (allPengeluaranData || []).filter(transaction => {
                const transactionDate = new Date(transaction.tanggal);
                return dateRanges.some(range => {
                    const startDate = new Date(range.start);
                    const endDate = new Date(range.end);
                    return transactionDate >= startDate && transactionDate <= endDate;
                });
            });

            transactions = filteredTransactions.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
        } else {
            // Get all transactions if "all" is selected
            const { data: pengeluaranData, error: pengeluaranError } = await pengeluaranQuery.order('tanggal', { ascending: false });
            if (pengeluaranError) throw pengeluaranError;
            transactions = pengeluaranData || [];
        }

        // Store data globally for search/filter operations
        pengeluaranViewDataGlobal = transactions;

        // Reset pagination when loading fresh data
        pengeluaranCurrentPage = 1;

        // Create dynamic title and info text based on selected year
        const isAllYearsMode = selectedYear === 'all';

        const displayYear = isAllYearsMode ? null : selectedYear;

        const dynamicTitle = 'Detail Pengeluaran';

        const titleBadge = isAllYearsMode
            ? '<span class="badge bg-secondary ms-2">Semua Periode</span>'
            : `<span class="badge bg-primary ms-2">${displayYear}</span>`;

        const infoText = isAllYearsMode
            ? 'Data semua transaksi pengeluaran dari semua kategori dan periode'
            : `Data transaksi pengeluaran tahun ${displayYear} dari semua kategori`;

        const selectorClass = selectedYear === 'all'
            ? 'form-select form-select-sm'
            : 'form-select form-select-sm border-primary';

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
                        <button class="btn btn-warning text-dark" onclick="loadViewsSection()">
                            <i class="bi bi-arrow-left"></i> Back
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



                    <div id="pengeluaran-table-container"></div>
                </div>
            </div>
        `;

        contentDiv.innerHTML = html;

        // Render initial table
        renderPengeluaranTable(pengeluaranViewDataGlobal);

        // Initialize search and filter functionality
        setTimeout(() => {
            initializePengeluaranSearchAndFilter();
            initializePengeluaranYearSelector();
        }, 100);
    } catch (error) {
        console.error('Error loading pengeluaran view:', error);
        contentDiv.innerHTML = '<p class="text-danger">Error loading pengeluaran data</p>';
    }
}

// Render Pengeluaran Table with pagination
function renderPengeluaranTable(data) {
    // Ensure current page is valid
    const totalPages = Math.ceil(data.length / pengeluaranItemsPerPage);
    if (pengeluaranCurrentPage > totalPages && totalPages > 0) {
        pengeluaranCurrentPage = totalPages;
    } else if (pengeluaranCurrentPage < 1 || totalPages === 0) {
        pengeluaranCurrentPage = 1;
    }

    const startIndex = (pengeluaranCurrentPage - 1) * pengeluaranItemsPerPage;
    const endIndex = Math.min(startIndex + pengeluaranItemsPerPage, data.length);
    const paginatedData = data.slice(startIndex, endIndex);

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
                    ${paginatedData.length > 0 ? paginatedData.map((item, index) => `
                        <tr>
                            <td>${startIndex + index + 1}</td>
                            <td>${new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                            <td class="text-end text-danger fw-bold">${formatCurrency(item.nominal)}</td>
                            <td>${item.keterangan || '-'}</td>
                            <td><span class="badge ${getCategoryBadgeColor(item.kategori?.nama_kategori)}">${item.kategori?.nama_kategori || '-'}</span></td>
                            <td>${item.subkategori?.nama_subkategori || '-'}</td>
                            <td>${item.penerima || '-'}</td>
                            <td>
                                ${item.link_url ? `<a href="${item.link_url}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="bi bi-link-45deg"></i> Lihat</a>` : '-'}
                            </td>
                        </tr>
                    `).join('') : '<tr><td colspan="8" class="text-center text-muted">Tidak ada data pengeluaran</td></tr>'}
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        ${totalPages > 1 ? `
        <div class="d-flex justify-content-between align-items-center mt-3">
            <div class="text-muted">
                Menampilkan ${paginatedData.length > 0 ? startIndex + 1 : 0}-${startIndex + paginatedData.length} dari ${data.length} data
            </div>
            <nav aria-label="Pengeluaran pagination">
                <ul class="pagination pagination-sm mb-0">
                    <li class="page-item ${pengeluaranCurrentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changePengeluaranPage(${pengeluaranCurrentPage - 1}); return false;" aria-label="Previous">
                            <span aria-hidden="true">&laquo;</span>
                        </a>
                    </li>
                    ${Array.from({length: totalPages}, (_, i) => i + 1).map(page => `
                        <li class="page-item ${page === pengeluaranCurrentPage ? 'active' : ''}">
                            <a class="page-link" href="#" onclick="changePengeluaranPage(${page}); return false;">${page}</a>
                        </li>
                    `).join('')}
                    <li class="page-item ${pengeluaranCurrentPage === totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changePengeluaranPage(${pengeluaranCurrentPage + 1}); return false;" aria-label="Next">
                            <span aria-hidden="true">&raquo;</span>
                        </a>
                    </li>
                </ul>
            </nav>
        </div>
        ` : ''}
    `;

    const container = document.getElementById('pengeluaran-table-container');
    if (container) {
        container.innerHTML = tableHtml;
        // Re-attach sort event listeners
        attachPengeluaranSortListeners();
    }
}

// Initialize Pengeluaran Search and Filter
function initializePengeluaranSearchAndFilter() {
    const searchInput = document.getElementById('pengeluaran-search');
    const itemsPerPageSelect = document.getElementById('pengeluaran-items-per-page');

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            applyPengeluaranFilters();
        }, 300));
    }

    // Items per page functionality
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', (e) => {
            updatePengeluaranItemsPerPage(parseInt(e.target.value));
        });
    }
}

// Reset Pengeluaran Filters
function resetPengeluaranFilters() {
    document.getElementById('pengeluaran-search').value = '';
    pengeluaranCurrentPage = 1;
    applyPengeluaranFilters();
}

// Apply Pengeluaran Filters
function applyPengeluaranFilters(isFilterChange = true) {
    const searchTerm = document.getElementById('pengeluaran-search')?.value.toLowerCase() || '';

    let filteredData = [...pengeluaranViewDataGlobal];

    // Apply search filter
    if (searchTerm) {
        filteredData = filteredData.filter(item =>
            new Date(item.tanggal).toLocaleDateString('id-ID').toLowerCase().includes(searchTerm) ||
            item.nominal.toString().includes(searchTerm) ||
            (item.keterangan || '').toLowerCase().includes(searchTerm) ||
            (item.kategori?.nama_kategori || '').toLowerCase().includes(searchTerm) ||
            (item.subkategori?.nama_subkategori || '').toLowerCase().includes(searchTerm) ||
            (item.penerima || '').toLowerCase().includes(searchTerm)
        );
    }

    // Reset to page 1 only when filters actually change
    if (isFilterChange) {
        pengeluaranCurrentPage = 1;
    }

    renderPengeluaranTable(filteredData);
}

// Update Pengeluaran Items Per Page
function updatePengeluaranItemsPerPage(newItemsPerPage) {
    pengeluaranItemsPerPage = newItemsPerPage;
    pengeluaranCurrentPage = 1; // Reset to first page
    applyPengeluaranFilters(false);
}

// Attach Pengeluaran Sort Listeners
function attachPengeluaranSortListeners() {
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
            sortPengeluaranData(column, newSort);
        });
    });
}

// Sort Pengeluaran Data
function sortPengeluaranData(column, direction) {
    if (direction === 'none') {
        renderPengeluaranTable(pengeluaranViewDataGlobal);
        return;
    }

    let filteredData = [...pengeluaranViewDataGlobal];

    // Apply current filters first
    const searchTerm = document.getElementById('pengeluaran-search')?.value.toLowerCase() || '';

    if (searchTerm) {
        filteredData = filteredData.filter(item =>
            new Date(item.tanggal).toLocaleDateString('id-ID').toLowerCase().includes(searchTerm) ||
            item.nominal.toString().includes(searchTerm) ||
            (item.keterangan || '').toLowerCase().includes(searchTerm) ||
            (item.kategori?.nama_kategori || '').toLowerCase().includes(searchTerm) ||
            (item.subkategori?.nama_subkategori || '').toLowerCase().includes(searchTerm) ||
            (item.penerima || '').toLowerCase().includes(searchTerm)
        );
    }

    // Sort the filtered data
    filteredData.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];

        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return direction === 'asc' ? 1 : -1;
        if (bVal == null) return direction === 'asc' ? -1 : 1;

        // Special handling for nested objects
        if (column === 'nama_kategori') {
            aVal = a.kategori?.nama_kategori || '';
            bVal = b.kategori?.nama_kategori || '';
        } else if (column === 'nama_subkategori') {
            aVal = a.subkategori?.nama_subkategori || '';
            bVal = b.subkategori?.nama_subkategori || '';
        }

        // Special handling for date columns
        if (column === 'tanggal') {
            aVal = new Date(aVal).getTime();
            bVal = new Date(bVal).getTime();
            return direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // Special handling for numeric columns
        if (column === 'nominal') {
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

    renderPengeluaranTable(filteredData);
}

// Change Pengeluaran Page
function changePengeluaranPage(page) {
    pengeluaranCurrentPage = page;
    // Re-filter data and render
    const searchTerm = document.getElementById('pengeluaran-search')?.value.toLowerCase() || '';
    let filteredData = [...pengeluaranViewDataGlobal];

    if (searchTerm) {
        filteredData = filteredData.filter(item =>
            new Date(item.tanggal).toLocaleDateString('id-ID').toLowerCase().includes(searchTerm) ||
            item.nominal.toString().includes(searchTerm) ||
            (item.keterangan || '').toLowerCase().includes(searchTerm) ||
            (item.kategori?.nama_kategori || '').toLowerCase().includes(searchTerm) ||
            (item.subkategori?.nama_subkategori || '').toLowerCase().includes(searchTerm) ||
            (item.penerima || '').toLowerCase().includes(searchTerm)
        );
    }

    renderPengeluaranTable(filteredData);
}

// Initialize Pengeluaran Year Selector
function initializePengeluaranYearSelector() {
    const yearSelect = document.getElementById('pengeluaran-year-select');
    if (yearSelect) {
        yearSelect.addEventListener('change', (e) => {
            const selectedYear = e.target.value;
            loadViewPengeluaran(selectedYear);
        });
    }
}

// Refresh Pengeluaran View
function refreshViewPengeluaran() {
    const yearSelect = document.getElementById('pengeluaran-year-select');
    const selectedYear = yearSelect ? yearSelect.value : null;
    loadViewPengeluaran(selectedYear);
}

export {
    loadViewPengeluaran,
    refreshViewPengeluaran,
    initializePengeluaranYearSelector,
    changePengeluaranPage
};

// Toggle detailed columns visibility on mobile
function togglePengeluaranDetails() {
    const toggleableCells = document.querySelectorAll('td.d-md-table-cell, th.d-md-table-cell');
    const toggleText = document.getElementById('toggle-text');
    const toggleIcon = document.querySelector('#togglePengeluaranDetailsBtn i');

    if (toggleableCells.length > 0) {
        const isHidden = toggleableCells[0].classList.contains('d-none');

        if (isHidden) {
            // Show hidden columns
            toggleableCells.forEach(cell => {
                cell.classList.remove('d-none');
            });
            if (toggleText) toggleText.textContent = 'Sembunyikan';
            if (toggleIcon) toggleIcon.className = 'bi bi-eye-slash';
        } else {
            // Hide columns again
            toggleableCells.forEach(cell => {
                cell.classList.add('d-none');
            });
            if (toggleText) toggleText.textContent = 'Selengkapnya';
            if (toggleIcon) toggleIcon.className = 'bi bi-eye';
        }
    }
}

// Backward compatibility for global window functions
window.loadViewPengeluaran = loadViewPengeluaran;
window.refreshViewPengeluaran = refreshViewPengeluaran;
window.resetPengeluaranFilters = resetPengeluaranFilters;
window.changePengeluaranPage = changePengeluaranPage;
window.togglePengeluaranDetails = togglePengeluaranDetails;
