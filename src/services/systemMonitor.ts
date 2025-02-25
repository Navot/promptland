interface SystemStats {
  cpu: number;
  gpu?: number;
}

export const systemMonitor = {
  async getStats(): Promise<SystemStats> {
    try {
      const response = await fetch('http://localhost:3001/api/system-stats');
      if (!response.ok) {
        throw new Error('Failed to fetch system stats');
      }
      const stats = await response.json();
      return stats;
    } catch (error) {
      console.error('Failed to get system stats:', error);
      return { cpu: 0 };
    }
  }
}; 