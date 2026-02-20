
export enum AgentRole {
  USER = '用户',
  DIRECTOR = '总指挥',     // #General
  ENGINEER = '工程师',     // #Dev-Log
  COPYWRITER = '文案助手', // #Copy-Board
  CRITIC = '智库',        // #Quality-Control
  GROWTH_LEAD = '增长负责人', // #Growth-Review (New)
  CREATOR = '创作官'       // #Final-Output
}

export enum TopicId {
  GENERAL = 'general',
  DEV_LOG = 'dev-log',
  COPY_BOARD = 'copy-board',
  QUALITY_CONTROL = 'quality-control',
  GROWTH_REVIEW = 'growth-review',
  FINAL_OUTPUT = 'final-output'
}

export interface Message {
  id: string;
  role: AgentRole;
  content: string;
  timestamp: number;
  isThinking?: boolean;
}

export interface Topic {
  id: TopicId;
  name: string;
  icon: string;
  color: string;
  description: string;
  agentRole: AgentRole;
}

export type WorkflowStatus = 'IDLE' | 'PLANNING' | 'EXECUTING' | 'AUDITING' | 'FINALIZING' | 'COMPLETED' | 'FAILED';

export interface WorkflowState {
  status: WorkflowStatus;
  currentTask: string | null;
  logs: string[];
}
