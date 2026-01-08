# Quick Testing Checklist

## Setup
- [ ] Start localhost server
- [ ] Open pembayaran form
- [ ] Clear browser cache if needed

## Quick Tests (Do These First)

### ✓ Test 1: Basic Auto-Load (5 min)
1. Select household dengan IPL + Air bills outstanding
2. Verify both bill types appear in list
3. Check kategori selector is GONE

### ✓ Test 2: Auto-Split Payment (10 min)
1. Select 1 IPL bill + 1 Air bill
2. Enter total amount covering both
3. Submit
4. Check Supabase: Verify 2 pemasukan created with different kategori_id

### ✓ Test 3: Multiple Periode (10 min)
1. Select 2 Air bills from different periods
2. Submit
3. Check Supabase: periode_list should have 2 UUID values
```sql
SELECT periode_list, array_length(periode_list, 1) FROM pemasukan WHERE tanggal = TODAY ORDER BY created_at DESC LIMIT 1;
```

### ✓ Test 4: Rekap Air (5 min)
1. Open Rekap Air report
2. Check if total matches your test payments
3. Should count both old and new format records

### ✓ Test 5: Edge Cases (5 min)
- [ ] IPL only payment → expect 1 pemasukan (IPL)
- [ ] Air only payment → expect 1 pemasukan (Air)
- [ ] Single period → expect periode_list with 1 element

---

## If Issues Found:

### Issue: Bills not loading
- Check browser console for errors
- Verify household has outstanding bills
- Check Supabase connection

### Issue: Payment not splitting
- Check pemasukan table: should see 2 records with different kategori_id
- Check payment form JS for errors
- Verify allocatePaymentToSelectedBillsV2() is being called

### Issue: Rekap air shows wrong total
- Check air.js logic for periode_list query
- Verify both periode_id and periode_list handled

### Issue: Bills not marked as paid
- Check allocation table
- Verify allocatePaymentToSelectedBillsV2() executed successfully
- Check tagihan_ipl and meteran_air_billing tables

---

## Success Criteria

✓ All tests pass with no JS errors
✓ Payments split correctly into 2 pemasukan
✓ periode_list properly populated
✓ Rekap air counts correctly
✓ Bills show as paid

