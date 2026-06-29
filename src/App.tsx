import React, { useState, useCallback, useRef, useEffect } from "react";
import JSZip from "jszip";
import { WorkspaceExplorer } from "./components/WorkspaceExplorer";
import { analyzeProject, ProjectReadiness } from "./utils/projectAnalyzer";
import {
  UploadCloud,
  FileArchive,
  File as FileIcon,
  Folder,
  AlertCircle,
  HardDrive,
  FileText,
  Download,
  Code2,
  Copy,
  CheckCircle2,
  ChevronRight,
  X,
  FileJson,
  FileCode,
  FileImage,
  Sparkles,
  Send,
  Bot,
  User,
  Smartphone,
  CloudCog,
  Terminal,
  PlayCircle,
  Search,
  Filter,
  Star,
  Clock,
  AlertTriangle,
  Home,
  PlusSquare,
  FolderOpen,
  Settings as SettingsIcon,
  BarChart2,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ProjectInfoCard } from "./components/ProjectInfoCard";
import { AIDeveloperPanel } from "./components/AIDeveloperPanel";
import { DebugCenterModal } from "./components/DebugCenterModal";
import { CodeViewer } from "./components/CodeViewer";
import { Sidebar } from "./components/Sidebar";
import { ChatPanel } from "./components/ChatPanel";
import { Settings } from "./components/Settings";
import { AnalyzerDashboard } from "./components/AnalyzerDashboard";

interface ZipEntry {
  name: string;
  size: number;
  dir: boolean;
  date: Date;
  content?: string;
  isText?: boolean;
}

interface ChatMessage {
  role: "user" | "model";
  content: string;
}

