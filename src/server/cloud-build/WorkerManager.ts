export interface WorkerStats {
  workerId: string;
  cpu: number;
  ram: number;
  disk: number;
  queueLength: number;
  status: 'Online' | 'Offline' | 'Busy' | 'Idle';
  lastSeen: number;
}

export class WorkerManager {
  private workers: Map<string, WorkerStats> = new Map();

  registerHeartbeat(stats: Omit<WorkerStats, 'lastSeen'>) {
    this.workers.set(stats.workerId, {
      ...stats,
      lastSeen: Date.now()
    });
  }

  getWorkers(): WorkerStats[] {
    const now = Date.now();
    return Array.from(this.workers.values()).map(worker => {
      // Mark offline if no heartbeat for 30 seconds
      if (now - worker.lastSeen > 30000) {
        worker.status = 'Offline';
      }
      return worker;
    });
  }

  getAvailableWorker(): WorkerStats | null {
    const onlineWorkers = this.getWorkers().filter(w => w.status === 'Idle' || w.status === 'Online');
    if (onlineWorkers.length === 0) return null;
    
    // Simple load balancing: pick worker with lowest queue length
    onlineWorkers.sort((a, b) => a.queueLength - b.queueLength);
    return onlineWorkers[0];
  }
}
