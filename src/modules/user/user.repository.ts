import { FilterQuery } from 'mongoose';
import { UserModel } from './user.model';
import { CreateUserInput, PublicUser, UpdatePasswordInput, UserDocumentData } from './user.types';

const toPublicUser = (user: any): PublicUser => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isVerified: user.isVerified,
  addresses: user.addresses ?? [],
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
    const created = await UserModel.create(data);
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

  async findByIdentifier(identifier: string, includePassword = false) {
    const filter = identifier.includes('@') ? { email: identifier } : { phone: identifier };
    return this.findOne(filter, includePassword);
  }

  async existsByIdentifier(identifier: string) {
    const filter = identifier.includes('@') ? { email: identifier } : { phone: identifier };
    return UserModel.exists(filter);
  }

  toPublicUser(user: any): PublicUser {
    return toPublicUser(user);
  }
}

export const userRepository = new UserRepository();
