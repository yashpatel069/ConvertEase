import fs from 'fs';
import path from 'path';
import { File } from '../models/File';
import { ConversionLog } from '../models/ConversionLog';
import { User } from '../models/User';
import { PDFService } from '../services/pdfService';
import { ImageService } from '../services/imageService';
import { OCRService } from '../services/ocrService';
import { storageProvider } from '../config/storage';
import { emitProgress } from '../config/socket';

export interface Job {
  id: string; // matches File ID in MongoDB
  type: string;
  payload: {
    inputPaths: string[];
    outputPath: string;
    options?: any;
    userId?: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  attempts: number;
  maxAttempts: number;
}

class ProcessingQueue {
  private queue: Job[] = [];
  private activeJobsCount = 0;
  private maxConcurrency = 2;

  constructor() {
    // Start polling loop for pending jobs
    setInterval(() => this.processNext(), 1000);
  }

  /**
   * Add a job to the background processing queue
   */
  public addJob(job: Job): void {
    this.queue.push(job);
    console.log(`[Queue] Added job ${job.id} - Type: ${job.type}`);
    emitProgress(job.id, {
      progress: 0,
      status: 'pending',
      message: 'Job added to conversion queue.'
    });
  }

  private async processNext(): Promise<void> {
    if (this.activeJobsCount >= this.maxConcurrency) return;

    const job = this.queue.find((j) => j.status === 'pending');
    if (!job) return;

    job.status = 'processing';
    this.activeJobsCount++;

    // Execute job asynchronously
    this.runJob(job)
      .then(() => {
        job.status = 'completed';
        job.progress = 100;
      })
      .catch(async (err) => {
        console.error(`[Queue] Job ${job.id} failed:`, err);
        job.attempts++;
        if (job.attempts < job.maxAttempts) {
          job.status = 'pending';
          job.progress = 0;
          console.log(`[Queue] Retrying job ${job.id}. Attempt ${job.attempts + 1}/${job.maxAttempts}`);
        } else {
          job.status = 'failed';
          await File.findByIdAndUpdate(job.id, { status: 'failed' });
          
          // Log failed conversion
          await ConversionLog.create({
            userId: job.payload.userId,
            originalFileName: path.basename(job.payload.inputPaths[0] || 'unknown'),
            toolUsed: job.type,
            status: 'failed',
            durationMs: 0,
            errorDetails: err.message || 'Processing failed after maximum attempts'
          });

          emitProgress(job.id, {
            progress: 100,
            status: 'failed',
            message: `Processing failed: ${err.message || 'Unknown processing error'}`,
            error: err.message || 'Unknown processing error'
          });
        }
      })
      .finally(() => {
        this.activeJobsCount--;
        // Remove from list if finalized
        if (job.status === 'completed' || job.status === 'failed') {
          this.queue = this.queue.filter((j) => j.id !== job.id);
        }
      });
  }

