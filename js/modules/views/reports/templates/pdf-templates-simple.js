// PDF Report Templates Module - SIMPLE WORKING BACKUP VERSION
// Contains functions to generate PDF reports using jsPDF
// BACKUP VERSION: This is the working simplified version before professional restore

import { formatCurrency } from '../../../utils.js';

let jspdf = null;

async function initPDFLibs() {
    if (!jspdf) {
        jspdf = window.jspdf.jsPDF;
    }
}

function addPDFHeader(doc, title, subtitle, dateRange) {
    const pageWidth = doc.internal.pageSize.width;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SISTEM INFORMASI KEUANGAN', pageWidth / 2, 20, { align: 'center' });
    doc.text('BLOK H CIKEAS GARDENIA', pageWidth / 2, 30, { align: 'center' });
    doc.setFontSize(14);
    doc.text(title, pageWidth / 2, 45, { align: 'center' });
    if (subtitle) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(subtitle, pageWidth / 2, 55, { align: 'center' });
    }
    if (dateRange) {
        doc.setFontSize(10);
        doc.text('Periode: ' + dateRange, pageWidth / 2, 65, { align: 'center' });
    }
    doc.setLineWidth(0.5);
    doc.line(20, 75, pageWidth - 20, 75);
    return 85;
}

function addPDFFooter(doc, pageNum) {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Halaman ' + pageNum, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text('Dicetak pada: ' + new Date().toLocaleString('id-ID'), pageWidth - 20, pageHeight - 10, { align: 'right' });
}

export async function generateRekapSaldoPDF(data, dateRange) {
    await initPDFLibs();
    const doc = new jspdf();
    let yPosition = addPDFHeader(doc, 'REKAP SALDO PER KATEGORI', '', dateRange);
    doc.setFontSize(10);
    doc.text('Total Saldo Awal: ' + formatCurrency(data.totalSaldoAwal), 20, yPosition);
    yPosition += 6;
    doc.text('Total Pemasukan: ' + formatCurrency(data.totalPemasukan), 20, yPosition);
    yPosition += 6;
    doc.text('Total Pengeluaran: ' + formatCurrency(data.totalPengeluaran), 20, yPosition);
    yPosition += 6;
    doc.text('Total Saldo Akhir: ' + formatCurrency(data.totalSaldoAkhir), 20, yPosition);
    addPDFFooter(doc, 1);
    doc.save('Rekap_Saldo_' + new Date().toISOString().split('T')[0] + '.pdf');
}

export async function generateRincianPemasukanGlobalPDF(data, dateRange) {
    await initPDFLibs();
    const doc = new jspdf();
    let yPosition = addPDFHeader(doc, 'RINCIAN PEMASUKAN GLOBAL', '', dateRange);
    if (!data || data.length === 0) {
        doc.setFontSize(12);
        doc.text('Tidak ada data pemasukan dalam periode ini.', 20, yPosition);
        addPDFFooter(doc, 1);
        doc.save('Rincian_Pemasukan_Global_' + new Date().toISOString().split('T')[0] + '.pdf');
        return;
    }
    const totalNominal = data.reduce(function(sum, item) { return sum + (item.nominal || 0); }, 0);
    doc.setFontSize(10);
    doc.text('Total Transaksi: ' + data.length, 20, yPosition);
    yPosition += 6;
    doc.text('Total Nominal: ' + formatCurrency(totalNominal), 20, yPosition);
    addPDFFooter(doc, 1);
    doc.save('Rincian_Pemasukan_Global_' + new Date().toISOString().split('T')[0] + '.pdf');
}

