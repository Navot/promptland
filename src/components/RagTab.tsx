import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Project, DocumentFile, RagQueryResult } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { checkRagServer } from '../utils/ragServerCheck';
import { RagError } from './RagError';

export const RagTab: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
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

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch files when project changes
  useEffect(() => {
    if (selectedProject) {
      fetchFiles(selectedProject.id);
    }
  }, [selectedProject]);

  // Add this effect to check server status
  useEffect(() => {
    const checkServer = async () => {
      const isRunning = await checkRagServer();
      setServerRunning(isRunning);
    };
    
    checkServer();
    const interval = setInterval(checkServer, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Add status checking effect
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
    const interval = setInterval(checkStatus, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/projects');
      const data = await response.json();
      setProjects(data);
      
      // Select first project if available
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Failed to connect to RAG server. Make sure it\'s running with "npm run rag-server"');
    }
  };

  const fetchFiles = async (projectId: string) => {
    try {
      const response = await fetch(`http://localhost:3002/api/projects/${projectId}/files`);
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const response = await fetch('http://localhost:3002/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName })
      });
      
      const newProject = await response.json();
      setProjects([newProject, ...projects]);
      setSelectedProject(newProject);
      setNewProjectName('');
    } catch (error) {
      console.error('Error creating project:', error);
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
    if (!selectedProject || !query.trim()) return;

    setIsQuerying(true);
    try {
      const response = await fetch(`http://localhost:3002/api/projects/${selectedProject.id}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          model: selectedModel,
          topK: 5
        })
      });
      
      const result = await response.json();
      setQueryResult(result);
    } catch (error) {
      console.error('Error querying:', error);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 overflow-y-auto">
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
      
      <h1 className="text-xl font-semibold mb-4">Retrieval-Augmented Generation</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left column: Project management and file upload */}
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
            <h2 className="text-lg font-medium mb-2">Projects</h2>
            
            <form onSubmit={handleCreateProject} className="flex mb-2">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="New project name"
                className="input flex-1 mr-2"
              />
              <button type="submit" className="btn btn-primary">Create</button>
            </form>
            
            <select
              value={selectedProject?.id || ''}
              onChange={(e) => {
                const project = projects.find(p => p.id === e.target.value);
                setSelectedProject(project || null);
              }}
              className="input w-full"
            >
              <option value="" disabled>Select a project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          
          {selectedProject && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
              <h2 className="text-lg font-medium mb-2">Upload Document</h2>
              
              <div className="mb-2">
                <label className="block text-sm mb-1">Chunk Size (characters)</label>
                <select
                  value={chunkSize}
                  onChange={(e) => setChunkSize(parseInt(e.target.value))}
                  className="input w-full"
                >
                  <option value={500}>Small (500)</option>
                  <option value={1000}>Medium (1000)</option>
                  <option value={2000}>Large (2000)</option>
                </select>
              </div>
              
              <div className="mb-2">
                <label className="block text-sm mb-1">File</label>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="w-full"
                />
              </div>
              
              {isUploading && (
                <div className="text-sm text-gray-500">
                  Uploading and processing... This may take a while.
                </div>
              )}
            </div>
          )}
          
          {selectedProject && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
              <h2 className="text-lg font-medium mb-2">Documents</h2>
              
              {files.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No documents in this project yet.
                </div>
              ) : (
                <ul className="space-y-2">
                  {files.map(file => (
                    <li key={file.id} className="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded">
                      <div>
                        <div className="font-medium">{file.filename}</div>
                        <div className="text-xs text-gray-500">
                          {file.status === 'processing' ? (
                            'Processing...'
                          ) : (
                            `${file.chunkCount || 0} chunks`
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="text-red-500 hover:text-red-700"
                        disabled={file.status === 'processing'}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        
        {/* Right column: Query interface */}
        <div className="space-y-4">
          {selectedProject && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
              <h2 className="text-lg font-medium mb-2">Ask a Question</h2>
              
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
            </div>
          )}
          
          {queryResult && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
              <h2 className="text-lg font-medium mb-2">Answer</h2>
              
              <div className="bg-white dark:bg-gray-700 p-3 rounded mb-4">
                {queryResult.answer}
              </div>
              
              <h3 className="text-sm font-medium mb-1">Sources</h3>
              <div className="space-y-2">
                {queryResult.sourceChunks.map((chunk, index) => (
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