import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { StorageManager } from './StorageManager';

export interface ArtifactMetadata {
  buildId: string;
  apkSize: number;
  sha256: string;
  buildDuration: number;
  generatedAt: number;
}

export class ArtifactManager {
  private storage: StorageManager;

  constructor(storage: StorageManager) {
    this.storage = storage;
  }

  async storeArtifact(buildId: string, apkPath: string, duration: number, logs: string[]): Promise<ArtifactMetadata | null> {
    if (!fs.existsSync(apkPath)) {
      return null;
    }

    const artifactDir = this.storage.getPath('artifacts', buildId);
    fs.mkdirSync(artifactDir, { recursive: true });

    const destApkPath = path.join(artifactDir, 'app-release.apk');
    fs.copyFileSync(apkPath, destApkPath);

    // Write logs
    fs.writeFileSync(path.join(artifactDir, 'build-logs.txt'), logs.join('\\n'));

    // Compute size and sha256
    const stat = fs.statSync(destApkPath);
    const fileBuffer = fs.readFileSync(destApkPath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const sha256 = hashSum.digest('hex');

    const metadata: ArtifactMetadata = {
      buildId,
      apkSize: stat.size,
      sha256,
      buildDuration: duration,
      generatedAt: Date.now()
    };

    fs.writeFileSync(path.join(artifactDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    return metadata;
  }

  getMetadata(buildId: string): ArtifactMetadata | null {
    const metaPath = this.storage.getPath('artifacts', `${buildId}/metadata.json`);
    if (fs.existsSync(metaPath)) {
      return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    }
    return null;
  }
}
