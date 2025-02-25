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

## Prerequisites

- [Ollama](https://ollama.ai/) installed and running
- Node.js 18+
- npm 9+

## Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/ollama-chat-ui.git
cd ollama-chat-ui
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. Start the monitoring server (optional, for CPU/GPU stats)
```bash
npm run server
```

5. Open http://localhost:5173 in your browser

## Usage

1. Select a model from the dropdown (models must be installed in Ollama)
2. Start chatting
3. Adjust model parameters and system prompt in Settings
4. Monitor system resource usage with the Performance panel

## Development

- Built with Vite + React + TypeScript
- Uses Redux for state management
- Tailwind CSS for styling
- Recharts for performance graphs

## License

MIT