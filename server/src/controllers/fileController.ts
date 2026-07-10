import { Response, NextFunction } from 'express';
import { File } from '../models/File';
import { User } from '../models/User';
import { ConversionLog } from '../models/ConversionLog';
import { storageProvider } from '../config/storage';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import path from 'path';
import fs from 'fs';

export class FileController {
  /**
   * Retrieves dashboard storage metrics and conversion history counters
   */
  public static async getDashboardAnalytics(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.userId;
      
      const fileCount = await File.countDocuments({ ownerId: userId, status: 'completed' });
      const favoriteCount = await File.countDocuments({ ownerId: userId, isFavorite: true });
      const logs = await ConversionLog.countDocuments({ userId: userId, status: 'success' });
      
      // Calculate breakdown of file types
      const files = await File.find({ ownerId: userId, status: 'completed' });
      const typesBreakdown = {
        pdf: 0,
        images: 0,
        documents: 0,
        others: 0
      };

      files.forEach(f => {
        const ext = path.extname(f.name).toLowerCase();
        if (ext === '.pdf') typesBreakdown.pdf++;
        else if (['.jpg', '.jpeg', '.png', '.webp', '.svg', '.bmp', '.tiff', '.ico'].includes(ext)) typesBreakdown.images++;
        else if (['.docx', '.doc', '.txt'].includes(ext)) typesBreakdown.documents++;
        else typesBreakdown.others++;
      });

      res.status(200).json({
        status: 'success',
        data: {
          fileCount,
          favoriteCount,
          conversionsCount: logs,
          typesBreakdown
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List files for the logged in user with search, sort, filters and pagination
   */
  public static async getUserFiles(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.userId;
      const { search, sortBy, filter, page = 1, limit = 10 } = req.query;

      const query: any = { ownerId: userId };

      // Search keyword filter
      if (search) {
        query.originalName = { $regex: search, $options: 'i' };
      }

      // Quick filter tabs
      if (filter === 'favorites') {
        query.isFavorite = true;
      } else if (filter === 'pdf') {
        query.name = { $regex: /\.pdf$/i };
      } else if (filter === 'images') {
        query.name = { $regex: /\.(jpg|jpeg|png|webp|svg|bmp|tiff|heic|ico)$/i };
      } else if (filter === 'documents') {
        query.name = { $regex: /\.(docx|doc|txt)$/i };
      }

      // Sorting
      let sortField = '-createdAt';
      if (sortBy === 'name') sortField = 'originalName';
      else if (sortBy === 'size') sortField = 'size';
      else if (sortBy === 'oldest') sortField = 'createdAt';

      const skip = (Number(page) - 1) * Number(limit);
      const files = await File.find(query)
        .sort(sortField)
        .skip(skip)
        .limit(Number(limit));

      const totalFiles = await File.countDocuments(query);

      res.status(200).json({
        status: 'success',
        data: {
          files,
          pagination: {
            currentPage: Number(page),
            totalPages: Math.ceil(totalFiles / Number(limit)),
            totalFiles
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves the user's most recently converted files
   */
  public static async getRecentFiles(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.userId;
      const files = await File.find({ ownerId: userId })
        .sort('-createdAt')
        .limit(5);

      res.status(200).json({
        status: 'success',
        data: { files }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggles the favorite status of a file
   */
  public static async toggleFavorite(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const file = await File.findOne({ _id: id, ownerId: req.userId });

      if (!file) {
        throw new AppError('File not found or access denied.', 404);
      }

      file.isFavorite = !file.isFavorite;
      await file.save();

      res.status(200).json({
        status: 'success',
        message: file.isFavorite ? 'Added to favorites.' : 'Removed from favorites.',
        data: { file }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Renames a user's file
   */
  public static async renameFile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { newName } = req.body;

      if (!newName) {
        throw new AppError('New filename is required.', 400);
      }

      const file = await File.findOne({ _id: id, ownerId: req.userId });
      if (!file) {
        throw new AppError('File not found or access denied.', 404);
      }

      // Preserve file extension
      const ext = path.extname(file.originalName);
      let updatedName = newName;
      if (!newName.endsWith(ext)) {
        updatedName = newName + ext;
      }

      file.originalName = updatedName;
      await file.save();

      res.status(200).json({
        status: 'success',
        message: 'File renamed successfully.',
        data: { file }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user file physically and decrement storage quota
   */
  public static async deleteFile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const file = await File.findOne({ _id: id, ownerId: req.userId });

      if (!file) {
        throw new AppError('File not found or access denied.', 404);
      }

      // 1. Delete physical asset from storage provider
      await storageProvider.deleteFile(file.storageKey);

      // 2. Decrement user's storage consumption
      if (req.user) {
        const newUsage = Math.max(0, req.user.storageUsed - file.size);
        await User.findByIdAndUpdate(req.userId, { storageUsed: newUsage });
      }

      // 3. Delete database record
      await File.deleteOne({ _id: id });

      res.status(200).json({
        status: 'success',
        message: 'File deleted successfully.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download a converted file, streaming it to response
   */
  public static async downloadFile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      // Allow download if public or if requested by owner
      const file = await File.findById(id);

      if (!file) {
        throw new AppError('Requested file does not exist.', 404);
      }

      // Verify ownership if file is not public / guest conversion
      if (file.ownerId && file.ownerId.toString() !== req.userId) {
        throw new AppError('Unauthorized access to this resource.', 403);
      }

      file.downloadCount += 1;
      await file.save();

      const tempDownloadPath = path.join(__dirname, '../../uploads', `download-${file.name}`);
      await storageProvider.downloadFile(file.storageKey, tempDownloadPath);

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
      
      const fileStream = fs.createReadStream(tempDownloadPath);
      fileStream.pipe(res);

      fileStream.on('end', () => {
        if (fs.existsSync(tempDownloadPath)) {
          fs.unlinkSync(tempDownloadPath);
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
