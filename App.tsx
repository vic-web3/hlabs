import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AgentRole, Message, TopicId, WorkflowStatus } from './types';
import { TOPICS, TELEGRAM_CONFIG } from './constants';
import Sidebar from './components/Sidebar';
import MessageBubble from './components/MessageBubble';
import { generateAgentResponse } from './services/geminiService';
import { pollTelegramUpdates, sendTelegramMessage, sendTelegramDirectMessage, getBotInfo } from './services/telegramService';
import { Send, Sparkles, AlertCircle, Radio } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [activeTopicId, setActiveTopicId] = useState<TopicId>(TopicId.GENERAL);
  
  // Pre-fill input with the user's requested task for easy demo access
  const [input, setInput] = useState('请以“Build in Public”的视角，写一篇犀利的推特长文，复盘我们这套“HLabs 单人实验室”架构。重点讲清楚我们是如何利用 TG Topics 做空间隔离，以及“无限审计循环”是如何消灭 AI 幻觉的。语气要像 2026 年的 Dan Koe，拒绝正确的废话。');
  
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>('IDLE');
  const [isPolling, setIsPolling] = useState(true);
  const [botName, setBotName] = useState<string>("");
  const [debugLog, setDebugLog] = useState<string>("");
  const [targetUserId, setTargetUserId] = useState<number | string | null>(null);
  
  // Maps TopicId to a list of messages
  const [messages, setMessages] = useState<Record<TopicId, Message[]>>({
    [TopicId.GENERAL]: [{
      id: 'welcome',
      role: AgentRole.DIRECTOR,
      content: "🚀 **欢迎来到 HLabs 智能实验室**\n\n我是 HLabs 的 CEO。这不仅仅是一个聊天窗口，而是一个完整的 **AI 增长引擎**。\n\n**当前架构状态:**\n- 👑 **CEO**: 就绪\n- ✒️ **布道者**: 联网 (Google Search)\n- 🛡️ **安全官**: 严苛模式 (Temp 0)\n- 🚀 **增长黑客**: 去 AI 味模式\n\n请点击发送，让我们开始工作。",
      timestamp: Date.now()
    }],
    [TopicId.DEV_LOG]: [],
    [TopicId.COPY_BOARD]: [], 
    [TopicId.QUALITY_CONTROL]: [],
    [TopicId.GROWTH_REVIEW]: [], 
    [TopicId.FINAL_OUTPUT]: []
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false);

  // --- Helpers ---
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeTopicId]);

  const addMessage = (topicId: TopicId, msg: Message) => {
    setMessages(prev => ({
      ...prev,
      [topicId]: [...prev[topicId], msg]
    }));
  };

  // --- Init & Polling ---

  useEffect(() => {
      // Check Bot Connection
      getBotInfo().then(info => {
          if (info) setBotName(info.username);
      });
  }, []);

  useEffect(() => {
    if (!isPolling) return;

    const intervalId = setInterval(async () => {
      if (isProcessingRef.current) return;

      await pollTelegramUpdates(
          (text, userId) => {
              console.log("Valid Command Received:", text);
              if (!isProcessingRef.current) {
                 // Update the target user ID for DM replies
                 if (userId) setTargetUserId(userId);
                 runWorkflow(text);
              }
          },
          (log) => {
              setDebugLog(log);
          }
      );
    }, 2000); 

    return () => clearInterval(intervalId);
  }, [isPolling]);


  // --- Workflow Engine ---

  const runWorkflow = async (userTask: string) => {
    if (isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setWorkflowStatus('PLANNING');
    
    // 1. User Input in General Topic
    const userMsg: Message = {
      id: uuidv4(),
      role: AgentRole.USER,
      content: userTask,
      timestamp: Date.now()
    };
    addMessage(TopicId.GENERAL, userMsg);
    setActiveTopicId(TopicId.GENERAL);

    // 2. Director Logic (Decision Making)
    const directorId = uuidv4();
    addMessage(TopicId.GENERAL, { id: directorId, role: AgentRole.DIRECTOR, content: '', timestamp: Date.now(), isThinking: true });
    
    const directorPlan = await generateAgentResponse(AgentRole.DIRECTOR, userTask);
    
    // Update Director Msg & Send to TG
    setMessages(prev => ({
      ...prev,
      [TopicId.GENERAL]: prev[TopicId.GENERAL].map(m => m.id === directorId ? { ...m, content: directorPlan, isThinking: false } : m)
    }));
    await sendTelegramMessage(AgentRole.DIRECTOR, directorPlan, TELEGRAM_CONFIG.GENERAL_TOPIC_ID);

    // Parse routing decision
    const isCopyTask = directorPlan.includes('[ROUTE: COPYWRITER]');
    
    // Define Executor
    const executorRole = isCopyTask ? AgentRole.COPYWRITER : AgentRole.ENGINEER;
    const executorTopic = isCopyTask ? TopicId.COPY_BOARD : TopicId.DEV_LOG;
    const executorTopicName = isCopyTask ? '#Narrative' : '#Dev-Log';
    const useSearch = isCopyTask; // Enable search for Copywriter
    
    // Define Auditor
    const auditorRole = isCopyTask ? AgentRole.GROWTH_LEAD : AgentRole.CRITIC;
    const auditorTopic = isCopyTask ? TopicId.GROWTH_REVIEW : TopicId.QUALITY_CONTROL;
    const auditorTopicName = isCopyTask ? '#Growth' : '#Security';

    // Wait a bit
    await new Promise(r => setTimeout(r, 1000));

    // 3. Executor Logic (Engineer OR Copywriter)
    setWorkflowStatus('EXECUTING');
    const handoffMsg = isCopyTask 
        ? `**[任务分类：文案/复盘]** \n\n正在分发任务给 **${executorTopicName}** 的首席布道者 (联网模式) ...`
        : `**[任务分类：工程]** \n\n正在分发任务给 **${executorTopicName}** 的首席架构师...`;

    addMessage(TopicId.GENERAL, {
        id: uuidv4(), role: AgentRole.DIRECTOR, content: handoffMsg, timestamp: Date.now()
    });

    const executorId = uuidv4();
    addMessage(executorTopic, { id: executorId, role: executorRole, content: '', timestamp: Date.now(), isThinking: true });
    setActiveTopicId(executorTopic); 

    // Initial Solution
    // Pass useSearch=true if Copywriter
    let currentSolution = await generateAgentResponse(executorRole, directorPlan, useSearch);

    setMessages(prev => ({
      ...prev,
      [executorTopic]: prev[executorTopic].map(m => m.id === executorId ? { ...m, content: currentSolution, isThinking: false } : m)
    }));
    
    await sendTelegramMessage(executorRole, currentSolution, TELEGRAM_CONFIG.GENERAL_TOPIC_ID);

    await new Promise(r => setTimeout(r, 1500));

    // --- Feedback Loop Start ---
    let retryCount = 0;
    const MAX_RETRIES = 3;
    let isApproved = false;

    while (retryCount < MAX_RETRIES) {
        setWorkflowStatus('AUDITING');
        
        // Notify handoff to Auditor
        const auditRequestMsg = retryCount === 0 
            ? `工作完成。正在请求 **${auditorTopicName}** 的 ${auditorRole} 进行审核...` 
            : `内容已修正 (v${retryCount + 1})。重新提交 **${auditorTopicName}** 审核...`;
            
        addMessage(executorTopic, {
            id: uuidv4(), role: executorRole, content: auditRequestMsg, timestamp: Date.now()
        });

        // Auditor Thinks
        const auditorId = uuidv4();
        addMessage(auditorTopic, { id: auditorId, role: auditorRole, content: '', timestamp: Date.now(), isThinking: true });
        setActiveTopicId(auditorTopic);

        const auditResult = await generateAgentResponse(auditorRole, currentSolution);

        setMessages(prev => ({
            ...prev,
            [auditorTopic]: prev[auditorTopic].map(m => m.id === auditorId ? { ...m, content: auditResult, isThinking: false } : m)
        }));
        await sendTelegramMessage(auditorRole, auditResult, TELEGRAM_CONFIG.GENERAL_TOPIC_ID);

        // Check Pass/Fail
        if (!auditResult.includes('不通过') && !auditResult.includes('❌')) {
            isApproved = true;
            break; // Exit loop on success
        }

        // Handle Failure
        retryCount++;
        if (retryCount >= MAX_RETRIES) break; // Exit loop if max retries reached

        // Construct Feedback Message
        const feedbackMsg = `❌ **审核未通过** (尝试 ${retryCount}/${MAX_RETRIES})\n\n反馈意见：即将返回给${executorRole}进行修复...`;
        addMessage(auditorTopic, {
             id: uuidv4(), role: auditorRole, content: feedbackMsg, timestamp: Date.now()
        });
        await sendTelegramMessage(auditorRole, feedbackMsg, TELEGRAM_CONFIG.GENERAL_TOPIC_ID);
        
        await new Promise(r => setTimeout(r, 1500));

        // Executor Fixing
        setWorkflowStatus('EXECUTING');
        setActiveTopicId(executorTopic);
        
        const fixPrompt = `
            CONTEXT: Your previous output was rejected by the ${auditorRole}.
            
            AUDITOR FEEDBACK:
            ${auditResult}
            
            TASK:
            Rewrite the content/code to address the auditor's feedback. 
            Ensure you fix the specific issues mentioned.
            ${useSearch ? "You may use Google Search again if the feedback points out factual errors or style issues." : ""}
            Return the full corrected version.
        `;

        const fixId = uuidv4();
        addMessage(executorTopic, { id: fixId, role: executorRole, content: '', timestamp: Date.now(), isThinking: true });
        
        // Generate Fix
        currentSolution = await generateAgentResponse(executorRole, fixPrompt, useSearch);

        setMessages(prev => ({
            ...prev,
            [executorTopic]: prev[executorTopic].map(m => m.id === fixId ? { ...m, content: currentSolution, isThinking: false } : m)
        }));
        await sendTelegramMessage(executorRole, currentSolution, TELEGRAM_CONFIG.GENERAL_TOPIC_ID);
        
        await new Promise(r => setTimeout(r, 1000));
    }
    // --- Feedback Loop End ---

    await new Promise(r => setTimeout(r, 1500));

    if (isApproved) {
        setWorkflowStatus('FINALIZING');
        addMessage(auditorTopic, {
            id: uuidv4(),
            role: auditorRole,
            content: `**✅ 审核通过。** 转发至 **#Final-Output** 生成最终交付物。`,
            timestamp: Date.now()
        });
        await sendTelegramMessage(auditorRole, "✅ 审核通过。转发至 #Final-Output。", TELEGRAM_CONFIG.GENERAL_TOPIC_ID);

        const creatorId = uuidv4();
        addMessage(TopicId.FINAL_OUTPUT, { id: creatorId, role: AgentRole.CREATOR, content: '', timestamp: Date.now(), isThinking: true });
        setActiveTopicId(TopicId.FINAL_OUTPUT);

        const finalDocs = await generateAgentResponse(AgentRole.CREATOR, currentSolution); 
        
        setMessages(prev => ({
            ...prev,
            [TopicId.FINAL_OUTPUT]: prev[TopicId.FINAL_OUTPUT].map(m => m.id === creatorId ? { ...m, content: finalDocs, isThinking: false } : m)
        }));
        
        // Send to Group Topic
        await sendTelegramMessage(AgentRole.CREATOR, finalDocs, TELEGRAM_CONFIG.GENERAL_TOPIC_ID);
        
        // --- SEND DIRECT MESSAGE TO USER ---
        const userToMsg = targetUserId || TELEGRAM_CONFIG.DEFAULT_USER_ID;
        if (userToMsg) {
             const dmStatusId = uuidv4();
             addMessage(TopicId.FINAL_OUTPUT, { id: dmStatusId, role: AgentRole.CREATOR, content: "正在尝试私信发送给用户...", timestamp: Date.now() });
             
             const sent = await sendTelegramDirectMessage(finalDocs, userToMsg);
             
             const statusText = sent 
                ? `✅ **交付成功**\n\n内容已通过私信 Bot 发送给用户 (ID: ${userToMsg})。` 
                : `⚠️ **交付失败**\n\n无法发送私信 (ID: ${userToMsg})。请确保用户已在私聊中启动了 Bot。`;

             setMessages(prev => ({
                ...prev,
                [TopicId.FINAL_OUTPUT]: prev[TopicId.FINAL_OUTPUT].map(m => m.id === dmStatusId ? { ...m, content: statusText } : m)
             }));
        }

        setWorkflowStatus('COMPLETED');
    } else {
        setWorkflowStatus('FAILED');
        const failMsg = `❌ **任务失败。** \n\n经过 ${MAX_RETRIES} 次尝试，方案仍未通过审核。请人工介入检查。`;
        
        addMessage(auditorTopic, {
            id: uuidv4(),
            role: auditorRole,
            content: failMsg,
            timestamp: Date.now()
        });
        await sendTelegramMessage(auditorRole, failMsg, TELEGRAM_CONFIG.GENERAL_TOPIC_ID);
    }
    
    isProcessingRef.current = false;
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || workflowStatus !== 'IDLE' && workflowStatus !== 'COMPLETED' && workflowStatus !== 'FAILED') return;
    
    const task = input;
    setInput('');
    // Use configured default ID when sending from UI
    if (!targetUserId && TELEGRAM_CONFIG.DEFAULT_USER_ID) {
        setTargetUserId(TELEGRAM_CONFIG.DEFAULT_USER_ID);
    }
    runWorkflow(task);
  };

  // --- Render ---

  return (
    <div className="flex h-screen w-screen bg-[#17212b] overflow-hidden font-sans">
      <Sidebar 
        topics={TOPICS} 
        activeTopicId={activeTopicId} 
        onSelectTopic={setActiveTopicId}
        workflowStatus={workflowStatus}
        botName={botName}
        debugLog={debugLog}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <div className="h-14 border-b border-gray-800 flex items-center px-6 bg-[#17212b] shrink-0">
          <h2 className="font-bold text-gray-200 flex items-center gap-2">
            <span className="text-gray-500">话题:</span> 
            {TOPICS.find(t => t.id === activeTopicId)?.name}
          </h2>
          <div className="ml-auto flex items-center gap-4">
            <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs border ${isPolling ? 'border-green-800 bg-green-900/20 text-green-400' : 'border-red-800 bg-red-900/20 text-red-400'}`}>
                <Radio size={14} className={isPolling ? "animate-pulse" : ""} />
                {isPolling ? "监听中 (Polling)" : "离线"}
            </div>
            <div className="text-xs text-gray-500">
               Agent: <span className="text-gray-300 font-mono">{TOPICS.find(t => t.id === activeTopicId)?.agentRole}</span>
            </div>
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
          {messages[activeTopicId].length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
               <Sparkles size={48} className="mb-4" />
               <p>话题为空，等待任务数据...</p>
            </div>
          ) : (
            messages[activeTopicId].map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area (Only active in General and when Idle) */}
        <div className="p-4 bg-[#17212b] shrink-0">
          <div className="max-w-4xl mx-auto relative">
            {activeTopicId !== TopicId.GENERAL ? (
               <div className="absolute inset-0 bg-[#0e1621]/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl border border-gray-700">
                  <p className="text-sm text-gray-400 flex items-center gap-2">
                    <AlertCircle size={16} />
                    只能在 #General (总指挥层) 发布新任务。
                  </p>
               </div>
            ) : null}

            {workflowStatus !== 'IDLE' && workflowStatus !== 'COMPLETED' && workflowStatus !== 'FAILED' && activeTopicId === TopicId.GENERAL ? (
               <div className="absolute inset-0 bg-[#0e1621]/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl border border-gray-700">
                  <p className="text-sm text-blue-400 flex items-center gap-2 animate-pulse">
                    <Sparkles size={16} />
                    OpenClaw 协作中...
                  </p>
               </div>
            ) : null}

            <form onSubmit={handleSendMessage} className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="给总指挥下达指令 (或者在 Telegram 对应话题中发送)"
                className="w-full bg-[#182533] text-white pl-4 pr-12 py-4 rounded-xl border border-gray-800 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 placeholder-gray-500 shadow-lg transition-all"
                disabled={activeTopicId !== TopicId.GENERAL}
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </form>
            <div className="text-center mt-2">
                <p className="text-[10px] text-gray-500">
                    OpenClaw Sim • AI 可能会产生不准确的信息。
                </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;