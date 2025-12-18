// Excel Report Templates Module
// Contains functions to generate Excel reports using SheetJS (xlsx)

import { formatCurrency } from '../../../utils.js';

// Global XLSX instance
let XLSX = null;

// Initialize XLSX library
function initXLSX() {
    if (!XLSX) {
        XLSX = window.XLSX;
    }
}

// ============================
// UTILITY FUNCTIONS
// ============================

/**
 * Create workbook with standard formatting
 * @returns {Object} XLSX workbook
 */
function createWorkbook() {
    initXLSX();
    const wb = XLSX.utils.book_new();

    // Add metadata
    wb.Props = {
        Title: 'Laporan Keuangan RT',
        Subject: 'Generated Report',
        Author: 'Sistem Informasi Blok H',
        CreatedDate: new Date()
    };

    return wb;
}

/**
 * Add header row to worksheet
 * @param {Array} ws_data - Worksheet data array
 * @param {Array} headers - Header array
 * @param {number} startRow - Starting row index
 * @returns {number} Next row index
 */
function addHeaderRow(ws_data, headers, startRow = 0) {
    // Title row
    ws_data[startRow] = [
        { v: 'SISTEM INFORMASI KEUANGAN', t: 's', s: { font: { bold: true, sz: 16 }, alignment: { horizontal: 'center' } } }
    ];
    ws_data[startRow + 1] = [
        { v: 'BLOK H CIKEAS GARDENIA', t: 's', s: { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } } }
    ];

    // Empty row
    ws_data[startRow + 2] = [];

    return startRow + 3;
}

/**
 * Format currency cell
 * @param {number} value - Numeric value
 * @returns {Object} Formatted cell object
 */
function formatCurrencyCell(value) {
    return {
        v: value,
        t: 'n',
        s: {
            numFmt: '"Rp" #,##0',
            alignment: { horizontal: 'right' }
        }
    };
}

/**
 * Format header cell
 * @param {string} text - Header text
 * @returns {Object} Formatted cell object
 */
function formatHeaderCell(text) {
    return {
        v: text,
        t: 's',
        s: {
            font: { bold: true },
            fill: { fgColor: { rgb: 'FFD3D3D3' } },
            alignment: { horizontal: 'center' }
        }
    };
}

// ============================
// REKAP SALDO REPORT
// ============================

/**
 * Generate Excel for Rekap Saldo report
 * @param {Object} data - Report data
 * @param {string} dateRange - Date range string
 */
