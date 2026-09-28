export type Direction = 'up' | 'down' | 'left' | 'right';

export interface BigFiveTraits {
  openness: number;         // 开放性 0-100
  conscientiousness: number;// 尽责性 0-100
  extraversion: number;     // 外向性 0-100
  agreeableness: number;    // 宜人性 0-100
  neuroticism: number;      // 神经质(情绪敏感度) 0-100
}

export interface PhysicalNeeds {
  energy: number;   // 0-100 精力储备 (低时疲惫困倦，需休息闭目)
  hunger: number;   // 0-100 饥饿渴求度 (高时饥饿，需就餐补给)
  health: number;   // 0-100 生理健康状态 (恶劣天气淋雨或长期饥疲受损，静养就医恢复)
}

export interface PsychologicalNeeds {
  mood: number;     // 0-100 情绪愉悦度 (0极度沮丧低落，50中性平和，100极度欣喜心安)
  stress: number;   // 0-100 心理压力负荷 (高时精神紧绷焦躁，急需放松调理)
  fun: number;      // 0-100 趣味娱乐满足度 (低时枯燥乏味，高时神清气爽)
  comfort: number;  // 0-100 身心舒适惬意度 (环境舒适与身心松弛度)
}

export interface SocialNeeds {
  social: number;    // 0-100 社交充实度 (长期独处时衰减，交流倾谈时恢复)
  belonging: number; // 0-100 社区群体归属感 (被认可与融入群体的安全感)
}

export interface CognitiveNeeds {
  curiosity: number;   // 0-100 求知探索渴求/满足度 (驱使观测、研读与探查)
  achievement: number; // 0-100 胜任成就感与进取心 (完成工作、研制发明后显著提升)
}

export interface FullAgentNeeds {
  physical: PhysicalNeeds;
  psychological: PsychologicalNeeds;
  social: SocialNeeds;
  cognitive: CognitiveNeeds;
}

export interface AgentStateValues {
  energy: number;     // 0-100
  mood: number;       // 0-100 (或兼容 -100 到 +100)
  stress: number;     // 0-100
  sociability: number;// 0-100
}

export interface AgentNeeds {
  energy: number;      // 0-100 精力储备 (低时疲惫，需休息)
  hunger: number;      // 0-100 饥饿渴求度 (高时饥饿，需就餐)
  health?: number;     // 0-100 生理健康度
  social: number;      // 0-100 社交渴求度 (高时渴望与邻里倾诉交流)
  fun: number;         // 0-100 娱乐/趣味欲 (高时需游憩、赏星、听琴)
  comfort: number;     // 0-100 舒适度 (低时焦虑不适，需舒适场所与休养)
  curiosity: number;   // 0-100 求知探索欲 (高时需探查古籍、观测星仪)
  safety: number;      // 0-100 安全秩序感 (低时需回归熟悉场所或与信任伙伴同行)
  belonging: number;   // 0-100 社区归属感 (低时感到孤独孤立，需参与公共生活)
  achievement: number; // 0-100 进取成就心 (高时有强烈工作与创造欲望)
  stress: number;      // 0-100 心理压力负荷 (高时精神紧绷，急需减压)
  mood?: number;       // 0-100 心理愉悦度
}

export type GoalType = 
  | 'rest'               // 休息恢复
  | 'eat_drink'          // 进餐补给
  | 'socialize'          // 社交倾谈
  | 'explore_research'   // 好奇探索与研读
  | 'work_achievement'   // 工作与发明创造
  | 'leisure_fun'        // 休闲玩乐与散心
  | 'seek_comfort_care'  // 康养调理与身心安顿
  | 'civic_governance';  // 市政公约与公共巡视

export interface AgentGoal {
  id: string;
  type: GoalType;
  title: string;           // 目标名称，如：“前往观星工坊检修机械星盘”
  description: string;     // 详细目标阐述
  motivation: string;      // 触发动机：“好奇心旺盛且成就欲强烈 (Curiosity: 82%)”
  dominantNeed: keyof AgentNeeds; // 主导需求
  urgency: number;         // 1-10 紧急度
  targetBuildingId?: string;
  targetAgentId?: string;
  targetAgentName?: string;
  createdAt: { simDay: number; simTime: string; timestamp: number };
  status: 'active' | 'completed' | 'abandoned';
}

