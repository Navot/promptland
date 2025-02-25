import { dirname } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import CommonJS module
import pkg from 'pdfjs-dist/legacy/build/pdf.js';
const { getDocument } = pkg;
type PDFDocumentProxy = pkg.PDFDocumentProxy;

import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.js';

// Configure the PDF.js worker for Node environment
const workerSrc = pdfjsWorker;

export async function extractTextFromPDFBuffer(buffer: Buffer): Promise<string> {
  try {
    // Load the PDF document
    const loadingTask = getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    });
    
    const pdfDocument = await loadingTask.promise;
    let fullText = '';
    
    // Extract text from each page
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
} 