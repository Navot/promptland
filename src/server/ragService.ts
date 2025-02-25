import express, { Request, Response, RequestHandler, NextFunction } from 'express';
import multer from 'multer';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ParamsDictionary } from 'express-serve-static-core';
import { logLLMRequest, logDBQuery } from './utils/logger.js';
import { extractTextFromPDFBuffer } from './pdfProcessing.js';

// Types
interface ProjectParams extends ParamsDictionary {
  projectId: string;
}

interface FileParams extends ProjectParams {
  fileId: string;
}

interface QueryBody {
  query: string;
  topK?: number;
  model?: string;
}

interface FileRequestBody {
  chunkSize?: number;
  model?: string;
}

// Create a custom request type for file uploads
type FileUploadRequest = Request<ProjectParams, any, FileRequestBody> & {
  file?: Express.Multer.File;
};

// Create a type for our file upload handler
type FileUploadHandler = RequestHandler<
  ProjectParams,
  any,
  FileRequestBody,
  any
>;

// Add type for delete request params
interface DeleteFileParams extends ParamsDictionary {
  projectId: string;
  fileId: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Make sure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize database
const initDb = async () => {
  const db = await open({
    filename: path.join(__dirname, 'rag.db'),
    driver: sqlite3.Database
  });

  // Create tables if they don't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      created INTEGER NOT NULL,
      status TEXT NOT NULL,
      chunk_count INTEGER,
      FOREIGN KEY (project_id) REFERENCES projects (id)
    );

    CREATE TABLE IF NOT EXISTS chunks (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      chunk_text TEXT NOT NULL,
      short_description TEXT NOT NULL,
      embedding_vector TEXT NOT NULL,
      created INTEGER NOT NULL,
      FOREIGN KEY (file_id) REFERENCES files (id),
      FOREIGN KEY (project_id) REFERENCES projects (id)
    );
  `);

  return db;
};

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ dest: uploadsDir });
const db = initDb();

// Helper function to split text into chunks
const splitTextIntoChunks = (text: string, chunkSize: number = 1000): string[] => {
  const chunks = [];
  let currentChunk = '';
  const sentences = text.split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= chunkSize) {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = sentence;
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks;
};

// Add this helper function at the top
const checkOllamaConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:11434/api/version');
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Update generateShortDescription function
const generateShortDescription = async (chunkText: string, model: string = 'llama2'): Promise<string> => {
  try {
    // Check if text is valid UTF-8
    if (!isValidUTF8(chunkText)) {
      console.error('Invalid text content detected');
      return 'Error: Invalid text content';
    }

    // Check Ollama connection
    const isOllamaRunning = await checkOllamaConnection();
    if (!isOllamaRunning) {
      console.error('Ollama is not running. Please start Ollama first.');
      return 'Error: Ollama not running';
    }

    const prompt = `Summarize the following text in 1-2 sentences:\n${chunkText}`;
    logLLMRequest('generate', prompt, model);
    
    console.log('Sending request to Ollama...');
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model, 
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false 
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}`);
    }

    const data = await response.json();
    console.log('Received response from Ollama');
    return data.message.content.trim();
  } catch (error) {
    console.error('Error generating description:', error);
    return 'Error generating description';
  }
};

// Add this helper function to check for valid UTF-8 text
const isValidUTF8 = (text: string): boolean => {
  try {
    return text.length > 0 && !text.includes('\0') && 
           Buffer.from(text, 'utf-8').toString('utf-8') === text;
  } catch {
    return false;
  }
};

// Helper function to generate embeddings using Ollama
const generateEmbedding = async (text: string, model: string = 'llama2'): Promise<number[]> => {
  try {
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: text
      })
    });

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return [];
  }
};