export async function generateRincianPemasukanPerKategoriPDF(data, dateRange) {
    await initPDFLibs();
    const doc = new jspdf();
    let yPosition = addPDFHeader(doc, 'RINCIAN PEMASUKAN PER KATEGORI', '', dateRange);
    if (!data.grouped || data.grouped.length === 0) {
        doc.setFontSize(12);
        doc.text('Tidak ada data pemasukan dalam periode ini.', 20, yPosition);
        addPDFFooter(doc, 1);
        doc.save('Rincian_Pemasukan_Kategori_' + new Date().toISOString().split('T')[0] + '.pdf');
        return;
    }
    doc.setFontSize(10);
    doc.text('Total Kategori: ' + data.grouped.length, 20, yPosition);
    yPosition += 6;
    doc.text('Total Transaksi: ' + data.transaction_count, 20, yPosition);
    yPosition += 6;
    doc.text('Total Nominal: ' + formatCurrency(data.total_nominal), 20, yPosition);
    addPDFFooter(doc, 1);
    doc.save('Rincian_Pemasukan_Kategori_' + new Date().toISOString().split('T')[0] + '.pdf');
}

export async function generateRincianPengeluaranGlobalPDF(data, dateRange) {
    await initPDFLibs();
    const doc = new jspdf();
    let yPosition = addPDFHeader(doc, 'RINCIAN PENGELUARAN GLOBAL', '', dateRange);
    if (!data || data.length === 0) {
        doc.setFontSize(12);
        doc.text('Tidak ada data pengeluaran dalam periode ini.', 20, yPosition);
        addPDFFooter(doc, 1);
        doc.save('Rincian_Pengeluaran_Global_' + new Date().toISOString().split('T')[0] + '.pdf');
        return;
    }
    const totalNominal = data.reduce(function(sum, item) { return sum + (item.nominal || 0); }, 0);
    doc.setFontSize(10);
    doc.text('Total Transaksi: ' + data.length, 20, yPosition);
    yPosition += 6;
    doc.text('Total Nominal: ' + formatCurrency(totalNominal), 20, yPosition);
    addPDFFooter(doc, 1);
    doc.save('Rincian_Pengeluaran_Global_' + new Date().toISOString().split('T')[0] + '.pdf');
}