export function generateRekapSaldoExcel(data, dateRange) {
    const wb = createWorkbook();
    const ws_data = [];
    let rowIndex = 0;

    // Header
    rowIndex = addHeaderRow(ws_data, [], rowIndex);
    ws_data[rowIndex++] = [{ v: 'REKAP SALDO PER KATEGORI', t: 's', s: { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } } }];
    ws_data[rowIndex++] = [{ v: `Periode: ${dateRange}`, t: 's', s: { alignment: { horizontal: 'center' } } }];
    ws_data[rowIndex++] = []; // Empty row

    // Summary section
    ws_data[rowIndex++] = [formatHeaderCell('RINGKASAN KESELURUHAN')];
    ws_data[rowIndex++] = [{ v: 'Total Saldo Awal:', t: 's', s: { font: { bold: true } } }, formatCurrencyCell(data.totalSaldoAwal)];
    ws_data[rowIndex++] = [{ v: 'Total Pemasukan:', t: 's', s: { font: { bold: true } } }, formatCurrencyCell(data.totalPemasukan)];
    ws_data[rowIndex++] = [{ v: 'Total Pengeluaran:', t: 's', s: { font: { bold: true } } }, formatCurrencyCell(data.totalPengeluaran)];
    ws_data[rowIndex++] = [{ v: 'Total Saldo Akhir:', t: 's', s: { font: { bold: true } } }, formatCurrencyCell(data.totalSaldoAkhir)];
    ws_data[rowIndex++] = []; // Empty row

    // Category breakdown table
    ws_data[rowIndex++] = [formatHeaderCell('DETAIL PER KATEGORI')];
    ws_data[rowIndex++] = [
        formatHeaderCell('Kategori'),
        formatHeaderCell('Saldo Awal'),
        formatHeaderCell('Pemasukan'),
        formatHeaderCell('Pengeluaran'),
        formatHeaderCell('Saldo Akhir')
    ];

    data.categories.forEach(category => {
        ws_data[rowIndex++] = [
            { v: category.nama_kategori, t: 's' },
            formatCurrencyCell(category.saldo_awal),
            formatCurrencyCell(category.pemasukan),
            formatCurrencyCell(category.pengeluaran),
            formatCurrencyCell(category.saldo_akhir)
        ];
    });

    // IPL data if exists
    if (data.iplData && data.iplData.length > 0) {
        ws_data[rowIndex++] = []; // Empty row
        ws_data[rowIndex++] = [formatHeaderCell('DATA PEMBAYARAN IPL')];
        ws_data[rowIndex++] = [
            formatHeaderCell('Tanggal'),
            formatHeaderCell('No. Rumah'),
            formatHeaderCell('Penghuni'),
            formatHeaderCell('Nominal')
        ];

        data.iplData.forEach(item => {
            ws_data[rowIndex++] = [
                { v: new Date(item.tanggal).toLocaleDateString('id-ID'), t: 's' },
                { v: item.hunian?.nomor_blok_rumah || '-', t: 's' },
                { v: item.hunian?.penghuni_saat_ini?.nama_kepala_keluarga || '-', t: 's' },
                formatCurrencyCell(item.nominal)
            ];
        });
    }

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Saldo');

    // Set column widths
    ws['!cols'] = [
        { width: 20 }, // A
        { width: 15 }, // B
        { width: 15 }, // C
        { width: 15 }, // D
        { width: 15 }  // E
    ];

    // Download file
    const fileName = `Rekap_Saldo_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

// ============================
// PEMASUKAN REPORTS
// ============================

/**
 * Generate Excel for Rincian Pemasukan Global
 * @param {Array} data - Transaction data
 * @param {string} dateRange - Date range string
 */
export function generateRincianPemasukanGlobalExcel(data, dateRange) {
    const wb = createWorkbook();
    const ws_data = [];
    let rowIndex = 0;

    // Header
    rowIndex = addHeaderRow(ws_data, [], rowIndex);
    ws_data[rowIndex++] = [{ v: 'RINCIAN PEMASUKAN GLOBAL', t: 's', s: { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } } }];
    ws_data[rowIndex++] = [{ v: `Periode: ${dateRange}`, t: 's', s: { alignment: { horizontal: 'center' } } }];
    ws_data[rowIndex++] = []; // Empty row

    if (!data || data.length === 0) {
        ws_data[rowIndex++] = [{ v: 'Tidak ada data pemasukan dalam periode ini.', t: 's' }];
    } else {
        // Summary
        const totalNominal = data.reduce((sum, item) => sum + (item.nominal || 0), 0);
        ws_data[rowIndex++] = [{ v: 'Total Transaksi:', t: 's', s: { font: { bold: true } } }, { v: data.length, t: 'n' }];
        ws_data[rowIndex++] = [{ v: 'Total Nominal:', t: 's', s: { font: { bold: true } } }, formatCurrencyCell(totalNominal)];
        ws_data[rowIndex++] = []; // Empty row

        // Table headers
        ws_data[rowIndex++] = [
            formatHeaderCell('Tanggal'),
            formatHeaderCell('ID Transaksi'),
            formatHeaderCell('Dari'),
            formatHeaderCell('Kategori'),
            formatHeaderCell('Rekening'),
            formatHeaderCell('Nominal'),
            formatHeaderCell('Keterangan')
        ];

        // Table data
        data.forEach(item => {
            ws_data[rowIndex++] = [
                { v: new Date(item.tanggal).toLocaleDateString('id-ID'), t: 's' },
                { v: item.id_transaksi || '-', t: 's' },
                { v: item.penghuni?.nama_kepala_keluarga || item.hunian?.nomor_blok_rumah || 'External', t: 's' },
                { v: item.kategori?.nama_kategori || '-', t: 's' },
                { v: item.rekening?.jenis_rekening || '-', t: 's' },
                formatCurrencyCell(item.nominal),
                { v: item.keterangan || '-', t: 's' }
            ];
        });
    }

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'Pemasukan Global');

    // Set column widths
    ws['!cols'] = [
        { width: 12 }, // A - Tanggal
        { width: 20 }, // B - ID Transaksi
        { width: 25 }, // C - Dari
        { width: 15 }, // D - Kategori
        { width: 15 }, // E - Rekening
        { width: 15 }, // F - Nominal
        { width: 30 }  // G - Keterangan
    ];

    // Download file
    const fileName = `Rincian_Pemasukan_Global_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

/**
 * Generate Excel for Rincian Pemasukan per Kategori
 * @param {Object} data - Grouped transaction data
 * @param {string} dateRange - Date range string
 */