// Helper function to calculate cosine similarity
const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// API Routes with proper types
app.get('/api/projects', async (_req: Request, res: Response) => {
  try {
    const projects = await (await db).all('SELECT * FROM projects ORDER BY created DESC');
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { name } = req.body;
    const id = uuidv4();
    const created = Date.now();

    await (await db).run(
      'INSERT INTO projects (id, name, created) VALUES (?, ?, ?)',
      [id, name, created]
    );

    res.status(201).json({ id, name, created });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:projectId/files', async (req, res) => {
  try {
    const { projectId } = req.params;
    const files = await (await db).all(
      'SELECT * FROM files WHERE project_id = ? ORDER BY created DESC',
      [projectId]
    );
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects/:projectId/files', 
  upload.single('file'),
  ((req: FileUploadRequest, res: Response, next: NextFunction) => {
    (async () => {
      try {
        const { projectId } = req.params;
        const { chunkSize = 1000, model = 'llama2' } = req.body;
        const file = req.file;

        if (!file) {
          res.status(400).json({ error: 'No file uploaded' });
          return;
        }

        // Create file record
        const fileId = uuidv4();
        const created = Date.now();
        
        await (await db).run(
          'INSERT INTO files (id, project_id, filename, created, status) VALUES (?, ?, ?, ?, ?)',
          [fileId, projectId, file.originalname, created, 'processing']
        );

        // Process file immediately instead of in background
        console.log('=== File Upload Processing ===');
        console.log(`1. File received: ${file.originalname}`);
        const filePath = file.path;
        console.log(`2. File path: ${filePath}`);

        // Check file type using original filename
        const isPDF = file.originalname.toLowerCase().endsWith('.pdf');
        console.log(`3. File type: ${isPDF ? 'PDF' : 'Other'}`);
        console.log(`   Original name: ${file.originalname}`);
        console.log(`   Temp path: ${filePath}`);

        if (isPDF) {
          console.log('\n=== PDF Processing Started ===');
          try {
            console.log('4. Reading file buffer...');
            const fileBuffer = await fs.promises.readFile(filePath);
            console.log('5. Buffer read complete');
            console.log('Buffer details:', {
              size: fileBuffer.length,
              isBuffer: Buffer.isBuffer(fileBuffer),
              firstBytes: fileBuffer.slice(0, 20).toString('hex')
            });

            console.log('6. Starting text extraction...');
            const rawText = await extractTextFromPDFBuffer(fileBuffer);
            console.log('7. Text extraction complete');
            
            if (rawText) {
              console.log('\n=== Text Preview ===');
              console.log(rawText.slice(0, 200));
              console.log('=== End Preview ===\n');
            } else {
              console.log('WARNING: No text extracted');
            }

            return res.json({
              id: fileId,
              projectId,
              filename: file.originalname,
              status: 'debug',
              bufferSize: fileBuffer.length,
              textInfo: {
                extracted: !!rawText,
                length: rawText?.length || 0,
                preview: rawText?.slice(0, 100) || 'null'
              }
            });
          } catch (error) {
            console.error('PDF processing error:', error);
            return res.json({
              id: fileId,
              projectId,
              filename: file.originalname,
              status: 'error',
              error: error.message || 'PDF processing failed'
            });
          }
        } else {
          console.log('\n=== Non-PDF file processing ===');
          // ... rest of the code for non-PDF files
        }
      } catch (error) {
        console.error('Error:', error);
        next(error);
      }
    })();
  }) as FileUploadHandler
);

app.delete('/api/projects/:projectId/files/:fileId', 
  (async (req: Request<DeleteFileParams>, res: Response, next: NextFunction) => {
    try {
      const { projectId, fileId } = req.params;
      
      console.log('Deleting file:', fileId, 'from project:', projectId);
      
      // First check if file exists
      const file = await (await db).get(
        'SELECT * FROM files WHERE id = ? AND project_id = ?',
        [fileId, projectId]
      );
      
      if (!file) {
        console.log('File not found');
        res.status(404).json({ error: 'File not found' });
        return;
      }
      
      // Delete chunks first (foreign key constraint)
      console.log('Deleting chunks...');
      await (await db).run(
        'DELETE FROM chunks WHERE file_id = ? AND project_id = ?',
        [fileId, projectId]
      );
      
      // Delete file record
      console.log('Deleting file record...');
      await (await db).run(
        'DELETE FROM files WHERE id = ? AND project_id = ?',
        [fileId, projectId]
      );
      
      // Delete physical file if it exists
      const filePath = path.join(uploadsDir, fileId);
      if (fs.existsSync(filePath)) {
        console.log('Deleting physical file...');
        fs.unlinkSync(filePath);
      }
      
      console.log('File deleted successfully');
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: error.message });
    }
  }) as RequestHandler<DeleteFileParams>
);

app.post('/api/projects/:projectId/query',
  ((req: Request<ProjectParams, any, QueryBody>, res: Response, next: NextFunction) => {
    (async () => {
      try {
        const { projectId } = req.params;
        const { query, topK = 5, model = 'llama2' } = req.body;

        // Check for processing files
        const processingFiles = await (await db).get(
          'SELECT COUNT(*) as count FROM files WHERE project_id = ? AND status = ?',
          [projectId, 'processing']
        );

        if (processingFiles.count > 0) {
          res.status(400).json({ 
            error: 'Cannot query while files are still being processed' 
          });
          return;
        }
        
        // Generate embedding for query
        const queryEmbedding = await generateEmbedding(query, model);
        
        // Get all chunks for this project
        const chunks = await (await db).all(
          'SELECT * FROM chunks WHERE project_id = ?',
          [projectId]
        );
        
        // Calculate similarity scores
        const scoredChunks = chunks.map(chunk => {
          const embeddingVector = JSON.parse(chunk.embedding_vector);
          const similarity = cosineSimilarity(queryEmbedding, embeddingVector);
          return { ...chunk, similarity };
        });
        
        // Sort by similarity and take top K
        const topChunks = scoredChunks
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, topK);
        
        // Generate answer using Ollama
        const context = topChunks.map(chunk => chunk.chunk_text).join('\n\n');
        const prompt = `
          You are a helpful assistant. Use the following context to answer the user's question.
          If the answer is not in the context, say "I don't have enough information to answer that question."
          
          Context:
          ${context}
          
          User Question: ${query}
        `;
        
        logLLMRequest('generate', prompt, model);
        
        const response = await fetch('http://localhost:11434/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            model, 
            messages: [
              {
                role: 'system',
                content: `You are a helpful assistant. Use the following context to answer the user's question.
                  If the answer is not in the context, say "I don't have enough information to answer that question."
                  
                  Context:
                  ${context}`
              },
              {
                role: 'user',
                content: query
              }
            ],
            stream: false 
          })
        });
        
        const data = await response.json();
        
        res.json({
          answer: data.message.content,
          sourceChunks: topChunks,
          queryEmbedding
        });
      } catch (error) {
        next(error);
      }
    })();
  }) as RequestHandler<ProjectParams, any, QueryBody>
);

// Add this endpoint
app.get('/api/projects/:projectId/status', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const files = await (await db).all(
      `SELECT id, filename, status, chunk_count 
       FROM files 
       WHERE project_id = ? 
       ORDER BY created DESC`,
      [projectId]
    );
    
    const processing = files.some(file => file.status === 'processing');
    const totalChunks = files.reduce((sum, file) => sum + (file.chunk_count || 0), 0);
    
    res.json({
      isProcessing: processing,
      files: files.map(f => ({
        id: f.id,
        filename: f.filename,
        status: f.status,
        chunkCount: f.chunk_count
      })),
      totalChunks
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Start server
const PORT = 3002;
app.listen(PORT, () => {
  console.log(`RAG server running on port ${PORT}`);
});

export { app as default }; 