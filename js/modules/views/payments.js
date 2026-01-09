// Payment Enhancement Module
// Dedicated form for processing bill payments with household selection and bill details

import { supabase } from '../config.js';
import { showModal, closeModal, SearchableSelect } from '../ui.js';
import { showToast, formatCurrency, parseFormattedNumber } from '../utils.js';
import {
    addPemasukan,
    generateTransactionId,
    getKategoriOptions,
    getRekeningOptions
} from '../entities/transactions/pemasukan-data.js';

// Global state for payment form
let selectedHousehold = null;
let selectedCategory = null;
let outstandingBills = [];
let selectedBills = new Set();
let householdSearchableSelect = null;

// Load Payment View
async function loadViewPayments() {
    console.log('🚀 loadViewPayments() called - Starting payment view initialization');
    const contentDiv = document.getElementById('pembayaran-content');

    try {
        // Load households data first
        console.log('🏠 Loading households data...');
        const { data: households, error } = await supabase
            .from('hunian')
            .select(`
                id,
                nomor_blok_rumah,
                penghuni_saat_ini:penghuni_saat_ini_id (nama_kepala_keluarga)
            `)
            .order('nomor_blok_rumah');

        if (error) {
            console.error('❌ Households query error:', error);
            throw error;
        }

        console.log('✅ Households loaded:', households?.length || 0, 'households');

        // Render the main UI
        const html = `
            <!-- Household Selection ONLY -->
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row g-3">
                        <div class="col-md-8">
                            <label for="payment-household-select" class="form-label">Pilih Rumah:</label>
                            <select class="form-select" id="payment-household-select"></select>
                        </div>
                    </div>
                    <small class="text-muted">Tagihan IPL dan Air akan ditampilkan otomatis</small>
                </div>
            </div>

            <!-- Bills Display Area -->
            <div id="bills-display-area" class="d-none">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Tagihan Outstanding (IPL & Air)</h5>
                    </div>
                    <div class="card-body">
                        <div id="bills-list"></div>

                        <!-- Payment Summary -->
                        <div id="payment-summary" class="mt-3 p-3 bg-light rounded d-none">
                            <h6>Ringkasan Pembayaran</h6>
                            <div id="selected-bills-summary"></div>
                            <div class="mt-3">
                                <button class="btn btn-success" id="process-payment-btn">
                                    <i class="bi bi-credit-card"></i> Proses Pembayaran
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        contentDiv.innerHTML = html;
        console.log('✅ Payment page UI rendered successfully');

        // Initialize SearchableSelect for household dropdown
        const selectElement = document.getElementById('payment-household-select');
        if (selectElement) {
            const householdOptions = households.map(household => ({
                value: household.id,
                text: `${household.nomor_blok_rumah} - ${household.penghuni_saat_ini?.nama_kepala_keluarga || 'Tidak ada penghuni'}`
            }));

            householdSearchableSelect = new SearchableSelect(selectElement, {
                placeholder: 'Pilih rumah...',
                searchPlaceholder: 'Cari nomor rumah atau nama penghuni...'
            });

            await householdSearchableSelect.loadData(async () => householdOptions);
            console.log('✅ SearchableSelect initialized for household dropdown');
        }

        // Set up event listeners
        setupPaymentEventListeners();
        console.log('✅ Event listeners set up');

    } catch (error) {
        console.error('❌ Error initializing payment page:', error);
        contentDiv.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <h6 class="alert-heading"><i class="bi bi-exclamation-triangle"></i> Gagal Memuat Halaman Pembayaran</h6>
                <p class="mb-0">${error.message || 'Terjadi kesalahan saat memuat data rumah.'}</p>
                <hr>
                <p class="mb-0">Silakan coba lagi atau hubungi administrator jika masalah berlanjut.</p>
            </div>
        `;
        showToast('Gagal memuat halaman pembayaran', 'danger');
    }
}



