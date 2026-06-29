import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send, Bot, User, Sparkles, X, Paperclip, Image, FileText,
  Trash2, Download, Copy, CheckCircle2, AlertCircle, StopCircle,
  RefreshCw, Edit3, Plus, MessageSquare, Clock, ChevronLeft,
  Loader2, Upload
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'file';
  size: number;
  dataUrl?: string;
  file?: File;
  uploading: boolean;
  uploaded: boolean;
  serverPath?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  attachments?: Attachment[];
  timestamp: number;
  isStreaming?: boolean;
  isEdited?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const ALLOWED_FILE_TYPES = '.zip,.apk,.java,.kt,.xml,.gradle,.txt,.pdf,.json,.md,.js,.ts,.tsx,.jsx,.html,.css,.yml,.yaml,.properties,.pro,.kts';
const ALLOWED_IMAGE_TYPES = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml';
const MAX_FILE_SIZE = 100 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group my-2 rounded-lg overflow-hidden border border-gray-700">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 text-gray-400 text-xs">
        <span className="font-mono">{language || 'code'}</span>
        <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="flex items-center gap-1 hover:text-white transition-colors">
          {copied ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter language={language || 'text'} style={oneDark} customStyle={{ margin: 0, borderRadius: 0, padding: '12px 16px', fontSize: '13px' }} wrapLines wrapLongLines>
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

function AttachmentPreview({ attachment, onRemove }: { attachment: Attachment; onRemove: () => void }) {
  if (attachment.type === 'image' && attachment.dataUrl) {
    return (
      <div className="relative inline-block group">
        <img src={attachment.dataUrl} alt={attachment.name} className="h-20 w-20 object-cover rounded-lg border border-gray-200" />
        <button onClick={onRemove} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <X size={12} />
        </button>
      </div>
    );
  }
  return (
    <div className="relative inline-flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-sm group max-w-[200px]">
      <FileText size={16} className="text-gray-500 shrink-0" />
      <span className="truncate text-gray-700">{attachment.name}</span>
      <span className="text-xs text-gray-400 shrink-0">{formatBytes(attachment.size)}</span>
      {attachment.uploading && <Loader2 size={14} className="animate-spin text-blue-500 shrink-0" />}
      <button onClick={onRemove} className="text-gray-400 hover:text-red-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <X size={14} />
      </button>
    </div>
  );
}

export function ChatPanel({
  isOpen, onClose, allSourceCode, getFileContent, buildHistory, onDownloadApk, onTriggerBuild,
}: {
  isOpen: boolean;
  onClose: () => void;
  allSourceCode: string | null;
  getFileContent?: (path: string) => string | undefined;
  buildHistory?: any[];
  onDownloadApk?: (id: string) => void;
  onTriggerBuild?: () => void;
}) {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try { const saved = localStorage.getItem('codemind_conversations'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeConv = conversations.find(c => c.id === activeConvId);
  const messages = activeConv?.messages || [];

  useEffect(() => { localStorage.setItem('codemind_conversations', JSON.stringify(conversations)); }, [conversations]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (conversations.length === 0) {
      const newConv: Conversation = { id: generateId(), title: 'New Chat', messages: [], createdAt: Date.now(), updatedAt: Date.now() };
      setConversations([newConv]); setActiveConvId(newConv.id);
    } else if (!activeConvId) { setActiveConvId(conversations[0].id); }
  }, []);

  const createNewConversation = () => {
    const newConv: Conversation = { id: generateId(), title: 'New Chat', messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    setConversations(prev => [newConv, ...prev]); setActiveConvId(newConv.id); setAttachments([]);
  };

  const deleteConversation = (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvId === id) { const remaining = conversations.filter(c => c.id !== id); remaining.length > 0 ? setActiveConvId(remaining[0].id) : createNewConversation(); }
  };

  const addMessage = useCallback((convId: string, msg: ChatMessage) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== convId) return c;
      let title = c.title;
      if (c.title === 'New Chat' && msg.role === 'user') title = msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '');
      return { ...c, messages: [...c.messages, msg], title, updatedAt: Date.now() };
    }));
  }, []);

  const updateLastMessage = useCallback((convId: string, updater: (msg: ChatMessage) => ChatMessage) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== convId || c.messages.length === 0) return c;
      const msgs = [...c.messages]; msgs[msgs.length - 1] = updater(msgs[msgs.length - 1]);
      return { ...c, messages: msgs, updatedAt: Date.now() };
    }));
  }, []);

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newAttachments: Attachment[] = [];
    for (const file of fileArray) {
      if (file.size > MAX_FILE_SIZE) continue;
      const isImage = file.type.startsWith('image/');
      const attachment: Attachment = { id: generateId(), name: file.name, type: isImage ? 'image' : 'file', size: file.size, file, uploading: true, uploaded: false };
      if (isImage) attachment.dataUrl = URL.createObjectURL(file);
      newAttachments.push(attachment);
    }
    setAttachments(prev => [...prev, ...newAttachments]);
    for (const att of newAttachments) {
      try {
        const formData = new FormData(); formData.append('file', att.file!);
        const res = await fetch('/api/chat/upload', { method: 'POST', body: formData });
        if (res.ok) { const data = await res.json(); setAttachments(prev => prev.map(a => a.id === att.id ? { ...a, uploading: false, uploaded: true, serverPath: data.path } : a)); }
        else { setAttachments(prev => prev.map(a => a.id === att.id ? { ...a, uploading: false } : a)); }
      } catch { setAttachments(prev => prev.map(a => a.id === att.id ? { ...a, uploading: false } : a)); }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => { const att = prev.find(a => a.id === id); if (att?.dataUrl) URL.revokeObjectURL(att.dataUrl); return prev.filter(a => a.id !== id); });
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files); };
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items; const files: File[] = [];
    for (const item of Array.from(items)) { if (item.kind === 'file') { const file = item.getAsFile(); if (file) files.push(file); } }
    if (files.length > 0) { e.preventDefault(); processFiles(files); }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if ((!trimmed && attachments.filter(a => a.uploaded).length === 0) || isLoading) return;
    if (attachments.some(a => a.uploading)) return;
    const userMsg: ChatMessage = { id: generateId(), role: 'user', content: trimmed, attachments: attachments.filter(a => a.uploaded), timestamp: Date.now() };
    addMessage(activeConvId, userMsg); setInput(''); setAttachments([]);
    const assistantMsg: ChatMessage = { id: generateId(), role: 'model', content: '', timestamp: Date.now(), isStreaming: true };
    addMessage(activeConvId, assistantMsg); setIsLoading(true);
    try {
      abortControllerRef.current = new AbortController();
      const response = await fetch('/api/chat/stream', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codebase: allSourceCode?.substring(0, 100000) || '', message: trimmed, history: messages.map(m => ({ role: m.role, content: m.content })), attachments: userMsg.attachments?.map(a => ({ name: a.name, path: a.serverPath, type: a.type })) }),
        signal: abortControllerRef.current.signal,
      });
      if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.error || `HTTP ${response.status}`); }
      const reader = response.body?.getReader(); if (!reader) throw new Error('No response stream');
      const decoder = new TextDecoder(); let fullContent = '';
      while (true) { const { done, value } = await reader.read(); if (done) break; fullContent += decoder.decode(value, { stream: true }); updateLastMessage(activeConvId, msg => ({ ...msg, content: fullContent })); }
      updateLastMessage(activeConvId, msg => ({ ...msg, isStreaming: false }));
    } catch (err: any) {
      if (err.name === 'AbortError') { updateLastMessage(activeConvId, msg => ({ ...msg, isStreaming: false, content: msg.content || '[Generation stopped]' })); }
      else { updateLastMessage(activeConvId, msg => ({ ...msg, isStreaming: false, content: `**Error:** ${err.message}` })); }
    } finally { setIsLoading(false); abortControllerRef.current = null; }
  };

  const handleStopGeneration = () => { abortControllerRef.current?.abort(); };
  const handleRegenerate = () => {
    setConversations(prev => prev.map(c => {
      if (c.id !== activeConvId) return c; const msgs = [...c.messages];
      if (msgs.length > 0 && msgs[msgs.length - 1].role === 'model') { msgs.pop(); const lastUser = msgs[msgs.length - 1]; if (lastUser?.role === 'user') { setInput(lastUser.content); if (lastUser.attachments) setAttachments(lastUser.attachments); } }
      return { ...c, messages: msgs };
    }));
  };

  const handleEditMessage = (msg: ChatMessage) => { setEditingMessageId(msg.id); setEditContent(msg.content); };
  const handleSaveEdit = () => {
    if (!editingMessageId) return;
    setConversations(prev => prev.map(c => {
      if (c.id !== activeConvId) return c; const idx = c.messages.findIndex(m => m.id === editingMessageId); if (idx === -1) return c;
      const msgs = [...c.messages]; msgs[idx] = { ...msgs[idx], content: editContent, isEdited: true };
      return { ...c, messages: msgs.slice(0, idx + 1) };
    }));
    setEditingMessageId(null); setEditContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  if (!isOpen) return null;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      className="fixed inset-y-0 right-0 w-full md:w-[480px] lg:w-[600px] bg-white shadow-2xl border-l border-gray-200 flex flex-col z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSidebar(!showSidebar)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><ChevronLeft size={18} className={showSidebar ? '' : 'rotate-180'} /></button>
          <Sparkles size={18} className="text-blue-500" /><h2 className="font-semibold text-gray-900 text-sm">AI Chat</h2>
          {activeConv && <span className="text-xs text-gray-400 truncate max-w-[150px] ml-2">{activeConv.title}</span>}
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"><X size={18} /></button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <AnimatePresence>
          {showSidebar && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 220, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="border-r border-gray-100 bg-gray-50 overflow-hidden shrink-0">
              <div className="p-3"><button onClick={createNewConversation} className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"><Plus size={16} /> New Chat</button></div>
              <div className="overflow-y-auto h-full pb-20 space-y-0.5 px-2">
                {conversations.map(conv => (
                  <div key={conv.id} className={`group flex items-center rounded-lg px-2 py-1.5 cursor-pointer transition-colors ${conv.id === activeConvId ? 'bg-white shadow-sm border border-gray-200' : 'hover:bg-gray-100'}`}>
                    <div onClick={() => setActiveConvId(conv.id)} className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5"><MessageSquare size={14} className="text-gray-400 shrink-0" /><span className="text-xs font-medium text-gray-700 truncate">{conv.title}</span></div>
                      <div className="flex items-center gap-1.5 mt-0.5 pl-5"><Clock size={10} className="text-gray-300" /><span className="text-[10px] text-gray-400">{formatTime(conv.updatedAt)}</span></div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }} className="p-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex-1 flex flex-col min-w-0" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          {buildHistory && buildHistory.length > 0 && (
            <div className={`mx-4 mt-3 p-3 rounded-xl border text-sm ${buildHistory[0].status === 'Success' ? 'bg-emerald-50 border-emerald-200' : buildHistory[0].status === 'Failed' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-xs">Build {buildHistory[0].status} — {buildHistory[0].progress}%</span>
                {buildHistory[0].status === 'Success' && onDownloadApk && <button onClick={() => onDownloadApk(buildHistory[0].id)} className="flex items-center gap-1 text-xs bg-emerald-600 text-white px-2 py-1 rounded-lg hover:bg-emerald-700"><Download size={12} /> APK</button>}
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Bot size={48} className="mb-3 opacity-40" /><p className="text-sm font-medium text-gray-500">Start a conversation</p><p className="text-xs mt-1">Upload files or ask about your codebase</p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {['Analyze this project', 'Find bugs in my code', 'Build an Android app', 'Explain architecture'].map(s => (
                    <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-full transition-colors">{s}</button>
                  ))}
                </div>
              </div>
            )}
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>{msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}</div>
                  <div className={`max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {msg.attachments.map(att => att.type === 'image' && att.dataUrl ? <img key={att.id} src={att.dataUrl} alt={att.name} className="h-16 w-16 object-cover rounded-lg border" /> : <div key={att.id} className="flex items-center gap-1.5 bg-gray-100 rounded px-2 py-1 text-xs text-gray-600"><FileText size={12} /> {att.name}</div>)}
                      </div>
                    )}
                    <div className={`rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-md' : 'bg-gray-100 text-gray-800 rounded-tl-md'}`}>
                      {msg.isStreaming && !msg.content && (<div className="flex items-center gap-1 py-1"><span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" /><span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} /><span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} /></div>)}
                      {editingMessageId === msg.id ? (
                        <div className="min-w-[200px]">
                          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} autoFocus onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); } }} />
                          <div className="flex gap-2 mt-1"><button onClick={handleSaveEdit} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Save & Resend</button><button onClick={() => setEditingMessageId(null)} className="text-xs bg-gray-200 px-2 py-1 rounded">Cancel</button></div>
                        </div>
                      ) : msg.role === 'model' ? (
                        <div className="markdown-body prose prose-sm max-w-none dark:prose-invert">
                          <Markdown remarkPlugins={[remarkGfm]}
                            components={{ code({ node, className, children, ...props }: any) { const match = /language-(\w+)/.exec(className || ''); const codeStr = String(children).replace(/\n$/, ''); if (match) return <CodeBlock language={match[1]} value={codeStr} />; return <code className="bg-gray-200 text-red-600 px-1 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>; } }}>
                            {msg.content}
                          </Markdown>
                          {msg.isStreaming && <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5 align-middle" />}
                        </div>
                      ) : (<div className="whitespace-pre-wrap break-words">{msg.content}</div>)}
                    </div>
                    {msg.role === 'model' && !msg.isStreaming && msg.content && (
                      <div className="flex items-center gap-1 mt-1 opacity-0 hover:opacity-100 transition-opacity">
                        <button onClick={() => navigator.clipboard.writeText(msg.content)} className="p-1 text-gray-400 hover:text-gray-600" title="Copy"><Copy size={14} /></button>
                        <button onClick={handleRegenerate} className="p-1 text-gray-400 hover:text-gray-600" title="Regenerate"><RefreshCw size={14} /></button>
                      </div>
                    )}
                    {msg.role === 'user' && !msg.isStreaming && (<button onClick={() => handleEditMessage(msg)} className="mt-1 p-1 text-gray-400 hover:text-gray-600 opacity-0 hover:opacity-100 transition-opacity" title="Edit"><Edit3 size={12} /></button>)}
                    {msg.isEdited && <span className="text-[10px] text-gray-400 mt-0.5">edited</span>}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
          <AnimatePresence>
            {isDragging && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-blue-500/10 backdrop-blur-sm flex items-center justify-center z-10 border-2 border-dashed border-blue-400 rounded-lg m-4">
                <div className="text-center"><Upload size={40} className="mx-auto text-blue-500 mb-2" /><p className="font-medium text-blue-600">Drop files to attach</p></div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="border-t border-gray-100 bg-white p-3 space-y-2" onPaste={handlePaste}>
            {attachments.length > 0 && (<div className="flex flex-wrap gap-2">{attachments.map(att => <AttachmentPreview key={att.id} attachment={att} onRemove={() => removeAttachment(att.id)} />)}</div>)}
            <div className="flex items-end gap-2">
              <div className="flex gap-1">
                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Attach file"><Paperclip size={18} /></button>
                <button onClick={() => imageInputRef.current?.click()} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Attach image"><Image size={18} /></button>
                <input ref={fileInputRef} type="file" multiple className="hidden" accept={ALLOWED_FILE_TYPES} onChange={e => e.target.files && processFiles(e.target.files)} />
                <input ref={imageInputRef} type="file" multiple className="hidden" accept={ALLOWED_IMAGE_TYPES} onChange={e => e.target.files && processFiles(e.target.files)} />
              </div>
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask about your codebase..." rows={1}
                className="flex-1 resize-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 max-h-32"
                style={{ minHeight: '40px' }} onInput={e => { const el = e.target as HTMLTextAreaElement; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 128) + 'px'; }} />
              {isLoading ? (
                <button onClick={handleStopGeneration} className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shrink-0" title="Stop generation"><StopCircle size={20} /></button>
              ) : (
                <button onClick={handleSend} disabled={!input.trim() && attachments.filter(a => a.uploaded).length === 0}
                  className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0" title="Send"><Send size={20} /></button>
              )}
            </div>
            <p className="text-[10px] text-gray-400 text-center">Supports: ZIP, APK, Java, Kotlin, XML, Gradle, PDF, JSON, MD • Drag & drop or paste files</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
