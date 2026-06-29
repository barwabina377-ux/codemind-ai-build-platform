# Remote Cloud Build Platform API

## Client Endpoints

### `POST /api/cloud/upload`
Uploads an Android Studio ZIP project.
- **Request**: `multipart/form-data` with `project` field.
- **Response**: `{ message: "Upload successful", filePath: string }`
- **Security**: Validates against Zip Slip and dangerous extensions. Limits size to 100MB.

### `POST /api/cloud/start`
Starts a build job from a previously uploaded ZIP.
- **Request**: JSON `{ userId: string, zipPath: string }`
- **Response**: `{ buildId: string, workerId: string }`
- **Rate Limit**: Max 100 req/min per IP, max 2 concurrent builds per user.

### `GET /api/cloud/status/:buildId`
Retrieves current build status and progress.
- **Response**: `{ id, status, progress, currentStage }`

### `GET /api/cloud/logs/:buildId`
Retrieves streamed build logs.
- **Response**: `{ logs: string[] }`

### `GET /api/cloud/result/:buildId`
Retrieves final artifact metadata or failure state.
- **Response**: `{ buildId, apkSize, sha256, buildDuration }` OR `{ status, duration, error }`

### `DELETE /api/cloud/build/:buildId`
Cancels an active build and destroys container.
- **Response**: `{ message: "Build cancelled" }`

## Admin Endpoints

### `GET /api/admin/workers`
Returns connected worker states (CPU, RAM, Status, etc).

### `POST /api/admin/heartbeat`
Workers ping this to report their health.
- **Request**: JSON `{ workerId, cpu, ram, disk, queueLength, status }`

### `GET /api/admin/stats`
Returns system build queue statistics.
