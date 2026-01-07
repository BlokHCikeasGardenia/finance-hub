// Pemasukan data operations module
// Handles data loading, CRUD operations, and state management

import { supabase } from '../../config.js';
import {
    createRecord,
    updateRecord,
    deleteRecord,
    readRecords
} from '../../crud.js';
import { showToast } from '../../utils.js';

// Global state for pemasukan
let pemasukanData = [];
let pemasukanCurrentPage = 1;
let pemasukanItemsPerPage = 10;
let pemasukanSearchTerm = '';
let pemasukanFilterCategory = '';
let pemasukanFilterAccount = '';
let pemasukanFilterDateFrom = '';
let pemasukanFilterDateTo = '';
let pemasukanSortColumn = '';
let pemasukanSortDirection = 'none'; // 'asc', 'desc', 'none'

// Categories loaded from kategori_saldo table
let pemasukanCategories = [];

// Load categories from kategori_saldo table
async function loadPemasukanCategories() {
    try {
        const { data, error } = await supabase
            .from('kategori_saldo')
            .select('id, nama_kategori')
            .order('nama_kategori');

        if (error) throw error;

        pemasukanCategories = data ? data.map(item => ({
            value: item.id,
            text: item.nama_kategori
        })) : [];

        return pemasukanCategories;
    } catch (error) {
        console.error('Error loading pemasukan categories:', error);
        pemasukanCategories = [];
        return [];
    }
}

// Generate unique transaction ID with auto-initialization
async function generateTransactionId() {
    const counterType = 'pemasukan';
    const currentYear = new Date().getFullYear();

    try {
        // First try the RPC function
        const { data, error } = await supabase.rpc('get_next_transaction_number', {
            counter_type_param: counterType
        });

        if (!error && data !== null) {
            // RPC succeeded, format the result
            const year = currentYear.toString().slice(-2);
            const transactionNumber = data.toString().padStart(4, '0');
            return `inc${year}${transactionNumber}`;
        }

        // If RPC failed, try to initialize the counter and retry
        console.warn('RPC failed, attempting to initialize counter for', counterType, currentYear);

        // Check if counter exists
        const { data: existingCounter, error: checkError } = await supabase
            .from('transaction_counters')
            .select('id, current_number')
            .eq('counter_type', counterType)
            .eq('year', currentYear)
            .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
            console.error('Error checking counter:', checkError);
            throw checkError;
        }

        if (!existingCounter) {
            // Counter doesn't exist, create it
            console.log('Initializing counter for', counterType, currentYear);
            const { error: insertError } = await supabase
                .from('transaction_counters')
                .insert({
                    counter_type: counterType,
                    year: currentYear,
                    current_number: 0
                });

            if (insertError) {
                console.error('Error initializing counter:', insertError);
                throw insertError;
            }
        }

        // Now retry the RPC function
        const { data: retryData, error: retryError } = await supabase.rpc('get_next_transaction_number', {
            counter_type_param: counterType
        });

        if (retryError) {
            console.error('RPC still failed after initialization:', retryError);
            throw retryError;
        }

        // Format the result
        const year = currentYear.toString().slice(-2);
        const transactionNumber = retryData.toString().padStart(4, '0');
        return `inc${year}${transactionNumber}`;

    } catch (error) {
        console.error('Error generating transaction ID:', error);
        // Last resort fallback: generate based on timestamp with clear indication
        const timestamp = Date.now().toString().slice(-6);
        const fallbackId = `inc${timestamp}`;
        console.warn('Using timestamp fallback ID:', fallbackId);
        return fallbackId;
    }
}

// Load pemasukan data
async function loadPemasukan(refreshUI = true) {
    try {
        // First load categories if not loaded
        if (pemasukanCategories.length === 0) {
            await loadPemasukanCategories();
        }

        const selectQuery = `
            id,
            id_transaksi,
            tanggal,
            kategori_id,
            nominal,
            penghuni_id,
            hunian_id,
            periode_id,
            rekening_id,
            keterangan,
            penghuni:penghuni_id (nama_kepala_keluarga),
            hunian:hunian_id (nomor_blok_rumah),
            rekening:rekening_id (jenis_rekening),
            kategori_saldo:kategori_id (nama_kategori),
            periode:periode_id (nama_periode)
        `;

        const { success, data } = await readRecords('pemasukan', {
            select: selectQuery,
            orderBy: 'tanggal DESC'
        });

        if (!success) throw new Error('Failed to load pemasukan data');

        pemasukanData = data || [];

        if (refreshUI) {
            // This will be imported and called from the table module
            if (typeof filterAndDisplayPemasukan === 'function') {
                filterAndDisplayPemasukan();
            }
        }

        return { success: true, data: pemasukanData };
    } catch (error) {
        console.error('Error loading pemasukan:', error);
        showToast('Error loading pemasukan data', 'danger');

        if (refreshUI) {
            const tableElement = document.getElementById('pemasukan-table');
            if (tableElement) {
                tableElement.innerHTML = '<p>Error loading data</p>';
            }
        }

        return { success: false, message: error.message };
    }
}

