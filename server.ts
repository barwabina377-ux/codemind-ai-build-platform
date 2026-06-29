import express from "express";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import { cloudPlatform } from "./src/server/cloud-build";
import { ZipSecurity } from "./src/server/cloud-build/ZipSecurity";

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
  zipData?: string;
}

class BuildQueue {
  private jobs: Map<string, BuildJob> = new Map();
  private queue: string[] = [];

  createJob(sessionId: string, zipData?: string): BuildJob {
    const id = Math.random().toString(36).substring(2, 10).toUpperCase();
    const job: BuildJob = {
      id,
      sessionId,
      uploadTime: Date.now(),
      status: 'Uploaded',
      progress: 0,
      currentStage: 'Initializing',
      logs: ['[System] Job created and uploaded.'],
      zipData
    };
    this.jobs.set(id, job);
    this.queue.push(id);
    this.processQueue();
    return job;
  }

  getJob(id: string): BuildJob | undefined {
    return this.jobs.get(id);
  }

  getAllJobs(): any[] {
    return Array.from(this.jobs.values()).sort((a, b) => b.uploadTime - a.uploadTime).map(job => {
      const issues: any[] = [];
      job.logs.forEach(log => {
        if (log.includes('FAILURE: Build failed with an exception.')) {
          issues.push({ type: 'error', title: 'Gradle Build Failed', desc: 'The Gradle daemon encountered an exception. Check the bottom of the logs for the exact task that failed.' });
        }
        if (log.includes('Unresolved reference:')) {
          const match = log.match(/Unresolved reference: (.*)/);
          if (match) issues.push({ type: 'error', title: `Unresolved Reference: ${match[1]}`, desc: 'A required class or package is missing or not imported.' });
        }
        if (log.includes('error: package') && log.includes('does not exist')) {
          issues.push({ type: 'error', title: 'Package Not Found', desc: 'A Java package does not exist. Ensure dependencies are correct in build.gradle.' });
        }
        if (log.includes('SDK location not found')) {
          issues.push({ type: 'error', title: 'SDK Not Found', desc: 'The Android SDK was not found. Please ensure local.properties contains sdk.dir.' });
        }
        if (log.includes('Deprecated Gradle features were used')) {
          issues.push({ type: 'warning', title: 'Deprecated Gradle Features', desc: 'This build uses deprecated features which will be incompatible in future Gradle versions.' });
        }
      });
      return { ...job, issues };
    });
  }

  cancelJob(id: string) {
    const job = this.jobs.get(id);
    if (job && (job.status !== 'Success' && job.status !== 'Failed' && job.status !== 'Ready To Build')) {
      job.status = 'Cancelled';
      job.logs.push(`[${new Date().toISOString()}] [System] Build cancelled by user.`);
    }
  }

  private addLog(id: string, log: string) {
    const job = this.jobs.get(id);
    if (job) job.logs.push(`[${new Date().toISOString()}] ${log}`);
  }

  private updateStatus(id: string, status: BuildStatus, progress: number, stage: string) {
    const job = this.jobs.get(id);
    if (job) {
      job.status = status;
      job.progress = progress;
      job.currentStage = stage;
    }
  }

