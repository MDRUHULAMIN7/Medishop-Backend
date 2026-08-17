import { ConflictError, NotFoundError, ValidationError } from '../../utils/AppError';
import { userRepository } from './user.repository';
import { authRepository } from '../auth/auth.repository';
import {
  CreateAddressInput,
  CreateUserInput,
  PublicUser,
  UpdateAddressInput,
  UpdateProfileInput,
  UserAddressInput,
  UserRole,
  UserStatus,
} from './user.types';

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizePhone = (value: string) => value.trim().replace(/[\s-]/g, '');

const buildAddressPayload = (input: UserAddressInput, shouldDefault: boolean) => ({
  label: input.label?.trim(),
  recipientName: input.recipientName.trim(),
  phone: normalizePhone(input.phone),
  division: input.division?.trim(),
  district: input.district.trim(),
  thana: input.thana.trim(),
  addressLine: input.addressLine.trim(),
  postalCode: input.postalCode?.trim(),
  isDefault: shouldDefault || Boolean(input.isDefault),
});

export class UserService {
  async findByIdentifier(identifier: string, includePassword = false) {
    return userRepository.findByIdentifier(identifier, includePassword);
  }

  async findById(userId: string, includePassword = false) {
    return userRepository.findById(userId, includePassword);
  }

  async getUserById(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }
    return userRepository.toPublicUser(user, true);
  }

  async createCustomer(data: Omit<CreateUserInput, 'role' | 'isVerified'>) {
    return userRepository.create({
      ...data,
      role: 'customer' as UserRole,
      status: 'active',
      isVerified: true,
    });
  }

  async createUser(data: CreateUserInput) {
    return userRepository.create(data);
  }

  async updatePassword(userId: string, password: string) {
    return userRepository.updatePassword({ userId, password });
  }

  async markLastLogin(userId: string) {
    return userRepository.markLastLogin(userId);
  }

  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User profile not found', 'USER_NOT_FOUND');
    }
    return userRepository.toPublicUser(user, true);
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User profile not found', 'USER_NOT_FOUND');
    }

    if (input.name !== undefined) {
      user.name = input.name.trim();
    }

    if (input.email !== undefined) {
      const newEmail = input.email ? input.email.trim().toLowerCase() : '';
      const currentEmail = (user.email || '').trim().toLowerCase();

      if (currentEmail && newEmail && newEmail !== currentEmail) {
        throw new ValidationError('Email address is permanently locked and cannot be modified');
      } else if (!currentEmail && newEmail) {
        // User adding email for the first time
        const existing = await userRepository.findByEmail(newEmail);
        if (existing && existing._id.toString() !== user._id.toString()) {
          throw new ConflictError('This email is already associated with another account', 'EMAIL_IN_USE');
        }
        user.email = newEmail;
      }
    }

    if (input.phone !== undefined) {
      const newPhone = input.phone ? normalizePhone(input.phone) : '';
      const currentPhone = user.phone ? normalizePhone(user.phone) : '';

      if (currentPhone && newPhone && newPhone !== currentPhone) {
        throw new ValidationError('Mobile phone number is permanently locked and cannot be modified');
      } else if (!currentPhone && newPhone) {
        // User adding mobile number for the first time
        const existing = await userRepository.findByPhone(newPhone);
        if (existing && existing._id.toString() !== user._id.toString()) {
          throw new ConflictError('This mobile phone number is already associated with another account', 'PHONE_IN_USE');
        }
        user.phone = newPhone;
      }
    }

    if (input.avatar !== undefined) {
      user.avatar = input.avatar ? input.avatar.trim() : null;
    }

    const updatedUser = await user.save();
    return userRepository.toPublicUser(updatedUser, true);
  }

  async updateUserStatus(userId: string, status: UserStatus) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    user.status = status;
    const updatedUser = await user.save();

    // If blocked, immediately revoke all refresh token sessions so user cannot refresh or continue session
    if (status === 'blocked') {
      await authRepository.revokeAllRefreshSessions(userId);
    }

    return userRepository.toPublicUser(updatedUser, false);
  }

  async listUsers(query: { page?: number; limit?: number; search?: string; status?: UserStatus; role?: UserRole }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const filter: any = {};

    if (query.status) {
      filter.status = query.status;
    }

    if (query.role) {
      filter.role = query.role;
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }];
    }

    return userRepository.findAll(filter, page, limit);
  }

  async getAddresses(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User profile not found', 'USER_NOT_FOUND');
    }
    return userRepository.toPublicUser(user, true).addresses || [];
  }

  async addAddress(userId: string, input: CreateAddressInput) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User profile not found', 'USER_NOT_FOUND');
    }

    const shouldDefault = input.isDefault ?? user.addresses.length === 0;
    if (shouldDefault) {
      user.addresses.forEach((address: any) => {
        address.isDefault = false;
      });
    }

    user.addresses.push(buildAddressPayload(input, shouldDefault) as any);
    const updatedUser = await user.save();
    return userRepository.toPublicUser(updatedUser, true);
  }

  async updateAddress(userId: string, addressId: string, input: UpdateAddressInput) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User profile not found', 'USER_NOT_FOUND');
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      throw new NotFoundError('Shipping address not found', 'ADDRESS_NOT_FOUND');
    }

    if (input.label !== undefined) {
      address.label = input.label.trim();
    }
    if (input.recipientName !== undefined) {
      address.recipientName = input.recipientName.trim();
    }
    if (input.phone !== undefined) {
      address.phone = normalizePhone(input.phone);
    }
    if (input.division !== undefined) {
      address.division = input.division.trim();
    }
    if (input.district !== undefined) {
      address.district = input.district.trim();
    }
    if (input.thana !== undefined) {
      address.thana = input.thana.trim();
    }
    if (input.addressLine !== undefined) {
      address.addressLine = input.addressLine.trim();
    }
    if (input.postalCode !== undefined) {
      address.postalCode = input.postalCode.trim();
    }

    if (input.isDefault !== undefined) {
      if (input.isDefault) {
        user.addresses.forEach((existingAddress: any) => {
          existingAddress.isDefault = false;
        });
        address.isDefault = true;
      } else {
        address.isDefault = false;
      }
    }

    if (user.addresses.length === 1) {
      address.isDefault = true;
    }

    const updatedUser = await user.save();
    return userRepository.toPublicUser(updatedUser, true);
  }

  async removeAddress(userId: string, addressId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User profile not found', 'USER_NOT_FOUND');
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      throw new NotFoundError('Shipping address not found', 'ADDRESS_NOT_FOUND');
    }

    const wasDefault = Boolean(address.isDefault);
    address.deleteOne();

    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    const updatedUser = await user.save();
    return userRepository.toPublicUser(updatedUser, true);
  }

  async setDefaultAddress(userId: string, addressId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User profile not found', 'USER_NOT_FOUND');
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      throw new NotFoundError('Shipping address not found', 'ADDRESS_NOT_FOUND');
    }

    user.addresses.forEach((existingAddress: any) => {
      existingAddress.isDefault = false;
    });
    address.isDefault = true;

    const updatedUser = await user.save();
    return userRepository.toPublicUser(updatedUser, true);
  }

  toPublicUser(user: any, includeAddresses = false): PublicUser {
    return userRepository.toPublicUser(user, includeAddresses);
  }
}

export const userService = new UserService();
