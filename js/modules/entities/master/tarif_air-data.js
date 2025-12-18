// Tarif Air data operations module
// Handles data loading, CRUD operations, and state management for tarif_air

import { supabase } from '../../config.js';
import {
    createRecord,
    updateRecord,
    deleteRecord,
    readRecords
} from '../../crud.js';
import { showToast } from '../../utils.js';

// Global state for tarif_air
let tarifAirData = [];
let tarifAirCurrentPage = 1;
let tarifAirItemsPerPage = 10;

// Load tarif air data
async function loadTarifAir(refreshUI = true, filters = {}) {
    try {
        let query = supabase
            .from('tarif_air')
            .select('*')
            .order('tanggal_mulai_berlaku', { ascending: false });

        // Apply filters if any
        if (filters.aktif !== undefined) {
            query = query.eq('aktif', filters.aktif);
        }

        const { data, error } = await query;

        if (error) throw error;

        tarifAirData = data || [];

        if (refreshUI) {
            // This will be imported and called from the table module
            if (typeof displayTarifAirTable === 'function') {
                displayTarifAirTable(tarifAirData);
            }
        }

        return { success: true, data: tarifAirData };
    } catch (error) {
        console.error('Error loading tarif air:', error);
        showToast('Error loading data', 'danger');

        if (refreshUI) {
            const tableElement = document.getElementById('tarif_air-table');
            if (tableElement) {
                tableElement.innerHTML = '<p>Error loading data</p>';
            }
        }

        return { success: false, message: error.message };
    }
}

// CRUD Operations
async function addTarifAir(formData) {
    try {
        // If this tarif is set to active, deactivate all other active tariffs
        if (formData.aktif === true) {
            await supabase
                .from('tarif_air')
                .update({ aktif: false })
                .neq('id', 'placeholder'); // Update all existing records
        }

        const result = await createRecord('tarif_air', formData, 'Tarif Air');
        return result;
    } catch (error) {
        console.error('Error adding tarif air:', error);
        return { success: false, message: error.message };
    }
}

async function updateTarifAir(id, formData) {
    try {
        // If this tarif is being set to active, deactivate all other active tariffs
        if (formData.aktif === true) {
            await supabase
                .from('tarif_air')
                .update({ aktif: false })
                .neq('id', id);
        }

        const result = await updateRecord('tarif_air', id, formData, 'Tarif Air');
        return result;
    } catch (error) {
        console.error('Error updating tarif air:', error);
        return { success: false, message: error.message };
    }
}

async function deleteTarifAir(id) {
    return await deleteRecord('tarif_air', id, 'Tarif Air');
}

async function confirmDeleteTarifAir(id) {
    // This will be implemented in the form module with UI confirmation
    if (typeof showConfirm === 'function') {
        const confirmed = await showConfirm('Apakah Anda yakin ingin menghapus tarif air ini?');
        if (confirmed) {
            const result = await deleteTarifAir(id);
            if (result.success) {
                await loadTarifAir();
            }
        }
    }
}

// Get active tariff
async function getActiveTarifAir() {
    try {
        const { data, error } = await supabase
            .from('tarif_air')
            .select('*')
            .eq('aktif', true)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error;
        }

        return { success: true, data: data || null };
    } catch (error) {
        console.error('Error getting active tariff:', error);
        return { success: false, message: error.message };
    }
}

// Get applicable tariff for a specific date
async function getTarifAirForDate(date) {
    try {
        const { data, error } = await supabase
            .from('tarif_air')
            .select('*')
            .lte('tanggal_mulai_berlaku', date)
            .eq('aktif', true)
            .order('tanggal_mulai_berlaku', { ascending: false })
            .limit(1);

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        return { success: true, data: data && data.length > 0 ? data[0] : null };
    } catch (error) {
        console.error('Error getting tariff for date:', error);
        return { success: false, message: error.message };
    }
}

// State management getters and setters
function getTarifAirData() {
    return tarifAirData;
}

function getTarifAirState() {
    return {
        tarifAirData,
        tarifAirCurrentPage,
        tarifAirItemsPerPage
    };
}

function setTarifAirState(state) {
    tarifAirData = state.tarifAirData || tarifAirData;
    tarifAirCurrentPage = state.tarifAirCurrentPage || tarifAirCurrentPage;
    tarifAirItemsPerPage = state.tarifAirItemsPerPage || tarifAirItemsPerPage;
}

export {
    loadTarifAir,
    addTarifAir,
    updateTarifAir,
    deleteTarifAir,
    confirmDeleteTarifAir,
    getActiveTarifAir,
    getTarifAirForDate,
    getTarifAirData,
    getTarifAirState,
    setTarifAirState
};

// Import UI-related functions dynamically
let displayTarifAirTable;
let showConfirm;

import('./tarif_air-table.js').then(tableModule => {
    displayTarifAirTable = tableModule.displayTarifAirTable;
}).catch(console.error);

import('../../utils.js').then(utils => {
    showConfirm = utils.showConfirm;
}).catch(() => {
    showConfirm = () => Promise.resolve(true);
});
