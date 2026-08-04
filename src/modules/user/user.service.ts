import { NotFoundError } from '../../utils/AppError';
import { userRepository } from './user.repository';
import {
  CreateAddressInput,
  CreateUserInput,
  PublicUser,
  UpdateAddressInput,
  UpdateProfileInput,
  UserAddressInput,
  UserRole,
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

  async createCustomer(data: Omit<CreateUserInput, 'role' | 'isVerified'>) {
    return userRepository.create({
      ...data,
      role: 'customer' as UserRole,
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
    return userRepository.toPublicUser(user);
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
      user.email = normalizeEmail(input.email);
    }

    if (input.phone !== undefined) {
      user.phone = normalizePhone(input.phone);
    }

    const updatedUser = await user.save();
    return userRepository.toPublicUser(updatedUser);
  }

  async getAddresses(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User profile not found', 'USER_NOT_FOUND');
    }
    return userRepository.toPublicUser(user).addresses;
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
    return userRepository.toPublicUser(updatedUser);
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
    return userRepository.toPublicUser(updatedUser);
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
    return userRepository.toPublicUser(updatedUser);
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
    return userRepository.toPublicUser(updatedUser);
  }

  toPublicUser(user: any): PublicUser {
    return userRepository.toPublicUser(user);
  }
}

export const userService = new UserService();
