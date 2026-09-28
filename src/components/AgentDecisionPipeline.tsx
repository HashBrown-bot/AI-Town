import React, { useState } from 'react';
import { Agent, Building, AgentNeeds, UtilityActionScore } from '../types/town';
import { 
  Target, 
  Footprints, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Activity, 
  Compass, 
  Zap, 
  Heart, 
  Brain, 
  HelpCircle,
  Sliders,
  Shield,
  Coffee,
  Smile,
  BarChart3,
  Flame,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { evaluateAgentUtilityActions } from '../systems/UtilitySystem';

interface AgentDecisionPipelineProps {
  agent: Agent;
  buildings: Building[];
  otherAgents: Agent[];
  weather?: string;
}

export const AgentDecisionPipeline: React.FC<AgentDecisionPipelineProps> = ({
  agent,
  buildings,
  otherAgents,
  weather
}) => {
  const [selectedUtilityAction, setSelectedUtilityAction] = useState<string | null>(null);
  const [showFormulaDetails, setShowFormulaDetails] = useState<boolean>(false);

  const needs: AgentNeeds = agent.needs || {
    energy: agent.state.energy || 80,
    hunger: 25,
    social: 35,
    fun: 30,
    comfort: 75,
    curiosity: 60,
    safety: 85,
    belonging: 70,
    achievement: 65,
    stress: agent.state.stress || 20
  };

  const currentGoal = agent.goal;
  const currentPlan = agent.plan;
  const currentAction = currentPlan?.steps[currentPlan.currentStepIndex] || agent.currentAction;
  const currentBuilding = buildings.find(b => b.id === agent.currentBuildingId);
  const targetBuilding = buildings.find(b => b.id === currentGoal?.targetBuildingId);
  const targetAgent = otherAgents.find(a => a.id === currentGoal?.targetAgentId);

  // Compute live utility action evaluations if agent doesn't have cached evaluations
  const utilityScores: UtilityActionScore[] = agent.utilityEvaluations && agent.utilityEvaluations.length > 0
    ? agent.utilityEvaluations
    : evaluateAgentUtilityActions(agent, buildings, otherAgents, currentBuilding, weather).allScores;

  const topUtility = utilityScores[0];
  const inspectingAction = utilityScores.find(u => u.action === selectedUtilityAction) || topUtility;

  // Resolve 4 structured need dimensions
  const physical = agent.physicalNeeds || {
    energy: needs.energy ?? 80,
    hunger: needs.hunger ?? 20,
    health: needs.health ?? 90,
  };

  const psychological = agent.psychologicalNeeds || {
    mood: needs.mood ?? (agent.state.mood < 0 ? (agent.state.mood + 100) / 2 : agent.state.mood) ?? 75,
    stress: needs.stress ?? agent.state.stress ?? 18,
    fun: needs.fun ?? 55,
    comfort: needs.comfort ?? 80,
  };

  const social = agent.socialNeeds || {
    social: needs.social ?? agent.state.sociability ?? 70,
    belonging: needs.belonging ?? 75,
  };

  const cognitive = agent.cognitiveNeeds || {
    curiosity: needs.curiosity ?? 65,
    achievement: needs.achievement ?? 60,
  };

  const conditionTags = agent.activeConditionTags || [];

  // Configuration for 4-dimension needs meters
  const needsConfig: {
    key: string;
    dimension: 'physical' | 'psychological' | 'social' | 'cognitive';
    dimensionName: string;
    name: string;
    icon: string;
    value: number;
    color: string;
    bgColor: string;
    traitNote: string;
  }[] = [
    // 1. 生理需求 (Physical Needs)
    {
      key: 'energy',
      dimension: 'physical',
      dimensionName: '生理状态 (Physical)',
      name: '精力储备 (Energy)',
      icon: '⚡',
      value: Math.round(physical.energy),
      color: 'bg-amber-400',
      bgColor: 'text-amber-400',
      traitNote: '自然消耗，夜间加速耗损；深睡休憩或热咖啡恢复'
    },
    {
      key: 'hunger',
      dimension: 'physical',
      dimensionName: '生理状态 (Physical)',
      name: '饥饿渴求 (Hunger)',
      icon: '🍞',
      value: Math.round(physical.hunger),
      color: 'bg-orange-400',
      bgColor: 'text-orange-400',
      traitNote: '随时间增长；长期过高会拉低心情并引发健康损耗'
    },
    {
      key: 'health',
      dimension: 'physical',
      dimensionName: '生理状态 (Physical)',
      name: '生理健康 (Health)',
      icon: '🌿',
      value: Math.round(physical.health),
      color: 'bg-emerald-400',
      bgColor: 'text-emerald-400',
      traitNote: '极度饥饿/过度疲劳或暴风雨淋雨损耗；就医与饱食休养愈合'
    },

    // 2. 心理需求 (Psychological Needs)
    {
      key: 'mood',
      dimension: 'psychological',
      dimensionName: '心理状态 (Psychological)',
      name: '情绪愉悦 (Mood)',
      icon: '😊',
      value: Math.round(psychological.mood),
      color: 'bg-emerald-400',
      bgColor: 'text-emerald-300',
      traitNote: '良好社交与成就完成时提升；受疲饿与冲突抑制'
    },
    {
      key: 'stress',
      dimension: 'psychological',
      dimensionName: '心理状态 (Psychological)',
      name: '压力负荷 (Stress)',
      icon: '⚠️',
      value: Math.round(psychological.stress),
      color: psychological.stress > 50 ? 'bg-rose-500' : 'bg-rose-400',
      bgColor: 'text-rose-400',
      traitNote: `情绪敏感(${agent.bigFive?.neuroticism || 30}%)在疲饿或冲突时放大焦虑`
    },
    {
      key: 'fun',
      dimension: 'psychological',
      dimensionName: '心理状态 (Psychological)',
      name: '趣味休闲 (Fun)',
      icon: '🎪',
      value: Math.round(psychological.fun),
      color: 'bg-pink-400',
      bgColor: 'text-pink-400',
      traitNote: '喷泉散心、听诗琴演奏或观星能有效补充'
    },
    {
      key: 'comfort',
      dimension: 'psychological',
      dimensionName: '心理状态 (Psychological)',
      name: '身心舒适 (Comfort)',
      icon: '🛋️',
      value: Math.round(psychological.comfort),
      color: 'bg-teal-400',
      bgColor: 'text-teal-400',
      traitNote: '环境安适与热茶温饮快速提升，恶劣天气外出下降'
    },

    // 3. 社交需求 (Social Needs)
    {
      key: 'social',
      dimension: 'social',
      dimensionName: '社交状态 (Social)',
      name: '社交充实 (Social)',
      icon: '💬',
      value: Math.round(social.social),
      color: 'bg-blue-400',
      bgColor: 'text-blue-400',
      traitNote: `外向性(${agent.bigFive?.extraversion || 50}%)加剧独处时社交渴望；倾谈交流时恢复`
    },
    {
      key: 'belonging',
      dimension: 'social',
      dimensionName: '社交状态 (Social)',
      name: '社区归属 (Belonging)',
      icon: '🤝',
      value: Math.round(social.belonging),
      color: 'bg-cyan-400',
      bgColor: 'text-cyan-400',
      traitNote: `宜人性(${agent.bigFive?.agreeableness || 50}%)重视睦邻合作；良好社交激增`
    },

    // 4. 认知需求 (Cognitive Needs)
    {
      key: 'curiosity',
      dimension: 'cognitive',
      dimensionName: '认知状态 (Cognitive)',
      name: '求知探索 (Curiosity)',
      icon: '🔍',
      value: Math.round(cognitive.curiosity),
      color: 'bg-purple-400',
      bgColor: 'text-purple-400',
      traitNote: `开放性(${agent.bigFive?.openness || 50}%)驱动对古籍、仪器与未知探索`
    },
    {
      key: 'achievement',
      dimension: 'cognitive',
      dimensionName: '认知状态 (Cognitive)',
      name: '胜任成就 (Achievement)',
      icon: '🏆',
      value: Math.round(cognitive.achievement),
      color: 'bg-indigo-400',
      bgColor: 'text-indigo-400',
      traitNote: `尽责性(${agent.bigFive?.conscientiousness || 50}%)驱动职业建树；工作完成显著增加`
    }
  ];

  return (
    <div className="bg-slate-900/90 border border-indigo-900/40 rounded-2xl p-5 shadow-sm space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <span>Utility AI 自主行为决策引擎 (Utility-Driven Decision Pipeline)</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                Utility Score Engine
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              普通实时微观行为由 Utility AI 本地自主求优完成；Gemini 专注长期反思与叙事对话
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>首选行为: {topUtility?.icon} {topUtility?.label} ({topUtility?.score}分)</span>
          </span>
        </div>
      </div>

      {/* Utility AI Evaluation Dashboard (10 Candidate Actions) */}
      <div className="p-4 rounded-xl bg-slate-950/90 border border-indigo-950 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Utility AI 候选行为效用评估看板 (10 候选动作全排序)
            </h4>
          </div>
          <button
            onClick={() => setShowFormulaDetails(!showFormulaDetails)}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
          >
            <Info className="w-3.5 h-3.5" />
            <span>{showFormulaDetails ? '收起打分公式' : '查看多因子打分公式'}</span>
            {showFormulaDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Formula Explainer Banner */}
        {showFormulaDetails && (
          <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-900/50 space-y-1.5 text-xs text-slate-300 font-mono">
            <div className="text-indigo-400 font-bold flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>ActionScore 计算公式：</span>
            </div>
            <div className="text-[11px] leading-relaxed text-slate-200">
              Score = NeedScore(需求基础分 0-100) × PersonalityModifier(MBTI/BigFive 0.5-1.8) × GoalModifier(高层目标契合 0.8-1.6) × RelationshipModifier(人际好感 0.8-1.5) × EnvironmentModifier(场域与天气 0.7-1.4) × MemoryModifier(记忆情感印记 0.85-1.35) × Randomness(扰动 0.95-1.05)
            </div>
            <div className="text-[10px] text-slate-400">
              * 数值严格约束在 [0, 100] 区间，保证决策高度可解释、稳定且拒绝呆板机械。
            </div>
          </div>
        )}

        {/* 10 Candidate Actions Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {utilityScores.map((item, idx) => {
            const isTop = idx === 0;
            const isSelected = inspectingAction.action === item.action;
            const barWidth = `${item.score}%`;

            return (
              <div
                key={item.action}
                onClick={() => setSelectedUtilityAction(item.action)}
                className={`p-2.5 rounded-xl border cursor-pointer transition space-y-1.5 relative ${
                  isSelected
                    ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-950/40 ring-1 ring-indigo-400/40'
                    : isTop
                    ? 'bg-slate-900 border-indigo-900/80 hover:border-indigo-700'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {isTop && (
                  <span className="absolute -top-2 right-2 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-[9px] shadow">
                    Top 1
                  </span>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 font-medium text-slate-200">
                    <span>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className={`font-mono font-bold ${isTop ? 'text-amber-400' : 'text-slate-300'}`}>
                    {item.score}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isTop
                        ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                        : item.score > 60
                        ? 'bg-indigo-400'
                        : item.score > 30
                        ? 'bg-blue-500'
                        : 'bg-slate-600'
                    }`}
                    style={{ width: barWidth }}
                  />
                </div>

                <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-0.5">
                  <span>需: {item.factors.needScore}</span>
                  <span>特: ×{item.factors.personalityModifier}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Utility Action Inspector Box */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-indigo-900/60 text-xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-indigo-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <span>{inspectingAction.icon}</span>
              <span>【{inspectingAction.label} ({inspectingAction.action})】决策因子透视</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                最终评分: {inspectingAction.score} / 100
              </span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {inspectingAction.action === topUtility.action ? '★ 系统已采纳为此刻执行行为' : '次选候选行为'}
            </span>
          </div>

          <div className="text-slate-300 text-[11px] leading-relaxed">
            {inspectingAction.reason}
          </div>

          {/* Factor Breakdown Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1 border-t border-slate-800 font-mono text-[10px]">
            <div className="p-1.5 rounded bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500 block">需求基础分</span>
              <span className="text-amber-400 font-bold">{inspectingAction.factors.needScore}</span>
            </div>
            <div className="p-1.5 rounded bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500 block">性格特质修正</span>
              <span className="text-purple-400 font-bold">×{inspectingAction.factors.personalityModifier}</span>
            </div>
            <div className="p-1.5 rounded bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500 block">当前目标加权</span>
              <span className="text-blue-400 font-bold">×{inspectingAction.factors.goalModifier}</span>
            </div>
            <div className="p-1.5 rounded bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500 block">人际好感加权</span>
              <span className="text-rose-400 font-bold">×{inspectingAction.factors.relationshipModifier}</span>
            </div>
            <div className="p-1.5 rounded bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500 block">场域天气修正</span>
              <span className="text-emerald-400 font-bold">×{inspectingAction.factors.environmentModifier}</span>
            </div>
            <div className="p-1.5 rounded bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500 block">记忆印记修正</span>
              <span className="text-cyan-400 font-bold">×{inspectingAction.factors.memoryModifier}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Stage Architecture Visual Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Stage 1: Needs */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 relative">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <span>1. Needs 需求驱动</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">10 维生理心理</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            生理饥饿、精力衰减与性格特质共同作用，主导需求持续演化。
          </p>
          <div className="text-[10px] text-amber-400 font-mono flex items-center gap-1 pt-1 border-t border-slate-900">
            <span>当前主导: </span>
            <b className="uppercase">{currentGoal?.dominantNeed || 'achievement'}</b>
          </div>
        </div>

        {/* Stage 2: Utility AI & Goal */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-blue-900/40 space-y-2 relative">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-blue-400 flex items-center gap-1.5">
              <span>2. Utility AI 评估 ➔ Goal</span>
            </span>
            <span className="text-[10px] font-mono text-blue-300">
              {topUtility?.score} 分
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed font-medium line-clamp-2">
            {currentGoal?.title || '在小镇维持日常生活并寻找社交伙伴'}
          </p>
          <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
            首选决策: <span className="text-blue-400 font-bold">{topUtility?.icon} {topUtility?.label}</span>
          </div>
        </div>

        {/* Stage 3: Plan */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-indigo-900/40 space-y-2 relative">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-indigo-400 flex items-center gap-1.5">
              <span>3. Plan 方案拆解</span>
            </span>
            <span className="text-[10px] font-mono text-indigo-300">
              {currentPlan ? `步 ${currentPlan.currentStepIndex + 1}/${currentPlan.totalSteps}` : '1/1'}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
            {currentAction?.description || agent.currentActivity}
          </p>
          <div className="w-full bg-slate-900 rounded-full h-1 mt-1 overflow-hidden">
            <div
              className="bg-indigo-400 h-full rounded-full transition-all"
              style={{ width: `${currentAction?.progress || 0}%` }}
            />
          </div>
        </div>

        {/* Stage 4: World Feedback */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-900/40 space-y-2 relative">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span>4. World Feedback</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400">闭环修正</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            行动落地后满足饥饿、恢复精力或缓释压力，重塑下一轮需求循环。
          </p>
          <div className="text-[10px] text-emerald-400 font-mono pt-1 border-t border-slate-900">
            <span>预期回馈: </span>
            <span>{currentAction?.feedbackEffects ? Object.keys(currentAction.feedbackEffects).length : 0} 项指标修正</span>
          </div>
        </div>
      </div>

      {/* "Why is the resident here?" Q&A Explainer Grid */}
      <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
          <span>心智透视镜：为什么在这？为什么找TA？为什么现在做这件事？</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Why Here */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-1">
            <div className="text-blue-400 font-semibold text-[11px] flex items-center gap-1">
              <span>📍 为什么在【{currentBuilding?.name || '当前地点'}】？</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              因为当前 Utility AI 决策最高分为「{topUtility?.label}」({topUtility?.score}分)，需在{targetBuilding?.name || currentBuilding?.name || '指定场所'}操作设施或驻留。
            </p>
          </div>

          {/* Why This Person */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-1">
            <div className="text-indigo-400 font-semibold text-[11px] flex items-center gap-1">
              <span>🤝 为什么要找【{targetAgent?.name || currentGoal?.targetAgentName || '交流对象'}】？</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {targetAgent 
                ? `根据好感度矩阵与过往印象，与${targetAgent.name}交流的人际修正系数为 ×${topUtility?.factors.relationshipModifier}，能最大程度满足社交认同并缓解压力。`
                : currentGoal?.targetAgentName
                ? `目标涉及${currentGoal.targetAgentName}的工位或资源协调（好感加成）。`
                : '当前行动专注于独立工位生产或自我休整，不依赖特定交互对象。'}
            </p>
          </div>

          {/* Why Now */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-1">
            <div className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
              <span>⚡ 为什么现在做这件事？</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {currentGoal?.motivation || `当前内在需求指标达到阈值，触发紧急度 ${currentGoal?.urgency || 6}/10 的自主目标决策。`}
            </p>
          </div>
        </div>
      </div>

      {/* Deep Dive: 4-Dimension Needs Monitor & Multi-Step Execution Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 4-Dimension Needs (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>居民四维状态与心理系统监测 (0-100)</span>
            </h4>
            <span className="text-[10px] font-mono text-slate-500">动态联动驱动</span>
          </div>

          {/* Active condition tags */}
          {conditionTags.length > 0 && (
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-indigo-950/80 space-y-1">
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                当前活跃联动状态 (Condition Badges):
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {conditionTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-700/50 shadow-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {needsConfig.map(need => (
              <div key={need.key} className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium text-slate-300 text-[11px]">
                    <span>{need.icon}</span>
                    <span>{need.name}</span>
                    <span className="text-[9px] px-1 rounded bg-slate-800/80 text-slate-400 font-mono">
                      {need.dimensionName.split(' ')[0]}
                    </span>
                  </div>
                  <span className={`font-mono font-bold ${need.bgColor}`}>
                    {need.value}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${need.color}`}
                    style={{ width: `${need.value}%` }}
                  />
                </div>

                <div className="text-[10px] text-slate-500 font-mono">
                  {need.traitNote}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Multi-Step Plan Pipeline (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Footprints className="w-3.5 h-3.5 text-indigo-400" />
              <span>多步行动计划流水线 (Plan Execution Pipeline)</span>
            </h4>
            <span className="text-[10px] font-mono text-indigo-300">
              {currentPlan ? `共 ${currentPlan.totalSteps} 个执行步骤` : '暂无执行步骤'}
            </span>
          </div>

          {/* Active Goal Summary Card */}
          {currentGoal && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-slate-950 border border-blue-800/40 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-300 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-blue-400" />
                  <span>核心目标：{currentGoal.title}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[10px]">
                  优先级: {currentGoal.urgency}/10
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {currentGoal.description}
              </p>
              <div className="text-[11px] text-slate-400 font-mono pt-1 border-t border-blue-900/30">
                <span>动机驱动：</span>
                <span className="text-indigo-300">{currentGoal.motivation}</span>
              </div>
            </div>
          )}

          {/* Steps List */}
          <div className="space-y-2.5 pt-1">
            {currentPlan?.steps.map((step, idx) => {
              const isPast = idx < (currentPlan.currentStepIndex || 0);
              const isCurrent = idx === (currentPlan.currentStepIndex || 0);
              const isFuture = idx > (currentPlan.currentStepIndex || 0);

              return (
                <div
                  key={step.id}
                  className={`p-3 rounded-xl border transition space-y-2 text-xs ${
                    isCurrent
                      ? 'bg-slate-950 border-indigo-500/70 shadow-md shadow-indigo-950/30'
                      : isPast
                      ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                          isPast
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isCurrent
                            ? 'bg-indigo-500 text-white shadow'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isPast ? '✓' : idx + 1}
                      </span>
                      <span className="font-semibold text-slate-200">
                        {step.description}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        isPast
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isCurrent
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isPast ? '已完成' : isCurrent ? `进行中 (${step.progress}%)` : '待执行'}
                    </span>
                  </div>

                  {/* Progress bar for current step */}
                  {isCurrent && (
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${step.progress}%` }}
                      />
                    </div>
                  )}

                  {/* World Feedback on completion */}
                  {step.feedbackEffects && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-900 text-[10px] font-mono text-slate-400">
                      <span className="text-slate-500">步骤完成世界反馈:</span>
                      {Object.entries(step.feedbackEffects).map(([k, delta]) => {
                        const isGood = (delta || 0) < 0 && (k === 'hunger' || k === 'stress' || k === 'social');
                        const isPos = (delta || 0) > 0;
                        return (
                          <span
                            key={k}
                            className={`px-1.5 py-0.2 rounded ${
                              isGood || (isPos && k !== 'hunger' && k !== 'stress')
                                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/30'
                                : 'bg-slate-900 text-slate-300'
                            }`}
                          >
                            {k}: {delta && delta > 0 ? `+${delta}` : delta}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