  private async runJob(job: Job): Promise<void> {
    const startTime = Date.now();
    const { inputPaths, outputPath, options, userId } = job.payload;
    
    emitProgress(job.id, {
      progress: 10,
      status: 'processing',
      message: 'Initializing processor and assets...'
    });

    // Ensure output directories exist
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Execute the actual conversion logic
    switch (job.type) {
      // PDF Processing
      case 'MERGE_PDF':
        emitProgress(job.id, { progress: 30, status: 'processing', message: 'Merging PDF pages...' });
        await PDFService.mergePDFs(inputPaths, outputPath);
        break;

      case 'SPLIT_PDF':
        emitProgress(job.id, { progress: 40, status: 'processing', message: 'Splitting document pages...' });
        // Handled directly inside controller as it yields multiple files, or we zip them
        break;

      case 'ROTATE_PDF':
        emitProgress(job.id, { progress: 30, status: 'processing', message: 'Applying page rotations...' });
        await PDFService.rotatePDF(inputPaths[0], outputPath, options.rotations);
        break;

      case 'REARRANGE_PDF':
        emitProgress(job.id, { progress: 30, status: 'processing', message: 'Rearranging and deleting pages...' });
        await PDFService.rearrangeOrDeletePages(inputPaths[0], outputPath, options.pageIndices);
        break;

      case 'WATERMARK_PDF':
        emitProgress(job.id, { progress: 35, status: 'processing', message: 'Applying watermark layers...' });
        await PDFService.watermarkPDF(inputPaths[0], outputPath, options);
        break;

      case 'PROTECT_PDF':
        emitProgress(job.id, { progress: 30, status: 'processing', message: 'Applying PDF encryption keys...' });
        await PDFService.protectPDF(inputPaths[0], outputPath, options.password);
        break;

      case 'UNLOCK_PDF':
        emitProgress(job.id, { progress: 30, status: 'processing', message: 'Decrypting PDF security barriers...' });
        await PDFService.unlockPDF(inputPaths[0], outputPath, options.password);
        break;

      case 'WORD_TO_PDF':
        emitProgress(job.id, { progress: 40, status: 'processing', message: 'Converting Word structure to PDF drawing...' });
        await PDFService.wordToPDF(inputPaths[0], outputPath);
        break;

      case 'PDF_TO_WORD':
        emitProgress(job.id, { progress: 40, status: 'processing', message: 'Parsing PDF texts and formatting Word layout...' });
        await PDFService.pdfToWord(inputPaths[0], outputPath);
        break;

      case 'IMAGES_TO_PDF':
        emitProgress(job.id, { progress: 40, status: 'processing', message: 'Converting image files to PDF pages...' });
        await PDFService.imagesToPDF(inputPaths, outputPath);
        break;

      // Image Processing
      case 'IMAGE_CONVERT':
        emitProgress(job.id, { progress: 40, status: 'processing', message: 'Executing image format rendering...' });
        await ImageService.convert(inputPaths[0], outputPath, options);
        break;

      case 'IMAGE_COMPRESS':
        emitProgress(job.id, { progress: 30, status: 'processing', message: 'Compressing image buffers...' });
        const compResult = await ImageService.compress(inputPaths[0], outputPath, options);
        console.log(`[Queue] Image compressed: ${compResult.ratio}% space saved.`);
        break;

      // OCR
      case 'OCR':
        emitProgress(job.id, { progress: 30, status: 'processing', message: 'Loading OCR language dictionaries...' });
        const ocrText = await OCRService.extractText(inputPaths[0], options.lang);
        emitProgress(job.id, { progress: 60, status: 'processing', message: 'Compiling OCR results to output file...' });
        
        if (options.outputFormat === 'txt') {
          fs.writeFileSync(outputPath, ocrText, 'utf-8');
        } else if (options.outputFormat === 'pdf') {
          await OCRService.textToPDF(ocrText, outputPath);
        } else {
          OCRService.textToWord(ocrText, outputPath);
        }
        break;

      default:
        throw new Error(`Unsupported conversion job type: ${job.type}`);
    }

    emitProgress(job.id, {
      progress: 70,
      status: 'processing',
      message: 'Uploading output assets to storage layer...'
    });

    // Determine target MIME type
    const ext = path.extname(outputPath).toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === '.pdf') mimeType = 'application/pdf';
    else if (ext === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (ext === '.txt') mimeType = 'text/plain';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';

    // Upload output file to storage provider
    const destKey = `${Date.now()}-${path.basename(outputPath)}`;
    const storageKey = await storageProvider.uploadFile(outputPath, destKey, mimeType);
    
    // Get file dimensions
    const stats = fs.statSync(outputPath);
    const duration = Date.now() - startTime;

    // Update database file record
    const updatedFile = await File.findByIdAndUpdate(
      job.id,
      {
        size: stats.size,
        mimeType: mimeType,
        storageKey: storageKey,
        storageProvider: process.env.STORAGE_PROVIDER || 'local',
        status: 'completed',
      },
      { new: true }
    );

    // Track user storage increment
    if (userId) {
      await User.findByIdAndUpdate(userId, { $inc: { storageUsed: stats.size } });
    }

    // Log the conversion log
    await ConversionLog.create({
      userId: userId ? userId : undefined,
      originalFileName: path.basename(inputPaths[0]),
      outputFileName: path.basename(outputPath),
      toolUsed: job.type,
      status: 'success',
      durationMs: duration
    });

    // Delete local temporary files
    inputPaths.forEach((p) => {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

    emitProgress(job.id, {
      progress: 100,
      status: 'completed',
      message: 'Conversion completed successfully!',
      downloadUrl: storageKey,
      fileId: job.id
    });
  }
}

export const processingQueue = new ProcessingQueue();
