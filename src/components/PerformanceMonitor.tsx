import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { systemMonitor } from '../services/systemMonitor';

interface UsageData {
  time: number;
  value: number;
}

export const PerformanceMonitor: React.FC = () => {
  const [cpuData, setCpuData] = useState<UsageData[]>([]);
  const [gpuData, setGpuData] = useState<UsageData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const maxDataPoints = 30;

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const stats = await systemMonitor.getStats();
        const timestamp = Date.now();
        
        setCpuData(prev => {
          const newData = [...prev, { time: timestamp, value: stats.cpu }];
          return newData.slice(-maxDataPoints);
        });

        if (typeof stats.gpu === 'number') {
          setGpuData(prev => {
            const newData = [...prev, { time: timestamp, value: stats.gpu! }];
            return newData.slice(-maxDataPoints);
          });
        }

        setError(null);
      } catch (error) {
        console.error('Failed to fetch usage data:', error);
        setError('Failed to fetch performance data');
      }
    };

    fetchUsage();
    const interval = setInterval(fetchUsage, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-80 fixed right-0 top-16 bottom-0 overflow-y-auto bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 p-4">
      <h2 className="text-sm font-medium mb-4">Performance Monitor</h2>
      
      {error ? (
        <div className="text-xs text-red-500 mb-2">{error}</div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-800">
            <h3 className="text-xs font-medium mb-2">CPU Usage</h3>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cpuData}>
                  <XAxis dataKey="time" hide={true} />
                  <YAxis domain={[0, 100]} hide={true} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#374151"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Current: {cpuData[cpuData.length - 1]?.value.toFixed(1) || 0}%
            </div>
          </div>

          {gpuData.length > 0 && (
            <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-800">
              <h3 className="text-xs font-medium mb-2">GPU Usage</h3>
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={gpuData}>
                    <XAxis dataKey="time" hide={true} />
                    <YAxis domain={[0, 100]} hide={true} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#374151"
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Current: {gpuData[gpuData.length - 1]?.value.toFixed(1) || 0}%
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 