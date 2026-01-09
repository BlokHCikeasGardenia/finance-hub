// Pemasukan table rendering module
// Handles table display, pagination, and custom renderers

import { getPemasukanState, setPemasukanState } from './pemasukan-data.js';
import { filterAndDisplayPemasukan } from './pemasukan-filters.js';
import { paginateData } from '../../crud.js';
import { formatCurrency, globalPeriodeCache } from '../../utils.js';
import { supabase } from '../../config.js';

// Use global periode cache shared across modules
const pemasukanPeriodeCache = globalPeriodeCache;

// Table columns configuration - maximum compact for mobile (only essentials)
const pemasukanTableColumns = [
    { key: 'id_transaksi', label: 'ID Transaksi' },
    { key: 'tanggal', label: 'Tanggal', width: '100px', render: (item) => new Date(item.tanggal).toLocaleDateString('id-ID'), mobileClass: 'd-none-mobile' },
    { key: 'penghuni', label: 'Penghuni', render: (item) => item.penghuni?.nama_kepala_keluarga || item.nama_pembayar || '-' },
    { key: 'kategori', label: 'Kategori', render: renderPemasukanCategory },
    { key: 'nominal', label: 'Nominal', render: (item) => formatCurrency(item.nominal) },
    { key: 'periode', label: 'Periode', render: renderPeriodeColumn },
    { key: 'hunian', label: 'Rumah', render: (item) => item.hunian?.nomor_blok_rumah || '-', mobileClass: 'd-none-mobile' },
    { key: 'rekening', label: 'Rekening', render: (item) => item.rekening?.jenis_rekening || '-', mobileClass: 'd-none-mobile' },
    { key: 'keterangan', label: 'Keterangan', mobileClass: 'd-none-mobile' }
];

// Custom renderers

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

// Render pemasukan category badge
function renderPemasukanCategory(item) {
    const categoryName = item.kategori_saldo?.nama_kategori || 'Lain-lain';
    return `<span class="badge ${getCategoryBadgeColor(categoryName)}">${categoryName}</span>`;
}

// Render periode column with conditional display
function renderPeriodeColumn(item) {
    // Use id_transaksi as fallback if id is not available
    const itemId = item.id || item.id_transaksi;

    // Exit early if no valid ID to avoid unnecessary lookups
    if (!itemId) {
        return '<span class="text-muted">-</span>';
    }

    const periodeData = pemasukanPeriodeCache.get(itemId);

    if (!periodeData || periodeData.count === 0) {
        return '<span class="text-muted">-</span>';
    }

    if (periodeData.count === 1) {
        // Single periode - display directly
        return `<span class="badge bg-light text-dark">${periodeData.periodes[0]}</span>`;
    } else {
        // Multiple periode - show "Multiple" with info icon
        return `<span class="badge bg-warning text-dark" onclick="showPemasukanPeriodeDetail('${itemId}')" style="cursor: pointer;" title="Klik untuk detail periode">
            Multiple ⓘ
        </span>`;
    }
}

