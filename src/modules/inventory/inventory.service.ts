import mongoose, { ClientSession, Types } from 'mongoose';
import { ProductModel } from '../product/product.model';
import { BatchModel } from './batch.model';
import { StockLedgerModel } from './stockLedger.model';
import { ReceiveBatchInput } from './batch.types';
import { LedgerType } from './stockLedger.types';
import { AppError, NotFoundError, ValidationError } from '../../utils/AppError';
import { deleteRedisCachePattern } from '../../utils/redisCache';

export class InsufficientStockError extends AppError {
  constructor(message = 'Insufficient stock available for this product') {
    super(message, 400, 'INSUFFICIENT_STOCK');
  }
}

export class InventoryService {
  /**
   * Helper: Ensure MongoDB multi-document transactions are supported (Replica Set or Atlas).
   */
  private isTransactionSupported(): boolean {
    try {
      const conn = mongoose.connection as any;
      if (!conn || !conn.client) return false;
      const client = conn.client;
      if (client.topology) {
        const desc = client.topology.description;
        if (desc && (desc.type === 'ReplicaSetWithPrimary' || desc.type === 'ReplicaSetNoPrimary' || desc.type === 'Sharded')) {
          return true;
        }
      }
      return Boolean(client.replicaSet || (client.topology && client.topology.s && client.topology.s.replicaSet));
    } catch {
      return false;
    }
  }

