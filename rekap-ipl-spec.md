# Spesifikasi Rekap IPL Detail

## Overview
Halaman rekap IPL terdiri dari 3 tabel utama untuk monitoring keuangan IPL yang komprehensif. Berdasarkan rumus Google Sheets yang ada.

## Struktur Data IPL
- **Tabel IPL**: Matrix rumah vs periode (setiap rumah 1 baris, setiap periode 2 kolom: nominal + tanggal bayar)
- **Status Pembayaran**:
  - `"LUNAS"`: Sudah lunas di sistem lama (tidak ada detail transaksi)
  - `60000`: IPL Normal lunas (termasuk DAU 5.000)
  - `30000`: IPL Rumah Kosong lunas
  - `5000`: DAU saja lunas (untuk penghuni kondisi khusus)
  - **Kosong**: Belum lunas

## Tabel 1: Rekap IPL

| No | Kolom | Tipe Data | Deskripsi | Rumus Google Sheets | Query Database |
|----|-------|-----------|-----------|-------------------|----------------|
| 1 | **Periode** | String | Nama periode (Jan2025, Feb2025, dll) | - | `periode.nama_periode` |
| 2 | **Pemasukan** | Currency | Total pemasukan IPL + DAU periode tersebut | `SUM(FILTER(Table_Pemasukan[Nominal]; (Tanggal >= start_date) * (Tanggal <= end_date) * ((Kategori = "IPL") + (Kategori = "DAU"))))` | `SUM(pemasukan.nominal)` WHERE `(kategori_id = 'IPL' OR kategori_id = 'DAU')` AND tanggal dalam periode |
| 3 | **Pengeluaran** | Currency | Total pengeluaran IPL + DAU periode tersebut | `SUM(FILTER(Table_Pengeluaran[Nominal]; (Tanggal >= start_date) * (Tanggal <= end_date) * ((Kategori = "IPL") + (Kategori = "DAU"))))` | `SUM(pengeluaran.nominal)` WHERE `(kategori_id = 'IPL' OR kategori_id = 'DAU')` AND tanggal dalam periode |
| 4 | **Selisih Kas** | Currency | Pemasukan - Pengeluaran | `pemasukan - pengeluaran` | Pemasukan - Pengeluaran |
| 5 | **Jumlah Warga Bayar** | Number | Jumlah warga unik yang membayar IPL/DAU | `COUNTUNIQUE(FILTER(Table_Pemasukan[No. Rmh]; (Tanggal >= start_date) * (Tanggal <= end_date) * ((Kategori = "IPL") + (Kategori = "DAU"))))` | `COUNT(DISTINCT hunian_id)` dari pemasukan WHERE `(kategori = 'IPL' OR kategori = 'DAU')` AND periode |
| 6 | **Jumlah Periode Dibayar** | Number | Jumlah transaksi pembayaran IPL/DAU | `COUNTA(FILTER(Table_Pemasukan[No. Rmh]; (Tanggal >= start_date) * (Tanggal <= end_date) * ((Kategori = "IPL") + (Kategori = "DAU"))))` | `COUNT(*)` dari pemasukan WHERE `(kategori = 'IPL' OR kategori = 'DAU')` AND periode |
| 7 | **DAU Terkumpul** | Currency | DAU terkumpul periode tersebut | `[Jumlah Periode Dibayar] × 5000` | `(jumlah_periode_dibayar) × 5000` |
| 8 | **Warga Lunas IPL** | Number | Warga yang lunas IPL periode tersebut | `COUNTIF(Table_IPL[periode]; "LUNAS") + COUNTIF(Table_IPL[periode]; 5000) + COUNTIF(Table_IPL[periode]; 60000)` *ignore "LUNAS" | `COUNT(*)` WHERE `tagihan_ipl.status = 'lunas'` AND `periode_id = current` AND `nominal_tagihan IN (5000, 60000)` |
| 9 | **Warga Belum Lunas IPL** | Number | Warga yang menunggak IPL periode tersebut | `COUNTBLANK(Table_IPL[periode])` | `COUNT(*)` WHERE `tagihan_ipl.sisa_tagihan > 0` AND `periode_id = current` |
| 10 | **Rumah Kosong** | Number | Jumlah rumah kosong periode tersebut | `COUNTIF(Table_IPL[periode]; "KOSONG") + COUNTIF(Table_IPL[periode]; "30000") + COUNTIF(Table_IPL[periode]; "Kosong(*)")` | `COUNT(*)` WHERE `hunian.status = 'kosong'` |

### Penjelasan Detail Kolom:

#### Kolom 1: Periode
- Format: Jan2025, Feb2025, Mar2025, dll
- Diambil dari tabel `periode.nama_periode`
- Urutkan berdasarkan `periode.nomor_urut` ascending (terlama ke terbaru)

#### Kolom 2-3: Pemasukan & Pengeluaran
- Menggunakan kategori_id yang merujuk ke kategori "IPL"
- Filter berdasarkan tanggal transaksi dalam range periode
- Pemasukan dari tabel `pemasukan`
- Pengeluaran dari tabel `pengeluaran`

#### Kolom 4: Selisih Kas
- Formula sederhana: Pemasukan - Pengeluaran
- Bisa positif ( surplus), negatif (defisit), atau nol

