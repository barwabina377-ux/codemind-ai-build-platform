import fs from 'fs';
import path from 'path';

export class StorageManager {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), 'cloud_storage');
    this.initDirectories();
  }

  private initDirectories() {
    const dirs = [
      'workspace',
      'uploads',
      'projects',
      'artifacts',
      'logs',
      'cache',
      'workers'
    ];

    dirs.forEach(dir => {
      const fullPath = path.join(this.baseDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  getPath(category: 'workspace' | 'uploads' | 'projects' | 'artifacts' | 'logs' | 'cache' | 'workers', subPath?: string): string {
    const target = path.join(this.baseDir, category);
    if (subPath) {
      return path.join(target, subPath);
    }
    return target;
  }
}