export function generateRincianPemasukanPerKategoriExcel(data, dateRange) {
    const wb = createWorkbook();

    if (!data.grouped || data.grouped.length === 0) {
        const ws_data = [];
        let rowIndex = 0;
        rowIndex = addHeaderRow(ws_data, [], rowIndex);
        ws_data[rowIndex++] = [{ v: 'RINCIAN PEMASUKAN PER KATEGORI', t: 's', s: { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } } }];
        ws_data[rowIndex++] = [{ v: `Periode: ${dateRange}`, t: 's', s: { alignment: { horizontal: 'center' } } }];
        ws_data[rowIndex++] = [{ v: 'Tidak ada data pemasukan dalam periode ini.', t: 's' }];

        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        XLSX.utils.book_append_sheet(wb, ws, 'Pemasukan per Kategori');
    } else {
        // Overall summary sheet
        const summaryData = [];
        let summaryRow = 0;
        summaryRow = addHeaderRow(summaryData, [], summaryRow);
        summaryData[summaryRow++] = [{ v: 'RINCIAN PEMASUKAN PER KATEGORI - RINGKASAN', t: 's', s: { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } } }];
        summaryData[summaryRow++] = [{ v: `Periode: ${dateRange}`, t: 's', s: { alignment: { horizontal: 'center' } } }];
        summaryData[summaryRow++] = []; // Empty row

        summaryData[summaryRow++] = [
            formatHeaderCell('Kategori'),
            formatHeaderCell('Jumlah Transaksi'),
            formatHeaderCell('Total Nominal')
        ];

        data.grouped.forEach(category => {
            summaryData[summaryRow++] = [
                { v: category.nama_kategori, t: 's' },
                { v: category.transactions.length, t: 'n' },
                formatCurrencyCell(category.total_nominal)
            ];
        });

        summaryData[summaryRow++] = [
            { v: 'TOTAL', t: 's', s: { font: { bold: true } } },
            { v: data.transaction_count, t: 'n', s: { font: { bold: true } } },
            formatCurrencyCell(data.total_nominal)
        ];

        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        summaryWs['!cols'] = [
            { width: 25 }, // Kategori
            { width: 15 }, // Jumlah
            { width: 20 }  // Total
        ];
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Ringkasan');

        // Individual category sheets
        data.grouped.forEach(category => {
            const ws_data = [];
            let rowIndex = 0;

            // Category header
            rowIndex = addHeaderRow(ws_data, [], rowIndex);
            ws_data[rowIndex++] = [{ v: `KATEGORI: ${category.nama_kategori}`, t: 's', s: { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } } }];
            ws_data[rowIndex++] = [{ v: `Periode: ${dateRange}`, t: 's', s: { alignment: { horizontal: 'center' } } }];
            ws_data[rowIndex++] = [{ v: `Total: ${formatCurrency(category.total_nominal)} (${category.transactions.length} transaksi)`, t: 's' }];
            ws_data[rowIndex++] = []; // Empty row

            // Table headers
            ws_data[rowIndex++] = [
                formatHeaderCell('Tanggal'),
                formatHeaderCell('ID Transaksi'),
                formatHeaderCell('Dari'),
                formatHeaderCell('Rekening'),
                formatHeaderCell('Nominal'),
                formatHeaderCell('Keterangan')
            ];

            // Table data
            category.transactions.forEach(transaction => {
                ws_data[rowIndex++] = [
                    { v: new Date(transaction.tanggal).toLocaleDateString('id-ID'), t: 's' },
                    { v: transaction.id_transaksi || '-', t: 's' },
                    { v: transaction.penghuni?.nama_kepala_keluarga || transaction.hunian?.nomor_blok_rumah || 'External', t: 's' },
                    { v: transaction.rekening?.jenis_rekening || '-', t: 's' },
                    formatCurrencyCell(transaction.nominal),
                    { v: transaction.keterangan || '-', t: 's' }
                ];
            });

            const ws = XLSX.utils.aoa_to_sheet(ws_data);
            ws['!cols'] = [
                { width: 12 }, // Tanggal
                { width: 20 }, // ID Transaksi
                { width: 25 }, // Dari
                { width: 15 }, // Rekening
                { width: 15 }, // Nominal
                { width: 30 }  // Keterangan
            ];

            // Safe sheet name (remove special characters)
            const safeSheetName = category.nama_kategori.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 31);
            XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
        });
    }

    // Download file
    const fileName = `Rincian_Pemasukan_Kategori_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

// ============================
// PENGELUARAN REPORTS
// ============================

/**
 * Generate Excel for Rincian Pengeluaran Global
 * @param {Array} data - Transaction data
 * @param {string} dateRange - Date range string
 */
export function generateRincianPengeluaranGlobalExcel(data, dateRange) {
    const wb = createWorkbook();
    const ws_data = [];
    let rowIndex = 0;

    // Header
    rowIndex = addHeaderRow(ws_data, [], rowIndex);
    ws_data[rowIndex++] = [{ v: 'RINCIAN PENGELUARAN GLOBAL', t: 's', s: { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } } }];
    ws_data[rowIndex++] = [{ v: `Periode: ${dateRange}`, t: 's', s: { alignment: { horizontal: 'center' } } }];
    ws_data[rowIndex++] = []; // Empty row

    if (!data || data.length === 0) {
        ws_data[rowIndex++] = [{ v: 'Tidak ada data pengeluaran dalam periode ini.', t: 's' }];
    } else {
        // Summary
        const totalNominal = data.reduce((sum, item) => sum + (item.nominal || 0), 0);
        ws_data[rowIndex++] = [{ v: 'Total Transaksi:', t: 's', s: { font: { bold: true } } }, { v: data.length, t: 'n' }];
        ws_data[rowIndex++] = [{ v: 'Total Nominal:', t: 's', s: { font: { bold: true } } }, formatCurrencyCell(totalNominal)];
        ws_data[rowIndex++] = []; // Empty row

        // Table headers
        ws_data[rowIndex++] = [
            formatHeaderCell('Tanggal'),
            formatHeaderCell('ID Transaksi'),
            formatHeaderCell('Penerima'),
            formatHeaderCell('Kategori'),
            formatHeaderCell('Subkategori'),
            formatHeaderCell('Rekening'),
            formatHeaderCell('Nominal'),
            formatHeaderCell('Keterangan')
        ];

        // Table data
        data.forEach(item => {
            ws_data[rowIndex++] = [
                { v: new Date(item.tanggal).toLocaleDateString('id-ID'), t: 's' },
                { v: item.id_transaksi || '-', t: 's' },
                { v: item.penerima || '-', t: 's' },
                { v: item.kategori?.nama_kategori || '-', t: 's' },
                { v: item.subkategori?.nama_subkategori || '-', t: 's' },
                { v: item.rekening?.jenis_rekening || '-', t: 's' },
                formatCurrencyCell(item.nominal),
                { v: item.keterangan || '-', t: 's' }
            ];
        });
    }

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'Pengeluaran Global');

    // Set column widths
    ws['!cols'] = [
        { width: 12 }, // Tanggal
        { width: 20 }, // ID Transaksi
        { width: 20 }, // Penerima
        { width: 15 }, // Kategori
        { width: 20 }, // Subkategori
        { width: 15 }, // Rekening
        { width: 15 }, // Nominal
        { width: 30 }  // Keterangan
    ];

    // Download file
    const fileName = `Rincian_Pengeluaran_Global_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

// ============================
// PROFIT & LOSS REPORT
// ============================

/**
 * Generate Excel for Laporan Laba Rugi
 * @param {Object} data - P&L data
 */
