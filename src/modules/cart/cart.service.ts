import { AppError, NotFoundError, ValidationError } from '../../utils/AppError';
import { productRepository } from '../product/product.repository';
import { cartRepository } from './cart.repository';
import { AddCartItemInput, CartItemResponse, CartResponse, UpdateCartItemInput } from './cart.types';

export class CartService {
  async getCart(userId: string): Promise<CartResponse> {
    const cart = await cartRepository.getOrCreateCart(userId);
    const populatedCart = await cart.populate({
      path: 'items.product',
      select: 'name slug dosageForm unitType images price discountPrice stock stockCached requiresPrescription isActive',
    });

    const itemsResponse: CartItemResponse[] = [];
    let totalItemCount = 0;
    let subtotal = 0;
    let totalDiscount = 0;
    let grandTotal = 0;
    let hasPrescriptionProducts = false;
    let hasUnavailableItems = false;

    for (const item of populatedCart.items) {
      const product = item.product as any;

      if (!product || !product.isActive) {
        hasUnavailableItems = true;
        itemsResponse.push({
          product: {
            id: product ? product._id.toString() : item.product.toString(),
            name: product ? product.name : 'Unavailable Product',
            slug: product ? product.slug : '',
            dosageForm: product ? product.dosageForm : 'other',
            unitType: product ? product.unitType : 'pcs',
            images: product ? product.images : [],
            price: product ? Number(product.price) : 0,
            effectivePrice: 0,
            stock: 0,
            inStock: false,
            requiresPrescription: product ? Boolean(product.requiresPrescription) : false,
            isActive: false,
          },
          quantity: item.quantity,
          itemTotal: 0,
          isAvailable: false,
          isStockExceeded: true,
          maxAvailableQuantity: 0,
        });
        continue;
      }

      const price = Number(product.price);
      const discountPrice =
        product.discountPrice !== undefined && product.discountPrice !== null
          ? Number(product.discountPrice)
          : undefined;
      const effectivePrice =
        discountPrice !== undefined && discountPrice < price ? discountPrice : price;

      const stock = Number(product.stockCached !== undefined && product.stockCached !== null ? product.stockCached : product.stock || 0);
      const isStockExceeded = stock < item.quantity;
      const maxAvailableQuantity = stock;

      if (isStockExceeded || stock === 0) {
        hasUnavailableItems = true;
      }

      if (product.requiresPrescription) {
        hasPrescriptionProducts = true;
      }

      const itemSubtotal = price * item.quantity;
      const itemEffectiveTotal = effectivePrice * item.quantity;
      const itemDiscount = itemSubtotal - itemEffectiveTotal;

      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;
      grandTotal += itemEffectiveTotal;
      totalItemCount += item.quantity;

      itemsResponse.push({
        product: {
          id: product._id.toString(),
          name: product.name,
          slug: product.slug,
          dosageForm: product.dosageForm,
          unitType: product.unitType,
          images: product.images || [],
          price,
          discountPrice,
          effectivePrice,
          stock,
          inStock: stock > 0,
          requiresPrescription: Boolean(product.requiresPrescription),
          isActive: true,
        },
        quantity: item.quantity,
        itemTotal: itemEffectiveTotal,
        isAvailable: stock > 0,
        isStockExceeded,
        maxAvailableQuantity,
      });
    }

    return {
      id: populatedCart._id.toString(),
      userId,
      items: itemsResponse,
      totalItemCount,
      uniqueItemCount: itemsResponse.length,
      subtotal,
      totalDiscount,
      grandTotal,
      hasPrescriptionProducts,
      hasUnavailableItems,
      updatedAt: populatedCart.updatedAt,
    };
  }

  async addItem(userId: string, input: AddCartItemInput): Promise<CartResponse> {
    const product: any = await productRepository.findRawById(input.productId);
    if (!product || !product.isActive) {
      throw new NotFoundError('Product not found or unavailable', 'PRODUCT_NOT_FOUND');
    }

    if (input.quantity <= 0) {
      throw new ValidationError('Quantity must be at least 1');
    }

    const availableStock = Number(product.stockCached !== undefined && product.stockCached !== null ? product.stockCached : product.stock || 0);
    const cart = await cartRepository.getOrCreateCart(userId);
    const existingItem = cart.items.find(
      (item: any) => item.product.toString() === input.productId
    );

    const currentQty = existingItem ? existingItem.quantity : 0;
    const requestedTotalQty = currentQty + input.quantity;

    if (requestedTotalQty > availableStock && !input.allowPreOrder) {
      throw new ValidationError(`পর্যাপ্ত স্টক নেই (সর্বোচ্চ উপলব্ধ: ${availableStock} টি)`);
    }

    if (existingItem) {
      existingItem.quantity = requestedTotalQty;
    } else {
      cart.items.push({
        product: product._id,
        quantity: input.quantity,
        addedAt: new Date(),
      } as any);
    }

    await cart.save();
    return this.getCart(userId);
  }

  async updateItem(userId: string, productId: string, input: UpdateCartItemInput): Promise<CartResponse> {
    if (input.quantity <= 0) {
      return this.removeItem(userId, productId);
    }

    const product: any = await productRepository.findRawById(productId);
    if (product) {
      const availableStock = Number(product.stockCached !== undefined && product.stockCached !== null ? product.stockCached : product.stock || 0);
      if (input.quantity > availableStock) {
        throw new ValidationError(`পর্যাপ্ত স্টক নেই (সর্বোচ্চ উপলব্ধ: ${availableStock} টি)`);
      }
    }

    const cart = await cartRepository.getOrCreateCart(userId);
    const existingItem = cart.items.find(
      (item: any) => item.product.toString() === productId
    );

    if (!existingItem) {
      throw new NotFoundError('Item not found in cart', 'ITEM_NOT_IN_CART');
    }

    existingItem.quantity = input.quantity;
    await cart.save();

    return this.getCart(userId);
  }

  async removeItem(userId: string, productId: string): Promise<CartResponse> {
    const cart = await cartRepository.getOrCreateCart(userId);
    cart.items = cart.items.filter((item: any) => item.product.toString() !== productId) as any;
    await cart.save();
    return this.getCart(userId);
  }

  async clearCart(userId: string): Promise<void> {
    await cartRepository.clearCart(userId);
  }
}

export const cartService = new CartService();
