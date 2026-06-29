import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { StorageManager } from './StorageManager';
import { ZipSecurity } from './ZipSecurity';
import { ArtifactManager } from './ArtifactManager';
import { WorkerManager } from './WorkerManager';
import { RateLimiter } from './RateLimiter';
import { DownloadManager } from './DownloadManager';

export class CloudBuildPlatform {
  public storage: StorageManager;
  public artifacts: ArtifactManager;
  public workers: WorkerManager;
  public rateLimiter: RateLimiter;
  public downloads: DownloadManager;

  constructor() {
    this.storage = new StorageManager();
    this.artifacts = new ArtifactManager(this.storage);
    this.workers = new WorkerManager();
    this.rateLimiter = new RateLimiter();
    this.downloads = new DownloadManager();
  }

  getUploadMiddleware() {
    const uploadDir = this.storage.getPath('uploads');
    const storage = multer.diskStorage({
      destination: (req, file, cb) => cb(null, uploadDir),
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '.zip');
      }
    });
    return multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });
  }
}

export const cloudPlatform = new CloudBuildPlatform();
