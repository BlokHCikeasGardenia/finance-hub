# Multiple Periode Same Category Implementation
Date: January 8, 2026

## Overview
Mengubah konsep multiple periode dari "gabungan kategori berbeda dalam satu record" menjadi "multiple periode untuk kategori yang sama dalam satu record".

### Problem Sebelumnya
- Pemasukan dengan kategori gabungan (Air+IPL) tidak terhitung di rekap air
- Rekap air hanya mencari `kategori_id = 'Air'` (kategori murni)
- Pemasukan yang kategorinya gabung tidak terdeteksi dalam filter kategoris

### Solusi Baru
- Tambah kolom `periode_list` (ARRAY UUID) di tabel pemasukan
- Setiap pemasukan hanya punya 1 kategori
- 1 pemasukan bisa mencakup multiple periode untuk kategori yang sama
- Contoh: Pembayaran Air Jan-Feb = 1 record dengan `kategori_id='Air'`, `periode_list=[jan_id, feb_id]`

---

## Database Changes

### File: `migration-multiple-periode-same-kategori.sql`
- Tambah kolom `periode_list UUID[]` ke tabel pemasukan
- Migrate data existing dari `periode_id` ke `periode_list`
- Create index GIN untuk fast array queries
- Create helper view `v_pemasukan_detail`

### File: `database-schema.sql`
- Update struktur tabel pemasukan dengan kolom `periode_list`
- Maintain backward compatibility dengan `periode_id`

---

## Backend Changes

### File: `js/modules/entities/transactions/pemasukan-form.js`

#### New Component: `PeriodeMultiSelect`
```javascript
class PeriodeMultiSelect {
    - Render checkboxes untuk multiple periode selection
    - setValues(periodeIds) - set multiple periode selected
    - getValues() - return array of selected periode IDs
    - getSelectedText() - return string display of selected periode
}
```

#### Updated Functions
- `createPemasukanFormHtml()` - Ubah single periode dropdown menjadi multi-select checkbox area
- `initializePemasukanFormSelects()` - Initialize PeriodeMultiSelect component
- `populatePemasukanFormValues()` - Support both old periode_id dan new periode_list
- `collectPemasukanFormData()` - Return periode_list array instead of single periode_id

### File: `js/modules/entities/transactions/pemasukan-data.js`
- Update `loadPemasukan()` - Include `periode_list` dalam select query
- CRUD functions (`addPemasukan`, `updatePemasukan`) - Already generic, no changes needed

### File: `js/modules/entities/transactions/pemasukan-table.js`

#### Updated Functions
- `getPeriodeData(pemasukanId, pemasukanRecord)` - 
  - NEW: Check periode_list in record first
  - FALLBACK: Query allocations untuk backward compatibility
  - Load periode names dari periode_list IDs
  
- `loadPemasukanPeriodeData(items)` - Pass record to getPeriodeData()

### File: `js/modules/views/reports/air.js`

#### Updated Query: `loadViewRekapAir()`
Query pemasukan dengan dua approach:
1. Old format: `periode_id = period.id` (backward compatible)
2. New format: `periode_list contains period.id` (new functionality)

Filter di JavaScript untuk handle array contains dalam periode_list:
```javascript
periodPayments = allPaymentsNew.filter(payment => 
    payment.periode_list?.includes(period.id)
)
```

---

## UI Changes

### Pemasukan Form
- Replace single periode dropdown dengan multi-select checkboxes
- Display "Pilih satu atau lebih periode yang sama kategori"
- Support both old dan new format saat editing

### Pemasukan Table
- Display single periode: `Jan 2025`
- Display multiple periode: `Multiple ⓘ` (clickable untuk detail)

### Payment Form
- Tidak ada perubahan signifikan
- Support allocation untuk pembayaran dengan multiple periode

---

## Backward Compatibility

✅ Old data tetap compatible:
- Query lama dengan `periode_id` masih bekerja
- getPeriodeData() fallback ke lookup allocations jika tidak ada periode_list
- Form support editing dengan old format (periode_id)

✅ Migration path:
- New records → use periode_list
- Old records → continue using periode_id
- Tidak perlu force migration old data immediately

---

## Testing Checklist

- [ ] Run migration script di Supabase
- [ ] Test create pemasukan dengan multiple periode
- [ ] Test edit pemasukan dengan multiple periode  
- [ ] Test rekap air menampilkan pembayaran dari periode_list
- [ ] Test backward compatibility dengan old periode_id records
- [ ] Test payment allocation dengan multiple periode
- [ ] Test pemasukan table display multiple periode dengan badge
- [ ] Test all categories: Air, IPL, Aula, Lainnya

---

## Future Enhancements

1. Data migration script untuk convert old format ke new format
2. UI warning jika user mencoba gabung kategori berbeda
3. Smart auto-fill kategori saat select periode
4. Bulk import pemasukan dengan multiple periode
5. Reporting untuk tracking multiple periode payments