export async function generateLaporanLabaRugiPDF(data) {
    await initPDFLibs();
    const doc = new jspdf();
    const dateRange = new Date(data.periode.startDate).toLocaleDateString('id-ID') + ' - ' + new Date(data.periode.endDate).toLocaleDateString('id-ID');
    let yPosition = addPDFHeader(doc, 'LAPORAN LABA RUGI', '(INCOME STATEMENT)', dateRange);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PEMASUKAN (REVENUE)', 20, yPosition);
    yPosition += 15;
    doc.setFont('helvetica', 'normal');
    for (let kategori in data.pemasukan.by_kategori) {
        if (data.pemasukan.by_kategori.hasOwnProperty(kategori)) {
            doc.text(kategori + ':', 30, yPosition);
            doc.text(formatCurrency(data.pemasukan.by_kategori[kategori]), 150, yPosition, { align: 'right' });
            yPosition += 6;
        }
    }
    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL PEMASUKAN:', 30, yPosition);
    doc.text(formatCurrency(data.pemasukan.total), 150, yPosition, { align: 'right' });
    yPosition += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('PENGELUARAN (EXPENSES)', 20, yPosition);
    yPosition += 15;
    doc.setFont('helvetica', 'normal');
    for (let kategori in data.pengeluaran.by_kategori) {
        if (data.pengeluaran.by_kategori.hasOwnProperty(kategori)) {
            doc.text(kategori + ':', 30, yPosition);
            doc.text(formatCurrency(data.pengeluaran.by_kategori[kategori]), 150, yPosition, { align: 'right' });
            yPosition += 6;
        }
    }
    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL PENGELUARAN:', 30, yPosition);
    doc.text(formatCurrency(data.pengeluaran.total), 150, yPosition, { align: 'right' });
    yPosition += 15;
    doc.setFontSize(12);
    const isProfit = data.laba_rugi >= 0;
    doc.setTextColor(isProfit ? 0 : 255, isProfit ? 128 : 0, 0);
    doc.text((isProfit ? 'LABA' : 'RUGI') + ' BERSIH:', 30, yPosition);
    doc.text(formatCurrency(Math.abs(data.laba_rugi)), 150, yPosition, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    yPosition += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Status: ' + data.status, 30, yPosition);
    addPDFFooter(doc, 1);
    const fileName = 'Laporan_Laba_Rugi_' + new Date().toISOString().split('T')[0] + '.pdf';
    doc.save(fileName);
}

// ============================
// BILLING REPORTS - PHASE 2
// ============================

export async function generateOutstandingIPLPDF(data) {
    await initPDFLibs();
    const doc = new jspdf();
    let yPosition = addPDFHeader(doc, 'OUTSTANDING TAGIHAN IPL', '', 'Semua Periode');

    // Summary section
    doc.setFontSize(10);
    doc.text('Total Tagihan Outstanding: ' + data.summary.total_bills, 20, yPosition);
    yPosition += 6;
    doc.text('Total Nominal Outstanding: ' + formatCurrency(data.summary.total_outstanding), 20, yPosition);
    yPosition += 6;
    doc.text('Tagihan Overdue: ' + data.summary.overdue_count, 20, yPosition);
    yPosition += 15;

    // Table headers
    const headers = ['No. Rumah', 'Penghuni', 'Periode', 'Nominal', 'Jatuh Tempo', 'Status'];
    const colWidths = [25, 35, 25, 25, 30, 25];

    // Table data
    data.bills.forEach((bill, index) => {
        if (index === 0 || yPosition > 250) {
            if (index > 0) {
                doc.addPage();
                addPDFFooter(doc, doc.internal.getNumberOfPages());
                yPosition = 20;
            }
            let xPos = 20;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            headers.forEach((header, idx) => {
                doc.text(header, xPos, yPosition);
                xPos += colWidths[idx];
            });
            yPosition += 8;
        }
        let xPos = 20;
        const overdue = bill.tanggal_jatuh_tempo && new Date(bill.tanggal_jatuh_tempo) < new Date();
        const statusText = overdue ? 'OVERDUE' : 'PENDING';
        const values = [
            bill.hunian?.nomor_blok_rumah || '-',
            bill.hunian?.penghuni_saat_ini?.nama_kepala_keluarga || '-',
            bill.periode?.nama_periode || '-',
            formatCurrency(bill.sisa_tagihan),
            new Date(bill.tanggal_jatuh_tempo).toLocaleDateString('id-ID'),
            statusText
        ];
        doc.setFont('helvetica', 'normal');
        values.forEach((value, idx) => {
            const maxWidth = colWidths[idx] - 2;
            const lines = doc.splitTextToSize(value.toString(), maxWidth);
            doc.text(lines, xPos, yPosition);
            xPos += colWidths[idx];
        });
        yPosition += 6;
    });

    addPDFFooter(doc, doc.internal.getNumberOfPages());
    doc.save('Outstanding_IPL_' + new Date().toISOString().split('T')[0] + '.pdf');
}

export async function generateOutstandingAirPDF(data) {
    await initPDFLibs();
    const doc = new jspdf();
    let yPosition = addPDFHeader(doc, 'OUTSTANDING TAGIHAN AIR', '', 'Semua Periode');

    // Summary section
    doc.setFontSize(10);
    doc.text('Total Tagihan Outstanding: ' + data.summary.total_bills, 20, yPosition);
    yPosition += 6;
    doc.text('Total Nominal Outstanding: ' + formatCurrency(data.summary.total_outstanding), 20, yPosition);
    yPosition += 6;
    doc.text('Total Penggunaan Air: ' + data.summary.total_usage_m3 + ' m³', 20, yPosition);
    yPosition += 6;
    doc.text('Tagihan Overdue: ' + data.summary.overdue_count, 20, yPosition);
    yPosition += 15;

    // Table headers
    const headers = ['No. Rumah', 'Penghuni', 'Periode', 'Penggunaan', 'Nominal', 'Jatuh Tempo', 'Status'];
    const colWidths = [20, 30, 20, 20, 25, 30, 25];

    // Table data
    data.bills.forEach((bill, index) => {
        if (index === 0 || yPosition > 250) {
            if (index > 0) {
                doc.addPage();
                addPDFFooter(doc, doc.internal.getNumberOfPages());
                yPosition = 20;
            }
            let xPos = 20;
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            headers.forEach((header, idx) => {
                doc.text(header, xPos, yPosition);
                xPos += colWidths[idx];
            });
            yPosition += 8;
        }
        let xPos = 20;
        const overdue = bill.tanggal_jatuh_tempo && new Date(bill.tanggal_jatuh_tempo) < new Date();
        const statusText = overdue ? 'OVERDUE' : 'PENDING';
        const values = [
            bill.hunian?.nomor_blok_rumah || '-',
            bill.hunian?.penghuni_saat_ini?.nama_kepala_keluarga || '-',
            bill.periode?.nama_periode || '-',
            bill.pemakaian_m3 + ' m³',
            formatCurrency(bill.sisa_tagihan),
            new Date(bill.tanggal_jatuh_tempo).toLocaleDateString('id-ID'),
            statusText
        ];
        doc.setFont('helvetica', 'normal');
        values.forEach((value, idx) => {
            const maxWidth = colWidths[idx] - 1;
            const lines = doc.splitTextToSize(value.toString(), maxWidth);
            doc.text(lines, xPos, yPosition);
            xPos += colWidths[idx];
        });
        yPosition += 5;
    });

    addPDFFooter(doc, doc.internal.getNumberOfPages());
    doc.save('Outstanding_Air_' + new Date().toISOString().split('T')[0] + '.pdf');
}

export async function generateLatePaymentReportPDF(data) {
    await initPDFLibs();
    const doc = new jspdf();
    const dateRange = new Date(data.period.startDate).toLocaleDateString('id-ID') + ' - ' + new Date(data.period.endDate).toLocaleDateString('id-ID');
    let yPosition = addPDFHeader(doc, 'LAPORAN PEMBAYARAN TERLAMBAT', '', dateRange);

    // Summary section
    doc.setFontSize(10);
    doc.text('Total Tagihan: ' + data.summary.total_bills, 20, yPosition);
    yPosition += 6;
    doc.text('Dibayar Tepat Waktu: ' + data.summary.paid_on_time + ' (' + data.summary.on_time_rate.toFixed(1) + '%)', 20, yPosition);
    yPosition += 6;
    doc.text('Dibayar Terlambat: ' + data.summary.paid_late + ' (' + data.summary.late_payment_rate.toFixed(1) + '%)', 20, yPosition);
    yPosition += 6;
    doc.text('Belum Dibayar (Overdue): ' + data.summary.unpaid_overdue, 20, yPosition);
    yPosition += 15;

    // Top late payers
    if (data.penghuni_stats.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('PENGHUNI DENGAN PEMBAYARAN TERLAMBAT TERBANYAK:', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        data.penghuni_stats.slice(0, 10).forEach((penghuni, index) => {
            const text = (index + 1) + '. ' + penghuni.name + ' - ' + penghuni.late_payments + ' pembayaran terlambat, ' + penghuni.overdue_unpaid + ' belum dibayar';
            doc.text(text, 25, yPosition);
            yPosition += 6;
        });
    }

    addPDFFooter(doc, 1);
    doc.save('Laporan_Pembayaran_Terlambat_' + new Date().toISOString().split('T')[0] + '.pdf');
}

export async function generateCollectionEffectivenessPDF(data) {
    await initPDFLibs();
    const doc = new jspdf();
    const dateRange = new Date(data.period.startDate).toLocaleDateString('id-ID') + ' - ' + new Date(data.period.endDate).toLocaleDateString('id-ID');
    let yPosition = addPDFHeader(doc, 'EFEKTIVITAS KOLEKSI', '', dateRange);

    // Overall effectiveness
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('EFEKTIVITAS KESELURUHAN:', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Tagihan: ' + data.overall.total_bills, 25, yPosition);
    yPosition += 6;
    doc.text('Total Nilai Tagihan: ' + formatCurrency(data.overall.total_billed), 25, yPosition);
    yPosition += 6;
    doc.text('Total Terkumpul: ' + formatCurrency(data.overall.total_collected), 25, yPosition);
    yPosition += 6;
    doc.text('Tingkat Efektivitas: ' + data.overall.effectiveness_rate.toFixed(1) + '%', 25, yPosition);
    yPosition += 6;
    doc.text('Tagihan Lunas: ' + data.overall.fully_paid_bills + ' dari ' + data.overall.total_bills, 25, yPosition);
    yPosition += 15;

    // By service effectiveness
    doc.setFont('helvetica', 'bold');
    doc.text('EFEKTIVITAS PER JENIS TAGIHAN:', 20, yPosition);
    yPosition += 10;

    doc.setFont('helvetica', 'normal');
    doc.text('IPL - Efektivitas: ' + data.by_service.ipl.effectiveness_rate.toFixed(1) + '% (' + formatCurrency(data.by_service.ipl.total_collected) + ' dari ' + formatCurrency(data.by_service.ipl.total_billed) + ')', 25, yPosition);
    yPosition += 6;
    doc.text('Air - Efektivitas: ' + data.by_service.air.effectiveness_rate.toFixed(1) + '% (' + formatCurrency(data.by_service.air.total_collected) + ' dari ' + formatCurrency(data.by_service.air.total_billed) + ')', 25, yPosition);

    addPDFFooter(doc, 1);
    doc.save('Efektivitas_Koleksi_' + new Date().toISOString().split('T')[0] + '.pdf');
}

// ============================
// OPERATIONAL REPORTS - PHASE 3
// ============================

export async function generateDanaTitipanPDF(data) {
    await initPDFLibs();
    const doc = new jspdf();
    const dateRange = new Date(data.period.startDate).toLocaleDateString('id-ID') + ' - ' + new Date(data.period.endDate).toLocaleDateString('id-ID');
    let yPosition = addPDFHeader(doc, 'LAPORAN DANA TITIPAN', '', dateRange);

    // Summary section
    doc.setFontSize(10);
    doc.text('Total Transaksi: ' + data.summary.total_transactions, 20, yPosition);
    yPosition += 6;
    doc.text('Total Nominal: ' + formatCurrency(data.summary.total_amount), 20, yPosition);
    yPosition += 15;

    // Table headers
    const headers = ['Tanggal', 'Penghuni', 'No. Rumah', 'Kategori', 'Rekening', 'Nominal', 'Keterangan'];
    const colWidths = [20, 25, 20, 20, 25, 25, 35];

    // Table data
    data.transactions.forEach((transaction, index) => {
        if (index === 0 || yPosition > 250) {
            if (index > 0) {
                doc.addPage();
                addPDFFooter(doc, doc.internal.getNumberOfPages());
                yPosition = 20;
            }
            let xPos = 20;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            headers.forEach((header, idx) => {
                doc.text(header, xPos, yPosition);
                xPos += colWidths[idx];
            });
            yPosition += 8;
        }
        let xPos = 20;
        const values = [
            new Date(transaction.tanggal).toLocaleDateString('id-ID'),
            transaction.penghuni?.nama_kepala_keluarga || '-',
            transaction.hunian?.nomor_blok_rumah || '-',
            transaction.kategori?.nama_kategori || '-',
            transaction.rekening?.jenis_rekening || '-',
            formatCurrency(transaction.nominal),
            transaction.keterangan || '-'
        ];
        doc.setFont('helvetica', 'normal');
        values.forEach((value, idx) => {
            const maxWidth = colWidths[idx] - 2;
            const lines = doc.splitTextToSize(value.toString(), maxWidth);
            doc.text(lines, xPos, yPosition);
            xPos += colWidths[idx];
        });
        yPosition += 6;
    });

    addPDFFooter(doc, doc.internal.getNumberOfPages());
    doc.save('Dana_Titipan_' + new Date().toISOString().split('T')[0] + '.pdf');
}

export async function generatePemindahbukuanPDF(data) {
    await initPDFLibs();
    const doc = new jspdf();
    const dateRange = new Date(data.period.startDate).toLocaleDateString('id-ID') + ' - ' + new Date(data.period.endDate).toLocaleDateString('id-ID');
    let yPosition = addPDFHeader(doc, 'LAPORAN PEMINDAHBUKUAN', '', dateRange);

    // Summary section
    doc.setFontSize(10);
    doc.text('Total Transaksi: ' + data.summary.total_transactions, 20, yPosition);
    yPosition += 6;
    doc.text('Total Nominal: ' + formatCurrency(data.summary.total_amount), 20, yPosition);
    yPosition += 15;

    // Table headers
    const headers = ['Tanggal', 'Dari Rekening', 'Ke Rekening', 'Nominal', 'Catatan'];
    const colWidths = [20, 35, 35, 30, 40];

    // Table data
    data.transactions.forEach((transaction, index) => {
        if (index === 0 || yPosition > 250) {
            if (index > 0) {
                doc.addPage();
                addPDFFooter(doc, doc.internal.getNumberOfPages());
                yPosition = 20;
            }
            let xPos = 20;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            headers.forEach((header, idx) => {
                doc.text(header, xPos, yPosition);
                xPos += colWidths[idx];
            });
            yPosition += 8;
        }
        let xPos = 20;
        const values = [
            new Date(transaction.tanggal).toLocaleDateString('id-ID'),
            transaction.rekening_dari?.jenis_rekening || '-',
            transaction.rekening_ke?.jenis_rekening || '-',
            formatCurrency(transaction.nominal),
            transaction.catatan || '-'
        ];
        doc.setFont('helvetica', 'normal');
        values.forEach((value, idx) => {
            const maxWidth = colWidths[idx] - 2;
            const lines = doc.splitTextToSize(value.toString(), maxWidth);
            doc.text(lines, xPos, yPosition);
            xPos += colWidths[idx];
        });
        yPosition += 6;
    });

    addPDFFooter(doc, doc.internal.getNumberOfPages());
    doc.save('Pemindahbukuan_' + new Date().toISOString().split('T')[0] + '.pdf');
}

export async function generateNeracaPDF(data) {
    await initPDFLibs();
    const doc = new jspdf();
    const asOfDate = new Date(data.as_of_date).toLocaleDateString('id-ID');
    let yPosition = addPDFHeader(doc, 'NERACA (BALANCE SHEET)', '', 'Per ' + asOfDate);

    // Assets section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('AKTIVA (ASSETS)', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let totalAssets = 0;
    for (let rekening in data.balance_sheet.assets) {
        if (data.balance_sheet.assets.hasOwnProperty(rekening)) {
            const amount = data.balance_sheet.assets[rekening];
            doc.text(rekening + ':', 30, yPosition);
            doc.text(formatCurrency(amount), 150, yPosition, { align: 'right' });
            yPosition += 6;
            totalAssets += amount;
        }
    }
    yPosition += 5;
    doc.setFont('helvetica', 'bold');
    doc.line(25, yPosition - 2, 170, yPosition - 2);
    doc.text('TOTAL AKTIVA:', 30, yPosition);
    doc.text(formatCurrency(totalAssets), 150, yPosition, { align: 'right' });
    yPosition += 15;

    // Liabilities section
    doc.setFont('helvetica', 'bold');
    doc.text('KEWAJIBAN (LIABILITIES)', 20, yPosition);
    yPosition += 10;

    doc.setFont('helvetica', 'normal');
    let totalLiabilities = 0;
    for (let rekening in data.balance_sheet.liabilities) {
        if (data.balance_sheet.liabilities.hasOwnProperty(rekening)) {
            const amount = data.balance_sheet.liabilities[rekening];
            doc.text(rekening + ':', 30, yPosition);
            doc.text(formatCurrency(amount), 150, yPosition, { align: 'right' });
            yPosition += 6;
            totalLiabilities += amount;
        }
    }
    yPosition += 5;
    doc.line(25, yPosition - 2, 170, yPosition - 2);
    doc.text('TOTAL KEWAJIBAN:', 30, yPosition);
    doc.text(formatCurrency(totalLiabilities), 150, yPosition, { align: 'right' });
    yPosition += 15;

    // Equity section
    doc.setFont('helvetica', 'bold');
    doc.text('EKUITAS (EQUITY)', 20, yPosition);
    yPosition += 10;

    doc.setFont('helvetica', 'normal');
    let totalEquity = 0;
    for (let rekening in data.balance_sheet.equity) {
        if (data.balance_sheet.equity.hasOwnProperty(rekening)) {
            const amount = data.balance_sheet.equity[rekening];
            doc.text(rekening + ':', 30, yPosition);
            doc.text(formatCurrency(amount), 150, yPosition, { align: 'right' });
            yPosition += 6;
            totalEquity += amount;
        }
    }
    yPosition += 5;
    doc.line(25, yPosition - 2, 170, yPosition - 2);
    doc.text('TOTAL EKUITAS:', 30, yPosition);
    doc.text(formatCurrency(totalEquity), 150, yPosition, { align: 'right' });
    yPosition += 15;

    // Net worth
    const netWorth = data.net_worth;
    const isPositive = netWorth >= 0;
    doc.setFontSize(11);
    doc.setTextColor(isPositive ? 0 : 255, isPositive ? 128 : 0, 0);
    doc.text('NILAI BERSIH (NET WORTH):', 30, yPosition);
    doc.text(formatCurrency(Math.abs(netWorth)), 150, yPosition, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    addPDFFooter(doc, 1);
    doc.save('Neraca_' + new Date().toISOString().split('T')[0] + '.pdf');
}

export async function generateArusKasPDF(data) {
    await initPDFLibs();
    const doc = new jspdf();
    const dateRange = new Date(data.period.startDate).toLocaleDateString('id-ID') + ' - ' + new Date(data.period.endDate).toLocaleDateString('id-ID');
    let yPosition = addPDFHeader(doc, 'ARUS KAS (CASH FLOW)', '', dateRange);

    // Operating activities
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ARUS KAS DARI AKTIVITAS OPERASIONAL', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let totalOperating = 0;
    for (let rekening in data.cash_flow_statement.operating_activities) {
        if (data.cash_flow_statement.operating_activities.hasOwnProperty(rekening)) {
            const activity = data.cash_flow_statement.operating_activities[rekening];
            doc.text(rekening + ':', 30, yPosition);
            doc.text(formatCurrency(activity.net), 150, yPosition, { align: 'right' });
            yPosition += 6;
            totalOperating += activity.net;
        }
    }
    yPosition += 5;
    doc.setFont('helvetica', 'bold');
    doc.line(25, yPosition - 2, 170, yPosition - 2);
    doc.text('TOTAL ARUS KAS OPERASIONAL:', 30, yPosition);
    doc.text(formatCurrency(totalOperating), 150, yPosition, { align: 'right' });
    yPosition += 15;

    // Net cash flow
    doc.setFontSize(11);
    const netCashFlow = data.cash_flow_statement.net_cash_flow;
    const isPositive = netCashFlow >= 0;
    doc.setTextColor(isPositive ? 0 : 255, 0, 0);
    doc.text('ARUS KAS BERSIH:', 30, yPosition);
    doc.text(formatCurrency(Math.abs(netCashFlow)), 150, yPosition, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    yPosition += 10;

    // Cash position
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Saldo Kas Awal:', 30, yPosition);
    doc.text(formatCurrency(data.cash_flow_statement.beginning_cash), 150, yPosition, { align: 'right' });
    yPosition += 6;
    doc.text('Saldo Kas Akhir:', 30, yPosition);
    doc.text(formatCurrency(data.cash_flow_statement.ending_cash), 150, yPosition, { align: 'right' });

    addPDFFooter(doc, 1);
    doc.save('Arus_Kas_' + new Date().toISOString().split('T')[0] + '.pdf');
}
