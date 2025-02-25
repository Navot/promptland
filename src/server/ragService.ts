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
import http from 'http';

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
  embeddingType?: 'summary' | 'direct';
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

// Add this type
interface ProcessingStatus {
  currentChunk: number;
  totalChunks: number;
  status: 'processing' | 'completed' | 'error';
  error?: string;
}

// Add a Map to store processing status
const processingStatus = new Map<string, ProcessingStatus>();

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
      created INTEGER NOT NULL,
      embedding_model TEXT NOT NULL,
      chunk_size INTEGER NOT NULL,
      embedding_type TEXT NOT NULL CHECK (embedding_type IN ('summary', 'direct'))
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
      short_description TEXT NULL,
      embedding_vector TEXT NOT NULL,
      created INTEGER NOT NULL,
      FOREIGN KEY (file_id) REFERENCES files (id),
      FOREIGN KEY (project_id) REFERENCES projects (id)
    );
  `);

  return db;
};

// Add this function after initDb
const migrateDatabase = async (db: any) => {
  try {
    // Check if tables need migration
    const tableInfo = await db.all("PRAGMA table_info(chunks)");
    const shortDescriptionColumn = tableInfo.find((col: any) => col.name === 'short_description');
    
    if (shortDescriptionColumn && shortDescriptionColumn.notnull === 1) {
      console.log('Migrating database: Updating short_description to be nullable...');
      await db.exec(`
        BEGIN TRANSACTION;
        
        -- Create temporary table with new schema
        CREATE TABLE chunks_new (
          id TEXT PRIMARY KEY,
          file_id TEXT NOT NULL,
          project_id TEXT NOT NULL,
          chunk_text TEXT NOT NULL,
          short_description TEXT NULL,
          embedding_vector TEXT NOT NULL,
          created INTEGER NOT NULL,
          FOREIGN KEY (file_id) REFERENCES files (id),
          FOREIGN KEY (project_id) REFERENCES projects (id)
        );
        
        -- Copy data from old table
        INSERT INTO chunks_new 
        SELECT * FROM chunks;
        
        -- Drop old table
        DROP TABLE chunks;
        
        -- Rename new table
        ALTER TABLE chunks_new RENAME TO chunks;
        
        COMMIT;
      `);
      console.log('Migration complete');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ dest: uploadsDir });
const db = initDb();

const OLLAMA_BASE_URL = 'http://127.0.0.1:11434';  // Use IPv4 explicitly

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
const checkOllamaConnection = async (model: string): Promise<boolean> => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'test' }],
        stream: false
      })
    });

    if (!response.ok) {
      console.error('Failed chat test:', await response.text());
      return false;
    }

    const data = await response.json();
    return !!data.message?.content;
  } catch (error) {
    console.error('Ollama connection error:', error);
    return false;
  }
};

// Add this helper function
const ollamaRequest = async (endpoint: string, body: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 11434,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(JSON.stringify(body));
    req.end();
  });
};

// Update generateShortDescription function
const generateShortDescription = async (chunkText: string, model: string = 'llama2'): Promise<string> => {
  try {
    const prompt = `Summarize the following text in 1-2 sentences:\n${chunkText}`;
    logLLMRequest('generate', prompt, model);
    
    console.log('Sending request to Ollama...');
    const data = await ollamaRequest('/api/chat', { 
      model, 
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      stream: false
    });

    if (!data.message?.content) {
      throw new Error('No content in response');
    }

    console.log('Received response from Ollama');
    return data.message.content.trim();
  } catch (error) {
    console.error('Error generating description:', error);
    throw error;
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
    logLLMRequest('embed', text, model);
    console.log('Sending embedding request to Ollama...');
    
    const data = await ollamaRequest('/api/embeddings', {
      model,
      prompt: text
    });

    if (!data.embedding) {
      throw new Error('No embedding in response');
    }
    
    return data.embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
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

// Add interface for project creation request body
interface ProjectCreateBody {
  name: string;
  embedding_model: string;  // snake_case to match what client is sending
  chunk_size: number;       // snake_case to match what client is sending
  embedding_type: 'summary' | 'direct';  // snake_case to match what client is sending
}

// API Routes with proper types
app.get('/api/projects', async (_req: Request, res: Response) => {
  try {
    const projects = await (await db).all('SELECT * FROM projects ORDER BY created DESC');
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/projects', 
  ((req: Request<{}, any, ProjectCreateBody>, res: Response) => {
    (async () => {
      try {
        const { 
          name, 
          embedding_model, 
          chunk_size, 
          embedding_type 
        } = req.body;

        console.log('Received project creation request:', req.body);

        if (!name || !embedding_model || !chunk_size || !embedding_type) {
          return res.status(400).json({ 
            error: 'Missing required fields: name, embedding_model, chunk_size, and embedding_type are required' 
          });
        }

        if (!['summary', 'direct'].includes(embedding_type)) {
          return res.status(400).json({ 
            error: 'embedding_type must be either "summary" or "direct"' 
          });
        }

        const id = uuidv4();
        const created = Date.now();

        // Insert into database (already using snake_case)
        await (await db).run(
          `INSERT INTO projects (
            id, name, created, embedding_model, chunk_size, embedding_type
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [id, name, created, embedding_model, chunk_size, embedding_type]
        );

        // Return response with snake_case fields to match client expectations
        const project = {
          id,
          name,
          created,
          embedding_model,
          chunk_size,
          embedding_type
        };

        res.status(201).json(project);
      } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Internal server error' 
        });
      }
    })();
  }) as RequestHandler
);

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
  ((req: FileUploadRequest, res: Response) => {
    (async () => {
      try {
        const { projectId } = req.params;
        const file = req.file;
        
        if (!file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        // Create file record
        const fileId = uuidv4();
        const created = Date.now();

        await (await db).run(
          'INSERT INTO files (id, project_id, filename, created, status) VALUES (?, ?, ?, ?, ?)',
          [fileId, projectId, file.originalname, created, 'processing']
        );

        // Initialize processing status
        processingStatus.set(fileId, {
          currentChunk: 0,
          totalChunks: 0, // Will be updated during processing
          status: 'processing'
        });

        // Send initial response
        res.status(201).json({
          id: fileId,
          project_id: projectId,
          filename: file.originalname,
          created,
          status: 'processing',
          chunk_count: 0
        });

        // Process file in background
        (async () => {
          try {
            console.log(`Starting processing for file ${fileId}`);
            const pdfBuffer = fs.readFileSync(file.path);
            const text = await extractTextFromPDFBuffer(pdfBuffer);
            console.log(`Extracted ${text.length} characters of text`);
            
            const project = await (await db).get(
              'SELECT chunk_size, embedding_model, embedding_type FROM projects WHERE id = ?',
              [projectId]
            );

            const chunks = splitTextIntoChunks(text, project.chunk_size);
            console.log(`Split text into ${chunks.length} chunks`);
            
            // Set the total chunks count in the database immediately
            await (await db).run(
              'UPDATE files SET chunk_count = ? WHERE id = ?',
              [chunks.length, fileId]
            );
            
            // Update total chunks in status
            processingStatus.set(fileId, {
              currentChunk: 0,
              totalChunks: chunks.length,
              status: 'processing'
            });
            
            console.log(`Updated processing status: ${JSON.stringify(processingStatus.get(fileId))}`);

            let chunkCount = 0;

            for (const chunkText of chunks) {
              const chunkId = uuidv4();
              
              console.log(`Processing chunk ${chunkCount + 1}/${chunks.length}`);
              
              // Generate embedding
              const embedding = await generateEmbedding(chunkText, project.embedding_model);
              
              // Insert chunk into database
              await (await db).run(
                `INSERT INTO chunks (
                  id, file_id, project_id, chunk_text, embedding_vector, created
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  chunkId,
                  fileId,
                  projectId,
                  chunkText,
                  JSON.stringify(embedding),
                  Date.now()
                ]
              );
              
              chunkCount++;
              
              // Update processing status with current chunk only, keep total fixed
              processingStatus.set(fileId, {
                currentChunk: chunkCount,
                totalChunks: chunks.length, // Keep this fixed
                status: 'processing'
              });
              
              console.log(`Updated processing status: currentChunk=${chunkCount}, totalChunks=${chunks.length}`);
            }

            // Mark file as completed
            await (await db).run(
              'UPDATE files SET status = ? WHERE id = ?',
              ['completed', fileId]
            );
            
            // Update final status
            processingStatus.set(fileId, {
              currentChunk: chunks.length,
              totalChunks: chunks.length,
              status: 'completed'
            });

            console.log(`Processing complete for file ${fileId}`);
          } catch (error) {
            console.error('PDF processing error:', error);
            
            // Update file status to error
            await (await db).run(
              'UPDATE files SET status = ? WHERE id = ?',
              ['error', fileId]
            );
            
            // Update error status
            processingStatus.set(fileId, {
              currentChunk: 0,
              totalChunks: 0,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          } finally {
            // Clean up uploaded file
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
            
            // Remove status after 5 minutes
            setTimeout(() => {
              processingStatus.delete(fileId);
            }, 5 * 60 * 1000);
          }
        })();
      } catch (error) {
        console.error('Error handling file upload:', error);
        // Only send error response if headers haven't been sent
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error processing file' });
        }
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
        
        const data = await ollamaRequest('/api/chat', { 
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
        });
        
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

// Add this after database initialization
const cleanupProcessingFiles = async () => {
  console.log('Cleaning up files in processing state...');
  try {
    const processingFiles = await (await db).all(
      'SELECT id FROM files WHERE status = ?',
      ['processing']
    );
    
    console.log(`Found ${processingFiles.length} files in processing state`);
    
    for (const file of processingFiles) {
      console.log(`Marking file ${file.id} as error`);
      await (await db).run(
        'UPDATE files SET status = ? WHERE id = ?',
        ['error', file.id]
      );
    }
    
    console.log('Cleanup complete');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};

// Update initServer to run migration
const initServer = async () => {
  const database = await initDb();
  await migrateDatabase(database);
  await cleanupProcessingFiles();
  
  const PORT = 3002;
  app.listen(PORT, () => {
    console.log(`RAG server running on port 3002`);
  });
};

app.get('/api/projects/:projectId/files/:fileId/status', async (req, res) => {
  const { fileId } = req.params;
  
  // Get status from map
  const status = processingStatus.get(fileId);
  if (status) {
    res.json(status);
    return;
  }

  // If not in map, check database
  const file = await (await db).get(
    'SELECT status, chunk_count FROM files WHERE id = ?',
    [fileId]
  );

  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  // Return status based on database
  res.json({
    currentChunk: file.chunk_count || 0,
    totalChunks: file.chunk_count || 0, // If processing is done, current = total
    status: file.status
  });
});

// Add a debug endpoint
app.get('/api/debug/processing-status', (req, res) => {
  const statusMap = Array.from(processingStatus.entries()).reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, ProcessingStatus>);
  
  res.json({
    processingStatusCount: processingStatus.size,
    processingStatus: statusMap
  });
});

// Add cancel processing endpoint
app.post('/api/projects/:projectId/files/:fileId/cancel',
  ((req: Request<{ projectId: string; fileId: string }>, res: Response, next: NextFunction) => {
    (async () => {
      try {
        const { projectId, fileId } = req.params;
        
        console.log(`Cancelling processing for file ${fileId}`);
        
        // Check if file exists and belongs to project
        const file = await (await db).get(
          'SELECT * FROM files WHERE id = ? AND project_id = ?',
          [fileId, projectId]
        );
        
        if (!file) {
          return res.status(404).json({ error: 'File not found' });
        }
        
        // Only allow cancelling files that are in processing state
        if (file.status !== 'processing') {
          return res.status(400).json({ 
            error: 'Only processing files can be cancelled' 
          });
        }
        
        // Update file status to cancelled
        await (await db).run(
          'UPDATE files SET status = ? WHERE id = ?',
          ['error', fileId]
        );
        
        // Update processing status
        const status = processingStatus.get(fileId);
        if (status) {
          processingStatus.set(fileId, {
            ...status,
            status: 'error',
            error: 'Processing cancelled by user'
          });
        }
        
        res.json({ success: true });
      } catch (error) {
        console.error('Error cancelling processing:', error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Internal server error' 
        });
      }
    })();
  }) as RequestHandler<{ projectId: string; fileId: string }>
);

initServer();

export { app as default }; 