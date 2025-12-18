// Penghuni data operations module
// Handles data loading, CRUD operations, and state management

import { supabase } from '../../config.js';
import { showToast } from '../../utils.js';

// Global state for penghuni
let penghuniData = [];
let penghuniCurrentPage = 1;
let penghuniItemsPerPage = parseInt(localStorage.getItem('penghuniItemsPerPage')) || 10;
let penghuniSortBy = '';
let penghuniSortOrder = 'asc';

// Load penghuni data
async function loadPenghuni(refreshUI = true) {
    try {
        const { data, error } = await supabase
            .from('penghuni')
            .select('*')
            .order('nama_kepala_keluarga');

        if (error) throw error;

        // Store data globally for search/filter operations
        penghuniData = data || [];

        // Note: Table rendering is now handled at coordinator level (penghuni.js or section-loader.js)
        // to avoid timing/dependency issues with module loading

        return { success: true, data: penghuniData };
    } catch (error) {
        console.error('Error loading penghuni:', error);

        if (refreshUI) {
            const tableElement = document.getElementById('penghuni-table');
            if (tableElement) {
                tableElement.innerHTML = '<p class="text-danger">Error loading data</p>';
            }
        }

        return { success: false, error: error.message };
    }
}

// CRUD Operations

// Add new penghuni
async function addPenghuni(formData) {
    return await performPenghuniOperation('insert', formData);
}

// Update penghuni
async function updatePenghuni(id, formData) {
    return await performPenghuniOperation('update', formData, id);
}

// Delete penghuni
async function deletePenghuni(id) {
    return await performPenghuniOperation('delete', null, id);
}

// Perform penghuni database operation
async function performPenghuniOperation(operation, formData = null, id = null) {
    try {
        let query = supabase.from('penghuni');

        switch (operation) {
            case 'insert':
                const { data: insertData, error: insertError } = await query
                    .insert([formData])
                    .select();
                if (insertError) throw insertError;
                return { success: true, data: insertData };

            case 'update':
                const { data: updateData, error: updateError } = await query
                    .update(formData)
                    .eq('id', id)
                    .select();
                if (updateError) throw updateError;
                return { success: true, data: updateData };

            case 'delete':
                const { error: deleteError } = await query.delete().eq('id', id);
                if (deleteError) throw deleteError;
                return { success: true };
        }
    } catch (error) {
        console.error(`Error ${operation}ing penghuni:`, error);
        return { success: false, error: error.message };
    }
}

// Confirm delete penghuni
async function confirmDeletePenghuni(id) {
    // This will be handled by the form module with UI confirmation
    if (typeof showConfirm === 'function') {
        const confirmed = await showConfirm('Apakah Anda yakin ingin menghapus penghuni ini?\n\nPeringatan: Menghapus penghuni yang masih memiliki data rumah atau transaksi dapat menyebabkan inkonsistensi data.');
        if (confirmed) {
            const result = await deletePenghuni(id);
            if (result.success) {
                await loadPenghuni(); // Reload the table
                showToast('Penghuni berhasil dihapus', 'success');
            } else {
                showToast('Error deleting: ' + result.error, 'danger');
            }
        }
    }
}

// Data utilities

// Get penghuni data for selects
async function getPenghuniOptions() {
    try {
        const { data, error } = await supabase
            .from('penghuni')
            .select('id, nama_kepala_keluarga')
            .order('nama_kepala_keluarga');

        if (error) throw error;

        return data ? data.map(item => ({
            value: item.id,
            text: item.nama_kepala_keluarga
        })) : [];
    } catch (error) {
        console.error('Error getting penghuni data:', error);
        return [];
    }
}

// Get penghuni air data for selects
async function getPenghuniAirData() {
    try {
        const { data, error } = await supabase
            .from('penghuni')
            .select('id, nama_kepala_keluarga')
            .eq('pelanggan_air', true)
            .order('nama_kepala_keluarga');

        if (error) throw error;

        return data ? data.map(item => ({
            value: item.id,
            text: item.nama_kepala_keluarga
        })) : [];
    } catch (error) {
        console.error('Error getting penghuni air data:', error);
        return [];
    }
}

// State management getters and setters
function getPenghuniData() {
    return penghuniData;
}

function getPenghuniState() {
    return {
        penghuniData,
        penghuniCurrentPage,
        penghuniItemsPerPage,
        penghuniSortBy,
        penghuniSortOrder
    };
}

function setPenghuniState(state) {
    penghuniData = state.penghuniData || penghuniData;
    penghuniCurrentPage = state.penghuniCurrentPage || penghuniCurrentPage;
    penghuniItemsPerPage = state.penghuniItemsPerPage || penghuniItemsPerPage;
    penghuniSortBy = state.penghuniSortBy !== undefined ? state.penghuniSortBy : penghuniSortBy;
    penghuniSortOrder = state.penghuniSortOrder || penghuniSortOrder;
}

export {
    loadPenghuni,
    addPenghuni,
    updatePenghuni,
    deletePenghuni,
    confirmDeletePenghuni,
    getPenghuniOptions,
    getPenghuniData,
    getPenghuniAirData,
    getPenghuniState,
    setPenghuniState
};

// Note: UI-related functions like renderPenghuniTable and showConfirm will be imported from other modules
