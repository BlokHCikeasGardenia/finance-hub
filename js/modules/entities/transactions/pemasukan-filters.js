// Pemasukan display module
// Handles displaying pemasukan data (no filtering, searching, or sorting)

import {
    getPemasukanState,
    setPemasukanState
} from './pemasukan-data.js';
import { displayPemasukanTable } from './pemasukan-table.js';
import { formatCurrency } from '../../utils.js';

// Filter and display pemasukan data (no filtering - show all data)
async function filterAndDisplayPemasukan(isFilterChange = true, pageOverride = null) {
    const state = getPemasukanState();
    const data = [...state.pemasukanData];

    // Update total count display
    const totalNominal = data.reduce((sum, item) => sum + (item.nominal || 0), 0);
    const totalCountElement = document.getElementById('pemasukan-total-count');
    const totalNominalElement = document.getElementById('pemasukan-total-nominal');

    if (totalCountElement) totalCountElement.textContent = `${data.length} transaksi`;
    if (totalNominalElement) totalNominalElement.textContent = `Total: ${formatCurrency(totalNominal)}`;

    // Update filtered count in state
    setPemasukanState({ pemasukanFilteredCount: data.length });

    // Display all data (no filtering, no sorting, no pagination)
    await displayPemasukanTable(data);
}

export {
    filterAndDisplayPemasukan
};
