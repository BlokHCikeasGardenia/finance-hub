// Dana Titipan data operations module
// Handles data loading, CRUD operations, and state management

import { supabase } from '../../config.js';
import {
    createRecord,
    updateRecord,
    deleteRecord,
    readRecords
} from '../../crud.js';
import { showToast } from '../../utils.js';

// Global state for dana_titipan
let danaTitipanData = [];
let danaTitipanCurrentPage = 1;
let danaTitipanItemsPerPage = 10;
let danaTitipanSearchTerm = '';
let danaTitipanFilterCategory = '';
let danaTitipanFilterAccount = '';
let danaTitipanFilterDateFrom = '';
let danaTitipanFilterDateTo = '';

// Categories loaded from kategori_saldo table
let danaTitipanCategories = [];

// Load categories from kategori_saldo table
async function loadDanaTitipanCategories() {
    try {
        const { data, error } = await supabase
            .from('kategori_saldo')
            .select('id, nama_kategori')
            .order('nama_kategori');

        if (error) throw error;

        danaTitipanCategories = data ? data.map(item => ({
            id: item.id,
            name: item.nama_kategori
        })) : [];

        return danaTitipanCategories;
    } catch (error) {
        console.error('Error loading dana_titipan categories:', error);
        danaTitipanCategories = [];
        return [];
    }
}

// Generate unique transaction ID
async function generateTransactionId() {
    try {
        const { data, error } = await supabase.rpc('get_next_transaction_number', {
            counter_type_param: 'dana_titipan'
        });

        if (error) throw error;

        // Format: dtp{YY}{XXXX} (e.g., dtp250001)
        const year = new Date().getFullYear().toString().slice(-2);
        const transactionNumber = data.toString().padStart(4, '0');

        return `dtp${year}${transactionNumber}`;
    } catch (error) {
        console.error('Error generating transaction ID:', error);
        // Fallback: generate based on timestamp
        const timestamp = Date.now().toString().slice(-6);
        return `dtp${timestamp}`;
    }
}

// Load dana_titipan data
async function loadDanaTitipan(refreshUI = true) {
    try {
        // First load categories if not loaded
        if (danaTitipanCategories.length === 0) {
            await loadDanaTitipanCategories();
        }

        const selectQuery = `
            id,
            id_transaksi,
            tanggal,
            created_at,
            kategori_id,
            periode_id,
            nominal,
            penghuni_id,
            hunian_id,
            rekening_id,
            keterangan,
            penghuni:penghuni_id (nama_kepala_keluarga),
            hunian:hunian_id (nomor_blok_rumah),
            rekening:rekening_id (jenis_rekening),
            kategori_saldo:kategori_id (nama_kategori),
            periode:periode_id (nama_periode)
        `;

        const { success, data } = await readRecords('dana_titipan', {
            select: selectQuery,
            orderBy: 'tanggal DESC'
        });

        if (!success) throw new Error('Failed to load dana_titipan data');

        danaTitipanData = data || [];

        if (refreshUI) {
            // This will be imported and called from the filters module
            if (typeof filterAndDisplayDanaTitipan === 'function') {
                filterAndDisplayDanaTitipan();
            }
        }

        return { success: true, data: danaTitipanData };
    } catch (error) {
        console.error('Error loading dana_titipan:', error);
        showToast('Error loading dana_titipan data', 'danger');

        if (refreshUI) {
            const tableElement = document.getElementById('dana_titipan-table');
            if (tableElement) {
                tableElement.innerHTML = '<p>Error loading data</p>';
            }
        }

        return { success: false, message: error.message };
    }
}

// CRUD Operations
async function addDanaTitipan(formData) {
    return await createRecord('dana_titipan', formData, 'Dana Titipan');
}

async function updateDanaTitipan(id, formData) {
    return await updateRecord('dana_titipan', id, formData, 'Dana Titipan');
}

async function deleteDanaTitipan(id) {
    return await deleteRecord('dana_titipan', id, 'Dana Titipan');
}

async function confirmDeleteDanaTitipan(id) {
    // This will be implemented in the form module with UI confirmation
    if (typeof showConfirm === 'function') {
        const confirmed = await showConfirm('Apakah Anda yakin ingin menghapus dana titipan ini?');
        if (confirmed) {
            const result = await deleteDanaTitipan(id);
            if (result.success) {
                await loadDanaTitipan();
            }
        }
    }
}

// Data utilities for form selects
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

async function getKategoriOptions() {
    return danaTitipanCategories;
}

async function getPeriodeOptions() {
    try {
        const { data, error } = await supabase
            .from('periode')
            .select('id, nama_periode')
            .order('tanggal_awal', { ascending: false });

        if (error) throw error;
        return data ? data.map(item => ({
            value: item.id,
            text: item.nama_periode
        })) : [];
    } catch (error) {
        console.error('Error getting periode options:', error);
        return [];
    }
}

// State management getters and setters
function getDanaTitipanData() {
    return danaTitipanData;
}

function getDanaTitipanCategories() {
    return danaTitipanCategories;
}

function getDanaTitipanState() {
    return {
        danaTitipanData,
        danaTitipanCurrentPage,
        danaTitipanItemsPerPage,
        danaTitipanSearchTerm,
        danaTitipanFilterCategory,
        danaTitipanFilterAccount,
        danaTitipanFilterDateFrom,
        danaTitipanFilterDateTo
    };
}

function setDanaTitipanState(state) {
    danaTitipanData = state.danaTitipanData || danaTitipanData;
    danaTitipanCurrentPage = state.danaTitipanCurrentPage || danaTitipanCurrentPage;
    danaTitipanItemsPerPage = state.danaTitipanItemsPerPage || danaTitipanItemsPerPage;
    danaTitipanSearchTerm = state.danaTitipanSearchTerm !== undefined ? state.danaTitipanSearchTerm : danaTitipanSearchTerm;
    danaTitipanFilterCategory = state.danaTitipanFilterCategory !== undefined ? state.danaTitipanFilterCategory : danaTitipanFilterCategory;
    danaTitipanFilterAccount = state.danaTitipanFilterAccount !== undefined ? state.danaTitipanFilterAccount : danaTitipanFilterAccount;
    danaTitipanFilterDateFrom = state.danaTitipanFilterDateFrom !== undefined ? state.danaTitipanFilterDateFrom : danaTitipanFilterDateFrom;
    danaTitipanFilterDateTo = state.danaTitipanFilterDateTo !== undefined ? state.danaTitipanFilterDateTo : danaTitipanFilterDateTo;
}

function resetDanaTitipanFilters() {
    danaTitipanSearchTerm = '';
    danaTitipanFilterCategory = '';
    danaTitipanFilterAccount = '';
    danaTitipanFilterDateFrom = '';
    danaTitipanFilterDateTo = '';
    danaTitipanCurrentPage = 1;
}

export {
    loadDanaTitipanCategories,
    generateTransactionId,
    loadDanaTitipan,
    addDanaTitipan,
    updateDanaTitipan,
    deleteDanaTitipan,
    confirmDeleteDanaTitipan,
    getRekeningOptions,
    getPenghuniOptions,
    getHunianOptions,
    getKategoriOptions,
    getPeriodeOptions,
    getDanaTitipanData,
    getDanaTitipanCategories,
    getDanaTitipanState,
    setDanaTitipanState,
    resetDanaTitipanFilters
};

import { filterAndDisplayDanaTitipan } from './dana_titipan-filters.js';

let showConfirm;
import('../../utils.js').then(utils => {
    showConfirm = utils.showConfirm;
}).catch(() => {
    showConfirm = () => Promise.resolve(true);
});
