import { userRepository } from './user.repository';
import { CreateUserInput, PublicUser, UserRole } from './user.types';

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

  toPublicUser(user: any): PublicUser {
    return userRepository.toPublicUser(user);
  }
}

export const userService = new UserService();
