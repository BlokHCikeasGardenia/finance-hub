// Tagihan IPL Management Module
// Handles viewing, editing, and managing existing IPL bills

import { supabase } from '../../config.js';
import { showModal, closeModal, showConfirm } from '../../ui.js';
import { showToast, formatCurrency, parseFormattedNumber } from '../../utils.js';
import { paginateData } from '../../crud.js';
import { setupIplSmartAutofill } from './tagihan_ipl-form.js';

// Helper function for tariff type display names
function getTypeDisplayName(typeTarif) {
    switch (typeTarif) {
        case 'IPL': return 'IPL Normal';
        case 'IPL_RUMAH_KOSONG': return 'IPL Rumah Kosong';
        case 'DAU': return 'DAU';
        default: return typeTarif;
    }
}

// Global state for IPL bills management
let iplBillsData = [];
let iplBillsCurrentPage = 1;
let iplBillsItemsPerPage = 10;
let iplBillsFilteredData = null;
let iplBillsSearchTerm = '';
let iplBillsFilterStatus = '';
let iplBillsFilterPeriode = '';
let iplBillsSortBy = '';
let iplBillsSortOrder = 'asc';

// Load IPL bills management view
async function loadIplBillsManagement() {
    // Since the HTML is now embedded directly in the section-loader,
    // we just need to load the data and initialize controls

    // Load initial data
    await loadIplBillsData();

    // Initialize controls
    initializeIplBillsControls();
}