#### Kolom 5: Jumlah Warga Bayar
- **PENTING**: Hitung warga UNIK, bukan berdasarkan jumlah pembayaran
- Jika 1 warga bayar 3 bulan sekaligus, tetap dihitung 1 warga
- Query: `COUNT(DISTINCT hunian_id)` dari transaksi pemasukan IPL periode tersebut

#### Kolom 6: Jumlah Periode Dibayar
- Total periode yang berhasil dibayar (status lunas)
- Bukan jumlah transaksi, tapi jumlah bulan/periode yang tercover
- Query: `COUNT(*)` dari tagihan IPL WHERE `status = 'lunas'` AND `periode_id = current_periode`

#### Kolom 7: DAU Terkumpul
- **Formula**: 5000 × (Jumlah periode IPL Normal dibayar + Jumlah periode DAU dibayar)
- **Tidak termasuk** IPL rumah kosong
- IPL Normal: tagihan dengan `nominal_tagihan = 60000`
- DAU saja: tagihan dengan `nominal_tagihan = 5000`

#### Kolom 8-9: Status Pembayaran Warga
- Hitung warga unik berdasarkan hunian_id
- **Tidak termasuk IPL rumah kosong** karena rumah kosong tidak wajib IPL normal
- Lunas: tagihan IPL status 'lunas' untuk periode tersebut
- Belum Lunas: tagihan IPL status 'belum_bayar' atau 'sebagian' untuk periode tersebut

#### Kolom 10: Rumah Kosong
- Jumlah rumah dengan status 'kosong' pada periode tersebut
- Apakah status rumah berubah per periode? Perlu konfirmasi.

### Kategori IPL:
- **IPL Normal**: 60.000/bulan (termasuk DAU 5.000)
- **IPL Rumah Kosong**: 30.000/bulan (tanpa DAU)
- **DAU saja**: 5.000/bulan (untuk penghuni kondisi khusus)

## Tabel 2: IPL Terbayar di Muka

| Kolom | Tipe Data | Deskripsi | Rumus Google Sheets | Query Database |
|-------|-----------|-----------|-------------------|----------------|
| **Jumlah Bulan Dibayar** | Number | Total bulan IPL yang telah dibayar dimuka | `SUM(BYCOL(HSTACK(Table_IPL[Mei 2025]...[Des 2025]); LAMBDA(col; COUNTIF(col; "LUNAS") + COUNTIF(col; 60000))))` | `COUNT(*)` WHERE `tagihan_ipl.status = 'lunas'` AND `periode_id > current_periode` AND `nominal_tagihan = 60000` |
| **Nominal** | Currency | Total nominal pembayaran dimuka | `[Jumlah Bulan Dibayar] × 55000` | `(jumlah_bulan) × 55000` |

### Penjelasan:
- Tracking pembayaran IPL yang melebihi periode saat ini
- **55000 = 60000 - 5000** (DAU langsung disetor ke manajemen DAU)
- Contoh: Saat ini Jan 2026, ada 24 pembayaran dimuka → 24 × 55.000 = 1.320.000
- DAU 5.000 × 24 bulan = 120.000 langsung disetor ke manajemen DAU

## Tabel 3: Pengeluaran Rutin per Bulan

### Pengeluaran Rutin Tetap:
| Kategori | Nominal |
|----------|---------|
| IURAN SAMPAH | Rp 2.360.000 |
| GAJI SECURITY 2 ORANG | Rp 3.060.000 |
| LEMBUR SECURITY 2 ORANG | Rp 280.000 |
| BPJS SECURITY 2 ORANG | Rp 176.500 |
| POSYANDU | Rp 200.000 |
| KERJA BAKTI | Rp 100.000 |
| SEWA TANAH LAP. VOLI | Rp 100.000 |
| BANTUAN SOSIAL TETAP | Rp 150.000 |
| **TOTAL** | **Rp 6.426.500** |

### Pengeluaran Rutin Tidak Tetap:
| Kategori | Nominal |
|----------|---------|
| DAU | (Dinamis berdasarkan periode) |

### Technical Notes:
- Perlu tabel master terpisah untuk pengeluaran rutin
- Form input untuk mengelola data pengeluaran rutin
- Schema update untuk menyimpan data master ini

## File Structure yang Diperlukan:
```
js/modules/views/reports/rekap-ipl.js          # Main module
js/modules/entities/master/pengeluaran-rutin.js # Master pengeluaran rutin (opsional)
```

## Dependencies Database:
- `tagihan_ipl` - Data tagihan IPL
- `tagihan_ipl_pembayaran` - Alokasi pembayaran
- `pemasukan` & `pengeluaran` - Transaksi keuangan
- `periode` - Master periode
- `hunian` - Data rumah/warga

## Tantangan Technical:
1. **Query kompleks** dengan multiple JOIN untuk mendapatkan semua data
2. **Perhitungan warga unik** vs jumlah transaksi
3. **Status dinamis** lunas/belum lunas yang berubah seiring waktu
4. **Periode vs tanggal transaksi** - pastikan konsistensi filtering

---

*Dokumen ini akan diperbaharui berdasarkan diskusi dan implementasi*
