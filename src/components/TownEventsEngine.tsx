import React, { useState } from 'react';
import { TownEvent, Building, Agent } from '../types/town';
import { 
  Zap, 
  Send, 
  Sparkles, 
  Flame, 
  AlertTriangle, 
  PartyPopper, 
  BookOpen, 
  Scale, 
  Clock, 
  MapPin,
  CheckCircle2
} from 'lucide-react';
import { requestEventImpact } from '../services/aiTownService';
import { soundEngine } from '../utils/audioSystem';
import confetti from 'canvas-confetti';

interface TownEventsEngineProps {
  buildings: Building[];
  agents: Agent[];
  eventsHistory: TownEvent[];
  onTriggerEvent: (event: TownEvent, agentReactions: any[]) => void;
}

export const TownEventsEngine: React.FC<TownEventsEngineProps> = ({
  buildings,
  agents,
  eventsHistory,
  onTriggerEvent
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TownEvent['type']>('user_intervention');
  const [targetBuilding, setTargetBuilding] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triggeredNotice, setTriggeredNotice] = useState<string | null>(null);

  // Preset Event Blueprints
  const presetEvents: {
    title: string;
    description: string;
    type: TownEvent['type'];
    building: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      title: '星光夏夜露天祭典',
      description: '全镇居民相聚在中央喷泉，星光咖啡馆提供特制冰露，诗人姜寻弹唱新曲，大家载歌载舞。',
      type: 'festival',
      building: 'central_park',
      icon: <PartyPopper className="w-4 h-4" />,
      color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-300'
    },
    {
      title: '观星台发条电力突发过载',
      description: '观星台大型发条擒纵齿轮过热短路，陈默秘书长赶赴现场进行安全核查，顾工坊主急需技术协助。',
      type: 'emergency',
      building: 'observatory',
      icon: <AlertTriangle className="w-4 h-4" />,
      color: 'from-rose-500/20 to-red-500/10 border-rose-500/30 text-rose-300'
    },
    {
      title: '小镇典籍发现未知预言星图',
      description: '陆学者在整理先民羊皮手稿时，发现了一张记载着小镇地底涌泉与星象共振的古老图谱。',
      type: 'social',
      building: 'library',
      icon: <BookOpen className="w-4 h-4" />,
      color: 'from-indigo-500/20 to-purple-500/10 border-indigo-500/30 text-indigo-300'
    },
    {
      title: '小镇议事会公共财政公投',
      description: '市政厅发起关于下半年度预算分配方案的投票，重点讨论公共草药田与修缮观测台的资金比例。',
      type: 'policy',
      building: 'town_hall',
      icon: <Scale className="w-4 h-4" />,
      color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-300'
    }
  ];

  const handleFireEvent = async (eventObj: {
    title: string;
    description: string;
    type: TownEvent['type'];
    targetBuilding?: string;
  }) => {
    setIsSubmitting(true);
    try {
      const event: TownEvent = {
        id: `event-${Date.now()}`,
        title: eventObj.title,
        description: eventObj.description,
        type: eventObj.type,
        impactSummary: '正在评估该事件对各居民的心理与行为连锁反应...',
        targetBuilding: eventObj.targetBuilding === 'all' ? undefined : eventObj.targetBuilding,
        timestamp: Date.now(),
        simTime: '当前时段',
        active: true
      };

      // AI calculates psychological reaction
      const impactResult = await requestEventImpact(event, agents);
      event.impactSummary = impactResult.impactSummary;

      onTriggerEvent(event, impactResult.agentReactions || []);

      // Celebration fanfare & confetti for festivals or interventions
      soundEngine.playEventFanfare();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });

      setTriggeredNotice(`事件“${event.title}”已成功注入小镇！居民心态与舆论正在发生演变。`);
      setTimeout(() => setTriggeredNotice(null), 4000);

      // Reset form if from custom
      setTitle('');
      setDescription('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    handleFireEvent({
      title,
      description,
      type,
      targetBuilding
    });
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-6 space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>自定义事件触发机制与干预中枢</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
              God Mode Intervention
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            向小镇注入突发环境、公共政策、文化节庆或未知危机，干预并引导小镇社会的发展方向
          </p>
        </div>
      </div>

      {triggeredNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{triggeredNotice}</span>
        </div>
      )}

      {/* Preset Events Quick Injection */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>经典演化剧本快捷注入</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {presetEvents.map((pe, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl bg-gradient-to-br ${pe.color} border transition hover:shadow-lg hover:scale-[1.01] flex flex-col justify-between gap-3`}
            >
              <div>
                <div className="flex items-center gap-2 text-sm font-bold">
                  {pe.icon}
                  <span>{pe.title}</span>
                </div>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  {pe.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{buildings.find(b => b.id === pe.building)?.name || '全镇范围'}</span>
                </span>

                <button
                  onClick={() => handleFireEvent({
                    title: pe.title,
                    description: pe.description,
                    type: pe.type,
                    targetBuilding: pe.building
                  })}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-medium border border-white/20 transition flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  <span>立即触发</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Event Creator Form */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-sm text-white">
              创建自定义上帝视角干预事件
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            支持自然语言任意剧本
          </span>
        </div>

        <form onSubmit={handleCustomSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                事件标题
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="例如: 暖阳工坊研究出新型会发光的月光面包..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                事件分类
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="user_intervention">管理员干预 (Intervention)</option>
                <option value="social">社会传闻 (Social)</option>
                <option value="emergency">紧急突发 (Emergency)</option>
                <option value="festival">庆典文化 (Festival)</option>
                <option value="policy">小镇规约 (Policy)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              影响聚焦地点
            </label>
            <select
              value={targetBuilding}
              onChange={e => setTargetBuilding(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">全镇范围 (全居民普遍感知)</option>
              {buildings.map(b => (
                <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              事件具体内容与叙事背景
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="详细描述事件的起因、影响以及可能涉及的居民... Gemini将根据此情景评估居民思想转变并驱动他们展开针对性讨论。"
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 leading-relaxed"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-medium shadow-md shadow-blue-900/30 transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'AI 正在推演小镇反应...' : '立即发布并干预小镇'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Historical Event Log */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="font-semibold text-sm text-white flex items-center gap-2 pb-3 border-b border-slate-800">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>事件历史记录与演变轨迹</span>
        </h3>

        <div className="space-y-3">
          {eventsHistory.map(evt => (
            <div
              key={evt.id}
              className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{evt.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    {evt.type}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">{evt.description}</p>
                {evt.impactSummary && (
                  <p className="text-[11px] text-blue-400">
                    ➔ 效应: {evt.impactSummary}
                  </p>
                )}
              </div>

              <div className="shrink-0 text-slate-500 text-[11px] font-mono self-end md:self-auto">
                {evt.simTime}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
