import React, { useRef, useState } from 'react';
import { InteractionRecord, Agent } from '../types/town';
import { MessageSquare, Search, Download, MapPin, ArrowUpRight, ArrowLeft, Heart, Sparkles } from 'lucide-react';
import { generationLabel } from '../utils/observation';

interface LiveInteractionsViewProps {
  interactions: InteractionRecord[];
  agents: Agent[];
  onSelectAgent: (id: string) => void;
  onOpenFineTuningExport: () => void;
}
const sentiments = { positive: '温馨', deep: '深入交流', conflict: '分歧', collaborative: '协作', neutral: '闲聊' };

export const LiveInteractionsView: React.FC<LiveInteractionsViewProps> = ({ interactions, agents, onSelectAgent, onOpenFineTuningExport }) => {
  const [search, setSearch] = useState('');
  const [person, setPerson] = useState('all');
  const [tone, setTone] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(interactions[0]?.id || null);
  const [cutoff, setCutoff] = useState(() => Date.now());
  const [limit, setLimit] = useState(40);
  const [mobileDetail, setMobileDetail] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const matches = interactions.filter(record => {
    const text = `${record.topic} ${record.summary} ${record.participantNames.join(' ')} ${record.location}`.toLowerCase();
    return text.includes(search.trim().toLowerCase()) && (person === 'all' || record.participants.includes(person)) && (tone === 'all' || record.sentiment === tone);
  });
  const records = matches.filter(record => record.timestamp <= cutoff);
  const newCount = matches.length - records.length;
  const selected = records.find(record => record.id === selectedId) || records[0];
  const messages = selected?.messages?.filter(message => typeof message.text === 'string' && message.text.trim()) || [];
  const select = (id: string) => { setSelectedId(id); setMobileDetail(true); detailRef.current?.scrollTo({ top: 0 }); };

  return <div className={`town-dialogues-page ${mobileDetail && selected ? 'reading-detail' : ''}`}>
    <div className="town-dialogues-heading"><div><span className="town-eyebrow">CONVERSATIONS / SHARED MOMENTS</span><h2>对话里的变化</h2><p>先读摘要，再看原文与关系变化。</p></div><button className="town-export-button" onClick={onOpenFineTuningExport}><Download size={15} />导出对话</button></div>
    <div className="town-dialogues-toolbar"><div className="town-search"><Search size={16} /><input aria-label="搜索对话" placeholder="搜索话题、居民或地点" value={search} onChange={event => { setSearch(event.target.value); setLimit(40); }} /></div><select aria-label="对话居民" value={person} onChange={event => { setPerson(event.target.value); setLimit(40); }}><option value="all">全部居民</option>{agents.map(agent => <option value={agent.id} key={agent.id}>{agent.name}</option>)}</select><select aria-label="对话氛围" value={tone} onChange={event => { setTone(event.target.value); setLimit(40); }}><option value="all">全部氛围</option>{Object.entries(sentiments).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select><span>{records.length} 条对话</span></div>
    <div className="town-dialogues-update"><span>{newCount ? `${newCount} 条新对话已到达` : '阅读中，列表保持静止'}</span><button disabled={!newCount} onClick={() => { setCutoff(Date.now()); listRef.current?.scrollTo({ top: 0 }); }}>查看最新 <ArrowUpRight size={12} /></button></div>
    <div className={`town-dialogue-workspace ${mobileDetail && selected ? 'show-detail' : ''}`}>
      <div ref={listRef} className="town-dialogue-list" aria-label="对话列表">{records.slice(0, limit).map(record => <button key={record.id} className={`town-dialogue-row ${selected?.id === record.id ? 'selected' : ''}`} aria-label={`阅读对话：${record.topic}`} aria-pressed={selected?.id === record.id} onClick={() => select(record.id)}><div><time>第 {record.simDay} 天 · {record.simTime}</time><span className={`town-status tone-${record.sentiment}`}>{sentiments[record.sentiment]}</span></div><h3>{record.topic}</h3><p>{record.summary}</p><small>{record.participantNames.join(' × ')}<span>{record.location}</span></small></button>)}{records.length > limit && <button className="town-load-more" onClick={() => setLimit(value => value + 40)}>继续查看较早对话</button>}{!records.length && <div className="town-empty"><MessageSquare size={25} /><p>没有符合条件的对话</p><small>调整筛选，或在小镇中发起一次交谈。</small></div>}</div>
      <div ref={detailRef} className="town-dialogue-detail" aria-label="对话详情">{selected ? <>
        <button className="town-dialogue-back" onClick={() => setMobileDetail(false)}><ArrowLeft size={15} />返回对话列表</button>
        <div className="town-dialogue-detail-heading"><span className={`town-status tone-${selected.sentiment}`}>{sentiments[selected.sentiment]}</span><time>第 {selected.simDay} 天 · {selected.simTime}</time><h3>{selected.topic}</h3><p><MapPin size={14} />{selected.location}</p></div>
        <section className="town-dialogue-summary" aria-label="对话摘要"><span className="town-section-label">这次交流发生了什么</span><p>{selected.summary}</p><div className="town-source"><Sparkles size={12} />{generationLabel(selected.generation)}{selected.generation && <span> · 响应 {(selected.generation.latencyMs / 1000).toFixed(1)} 秒</span>}</div></section>
        <section className="town-dialogue-outcomes" aria-label="关系变化"><span className="town-section-label">留下了什么变化</span><div>{selected.participants.map((id, index) => { const impact = selected.relationshipImpact?.[id]; return <article key={id}><button onClick={() => onSelectAgent(id)}>{selected.participantNames[index]}<ArrowUpRight size={12} /></button><p><Heart size={13} />好感 <b className={(impact?.deltaAffinity ?? 0) < 0 ? 'negative' : ''}>{impact ? `${impact.deltaAffinity > 0 ? '+' : ''}${impact.deltaAffinity}` : '未记录'}</b></p>{impact?.note && <small>{impact.note}</small>}</article>; })}</div></section>
        <section className="town-transcript" aria-label="对话原文"><span className="town-section-label">对话原文 · {messages.length} 句</span>{messages.map((message, index) => <article key={index} className={message.speakerId === selected.participants[0] ? 'first-speaker' : 'second-speaker'}><button onClick={() => onSelectAgent(message.speakerId)}>{message.speakerName} <ArrowUpRight size={11} /></button><p>{message.text}</p></article>)}</section>
      </> : <div className="town-empty"><MessageSquare size={25} /><p>选择一段对话开始阅读</p></div>}</div>
    </div>
  </div>;
};
