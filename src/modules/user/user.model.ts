import { Schema, model, models, HydratedDocument } from 'mongoose';
import { ROLES } from '../../config/constants';
import { UserAddress, UserDocumentData } from './user.types';

const userAddressSchema = new Schema<UserAddress>(
  {
    label: { type: String, trim: true },
    recipientName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    division: { type: String, trim: true },
    district: { type: String, required: true, trim: true },
    thana: { type: String, required: true, trim: true },
    addressLine: { type: String, required: true, trim: true },
    postalCode: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new Schema<UserDocumentData>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, index: true, sparse: true, unique: true },
    phone: { type: String, trim: true, index: true, sparse: true, unique: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.CUSTOMER,
      index: true,
    },
    isVerified: { type: Boolean, default: false },
    addresses: { type: [userAddressSchema], default: [] },
    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        const output = ret as any;
        delete output.password;
        delete output.__v;
        return output;
      },
    },
  }
);

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });

export type UserDocument = HydratedDocument<UserDocumentData>;

export const UserModel = models.User || model<UserDocumentData>('User', userSchema);
