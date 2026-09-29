import React, { useState } from 'react';
import { InteractionRecord, Agent } from '../types/town';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Heart, 
  Flame, 
  Coffee, 
  BrainCircuit, 
  Clock, 
  MapPin, 
  ArrowRight,
  Database,
  Check
} from 'lucide-react';

interface LiveInteractionsViewProps {
  interactions: InteractionRecord[];
  agents: Agent[];
  onSelectAgent: (id: string) => void;
  onOpenFineTuningExport: () => void;
}

export const LiveInteractionsView: React.FC<LiveInteractionsViewProps> = ({
  interactions,
  agents,
  onSelectAgent,
  onOpenFineTuningExport
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('all');
  const [selectedSentimentFilter, setSelectedSentimentFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(interactions[0]?.id || null);

  const filteredInteractions = interactions.filter(i => {
    const matchesSearch = 
      i.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.participantNames.some(name => name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      i.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAgent = 
      selectedAgentFilter === 'all' || 
      i.participants.includes(selectedAgentFilter);

    const matchesSentiment = 
      selectedSentimentFilter === 'all' || 
      i.sentiment === selectedSentimentFilter;

    return matchesSearch && matchesAgent && matchesSentiment;
  });

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Heart className="w-3 h-3" /> 和睦温馨
          </span>
        );
      case 'deep':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <BrainCircuit className="w-3 h-3" /> 深度研讨
          </span>
        );
      case 'conflict':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Flame className="w-3 h-3" /> 观念争辩
          </span>
        );
      case 'collaborative':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Coffee className="w-3 h-3" /> 协作交流
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
            中性闲聊
          </span>
        );
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 text-[#f8f2e7] max-w-7xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#344672]/30">
        <div>
          <h2 className="text-xl font-bold text-[#f8f2e7] tracking-tight flex items-center gap-2">
            <span>小镇心声与实时交谈实录</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#ffb86b]/15 text-[#ffc97a] border border-[#ffb86b]/30 font-mono">
              Live Encounters
            </span>
          </h2>
          <p className="text-xs text-[#c9c5d1] mt-1">
            追踪居民间的自主交谈实录、情感微表情、话题演化及好感度流动轨迹
          </p>
        </div>

        <button
          onClick={onOpenFineTuningExport}
          className="game-btn-secondary px-4 py-2 rounded-xl text-xs flex items-center gap-2 self-start md:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-[#ffc97a]" />
          <span>导出物语训练集 (JSONL)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 game-panel p-3.5">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[#8f93a8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="搜索话题、居民姓名或偶遇地点..."
            className="w-full bg-[#17223b] border border-[#344672]/40 rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#f8f2e7] placeholder-[#8f93a8] focus:outline-none focus:border-[#ffc97a]/50 transition"
          />
        </div>

        {/* Agent Filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-[#8f93a8]" />
          <select
            value={selectedAgentFilter}
            onChange={e => setSelectedAgentFilter(e.target.value)}
            className="bg-[#17223b] border border-[#344672]/40 rounded-xl px-2.5 py-1.5 text-xs text-[#f8f2e7] focus:outline-none focus:border-[#ffc97a]/50 transition"
          >
            <option value="all">所有居民</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
            ))}
          </select>
        </div>

        {/* Sentiment Filter */}
        <div>
          <select
            value={selectedSentimentFilter}
            onChange={e => setSelectedSentimentFilter(e.target.value)}
            className="bg-[#17223b] border border-[#344672]/40 rounded-xl px-2.5 py-1.5 text-xs text-[#f8f2e7] focus:outline-none focus:border-[#ffc97a]/50 transition"
          >
            <option value="all">全部情感基调</option>
            <option value="positive">和睦温馨</option>
            <option value="deep">深度研讨</option>
            <option value="conflict">观念争辩</option>
            <option value="collaborative">协作交流</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-mono ml-auto">
          匹配到 <span className="text-slate-200 font-semibold">{filteredInteractions.length}</span> 条交互
        </div>
      </div>

      {/* Interactions Feed */}
      <div className="space-y-4">
        {filteredInteractions.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500 text-xs">
            没有找到符合筛选条件的交互记录
          </div>
        ) : (
          filteredInteractions.map(record => {
            const isExpanded = expandedId === record.id;

            return (
              <div
                key={record.id}
                className="game-panel overflow-hidden transition hover:border-[#ffc97a]/40 shadow-sm"
              >
                {/* Collapsed Header / Summary Card */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : record.id)}
                  className="p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#202b46]/50 hover:bg-[#273552]/60 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#2a385c] border border-white/10 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4 text-[#ffc97a]" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-[#f8f2e7]">
                          {record.topic}
                        </span>
                        {getSentimentBadge(record.sentiment)}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#c9c5d1] mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#ffc97a]" />
                          <span>{record.location}</span>
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-[#8f93a8]" />
                          <span>第 {record.simDay} 天 {record.simTime}</span>
                        </span>
                        <span>·</span>
                        <span className="text-[#fff1d6] font-semibold">
                          {record.participantNames.join(' 与 ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-auto">
                    {/* Affinity Impact Preview */}
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      {Object.entries(record.relationshipImpact || {}).map(([agentId, impact]) => {
                        const agent = agents.find(a => a.id === agentId);
                        const isPositive = impact.deltaAffinity >= 0;
                        return (
                          <span
                            key={agentId}
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              isPositive
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {agent?.name || '居民'}: {isPositive ? `+${impact.deltaAffinity}` : impact.deltaAffinity}
                          </span>
                        );
                      })}
                    </div>

                    <div className="text-slate-400 p-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details: Full Dialogue Transcript & Cognition */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-800 bg-slate-950/50 space-y-4">
                    {/* One-sentence executive narrative */}
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
                      <span className="text-slate-500 font-mono uppercase mr-2">【对话概要】</span>
                      {record.summary}
                    </div>

                    {/* Chat Bubble Transcript */}
                    <div className="space-y-3 pl-2">
                      <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-blue-400" />
                        <span>完整互动原录逐句追踪</span>
                      </div>

                      {record.messages?.map((msg, idx) => {
                        const isFirstSpeaker = msg.speakerId === record.participants[0];
                        const speakerAgent = agents.find(a => a.id === msg.speakerId);

                        return (
                          <div
                            key={idx}
                            className={`flex flex-col ${isFirstSpeaker ? 'items-start' : 'items-end'}`}
                          >
                            <div className="flex items-center gap-2 mb-1 text-[11px] text-slate-400">
                              <span 
                                onClick={() => onSelectAgent(msg.speakerId)}
                                className="font-semibold text-slate-200 hover:text-blue-400 cursor-pointer transition"
                              >
                                {msg.speakerName}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">
                                情感: {msg.emotion}
                              </span>
                            </div>

                            <div
                              className={`max-w-[85%] sm:max-w-[70%] p-3 rounded-2xl text-xs leading-relaxed ${
                                isFirstSpeaker
                                  ? 'bg-slate-800/90 text-slate-100 rounded-tl-sm border border-slate-700/60'
                                  : 'bg-blue-600/20 text-blue-100 rounded-tr-sm border border-blue-500/30'
                              }`}
                            >
                              {msg.text}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Relationship Impact & Memory Generation */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                      {Object.entries(record.relationshipImpact || {}).map(([agentId, impact]) => {
                        const agent = agents.find(a => a.id === agentId);
                        return (
                          <div
                            key={agentId}
                            className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs"
                          >
                            <div className="font-medium text-slate-200">
                              {agent?.name} 心理回响：
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">
                              好感度变动: <b className={impact.deltaAffinity >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {impact.deltaAffinity >= 0 ? `+${impact.deltaAffinity}` : impact.deltaAffinity}
                              </b>
                              {impact.note && ` (${impact.note})`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
