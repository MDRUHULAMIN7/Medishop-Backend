import { Schema, model, models, HydratedDocument } from 'mongoose';
import { ICart, ICartItem } from './cart.types';

const cartItemSchema = new Schema<ICartItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const cartSchema = new Schema<ICart>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: { type: [cartItemSchema], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export type CartDocument = HydratedDocument<ICart>;

export const CartModel = models.Cart || model<ICart>('Cart', cartSchema);
