import { Types } from 'mongoose';
import { emitToAdmins } from '../../socket';
import { deleteRedisCachePattern } from '../../utils/redisCache';
import { AppError, NotFoundError, ValidationError } from '../../utils/AppError';
import { ProductModel } from '../product/product.model';
import { PosSaleModel } from './pos.model';
import { posRepository } from './pos.repository';
import { CreateStoreInput, PosCheckoutInput, StockAdjustmentInput } from './pos.types';

const generateInvoiceNumber = (): string => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `INV-${dateStr}-${randomNum}`;
};

export class PosService {
  // Store operations
  async getStores() {
    return posRepository.findStores();
  }

  async createStore(input: CreateStoreInput) {
    return posRepository.createStore(input);
  }

  // Inventory & Shared Stock Ledger
  async getInventoryList() {
    return posRepository.getInventoryList();
  }

  async adjustStock(staffId: string, input: StockAdjustmentInput) {
    const mainStore = await posRepository.findMainStore();
    const storeId = input.storeId || mainStore._id.toString();

    const product = await ProductModel.findById(input.productId);
    if (!product) {
      throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
    }

    const quantityChange = Number(input.quantityChange);
    if (quantityChange === 0) {
      throw new ValidationError('Quantity change cannot be zero');
    }

    // Check if reduction exceeds available stock
    if (quantityChange < 0 && product.stock < Math.abs(quantityChange)) {
      throw new ValidationError(
        `Stock reduction failed. Available product stock is ${product.stock}, but attempted reduction was ${Math.abs(quantityChange)}.`
      );
    }

    // Update Product central stock source of truth
    const updatedProduct = await ProductModel.findByIdAndUpdate(
      input.productId,
      { $inc: { stock: quantityChange } },
      { new: true }
    );

    // Update Store inventory & log to immutable Stock Ledger
    const result = await posRepository.updateStock(
      input.productId,
      storeId,
      quantityChange,
      input.reason || 'manual_adjustment',
      staffId,
      undefined,
      input.note
    );

    emitToAdmins('inventory:updated', {
      event: 'inventory:updated',
      productId: input.productId,
      newStock: updatedProduct?.stock,
      ledger: result.ledger,
    });

    return {
      product: updatedProduct,
      inventoryItem: result.item,
      ledger: result.ledger,
    };
  }

  async getStockLedger(productId?: string) {
    return posRepository.getStockLedger(productId);
  }

  // POS Checkout & Counter Sales
  async processPosSale(staffId: string, input: PosCheckoutInput) {
    if (!input.items || input.items.length === 0) {
      throw new ValidationError('POS cart items cannot be empty');
    }

    const mainStore = await posRepository.findMainStore();
    const storeId = input.storeId || mainStore._id.toString();

    let subtotal = 0;
    const saleItemSnapshots = [];

    // Atomic Stock Validation & Deduction per item
    for (const item of input.items) {
      const product = await ProductModel.findById(item.productId);
      if (!product || !product.isActive) {
        throw new NotFoundError(`Product "${item.productId}" not found or inactive`, 'PRODUCT_NOT_FOUND');
      }

      if (product.stock < item.quantity) {
        throw new ValidationError(
          `POS Sale blocked: Insufficient stock for product "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`
        );
      }

      const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : Number(product.price);
      const itemTotalPrice = unitPrice * item.quantity;
      subtotal += itemTotalPrice;

      saleItemSnapshots.push({
        product: product._id,
        name: product.name,
        unitPrice,
        quantity: item.quantity,
        totalPrice: itemTotalPrice,
        batchNumber: item.batchNumber || product.batchNumber,
      });
    }

    const discountTotal = input.discountTotal !== undefined
      ? Number(input.discountTotal)
      : input.discountAmount !== undefined
      ? Number(input.discountAmount)
      : 0;
    const taxAmount = input.taxAmount ? Number(input.taxAmount) : 0;
    const grandTotal = Math.max(0, subtotal - discountTotal + taxAmount);
    const paidAmount = input.paidAmount !== undefined && input.paidAmount > 0 ? Number(input.paidAmount) : grandTotal;

    if (paidAmount < grandTotal) {
      throw new ValidationError(
        `Insufficient payment amount. Total is ৳${grandTotal.toFixed(2)}, but paid amount was ৳${paidAmount.toFixed(2)}.`
      );
    }

    const changeAmount = Math.max(0, paidAmount - grandTotal);
    const invoiceNumber = generateInvoiceNumber();

    // Deduct central stock & write to Stock Ledger for each item
    for (const itemSnapshot of saleItemSnapshots) {
      await ProductModel.findByIdAndUpdate(itemSnapshot.product, {
        $inc: { stock: -itemSnapshot.quantity, stockCached: -itemSnapshot.quantity },
      });

      await posRepository.updateStock(
        itemSnapshot.product.toString(),
        storeId,
        -itemSnapshot.quantity,
        'pos_sale',
        staffId,
        invoiceNumber,
        `POS Counter Sale Invoice ${invoiceNumber}`
      );
    }

    await deleteRedisCachePattern('cache:products:*');

    const safeCustomerUser =
      input.customerUser && Types.ObjectId.isValid(input.customerUser)
        ? new Types.ObjectId(input.customerUser)
        : undefined;

    // Create POS Sale record
    const posSale = await posRepository.createPosSale({
      invoiceNumber,
      store: storeId,
      soldBy: staffId,
      customerName: input.customerName || 'Walk-in Customer',
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      customerAddress: input.customerAddress,
      customerUser: safeCustomerUser,
      items: saleItemSnapshots,
      subtotal,
      discountTotal,
      taxAmount,
      grandTotal,
      paidAmount,
      changeAmount,
      paymentMethod: input.paymentMethod || 'cash',
      status: 'completed',
    });

    emitToAdmins('pos:sale_created', {
      event: 'pos:sale_created',
      message: `POS Sale ${invoiceNumber} completed for ৳${grandTotal}`,
      posSale,
    });

    return posSale;
  }