export function generateLaporanLabaRugiExcel(data) {
    const wb = createWorkbook();
    const ws_data = [];
    let rowIndex = 0;

    // Header
    rowIndex = addHeaderRow(ws_data, [], rowIndex);
    ws_data[rowIndex++] = [{ v: 'LAPORAN LABA RUGI (INCOME STATEMENT)', t: 's', s: { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } } }];
    const dateRange = new Date(data.periode.startDate).toLocaleDateString('id-ID') + ' - ' + new Date(data.periode.endDate).toLocaleDateString('id-ID');
    ws_data[rowIndex++] = [{ v: 'Periode: ' + dateRange, t: 's', s: { alignment: { horizontal: 'center' } } }];
    ws_data[rowIndex++] = []; // Empty row

    // Income section
    ws_data[rowIndex++] = [formatHeaderCell('PEMASUKAN (REVENUE)')];
    for (let kategori in data.pemasukan.by_kategori) {
        if (data.pemasukan.by_kategori.hasOwnProperty(kategori)) {
            ws_data[rowIndex++] = [
                { v: kategori, t: 's' },
                formatCurrencyCell(data.pemasukan.by_kategori[kategori])
            ];
        }
    }
    ws_data[rowIndex++] = [
        { v: 'TOTAL PEMASUKAN', t: 's', s: { font: { bold: true } } },
        formatCurrencyCell(data.pemasukan.total)
    ];
    ws_data[rowIndex++] = []; // Empty row

    // Expense section
    ws_data[rowIndex++] = [formatHeaderCell('PENGELUARAN (EXPENSES)')];
    for (let kategori in data.pengeluaran.by_kategori) {
        if (data.pengeluaran.by_kategori.hasOwnProperty(kategori)) {
            ws_data[rowIndex++] = [
                { v: kategori, t: 's' },
                formatCurrencyCell(data.pengeluaran.by_kategori[kategori])
            ];
        }
    }
    ws_data[rowIndex++] = [
        { v: 'TOTAL PENGELUARAN', t: 's', s: { font: { bold: true } } },
        formatCurrencyCell(data.pengeluaran.total)
    ];
    ws_data[rowIndex++] = []; // Empty row

    // Net result
    const isProfit = data.laba_rugi >= 0;
    ws_data[rowIndex++] = [
        { v: (isProfit ? 'LABA' : 'RUGI') + ' BERSIH', t: 's', s: { font: { bold: true }, color: { rgb: isProfit ? '009900' : 'FF0000' } } },
        formatCurrencyCell(Math.abs(data.laba_rugi))
    ];
    ws_data[rowIndex++] = [
        { v: 'Status: ' + data.status, t: 's', s: { font: { italic: true } } }
    ];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'Laba Rugi');

    // Set column widths
    ws['!cols'] = [
        { width: 25 }, // Description
        { width: 20 }  // Amount
    ];

    // Download file
    const fileName = 'Laporan_Laba_Rugi_' + new Date().toISOString().split('T')[0] + '.xlsx';
    XLSX.writeFile(wb, fileName);
}

// ============================
// BILLING REPORTS - PHASE 2
// ============================

export function generateOutstandingIPLPDF(data) {
    const wb = createWorkbook();
    const ws_data = [];
    let rowIndex = 0;

    // Header
    rowIndex = addHeaderRow(ws_data, [], rowIndex);
    ws_data[rowIndex++] = [{ v: 'OUTSTANDING TAGIHAN IPL', t: 's', s: { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } } }];
    ws_data[rowIndex++] = [{ v: 'Semua Periode', t: 's', s: { alignment: { horizontal: 'center' } } }];
    ws_data[rowIndex++] = []; // Empty row

    // Summary
    ws_data[rowIndex++] = [formatHeaderCell('RINGKASAN')];
    ws_data[rowIndex++] = [{ v: 'Total Tagihan Outstanding:', t: 's', s: { font: { bold: true } } }, { v: data.summary.total_bills, t: 'n' }];
    ws_data[rowIndex++] = [{ v: 'Total Nominal Outstanding:', t: 's', s: { font: { bold: true } } }, formatCurrencyCell(data.summary.total_outstanding)];
    ws_data[rowIndex++] = [{ v: 'Tagihan Overdue:', t: 's', s: { font: { bold: true } } }, { v: data.summary.overdue_count, t: 'n' }];
    ws_data[rowIndex++] = []; // Empty row

    // Table headers
    ws_data[rowIndex++] = [
        formatHeaderCell('No. Rumah'),
        formatHeaderCell('Penghuni'),
        formatHeaderCell('Periode'),
        formatHeaderCell('Nominal Outstanding'),
        formatHeaderCell('Jatuh Tempo'),
        formatHeaderCell('Status')
    ];

    // Table data
    data.bills.forEach(function(bill) {
        const overdue = bill.tanggal_jatuh_tempo && new Date(bill.tanggal_jatuh_tempo) < new Date();
        const statusText = overdue ? 'OVERDUE' : 'PENDING';
        ws_data[rowIndex++] = [
            { v: bill.hunian?.nomor_blok_rumah || '-', t: 's' },
            { v: bill.hunian?.penghuni_saat_ini?.nama_kepala_keluarga || '-', t: 's' },
            { v: bill.periode?.nama_periode || '-', t: 's' },
            formatCurrencyCell(bill.sisa_tagihan),
            { v: new Date(bill.tanggal_jatuh_tempo).toLocaleDateString('id-ID'), t: 's' },
            { v: statusText, t: 's', s: { font: { color: { rgb: overdue ? 'FF0000' : '000000' } } } }
        ];
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'Outstanding IPL');

    // Set column widths
    ws['!cols'] = [
        { width: 15 }, // No. Rumah
        { width: 25 }, // Penghuni
        { width: 15 }, // Periode
        { width: 20 }, // Nominal
        { width: 15 }, // Jatuh Tempo
        { width: 12 }  // Status
    ];

    // Download file
    const fileName = 'Outstanding_IPL_' + new Date().toISOString().split('T')[0] + '.xlsx';
    XLSX.writeFile(wb, fileName);
}

