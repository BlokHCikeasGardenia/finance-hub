// Utility functions for Keuangan RT Modern
// Contains toast notifications, confirm dialogs, number formatting, and common utilities

// Toast notification system - gets DOM elements dynamically
function showToast(message, type = 'info') {
    // Get DOM elements dynamically instead of importing
    const toastElement = document.getElementById('toast');
    const toastBody = document.getElementById('toast-body');

    if (!toastElement || !toastBody) {
        console.warn('Toast elements not found in DOM, message:', message);
        // Just log to console if toast isn't ready yet
        console.log(`[${type.toUpperCase()}] ${message}`);
        return;
    }

    // Set message
    toastBody.textContent = message;

    // Set color based on type
    const validTypes = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'];
    const toastType = validTypes.includes(type) ? type : 'info';

    toastElement.className = `toast align-items-center text-white border-0 bg-${toastType}`;

    // Show toast
    try {
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
    } catch (error) {
        console.warn('Bootstrap toast not available, using console:', message);
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// Custom confirmation dialog - gets DOM elements dynamically
function showConfirm(message) {
    // Get DOM elements dynamically
    const confirmModal = document.getElementById('confirmModal');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmYesBtn = document.getElementById('confirm-yes');

    if (!confirmModal || !confirmMessage || !confirmYesBtn) {
        console.warn('Confirm modal elements not found in DOM');
        return Promise.reject(new Error('Confirm modal not available'));
    }

    return new Promise((resolve) => {
        // Set message
        confirmMessage.textContent = message;

        let modalInstance;

        // Handle yes button
        const handleYes = () => {
            if (modalInstance) modalInstance.hide();
            resolve(true);
            cleanup();
        };

        // Handle modal hide (no/cancel)
        const handleHide = () => {
            resolve(false);
            cleanup();
        };

        const cleanup = () => {
            confirmYesBtn.removeEventListener('click', handleYes);
            if (confirmModal && confirmModal.removeEventListener) {
                confirmModal.removeEventListener('hidden.bs.modal', handleHide);
            }
        };

        confirmYesBtn.addEventListener('click', handleYes);

        try {
            modalInstance = new bootstrap.Modal(confirmModal);
            confirmModal.addEventListener('hidden.bs.modal', handleHide);
            modalInstance.show();
        } catch (error) {
            console.warn('Bootstrap modal not available, defaulting to false');
            resolve(false);
        }
    });
}

// Helper functions for number formatting
function formatNumberInput(value) {
    // Handle null, undefined, or non-string values
    if (value == null || typeof value !== 'string') {
        return '';
    }

    // Remove all non-digits
    let num = value.replace(/\D/g, '');
    // Add thousand separators
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseFormattedNumber(value) {
    // Remove thousand separators and return as number
    return parseFloat(value.replace(/\./g, '')) || 0;
}

// Format currency in Indonesian Rupiah
function formatCurrency(amount, showSymbol = true) {
    const formatted = new Intl.NumberFormat('id-ID').format(amount);
    return showSymbol ? formatted : formatted;
}

// Debounce function for search inputs
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

// Pagination rendering utility
function renderPagination(tableType, currentPage, totalPages) {
    if (totalPages <= 1) return '';

    let paginationHtml = '<nav><ul class="pagination pagination-sm mb-0">';

    // Previous button
    paginationHtml += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changePage('${tableType}', ${currentPage - 1})">Previous</a>
    </li>`;

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="changePage('${tableType}', 1)">1</a></li>`;
        if (startPage > 2) {
            paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="changePage('${tableType}', ${i})">${i}</a>
        </li>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
        paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="changePage('${tableType}', ${totalPages})">${totalPages}</a></li>`;
    }

    // Next button
    paginationHtml += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changePage('${tableType}', ${currentPage + 1})">Next</a>
    </li>`;

    paginationHtml += '</ul></nav>';
    return paginationHtml;
}

// Date utilities
function formatDate(date, locale = 'id-ID') {
    if (!date) return '-';

    try {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return '-';

        return dateObj.toLocaleDateString(locale);
    } catch (error) {
        console.warn('Error formatting date:', error);
        return '-';
    }
}

function formatDateTime(date, locale = 'id-ID') {
    if (!date) return '-';

    try {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return '-';

        return dateObj.toLocaleString(locale);
    } catch (error) {
        console.warn('Error formatting datetime:', error);
        return '-';
    }
}

// Object utilities
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));

    const cloned = {};
    Object.keys(obj).forEach(key => {
        cloned[key] = deepClone(obj[key]);
    });

    return cloned;
}

// Generate unique ID
function generateUniqueId(prefix = 'id') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}_${timestamp}${random}`;
}

// Export all utility functions
export {
    showToast,
    showConfirm,
    formatNumberInput,
    parseFormattedNumber,
    formatCurrency,
    debounce,
    renderPagination,
    formatDate,
    formatDateTime,
    deepClone,
    generateUniqueId
};
