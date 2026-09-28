export type Direction = 'up' | 'down' | 'left' | 'right';

export interface BigFiveTraits {
  openness: number;         // 开放性 0-100
  conscientiousness: number;// 尽责性 0-100
  extraversion: number;     // 外向性 0-100
  agreeableness: number;    // 宜人性 0-100
  neuroticism: number;      // 神经质(情绪敏感度) 0-100
}

export interface AgentStateValues {
  energy: number;     // 0-100
  mood: number;       // -100 到 +100
  stress: number;     // 0-100
  sociability: number;// 0-100
}

export interface AgentMemory {
  id: string;
  simDay: number;
  simTime: string;
  content: string;
  importance: number; // 1-10
  associatedAgentId?: string;
  associatedAgentName?: string;
  sentiment: 'positive' | 'neutral' | 'conflict' | 'deep' | 'collaborative';
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
  currentActivity: string;
  currentThought: string;
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
