import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { File } from '../models/File';
import { ConversionLog } from '../models/ConversionLog';
import { Session } from '../models/Session';
import { AppError } from '../middleware/errorHandler';
import os from 'os';

export class AdminController {
  /**
   * Retrieves high level system stats (Users count, conversions count, storage counts)
   */
  public static async getAdminStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const totalUsers = await User.countDocuments();
      const totalFiles = await File.countDocuments({ status: 'completed' });
      const totalConversions = await ConversionLog.countDocuments({ status: 'success' });
      
      const users = await User.find({}, 'storageUsed');
      const totalStorageUsed = users.reduce((sum, u) => sum + (u.storageUsed || 0), 0);

      // Conversions over time (last 7 days breakdown for charts)
      const logs = await ConversionLog.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      res.status(200).json({
        status: 'success',
        data: {
          metrics: {
            totalUsers,
            totalFiles,
            totalConversions,
            totalStorageUsed
          },
          conversionsChart: logs
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get server health metrics using Node OS library
   */
  public static async getServerMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const freeMem = os.freemem();
      const totalMem = os.totalmem();
      const usedMem = totalMem - freeMem;
      const memPercentage = Number(((usedMem / totalMem) * 100).toFixed(2));

      const serverStats = {
        platform: os.platform(),
        arch: os.arch(),
        uptime: Math.round(os.uptime()), // in seconds
        cpus: os.cpus().length,
        loadAvg: os.loadavg(), // 1, 5, 15 min averages
        memory: {
          total: totalMem,
          free: freeMem,
          used: usedMem,
          percentage: memPercentage
        }
      };

      res.status(200).json({
        status: 'success',
        data: { serverStats }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get list of all users (Paginated, sorting, search filter)
   */
  public static async getUsersList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, page = 1, limit = 10 } = req.query;
      const query: any = {};

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (Number(page) - 1) * Number(limit);
      const users = await User.find(query)
        .select('-passwordHash')
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit));

      const totalUsers = await User.countDocuments(query);

      res.status(200).json({
        status: 'success',
        data: {
          users,
          pagination: {
            currentPage: Number(page),
            totalPages: Math.ceil(totalUsers / Number(limit)),
            totalUsers
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update specific user details or role
   */
  public static async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { role, maxStorageLimit } = req.body;

      const user = await User.findById(id);
      if (!user) {
        throw new AppError('User not found.', 404);
      }

      if (role) user.role = role;
      if (maxStorageLimit !== undefined) user.maxStorageLimit = Number(maxStorageLimit);

      await user.save();

      res.status(200).json({
        status: 'success',
        message: 'User details updated successfully.',
        data: {
          user: {
            id: user.id,
            name: user.name,
            role: user.role,
            maxStorageLimit: user.maxStorageLimit
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin deleted a user account
   */
  public static async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = await User.findById(id);

      if (!user) {
        throw new AppError('User not found.', 404);
      }

      if (user.role === 'admin') {
        throw new AppError('Administrative accounts cannot be deleted directly.', 400);
      }

      // Delete files owned by this user
      const files = await File.find({ ownerId: user.id });
      for (const file of files) {
        // delete from storage
        await File.deleteOne({ _id: file.id });
      }

      // Delete user session records
      await Session.deleteMany({ userId: user.id });
      
      // Delete user record
      await User.deleteOne({ _id: id });

      res.status(200).json({
        status: 'success',
        message: `Account ${user.email} and all owned resources deleted successfully.`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all conversion logs (Paginated)
   */
  public static async getConversionLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const logs = await ConversionLog.find()
        .populate('userId', 'name email')
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit));

      const totalLogs = await ConversionLog.countDocuments();

      res.status(200).json({
        status: 'success',
        data: {
          logs,
          pagination: {
            currentPage: Number(page),
            totalPages: Math.ceil(totalLogs / Number(limit)),
            totalLogs
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
