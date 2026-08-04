import userRepository from '../repositories/user.repository';
import { IUser } from '../types/db.types';
import { UserRole } from '../types/enums';
import { hashPassword, comparePassword } from '../utils/hash.utils';
import { generateUserId } from '../utils/idGenerator';

export class UserService {
  async registerUser(userData: {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    role?: UserRole;
    profileImage?: string;
  }): Promise<IUser> {
    const cleanEmail = userData.email.trim().toLowerCase();
    const existing = await userRepository.findByEmail(cleanEmail);
    if (existing) {
      throw new Error('User with this email already exists.');
    }

    const role: UserRole = userData.role || 'USER';
    const userId = generateUserId(role);
    const hashedPassword = await hashPassword(userData.password || 'password123');
    const now = new Date().toISOString();

    const newUser: IUser = {
      userId,
      role,
      name: userData.name,
      email: cleanEmail,
      phone: userData.phone || '',
      password: hashedPassword,
      status: 'ACTIVE',
      profileImage: userData.profileImage || '',
      createdAt: now,
      updatedAt: now
    };

    return userRepository.create(newUser);
  }

  async authenticateUser(email: string, passwordAttempt: string): Promise<IUser | null> {
    const cleanEmail = email.trim().toLowerCase();
    const user = await userRepository.findByEmail(cleanEmail);
    if (!user) return null;

    const isValid = await comparePassword(passwordAttempt, user.password);
    if (!isValid) return null;

    return user;
  }

  async getUserById(userId: string): Promise<IUser | null> {
    return userRepository.findByUserId(userId);
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    return userRepository.findByEmail(email);
  }

  async updateUserProfile(userId: string, updates: Partial<IUser>): Promise<IUser | null> {
    if (updates.password) {
      updates.password = await hashPassword(updates.password);
    }
    return userRepository.update(userId, updates);
  }
}

export const userService = new UserService();
export default userService;
