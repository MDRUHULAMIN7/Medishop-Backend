import { Types } from 'mongoose';
import { CartModel } from './cart.model';

export class CartRepository {
  async findByUserId(userId: string) {
    return CartModel.findOne({ user: new Types.ObjectId(userId) }).populate({
      path: 'items.product',
      select: 'name slug dosageForm unitType images price discountPrice stock requiresPrescription isActive',
    });
  }

  async findRawByUserId(userId: string) {
    return CartModel.findOne({ user: new Types.ObjectId(userId) });
  }

  async getOrCreateCart(userId: string) {
    let cart = await CartModel.findOne({ user: new Types.ObjectId(userId) });
    if (!cart) {
      cart = await CartModel.create({ user: new Types.ObjectId(userId), items: [] });
    }
    return cart;
  }

  async clearCart(userId: string) {
    return CartModel.findOneAndUpdate(
      { user: new Types.ObjectId(userId) },
      { items: [] },
      { new: true }
    );
  }
}

export const cartRepository = new CartRepository();
