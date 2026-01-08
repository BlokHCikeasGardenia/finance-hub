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
            <!-- Household and Category Selection -->
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label for="payment-household-select" class="form-label">Pilih Rumah:</label>
                            <select class="form-select" id="payment-household-select"></select>
                        </div>
                        <div class="col-md-4">
                            <label for="payment-category-select" class="form-label">Jenis Tagihan:</label>
                            <select class="form-select" id="payment-category-select">
                                <option value="">Pilih Jenis Tagihan</option>
                                <option value="IPL">💡 IPL (Listrik)</option>
                                <option value="Air">💧 Air</option>
                            </select>
                        </div>
                        <div class="col-md-2 d-flex align-items-end">
                            <button class="btn btn-primary" id="load-bills-btn" disabled>
                                <i class="bi bi-search"></i> Lihat Tagihan
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bills Display Area -->
            <div id="bills-display-area" class="d-none">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Tagihan Outstanding</h5>
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

    // Set up SearchableSelect change event
    if (householdSearchableSelect) {
        householdSearchableSelect.selectElement.addEventListener('change', function() {
            checkLoadBillsButtonState();
        });
    }

    // Set up category selection change event
    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            checkLoadBillsButtonState();
        });
    }

    loadBillsBtn.addEventListener('click', () => loadOutstandingBills());
    processPaymentBtn.addEventListener('click', () => showPaymentForm());
}

// Check and update load bills button state
function checkLoadBillsButtonState() {
    const loadBillsBtn = document.getElementById('load-bills-btn');
    const householdValue = householdSearchableSelect?.getValue();
    const categoryValue = document.getElementById('payment-category-select')?.value;

    // Store selected values globally
    selectedHousehold = householdValue;
    selectedCategory = categoryValue;

    const isEnabled = selectedHousehold && selectedCategory;
    loadBillsBtn.disabled = !isEnabled;

    console.log('🔘 Load bills button state updated:', {
        household: selectedHousehold,
        category: selectedCategory,
        enabled: isEnabled
    });
}

