// Pemasukan (Income) Transaction Reports Module
// All income transaction reports across categories with search, sort, pagination

import { supabase } from '../../config.js';
import { showToast, formatCurrency, renderPagination, debounce } from '../../utils.js';

// Global states for Pemasukan view
let pemasukanViewDataGlobal = [];
let pemasukanCurrentPage = 1;
let pemasukanItemsPerPage = 10;

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

// Render periode column with conditional display
function renderPeriodeColumn(item) {
    // For now, show placeholder - will be enhanced with actual periode data
    // TODO: Implement logic to get periode data from payment allocations
    return '<span class="text-muted">-</span>';
}

// Load Pemasukan View
async function loadViewPemasukan(selectedYear = null) {
    // Clear dashboard content when showing individual view
    const dashboardContent = document.getElementById('dashboard-content');
    if (dashboardContent) {
        dashboardContent.innerHTML = '';
    }

    const contentDiv = document.getElementById('views-content');

    // Clear content immediately to prevent showing dashboard cards
    contentDiv.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div><p>Loading Pemasukan data...</p></div>';

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

        // Get all pemasukan transactions within the selected periods
        let pemasukanQuery = supabase
            .from('pemasukan')
            .select(`
                id_transaksi,
                tanggal,
                nominal,
                penghuni:penghuni_id (nama_kepala_keluarga),
                rekening:rekening_id (jenis_rekening),
                kategori:kategori_id (nama_kategori),
                keterangan
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
            const { data: allPemasukanData, error: allPemasukanError } = await pemasukanQuery;

            if (allPemasukanError) throw allPemasukanError;

            // Filter transactions that fall within any of the selected period ranges
            const filteredTransactions = (allPemasukanData || []).filter(transaction => {
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
            const { data: pemasukanData, error: pemasukanError } = await pemasukanQuery.order('tanggal', { ascending: false });
            if (pemasukanError) throw pemasukanError;
            transactions = pemasukanData || [];
        }

        // Store data globally for search/filter operations
        pemasukanViewDataGlobal = transactions;

        // Reset pagination when loading fresh data
        pemasukanCurrentPage = 1;

        // Create dynamic title and info text based on selected year
        const isAllYearsMode = selectedYear === 'all';

        const displayYear = isAllYearsMode ? null : selectedYear;

        const dynamicTitle = 'Detail Pemasukan';

        const titleBadge = isAllYearsMode
            ? '<span class="badge bg-secondary ms-2">Semua Periode</span>'
            : `<span class="badge bg-primary ms-2">${displayYear}</span>`;

        const infoText = isAllYearsMode
            ? 'Data semua transaksi pemasukan dari semua kategori dan periode'
            : `Data transaksi pemasukan tahun ${displayYear} dari semua kategori`;

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
                                <label for="pemasukan-year-select" class="form-label mb-0 fw-bold">Filter Tahun:</label>
                                <select class="${selectorClass}" id="pemasukan-year-select" style="width: auto;">
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

                    <p class="text-muted">Data semua transaksi pemasukan dari semua kategori</p>

                    <!-- Search and Filter Section -->
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <label for="pemasukan-search" class="form-label">Cari Transaksi:</label>
                                    <input type="text" class="form-control" id="pemasukan-search" placeholder="Ketik ID, nominal, nama, kategori...">
                                </div>
                                <div class="col-md-2">
                                    <label for="pemasukan-items-per-page" class="form-label">Data per Halaman:</label>
                                    <select class="form-select" id="pemasukan-items-per-page">
                                        <option value="5">5</option>
                                        <option value="10" selected>10</option>
                                        <option value="25">25</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                    </select>
                                </div>
                                <div class="col-md-3 d-flex align-items-end gap-2">
                                    <button class="btn btn-outline-secondary" onclick="resetPemasukanFilters()">Reset</button>
                                    <button class="btn btn-outline-primary" onclick="refreshViewPemasukan()">
                                        <i class="bi bi-arrow-clockwise"></i> Refresh
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>



                    <div id="pemasukan-table-container"></div>
                </div>
            </div>
        `;

        contentDiv.innerHTML = html;

        // Render initial table
        renderPemasukanTable(pemasukanViewDataGlobal);

        // Initialize search and filter functionality
        setTimeout(() => {
            initializePemasukanSearchAndFilter();
            initializePemasukanYearSelector();
        }, 100);
    } catch (error) {
        console.error('Error loading pemasukan view:', error);
        contentDiv.innerHTML = '<p class="text-danger">Error loading pemasukan data</p>';
    }
}

