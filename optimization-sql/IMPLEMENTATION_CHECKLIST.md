# CHECKLIST IMPLEMENTASI FASE 1: Database Optimization

**Tanggal:** 17 Desember 2025  
**Status:** Siap diimplementasikan  
**Perkiraan Waktu:** 4-5 jam

## 📋 DAFTAR PERIKSA IMPLEMENTASI

### **Task 1.1: Composite Index Strategis** ⏱️ 30 menit
- [ ] Jalankan script: `TASK_1_1_INDEXES.sql`
- [ ] Verifikasi semua index terbuat dengan benar
- [ ] Cek penggunaan index setelah implementasi
- [ ] Monitor impact pada query performance

**Index yang akan dibuat:**
- [ ] `idx_pemasukan_kategori_tanggal_hunian`
- [ ] `idx_pemasukan_rekening_tanggal_kategori`
- [ ] `idx_pemasukan_hunian_tanggal_kategori`
- [ ] `idx_pengeluaran_kategori_tanggal_rekening`
- [ ] `idx_pengeluaran_rekening_tanggal_kategori`
- [ ] `idx_pemasukan_kategori_tanggal_search`
- [ ] `idx_pengeluaran_kategori_tanggal_search`
- [ ] `idx_tagihan_ipl_periode_status_hunian`
- [ ] `idx_tagihan_ipl_hunian_periode_status`
- [ ] `idx_tagihan_ipl_pembayaran_tagihan_pemasukan`
- [ ] `idx_tagihan_ipl_pembayaran_pemasukan_tagihan`
- [ ] `idx_tagihan_ipl_pembayaran_tagihan_tanggal`
- [ ] `idx_tagihan_ipl_status_periode_hunian`
- [ ] `idx_meteran_air_billing_periode_status_hunian`
- [ ] `idx_meteran_air_billing_hunian_periode_status`
- [ ] `idx_meteran_air_billing_pembayaran_billing_pemasukan`
- [ ] `idx_meteran_air_billing_pembayaran_pemasukan_billing`
- [ ] `idx_meteran_air_billing_pembayaran_billing_tanggal`
- [ ] `idx_meteran_air_billing_status_periode_hunian`
- [ ] `idx_dana_titipan_kategori_tanggal_hunian`
- [ ] `idx_dana_titipan_hunian_tanggal_kategori`
- [ ] `idx_dana_titipan_converted_tanggal`
- [ ] `idx_dana_titipan_kategori_tanggal_search`
- [ ] `idx_pemasukan_kategori_periode_tanggal`
- [ ] `idx_pengeluaran_kategori_periode_tanggal`

### **Task 1.2: Stored Procedures** ⏱️ 3 jam
- [ ] Jalankan script: `TASK_1_2_STORED_PROCEDURES.sql`
- [ ] Verifikasi semua stored procedures terbuat dengan benar
- [ ] Test stored procedures dengan data sample
- [ ] Optimasi query jika diperlukan
- [ ] Dokumentasikan parameter dan return value

**Stored Procedures yang akan dibuat:**
- [ ] `get_ipl_summary_for_period_v2` - IPL dengan pagination
- [ ] `get_pemasukan_paginated_v2` - Pemasukan dengan pagination
- [ ] `get_pengeluaran_paginated_v2` - Pengeluaran dengan pagination
- [ ] `get_air_summary_for_period_v2` - Air dengan pagination
- [ ] `get_monthly_summary_v2` - Ringkasan bulanan
- [ ] `get_outstanding_summary_v2` - Outstanding summary

### **Task 1.3: Materialized Views** ⏱️ 1.5 jam
- [ ] Jalankan script: `TASK_1_3_MATERIALIZED_VIEWS.sql`
- [ ] Verifikasi semua materialized views terbuat dengan benar
- [ ] Test refresh function
- [ ] Cek ukuran materialized views
- [ ] Monitor query performance menggunakan materialized views