// Load IPL bills data
async function loadIplBillsData() {
    try {
        showToast('Memuat data tagihan IPL...', 'info');

        const { data, error } = await supabase
            .from('tagihan_ipl')
            .select(`
                *,
                periode:periode_id (nama_periode, tanggal_awal, tanggal_akhir),
                hunian:hunian_id (nomor_blok_rumah),
                penghuni:penghuni_id (nama_kepala_keluarga)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        iplBillsData = data || [];
        displayIplBillsTable();

        // Load periode options for filter
        await loadPeriodeOptions();

    } catch (error) {
        console.error('Error loading IPL bills:', error);
        showToast('Error loading IPL bills data', 'danger');
    }
}

// Load periode options for filter
async function loadPeriodeOptions() {
    try {
        const periodes = [...new Set(iplBillsData.map(bill => bill.periode?.nama_periode).filter(Boolean))];
        const selectElement = document.getElementById('ipl-bills-filter-periode');

        if (selectElement && periodes.length > 0) {
            const options = periodes.map(periode => `<option value="${periode}">${periode}</option>`).join('');
            selectElement.innerHTML = '<option value="">Semua Periode</option>' + options;
        }
    } catch (error) {
        console.error('Error loading periode options:', error);
    }
}

// Display IPL bills table
function displayIplBillsTable() {
    const dataToDisplay = iplBillsFilteredData || iplBillsData;
    const { data: paginatedData } = paginateData(dataToDisplay, iplBillsCurrentPage, iplBillsItemsPerPage);

    const tableHtml = createIplBillsTableHtml(paginatedData);
    const paginationHtml = renderIplBillsPagination(iplBillsCurrentPage,
        Math.ceil(dataToDisplay.length / iplBillsItemsPerPage), dataToDisplay.length);

    const tableContainer = document.getElementById('ipl-bills-table-container');
    if (tableContainer) {
        tableContainer.innerHTML = tableHtml + paginationHtml;
        attachIplBillsSortListeners();
    }
}

// Create table HTML
function createIplBillsTableHtml(data) {
    let html = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th width="60px">No.</th>
                        <th class="sortable" data-column="hunian.nomor_blok_rumah">Rumah <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th class="sortable" data-column="penghuni.nama_kepala_keluarga">Penghuni <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th class="sortable" data-column="periode.nama_periode">Periode <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th class="text-end sortable" data-column="nominal_tagihan">Tagihan <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th class="sortable" data-column="tanggal_pembayaran">Tanggal Bayar <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th class="sortable" data-column="status">Status <i class="bi bi-chevron-expand sort-icon"></i></th>
                        <th width="150px">Aksi</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (data.length > 0) {
        const startIndex = (iplBillsCurrentPage - 1) * iplBillsItemsPerPage;
        data.forEach((bill, index) => {
            const globalIndex = startIndex + index + 1;
            const statusBadge = getStatusBadge(bill.status);

            // Format payment date - assuming there's a tanggal_pembayaran field or similar
            const paymentDate = bill.tanggal_pembayaran || bill.tanggal_bayar || (bill.status === 'lunas' ? bill.updated_at : null);
            const formattedPaymentDate = paymentDate ? new Date(paymentDate).toLocaleDateString('id-ID') : '-';

            html += `
                <tr>
                    <td>${globalIndex}</td>
                    <td>${bill.hunian?.nomor_blok_rumah || '-'}</td>
                    <td>${bill.penghuni?.nama_kepala_keluarga || '-'}</td>
                    <td>${bill.periode?.nama_periode || '-'}</td>
                    <td class="text-end">${formatCurrency(bill.nominal_tagihan)}</td>
                    <td>${formattedPaymentDate}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button onclick="editIplBill('${bill.id}')" class="btn btn-sm btn-outline-primary me-2"
                                ${bill.total_pembayaran > 0 ? 'disabled title="Tidak dapat edit tagihan yang sudah ada pembayaran"' : ''}>
                            Edit
                        </button>
                        <button onclick="deleteIplBill('${bill.id}')" class="btn btn-sm btn-outline-danger"
                                ${bill.total_pembayaran > 0 ? 'disabled title="Tidak dapat hapus tagihan yang sudah ada pembayaran"' : ''}>
                            Hapus
                        </button>
                    </td>
                </tr>
            `;
        });
    } else {
        const colspan = 8;
        html += `<tr><td colspan="${colspan}" class="text-center text-muted">Tidak ada data tagihan IPL</td></tr>`;
    }

    html += `</tbody></table></div>`;
    return html;
}

// Get status badge
function getStatusBadge(status) {
    const badges = {
        'belum_bayar': '<span class="badge bg-danger">Belum Bayar</span>',
        'sebagian': '<span class="badge bg-warning">Sebagian</span>',
        'lunas': '<span class="badge bg-success">Lunas</span>'
    };
    return badges[status] || `<span class="badge bg-secondary">${status}</span>`;
}

// Render pagination
function renderIplBillsPagination(currentPage, totalPages, totalItems) {
    if (totalPages <= 1) return '';

    const startItem = ((currentPage - 1) * iplBillsItemsPerPage) + 1;
    const endItem = Math.min(currentPage * iplBillsItemsPerPage, totalItems);

    let paginationHtml = `
        <div class="d-flex justify-content-between align-items-center mt-3">
            <div class="text-muted">
                Menampilkan ${startItem}-${endItem} dari ${totalItems} data
            </div>
            <nav><ul class="pagination pagination-sm mb-0">
    `;

    // Previous button
    paginationHtml += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changeIplBillsPage(${currentPage - 1})">Previous</a>
    </li>`;

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="changeIplBillsPage(1)">1</a></li>`;
        if (startPage > 2) {
            paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="changeIplBillsPage(${i})">${i}</a>
        </li>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
        paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="changeIplBillsPage(${totalPages})">${totalPages}</a></li>`;
    }

    // Next button
    paginationHtml += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changeIplBillsPage(${currentPage + 1})">Next</a>
    </li>`;

    paginationHtml += '</ul></nav></div>';
    return paginationHtml;
}

// Initialize controls
function initializeIplBillsControls() {
    const searchInput = document.getElementById('ipl-bills-search');
    const statusFilter = document.getElementById('ipl-bills-filter-status');
    const periodeFilter = document.getElementById('ipl-bills-filter-periode');
    const itemsPerPageSelect = document.getElementById('ipl-bills-items-per-page');

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            iplBillsSearchTerm = searchInput.value;
            applyIplBillsFilters();
        }, 300));
    }

    // Filter functionality
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            iplBillsFilterStatus = statusFilter.value;
            applyIplBillsFilters();
        });
    }

    if (periodeFilter) {
        periodeFilter.addEventListener('change', () => {
            iplBillsFilterPeriode = periodeFilter.value;
            applyIplBillsFilters();
        });
    }

    // Items per page
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', () => {
            iplBillsItemsPerPage = parseInt(itemsPerPageSelect.value);
            iplBillsCurrentPage = 1;
            displayIplBillsTable();
        });
    }
}

// Apply filters
function applyIplBillsFilters() {
    let filteredData = [...iplBillsData];

    // Apply search
    if (iplBillsSearchTerm.trim()) {
        const searchTerm = iplBillsSearchTerm.toLowerCase();
        filteredData = filteredData.filter(bill =>
            bill.hunian?.nomor_blok_rumah?.toLowerCase().includes(searchTerm) ||
            bill.penghuni?.nama_kepala_keluarga?.toLowerCase().includes(searchTerm) ||
            bill.periode?.nama_periode?.toLowerCase().includes(searchTerm)
        );
    }

    // Apply status filter
    if (iplBillsFilterStatus) {
        filteredData = filteredData.filter(bill => bill.status === iplBillsFilterStatus);
    }

    // Apply periode filter
    if (iplBillsFilterPeriode) {
        filteredData = filteredData.filter(bill => bill.periode?.nama_periode === iplBillsFilterPeriode);
    }

    iplBillsFilteredData = filteredData;
    iplBillsCurrentPage = 1;
    displayIplBillsTable();
}

// Reset filters
function resetIplBillsFilters() {
    document.getElementById('ipl-bills-search').value = '';
    document.getElementById('ipl-bills-filter-status').value = '';
    document.getElementById('ipl-bills-filter-periode').value = '';

    iplBillsSearchTerm = '';
    iplBillsFilterStatus = '';
    iplBillsFilterPeriode = '';
    iplBillsFilteredData = null;
    iplBillsCurrentPage = 1;

    displayIplBillsTable();
}

// Sort functionality
function sortIplBills(sortBy, sortOrder = 'asc') {
    const dataToSort = iplBillsFilteredData || iplBillsData;

    const sortedData = [...dataToSort].sort((a, b) => {
        let aValue, bValue;

        switch (sortBy) {
            case 'hunian.nomor_blok_rumah':
                aValue = a.hunian?.nomor_blok_rumah || '';
                bValue = b.hunian?.nomor_blok_rumah || '';
                break;
            case 'penghuni.nama_kepala_keluarga':
                aValue = a.penghuni?.nama_kepala_keluarga || '';
                bValue = b.penghuni?.nama_kepala_keluarga || '';
                break;
            case 'periode.nama_periode':
                aValue = a.periode?.nama_periode || '';
                bValue = b.periode?.nama_periode || '';
                break;
            case 'tanggal_tagihan':
                aValue = new Date(a.tanggal_tagihan);
                bValue = new Date(b.tanggal_tagihan);
                break;
            case 'nominal_tagihan':
                aValue = a.nominal_tagihan;
                bValue = b.nominal_tagihan;
                break;
            case 'status':
                aValue = a.status;
                bValue = b.status;
                break;
            default:
                return 0;
        }

        if (sortOrder === 'desc') {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        } else {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        }
    });

    if (iplBillsFilteredData) {
        iplBillsFilteredData = sortedData;
    } else {
        iplBillsData = sortedData;
    }

    iplBillsSortBy = sortBy;
    iplBillsSortOrder = sortOrder;
    displayIplBillsTable();
}

// Attach sort listeners
function attachIplBillsSortListeners() {
    const sortableHeaders = document.querySelectorAll('#ipl-bills-table-container .sortable');

    sortableHeaders.forEach(header => {
        header.addEventListener('click', (e) => {
            const column = e.currentTarget.dataset.column;
            const currentSort = e.currentTarget.dataset.sort || 'none';

            // Determine new sort direction
            let newSort = 'asc';
            if (iplBillsSortBy === column) {
                newSort = iplBillsSortOrder === 'asc' ? 'desc' : 'none';
            }

            // Reset all sort indicators
            sortableHeaders.forEach(h => h.dataset.sort = 'none');

            if (newSort === 'none') {
                // Reset sorting
                iplBillsSortBy = '';
                iplBillsSortOrder = 'asc';
                displayIplBillsTable();
            } else {
                // Apply sorting
                e.currentTarget.dataset.sort = newSort;
                sortIplBills(column, newSort);
            }

            // Update sort icons
            updateSortIcons(sortableHeaders);
        });
    });
}

// Update sort icons
function updateSortIcons(headers) {
    headers.forEach(header => {
        const sortIcon = header.querySelector('.sort-icon');
        if (sortIcon) {
            const sort = header.dataset.sort;
            switch (sort) {
                case 'asc':
                    sortIcon.className = 'bi bi-chevron-up sort-icon';
                    break;
                case 'desc':
                    sortIcon.className = 'bi bi-chevron-down sort-icon';
                    break;
                default:
                    sortIcon.className = 'bi bi-chevron-expand sort-icon';
            }
        }
    });
}

// Change page
function changeIplBillsPage(page) {
    const dataToPaginate = iplBillsFilteredData || iplBillsData;
    const totalPages = Math.ceil(dataToPaginate.length / iplBillsItemsPerPage);

    if (page < 1 || page > totalPages) return;

    iplBillsCurrentPage = page;
    displayIplBillsTable();
}

// Edit IPL bill - using the same form as input but pre-populated and with update logic
async function editIplBill(billId) {
    try {
        const bill = iplBillsData.find(b => b.id === billId);
        if (!bill) {
            showToast('Tagihan tidak ditemukan', 'warning');
            return;
        }

        if (bill.total_pembayaran > 0) {
            showToast('Tidak dapat edit tagihan yang sudah ada pembayaran', 'warning');
            return;
        }

        // Store the bill ID for editing
        window.editingBillId = billId;

        // Use the same form as input, but modify for editing
        const formHtml = `
            <div id="ipl-input-form-error" class="alert alert-danger d-none" role="alert"></div>

            <div class="alert alert-info">
                <strong>Mode Edit:</strong> Mengubah tagihan IPL dengan ID ${billId}
            </div>

            <form id="ipl-input-form">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="ipl_hunian_id" class="form-label required-field">Nomor Rumah:</label>
                        <select class="form-select" id="ipl_hunian_id" name="hunian_id" required>
                            <option value="">Pilih Rumah</option>
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="ipl_penghuni_id" class="form-label required-field">Penghuni:</label>
                        <select class="form-select" id="ipl_penghuni_id" name="penghuni_id" required>
                            <option value="">Pilih Penghuni</option>
                        </select>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="ipl_periode_id" class="form-label required-field">Periode:</label>
                        <select class="form-select" id="ipl_periode_id" name="periode_id" required>
                            <option value="">Pilih Periode</option>
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="ipl_tarif_id" class="form-label required-field">Jenis Tarif IPL:</label>
                        <select class="form-select" id="ipl_tarif_id" name="tarif_id" required>
                            <option value="">Pilih Jenis Tarif IPL</option>
                        </select>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label">Preview Tagihan:</label>
                    <div class="alert alert-info">
                        <strong id="preview-type">Memuat data...</strong><br>
                        <span id="preview-amount">-</span>
                    </div>
                </div>

                <div class="d-flex gap-2">
                    <button type="submit" class="btn btn-success">
                        <i class="bi bi-check-lg"></i> Simpan Perubahan
                    </button>
                    <button type="button" class="btn btn-warning" id="ipl-reset-form-btn">Reset Form</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
                </div>
            </form>
        `;

        showModal('Edit Tagihan IPL', formHtml);

        // Initialize form selects with SearchableSelect
        await initializeEditFormSelects(bill);

        // Setup smart autofill and other event listeners
        setupEditFormEventListeners(billId);

    } catch (error) {
        console.error('Error editing bill:', error);
        showToast('Error loading bill data', 'danger');
    }
}

// Initialize edit form selects with SearchableSelect components and pre-populate with bill data
async function initializeEditFormSelects(bill) {
    // Import the SearchableSelect class
    const { SearchableSelect } = await import('../../ui.js');
    const { supabase } = await import('../../config.js');

    // Initialize hunian select
    const hunianSelect = document.getElementById('ipl_hunian_id');
    let hunianSearchable;
    if (hunianSelect) {
        hunianSearchable = new SearchableSelect(hunianSelect, {
            placeholder: 'Pilih Rumah',
            searchPlaceholder: 'Cari rumah...'
        });

        // Wait for data to load and then set value
        await hunianSearchable.loadData(async () => {
            const { data, error } = await supabase
                .from('hunian')
                .select('id, nomor_blok_rumah')
                .order('nomor_blok_rumah');

            if (error) return [];

            return data.map(item => ({
                value: item.id,
                text: item.nomor_blok_rumah
            }));
        });

        // Pre-select the current house after data is loaded
        if (bill.hunian_id) {
            hunianSearchable.setValue(bill.hunian_id);
        }
    }

    // Initialize penghuni select
    const penghuniSelect = document.getElementById('ipl_penghuni_id');
    let penghuniSearchable;
    if (penghuniSelect) {
        penghuniSearchable = new SearchableSelect(penghuniSelect, {
            placeholder: 'Pilih Penghuni',
            searchPlaceholder: 'Cari penghuni...'
        });

        // Wait for data to load and then set value
        await penghuniSearchable.loadData(async () => {
            const { data, error } = await supabase
                .from('penghuni')
                .select('id, nama_kepala_keluarga')
                .order('nama_kepala_keluarga');

            if (error) return [];

            return data.map(item => ({
                value: item.id,
                text: item.nama_kepala_keluarga
            }));
        });

        // Pre-select the current resident after data is loaded
        if (bill.penghuni_id) {
            penghuniSearchable.setValue(bill.penghuni_id);
        }
    }

    // Store SearchableSelect instances globally for smart autofill
    window.currentEditHunianSearchable = hunianSearchable;
    window.currentEditPenghuniSearchable = penghuniSearchable;

    // Initialize periode select
    const periodeSelect = document.getElementById('ipl_periode_id');
    if (periodeSelect) {
        const periodeSearchable = new SearchableSelect(periodeSelect, {
            placeholder: 'Pilih Periode',
            searchPlaceholder: 'Cari periode...'
        });

        // Wait for data to load and then set value
        await periodeSearchable.loadData(async () => {
            const { data, error } = await supabase
                .from('periode')
                .select('id, nama_periode, nomor_urut')
                .order('nomor_urut', { ascending: false });

            if (error) return [];

            return data.map(item => ({
                value: item.id,
                text: item.nama_periode
            }));
        });

        // Pre-select the current period after data is loaded
        if (bill.periode_id) {
            periodeSearchable.setValue(bill.periode_id);
        }
    }

    // Initialize tarif IPL select
    const tarifSelect = document.getElementById('ipl_tarif_id');
    if (tarifSelect) {
        const tarifIplSearchable = new SearchableSelect(tarifSelect, {
            placeholder: 'Pilih Jenis Tarif IPL',
            searchPlaceholder: 'Cari jenis tarif...'
        });

        // Wait for data to load
        await tarifIplSearchable.loadData(async () => {
            const { data, error } = await supabase
                .from('tarif_ipl')
                .select('id, type_tarif, nominal')
                .eq('aktif', true)
                .order('type_tarif');

            if (error) return [];

            return data.map(item => ({
                value: item.id,
                text: `${getTypeDisplayName(item.type_tarif)} - Rp ${formatCurrency(item.nominal)}`
            }));
        });

        // Pre-select the current tariff based on nominal amount
        try {
            const { data, error } = await supabase
                .from('tarif_ipl')
                .select('id')
                .eq('nominal', bill.nominal_tagihan)
                .eq('aktif', true)
                .limit(1);

            if (!error && data && data.length > 0) {
                tarifIplSearchable.setValue(data[0].id);
            }
        } catch (error) {
            console.error('Error pre-selecting tariff:', error);
        }
    }
}

// Setup smart autofill for edit form
function setupEditSmartAutofill() {
    // Get the SearchableSelect instances from the global window object (set during initialization)
    const hunianSearchable = window.currentEditHunianSearchable;
    const penghuniSearchable = window.currentEditPenghuniSearchable;

    if (!hunianSearchable || !penghuniSearchable) return;

    let autoFillTimeout;

    // Auto-fill penghuni when hunian is selected
    hunianSearchable.selectElement.addEventListener('change', function(e) {
        if (e.detail && e.detail.source === 'searchable-select') return;

        clearTimeout(autoFillTimeout);
        autoFillTimeout = setTimeout(async () => {
            const hunianId = hunianSearchable.getValue();
            if (!hunianId) return;

            try {
                const { supabase } = await import('../../config.js');
                const { data, error } = await supabase
                    .from('hunian')
                    .select('penghuni_saat_ini:penghuni_saat_ini_id (id, nama_kepala_keluarga)')
                    .eq('id', hunianId)
                    .single();

                if (!error && data?.penghuni_saat_ini) {
                    penghuniSearchable.setValue(data.penghuni_saat_ini.id);
                } else {
                    penghuniSearchable.setValue('');
                }
            } catch (error) {
                console.error('Error auto-filling penghuni in edit form:', error);
            }
        }, 300);
    });

    // Enhanced auto-fill for penghuni
    const handlePenghuniSelection = async () => {
        clearTimeout(autoFillTimeout);

        autoFillTimeout = setTimeout(async () => {
            const penghuniId = penghuniSearchable.getValue();

            if (!penghuniId) return;

            try {
                const { supabase } = await import('../../config.js');
                const { data, error } = await supabase
                    .from('hunian')
                    .select('id, nomor_blok_rumah')
                    .eq('penghuni_saat_ini_id', penghuniId);

                if (!error && data) {
                    // If exactly one house found, auto-select it
                    if (data.length === 1) {
                        hunianSearchable.setValue(data[0].id);
                    } else if (data.length === 0) {
                        // No house found for this penghuni, clear the selection
                        hunianSearchable.setValue('');
                    }
                    // If multiple houses found, don't auto-select (let user choose)
                } else if (error) {
                    console.error('Error in house query for edit form:', error);
                    hunianSearchable.setValue('');
                }
            } catch (error) {
                console.error('Exception in penghuni auto-fill for edit form:', error);
                hunianSearchable.setValue('');
            }
        }, 200);
    };

    penghuniSearchable.selectElement.addEventListener('change', function(e) {
        if (e.detail && e.detail.source === 'searchable-select') return;
        handlePenghuniSelection();
    });

    penghuniSearchable.selectElement.addEventListener('input', function() {
        clearTimeout(autoFillTimeout);
        autoFillTimeout = setTimeout(() => {
            if (!penghuniSearchable.getValue()) return;
            handlePenghuniSelection();
        }, 500);
    });

    penghuniSearchable.selectElement.addEventListener('blur', function() {
        setTimeout(() => {
            if (!penghuniSearchable.getValue()) return;
            handlePenghuniSelection();
        }, 100);
    });
}

// Setup edit form event listeners
function setupEditFormEventListeners(billId) {
    const form = document.getElementById('ipl-input-form');
    if (!form) return;

    // Hide reset button in edit mode
    const resetBtn = document.getElementById('ipl-reset-form-btn');
    if (resetBtn) {
        resetBtn.style.display = 'none';
    }

    // Setup smart autofill for edit form
    setupEditSmartAutofill();

    // Setup preview updates
    setupEditFormPreviewUpdates();

    // Handle form submission for editing
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleEditBillFormSubmission(billId);
    });
}

// Setup edit form preview updates
function setupEditFormPreviewUpdates() {
    const updatePreview = () => {
        const tarifSelect = document.getElementById('ipl_tarif_id');
        const previewType = document.getElementById('preview-type');
        const previewAmount = document.getElementById('preview-amount');

        if (!previewType || !previewAmount) return;

        if (!tarifSelect || !tarifSelect.value) {
            previewType.textContent = 'Pilih jenis tarif IPL';
            previewAmount.textContent = '-';
            return;
        }

        // Get tariff amount for preview
        const selectedOption = Array.from(tarifSelect.options).find(opt => opt.value === tarifSelect.value);

        if (selectedOption) {
            const textParts = selectedOption.text.split(' - Rp ');
            if (textParts.length > 1) {
                previewType.textContent = textParts[0];
                previewAmount.textContent = `Rp ${textParts[1]}`;
            }
        }
    };

    // Add change listener to tariff select
    const tarifSelect = document.getElementById('ipl_tarif_id');
    if (tarifSelect) {
        tarifSelect.addEventListener('change', updatePreview);
    }
}

// Handle edit form submission
async function handleEditBillFormSubmission(billId) {
    try {
        // Get values from SearchableSelect components (reuse logic from input form)
        const getSearchableValue = (elementId) => {
            const select = document.getElementById(elementId);
            return select ? select.value : '';
        };

        const hunianId = getSearchableValue('ipl_hunian_id');
        const penghuniId = getSearchableValue('ipl_penghuni_id');
        const periodeId = getSearchableValue('ipl_periode_id');
        const tarifId = getSearchableValue('ipl_tarif_id');

        // Validate required fields
        if (!hunianId || !penghuniId || !periodeId || !tarifId) {
            showEditFormError('Semua field harus diisi');
            return;
        }

        // Get tariff details to determine the nominal amount
        const { supabase } = await import('../../config.js');
        const { data: tariffData, error: tariffError } = await supabase
            .from('tarif_ipl')
            .select('nominal')
            .eq('id', tarifId)
            .single();

        if (tariffError || !tariffData) {
            showEditFormError('Data tarif IPL tidak ditemukan');
            return;
        }

        // Check for duplicate bills (same house, period, but different bill ID)
        const existingBill = iplBillsData.find(bill =>
            bill.hunian_id === hunianId &&
            bill.periode_id === periodeId &&
            bill.id !== billId
        );

        if (existingBill) {
            showEditFormError(`Tagihan untuk rumah ini pada periode yang sama sudah ada (ID: ${existingBill.id})`);
            return;
        }

        const updateData = {
            hunian_id: hunianId,
            penghuni_id: penghuniId,
            periode_id: periodeId,
            nominal_tagihan: tariffData.nominal,
            sisa_tagihan: tariffData.nominal // Reset sisa tagihan to new nominal
        };

        showToast('Menyimpan perubahan...', 'info');

        const { updateRecord } = await import('/js/modules/crud.js');
        const result = await updateRecord('tagihan_ipl', billId, updateData, 'Tagihan IPL');

        if (result.success) {
            closeModal();
            showToast('Tagihan IPL berhasil diperbarui', 'success');
            await loadIplBillsData(); // Refresh data
            // Clear the editing bill ID
            delete window.editingBillId;
        } else {
            showEditFormError('Error: ' + result.message);
        }

    } catch (error) {
        console.error('Error updating bill:', error);
        showEditFormError('Terjadi kesalahan saat menyimpan');
    }
}

// Show edit form error
function showEditFormError(message) {
    const errorDiv = document.getElementById('ipl-input-form-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('d-none');
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}



// Delete IPL bill
async function deleteIplBill(billId) {
    const bill = iplBillsData.find(b => b.id === billId);
    if (!bill) {
        showToast('Tagihan tidak ditemukan', 'warning');
        return;
    }

    if (bill.total_pembayaran > 0) {
        showToast('Tidak dapat hapus tagihan yang sudah ada pembayaran', 'warning');
        return;
    }

    // Use custom confirmation dialog instead of browser's confirm
    const confirmed = await showConfirm(`Apakah Anda yakin ingin menghapus tagihan IPL untuk rumah ${bill.hunian?.nomor_blok_rumah || 'Unknown'} periode ${bill.periode?.nama_periode || 'Unknown'}?`);

    if (!confirmed) {
        return;
    }

    try {
        showToast('Menghapus tagihan...', 'info');

        const { deleteRecord } = await import('/js/modules/crud.js');
        const result = await deleteRecord('tagihan_ipl', billId, 'Tagihan IPL');

        if (result.success) {
            showToast('Tagihan IPL berhasil dihapus', 'success');
            await loadIplBillsData(); // Refresh data
        } else {
            showToast('Error: ' + result.message, 'danger');
        }

    } catch (error) {
        console.error('Error deleting bill:', error);
        showToast('Terjadi kesalahan saat menghapus', 'danger');
    }
}



// Refresh data
async function refreshIplBillsData() {
    await loadIplBillsData();
}

// Debounce utility
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

export {
    loadIplBillsManagement,
    refreshIplBillsData
};

// Global functions for HTML onclick
window.loadIplBillsManagement = loadIplBillsManagement;
window.refreshIplBillsData = refreshIplBillsData;
window.editIplBill = editIplBill;
window.deleteIplBill = deleteIplBill;
window.resetIplBillsFilters = resetIplBillsFilters;
window.changeIplBillsPage = changeIplBillsPage;
