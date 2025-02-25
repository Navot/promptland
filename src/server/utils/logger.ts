import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Move up from dist/server/utils to project root
const projectRoot = path.join(__dirname, '../../../');
const logsDir = path.join(projectRoot, 'logs');

console.log('Logs directory:', logsDir); // Add this to debug

if (!fs.existsSync(logsDir)) {
  console.log('Creating logs directory...'); // Add this to debug
  fs.mkdirSync(logsDir, { recursive: true });
}

const llmLogFile = path.join(logsDir, 'llm-requests.log');
const dbLogFile = path.join(logsDir, 'db-queries.log');

// Add console logging alongside file logging
const logLLMRequest = (type: 'generate' | 'embed', prompt: string, model: string) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${type.toUpperCase()} - Model: ${model}\nPrompt: ${prompt}\n\n`;
  console.log('LLM Request:', logEntry); // Add this to debug
  fs.appendFileSync(llmLogFile, logEntry);
};

const logDBQuery = (query: string, params: any[]) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] Query: ${query}\nParams: ${JSON.stringify(params)}\n\n`;
  console.log('DB Query:', logEntry); // Add this to debug
  fs.appendFileSync(dbLogFile, logEntry);
};

export { logLLMRequest, logDBQuery }; 