// Set up event listeners
function setupPaymentEventListeners() {
    const loadBillsBtn = document.getElementById('load-bills-btn');
    const processPaymentBtn = document.getElementById('process-payment-btn');
    const categorySelect = document.getElementById('payment-category-select');

    // Set up SearchableSelect change event - AUTO LOAD BILLS saat household dipilih
    if (householdSearchableSelect) {
        householdSearchableSelect.selectElement.addEventListener('change', async function() {
            selectedHousehold = householdSearchableSelect.getValue();
            if (selectedHousehold) {
                await loadOutstandingBills();
            } else {
                document.getElementById('bills-display-area').classList.add('d-none');
            }
        });
    }

    processPaymentBtn.addEventListener('click', () => showPaymentForm());
}

// Load outstanding bills for selected household (IPL + Air together)
async function loadOutstandingBills() {
    if (!selectedHousehold) return;

    const billsDisplayArea = document.getElementById('bills-display-area');
    const billsList = document.getElementById('bills-list');

    try {
        // Show loading state
        console.log('🔄 Starting to load outstanding bills for household:', selectedHousehold);
        showToast('Memuat tagihan IPL dan Air...', 'info');

        // Show loading in bills area
        if (billsList) {
            billsList.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Memuat tagihan...</span>
                    </div>
                    <p class="mt-2 text-muted">Memuat daftar tagihan...</p>
                </div>
            `;
        }
        billsDisplayArea.classList.remove('d-none');

        // OPTIMIZATION: Load IPL and Air bills in parallel
        const [
            { data: iplBills, error: iplError },
            { data: airBills, error: airError }
        ] = await Promise.all([
            // Load IPL bills
            supabase
                .from('tagihan_ipl')
                .select(`
                    id,
                    nominal_tagihan,
                    sisa_tagihan,
                    status,
                    periode:periode_id (id, nama_periode),
                    tanggal_tagihan
                `)
                .eq('hunian_id', selectedHousehold)
                .gt('sisa_tagihan', 0)
                .order('tanggal_tagihan', { ascending: false }),

            // Load Air bills
            supabase
                .from('meteran_air_billing')
                .select(`
                    id,
                    nominal_tagihan,
                    sisa_tagihan,
                    status,
                    billing_type,
                    periode:periode_id (id, nama_periode),
                    tanggal_tagihan
                `)
                .eq('hunian_id', selectedHousehold)
                .gt('sisa_tagihan', 0)
                .neq('billing_type', 'inisiasi')
                .neq('billing_type', 'baseline')
                .order('tanggal_tagihan', { ascending: false })
        ]);

        if (iplError) console.warn('⚠️ IPL bills query warning:', iplError);
        if (airError) console.warn('⚠️ Air bills query warning:', airError);

        // Combine IPL and Air bills
        const combinedBills = [];
        
        if (iplBills) {
            combinedBills.push(...iplBills.map(bill => ({ ...bill, type: 'IPL' })));
        }
        if (airBills) {
            combinedBills.push(...airBills.map(bill => ({ ...bill, type: 'Air' })));
        }

        // Sort combined bills by date (newest first)
        combinedBills.sort((a, b) => new Date(b.tanggal_tagihan) - new Date(a.tanggal_tagihan));

        outstandingBills = combinedBills;

        console.log('📋 Total outstanding bills loaded:', outstandingBills.length, '(IPL:', iplBills?.length || 0, '+ Air:', airBills?.length || 0, ')');

        // Display bills list
        displayBillsList();

        showToast(`Berhasil memuat ${outstandingBills.length} tagihan (${iplBills?.length || 0} IPL + ${airBills?.length || 0} Air)`, 'success');

    } catch (error) {
        console.error('❌ Error loading bills:', error);

        // Show error state
        if (billsList) {
            billsList.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <h6 class="alert-heading"><i class="bi bi-exclamation-triangle"></i> Gagal Memuat Tagihan</h6>
                    <p class="mb-0">${error.message || 'Terjadi kesalahan saat memuat data tagihan.'}</p>
                    <hr>
                    <p class="mb-0">Silakan coba lagi atau hubungi administrator jika masalah berlanjut.</p>
                </div>
            `;
        }
        billsDisplayArea.classList.remove('d-none');

        // Note: Button state reset not needed since bills are loaded automatically

        showToast('Gagal memuat tagihan', 'danger');
    }
}