// CRUD Operations
async function addPemasukan(formData) {
    return await createRecord('pemasukan', formData, 'Pemasukan');
}

async function updatePemasukan(id, formData) {
    return await updateRecord('pemasukan', id, formData, 'Pemasukan');
}

async function deletePemasukan(id) {
    return await deleteRecord('pemasukan', id, 'Pemasukan');
}

async function confirmDeletePemasukan(id) {
    // This will be implemented in the form module with UI confirmation
    if (typeof showConfirm === 'function') {
        const confirmed = await showConfirm('Apakah Anda yakin ingin menghapus transaksi pemasukan ini?');
        if (confirmed) {
            const result = await deletePemasukan(id);
            if (result.success) {
                await loadPemasukan();
            }
        }
    }
}

// Data utilities for form selects

// Get all penghuni options
async function getPenghuniOptions() {
    try {
        const { data, error } = await supabase
            .from('penghuni')
            .select('id, nama_kepala_keluarga')
            .order('nama_kepala_keluarga');

        if (error) throw error;
        return data ? data.map(item => ({ value: item.id, text: item.nama_kepala_keluarga })) : [];
    } catch (error) {
        console.error('Error getting penghuni options:', error);
        return [];
    }
}

// Get all hunian options
async function getHunianOptions() {
    try {
        const { data, error } = await supabase
            .from('hunian')
            .select('id, nomor_blok_rumah')
            .order('nomor_urut');

        if (error) throw error;
        return data ? data.map(item => ({ value: item.id, text: item.nomor_blok_rumah })) : [];
    } catch (error) {
        console.error('Error getting hunian options:', error);
        return [];
    }
}

// Get all rekening options
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

// Get periode options for periods
async function getPeriodeOptions() {
    try {
        const { data, error } = await supabase
            .from('periode')
            .select('id, nama_periode')
            .order('nomor_urut');

        if (error) throw error;
        return data ? data.map(item => ({ value: item.id, text: item.nama_periode })) : [];
    } catch (error) {
        console.error('Error getting periode options:', error);
        return [];
    }
}

// Get kategori options - ensure categories are loaded first
async function getKategoriOptions() {
    // Load categories if not already loaded
    if (pemasukanCategories.length === 0) {
        await loadPemasukanCategories();
    }
    return pemasukanCategories;
}

// State management getters and setters
function getPemasukanData() {
    return pemasukanData;
}

function getPemasukanCategories() {
    return pemasukanCategories;
}

function getPemasukanState() {
    return {
        pemasukanData,
        pemasukanCurrentPage,
        pemasukanItemsPerPage,
        pemasukanSearchTerm,
        pemasukanFilterCategory,
        pemasukanFilterAccount,
        pemasukanFilterDateFrom,
        pemasukanFilterDateTo,
        pemasukanSortColumn,
        pemasukanSortDirection
    };
}

function setPemasukanState(state) {
    pemasukanData = state.pemasukanData || pemasukanData;
    pemasukanCurrentPage = state.pemasukanCurrentPage || pemasukanCurrentPage;
    pemasukanItemsPerPage = state.pemasukanItemsPerPage || pemasukanItemsPerPage;
    pemasukanSearchTerm = state.pemasukanSearchTerm !== undefined ? state.pemasukanSearchTerm : pemasukanSearchTerm;
    pemasukanFilterCategory = state.pemasukanFilterCategory !== undefined ? state.pemasukanFilterCategory : pemasukanFilterCategory;
    pemasukanFilterAccount = state.pemasukanFilterAccount !== undefined ? state.pemasukanFilterAccount : pemasukanFilterAccount;
    pemasukanFilterDateFrom = state.pemasukanFilterDateFrom !== undefined ? state.pemasukanFilterDateFrom : pemasukanFilterDateFrom;
    pemasukanFilterDateTo = state.pemasukanFilterDateTo !== undefined ? state.pemasukanFilterDateTo : pemasukanFilterDateTo;
    // Persist sort state when provided
    pemasukanSortColumn = state.pemasukanSortColumn !== undefined ? state.pemasukanSortColumn : pemasukanSortColumn;
    pemasukanSortDirection = state.pemasukanSortDirection !== undefined ? state.pemasukanSortDirection : pemasukanSortDirection;
}

export {
    loadPemasukanCategories,
    generateTransactionId,
    loadPemasukan,
    addPemasukan,
    updatePemasukan,
    deletePemasukan,
    confirmDeletePemasukan,
    getPenghuniOptions,
    getHunianOptions,
    getRekeningOptions,
    getPeriodeOptions,
    getKategoriOptions,
    getPemasukanData,
    getPemasukanCategories,
    getPemasukanState,
    setPemasukanState
};

// Import UI-related functions dynamically
let filterAndDisplayPemasukan;
let showConfirm;

import('./pemasukan-filters.js').then(filtersModule => {
    filterAndDisplayPemasukan = filtersModule.filterAndDisplayPemasukan;
}).catch(console.error);

import('../../utils.js').then(utils => {
    showConfirm = utils.showConfirm;
}).catch(() => {
    showConfirm = () => Promise.resolve(true);
});
