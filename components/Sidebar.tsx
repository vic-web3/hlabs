import React from 'react';
import { Topic, TopicId } from '../types';
import { Crown, Terminal, ShieldAlert, FileText, Hash, Radio, Activity, Feather, TrendingUp } from 'lucide-react';

interface SidebarProps {
  topics: Topic[];
  activeTopicId: TopicId;
  onSelectTopic: (id: TopicId) => void;
  workflowStatus: string;
  botName?: string;
  debugLog?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ topics, activeTopicId, onSelectTopic, workflowStatus, botName, debugLog }) => {
  
  const getIcon = (iconName: string, className: string) => {
    switch (iconName) {
      case 'crown': return <Crown className={className} size={18} />;
      case 'code': return <Terminal className={className} size={18} />;
      case 'feather': return <Feather className={className} size={18} />;
      case 'shield': return <ShieldAlert className={className} size={18} />;
      case 'trending': return <TrendingUp className={className} size={18} />;
      case 'file': return <FileText className={className} size={18} />;
      default: return <Hash className={className} size={18} />;
    }
  };

  return (
    <div className="w-64 bg-[#0e1621] border-r border-gray-800 flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-gray-800 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">OC</span>
        </div>
        <div>
          <h1 className="text-sm font-bold text-white">OpenClaw 模拟器</h1>
          <div className="flex items-center gap-1">
             <span className={`w-2 h-2 rounded-full ${workflowStatus === 'IDLE' ? 'bg-gray-500' : 'bg-green-500 animate-pulse'}`}></span>
             <span className="text-xs text-tg-hint uppercase">{workflowStatus}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3 mb-2">
          <span className="text-xs font-semibold text-tg-hint uppercase tracking-wider">Topics (话题组)</span>
        </div>
        
        <div className="space-y-1 px-2">
          {topics.map((topic) => (
            <button
              key={topic.id}
              onClick={() => onSelectTopic(topic.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-left
                ${activeTopicId === topic.id 
                  ? 'bg-[#2b5278] text-white shadow-md' 
                  : 'text-gray-400 hover:bg-[#17212b] hover:text-white'
                }`}
            >
              <div className={`${activeTopicId === topic.id ? 'text-white' : topic.color}`}>
                {getIcon(topic.icon, "")}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{topic.name}</span>
                <span className={`text-[10px] ${activeTopicId === topic.id ? 'text-blue-100' : 'text-gray-600 group-hover:text-gray-500'}`}>
                  {topic.description}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 bg-[#182533] border-t border-gray-800 space-y-2">
         {/* Bot Connection Status */}
         <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 flex items-center gap-1">
                <Radio size={12} className={botName ? "text-green-500" : "text-red-500"} />
                {botName ? "TG Online" : "Connecting..."}
            </span>
            <span className="text-blue-400 font-mono">{botName ? `@${botName}` : ""}</span>
         </div>
         
         {/* Debug Info */}
         {debugLog && (
             <div className="pt-2 border-t border-gray-700/50">
                <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                    <Activity size={10} />
                    <span>Last Signal:</span>
                </div>
                <div className="text-[10px] text-gray-400 font-mono break-all leading-tight opacity-75">
                    {debugLog}
                </div>
             </div>
         )}
      </div>
      
      <div className="p-2 text-[10px] text-gray-700 text-center">
        v1.0.0 • Powered by Gemini
      </div>
    </div>
  );
};

export default Sidebar;