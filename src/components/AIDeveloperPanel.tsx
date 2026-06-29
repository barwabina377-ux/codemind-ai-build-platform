import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Bot, User, Sparkles, AlertCircle, ShieldAlert, Zap, LayoutTemplate, Activity, Settings2, Wrench, Download, PlayCircle, CheckCircle2 } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AIFixCard, AIFixData } from './AIFixCard';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export function AIDeveloperPanel({
  onClose,
  chatMessages,
  setChatMessages,
  isChatLoading,
  setIsChatLoading,
  allSourceCode,
  onApplyPatch,
  getFileContent,
  isEmbedded,
  buildHistory,
  onDownloadApk,
  onTriggerBuild
}: {
  onClose: () => void;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isChatLoading: boolean;
  setIsChatLoading: React.Dispatch<React.SetStateAction<boolean>>;
  allSourceCode: string | null;
  onApplyPatch?: (path: string, content: string) => void;
  getFileContent?: (path: string) => string | undefined;
  isEmbedded?: boolean;
  buildHistory?: any[];
  onDownloadApk?: (id: string) => void;
  onTriggerBuild?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'Chat' | 'Debug' | 'Optimize' | 'Security' | 'Architecture' | 'Dependencies' | 'Build Advisor'>('Chat');
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [toastMsg, setToastMsg] = useState<{text: string, type: 'info'|'success'|'error'} | null>(null);

  const showToast = (text: string, type: 'info'|'success'|'error' = 'info') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, activeTab]);

  const sendChatMessage = async (presetMessage?: string) => {
    const msg = presetMessage || chatInput;
    if (!msg.trim() || isChatLoading) return;

    const newUserMsg: ChatMessage = { role: 'user', content: msg };
    setChatMessages(prev => [...prev, newUserMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const apiKeysStr = localStorage.getItem('codemind_api_keys');
      const routingRulesStr = localStorage.getItem('codemind_routing_rules');
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codebase: allSourceCode ? allSourceCode.substring(0, 100000) : "No source code compiled.",
          message: msg,
          history: chatMessages,
          apiKeys: apiKeysStr ? JSON.parse(apiKeysStr) : [],
          routingRules: routingRulesStr ? JSON.parse(routingRulesStr) : null
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'API Error');
      }
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'model', content: data.reply }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'model', content: `**Error:** ${err.message}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleApplyPatch = (content: string) => {
    // Parse patches from content
    const patchRegex = /<patch_file\s+path="([^"]+)">\s*([\s\S]*?)\s*<\/patch_file>/g;
    let match;
    let anyPatched = false;
    while ((match = patchRegex.exec(content)) !== null) {
      const path = match[1];
      const patchContent = match[2];
      if (onApplyPatch) {
        onApplyPatch(path, patchContent);
        anyPatched = true;
      }
    }
    if (!anyPatched) {
      showToast("No patches found in this message.", 'error');
    } else {
      showToast("Patches applied successfully.", 'success');
    }
  };

  const tabs = [
    { id: 'Chat', icon: <Bot size={14} />, label: 'Chat' },
    { id: 'Debug', icon: <AlertCircle size={14} />, label: 'Debug' },
    { id: 'Optimize', icon: <Zap size={14} />, label: 'Optimize' },
    { id: 'Security', icon: <ShieldAlert size={14} />, label: 'Security' },
    { id: 'Architecture', icon: <LayoutTemplate size={14} />, label: 'Architecture' },
    { id: 'Dependencies', icon: <Settings2 size={14} />, label: 'Dependencies' },
    { id: 'Build Advisor', icon: <Activity size={14} />, label: 'Build Advisor' }
  ] as const;

  const handleTabChange = (tabId: typeof activeTab) => {
    setActiveTab(tabId);
    if (tabId !== 'Chat') {
       sendChatMessage(`Analyze the project focusing exclusively on ${tabId}. Provide detailed insights and suggestions.`);
    }
  };

  return (
    <motion.div
      initial={isEmbedded ? {} : { x: 300, opacity: 0 }}
      animate={isEmbedded ? {} : { x: 0, opacity: 1 }}
      exit={isEmbedded ? {} : { x: 300, opacity: 0 }}
      className={`${isEmbedded ? 'w-full' : 'w-full md:w-96 border-l shadow-2xl'} bg-white border-gray-200 flex flex-col z-20 h-full`}
    >
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-blue-500" />
          <h2 className="font-semibold text-gray-900">AI Developer Copilot</h2>
        </div>
        {!isEmbedded && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="flex overflow-x-auto custom-scrollbar border-b border-gray-100 bg-gray-50 hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.id 
                ? 'border-blue-500 text-blue-600 bg-white' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50" ref={chatScrollRef}>
        
        {/* Build Status Banner */}
        {buildHistory && buildHistory.length > 0 && (
          <div className={`p-3 rounded-xl border flex flex-col gap-2 ${
            buildHistory[0].status === 'Success' ? 'bg-emerald-50 border-emerald-100' :
            buildHistory[0].status === 'Failed' ? 'bg-red-50 border-red-100' :
            'bg-blue-50 border-blue-100'
          }`}>
             <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${
                  buildHistory[0].status === 'Success' ? 'text-emerald-700' :
                  buildHistory[0].status === 'Failed' ? 'text-red-700' :
                  'text-blue-700'
                }`}>
                  Build {buildHistory[0].status}: {buildHistory[0].currentStage}
                </span>
                <span className="text-xs text-gray-500">{buildHistory[0].progress}%</span>
             </div>
             {buildHistory[0].status === 'Success' && onDownloadApk && (
                <button 
                  onClick={() => onDownloadApk(buildHistory[0].id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Download size={14} /> Download APK
                </button>
             )}
          </div>
        )}

        {/* Build Project Trigger */}
        {onTriggerBuild && (!buildHistory || buildHistory.length === 0 || (buildHistory[0].status !== 'Building' && buildHistory[0].status !== 'Extracting')) && (
           <button 
             onClick={onTriggerBuild}
             className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm"
           >
             <PlayCircle size={14} /> Build Project (APK)
           </button>
        )}

        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 py-10 px-4">
            <div className="bg-blue-100 p-4 rounded-full mb-4">
              <Bot size={40} className="text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">CodeMind AI</h3>
            <p className="text-sm text-center max-w-[250px] mb-6">
              I am your AI Software Engineer. Describe the app you want to build, or upload a project.
            </p>
            <div className="flex flex-col w-full gap-2 text-left">
              <button onClick={() => setChatInput("Build a React Native app")} className="text-xs bg-white border border-gray-200 px-3 py-2 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm text-left">
                "Build a React Native app"
              </button>
              <button onClick={() => setChatInput("Create a Flutter portfolio")} className="text-xs bg-white border border-gray-200 px-3 py-2 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm text-left">
                "Create a Flutter portfolio"
              </button>
              <button onClick={() => setChatInput("Make a Python web scraper")} className="text-xs bg-white border border-gray-200 px-3 py-2 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm text-left">
                "Make a Python web scraper"
              </button>
            </div>
          </div>
        )}
        
        {chatMessages.map((msg, i) => {
          let displayContent = msg.content;
          let legacyPatches = false;
          const aiFixes: AIFixData[] = [];

          if (msg.role === 'model') {
            legacyPatches = msg.content.includes('<patch_file');
            displayContent = displayContent.replace(/<patch_file\s+path="([^"]+)">\s*([\s\S]*?)\s*<\/patch_file>/g, '> 🛠️ *Generated update for `$1`*');

            // Parse new <ai_fix> format
            const fixRegex = /<ai_fix>\s*([\s\S]*?)\s*<\/ai_fix>/g;
            let match;
            while ((match = fixRegex.exec(displayContent)) !== null) {
              try {
                const fixData = JSON.parse(match[1]) as AIFixData;
                aiFixes.push(fixData);
              } catch (e) {
                console.error("Failed to parse ai_fix block", e);
              }
            }
            // Strip ai_fix from display content
            displayContent = displayContent.replace(/<ai_fix>\s*([\s\S]*?)\s*<\/ai_fix>/g, '');
          }

          return (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'
            }`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm ${
              msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
            }`}>
              {msg.role === 'model' ? (
                <div className="flex flex-col">
                  {displayContent.trim() && (
                    <div className="markdown-body mb-2">
                      <Markdown remarkPlugins={[remarkGfm]}>{displayContent}</Markdown>
                    </div>
                  )}
                  {aiFixes.map((fix, idx) => (
                    <AIFixCard 
                      key={idx}
                      fixData={fix}
                      originalContent={getFileContent ? getFileContent(fix.path) : undefined}
                      onApply={(path, content) => onApplyPatch && onApplyPatch(path, content)}
                      onUndo={(path, content) => onApplyPatch && onApplyPatch(path, content)} // Re-applying original content acts as undo
                    />
                  ))}
                  {legacyPatches && (
                    <button 
                      onClick={() => handleApplyPatch(msg.content)}
                      className="mt-3 flex items-center gap-1.5 text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg transition-colors w-full justify-center shadow-sm"
                    >
                      <Sparkles size={14} />
                      Apply File Changes
                    </button>
                  )}
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
          );
        })}
        {isChatLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
              <Bot size={16} className="text-gray-600" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-4 flex items-center gap-2 shadow-sm">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex flex-wrap gap-2 mb-2">
           <button onClick={() => sendChatMessage("Find the most critical bugs in this codebase and provide a patch.")} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-medium flex items-center gap-1">
             <Wrench size={12}/> AI Fix
           </button>
           <button onClick={() => {
              let appliedCount = 0;
              chatMessages.forEach(msg => {
                 if (msg.role !== 'model') return;
                 const fixRegex = /<ai_fix>\s*([\s\S]*?)\s*<\/ai_fix>/g;
                 let match;
                 while ((match = fixRegex.exec(msg.content)) !== null) {
                    try {
                       const fixData = JSON.parse(match[1]) as AIFixData;
                       if (fixData.confidence >= 80 && !fixData.needsReview && onApplyPatch) {
                           onApplyPatch(fixData.path, fixData.content);
                           appliedCount++;
                       }
                    } catch (e) {}
                 }
              });
              if (appliedCount > 0) {
                 showToast(`Applied ${appliedCount} safe patches.`, 'success');
              } else {
                 showToast("No unapplied safe patches found.", 'info');
              }
           }} className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-100 font-medium flex items-center gap-1">
             <Sparkles size={12}/> Apply Safe Fixes
           </button>
        </div>
        <form 
          onSubmit={(e) => { e.preventDefault(); sendChatMessage(); }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask about your code..."
            className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
            disabled={isChatLoading}
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || isChatLoading}
            className="absolute right-2 p-2 text-blue-500 hover:bg-blue-50 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full shadow-lg border text-sm font-medium flex items-center gap-2 z-50 ${
              toastMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              toastMsg.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
             {toastMsg.type === 'success' && <CheckCircle2 size={16} />}
             {toastMsg.type === 'error' && <AlertCircle size={16} />}
             {toastMsg.type === 'info' && <Activity size={16} />}
             {toastMsg.text}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
