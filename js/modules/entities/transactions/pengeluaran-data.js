// Pengeluaran data operations module
// Handles data loading, CRUD operations, and state management

import { supabase } from '../../config.js';
import {
    createRecord,
    updateRecord,
    deleteRecord,
    readRecords
} from '../../crud.js';
import { showToast } from '../../utils.js';

// Global state for pengeluaran
let pengeluaranData = [];
let pengeluaranCurrentPage = 1;
let pengeluaranItemsPerPage = 10;
let pengeluaranSearchTerm = '';
let pengeluaranFilterCategory = '';
let pengeluaranFilterSubcategory = '';
let pengeluaranFilterAccount = '';
let pengeluaranFilterDateFrom = '';
let pengeluaranFilterDateTo = '';

// Categories and subcategories loaded from database
let pengeluaranCategories = [];
let pengeluaranSubcategories = [];

// Load categories
async function loadPengeluaranCategories() {
    try {
        const { data, error } = await supabase
            .from('kategori_saldo')
            .select('id, nama_kategori')
            .order('nama_kategori');

        if (error) throw error;

        pengeluaranCategories = data ? data.map(item => ({
            id: item.id,
            name: item.nama_kategori
        })) : [];

        return pengeluaranCategories;
    } catch (error) {
        console.error('Error loading pengeluaran categories:', error);
        pengeluaranCategories = [];
        return [];
    }
}

// Load subcategories - can be filtered by categoryId
async function loadPengeluaranSubcategories(categoryId = null) {
    try {
        let query = supabase.from('subkategori').select(`
            id,
            nama_subkategori,
            kategori_id,
            kategori_saldo:kategori_id (nama_kategori)
        `).order('nama_subkategori');

        if (categoryId) {
            query = query.eq('kategori_id', categoryId);
        }

        const { data, error } = await query;
        if (error) throw error;

        pengeluaranSubcategories = data || [];
        return pengeluaranSubcategories;
    } catch (error) {
        console.error('Error loading pengeluaran subcategories:', error);
        pengeluaranSubcategories = [];
        return [];
    }
}

// Generate unique transaction ID
async function generateTransactionId() {
    try {
        const { data, error } = await supabase.rpc('get_next_transaction_number', {
            counter_type_param: 'pengeluaran'
        });

        if (error) throw error;

        // Format: exp{YY}{XXXX} (e.g., exp250001)
        const year = new Date().getFullYear().toString().slice(-2);
        const transactionNumber = data.toString().padStart(4, '0');

        return `exp${year}${transactionNumber}`;
    } catch (error) {
        console.error('Error generating transaction ID:', error);
        // Fallback: generate based on timestamp
        const timestamp = Date.now().toString().slice(-6);
        return `exp${timestamp}`;
    }
}

// Load pengeluaran data
async function loadPengeluaran(refreshUI = true) {
    try {
        // First load categories if not loaded
        if (pengeluaranCategories.length === 0) {
            await loadPengeluaranCategories();
        }

        const selectQuery = `
            id,
            id_transaksi,
            tanggal,
            kategori_id,
            subkategori_id,
            rekening_id,
            nominal,
            penerima,
            keterangan,
            link_url,
            kategori:kategori_id (nama_kategori),
            subkategori:subkategori_id (nama_subkategori),
            rekening:rekening_id (jenis_rekening)
        `;

        const { success, data } = await readRecords('pengeluaran', {
            select: selectQuery,
            orderBy: 'tanggal DESC'
        });

        if (!success) throw new Error('Failed to load pengeluaran data');

        pengeluaranData = data || [];

        if (refreshUI) {
            // This will be imported and called from the table module
            if (typeof filterAndDisplayPengeluaran === 'function') {
                filterAndDisplayPengeluaran();
            }
        }

        return { success: true, data: pengeluaranData };
    } catch (error) {
        console.error('Error loading pengeluaran:', error);
        showToast('Error loading pengeluaran data', 'danger');

        if (refreshUI) {
            const tableElement = document.getElementById('pengeluaran-table');
            if (tableElement) {
                tableElement.innerHTML = '<p>Error loading data</p>';
            }
        }

        return { success: false, message: error.message };
    }
}

// CRUD Operations
async function addPengeluaran(formData) {
    return await createRecord('pengeluaran', formData, 'Pengeluaran');
}

async function updatePengeluaran(id, formData) {
    return await updateRecord('pengeluaran', id, formData, 'Pengeluaran');
}

async function deletePengeluaran(id) {
    return await deleteRecord('pengeluaran', id, 'Pengeluaran');
}

// Get rekening options for form selects
async function getRekeningOptions() {
    try {
        const { data, error } = await supabase
            .from('rekening')
            .select('id, jenis_rekening')
            .order('jenis_rekening');

        if (error) throw error;
        return data ? data.map(item => ({ value: item.id, text: item.jenis_rekening })) : [];
    } catch (error) {
        console.error('Error getting rekening options:', error);
        return [];
    }
}

// State management getters and setters
function getPengeluaranData() {
    return pengeluaranData;
}

function getPengeluaranCategories() {
    return pengeluaranCategories;
}

function getPengeluaranSubcategories() {
    return pengeluaranSubcategories;
}

function getPengeluaranState() {
    return {
        pengeluaranData,
        pengeluaranCurrentPage,
        pengeluaranItemsPerPage,
        pengeluaranSearchTerm,
        pengeluaranFilterCategory,
        pengeluaranFilterSubcategory,
        pengeluaranFilterAccount,
        pengeluaranFilterDateFrom,
        pengeluaranFilterDateTo
    };
}

function setPengeluaranState(state) {
    pengeluaranData = state.pengeluaranData || pengeluaranData;
    pengeluaranCurrentPage = state.pengeluaranCurrentPage || pengeluaranCurrentPage;
    pengeluaranItemsPerPage = state.pengeluaranItemsPerPage || pengeluaranItemsPerPage;
    pengeluaranSearchTerm = state.pengeluaranSearchTerm !== undefined ? state.pengeluaranSearchTerm : pengeluaranSearchTerm;
    pengeluaranFilterCategory = state.pengeluaranFilterCategory !== undefined ? state.pengeluaranFilterCategory : pengeluaranFilterCategory;
    pengeluaranFilterSubcategory = state.pengeluaranFilterSubcategory !== undefined ? state.pengeluaranFilterSubcategory : pengeluaranFilterSubcategory;
    pengeluaranFilterAccount = state.pengeluaranFilterAccount !== undefined ? state.pengeluaranFilterAccount : pengeluaranFilterAccount;
    pengeluaranFilterDateFrom = state.pengeluaranFilterDateFrom !== undefined ? state.pengeluaranFilterDateFrom : pengeluaranFilterDateFrom;
    pengeluaranFilterDateTo = state.pengeluaranFilterDateTo !== undefined ? state.pengeluaranFilterDateTo : pengeluaranFilterDateTo;
}

export {
    loadPengeluaranCategories,
    loadPengeluaranSubcategories,
    generateTransactionId,
    loadPengeluaran,
    addPengeluaran,
    updatePengeluaran,
    deletePengeluaran,
    getRekeningOptions,
    getPengeluaranData,
    getPengeluaranCategories,
    getPengeluaranSubcategories,
    getPengeluaranState,
    setPengeluaranState
};

// Import UI-related functions dynamically
let filterAndDisplayPengeluaran;

import('./pengeluaran-filters.js').then(filtersModule => {
    filterAndDisplayPengeluaran = filtersModule.filterAndDisplayPengeluaran;
}).catch(console.error);
