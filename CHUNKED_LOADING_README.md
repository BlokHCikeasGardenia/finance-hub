# Chunked Loading Implementation

## Overview
Supabase has a default limit of 1000 records per query. For tables with more than 1000 records, use the `loadDataInChunks()` utility function.

## How to Apply Chunked Loading

### 1. Replace Direct Query with Chunked Loading

**Before:**
```javascript
const { data, error } = await supabase
    .from('table_name')
    .select('*, related:foreign_key (field)')
    .order('created_at', { ascending: false });

if (error) throw error;
const allData = data || [];
```

**After:**
```javascript
const { loadDataInChunks } = await import('../../utils.js');

const allData = await loadDataInChunks('table_name', {
    select: '*, related:foreign_key (field)',
    orderBy: 'created_at',
    ascending: false,
    onProgress: (loaded, complete) => {
        if (!complete) console.log(`Loaded ${loaded} records...`);
    }
});
```

### 2. Tables That Need Chunked Loading

Based on codebase analysis, these modules should use chunked loading:

- ✅ `tagihan_ipl-manage.js` - IPL billing management
- ✅ `meteran_air_billing-data.js` - Air meter billing
- ⏳ `pemasukan-data.js` - Income transactions (if >1000 records)
- ⏳ `pengeluaran-data.js` - Expense transactions (if >1000 records)
- ⏳ `dana_titipan-data.js` - Deposit transactions (if >1000 records)
- ⏳ `pemindahbukuan-data.js` - Transfer transactions (if >1000 records)

### 3. loadDataInChunks() Parameters

```javascript
loadDataInChunks(tableName, {
    select: '*',                    // SELECT clause with joins
    orderBy: 'created_at',          // Sort column
    ascending: false,               // Sort direction
    filters: { status: 'active' },  // WHERE conditions
    chunkSize: 1000,                // Records per chunk (default: 1000)
    maxRecords: null,               // Max records to load (null = all)
    onProgress: (loaded, complete) => { /* progress callback */ }
});
```

### 4. When to Use Chunked Loading

Use chunked loading when:
- Table has >1000 records
- Query doesn't have explicit `.limit()` or `.range()` that keeps results <1000
- Performance is acceptable (multiple API calls)

### 5. Testing

Check console logs for:
```
🔄 Starting chunked loading for table_name
📦 Loading chunk: offset 0, limit 1000
✅ Loaded chunk: 1000 records, total: 1000
📦 Loading chunk: offset 1000, limit 1000
✅ Loaded chunk: 1000 records, total: 2000
🎉 Chunked loading complete: 2500 total records loaded
```

### 6. Example Implementation

See `tagihan_ipl-manage.js` and `meteran_air_billing-data.js` for working examples.