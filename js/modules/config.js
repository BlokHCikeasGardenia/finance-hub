// Configuration file for Keuangan RT Modern
// Contains all global constants and configuration

// Supabase configuration
const SUPABASE_URL = 'https://dguvoyckadxkzokbvckr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndXZveWNrYWR4a3pva2J2Y2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1ODQ3MDAsImV4cCI6MjA4MDE2MDcwMH0.6EenvfOnmUNcYwZ9NKtTA8X6GEfGTrGALVkiHAn5UPM';

// Initialize Supabase client
let supabase;
if (typeof window !== 'undefined' && window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// App constants
const APP_CONFIG = {
    VERSION: '2.0.0',
    TITLE: 'Sistem Informasi Keuangan Blok H Cikeas Gardenia',
    ITEMS_PER_PAGE_OPTIONS: [5, 10, 25, 50, 100],
    DEFAULT_ITEMS_PER_PAGE: 10
};

// Pagination variables with localStorage persistence
let paginationDefaults = {
    penghuni: APP_CONFIG.DEFAULT_ITEMS_PER_PAGE,
    hunian: APP_CONFIG.DEFAULT_ITEMS_PER_PAGE,
    ipl: APP_CONFIG.DEFAULT_ITEMS_PER_PAGE
};

// Load pagination preferences from localStorage
function loadPaginationSettings() {
    try {
        const penghuniItems = localStorage.getItem('penghuniItemsPerPage');
        const hunianItems = localStorage.getItem('hunianItemsPerPage');
        const iplItems = localStorage.getItem('iplItemsPerPage');

        if (penghuniItems) paginationDefaults.penghuni = parseInt(penghuniItems);
        if (hunianItems) paginationDefaults.hunian = parseInt(hunianItems);
        if (iplItems) paginationDefaults.ipl = parseInt(iplItems);
    } catch (error) {
        console.warn('Error loading pagination settings:', error);
    }
}

// Global variables for data storage (initialized in main.js)
let currentUser = null;

// Toast and modal element references
let toastElement, toastBody, confirmModal, confirmMessage, confirmYesBtn;

export {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    supabase,
    APP_CONFIG,
    paginationDefaults,
    currentUser,
    loadPaginationSettings,
    // Element references (will be set in main.js)
    toastElement,
    toastBody,
    confirmModal,
    confirmMessage,
    confirmYesBtn
};