// Display bills list with checkboxes
function displayBillsList() {
    const billsDisplayArea = document.getElementById('bills-display-area');
    const billsList = document.getElementById('bills-list');

    console.log('📋 Displaying bills list with', outstandingBills.length, 'bills');

    if (outstandingBills.length === 0) {
        console.log('📋 No outstanding bills found');
        billsList.innerHTML = '<p class="text-muted">Tidak ada tagihan outstanding untuk rumah ini.</p>';
        billsDisplayArea.classList.remove('d-none');
        return;
    }

    const billsHtml = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead class="table-light">
                    <tr>
                        <th width="50"><input type="checkbox" id="select-all-bills"></th>
                        <th>Jenis</th>
                        <th>Periode</th>
                        <th>Tanggal Tagihan</th>
                        <th class="text-end">Nominal</th>
                        <th class="text-end">Sisa</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${outstandingBills.map(bill => `
                        <tr>
                            <td>
                                <input type="checkbox" class="bill-checkbox"
                                       data-bill-id="${bill.id}"
                                       data-bill-type="${bill.type}"
                                       data-amount="${bill.sisa_tagihan}">
                            </td>
                            <td>
                                <span class="badge bg-${bill.type === 'IPL' ? 'primary' : 'info'}">${bill.type}</span>
                            </td>
                            <td>${bill.periode?.nama_periode || 'N/A'}</td>
                            <td>${new Date(bill.tanggal_tagihan).toLocaleDateString('id-ID')}</td>
                            <td class="text-end">${formatCurrency(bill.nominal_tagihan)}</td>
                            <td class="text-end fw-bold text-danger">${formatCurrency(bill.sisa_tagihan)}</td>
                            <td>
                                <span class="badge bg-${bill.status === 'belum_bayar' ? 'danger' : 'warning'}">
                                    ${bill.status === 'belum_bayar' ? 'Belum Bayar' : 'Sebagian'}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    console.log('📋 Setting bills HTML content');
    billsList.innerHTML = billsHtml;
    billsDisplayArea.classList.remove('d-none');

    console.log('📋 Setting up checkbox event listeners');
    // Set up checkbox event listeners
    setupBillCheckboxes();

    console.log('✅ Bills list display completed');
}

// Set up bill checkbox event listeners
function setupBillCheckboxes() {
    const selectAllCheckbox = document.getElementById('select-all-bills');
    const billCheckboxes = document.querySelectorAll('.bill-checkbox');

    selectAllCheckbox.addEventListener('change', function() {
        billCheckboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
            updateSelectedBills(checkbox);
        });
        updatePaymentSummary();
    });

    billCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateSelectedBills(this);
            updatePaymentSummary();

            // Update select all checkbox state
            const checkedBoxes = document.querySelectorAll('.bill-checkbox:checked');
            selectAllCheckbox.checked = checkedBoxes.length === billCheckboxes.length;
            selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < billCheckboxes.length;
        });
    });
}

// Update selected bills set
function updateSelectedBills(checkbox) {
    const billId = checkbox.dataset.billId;
    if (checkbox.checked) {
        selectedBills.add(billId);
    } else {
        selectedBills.delete(billId);
    }
}

// Update payment summary display
function updatePaymentSummary() {
    const paymentSummary = document.getElementById('payment-summary');
    const selectedBillsSummary = document.getElementById('selected-bills-summary');

    if (selectedBills.size === 0) {
        paymentSummary.classList.add('d-none');
        return;
    }

    const selectedBillsData = outstandingBills.filter(bill => selectedBills.has(bill.id));
    const totalAmount = selectedBillsData.reduce((sum, bill) => sum + bill.sisa_tagihan, 0);

    const summaryHtml = `
        <div class="row">
            <div class="col-md-8">
                <strong>Tagihan dipilih:</strong>
                <ul class="mb-0">
                    ${selectedBillsData.map(bill => `
                        <li>${bill.type} - ${bill.periode?.nama_periode || 'N/A'}: ${formatCurrency(bill.sisa_tagihan)}</li>
                    `).join('')}
                </ul>
            </div>
            <div class="col-md-4 text-end">
                <strong>Total: ${formatCurrency(totalAmount)}</strong>
            </div>
        </div>
    `;

    selectedBillsSummary.innerHTML = summaryHtml;
    paymentSummary.classList.remove('d-none');
}

// Show payment form modal
async function showPaymentForm() {
    if (selectedBills.size === 0) {
        showToast('Pilih minimal satu tagihan untuk dibayar', 'warning');
        return;
    }

    const selectedBillsData = outstandingBills.filter(bill => selectedBills.has(bill.id));
    const totalAmount = selectedBillsData.reduce((sum, bill) => sum + bill.sisa_tagihan, 0);

    const formHtml = `
        <div id="payment-form-error" class="alert alert-danger d-none" role="alert"></div>
        <form id="payment-form">
            <div class="mb-3">
                <label class="form-label">Tagihan yang akan dibayar:</label>
                <div class="border rounded p-2 bg-light">
                    ${selectedBillsData.map(bill => `
                        <div class="d-flex justify-content-between">
                            <span>${bill.type} - ${bill.periode?.nama_periode || 'N/A'}</span>
                            <strong>${formatCurrency(bill.sisa_tagihan)}</strong>
                        </div>
                    `).join('')}
                    <hr class="my-2">
                    <div class="d-flex justify-content-between">
                        <strong>Total Pembayaran:</strong>
                        <strong class="text-primary">${formatCurrency(totalAmount)}</strong>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="payment-date" class="form-label required-field">Tanggal Pembayaran:</label>
                        <input type="date" class="form-control" id="payment-date" name="tanggal"
                               value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="payment-account" class="form-label required-field">Dikredit Ke (Rekening):</label>
                        <select class="form-select" id="payment-account" name="rekening_id" required>
                            <option value="">Pilih Rekening</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="mb-3">
                <label for="payment-notes" class="form-label">Keterangan:</label>
                <textarea class="form-control" id="payment-notes" name="keterangan" rows="2"
                          placeholder="Catatan pembayaran (opsional)"></textarea>
            </div>

            <div class="d-flex gap-2">
                <button type="submit" class="btn btn-success">
                    <i class="bi bi-credit-card"></i> Bayar Sekarang
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
            </div>
        </form>
    `;

    showModal('Konfirmasi Pembayaran Tagihan IPL & Air', formHtml);

    // Initialize form
    await initializePaymentForm();
}

// Initialize payment form
async function initializePaymentForm() {
    // Load rekening options
    try {
        const rekeningOptions = await getRekeningOptions();
        const rekeningSelect = document.getElementById('payment-account');
        const optionsHtml = '<option value="">Pilih Rekening</option>' +
            rekeningOptions.map(opt => `<option value="${opt.value}">${opt.text}</option>`).join('');
        rekeningSelect.innerHTML = optionsHtml;
    } catch (error) {
        console.error('Error loading rekening options:', error);
    }

    // Set up form submission
    const form = document.getElementById('payment-form');
    form.addEventListener('submit', handlePaymentSubmission);
}

// Handle payment form submission
async function handlePaymentSubmission(e) {
    e.preventDefault();

    try {
        const formData = new FormData(e.target);
        const paymentData = {
            tanggal: formData.get('tanggal'),
            rekening_id: formData.get('rekening_id'),
            keterangan: formData.get('keterangan') || ''
        };

        if (!paymentData.tanggal || !paymentData.rekening_id) {
            showPaymentFormError('Tanggal dan rekening harus diisi');
            return;
        }

        // Calculate total payment amount and separate by type
        const selectedBillsData = outstandingBills.filter(bill => selectedBills.has(bill.id));
        const iplBills = selectedBillsData.filter(bill => bill.type === 'IPL');
        const airBills = selectedBillsData.filter(bill => bill.type === 'Air');
        
        const totalAmount = selectedBillsData.reduce((sum, bill) => sum + bill.sisa_tagihan, 0);

        if (!paymentData.tanggal || !paymentData.rekening_id) {
            showPaymentFormError('Tanggal dan rekening harus diisi');
            return;
        }

        paymentData.nominal = totalAmount;

        // Get household and penghuni info
        const householdInfo = await getHouseholdInfo(selectedHousehold);
        if (householdInfo) {
            paymentData.hunian_id = selectedHousehold;
            paymentData.penghuni_id = householdInfo.penghuni_id;
        }

        showToast('Memproses pembayaran IPL & Air...', 'info');

        // AUTO-SPLIT: Create separate pemasukan records for IPL and Air
        // This ensures each pemasukan has only one kategori
        
        const kategoriOptions = await getKategoriOptions();
        const iplCategory = kategoriOptions.find(cat => cat.text.includes('IPL'));
        const airCategory = kategoriOptions.find(cat => cat.text.includes('Air'));

        let allAllocations = []; // Track all allocations to update bills

        // 1. CREATE IPL PEMASUKAN with multiple periode if there are multiple IPL bills
        if (iplBills.length > 0) {
            const iplAmount = iplBills.reduce((sum, bill) => sum + bill.sisa_tagihan, 0);
            const iplPeriodes = [...new Set(iplBills.map(bill => bill.periode?.id).filter(Boolean))];

            const iplPaymentData = {
                ...paymentData,
                kategori_id: iplCategory?.value,
                nominal: iplAmount,
                periode_list: iplPeriodes, // Multiple periode for IPL
                keterangan: paymentData.keterangan
            };
            iplPaymentData.id_transaksi = await generateTransactionId();

            const iplResult = await addPemasukan(iplPaymentData);
            if (iplResult.success) {
                // Allocate IPL payment
                for (const bill of iplBills) {
                    allAllocations.push({
                        type: 'IPL',
                        pemasukanId: Array.isArray(iplResult.data) ? iplResult.data[0].id : iplResult.data.id,
                        billId: bill.id,
                        amount: bill.sisa_tagihan
                    });
                }
            } else {
                throw new Error('Error creating IPL payment: ' + iplResult.message);
            }
        }

        // 2. CREATE AIR PEMASUKAN with multiple periode if there are multiple Air bills
        if (airBills.length > 0) {
            const airAmount = airBills.reduce((sum, bill) => sum + bill.sisa_tagihan, 0);
            const airPeriodes = [...new Set(airBills.map(bill => bill.periode?.id).filter(Boolean))];

            const airPaymentData = {
                ...paymentData,
                kategori_id: airCategory?.value,
                nominal: airAmount,
                periode_list: airPeriodes, // Multiple periode for Air
                keterangan: paymentData.keterangan
            };
            airPaymentData.id_transaksi = await generateTransactionId();

            const airResult = await addPemasukan(airPaymentData);
            if (airResult.success) {
                // Allocate Air payment
                for (const bill of airBills) {
                    allAllocations.push({
                        type: 'Air',
                        pemasukanId: Array.isArray(airResult.data) ? airResult.data[0].id : airResult.data.id,
                        billId: bill.id,
                        amount: bill.sisa_tagihan
                    });
                }
            } else {
                throw new Error('Error creating Air payment: ' + airResult.message);
            }
        }

        // 3. Allocate all payments to bills
        await allocatePaymentToSelectedBillsV2(allAllocations);

        closeModal();
        showToast('Pembayaran IPL & Air berhasil diproses!', 'success');

        // Reset form and reload bills
        resetPaymentForm();
        await loadOutstandingBills();

    } catch (error) {
        console.error('Payment submission error:', error);
        showPaymentFormError(error.message || 'Terjadi kesalahan saat memproses pembayaran');
    }
}

// Allocate payment to selected bills (new version for auto-split)
async function allocatePaymentToSelectedBillsV2(allocations) {
    for (const allocation of allocations) {
        try {
            if (allocation.type === 'IPL') {
                const { allocatePaymentToSpecificTagihanIpl } = await import('../entities/transactions/tagihan_ipl-data.js');
                await allocatePaymentToSpecificTagihanIpl(allocation.pemasukanId, allocation.billId, allocation.amount);
            } else if (allocation.type === 'Air') {
                await allocatePaymentToTagihanAir(allocation.pemasukanId, allocation.amount, allocation.billId);
            }
        } catch (error) {
            console.warn(`Warning: Error allocating ${allocation.type} payment to bill ${allocation.billId}:`, error);
        }
    }
}

// Allocate payment to selected bills (old version - backward compatibility)
async function allocatePaymentToSelectedBills(pemasukanData, selectedBillsData) {
    const pemasukanRecord = Array.isArray(pemasukanData) ? pemasukanData[0] : pemasukanData;

    for (const bill of selectedBillsData) {
        try {
            if (bill.type === 'IPL') {
                const { allocatePaymentToSpecificTagihanIpl } = await import('../entities/transactions/tagihan_ipl-data.js');
                await allocatePaymentToSpecificTagihanIpl(pemasukanRecord.id, bill.id, bill.sisa_tagihan);
            } else if (bill.type === 'Air') {
                await allocatePaymentToTagihanAir(pemasukanRecord.id, bill.sisa_tagihan, bill.id);
            }
        } catch (error) {
            console.error(`Error allocating payment to ${bill.type} bill ${bill.id}:`, error);
        }
    }
}

// Allocate payment to Air bill using consolidated table
async function allocatePaymentToTagihanAir(pemasukanId, nominalPembayaran, meteranAirBillingId) {
    try {
        // Get payment date from pemasukan record
        const { data: pemasukan, error: pemasukanError } = await supabase
            .from('pemasukan')
            .select('tanggal')
            .eq('id', pemasukanId)
            .single();

        if (pemasukanError) throw pemasukanError;

        // Create allocation record for Air bill
        const allocationData = {
            meteran_air_billing_id: meteranAirBillingId,
            pemasukan_id: pemasukanId,
            nominal_dialokasikan: nominalPembayaran,
            tanggal_alokasi: pemasukan.tanggal
        };

        const { data, error } = await supabase
            .from('meteran_air_billing_pembayaran')
            .insert([allocationData]);

        if (error) throw error;

        // Update Air bill payment tracking
        const { data: bill, error: billError } = await supabase
            .from('meteran_air_billing')
            .select('total_pembayaran, sisa_tagihan')
            .eq('id', meteranAirBillingId)
            .single();

        if (billError) throw billError;

        const newTotalPayment = (bill.total_pembayaran || 0) + nominalPembayaran;
        const newRemaining = (bill.sisa_tagihan || 0) - nominalPembayaran;

        // Determine new status
        let newStatus = 'sebagian';
        if (newRemaining <= 0) {
            newStatus = 'lunas';
        } else if (newTotalPayment === 0) {
            newStatus = 'belum_bayar';
        }

        const { updateRecord } = await import('../crud.js');
        await updateRecord('meteran_air_billing', meteranAirBillingId, {
            total_pembayaran: newTotalPayment,
            sisa_tagihan: newRemaining,
            status: newStatus
        });

        return { success: true, message: `Pembayaran Air berhasil dialokasikan` };
    } catch (error) {
        console.error('Error allocating payment to Air bill:', error);
        return { success: false, message: error.message };
    }
}

// Get household information
async function getHouseholdInfo(hunianId) {
    try {
        const { data, error } = await supabase
            .from('hunian')
            .select('penghuni_saat_ini_id')
            .eq('id', hunianId)
            .single();

        if (error) throw error;
        return { penghuni_id: data.penghuni_saat_ini_id };
    } catch (error) {
        console.error('Error getting household info:', error);
        return null;
    }
}

// Show payment form error
function showPaymentFormError(message) {
    const errorDiv = document.getElementById('payment-form-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('d-none');
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Reset payment form
function resetPaymentForm() {
    selectedBills.clear();
    selectedHousehold = null;
    outstandingBills = [];

    // Reset SearchableSelect
    if (householdSearchableSelect) {
        householdSearchableSelect.setValue('');
    }

    // Hide bills display area (auto-load functionality doesn't use load-bills-btn anymore)
    document.getElementById('bills-display-area').classList.add('d-none');
}

export {
    loadViewPayments
};

// Backward compatibility
window.loadViewPayments = loadViewPayments;

