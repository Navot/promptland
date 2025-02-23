export class OllamaWebSocket {
  private ws: WebSocket | null = null;
  private messageHandler: ((message: string) => void) | null = null;

  connect() {
    this.ws = new WebSocket('ws://localhost:11434/api/chat');
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (this.messageHandler && data.message) {
        this.messageHandler(data.message);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return new Promise((resolve, reject) => {
      if (!this.ws) return reject('WebSocket not initialized');
      
      this.ws.onopen = () => resolve(true);
      this.ws.onerror = () => reject('WebSocket connection failed');
    });
  }

  setMessageHandler(handler: (message: string) => void) {
    this.messageHandler = handler;
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
} 