// Get periode data from payment allocations or periode_list
async function getPeriodeData(pemasukanId, pemasukanRecord = null) {
    try {
        // Validate pemasukanId
        if (!pemasukanId || pemasukanId === 'undefined') {
            return {
                periodes: [],
                details: [],
                isMultiple: false,
                count: 0
            };
        }

        // UUID regex pattern - must be a valid UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(pemasukanId)) {
            // Not a valid UUID format, skip the query
            return {
                periodes: [],
                details: [],
                isMultiple: false,
                count: 0
            };
        }

        // NEW: If periode_list is provided in record, use it directly
        if (pemasukanRecord && pemasukanRecord.periode_list && Array.isArray(pemasukanRecord.periode_list)) {
            // Load periode names from periode IDs
            const periodeIds = pemasukanRecord.periode_list;

            if (periodeIds.length > 0) {
                const { data: periodes, error: periodeError } = await supabase
                    .from('periode')
                    .select('id, nama_periode')
                    .in('id', periodeIds);

                if (!periodeError && periodes) {
                    const periodeNames = periodes.map(p => p.nama_periode);
                    // Distribute total nominal equally across periodes
                    const nominalPerPeriode = pemasukanRecord.nominal / periodeNames.length;
                    // Get actual category name instead of "Multiple"
                    const categoryName = pemasukanRecord.kategori_saldo?.nama_kategori || 'Lain-lain';

                    return {
                        periodes: periodeNames,
                        details: periodes.map(p => ({
                            periode: p.nama_periode,
                            nominal: nominalPerPeriode,
                            type: categoryName
                        })),
                        isMultiple: periodeNames.length > 1,
                        count: periodeNames.length
                    };
                }
            }
        }

        // FALLBACK: Use old method - query allocations
        // Query IPL payment allocations
        const { data: iplAllocations, error: iplError } = await supabase
            .from('tagihan_ipl_pembayaran')
            .select(`
                nominal_dialokasikan,
                tagihan_ipl:tagihan_ipl_id (
                    periode:periode_id (nama_periode)
                )
            `)
            .eq('pemasukan_id', pemasukanId);

        if (iplError) {
            // Silent fail - no valid periode data for this transaction
        }

        // Query consolidated Air billing allocations (corrected table name)
        const { data: meteranAirAllocations, error: meteranAirError } = await supabase
            .from('meteran_air_billing_pembayaran')
            .select(`
                nominal_dialokasikan,
                meteran_air_billing:meteran_air_billing_id (
                    periode:periode_id (nama_periode)
                )
            `)
            .eq('pemasukan_id', pemasukanId);

        if (meteranAirError) {
            // Silent fail - no valid periode data for this transaction
        }

        // Collect all unique periode names
        const periodeSet = new Set();
        const periodeDetails = [];

        // Process IPL allocations
        if (iplAllocations && Array.isArray(iplAllocations)) {
            iplAllocations.forEach(allocation => {
                if (allocation.tagihan_ipl?.periode?.nama_periode) {
                    periodeSet.add(allocation.tagihan_ipl.periode.nama_periode);
                    periodeDetails.push({
                        periode: allocation.tagihan_ipl.periode.nama_periode,
                        nominal: allocation.nominal_dialokasikan,
                        type: 'IPL'
                    });
                }
            });
        }

        // Process Meteran Air allocations
        if (meteranAirAllocations && Array.isArray(meteranAirAllocations)) {
            meteranAirAllocations.forEach(allocation => {
                if (allocation.meteran_air_billing?.periode?.nama_periode) {
                    periodeSet.add(allocation.meteran_air_billing.periode.nama_periode);
                    periodeDetails.push({
                        periode: allocation.meteran_air_billing.periode.nama_periode,
                        nominal: allocation.nominal_dialokasikan,
                        type: 'Air'
                    });
                }
            });
        }

        const uniquePeriodes = Array.from(periodeSet);

        return {
            periodes: uniquePeriodes,
            details: periodeDetails,
            isMultiple: uniquePeriodes.length > 1,
            count: uniquePeriodes.length
        };

    } catch (error) {
        // Silent fail - return empty periode data on error
        return {
            periodes: [],
            details: [],
            isMultiple: false,
            count: 0
        };
    }
}

// Load periode data for multiple items at once
async function loadPemasukanPeriodeData(items) {
    // Only process items that have a valid ID and are not already cached
    const uncachedItems = items.filter(item => {
        const itemId = item.id || item.id_transaksi;
        return itemId && !pemasukanPeriodeCache.has(itemId);
    });

    if (uncachedItems.length === 0) return;

    // Load periode data for uncached items
    // Pass the record itself to getPeriodeData so it can use periode_list if available
    const periodePromises = uncachedItems.map(item => {
        const itemId = item.id || item.id_transaksi;
        return getPeriodeData(itemId, item);
    });
    const periodeResults = await Promise.all(periodePromises);

    // Store results in cache
    uncachedItems.forEach((item, index) => {
        const itemId = item.id || item.id_transaksi;
        pemasukanPeriodeCache.set(itemId, periodeResults[index]);
    });
}

