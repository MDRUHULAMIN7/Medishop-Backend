import { emitToAdmins } from '../../socket';
import { AppError, NotFoundError, ValidationError } from '../../utils/AppError';
import { ProductModel } from '../product/product.model';
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

    const discountTotal = input.discountTotal ? Number(input.discountTotal) : 0;
    const taxAmount = input.taxAmount ? Number(input.taxAmount) : 0;
    const grandTotal = Math.max(0, subtotal - discountTotal + taxAmount);
    const paidAmount = Number(input.paidAmount);

    if (paidAmount < grandTotal) {
      throw new ValidationError(
        `Insufficient payment amount. Total is ৳${grandTotal.toFixed(2)}, but paid amount was ৳${paidAmount.toFixed(2)}.`
      );
    }

    const changeAmount = paidAmount - grandTotal;
    const invoiceNumber = generateInvoiceNumber();

    // Deduct central stock & write to Stock Ledger for each item
    for (const itemSnapshot of saleItemSnapshots) {
      await ProductModel.findByIdAndUpdate(itemSnapshot.product, {
        $inc: { stock: -itemSnapshot.quantity },
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

    // Create POS Sale record
    const posSale = await posRepository.createPosSale({
      invoiceNumber,
      store: storeId,
      soldBy: staffId,
      customerName: input.customerName || 'Walk-in Customer',
      customerPhone: input.customerPhone,
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
        $inc: { stock: item.quantity },
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

    saleDoc.status = 'voided';
    saleDoc.voidedReason = reason;

    return posRepository.createPosSale({
      ...saleDoc,
      status: 'voided',
      voidedReason: reason,
    });
  }
}

export const posService = new PosService();
