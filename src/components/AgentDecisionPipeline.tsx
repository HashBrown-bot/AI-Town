import React from 'react';
import { Agent, Building, AgentNeeds } from '../types/town';
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
  Smile
} from 'lucide-react';

interface AgentDecisionPipelineProps {
  agent: Agent;
  buildings: Building[];
  otherAgents: Agent[];
}

export const AgentDecisionPipeline: React.FC<AgentDecisionPipelineProps> = ({
  agent,
  buildings,
  otherAgents
}) => {
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

  // Configuration for 10 needs meters
  const needsConfig: {
    key: keyof AgentNeeds;
    name: string;
    icon: string;
    value: number;
    color: string;
    bgColor: string;
    traitNote: string;
  }[] = [
    {
      key: 'energy',
      name: '精力 (Energy)',
      icon: '⚡',
      value: needs.energy,
      color: 'bg-amber-400',
      bgColor: 'text-amber-400',
      traitNote: '自然消耗，闭目深睡或热咖啡恢复'
    },
    {
      key: 'hunger',
      name: '饥饿 (Hunger)',
      icon: '🍞',
      value: needs.hunger,
      color: 'bg-orange-400',
      bgColor: 'text-orange-400',
      traitNote: '随时间增长，前往面包房/咖啡馆进餐补充'
    },
    {
      key: 'social',
      name: '社交渴求 (Social)',
      icon: '💬',
      value: needs.social,
      color: 'bg-blue-400',
      bgColor: 'text-blue-400',
      traitNote: `外向性(${agent.bigFive?.extraversion || 50}%)加剧独处时社交渴望`
    },
    {
      key: 'fun',
      name: '趣味休闲 (Fun)',
      icon: '🎪',
      value: needs.fun,
      color: 'bg-pink-400',
      bgColor: 'text-pink-400',
      traitNote: '渴望喷泉散心、听诗琴演奏或观鸽'
    },
    {
      key: 'curiosity',
      name: '求知探索 (Curiosity)',
      icon: '🔍',
      value: needs.curiosity,
      color: 'bg-purple-400',
      bgColor: 'text-purple-400',
      traitNote: `开放性(${agent.bigFive?.openness || 50}%)驱动对古籍与星仪探索`
    },
    {
      key: 'achievement',
      name: '成就进取 (Achievement)',
      icon: '🏆',
      value: needs.achievement,
      color: 'bg-indigo-400',
      bgColor: 'text-indigo-400',
      traitNote: `尽责性(${agent.bigFive?.conscientiousness || 50}%)驱动岗位职责专注`
    },
    {
      key: 'comfort',
      name: '舒适度 (Comfort)',
      icon: '🛋️',
      value: needs.comfort,
      color: 'bg-emerald-400',
      bgColor: 'text-emerald-400',
      traitNote: '环境安适与热茶能快速提升'
    },
    {
      key: 'safety',
      name: '安全感 (Safety)',
      icon: '🛡️',
      value: needs.safety,
      color: 'bg-teal-400',
      bgColor: 'text-teal-400',
      traitNote: '靠近市政厅或信任伙伴同行时更安心'
    },
    {
      key: 'belonging',
      name: '社区归属 (Belonging)',
      icon: '🤝',
      value: needs.belonging,
      color: 'bg-cyan-400',
      bgColor: 'text-cyan-400',
      traitNote: `宜人性(${agent.bigFive?.agreeableness || 50}%)重视睦邻合作`
    },
    {
      key: 'stress',
      name: '压力负荷 (Stress)',
      icon: '⚠️',
      value: needs.stress,
      color: needs.stress > 50 ? 'bg-rose-500' : 'bg-rose-400',
      bgColor: 'text-rose-400',
      traitNote: `情绪敏感(${agent.bigFive?.neuroticism || 30}%)在疲饿时放大焦虑`
    }
  ];

  return (
    <div className="bg-slate-900/90 border border-indigo-900/40 rounded-2xl p-5 shadow-sm space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <span>自主行为决策心智流水线 (Needs → Goal → Plan → Action)</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                BDI Agent Architecture
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              告别随机移动，基于10项自主需求、性格特质与目标规划驱动的真实社会行为闭环
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>心智自主运行中</span>
          </span>
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

        {/* Stage 2: Goal */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-blue-900/40 space-y-2 relative">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-blue-400 flex items-center gap-1.5">
              <span>2. Goal 目标生成</span>
            </span>
            <span className="text-[10px] font-mono text-blue-300">
              紧急度 {currentGoal?.urgency || 5}/10
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed font-medium line-clamp-2">
            {currentGoal?.title || '在小镇维持日常生活并寻找社交伙伴'}
          </p>
          <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
            状态: <span className="text-blue-400">正在追求 (Active)</span>
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
              因为当前正按计划执行动作「{currentAction?.description}」，需在{targetBuilding?.name || currentBuilding?.name || '指定场所'}操作设施或驻留。
            </p>
          </div>

          {/* Why This Person */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-1">
            <div className="text-indigo-400 font-semibold text-[11px] flex items-center gap-1">
              <span>🤝 为什么要找【{targetAgent?.name || currentGoal?.targetAgentName || '交流对象'}】？</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {targetAgent 
                ? `根据好感度矩阵与过往印象，与${targetAgent.name}交流能最大程度满足社交认同(${needs.social}%)并缓解心理压力。`
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

      {/* Deep Dive: 10 Needs Monitor & Multi-Step Execution Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 10 Needs Bars (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>10 项内在需求实时监测 (0-100)</span>
            </h4>
            <span className="text-[10px] font-mono text-slate-500">数值越适宜越健康</span>
          </div>

          <div className="space-y-2.5">
            {needsConfig.map(need => (
              <div key={need.key} className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium text-slate-300 text-[11px]">
                    <span>{need.icon}</span>
                    <span>{need.name}</span>
                  </span>
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
