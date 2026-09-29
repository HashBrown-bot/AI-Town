import React, { useState, useMemo } from 'react';
import { Agent, Building, AgentMemory, MemoryType, AgentKnowledge } from '../types/town';
import { 
  TrendingUp, 
  Brain, 
  Heart, 
  Zap, 
  Smile, 
  AlertCircle, 
  BookOpen, 
  Sparkles, 
  Target, 
  Search, 
  Flame, 
  Clock, 
  Layers, 
  ShieldCheck, 
  Sliders, 
  Lightbulb, 
  Users, 
  HelpCircle,
  RefreshCw,
  Eye,
  Radio,
  Lock,
  CheckCircle2,
  XCircle,
  Scroll,
  Shield,
  Star,
  Coins
} from 'lucide-react';
import { retrieveAgentMemories, DEFAULT_MEMORY_WEIGHTS, scoreMemory } from '../services/memorySystem';
import { AgentDecisionPipeline } from './AgentDecisionPipeline';
import { RelationshipInspector } from './RelationshipInspector';
import { INFO_TYPE_CONFIG, SOURCE_TYPE_LABELS } from '../systems/InformationSystem';
import { soundEngine } from '../utils/audioSystem';

interface AgentEvolutionViewProps {
  agents: Agent[];
  buildings: Building[];
  selectedAgentId: string;
  onSelectAgent: (id: string) => void;
  simDay?: number;
  simTime?: string;
  weather?: string;
  onTriggerReflection?: (agentId: string) => Promise<void>;
  isReflecting?: boolean;
  knowledgeItems?: AgentKnowledge[];
}