// Render Pemasukan Table with pagination
function renderPemasukanTable(data) {
    const totalPages = Math.ceil(data.length / pemasukanItemsPerPage);
    const startIndex = (pemasukanCurrentPage - 1) * pemasukanItemsPerPage;
    const endIndex = startIndex + pemasukanItemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    const tableHtml = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-primary">
                    <tr>
                        <th style="width: 60px;">No.</th>
                        <th class="sortable" data-column="tanggal">Tanggal <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th class="sortable text-end" data-column="nominal">Nominal <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th class="sortable" data-column="nama_kepala_keluarga">Diterima Dari <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th class="sortable" data-column="nama_kategori">Kategori <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th>Periode</th>
                        <th>Keterangan</th>
                    </tr>
                </thead>
                <tbody>
                    ${paginatedData.map((item, index) => `
                        <tr>
                            <td>${startIndex + index + 1}</td>
                            <td>${new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                            <td class="text-end text-success fw-bold">${formatCurrency(item.nominal)}</td>
                            <td>${item.penghuni?.nama_kepala_keluarga || 'Sumber External'}</td>
                            <td><span class="badge ${getCategoryBadgeColor(item.kategori?.nama_kategori)}">${item.kategori?.nama_kategori || '-'}</span></td>
                            <td>${renderPeriodeColumn(item)}</td>
                            <td>${item.keterangan || '-'}</td>
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
            ${renderPagination('pemasukan', pemasukanCurrentPage, totalPages)}
        </div>
    `;

    document.getElementById('pemasukan-table-container').innerHTML = tableHtml;

    // Re-attach sort event listeners
    attachPemasukanSortListeners();
}

// Initialize Pemasukan Search and Filter
function initializePemasukanSearchAndFilter() {
    const searchInput = document.getElementById('pemasukan-search');
    const itemsPerPageSelect = document.getElementById('pemasukan-items-per-page');

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            applyPemasukanFilters();
        }, 300));
    }

    // Items per page functionality
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', (e) => {
            updatePemasukanItemsPerPage(parseInt(e.target.value));
        });
    }
}

// Reset Pemasukan Filters
function resetPemasukanFilters() {
    document.getElementById('pemasukan-search').value = '';
    pemasukanCurrentPage = 1;
    applyPemasukanFilters();
}

// Apply Pemasukan Filters
function applyPemasukanFilters(isFilterChange = true) {
    const searchTerm = document.getElementById('pemasukan-search')?.value.toLowerCase() || '';

    let filteredData = [...pemasukanViewDataGlobal];

    // Apply search filter
    if (searchTerm) {
        filteredData = filteredData.filter(item =>
            item.nominal.toString().includes(searchTerm) ||
            (item.penghuni?.nama_kepala_keluarga || '').toLowerCase().includes(searchTerm) ||
            (item.kategori?.nama_kategori || '').toLowerCase().includes(searchTerm) ||
            (item.keterangan || '').toLowerCase().includes(searchTerm)
        );
    }

    // Reset to page 1 only when filters actually change
    if (isFilterChange) {
        pemasukanCurrentPage = 1;
    }

    renderPemasukanTable(filteredData);
}

// Update Pemasukan Items Per Page
function updatePemasukanItemsPerPage(newItemsPerPage) {
    pemasukanItemsPerPage = newItemsPerPage;
    pemasukanCurrentPage = 1; // Reset to first page
    applyPemasukanFilters(false);
}

// Attach Pemasukan Sort Listeners
function attachPemasukanSortListeners() {
    const sortableHeaders = document.querySelectorAll('#pemasukan-table-container .sortable');

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
            sortPemasukanData(column, newSort);
        });
    });
}

// Sort Pemasukan Data
function sortPemasukanData(column, direction) {
    if (direction === 'none') {
        renderPemasukanTable(pemasukanViewDataGlobal);
        return;
    }

    let filteredData = [...pemasukanViewDataGlobal];

    // Apply current filters first
    const searchTerm = document.getElementById('pemasukan-search')?.value.toLowerCase() || '';

    if (searchTerm) {
        filteredData = filteredData.filter(item =>
            item.nominal.toString().includes(searchTerm) ||
            (item.penghuni?.nama_kepala_keluarga || '').toLowerCase().includes(searchTerm) ||
            (item.kategori?.nama_kategori || '').toLowerCase().includes(searchTerm) ||
            (item.keterangan || '').toLowerCase().includes(searchTerm)
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
        if (column === 'nama_kepala_keluarga') {
            aVal = a.penghuni?.nama_kepala_keluarga || '';
            bVal = b.penghuni?.nama_kepala_keluarga || '';
        } else if (column === 'nama_kategori') {
            aVal = a.kategori?.nama_kategori || '';
            bVal = b.kategori?.nama_kategori || '';
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

    renderPemasukanTable(filteredData);
}

// Change Pemasukan Page
function changePemasukanPage(page) {
    pemasukanCurrentPage = page;
    applyPemasukanFilters(false); // false = not a filter change, just pagination
}

// Initialize Pemasukan Year Selector
function initializePemasukanYearSelector() {
    const yearSelect = document.getElementById('pemasukan-year-select');
    if (yearSelect) {
        yearSelect.addEventListener('change', (e) => {
            const selectedYear = e.target.value;
            loadViewPemasukan(selectedYear);
        });
    }
}

// Refresh Pemasukan View
function refreshViewPemasukan() {
    const yearSelect = document.getElementById('pemasukan-year-select');
    const selectedYear = yearSelect ? yearSelect.value : null;
    loadViewPemasukan(selectedYear);
}

export {
    loadViewPemasukan,
    refreshViewPemasukan,
    initializePemasukanYearSelector,
    changePemasukanPage
};

// Backward compatibility for global window functions
window.loadViewPemasukan = loadViewPemasukan;
window.refreshViewPemasukan = refreshViewPemasukan;
window.resetPemasukanFilters = resetPemasukanFilters;
window.changePemasukanPage = changePemasukanPage;