**Materialized Views yang akan dibuat:**
- [ ] `mv_monthly_summary` - Ringkasan bulanan per kategori
- [ ] `mv_ipl_outstanding_summary` - Outstanding IPL per periode
- [ ] `mv_air_outstanding_summary` - Outstanding air per periode
- [ ] `mv_daily_cash_summary` - Ringkasan harian kas
- [ ] `mv_payment_summary_by_account` - Ringkasan pembayaran per rekening
- [ ] `mv_ipl_payment_summary_by_house` - Ringkasan pembayaran IPL per rumah
- [ ] `mv_air_payment_summary_by_house` - Ringkasan pembayaran air per rumah

**Functions yang akan dibuat:**
- [ ] `refresh_monthly_summary()`
- [ ] `refresh_ipl_outstanding_summary()`
- [ ] `refresh_air_outstanding_summary()`
- [ ] `refresh_daily_cash_summary()`
- [ ] `refresh_payment_summary_by_account()`
- [ ] `refresh_ipl_payment_summary_by_house()`
- [ ] `refresh_air_payment_summary_by_house()`
- [ ] `refresh_all_materialized_views()`

## 🔍 VERIFIKASI PASCA IMPLEMENTASI

### **Index Verification**
- [ ] Cek index usage statistics
- [ ] Bandingkan query execution time sebelum & sesudah
- [ ] Monitor memory usage
- [ ] Pastikan tidak ada index yang tidak terpakai

### **Stored Procedures Verification**
- [ ] Test semua parameter dan filter
- [ ] Verifikasi pagination bekerja dengan benar
- [ ] Cek error handling
- [ ] Test dengan data volume besar
- [ ] Bandingkan performance dengan query asli

### **Materialized Views Verification**
- [ ] Cek data consistency
- [ ] Test refresh process
- [ ] Monitor disk space usage
- [ ] Verifikasi query performance improvement
- [ ] Test refresh schedule

## 📊 PERFORMANCE TARGET

### **Sebelum Optimasi:**
- IPL Report: 10-30 detik
- Pemasukan Report: 5-15 detik
- Pengeluaran Report: 5-15 detik
- Air Report: 8-20 detik

### **Target Setelah Fase 1:**
- IPL Report: **2-5 detik** (80% improvement)
- Pemasukan Report: **1-3 detik** (80% improvement)
- Pengeluaran Report: **1-3 detik** (80% improvement)
- Air Report: **2-5 detik** (80% improvement)

## ⚠️ CATATAN PENTING

### **Prerequisites**
- [ ] Backup database sebelum implementasi
- [ ] Pastikan maintenance window yang cukup
- [ ] Siapkan rollback plan
- [ ] Koordinasi dengan tim operasional

### **During Implementation**
- [ ] Monitor resource usage (CPU, Memory, Disk)
- [ ] Catat waktu eksekusi setiap task
- [ ] Documentasi semua perubahan
- [ ] Test functionality setelah setiap task

### **Post Implementation**
- [ ] Monitor system stability 24 jam pertama
- [ ] Collect performance metrics
- [ ] Test semua fitur aplikasi
- [ ] Update dokumentasi

## 🚨 ROLLBACK PLAN

### **Jika Terjadi Masalah:**

#### **Rollback Index (5 menit):**
```sql
-- Drop semua index yang dibuat
DROP INDEX IF EXISTS idx_pemasukan_kategori_tanggal_hunian;
-- ... (dan seterusnya untuk semua index)
```

#### **Rollback Stored Procedures (10 menit):**
```sql
-- Drop semua stored procedures
DROP FUNCTION IF EXISTS get_ipl_summary_for_period_v2(UUID, INTEGER, INTEGER, VARCHAR, VARCHAR);
-- ... (dan seterusnya untuk semua stored procedures)
```

#### **Rollback Materialized Views (15 menit):**
```sql
-- Drop semua materialized views
DROP MATERIALIZED VIEW IF EXISTS mv_monthly_summary;
-- ... (dan seterusnya untuk semua materialized views)

-- Drop semua functions
DROP FUNCTION IF EXISTS refresh_monthly_summary();
-- ... (dan seterusnya untuk semua functions)
```

## 📞 KONTAK DARURAT

- **Database Admin:** [Contact Info]
- **System Admin:** [Contact Info]
- **Project Manager:** [Contact Info]

---

**Catatan:** Checklist ini harus diikuti secara ketat untuk memastikan implementasi berjalan lancar dan sesuai target.
