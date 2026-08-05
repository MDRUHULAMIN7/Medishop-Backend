import { Types } from 'mongoose';
import { InventoryItemModel, PosSaleModel, StockLedgerModel, StoreModel } from './pos.model';
import { CreateStoreInput, StockAdjustmentInput } from './pos.types';

export class PosRepository {
  // Store operations
  async findStores() {
    return StoreModel.find({ isActive: true }).lean();
  }

  async findMainStore() {
    let mainStore = await StoreModel.findOne({ isMainStore: true, isActive: true });
    if (!mainStore) {
      mainStore = await StoreModel.findOne({ isActive: true });
    }
    if (!mainStore) {
      mainStore = await StoreModel.create({
        name: 'Main Pharmacy Store',
        code: 'STORE-MAIN',
        address: 'Central Pharmacy, Dhaka',
        phone: '01700000000',
        isMainStore: true,
        isActive: true,
      });
    }
    return mainStore;
  }

  async createStore(data: CreateStoreInput) {
    return StoreModel.create(data);
  }

  // Inventory operations
  async getInventoryList() {
    return InventoryItemModel.find()
      .populate('product', 'name slug price stock dosageForm unitType images')
      .populate('store', 'name code')
      .sort({ updatedAt: -1 })
      .lean();
  }

  async getInventoryItem(productId: string, storeId: string) {
    return InventoryItemModel.findOne({
      product: new Types.ObjectId(productId),
      store: new Types.ObjectId(storeId),
    });
  }

  async updateStock(
    productId: string,
    storeId: string,
    quantityChange: number,
    reason: any,
    performedById: string,
    referenceId?: string,
    note?: string
  ) {
    let item = await InventoryItemModel.findOne({
      product: new Types.ObjectId(productId),
      store: new Types.ObjectId(storeId),
    });

    const previousStock = item ? item.stockQuantity : 0;
    const newStock = Math.max(0, previousStock + quantityChange);

    if (!item) {
      item = await InventoryItemModel.create({
        product: new Types.ObjectId(productId),
        store: new Types.ObjectId(storeId),
        stockQuantity: newStock,
      });
    } else {
      item.stockQuantity = newStock;
      await item.save();
    }

    // Write to immutable audit StockLedger
    const movementType = quantityChange >= 0 ? 'in' : 'out';
    const ledger = await StockLedgerModel.create({
      product: new Types.ObjectId(productId),
      store: new Types.ObjectId(storeId),
      movementType,
      reason,
      quantity: Math.abs(quantityChange),
      previousStock,
      newStock,
      referenceId,
      performedBy: new Types.ObjectId(performedById),
      note,
    });

    return { item, ledger };
  }

  async getStockLedger(productId?: string) {
    const filter = productId ? { product: new Types.ObjectId(productId) } : {};
    return StockLedgerModel.find(filter)
      .populate('product', 'name slug')
      .populate('store', 'name code')
      .populate('performedBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
  }

  // POS Sale operations
  async createPosSale(data: any) {
    return PosSaleModel.create(data);
  }

  async findPosSaleById(id: string) {
    return PosSaleModel.findById(id)
      .populate('store', 'name address phone code')
      .populate('soldBy', 'name role')
      .lean();
  }

  async findPosSaleByInvoice(invoiceNumber: string) {
    return PosSaleModel.findOne({ invoiceNumber: invoiceNumber.trim().toUpperCase() })
      .populate('store', 'name address phone code')
      .populate('soldBy', 'name role')
      .lean();
  }

  async getPosSales() {
    return PosSaleModel.find()
      .populate('store', 'name code')
      .populate('soldBy', 'name')
      .sort({ createdAt: -1 })
      .lean();
  }
}

export const posRepository = new PosRepository();
