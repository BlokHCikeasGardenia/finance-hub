// Generic CRUD functions and templates for Keuangan RT Modern
// Contains reusable CRUD operations and error handling patterns

import { supabase } from './config.js';
import { showToast } from './utils.js';

// Generic CRUD error handler
function handleCrudError(operation, error, entityName = '') {
    console.error(`${operation} error (${entityName}):`, error);
    const message = error.message || `Gagal ${operation.toLowerCase()} ${entityName}`;
    showToast(`Error: ${message}`, 'danger');
    return { success: false, message };
}

// Generic CREATE operation
async function createRecord(tableName, data, entityName = '') {
    try {
        const { data: result, error } = await supabase
            .from(tableName)
            .insert([data])
            .select();

        if (error) throw error;

        showToast(`${entityName || 'Data'} berhasil ditambahkan`, 'success');
        return { success: true, data: result };
    } catch (error) {
        return handleCrudError('CREATE', error, entityName);
    }
}

// Generic READ operation with optional filters and joins
async function readRecords(tableName, options = {}) {
    try {
        let query = supabase.from(tableName).select(options.select || '*');

        // Apply filters
        if (options.filters) {
            Object.entries(options.filters).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    query = query.eq(key, value);
                }
            });
        }

        // Apply ordering
        if (options.orderBy) {
            // Parse orderBy string like 'column_name DESC' or just 'column_name'
            let columnName = options.orderBy;
            let ascending = options.ascending !== false;

            // Check if orderBy contains direction
            const descMatch = options.orderBy.match(/^(.+)\s+DESC$/i);
            if (descMatch) {
                columnName = descMatch[1];
                ascending = false;
            } else {
                const ascMatch = options.orderBy.match(/^(.+)\s+ASC$/i);
                if (ascMatch) {
                    columnName = ascMatch[1];
                    ascending = true;
                }
            }

            query = query.order(columnName, { ascending });
        }

        // Apply pagination
        if (options.limit) {
            query = query.limit(options.limit);
        }

        if (options.offset) {
            query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        return { success: true, data: data || [], count };
    } catch (error) {
        return handleCrudError('READ', error, tableName);
    }
}

// Generic UPDATE operation
async function updateRecord(tableName, id, data, entityName = '') {
    try {
        const { data: result, error } = await supabase
            .from(tableName)
            .update(data)
            .eq('id', id)
            .select();

        if (error) throw error;

        showToast(`${entityName || 'Data'} berhasil diperbarui`, 'success');
        return { success: true, data: result };
    } catch (error) {
        return handleCrudError('UPDATE', error, entityName);
    }
}

// Generic DELETE operation
async function deleteRecord(tableName, id, entityName = '') {
    try {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', id);

        if (error) throw error;

        showToast(`${entityName || 'Data'} berhasil dihapus`, 'success');
        return { success: true };
    } catch (error) {
        return handleCrudError('DELETE', error, entityName);
    }
}

// Generic batch delete operation
async function batchDeleteRecords(tableName, ids, entityName = '') {
    try {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .in('id', ids);

        if (error) throw error;

        showToast(`${ids.length} ${entityName || 'data'} berhasil dihapus`, 'success');
        return { success: true };
    } catch (error) {
        return handleCrudError('BATCH DELETE', error, entityName);
    }
}

// Generic search and filter helper
function applySearchFilter(data, searchTerm, searchFields) {
    if (!searchTerm || !searchFields || searchFields.length === 0) {
        return data;
    }

    const term = searchTerm.toLowerCase();
    return data.filter(item => {
        return searchFields.some(field => {
            const value = getNestedValue(item, field);
            return value && String(value).toLowerCase().includes(term);
        });
    });
}

// Generic sort helper
function applySorting(data, sortBy, direction = 'asc') {
    if (!sortBy) return data;

    // Helper to extract a comparable primitive value from possible nested objects
    function extractComparableValue(val) {
        if (val == null) return null;
        // Primitive values are returned as-is
        if (typeof val !== 'object') return val;

        // If it's an object, try to pick a likely human-readable property
        const candidateKeys = [
            'nama_kepala_keluarga', 'nama_pembayar', 'nama_kategori', 'jenis_rekening',
            'nomor_blok_rumah', 'nama_periode', 'nama', 'title', 'label'
        ];

        for (const k of candidateKeys) {
            if (val[k] !== undefined && val[k] !== null) return val[k];
        }

        // Fallback to string conversion
        try {
            const s = JSON.stringify(val);
            return s === '{}' ? String(val) : s;
        } catch (e) {
            return String(val);
        }
    }

    return [...data].sort((a, b) => {
        let aVal = extractComparableValue(getNestedValue(a, sortBy));
        let bVal = extractComparableValue(getNestedValue(b, sortBy));

        // (debug logging removed)

        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return direction === 'asc' ? 1 : -1;
        if (bVal == null) return direction === 'asc' ? -1 : 1;

        // If both values look like dates, compare as dates
        const aDate = (typeof aVal === 'string' || aVal instanceof Date) ? Date.parse(aVal) : NaN;
        const bDate = (typeof bVal === 'string' || bVal instanceof Date) ? Date.parse(bVal) : NaN;
        if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
            if (aDate < bDate) return direction === 'asc' ? -1 : 1;
            if (aDate > bDate) return direction === 'asc' ? 1 : -1;
            return 0;
        }

        // Compare strings using localeCompare when both are strings
        if (typeof aVal === 'string' && typeof bVal === 'string') {
            const comparison = aVal.localeCompare(bVal);
            return direction === 'asc' ? comparison : -comparison;
        }

        // Numeric comparison fallback
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

// Helper to get nested object values (e.g., 'user.name')
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
    }, obj);
}