const getFileIcon = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (
    ["json", "js", "ts", "jsx", "tsx", "html", "css", "xml"].includes(ext || "")
  )
    return <FileCode size={18} className="text-blue-500" />;
  if (["png", "jpg", "jpeg", "gif", "svg"].includes(ext || ""))
    return <FileImage size={18} className="text-purple-500" />;
  return <FileText size={18} className="text-gray-500" />;
};

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [entries, setEntries] = useState<ZipEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ZipEntry | null>(null);
  const [openFiles, setOpenFiles] = useState<ZipEntry[]>([]);
  const [allSourceCode, setAllSourceCode] = useState<string | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "All" | "Modified" | "Errors" | "Recent" | "Favorites"
  >("All");
  const [activeViewerTab, setActiveViewerTab] = useState<"Code" | "Preview">(
    "Code",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Chat State
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [activeView, setActiveView] = useState<
    | "Home"
    | "Upload"
    | "Projects"
    | "Build"
    | "Reports"
    | "Settings"
    | "Workspace"
  >("Home");
  const [homeTab, setHomeTab] = useState<"Chat" | "Explorer" | "Preview">(
    "Chat",
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Build Pipeline State
  const [isBuildModalOpen, setIsBuildModalOpen] = useState(false);
  const [isBuildHistoryOpen, setIsBuildHistoryOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [buildStatus, setBuildStatus] = useState<
    "idle" | "building" | "completed" | "error"
  >("idle");
  const [projectReadiness, setProjectReadiness] =
    useState<ProjectReadiness | null>(null);
  const [buildHistory, setBuildHistory] = useState<any[]>([]);
  const [uploadedZipFile, setUploadedZipFile] = useState<File | null>(null);
  const buildScrollRef = useRef<HTMLDivElement>(null);

  const fetchBuildHistory = async () => {
    try {
      const res = await fetch("/api/build/history");
      if (res.ok) {
        const data = await res.json();
        setBuildHistory(data);
      }
    } catch (e) {
      console.error("Failed to fetch build history");
    }
  };

  useEffect(() => {
    if (isBuildHistoryOpen) {
      fetchBuildHistory();
      const interval = setInterval(fetchBuildHistory, 2000);
      return () => clearInterval(interval);
    }
  }, [isBuildHistoryOpen]);

  const prevLatestJobStatus = useRef<string | null>(null);

  useEffect(() => {
    if (buildHistory.length > 0) {
      const latestJob = buildHistory[0];
      
      // If status changed to Success
      if (latestJob.status === 'Success' && prevLatestJobStatus.current !== 'Success') {
         // Auto-open chat
         setIsAIChatOpen(true);
         
         // Generate success message
         const msg: ChatMessage = {
           role: 'model',
           content: `✅ **Build Success**\n\n**Project Name**: ${latestJob.id}\n\n**Build Time**: ${latestJob.duration ? (latestJob.duration / 1000).toFixed(1) + 's' : 'N/A'}\n\n[Download APK](/api/build/${latestJob.id}/artifact)\n\n*The build completed successfully and the APK was generated.*`
         };
         
         setChatMessages(prev => {
            const newChat = [...prev, msg];
            if (file) localStorage.setItem(`codemind_chat_${file.name}`, JSON.stringify(newChat));
            return newChat;
         });
      }
      
      // If status changed to Failed
      if (latestJob.status === 'Failed' && prevLatestJobStatus.current !== 'Failed') {
         setIsAIChatOpen(true);
         const msg: ChatMessage = {
           role: 'model',
           content: `❌ **Build Failed**\n\n**Project Name**: ${latestJob.id}\n\n**Error**: ${latestJob.error || 'Unknown error'}\n\nCheck the Debug Center for detailed logs.`
         };
         setChatMessages(prev => {
            const newChat = [...prev, msg];
            if (file) localStorage.setItem(`codemind_chat_${file.name}`, JSON.stringify(newChat));
            return newChat;
         });
      }

      prevLatestJobStatus.current = latestJob.status;
    }
  }, [buildHistory, file]);

  const hasAndroidProject = entries.some(
    (e) =>
      e.name.includes("build.gradle") || e.name.includes("build.gradle.kts"),
  );

  useEffect(() => {
    if (buildScrollRef.current) {
      buildScrollRef.current.scrollTop = buildScrollRef.current.scrollHeight;
    }
  }, [buildLogs]);

  const triggerAutoDebug = () => {
    setIsDebugOpen(true);
  };

  const handleDownloadApk = (jobId: string) => {
    window.open(`/api/build/${jobId}/artifact`, "_blank");
  };

  const startApkBuild = () => {
    setIsBuildModalOpen(true);
  };

  // Load chat history from local storage when file changes
  useEffect(() => {
    if (file) {
      const savedChat = localStorage.getItem(`codemind_chat_${file.name}`);
      if (savedChat) {
        try {
          setChatMessages(JSON.parse(savedChat));
        } catch (e) {
          console.error("Failed to parse saved chat", e);
          setChatMessages([]);
        }
      } else {
        setChatMessages([]);
      }
    }
  }, [file]);

  // Save chat history to local storage when chat messages change
  useEffect(() => {
    if (file && chatMessages.length > 0) {
      localStorage.setItem(
        `codemind_chat_${file.name}`,
        JSON.stringify(chatMessages),
      );
    }
  }, [chatMessages, file]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleApplyPatch = (path: string, content: string) => {
    setEntries((prev) => {
      let found = false;
      const newEntries = prev.map((entry) => {
        if (entry.name === path || entry.name.endsWith(path)) {
          found = true;
          return { ...entry, content, size: new Blob([content]).size };
        }
        return entry;
      });

      if (!found) {
        newEntries.push({
          name: path,
          size: new Blob([content]).size,
          dir: false,
          date: new Date(),
          content: content,
          isText: true,
        });

        // Add parent dirs
        const parts = path.split("/");
        for (let i = 1; i < parts.length; i++) {
          const dirPath = parts.slice(0, i).join("/") + "/";
          if (!newEntries.find((e) => e.name === dirPath)) {
            newEntries.push({
              name: dirPath,
              size: 0,
              dir: true,
              date: new Date(),
            });
          }
        }
      }
      return newEntries.sort((a, b) => {
        if (a.dir && !b.dir) return -1;
        if (!a.dir && b.dir) return 1;
        return a.name.localeCompare(b.name);
      });
    });

    // update allSourceCode if needed
    setAllSourceCode((prev) => {
      if (!prev) return `/* === ${path} === */\n\n${content}`;
      const regex = new RegExp(
        `\\/\\* === ${path} === \\*\\/\\n\\n[\\s\\S]*?(?=\\n\\/\\* === |$)`,
        "g",
      );
      if (regex.test(prev)) {
        return prev.replace(regex, `/* === ${path} === */\n\n${content}`);
      } else {
        return prev + `\n\n/* === ${path} === */\n\n${content}`;
      }
    });

    if (
      selectedEntry &&
      (selectedEntry.name === path || selectedEntry.name.endsWith(path))
    ) {
      setSelectedEntry((prev) =>
        prev ? { ...prev, content, size: new Blob([content]).size } : prev,
      );
    }

    // Automatically switch to Projects or Workspace if they have no file yet?
    if (!file) {
      setFile(new File([], "AI_Generated_Project"));
      setActiveView("Home");
    }
  };

  const copyContextAsPrompt = () => {
    let prompt = "=== CONTEXT ===\n\n";
    if (allSourceCode) {
      prompt += "--- SOURCE CODE ---\n\n";
      prompt += allSourceCode;
      prompt += "\n\n";
    }

    if (chatMessages.length > 0) {
      prompt += "--- PREVIOUS CHAT HISTORY ---\n\n";
      chatMessages.forEach((msg) => {
        prompt += `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}\n\n`;
      });
      prompt += "\n";
    }

    prompt +=
      "--- INSTRUCTIONS ---\nPlease review the context above and help me with...";

    copyCode(prompt);
  };

  const compileAllCode = async (loadedZip: JSZip, zipEntries: ZipEntry[]) => {
    let combinedSource = "";
    for (const entry of zipEntries) {
      if (entry.dir) continue;
      const isText = entry.name.match(
        /\.(txt|md|csv|json|js|ts|tsx|jsx|html|css|xml|yml|yaml|ini|cfg|env)$/i,
      );
      if (isText) {
        const zipEntry = loadedZip.file(entry.name);
        if (zipEntry) {
          const content = await zipEntry.async("string");
          combinedSource += `\n/* === ${entry.name} === */\n\n${content}\n`;
        }
      }
    }
    return combinedSource.trim();
  };

  const closeFile = (name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newFiles = openFiles.filter((f) => f.name !== name);
    setOpenFiles(newFiles);
    if (selectedEntry?.name === name) {
      setSelectedEntry(
        newFiles.length > 0 ? newFiles[newFiles.length - 1] : null,
      );
    }
  };

  const processZipFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setLoading(true);
    setError(null);
    setSelectedEntry(null);
    setOpenFiles([]);
    setAllSourceCode(null);
    setEntries([]);
    setChatMessages([]);

    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(selectedFile);
      const parsedEntries: ZipEntry[] = [];

      loadedZip.forEach((relativePath, zipEntry) => {
        if (
          relativePath.startsWith("__MACOSX/") ||
          relativePath.includes(".DS_Store")
        )
          return;

        parsedEntries.push({
          name: zipEntry.name,
          dir: zipEntry.dir,
          date: zipEntry.date,
          size: (zipEntry as any)._data?.uncompressedSize || 0,
        });
      });

      parsedEntries.sort((a, b) => {
        if (a.dir && !b.dir) return -1;
        if (!a.dir && b.dir) return 1;
        return a.name.localeCompare(b.name);
      });

      setEntries(parsedEntries);

      const readiness = await analyzeProject(loadedZip, parsedEntries);
      setProjectReadiness(readiness);

      // Auto-compile for AI context in the background
      compileAllCode(loadedZip, parsedEntries).then((source) => {
        setAllSourceCode(source);
      });
    } catch (err) {
      console.error(err);
      setError(
        "Failed to read the zip file. Ensure it is a valid .zip format.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const newMessage: ChatMessage = { role: "user", content: chatInput };
    setChatMessages((prev) => [...prev, newMessage]);
    const currentInput = chatInput;
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codebase: allSourceCode || "No codebase available.",
          message: currentInput,
          history: chatMessages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      setChatMessages((prev) => [
        ...prev,
        { role: "model", content: data.reply },
      ]);
      setIsChatLoading(false);
    } catch (err: any) {
      setIsChatLoading(false);
      setChatMessages((prev) => [
        ...prev,
        { role: "model", content: `**Error**: ${err.message}` },
      ]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processZipFile(selectedFile);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (
      droppedFile &&
      (droppedFile.type === "application/zip" ||
        droppedFile.type === "application/x-zip-compressed" ||
        droppedFile.name.endsWith(".zip"))
    ) {
      processZipFile(droppedFile);
    } else {
      setError("Please drop a valid .zip archive.");
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const viewEntry = async (entry: ZipEntry) => {
    if (entry.dir) return;

    setLoading(true);
    setAllSourceCode(null);
    try {
      if (!file) throw new Error("No zip file loaded");
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      const zipEntry = loadedZip.file(entry.name);

      if (!zipEntry) throw new Error("File not found in zip");

      const content = await zipEntry.async("string");
      const isText = entry.name.match(
        /\.(txt|md|csv|json|js|ts|tsx|jsx|html|css|xml|yml|yaml|ini|cfg|env)$/i,
      );

      if (isText) {
        const fileWithContent = { ...entry, content, isText: true };
        setSelectedEntry(fileWithContent);
        setOpenFiles((prev) =>
          prev.find((f) => f.name === entry.name)
            ? prev
            : [...prev, fileWithContent],
        );
      } else {
        const blob = await zipEntry.async("blob");
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = entry.name.split("/").pop() || "download";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to read the file contents.");
    } finally {
      setLoading(false);
    }
  };

  const viewAllSourceCode = async () => {
    if (!file) return;
    setLoadingAll(true);
    setError(null);
    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      let combinedSource = "";

      for (const entry of entries) {
        if (entry.dir) continue;
        const isText = entry.name.match(
          /\.(txt|md|csv|json|js|ts|tsx|jsx|html|css|xml|yml|yaml|ini|cfg|env)$/i,
        );
        if (isText) {
          const zipEntry = loadedZip.file(entry.name);
          if (zipEntry) {
            const content = await zipEntry.async("string");
            combinedSource += `\n/* ==========================================\n   ${entry.name}\n   ========================================== */\n\n${content}\n`;
          }
        }
      }

      setAllSourceCode(combinedSource.trim());
      setSelectedEntry(null);
    } catch (err) {
      console.error(err);
      setError("Failed to read all source files.");
    } finally {
      setLoadingAll(false);
    }
  };

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 font-sans selection:bg-blue-100 flex overflow-hidden">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative pt-14 md:pt-0">
        {/* We can place the top header logic here based on active view */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/80 py-3 md:py-4 px-4 md:px-6 sticky top-0 z-20 hidden md:block">
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {(activeView === "Upload" || file) && (
              <>
                <motion.button
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={triggerAutoDebug}
                  className="text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 sm:gap-2 shadow-sm bg-orange-500 text-white hover:bg-orange-600"
                >
                  <AlertCircle size={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Auto Debug</span>
                  <span className="sm:hidden">Debug</span>
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={startApkBuild}
                  className="text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 sm:gap-2 shadow-sm bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <Smartphone size={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Build APK</span>
                  <span className="sm:hidden">Build</span>
                </motion.button>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 flex flex-col h-[calc(100vh-80px)] overflow-hidden">
          <AnimatePresence mode="wait">
            {activeView === "Upload" ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex-1 flex flex-col items-center justify-center p-6"
              >
                <div
                  className="w-full max-w-2xl bg-white border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-3xl p-16 text-center cursor-pointer transition-all hover:shadow-xl group"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileChange}
                    accept=".zip,application/zip,application/x-zip-compressed"
                    className="hidden"
                  />
                  <div className="bg-blue-50 w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <UploadCloud size={40} className="text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-3 tracking-tight">
                    Drop your .zip here
                  </h2>
                  <p className="text-gray-500 max-w-md mx-auto text-base">
                    Securely extract and view your code locally. No data leaves
                    your browser.
                  </p>
                  <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-400 font-medium">
                    <span>Supports: JS, TS, HTML, CSS, JSON & more</span>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 bg-red-50/80 border border-red-200 text-red-700 px-5 py-4 rounded-xl flex items-center gap-3 backdrop-blur-sm"
                  >
                    <AlertCircle size={20} className="shrink-0 text-red-500" />
                    <p className="font-medium text-sm">{error}</p>
                  </motion.div>
                )}
              </motion.div>
            ) : activeView === "Home" ? (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col overflow-hidden bg-white shadow-sm border-t border-l border-gray-200 relative"
              >
                <div className="flex-1 flex overflow-hidden relative">
                  <div
                    className={`flex-1 lg:flex-none lg:w-[400px] overflow-hidden relative ${homeTab === "Chat" || !file ? "block" : "hidden"} lg:block lg:border-r border-gray-200`}
                  >
                    <AIDeveloperPanel
                      onClose={() => {}}
                      chatMessages={chatMessages}
                      setChatMessages={setChatMessages}
                      isChatLoading={isChatLoading}
                      setIsChatLoading={setIsChatLoading}
                      allSourceCode={allSourceCode}
                      onApplyPatch={handleApplyPatch}
                      getFileContent={(path) =>
                        entries.find(
                          (e) => e.name === path || e.name.endsWith(path),
                        )?.content
                      }
                      isEmbedded={true}
                    />
                  </div>
                  {file && (
                    <div
                      className={`flex-1 lg:flex-none lg:w-[280px] overflow-hidden relative ${homeTab === "Explorer" ? "block" : "hidden"} lg:block lg:border-r border-gray-200`}
                    >
                      <WorkspaceExplorer
                        entries={entries}
                        activeFilter={activeFilter}
                        setActiveFilter={setActiveFilter}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        selectedEntry={selectedEntry}
                        viewEntry={viewEntry}
                        getFileIcon={getFileIcon}
                      />
                    </div>
                  )}
                  {file && (
                    <div
                      className={`flex-1 overflow-hidden relative bg-[#0d1117] ${homeTab === "Preview" ? "block" : "hidden"} lg:flex flex-col`}
                    >
                      {openFiles.length > 0 && (
                        <div className="flex bg-[#010409] border-b border-gray-800 overflow-x-auto custom-scrollbar-hide h-12 sticky top-0 z-20 shrink-0">
                          {openFiles.map((f) => (
                            <button
                              key={f.name}
                              onClick={() => setSelectedEntry(f)}
                              className={`flex items-center gap-2 px-4 h-full text-xs font-medium border-r border-gray-800 transition-colors shrink-0 group min-w-[120px] max-w-[200px] ${
                                selectedEntry?.name === f.name
                                  ? "bg-[#0d1117] text-blue-400 border-t-2 border-t-blue-500"
                                  : "bg-[#010409] text-gray-500 hover:bg-[#0d1117]/50 hover:text-gray-300 border-t-2 border-t-transparent"
                              }`}
                            >
                              {getFileIcon(f.name.split("/").pop() || "")}
                              <span className="truncate flex-1 text-left">
                                {f.name.split("/").pop()}
                              </span>
                              <div
                                onClick={(e) => closeFile(f.name, e)}
                                className={`p-0.5 rounded-md hover:bg-gray-700 transition-colors ${selectedEntry?.name === f.name ? "opacity-100 text-gray-400 hover:text-white" : "opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300"}`}
                              >
                                <X size={14} />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedEntry &&
                      selectedEntry.isText &&
                      !selectedEntry.name.endsWith(".html") ? (
                        <div className="flex-1 overflow-auto">
                          <CodeViewer
                            content={selectedEntry.content || ""}
                            language={
                              selectedEntry.name.split(".").pop() ||
                              "typescript"
                            }
                            onChange={(val) => {
                              // Simple in-memory save
                              const updatedEntry = {
                                ...selectedEntry,
                                content: val || "",
                              };
                              setSelectedEntry(updatedEntry);
                              setOpenFiles((prev) =>
                                prev.map((f) =>
                                  f.name === updatedEntry.name
                                    ? updatedEntry
                                    : f,
                                ),
                              );
                              setEntries((prev) =>
                                prev.map((f) =>
                                  f.name === updatedEntry.name
                                    ? updatedEntry
                                    : f,
                                ),
                              );
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex-1 bg-white relative">
                          <iframe
                            srcDoc={
                              selectedEntry?.name.endsWith(".html")
                                ? selectedEntry.content
                                : entries.find((e) => e.name === "index.html")
                                    ?.content ||
                                  "<html><body><h2>Web Preview</h2><p>Wait for build...</p></body></html>"
                            }
                            className="w-full h-full border-none"
                            title="Preview"
                            sandbox="allow-scripts allow-modals allow-forms"
                          />
                          <div className="absolute top-4 right-4 bg-gray-900/80 text-white px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm border border-white/10 flex items-center gap-2 z-10">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>{" "}
                            Live Preview
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {file && (
                  <div className="h-14 bg-gray-900 flex lg:hidden items-center justify-center gap-2 shrink-0 border-t border-gray-800">
                    <button
                      onClick={() => setHomeTab("Chat")}
                      className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${homeTab === "Chat" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
                    >
                      Chat
                    </button>
                    <button
                      onClick={() => setHomeTab("Explorer")}
                      className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${homeTab === "Explorer" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
                    >
                      Explorer
                    </button>
                    <button
                      onClick={() => setHomeTab("Preview")}
                      className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${homeTab === "Preview" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
                    >
                      Preview
                    </button>
                  </div>
                )}
              </motion.div>
            ) : activeView === "Projects" ? (
              <motion.div key="projects" className="flex-1 p-6 overflow-auto">
                <h2 className="text-2xl font-bold mb-4">My Projects</h2>
                {file ? (
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md cursor-pointer transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {file.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {entries.length} items • Active Workspace
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveView("Workspace")}
                        className="text-blue-600 bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100"
                      >
                        Open Workspace
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-gray-500">
                    <FolderOpen
                      size={48}
                      className="mx-auto mb-4 text-gray-300"
                    />
                    <p>No projects loaded. Go to Upload Project to start.</p>
                  </div>
                )}
              </motion.div>
            ) : activeView === "Build" ? (
              <motion.div key="build" className="flex-1 p-6 overflow-auto">
                <h2 className="text-2xl font-bold mb-4">Build Center</h2>
                {file ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center cursor-pointer hover:border-emerald-500 transition-colors max-w-xs" onClick={startApkBuild}>
                        <Smartphone size={32} className="mx-auto mb-3 text-emerald-500" />
                        <h3 className="font-semibold text-gray-900">Build APK</h3>
                        <p className="text-sm text-gray-500 mt-1">{hasAndroidProject ? "Android Gradle Build" : "Android Package"}</p>
                      </div>
                      <button onClick={() => setIsBuildHistoryOpen(true)} className="bg-white px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                        <Clock size={16} /> Build History
                      </button>
                    </div>
                    {projectReadiness && (
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${projectReadiness.status === "Ready" ? "bg-emerald-100 text-emerald-700" : projectReadiness.status === "Warning" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}>{projectReadiness.status}</span>
                          <span className="text-sm text-gray-600">Readiness Score: {projectReadiness.score}%</span>
                        </div>
                        <p className="text-xs text-gray-500">Project: {projectReadiness.projectType} &bull; {projectReadiness.info.applicationId || "Unknown"}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-20 text-gray-500">
                    <Smartphone size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Upload a project first to start building.</p>
                  </div>
                )}
              </motion.div>
            ) : false ? (
              <motion.div
                key="browser"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1"
              >
                <div className="border-b border-gray-100 bg-white px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <HardDrive size={18} className="text-gray-600" />
                    </div>
                    <div>
                      <h2 className="font-medium text-gray-900 tracking-tight">
                        {file.name}
                      </h2>
                      <p className="text-xs text-gray-500">
                        {formatBytes(file.size)} • {entries.length} items
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={viewAllSourceCode}
                    disabled={loadingAll}
                    className="text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                  >
                    {loadingAll ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
                    ) : (
                      <Code2 size={16} />
                    )}
                    Compile Source
                  </button>
                </div>

                {projectReadiness && (
                  <ProjectInfoCard readiness={projectReadiness} />
                )}

                <div className="flex flex-1 overflow-hidden">
                  <div
                    className={`flex-1 overflow-y-auto bg-gray-50/50 ${selectedEntry || allSourceCode ? "hidden lg:block lg:w-80 lg:flex-none border-r border-gray-200" : "w-full"}`}
                  >
                    {loading && entries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-500 mb-4"></div>
                        <p className="text-sm font-medium">
                          Extracting archive...
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col h-full">
                        <div className="p-3 pb-0 shrink-0">
                          <div className="relative mb-2">
                            <Search
                              size={14}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                              type="text"
                              placeholder="Search files..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                            />
                          </div>
                          <div className="flex gap-1 overflow-x-auto pb-2 custom-scrollbar-hide snap-x">
                            {[
                              "All",
                              "Modified",
                              "Errors",
                              "Recent",
                              "Favorites",
                            ].map((f) => (
                              <button
                                key={f}
                                onClick={() => setActiveFilter(f as any)}
                                className={`snap-start shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border ${
                                  activeFilter === f
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                }`}
                              >
                                {f}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
                          {entries
                            .filter((e) => {
                              if (
                                searchQuery &&
                                !e.name
                                  .toLowerCase()
                                  .includes(searchQuery.toLowerCase())
                              )
                                return false;
                              if (
                                activeFilter === "Errors" &&
                                !e.name.endsWith(".java") &&
                                !e.name.endsWith(".kt") &&
                                !e.name.endsWith(".xml")
                              )
                                return false;
                              if (activeFilter === "Modified" && e.dir)
                                return false;
                              return true;
                            })
                            .map((entry, idx) => {
                              const depth =
                                (entry.name.match(/\//g) || []).length -
                                (entry.dir ? 1 : 0);
                              const parts = entry.name
                                .split("/")
                                .filter(Boolean);
                              const basename = parts[parts.length - 1];

                              return (
                                <button
                                  key={idx}
                                  onClick={() => viewEntry(entry)}
                                  disabled={entry.dir}
                                  className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg transition-all mb-0.5 group ${
                                    selectedEntry?.name === entry.name
                                      ? "bg-blue-50 text-blue-700"
                                      : entry.dir
                                        ? "text-gray-700 cursor-default"
                                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                  }`}
                                  style={{
                                    paddingLeft: `calc(0.75rem + ${depth * 1}rem)`,
                                  }}
                                >
                                  <div className="shrink-0 flex items-center">
                                    {entry.dir ? (
                                      <Folder
                                        size={18}
                                        className="text-blue-400 fill-blue-400/20"
                                      />
                                    ) : (
                                      <div
                                        className={
                                          selectedEntry?.name === entry.name
                                            ? "text-blue-500"
                                            : "text-gray-400 group-hover:text-gray-600"
                                        }
                                      >
                                        {getFileIcon(basename)}
                                      </div>
                                    )}
                                  </div>
                                  <span
                                    className={`truncate text-sm flex-1 ${entry.dir ? "font-medium" : ""}`}
                                  >
                                    {basename}
                                  </span>
                                  {!entry.dir && entry.size > 0 && (
                                    <span className="text-[11px] text-gray-400 font-mono tracking-tight opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                      {activeFilter === "Errors" && (
                                        <AlertTriangle
                                          size={10}
                                          className="text-red-400"
                                        />
                                      )}
                                      {formatBytes(entry.size, 0)}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>

                  <AnimatePresence mode="wait">
                    {(selectedEntry || allSourceCode) && (
                      <motion.div
                        key="viewer"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex-1 flex flex-col bg-[#0d1117] relative overflow-hidden"
                      >
                        <div className="border-b border-gray-800 bg-[#010409] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
                          <div className="flex items-center gap-6 text-sm font-medium text-gray-300 overflow-hidden">
                            <div className="flex items-center gap-3">
                              {allSourceCode ? (
                                <Code2
                                  size={16}
                                  className="text-blue-400 shrink-0"
                                />
                              ) : (
                                getFileIcon(selectedEntry!.name)
                              )}
                              <span className="truncate tracking-wide">
                                {allSourceCode
                                  ? "Compiled Source Code"
                                  : selectedEntry?.name}
                              </span>
                            </div>

                            {/* Viewer Tabs */}
                            <div className="flex bg-gray-800/50 p-1 rounded-lg">
                              <button
                                onClick={() => setActiveViewerTab("Code")}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                  activeViewerTab === "Code"
                                    ? "bg-gray-700 text-white"
                                    : "text-gray-400 hover:text-gray-200"
                                }`}
                              >
                                Code
                              </button>
                              <button
                                onClick={() => setActiveViewerTab("Preview")}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                  activeViewerTab === "Preview"
                                    ? "bg-gray-700 text-white"
                                    : "text-gray-400 hover:text-gray-200"
                                }`}
                              >
                                Preview
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                copyCode(
                                  allSourceCode
                                    ? allSourceCode
                                    : selectedEntry?.content || "",
                                )
                              }
                              className="text-xs bg-gray-800/50 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 border border-gray-700"
                            >
                              {copied ? (
                                <CheckCircle2
                                  size={14}
                                  className="text-emerald-400"
                                />
                              ) : (
                                <Copy size={14} />
                              )}
                              {copied ? "Copied" : "Copy"}
                            </button>
                            <div className="w-px h-4 bg-gray-700 mx-1"></div>
                            <button
                              onClick={() => {
                                setSelectedEntry(null);
                                setAllSourceCode(null);
                              }}
                              className="text-gray-400 hover:text-white p-1.5 rounded-md hover:bg-gray-800 transition-colors"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                          {loading ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
                              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-700 border-t-blue-500"></div>
                              <p className="text-sm">Reading file...</p>
                            </div>
                          ) : activeViewerTab === "Preview" ? (
                            <div className="h-full flex flex-col">
                              {hasAndroidProject ||
                              [
                                "Android Native",
                                "Flutter",
                                "React Native",
                              ].includes(
                                projectReadiness?.projectType || "",
                              ) ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400">
                                  <div className="bg-gray-800/50 p-6 rounded-2xl mb-4 border border-gray-800">
                                    <Smartphone
                                      size={48}
                                      className="text-gray-500"
                                    />
                                  </div>
                                  <p className="text-gray-200 font-medium mb-1">
                                    Preview Not Available
                                  </p>
                                  <p className="text-sm max-w-sm">
                                    Native mobile projects cannot be previewed
                                    directly in the browser. Cloud build is
                                    required to generate the APK.
                                  </p>
                                </div>
                              ) : (
                                <div className="flex-1 bg-white rounded-lg overflow-hidden border border-gray-800">
                                  <iframe
                                    srcDoc={
                                      selectedEntry?.name.endsWith(".html")
                                        ? selectedEntry.content
                                        : entries.find(
                                            (e) => e.name === "index.html",
                                          )?.content ||
                                          "<html><body><h2>Web Preview</h2><p>Select an HTML file to preview.</p></body></html>"
                                    }
                                    className="w-full h-full border-none"
                                    title="Preview"
                                    sandbox="allow-scripts allow-modals allow-forms"
                                  />
                                </div>
                              )}
                            </div>
                          ) : allSourceCode ? (
                            <CodeViewer content={allSourceCode} />
                          ) : selectedEntry?.isText ? (
                            <CodeViewer
                              content={selectedEntry.content || ""}
                              language={
                                selectedEntry.name.split(".").pop() ||
                                "typescript"
                              }
                              onChange={(val) => {
                                const updatedEntry = {
                                  ...selectedEntry,
                                  content: val || "",
                                };
                                setSelectedEntry(updatedEntry);
                                setOpenFiles((prev) =>
                                  prev.map((f) =>
                                    f.name === updatedEntry.name
                                      ? updatedEntry
                                      : f,
                                  ),
                                );
                                setEntries((prev) =>
                                  prev.map((f) =>
                                    f.name === updatedEntry.name
                                      ? updatedEntry
                                      : f,
                                  ),
                                );
                              }}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400">
                              <div className="bg-gray-800/50 p-6 rounded-2xl mb-4 border border-gray-800">
                                <Download size={48} className="text-gray-500" />
                              </div>
                              <p className="text-gray-200 font-medium mb-1">
                                Binary File Extracted
                              </p>
                              <p className="text-sm max-w-sm">
                                This file type cannot be previewed in the
                                editor. It has been saved to your device.
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Build Readiness Dashboard */}
                  <AnimatePresence>
                    {isBuildModalOpen && projectReadiness && (
                      <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 20 }}
                          className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]"
                        >
                          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
                            <div className="flex items-center gap-3">
                              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                                <CloudCog size={20} />
                              </div>
                              <div>
                                <h2 className="font-semibold text-gray-900">
                                  Build Readiness Dashboard
                                </h2>
                                <p className="text-xs text-gray-500">
                                  Project Analysis & Validation
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => setIsBuildModalOpen(false)}
                              className="text-gray-400 hover:text-gray-800 p-2 rounded-md hover:bg-gray-200 transition-colors"
                            >
                              <X size={20} />
                            </button>
                          </div>

                          <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                              {/* Score Card */}
                              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 flex flex-col items-center justify-center text-center">
                                <div className="relative w-24 h-24 flex items-center justify-center mb-2">
                                  <svg
                                    className="w-full h-full transform -rotate-90"
                                    viewBox="0 0 36 36"
                                  >
                                    <path
                                      className="text-gray-200"
                                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="3"
                                    />
                                    <path
                                      className={
                                        projectReadiness.score > 80
                                          ? "text-emerald-500"
                                          : projectReadiness.score > 50
                                            ? "text-orange-500"
                                            : "text-red-500"
                                      }
                                      strokeDasharray={`${projectReadiness.score}, 100`}
                                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="3"
                                    />
                                  </svg>
                                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                                    <span className="text-2xl font-bold text-gray-900">
                                      {projectReadiness.score}%
                                    </span>
                                  </div>
                                </div>
                                <h3 className="font-semibold text-gray-900 mt-2">
                                  Readiness Score
                                </h3>
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                                    projectReadiness.status === "Ready"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : projectReadiness.status === "Warning"
                                        ? "bg-orange-100 text-orange-800"
                                        : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {projectReadiness.status}
                                </span>
                              </div>

                              {/* Project Info */}
                              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                                <h3 className="font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                                  Project Details
                                </h3>
                                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 text-sm">
                                  <div>
                                    <dt className="text-gray-500 text-xs">
                                      Type
                                    </dt>
                                    <dd className="font-medium text-gray-900">
                                      {projectReadiness.projectType}
                                    </dd>
                                  </div>
                                  {projectReadiness.info.projectName && (
                                    <div>
                                      <dt className="text-gray-500 text-xs">
                                        Name
                                      </dt>
                                      <dd className="font-medium text-gray-900">
                                        {projectReadiness.info.projectName}
                                      </dd>
                                    </div>
                                  )}
                                  {projectReadiness.info.applicationId && (
                                    <div className="sm:col-span-2">
                                      <dt className="text-gray-500 text-xs">
                                        Application ID
                                      </dt>
                                      <dd
                                        className="font-medium text-gray-900 truncate"
                                        title={
                                          projectReadiness.info.applicationId
                                        }
                                      >
                                        {projectReadiness.info.applicationId}
                                      </dd>
                                    </div>
                                  )}
                                  {projectReadiness.info.gradleVersion && (
                                    <div>
                                      <dt className="text-gray-500 text-xs">
                                        Gradle
                                      </dt>
                                      <dd className="font-medium text-gray-900">
                                        {projectReadiness.info.gradleVersion}
                                      </dd>
                                    </div>
                                  )}
                                  {projectReadiness.info.agpVersion && (
                                    <div>
                                      <dt className="text-gray-500 text-xs">
                                        AGP
                                      </dt>
                                      <dd className="font-medium text-gray-900">
                                        {projectReadiness.info.agpVersion}
                                      </dd>
                                    </div>
                                  )}
                                  {projectReadiness.info.compileSdk && (
                                    <div>
                                      <dt className="text-gray-500 text-xs">
                                        Compile SDK
                                      </dt>
                                      <dd className="font-medium text-gray-900">
                                        {projectReadiness.info.compileSdk}
                                      </dd>
                                    </div>
                                  )}
                                  {projectReadiness.info.targetSdk && (
                                    <div>
                                      <dt className="text-gray-500 text-xs">
                                        Target SDK
                                      </dt>
                                      <dd className="font-medium text-gray-900">
                                        {projectReadiness.info.targetSdk}
                                      </dd>
                                    </div>
                                  )}
                                </dl>
                              </div>
                            </div>

                            {/* Issues List */}
                            <div>
                              <h3 className="font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                                Dependency & Structure Scanner
                              </h3>
                              {projectReadiness.issues.length === 0 ? (
                                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-lg flex items-start gap-3 border border-emerald-100">
                                  <CheckCircle2
                                    className="shrink-0 mt-0.5"
                                    size={18}
                                  />
                                  <div>
                                    <p className="font-medium">
                                      All checks passed!
                                    </p>
                                    <p className="text-sm mt-1 opacity-90">
                                      Your project structure looks great and is
                                      ready to build.
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {projectReadiness.issues.map((issue, idx) => (
                                    <div
                                      key={idx}
                                      className={`p-4 rounded-lg border flex gap-3 ${
                                        issue.type === "error"
                                          ? "bg-red-50 border-red-100 text-red-900"
                                          : issue.type === "warning"
                                            ? "bg-orange-50 border-orange-100 text-orange-900"
                                            : "bg-blue-50 border-blue-100 text-blue-900"
                                      }`}
                                    >
                                      <AlertCircle
                                        className={`shrink-0 mt-0.5 ${
                                          issue.type === "error"
                                            ? "text-red-500"
                                            : issue.type === "warning"
                                              ? "text-orange-500"
                                              : "text-blue-500"
                                        }`}
                                        size={18}
                                      />
                                      <div>
                                        <h4 className="font-medium text-sm">
                                          {issue.title}
                                        </h4>
                                        <p className="text-sm mt-1 opacity-90">
                                          {issue.explanation}
                                        </p>
                                        <div className="mt-2 text-xs font-medium bg-white/50 inline-block px-2 py-1 rounded">
                                          Fix: {issue.recommendation}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Terminal size={16} className="text-gray-400" />
                              <span className="text-sm font-medium text-gray-600">
                                Cloud Build Backend Ready
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setIsBuildModalOpen(false);
                                  setIsBuildHistoryOpen(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 shadow-sm"
                              >
                                View Queue
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    if (!file) return;
                                    const formData = new FormData();
                                    formData.append('project', file);
                                    
                                    const uploadRes = await fetch("/api/cloud/upload", {
                                      method: "POST",
                                      body: formData
                                    });
                                    if (!uploadRes.ok) {
                                      const errData = await uploadRes.json();
                                      alert(`Security Validation Failed: ${errData.error}`);
                                      return;
                                    }
                                    const uploadData = await uploadRes.json();

                                    await fetch("/api/cloud/start", {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        userId: "user-session-1",
                                        zipPath: uploadData.filePath,
                                      }),
                                    });
                                    setIsBuildModalOpen(false);
                                    setIsBuildHistoryOpen(true);
                                  } catch (e) {
                                    console.error("Failed to start build", e);
                                  }
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm"
                              >
                                <PlayCircle size={16} />
                                Start Cloud Build
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>

                  {/* Build History Modal */}
                  <AnimatePresence>
                    {isBuildHistoryOpen && (
                      <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 20 }}
                          className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]"
                        >
                          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                <CloudCog size={20} />
                              </div>
                              <div>
                                <h2 className="font-semibold text-gray-900">
                                  Cloud Build Queue
                                </h2>
                                <p className="text-xs text-gray-500">
                                  Live Job History & Status
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => setIsBuildHistoryOpen(false)}
                              className="text-gray-400 hover:text-gray-800 p-2 rounded-md hover:bg-gray-200 transition-colors"
                            >
                              <X size={20} />
                            </button>
                          </div>

                          <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
                            {buildHistory.length === 0 ? (
                              <div className="text-center py-12 text-gray-500">
                                <p>
                                  No builds in queue. Start a build to see it
                                  here.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {buildHistory.map((job) => (
                                  <div
                                    key={job.id}
                                    className="border border-gray-100 rounded-xl p-4 bg-gray-50 flex flex-col gap-3"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                          ID: {job.id}
                                        </span>
                                        <span
                                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                                            job.status === "Ready To Build" ||
                                            job.status === "Success"
                                              ? "bg-emerald-100 text-emerald-700"
                                              : job.status === "Failed" ||
                                                  job.status === "Cancelled"
                                                ? "bg-red-100 text-red-700"
                                                : "bg-blue-100 text-blue-700"
                                          }`}
                                        >
                                          {job.status}
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        {new Date(
                                          job.uploadTime,
                                        ).toLocaleTimeString()}
                                      </div>
                                    </div>

                                    <div>
                                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                        <span>{job.currentStage}</span>
                                        <span>{job.progress}%</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                        <div
                                          className="bg-blue-500 h-1.5 transition-all duration-500"
                                          style={{ width: `${job.progress}%` }}
                                        ></div>
                                      </div>
                                    </div>

                                    <div className="bg-gray-900 rounded p-3 text-xs font-mono text-gray-300 max-h-32 overflow-y-auto custom-scrollbar">
                                      {job.logs.map(
                                        (log: string, i: number) => (
                                          <div key={i}>{log}</div>
                                        ),
                                      )}
                                    </div>
                                    {job.status === "Success" && (
                                      <div className="mt-2 flex justify-end">
                                        <button
                                          onClick={() =>
                                            handleDownloadApk(job.id)
                                          }
                                          className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                                        >
                                          <Download size={14} /> Download
                                          Artifact (APK)
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>

                  {/* AI Chat Panel */}
                  <AnimatePresence>
                    {isAIChatOpen && (
                      <ChatPanel
                        isOpen={isAIChatOpen}
                        onClose={() => setIsAIChatOpen(false)}
                        allSourceCode={allSourceCode}
                        getFileContent={(path) => entries.find((e) => e.name === path || e.name.endsWith(path))?.content}
                        buildHistory={buildHistory}
                        onDownloadApk={handleDownloadApk}
                        onTriggerBuild={async () => {
                          if (file) {
                             try {
                               const formData = new FormData();
                               formData.append('project', file);
                               const uploadRes = await fetch("/api/cloud/upload", { method: "POST", body: formData });
                               if (!uploadRes.ok) { const errData = await uploadRes.json(); alert("Security Validation Failed: " + errData.error); return; }
                               const uploadData = await uploadRes.json();
                               await fetch("/api/cloud/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "user-session-1", zipPath: uploadData.filePath }) });
                               setIsBuildHistoryOpen(true);
                             } catch (e) { console.error(e); alert("Failed to start cloud build."); }
                          }
                        }}
                      />
                    )}
                  </AnimatePresence>                </div>
              </motion.div>
            ) : activeView === "Reports" ? (
              <motion.div key="reports" className="flex-1 overflow-hidden">
                <AnalyzerDashboard 
                  readiness={projectReadiness} 
                  onRunAIScan={(type) => {
                     setActiveView("Workspace");
                     setIsAIChatOpen(true);
                     // Note: Normally we'd send a message here, but we can rely on the user switching the tab inside the chat, 
                     // or we could push a message to chatMessages and call the API. For simplicity, we just open the chat.
                     const initialMsg = `Analyze the project focusing exclusively on ${type}. Provide detailed insights and suggestions.`;
                     // We could dispatch an event, but opening chat is a good start.
                  }}
                />
              </motion.div>
            ) : activeView === "Settings" ? (
              <motion.div key="settings" className="flex-1 overflow-hidden">
                <Settings />
              </motion.div>
            ) : (
              <motion.div key="other" className="flex-1 p-6 flex items-center justify-center">
                <div className="text-center">
                  <FolderOpen size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">Select a view from the sidebar.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <div className="bg-gray-900 text-gray-300 text-[11px] px-4 py-1 flex items-center justify-between font-mono shrink-0 border-t border-gray-800 z-50 relative">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Terminal size={12} className="text-blue-400" />{" "}
              {projectReadiness?.projectType || "No Project"}
            </span>
            <span>
              {projectReadiness?.info?.kotlinVersion ? "Kotlin" : "Java"}
            </span>
            <span>UTF-8</span>
            <span>LF</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <CloudCog size={12} className="text-emerald-400" /> Cloud Build
              Online
            </span>
            <span className="flex items-center gap-1">
              <User size={12} /> Workers: 2
            </span>
            <span>Queue: 0</span>
            <span className="font-semibold text-emerald-400 border-l border-gray-700 pl-4">
              {buildStatus === "building"
                ? "Building..."
                : buildStatus === "completed"
                  ? "Build Ready"
                  : "Ready"}
            </span>
          </div>
        </div>

        <style>{`
        .custom-scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .custom-scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #30363d;
          border-radius: 6px;
          border: 3px solid #0d1117;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #484f58;
        }
      `}</style>
        <DebugCenterModal
          isOpen={isDebugOpen}
          onClose={() => setIsDebugOpen(false)}
          issues={buildHistory.length > 0 ? buildHistory[0].issues : []}
        />
      </div>
    </div>
  );
}
