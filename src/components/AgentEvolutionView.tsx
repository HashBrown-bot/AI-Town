import React, { useState, useMemo } from 'react';
import { Agent, Building, AgentMemory, MemoryType } from '../types/town';
import { 
  TrendingUp, 
  Brain, 
  Heart, 
  Battery, 
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
  Eye
} from 'lucide-react';
import { retrieveAgentMemories, DEFAULT_MEMORY_WEIGHTS, scoreMemory } from '../services/memorySystem';
import { AgentDecisionPipeline } from './AgentDecisionPipeline';
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
  isReflecting = false
}) => {
  const currentAgent = agents.find(a => a.id === selectedAgentId) || agents[0];
  const currentBuilding = buildings.find(b => b.id === currentAgent.currentBuildingId);

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
      // Type match
      const type = m.type || (m.associatedAgentId ? 'relationship' : 'episodic');
      if (memoryFilter !== 'all' && type !== memoryFilter) return false;

      // Keyword search
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

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-6 space-y-6 text-slate-100">
      {/* Header & Resident Selector Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>居民行为演化与长期记忆系统</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
              Memory Retrieval + Reflection v2
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            情境记忆(Episodic)、长期认知(Semantic)、反思领悟(Reflection)与居民印象检索架构
          </p>
        </div>

        {/* Resident Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {agents.map(agent => {
            const isSelected = agent.id === currentAgent.id;
            return (
              <button
                key={agent.id}
                onClick={() => onSelectAgent(agent.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30 ring-1 ring-blue-400/30'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: agent.spriteColor || '#3b82f6' }}
                />
                <span>{agent.name}</span>
                <span className="text-[10px] opacity-75 font-mono">({agent.memories?.length || 0})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Agent Dossier Top Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card (1 Col) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg border border-white/20 shrink-0"
              style={{ backgroundColor: currentAgent.spriteColor || '#3b82f6' }}
            >
              {currentAgent.name.slice(0, 1)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white truncate">{currentAgent.name}</h3>
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-mono font-medium">
                  {currentAgent.mbti}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{currentAgent.role}</p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {currentAgent.age} 岁 · {currentAgent.gender}
              </p>
            </div>
          </div>

          {/* Current Goal (Reflection Influenced) */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-800/40 text-xs space-y-1">
            <div className="flex items-center justify-between text-blue-400 font-semibold text-[10px] uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-blue-400" />
                <span>当前核心行动目标 (Goal)</span>
              </span>
              <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-[9px] font-mono">
                由反思驱动
              </span>
            </div>
            <p className="text-slate-200 font-medium leading-relaxed pt-0.5">
              {currentAgent.currentGoal || '在小镇维持日常生活并寻找社交伙伴'}
            </p>
          </div>

          {/* Current Activity & Thought Callout */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                当前活动场所
              </span>
              <div className="text-slate-200 font-medium mt-0.5 flex items-center gap-1.5">
                <span>{currentBuilding?.icon || '📍'}</span>
                <span>{currentBuilding?.name || '小镇漫步中'}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                心声与此刻思绪
              </span>
              <p className="text-slate-300 italic mt-0.5">
                "{currentAgent.currentThought}"
              </p>
            </div>
          </div>

          {/* Live State Meters */}
          <div className="space-y-2.5 pt-1">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              即时生理与心理状态
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Battery className="w-3.5 h-3.5 text-amber-400" />
                    <span>精力 (Energy)</span>
                  </span>
                  <span className="font-mono">{currentAgent.state.energy}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${currentAgent.state.energy}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Smile className="w-3.5 h-3.5 text-emerald-400" />
                    <span>心情愉悦度 (Mood)</span>
                  </span>
                  <span className="font-mono">
                    {currentAgent.state.mood > 0 ? `+${currentAgent.state.mood}` : currentAgent.state.mood}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(5, (currentAgent.state.mood + 100) / 2)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>压力负荷 (Stress)</span>
                  </span>
                  <span className="font-mono">{currentAgent.state.stress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      currentAgent.state.stress > 45 ? 'bg-rose-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${currentAgent.state.stress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Trigger Reflection Action Button */}
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={handleManualReflect}
              disabled={isReflecting}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-medium text-xs shadow-md shadow-indigo-900/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Lightbulb className={`w-4 h-4 text-amber-300 ${isReflecting ? 'animate-spin' : ''}`} />
              <span>{isReflecting ? 'Gemini 正在进行反思与顿悟...' : `让 ${currentAgent.name} 触发深度反思 (Reflection)`}</span>
            </button>
            <p className="text-[10px] text-slate-500 text-center mt-1.5">
              基于近期事件记忆提炼长期认知，将重塑行动目标与人际信任
            </p>
          </div>
        </div>

        {/* Mood Trajectory Curve & Social Matrix (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mood Trend Timeline Chart */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>情绪与压力时间序列演变趋势图</span>
              </h3>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-0.5 bg-emerald-400 rounded" /> 心情指数
                </span>
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-2.5 h-0.5 bg-rose-400 rounded" /> 压力负荷
                </span>
              </div>
            </div>

            {/* SVG Visual Chart */}
            <div className="h-44 mt-4 relative flex items-end">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 140">
                <line x1="0" y1="20" x2="500" y2="20" stroke="#1e293b" strokeDasharray="3 3" />
                <line x1="0" y1="70" x2="500" y2="70" stroke="#334155" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="#1e293b" strokeDasharray="3 3" />

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
                      <polyline fill="none" stroke="#10b981" strokeWidth="2.5" points={points} />
                      <polyline fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 4" points={stressPoints} />
                      {history.map((pt, i) => {
                        const x = (i / (history.length - 1)) * 480 + 10;
                        const yMood = 70 - (pt.mood / 100) * 50;
                        return (
                          <g key={i}>
                            <circle cx={x} cy={yMood} r="3.5" fill="#10b981" />
                            <text x={x} y="138" fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="monospace">
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

          {/* Social Affinity Matrix */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-sm text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <Heart className="w-4 h-4 text-rose-400" />
              <span>{currentAgent.name} 对全镇居民的好感与信任印象</span>
            </h3>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {agents
                .filter(a => a.id !== currentAgent.id)
                .map(targetA => {
                  const score = currentAgent.affinity?.[targetA.id] || 0;
                  const isPositive = score >= 0;
                  // Look up relationship memory
                  const relMem = currentAgent.memories?.find(
                    m => m.type === 'relationship' && m.relatedAgentIds?.includes(targetA.id)
                  );

                  return (
                    <div
                      key={targetA.id}
                      onClick={() => onSelectAgent(targetA.id)}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: targetA.spriteColor || '#3b82f6' }}
                          />
                          <span className="font-medium text-slate-200">{targetA.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({targetA.role})</span>
                        </div>

                        <span
                          className={`font-mono font-semibold ${
                            isPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isPositive ? `+${score}` : score}
                        </span>
                      </div>

                      {/* Bar Visualization */}
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isPositive ? 'bg-gradient-to-r from-blue-500 to-emerald-400' : 'bg-rose-500'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(8, (score + 100) / 2))}%`
                          }}
                        />
                      </div>

                      {relMem && (
                        <p className="text-[11px] text-slate-400 italic line-clamp-1">
                          "{relMem.content}"
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Autonomous Decision System Pipeline (Needs -> Goal -> Plan -> Action) */}
      <AgentDecisionPipeline
        agent={currentAgent}
        buildings={buildings}
        otherAgents={agents}
        weather={weather}
      />

      {/* Memory Retrieval Simulator & Inspector Panel */}
      <div className="bg-slate-900/90 border border-indigo-900/40 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>记忆检索模拟器 (Memory Retrieval Simulator)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  Top-K Scorer
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                实时模拟当 {currentAgent.name} 与选定居民交谈或做决定时，系统检索出的 Top-K 记忆与 Gemini Prompt 上下文
              </p>
            </div>
          </div>

          {/* Target Resident Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 whitespace-nowrap">对话交互对象:</span>
            <select
              value={simulatorTargetAgentId}
              onChange={e => setSimulatorTargetAgentId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {agents
                .filter(a => a.id !== currentAgent.id)
                .map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.role})
                  </option>
                ))}
            </select>

            <button
              onClick={() => setShowPromptInspector(!showPromptInspector)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span>{showPromptInspector ? '隐藏 Prompt 注入' : '查看 Prompt 注入'}</span>
            </button>
          </div>
        </div>

        {/* Formula breakdown indicator banner */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>评分公式:</span>
            <span className="text-slate-300">
              Score = 重要度 × {DEFAULT_MEMORY_WEIGHTS.importance} + 相关度 × {DEFAULT_MEMORY_WEIGHTS.relevance} + 时效衰减 × {DEFAULT_MEMORY_WEIGHTS.recency} + 情绪烈度 × {DEFAULT_MEMORY_WEIGHTS.emotionalIntensity}
            </span>
          </div>
          <span className="text-indigo-400">已检索出 {simulatedRetrieval.topMemories.length} 条高权重记忆</span>
        </div>

        {/* Prompt Context View Collapsible */}
        {showPromptInspector && (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-indigo-900/50 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-indigo-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Gemini API 注入上下文 (Formatted Retrieval Context)</span>
              </span>
              <span className="text-[10px] text-slate-500">将注入对话生成模型</span>
            </div>
            <pre className="p-3 rounded-lg bg-slate-900 text-slate-300 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {simulatedRetrieval.formattedPromptContext}
            </pre>
          </div>
        )}

        {/* Retrieved Top-K Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {simulatedRetrieval.topMemories.map((m, idx) => {
            const memoryScore = m.score || 0;
            const memoryRelevance = m.relevance || 0;
            const memoryRecency = m.recency || 0;

            return (
              <div
                key={m.id}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-indigo-950/60 hover:border-indigo-800/60 transition space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px]">
                      #{idx + 1}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400">
                      {m.type === 'reflection' ? '💡 反思' : m.type === 'semantic' ? '🏛️ 认知' : m.type === 'relationship' ? '🤝 印象' : '⚡ 事件'}
                    </span>
                  </span>

                  <span className="font-mono font-bold text-indigo-400">
                    综合分: {memoryScore.toFixed(3)}
                  </span>
                </div>

                <p className="text-slate-200 font-medium leading-relaxed line-clamp-3">
                  {m.content}
                </p>

                {/* Score component badges */}
                <div className="pt-1.5 border-t border-slate-900 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>重要度: <b className="text-blue-400">{m.importance}/10</b></span>
                  <span>相关度: <b className="text-amber-400">{(memoryRelevance * 100).toFixed(0)}%</b></span>
                  <span>时效: <b className="text-emerald-400">{(memoryRecency * 100).toFixed(0)}%</b></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Complete Long-Term Memory System (Categorized Tabs) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-semibold text-sm text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>全量长期记忆库与认知沉淀 (Long-Term Memory Vault)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              已沉淀 {currentAgent.memories?.length || 0} 条记忆，按类型划分、衰减保护与定期整合
            </p>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="搜索记忆内容或标签..."
              value={memorySearch}
              onChange={e => setMemorySearch(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48 sm:w-60"
            />
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setMemoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
              memoryFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>全部记忆</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
              {memoryCounts.all}
            </span>
          </button>

          <button
            onClick={() => setMemoryFilter('episodic')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
              memoryFilter === 'episodic'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>近期事件 (Episodic)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
              {memoryCounts.episodic}
            </span>
          </button>

          <button
            onClick={() => setMemoryFilter('semantic')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
              memoryFilter === 'semantic'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-emerald-400" />
            <span>长期认知 (Semantic)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
              {memoryCounts.semantic}
            </span>
          </button>

          <button
            onClick={() => setMemoryFilter('reflection')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
              memoryFilter === 'reflection'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-indigo-400" />
            <span>反思悟道 (Reflection)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
              {memoryCounts.reflection}
            </span>
          </button>

          <button
            onClick={() => setMemoryFilter('relationship')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
              memoryFilter === 'relationship'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-rose-400" />
            <span>居民核心印象 (Relationship)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
              {memoryCounts.relationship}
            </span>
          </button>
        </div>

        {/* Memories Cards List */}
        <div className="space-y-3 pt-1">
          {filteredMemories.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs rounded-xl bg-slate-950 border border-slate-900">
              暂未检索到符合条件的记忆记录
            </div>
          ) : (
            filteredMemories.map(mem => {
              const memType = mem.type || (mem.associatedAgentId ? 'relationship' : 'episodic');

              // Badge configs for memory types
              const typeConfig = {
                episodic: {
                  label: '情境事件',
                  badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                  icon: <Flame className="w-3 h-3 text-amber-400" />
                },
                semantic: {
                  label: '长期认知',
                  badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  icon: <Brain className="w-3 h-3 text-emerald-400" />
                },
                reflection: {
                  label: '深层反思',
                  badgeBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                  icon: <Lightbulb className="w-3 h-3 text-indigo-400" />
                },
                relationship: {
                  label: '居民印象',
                  badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                  icon: <Users className="w-3 h-3 text-rose-400" />
                }
              }[memType];

              return (
                <div
                  key={mem.id}
                  className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition space-y-2 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono font-medium ${typeConfig.badgeBg}`}>
                        {typeConfig.icon}
                        <span>{typeConfig.label}</span>
                      </span>

                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">
                        第 {mem.simDay} 天 {mem.simTime}
                      </span>

                      <span className="text-slate-400 font-mono text-[11px]">
                        重要度: <b className="text-blue-400">{mem.importance}/10</b>
                      </span>

                      <span className="text-slate-400 font-mono text-[11px]">
                        情绪烈度: <b className="text-purple-400">{mem.emotionalIntensity || 5}/10</b>
                      </span>
                    </div>

                    {/* Related Agents Badges */}
                    {mem.relatedAgentNames && mem.relatedAgentNames.length > 0 && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                        <span>关联居民:</span>
                        {mem.relatedAgentNames.map((name, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-blue-950/40 text-blue-300 border border-blue-800/30">
                            @{name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Memory Content */}
                  <p className="text-slate-200 leading-relaxed font-medium">
                    {mem.content}
                  </p>

                  {/* Tags & Access Meta */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-900/60 text-[10px] text-slate-500">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {mem.tags?.map((tag, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {mem.lastAccessedAt && (
                      <div className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>最近检索于: 第{mem.lastAccessedAt.simDay}天 {mem.lastAccessedAt.simTime}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
