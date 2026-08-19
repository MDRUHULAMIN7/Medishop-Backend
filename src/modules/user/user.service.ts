import { ConflictError, NotFoundError, ValidationError } from '../../utils/AppError';
import { userRepository } from './user.repository';
import { authRepository } from '../auth/auth.repository';
import { UserModel } from './user.model';
import { StaffInvitationModel } from './staffInvitation.model';
import { createAccessToken, createRefreshToken, generateSessionId } from '../auth/auth.utils';
import { emitToUser } from '../../socket';
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
      emitToUser(userId, 'account:blocked', {
        message: 'Your account has been blocked by an administrator. Access is restricted.',
      });
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

  // ==================== Staff Invitation & Promotion System ====================

  async sendStaffInvitation(
    senderId: string,
    input: { identifier: string; targetRole: string; notes?: string }
  ) {
    const rawIdentifier = input.identifier.trim();
    let recipient: any = null;

    // Search by email, phone, or ObjectId
    if (rawIdentifier.includes('@')) {
      recipient = await userRepository.findByEmail(rawIdentifier.toLowerCase());
    } else if (rawIdentifier.startsWith('01') || rawIdentifier.startsWith('+88') || rawIdentifier.startsWith('88')) {
      recipient = await userRepository.findByPhone(normalizePhone(rawIdentifier));
    } else {
      try {
        recipient = await userRepository.findById(rawIdentifier);
      } catch {
        recipient = null;
      }
    }

    if (!recipient) {
      recipient = await UserModel.findOne({
        $or: [
          { email: rawIdentifier.toLowerCase() },
          { phone: normalizePhone(rawIdentifier) },
          { name: new RegExp(`^${rawIdentifier}$`, 'i') },
        ],
      });
    }

    if (!recipient) {
      throw new NotFoundError(
        `User "${rawIdentifier}" not found. Please ensure the user has already registered an account.`,
        'USER_NOT_FOUND'
      );
    }

    if (recipient.role === input.targetRole) {
      throw new ValidationError(
        `User "${recipient.name}" already has the role "${input.targetRole}".`
      );
    }

    // Cancel any existing pending invitation for this recipient
    await StaffInvitationModel.updateMany(
      { recipient: recipient._id, status: 'pending' },
      { $set: { status: 'cancelled' } }
    );

    const invitation = await StaffInvitationModel.create({
      sender: senderId,
      recipient: recipient._id,
      recipientEmail: recipient.email || undefined,
      recipientPhone: recipient.phone || undefined,
      recipientName: recipient.name,
      targetRole: input.targetRole,
      notes: input.notes,
      status: 'pending',
    });

    const populated = await StaffInvitationModel.findById(invitation._id)
      .populate('sender', 'name email role')
      .populate('recipient', 'name email phone role');

    return populated;
  }

  async getStaffInvitations(query: { status?: string; page?: number; limit?: number }) {
    const filter: any = {};
    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 50));
    const skip = (page - 1) * limit;

    const [invitations, total] = await Promise.all([
      StaffInvitationModel.find(filter)
        .populate('sender', 'name email role')
        .populate('recipient', 'name email phone role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StaffInvitationModel.countDocuments(filter),
    ]);

    return { invitations, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async cancelStaffInvitation(invitationId: string) {
    const invitation = await StaffInvitationModel.findById(invitationId);
    if (!invitation) {
      throw new NotFoundError('Staff invitation not found', 'INVITATION_NOT_FOUND');
    }

    invitation.status = 'cancelled';
    await invitation.save();
    return invitation;
  }

  async getMyStaffInvitations(userId: string) {
    const user = (await UserModel.findById(userId).lean()) as any;
    const userEmail = user?.email?.toLowerCase();
    const userPhone = user?.phone;

    const filter: any = {
      status: 'pending',
      $or: [
        { recipient: userId },
        ...(userEmail ? [{ recipientEmail: userEmail }] : []),
        ...(userPhone ? [{ recipientPhone: userPhone }] : []),
      ],
    };

    return StaffInvitationModel.find(filter)
      .populate('sender', 'name email role')
      .sort({ createdAt: -1 })
      .lean();
  }

  async acceptStaffInvitation(userId: string, invitationId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User account not found', 'USER_NOT_FOUND');
    }

    const invitation = await StaffInvitationModel.findOne({
      _id: invitationId,
      status: 'pending',
      $or: [
        { recipient: userId },
        ...(user.email ? [{ recipientEmail: user.email.toLowerCase() }] : []),
        ...(user.phone ? [{ recipientPhone: user.phone }] : []),
      ],
    });

    if (!invitation) {
      throw new NotFoundError('Pending staff invitation not found', 'INVITATION_NOT_FOUND');
    }

    // Update user role
    user.role = invitation.targetRole as UserRole;
    await user.save();

    // Mark invitation accepted
    invitation.recipient = user._id;
    invitation.status = 'accepted';
    invitation.respondedAt = new Date();
    await invitation.save();

    // Issue refreshed session tokens with new role
    const sessionId = generateSessionId();
    const accessToken = createAccessToken(user._id.toString(), user.role, sessionId);
    const refreshToken = createRefreshToken(user._id.toString(), user.role, sessionId);
    await authRepository.storeRefreshSession(user._id.toString(), sessionId, refreshToken);

    return {
      user: userRepository.toPublicUser(user, true),
      accessToken,
      refreshToken,
      message: `Congratulations! Your role has been updated to ${invitation.targetRole}.`,
    };
  }

  async declineStaffInvitation(userId: string, invitationId: string) {
    const user = (await UserModel.findById(userId).lean()) as any;
    const invitation = await StaffInvitationModel.findOne({
      _id: invitationId,
      status: 'pending',
      $or: [
        { recipient: userId },
        ...(user?.email ? [{ recipientEmail: user.email.toLowerCase() }] : []),
        ...(user?.phone ? [{ recipientPhone: user.phone }] : []),
      ],
    });

    if (!invitation) {
      throw new NotFoundError('Pending staff invitation not found', 'INVITATION_NOT_FOUND');
    }

    invitation.status = 'declined';
    invitation.respondedAt = new Date();
    await invitation.save();

    return { declined: true };
  }

  async searchCustomers(query: string) {
    if (!query || query.trim().length === 0) {
      return UserModel.find({ status: 'active' })
        .select('name email phone role avatar addresses createdAt')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
    }

    const clean = query.trim();
    const regex = new RegExp(clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    return UserModel.find({
      status: 'active',
      $or: [{ name: regex }, { email: regex }, { phone: regex }],
    })
      .select('name email phone role avatar addresses createdAt')
      .limit(20)
      .lean();
  }

  toPublicUser(user: any, includeAddresses = false): PublicUser {
    return userRepository.toPublicUser(user, includeAddresses);
  }
}

export const userService = new UserService();
