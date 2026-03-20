
import React from 'react';
import { AppTab } from '../types';
import { Lightbulb, Network, Layout, Mic2, Rocket } from 'lucide-react';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const items = [
    { id: AppTab.BRAINSTORM, label: 'Brainstorm', icon: Lightbulb },
    { id: AppTab.ROADMAP, label: 'Roadmap', icon: Network },
    { id: AppTab.VISUALIZE, label: 'Prototypes', icon: Layout },
    { id: AppTab.PITCH, label: 'Elevator Pitch', icon: Rocket },
  ];

  return (
    <div className="w-20 md:w-64 glass h-screen flex flex-col border-r border-white/10 shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
          <Rocket className="text-white w-6 h-6" />
        </div>
        <span className="font-bold text-xl hidden md:block tracking-tight gradient-text">IdeaSpark</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Icon size={20} className={isActive ? 'animate-pulse' : ''} />
              <span className="font-medium hidden md:block">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/5 hidden md:block">
          <p className="text-xs text-gray-400 mb-2">Powered by</p>
          <div className="font-bold text-sm text-white flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Gemini 3 Pro
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
