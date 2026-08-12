import mongoose from 'mongoose';
import { config } from '../src/config/env';
import { ProductModel } from '../src/modules/product/product.model';
import { BatchModel } from '../src/modules/inventory/batch.model';
import { StockLedgerModel } from '../src/modules/inventory/stockLedger.model';
import { inventoryService, InsufficientStockError } from '../src/modules/inventory/inventory.service';

async function runConcurrencyTestSuite() {
  console.log('🧪 Starting Inventory Concurrency & Ledger Integrity Test Suite...');

  try {
    await mongoose.connect(config.MONGO_URI);
    console.log('✅ Connected to MongoDB Database');

    // 1. Seed Test Product
    const testProduct = await ProductModel.create({
      name: `Test Concurrency Medicine ${Date.now()}`,
      slug: `test-concurrency-medicine-${Date.now()}`,
      dosageForm: 'tablet',
      baseUnit: 'pcs',
      packaging: [
        { unit: 'pcs', baseUnitQty: 1, price: 10, mrp: 12, isDefault: true, isActive: true },
        { unit: 'strip', baseUnitQty: 10, price: 100, mrp: 120, isDefault: false, isActive: true },
      ],
      category: new mongoose.Types.ObjectId(),
      brand: new mongoose.Types.ObjectId(),
      price: 10,
      stockCached: 15,
    });

    const productId = testProduct._id.toString();

    // 2. Seed 2 FEFO Batches (Total = 15 pcs)
    const now = Date.now();
    const batch1 = await BatchModel.create({
      product: productId,
      batchNumber: `TEST-BATCH-EARLY-${now}`,
      expiryDate: new Date(now + 30 * 24 * 60 * 60 * 1000), // Expiration in 30 days
      quantity: 10,
      costPrice: 5,
      receivedDate: new Date(),
      isActive: true,
    });

    const batch2 = await BatchModel.create({
      product: productId,
      batchNumber: `TEST-BATCH-LATER-${now}`,
      expiryDate: new Date(now + 60 * 24 * 60 * 60 * 1000), // Expiration in 60 days
      quantity: 5,
      costPrice: 5,
      receivedDate: new Date(),
      isActive: true,
    });

    console.log(`📦 Seeded Product "${testProduct.name}" (ID: ${productId})`);
    console.log(`- Batch 1 (30 days exp): 10 pcs`);
    console.log(`- Batch 2 (60 days exp): 5 pcs`);
    console.log(`- Total Initial Stock: 15 pcs`);

    // 3. Launch 20 Parallel Sale Requests simultaneously
    console.log(`\n⚡ Launching 20 parallel sellProductUnits requests (1 pc each)...`);

    const parallelRequests = Array.from({ length: 20 }, (_, i) => {
      const orderRef = `ORDER-CONCURRENCY-TEST-${now}-${i + 1}`;
      return inventoryService
        .sellProductUnits(productId, 'pcs', 1, orderRef)
        .then((res) => ({ status: 'fulfilled' as const, value: res }))
        .catch((err) => ({ status: 'rejected' as const, reason: err }));
    });

    const results = await Promise.all(parallelRequests);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    console.log(`\n📊 Execution Results:`);
    console.log(`- Total Requests: 20`);
    console.log(`- Fulfilled (Succeeded): ${fulfilled.length}`);
    console.log(`- Rejected (Failed): ${rejected.length}`);

    // 4. Assert Concurrency Correctness
    let pass = true;
    if (fulfilled.length !== 15) {
      console.error(`❌ FAIL: Expected exactly 15 fulfilled sales, got ${fulfilled.length}`);
      pass = false;
    } else {
      console.log(`✅ PASS: Exactly 15 sales succeeded.`);
    }

    if (rejected.length !== 5) {
      console.error(`❌ FAIL: Expected exactly 5 rejected requests, got ${rejected.length}`);
      pass = false;
    } else {
      console.log(`✅ PASS: Exactly 5 requests failed due to stock exhaustion.`);
    }

    // Verify all rejected reasons are InsufficientStockError
    const allInsufficientStockErrors = rejected.every(
      (r) => r.reason instanceof InsufficientStockError || r.reason?.code === 'INSUFFICIENT_STOCK'
    );
    if (!allInsufficientStockErrors) {
      console.error(`❌ FAIL: Some failures were not InsufficientStockError:`, rejected.map((r) => r.reason));
      pass = false;
    } else {
      console.log(`✅ PASS: All 5 failed requests threw InsufficientStockError.`);
    }

    // 5. Assert Database Final State
    const finalProduct = await ProductModel.findById(productId);
    console.log(`- Final Product stockCached: ${finalProduct?.stockCached}`);
    if (finalProduct?.stockCached !== 0) {
      console.error(`❌ FAIL: Expected final stockCached = 0, got ${finalProduct?.stockCached}`);
      pass = false;
    } else {
      console.log(`✅ PASS: Product stockCached === 0.`);
    }

    const finalBatch1 = await BatchModel.findById(batch1._id);
    const finalBatch2 = await BatchModel.findById(batch2._id);
    console.log(`- Final Batch 1 Qty: ${finalBatch1?.quantity}, isActive: ${finalBatch1?.isActive}`);
    console.log(`- Final Batch 2 Qty: ${finalBatch2?.quantity}, isActive: ${finalBatch2?.isActive}`);

    if (finalBatch1?.quantity !== 0 || finalBatch2?.quantity !== 0) {
      console.error(`❌ FAIL: Batches were not zeroed out completely.`);
      pass = false;
    } else {
      console.log(`✅ PASS: Both FEFO batches zeroed out to 0.`);
    }

    // 6. Assert Ledger Integrity
    const saleLedgers = await StockLedgerModel.find({ product: productId, type: 'SALE' });
    const ledgerQtySum = saleLedgers.reduce((acc, l) => acc + l.quantity, 0);
    console.log(`- Total Sale Ledger Entries: ${saleLedgers.length}`);
    console.log(`- Sum of Sale Ledger Quantities: ${ledgerQtySum}`);

    if (ledgerQtySum !== -15) {
      console.error(`❌ FAIL: Expected sum of sale ledgers = -15, got ${ledgerQtySum}`);
      pass = false;
    } else {
      console.log(`✅ PASS: Ledger sale quantities sum to exactly -15.`);
    }

    if (saleLedgers.length !== 15) {
      console.error(`❌ FAIL: Expected 15 sale ledger entries, got ${saleLedgers.length}`);
      pass = false;
    } else {
      console.log(`✅ PASS: Exactly 15 audit ledger entries logged (no duplicates/orphans).`);
    }

    // 7. Cleanup Test Data
    await ProductModel.findByIdAndDelete(productId);
    await BatchModel.deleteMany({ product: productId });
    await StockLedgerModel.deleteMany({ product: productId });
    console.log(`\n🧹 Cleaned up test database records.`);

    if (pass) {
      console.log(`\n🎉 ALL CONCURRENCY & LEDGER INTEGRITY TESTS PASSED SUCCESSFULLY!`);
    } else {
      console.error(`\n💥 CONCURRENCY TEST SUITE FAILED!`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test Execution Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

runConcurrencyTestSuite();
