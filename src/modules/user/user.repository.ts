import { FilterQuery } from 'mongoose';
import { UserModel } from './user.model';
import { CreateUserInput, PublicUser, UpdatePasswordInput, UserAddress, UserDocumentData, UserStatus } from './user.types';

const mapAddress = (address: any): UserAddress => ({
  id: address._id.toString(),
  label: address.label,
  recipientName: address.recipientName,
  phone: address.phone,
  division: address.division,
  district: address.district,
  thana: address.thana,
  addressLine: address.addressLine,
  postalCode: address.postalCode,
  isDefault: address.isDefault,
});

const toPublicUser = (user: any): PublicUser => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  avatar: user.avatar ?? null,
  status: user.status ?? 'active',
  isVerified: user.isVerified,
  addresses: (user.addresses ?? []).map(mapAddress),
  lastLoginAt: user.lastLoginAt ?? null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export class UserRepository {
  async findOne(filter: FilterQuery<UserDocumentData>, includePassword = false) {
    const query = UserModel.findOne(filter);
    if (includePassword) {
      query.select('+password');
    }
    return query;
  }

  async findById(userId: string, includePassword = false) {
    const query = UserModel.findById(userId);
    if (includePassword) {
      query.select('+password');
    }
    return query;
  }

  async create(data: CreateUserInput) {
    const created = await UserModel.create({
      ...data,
      avatar: data.avatar ?? null,
      status: data.status ?? 'active',
    });
    return created;
  }

  async updatePassword({ userId, password, passwordChangedAt }: UpdatePasswordInput) {
    return UserModel.findByIdAndUpdate(
      userId,
      {
        password,
        passwordChangedAt: passwordChangedAt ?? new Date(),
      },
      { new: true }
    );
  }

  async markLastLogin(userId: string) {
    return UserModel.findByIdAndUpdate(userId, { lastLoginAt: new Date() }, { new: true });
  }

  async updateProfile(userId: string, data: Partial<Pick<UserDocumentData, 'name' | 'email' | 'phone' | 'avatar'>>) {
    return UserModel.findByIdAndUpdate(userId, data, { new: true, runValidators: true });
  }

  async updateStatus(userId: string, status: UserStatus) {
    return UserModel.findByIdAndUpdate(userId, { status }, { new: true });
  }

  async findByIdentifier(identifier: string, includePassword = false) {
    const filter = identifier.includes('@') ? { email: identifier } : { phone: identifier };
    return this.findOne(filter, includePassword);
  }

  async existsByIdentifier(identifier: string) {
    const filter = identifier.includes('@') ? { email: identifier } : { phone: identifier };
    return UserModel.exists(filter);
  }

  async findAll(filter: FilterQuery<UserDocumentData> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      UserModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      UserModel.countDocuments(filter),
    ]);
    return { users: users.map(toPublicUser), total, page, limit, pages: Math.ceil(total / limit) };
  }

  toPublicUser(user: any): PublicUser {
    return toPublicUser(user);
  }
}

export const userRepository = new UserRepository();
