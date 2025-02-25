import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { Project, DocumentFile, RagQueryResult } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { checkRagServer } from '../utils/ragServerCheck';
import { RagError } from './RagError';
import { FileUpload } from './FileUpload';
import { setProjects, addProject, setSelectedProject } from '../store/ragSlice';

export const RagTab: React.FC = () => {
  const dispatch = useDispatch();
  const { selectedProjectId, projects } = useSelector((state: RootState) => state.rag);
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [chunkSize, setChunkSize] = useState(1000);
  const [isUploading, setIsUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<RagQueryResult | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const selectedModel = useSelector((state: RootState) => 
    state.settings.selectedModel || localStorage.getItem('lastSelectedModel') || ''
  );
  const [serverRunning, setServerRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<{
    files: Array<{
      id: string;
      filename: string;
      status: string;
      chunkCount: number | null;
    }>;
    totalChunks: number;
  }>();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/projects');
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }
        const data = await response.json();
        dispatch(setProjects(data));
      } catch (error) {
        console.error('Error fetching projects:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch projects');
      }
    };
    fetchProjects();
  }, [dispatch]);

  useEffect(() => {
    if (selectedProject) {
      fetchFiles(selectedProject.id);
    }
  }, [selectedProject]);

  useEffect(() => {
    const checkServer = async () => {
      const isRunning = await checkRagServer();
      setServerRunning(isRunning);
    };
    
    checkServer();
    const interval = setInterval(checkServer, 5000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedProject) return;

    const checkStatus = async () => {
      try {
        const response = await fetch(`http://localhost:3002/api/projects/${selectedProject.id}/status`);
        const data = await response.json();
        setIsProcessing(data.isProcessing);
        setProcessingStatus(data);
      } catch (error) {
        console.error('Error checking status:', error);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2000);

    return () => clearInterval(interval);
  }, [selectedProject]);

  const fetchFiles = async (projectId: string) => {
    try {
      const response = await fetch(`http://localhost:3002/api/projects/${projectId}/files`);
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedProject || !e.target.files || e.target.files.length === 0) return;

    setIsUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('chunkSize', chunkSize.toString());
    formData.append('model', selectedModel);

    try {
      const response = await fetch(`http://localhost:3002/api/projects/${selectedProject.id}/files`, {
        method: 'POST',
        body: formData
      });
      
      const newFile = await response.json();
      setFiles([newFile, ...files]);
      
      // Reset file input
      e.target.value = '';
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!selectedProject) return;

    try {
      await fetch(`http://localhost:3002/api/projects/${selectedProject.id}/files/${fileId}`, {
        method: 'DELETE'
      });
      
      setFiles(files.filter(file => file.id !== fileId));
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !query.trim() || isProcessing) return;

    setIsQuerying(true);
    setError(null);

    try {
      // Use the project's embedding model for querying
      const model = selectedProject.embedding_model;
      
      console.log(`Querying with model: ${model}`);
      
      const response = await fetch(`http://localhost:3002/api/projects/${selectedProject.id}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          model, // Use the project's embedding model
          topK: 5
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to query');
      }

      const result = await response.json();
      setQueryResult(result);
    } catch (error) {
      console.error('Error querying:', error);
      setError(error instanceof Error ? error.message : 'Failed to query');
    } finally {
      setIsQuerying(false);
    }
  };

  if (!selectedProject) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold mb-4">Select or Create a Project</h1>
        <p>Choose a project from the sidebar to start uploading documents.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">{selectedProject.name}</h1>
        <div className="text-sm text-gray-500">
          Model: {selectedProject.embedding_model} | 
          Chunk Size: {selectedProject.chunk_size} | 
          Type: {selectedProject.embedding_type}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <FileUpload projectId={selectedProject.id} />
        </div>

        {/* Query interface */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          {error && <RagError message={error} onDismiss={() => setError(null)} />}
          
          {!serverRunning && (
            <div className="bg-yellow-100 dark:bg-yellow-900 p-4 mb-4 rounded-md">
              <h2 className="text-lg font-medium text-yellow-800 dark:text-yellow-200">RAG Server Not Running</h2>
              <p className="text-yellow-700 dark:text-yellow-300">
                Please start the RAG server with: <code className="bg-yellow-200 dark:bg-yellow-800 px-2 py-1 rounded">npm run rag-server</code>
              </p>
            </div>
          )}
          
          {isProcessing && processingStatus && (
            <div className="bg-blue-100 dark:bg-blue-900 p-4 mb-4 rounded-md">
              <h2 className="text-lg font-medium text-blue-800 dark:text-blue-200">
                Processing Files
              </h2>
              <div className="mt-2 space-y-2">
                {processingStatus.files.map(file => (
                  <div key={file.id} className="flex justify-between items-center">
                    <span>{file.filename}</span>
                    <span className="text-sm">
                      {file.status === 'processing' ? (
                        'Processing...'
                      ) : (
                        `${file.chunkCount || 0} chunks`
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <form onSubmit={handleQuery}>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isProcessing ? 
                "Please wait until file processing is complete..." : 
                "Enter your question..."}
              className="input w-full h-24 mb-2"
              disabled={isProcessing}
            />
            
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isProcessing || !query.trim()}
            >
              {isProcessing ? 'Processing Files...' : 'Search'}
            </button>
          </form>
          
          {queryResult && (
            <div className="mt-4">
              <h2 className="text-lg font-medium mb-2">Answer</h2>
              
              <div className="bg-white dark:bg-gray-700 p-3 rounded mb-4">
                {queryResult.answer}
              </div>
              
              <h3 className="text-sm font-medium mb-1">Sources</h3>
              <div className="space-y-2">
                {queryResult.sourceChunks.map((chunk: {
                  id: string;
                  chunk_text: string;
                  short_description: string | null;
                  similarity: number;
                }, index: number) => (
                  <details key={chunk.id} className="bg-white dark:bg-gray-700 p-2 rounded">
                    <summary className="cursor-pointer">
                      Source {index + 1}: {chunk.short_description}
                    </summary>
                    <div className="mt-2 text-sm">
                      {chunk.chunk_text}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 