import { formatCurrency, formatDate } from '../utils.js';

let allAccounts = [];

export async function loadMutasiRekening() {
    const contentDiv = document.getElementById('mutasi_rekening-content');

    // UI skeleton
    contentDiv.innerHTML = `
        <div class="row">
            <div class="col-12">
                <h3>Mutasi Saldo per Rekening</h3>
                <p class="text-muted">Lacak aliran dana masuk dan keluar untuk setiap rekening beserta saldo berjalannya.</p>
                
                <div class="card mb-4 shadow-sm border-0">
                    <div class="card-body bg-light">
                        <div class="row g-3 align-items-end">
                            <div class="col-md-4">
                                <label for="mutasi-rekening-select" class="form-label fw-bold">Pilih Rekening:</label>
                                <select class="form-select border-primary" id="mutasi-rekening-select">
                                    <option value="">Memuat rekening...</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label for="mutasi-date-from" class="form-label fw-bold">Dari Tanggal (Opsional):</label>
                                <input type="date" class="form-control" id="mutasi-date-from">
                            </div>
                            <div class="col-md-3">
                                <label for="mutasi-date-to" class="form-label fw-bold">Sampai Tanggal (Opsional):</label>
                                <input type="date" class="form-control" id="mutasi-date-to">
                            </div>
                            <div class="col-md-2">
                                <button class="btn btn-primary w-100 fw-bold" id="btn-load-mutasi">
                                    <i class="bi bi-search"></i> Tampilkan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="mutasi-result-container">
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle me-2"></i>Silakan pilih rekening dan klik Tampilkan untuk melihat mutasi.
                    </div>
                </div>
            </div>
        </div>
    `;

    // Load accounts
    try {
        const { data: accounts, error } = await supabase
            .from('rekening')
            .select('*')
            .order('jenis_rekening');
            
        if (error) throw error;
        allAccounts = accounts || [];
        
        const select = document.getElementById('mutasi-rekening-select');
        select.innerHTML = '<option value="">-- Pilih Rekening --</option>' + 
            allAccounts.map(a => `<option value="${a.id}">${a.jenis_rekening}</option>`).join('');
            
    } catch (err) {
        console.error('Error loading accounts:', err);
        document.getElementById('mutasi-rekening-select').innerHTML = '<option value="">Gagal memuat data</option>';
    }

    document.getElementById('btn-load-mutasi').addEventListener('click', fetchAndRenderMutasi);
}

