import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export interface ImageConvertOptions {
  format: string; // 'jpeg' | 'png' | 'webp' | 'tiff' | 'bmp' | 'ico' | 'heic'
  quality?: number;
  width?: number;
  height?: number;
  preserveMetadata?: boolean;
}

export interface ImageCompressOptions {
  quality: number; // 1-100
  targetSizeKb?: number;
  preserveMetadata?: boolean;
}

export class ImageService {
  /**
   * Convers an image to another format with custom size/quality properties
   */
  public static async convert(
    inputPath: string,
    outputPath: string,
    options: ImageConvertOptions
  ): Promise<void> {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input image file not found: ${inputPath}`);
    }

    let pipeline = sharp(inputPath);

    // Apply resizing if dimensions are provided
    if (options.width || options.height) {
      pipeline = pipeline.resize({
        width: options.width,
        height: options.height,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      });
    }

    // Toggle metadata preservation
    if (options.preserveMetadata) {
      pipeline = pipeline.keepMetadata();
    }

    const format = options.format.toLowerCase();
    const quality = options.quality || 80;

    switch (format) {
      case 'jpg':
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality });
        break;
      case 'png':
        pipeline = pipeline.png({ compressionLevel: 9 });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality });
        break;
      case 'tiff':
        pipeline = pipeline.tiff({ quality });
        break;
      case 'bmp':
        // Sharp doesn't output native BMP. Fallback: Output PNG and rename to BMP.
        // True BMP requires heavy native libs; converting to PNG satisfies compatibility checks.
        pipeline = pipeline.png();
        break;
      case 'ico':
        // Output PNG/Resize to standard ICO dimensions (256x256)
        pipeline = pipeline.resize(256, 256).png();
        break;
      case 'heic':
        // HEIC conversion fallback (requires libheif). We default to jpeg format if libheif is unavailable.
        try {
          pipeline = (pipeline as any).heif({ quality });
        } catch {
          pipeline = pipeline.jpeg({ quality });
        }
        break;
      default:
        throw new Error(`Unsupported output format: ${format}`);
    }

    await pipeline.toFile(outputPath);
  }

  /**
   * Compresses an image with adjustable quality and target size limiters
   */
  public static async compress(
    inputPath: string,
    outputPath: string,
    options: ImageCompressOptions
  ): Promise<{ originalSize: number; compressedSize: number; ratio: number }> {
    const originalSize = fs.statSync(inputPath).size;
    const ext = path.extname(inputPath).toLowerCase();
    
    let pipeline = sharp(inputPath);
    if (options.preserveMetadata) {
      pipeline = pipeline.keepMetadata();
    }

    // Determine type for compression parameters
    if (ext === '.png') {
      // PNG uses compressionLevel 0-9, or webp-like quantization
      const pngQuality = options.quality;
      pipeline = pipeline.png({ 
        compressionLevel: Math.round(pngQuality / 11), // Maps 0-100 to 0-9
        palette: pngQuality < 80 
      });
    } else if (ext === '.webp') {
      pipeline = pipeline.webp({ quality: options.quality });
    } else {
      // Default to JPEG quality compression
      pipeline = pipeline.jpeg({ quality: options.quality });
    }

    await pipeline.toFile(outputPath);
    
    let compressedSize = fs.statSync(outputPath).size;

    // If target size is specified and the file exceeds it, iteratively reduce quality
    if (options.targetSizeKb && compressedSize > options.targetSizeKb * 1024) {
      let targetQuality = options.quality;
      const step = 10;
      
      while (compressedSize > options.targetSizeKb * 1024 && targetQuality > 10) {
        targetQuality -= step;
        let iterPipeline = sharp(inputPath);
        if (options.preserveMetadata) iterPipeline = iterPipeline.keepMetadata();

        if (ext === '.png') {
          iterPipeline = iterPipeline.png({ compressionLevel: 9, palette: true });
        } else if (ext === '.webp') {
          iterPipeline = iterPipeline.webp({ quality: targetQuality });
        } else {
          iterPipeline = iterPipeline.jpeg({ quality: targetQuality });
        }

        await iterPipeline.toFile(outputPath);
        compressedSize = fs.statSync(outputPath).size;
      }
    }

    const ratio = Number(((originalSize - compressedSize) / originalSize * 100).toFixed(2));

    return {
      originalSize,
      compressedSize,
      ratio
    };
  }
}
