import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

// Define the core interface for storage
export interface IStorageProvider {
  uploadFile(localFilePath: string, destinationKey: string, mimeType: string): Promise<string>;
  downloadFile(storageKey: string, localDownloadPath: string): Promise<void>;
  deleteFile(storageKey: string): Promise<void>;
}

// 1. Local File Storage Provider
export class LocalStorageProvider implements IStorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(__dirname, '../../stored_files');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async uploadFile(localFilePath: string, destinationKey: string, mimeType: string): Promise<string> {
    const destPath = path.join(this.baseDir, destinationKey);
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    // Copy the file from temp directory to permanent local storage
    fs.copyFileSync(localFilePath, destPath);
    // Return relative URL path so client can download it
    return `/stored_files/${destinationKey}`;
  }

  async downloadFile(storageKey: string, localDownloadPath: string): Promise<void> {
    const relativeKey = storageKey.replace('/stored_files/', '');
    const sourcePath = path.join(this.baseDir, relativeKey);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Local file not found: ${sourcePath}`);
    }
    fs.copyFileSync(sourcePath, localDownloadPath);
  }

  async deleteFile(storageKey: string): Promise<void> {
    const relativeKey = storageKey.replace('/stored_files/', '');
    const targetPath = path.join(this.baseDir, relativeKey);
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
  }
}

// 2. AWS S3 Storage Provider
export class S3StorageProvider implements IStorageProvider {
  private bucket: string;

  constructor() {
    this.bucket = process.env.AWS_BUCKET_NAME || 'convertease-files';
    // Validate keys
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.warn('WARNING: AWS credentials missing. S3StorageProvider falling back to simulated mode.');
    }
  }

  async uploadFile(localFilePath: string, destinationKey: string, mimeType: string): Promise<string> {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.log(`[S3 SIMULATOR] Uploading ${localFilePath} to S3 bucket ${this.bucket}/${destinationKey}`);
      // Fallback: Copy to a local S3 folder for simulation
      const simDir = path.join(__dirname, '../../s3_simulated');
      if (!fs.existsSync(simDir)) fs.mkdirSync(simDir, { recursive: true });
      fs.copyFileSync(localFilePath, path.join(simDir, destinationKey));
      return `/s3_simulated/${destinationKey}`;
    }

    // Standard AWS SDK usage pattern (Developers can npm install @aws-sdk/client-s3 if using AWS in production)
    // To make this file compile without requiring optional S3 package, we dynamically require it
    try {
      const { S3Client } = require('@aws-sdk/client-s3');
      const { Upload } = require('@aws-sdk/lib-storage');
      
      const s3 = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });

      const fileStream = fs.createReadStream(localFilePath);
      const parallelUploads3 = new Upload({
        client: s3,
        params: {
          Bucket: this.bucket,
          Key: destinationKey,
          Body: fileStream,
          ContentType: mimeType
        }
      });

      await parallelUploads3.done();
      return `https://${this.bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${destinationKey}`;
    } catch (err) {
      console.error('AWS S3 Upload failed, falling back to Local S3 simulation folder', err);
      const simDir = path.join(__dirname, '../../s3_simulated');
      if (!fs.existsSync(simDir)) fs.mkdirSync(simDir, { recursive: true });
      fs.copyFileSync(localFilePath, path.join(simDir, destinationKey));
      return `/s3_simulated/${destinationKey}`;
    }
  }

  async downloadFile(storageKey: string, localDownloadPath: string): Promise<void> {
    if (storageKey.startsWith('/s3_simulated/')) {
      const simKey = storageKey.replace('/s3_simulated/', '');
      const filePath = path.join(__dirname, '../../s3_simulated', simKey);
      fs.copyFileSync(filePath, localDownloadPath);
      return;
    }

    try {
      const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
      const s3 = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1'
      });
      // Extract key from URL
      const key = storageKey.split('.amazonaws.com/')[1];
      const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
      const response = await s3.send(command);
      const writeStream = fs.createWriteStream(localDownloadPath);
      response.Body.pipe(writeStream);
      return new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
    } catch (err) {
      throw new Error(`S3 Download failed: ${(err as Error).message}`);
    }
  }

  async deleteFile(storageKey: string): Promise<void> {
    if (storageKey.startsWith('/s3_simulated/')) {
      const simKey = storageKey.replace('/s3_simulated/', '');
      const filePath = path.join(__dirname, '../../s3_simulated', simKey);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return;
    }

    try {
      const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
      const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
      const key = storageKey.split('.amazonaws.com/')[1];
      await s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err) {
      console.error('S3 Delete failed:', err);
    }
  }
}

