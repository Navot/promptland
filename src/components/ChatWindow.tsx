import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Message } from '../types';
import ReactMarkdown from 'react-markdown';
import { RootState } from '../store';

interface ChatWindowProps {
  onSendMessage: (content: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ onSendMessage }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const prevMessagesLengthRef = useRef(0);
  
  const messages = useSelector((state: RootState) => {
    const currentSession = state.chat.sessions.find(
      (s) => s.id === state.chat.currentSessionId
    );
    return currentSession?.messages || [];
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle scroll events to detect manual scrolling
  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
      setUserHasScrolled(!isAtBottom);
    }
  };

  // Auto-scroll effect - only for new messages
  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    if (isNewMessage && !userHasScrolled) {
      scrollToBottom();
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, userHasScrolled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
      setUserHasScrolled(false); // Reset scroll state when sending new message
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            <h3 className="text-xl font-semibold mb-2">Welcome to Ollama Chat</h3>
            <p>Select a model and start chatting!</p>
          </div>
        ) : (
          messages.map((message: Message, index: number) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`chat-message ${
                  message.role === 'user'
                    ? 'chat-message-user'
                    : 'chat-message-assistant'
                }`}
              >
                <ReactMarkdown className="prose dark:prose-invert max-w-none prose-sm">
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="sticky bottom-0 p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-800 mt-auto">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="input"
            placeholder="Type your message..."
          />
          <button type="submit" className="btn btn-primary whitespace-nowrap">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}; 