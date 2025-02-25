import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setSelectedProject } from '../store/ragSlice';
import { setSelectedModel } from '../store/settingsSlice';
import { createSession, setSelectedConversation, addConversation } from '../store/chatSlice';
import { Project } from '../types';
import { ProjectList } from './ProjectList';
import { SessionHistory } from './SessionHistory';
import { ModelSelector } from './ModelSelector';
import { v4 as uuidv4 } from 'uuid';
import { PlusIcon } from '@heroicons/react/24/outline';

export const Sidebar: React.FC = () => {
  const dispatch = useDispatch();
  const { projects, selectedProjectId } = useSelector((state: RootState) => state.rag);
  const activeTab = useSelector((state: RootState) => state.ui.activeTab);
  const [keepContext, setKeepContext] = useState(false);
  const selectedModel = useSelector((state: RootState) => 
    state.settings.selectedModel || localStorage.getItem('lastSelectedModel') || ''
  );
  const { conversations, selectedConversationId } = useSelector((state: RootState) => state.chat);

  // Ensure a conversation is selected when in chat tab
  useEffect(() => {
    if (activeTab === 'chat' && conversations.length > 0 && !selectedConversationId) {
      dispatch(setSelectedConversation(conversations[0].id));
    }
  }, [activeTab, conversations, selectedConversationId, dispatch]);

  const handleProjectSelect = (project: Project) => {
    dispatch(setSelectedProject(project.id));
  };

  const handleModelSelect = (modelId: string) => {
    console.log('Selecting model:', modelId); // Debug log
    dispatch(setSelectedModel(modelId));
    
    if (!keepContext && conversations.length > 0) {
      dispatch(createSession({
        id: uuidv4(),
        messages: [],
        modelId: modelId,
        created: Date.now(),
      }));
    }
  };

  const handleNewConversation = () => {
    const newConversation = {
      id: uuidv4(),
      title: 'New Conversation',
      messages: [],
      created: Date.now(),
      updated: Date.now(),
      modelId: selectedModel
    };
    
    dispatch(addConversation(newConversation));
  };

  const handleSelectConversation = (id: string) => {
    dispatch(setSelectedConversation(id));
  };

  return (
    <div 
      className="fixed left-0 top-0 h-screen w-64 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
      role="complementary"
      aria-label="Sidebar"
    >
      {activeTab === 'chat' ? (
        <>
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
          <div className="flex-1 overflow-y-auto border-t">
            <SessionHistory onNewSession={handleNewConversation} />
          </div>
        </>
      ) : (
        <ProjectList
          projects={projects}
          selectedProjectId={selectedProjectId}
          onProjectSelect={handleProjectSelect}
        />
      )}
    </div>
  );
}; 