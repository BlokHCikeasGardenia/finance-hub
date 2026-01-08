# Testing Guide: Multiple Periode Same Category Implementation

## Prerequisites
1. Aplikasi sudah running di localhost
2. Supabase connection aktif
3. Database sudah ada data sample

---

## Step 1: Run Migration Script di Supabase

1. Buka Supabase Dashboard → SQL Editor
2. Copy script dari file: `migration-multiple-periode-same-kategori.sql`
3. Paste dan run di Supabase
4. Verify hasil dengan:
   ```sql
   -- Check if periode_list column exists
   SELECT column_name FROM information_schema.columns 
   WHERE table_name='pemasukan' AND column_name='periode_list';
   
   -- Check existing data migration
   SELECT id, periode_id, periode_list FROM pemasukan LIMIT 5;
   ```

---

## Step 2: Test Form Pemasukan - Create Multiple Periode

### Test Case 1: Buat pemasukan Air dengan multiple periode
1. Buka aplikasi di localhost
2. Navigate ke **Transaksi → Pemasukan**
3. Click **Tambah Pemasukan**
4. Isi form:
   - Tanggal: Hari ini
   - Nominal: 500.000
   - Kategori: **Air** (hanya Air, jangan gabung)
   - **Periode**: Pilih 2 periode (misal: Jan 2025 + Feb 2025)
   - Rekening: Pilih salah satu
   - Keterangan: "Pembayaran Air 2 bulan"
5. Click **Simpan**

**Expected Result:**
- ✅ Form menerima multiple periode selection
- ✅ Data tersimpan dengan `periode_list = [jan_id, feb_id]`
- ✅ Tidak ada error validation

### Test Case 2: Edit pemasukan existing dengan multiple periode
1. Buka pemasukan yang baru dibuat
2. Click **Edit**
3. Ubah periode → tambah/kurangi periode
4. Click **Update**

**Expected Result:**
- ✅ Form menampilkan periode yang sudah dipilih (checkboxes tercentang)
- ✅ Bisa tambah/kurangi periode
- ✅ Data tersimpan dengan benar

---

## Step 3: Test Rekap Air - Multiple Periode Counting

### Test Case 3: Verify rekap air mencount multiple periode pembayaran
1. Buka **Reports → Rekap Air**
2. Filter tahun yang sesuai
3. Check periode yang diisi dengan multiple periode pembayaran

**Expected Result:**
- ✅ Rekap air menampilkan pemasukan dari multiple periode pembayaran
- ✅ Nominal pembayaran tercounted dengan benar
- ✅ Detail pemasukan menunjukkan periode yang tercakup

### Debug Info (jika diperlukan):
Buka browser console (F12) dan check logs:
```javascript
// Rekap air query logs harus menunjukkan:
// "Loading Air bills (old format)"
// "Loading Air bills (new format)"
// "Filter new format payments to only those containing this period"
```

---

## Step 4: Test Pemasukan Table Display

### Test Case 4: Display single dan multiple periode di tabel
1. Buka **Transaksi → Pemasukan**
2. Cek kolom **Periode** untuk berbagai pemasukan:

**Expected Result:**
- ✅ Single periode: `Jan 2025` (badge tunggal)
- ✅ Multiple periode: `Multiple ⓘ` (badge with icon)
- ✅ Click "Multiple ⓘ" → tampilkan detail periode dalam modal

---

## Step 5: Test Backward Compatibility

### Test Case 5: Old records dengan periode_id masih berfungsi
1. Buka pemasukan lama yang punya `periode_id` tunggal
2. View di tabel → harus tampil dengan benar
3. Click edit → form harus support old format
4. Rekap air harus tetap counting old format records

**Expected Result:**
- ✅ Old records tidak ada masalah
- ✅ Bisa view/edit tanpa error
- ✅ Rekap tetap akurat untuk old records

---

## Step 6: Test Payment Form (Optional)

### Test Case 6: Create payment dengan multiple periode
1. Buka **Pembayaran**
2. Select rumah dengan tagihan Air
3. Select kategori Air
4. Click "Lihat Tagihan"
5. Select multiple tagihan (dari periode berbeda)
6. Click "Proses Pembayaran"
7. Isi form dan submit

**Expected Result:**
- ✅ Pembayaran bisa handle multiple periode tagihan
- ✅ Allocation tertambah untuk setiap periode
- ✅ Rekap air update dengan benar

---

## Troubleshooting

### Issue: Periode Multi-Select tidak muncul di form
**Solution:**
- Clear browser cache (Ctrl+Shift+Delete)
- Reload halaman
- Check browser console untuk error

### Issue: Multiple periode tidak tersimpan
**Solution:**
- Check Supabase connection aktif
- Verify migration script sudah run
- Check browser network tab untuk error response

### Issue: Rekap air tidak counting multiple periode
**Solution:**
- Open developer console (F12)
- Check console logs untuk error
- Verify periode_list data di Supabase dengan:
  ```sql
  SELECT periode_list FROM pemasukan WHERE periode_list IS NOT NULL LIMIT 5;
  ```

### Issue: "Multiple ⓘ" tidak clickable
**Solution:**
- Check pemasukan-table.js sudah update
- Verify cache cleared
- Check console untuk error

---

## Quick Checklist

Before marking as "Ready for Production":

- [ ] Migration script executed successfully
- [ ] Can create pemasukan dengan multiple periode
- [ ] Can edit dan update multiple periode
- [ ] Rekap air mencount multiple periode dengan benar
- [ ] Single periode still works (backward compatible)
- [ ] Old records tidak ada masalah
- [ ] Payment form support multiple periode
- [ ] Pemasukan table display correct
- [ ] No errors di browser console
- [ ] No errors di Supabase logs

---

## Notes for Production Deployment

1. **Backup database** sebelum run migration
2. **Run migration di staging dulu** jika ada data besar
3. **Monitor performance** setelah deployment
4. **Keep periode_id field** untuk backward compatibility beberapa bulan
5. **Communicate change** ke users tentang multiple periode feature

---

## Contact/Support
Jika ada issue, check:
1. Browser console (F12)
2. Network tab untuk error responses
3. Supabase logs
4. File: `IMPLEMENTATION_NOTES_MULTIPLE_PERIODE.md`