export const AgentEvolutionView: React.FC<AgentEvolutionViewProps> = ({
  agents,
  buildings,
  selectedAgentId,
  onSelectAgent,
  simDay = 1,
  simTime = '09:00',
  weather,
  onTriggerReflection,
  isReflecting = false,
  knowledgeItems = []
}) => {
  const currentAgent = agents.find(a => a.id === selectedAgentId) || agents[0];
  const currentBuilding = buildings.find(b => b.id === currentAgent.currentBuildingId);

  // Resident Known Information Filter
  const agentKnownItems = useMemo(() => {
    return (knowledgeItems || []).filter(k => 
      k.propagationChain.some(node => node.agentId === currentAgent.id)
    );
  }, [knowledgeItems, currentAgent.id]);

  // Active Memory Filter Tab
  const [memoryFilter, setMemoryFilter] = useState<'all' | MemoryType>('all');
  const [memorySearch, setMemorySearch] = useState<string>('');

  // Memory Retrieval Simulator States
  const [simulatorTargetAgentId, setSimulatorTargetAgentId] = useState<string>(
    agents.find(a => a.id !== currentAgent.id)?.id || ''
  );
  const [showPromptInspector, setShowPromptInspector] = useState<boolean>(false);

  const targetAgent = agents.find(a => a.id === simulatorTargetAgentId);

  // Filtered Memories for Display
  const filteredMemories = useMemo(() => {
    const memories = currentAgent.memories || [];
    return memories.filter(m => {
      const type = m.type || (m.associatedAgentId ? 'relationship' : 'episodic');
      if (memoryFilter !== 'all' && type !== memoryFilter) return false;

      if (memorySearch.trim()) {
        const query = memorySearch.toLowerCase();
        const contentMatch = m.content.toLowerCase().includes(query);
        const tagMatch = m.tags?.some(t => t.toLowerCase().includes(query));
        const agentMatch = m.relatedAgentNames?.some(n => n.toLowerCase().includes(query));
        return contentMatch || tagMatch || agentMatch;
      }
      return true;
    });
  }, [currentAgent.memories, memoryFilter, memorySearch]);

  // Memory Counts by Category
  const memoryCounts = useMemo(() => {
    const counts = { all: 0, episodic: 0, semantic: 0, relationship: 0, reflection: 0 };
    (currentAgent.memories || []).forEach(m => {
      counts.all++;
      const t = m.type || (m.associatedAgentId ? 'relationship' : 'episodic');
      if (t in counts) counts[t as MemoryType]++;
    });
    return counts;
  }, [currentAgent.memories]);

  // Real-time Memory Retrieval Simulator output
  const simulatedRetrieval = useMemo(() => {
    return retrieveAgentMemories(currentAgent, {
      targetAgentId: targetAgent?.id,
      targetAgentName: targetAgent?.name,
      currentLocation: currentBuilding?.name,
      currentActivity: currentAgent.currentActivity,
      currentSimDay: simDay,
      currentSimTime: simTime,
      topK: 5
    });
  }, [currentAgent, targetAgent, currentBuilding, simDay, simTime]);

  const handleManualReflect = async () => {
    if (onTriggerReflection && !isReflecting) {
      soundEngine.playChime();
      await onTriggerReflection(currentAgent.id);
    }
  };

  // Vitals for RPG Sheet
  const energy = currentAgent.physicalNeeds?.energy ?? currentAgent.needs?.energy ?? currentAgent.state?.energy ?? 80;
  const hunger = currentAgent.physicalNeeds?.hunger ?? currentAgent.needs?.hunger ?? 25;
  const mood = currentAgent.psychologicalNeeds?.mood ?? currentAgent.needs?.mood ?? (currentAgent.state?.mood < 0 ? (currentAgent.state.mood + 100) / 2 : currentAgent.state.mood) ?? 75;
  const stress = currentAgent.psychologicalNeeds?.stress ?? currentAgent.needs?.stress ?? currentAgent.state?.stress ?? 18;
  const social = currentAgent.socialNeeds?.social ?? currentAgent.needs?.social ?? 60;
  const curiosity = currentAgent.cognitiveNeeds?.curiosity ?? currentAgent.needs?.curiosity ?? 65;
  const safety = currentAgent.needs?.safety ?? 85;
  const achievement = currentAgent.cognitiveNeeds?.achievement ?? currentAgent.needs?.achievement ?? 60;

  const vitals = [
    { label: '心情', val: mood, icon: <Heart className="w-3.5 h-3.5 text-[#f28cb1]" />, bar: 'from-[#f28cb1] to-[#ff9ec4]' },
    { label: '精力', val: energy, icon: <Zap className="w-3.5 h-3.5 text-[#ffc97a]" />, bar: 'from-[#ffb86b] to-[#ffc97a]' },
    { label: '饱腹', val: 100 - hunger, icon: <span className="text-xs">🍞</span>, bar: 'from-[#f7a76c] to-[#ffb86b]' },
    { label: '社交', val: social, icon: <Users className="w-3.5 h-3.5 text-[#73c7e8]" />, bar: 'from-[#73c7e8] to-[#65d6c4]' },
    { label: '好奇', val: curiosity, icon: <Brain className="w-3.5 h-3.5 text-[#b9a6ff]" />, bar: 'from-[#9d8cff] to-[#b9a6ff]' },
    { label: '安全', val: safety, icon: <Shield className="w-3.5 h-3.5 text-[#71c68b]" />, bar: 'from-[#71c68b] to-[#91d69d]' },
    { label: '成就', val: achievement, icon: <Star className="w-3.5 h-3.5 text-[#ffc97a]" />, bar: 'from-[#ffc97a] to-[#fff1d6]' }
  ];

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 text-[#f8f2e7] max-w-7xl mx-auto">
      {/* Header & Resident Selector Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#344672]/30">
        <div>
          <h2 className="text-xl font-bold text-[#f8f2e7] tracking-tight flex items-center gap-2">
            <span>居民人物档案与心智演化卷</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#ffb86b]/15 text-[#ffc97a] border border-[#ffb86b]/30 font-mono">
              RPG Character Profile
            </span>
          </h2>
          <p className="text-xs text-[#c9c5d1] mt-1">
            见证居民的情感羁绊、多维生理心智维生、历史物语与反思顿悟演变
          </p>
        </div>

        {/* Resident Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {agents.map(agent => {
            const isSelected = agent.id === currentAgent.id;
            return (
              <button
                key={agent.id}
                onClick={() => {
                  soundEngine.playClick();
                  onSelectAgent(agent.id);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#2c3a5e] to-[#253252] text-[#fff1d6] border border-[#ffc97a]/45 shadow-[0_4px_12px_rgba(255,201,122,0.15)] scale-[1.02]'
                    : 'game-panel text-[#8f93a8] hover:text-[#f8f2e7] hover:bg-[#202b46]'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shadow-xs"
                  style={{ backgroundColor: agent.spriteColor || '#ffb86b' }}
                />
                <span>{agent.name}</span>
                <span className="text-[10px] text-[#ffc97a] opacity-80 font-mono">({agent.memories?.length || 0})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Agent Dossier Top Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card (1 Col) */}
        <div className="game-panel-highlight p-5 space-y-4">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg border-2 border-[#ffc97a]/40 shrink-0"
              style={{ backgroundColor: currentAgent.spriteColor || '#ffb86b' }}
            >
              {currentAgent.name.slice(0, 1)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#f8f2e7] truncate">{currentAgent.name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-[#9d8cff]/20 text-[#b9a6ff] border border-[#9d8cff]/30 text-[11px] font-mono font-bold">
                  {currentAgent.mbti}
                </span>
              </div>
              <p className="text-xs text-[#ffc97a] font-medium mt-0.5">{currentAgent.role}</p>
              <p className="text-[11px] text-[#c9c5d1] mt-0.5 font-mono">
                {currentAgent.age} 岁 · {currentAgent.gender} · 财富: {currentAgent.money ?? 150} 金币
              </p>
            </div>
          </div>

          {/* Current Quest Goal */}
          <div className="p-3 rounded-2xl bg-[#17223b]/70 border border-[#ffc97a]/30 text-xs space-y-1 shadow-xs">
            <div className="flex items-center justify-between text-[#ffc97a] font-bold text-[10px] uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                <span>当前核心主线行动 (Quest Goal)</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#ffb86b]/20 text-[#fff1d6] text-[9px] font-mono">
                反思驱动
              </span>
            </div>
            <p className="text-[#f8f2e7] font-medium leading-relaxed pt-0.5">
              {currentAgent.goal?.title || currentAgent.currentGoal || '在小镇维持日常生活并寻找社交伙伴'}
            </p>
          </div>

          {/* Activity & Thought */}
          <div className="p-3 rounded-2xl bg-[#17223b]/50 border border-[#344672]/30 space-y-2 text-xs">
            <div>
              <span className="text-[10px] text-[#8f93a8] uppercase tracking-wider font-semibold">
                当前驻足地点
              </span>
              <div className="text-[#fff1d6] font-medium mt-0.5 flex items-center gap-1.5">
                <span>{currentBuilding?.icon || '🏡'}</span>
                <span>{currentBuilding?.name || '小镇漫步中'}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-[#8f93a8] uppercase tracking-wider font-semibold">
                此刻心声
              </span>
              <p className="text-[#c9c5d1] italic mt-0.5 leading-relaxed">
                "{currentAgent.currentThought}"
              </p>
            </div>
          </div>

          {/* 7 RPG Vitals Meters */}
          <div className="space-y-2.5 pt-1">
            <div className="text-xs font-bold text-[#ffc97a] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#ffc97a]" />
              <span>RPG 维生状态条 (Vitals)</span>
            </div>

            <div className="space-y-2 text-xs">
              {vitals.map(v => (
                <div key={v.label}>
                  <div className="flex justify-between text-[#c9c5d1] mb-1 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      {v.icon}
                      <span>{v.label}</span>
                    </span>
                    <span className="font-mono font-bold text-[#f8f2e7]">{Math.round(v.val)}%</span>
                  </div>
                  <div className="w-full bg-[#17223b] rounded-full h-1.5 overflow-hidden border border-[#344672]/20">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${v.bar} transition-all duration-300`}
                      style={{ width: `${Math.max(4, Math.min(100, v.val))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trigger Reflection Action Button */}
          <div className="pt-2 border-t border-[#344672]/30">
            <button
              onClick={handleManualReflect}
              disabled={isReflecting}
              className="game-btn-special w-full py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Lightbulb className={`w-4 h-4 text-[#ffc97a] ${isReflecting ? 'animate-spin' : ''}`} />
              <span>{isReflecting ? 'Gemini 正在进行深度顿悟...' : `让 ${currentAgent.name} 触发心智顿悟 (Reflection)`}</span>
            </button>
            <p className="text-[10px] text-[#8f93a8] text-center mt-1.5">
              提炼近期生活记忆，沉淀长期认知并重塑行动目标与人际信任
            </p>
          </div>
        </div>

        {/* Mood Trajectory Curve & Social Matrix (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mood Trend Timeline Chart */}
          <div className="game-panel p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#344672]/30">
              <h3 className="font-bold text-sm text-[#f8f2e7] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#71c68b]" />
                <span>情绪与压力时序轨迹 (Mood & Stress Timeline)</span>
              </h3>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-[#71c68b]">
                  <span className="w-2.5 h-1 bg-[#71c68b] rounded" /> 心情指数
                </span>
                <span className="flex items-center gap-1.5 text-[#f43f5e]">
                  <span className="w-2.5 h-1 bg-[#f43f5e] rounded" /> 压力负荷
                </span>
              </div>
            </div>

            {/* SVG Visual Chart */}
            <div className="h-44 mt-4 relative flex items-end">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 140">
                <line x1="0" y1="20" x2="500" y2="20" stroke="#253556" strokeDasharray="3 3" />
                <line x1="0" y1="70" x2="500" y2="70" stroke="#374b75" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="#253556" strokeDasharray="3 3" />

                {(() => {
                  const history = currentAgent.moodHistory || [];
                  if (history.length < 2) return null;
                  const points = history.map((pt, i) => {
                    const x = (i / (history.length - 1)) * 480 + 10;
                    const y = 70 - (pt.mood / 100) * 50;
                    return `${x},${y}`;
                  }).join(' ');

                  const stressPoints = history.map((pt, i) => {
                    const x = (i / (history.length - 1)) * 480 + 10;
                    const y = 130 - (pt.stress / 100) * 110;
                    return `${x},${y}`;
                  }).join(' ');

                  return (
                    <>
                      <polyline fill="none" stroke="#71c68b" strokeWidth="2.5" points={points} />
                      <polyline fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 4" points={stressPoints} />
                      {history.map((pt, i) => {
                        const x = (i / (history.length - 1)) * 480 + 10;
                        const yMood = 70 - (pt.mood / 100) * 50;
                        return (
                          <g key={i}>
                            <circle cx={x} cy={yMood} r="3.5" fill="#71c68b" />
                            <text x={x} y="138" fill="#8f93a8" fontSize="9" textAnchor="middle" fontFamily="monospace">
                              {pt.simTime}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* Relationship 2.0 Multi-Dimensional Bonds & Inspector */}
          <div className="game-panel p-5">
            <RelationshipInspector
              currentAgent={currentAgent}
              allAgents={agents}
              onSelectTargetAgent={onSelectAgent}
            />
          </div>
        </div>
      </div>

      {/* Autonomous Decision System Pipeline */}
      <div className="game-panel p-5">
        <AgentDecisionPipeline
          agent={currentAgent}
          buildings={buildings}
          otherAgents={agents}
          weather={weather}
        />
      </div>

      {/* RPG Memory Grimoire & Adventure Cards */}
      <div className="game-panel p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#344672]/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#ffb86b]/15 border border-[#ffb86b]/30 flex items-center justify-center text-[#ffc97a]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#f8f2e7] flex items-center gap-2">
                <span>小镇心路纪事簿 (Memory Grimoire)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ffb86b]/15 text-[#ffc97a] border border-[#ffb86b]/30 font-mono">
                  {filteredMemories.length} 篇物语
                </span>
              </h3>
              <p className="text-xs text-[#c9c5d1]">
                情境见闻、社交印象与心智顿悟记录
              </p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#8f93a8]" />
              <input
                type="text"
                value={memorySearch}
                onChange={e => setMemorySearch(e.target.value)}
                placeholder="检索记忆关键词..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-[#17223b] border border-[#344672]/40 text-xs text-[#f8f2e7] placeholder-[#8f93a8] focus:outline-none focus:border-[#ffc97a]/50"
              />
            </div>
          </div>
        </div>

        {/* Filter Categories */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { key: 'all', label: `全部 (${memoryCounts.all})` },
            { key: 'reflection', label: `🌟 心智顿悟 (${memoryCounts.reflection})` },
            { key: 'relationship', label: `💬 羁绊对话 (${memoryCounts.relationship})` },
            { key: 'episodic', label: `📜 情境见闻 (${memoryCounts.episodic})` },
            { key: 'semantic', label: `🧠 认知常识 (${memoryCounts.semantic})` }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                soundEngine.playClick();
                setMemoryFilter(tab.key as any);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                memoryFilter === tab.key
                  ? 'bg-gradient-to-r from-[#ffb86b] to-[#f7a76c] text-[#17223b] shadow-xs'
                  : 'bg-[#202b46]/70 text-[#c9c5d1] hover:text-[#fff1d6] hover:bg-[#273552]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Memory Adventure Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
          {filteredMemories.map((mem, idx) => {
            const isReflection = mem.type === 'reflection';
            const isRel = mem.type === 'relationship' || mem.associatedAgentId;

            return (
              <div
                key={mem.id || idx}
                className={`p-4 rounded-2xl border transition flex flex-col justify-between text-xs ${
                  isReflection
                    ? 'bg-gradient-to-br from-[#2a244d] to-[#1e1c38] border-[#9d8cff]/40 shadow-sm'
                    : isRel
                    ? 'bg-gradient-to-br from-[#202b46] to-[#1c2742] border-[#73c7e8]/30'
                    : 'bg-[#202b46]/60 border-[#344672]/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-[#ffb86b]/15 text-[#ffc97a] border border-[#ffb86b]/20">
                      {isReflection ? '🌟 顿悟' : isRel ? '💬 羁绊' : '📜 见闻'} #{idx + 1}
                    </span>
                    <span className="font-mono text-[10px] text-[#8f93a8]">
                      第 {mem.simDay || 1} 天 · {mem.simTime || '09:00'}
                    </span>
                  </div>

                  <p className="text-[#f8f2e7] leading-relaxed text-xs">
                    "{mem.content}"
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-[#344672]/20 flex items-center justify-between text-[10px] text-[#c9c5d1]">
                  <span>重要度: <strong className="text-[#ffc97a] font-mono">{mem.importance}/10</strong></span>
                  {mem.tags && mem.tags.length > 0 && (
                    <span className="text-[#8f93a8] truncate max-w-[120px]">
                      #{mem.tags[0]}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
