import React, { useState, useMemo } from 'react';
import { ShieldAlert, Zap, AlertTriangle, AlertCircle, Bug, CheckCircle, Clock, Undo, Eye, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import * as Diff from 'diff';

export interface AIFixData {
  path: string;
  explanation: string;
  confidence: number;
  category: string;
  needsReview: boolean;
  estimatedImpact: {
    buildSuccess: boolean;
    performance: boolean;
    security: boolean;
    apkSize: boolean;
  };
  content: string; // The full new content
}

interface AIFixCardProps {
  fixData: AIFixData;
  originalContent: string | undefined;
  onApply: (path: string, content: string) => void;
  onUndo: (path: string, originalContent: string) => void;
}

export function AIFixCard({ fixData, originalContent, onApply, onUndo }: AIFixCardProps) {
  const [isApplied, setIsApplied] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  const getCategoryIcon = () => {
    switch (fixData.category.toLowerCase()) {
      case 'security': return <ShieldAlert size={16} className="text-red-500" />;
      case 'performance': return <Zap size={16} className="text-yellow-500" />;
      case 'memory leak': return <AlertTriangle size={16} className="text-orange-500" />;
      case 'crash risk': return <AlertCircle size={16} className="text-red-600" />;
      case 'code smell': return <Bug size={16} className="text-gray-500" />;
      default: return <CheckCircle size={16} className="text-blue-500" />;
    }
  };

  const getConfidenceColor = () => {
    if (fixData.confidence >= 90) return 'text-green-500';
    if (fixData.confidence >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const diffResult = useMemo(() => {
    if (!originalContent || !showDiff) return null;
    return Diff.diffLines(originalContent, fixData.content);
  }, [originalContent, fixData.content, showDiff]);

  const handleApply = () => {
    onApply(fixData.path, fixData.content);
    setIsApplied(true);
  };

  const handleUndo = () => {
    if (originalContent) {
      onUndo(fixData.path, originalContent);
      setIsApplied(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white my-3 shadow-sm font-sans">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-100 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getCategoryIcon()}
          <span className="font-semibold text-sm text-gray-800">{fixData.category} Fix</span>
          {fixData.needsReview && (
            <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
              Needs Review
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className={getConfidenceColor()}>{fixData.confidence}% Confidence</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        <div className="flex items-start gap-2 mb-3">
          <FileText size={16} className="text-gray-400 mt-0.5 shrink-0" />
          <div className="text-sm font-mono text-gray-700 break-all bg-gray-50 px-2 py-0.5 rounded border border-gray-100 flex-1">
            {fixData.path}
          </div>
        </div>

        <div className="text-sm text-gray-600 mb-4 leading-relaxed">
          <strong className="text-gray-800 block mb-1">Why this fix?</strong>
          {fixData.explanation}
        </div>

        {/* Impacts */}
        <div className="flex flex-wrap gap-2 mb-4">
          {fixData.estimatedImpact.buildSuccess && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-green-50 text-green-700 px-2 py-1 rounded-md border border-green-100">
              <CheckCircle size={12} /> Build Success ↑
            </span>
          )}
          {fixData.estimatedImpact.performance && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100">
              <Zap size={12} /> Performance ↑
            </span>
          )}
          {fixData.estimatedImpact.security && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-purple-50 text-purple-700 px-2 py-1 rounded-md border border-purple-100">
              <ShieldAlert size={12} /> Security ↑
            </span>
          )}
          {fixData.estimatedImpact.apkSize && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-teal-50 text-teal-700 px-2 py-1 rounded-md border border-teal-100">
              <ChevronDown size={12} /> APK Size ↓
            </span>
          )}
        </div>

        {/* Diff Viewer Toggle */}
        {originalContent && (
          <div className="mb-3">
            <button 
              onClick={() => setShowDiff(!showDiff)}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              {showDiff ? <ChevronUp size={14} /> : <Eye size={14} />}
              {showDiff ? 'Hide Code Changes' : 'Preview Patch (Diff)'}
            </button>
            
            {showDiff && diffResult && (
              <div className="mt-2 bg-[#0d1117] rounded-md overflow-hidden text-[11px] font-mono leading-tight max-h-64 overflow-y-auto custom-scrollbar border border-gray-800">
                {diffResult.map((part, index) => {
                   const color = part.added ? 'bg-green-900/30 text-green-400' :
                                 part.removed ? 'bg-red-900/30 text-red-400' : 'text-gray-400';
                   const prefix = part.added ? '+' : part.removed ? '-' : ' ';
                   return (
                     <div key={index} className={color}>
                       {part.value.split('\n').map((line, i) => {
                         if (i === part.value.split('\n').length - 1 && line === '') return null;
                         return (
                           <div key={i} className="flex px-2 py-0.5 hover:bg-white/5">
                             <span className="w-4 select-none opacity-50">{prefix}</span>
                             <span className="whitespace-pre-wrap break-all">{line}</span>
                           </div>
                         );
                       })}
                     </div>
                   );
                })}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
          {!isApplied ? (
            <button
              onClick={handleApply}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle size={16} /> Apply Patch
            </button>
          ) : (
            <button
              onClick={handleUndo}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 border border-gray-200"
            >
              <Undo size={16} /> Undo Patch
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
