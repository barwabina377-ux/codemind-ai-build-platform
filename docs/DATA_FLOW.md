# System Data Flow

## 1. Project Upload & Validation
- **Client**: POST `/api/cloud/upload` (multipart form-data ZIP)
- **API Server (Express)**:
  - `multer` intercepts and streams ZIP to `cloud_storage/uploads/`
  - `ZipSecurity` scans archive for Zip Slip (`../`) and dangerous `.sh`/`.exe` files.
  - If invalid, delete file.
  - Returns `filePath`.

## 2. Build Initialization
- **Client**: POST `/api/cloud/start` with `filePath`
- **RateLimiter**: Validates IP rate limit and User concurrent build count.
- **WorkerManager**: Locates an `Idle` or `Online` Docker Build Worker.
- **BuildQueue**:
  - Assigns unique `buildId`.
  - Pushes job onto FIFO Queue.

## 3. Pre-Build Preparation (Worker/Server)
- Server creates `cloud_storage/workspaces/{buildId}`.
- Moves/extracts ZIP into the workspace.
- Transitions status: `Queued` -> `Preparing` -> `Extracting`.

## 4. Execution Pipeline
- Express spawns Docker worker container: `ubuntu:22.04` with volume mount to the workspace.
- The entrypoint `build-script.sh` executes.
- `stdout` / `stderr` piped directly back to Node.js `spawn` listeners.
- Node.js appends lines to in-memory `BuildQueue` logs and updates UI via Server-Sent Events or polling.

## 5. Artifact Extraction & Metadata
- Worker finishes `assembleDebug` and moves `app-release.apk` to workspace root `output.apk`.
- Docker container terminates cleanly (`--rm`).
- Express server detects exit code `0`.
- **ArtifactManager**:
  - Copies `output.apk` to `cloud_storage/artifacts/{buildId}/`.
  - Computes `SHA256` and file size.
  - Generates `metadata.json`.
- Express updates status to `Success`.

## 6. Download Phase
- Client requests artifact info: GET `/api/cloud/result/:buildId`.
- Download endpoint (Future) uses `DownloadManager` to generate secure timed token.
- Secure token allows proxy download of APK.