export function generateOutstandingAirPDF(data) {
    const wb = createWorkbook();
    const ws_data = [];
    let rowIndex = 0;

    // Header
    rowIndex = addHeaderRow(ws_data, [], rowIndex);
    ws_data[rowIndex++] = [{ v: 'OUTSTANDING TAGIHAN AIR', t: 's', s: { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } } }];
    ws_data[rowIndex++] = [{ v: 'Semua Periode', t: 's', s: { alignment: { horizontal: 'center' } } }];
    ws_data[rowIndex++] = []; // Empty row

    // Summary
    ws_data[rowIndex++] = [formatHeaderCell('RINGKASAN')];
    ws_data[rowIndex++] = [{ v: 'Total Tagihan Outstanding:', t: 's', s: { font: { bold: true } } }, { v: data.summary.total_bills, t: 'n' }];
    ws_data[rowIndex++] = [{ v: 'Total Nominal Outstanding:', t: 's', s: { font: { bold: true } } }, formatCurrencyCell(data.summary.total_outstanding)];
    ws_data[rowIndex++] = [{ v: 'Total Penggunaan Air:', t: 's', s: { font: { bold: true } } }, { v: data.summary.total_usage_m3 + ' m³', t: 's' }];
    ws_data[rowIndex++] = [{ v: 'Tagihan Overdue:', t: 's', s: { font: { bold: true } } }, { v: data.summary.overdue_count, t: 'n' }];
    ws_data[rowIndex++] = []; // Empty row

    // Table headers
    ws_data[rowIndex++] = [
        formatHeaderCell('No. Rumah'),
        formatHeaderCell('Penghuni'),
        formatHeaderCell('Periode'),
        formatHeaderCell('Penggunaan'),
        formatHeaderCell('Nominal Outstanding'),
        formatHeaderCell('Jatuh Tempo'),
        formatHeaderCell('Status')
    ];

    // Table data
    data.bills.forEach(function(bill) {
        const overdue = bill.tanggal_jatuh_tempo && new Date(bill.tanggal_jatuh_tempo) < new Date();
        const statusText = overdue ? 'OVERDUE' : 'PENDING';
        ws_data[rowIndex++] = [
            { v: bill.hunian?.nomor_blok_rumah || '-', t: 's' },
            { v: bill.hunian?.penghuni_saat_ini?.nama_kepala_keluarga || '-', t: 's' },
            { v: bill.periode?.nama_periode || '-', t: 's' },
            { v: bill.pemakaian_m3 + ' m³', t: 's' },
            formatCurrencyCell(bill.sisa_tagihan),
            { v: new Date(bill.tanggal_jatuh_tempo).toLocaleDateString('id-ID'), t: 's' },
            { v: statusText, t: 's', s: { font: { color: { rgb: overdue ? 'FF0000' : '000000' } } } }
        ];
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'Outstanding Air');

    // Set column widths
    ws['!cols'] = [
        { width: 15 }, // No. Rumah
        { width: 25 }, // Penghuni
        { width: 15 }, // Periode
        { width: 15 }, // Penggunaan
        { width: 20 }, // Nominal
        { width: 15 }, // Jatuh Tempo
        { width: 12 }  // Status
    ];

    // Download file
    const fileName = 'Outstanding_Air_' + new Date().toISOString().split('T')[0] + '.xlsx';
    XLSX.writeFile(wb, fileName);
}

export function generateLatePaymentReportPDF(data) {
    const wb = createWorkbook();
    const ws_data = [];
    let rowIndex = 0;

    // Header
    rowIndex = addHeaderRow(ws_data, [], rowIndex);
    ws_data[rowIndex++] = [{ v: 'LAPORAN PEMBAYARAN TERLAMBAT', t: 's', s: { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } } }];
    const dateRange = new Date(data.period.startDate).toLocaleDateString('id-ID') + ' - ' + new Date(data.period.endDate).toLocaleDateString('id-ID');
    ws_data[rowIndex++] = [{ v: 'Periode: ' + dateRange, t: 's', s: { alignment: { horizontal: 'center' } } }];
    ws_data[rowIndex++] = []; // Empty row

    // Summary
    ws_data[rowIndex++] = [formatHeaderCell('RINGKASAN PEMBAYARAN')];
    ws_data[rowIndex++] = [{ v: 'Total Tagihan:', t: 's', s: { font: { bold: true } } }, { v: data.summary.total_bills, t: 'n' }];
    ws_data[rowIndex++] = [{ v: 'Dibayar Tepat Waktu:', t: 's' }, { v: data.summary.paid_on_time + ' (' + data.summary.on_time_rate.toFixed(1) + '%)', t: 's' }];
    ws_data[rowIndex++] = [{ v: 'Dibayar Terlambat:', t: 's' }, { v: data.summary.paid_late + ' (' + data.summary.late_payment_rate.toFixed(1) + '%)', t: 's' }];
    ws_data[rowIndex++] = [{ v: 'Belum Dibayar (Overdue):', t: 's' }, { v: data.summary.unpaid_overdue, t: 'n' }];
    ws_data[rowIndex++] = []; // Empty row

    // Top late payers
    if (data.penghuni_stats && data.penghuni_stats.length > 0) {
        ws_data[rowIndex++] = [formatHeaderCell('PENGHUNI DENGAN PEMBAYARAN TERLAMBAT TERBANYAK')];
        ws_data[rowIndex++] = [
            formatHeaderCell('No'),
            formatHeaderCell('Nama Penghuni'),
            formatHeaderCell('Pembayaran Terlambat'),
            formatHeaderCell('Belum Dibayar'),
            formatHeaderCell('Total Amount')
        ];

        data.penghuni_stats.slice(0, 10).forEach(function(penghuni, index) {
            ws_data[rowIndex++] = [
                { v: index + 1, t: 'n' },
                { v: penghuni.name, t: 's' },
                { v: penghuni.late_payments, t: 'n' },
                { v: penghuni.overdue_unpaid, t: 'n' },
                formatCurrencyCell(penghuni.total_amount)
            ];
        });
    }

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'Pembayaran Terlambat');

    // Set column widths
    ws['!cols'] = [
        { width: 5 },  // No
        { width: 25 }, // Nama
        { width: 20 }, // Late payments
        { width: 15 }, // Overdue
        { width: 15 }  // Amount
    ];

    // Download file
    const fileName = 'Laporan_Pembayaran_Terlambat_' + new Date().toISOString().split('T')[0] + '.xlsx';
    XLSX.writeFile(wb, fileName);
}

