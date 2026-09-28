import React, { useState } from 'react';
import { Agent, Building } from '../types/town';
import { 
  X, 
  MessageSquare, 
  TrendingUp, 
  Target, 
  Footprints, 
  ChevronDown, 
  ChevronUp, 
  Activity, 
  Heart, 
  Brain, 
  Users, 
  Lightbulb,
  Sparkles,
  Zap
} from 'lucide-react';
import { soundEngine } from '../utils/audioSystem';

interface AgentDetailModalProps {
  agent: Agent | null;
  building: Building | null;
  onClose: () => void;
  onGoToEvolution: (agentId: string) => void;
  onForceInteraction: (agentId: string) => void;
}

export const AgentDetailModal: React.FC<AgentDetailModalProps> = ({
  agent,
  building,
  onClose,
  onGoToEvolution,
  onForceInteraction
}) => {
  const [showAllScores, setShowAllScores] = useState<boolean>(false);
  const [needsViewMode, setNeedsViewMode] = useState<'four_dimensions' | 'compact'>('four_dimensions');

  if (!agent) return null;

  const currentAction = agent.plan?.steps[agent.plan.currentStepIndex] || agent.currentAction;
  const currentGoal = agent.goal;

  // Resolve structured needs with graceful fallback
  const physical = agent.physicalNeeds || {
    energy: agent.needs?.energy ?? agent.state?.energy ?? 80,
    hunger: agent.needs?.hunger ?? 20,
    health: agent.needs?.health ?? 90,
  };

  const psychological = agent.psychologicalNeeds || {
    mood: agent.needs?.mood ?? (agent.state?.mood < 0 ? (agent.state.mood + 100) / 2 : agent.state.mood) ?? 75,
    stress: agent.needs?.stress ?? agent.state?.stress ?? 18,
    fun: agent.needs?.fun ?? 55,
    comfort: agent.needs?.comfort ?? 80,
  };

  const social = agent.socialNeeds || {
    social: agent.needs?.social ?? agent.state?.sociability ?? 70,
    belonging: agent.needs?.belonging ?? 75,
  };

  const cognitive = agent.cognitiveNeeds || {
    curiosity: agent.needs?.curiosity ?? 65,
    achievement: agent.needs?.achievement ?? 60,
  };

  const conditionTags = agent.activeConditionTags || [];

  return (
    <div className="absolute top-16 left-6 z-20 w-96 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-3xl p-5 shadow-2xl text-slate-100 animate-fadeIn max-h-[88vh] overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow border border-white/20 shrink-0"
            style={{ backgroundColor: agent.spriteColor || '#3b82f6' }}
          >
            {agent.name.slice(0, 1)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">{agent.name}</h3>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30">
                {agent.mbti}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{agent.role}</p>
          </div>
        </div>

        <button
          onClick={() => {
            soundEngine.playClick();
            onClose();
          }}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Autonomous Decision System Showcase (Needs -> Goal -> Plan -> Action) */}
      <div className="py-3 space-y-3 text-xs">
        {/* Active Condition Badges (Dynamic Linkages) */}
        {conditionTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {conditionTags.map((tag, idx) => (
              <span 
                key={idx} 
                className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-950/80 text-indigo-300 border border-indigo-700/40 shadow-xs flex items-center gap-1"
              >
                <span>{tag}</span>
              </span>
            ))}
          </div>
        )}

        {/* Active Goal & Utility AI Choice */}
        {currentGoal && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-950/50 to-indigo-950/50 border border-blue-800/40 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-blue-400" />
                <span>Utility AI 首选目标 (Top Goal)</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                紧急度: {currentGoal.urgency}/10
              </span>
            </div>
            <div className="text-slate-100 font-semibold text-xs leading-snug">
              {currentGoal.title}
            </div>
            <div className="text-[11px] text-slate-300 pt-0.5 border-t border-blue-900/40">
              <span className="text-indigo-400 font-semibold">【决策动机】: </span>
              <span>{currentGoal.motivation}</span>
            </div>
          </div>
        )}

        {/* Utility AI Candidate Actions Dashboard */}
        {agent.utilityEvaluations && agent.utilityEvaluations.length > 0 && (
          <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-indigo-950 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
              <span>Utility AI 候选行为评估</span>
              <button
                onClick={() => setShowAllScores(!showAllScores)}
                className="text-slate-400 hover:text-indigo-300 font-mono flex items-center gap-0.5 text-[9px] transition"
              >
                <span>{showAllScores ? '收起 (Top 3)' : `展开全部 (${agent.utilityEvaluations.length})`}</span>
                {showAllScores ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar">
              {(showAllScores ? agent.utilityEvaluations : agent.utilityEvaluations.slice(0, 3)).map((u, i) => (
                <div key={u.action} className="text-[11px] py-1 border-b border-slate-900/60 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-300">
                      <span>{u.icon}</span>
                      <span className="font-medium">{u.label}</span>
                      {i === 0 && <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-mono">首选</span>}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-800 rounded-full h-1 overflow-hidden">
                        <div className={`h-full ${i === 0 ? 'bg-amber-400' : 'bg-indigo-400'}`} style={{ width: `${u.score}%` }} />
                      </div>
                      <span className="font-mono text-[10px] text-slate-300 w-6 text-right font-bold">{u.score}</span>
                    </div>
                  </div>
                  {showAllScores && (
                    <div className="text-[9px] text-slate-400 font-mono pt-0.5 px-0.5 leading-tight">
                      <div className="text-slate-300 truncate">{u.reason}</div>
                      <div className="text-slate-500">基础:{u.factors.needScore} · 特质:×{u.factors.personalityModifier} · 目标:×{u.factors.goalModifier} · 社交:×{u.factors.relationshipModifier} · 环境:×{u.factors.environmentModifier}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Executing Action & Progress */}
        <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Footprints className="w-3.5 h-3.5 text-emerald-400" />
              <span>当前执行计划 (Plan Step {agent.plan ? `${agent.plan.currentStepIndex + 1}/${agent.plan.totalSteps}` : '1/1'})</span>
            </span>
            <span className="font-mono text-emerald-400 font-bold">
              {currentAction?.progress || 0}%
            </span>
          </div>

          <div className="text-slate-200 font-medium leading-relaxed">
            {currentAction?.description || agent.currentActivity}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${currentAction?.progress || 0}%` }}
            />
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-0.5">
            <span>{building?.icon || '📍'}</span>
            <span>位于: {building?.name || '小镇街巷'}</span>
          </div>
        </div>

        {/* Inner Thought */}
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-300 italic">
          "{agent.currentThought}"
        </div>

        {/* 4-Dimension Needs & Psychological State System */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-1 text-slate-300">
              <Activity className="w-3 h-3 text-indigo-400" />
              <span>居民四维需求与心理系统</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setNeedsViewMode(needsViewMode === 'four_dimensions' ? 'compact' : 'four_dimensions')}
                className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                {needsViewMode === 'four_dimensions' ? '简略视图' : '四维矩阵'}
              </button>
            </div>
          </div>

          {needsViewMode === 'compact' ? (
            /* Compact Mode (4 Primary Meters) */
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>⚡ 精力 (Energy)</span>
                  <span className="text-amber-400 font-bold">{Math.round(physical.energy)}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full" style={{ width: `${physical.energy}%` }} />
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>🍞 饥饿 (Hunger)</span>
                  <span className="text-orange-400 font-bold">{Math.round(physical.hunger)}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div className="bg-orange-400 h-full" style={{ width: `${physical.hunger}%` }} />
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>💬 社交 (Social)</span>
                  <span className="text-blue-400 font-bold">{Math.round(social.social)}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div className="bg-blue-400 h-full" style={{ width: `${social.social}%` }} />
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>🔍 求知 (Curiosity)</span>
                  <span className="text-purple-400 font-bold">{Math.round(cognitive.curiosity)}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div className="bg-purple-400 h-full" style={{ width: `${cognitive.curiosity}%` }} />
                </div>
              </div>
            </div>
          ) : (
            /* 4-Dimension Rich Matrix View */
            <div className="space-y-2 text-[10px]">
              {/* 1. Physical Needs */}
              <div className="p-2 rounded-xl bg-slate-950/60 border border-amber-950/40 space-y-1.5">
                <div className="flex items-center justify-between text-amber-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-amber-400" />
                    <span>生理状态 (Physical)</span>
                  </span>
                  <span className="text-[9px] text-slate-400">健康联动</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 font-mono">
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-slate-400">
                      <span>⚡精力</span>
                      <span className="text-amber-400 font-bold">{Math.round(physical.energy)}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-full" style={{ width: `${physical.energy}%` }} />
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex justify-between text-slate-400">
                      <span>🍞饥饿</span>
                      <span className="text-orange-400 font-bold">{Math.round(physical.hunger)}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div className="bg-orange-400 h-full" style={{ width: `${physical.hunger}%` }} />
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex justify-between text-slate-400">
                      <span>🌿健康</span>
                      <span className="text-emerald-400 font-bold">{Math.round(physical.health)}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full" style={{ width: `${physical.health}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Psychological Needs */}
              <div className="p-2 rounded-xl bg-slate-950/60 border border-rose-950/40 space-y-1.5">
                <div className="flex items-center justify-between text-rose-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <Brain className="w-3 h-3 text-rose-400" />
                    <span>心理状态 (Psychological)</span>
                  </span>
                  <span className="text-[9px] text-slate-400">情绪与压力</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 font-mono">
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-slate-400">
                      <span>😊心情</span>
                      <span className="text-emerald-300 font-bold">{Math.round(psychological.mood)}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full" style={{ width: `${psychological.mood}%` }} />
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex justify-between text-slate-400">
                      <span>⚠️压力</span>
                      <span className={`font-bold ${psychological.stress > 50 ? 'text-rose-400' : 'text-slate-300'}`}>{Math.round(psychological.stress)}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div className={`h-full ${psychological.stress > 50 ? 'bg-rose-500' : 'bg-blue-400'}`} style={{ width: `${psychological.stress}%` }} />
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex justify-between text-slate-400">
                      <span>🎪趣味</span>
                      <span className="text-pink-400 font-bold">{Math.round(psychological.fun)}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div className="bg-pink-400 h-full" style={{ width: `${psychological.fun}%` }} />
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex justify-between text-slate-400">
                      <span>🛋️舒适</span>
                      <span className="text-teal-400 font-bold">{Math.round(psychological.comfort)}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div className="bg-teal-400 h-full" style={{ width: `${psychological.comfort}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Social & Cognitive Needs */}
              <div className="grid grid-cols-2 gap-2">
                {/* Social Needs */}
                <div className="p-2 rounded-xl bg-slate-950/60 border border-blue-950/40 space-y-1.5">
                  <div className="flex items-center justify-between text-blue-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-blue-400" />
                      <span>社交 (Social)</span>
                    </span>
                  </div>
                  <div className="space-y-1 font-mono">
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-slate-400">
                        <span>💬社交充实</span>
                        <span className="text-blue-400 font-bold">{Math.round(social.social)}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-blue-400 h-full" style={{ width: `${social.social}%` }} />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-slate-400">
                        <span>🤝归属认同</span>
                        <span className="text-cyan-400 font-bold">{Math.round(social.belonging)}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-cyan-400 h-full" style={{ width: `${social.belonging}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cognitive Needs */}
                <div className="p-2 rounded-xl bg-slate-950/60 border border-purple-950/40 space-y-1.5">
                  <div className="flex items-center justify-between text-purple-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <Lightbulb className="w-3 h-3 text-purple-400" />
                      <span>认知 (Cognitive)</span>
                    </span>
                  </div>
                  <div className="space-y-1 font-mono">
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-slate-400">
                        <span>🔍求知探索</span>
                        <span className="text-purple-400 font-bold">{Math.round(cognitive.curiosity)}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-purple-400 h-full" style={{ width: `${cognitive.curiosity}%` }} />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-slate-400">
                        <span>🏆胜任成就</span>
                        <span className="text-indigo-400 font-bold">{Math.round(cognitive.achievement)}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-indigo-400 h-full" style={{ width: `${cognitive.achievement}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
        <button
          onClick={() => onForceInteraction(agent.id)}
          className="flex-1 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 text-center transition flex items-center justify-center gap-1.5"
        >
          <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
          <span>促成社交交谈</span>
        </button>

        <button
          onClick={() => onGoToEvolution(agent.id)}
          className="flex-1 py-2 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition flex items-center justify-center gap-1.5 shadow"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>四维演化与记忆全貌</span>
        </button>
      </div>
    </div>
  );
};
