import { Schema, model, Document, Types } from 'mongoose';

export interface IConversionLog extends Document {
  userId?: Types.ObjectId;
  originalFileName: string;
  outputFileName?: string;
  toolUsed: string; // e.g. "PDF_TO_WORD", "IMAGE_COMPRESS", "OCR"
  status: 'success' | 'failed';
  durationMs: number;
  errorDetails?: string;
  createdAt: Date;
}

const ConversionLogSchema = new Schema<IConversionLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    originalFileName: { type: String, required: true },
    outputFileName: { type: String },
    toolUsed: { type: String, required: true },
    status: { type: String, enum: ['success', 'failed'], required: true },
    durationMs: { type: Number, required: true },
    errorDetails: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const ConversionLog = model<IConversionLog>('ConversionLog', ConversionLogSchema);
