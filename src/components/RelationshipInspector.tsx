import React, { useState } from 'react';
import { 
  Agent, 
  Relationship, 
  RelationshipDimensions, 
  RelationshipStage 
} from '../types/town';
import { 
  STAGE_CONFIG, 
  getStageLabel, 
  getDominantDynamic, 
  createDefaultRelationship 
} from '../systems/RelationshipSystem';
import { 
  Heart, 
  ShieldCheck, 
  Award, 
  Sparkles, 
  Swords, 
  AlertOctagon, 
  Flame, 
  Anchor, 
  Compass, 
  Clock, 
  ArrowRight,
  TrendingUp,
  Info,
  Users
} from 'lucide-react';

interface RelationshipInspectorProps {
  currentAgent: Agent;
  allAgents: Agent[];
  onSelectTargetAgent?: (targetId: string) => void;
}

interface DimensionConfig {
  key: keyof RelationshipDimensions;
  label: string;
  enLabel: string;
  icon: React.ReactNode;
  isBipolar: boolean; // -100 to +100
  color: string;
  positiveColor: string;
  negativeColor: string;
  description: string;
}

const DIMENSION_CONFIGS: DimensionConfig[] = [
  {
    key: 'familiarity',
    label: '熟识度',
    enLabel: 'Familiarity',
    icon: <Compass className="w-3.5 h-3.5" />,
    isBipolar: false,
    color: '#38bdf8',
    positiveColor: 'bg-sky-400',
    negativeColor: '',
    description: '彼此生活经历与性格习惯的知悉程度'
  },
  {
    key: 'trust',
    label: '信任度',
    enLabel: 'Trust',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    isBipolar: true,
    color: '#10b981',
    positiveColor: 'bg-emerald-400',
    negativeColor: 'bg-rose-500',
    description: '将脆弱或重要秘密交付对方的心理安全感'
  },
  {
    key: 'affection',
    label: '好感度',
    enLabel: 'Affection',
    icon: <Heart className="w-3.5 h-3.5" />,
    isBipolar: true,
    color: '#ec4899',
    positiveColor: 'bg-pink-400',
    negativeColor: 'bg-rose-600',
    description: '纯粹的情感亲近与喜爱倾向'
  },
  {
    key: 'respect',
    label: '敬佩度',
    enLabel: 'Respect',
    icon: <Award className="w-3.5 h-3.5" />,
    isBipolar: true,
    color: '#a855f7',
    positiveColor: 'bg-purple-400',
    negativeColor: 'bg-slate-600',
    description: '对对方专业才华、人格操守或行事魄力的赞赏'
  },
  {
    key: 'attraction',
    label: '吸引力',
    enLabel: 'Attraction',
    icon: <Sparkles className="w-3.5 h-3.5" />,
    isBipolar: false,
    color: '#f43f5e',
    positiveColor: 'bg-rose-400',
    negativeColor: '',
    description: '审美共鸣、气场吸引与浪漫倾心程度'
  },
  {
    key: 'rivalry',
    label: '竞争心',
    enLabel: 'Rivalry',
    icon: <Swords className="w-3.5 h-3.5" />,
    isBipolar: false,
    color: '#f59e0b',
    positiveColor: 'bg-amber-400',
    negativeColor: '',
    description: '才能博弈、追求胜过对方的暗自较劲'
  },
  {
    key: 'resentment',
    label: '芥蒂怨恨',
    enLabel: 'Resentment',
    icon: <AlertOctagon className="w-3.5 h-3.5" />,
    isBipolar: false,
    color: '#ef4444',
    positiveColor: 'bg-red-500',
    negativeColor: '',
    description: '往昔冲突或伤害残留的情绪芥蒂与防备'
  },
  {
    key: 'jealousy',
    label: '嫉妒感',
    enLabel: 'Jealousy',
    icon: <Flame className="w-3.5 h-3.5" />,
    isBipolar: false,
    color: '#fb923c',
    positiveColor: 'bg-orange-500',
    negativeColor: '',
    description: '因对方成就或受偏爱而引发的酸楚心理'
  },
  {
    key: 'dependency',
    label: '依赖感',
    enLabel: 'Dependency',
    icon: <Anchor className="w-3.5 h-3.5" />,
    isBipolar: false,
    color: '#06b6d4',
    positiveColor: 'bg-cyan-400',
    negativeColor: '',
    description: '在情感陪伴或事务决策上对对方的倚靠'
  }
];

