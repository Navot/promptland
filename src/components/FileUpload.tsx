import { extractTextFromFile } from '../utils/fileProcessing';

// In your file processing function:
const processFile = async (file: File) => {
  try {
    // Extract text properly based on file type
    const text = await extractTextFromFile(file);
    
    // Now you can safely chunk the text
    const chunks = chunkText(text);
    
    // Process chunks...
  } catch (error) {
    console.error(`Error processing file ${file.name}:`, error);
    // Handle error in UI
  }
}; 