// 3. Cloudinary Storage Provider
export class CloudinaryStorageProvider implements IStorageProvider {
  constructor() {
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
    } else {
      console.warn('WARNING: Cloudinary credentials missing. CloudinaryStorageProvider falling back to simulated mode.');
    }
  }

  async uploadFile(localFilePath: string, destinationKey: string, mimeType: string): Promise<string> {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.log(`[CLOUDINARY SIMULATOR] Uploading ${localFilePath} as ${destinationKey}`);
      const simDir = path.join(__dirname, '../../cloudinary_simulated');
      if (!fs.existsSync(simDir)) fs.mkdirSync(simDir, { recursive: true });
      fs.copyFileSync(localFilePath, path.join(simDir, destinationKey));
      return `/cloudinary_simulated/${destinationKey}`;
    }

    try {
      const isRaw = !mimeType.startsWith('image/');
      const result = await cloudinary.uploader.upload(localFilePath, {
        public_id: destinationKey.split('.')[0],
        resource_type: isRaw ? 'raw' : 'image',
      });
      return result.secure_url;
    } catch (err) {
      console.error('Cloudinary upload failed, falling back to simulation:', err);
      const simDir = path.join(__dirname, '../../cloudinary_simulated');
      if (!fs.existsSync(simDir)) fs.mkdirSync(simDir, { recursive: true });
      fs.copyFileSync(localFilePath, path.join(simDir, destinationKey));
      return `/cloudinary_simulated/${destinationKey}`;
    }
  }

  async downloadFile(storageKey: string, localDownloadPath: string): Promise<void> {
    if (storageKey.startsWith('/cloudinary_simulated/')) {
      const simKey = storageKey.replace('/cloudinary_simulated/', '');
      const filePath = path.join(__dirname, '../../cloudinary_simulated', simKey);
      fs.copyFileSync(filePath, localDownloadPath);
      return;
    }

    // Download from URL directly
    try {
      const axios = require('axios');
      const response = await axios({
        method: 'GET',
        url: storageKey,
        responseType: 'stream'
      });
      const writer = fs.createWriteStream(localDownloadPath);
      response.data.pipe(writer);
      return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    } catch (err) {
      throw new Error(`Cloudinary file download failed: ${(err as Error).message}`);
    }
  }

  async deleteFile(storageKey: string): Promise<void> {
    if (storageKey.startsWith('/cloudinary_simulated/')) {
      const simKey = storageKey.replace('/cloudinary_simulated/', '');
      const filePath = path.join(__dirname, '../../cloudinary_simulated', simKey);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return;
    }

    try {
      // Extract public ID from Cloudinary URL
      const parts = storageKey.split('/');
      const filename = parts[parts.length - 1];
      const publicId = filename.split('.')[0];
      const isRaw = storageKey.includes('/raw/');
      await cloudinary.uploader.destroy(publicId, {
        resource_type: isRaw ? 'raw' : 'image',
      });
    } catch (err) {
      console.error('Cloudinary delete failed:', err);
    }
  }
}

// Instantiate storage based on environment
let activeProvider: IStorageProvider;

const providerType = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();

switch (providerType) {
  case 's3':
    activeProvider = new S3StorageProvider();
    break;
  case 'cloudinary':
    activeProvider = new CloudinaryStorageProvider();
    break;
  case 'local':
  default:
    activeProvider = new LocalStorageProvider();
    break;
}

export const storageProvider = activeProvider;
export const getLocalStorageDir = (): string => path.join(__dirname, '../../stored_files');
