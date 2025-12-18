// Hunian data operations module
// Handles data loading, CRUD operations, and state management

import { supabase } from '../../config.js';
import {
    createRecord,
    updateRecord,
    deleteRecord,
    readRecords
} from '../../crud.js';
import { showToast } from '../../utils.js';

// Global state for hunian
let hunianData = [];
let hunianCurrentPage = 1;
let hunianItemsPerPage = 10;
let hunianSearchTerm = '';
let hunianStatusFilter = '';
let hunianLorongFilter = '';
let hunianAirFilter = '';

// Load hunian data
async function loadHunian(refreshUI = true) {
    try {
        const selectQuery = `
            id,
            nomor_urut,
            nomor_blok_rumah,
            status,
            pelanggan_air,
            lorong_id,
            penghuni_saat_ini_id,
            lorong:lorong_id (nama_lorong),
            penghuni_saat_ini:penghuni_saat_ini_id (nama_kepala_keluarga, kondisi_khusus)
        `;

        const { success, data } = await readRecords('hunian', {
            select: selectQuery,
            orderBy: 'nomor_urut'
        });

        if (!success) throw new Error('Failed to load hunian data');

        hunianData = data || [];

        if (refreshUI) {
            // This will be imported and called from the main module
            if (typeof filterAndDisplayHunian === 'function') {
                filterAndDisplayHunian();
            }
        }

        return { success: true, data: hunianData };
    } catch (error) {
        console.error('Error loading hunian:', error);
        showToast('Error loading data', 'danger');

        if (refreshUI) {
            const tableElement = document.getElementById('hunian-table');
            if (tableElement) {
                tableElement.innerHTML = '<p>Error loading data</p>';
            }
        }

        return { success: false, message: error.message };
    }
}

// Add new hunian
async function addHunian(formData) {
    return await createRecord('hunian', formData, 'Hunian');
}

// Update hunian
async function updateHunian(id, formData) {
    return await updateRecord('hunian', id, formData, 'Hunian');
}

// Delete hunian
async function deleteHunian(id) {
    return await deleteRecord('hunian', id, 'Hunian');
}

// Confirm delete hunian
async function confirmDeleteHunian(id) {
    const confirmed = await showConfirm('Apakah Anda yakin ingin menghapus hunian ini?');
    if (confirmed) {
        const result = await deleteHunian(id);
        if (result.success) {
            await loadHunian();
        }
    }
}

// Get data for searchable selects in forms
async function getLorongData() {
    try {
        const { data, error } = await supabase
            .from('lorong')
            .select('id, nama_lorong')
            .order('nama_lorong');

        if (error) throw error;
        return data ? data.map(item => ({ value: item.id, text: item.nama_lorong })) : [];
    } catch (error) {
        console.error('Error loading lorong data:', error);
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
        console.error('Error loading penghuni data:', error);
        return [];
    }
}

// State management getters and setters
function getHunianData() {
    return hunianData;
}

function getHunianState() {
    return {
        hunianData,
        hunianCurrentPage,
        hunianItemsPerPage,
        hunianSearchTerm,
        hunianStatusFilter,
        hunianLorongFilter,
        hunianAirFilter
    };
}

function setHunianState(state) {
    hunianData = state.hunianData || hunianData;
    hunianCurrentPage = state.hunianCurrentPage || hunianCurrentPage;
    hunianItemsPerPage = state.hunianItemsPerPage || hunianItemsPerPage;
    hunianSearchTerm = state.hunianSearchTerm || hunianSearchTerm;
    hunianStatusFilter = state.hunianStatusFilter !== undefined ? state.hunianStatusFilter : hunianStatusFilter;
    hunianLorongFilter = state.hunianLorongFilter !== undefined ? state.hunianLorongFilter : hunianLorongFilter;
    hunianAirFilter = state.hunianAirFilter !== undefined ? state.hunianAirFilter : hunianAirFilter;
}

function resetHunianFilters() {
    hunianSearchTerm = '';
    hunianStatusFilter = '';
    hunianLorongFilter = '';
    hunianAirFilter = '';
    hunianCurrentPage = 1;
}

export {
    loadHunian,
    addHunian,
    updateHunian,
    deleteHunian,
    confirmDeleteHunian,
    getLorongData,
    getPenghuniOptions,
    getHunianData,
    getHunianState,
    setHunianState,
    resetHunianFilters
};

// Note: filterAndDisplayHunian will be imported from the filters module
import { filterAndDisplayHunian } from './hunian-filters.js';
import { showConfirm } from '../../utils.js';
