// Dashboard management module
// Handles dashboard content loading, data calculations, and HTML rendering

import { supabase } from './config.js';
import { formatCurrency } from './utils.js';
import { calculateTotalSaldo } from './utils/balance-calculations.js';

// Dashboard functions
async function loadDashboard() {
    const contentDiv = document.getElementById('dashboard-content');

    try {
        // Get summary statistics
        const [totalHunian, hunianKosong, hunianBerpenghuni, perluPerhatianAdministrasi] = await Promise.all([
            getTotalHunian(),
            getHunianKosong(),
            getHunianBerpenghuni(),
            getPerluPerhatianAdministrasi()
        ]);

        // Calculate total balance and check consistency
        const { total: totalSaldo, consistency: saldoConsistency } = await calculateTotalSaldo();

        // Create dashboard HTML - ultra compact for mobile
        const dashboardHtml = createDashboardHtml({
            totalHunian,
            hunianKosong,
            hunianBerpenghuni,
            perluPerhatianAdministrasi,
            totalSaldo,
            saldoConsistency
        });

        contentDiv.innerHTML = dashboardHtml;

    } catch (error) {
        console.error('Error loading dashboard:', error);
        contentDiv.innerHTML = '<div class="alert alert-danger">Error loading dashboard data</div>';
    }
}

