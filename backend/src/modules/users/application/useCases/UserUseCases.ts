import bcrypt from 'bcrypt';
import { User } from '../../../../models/User';

export class UserUseCases {
  static async listUsers() {
    return User.find().select('-passwordHash').sort({ createdAt: -1 });
  }

  static async createUser(data: any) {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      throw new Error('Email already in use');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await User.create({
      ...data,
      passwordHash,
    });

    const userObj = user.toObject();
    delete (userObj as any).passwordHash;
    return userObj;
  }

  static async updateUser(id: string, data: any) {
    if (data.email) {
      const existing = await User.findOne({ email: data.email, _id: { $ne: id } });
      if (existing) {
        throw new Error('Email already in use');
      }
    }

    const user = await User.findByIdAndUpdate(id, data, { new: true }).select('-passwordHash');
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  static async toggleStatus(id: string, isActive: boolean) {
    const user = await User.findByIdAndUpdate(id, { isActive }, { new: true }).select('-passwordHash');
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}