export function generateCollectionEffectivenessPDF(data) {
    const wb = createWorkbook();
    const ws_data = [];
    let rowIndex = 0;

    // Header
    rowIndex = addHeaderRow(ws_data, [], rowIndex);
    ws_data[rowIndex++] = [{ v: 'EFEKTIVITAS KOLEKSI', t: 's', s: { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } } }];
    const dateRange = new Date(data.period.startDate).toLocaleDateString('id-ID') + ' - ' + new Date(data.period.endDate).toLocaleDateString('id-ID');
    ws_data[rowIndex++] = [{ v: 'Periode: ' + dateRange, t: 's', s: { alignment: { horizontal: 'center' } } }];
    ws_data[rowIndex++] = []; // Empty row

    // Overall effectiveness
    ws_data[rowIndex++] = [formatHeaderCell('EFEKTIVITAS KESELURUHAN')];
    ws_data[rowIndex++] = [{ v: 'Total Tagihan:', t: 's', s: { font: { bold: true } } }, { v: data.overall.total_bills, t: 'n' }];
    ws_data[rowIndex++] = [{ v: 'Total Nilai Tagihan:', t: 's', s: { font: { bold: true } } }, formatCurrencyCell(data.overall.total_billed)];
    ws_data[rowIndex++] = [{ v: 'Total Terkumpul:', t: 's', s: { font: { bold: true } } }, formatCurrencyCell(data.overall.total_collected)];
    ws_data[rowIndex++] = [{ v: 'Tingkat Efektivitas:', t: 's', s: { font: { bold: true } } }, { v: data.overall.effectiveness_rate.toFixed(1) + '%', t: 's' }];
    ws_data[rowIndex++] = [{ v: 'Tagihan Lunas:', t: 's', s: { font: { bold: true } } }, { v: data.overall.fully_paid_bills + ' dari ' + data.overall.total_bills, t: 's' }];
    ws_data[rowIndex++] = []; // Empty row

    // By service effectiveness
    ws_data[rowIndex++] = [formatHeaderCell('EFEKTIVITAS PER JENIS TAGIHAN')];
    ws_data[rowIndex++] = [
        formatHeaderCell('Jenis Tagihan'),
        formatHeaderCell('Total Tagihan'),
        formatHeaderCell('Nilai Tagihan'),
        formatHeaderCell('Terkumpul'),
        formatHeaderCell('Efektivitas'),
        formatHeaderCell('Lunas')
    ];

    // IPL row
    ws_data[rowIndex++] = [
        { v: 'IPL', t: 's', s: { font: { bold: true } } },
        { v: data.by_service.ipl.total_bills, t: 'n' },
        formatCurrencyCell(data.by_service.ipl.total_billed),
        formatCurrencyCell(data.by_service.ipl.total_collected),
        { v: data.by_service.ipl.effectiveness_rate.toFixed(1) + '%', t: 's' },
        { v: data.by_service.ipl.fully_paid + ' dari ' + data.by_service.ipl.total_bills, t: 's' }
    ];

    // Air row
    ws_data[rowIndex++] = [
        { v: 'Air', t: 's', s: { font: { bold: true } } },
        { v: data.by_service.air.total_bills, t: 'n' },
        formatCurrencyCell(data.by_service.air.total_billed),
        formatCurrencyCell(data.by_service.air.total_collected),
        { v: data.by_service.air.effectiveness_rate.toFixed(1) + '%', t: 's' },
        { v: data.by_service.air.fully_paid + ' dari ' + data.by_service.air.total_bills, t: 's' }
    ];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'Efektivitas Koleksi');

    // Set column widths
    ws['!cols'] = [
        { width: 15 }, // Jenis
        { width: 12 }, // Total Tagihan
        { width: 15 }, // Nilai Tagihan
        { width: 15 }, // Terkumpul
        { width: 12 }, // Efektivitas
        { width: 15 }  // Lunas
    ];

    // Download file
    const fileName = 'Efektivitas_Koleksi_' + new Date().toISOString().split('T')[0] + '.xlsx';
    XLSX.writeFile(wb, fileName);
}

// ============================
// OPERATIONAL REPORTS - PHASE 3
// ============================