  private async processQueue() {
    const runNext = async () => {
      const queuedJobId = this.queue.find(id => {
        const j = this.jobs.get(id);
        return j && j.status === 'Uploaded';
      });

      if (!queuedJobId) return;
      const job = this.jobs.get(queuedJobId)!;
      
      try {
        this.updateStatus(job.id, 'Queued', 10, 'In queue');
        this.addLog(job.id, 'Job placed in queue.');
        await new Promise(r => setTimeout(r, 1000));
        if((job.status as BuildStatus) === 'Cancelled') return runNext();

        this.updateStatus(job.id, 'Preparing', 20, 'Preparing workspace');
        this.addLog(job.id, 'Preparing isolated workspace environment...');
        const workspaceDir = path.join(process.cwd(), 'workspaces', job.id);
        fs.mkdirSync(workspaceDir, { recursive: true });
        if (job.zipData) {
          fs.writeFileSync(path.join(workspaceDir, 'project.zip'), Buffer.from(job.zipData, 'base64'));
          this.addLog(job.id, 'Project ZIP saved to workspace.');
        }

        this.updateStatus(job.id, 'Extracting', 30, 'Extracting files');
        this.addLog(job.id, 'Extracting project files into workspace...');
        await new Promise(r => setTimeout(r, 1000));
        if((job.status as BuildStatus) === 'Cancelled') return runNext();

        this.updateStatus(job.id, 'Building', 50, 'Running Gradle Build');
        this.addLog(job.id, 'Starting local Android Build Worker...');
        
        const workerScriptPath = path.join(process.cwd(), 'src', 'worker', 'local-build.sh');
        
        const args = [
            workerScriptPath,
            job.id,
            workspaceDir
        ];

        this.addLog(job.id, `Executing: bash ${args.join(' ')}`);

        const buildProcess = spawn('bash', args);

        buildProcess.stdout.on('data', (data) => {
            const lines = data.toString().split('\n').filter(Boolean);
            lines.forEach((l: string) => this.addLog(job.id, l));
        });

        buildProcess.stderr.on('data', (data) => {
            const lines = data.toString().split('\n').filter(Boolean);
            lines.forEach((l: string) => this.addLog(job.id, `[ERROR] ${l}`));
        });

        buildProcess.on('close', (code) => {
            job.duration = Date.now() - job.uploadTime;
            
            if ((job.status as BuildStatus) === 'Cancelled') {
              this.addLog(job.id, `Process terminated after cancellation.`);
              return runNext();
            }

            if (code === 0 && fs.existsSync(path.join(workspaceDir, 'output.apk'))) {
                this.updateStatus(job.id, 'Success', 100, 'Build Completed');
                this.addLog(job.id, 'Build successful. APK generated and moved to workspace output.');
            } else {
                this.updateStatus(job.id, 'Failed', 100, 'Build Failed');
                this.addLog(job.id, `Process exited with code ${code}. Check logs above for errors.`);
                job.error = `Build failed with exit code ${code}`;
            }
            
            // Clean up zip to save space
            if (fs.existsSync(path.join(workspaceDir, 'project.zip'))) {
               fs.unlinkSync(path.join(workspaceDir, 'project.zip'));
            }
            
            runNext();
        });
        
        buildProcess.on('error', (err) => {
           this.addLog(job.id, `[SYSTEM ERROR] Failed to start build worker: ${err.message}`);
           this.addLog(job.id, `Note: Required build tools might be missing.`);
           this.updateStatus(job.id, 'Failed', 100, 'Worker Error');
           job.error = err.message;
           job.duration = Date.now() - job.uploadTime;
           runNext();
        });

      } catch (err: any) {
        this.updateStatus(job.id, 'Failed', 100, 'System Error');
        this.addLog(job.id, `Internal error: ${err.message}`);
        job.error = err.message;
        job.duration = Date.now() - job.uploadTime;
        runNext();
      }
    };

    runNext();
  }
}

