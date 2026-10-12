import bcrypt from 'bcrypt';
import { User } from '../../../../models/User';

export class UserUseCases {
  static async listUsers(
    filters?: { search?: string; role?: string; isActive?: boolean },
    page?: number,
    limit?: number
  ) {
    const query: any = {};
    if (filters?.role) {
      query.role = filters.role;
    }
    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    if (filters?.search) {
      const regex = new RegExp(filters.search, 'i');
      query.$or = [{ name: regex }, { email: regex }];
    }

    if (page && limit) {
      const skip = (page - 1) * limit;
      const [users, total] = await Promise.all([
        User.find(query).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limit),
        User.countDocuments(query),
      ]);
      return {
        users,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    return User.find(query).select('-passwordHash').sort({ createdAt: -1 });
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

  static async changePassword(id: string, newPassword: string) {
    const user = await User.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordHash = passwordHash;
    await user.save();

    const userObj = user.toObject();
    delete (userObj as any).passwordHash;
    return userObj;
  }

  static async toggleStatus(id: string, isActive: boolean, actorId?: string) {
    if (!isActive) {
      if (actorId && actorId === id) {
        throw new Error('No puedes desactivar tu propia cuenta');
      }
      const target = await User.findById(id);
      if (target?.role === 'admin') {
        const activeAdmins = await User.countDocuments({ role: 'admin', isActive: true });
        if (activeAdmins <= 1) {
          throw new Error('No se puede desactivar el único administrador activo');
        }
      }
    }

    const user = await User.findByIdAndUpdate(id, { isActive }, { new: true }).select('-passwordHash');
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}