// Generic pagination helper
function paginateData(data, currentPage, itemsPerPage) {
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedData = data.slice(startIndex, endIndex);

    return {
        data: paginatedData,
        pagination: {
            currentPage,
            totalPages,
            totalItems,
            itemsPerPage,
            startIndex,
            endIndex,
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1
        }
    };
}

// Generic table renderer template
function renderTableTemplate(data, columns, options = {}) {
    const {
        tableClass = 'table table-striped table-hover',
        showHeader = true,
        showActions = true,
        actions = [],
        emptyMessage = 'Tidak ada data'
    } = options;

    let html = `<div class="table-responsive">
        <table class="${tableClass}">`;

    // Header
    if (showHeader && columns.length > 0) {
        html += '<thead class="table-dark"><tr>';
        columns.forEach(col => {
            const sortableClass = col.sortable ? 'sortable' : '';
            const sortIcon = col.sortable ? ' <i class="bi bi-chevron-expand sort-icon"></i>' : '';
            const width = col.width ? ` style="width: ${col.width};"` : '';
            html += `<th${width} class="${sortableClass}" data-column="${col.key || ''}">${col.label}${sortIcon}</th>`;
        });
        if (showActions && actions.length > 0) {
            html += '<th style="width: 150px;">Aksi</th>';
        }
        html += '</tr></thead>';
    }

    // Body
    html += '<tbody>';
    if (data && data.length > 0) {
        data.forEach((item, index) => {
            html += '<tr>';
            columns.forEach(col => {
                const value = col.render ? col.render(item, index) : getNestedValue(item, col.key);
                const className = col.className || '';
                html += `<td class="${className}">${value || '-'}</td>`;
            });

            if (showActions && actions.length > 0) {
                html += '<td>';
                actions.forEach((action, actionIndex) => {
                    const btnClass = action.className || 'btn btn-sm btn-outline-primary me-2';
                    const icon = action.icon ? `<i class="bi bi-${action.icon}"></i> ` : '';
                    const onClick = action.onClick ? ` onclick="${action.onClick}('${item.id}')" ` : '';
                    html += `<button class="${btnClass}"${onClick} title="${action.title || action.label}">${icon}${action.label}</button>`;
                    if (actionIndex < actions.length - 1) html += ' ';
                });
                html += '</td>';
            }
            html += '</tr>';
        });
    } else {
        const colspan = columns.length + (showActions && actions.length > 0 ? 1 : 0);
        html += `<tr><td colspan="${colspan}" class="text-center text-muted">${emptyMessage}</td></tr>`;
    }
    html += '</tbody></table></div>';

    return html;
}

// Generic form data collector
function collectFormData(formId, fields) {
    const form = document.getElementById(formId);
    if (!form) {
        console.warn(`Form with id ${formId} not found`);
        return {};
    }

    const data = {};

    fields.forEach(field => {
        const element = form.querySelector(`[name="${field.name}"]`);
        if (!element) return;

        let value;

        switch (element.type) {
            case 'checkbox':
                value = element.checked;
                break;
            case 'number':
                value = element.value ? parseFloat(element.value) : null;
                break;
            case 'date':
            case 'text':
            case 'email':
            case 'password':
            case 'url':
            case 'textarea':
                value = element.value.trim() || null;
                break;
            case 'select-one':
                value = element.value || null;
                break;
            default:
                value = element.value ? element.value.trim() : null;
        }

        if (field.required && !value) {
            showToast(`${field.label} wajib diisi`, 'warning');
            throw new Error(`Required field ${field.name} is empty`);
        }

        if (value !== null) {
            data[field.name] = value;
        }
    });

    return data;
}

// Generic ID generator for transactions
function generateTransactionId(prefix, entity) {
    try {
        // This would typically call a database function
        // For now, we'll create a simple timestamp-based ID
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `${prefix}${timestamp}${random}`;
    } catch (error) {
        console.warn('Error generating transaction ID:', error);
        return `${prefix}${Date.now()}`;
    }
}

// Export all CRUD functions
export {
    // Core CRUD operations
    createRecord,
    readRecords,
    updateRecord,
    deleteRecord,
    batchDeleteRecords,

    // Utilities
    applySearchFilter,
    applySorting,
    paginateData,

    // Helpers
    getNestedValue,
    collectFormData,
    generateTransactionId,

    // UI helpers
    renderTableTemplate,

    // Error handling
    handleCrudError
};