  async getPosSales() {
    return posRepository.getPosSales();
  }

  async getPosSaleByInvoice(invoiceNumber: string) {
    const sale = await posRepository.findPosSaleByInvoice(invoiceNumber);
    if (!sale) {
      throw new NotFoundError(`Invoice "${invoiceNumber}" not found`, 'INVOICE_NOT_FOUND');
    }
    return sale;
  }

  async voidPosSale(staffId: string, invoiceNumber: string, reason: string) {
    const sale = await posRepository.findPosSaleByInvoice(invoiceNumber);
    if (!sale || Array.isArray(sale)) {
      throw new NotFoundError(`Invoice "${invoiceNumber}" not found`, 'INVOICE_NOT_FOUND');
    }

    const saleDoc = sale as any;

    if (saleDoc.status === 'voided') {
      throw new ValidationError(`Invoice "${invoiceNumber}" is already voided`);
    }

    // Restore stock in Product central inventory & log to Stock Ledger
    for (const item of saleDoc.items) {
      await ProductModel.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity, stockCached: item.quantity },
      });

      const storeIdStr =
        saleDoc.store && typeof saleDoc.store === 'object'
          ? saleDoc.store._id.toString()
          : saleDoc.store.toString();

      await posRepository.updateStock(
        item.product.toString(),
        storeIdStr,
        item.quantity,
        'pos_return',
        staffId,
        invoiceNumber,
        `Voided POS Sale ${invoiceNumber}. Reason: ${reason}`
      );
    }

    await deleteRedisCachePattern('cache:products:*');

    saleDoc.status = 'voided';
    saleDoc.voidedReason = reason;

    return posRepository.createPosSale({
      ...saleDoc,
      status: 'voided',
      voidedReason: reason,
    });
  }

  async getTodayStats(staffId?: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayFilter: any = {
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'completed',
    };

    const allTodaySales = await PosSaleModel.find(todayFilter).lean();

    const todayTotalRevenue = allTodaySales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);
    const todayInvoiceCount = allTodaySales.length;
    const totalItemsSold = allTodaySales.reduce((acc, s) => {
      const itemsCount = Array.isArray(s.items) ? s.items.reduce((iAcc: number, item: any) => iAcc + (item.quantity || 0), 0) : 0;
      return acc + itemsCount;
    }, 0);

    const avgBillValue = todayInvoiceCount > 0 ? todayTotalRevenue / todayInvoiceCount : 0;

    const paymentBreakdown = {
      cash: allTodaySales.filter((s) => s.paymentMethod === 'cash').reduce((acc, s) => acc + s.grandTotal, 0),
      bkash: allTodaySales.filter((s) => s.paymentMethod === 'bkash').reduce((acc, s) => acc + s.grandTotal, 0),
      nagad: allTodaySales.filter((s) => s.paymentMethod === 'nagad').reduce((acc, s) => acc + s.grandTotal, 0),
      card: allTodaySales.filter((s) => s.paymentMethod === 'card').reduce((acc, s) => acc + s.grandTotal, 0),
    };

    // My personal sales today
    let myTodaySales = 0;
    let myInvoiceCount = 0;
    if (staffId) {
      const mySales = allTodaySales.filter((s) => s.soldBy?.toString() === staffId);
      myTodaySales = mySales.reduce((acc, s) => acc + s.grandTotal, 0);
      myInvoiceCount = mySales.length;
    }

    return {
      todayTotalRevenue,
      todayInvoiceCount,
      totalItemsSold,
      avgBillValue,
      paymentBreakdown,
      myTodaySales,
      myInvoiceCount,
      recentSales: allTodaySales.slice(-10).reverse(),
    };
  }

  // Customer In-Store / POS Purchase History
  async getCustomerPurchases(userId: string, userPhone?: string, userEmail?: string) {
    return posRepository.findCustomerPurchases(userId, userPhone, userEmail);
  }
}

export const posService = new PosService();