// Load outstanding bills for selected household
async function loadOutstandingBills() {
    if (!selectedHousehold) return;

    const billsDisplayArea = document.getElementById('bills-display-area');
    const billsList = document.getElementById('bills-list');
    const loadBillsBtn = document.getElementById('load-bills-btn');

    try {
        // Show loading state
        console.log('🔄 Starting to load outstanding bills for household:', selectedHousehold, 'category:', selectedCategory);
        showToast(`Memuat tagihan ${selectedCategory}...`, 'info');

        // Disable button and show loading
        if (loadBillsBtn) {
            loadBillsBtn.disabled = true;
            loadBillsBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Memuat...';
        }

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

        let billsData = [];

        if (selectedCategory === 'IPL') {
            // Load only IPL bills
            console.log('📄 Loading IPL bills...');
            const { data: iplBills, error: iplError } = await supabase
                .from('tagihan_ipl')
                .select(`
                    id,
                    nominal_tagihan,
                    sisa_tagihan,
                    status,
                    periode:periode_id (nama_periode),
                    tanggal_tagihan
                `)
                .eq('hunian_id', selectedHousehold)
                .gt('sisa_tagihan', 0)
                .order('tanggal_tagihan', { ascending: false });

            if (iplError) {
                console.error('❌ IPL bills query error:', iplError);
                throw new Error(`Error loading IPL bills: ${iplError.message}`);
            }
            console.log('✅ IPL bills loaded:', iplBills?.length || 0, 'bills');
            billsData = (iplBills || []).map(bill => ({ ...bill, type: 'IPL' }));

        } else if (selectedCategory === 'Air') {
            // Load only Air bills
            console.log('💧 Loading Air bills...');
            const { data: airBills, error: airError } = await supabase
                .from('meteran_air_billing')
                .select(`
                    id,
                    nominal_tagihan,
                    sisa_tagihan,
                    status,
                    billing_type,
                    periode:periode_id (nama_periode),
                    tanggal_tagihan
                `)
                .eq('hunian_id', selectedHousehold)
                .gt('sisa_tagihan', 0)
                .neq('billing_type', 'inisiasi')  // Exclude baseline records
                .neq('billing_type', 'baseline')  // Exclude baseline records
                .order('tanggal_tagihan', { ascending: false });

            if (airError) {
                console.error('❌ Air bills query error:', airError);
                throw new Error(`Error loading Air bills: ${airError.message}`);
            }
            console.log('✅ Air bills loaded:', airBills?.length || 0, 'bills');
            billsData = (airBills || []).map(bill => ({ ...bill, type: 'Air' }));
        }

        // Set outstanding bills for selected category only
        outstandingBills = billsData;

        console.log('📋 Total outstanding bills:', outstandingBills.length);

        // Display bills list
        displayBillsList();

        // Reset button state
        if (loadBillsBtn) {
            loadBillsBtn.disabled = false;
            loadBillsBtn.innerHTML = '<i class="bi bi-search"></i> Lihat Tagihan';
        }

        showToast(`Berhasil memuat ${outstandingBills.length} tagihan`, 'success');

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

        // Reset button state
        if (loadBillsBtn) {
            loadBillsBtn.disabled = false;
            loadBillsBtn.innerHTML = '<i class="bi bi-search"></i> Lihat Tagihan';
        }

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

        // Calculate total payment amount
        const selectedBillsData = outstandingBills.filter(bill => selectedBills.has(bill.id));
        const totalAmount = selectedBillsData.reduce((sum, bill) => sum + bill.sisa_tagihan, 0);

        paymentData.nominal = totalAmount;

        // Generate transaction ID and set category
        paymentData.id_transaksi = await generateTransactionId();

        // Set category based on selected category (simplified since we only load one category at a time)
        if (selectedCategory === 'IPL') {
            const kategoriOptions = await getKategoriOptions();
            const iplCategory = kategoriOptions.find(cat => cat.text.includes('IPL'));
            paymentData.kategori_id = iplCategory?.value;
        } else if (selectedCategory === 'Air') {
            const kategoriOptions = await getKategoriOptions();
            const airCategory = kategoriOptions.find(cat => cat.text.includes('Air'));
            paymentData.kategori_id = airCategory?.value;
        }

        // Set household and penghuni info
        const householdInfo = await getHouseholdInfo(selectedHousehold);
        if (householdInfo) {
            paymentData.hunian_id = selectedHousehold;
            paymentData.penghuni_id = householdInfo.penghuni_id;
        }

        showToast('Memproses pembayaran tagihan IPL & Air...', 'info');

        // Create the payment record
        const result = await addPemasukan(paymentData);

        if (result.success) {
            // Allocate payment to selected bills
            await allocatePaymentToSelectedBills(result.data, selectedBillsData);

            closeModal();
            showToast('Pembayaran tagihan IPL & Air berhasil diproses!', 'success');

            // Reset form and reload bills
            resetPaymentForm();
            await loadOutstandingBills();
        } else {
            showPaymentFormError('Error: ' + result.message);
        }

    } catch (error) {
        console.error('Payment submission error:', error);
        showPaymentFormError(error.message || 'Terjadi kesalahan saat memproses pembayaran');
    }
}

// Allocate payment to selected bills
async function allocatePaymentToSelectedBills(pemasukanData, selectedBillsData) {
    const pemasukanRecord = Array.isArray(pemasukanData) ? pemasukanData[0] : pemasukanData;

    for (const bill of selectedBillsData) {
        try {
            if (bill.type === 'IPL') {
                // Allocate payment to specific IPL bill
                const { allocatePaymentToSpecificTagihanIpl } = await import('../entities/transactions/tagihan_ipl-data.js');
                await allocatePaymentToSpecificTagihanIpl(pemasukanRecord.id, bill.id, bill.sisa_tagihan);
            } else if (bill.type === 'Air') {
                // Allocate payment to Air bill
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

    document.getElementById('load-bills-btn').disabled = true;
    document.getElementById('bills-display-area').classList.add('d-none');
}

export {
    loadViewPayments
};

// Backward compatibility
window.loadViewPayments = loadViewPayments;
    document.getElementById('load-bills-btn').disabled = true;
