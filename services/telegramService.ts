import { TELEGRAM_CONFIG } from '../constants';
import { AgentRole } from '../types';

const BASE_URL = `https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}`;

// Helper to ensure Chat ID has the -100 prefix for supergroups if not present
const getChatId = () => {
  const id = TELEGRAM_CONFIG.CHAT_ID;
  if (id.startsWith('-100')) return id;
  return `-100${id}`;
};

let lastUpdateId = 0;

export interface BotInfo {
  username: string;
  first_name: string;
}

export const getBotInfo = async (): Promise<BotInfo | null> => {
  try {
    const response = await fetch(`${BASE_URL}/getMe`);
    const data = await response.json();
    if (data.ok) {
      return data.result as BotInfo;
    }
    return null;
  } catch (e) {
    console.error("Failed to get bot info", e);
    return null;
  }
};

export const pollTelegramUpdates = async (
  onMessageReceived: (text: string, userId?: number) => void,
  onDebugLog?: (log: string) => void
) => {
  try {
    const response = await fetch(`${BASE_URL}/getUpdates?offset=${lastUpdateId + 1}&timeout=10`, {
      method: 'GET',
    });
    
    const data = await response.json();
    
    if (data.ok && data.result.length > 0) {
      for (const update of data.result) {
        lastUpdateId = update.update_id;
        
        const msg = update.message;
        if (!msg) continue;
        
        const isFromBot = msg.from?.is_bot;
        const chatId = msg.chat?.id.toString();
        const userId = msg.from?.id;
        const threadId = msg.message_thread_id;
        const targetChatId = getChatId();
        const targetThreadId = TELEGRAM_CONFIG.GENERAL_TOPIC_ID;

        // Debug log for user visibility
        if (onDebugLog) {
           const info = `Rx: [Chat:${chatId}] [Topic:${threadId || 'None'}] ${isFromBot ? '(BOT)' : ''}`;
           onDebugLog(info);
        }

        // Filter logic
        const isTargetChat = chatId === targetChatId;
        // Check topic: strict match if configured, or allow any if configured is null (for flexibility)
        const isTargetTopic = targetThreadId === null 
            ? true // If config is null, accept all topics (or no topic)
            : (threadId === targetThreadId || (!threadId && targetThreadId === 1)); // Handle case where main thread is 1 or null

        if (!isFromBot && isTargetChat && isTargetTopic) {
          if (msg.text) {
             onMessageReceived(msg.text, userId);
          }
        } else {
             if (onDebugLog && !isFromBot) {
                 if (!isTargetChat) onDebugLog(`⚠️ Ignored: Wrong Chat ID (Got ${chatId}, Want ${targetChatId})`);
                 else if (!isTargetTopic) onDebugLog(`⚠️ Ignored: Wrong Topic ID (Got ${threadId}, Want ${targetThreadId})`);
             }
        }
      }
    }
  } catch (error) {
    console.error("Telegram Polling Error:", error);
  }
};

export const sendTelegramMessage = async (role: AgentRole, text: string, topicId?: number) => {
  try {
    const threadId = topicId || TELEGRAM_CONFIG.GENERAL_TOPIC_ID;
    
    // Add an emoji/header based on role
    let header = "";
    switch (role) {
        case AgentRole.DIRECTOR: header = "👑 <b>[总指挥]</b>"; break;
        case AgentRole.ENGINEER: header = "💻 <b>[工程师]</b>"; break;
        case AgentRole.COPYWRITER: header = "✒️ <b>[文案助手]</b>"; break;
        case AgentRole.CRITIC: header = "⚖️ <b>[智库]</b>"; break;
        case AgentRole.GROWTH_LEAD: header = "🚀 <b>[增长负责人]</b>"; break;
        case AgentRole.CREATOR: header = "📝 <b>[创作官]</b>"; break;
        default: header = "🤖 <b>[System]</b>";
    }

    const fullMessage = `${header}\n\n${text}`;

    await fetch(`${BASE_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: getChatId(),
        message_thread_id: threadId,
        text: fullMessage,
        parse_mode: 'HTML'
      })
    });
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
  }
};

export const sendTelegramDirectMessage = async (text: string, userId: number | string) => {
  try {
    const header = "📨 <b>[OpenClaw Delivery]</b>";
    const fullMessage = `${header}\n\n${text}\n\n<i>(这是给您的私聊交付物)</i>`;

    const response = await fetch(`${BASE_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: userId,
        text: fullMessage,
        parse_mode: 'HTML'
      })
    });
    const res = await response.json();
    if (!res.ok) {
        console.error("Direct Message Failed:", res);
        throw new Error(res.description);
    }
    return true;
  } catch (error) {
    console.error("Failed to send Direct Message:", error);
    return false;
  }
};