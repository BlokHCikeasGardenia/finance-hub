# Testing Plan - Multiple Periode Same Kategori Implementation

## Pre-Testing Checklist
- [x] Migration script berhasil (periode_list column added)
- [x] Data migration berhasil (1 record migrated from periode_id to periode_list)
- [x] Code changes deployed to localhost
- [x] Payment form refactored (no kategori selector, auto-load bills, auto-split logic)

## Test Scenarios

### Test 1: Payment Form - Basic Auto-Load
**Objective:** Verify household selection auto-loads all bills (IPL + Air)

**Steps:**
1. Open pembayaran form
2. Select a household that has outstanding IPL and Air bills
3. Verify both IPL and Air bills appear in the list mixed together
4. Check that kategori selector is gone (removed from UI)

**Expected Result:**
- All bills (IPL + Air) appear in single list
- No kategori dropdown selector
- Bills show correct `sisa_tagihan` amounts

**Pass/Fail:** [ ]

---

### Test 2: Payment Form - Auto-Split on Submit
**Objective:** Verify payment automatically splits into 2 separate pemasukan (IPL & Air)

**Steps:**
1. Select mixed bills (1 IPL + 1 Air)
2. Enter payment amount covering both
3. Submit form
4. Check pemasukan table for new records

**Expected Result:**
- 2 pemasukan created (not 1):
  - 1 for IPL with `kategori_id` = IPL category
  - 1 for Air with `kategori_id` = Air category
- Each has correct `nominal` (amount paid for that type)
- Each has `periode_list` populated (can be multiple periode if needed)
- Both have same `id_transaksi`
- Both allocated to their respective bills

**Pass/Fail:** [ ]

**Query to verify:**
```sql
SELECT 
    id, 
    tanggal, 
    kategori_id, 
    nominal, 
    periode_list,
    id_transaksi
FROM pemasukan
WHERE tanggal = CURRENT_DATE
ORDER BY id_transaksi;
```

---

### Test 3: Multiple Periode in Single Payment
**Objective:** Verify payment covering multiple periode for same kategori stores all periode IDs

**Steps:**
1. Select household with multiple unpaid periods for Air (e.g., Jan + Feb + Mar)
2. Select all those Air bills
3. Submit payment
4. Check `periode_list` field for the Air pemasukan created

**Expected Result:**
- Single pemasukan created for Air
- `periode_list` contains 3 UUID elements (for 3 periods)
- `jumlah_periode` = 3
- Keterangan shows "(3 periode)"

**Pass/Fail:** [ ]

**Query to verify:**
```sql
SELECT 
    id,
    kategori_id,
    periode_list,
    array_length(periode_list, 1) as jumlah_periode,
    keterangan
FROM pemasukan
WHERE id = 'recently-created-payment-id';
```

---

### Test 4: Rekap Air Report
**Objective:** Verify air report correctly counts payments with new periode_list format

**Steps:**
1. Generate "Rekap Air" report for current period
2. Verify total matches actual bills paid in that period
3. Compare with payment records to ensure all counted

**Expected Result:**
- Rekap air correctly counts both:
  - Old format payments (single `periode_id`)
  - New format payments (with `periode_list`)
- Total air payments match database

**Pass/Fail:** [ ]

**Note:** If rekap shows wrong total, check air.js query logic for `periode_list` handling

---

### Test 5: Bill Allocation Status
**Objective:** Verify bills show as "Terbayar" (paid) after auto-split payment

**Steps:**
1. Make mixed payment (IPL + Air)
2. Check bill status in both IPL and Air tables
3. Verify allocation records created correctly

**Expected Result:**
- IPL bills marked as paid in `tagihan_ipl` table
- Air bills marked as paid in `meteran_air_billing` table
- Allocation records show correct pemasukan IDs
- Bills show complete payment status

**Pass/Fail:** [ ]

---

### Test 6: Backward Compatibility
**Objective:** Verify old payment records (with periode_id) still work correctly

**Steps:**
1. Open pemasukan table
2. Find record with old format (periode_id populated, periode_list empty)
3. Display it in form/table - verify no errors
4. Check if it displays correctly in rekap air report

**Expected Result:**
- Old records display without errors
- Rekap air correctly counts old format records
- No data loss or display issues

**Pass/Fail:** [ ]

---

### Test 7: Edge Cases

#### 7a: Payment with only IPL (no Air)
- Select only IPL bills
- Submit
- Expect: 1 pemasukan created (IPL only, no Air pemasukan)

**Pass/Fail:** [ ]

#### 7b: Payment with only Air (no IPL)
- Select only Air bills
- Submit
- Expect: 1 pemasukan created (Air only, no IPL pemasukan)

**Pass/Fail:** [ ]

#### 7c: Single period payment
- Select 1 IPL bill for 1 period
- Submit
- Expect: `periode_list` array with 1 element (not empty)

**Pass/Fail:** [ ]

---

## Data Validation Queries

Run these after each test to validate data integrity:

```sql
-- Check last created payments
SELECT 
    id,
    tanggal,
    kategori_id,
    nominal,
    periode_list,
    array_length(periode_list, 1) as jumlah_periode,
    keterangan
FROM pemasukan
WHERE tanggal >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY tanggal DESC, created_at DESC
LIMIT 10;

-- Check allocation consistency
SELECT 
    p.id as pemasukan_id,
    p.kategori_id,
    COUNT(DISTINCT pa.tagihan_ipl_id) as ipl_allocations,
    COUNT(DISTINCT pa.meteran_air_billing_id) as air_allocations,
    p.periode_list,
    array_length(p.periode_list, 1) as periode_count
FROM pemasukan p
LEFT JOIN pemasukan_allocation pa ON p.id = pa.pemasukan_id
WHERE p.tanggal >= CURRENT_DATE - INTERVAL '1 day'
GROUP BY p.id, p.kategori_id, p.periode_list
ORDER BY p.tanggal DESC;
```

---

## Test Summary

| # | Test Scenario | Status | Notes |
|---|---|---|---|
| 1 | Auto-load bills (IPL + Air) | [ ] | |
| 2 | Auto-split into 2 pemasukan | [ ] | |
| 3 | Multiple periode in single payment | [ ] | |
| 4 | Rekap air report accuracy | [ ] | |
| 5 | Bill allocation status | [ ] | |
| 6 | Backward compatibility | [ ] | |
| 7a | IPL only payment | [ ] | |
| 7b | Air only payment | [ ] | |
| 7c | Single period payment | [ ] | |

---

## Issues Found & Fixes

(Record any issues and their resolutions here)

