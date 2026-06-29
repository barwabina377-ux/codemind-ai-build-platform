import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, AlertTriangle, Zap, ShieldAlert, FileJson, Package, Link, CheckCircle2 } from 'lucide-react';

export interface DebugIssue {
  title: string;
  desc: string;
  fix?: string;
  type: 'error' | 'warning';
}

export function DebugCenterModal({ isOpen, onClose, issues = [] }: { isOpen: boolean; onClose: () => void; issues?: DebugIssue[] }) {
  const [activeTab, setActiveTab] = useState('Errors');

  if (!isOpen) return null;

  const errors = issues.filter(i => i.type === 'error');
  const warnings = issues.filter(i => i.type === 'warning');

  const tabs = [
    { id: 'Errors', icon: <AlertCircle size={16} />, count: errors.length },
    { id: 'Warnings', icon: <AlertTriangle size={16} />, count: warnings.length },
    { id: 'Performance', icon: <Zap size={16} /> },
    { id: 'Security', icon: <ShieldAlert size={16} /> },
    { id: 'Manifest', icon: <FileJson size={16} /> },
    { id: 'Gradle', icon: <Package size={16} /> },
    { id: 'Dependencies', icon: <Link size={16} /> },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle size={20} />
              <h2 className="text-lg font-semibold">Debug Center</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-200">
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="w-64 border-r border-gray-100 bg-gray-50/50 p-4 space-y-1 overflow-y-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-red-50 text-red-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {tab.icon}
                  {tab.id}
                  {tab.id === 'Errors' && tab.count > 0 && <span className="ml-auto bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs">{tab.count}</span>}
                  {tab.id === 'Warnings' && tab.count > 0 && <span className="ml-auto bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-xs">{tab.count}</span>}
                </button>
              ))}
            </div>

            <div className="flex-1 p-6 overflow-y-auto bg-white">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  {tabs.find(t => t.id === activeTab)?.icon}
                  {activeTab} Analysis
                </h3>
                <p className="text-gray-500 mt-1 text-sm">AI-powered deep inspection of your codebase.</p>
              </div>

              {activeTab === 'Errors' && (
                <div className="space-y-4">
                  {errors.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10">No errors detected.</div>
                  ) : errors.map((err, i) => (
                    <div key={i} className="border border-red-100 bg-red-50/30 rounded-xl p-4">
                      <h4 className="font-semibold text-red-900 flex items-center gap-2">
                        <AlertCircle size={16} className="text-red-500" />
                        {err.title}
                      </h4>
                      <p className="text-sm text-red-700 mt-1 mb-3">{err.desc}</p>
                      {err.fix && (
                        <div className="bg-white border border-red-100 rounded-lg p-3">
                           <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Suggested Fix</span>
                           <code className="text-sm text-gray-800 font-mono">{err.fix}</code>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'Warnings' && (
                <div className="space-y-4">
                  {warnings.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10">No warnings detected.</div>
                  ) : warnings.map((warn, i) => (
                    <div key={i} className="border border-orange-100 bg-orange-50/30 rounded-xl p-4">
                      <h4 className="font-semibold text-orange-900 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-orange-500" />
                        {warn.title}
                      </h4>
                      <p className="text-sm text-orange-700 mt-1 mb-3">{warn.desc}</p>
                      {warn.fix && (
                        <div className="bg-white border border-orange-100 rounded-lg p-3">
                           <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Suggested Fix</span>
                           <code className="text-sm text-gray-800 font-mono">{warn.fix}</code>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {activeTab !== 'Errors' && activeTab !== 'Warnings' && (
                 <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    {tabs.find(t => t.id === activeTab)?.icon}
                    <p className="mt-4 text-sm font-medium">Open the AI Chat and ask to analyze {activeTab.toLowerCase()}.</p>
                    <p className="text-xs text-gray-400 mt-1">Use the AI Developer panel for detailed {activeTab.toLowerCase()} analysis.</p>
                 </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