function createDashboardHtml(data) {
    return `
        <div class="welcome-message mb-4">
            <h4>Sistem Informasi Blok H Cikeas Gardenia</h4>
        </div>
        <div class="row g-4">
            <div class="col-md-6 col-lg-3">
                <div class="card text-center h-100">
                    <div class="card-body py-1 px-1 py-sm-2 px-sm-2 py-md-3 px-md-3">
                        <div class="card-title">
                            <i class="bi bi-house-door fs-2 fs-md-1 text-primary"></i>
                        </div>
                        <h5 class="card-title fs-6 fs-md-5">Total Hunian</h5>
                        <p class="card-text fs-4 fs-md-3 fw-bold text-primary">${data.totalHunian}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-6 col-lg-3">
                <div class="card text-center h-100">
                    <div class="card-body py-1 px-1 py-sm-2 px-sm-2 py-md-3 px-md-3">
                        <div class="card-title">
                            <i class="bi bi-house-x fs-2 fs-md-1 text-danger"></i>
                        </div>
                        <h5 class="card-title fs-6 fs-md-5">Hunian Kosong</h5>
                        <p class="card-text fs-4 fs-md-3 fw-bold text-danger">${data.hunianKosong}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-6 col-lg-3">
                <div class="card text-center h-100">
                    <div class="card-body py-1 px-1 py-sm-2 px-sm-2 py-md-3 px-md-3">
                        <div class="card-title">
                            <i class="bi bi-house-check fs-2 fs-md-1 text-info"></i>
                        </div>
                        <h5 class="card-title fs-6 fs-md-5">Hunian Berpenghuni</h5>
                        <p class="card-text fs-4 fs-md-3 fw-bold text-info">${data.hunianBerpenghuni}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-6 col-lg-3">
                <div class="card text-center h-100">
                    <div class="card-body py-1 px-1 py-sm-2 px-sm-2 py-md-3 px-md-3">
                        <div class="card-title">
                            <i class="bi bi-exclamation-triangle fs-2 fs-md-1 text-warning"></i>
                        </div>
                        <h5 class="card-title fs-6 fs-md-5">Perlu Perhatian Administrasi</h5>
                        <p class="card-text fs-4 fs-md-3 fw-bold text-warning" style="cursor: pointer;" onclick="showPerluPerhatianDetail()">${data.perluPerhatianAdministrasi}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Dashboard data functions
async function getTotalHunian() {
    try {
        const { count, error } = await supabase
            .from('hunian')
            .select('*', { count: 'exact', head: true });

        return error ? 0 : count || 0;
    } catch (error) {
        console.error('Error getting total hunian:', error);
        return 0;
    }
}

async function getHunianKosong() {
    try {
        const { count, error } = await supabase
            .from('hunian')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'kosong');

        return error ? 0 : count || 0;
    } catch (error) {
        console.error('Error getting hunian kosong:', error);
        return 0;
    }
}

async function getHunianBerpenghuni() {
    try {
        const { count, error } = await supabase
            .from('hunian')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'berpenghuni');

        return error ? 0 : count || 0;
    } catch (error) {
        console.error('Error getting hunian berpenghuni:', error);
        return 0;
    }
}

async function getTotalPenghuni() {
    try {
        const { count, error } = await supabase
            .from('penghuni')
            .select('*', { count: 'exact', head: true });

        return error ? 0 : count || 0;
    } catch (error) {
        console.error('Error getting total penghuni:', error);
        return 0;
    }
}

async function getPerluPerhatianAdministrasi() {
    try {
        // Current date for calculations
        const currentDate = new Date();
        // 3 months from end of September period (6 Oct) = 6 Oct + 3 months = 6 Jan
        // But user said "means 6 Dec", so let's use 3 months from today for now
        const threeMonthsAgo = new Date(currentDate);
        threeMonthsAgo.setMonth(currentDate.getMonth() - 3);

        // Get last 3 periods
        const { data: periods, error: periodsError } = await supabase
            .from('periode')
            .select('id, nama_periode, nomor_urut')
            .order('nomor_urut', { ascending: false })
            .limit(3);

        if (periodsError) throw periodsError;
        const lastThreePeriodIds = periods.map(p => p.id);

        // Get IPL problematic households (condition a AND b)
        const { data: iplPayments, error: iplPaymentsError } = await supabase
            .from('tagihan_ipl_pembayaran')
            .select(`
                tanggal_alokasi,
                pemasukan:pemasukan_id (
                    hunian_id
                )
            `)
            .gte('tanggal_alokasi', threeMonthsAgo.toISOString().split('T')[0]);

        if (iplPaymentsError) throw iplPaymentsError;

        // Group IPL payments by household
        const iplPaymentMap = new Map();
        iplPayments.forEach(payment => {
            const hunianId = payment.pemasukan?.hunian_id;
            if (hunianId) {
                if (!iplPaymentMap.has(hunianId)) {
                    iplPaymentMap.set(hunianId, []);
                }
                iplPaymentMap.get(hunianId).push(payment);
            }
        });

        // Get ALL IPL bills for all households (to count total periods with bills)
        const { data: iplBills, error: iplBillsError } = await supabase
            .from('tagihan_ipl')
            .select('hunian_id, periode_id');

        if (iplBillsError) throw iplBillsError;

        // Group IPL bills by household and count unique periods
        const iplBillsMap = new Map();
        iplBills.forEach(bill => {
            const hunianId = bill.hunian_id;
            if (!iplBillsMap.has(hunianId)) {
                iplBillsMap.set(hunianId, new Set());
            }
            iplBillsMap.get(hunianId).add(bill.periode_id);
        });

        // Find households that meet IPL criteria (a AND b)
        const iplProblematicHouseholds = new Set();
        for (const [hunianId, periodsSet] of iplBillsMap) {
            // Check condition b: has bills in 4 or more periods
            const totalPeriodsWithBills = periodsSet.size;
            const hasBillsIn4OrMorePeriods = totalPeriodsWithBills >= 4;

            // Check condition a: no payments in last 3 months
            const hasRecentPayments = iplPaymentMap.has(hunianId);

            if (hasBillsIn4OrMorePeriods && !hasRecentPayments) {
                iplProblematicHouseholds.add(hunianId);
            }
        }

        // Get air problematic households (outstanding > 500,000)
        const { data: airOutstanding, error: airError } = await supabase
            .from('meteran_air_billing')
            .select('hunian_id, sisa_tagihan')
            .in('status', ['belum_bayar', 'sebagian'])
            .gt('sisa_tagihan', 0);

        if (airError) throw airError;

        // Group air outstanding by household and sum
        const airOutstandingMap = new Map();
        airOutstanding.forEach(record => {
            const hunianId = record.hunian_id;
            airOutstandingMap.set(hunianId, (airOutstandingMap.get(hunianId) || 0) + (record.sisa_tagihan || 0));
        });

        const airProblematicHouseholds = new Set();
        for (const [hunianId, totalOutstanding] of airOutstandingMap) {
            if (totalOutstanding > 500000) {
                airProblematicHouseholds.add(hunianId);
            }
        }

        // Get all households that are NOT empty (exclude 'kosong')
        const { data: occupiedHouseholds, error: occupiedError } = await supabase
            .from('hunian')
            .select('id')
            .neq('status', 'kosong');

        if (occupiedError) throw occupiedError;

        const occupiedHouseholdIds = new Set(occupiedHouseholds.map(h => h.id));

        // Filter problematic households to only include occupied houses
        const occupiedIPLProblematic = new Set([...iplProblematicHouseholds].filter(id => occupiedHouseholdIds.has(id)));
        const occupiedAirProblematic = new Set([...airProblematicHouseholds].filter(id => occupiedHouseholdIds.has(id)));

        // Combine both sets (union) - only occupied households
        const allProblematicHouseholds = new Set([...occupiedIPLProblematic, ...occupiedAirProblematic]);

        return allProblematicHouseholds.size;
    } catch (error) {
        console.error('Error getting perlu perhatian administrasi:', error);
        return 0;
    }
}

async function getPerluPerhatianDetail() {
    try {
        // Current date for calculations
        const currentDate = new Date();
        const threeMonthsAgo = new Date(currentDate);
        threeMonthsAgo.setMonth(currentDate.getMonth() - 3);

        // Get last 3 periods
        const { data: periods, error: periodsError } = await supabase
            .from('periode')
            .select('id, nama_periode, nomor_urut')
            .order('nomor_urut', { ascending: false })
            .limit(3);

        if (periodsError) throw periodsError;
        const lastThreePeriodIds = periods.map(p => p.id);

        // Get IPL problematic households (condition a AND b)
        const { data: iplPayments, error: iplPaymentsError } = await supabase
            .from('tagihan_ipl_pembayaran')
            .select(`
                tanggal_alokasi,
                pemasukan:pemasukan_id (
                    hunian_id
                )
            `)
            .gte('tanggal_alokasi', threeMonthsAgo.toISOString().split('T')[0]);

        if (iplPaymentsError) throw iplPaymentsError;

        // Group IPL payments by household
        const iplPaymentMap = new Map();
        iplPayments.forEach(payment => {
            const hunianId = payment.pemasukan?.hunian_id;
            if (hunianId) {
                if (!iplPaymentMap.has(hunianId)) {
                    iplPaymentMap.set(hunianId, []);
                }
                iplPaymentMap.get(hunianId).push(payment);
            }
        });

        // Get ALL IPL bills for all households (to count total periods with bills)
        const { data: iplBills, error: iplBillsError } = await supabase
            .from('tagihan_ipl')
            .select('hunian_id, periode_id, sisa_tagihan');

        if (iplBillsError) throw iplBillsError;

        // Group IPL bills by household and count unique periods
        const iplBillsMap = new Map();
        iplBills.forEach(bill => {
            const hunianId = bill.hunian_id;
            if (!iplBillsMap.has(hunianId)) {
                iplBillsMap.set(hunianId, { periods: new Set(), totalOutstanding: 0 });
            }
            iplBillsMap.get(hunianId).periods.add(bill.periode_id);
            iplBillsMap.get(hunianId).totalOutstanding += bill.sisa_tagihan || 0;
        });

        // Find households that meet IPL criteria (a AND b)
        const iplProblematicHouseholds = new Map();
        for (const [hunianId, data] of iplBillsMap) {
            // Check condition b: has bills in 4 or more periods
            const totalPeriodsWithBills = data.periods.size;
            const hasBillsIn4OrMorePeriods = totalPeriodsWithBills >= 4;

            // Check condition a: no payments in last 3 months
            const hasRecentPayments = iplPaymentMap.has(hunianId);

            if (hasBillsIn4OrMorePeriods && !hasRecentPayments) {
                iplProblematicHouseholds.set(hunianId, {
                    kategori: 'IPL',
                    detail: `Total tagihan IPL di ${totalPeriodsWithBills} periode: ${formatCurrency(data.totalOutstanding)}`
                });
            }
        }

        // Get air problematic households (outstanding > 500,000)
        const { data: airOutstanding, error: airError } = await supabase
            .from('meteran_air_billing')
            .select('hunian_id, sisa_tagihan')
            .in('status', ['belum_bayar', 'sebagian'])
            .gt('sisa_tagihan', 0);

        if (airError) throw airError;

        // Group air outstanding by household and sum
        const airOutstandingMap = new Map();
        airOutstanding.forEach(record => {
            const hunianId = record.hunian_id;
            airOutstandingMap.set(hunianId, (airOutstandingMap.get(hunianId) || 0) + (record.sisa_tagihan || 0));
        });

        const airProblematicHouseholds = new Map();
        for (const [hunianId, totalOutstanding] of airOutstandingMap) {
            if (totalOutstanding > 500000) {
                airProblematicHouseholds.set(hunianId, {
                    kategori: 'Air',
                    detail: `Tunggakan air : ${formatCurrency(totalOutstanding)}`
                });
            }
        }

        // Get all households that are NOT empty (exclude 'kosong')
        const { data: occupiedHouseholds, error: occupiedError } = await supabase
            .from('hunian')
            .select('id')
            .neq('status', 'kosong');

        if (occupiedError) throw occupiedError;

        const occupiedHouseholdIds = new Set(occupiedHouseholds.map(h => h.id));

        // Filter problematic households to only include occupied houses
        const occupiedIPLProblematic = new Map();
        const occupiedAirProblematic = new Map();

        // Filter IPL problematic households
        for (const [hunianId, data] of iplProblematicHouseholds) {
            if (occupiedHouseholdIds.has(hunianId)) {
                occupiedIPLProblematic.set(hunianId, data);
            }
        }

        // Filter air problematic households
        for (const [hunianId, airData] of airProblematicHouseholds) {
            if (occupiedHouseholdIds.has(hunianId)) {
                occupiedAirProblematic.set(hunianId, airData);
            }
        }

        // Combine both maps (merge for households that have both issues) - only occupied households
        const allProblematicHouseholds = new Map();

        // Add IPL problematic households
        for (const [hunianId, data] of occupiedIPLProblematic) {
            allProblematicHouseholds.set(hunianId, data);
        }

        // Add or merge air problematic households
        for (const [hunianId, airData] of occupiedAirProblematic) {
            if (allProblematicHouseholds.has(hunianId)) {
                // Merge both categories
                const existing = allProblematicHouseholds.get(hunianId);
                allProblematicHouseholds.set(hunianId, {
                    kategori: 'IPL + Air',
                    detail: `${existing.detail}, ${airData.detail}`
                });
            } else {
                allProblematicHouseholds.set(hunianId, airData);
            }
        }

        // Get household details for problematic households
        if (allProblematicHouseholds.size === 0) {
            return [];
        }

        const problematicHunianIds = Array.from(allProblematicHouseholds.keys());
        const { data: hunianDetails, error: hunianError } = await supabase
            .from('hunian')
            .select(`
                id,
                nomor_blok_rumah,
                penghuni_saat_ini:penghuni_saat_ini_id (
                    nama_kepala_keluarga
                )
            `)
            .in('id', problematicHunianIds);

        if (hunianError) throw hunianError;

        // Combine data
        const result = hunianDetails.map(hunian => ({
            id: hunian.id,
            nomor_blok_rumah: hunian.nomor_blok_rumah,
            nama_penghuni: hunian.penghuni_saat_ini?.nama_kepala_keluarga || '-',
            ...allProblematicHouseholds.get(hunian.id)
        }));

        return result;
    } catch (error) {
        console.error('Error getting perlu perhatian detail:', error);
        return [];
    }
}

async function showPerluPerhatianDetail() {
    try {
        const detailData = await getPerluPerhatianDetail();

        if (detailData.length === 0) {
            const { showToast } = await import('./utils.js');
            showToast('Tidak ada hunian yang perlu perhatian administrasi', 'info');
            return;
        }

        const { showModal } = await import('./ui.js');

        const modalContent = `
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>No.</th>
                            <th>No. Rumah</th>
                            <th>Penghuni</th>
                            <th>Kategori</th>
                            <th>Detail</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${detailData.map((item, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${item.nomor_blok_rumah}</td>
                                <td>${item.nama_penghuni}</td>
                                <td>
                                    <span class="badge bg-${item.kategori === 'IPL' ? 'warning' : item.kategori === 'Air' ? 'info' : 'danger'}">
                                        ${item.kategori}
                                    </span>
                                </td>
                                <td>${item.detail}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="mt-3 text-muted">
                <small>Total: ${detailData.length} hunian perlu perhatian administrasi</small>
            </div>
        `;

        showModal('Detail Hunian Perlu Perhatian Administrasi', modalContent);
    } catch (error) {
        console.error('Error showing perlu perhatian detail:', error);
        const { showToast } = await import('./utils.js');
        showToast('Error loading detail data', 'danger');
    }
}

export {
    loadDashboard,
    getTotalHunian,
    getHunianKosong,
    getHunianBerpenghuni,
    getTotalPenghuni,
    getPerluPerhatianAdministrasi,
    getPerluPerhatianDetail,
    showPerluPerhatianDetail
};

// Backward compatibility for global window functions
window.showPerluPerhatianDetail = showPerluPerhatianDetail;
