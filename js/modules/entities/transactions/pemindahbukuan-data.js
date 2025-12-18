// Pemindahbukuan data operations module
// Handles data loading, CRUD operations, and state management

import { supabase } from '../../config.js';
import {
    createRecord,
    updateRecord,
    deleteRecord,
    readRecords
} from '../../crud.js';
import { showToast } from '../../utils.js';

// Global state for pemindahbukuan
let pemindahbukuanData = [];
let pemindahbukuanCurrentPage = 1;
let pemindahbukuanItemsPerPage = 10;
let pemindahbukuanSearchTerm = '';
let pemindahbukuanFilterDateFrom = '';
let pemindahbukuanFilterDateTo = '';

// Generate unique transaction ID
async function generateTransactionId() {
    try {
        const { data, error } = await supabase.rpc('get_next_transaction_number', {
            counter_type_param: 'pemindahbukuan'
        });

        if (error) throw error;

        // Format: trf{YY}{XXXX} (e.g., trf250001)
        const year = new Date().getFullYear().toString().slice(-2);
        const transactionNumber = data.toString().padStart(4, '0');

        return `trf${year}${transactionNumber}`;
    } catch (error) {
        console.error('Error generating transaction ID:', error);
        // Fallback: generate based on timestamp
        const timestamp = Date.now().toString().slice(-6);
        return `trf${timestamp}`;
    }
}

// Load pemindahbukuan data
async function loadPemindahbukuan(refreshUI = true) {
    try {
        const selectQuery = `
            id,
            id_transaksi,
            tanggal,
            rekening_dari_id,
            rekening_ke_id,
            nominal,
            catatan,
            rekening_dari:rekening_dari_id (jenis_rekening),
            rekening_ke:rekening_ke_id (jenis_rekening)
        `;

        const { success, data } = await readRecords('pemindahbukuan', {
            select: selectQuery,
            orderBy: 'tanggal DESC'
        });

        if (!success) throw new Error('Failed to load pemindahbukuan data');

        pemindahbukuanData = data || [];

        if (refreshUI) {
            // This will be imported and called from the table module
            if (typeof filterAndDisplayPemindahbukuan === 'function') {
                filterAndDisplayPemindahbukuan();
            }
        }

        return { success: true, data: pemindahbukuanData };
    } catch (error) {
        console.error('Error loading pemindahbukuan:', error);
        showToast('Error loading pemindahbukuan data', 'danger');

        if (refreshUI) {
            const tableElement = document.getElementById('pemindahbukuan-table');
            if (tableElement) {
                tableElement.innerHTML = '<p>Error loading data</p>';
            }
        }

        return { success: false, message: error.message };
    }
}

// CRUD Operations
async function addPemindahbukuan(formData) {
    return await createRecord('pemindahbukuan', formData, 'Pemindahbukuan');
}

async function updatePemindahbukuan(id, formData) {
    return await updateRecord('pemindahbukuan', id, formData, 'Pemindahbukuan');
}

async function deletePemindahbukuan(id) {
    return await deleteRecord('pemindahbukuan', id, 'Pemindahbukuan');
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
function getPemindahbukuanData() {
    return pemindahbukuanData;
}

function getPemindahbukuanState() {
    return {
        pemindahbukuanData,
        pemindahbukuanCurrentPage,
        pemindahbukuanItemsPerPage,
        pemindahbukuanSearchTerm,
        pemindahbukuanFilterDateFrom,
        pemindahbukuanFilterDateTo
    };
}

function setPemindahbukuanState(state) {
    pemindahbukuanData = state.pemindahbukuanData || pemindahbukuanData;
    pemindahbukuanCurrentPage = state.pemindahbukuanCurrentPage || pemindahbukuanCurrentPage;
    pemindahbukuanItemsPerPage = state.pemindahbukuanItemsPerPage || pemindahbukuanItemsPerPage;
    pemindahbukuanSearchTerm = state.pemindahbukuanSearchTerm !== undefined ? state.pemindahbukuanSearchTerm : pemindahbukuanSearchTerm;
    pemindahbukuanFilterDateFrom = state.pemindahbukuanFilterDateFrom !== undefined ? state.pemindahbukuanFilterDateFrom : pemindahbukuanFilterDateFrom;
    pemindahbukuanFilterDateTo = state.pemindahbukuanFilterDateTo !== undefined ? state.pemindahbukuanFilterDateTo : pemindahbukuanFilterDateTo;
}

export {
    generateTransactionId,
    loadPemindahbukuan,
    addPemindahbukuan,
    updatePemindahbukuan,
    deletePemindahbukuan,
    getRekeningOptions,
    getPemindahbukuanData,
    getPemindahbukuanState,
    setPemindahbukuanState
};

// Import UI-related functions dynamically
let filterAndDisplayPemindahbukuan;

import('./pemindahbukuan-filters.js').then(filtersModule => {
    filterAndDisplayPemindahbukuan = filtersModule.filterAndDisplayPemindahbukuan;
}).catch(console.error);
