import { Types } from 'mongoose';
import { ROLES } from '../../config/constants';

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export interface UserAddressInput {
  label?: string;
  recipientName: string;
  phone: string;
  division?: string;
  district: string;
  thana: string;
  addressLine: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface UserAddressDocument extends UserAddressInput {
  _id: Types.ObjectId;
}

export interface UserAddress extends UserAddressInput {
  id: string;
}

export interface UserDocumentData {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  role: UserRole;
  isVerified: boolean;
  addresses: UserAddressDocument[];
  lastLoginAt?: Date | null;
  passwordChangedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateUserInput {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  role?: UserRole;
  isVerified?: boolean;
}

export interface UpdatePasswordInput {
  userId: string;
  password: string;
  passwordChangedAt?: Date;
}

export interface PublicUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  isVerified: boolean;
  addresses: UserAddress[];
  lastLoginAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  phone?: string;
}

export interface CreateAddressInput extends UserAddressInput {}

export interface UpdateAddressInput extends Partial<UserAddressInput> {}
