export const checkRagServer = async (): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:3002/api/projects', { 
      method: 'HEAD',
      // Set a short timeout to avoid long waits
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}; 