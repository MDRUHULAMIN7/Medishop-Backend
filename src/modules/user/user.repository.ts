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

const toPublicUser = (user: any, includeAddresses = false): PublicUser => {
  const result: PublicUser = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatar: user.avatar ?? null,
    status: user.status ?? 'active',
    isVerified: user.isVerified,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  if (includeAddresses && user.addresses) {
    result.addresses = (user.addresses ?? []).map(mapAddress);
  }

  return result;
};

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

  async findByEmail(email: string, includePassword = false) {
    const cleaned = email.trim().toLowerCase();
    return this.findOne({ email: cleaned }, includePassword);
  }

  async findByPhone(phone: string, includePassword = false) {
    const cleaned = phone.trim().replace(/[\s-]/g, '');
    const normalized = cleaned.startsWith('01') ? `+88${cleaned}` : cleaned.startsWith('880') ? `+${cleaned}` : cleaned;
    const raw = normalized.replace(/^\+88/, '').replace(/^\+/, '');

    return UserModel.findOne({
      $or: [
        { phone: normalized },
        { phone: raw },
        { phone: `+88${raw}` },
        { phone: `88${raw}` },
        { phone: `0${raw.replace(/^0/, '')}` },
      ],
    }).select(includePassword ? '+password' : '');
  }

  async findByIdentifier(identifier: string, includePassword = false) {
    const trimmed = identifier.trim();
    if (trimmed.includes('@')) {
      return this.findByEmail(trimmed, includePassword);
    }
    return this.findByPhone(trimmed, includePassword);
  }

  async existsByIdentifier(identifier: string) {
    const trimmed = identifier.trim();
    if (trimmed.includes('@')) {
      return UserModel.exists({ email: trimmed.toLowerCase() });
    }
    const cleaned = trimmed.replace(/[\s-]/g, '');
    const normalized = cleaned.startsWith('01') ? `+88${cleaned}` : cleaned.startsWith('880') ? `+${cleaned}` : cleaned;
    const raw = normalized.replace(/^\+88/, '').replace(/^\+/, '');

    return UserModel.exists({
      $or: [
        { phone: normalized },
        { phone: raw },
        { phone: `+88${raw}` },
        { phone: `0${raw.replace(/^0/, '')}` },
      ],
    });
  }

  async findAll(filter: FilterQuery<UserDocumentData> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      UserModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      UserModel.countDocuments(filter),
    ]);
    return {
      users: users.map((user) => toPublicUser(user, false)),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  toPublicUser(user: any, includeAddresses = false): PublicUser {
    return toPublicUser(user, includeAddresses);
  }
}

export const userRepository = new UserRepository();