export const RelationshipInspector: React.FC<RelationshipInspectorProps> = ({
  currentAgent,
  allAgents,
  onSelectTargetAgent
}) => {
  const otherAgents = allAgents.filter(a => a.id !== currentAgent.id);
  const [selectedTargetId, setSelectedTargetId] = useState<string>(
    otherAgents[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'radar' | 'bars' | 'timeline'>('radar');

  const targetAgent = allAgents.find(a => a.id === selectedTargetId) || otherAgents[0];

  if (!targetAgent) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        小镇中暂无其他居民社交关系数据
      </div>
    );
  }

  // Get or initialize relationship
  const rel: Relationship = currentAgent.relationships?.[targetAgent.id] || 
    createDefaultRelationship(targetAgent.id, targetAgent.name, currentAgent.affinity?.[targetAgent.id] ?? 0);

  const stageConfig = STAGE_CONFIG[rel.relationshipStage] || STAGE_CONFIG.stranger;
  const dominantDynamic = rel.dominantDynamic || getDominantDynamic(rel);

  // Helper for Radar Chart Calculations
  // 9 dimensions evenly distributed in a circle (360 / 9 = 40 deg each)
  const radarRadius = 100;
  const center = 130;

  const getDimensionNormalized = (cfg: DimensionConfig): number => {
    const raw = rel[cfg.key] ?? 0;
    if (cfg.isBipolar) {
      // -100..100 -> 0..100
      return Math.max(0, Math.min(100, (raw + 100) / 2));
    }
    return Math.max(0, Math.min(100, raw));
  };

  const radarPoints = DIMENSION_CONFIGS.map((cfg, index) => {
    const angle = (index * 40 - 90) * (Math.PI / 180);
    const normalizedVal = getDimensionNormalized(cfg);
    const r = (normalizedVal / 100) * radarRadius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    const labelX = center + (radarRadius + 22) * Math.cos(angle);
    const labelY = center + (radarRadius + 22) * Math.sin(angle);
    return { cfg, angle, x, y, labelX, labelY, rawVal: rel[cfg.key] ?? 0, normalizedVal };
  });

  const polygonPath = radarPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
            <Heart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <span>Relationship 2.0 多维社会关系网络</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                Multi-Dimensional Bonds
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              超越单一好感评分：融合信任、敬意、竞争心、吸引力与历史事件的复杂人际动态
            </p>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab('radar')}
            className={`px-3 py-1 rounded-lg transition ${
              activeTab === 'radar'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            雷达拓扑
          </button>
          <button
            onClick={() => setActiveTab('bars')}
            className={`px-3 py-1 rounded-lg transition ${
              activeTab === 'bars'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            指标条形
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
              activeTab === 'timeline'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>重大事件 ({rel.history?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* Target Agent Selection Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
        <span className="text-[11px] text-slate-500 font-medium shrink-0 flex items-center gap-1">
          <Users className="w-3 h-3" />
          <span>互动对象:</span>
        </span>
        {otherAgents.map(a => {
          const isSelected = a.id === targetAgent.id;
          const targetRel = currentAgent.relationships?.[a.id];
          const stage = targetRel?.relationshipStage || 'stranger';
          const stageCfg = STAGE_CONFIG[stage];

          return (
            <button
              key={a.id}
              onClick={() => {
                setSelectedTargetId(a.id);
                if (onSelectTargetAgent) onSelectTargetAgent(a.id);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition shrink-0 ${
                isSelected
                  ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: a.spriteColor || '#3b82f6' }}
              />
              <span className="font-medium">{a.name}</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full border ${stageCfg.badgeBg} ${stageCfg.badgeText} ${stageCfg.badgeBorder}`}
              >
                {stageCfg.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Relationship Overview Card */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-inner shrink-0"
            style={{ backgroundColor: targetAgent.spriteColor || '#6366f1' }}
          >
            {targetAgent.name.slice(0, 1)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white">
                {currentAgent.name} ➔ {targetAgent.name}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                ({targetAgent.role})
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${stageConfig.badgeBg} ${stageConfig.badgeText} ${stageConfig.badgeBorder}`}
              >
                【{stageConfig.label}】
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-amber-400 font-medium bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                ✨ {dominantDynamic}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-xl">
              {stageConfig.description}
            </p>
          </div>
        </div>

        {/* Quick Snapshot Badges */}
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 shrink-0 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 text-center font-mono">
          <div>
            <span className="text-[9px] text-slate-500 block">信任度 Trust</span>
            <span
              className={`text-xs font-bold ${
                rel.trust >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {rel.trust > 0 ? `+${rel.trust}` : rel.trust}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block">好感度 Affection</span>
            <span
              className={`text-xs font-bold ${
                rel.affection >= 0 ? 'text-pink-400' : 'text-rose-400'
              }`}
            >
              {rel.affection > 0 ? `+${rel.affection}` : rel.affection}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block">竞争心 Rivalry</span>
            <span className="text-xs font-bold text-amber-400">
              {rel.rivalry}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area based on Tab */}
      {activeTab === 'radar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Radar Chart SVG */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-xl border border-slate-800/70">
            <svg width="260" height="260" viewBox="0 0 260 260" className="overflow-visible">
              {/* Concentric Polygonal Background Grids (25%, 50%, 75%, 100%) */}
              {[0.25, 0.5, 0.75, 1.0].map((level, lIndex) => {
                const ringPoints = DIMENSION_CONFIGS.map((_, i) => {
                  const angle = (i * 40 - 90) * (Math.PI / 180);
                  const r = level * radarRadius;
                  return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
                }).join(' ');

                return (
                  <polygon
                    key={lIndex}
                    points={ringPoints}
                    fill="none"
                    stroke="#334155"
                    strokeWidth="0.8"
                    strokeDasharray={level === 1 ? 'none' : '2,2'}
                  />
                );
              })}

              {/* Axis Rays */}
              {DIMENSION_CONFIGS.map((_, i) => {
                const angle = (i * 40 - 90) * (Math.PI / 180);
                const x2 = center + radarRadius * Math.cos(angle);
                const y2 = center + radarRadius * Math.sin(angle);
                return (
                  <line
                    key={i}
                    x1={center}
                    y1={center}
                    x2={x2}
                    y2={y2}
                    stroke="#1e293b"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Filled Relationship Polygon */}
              <polygon
                points={polygonPath}
                fill="url(#radarGradient)"
                stroke="#6366f1"
                strokeWidth="2"
                className="transition-all duration-500"
              />

              {/* Data points */}
              {radarPoints.map((p, idx) => (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r="3.5"
                  fill={p.cfg.color}
                  stroke="#0f172a"
                  strokeWidth="1.5"
                />
              ))}

              {/* Labels around perimeter */}
              {radarPoints.map((p, idx) => {
                const isTop = p.labelY < center - 20;
                const isBottom = p.labelY > center + 20;
                const textAnchor = Math.abs(p.labelX - center) < 15 ? 'middle' : p.labelX > center ? 'start' : 'end';

                return (
                  <g key={idx}>
                    <text
                      x={p.labelX}
                      y={p.labelY + (isTop ? -4 : isBottom ? 6 : 2)}
                      textAnchor={textAnchor}
                      fontSize="9.5"
                      fontWeight="600"
                      fill={p.cfg.color}
                      className="font-sans select-none"
                    >
                      {p.cfg.label}
                    </text>
                    <text
                      x={p.labelX}
                      y={p.labelY + (isTop ? 6 : isBottom ? 16 : 12)}
                      textAnchor={textAnchor}
                      fontSize="8"
                      fill="#94a3b8"
                      className="font-mono select-none"
                    >
                      {p.cfg.isBipolar ? (p.rawVal > 0 ? `+${p.rawVal}` : p.rawVal) : p.rawVal}
                    </text>
                  </g>
                );
              })}

              {/* SVG Gradient */}
              <defs>
                <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.2" />
                </radialGradient>
              </defs>
            </svg>
            <div className="mt-2 text-[10px] text-slate-500 font-mono text-center">
              雷达涵盖 9 个维度：熟识/信任/好感/敬意/吸引/竞争/怨恨/嫉妒/依赖
            </div>
          </div>

          {/* Quick Metrics Breakdown Beside Radar */}
          <div className="lg:col-span-5 space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              <span>核心维度态势解析</span>
            </h4>

            <div className="space-y-2">
              {DIMENSION_CONFIGS.slice(0, 5).map(cfg => {
                const rawVal = rel[cfg.key] ?? 0;
                const normVal = getDimensionNormalized(cfg);

                return (
                  <div key={cfg.key} className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-slate-300">
                        <span style={{ color: cfg.color }}>{cfg.icon}</span>
                        <span>{cfg.label}</span>
                      </span>
                      <span className="font-mono font-bold" style={{ color: cfg.color }}>
                        {cfg.isBipolar ? (rawVal > 0 ? `+${rawVal}` : rawVal) : rawVal}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${normVal}%`,
                          backgroundColor: cfg.color
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/30 text-[11px] text-indigo-300 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
              <div>
                <span className="font-semibold text-white">心理机制联动：</span>
                {rel.affection > 50 && rel.trust < 0 ? (
                  <span>呈现“喜欢但不完全信任”的复杂纠结心态。</span>
                ) : rel.respect > 50 && rel.rivalry > 40 ? (
                  <span>呈现“惺惺相惜的强力竞争者”心态。</span>
                ) : rel.resentment > 40 ? (
                  <span>存在往昔分歧留存的心结，需正面合作方可逐步化解。</span>
                ) : (
                  <span>关系随小镇日常交谈、突发事件与性格契合度自发演进。</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bars View */}
      {activeTab === 'bars' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DIMENSION_CONFIGS.map(cfg => {
              const rawVal = rel[cfg.key] ?? 0;
              const normVal = getDimensionNormalized(cfg);

              return (
                <div
                  key={cfg.key}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="p-1 rounded-md"
                        style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
                      >
                        {cfg.icon}
                      </span>
                      <div>
                        <span className="font-semibold text-slate-200">{cfg.label}</span>
                        <span className="text-[10px] text-slate-500 font-mono ml-1.5">
                          ({cfg.enLabel})
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-sm" style={{ color: cfg.color }}>
                        {cfg.isBipolar ? (rawVal > 0 ? `+${rawVal}` : rawVal) : rawVal}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {cfg.isBipolar ? '-100 ~ +100' : '0 ~ 100'}
                      </span>
                    </div>
                  </div>

                  {/* Visual Bar */}
                  {cfg.isBipolar ? (
                    // Centered bipolar bar (-100 to +100)
                    <div className="relative w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      {/* Zero marker */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-600 z-10" />
                      {rawVal >= 0 ? (
                        <div
                          className={`absolute top-0 bottom-0 left-1/2 ${cfg.positiveColor} transition-all duration-300`}
                          style={{ width: `${(rawVal / 100) * 50}%` }}
                        />
                      ) : (
                        <div
                          className={`absolute top-0 bottom-0 ${cfg.negativeColor} transition-all duration-300`}
                          style={{
                            right: '50%',
                            width: `${(Math.abs(rawVal) / 100) * 50}%`
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    // Standard unipolar bar (0 to 100)
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300`}
                        style={{
                          width: `${normVal}%`,
                          backgroundColor: cfg.color
                        }}
                      />
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 italic">
                    {cfg.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline View (Relationship History) */}
      {activeTab === 'timeline' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-slate-300">
              重大关系编年史与演化日志 (共 {rel.history?.length || 0} 条沉淀记录)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              最新重大事件置顶
            </span>
          </div>

          {(!rel.history || rel.history.length === 0) ? (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
              暂无深度关系事件记录，当两位居民在小镇中开展对话或共同参与事件后将在此沉淀。
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {rel.history.map((entry, idx) => {
                const hasTransition = Boolean(entry.stageTransition);
                const fromStage = entry.stageTransition ? STAGE_CONFIG[entry.stageTransition.from] : null;
                const toStage = entry.stageTransition ? STAGE_CONFIG[entry.stageTransition.to] : null;

                return (
                  <div
                    key={entry.id || idx}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800/60 text-indigo-300 font-mono text-[10px] font-semibold">
                          Day {entry.simDay} · {entry.simTime}
                        </span>
                        <span className="font-semibold text-slate-100">
                          {entry.event}
                        </span>
                      </div>

                      {hasTransition && fromStage && toStage && (
                        <div className="flex items-center gap-1.5 text-[10px] font-mono self-start sm:self-auto">
                          <span className={`px-1.5 py-0.5 rounded border ${fromStage.badgeBg} ${fromStage.badgeText} ${fromStage.badgeBorder}`}>
                            {fromStage.label}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className={`px-1.5 py-0.5 rounded border ${toStage.badgeBg} ${toStage.badgeText} ${toStage.badgeBorder} font-bold`}>
                            {toStage.label}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Dimension changes tags */}
                    {entry.dimensionChanges && Object.keys(entry.dimensionChanges).length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {Object.entries(entry.dimensionChanges).map(([dKey, dVal]) => {
                          if (dVal === 0 || dVal === undefined) return null;
                          const cfg = DIMENSION_CONFIGS.find(c => c.key === dKey);
                          const isPos = (dVal as number) > 0;
                          return (
                            <span
                              key={dKey}
                              className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-medium border ${
                                isPos
                                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
                                  : 'bg-rose-950/40 text-rose-400 border-rose-800/50'
                              }`}
                            >
                              {cfg?.label || dKey}: {isPos ? `+${dVal}` : dVal}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Reason */}
                    {entry.reason && (
                      <p className="text-[11px] text-slate-400 italic bg-slate-900/50 p-2 rounded-lg border border-slate-800/50">
                        💬 变化原因: {entry.reason}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