export function generateDanaTitipanExcel(data) {
    const wb = createWorkbook();
    const ws_data = [];
    let rowIndex = 0;

    // Header
    rowIndex = addHeaderRow(ws_data, [], rowIndex);
    ws_data[rowIndex++] = [{ v: 'LAPORAN DANA TITIPAN', t: 's', s: { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } } }];
    const dateRange = new Date(data.period.startDate).toLocaleDateString('id-ID') + ' - ' + new Date(data.period.endDate).toLocaleDateString('id-ID');
    ws_data[rowIndex++] = [{ v: 'Periode: ' + dateRange, t: 's', s: { alignment: { horizontal: 'center' } } }];
    ws_data[rowIndex++] = []; // Empty row

    // Summary
    ws_data[rowIndex++] = [formatHeaderCell('RINGKASAN')];
    ws_data[rowIndex++] = [{ v: 'Total Transaksi:', t: 's', s: { font: { bold: true } } }, { v: data.summary.total_transactions, t: 'n' }];
    ws_data[rowIndex++] = [{ v: 'Total Nominal:', t: 's', s: { font: { bold: true } } }, formatCurrencyCell(data.summary.total_amount)];
    ws_data[rowIndex++] = []; // Empty row

    // Table headers
    ws_data[rowIndex++] = [
        formatHeaderCell('Tanggal'),
        formatHeaderCell('Penghuni'),
        formatHeaderCell('No. Rumah'),
        formatHeaderCell('Kategori'),
        formatHeaderCell('Rekening'),
        formatHeaderCell('Nominal'),
        formatHeaderCell('Keterangan')
    ];

    // Table data
    data.transactions.forEach(function(transaction) {
        ws_data[rowIndex++] = [
            { v: new Date(transaction.tanggal).toLocaleDateString('id-ID'), t: 's' },
            { v: transaction.penghuni?.nama_kepala_keluarga || '-', t: 's' },
            { v: transaction.hunian?.nomor_blok_rumah || '-', t: 's' },
            { v: transaction.kategori?.nama_kategori || '-', t: 's' },
            { v: transaction.rekening?.jenis_rekening || '-', t: 's' },
            formatCurrencyCell(transaction.nominal),
            { v: transaction.keterangan || '-', t: 's' }
        ];
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'Dana Titipan');

    // Set column widths
    ws['!cols'] = [
        { width: 12 }, // Tanggal
        { width: 25 }, // Penghuni
        { width: 12 }, // No. Rumah
        { width: 15 }, // Kategori
        { width: 15 }, // Rekening
        { width: 15 }, // Nominal
        { width: 30 }  // Keterangan
    ];

    // Download file
    const fileName = 'Dana_Titipan_' + new Date().toISOString().split('T')[0] + '.xlsx';
    XLSX.writeFile(wb, fileName);
}

export function generatePemindahbukuanExcel(data) {
    const wb = createWorkbook();
    const ws_data = [];
    let rowIndex = 0;

    // Header
    rowIndex = addHeaderRow(ws_data, [], rowIndex);
    ws_data[rowIndex++] = [{ v: 'LAPORAN PEMINDAHBUKUAN', t: 's', s: { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } } }];
    const dateRange = new Date(data.period.startDate).toLocaleDateString('id-ID') + ' - ' + new Date(data.period.endDate).toLocaleDateString('id-ID');
    ws_data[rowIndex++] = [{ v: 'Periode: ' + dateRange, t: 's', s: { alignment: { horizontal: 'center' } } }];
    ws_data[rowIndex++] = []; // Empty row

    // Summary
    ws_data[rowIndex++] = [formatHeaderCell('RINGKASAN')];
    ws_data[rowIndex++] = [{ v: 'Total Transaksi:', t: 's', s: { font: { bold: true } } }, { v: data.summary.total_transactions, t: 'n' }];
    ws_data[rowIndex++] = [{ v: 'Total Nominal:', t: 's', s: { font: { bold: true } } }, formatCurrencyCell(data.summary.total_amount)];
    ws_data[rowIndex++] = []; // Empty row

    // Table headers
    ws_data[rowIndex++] = [
        formatHeaderCell('Tanggal'),
        formatHeaderCell('Dari Rekening'),
        formatHeaderCell('Ke Rekening'),
        formatHeaderCell('Nominal'),
        formatHeaderCell('Catatan')
    ];

    // Table data
    data.transactions.forEach(function(transaction) {
        ws_data[rowIndex++] = [
            { v: new Date(transaction.tanggal).toLocaleDateString('id-ID'), t: 's' },
            { v: transaction.rekening_dari?.jenis_rekening || '-', t: 's' },
            { v: transaction.rekening_ke?.jenis_rekening || '-', t: 's' },
            formatCurrencyCell(transaction.nominal),
            { v: transaction.catatan || '-', t: 's' }
        ];
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'Pemindahbukuan');

    // Set column widths
    ws['!cols'] = [
        { width: 12 }, // Tanggal
        { width: 25 }, // Dari Rekening
        { width: 25 }, // Ke Rekening
        { width: 15 }, // Nominal
        { width: 30 }  // Catatan
    ];

    // Download file
    const fileName = 'Pemindahbukuan_' + new Date().toISOString().split('T')[0] + '.xlsx';
    XLSX.writeFile(wb, fileName);
}

