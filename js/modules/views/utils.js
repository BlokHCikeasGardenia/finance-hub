// Views Utilities Module
// Common utility functions used across all view modules

import { formatCurrency } from '../../utils.js';

// Helper function for pagination rendering - used across multiple views
function renderPagination(tableType, currentPage, totalPages) {
    if (totalPages <= 1) return '';

    let paginationHtml = '<nav><ul class="pagination pagination-sm mb-0 justify-content-center">';

    // Previous button
    paginationHtml += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changeIPLPage(${currentPage - 1})">Previous</a>
    </li>`;

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="changeIPLPage(1)">1</a></li>`;
        if (startPage > 2) {
            paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="changeIPLPage(${i})">${i}</a>
        </li>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
        paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="changeIPLPage(${totalPages})">${totalPages}</a></li>`;
    }

    // Next button
    paginationHtml += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changeIPLPage(${currentPage + 1})">Next</a>
    </li>`;

    paginationHtml += '</ul></nav>';
    return paginationHtml;
}

// Debounce utility for search inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Generate random transaction ID
function generateTransactionId() {
    return 'TRX' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
}

// Format date for display
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('id-ID');
}

// Calculate outstanding amounts (common calculation)
function calculateOutstandingAmount(totalPaid, totalOwed) {
    return Math.max(0, totalOwed - totalPaid);
}

// Common error handling for API calls
function handleApiError(error, context) {
    console.error(`Error in ${context}:`, error);
    showToast(`Error loading ${context} data`, 'error');
    return null;
}

// Validate numeric input
function validateNumericInput(value) {
    return !isNaN(value) && value >= 0;
}

// Parse formatted currency to number
function parseFormattedCurrency(currencyString) {
    return parseFloat(currencyString.replace(/[Rp,.\s]/g, ''));
}

// Export utilities
export {
    renderPagination,
    debounce,
    generateTransactionId,
    formatDate,
    calculateOutstandingAmount,
    handleApiError,
    validateNumericInput,
    parseFormattedCurrency
};
