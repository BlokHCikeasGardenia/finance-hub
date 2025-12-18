// Tarif IPL data operations module
// Handles data loading, CRUD operations, and state management for tarif_ipl

import { supabase } from '../../config.js';
import {
    createRecord,
    updateRecord,
    deleteRecord,
    readRecords
} from '../../crud.js';
import { showToast } from '../../utils.js';

// Global state for tarif_ipl
let tarifIplData = [];
let tarifIplCurrentPage = 1;
let tarifIplItemsPerPage = 10;

// Load tarif IPL data
async function loadTarifIpl(refreshUI = true, filters = {}) {
    try {
        let query = supabase
            .from('tarif_ipl')
            .select('*')
            .order('tanggal_mulai_berlaku', { ascending: false });

        // Apply filters if any
        if (filters.aktif !== undefined) {
            query = query.eq('aktif', filters.aktif);
        }

        const { data, error } = await query;

        if (error) throw error;

        tarifIplData = data || [];

        if (refreshUI) {
            // This will be imported and called from the table module
            if (typeof displayTarifIplTable === 'function') {
                displayTarifIplTable(tarifIplData);
            }
        }

        return { success: true, data: tarifIplData };
    } catch (error) {
        console.error('Error loading tarif IPL:', error);
        showToast('Error loading data', 'danger');

        if (refreshUI) {
            const tableElement = document.getElementById('tarif_ipl-table');
            if (tableElement) {
                tableElement.innerHTML = '<p>Error loading data</p>';
            }
        }

        return { success: false, message: error.message };
    }
}

// CRUD Operations
async function addTarifIpl(formData) {
    try {
        // If this tarif is set to active, deactivate all other active tariffs of the same type
        if (formData.aktif === true) {
            await supabase
                .from('tarif_ipl')
                .update({ aktif: false })
                .eq('type_tarif', formData.type_tarif)
                .eq('aktif', true); // Deactivate all currently active tariffs of the same type
        }

        const result = await createRecord('tarif_ipl', formData, 'Tarif IPL');
        return result;
    } catch (error) {
        console.error('Error adding tarif IPL:', error);
        return { success: false, message: error.message };
    }
}

async function updateTarifIpl(id, formData) {
    try {
        // If this tarif is being set to active, deactivate all other active tariffs of the same type
        if (formData.aktif === true) {
            await supabase
                .from('tarif_ipl')
                .update({ aktif: false })
                .eq('type_tarif', formData.type_tarif)
                .neq('id', id);
        }

        const result = await updateRecord('tarif_ipl', id, formData, 'Tarif IPL');
        return result;
    } catch (error) {
        console.error('Error updating tarif IPL:', error);
        return { success: false, message: error.message };
    }
}

async function deleteTarifIpl(id) {
    return await deleteRecord('tarif_ipl', id, 'Tarif IPL');
}

async function confirmDeleteTarifIpl(id) {
    // This will be implemented in the form module with UI confirmation
    if (typeof showConfirm === 'function') {
        const confirmed = await showConfirm('Apakah Anda yakin ingin menghapus tarif IPL ini?');
        if (confirmed) {
            const result = await deleteTarifIpl(id);
            if (result.success) {
                await loadTarifIpl();
            }
        }
    }
}

// Get active tariff
async function getActiveTarifIpl() {
    try {
        const { data, error } = await supabase
            .from('tarif_ipl')
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
async function getTarifIplForDate(date) {
    try {
        const { data, error } = await supabase
            .from('tarif_ipl')
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
function getTarifIplData() {
    return tarifIplData;
}

function getTarifIplState() {
    return {
        tarifIplData,
        tarifIplCurrentPage,
        tarifIplItemsPerPage
    };
}

function setTarifIplState(state) {
    tarifIplData = state.tarifIplData || tarifIplData;
    tarifIplCurrentPage = state.tarifIplCurrentPage || tarifIplCurrentPage;
    tarifIplItemsPerPage = state.tarifIplItemsPerPage || tarifIplItemsPerPage;
}

export {
    loadTarifIpl,
    addTarifIpl,
    updateTarifIpl,
    deleteTarifIpl,
    confirmDeleteTarifIpl,
    getActiveTarifIpl,
    getTarifIplForDate,
    getTarifIplData,
    getTarifIplState,
    setTarifIplState
};

// Import UI-related functions dynamically
let displayTarifIplTable;
let showConfirm;

import('./tarif_ipl-table.js').then(tableModule => {
    displayTarifIplTable = tableModule.displayTarifIplTable;
}).catch(console.error);

import('../../utils.js').then(utils => {
    showConfirm = utils.showConfirm;
}).catch(() => {
    showConfirm = () => Promise.resolve(true);
});
