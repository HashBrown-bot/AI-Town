import React, { useState } from 'react';
import { Search, Users, ArrowUpRight, X, MessageSquare, MapPin, ChevronRight, Heart, Target, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Agent, Building, ActiveInteractionBubble, InteractionRecord, TownEvent } from '../types/town';
import { TownCanvas } from './TownCanvas';

interface TownWorkspaceProps {
  agents: Agent[];
  buildings: Building[];
  interactions: InteractionRecord[];
  events: TownEvent[];
  selectedAgentId: string | null;
  selectedBuildingId: string | null;
  onSelectAgent: (id: string | null) => void;
  onSelectBuilding: (id: string | null) => void;
  onOpenAgent: (id: string) => void;
  onForceInteraction: (id: string) => void;
  onOpenDialogues: () => void;
  activeInteractions: ActiveInteractionBubble[];
  simHour: number;
  simMinute: number;
  simSpeed: number;
  weather: 'clear' | 'golden_sunset' | 'rainy' | 'starry_night' | 'misty_morning';
}

function needsAttention(agent: Agent) {
  return (agent.physicalNeeds?.energy ?? agent.needs?.energy ?? 80) < 25 || (agent.psychologicalNeeds?.stress ?? agent.state.stress) > 75;
}

export const TownWorkspace: React.FC<TownWorkspaceProps> = props => {
  const { agents, buildings, selectedAgentId, selectedBuildingId, onSelectAgent, onSelectBuilding, onOpenAgent, onForceInteraction, activeInteractions, simSpeed } = props;
  const [panel, setPanel] = useState<'residents' | 'activity'>('residents');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'moving' | 'attention'>('all');
  const [panelOpen, setPanelOpen] = useState(true);
  const selected = agents.find(agent => agent.id === selectedAgentId);
  const selectedBuilding = buildings.find(building => building.id === selectedBuildingId);
  const moving = agents.filter(agent => agent.isMoving).length;
  const attention = agents.filter(needsAttention).length;
  const filtered = agents.filter(agent => {
    const matches = `${agent.name} ${agent.role} ${agent.currentActivity}`.toLowerCase().includes(search.trim().toLowerCase());
    return matches && (filter === 'all' || (filter === 'moving' ? agent.isMoving : needsAttention(agent)));
  });
  const activity = [
    ...props.interactions.map(record => ({ id: record.id, timestamp: record.timestamp, title: record.topic, text: record.summary, time: record.simTime, agentId: record.participants[0], type: 'dialogue' })),
    ...props.events.map(event => ({ id: event.id, timestamp: event.timestamp, title: event.title, text: event.description, time: event.simTime, agentId: undefined, type: 'event' })),
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 15);
  const selectAgent = (id: string | null) => { onSelectAgent(id); onSelectBuilding(null); if (id) { setPanelOpen(true); setPanel('residents'); } };

  return (
    <div className="town-workspace">
      <section className="town-map-section" aria-label="小镇地图">
        <div className="town-map-heading"><div><span className="town-eyebrow">YOUR LIVING WORLD</span><h2>小镇正在发生</h2><p>看看大家在做什么，发现下一段故事。</p></div><button className="town-icon-button town-panel-toggle" aria-label={panelOpen ? '收起侧栏' : '展开侧栏'} onClick={() => setPanelOpen(!panelOpen)}>{panelOpen ? <PanelRightClose size={19} /> : <PanelRightOpen size={19} />}</button></div>
        <div className="town-map-frame">
          <TownCanvas {...props} onSelectAgent={selectAgent} />
          <div className="town-map-live"><i className={simSpeed === 0 ? 'paused' : ''} />{simSpeed === 0 ? '模拟已暂停' : '居民正在自主生活'}</div>
          {selectedBuilding && !selected && <div className="town-building-card"><button aria-label="关闭建筑信息" onClick={() => onSelectBuilding(null)}><X size={15} /></button><span><MapPin size={15} /> 地点</span><h3>{selectedBuilding.name}</h3><p>{selectedBuilding.description}</p></div>}
        </div>
        <footer className="town-map-footer"><span>拖动移动视角 · 滚轮缩放 · 点击居民查看状态</span><span>{buildings.length} 个地点<span className="town-footer-divider">/</span>{agents.length} 位居民</span></footer>
      </section>
      {panelOpen && <aside className="town-sidebar" aria-label="居民与动态">
        <div className="town-sidebar-tabs"><button className={panel === 'residents' ? 'active' : ''} onClick={() => setPanel('residents')}>居民 <span>{agents.length}</span></button><button className={panel === 'activity' ? 'active' : ''} onClick={() => setPanel('activity')}>最新动态</button></div>
        {panel === 'residents' ? <>
          <div className="town-resident-summary"><span><b>{moving}</b>正在移动</span><span><b>{activeInteractions.length}</b>正在交谈</span><span className={attention ? 'needs-attention' : ''}><b>{attention}</b>需要关注</span></div>
          {selected && <section className="town-selected-card" aria-label="选中居民">
            <button className="town-selection-close" aria-label="关闭居民信息" onClick={() => selectAgent(null)}><X size={15} /></button>
            <div className="town-resident-identity"><span className="town-avatar" style={{ background: selected.spriteColor }}>{selected.name[0]}</span><div><h3>{selected.name}</h3><p>{selected.role}</p></div></div>
            <p className="town-current-activity">{selected.currentActivity}</p>
            <div className="town-vitals"><span><Heart size={13} />心情 <b>{Math.round(selected.psychologicalNeeds?.mood ?? selected.state.mood)}</b></span><span>精力 <b>{Math.round(selected.physicalNeeds?.energy ?? selected.state.energy)}</b></span></div>
            {selected.goal && <p className="town-goal"><Target size={14} /><span>{selected.goal.title}</span></p>}
            <div className="town-selected-actions"><button onClick={() => onOpenAgent(selected.id)}>完整档案 <ArrowUpRight size={14} /></button><button disabled={activeInteractions.some(bubble => bubble.agentAId === selected.id || bubble.agentBId === selected.id)} onClick={() => onForceInteraction(selected.id)}><MessageSquare size={14} />发起对话</button></div>
          </section>}
          <div className="town-search"><Search size={16} /><input aria-label="搜索居民" placeholder="搜索姓名、职业或正在做的事" value={search} onChange={event => setSearch(event.target.value)} />{search && <button aria-label="清空搜索" onClick={() => setSearch('')}><X size={14} /></button>}</div>
          <div className="town-resident-filters" aria-label="居民筛选">{([{ key: 'all', text: '全部' }, { key: 'moving', text: '移动中' }, { key: 'attention', text: '需关注' }] as const).map(item => <button key={item.key} aria-pressed={filter === item.key} className={filter === item.key ? 'active' : ''} onClick={() => setFilter(item.key)}>{item.text}</button>)}<small>{filtered.length} 位</small></div>
          <div className="town-resident-list">{filtered.map(agent => <button key={agent.id} className={`town-resident-row ${selectedAgentId === agent.id ? 'selected' : ''}`} onClick={() => selectAgent(agent.id)}><span className="town-avatar" style={{ background: agent.spriteColor }}>{agent.name[0]}</span><span className="town-resident-row-text"><strong>{agent.name}<small>{agent.role}</small></strong><span>{agent.currentActivity}</span></span><ChevronRight size={15} /></button>)}{filtered.length === 0 && <div className="town-empty"><Users size={24} /><p>没有符合条件的居民</p><button onClick={() => { setSearch(''); setFilter('all'); }}>显示全部居民</button></div>}</div>
        </> : <div className="town-activity-list"><p className="town-activity-intro">最近的对话和事件，按发生时间排列。</p>{activity.map(item => <article key={`${item.type}-${item.id}`} className="town-activity-card"><span>{item.type === 'dialogue' ? '对话' : '事件'} · {item.time || '刚刚'}</span><h3>{item.title}</h3><p>{item.text}</p>{item.agentId && <button onClick={() => selectAgent(item.agentId!)}>查看居民 <ArrowUpRight size={13} /></button>}</article>)}{activity.length === 0 && <div className="town-empty"><MessageSquare size={24} /><p>还没有动态</p><small>让居民相遇，或从「更多」创建事件。</small></div>}<button className="town-all-dialogues" onClick={props.onOpenDialogues}>查看全部对话 <ArrowUpRight size={14} /></button></div>}
      </aside>}
    </div>
  );
};
