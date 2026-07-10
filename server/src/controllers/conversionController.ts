import { Response, NextFunction } from 'express';
import { File } from '../models/File';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { processingQueue, Job } from '../workers/queue';
import path from 'path';
import fs from 'fs';

export class ConversionController {
  /**
   * Convert a single uploaded file
   */
  public static async convertFile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const file = req.file;
      const { targetFormat, width, height, quality, preserveMetadata } = req.body;

      if (!file) {
        throw new AppError('No file uploaded.', 400);
      }

      if (!targetFormat) {
        throw new AppError('Target format is required.', 400);
      }

      // 1. Storage check (guest bypasses, users have quota check)
      if (req.user) {
        const isQuotaExceeded = req.user.storageUsed + file.size > req.user.maxStorageLimit;
        if (isQuotaExceeded) {
          throw new AppError('Storage quota exceeded. Please delete old files in your manager to free up space.', 403);
        }
      }

      const ext = path.extname(file.originalname).toLowerCase();
      const outputExt = `.${targetFormat.toLowerCase()}`;
      const originalBase = path.basename(file.originalname, ext);
      const outputName = `${originalBase}-converted${outputExt}`;
      
      const convertedDir = path.join(__dirname, '../../converted');
      if (!fs.existsSync(convertedDir)) {
        fs.mkdirSync(convertedDir, { recursive: true });
      }
      
      const outputPath = path.join(convertedDir, `${Date.now()}-${outputName}`);

      // 2. Create pending database entry
      const dbFile = await File.create({
        name: outputName,
        originalName: outputName,
        size: 0, // will be updated upon completion
        mimeType: 'application/octet-stream',
        storageKey: 'pending',
        storageProvider: process.env.STORAGE_PROVIDER || 'local',
        ownerId: req.userId ? req.userId : undefined,
        status: 'pending',
        isFavorite: false
      });

      // Determine job type
      let jobType = 'IMAGE_CONVERT';
      if (ext === '.docx' || ext === '.doc') {
        jobType = 'WORD_TO_PDF';
      } else if (ext === '.pdf' && outputExt === '.docx') {
        jobType = 'PDF_TO_WORD';
      }

      // 3. Queue the background conversion job
      const job: Job = {
        id: dbFile.id,
        type: jobType,
        payload: {
          inputPaths: [file.path],
          outputPath: outputPath,
          options: {
            format: targetFormat,
            width: width ? Number(width) : undefined,
            height: height ? Number(height) : undefined,
            quality: quality ? Number(quality) : undefined,
            preserveMetadata: preserveMetadata === 'true' || preserveMetadata === true
          },
          userId: req.userId
        },
        status: 'pending',
        progress: 0,
        attempts: 0,
        maxAttempts: 3
      };

      processingQueue.addJob(job);

