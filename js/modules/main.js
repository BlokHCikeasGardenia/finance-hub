// Main module loader and initialization
// This file sets up global variables and initializes the application

import {
    supabase,
    currentUser,
    APP_CONFIG,
    loadPaginationSettings
} from './config.js';

// Global data storage (replacing the variables from app_old.js)
let penghuniData = [];
let hunianData = [];
let iplViewDataGlobal = [];

// Pagination state
let penghuniCurrentPage = 1;
let penghuniItemsPerPage = APP_CONFIG.DEFAULT_ITEMS_PER_PAGE;
let hunianCurrentPage = 1;
let hunianItemsPerPage = APP_CONFIG.DEFAULT_ITEMS_PER_PAGE;
let iplCurrentPage = 1;
let iplItemsPerPage = APP_CONFIG.DEFAULT_ITEMS_PER_PAGE;

// DOM element references
let toastElement, toastBody, confirmModal, confirmMessage, confirmYesBtn;

// Initialize DOM elements when DOM is ready
function initializeDomElements() {
    toastElement = document.getElementById('toast');
    toastBody = document.getElementById('toast-body');
    confirmModal = document.getElementById('confirmModal');
    confirmMessage = document.getElementById('confirm-message');
    confirmYesBtn = document.getElementById('confirm-yes');

    // Export these to config module
    window.toastElement = toastElement;
    window.toastBody = toastBody;
    window.confirmModal = confirmModal;
    window.confirmMessage = confirmMessage;
    window.confirmYesBtn = confirmYesBtn;
}

// Load pagination settings from localStorage
function initializePaginationSettings() {
    loadPaginationSettings();

    // Update from loaded settings
    penghuniItemsPerPage = loadItemsPerPage('penghuni');
    hunianItemsPerPage = loadItemsPerPage('hunian');
    iplItemsPerPage = loadItemsPerPage('ipl');
}

// Utility function for saving items per page preference
function saveItemsPerPage(tableType, itemsPerPage) {
    localStorage.setItem(`${tableType}ItemsPerPage`, itemsPerPage);
}

// Utility function for loading items per page from localStorage
function loadItemsPerPage(tableType) {
    return parseInt(localStorage.getItem(`${tableType}ItemsPerPage`)) || APP_CONFIG.DEFAULT_ITEMS_PER_PAGE;
}

// Update items per page and refresh table
function updateItemsPerPage(tableType, newItemsPerPage) {
    if (tableType === 'penghuni') {
        penghuniItemsPerPage = newItemsPerPage;
        penghuniCurrentPage = 1;
        saveItemsPerPage('penghuni', newItemsPerPage);
    } else if (tableType === 'hunian') {
        hunianItemsPerPage = newItemsPerPage;
        hunianCurrentPage = 1;
        saveItemsPerPage('hunian', newItemsPerPage);
    } else if (tableType === 'ipl') {
        iplItemsPerPage = newItemsPerPage;
        iplCurrentPage = 1;
        saveItemsPerPage('ipl', newItemsPerPage);
    }
}

// Export global state and utility functions
export {
    // Data storage
    penghuniData,
    hunianData,
    iplViewDataGlobal,

    // Pagination state
    penghuniCurrentPage,
    penghuniItemsPerPage,
    hunianCurrentPage,
    hunianItemsPerPage,
    iplCurrentPage,
    iplItemsPerPage,

    // Current user
    currentUser,

    // Supabase instance
    supabase,

    // Initialization functions
    initializeDomElements,
    initializePaginationSettings,

    // Utility functions
    saveItemsPerPage,
    loadItemsPerPage,
    updateItemsPerPage
};
