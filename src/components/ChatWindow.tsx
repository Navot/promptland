import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Message } from '../types';
import ReactMarkdown from 'react-markdown';
import { RootState } from '../store';
import { setSelectedConversation } from '../store/chatSlice';
import { createSelector } from '@reduxjs/toolkit';

interface ChatWindowProps {
  onSendMessage: (content: string) => void;
}

const formatMessageContent = (content: string) => {
  // Check if we're in the middle of a think block
  if (content.startsWith('<think>') && !content.includes('</think>')) {
    return (
      <div className="chat-message-think">
        <ReactMarkdown className="prose dark:prose-invert max-w-none prose-sm">
          {content.replace('<think>', '').trim()}
        </ReactMarkdown>
      </div>
    );
  }

  // Check for complete think block
  const thinkMatch = content.match(/^<think>(.*?)<\/think>\s*([\s\S]*)$/s);
  
  if (thinkMatch) {
    const [_, thinkContent, mainContent] = thinkMatch;
    return (
      <>
        <div className="chat-message-think">
          <ReactMarkdown className="prose dark:prose-invert max-w-none prose-sm">
            {thinkContent.trim()}
          </ReactMarkdown>
        </div>
        <ReactMarkdown className="prose dark:prose-invert max-w-none prose-sm">
          {mainContent.trim()}
        </ReactMarkdown>
      </>
    );
  }

  return (
    <ReactMarkdown className="prose dark:prose-invert max-w-none prose-sm">
      {content}
    </ReactMarkdown>
  );
};

// Create a memoized selector
const selectMessages = createSelector(
  [(state: RootState) => state.chat.sessions, 
   (state: RootState) => state.chat.currentSessionId],
  (sessions, currentSessionId) => {
    const currentSession = sessions.find(s => s.id === currentSessionId);
    return currentSession?.messages || [];
  }
);

export const ChatWindow: React.FC<ChatWindowProps> = ({ onSendMessage }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const prevMessagesLengthRef = useRef(0);
  
  const dispatch = useDispatch();
  const { conversations, selectedConversationId } = useSelector((state: RootState) => state.chat);
  const messages = useSelector(selectMessages);

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

  // Move this effect to App.tsx instead
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId) {
      dispatch(setSelectedConversation(conversations[0].id));
    }
  }, [conversations, selectedConversationId, dispatch]);

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
        className="flex-1 overflow-y-auto p-1 space-y-0.5 chat-container"
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
                <div className="message-bubble px-2 py-1 rounded mb-0.5 max-w-3/4 break-words text-left">
                  {formatMessageContent(message.content)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="sticky bottom-0 p-1 bg-white dark:bg-gray-900 border-t dark:border-gray-800 mt-auto chat-input-container">
        <form onSubmit={handleSubmit} className="flex space-x-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="input text-xs py-0.5 chat-input"
            placeholder="Type your message..."
          />
          <button type="submit" className="btn btn-primary whitespace-nowrap text-xs py-0.5 px-1.5 chat-send-button">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}; 