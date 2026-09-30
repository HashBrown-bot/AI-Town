import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Users, ArrowUpRight, X, MessageSquare, MapPin, ChevronRight, Target, PanelRightClose, PanelRightOpen, ArrowLeft, Navigation, Activity, Check, Flag, Sparkles } from 'lucide-react';
import { Agent, Building, ActiveInteractionBubble, InteractionRecord, TownEvent } from '../types/town';
import { TownCanvas } from './TownCanvas';
import { Observation, attentionReasons, currentAction, generationLabel, locationLabel, readableMotivation, residentStatus } from '../utils/observation';

interface TownWorkspaceProps {
  agents: Agent[];
  buildings: Building[];
  interactions: InteractionRecord[];
  events: TownEvent[];
  observations: Observation[];
  selectedAgentId: string | null;
  selectedBuildingId: string | null;
  onSelectAgent: (id: string | null) => void;
  onSelectBuilding: (id: string | null) => void;
  onOpenAgent: (id: string) => void;
  onForceInteraction: (id: string) => void;
  onOpenDialogues: () => void;
  activeInteractions: ActiveInteractionBubble[];
  simDay: number;
  simHour: number;
  simMinute: number;
  simSpeed: number;
  weather: 'clear' | 'golden_sunset' | 'rainy' | 'starry_night' | 'misty_morning';
}

type FeedKind = Observation['kind'] | 'dialogue' | 'event';
interface FeedItem {
  id: string; kind: FeedKind; timestamp: number; time: string; title: string; detail: string;
  agentIds: string[]; changes: string[]; source?: string; messages?: InteractionRecord['messages'];
}
const kindLabels: Record<FeedKind, string> = { goal: '目标', action: '行动', attention: '状态', dialogue: '对话', event: '事件' };
const kindIcons = { goal: Target, action: Check, attention: Activity, dialogue: MessageSquare, event: Flag };
const filters = [ { key: 'all', text: '全部' }, { key: 'moving', text: '移动中' }, { key: 'social', text: '交谈中' }, { key: 'attention', text: '需关注' } ] as const;
type ResidentFilter = typeof filters[number]['key'];