      res.status(202).json({
        status: 'success',
        message: 'Conversion job accepted.',
        data: {
          fileId: dbFile.id,
          status: 'pending'
        }
      });
    } catch (error) {
      // Cleanup uploaded file on immediate error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  }

  /**
   * Compress a single image
   */
  public static async compressImage(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const file = req.file;
      const { quality = 80, targetSizeKb, preserveMetadata } = req.body;

      if (!file) {
        throw new AppError('No image uploaded.', 400);
      }

      if (req.user) {
        if (req.user.storageUsed + file.size > req.user.maxStorageLimit) {
          throw new AppError('Storage quota exceeded.', 403);
        }
      }

      const ext = path.extname(file.originalname);
      const outputName = `${path.basename(file.originalname, ext)}-compressed${ext}`;
      const outputPath = path.join(__dirname, '../../converted', `${Date.now()}-${outputName}`);

      const dbFile = await File.create({
        name: outputName,
        originalName: outputName,
        size: 0,
        mimeType: file.mimetype,
        storageKey: 'pending',
        storageProvider: process.env.STORAGE_PROVIDER || 'local',
        ownerId: req.userId ? req.userId : undefined,
        status: 'pending'
      });

      const job: Job = {
        id: dbFile.id,
        type: 'IMAGE_COMPRESS',
        payload: {
          inputPaths: [file.path],
          outputPath: outputPath,
          options: {
            quality: Number(quality),
            targetSizeKb: targetSizeKb ? Number(targetSizeKb) : undefined,
            preserveMetadata: preserveMetadata === 'true' || preserveMetadata === true
          },
          userId: req.userId
        },
        status: 'pending',
        progress: 0,
        attempts: 0,
        maxAttempts: 2
      };

      processingQueue.addJob(job);

      res.status(202).json({
        status: 'success',
        message: 'Compression job accepted.',
        data: {
          fileId: dbFile.id,
          status: 'pending'
        }
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  }

  /**
   * PDF page operations: Rotate, Rearrange/Delete, Watermark, Protect/Unlock
   */
  public static async pdfOperations(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const file = req.file;
      const { operation, rotations, pageIndices, textValue, opacity, rotationAngle, scaleValue, password } = req.body;

      if (!file) {
        throw new AppError('No PDF file uploaded.', 400);
      }

      if (!operation) {
        throw new AppError('Operation details are required.', 400);
      }

      const outputName = `${path.basename(file.originalname, '.pdf')}-${operation.toLowerCase()}.pdf`;
      const outputPath = path.join(__dirname, '../../converted', `${Date.now()}-${outputName}`);

      const dbFile = await File.create({
        name: outputName,
        originalName: outputName,
        size: 0,
        mimeType: 'application/pdf',
        storageKey: 'pending',
        storageProvider: process.env.STORAGE_PROVIDER || 'local',
        ownerId: req.userId ? req.userId : undefined,
        status: 'pending'
      });

      // Parse JSON arrays from multipart forms
      let parsedRotations = [];
      let parsedPageIndices = [];
      try {
        if (rotations) parsedRotations = JSON.parse(rotations);
        if (pageIndices) parsedPageIndices = JSON.parse(pageIndices);
      } catch (err) {
        throw new AppError('Invalid JSON format for arrays.', 400);
      }

      let jobType = '';
      let options: any = {};

      switch (operation.toUpperCase()) {
        case 'ROTATE':
          jobType = 'ROTATE_PDF';
          options = { rotations: parsedRotations };
          break;
        case 'REARRANGE':
        case 'DELETE_PAGES':
          jobType = 'REARRANGE_PDF';
          options = { pageIndices: parsedPageIndices };
          break;
        case 'WATERMARK':
          jobType = 'WATERMARK_PDF';
          options = {
            type: 'text',
            textValue,
            opacity: opacity ? Number(opacity) : undefined,
            rotation: rotationAngle ? Number(rotationAngle) : undefined,
            scale: scaleValue ? Number(scaleValue) : undefined
          };
          break;
        case 'PROTECT':
          jobType = 'PROTECT_PDF';
          options = { password };
          break;
        case 'UNLOCK':
          jobType = 'UNLOCK_PDF';
          options = { password };
          break;
        default:
          throw new AppError(`Unknown PDF operation: ${operation}`, 400);
      }

      const job: Job = {
        id: dbFile.id,
        type: jobType,
        payload: {
          inputPaths: [file.path],
          outputPath: outputPath,
          options,
          userId: req.userId
        },
        status: 'pending',
        progress: 0,
        attempts: 0,
        maxAttempts: 2
      };

      processingQueue.addJob(job);

      res.status(202).json({
        status: 'success',
        message: `${operation} task accepted.`,
        data: {
          fileId: dbFile.id,
          status: 'pending'
        }
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  }

  /**
   * Merge multiple PDF files
   */
  public static async mergePDFs(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length < 2) {
        throw new AppError('At least 2 PDF files are required for merging.', 400);
      }

      const outputName = `merged-${Date.now()}.pdf`;
      const outputPath = path.join(__dirname, '../../converted', outputName);

      const dbFile = await File.create({
        name: outputName,
        originalName: outputName,
        size: 0,
        mimeType: 'application/pdf',
        storageKey: 'pending',
        storageProvider: process.env.STORAGE_PROVIDER || 'local',
        ownerId: req.userId ? req.userId : undefined,
        status: 'pending'
      });

      const inputPaths = files.map((f) => f.path);

      const job: Job = {
        id: dbFile.id,
        type: 'MERGE_PDF',
        payload: {
          inputPaths,
          outputPath,
          userId: req.userId
        },
        status: 'pending',
        progress: 0,
        attempts: 0,
        maxAttempts: 2
      };

      processingQueue.addJob(job);

      res.status(202).json({
        status: 'success',
        message: 'Merge task accepted.',
        data: {
          fileId: dbFile.id,
          status: 'pending'
        }
      });
    } catch (error) {
      if (req.files && Array.isArray(req.files)) {
        req.files.forEach((f: Express.Multer.File) => {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });
      }
      next(error);
    }
  }

  /**
   * Run OCR on image
   */
  public static async processOCR(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const file = req.file;
      const { lang = 'eng', outputFormat = 'txt' } = req.body;

      if (!file) {
        throw new AppError('No document uploaded for OCR.', 400);
      }

      const outputExt = `.${outputFormat}`;
      const originalBase = path.basename(file.originalname, path.extname(file.originalname));
      const outputName = `${originalBase}-ocr${outputExt}`;
      const outputPath = path.join(__dirname, '../../converted', `${Date.now()}-${outputName}`);

      let mimeType = 'text/plain';
      if (outputFormat === 'pdf') mimeType = 'application/pdf';
      else if (outputFormat === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      const dbFile = await File.create({
        name: outputName,
        originalName: outputName,
        size: 0,
        mimeType: mimeType,
        storageKey: 'pending',
        storageProvider: process.env.STORAGE_PROVIDER || 'local',
        ownerId: req.userId ? req.userId : undefined,
        status: 'pending'
      });

      const job: Job = {
        id: dbFile.id,
        type: 'OCR',
        payload: {
          inputPaths: [file.path],
          outputPath,
          options: { lang, outputFormat },
          userId: req.userId
        },
        status: 'pending',
        progress: 0,
        attempts: 0,
        maxAttempts: 2
      };

      processingQueue.addJob(job);

      res.status(202).json({
        status: 'success',
        message: 'OCR processing task accepted.',
        data: {
          fileId: dbFile.id,
          status: 'pending'
        }
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  }
}
