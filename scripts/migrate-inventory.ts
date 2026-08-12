import mongoose from 'mongoose';
import { config } from '../src/config/env';
import { ProductModel } from '../src/modules/product/product.model';
import { BatchModel } from '../src/modules/inventory/batch.model';
import { StockLedgerModel } from '../src/modules/inventory/stockLedger.model';

async function runInventoryMigration() {
  console.log('🚀 Starting Product Inventory Single-Source & FEFO Batch Migration...');

  try {
    await mongoose.connect(config.MONGO_URI);
    console.log('✅ Connected to MongoDB Database');

    const products = await ProductModel.find({});
    console.log(`📦 Found ${products.length} products to evaluate.`);

    let updatedCount = 0;
    let createdBatchesCount = 0;

    for (const product of products) {
      let isModified = false;

      // 1. Ensure baseUnit
      if (!product.baseUnit) {
        product.baseUnit = 'pcs';
        isModified = true;
      }

      // 2. Build packaging views conversion array if empty
      if (!Array.isArray(product.packaging) || product.packaging.length === 0) {
        if (Array.isArray(product.unitPrices) && product.unitPrices.length > 0) {
          product.packaging = product.unitPrices.map((u: any) => ({
            unit: u.unit || 'pcs',
            baseUnitQty: Number(u.multiplier || u.baseUnitQty || (u.unit === 'box' ? 100 : u.unit === 'strip' ? 10 : 1)),
            price: Number(u.price || product.price || 0),
            mrp: Number(u.mrp || u.price || product.price || 0),
            discountPrice: u.discountPrice ? Number(u.discountPrice) : undefined,
            isDefault: Boolean(u.isDefault),
            isActive: true,
          }));
        } else {
          product.packaging = [
            {
              unit: product.unitType || 'pcs',
              baseUnitQty: 1,
              price: Number(product.price || 0),
              mrp: Number(product.price || 0),
              discountPrice: product.discountPrice ? Number(product.discountPrice) : undefined,
              isDefault: true,
              isActive: true,
            },
          ];
        }
        isModified = true;
      }

      // 3. Compute denormalized stockCached
      const legacyStock = Number(product.stock || product.stockCached || 0);
      if (product.stockCached === undefined || product.stockCached === null || product.stockCached !== legacyStock) {
        product.stockCached = legacyStock;
        isModified = true;
      }

      if (isModified) {
        await product.save();
        updatedCount++;
      }

      // 4. Create synthetic initial batch if product has stock but 0 batches
      const existingBatchesCount = await BatchModel.countDocuments({ product: product._id });
      if (existingBatchesCount === 0 && product.stockCached > 0) {
        const farFutureExpiry = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000); // 2 years in future

        const [batch] = await BatchModel.create([
          {
            product: product._id,
            batchNumber: `MIGRATED-INIT-${product._id.toString().slice(-6)}`,
            expiryDate: farFutureExpiry,
            quantity: product.stockCached,
            costPrice: Number(product.price || 0),
            receivedDate: new Date(),
            isActive: true,
          },
        ]);

        await StockLedgerModel.create([
          {
            product: product._id,
            batch: batch._id,
            type: 'PURCHASE',
            quantity: product.stockCached,
            baseQtyNeeded: product.stockCached,
            unitSold: product.baseUnit || 'pcs',
            balanceAfter: product.stockCached,
            referenceId: `MIGRATION-${product._id.toString()}`,
          },
        ]);

        createdBatchesCount++;
      }
    }

    console.log(`\n🎉 Migration Complete!`);
    console.log(`- Products Updated: ${updatedCount}`);
    console.log(`- Batches Created: ${createdBatchesCount}`);
  } catch (error) {
    console.error('❌ Migration Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

runInventoryMigration();
