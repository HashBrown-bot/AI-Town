import React, { useState } from 'react';
import { Agent, Building } from '../types/town';
import { 
  TrendingUp, 
  Brain, 
  Heart, 
  Activity, 
  Battery, 
  Smile, 
  AlertCircle, 
  Compass, 
  BookOpen, 
  Sparkles,
  ArrowRight,
  Flame,
  ShieldCheck
} from 'lucide-react';

interface AgentEvolutionViewProps {
  agents: Agent[];
  buildings: Building[];
  selectedAgentId: string;
  onSelectAgent: (id: string) => void;
}

export const AgentEvolutionView: React.FC<AgentEvolutionViewProps> = ({
  agents,
  buildings,
  selectedAgentId,
  onSelectAgent
}) => {
  const currentAgent = agents.find(a => a.id === selectedAgentId) || agents[0];
  const currentBuilding = buildings.find(b => b.id === currentAgent.currentBuildingId);

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-6 space-y-6 text-slate-100">
      {/* Header & Resident Selector Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>居民个人行为演化与心境轨迹</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
              Individual Trace
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            深入追踪单个居民的情绪波动、记忆积淀与全镇人际信任度演化矩阵
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
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: agent.spriteColor || '#3b82f6' }}
                />
                <span>{agent.name}</span>
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

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{currentAgent.name}</h3>
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
                    className="bg-amber-400 h-full rounded-full"
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
                    className="bg-emerald-400 h-full rounded-full"
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
                    className={`h-full rounded-full ${currentAgent.state.stress > 45 ? 'bg-rose-500' : 'bg-blue-500'}`}
                    style={{ width: `${currentAgent.state.stress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quirks & Bio */}
          <div className="pt-2 border-t border-slate-800 text-xs">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              背景生平与特质
            </span>
            <p className="text-slate-400 mt-1 leading-relaxed">
              {currentAgent.bio}
            </p>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {currentAgent.quirks?.map((q, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px]"
                >
                  #{q}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Mood/Stress Trajectory Curve & Big Five Radar (2 Cols) */}
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
            <div className="h-48 mt-4 relative flex items-end">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150">
                {/* Background grid horizontal lines */}
                <line x1="0" y1="20" x2="500" y2="20" stroke="#1e293b" strokeDasharray="3 3" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="#334155" />
                <line x1="0" y1="130" x2="500" y2="130" stroke="#1e293b" strokeDasharray="3 3" />

                {/* Mood path */}
                {(() => {
                  const history = currentAgent.moodHistory || [];
                  if (history.length < 2) return null;
                  const points = history.map((pt, i) => {
                    const x = (i / (history.length - 1)) * 480 + 10;
                    // Mood is -100 to 100, map to y 140 to 10
                    const y = 75 - (pt.mood / 100) * 55;
                    return `${x},${y}`;
                  }).join(' ');

                  const stressPoints = history.map((pt, i) => {
                    const x = (i / (history.length - 1)) * 480 + 10;
                    // Stress is 0 to 100, map to y 140 to 10
                    const y = 140 - (pt.stress / 100) * 120;
                    return `${x},${y}`;
                  }).join(' ');

                  return (
                    <>
                      {/* Mood Polyline */}
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        points={points}
                      />
                      {/* Stress Polyline */}
                      <polyline
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        points={stressPoints}
                      />

                      {/* Data Point Dots */}
                      {history.map((pt, i) => {
                        const x = (i / (history.length - 1)) * 480 + 10;
                        const yMood = 75 - (pt.mood / 100) * 55;
                        return (
                          <g key={i}>
                            <circle cx={x} cy={yMood} r="4" fill="#10b981" />
                            <text
                              x={x}
                              y="148"
                              fill="#64748b"
                              fontSize="9"
                              textAnchor="middle"
                              fontFamily="monospace"
                            >
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

          {/* Social Affinity Matrix (How this agent feels toward others) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-sm text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <Heart className="w-4 h-4 text-rose-400" />
              <span>{currentAgent.name} 对小镇其他居民的好感与信任矩阵</span>
            </h3>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {agents
                .filter(a => a.id !== currentAgent.id)
                .map(targetAgent => {
                  const score = currentAgent.affinity?.[targetAgent.id] || 0;
                  const isPositive = score >= 0;

                  return (
                    <div
                      key={targetAgent.id}
                      onClick={() => onSelectAgent(targetAgent.id)}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition"
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: targetAgent.spriteColor || '#3b82f6' }}
                          />
                          <span className="font-medium text-slate-200">{targetAgent.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({targetAgent.role})</span>
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
                          className={`h-full rounded-full ${
                            isPositive ? 'bg-gradient-to-r from-blue-500 to-emerald-400' : 'bg-rose-500'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(8, (score + 100) / 2))}%`
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Memory Stream (Episodic Memory Logs) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="font-semibold text-sm text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>情境记忆流（Episodic Memory Stream）</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            已形成 {currentAgent.memories?.length || 0} 条长期认知记忆
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {(!currentAgent.memories || currentAgent.memories.length === 0) ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              暂无记忆沉淀，居民正在开启小镇生活...
            </div>
          ) : (
            currentAgent.memories.map(mem => (
              <div
                key={mem.id}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/80 transition flex items-start justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      第 {mem.simDay} 天 {mem.simTime}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      重要度: <b className="text-blue-400">{mem.importance}/10</b>
                    </span>
                  </div>
                  <p className="text-slate-200 leading-relaxed pt-0.5">
                    {mem.content}
                  </p>
                </div>

                <div className="shrink-0 text-slate-400">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
