# Implementasi Perubahan IPL Dibayar di Muka

## Ringkasan Perubahan

Perubahan ini menggantikan logika perhitungan IPL Dibayar di Muka dari menggunakan filter nominal (60.000) menjadi menggunakan tipe tarif (IPL Normal) dan dari perkalian hardcoded (55.000) menjadi tarif IPL yang berlaku saat ini.

## Perubahan yang Dilakukan

### 1. File `js/modules/views/reports/rekap-ipl.js`

#### Penambahan Fungsi Helper
```javascript
// Helper function to get current IPL tariff for advance payment calculation
async function getCurrentIplTariffForAdvancePayment() {
    // Mengambil tarif IPL Normal yang aktif berdasarkan tanggal saat ini
    // Mengembalikan nilai nominal penuh (tanpa dikurangi DAU)
}
```

#### Perubahan Query Filter
```javascript
// Sebelum:
.eq('nominal_tagihan', 60000)

// Sesudah:
.eq('type_tarif', 'IPL')
```

#### Perubahan Perhitungan Nominal
```javascript
// Sebelum:
const nominal = jumlah_bulan * 55000;

// Sesudah:
const nominal = jumlah_bulan * currentIplTariff;
```

### 2. File `js/modules/entities/transactions/tagihan_ipl-data.js`

#### Penambahan Field type_tarif
```javascript
const tagihanData = {
    // ... field lainnya
    type_tarif: iplType,  // Menambahkan field type_tarif
    // ... field lainnya
};
```

### 3. Database Migration (`database-migration-ipl-type.sql`)

#### Penambahan Kolom
```sql
ALTER TABLE tagihan_ipl ADD COLUMN type_tarif VARCHAR(50);
```

#### Update Data Existing
```sql
-- Update berdasarkan nilai nominal
UPDATE tagihan_ipl SET type_tarif = 'IPL' WHERE nominal_tagihan = 60000;
UPDATE tagihan_ipl SET type_tarif = 'IPL_RUMAH_KOSONG' WHERE nominal_tagihan = 30000;
UPDATE tagihan_ipl SET type_tarif = 'DAU' WHERE nominal_tagihan = 5000;
```

#### Penambahan Index
```sql
CREATE INDEX idx_tagihan_ipl_type_tarif ON tagihan_ipl(type_tarif);
```

## Keuntungan Perubahan

### 1. Lebih Semantik
- Filter menggunakan tipe tarif (`IPL`) lebih jelas daripada nilai nominal (`60000`)
- Intent bisnis lebih mudah dipahami oleh developer

### 2. Lebih Fleksibel
- Otomatis menyesuaikan jika tarif IPL Normal berubah
- Tidak perlu manual update jika RT menaikkan/turunkan tarif

### 3. Lebih Akurat
- Perhitungan nominal disimpan menggunakan tarif resmi yang berlaku
- Konsisten dengan kebijakan tarif RT

### 4. Lebih Sustainable
- Sistem lebih mudah dipelihara dan dikembangkan
- Mengurangi ketergantungan pada nilai hardcoded

## Contoh Perhitungan

### Sebelum Perubahan
```
Tarif IPL Normal: 60.000
DAU: 5.000
IPL Disimpan: 55.000 (hardcoded)

Pembayaran di muka: 2 bulan
Nominal disimpan: 2 × 55.000 = 110.000
```

### Sesudah Perubahan
```
Tarif IPL Normal: 65.000 (berubah)
DAU: 5.000
IPL Disimpan: 65.000 (dinamis)

Pembayaran di muka: 2 bulan
Nominal disimpan: 2 × 65.000 = 130.000
```

## Langkah Implementasi

### 1. Jalankan Migrasi Database
```bash
psql -d your_database -f database-migration-ipl-type.sql
```

### 2. Deploy Perubahan Kode
- Deploy file `rekap-ipl.js` yang telah diupdate
- Deploy file `tagihan_ipl-data.js` yang telah diupdate

### 3. Testing
- Test perhitungan IPL Dibayar di Muka dengan berbagai skenario tarif
- Validasi hasil perhitungan sesuai dengan tarif yang berlaku
- Test fallback mechanism jika tidak ada tarif aktif

## Rollback Plan

Jika terjadi masalah, rollback dapat dilakukan dengan:

### 1. Rollback Database
```sql
-- Hapus index
DROP INDEX idx_tagihan_ipl_type_tarif;

-- Hapus kolom
ALTER TABLE tagihan_ipl DROP COLUMN type_tarif;
```

### 2. Rollback Kode
- Kembalikan query ke filter nominal: `.eq('nominal_tagihan', 60000)`
- Kembalikan perhitungan ke hardcoded: `* 55000`
- Hapus fungsi helper `getCurrentIplTariffForAdvancePayment()`

## Catatan Penting

1. **Backup Database**: Selalu backup database sebelum menjalankan migrasi
2. **Testing**: Lakukan testing menyeluruh sebelum deploy ke production
3. **Monitoring**: Monitor sistem setelah deploy untuk memastikan tidak ada error
4. **Dokumentasi**: Update dokumentasi sistem sesuai dengan perubahan yang dilakukan

## Timeline

- **Hari 1**: Backup database dan persiapan migrasi
- **Hari 2**: Jalankan migrasi database dan deploy kode
- **Hari 3**: Testing dan validasi hasil
- **Hari 4**: Monitoring dan penanganan issue (jika ada)

## Penanggung Jawab

- **Database Migration**: [Nama Developer]
- **Code Implementation**: [Nama Developer]
- **Testing**: [Nama QA]
- **Deployment**: [Nama DevOps]