export type ActionType = 
  | 'travel_to_building'   // 前往建筑地点
  | 'travel_to_agent'      // 前往寻找特定居民
  | 'wander_area'          // 驻足散步
  | 'inspect_equipment'    // 检查设施与工具
  | 'consume_food_drink'   // 享用美食或咖啡茶饮
  | 'rest_sleep'           // 闭目休憩或安睡
  | 'work_task'            // 专注专属职业任务
  | 'converse_with_agent'  // 寻找居民交谈
  | 'enjoy_entertainment'  // 喷泉赏鸽/听诗琴/看星空
  | 'seek_medical_aid'     // 诊所问诊与精油疗愈
  | 'civic_patrol';        // 市政巡视与簿记核验

export type UtilityActionType = 
  | 'sleep'
  | 'eat'
  | 'work'
  | 'socialize'
  | 'explore'
  | 'relax'
  | 'study'
  | 'shop'
  | 'seekHelp'
  | 'attendEvent';

export interface UtilityScoreFactors {
  needScore: number;            // 需求迫切度基础分 (0 - 100)
  personalityModifier: number;  // MBTI / Big Five 特质修正系数 (0.5 - 2.0)
  goalModifier: number;         // 与高层当前目标契合度加权 (0.8 - 1.6)
  relationshipModifier: number; // 社交好感与信任印象修正 (0.8 - 1.5)
  environmentModifier: number;  // 当前地点与天气场域适宜度 (0.7 - 1.4)
  memoryModifier: number;       // 近期反思与情境记忆情感印记 (0.8 - 1.4)
  randomness: number;           // 微量噪声抖动避免机械重复 (0.95 - 1.05)
}

export interface UtilityActionScore {
  action: UtilityActionType;
  label: string;
  icon: string;
  score: number;                // 综合效用评分 (0 - 100)
  rawScore: number;
  factors: UtilityScoreFactors;
  reason: string;               // 可解释性原因阐述
  targetBuildingId?: string;
  targetAgentId?: string;
  targetAgentName?: string;
}

export interface AgentAction {
  id: string;
  type: ActionType;
  description: string;     // 行动描述：“在工坊操作台调试第三号黄铜齿轮”
  targetBuildingId?: string;
  targetAgentId?: string;
  targetAgentName?: string;
  targetCoordinates?: { x: number; y: number };
  durationMinutes: number; // 预计耗费模拟分钟
  elapsedMinutes: number;  // 已进行模拟分钟
  progress: number;        // 0-100%
  status: 'pending' | 'in_progress' | 'completed' | 'interrupted';
  feedbackEffects?: Partial<Record<keyof AgentNeeds, number>>; // 完成后的世界反馈
}

export interface AgentPlan {
  id: string;
  goalId: string;
  goalTitle: string;
  steps: AgentAction[];
  currentStepIndex: number;
  createdAt: { simDay: number; simTime: string; timestamp: number };
  totalSteps: number;
  isCompleted: boolean;
}

export type MemoryType = 'episodic' | 'semantic' | 'relationship' | 'reflection';

export interface AgentMemory {
  id: string;
  type: MemoryType;
  simDay: number;
  simTime: string;
  content: string;
  importance: number; // 1-10
  emotionalIntensity: number; // 1-10 情绪烈度
  recency?: number; // 0-1 检索时的时效性得分
  relevance?: number; // 0-1 检索时的情境相关性得分
  score?: number; // 检索综合评分
  relatedAgentIds: string[]; // 关联的居民ID列表
  relatedAgentNames?: string[]; // 关联的居民姓名列表
  tags: string[]; // 关键词分类标签
  createdAt: {
    simDay: number;
    simTime: string;
    timestamp: number;
  };
  lastAccessedAt?: {
    simDay: number;
    simTime: string;
    timestamp: number;
  };
  associatedAgentId?: string; // 兼容旧字段
  associatedAgentName?: string; // 兼容旧字段
  sentiment: 'positive' | 'neutral' | 'conflict' | 'deep' | 'collaborative';
  evidenceMemoryIds?: string[]; // 引发该反思(Reflection)的具体证据记忆ID
  consolidated?: boolean; // 是否已被整合巩固
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  age: number;
  gender: string;
  spriteColor: string; // Tailwind color key or hex
  mbti: string;
  bigFive: BigFiveTraits;
  bio: string;
  quirks: string[];
  state: AgentStateValues;
  needs: AgentNeeds; // 10项自主需求 (0-100)
  
