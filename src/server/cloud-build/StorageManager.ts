import fs from 'fs';
import path from 'path';

export class StorageManager {
  private baseDir: string;
  constructor() {
    this.baseDir = path.join(process.cwd(), 'cloud_storage');
    this.initDirectories();
  }
  private initDirectories() {
    const dirs = ['workspace', 'uploads', 'projects', 'artifacts', 'logs', 'cache', 'workers'];
    dirs.forEach(dir => {
      const fullPath = path.join(this.baseDir, dir);
      if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
    });
  }
  getPath(category, subPath?) {
    const target = path.join(this.baseDir, category);
    return subPath ? path.join(target, subPath) : target;
  }
}
