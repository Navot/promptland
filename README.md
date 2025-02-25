# Ollama Chat UI

A minimalist chat interface for Ollama, built with React and TypeScript.

## Features

- Chat with any model installed in Ollama
- Real-time streaming responses
- System prompt customization
- Model parameter adjustments
- Conversation history
- CPU/GPU usage monitoring
- Dark mode support
- Retrieval-Augmented Generation (RAG) for document Q&A

## Prerequisites

- [Ollama](https://ollama.ai/) installed and running
- Required models installed:
  - For RAG functionality: `phi4` (or configure a different model in the RAG settings)
  - For chat: any model of your choice
- Node.js 18+
- npm 9+
- Canvas dependencies (for PDF processing):
  - **Linux**: `sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`
  - **macOS**: `brew install pkg-config cairo pango libpng jpeg giflib librsvg`
  - **Windows**: No additional dependencies required

## Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/ollama-chat-ui.git
cd ollama-chat-ui
```

2. Install dependencies
```bash
npm install
npm install --save-dev @types/pdfjs-dist
```

3. Start the development server
```bash
npm run dev
```

4. Start the monitoring server (optional, for CPU/GPU stats)
```bash
npm run server
```

5. Start the RAG server (optional, for document Q&A)
```bash
npm run rag-server
```

6. Open http://localhost:5173 in your browser

## Usage

1. Select a model from the dropdown (models must be installed in Ollama)
2. Start chatting in the Chat tab
3. Use the RAG tab to:
   - Create projects for document collections
   - Upload and process text files
   - Ask questions about your documents
4. Adjust model parameters and system prompt in Settings
5. Monitor system resource usage with the Performance panel

## Development

- Built with Vite + React + TypeScript
- Uses Redux for state management
- Tailwind CSS for styling
- Recharts for performance graphs
- SQLite for RAG document storage

## License

MIT

## Troubleshooting

### PDF Processing Issues

If you encounter errors related to PDF processing:

1. Make sure you have installed the required Canvas dependencies for your OS
2. Try reinstalling the PDF.js dependencies:
```bash
npm uninstall pdfjs-dist
npm install pdfjs-dist@latest
```
3. If using TypeScript, ensure the types are properly installed:
```bash
npm install --save-dev @types/pdfjs-dist
```

### RAG Server Issues

If you see fetch errors when using RAG:
1. Make sure the required model is installed:
```bash
ollama pull phi4
```
2. Or configure a different model in your RAG settings

If you see "ECONNREFUSED ::1:11434" errors:
1. Make sure Ollama is installed
2. Start Ollama with:
```bash
ollama serve
```
3. In a new terminal, try running the RAG server again