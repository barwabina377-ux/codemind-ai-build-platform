import React from 'react';
import { Search, Folder, File, Code2, AlertTriangle } from 'lucide-react';

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export function WorkspaceExplorer({ entries, activeFilter, setActiveFilter, searchQuery, setSearchQuery, selectedEntry, viewEntry, getFileIcon }: any) {
  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <div className="p-3 pb-0 shrink-0">
        <div className="relative mb-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-2 custom-scrollbar-hide snap-x">
          {['All', 'Modified', 'Errors', 'Recent', 'Favorites'].map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`snap-start shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border ${
                activeFilter === f 
                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
        {entries.filter((e: any) => {
          if (searchQuery && !e.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
          if (activeFilter === 'Errors' && !e.name.endsWith('.java') && !e.name.endsWith('.kt') && !e.name.endsWith('.xml')) return false;
          if (activeFilter === 'Modified' && e.dir) return false;
          return true;
        }).map((entry: any, idx: number) => {
          const depth = (entry.name.match(/\//g) || []).length - (entry.dir ? 1 : 0);
          const parts = entry.name.split('/').filter(Boolean);
          const basename = parts[parts.length - 1];
          
          return (
            <button 
              key={idx}
              onClick={() => viewEntry(entry)}
              disabled={entry.dir}
              className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg transition-all mb-0.5 group ${
                selectedEntry?.name === entry.name 
                  ? 'bg-blue-50 text-blue-700' 
                  : entry.dir 
                    ? 'text-gray-700 cursor-default' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              style={{ paddingLeft: `calc(0.75rem + ${depth * 1}rem)` }}
            >
              <div className="shrink-0 flex items-center">
                {entry.dir ? (
                  <Folder size={18} className="text-blue-400 fill-blue-400/20" />
                ) : (
                  <div className={selectedEntry?.name === entry.name ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-600'}>
                    {getFileIcon(basename)}
                  </div>
                )}
              </div>
              <span className={`truncate text-sm flex-1 ${entry.dir ? 'font-medium' : ''}`}>
                {basename}
              </span>
              {!entry.dir && entry.size > 0 && (
                <span className="text-[11px] text-gray-400 font-mono tracking-tight opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                  {activeFilter === 'Errors' && <AlertTriangle size={10} className="text-red-400" />}
                  {formatBytes(entry.size, 0)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