// Display pemasukan table (no pagination - show all data)
async function displayPemasukanTable(data) {
    // Pre-load periode data for all items
    await loadPemasukanPeriodeData(data);

    const tableHtml = createPemasukanTableHtml(data);
    const tableElement = document.getElementById('pemasukan-table');
    if (tableElement) {
        tableElement.innerHTML = tableHtml;
    }
}

// Create HTML for pemasukan table (no pagination)
function createPemasukanTableHtml(data) {
    let html = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>No</th>
                        ${pemasukanTableColumns.map(col => {
                            const mobileClass = col.mobileClass || '';
                            return `<th class="${mobileClass}">${col.label}</th>`;
                        }).join('')}
                        <th width="150px">Aksi</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (data.length > 0) {
        data.forEach((item, index) => {
            const displayIndex = index + 1;

            html += `<tr>
                <td>${displayIndex}</td>
                ${pemasukanTableColumns.map(col => {
                    const value = col.render ? col.render(item, col.key) : getNestedValue(item, col.key) || '-';
                    return `<td>${value}</td>`;
                }).join('')}
                <td>
                    <div class="btn-action-mobile-stack">
                        <button onclick="editPemasukan('${item.id}')" class="btn btn-sm btn-outline-primary">Edit</button>
                        <button onclick="confirmCancelPemasukan('${item.id}')" class="btn btn-sm btn-outline-warning" title="Batalkan transaksi yang sudah dialokasikan">Batalkan</button>
                        <button onclick="confirmDeletePemasukan('${item.id}')" class="btn btn-sm btn-outline-danger">Hapus</button>
                    </div>
                </td>
            </tr>`;
        });
    } else {
        const colspan = pemasukanTableColumns.length + 2;
        html += `<tr><td colspan="${colspan}" class="text-center text-muted">Tidak ada data pemasukan</td></tr>`;
    }

    html += `</tbody></table></div>`;

    return html;
}

// Helper function to get nested object value
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
    }, obj);
}



// Show periode detail modal for multiple periode transactions
function showPemasukanPeriodeDetail(pemasukanId) {
    const periodeData = pemasukanPeriodeCache.get(pemasukanId);

    if (!periodeData || periodeData.count <= 1) {
        return;
    }

    // Calculate total nominal from all periode details
    const totalNominal = periodeData.details.reduce((sum, detail) => sum + detail.nominal, 0);

    // Group details by periode for cleaner display
    const periodeGroups = {};
    periodeData.details.forEach(detail => {
        if (!periodeGroups[detail.periode]) {
            periodeGroups[detail.periode] = [];
        }
        periodeGroups[detail.periode].push(detail);
    });

    const modalContent = `
        <div class="modal-header">
            <h5 class="modal-title">Detail Periode Pembayaran</h5>
            <button type="button" class="btn-close" onclick="closeModal()"></button>
        </div>
        <div class="modal-body">
            <div class="alert alert-info">
                <strong>Total Pembayaran:</strong> ${formatCurrency(totalNominal)}
            </div>

            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Periode</th>
                            <th>Jenis</th>
                            <th class="text-end">Nominal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${periodeData.details.map(detail => `
                            <tr>
                                <td><span class="badge bg-light text-dark">${detail.periode}</span></td>
                                <td><span class="badge ${getCategoryBadgeColor(detail.type)}">${detail.type}</span></td>
                                <td class="text-end">${formatCurrency(detail.nominal)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="table-primary">
                            <th colspan="2">Total</th>
                            <th class="text-end">${formatCurrency(totalNominal)}</th>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Tutup</button>
        </div>
    `;

    // Import and use modal functionality
    import('../../ui.js').then(({ showModal }) => {
        showModal('Detail Periode Pembayaran', modalContent);
    }).catch(error => {
        console.error('Error showing modal:', error);
    });
}

export {
    pemasukanTableColumns,
    renderPemasukanCategory,
    displayPemasukanTable,
    createPemasukanTableHtml,
    showPemasukanPeriodeDetail
};
