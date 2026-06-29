import React, { useState, useEffect } from 'react';
import { Home, PlusSquare, FolderOpen, CloudCog, BarChart2, Settings, FileArchive, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: any) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function Sidebar({ activeView, setActiveView, isOpen, setIsOpen }: SidebarProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const menuItems = [
    { id: 'Home', icon: <Home size={18} />, label: 'AI Chat (Home)' },
    { id: 'Upload', icon: <PlusSquare size={18} />, label: 'Upload Project' },
    { id: 'Projects', icon: <FolderOpen size={18} />, label: 'My Projects' },
    { id: 'Build', icon: <CloudCog size={18} />, label: 'Build Center' },
    { id: 'Reports', icon: <BarChart2 size={18} />, label: 'AI Reports' },
    { id: 'Settings', icon: <Settings size={18} />, label: 'Settings' },
  ];

  const handleMenuClick = (id: string) => {
    setActiveView(id);
    if (isMobile) setIsOpen(false);
  };

  const SidebarContent = (
    <div className={`bg-white border-r border-gray-200 h-full flex flex-col transition-all shrink-0 z-40 ${!isOpen && !isMobile ? 'w-16 items-center py-4 gap-4' : 'w-64'}`}>
      {!isOpen && !isMobile ? (
        <>
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-2 rounded-xl shadow-sm mb-4 cursor-pointer" onClick={() => setIsOpen(true)}>
            <FileArchive size={22} />
          </div>
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item.id)}
              className={`p-3 rounded-xl transition-all hover:bg-gray-100 group relative ${activeView === item.id ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}
            >
              {item.icon}
              <div className="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded hidden group-hover:block whitespace-nowrap z-50">
                {item.label}
              </div>
            </button>
          ))}
        </>
      ) : (
        <>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => !isMobile && setIsOpen(false)}>
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-2 rounded-xl shadow-sm">
                <FileArchive size={22} />
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-gray-900">CodeMind AI</h1>
            </div>
            {isMobile && (
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">Menu</div>
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                  activeView === item.id 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <div className={activeView === item.id ? 'text-blue-600' : 'text-gray-400'}>
                  {item.icon}
                </div>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {isMobile && (
        <div className="md:hidden fixed top-0 left-0 w-full h-14 bg-white border-b border-gray-200 z-30 flex items-center px-4 justify-between">
          <div className="flex items-center gap-3">
             <button onClick={() => setIsOpen(true)} className="text-gray-700 hover:text-gray-900 bg-gray-100 p-2 rounded-lg">
                <Menu size={20} />
             </button>
             <h1 className="text-lg font-semibold text-gray-900">CodeMind AI</h1>
          </div>
        </div>
      )}
      
      {isMobile ? (
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                className="fixed top-0 left-0 h-full z-50 md:hidden"
              >
                {SidebarContent}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      ) : (
        <div className="hidden md:block sticky top-0 h-screen shrink-0 z-30">
          {SidebarContent}
        </div>
      )}
    </>
  );
}