function Vital({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  const bounded = Math.max(0, Math.min(100, Math.round(value)));
  return <div className={`town-vital ${warning ? 'warning' : ''}`}><div><span>{label}</span><b>{bounded}<small>/100</small></b></div><meter min={0} max={100} value={bounded} aria-label={label}>{bounded}</meter></div>;
}

function FeedCard({ item, onSelect }: { item: FeedItem; onSelect: (id: string) => void }) {
  const Icon = kindIcons[item.kind];
  return <article className={`town-log-card log-${item.kind}`}>
    <div className="town-log-marker"><Icon size={15} /></div>
    <div className="town-log-content">
      <div className="town-log-meta"><span>{kindLabels[item.kind]}</span><time>{item.time}</time></div>
      <h3>{item.title}</h3><p className="town-log-summary">{item.detail}</p>
      {item.kind === 'goal' && item.changes.length > 0 && <p className="town-log-reason">{item.changes.map(readableMotivation).join(' · ')}</p>}
      {item.kind !== 'goal' && item.changes.length > 0 && <div className="town-change-chips" aria-label="该次更新的数值变化">{item.changes.map((change, index) => <span key={index}>{change}</span>)}</div>}
      <details className="town-log-details"><summary>查看详情 <ChevronRight size={13} /></summary>
        <p>{item.detail}</p>
        {item.kind === 'action' && item.changes.length > 0 && <small>数值为该次模拟更新的净变化，包含自然消耗。</small>}
        {item.source && <div className="town-source"><Sparkles size={12} />{item.source}</div>}
        {item.messages?.filter(message => typeof message.text === 'string' && message.text.trim()).map((message, index) => <p className="town-log-message" key={index}><b>{message.speakerName}</b>{message.text}</p>)}
        {item.agentIds.length > 0 && <button onClick={() => onSelect(item.agentIds[0])}>观察这位居民 <ArrowUpRight size={13} /></button>}
      </details>
    </div>
  </article>;
}

export const TownWorkspace: React.FC<TownWorkspaceProps> = props => {
  const { agents, buildings, interactions, observations, selectedAgentId, selectedBuildingId, onSelectAgent, onSelectBuilding, onOpenAgent, onForceInteraction, activeInteractions, simSpeed } = props;
  const [panel, setPanel] = useState<'residents' | 'activity'>('residents');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ResidentFilter>('all');
  const [kind, setKind] = useState<'all' | FeedKind>('all');
  const [person, setPerson] = useState('all');
  const [feedSnapshot, setFeedSnapshot] = useState<FeedItem[] | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [focusRequest, setFocusRequest] = useState<{ id: string; sequence: number } | null>(null);
  const detailRef = useRef<HTMLHeadingElement>(null);
  const mapRef = useRef<HTMLElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const selected = agents.find(agent => agent.id === selectedAgentId);
  const selectedBuilding = buildings.find(building => building.id === selectedBuildingId);
  const selectedBubble = activeInteractions.find(item => item.agentAId === selectedAgentId || item.agentBId === selectedAgentId);
  const moving = agents.filter(agent => agent.isMoving).length;
  const attention = agents.filter(agent => attentionReasons(agent).length > 0).length;
  const social = activeInteractions.length;
  const filtered = agents.filter(agent => {
    const matches = `${agent.name} ${agent.role} ${agent.currentActivity} ${agent.goal?.title || ''}`.toLowerCase().includes(search.trim().toLowerCase());
    return matches && (filter === 'all' || (filter === 'moving' ? agent.isMoving : filter === 'attention' ? attentionReasons(agent).length > 0 : activeInteractions.some(item => item.agentAId === agent.id || item.agentBId === agent.id)));
  });
  const feed = useMemo<FeedItem[]>(() => [
    ...observations.map(item => ({ ...item, time: `第 ${item.simDay} 天 · ${item.simTime}`, agentIds: [item.agentId] })),
    ...interactions.slice(0, 120).map(record => ({ id: record.id, kind: 'dialogue' as const, timestamp: record.timestamp, time: `第 ${record.simDay} 天 · ${record.simTime}`, title: record.participantNames.join(' × '), detail: record.summary, agentIds: record.participants, changes: record.participants.flatMap((id, index) => { const impact = record.relationshipImpact?.[id]; return impact ? [`${record.participantNames[index]} 好感 ${impact.deltaAffinity > 0 ? '+' : ''}${impact.deltaAffinity}`] : []; }), source: generationLabel(record.generation), messages: record.messages })),
    ...props.events.map(event => ({ id: event.id, kind: 'event' as const, timestamp: event.timestamp, time: `${event.simDay ? `第 ${event.simDay} 天 · ` : ''}${event.simTime || '时间未记录'}`, title: event.title, detail: event.impactSummary || event.description, agentIds: [], changes: [] })),
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 180), [observations, interactions, props.events]);
  const matchesFeedFilter = (item: FeedItem) => (kind === 'all' || item.kind === kind) && (person === 'all' || item.agentIds.includes(person));
  const visibleFeed = (feedSnapshot || feed).filter(matchesFeedFilter);
  const snapshotIds = new Set((feedSnapshot || feed).map(item => `${item.kind}-${item.id}`));
  const newCount = feed.filter(item => matchesFeedFilter(item) && !snapshotIds.has(`${item.kind}-${item.id}`)).length;
  const residentFeed = selected ? feed.filter(item => item.agentIds.includes(selected.id)).slice(0, 3) : [];
  const action = selected && currentAction(selected);
  const completedSteps = selected?.plan?.steps.filter(step => step.status === 'completed').length || 0;
  const progress = selectedBubble ? selectedBubble.progress : action?.progress || 0;

  const selectAgent = (id: string | null, focus = false) => {
    onSelectAgent(id); onSelectBuilding(null);
    if (id) { setPanelOpen(true); setPanel('residents'); if (focus) setFocusRequest(previous => ({ id, sequence: (previous?.sequence || 0) + 1 })); }
  };
  const openActivity = (agentId = 'all') => { setPanelOpen(true); setPanel('activity'); setPerson(agentId); setFeedSnapshot(feed); };
  const selectFilter = (next: ResidentFilter) => { setPanelOpen(true); setPanel('residents'); onSelectAgent(null); setFilter(next); setSearch(''); };
  useEffect(() => {
    if (selectedAgentId && panel === 'residents') detailRef.current?.focus({ preventScroll: true });
  }, [selectedAgentId, panel]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedAgentId) { onSelectAgent(null); onSelectBuilding(null); }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [selectedAgentId, onSelectAgent, onSelectBuilding]);

  return <div className="town-workspace">
    <section ref={mapRef} className="town-map-section" aria-label="小镇地图">
      <div className="town-map-heading"><div><span className="town-eyebrow">AETHERIA / LIVE OBSERVATION</span><h2>看见生活的每一步<span className="town-heading-dot">.</span></h2><p>从居民的选择，到小镇的变化。</p></div><button className="town-icon-button town-panel-toggle" aria-label={panelOpen ? '收起侧栏' : '展开侧栏'} onClick={() => setPanelOpen(!panelOpen)}>{panelOpen ? <PanelRightClose size={19} /> : <PanelRightOpen size={19} />}</button></div>
      <div className="town-overview-strip" aria-label="实时小镇状态">
        <button onClick={() => selectFilter('all')}><Users size={17} /><span><b>{agents.length}</b> 位居民<small>自主生活</small></span><ChevronRight size={14} /></button>
        <button onClick={() => selectFilter('moving')}><Navigation size={17} /><span><b>{moving}</b> 正在移动<small>查看去向</small></span><ChevronRight size={14} /></button>
        <button onClick={() => selectFilter('social')}><MessageSquare size={17} /><span><b>{social}</b> 组交谈<small>观察交流</small></span><ChevronRight size={14} /></button>
        <button className={attention ? 'attention' : ''} onClick={() => selectFilter('attention')}><Activity size={17} /><span><b>{attention}</b> 需要关注<small>{attention ? '查看状态原因' : '状态平稳'}</small></span><ChevronRight size={14} /></button>
      </div>
      <div className="town-map-frame">
        <TownCanvas {...props} focusRequest={focusRequest} onSelectAgent={id => selectAgent(id)} />
        <div className="town-map-live"><i className={simSpeed === 0 ? 'paused' : ''} />{simSpeed === 0 ? '时间已暂停 · 可继续观察' : `实时观察 · ${simSpeed}×`}</div>
        {selected && <div className="town-map-selection"><span className="town-avatar" style={{ background: selected.spriteColor }}>{selected.name[0]}</span><div><b>{selected.name}</b><span>{locationLabel(selected, buildings)}</span></div><button aria-label="取消选中居民" onClick={() => selectAgent(null)}><X size={15} /></button></div>}
        {selectedBuilding && !selected && <div className="town-building-card"><button aria-label="关闭建筑信息" onClick={() => onSelectBuilding(null)}><X size={15} /></button><span><MapPin size={15} /> 地点</span><h3>{selectedBuilding.name}</h3><p>{selectedBuilding.description}</p></div>}
      </div>
      <footer className="town-map-footer"><span>拖动平移 · 滚轮缩放 · 点击观察</span><span>{buildings.length} 个地点 · Esc 取消选择</span></footer>
    </section>
    {panelOpen && <aside className="town-sidebar" aria-label="居民与动态">
      <div className="town-sidebar-tabs" role="tablist" aria-label="观察面板"><button role="tab" aria-selected={panel === 'residents'} className={panel === 'residents' ? 'active' : ''} onClick={() => setPanel('residents')}>居民 <span>{agents.length}</span></button><button role="tab" aria-selected={panel === 'activity'} className={panel === 'activity' ? 'active' : ''} onClick={() => openActivity()}>观察记录<span className="town-tab-dot" /></button></div>
      {panel === 'residents' && selected ? <div className="town-focus-panel" role="tabpanel" aria-label="居民观察">
        <button className="town-back-button" onClick={() => selectAgent(null)}><ArrowLeft size={14} />返回居民列表</button>
        <div className="town-focus-identity"><span className="town-avatar" style={{ background: selected.spriteColor }}>{selected.name[0]}</span><div><h3 ref={detailRef} tabIndex={-1}>{selected.name}</h3><p>{selected.role}</p></div><span className={`town-status ${residentStatus(selected, activeInteractions).tone}`}>{residentStatus(selected, activeInteractions).label}</span></div>
        <div className="town-focus-location"><MapPin size={14} /><span>{locationLabel(selected, buildings)}</span><button onClick={() => { setFocusRequest(previous => ({ id: selected.id, sequence: (previous?.sequence || 0) + 1 })); mapRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest' }); }}>定位 <Navigation size={12} /></button></div>
        {attentionReasons(selected).length > 0 && <div className="town-attention-note"><Activity size={14} />{attentionReasons(selected).join(' · ')}</div>}
        <section className="town-now-card" aria-label="当前行动"><div className="town-section-label"><span>正在做什么</span><small>{selectedBubble ? '交流优先 · 自主计划暂停' : selected.isMoving ? '路上' : action?.status === 'completed' ? '已完成' : '执行中'}</small></div><h4>{selectedBubble ? selectedBubble.topic : action?.description || selected.currentActivity}</h4>
          {selectedBubble?.currentSpeech && <p className="town-current-speech"><b>{selectedBubble.speakerName}</b>{selectedBubble.currentSpeech}</p>}
          {selectedBubble?.phase === 'generating' ? <p className="town-waiting" role="status"><span />正在准备对话，请稍候…</p> : selected.isMoving && !selectedBubble ? <p className="town-progress-caption">到达目的地后开始下一步行动</p> : <><div className="town-progress-track" role="progressbar" aria-label={selectedBubble ? '对话进度' : '当前行动进度'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span style={{ width: `${progress}%` }} /></div><div className="town-progress-caption"><span>{selectedBubble ? '对话播放' : '当前行动'}</span><b>{Math.round(progress)}%</b></div></>}
          {selectedBubble?.generation && <div className="town-source">{generationLabel(selectedBubble.generation)} · {(selectedBubble.generation.latencyMs / 1000).toFixed(1)} 秒</div>}
        </section>
        <section className="town-motivation" aria-label="行动原因"><div className="town-section-label"><span>为什么这样做</span><Target size={13} /></div><h4>{selected.goal?.title || selected.currentGoal || '尚未形成目标'}</h4><p>{readableMotivation(selected.goal?.motivation)}</p>
          {selected.plan && <details className="town-plan"><summary>行动计划<span>{completedSteps} / {selected.plan.steps.length} 已完成 <ChevronRight size={13} /></span></summary><ol>{selected.plan.steps.map(step => <li key={step.id} className={step.status}><span>{step.status === 'completed' ? <Check size={12} /> : <i />}</span><div>{step.description}<small>{step.status === 'completed' ? '已完成' : step.status === 'in_progress' ? '进行中' : '待执行'}</small></div></li>)}</ol></details>}
        </section>
        <div className="town-focus-vitals"><Vital label="心情" value={selected.psychologicalNeeds?.mood ?? selected.state.mood} /><Vital label="精力" value={selected.physicalNeeds?.energy ?? selected.state.energy} warning={(selected.physicalNeeds?.energy ?? selected.state.energy) < 25} /><Vital label="压力" value={selected.psychologicalNeeds?.stress ?? selected.state.stress} warning={(selected.psychologicalNeeds?.stress ?? selected.state.stress) > 75} /></div>
        <section className="town-resident-recent" aria-label="最近变化"><div className="town-section-label"><span>最近变化</span><button onClick={() => openActivity(selected.id)}>全部记录 <ArrowUpRight size={12} /></button></div>{residentFeed.length ? residentFeed.map(item => <div key={`${item.kind}-${item.id}`}><time>{item.time}</time><p>{item.kind === 'dialogue' ? item.detail : `${kindLabels[item.kind]}：${item.detail}`}</p>{item.changes.length > 0 && <small>{item.kind === 'goal' ? item.changes.map(readableMotivation).join(' · ') : item.changes.join(' · ')}</small>}</div>) : <p className="town-muted-note">还没有记录到变化。继续运行后，目标与行动会出现在这里。</p>}</section>
        <div className="town-focus-actions"><button onClick={() => onOpenAgent(selected.id)}>完整档案 <ArrowUpRight size={14} /></button><button disabled={!!selectedBubble || !agents.some(agent => agent.id !== selected.id && !activeInteractions.some(bubble => bubble.agentAId === agent.id || bubble.agentBId === agent.id))} onClick={() => onForceInteraction(selected.id)}><MessageSquare size={14} />{selectedBubble ? '交谈进行中' : '发起对话'}</button></div>
      </div> : panel === 'residents' ? <div className="town-residents-panel" role="tabpanel" aria-label="居民列表">
        <div className="town-list-heading"><h3>每个人都有自己的方向</h3><p>选择一位居民，观察目标与行动。</p></div>
        <div className="town-search"><Search size={16} /><input aria-label="搜索居民" placeholder="搜索姓名、职业或目标" value={search} onChange={event => setSearch(event.target.value)} />{search && <button aria-label="清空搜索" onClick={() => setSearch('')}><X size={14} /></button>}</div>
        <div className="town-resident-filters" aria-label="居民筛选">{filters.map(item => <button key={item.key} aria-pressed={filter === item.key} className={filter === item.key ? 'active' : ''} onClick={() => setFilter(item.key)}>{item.text}</button>)}<small>{filtered.length} 位</small></div>
        <div className="town-resident-list">{filtered.map(agent => { const status = residentStatus(agent, activeInteractions); return <button key={agent.id} className="town-resident-row" aria-label={`观察${agent.name}`} onClick={() => selectAgent(agent.id, true)}><span className="town-avatar" style={{ background: agent.spriteColor }}>{agent.name[0]}</span><span className="town-resident-row-text"><strong>{agent.name}<span className={`town-status ${status.tone}`}>{status.label}</span></strong><span title={agent.currentActivity}>{currentAction(agent)?.description || agent.currentActivity}</span><small><MapPin size={11} />{locationLabel(agent, buildings)}</small></span><ChevronRight size={15} /></button>; })}{filtered.length === 0 && <div className="town-empty"><Users size={24} /><p>没有符合条件的居民</p><button onClick={() => { setSearch(''); setFilter('all'); }}>显示全部居民</button></div>}</div>
      </div> : <div className="town-observation-panel" role="tabpanel" aria-label="观察记录">
        <div className="town-log-heading"><h3>变化，留下线索</h3><p>目标、行动与状态记录保留本次会话的最近 120 条。</p></div>
        <div className="town-log-filters"><label>类型<select aria-label="记录类型" value={kind} onChange={event => setKind(event.target.value as typeof kind)}><option value="all">全部变化</option>{Object.entries(kindLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>居民<select aria-label="记录居民" value={person} onChange={event => setPerson(event.target.value)}><option value="all">全部居民</option>{agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label></div>
        <div className="town-log-update"><span>{newCount ? `${newCount} 条新变化` : '阅读中，列表保持静止'}</span><button onClick={() => { setFeedSnapshot(feed); feedRef.current?.scrollTo({ top: 0 }); }} disabled={!newCount}>查看最新 <ArrowUpRight size={12} /></button></div>
        <div ref={feedRef} className="town-log-list">{visibleFeed.slice(0, 60).map(item => <FeedCard key={`${item.kind}-${item.id}`} item={item} onSelect={id => selectAgent(id, true)} />)}{!visibleFeed.length && <div className="town-empty"><Activity size={24} /><p>{newCount ? '新变化已到达' : '还没有符合条件的记录'}</p><small>{newCount ? '点击「查看最新」更新列表。' : '继续运行小镇，或调整筛选条件。'}</small></div>}<button className="town-all-dialogues" onClick={props.onOpenDialogues}>查看全部对话 <ArrowUpRight size={14} /></button></div>
      </div>}
    </aside>}
  </div>;
};
