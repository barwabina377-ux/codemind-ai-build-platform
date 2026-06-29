export type BuildStatus = 
  | 'Uploaded'
  | 'Queued'
  | 'Preparing'
  | 'Extracting'
  | 'Validating'
  | 'Waiting Worker'
  | 'Ready To Build'
  | 'Building'
  | 'Success'
  | 'Failed'
  | 'Cancelled';

export interface BuildJob {
  id: string;
  sessionId: string;
  uploadTime: number;
  status: BuildStatus;
  progress: number;
  currentStage: string;
  logs: string[];
  error?: string;
  duration?: number;
}
