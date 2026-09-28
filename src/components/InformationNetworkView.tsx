import React, { useState, useMemo } from 'react';
import { 
  Agent, 
  AgentKnowledge, 
  InformationType, 
  KnowledgeSourceType 
} from '../types/town';
import { 
  INFO_TYPE_CONFIG, 
  SOURCE_TYPE_LABELS 
} from '../systems/InformationSystem';
import { 
  Radio, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Search, 
  Plus, 
  Filter, 
  Share2, 
  Eye, 
  ShieldAlert, 
  MessageSquareWarning, 
  TrendingUp, 
  Sparkles,
  Users,
  Clock,
  HelpCircle
} from 'lucide-react';
import { soundEngine } from '../utils/audioSystem';

interface InformationNetworkViewProps {
  knowledgeItems: AgentKnowledge[];
  agents: Agent[];
  simDay: number;
  simTime: string;
  onInjectKnowledge: (newKnowledge: AgentKnowledge) => void;
  onDebunkRumor: (knowledgeId: string, debunkNote: string) => void;
  onSelectAgent: (agentId: string) => void;
}

export const InformationNetworkView: React.FC<InformationNetworkViewProps> = ({
  knowledgeItems,
  agents,
  simDay,
  simTime,
  onInjectKnowledge,
  onDebunkRumor,
  onSelectAgent
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | InformationType>('all');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState<string>(
    knowledgeItems[0]?.id || ''
  );
  const [isInjectModalOpen, setIsInjectModalOpen] = useState(false);

  // New Knowledge Injection State
  const [injectSubject, setInjectSubject] = useState('');
  const [injectContent, setInjectContent] = useState('');
  const [injectType, setInjectType] = useState<InformationType>('rumor');
  const [injectSourceAgentId, setInjectSourceAgentId] = useState(agents[0]?.id || '');
  const [injectIsSecret, setInjectIsSecret] = useState(false);

  // Filtered knowledge list
  const filteredItems = useMemo(() => {
    return knowledgeItems.filter(item => {
      if (activeFilter !== 'all' && item.infoType !== activeFilter) {
        return false;
      }
      if (selectedAgentFilter !== 'all') {
        const knows = item.propagationChain.some(n => n.agentId === selectedAgentFilter);
        if (!knows) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSubj = item.subject.toLowerCase().includes(q);
        const matchContent = item.content.toLowerCase().includes(q);
        const matchOrig = item.originalContent.toLowerCase().includes(q);
        const matchSender = item.originalSourceAgentName?.toLowerCase().includes(q);
        if (!matchSubj && !matchContent && !matchOrig && !matchSender) return false;
      }
      return true;
    });
  }, [knowledgeItems, activeFilter, selectedAgentFilter, searchQuery]);

  const activeKnowledge = useMemo(() => {
    return knowledgeItems.find(k => k.id === selectedKnowledgeId) || filteredItems[0] || knowledgeItems[0];
  }, [knowledgeItems, selectedKnowledgeId, filteredItems]);

  // Statistics
  const stats = useMemo(() => {
    const total = knowledgeItems.length;
    const rumors = knowledgeItems.filter(k => k.infoType === 'rumor').length;
    const secrets = knowledgeItems.filter(k => k.isSecret).length;
    const beliefs = knowledgeItems.filter(k => k.infoType === 'belief').length;
    const avgAccuracy = total > 0 
      ? Math.round(knowledgeItems.reduce((acc, k) => acc + k.accuracy, 0) / total) 
      : 100;
    const totalHops = knowledgeItems.reduce((acc, k) => acc + (k.propagationChain.length - 1), 0);

    return { total, rumors, secrets, beliefs, avgAccuracy, totalHops };
  }, [knowledgeItems]);

  const handleCreateInjection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!injectSubject.trim() || !injectContent.trim()) return;

    const sourceAgent = agents.find(a => a.id === injectSourceAgentId) || agents[0];
    const newId = `info-custom-${Date.now()}`;

    const newKnowledge: AgentKnowledge = {
      id: newId,
      subject: injectSubject.trim(),
      content: injectContent.trim(),
      infoType: injectType,
      sourceAgentId: sourceAgent.id,
      sourceType: injectType === 'rumor' ? 'told_by_other' : 'direct_observation',
      confidence: injectType === 'rumor' ? 75 : 95,
      accuracy: injectType === 'rumor' ? 35 : 90,
      importance: 75,
      isSecret: injectIsSecret,
      createdAt: {
        simDay,
        simTime,
        timestamp: Date.now()
      },
      spreadCount: 0,
      originalSourceAgentId: sourceAgent.id,
      originalSourceAgentName: sourceAgent.name,
      originalContent: injectContent.trim(),
      propagationChain: [
        {
          agentId: sourceAgent.id,
          agentName: sourceAgent.name,
          simDay,
          simTime,
          content: injectContent.trim(),
          believed: true,
          confidence: 90,
          reason: '作为消息发起者亲自散播或萌生此想法'
        }
      ],
      believedByAgentIds: [sourceAgent.id],
      disbelievedByAgentIds: []
    };

    onInjectKnowledge(newKnowledge);
    setSelectedKnowledgeId(newId);
    setIsInjectModalOpen(false);
    setInjectSubject('');
    setInjectContent('');
    soundEngine.playChime();
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-6 space-y-6 text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>小镇情报网络与流言溯源演化追踪</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
              Rumor & Secret Timeline
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            打破全知视角：每个居民仅知亲历与耳闻。实时追踪真实事实、机密泄露、添油加醋与群体信服演进
          </p>
        </div>

        <button
          onClick={() => {
            setIsInjectModalOpen(true);
            soundEngine.playClick();
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-semibold shadow-md shadow-amber-950/40 transition active:scale-95 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>注入新传闻 / 机密秘密</span>
        </button>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 font-mono block">活跃情报总数</span>
          <span className="text-lg font-bold font-mono text-white">{stats.total}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/40 space-y-1">
          <span className="text-[10px] text-amber-400/80 font-mono block flex items-center gap-1">
            <span>🗣️ 扩散中流言</span>
          </span>
          <span className="text-lg font-bold font-mono text-amber-400">{stats.rumors}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/40 space-y-1">
          <span className="text-[10px] text-purple-400/80 font-mono block flex items-center gap-1">
            <span>🔒 托付中秘密</span>
          </span>
          <span className="text-lg font-bold font-mono text-purple-300">{stats.secrets}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-800/40 space-y-1">
          <span className="text-[10px] text-sky-400/80 font-mono block flex items-center gap-1">
            <span>🧭 主观信念</span>
          </span>
          <span className="text-lg font-bold font-mono text-sky-300">{stats.beliefs}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 font-mono block">平均事实保真率</span>
          <span className="text-lg font-bold font-mono text-emerald-400">{stats.avgAccuracy}%</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 font-mono block">累计人际传播跳数</span>
          <span className="text-lg font-bold font-mono text-indigo-400">{stats.totalHops} 次</span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Knowledge List & Filters */}
        <div className="lg:col-span-5 space-y-3">
          {/* Search & Type Filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="搜索传闻主题、内容或初始来源..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Type Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
                  activeFilter === 'all'
                    ? 'bg-slate-700 text-white font-medium'
                    : 'bg-slate-900/90 text-slate-400 hover:text-slate-200'
                }`}
              >
                全部 ({knowledgeItems.length})
              </button>
              {(['rumor', 'secret', 'knowledge', 'belief'] as InformationType[]).map(t => {
                const cfg = INFO_TYPE_CONFIG[t];
                const count = knowledgeItems.filter(k => k.infoType === t).length;
                return (
                  <button
                    key={t}
                    onClick={() => setActiveFilter(t)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition shrink-0 ${
                      activeFilter === t
                        ? 'bg-indigo-600 text-white font-medium shadow-sm'
                        : 'bg-slate-900/90 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{cfg.icon}</span>
                    <span>{cfg.label}</span>
                    <span className="text-[10px] opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Agent Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs">
              <span className="text-[11px] text-slate-500 shrink-0 flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>知情居民:</span>
              </span>
              <button
                onClick={() => setSelectedAgentFilter('all')}
                className={`px-2 py-0.5 rounded text-[11px] shrink-0 transition ${
                  selectedAgentFilter === 'all'
                    ? 'bg-indigo-950 text-indigo-300 border border-indigo-700 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                全镇
              </button>
              {agents.map(a => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAgentFilter(a.id)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] shrink-0 transition ${
                    selectedAgentFilter === a.id
                      ? 'bg-indigo-950 text-indigo-300 border border-indigo-700 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: a.spriteColor || '#3b82f6' }}
                  />
                  <span>{a.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                没有找到符合条件的情报或传闻
              </div>
            ) : (
              filteredItems.map(item => {
                const isSelected = item.id === activeKnowledge?.id;
                const typeCfg = INFO_TYPE_CONFIG[item.infoType];
                const hasMutated = item.originalContent !== item.content;
                const hopsCount = item.propagationChain.length - 1;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedKnowledgeId(item.id);
                      soundEngine.playClick();
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition space-y-2 ${
                      isSelected
                        ? 'bg-slate-900/90 border-indigo-500 shadow-md ring-1 ring-indigo-500/20'
                        : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/70'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${typeCfg.badgeBg} ${typeCfg.badgeText} ${typeCfg.badgeBorder}`}>
                          {typeCfg.icon} {typeCfg.label}
                        </span>
                        {item.isSecret && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/70 text-purple-300 border border-purple-800/50 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" />
                            <span>机密</span>
                          </span>
                        )}
                        {hasMutated && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/50">
                            ⚠️ 已发生曲解失真
                          </span>
                        )}
                        {item.isDebunked && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/50">
                            🛡️ 已官方辟谣
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] font-mono text-slate-500">
                        {hopsCount > 0 ? `经 ${hopsCount} 人传递` : '尚未外传'}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-100 line-clamp-1">
                      {item.subject}
                    </h4>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {item.content}
                    </p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/60">
                      <span>初始源: {item.originalSourceAgentName}</span>
                      <div className="flex items-center gap-2">
                        <span className={item.accuracy < 50 ? 'text-rose-400' : 'text-emerald-400'}>
                          保真: {item.accuracy}%
                        </span>
                        <span className="text-slate-400">
                          信者: {item.believedByAgentIds.length}人
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Rumor Timeline & Propagation Node Chain */}
        <div className="lg:col-span-7 space-y-4">
          {activeKnowledge ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
              {/* Card Header */}
              <div className="space-y-3 pb-4 border-b border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${INFO_TYPE_CONFIG[activeKnowledge.infoType].badgeBg} ${INFO_TYPE_CONFIG[activeKnowledge.infoType].badgeText} ${INFO_TYPE_CONFIG[activeKnowledge.infoType].badgeBorder}`}>
                      {INFO_TYPE_CONFIG[activeKnowledge.infoType].icon} {INFO_TYPE_CONFIG[activeKnowledge.infoType].label}
                    </span>
                    {activeKnowledge.isSecret && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1 font-semibold">
                        <Lock className="w-3 h-3" />
                        <span>隐私秘密 (限制传播)</span>
                      </span>
                    )}
                    {activeKnowledge.isDebunked && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>真相已大白 (已辟谣)</span>
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-mono text-slate-400">
                    发源于: Day {activeKnowledge.createdAt.simDay} · {activeKnowledge.createdAt.simTime}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white tracking-tight">
                  {activeKnowledge.subject}
                </h3>

                {/* Current Active Content Callout */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
                    当前小镇流传版本 (Current Mutated Version)
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-sans font-medium">
                    “{activeKnowledge.content}”
                  </p>
                </div>

                {/* Original Content Diff Callout if Mutated */}
                {activeKnowledge.originalContent !== activeKnowledge.content && (
                  <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 space-y-1">
                    <span className="text-[10px] font-mono text-amber-400 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>对比：初始亲历事实 (Original Truth Baseline)</span>
                    </span>
                    <p className="text-xs text-amber-200/90 italic">
                      “{activeKnowledge.originalContent}”
                    </p>
                  </div>
                )}

                {/* Debunk Callout if Debunked */}
                {activeKnowledge.debunkNote && (
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 space-y-1">
                    <span className="font-bold flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>亲历者真相澄清：</span>
                    </span>
                    <p>{activeKnowledge.debunkNote}</p>
                  </div>
                )}

                {/* Quantitative Gauges */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">事实保真度</span>
                      <span className={`font-mono font-bold ${activeKnowledge.accuracy < 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {activeKnowledge.accuracy}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${activeKnowledge.accuracy < 50 ? 'bg-rose-500' : 'bg-emerald-400'}`}
                        style={{ width: `${activeKnowledge.accuracy}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">话题关注度</span>
                      <span className="font-mono font-bold text-amber-400">
                        {activeKnowledge.importance}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${activeKnowledge.importance}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">已扩散人次</span>
                      <span className="font-mono font-bold text-indigo-400">
                        {activeKnowledge.propagationChain.length} 人知晓
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-400 rounded-full"
                        style={{ width: `${Math.min(100, (activeKnowledge.propagationChain.length / agents.length) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Propagation Timeline Chain (传播溯源时序流) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>传声筒时序链 (Propagation Chain Timeline)</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    追踪每次传递、曲解与心理态度
                  </span>
                </div>

                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-900/60">
                  {activeKnowledge.propagationChain.map((node, index) => {
                    const agentObj = agents.find(a => a.id === node.agentId);
                    const isOrigin = index === 0;

                    return (
                      <div key={index} className="relative group">
                        {/* Dot on line */}
                        <div
                          className={`absolute -left-[23px] top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center text-[8px] font-bold ${
                            isOrigin
                              ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-500/30'
                              : node.mutationNote
                                ? 'bg-amber-600 border-amber-400 text-white animate-pulse'
                                : 'bg-slate-900 border-indigo-500 text-indigo-300'
                          }`}
                        >
                          {index + 1}
                        </div>

                        {/* Node Card */}
                        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-slate-700 transition space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: agentObj?.spriteColor || '#6366f1' }}
                              />
                              <span
                                onClick={() => onSelectAgent(node.agentId)}
                                className="font-bold text-slate-100 hover:text-indigo-400 cursor-pointer underline-offset-2 hover:underline"
                              >
                                {node.agentName}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                ({agentObj?.role || '小镇居民'})
                              </span>

                              {isOrigin ? (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                                  消息源头
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                  <span>听自</span>
                                  <span className="text-slate-200 font-semibold">{node.receivedFromAgentName}</span>
                                </span>
                              )}
                            </div>

                            <span className="text-[10px] font-mono text-slate-500">
                              Day {node.simDay} · {node.simTime}
                            </span>
                          </div>

                          {/* Content at this step */}
                          <div className="text-xs text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                            “{node.content}”
                          </div>

                          {/* Mutation alert if any */}
                          {node.mutationNote && (
                            <div className="text-[11px] text-amber-300 bg-amber-950/40 p-2 rounded-lg border border-amber-800/40 flex items-start gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
                              <span>发生失真偏差：{node.mutationNote}</span>
                            </div>
                          )}

                          {/* Belief Status & Psychological rationale */}
                          <div className="flex items-center justify-between text-[11px] pt-1">
                            <div className="flex items-center gap-1.5">
                              {node.believed ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 flex items-center gap-1 font-semibold text-[10px]">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>采信认可 ({node.confidence}%)</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800/50 flex items-center gap-1 font-semibold text-[10px]">
                                  <XCircle className="w-3 h-3" />
                                  <span>心存怀疑 ({node.confidence}%)</span>
                                </span>
                              )}
                            </div>

                            <span className="text-[11px] text-slate-400 italic">
                              💬 {node.reason}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Public Opinion Matrix (谁相信 vs 谁不相信 vs 谁不知晓) */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>全镇居民态度全景矩阵 (Public Opinion & Secrecy Scope)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Believers */}
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/30 space-y-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>采信此消息 ({activeKnowledge.believedByAgentIds.length})</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeKnowledge.believedByAgentIds.map(aId => {
                        const a = agents.find(ag => ag.id === aId);
                        return (
                          <span
                            key={aId}
                            onClick={() => onSelectAgent(aId)}
                            className="text-[11px] px-2 py-1 rounded-lg bg-emerald-900/30 border border-emerald-700/40 text-emerald-200 cursor-pointer hover:bg-emerald-800/40 transition"
                          >
                            {a?.name || aId}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Skeptics */}
                  <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-800/30 space-y-2">
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>心存怀疑/反驳 ({activeKnowledge.disbelievedByAgentIds.length})</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeKnowledge.disbelievedByAgentIds.length === 0 ? (
                        <span className="text-[11px] text-slate-500 italic">暂无明确保留意见者</span>
                      ) : (
                        activeKnowledge.disbelievedByAgentIds.map(aId => {
                          const a = agents.find(ag => ag.id === aId);
                          return (
                            <span
                              key={aId}
                              onClick={() => onSelectAgent(aId)}
                              className="text-[11px] px-2 py-1 rounded-lg bg-rose-900/30 border border-rose-700/40 text-rose-200 cursor-pointer hover:bg-rose-800/40 transition"
                            >
                              {a?.name || aId}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* In the dark (Uninformed) */}
                  <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/60 space-y-2">
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>未曾听闻 (全然不知)</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {agents
                        .filter(a => !activeKnowledge.propagationChain.some(n => n.agentId === a.id))
                        .map(a => (
                          <span
                            key={a.id}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono"
                          >
                            {a.name}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Debunk Action Button if Rumor and not debunked */}
                {activeKnowledge.infoType === 'rumor' && !activeKnowledge.isDebunked && (
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-amber-200">
                      <span className="font-bold">纠偏与辟谣澄清机制：</span>
                      <span>可由初始亲历者公布第一手调查实录，遏制流言继续在小镇扩散。</span>
                    </div>

                    <button
                      onClick={() => {
                        const note = prompt('请输入辟谣澄清内容说明：', `${activeKnowledge.originalSourceAgentName || '亲历居民'}出面澄清：该传闻系严重添油加醋，实际情况完全可控，请大家勿信谣传谣。`);
                        if (note) {
                          onDebunkRumor(activeKnowledge.id, note);
                          soundEngine.playChime();
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition shrink-0"
                    >
                      发布官方辟谣
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 bg-slate-900/50 border border-slate-800 rounded-2xl text-xs">
              请从左侧列表选择一项情报或传闻查看其传播时序网络
            </div>
          )}
        </div>
      </div>

      {/* Modal: Inject Custom Knowledge / Rumor */}
      {isInjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>注入自定义小镇情报 / 流言 / 机密</span>
              </h3>
              <button
                onClick={() => setIsInjectModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInjection} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  情报标题 / 传闻主题
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：观星台地下疑似藏有发条密室"
                  value={injectSubject}
                  onChange={e => setInjectSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  具体内容描述
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="例如：昨夜微澜在维修工坊时听到了来自地底齿轮的轰鸣，据说是一条通往先民遗迹的通道..."
                  value={injectContent}
                  onChange={e => setInjectContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    初始获知居民 (Source Agent)
                  </label>
                  <select
                    value={injectSourceAgentId}
                    onChange={e => setInjectSourceAgentId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    信息性质分类
                  </label>
                  <select
                    value={injectType}
                    onChange={e => setInjectType(e.target.value as InformationType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="rumor">🗣️ 流言蜚语 (容易失真变异)</option>
                    <option value="secret">🔒 隐私秘密 (仅向信任者透露)</option>
                    <option value="knowledge">💡 客观事实 (高确信度)</option>
                    <option value="belief">🧭 主观信念 (主观哲学)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="secretCheck"
                  checked={injectIsSecret}
                  onChange={e => setInjectIsSecret(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="secretCheck" className="text-slate-300 cursor-pointer">
                  标记为隐私机密（居民仅在信任度高时才会向他人吐露）
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow transition"
                >
                  确认注入小镇
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