  // 4 大核心结构化需求与心理系统 (0-100)
  physicalNeeds?: PhysicalNeeds;
  psychologicalNeeds?: PsychologicalNeeds;
  socialNeeds?: SocialNeeds;
  cognitiveNeeds?: CognitiveNeeds;
  activeConditionTags?: string[]; // 动态联动状态指示标签 (如：“睡眠不足”, “严重饥饿”, “雨中漫想”)

  goal?: AgentGoal;  // 当前正在追求的自主目标
  plan?: AgentPlan;  // 目标拆解的多步行动计划
  currentAction?: AgentAction; // 正在执行的具体原子行动
  utilityEvaluations?: UtilityActionScore[]; // 候选 Utility 行为评分列表 (用于解释性透视)
  currentActivity: string;
  currentThought: string;
  currentGoal?: string; // 居民当前追求的核心目标/意向 (文本概述兼容)
  currentBuildingId: string;
  
  // Spatial coordinates on simulation canvas (in grid pixels)
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  direction: Direction;
  isMoving: boolean;
  
  // Social network bonds
  affinity: Record<string, number>; // targetAgentId -> affinity score (-100 to 100)
  memories: AgentMemory[];
  moodHistory: { simTime: string; mood: number; stress: number }[];
  unreflectedMemoryCount?: number; // 距离上次反思积累的未消化记忆计数
}

export interface Building {
  id: string;
  name: string;
  category: 'civic' | 'leisure' | 'culture' | 'health' | 'commerce' | 'residential' | 'nature';
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  roofColor: string;
  accentColor: string;
  icon: string;
  entranceX: number;
  entranceY: number;
  occupants?: string[];
}

export interface DialogueUtterance {
  speakerId: string;
  speakerName: string;
  text: string;
  emotion: string;
}

export interface InteractionRecord {
  id: string;
  timestamp: number;
  simDay: number;
  simTime: string;
  participants: string[];
  participantNames: string[];
  location: string;
  topic: string;
  summary: string;
  sentiment: 'positive' | 'neutral' | 'conflict' | 'deep' | 'collaborative';
  sentimentScore: number; // -1.0 到 +1.0
  messages: DialogueUtterance[];
  relationshipImpact: Record<string, { deltaAffinity: number; note?: string }>;
  tags: string[];
}

export interface TownEvent {
  id: string;
  title: string;
  description: string;
  type: 'festival' | 'emergency' | 'social' | 'weather' | 'policy' | 'user_intervention';
  impactSummary: string;
  targetBuilding?: string;
  timestamp: number;
  simTime: string;
  active: boolean;
}

export interface CoreConflict {
  title: string;
  intensity: number; // 0-100
  agentsInvolved: string[];
  description: string;
}

export interface SocialAlliance {
  name: string;
  members: string[];
  cohesion: number; // 0-100
  theme: string;
}

export interface TownAnalysis {
  id: string;
  title: string;
  summary: string;
  vibeScore: number; // -100 到 +100
  emotionalVibe: string;
  coreConflicts: CoreConflict[];
  alliances: SocialAlliance[];
  recommendations: string[];
  timestamp: number;
}

export interface ActiveInteractionBubble {
  id: string;
  agentAId: string;
  agentBId: string;
  x: number;
  y: number;
  topic: string;
  currentSpeech?: string;
  speakerName?: string;
  sentiment: string;
  progress: number; // 0-100%
}

export interface MemoryRetrievalOptions {
  targetAgentId?: string;
  targetAgentName?: string;
  currentLocation?: string;
  currentActivity?: string;
  topicHint?: string;
  currentSimDay: number;
  currentSimTime: string;
  topK?: number;
  weights?: {
    importance: number;
    relevance: number;
    recency: number;
    emotionalIntensity: number;
  };
}

export interface RetrievedMemoryContext {
  topMemories: AgentMemory[];
  relationshipMemories: AgentMemory[];
  recentReflections: AgentMemory[];
  recentEpisodic: AgentMemory[];
  semanticBeliefs: AgentMemory[];
  formattedPromptContext: string;
}

export interface ReflectionResult {
  reflection: string;
  type: 'reflection' | 'semantic' | 'relationship';
  importance: number;
  emotionalIntensity: number;
  relatedAgentIds: string[];
  tags: string[];
  newGoal?: string;
  affinityAdjustments?: Record<string, number>;
  moodDelta?: number;
  stressDelta?: number;
  evidenceMemoryIds?: string[];
}