const buildManager = new BuildQueue();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));

  // API Routes
  app.post("/api/build/start", (req, res) => {
    const sessionId = req.body.sessionId || 'default';
    const zipData = req.body.zipData;
    const job = buildManager.createJob(sessionId, zipData);
    res.json(job);
  });

  app.get("/api/build/history", (req, res) => {
    res.json(buildManager.getAllJobs());
  });

  app.get("/api/build/:id/status", (req, res) => {
    const job = buildManager.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  });

  app.get("/api/build/:id/logs", (req, res) => {
    const job = buildManager.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json({ logs: job.logs });
  });

  app.get("/api/build/:id/result", (req, res) => {
    const job = buildManager.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    
    // Parse logs to generate dynamic issues for DebugCenter
    const issues: any[] = [];
    job.logs.forEach(log => {
      if (log.includes('FAILURE: Build failed with an exception.')) {
        issues.push({ type: 'error', title: 'Gradle Build Failed', desc: 'The Gradle daemon encountered an exception. Check the bottom of the logs for the exact task that failed.' });
      }
      if (log.includes('Unresolved reference:')) {
        const match = log.match(/Unresolved reference: (.*)/);
        if (match) issues.push({ type: 'error', title: `Unresolved Reference: ${match[1]}`, desc: 'A required class or package is missing or not imported.' });
      }
      if (log.includes('error: package') && log.includes('does not exist')) {
        issues.push({ type: 'error', title: 'Package Not Found', desc: 'A Java package does not exist. Ensure dependencies are correct in build.gradle.' });
      }
      if (log.includes('SDK location not found')) {
        issues.push({ type: 'error', title: 'SDK Not Found', desc: 'The Android SDK was not found. Please ensure local.properties contains sdk.dir.' });
      }
      if (log.includes('Deprecated Gradle features were used')) {
        issues.push({ type: 'warning', title: 'Deprecated Gradle Features', desc: 'This build uses deprecated features which will be incompatible in future Gradle versions.' });
      }
    });

    res.json({ status: job.status, duration: job.duration, error: job.error, issues });
  });

  app.get("/api/build/:id/artifact", (req, res) => {
    const jobId = req.params.id;
    const job = buildManager.getJob(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.status !== 'Success') return res.status(400).json({ error: "Build is not successful" });

    const artifactPath = path.join(process.cwd(), 'workspaces', jobId, 'output.apk');
    if (fs.existsSync(artifactPath)) {
      res.download(artifactPath, `app-debug-${jobId}.apk`);
    } else {
      res.status(404).json({ error: "Artifact not found on server" });
    }
  });

  app.post("/api/build/:id/cancel", (req, res) => {
    const job = buildManager.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    buildManager.cancelJob(req.params.id);
    res.json(job);
  });

  // ==========================================
  // REMOTE CLOUD BUILD PLATFORM API
  // ==========================================

  app.post("/api/cloud/upload", cloudPlatform.getUploadMiddleware().single('project'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      
      const validation = await ZipSecurity.validateZip(req.file.path);
      if (!validation.valid) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: validation.error });
      }

      res.json({ message: "Upload successful", filePath: req.file.path });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/cloud/start", (req, res) => {
    const userId = req.body.userId || 'anonymous';
    const zipPath = req.body.zipPath; // Path from /upload

    if (!cloudPlatform.rateLimiter.checkIpRateLimit(req.ip || '127.0.0.1')) {
      return res.status(429).json({ error: "Too many requests from this IP" });
    }
    if (!cloudPlatform.rateLimiter.canStartBuild(userId)) {
      return res.status(429).json({ error: "Max concurrent builds reached for this user" });
    }

    const worker = cloudPlatform.workers.getAvailableWorker();
    if (!worker) {
      return res.status(503).json({ error: "No available workers" });
    }

    // For now we map it to the same internal buildManager to keep it working
    let zipDataStr = '';
    if (zipPath && fs.existsSync(zipPath)) {
      zipDataStr = fs.readFileSync(zipPath).toString('base64');
    }
    const job = buildManager.createJob(userId, zipDataStr);
    
    cloudPlatform.rateLimiter.incrementBuild(userId);
    // When done, we should decrement, this is a simplified linkage.
    
    res.json({ buildId: job.id, workerId: worker.workerId });
  });

  app.get("/api/cloud/status/:buildId", (req, res) => {
    const job = buildManager.getJob(req.params.buildId);
    if (!job) return res.status(404).json({ error: "Build not found" });
    res.json(job);
  });

  app.get("/api/cloud/logs/:buildId", (req, res) => {
    const job = buildManager.getJob(req.params.buildId);
    if (!job) return res.status(404).json({ error: "Build not found" });
    res.json({ logs: job.logs });
  });

  app.get("/api/cloud/result/:buildId", (req, res) => {
    const meta = cloudPlatform.artifacts.getMetadata(req.params.buildId);
    if (meta) {
       return res.json(meta);
    }
    const job = buildManager.getJob(req.params.buildId);
    if (!job) return res.status(404).json({ error: "Build not found" });
    res.json({ status: job.status, duration: job.duration, error: job.error });
  });

  app.delete("/api/cloud/build/:buildId", (req, res) => {
    const job = buildManager.getJob(req.params.buildId);
    if (!job) return res.status(404).json({ error: "Build not found" });
    buildManager.cancelJob(req.params.buildId);
    res.json({ message: "Build cancelled" });
  });

  // Admin Routes
  app.get("/api/admin/workers", (req, res) => {
    res.json(cloudPlatform.workers.getWorkers());
  });
  
  app.post("/api/admin/heartbeat", (req, res) => {
    cloudPlatform.workers.registerHeartbeat(req.body);
    res.json({ success: true });
  });

  app.get("/api/admin/stats", (req, res) => {
    const jobs = buildManager.getAllJobs();
    const running = jobs.filter(j => j.status === 'Building' || j.status === 'Extracting' || j.status === 'Preparing').length;
    const failed = jobs.filter(j => j.status === 'Failed').length;
    const completed = jobs.filter(j => j.status === 'Success').length;
    const queued = jobs.filter(j => j.status === 'Queued' || j.status === 'Uploaded').length;
    
    res.json({ running, failed, completed, queued });
  });

  // ==========================================

  const chatUploadDir = path.join(process.cwd(), 'cloud_storage', 'chat_uploads');
  if (!fs.existsSync(chatUploadDir)) fs.mkdirSync(chatUploadDir, { recursive: true });
  const chatUpload = multer({
    storage: multer.diskStorage({
      destination: (req: any, file: any, cb: any) => cb(null, chatUploadDir),
      filename: (req: any, file: any, cb: any) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + file.originalname)
    }),
    limits: { fileSize: 100 * 1024 * 1024 }
  });
  app.post("/api/chat/upload", chatUpload.single('file'), (req: any, res: any) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ path: req.file.path, name: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype });
  });
  app.post("/api/chat/stream", async (req: any, res: any) => {
    try {
      const { codebase, message, history, attachments } = req.body;
      let attachmentContext = '';
      if (attachments && attachments.length > 0) {
        attachmentContext = '\n\n=== ATTACHED FILES ===\n';
        for (const att of attachments) {
          attachmentContext += '- ' + att.name + ' (' + att.type + ')\n';
          if (att.path && fs.existsSync(att.path)) {
            try { attachmentContext += 'Content:\n' + fs.readFileSync(att.path, 'utf8').substring(0, 5000) + '\n\n'; }
            catch { attachmentContext += '[Binary file]\n\n'; }
          }
        }
      }
      const contextStr = codebase && codebase.trim() ? '=== CODEBASE CONTEXT ===\n' + codebase + '\n========================' + attachmentContext : attachmentContext || 'No codebase provided.';
      const key = process.env.GEMINI_API_KEY || '';
      if (!key) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
      const ai = new GoogleGenAI({ apiKey: key });
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');
      const stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: contextStr + '\n\n' + message }] }],
      });
      for await (const chunk of stream) { const text = chunk.text; if (text) res.write(text); }
      res.end();
    } catch (error: any) {
      console.error("Chat Stream Error:", error);
      if (!res.headersSent) res.status(500).json({ error: error.message });
      else res.end();
    }
  });
  app.post("/api/chat", async (req, res) => {
    try {
      const { codebase, message, history, apiKeys, routingRules } = req.body;
      
      // Default to Google Gemini with environment variable if no custom keys exist
      let provider = 'google';
      let model = 'gemini-2.5-flash';
      let key = process.env.GEMINI_API_KEY || '';

      if (routingRules && apiKeys) {
         // Determine if task is complex based on heuristics
         const isComplex = message.toLowerCase().includes('architect') || 
                           message.toLowerCase().includes('plan') || 
                           message.toLowerCase().includes('build a complete') ||
                           message.length > 500;
         
         const selectedModel = isComplex ? routingRules.complex : routingRules.fast;
         if (selectedModel) {
            // Find which provider supports this model based on known list
            if (selectedModel.includes('claude')) provider = 'anthropic';
            else if (selectedModel.includes('gpt')) provider = 'openai';
            else if (selectedModel.includes('llama') || selectedModel.includes('mixtral')) provider = 'groq';
            else if (selectedModel.includes('deepseek')) provider = 'deepseek';
            else if (selectedModel.includes('openrouter')) provider = 'openrouter';
            else provider = 'google';

            const providerConfig = apiKeys.find((p: any) => p.id === provider);
            if (providerConfig && providerConfig.key) {
               key = providerConfig.key;
               model = selectedModel;
            }
         }
      }

      if (!key) {
        return res.status(500).json({ error: `API key for provider '${provider}' is missing. Please configure it in Settings.` });
      }

      let contextStr = "No codebase provided.";
      if (codebase && codebase.trim().length > 0) {
        contextStr = `=== CODEBASE CONTEXT ===\n${codebase}\n========================`;
      }

      const systemInstruction = `You are CodeMind, an elite AI Software Engineer, Codebase Analyzer, and App Builder.
Your task is to help the user understand, review, improve, or build a codebase from scratch.
Always be concise, accurate, and format your responses with clean Markdown.

You have the ability to propose advanced fixes, modifications, and generate new files. To do so, output one or more JSON objects enclosed exactly within <ai_fix> and </ai_fix> tags.
Format:
<ai_fix>
{
  "path": "relative/path/to/file.ext",
  "explanation": "Why this bug existed and why this fix is correct, or what this new file does.",
  "confidence": 100,
  "category": "Feature", // "Security", "Memory Leak", "Crash Risk", "Code Smell", "Bug Fix", or "Feature"
  "needsReview": false,
  "estimatedImpact": {
    "buildSuccess": true,
    "performance": true,
    "security": false,
    "apkSize": false
  },
  "content": "// The new full content of the file"
}
</ai_fix>

You can include multiple <ai_fix> blocks in a single response to generate or modify multiple files.
Always provide the FULL file content in the "content" field. Do not provide partial updates.

If the user asks to "Build an app", "Build a React website", "Build a calculator", etc., you must automatically start creating a complete project by generating ALL necessary files via multiple <ai_fix> blocks.
Generate:
- Folder structure (represented by the paths in ai_fix)
- Source code
- Dependencies (e.g. package.json or build.gradle)
- README
- Configuration files

Do NOT create fake bugs. If no issue is found, clearly state "No issue found".
You must:
1. Index every file (you can see the file tree in the codebase context).
2. Build a project graph mentally.
3. Detect frameworks.
4. Support modifying or creating files via the <ai_fix> tags.
5. Prepare the project for Cloud Build.
6. NEVER generate fake previews or fake build results.

Here is the current codebase context the user has uploaded:
${contextStr}
`;

      let prompt = message;
      if (history && history.length > 0) {
        prompt = `Previous Conversation History:\n${history.map((h: any) => `${h.role}: ${h.content}`).join('\n')}\n\nUser's Next Message: ${message}`;
      }

      let reply = '';

      if (provider === 'google') {
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({
          model: model.includes('pro') ? 'gemini-1.5-pro' : 'gemini-2.5-flash',
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.2,
          }
        });
        reply = response.text || '';
      } else {
         // Generic OpenAI format for others (OpenRouter, Groq, DeepSeek, OpenAI)
         // Note: Anthropic uses a slightly different format natively, but often accessed via OpenRouter.
         // If native Anthropic is used, we'd need their SDK. For now, we will simulate standard completions if OpenRouter/OpenAI API compatible.
         let baseURL = 'https://api.openai.com/v1/chat/completions';
         if (provider === 'groq') baseURL = 'https://api.groq.com/openai/v1/chat/completions';
         if (provider === 'deepseek') baseURL = 'https://api.deepseek.com/chat/completions';
         if (provider === 'openrouter') baseURL = 'https://openrouter.ai/api/v1/chat/completions';

         const headers: any = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
         };
         if (provider === 'openrouter') {
            headers['HTTP-Referer'] = 'https://codemind.ai';
            headers['X-Title'] = 'CodeMind AI';
         }

         const openaiRes = await fetch(baseURL, {
            method: 'POST',
            headers,
            body: JSON.stringify({
               model: model.replace('openrouter/', ''),
               messages: [
                  { role: 'system', content: systemInstruction },
                  { role: 'user', content: prompt }
               ],
               temperature: 0.2
            })
         });

         if (!openaiRes.ok) {
            const err = await openaiRes.text();
            throw new Error(`Provider API Error (${provider}): ${err}`);
         }
         const data = await openaiRes.json();
         reply = data.choices?.[0]?.message?.content || '';
      }

      res.json({ reply });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate response from Gemini API" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