export function generateNeracaExcel(data) {
    const wb = createWorkbook();
    const ws_data = [];
    let rowIndex = 0;

    // Header
    rowIndex = addHeaderRow(ws_data, [], rowIndex);
    ws_data[rowIndex++] = [{ v: 'NERACA (BALANCE SHEET)', t: 's', s: { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } } }];
    const asOfDate = new Date(data.as_of_date).toLocaleDateString('id-ID');
    ws_data[rowIndex++] = [{ v: 'Per ' + asOfDate, t: 's', s: { alignment: { horizontal: 'center' } } }];
    ws_data[rowIndex++] = []; // Empty row

    // Assets section
    ws_data[rowIndex++] = [formatHeaderCell('AKTIVA (ASSETS)')];
    let totalAssets = 0;
    for (let rekening in data.balance_sheet.assets) {
        if (data.balance_sheet.assets.hasOwnProperty(rekening)) {
            const amount = data.balance_sheet.assets[rekening];
            ws_data[rowIndex++] = [{ v: rekening, t: 's' }, formatCurrencyCell(amount)];
            totalAssets += amount;
        }
    }
    ws_data[rowIndex++] = [{ v: 'TOTAL AKTIVA', t: 's', s: { font: { bold: true } } }, formatCurrencyCell(totalAssets)];
    ws_data[rowIndex++] = []; // Empty row

    // Liabilities section
    ws_data[rowIndex++] = [formatHeaderCell('KEWAJIBAN (LIABILITIES)')];
    let totalLiabilities = 0;
    for (let rekening in data.balance_sheet.liabilities) {
        if (data.balance_sheet.liabilities.hasOwnProperty(rekening)) {
            const amount = data.balance_sheet.liabilities[rekening];
            ws_data[rowIndex++] = [{ v: rekening, t: 's' }, formatCurrencyCell(amount)];
            totalLiabilities += amount;
        }
    }
    ws_data[rowIndex++] = [{ v: 'TOTAL KEWAJIBAN', t: 's', s: { font: { bold: true } } }, formatCurrencyCell(totalLiabilities)];
    ws_data[rowIndex++] = []; // Empty row

    // Equity section
    ws_data[rowIndex++] = [formatHeaderCell('EKUITAS (EQUITY)')];
    let totalEquity = 0;
    for (let rekening in data.balance_sheet.equity) {
        if (data.balance_sheet.equity.hasOwnProperty(rekening)) {
            const amount = data.balance_sheet.equity[rekening];
            ws_data[rowIndex++] = [{ v: rekening, t: 's' }, formatCurrencyCell(amount)];
            totalEquity += amount;
        }
    }
    ws_data[rowIndex++] = [{ v: 'TOTAL EKUITAS', t: 's', s: { font: { bold: true } } }, formatCurrencyCell(totalEquity)];
    ws_data[rowIndex++] = []; // Empty row

    // Net worth
    const netWorth = data.net_worth;
    const isPositive = netWorth >= 0;
    ws_data[rowIndex++] = [
        { v: 'NILAI BERSIH (NET WORTH)', t: 's', s: { font: { bold: true }, color: { rgb: isPositive ? '009900' : 'FF0000' } } },
        formatCurrencyCell(Math.abs(netWorth))
    ];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'Neraca');

    // Set column widths
    ws['!cols'] = [
        { width: 25 }, // Description
        { width: 20 }  // Amount
    ];

    // Download file
    const fileName = 'Neraca_' + new Date().toISOString().split('T')[0] + '.xlsx';
    XLSX.writeFile(wb, fileName);
}

export function generateArusKasExcel(data) {
    const wb = createWorkbook();
    const ws_data = [];
    let rowIndex = 0;

    // Header
    rowIndex = addHeaderRow(ws_data, [], rowIndex);
    ws_data[rowIndex++] = [{ v: 'ARUS KAS (CASH FLOW)', t: 's', s: { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } } }];
    const dateRange = new Date(data.period.startDate).toLocaleDateString('id-ID') + ' - ' + new Date(data.period.endDate).toLocaleDateString('id-ID');
    ws_data[rowIndex++] = [{ v: 'Periode: ' + dateRange, t: 's', s: { alignment: { horizontal: 'center' } } }];
    ws_data[rowIndex++] = []; // Empty row

    // Operating activities
    ws_data[rowIndex++] = [formatHeaderCell('ARUS KAS DARI AKTIVITAS OPERASIONAL')];
    let totalOperating = 0;
    for (let rekening in data.cash_flow_statement.operating_activities) {
        if (data.cash_flow_statement.operating_activities.hasOwnProperty(rekening)) {
            const activity = data.cash_flow_statement.operating_activities[rekening];
            ws_data[rowIndex++] = [{ v: rekening, t: 's' }, formatCurrencyCell(activity.net)];
            totalOperating += activity.net;
        }
    }
    ws_data[rowIndex++] = [{ v: 'TOTAL ARUS KAS OPERASIONAL', t: 's', s: { font: { bold: true } } }, formatCurrencyCell(totalOperating)];
    ws_data[rowIndex++] = []; // Empty row

    // Net cash flow
    const netCashFlow = data.cash_flow_statement.net_cash_flow;
    const isPositive = netCashFlow >= 0;
    ws_data[rowIndex++] = [
        { v: 'ARUS KAS BERSIH', t: 's', s: { font: { bold: true }, color: { rgb: isPositive ? '009900' : 'FF0000' } } },
        formatCurrencyCell(Math.abs(netCashFlow))
    ];
    ws_data[rowIndex++] = []; // Empty row

    // Cash position
    ws_data[rowIndex++] = [formatHeaderCell('POSISI KAS')];
    ws_data[rowIndex++] = [{ v: 'Saldo Kas Awal:', t: 's', s: { font: { bold: true } } }, formatCurrencyCell(data.cash_flow_statement.beginning_cash)];
    ws_data[rowIndex++] = [{ v: 'Saldo Kas Akhir:', t: 's', s: { font: { bold: true } } }, formatCurrencyCell(data.cash_flow_statement.ending_cash)];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'Arus Kas');

    // Set column widths
    ws['!cols'] = [
        { width: 30 }, // Description
        { width: 20 }  // Amount
    ];

    // Download file
    const fileName = 'Arus_Kas_' + new Date().toISOString().split('T')[0] + '.xlsx';
    XLSX.writeFile(wb, fileName);
}