  /**
   * Sell product units atomically using FEFO (First-Expiry-First-Out).
   * Supports MongoDB multi-document transactions (Replica Set / Atlas) as well as
   * atomic quantity-guarded deductions with compensating rollback for local dev standalone MongoDB.
   */
  async sellProductUnits(
    productId: string,
    unit: string,
    qty: number,
    referenceId?: string,
    passedSession?: ClientSession,
    userId?: string
  ) {
    if (qty <= 0) {
      throw new ValidationError('Quantity must be greater than 0');
    }

    // 1. Idempotency Check: If referenceId provided, check if sale already recorded
    if (referenceId) {
      const existingLedger = await StockLedgerModel.find({
        referenceId,
        type: 'SALE',
      });
      if (existingLedger && existingLedger.length > 0) {
        return {
          idempotent: true,
          referenceId,
          ledgerEntries: existingLedger,
        };
      }
    }

    let session: ClientSession | null = null;
    let useTransaction = false;

    if (passedSession) {
      session = passedSession;
      useTransaction = true;
    } else if (this.isTransactionSupported()) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
      } catch {
        if (session) {
          try {
            session.endSession();
          } catch {}
          session = null;
        }
        useTransaction = false;
      }
    }

    const sessionOpts = useTransaction && session ? { session } : {};

    // Track deductions for compensating rollback if non-transactional deduction fails
    const completedDeductions: { batchId: any; deductAmount: number; ledgerId?: any }[] = [];

    try {
      // 2. Fetch Product Catalog Info
      const product = await ProductModel.findById(productId, null, sessionOpts);
      if (!product || !product.isActive) {
        throw new NotFoundError('Product not found or inactive', 'PRODUCT_NOT_FOUND');
      }

      // Determine conversion factor from packaging array
      const packagingUnit = Array.isArray(product.packaging)
        ? product.packaging.find((p: any) => p.unit === unit && p.isActive !== false)
        : null;

      const baseUnitQty = packagingUnit ? packagingUnit.baseUnitQty : 1;
      const baseQtyNeeded = qty * baseUnitQty;

      // 3. Query Active Batches sorted by FEFO (expiryDate: 1)
      const now = new Date();
      const activeBatches = await BatchModel.find(
        {
          product: productId,
          isActive: true,
          quantity: { $gt: 0 },
          expiryDate: { $gte: now },
        },
        null,
        sessionOpts
      ).sort({ expiryDate: 1 });

      const totalAvailable = activeBatches.reduce((acc, b) => acc + b.quantity, 0);
      if (totalAvailable < baseQtyNeeded) {
        throw new InsufficientStockError(
          `Insufficient stock for "${product.name}". Requested ${baseQtyNeeded} ${product.baseUnit || 'pcs'}, but only ${totalAvailable} available.`
        );
      }

      // 4. FEFO Deduct loop with atomic quantity guards and contention retries
      let remainingToDeduct = baseQtyNeeded;
      const touchedLedgerEntries: any[] = [];
      let retries = 0;
      const maxRetries = 3;

      while (remainingToDeduct > 0 && retries <= maxRetries) {
        const freshBatches = await BatchModel.find(
          {
            product: productId,
            isActive: true,
            quantity: { $gt: 0 },
            expiryDate: { $gte: now },
          },
          null,
          sessionOpts
        ).sort({ expiryDate: 1 });

        const freshTotal = freshBatches.reduce((acc, b) => acc + b.quantity, 0);
        if (freshTotal < remainingToDeduct) {
          throw new InsufficientStockError(
            `Insufficient stock for "${product.name}". Requested ${baseQtyNeeded} ${product.baseUnit || 'pcs'}, but only ${freshTotal} available.`
          );
        }

        let deductedInThisPass = false;
        for (const batch of freshBatches) {
          if (remainingToDeduct <= 0) break;

          const deductAmount = Math.min(batch.quantity, remainingToDeduct);

          const updatedBatch = await BatchModel.findOneAndUpdate(
            {
              _id: batch._id,
              quantity: { $gte: deductAmount },
              isActive: true,
            },
            {
              $inc: { quantity: -deductAmount },
            },
            { new: true, ...sessionOpts }
          );

          if (!updatedBatch) {
            // Contention on this batch; skip to fresh re-scan
            break;
          }

          deductedInThisPass = true;
          completedDeductions.push({ batchId: batch._id, deductAmount });

          if (updatedBatch.quantity === 0) {
            await BatchModel.findByIdAndUpdate(batch._id, { isActive: false }, sessionOpts);
          }

          remainingToDeduct -= deductAmount;

          const createLedgerDocs = [
            {
              product: productId,
              batch: batch._id,
              type: 'SALE' as LedgerType,
              quantity: -deductAmount,
              baseQtyNeeded,
              unitSold: unit,
              balanceAfter: updatedBatch.quantity,
              referenceId,
              performedBy: userId ? new Types.ObjectId(userId) : undefined,
            },
          ];

          let ledgerEntry: any;
          if (useTransaction && session) {
            const [created] = await StockLedgerModel.create(createLedgerDocs, { session });
            ledgerEntry = created;
          } else {
            const [created] = await StockLedgerModel.create(createLedgerDocs);
            ledgerEntry = created;
          }

          completedDeductions[completedDeductions.length - 1].ledgerId = ledgerEntry._id;
          touchedLedgerEntries.push(ledgerEntry);
        }

        if (!deductedInThisPass) {
          retries++;
        }
      }

      if (remainingToDeduct > 0) {
        throw new InsufficientStockError('Stock deduction incomplete across FEFO batches');
      }

      // 5. Update Product stockCached denormalized total
      await ProductModel.findByIdAndUpdate(
        productId,
        {
          $inc: { stockCached: -baseQtyNeeded },
        },
        sessionOpts
      );

      if (useTransaction && session && !passedSession) {
        await session.commitTransaction();
      }

      await deleteRedisCachePattern('cache:products:*');

      return {
        success: true,
        productId,
        baseQtyDeducted: baseQtyNeeded,
        ledgerEntries: touchedLedgerEntries,
      };
    } catch (err) {
      if (useTransaction && session && !passedSession && session.inTransaction()) {
        await session.abortTransaction();
      } else if (!useTransaction && completedDeductions.length > 0) {
        // Compensating Rollback for non-transactional execution
        console.warn('⚠️ Executing compensating rollback for failed non-transactional sale...');
        for (const item of completedDeductions) {
          try {
            await BatchModel.findByIdAndUpdate(item.batchId, {
              $inc: { quantity: item.deductAmount },
              $set: { isActive: true },
            });
            if (item.ledgerId) {
              await StockLedgerModel.findByIdAndDelete(item.ledgerId);
            }
          } catch (rbErr) {
            console.error('❌ Rollback item error:', rbErr);
          }
        }
      }
      throw err;
    } finally {
      if (useTransaction && session && !passedSession) {
        session.endSession();
      }
    }
  }

  /**
   * Receive a new medicine batch / purchase intake.
   */
  async receiveBatch(input: ReceiveBatchInput, passedSession?: ClientSession, userId?: string) {
    const { productId, batchNumber, expiryDate, quantity, costPrice, supplier, purchaseReferenceId } = input;

    if (quantity <= 0) {
      throw new ValidationError('Batch quantity must be greater than 0');
    }

    if (purchaseReferenceId) {
      const existingLedger = await StockLedgerModel.findOne({
        referenceId: purchaseReferenceId,
        type: 'PURCHASE',
      });
      if (existingLedger) {
        return { idempotent: true, ledgerEntry: existingLedger };
      }
    }

    let session: ClientSession | null = null;
    let useTransaction = false;

    if (passedSession) {
      session = passedSession;
      useTransaction = true;
    } else if (this.isTransactionSupported()) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
      } catch {
        if (session) {
          try { session.endSession(); } catch {}
          session = null;
        }
        useTransaction = false;
      }
    }

    const sessionOpts = useTransaction && session ? { session } : {};

    try {
      const product = await ProductModel.findById(productId, null, sessionOpts);
      if (!product) {
        throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
      }

      const expDate = new Date(expiryDate);
      if (isNaN(expDate.getTime())) {
        throw new ValidationError('Invalid expiry date');
      }

      const batch = await BatchModel.findOneAndUpdate(
        { product: productId, batchNumber: batchNumber.trim() },
        {
          $inc: { quantity: Number(quantity) },
          $set: {
            expiryDate: expDate,
            costPrice: Number(costPrice),
            supplier: supplier ? new Types.ObjectId(supplier) : undefined,
            isActive: true,
          },
          $setOnInsert: {
            receivedDate: new Date(),
          },
        },
        { upsert: true, new: true, ...sessionOpts }
      );

      const createLedgerDocs = [
        {
          product: productId,
          batch: batch._id,
          type: 'PURCHASE' as LedgerType,
          quantity: Number(quantity),
          baseQtyNeeded: Number(quantity),
          unitSold: product.baseUnit || 'pcs',
          balanceAfter: batch.quantity,
          referenceId: purchaseReferenceId,
          performedBy: userId ? new Types.ObjectId(userId) : undefined,
        },
      ];

      let ledgerEntry: any;
      if (useTransaction && session) {
        const [created] = await StockLedgerModel.create(createLedgerDocs, { session });
        ledgerEntry = created;
      } else {
        const [created] = await StockLedgerModel.create(createLedgerDocs);
        ledgerEntry = created;
      }

      await ProductModel.findByIdAndUpdate(
        productId,
        {
          $inc: { stockCached: Number(quantity) },
        },
        sessionOpts
      );

      if (useTransaction && session && !passedSession) {
        await session.commitTransaction();
      }

      await deleteRedisCachePattern('cache:products:*');

      return {
        success: true,
        batch,
        ledgerEntry,
      };
    } catch (err) {
      if (useTransaction && session && !passedSession && session.inTransaction()) {
        await session.abortTransaction();
      }
      throw err;
    } finally {
      if (useTransaction && session && !passedSession) {
        session.endSession();
      }
    }
  }

  /**
   * Manual stock adjustment (RETURN, DAMAGE, ADJUSTMENT, EXPIRED_REMOVAL).
   */
  async adjustStock(
    productId: string,
    batchId: string,
    type: LedgerType,
    quantityDelta: number,
    referenceId?: string,
    userId?: string
  ) {
    const product = await ProductModel.findById(productId);
    if (!product) {
      throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
    }

    const batch = await BatchModel.findOne({ _id: batchId, product: productId });
    if (!batch) {
      throw new NotFoundError('Batch not found for this product', 'BATCH_NOT_FOUND');
    }

    const newBatchQty = batch.quantity + quantityDelta;
    if (newBatchQty < 0) {
      throw new ValidationError(`Adjustment results in negative batch quantity (${newBatchQty})`);
    }

    const updatedBatch = await BatchModel.findByIdAndUpdate(
      batchId,
      {
        $set: {
          quantity: newBatchQty,
          isActive: newBatchQty > 0,
        },
      },
      { new: true }
    );

    const [ledgerEntry] = await StockLedgerModel.create([
      {
        product: productId,
        batch: batchId,
        type,
        quantity: quantityDelta,
        baseQtyNeeded: Math.abs(quantityDelta),
        unitSold: product.baseUnit || 'pcs',
        balanceAfter: updatedBatch.quantity,
        referenceId,
        performedBy: userId ? new Types.ObjectId(userId) : undefined,
      },
    ]);

    await ProductModel.findByIdAndUpdate(productId, {
      $inc: { stockCached: quantityDelta },
    });

    await deleteRedisCachePattern('cache:products:*');

    return {
      success: true,
      batch: updatedBatch,
      ledgerEntry,
    };
  }

  /**
   * Admin Repair Utility: Re-sum all active unexpired Batch quantities and repair Product.stockCached.
   */
  async recalculateStock(productId: string) {
    const now = new Date();
    const activeBatches = await BatchModel.find({
      product: productId,
      isActive: true,
      expiryDate: { $gte: now },
    });

    const realStockSum = activeBatches.reduce((acc, b) => acc + b.quantity, 0);

    const updatedProduct = await ProductModel.findByIdAndUpdate(
      productId,
      {
        $set: { stockCached: realStockSum },
      },
      { new: true }
    );

    await deleteRedisCachePattern('cache:products:*');

    return {
      productId,
      recalculatedStock: realStockSum,
      product: updatedProduct,
    };
  }

  /**
   * Automated Cron / Worker: Find expired active batches and auto-zero them with EXPIRED_REMOVAL ledger logs.
   */
  async expireOutdatedBatches() {
    const now = new Date();
    const expiredBatches = await BatchModel.find({
      isActive: true,
      expiryDate: { $lt: now },
      quantity: { $gt: 0 },
    });

    const results = [];
    for (const batch of expiredBatches) {
      try {
        const res = await this.adjustStock(
          batch.product.toString(),
          batch._id.toString(),
          'EXPIRED_REMOVAL',
          -batch.quantity,
          'CRON_EXPIRED_REMOVAL'
        );
        results.push(res);
      } catch (err) {
        console.error(`⚠️ Failed to expire batch ${batch._id}:`, err);
      }
    }

    return {
      processedCount: expiredBatches.length,
      results,
    };
  }

  /**
   * Get active batches for a product.
   */
  async getBatches(productId: string) {
    return BatchModel.find({ product: productId }).sort({ expiryDate: 1 });
  }

  /**
   * Get stock audit ledger entries for a product.
   */
  async getLedger(productId: string, limit = 50) {
    return StockLedgerModel.find({ product: productId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('performedBy', 'name email role');
  }
}

export const inventoryService = new InventoryService();
