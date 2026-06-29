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