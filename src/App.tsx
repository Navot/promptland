import React, { useState, useRef, useEffect } from 'react';
import { ChatWindow } from './components/ChatWindow';
import { ModelSelector } from './components/ModelSelector';
import { SettingsPanel } from './components/SettingsPanel';
import { SessionHistory } from './components/SessionHistory';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useDispatch, useSelector } from 'react-redux';
import { addMessage, createSession, resetSession, updateMessage } from './store/chatSlice';
import { RootState } from './store';
import { v4 as uuidv4 } from 'uuid';
import { ollamaApi } from './api/ollama';
import { ErrorDisplay } from './components/ErrorDisplay';

function App() {
  const dispatch = useDispatch();
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    // Initialize from localStorage, fallback to empty string if not found
    return localStorage.getItem('lastSelectedModel') || '';
  });
  const [showSettings, setShowSettings] = useState(false);
  const [keepContext, setKeepContext] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortController = useRef<AbortController | null>(null);
  const parameters = useSelector((state: RootState) => state.settings.modelParameters);
  const currentSessionId = useSelector((state: RootState) => state.chat.currentSessionId);
  const currentSession = useSelector((state: RootState) => 
    state.chat.sessions.find(s => s.id === state.chat.currentSessionId)
  );
  const currentMessages = currentSession?.messages || [];
  const systemPrompt = useSelector((state: RootState) => state.settings.systemPrompt);

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    // Save to localStorage whenever model changes
    localStorage.setItem('lastSelectedModel', modelId);
    
    if (!keepContext && currentSessionId) {
      dispatch(resetSession(currentSessionId));
    }
  };

  const handleStop = () => {
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedModel) {
      setError('Please select a model first');
      return;
    }

    setIsGenerating(true);
    abortController.current = new AbortController();

    if (!currentSessionId) {
      const newSession = {
        id: uuidv4(),
        messages: [],
        modelId: selectedModel,
        created: Date.now(),
      };
      dispatch(createSession(newSession));
    }

    dispatch(
      addMessage({
        sessionId: currentSessionId!,
        message: {
          role: 'user',
          content,
          timestamp: Date.now(),
        },
      })
    );

    const tempMessageId = uuidv4();
    dispatch(
      addMessage({
        sessionId: currentSessionId!,
        message: {
          id: tempMessageId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
        },
      })
    );

    try {
      await ollamaApi.queryStream(
        content,
        selectedModel,
        (chunk) => {
          dispatch(
            updateMessage({
              sessionId: currentSessionId!,
              messageId: tempMessageId,
              content: chunk,
              append: true,
            })
          );
        },
        parameters,
        currentMessages,
        systemPrompt,
        abortController.current.signal
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          console.log('Generation stopped by user');
        } else {
          setError(`Error: ${err.message}`);
        }
      } else {
        setError('Failed to get response');
      }
    } finally {
      setIsGenerating(false);
      abortController.current = null;
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen">
        <div className="w-64 border-r flex flex-col fixed left-0 top-0 h-full bg-white dark:bg-gray-900">
          <div className="p-4 border-b">
            <ModelSelector
              onModelSelect={handleModelSelect}
              selectedModelId={selectedModel}
            />
            <div className="mt-4 flex items-center">
              <input
                type="checkbox"
                id="keepContext"
                checked={keepContext}
                onChange={(e) => setKeepContext(e.target.checked)}
                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="keepContext" className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                Keep conversation when switching models
              </label>
            </div>
          </div>
          <div className="border-t flex-1 overflow-y-auto">
            <SessionHistory />
          </div>
        </div>
        
        <div className="flex-1 flex flex-col ml-64">
          <div className="p-4 border-b flex justify-between items-center fixed top-0 right-0 left-64 bg-white dark:bg-gray-900 z-10">
            <h1 className="text-xl font-semibold">Chat</h1>
            <div className="flex items-center space-x-2">
              {isGenerating && (
                <button
                  onClick={handleStop}
                  className="btn btn-secondary text-red-500"
                >
                  Stop
                </button>
              )}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="btn btn-secondary"
              >
                Settings
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex pt-16">
            <div className={`flex-1 flex flex-col ${showSettings ? 'border-r' : ''}`}>
              <ChatWindow onSendMessage={handleSendMessage} />
            </div>
            
            {showSettings && (
              <div className="w-80 fixed right-0 top-16 bottom-0 overflow-y-auto bg-white dark:bg-gray-900">
                <SettingsPanel />
              </div>
            )}
          </div>
        </div>
      </div>
      {error && (
        <ErrorDisplay 
          message={error} 
          onDismiss={() => setError(null)} 
        />
      )}
    </ErrorBoundary>
  );
}

export default App;
