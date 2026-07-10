import Tesseract from 'tesseract.js';
import fs from 'fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';

export class OCRService {
  private static sanitizePdfText(text: string): string {
    if (!text) return '';
    const cleanTabs = text.replace(/\t/g, '    ');
    return cleanTabs
      .split('')
      .filter((char) => {
        const code = char.charCodeAt(0);
        return (
          (code >= 32 && code <= 126) ||
          (code >= 160 && code <= 255) ||
          code === 10 ||
          code === 13
        );
      })
      .join('');
  }

  /**
   * Run OCR on an image and return raw text
   */
  public static async extractText(imagePath: string, lang: string = 'eng'): Promise<string> {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`OCR Source file not found: ${imagePath}`);
    }

    const result = await Tesseract.recognize(imagePath, lang, {
      logger: (info) => {
        // Log OCR progress inside Node server
        if (info.status === 'recognizing') {
          console.log(`[OCR PROGRESS] Status: ${info.status}, Progress: ${Math.round(info.progress * 100)}%`);
        }
      }
    });

    return result.data.text || 'No legible text detected.';
  }

  /**
   * Compile extracted text into a clean PDF document
   */
  public static async textToPDF(text: string, outputPath: string): Promise<void> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 11;
    const margin = 50;

    let page = pdfDoc.addPage();
    let { width, height } = page.getSize();
    let y = height - margin;

    const sanitizedText = OCRService.sanitizePdfText(text);
    const lines = sanitizedText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        y -= fontSize * 1.5;
        continue;
      }

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
   * Compile extracted text into a DOCX compatible file structure
   */
  public static textToWord(text: string, outputPath: string): void {
    const docHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><title>ConvertEase AI OCR Export</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12pt; line-height: 1.5; margin: 90px; }
        p { margin-bottom: 10px; white-space: pre-wrap; }
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