async function fetchAndRenderMutasi() {
    const rekeningId = document.getElementById('mutasi-rekening-select').value;
    const dateFrom = document.getElementById('mutasi-date-from').value;
    const dateTo = document.getElementById('mutasi-date-to').value;
    const resultContainer = document.getElementById('mutasi-result-container');

    if (!rekeningId) {
        alert('Silakan pilih rekening terlebih dahulu.');
        return;
    }

    const selectedAccount = allAccounts.find(a => a.id === rekeningId);
    if (!selectedAccount) return;

    resultContainer.innerHTML = '<div class="text-center my-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2 text-muted">Memuat data mutasi...</p></div>';

    try {
        // Fetch Pemasukan
        let queryPemasukan = supabase.from('pemasukan').select('id_transaksi, tanggal, nominal, keterangan').eq('rekening_id', rekeningId);
        if (dateFrom) queryPemasukan = queryPemasukan.gte('tanggal', dateFrom);
        if (dateTo) queryPemasukan = queryPemasukan.lte('tanggal', dateTo);
        const { data: dataPemasukan, error: errPem } = await queryPemasukan;
        if (errPem) throw errPem;

        // Fetch Pengeluaran
        let queryPengeluaran = supabase.from('pengeluaran').select('id_transaksi, tanggal, nominal, keterangan, penerima').eq('rekening_id', rekeningId);
        if (dateFrom) queryPengeluaran = queryPengeluaran.gte('tanggal', dateFrom);
        if (dateTo) queryPengeluaran = queryPengeluaran.lte('tanggal', dateTo);
        const { data: dataPengeluaran, error: errPeng } = await queryPengeluaran;
        if (errPeng) throw errPeng;

        // Fetch Pemindahbukuan (Keluar / Dari)
        let queryTransferKeluar = supabase.from('pemindahbukuan').select('id_transaksi, tanggal, nominal, catatan').eq('rekening_dari_id', rekeningId);
        if (dateFrom) queryTransferKeluar = queryTransferKeluar.gte('tanggal', dateFrom);
        if (dateTo) queryTransferKeluar = queryTransferKeluar.lte('tanggal', dateTo);
        const { data: dataTransferKeluar, error: errTk } = await queryTransferKeluar;
        if (errTk) throw errTk;

        // Fetch Pemindahbukuan (Masuk / Ke)
        let queryTransferMasuk = supabase.from('pemindahbukuan').select('id_transaksi, tanggal, nominal, catatan').eq('rekening_ke_id', rekeningId);
        if (dateFrom) queryTransferMasuk = queryTransferMasuk.gte('tanggal', dateFrom);
        if (dateTo) queryTransferMasuk = queryTransferMasuk.lte('tanggal', dateTo);
        const { data: dataTransferMasuk, error: errTm } = await queryTransferMasuk;
        if (errTm) throw errTm;

        // Fetch Dana Titipan
        let queryDanaTitipan = supabase.from('dana_titipan').select('id_transaksi, tanggal, nominal, keterangan').eq('rekening_id', rekeningId);
        if (dateFrom) queryDanaTitipan = queryDanaTitipan.gte('tanggal', dateFrom);
        if (dateTo) queryDanaTitipan = queryDanaTitipan.lte('tanggal', dateTo);
        const { data: dataDanaTitipan, error: errDt } = await queryDanaTitipan;
        if (errDt) throw errDt;

        // Combine all transactions
        const transactions = [];

        (dataPemasukan || []).forEach(t => {
            transactions.push({
                tanggal: t.tanggal,
                id_transaksi: t.id_transaksi,
                jenis: 'Pemasukan',
                keterangan: t.keterangan || '-',
                masuk: parseFloat(t.nominal),
                keluar: 0
            });
        });

        (dataPengeluaran || []).forEach(t => {
            transactions.push({
                tanggal: t.tanggal,
                id_transaksi: t.id_transaksi,
                jenis: 'Pengeluaran',
                keterangan: (t.keterangan || '') + (t.penerima ? ` (Penerima: ${t.penerima})` : ''),
                masuk: 0,
                keluar: parseFloat(t.nominal)
            });
        });

        (dataTransferMasuk || []).forEach(t => {
            transactions.push({
                tanggal: t.tanggal,
                id_transaksi: t.id_transaksi,
                jenis: 'Transfer Masuk',
                keterangan: t.catatan || 'Pemindahbukuan Masuk',
                masuk: parseFloat(t.nominal),
                keluar: 0
            });
        });

        (dataTransferKeluar || []).forEach(t => {
            transactions.push({
                tanggal: t.tanggal,
                id_transaksi: t.id_transaksi,
                jenis: 'Transfer Keluar',
                keterangan: t.catatan || 'Pemindahbukuan Keluar',
                masuk: 0,
                keluar: parseFloat(t.nominal)
            });
        });

        (dataDanaTitipan || []).forEach(t => {
            transactions.push({
                tanggal: t.tanggal,
                id_transaksi: t.id_transaksi,
                jenis: 'Dana Titipan',
                keterangan: t.keterangan || 'Dana Titipan Masuk',
                masuk: parseFloat(t.nominal),
                keluar: 0
            });
        });

        // Sort transactions chronologically
        transactions.sort((a, b) => {
            if (a.tanggal !== b.tanggal) {
                return new Date(a.tanggal) - new Date(b.tanggal);
            }
            // Secondary sort by ID if same date
            return a.id_transaksi.localeCompare(b.id_transaksi);
        });

        // Calculate the "Saldo Awal Periode" if dateFrom is specified
        let baseSaldo = parseFloat(selectedAccount.saldo_awal || 0);
        
        if (dateFrom) {
            // Fetch transactions strictly before dateFrom to calculate starting balance
            const { data: prePem } = await supabase.from('pemasukan').select('nominal').eq('rekening_id', rekeningId).lt('tanggal', dateFrom);
            const { data: prePeng } = await supabase.from('pengeluaran').select('nominal').eq('rekening_id', rekeningId).lt('tanggal', dateFrom);
            const { data: preTm } = await supabase.from('pemindahbukuan').select('nominal').eq('rekening_ke_id', rekeningId).lt('tanggal', dateFrom);
            const { data: preTk } = await supabase.from('pemindahbukuan').select('nominal').eq('rekening_dari_id', rekeningId).lt('tanggal', dateFrom);
            const { data: preDt } = await supabase.from('dana_titipan').select('nominal').eq('rekening_id', rekeningId).lt('tanggal', dateFrom);

            const sumMasuk = (prePem||[]).reduce((sum, item) => sum + parseFloat(item.nominal), 0) + 
                             (preTm||[]).reduce((sum, item) => sum + parseFloat(item.nominal), 0) +
                             (preDt||[]).reduce((sum, item) => sum + parseFloat(item.nominal), 0);
                             
            const sumKeluar = (prePeng||[]).reduce((sum, item) => sum + parseFloat(item.nominal), 0) + 
                              (preTk||[]).reduce((sum, item) => sum + parseFloat(item.nominal), 0);
                              
            baseSaldo = baseSaldo + sumMasuk - sumKeluar;
        }

        let currentBalance = baseSaldo;
        
        // Calculate running balance for displayed transactions (Ascending)
        transactions.forEach(t => {
            currentBalance += t.masuk;
            currentBalance -= t.keluar;
            t.saldo_berjalan = currentBalance;
        });

        // Reverse for display (newest first is usually better for mutations)
        transactions.reverse();

        // Render table
        let html = `
            <div class="card shadow border-0">
                <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center py-3">
                    <h5 class="mb-0 fw-bold"><i class="bi bi-wallet2 me-2"></i> Mutasi: ${selectedAccount.jenis_rekening}</h5>
                    <span class="badge bg-light text-dark fs-6 shadow-sm">Saldo Akhir: ${formatCurrency(currentBalance)}</span>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover table-striped mb-0 align-middle">
                            <thead class="table-dark">
                                <tr>
                                    <th class="ps-3">Tanggal</th>
                                    <th>ID Transaksi</th>
                                    <th>Jenis</th>
                                    <th style="max-width: 250px;">Keterangan</th>
                                    <th class="text-end">Masuk</th>
                                    <th class="text-end">Keluar</th>
                                    <th class="text-end pe-3">Saldo Berjalan</th>
                                </tr>
                            </thead>
                            <tbody>
        `;

        if (transactions.length === 0) {
            html += `<tr><td colspan="7" class="text-center py-5 text-muted"><i class="bi bi-inbox fs-2 d-block mb-2"></i> Tidak ada transaksi pada periode ini.</td></tr>`;
        } else {
            transactions.forEach(t => {
                html += `
                    <tr>
                        <td class="ps-3">${formatDate(t.tanggal)}</td>
                        <td><span class="badge bg-secondary font-monospace">${t.id_transaksi}</span></td>
                        <td>${getJenisBadge(t.jenis)}</td>
                        <td class="text-truncate" style="max-width: 250px;" title="${t.keterangan}">${t.keterangan}</td>
                        <td class="text-end text-success fw-semibold">${t.masuk > 0 ? '+ ' + formatCurrency(t.masuk) : '-'}</td>
                        <td class="text-end text-danger fw-semibold">${t.keluar > 0 ? '- ' + formatCurrency(t.keluar) : '-'}</td>
                        <td class="text-end pe-3 fw-bold bg-light">${formatCurrency(t.saldo_berjalan)}</td>
                    </tr>
                `;
            });
        }
        
        // Add starting balance row at the very bottom
        html += `
                            <tr class="table-info border-top border-primary border-2">
                                <td colspan="4" class="text-end fw-bold py-3">Saldo Awal ${dateFrom ? 'Periode' : 'Rekening'}:</td>
                                <td colspan="2"></td>
                                <td class="text-end fw-bold pe-3 py-3">${formatCurrency(baseSaldo)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `;

        resultContainer.innerHTML = html;

    } catch (err) {
        console.error('Error fetching mutasi:', err);
        resultContainer.innerHTML = `<div class="alert alert-danger"><i class="bi bi-exclamation-triangle me-2"></i> Terjadi kesalahan saat memuat data: ${err.message}</div>`;
    }
}

function getJenisBadge(jenis) {
    switch (jenis) {
        case 'Pemasukan': return '<span class="badge bg-success bg-opacity-75"><i class="bi bi-arrow-down-left-circle me-1"></i>Pemasukan</span>';
        case 'Pengeluaran': return '<span class="badge bg-danger bg-opacity-75"><i class="bi bi-arrow-up-right-circle me-1"></i>Pengeluaran</span>';
        case 'Transfer Masuk': return '<span class="badge bg-info text-dark bg-opacity-75"><i class="bi bi-box-arrow-in-right me-1"></i>Transfer Masuk</span>';
        case 'Transfer Keluar': return '<span class="badge bg-warning text-dark bg-opacity-75"><i class="bi bi-box-arrow-right me-1"></i>Transfer Keluar</span>';
        case 'Dana Titipan': return '<span class="badge bg-primary bg-opacity-75"><i class="bi bi-safe me-1"></i>Dana Titipan</span>';
        default: return `<span class="badge bg-secondary">${jenis}</span>`;
    }
}
