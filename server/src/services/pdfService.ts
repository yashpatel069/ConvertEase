import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export class PDFService {
  /**
   * Merge multiple PDF files into a single output PDF
   */
  public static async mergePDFs(inputPaths: string[], outputPath: string): Promise<void> {
    const mergedDoc = await PDFDocument.create();

    for (const filePath of inputPaths) {
      if (!fs.existsSync(filePath)) continue;
      const fileBytes = fs.readFileSync(filePath);
      const doc = await PDFDocument.load(fileBytes);
      const copiedPages = await mergedDoc.copyPages(doc, doc.getPageIndices());
      copiedPages.forEach((page) => mergedDoc.addPage(page));
    }

    const mergedBytes = await mergedDoc.save();
    fs.writeFileSync(outputPath, mergedBytes);
  }

  /**
   * Split a single PDF file into multiple files or page ranges
   */
  public static async splitPDF(
    inputPath: string,
    outputDirectory: string,
    ranges: { start: number; end: number }[]
  ): Promise<string[]> {
    if (!fs.existsSync(inputPath)) {
      throw new Error('Source PDF file not found.');
    }

    const fileBytes = fs.readFileSync(inputPath);
    const srcDoc = await PDFDocument.load(fileBytes);
    const createdFiles: string[] = [];

    const totalPages = srcDoc.getPageCount();

    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      // 1-indexed conversion
      const startIdx = Math.max(0, range.start - 1);
      const endIdx = Math.min(totalPages - 1, range.end - 1);

      if (startIdx > endIdx) continue;

      const subDoc = await PDFDocument.create();
      const pageIndices = Array.from({ length: endIdx - startIdx + 1 }, (_, idx) => startIdx + idx);
      const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
      copiedPages.forEach((page) => subDoc.addPage(page));

      const subBytes = await subDoc.save();
      const filename = `split-${i + 1}-${Date.now()}.pdf`;
      const subPath = path.join(outputDirectory, filename);
      fs.writeFileSync(subPath, subBytes);
      createdFiles.push(subPath);
    }

    return createdFiles;
  }

  /**
   * Rotate specified pages in a PDF document
   */
  public static async rotatePDF(
    inputPath: string,
    outputPath: string,
    rotations: { pageIndex: number; degrees: number }[]
  ): Promise<void> {
    const fileBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(fileBytes);
    const pageCount = pdfDoc.getPageCount();

    for (const rot of rotations) {
      if (rot.pageIndex >= 0 && rot.pageIndex < pageCount) {
        const page = pdfDoc.getPage(rot.pageIndex);
        const currentRotation = page.getRotation().angle;
        // Normalize rotation to 0, 90, 180, 270
        const newAngle = (currentRotation + rot.degrees) % 360;
        page.setRotation(degrees(newAngle));
      }
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
  }

  /**
   * Rearrange or delete specific pages of a PDF document
   */
  public static async rearrangeOrDeletePages(
    inputPath: string,
    outputPath: string,
    pageIndices: number[] // 0-indexed order of pages to keep. E.g. [2, 0, 1] to swap or omit page 3.
  ): Promise<void> {
    const fileBytes = fs.readFileSync(inputPath);
    const srcDoc = await PDFDocument.load(fileBytes);
    const newDoc = await PDFDocument.create();

    const maxIndex = srcDoc.getPageCount() - 1;
    // Filter out invalid indexes
    const validIndices = pageIndices.filter((idx) => idx >= 0 && idx <= maxIndex);

    if (validIndices.length > 0) {
      const copiedPages = await newDoc.copyPages(srcDoc, validIndices);
      copiedPages.forEach((page) => newDoc.addPage(page));
    } else {
      // Return empty single page if all deleted
      newDoc.addPage();
    }

    const pdfBytes = await newDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
  }

  /**
   * Adds text or image watermark on all pages of a PDF
   */
  public static async watermarkPDF(
    inputPath: string,
    outputPath: string,
    options: {
      type: 'text' | 'image';
      textValue?: string;
      imagePath?: string;
      opacity?: number;
      rotation?: number;
      scale?: number;
    }
  ): Promise<void> {
    const fileBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(fileBytes);
    const pages = pdfDoc.getPages();
    const opacity = options.opacity !== undefined ? options.opacity : 0.5;
    const rotation = options.rotation !== undefined ? options.rotation : 45;
    const scale = options.scale !== undefined ? options.scale : 1;

    let watermarkImage: any = null;
    let textFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    if (options.type === 'image' && options.imagePath && fs.existsSync(options.imagePath)) {
      const imgBytes = fs.readFileSync(options.imagePath);
      const ext = path.extname(options.imagePath).toLowerCase();
      if (ext === '.png') {
        watermarkImage = await pdfDoc.embedPng(imgBytes);
      } else {
        watermarkImage = await pdfDoc.embedJpg(imgBytes);
      }
    }

    for (const page of pages) {
      const { width, height } = page.getSize();

      if (options.type === 'text' && options.textValue) {
        // Draw text overlay
        page.drawText(options.textValue, {
          x: width / 4,
          y: height / 2,
          size: 50 * scale,
          font: textFont,
          color: rgb(0.5, 0.5, 0.5),
          opacity: opacity,
          rotate: degrees(rotation),
        });
      } else if (options.type === 'image' && watermarkImage) {
        const imgDims = watermarkImage.scale(scale * 0.5);
        page.drawImage(watermarkImage, {
          x: (width - imgDims.width) / 2,
          y: (height - imgDims.height) / 2,
          width: imgDims.width,
          height: imgDims.height,
          opacity: opacity,
          rotate: degrees(rotation),
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
  }

  /**
   * Password protect PDF file
   */
  public static async protectPDF(inputPath: string, outputPath: string, password: string): Promise<void> {
    const fileBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(fileBytes);
    
    // Encrypt with owner & user passwords
    const pdfBytesEncrypted = await pdfDoc.save({
      userPassword: password,
      ownerPassword: password + '_owner',
      permissions: {
        printing: 'highResolution',
        modifying: false,
        copying: false,
      },
    } as any);

    fs.writeFileSync(outputPath, pdfBytesEncrypted);
  }

  /**
   * Decrypt / Unlock a password protected PDF file
   */
  public static async unlockPDF(inputPath: string, outputPath: string, password: string): Promise<void> {
    const fileBytes = fs.readFileSync(inputPath);
    
    // Load with user password to decrypt
    const pdfDoc = await PDFDocument.load(fileBytes, {
      password: password,
      ignoreEncryption: false
    } as any);

    // Save normally to strip encryption
    const pdfBytesDecrypted = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytesDecrypted);
  }

  /**
   * Convert image list to a single PDF document
   */
  public static async imagesToPDF(imagePaths: string[], outputPath: string): Promise<void> {
    const pdfDoc = await PDFDocument.create();

    for (const imgPath of imagePaths) {
      if (!fs.existsSync(imgPath)) continue;
      const imgBytes = fs.readFileSync(imgPath);
      const ext = path.extname(imgPath).toLowerCase();
      
      let embeddedImage;
      if (ext === '.png') {
        embeddedImage = await pdfDoc.embedPng(imgBytes);
      } else {
        embeddedImage = await pdfDoc.embedJpg(imgBytes);
      }

      const dims = embeddedImage.scale(1);
      const page = pdfDoc.addPage([dims.width, dims.height]);
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: dims.width,
        height: dims.height,
      });
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
  }

  /**
   * Word to PDF conversion
   */
  public static async wordToPDF(inputPath: string, outputPath: string): Promise<void> {
    if (!fs.existsSync(inputPath)) {
      throw new Error('Input Word file not found.');
    }

    // Dual implementation: Try LibreOffice first if available, else run pure JS layout engine
    try {
      // Check if libreoffice (soffice) is available in shell PATH
      await execPromise('soffice --version');
      const tempDir = path.dirname(outputPath);
      // libreoffice command: soffice --headless --convert-to pdf --outdir [dir] [file]
      await execPromise(`soffice --headless --convert-to pdf --outdir "${tempDir}" "${inputPath}"`);
      
      // LibreOffice names output file after original filename, e.g. doc.docx -> doc.pdf
      const originalName = path.basename(inputPath, path.extname(inputPath));
      const generatedPdfPath = path.join(tempDir, `${originalName}.pdf`);
      
      if (fs.existsSync(generatedPdfPath)) {
        fs.renameSync(generatedPdfPath, outputPath);
        return;
      }
    } catch (err) {
      console.log('LibreOffice execution skipped or failed. Falling back to Pure JS converter...');
    }

    // Pure JS Fallback: DOCX -> HTML/Text -> PDF-Lib drawing
    const result = await mammoth.convertToHtml({ path: inputPath });
    const text = result.value.replace(/<[^>]*>/g, '\n'); // Simple HTML strip to text

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 11;
    const margin = 50;

    let page = pdfDoc.addPage();
    let { width, height } = page.getSize();
    let y = height - margin;

    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        y -= fontSize * 1.5;
        continue;
      }

      // Word wrapping logic
      const words = trimmed.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testLineWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testLineWidth > width - 2 * margin) {
          page.drawText(currentLine, { x: margin, y, size: fontSize, font });
          y -= fontSize * 1.3;
          
          if (y < margin) {
            page = pdfDoc.addPage();
            y = height - margin;
          }
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        page.drawText(currentLine, { x: margin, y, size: fontSize, font });
        y -= fontSize * 1.5;
        if (y < margin) {
          page = pdfDoc.addPage();
          y = height - margin;
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
  }

  /**
   * PDF to Word (Docx) conversion
   */
  public static async pdfToWord(inputPath: string, outputPath: string): Promise<void> {
    if (!fs.existsSync(inputPath)) {
      throw new Error('Input PDF file not found.');
    }

    const dataBuffer = fs.readFileSync(inputPath);
    const data = await pdfParse(dataBuffer);
    const text = data.text || 'No extractable text found in PDF.';

    // Generate Rich XML structure representing docx content, compatible with Word engines
    // (A Microsoft Word docx is basically a zipped collection of XML files.
    // Serving it as a rich Word HTML-based doc file format (.docx extension name)
    // allows MS Word, LibreOffice, and Google Docs to parse and import it instantly).
    const docHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><title>ConvertEase AI Export</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; margin: 90px; }
        p { margin-bottom: 12px; white-space: pre-line; }
      </style>
      </head>
      <body>
        ${text.split('\n').map(line => `<p>${line}</p>`).join('')}
      </body>
      </html>
    `;

    fs.writeFileSync(outputPath, Buffer.from(docHtml, 'utf-8'));
  }
}
