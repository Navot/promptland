import express from 'express';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import cors from 'cors';

const app = express();
const execAsync = promisify(exec);

// Enable CORS for our frontend
app.use(cors());

app.get('/api/system-stats', async (req, res) => {
  try {
    // Get CPU usage
    const cpuUsage = os.loadavg()[0];
    const cpuCount = os.cpus().length;
    const cpuPercent = (cpuUsage / cpuCount) * 100;

    // Get GPU usage (Mac specific)
    let gpuPercent: number | undefined;
    try {
      const { stdout } = await execAsync('ioreg -l | grep "PerformanceStatistics" | cut -d "=" -f2');
      const gpuStats = JSON.parse(stdout);
      if (gpuStats && gpuStats.gpu_utilization) {
        gpuPercent = gpuStats.gpu_utilization;
      }
    } catch (e) {
      console.log('GPU stats not available');
    }

    res.json({
      cpu: Math.min(cpuPercent, 100),
      gpu: gpuPercent
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get system stats' });
  }
});

app.listen(3001, () => {
  console.log('System monitor server running on port 3001');
}); 