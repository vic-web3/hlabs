import React from 'react';
import ReactMarkdown from 'react-markdown';
import { AgentRole, Message } from '../types';
import { Bot, User, Cpu, Feather, TrendingUp } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === AgentRole.USER;
  
  const getAvatar = () => {
    if (isUser) return <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center"><User size={16} /></div>;
    
    switch (message.role) {
      case AgentRole.DIRECTOR: return <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center"><Bot size={16} /></div>;
      case AgentRole.ENGINEER: return <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center"><Cpu size={16} /></div>;
      case AgentRole.COPYWRITER: return <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center"><Feather size={16} /></div>;
      case AgentRole.CRITIC: return <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center"><ShieldCheckIcon size={16} /></div>;
      case AgentRole.GROWTH_LEAD: return <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center"><TrendingUp size={16} /></div>;
      case AgentRole.CREATOR: return <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center"><FileCheckIcon size={16} /></div>;
      default: return <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center"><Bot size={16} /></div>;
    }
  };

  // Helper icons for avatar switch
  const ShieldCheckIcon = ({ size }: {size: number}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
  );
  const FileCheckIcon = ({ size }: {size: number}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>
  );

  return (
    <div className={`flex gap-3 mb-6 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className="shrink-0 pt-1">
        {getAvatar()}
      </div>
      
      <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="flex items-baseline gap-2 mb-1">
          <span className={`text-sm font-bold ${isUser ? 'text-indigo-400' : getRoleColor(message.role)}`}>
            {message.role}
          </span>
          <span className="text-[10px] text-gray-500">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        <div className={`rounded-2xl px-4 py-3 shadow-sm ${
          isUser 
            ? 'bg-[#2b5278] text-white rounded-tr-none' 
            : 'bg-[#182533] text-gray-100 rounded-tl-none border border-gray-800/50'
        }`}>
          {message.isThinking ? (
            <div className="flex items-center gap-2 h-6">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
            </div>
          ) : (
             <div className="prose prose-invert prose-sm max-w-none 
              prose-code:bg-black/30 prose-code:px-1 prose-code:rounded prose-code:font-mono prose-code:text-yellow-200
              prose-pre:bg-[#0e1621] prose-pre:border prose-pre:border-gray-800 prose-pre:rounded-lg
              ">
               <ReactMarkdown>{message.content}</ReactMarkdown>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

const getRoleColor = (role: AgentRole) => {
  switch (role) {
    case AgentRole.DIRECTOR: return 'text-purple-400';
    case AgentRole.ENGINEER: return 'text-blue-400';
    case AgentRole.COPYWRITER: return 'text-pink-400';
    case AgentRole.CRITIC: return 'text-red-400';
    case AgentRole.GROWTH_LEAD: return 'text-orange-400';
    case AgentRole.CREATOR: return 'text-green-400';
    default: return 'text-gray-400';
  }
};

export default MessageBubble;