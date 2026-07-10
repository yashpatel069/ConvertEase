import { Schema, model, Document, Types } from 'mongoose';

export interface IFile extends Document {
  name: string;
  originalName: string;
  size: number; // in bytes
  mimeType: string;
  storageKey: string; // file path or S3 key or Cloudinary URL
  storageProvider: 'local' | 's3' | 'cloudinary';
  ownerId?: Types.ObjectId; // null for guest operations if allowed
  isFavorite: boolean;
  status: 'pending' | 'completed' | 'failed';
  downloadCount: number;
  expiresAt?: Date; // used for auto-cleanup of converted or temp files
  createdAt: Date;
  updatedAt: Date;
}

const FileSchema = new Schema<IFile>(
  {
    name: { type: String, required: true },
    originalName: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
    storageKey: { type: String, required: true },
    storageProvider: { type: String, enum: ['local', 's3', 'cloudinary'], required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
    isFavorite: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    downloadCount: { type: Number, default: 0 },
    expiresAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const File = model<IFile>('File', FileSchema);
