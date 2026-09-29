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
  Heart, 
  Zap, 
  Users, 
  Sparkles, 
  Brain, 
  Shield, 
  Star, 
  Coins, 
  Compass, 
  BookOpen,
  Sword,
  Handshake
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
  const [activeTab, setActiveTab] = useState<'vitals' | 'relations' | 'memories'>('vitals');

  if (!agent) return null;

  const currentAction = agent.plan?.steps[agent.plan.currentStepIndex] || agent.currentAction;
  const currentGoal = agent.goal;

  // Resolve Vitals
  const energy = agent.physicalNeeds?.energy ?? agent.needs?.energy ?? agent.state?.energy ?? 80;
  const hunger = agent.physicalNeeds?.hunger ?? agent.needs?.hunger ?? 25;
  const mood = agent.psychologicalNeeds?.mood ?? agent.needs?.mood ?? (agent.state?.mood < 0 ? (agent.state.mood + 100) / 2 : agent.state.mood) ?? 75;
  const social = agent.socialNeeds?.social ?? agent.needs?.social ?? 60;
  const curiosity = agent.cognitiveNeeds?.curiosity ?? agent.needs?.curiosity ?? 65;
  const safety = agent.needs?.safety ?? 85;
  const achievement = agent.cognitiveNeeds?.achievement ?? agent.needs?.achievement ?? 60;

  const vitals = [
    { label: '心情', val: mood, icon: <Heart className="w-3.5 h-3.5 text-[#f28cb1]" />, color: 'from-[#f28cb1] to-[#ff9ec4]' },
    { label: '精力', val: energy, icon: <Zap className="w-3.5 h-3.5 text-[#ffc97a]" />, color: 'from-[#ffb86b] to-[#ffc97a]' },
    { label: '饱腹', val: 100 - hunger, icon: <span className="text-xs">🍞</span>, color: 'from-[#f7a76c] to-[#ffb86b]' },
    { label: '社交', val: social, icon: <Users className="w-3.5 h-3.5 text-[#73c7e8]" />, color: 'from-[#73c7e8] to-[#65d6c4]' },
    { label: '好奇', val: curiosity, icon: <Brain className="w-3.5 h-3.5 text-[#b9a6ff]" />, color: 'from-[#9d8cff] to-[#b9a6ff]' },
    { label: '安全', val: safety, icon: <Shield className="w-3.5 h-3.5 text-[#71c68b]" />, color: 'from-[#71c68b] to-[#91d69d]' },
    { label: '成就', val: achievement, icon: <Star className="w-3.5 h-3.5 text-[#ffc97a]" />, color: 'from-[#ffc97a] to-[#fff1d6]' }
  ];

  return (
    <div className="absolute top-16 left-6 z-20 w-96 game-panel-highlight p-5 shadow-2xl text-[#f8f2e7] animate-fadeIn max-h-[88vh] overflow-y-auto no-scrollbar border border-[#ffc97a]/30">
      {/* 1. RPG Character Header Banner */}
      <div className="flex items-start justify-between pb-3.5 border-b border-[#344672]/30">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg border-2 border-[#ffc97a]/40 shrink-0"
            style={{ backgroundColor: agent.spriteColor || '#ffb86b' }}
          >
            {agent.name.slice(0, 1)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-[#f8f2e7]">{agent.name}</h3>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#9d8cff]/20 text-[#b9a6ff] font-bold border border-[#9d8cff]/30">
                {agent.mbti}
              </span>
            </div>
            <p className="text-xs text-[#ffc97a] font-medium mt-0.5">{agent.role}</p>
          </div>
        </div>

        <button
          onClick={() => {
            soundEngine.playClick();
            onClose();
          }}
          className="p-1.5 text-[#8f93a8] hover:text-[#f8f2e7] rounded-xl hover:bg-[#202b46] transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Character Economy & Vital Coin Pouch */}
      <div className="py-3 flex items-center justify-between px-3 rounded-2xl bg-[#17223b]/70 border border-[#344672]/40 text-xs">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-[#ffc97a]" />
          <span className="text-[#c9c5d1]">随身金币:</span>
          <span className="font-bold font-mono text-[#ffc97a] text-sm">{agent.money ?? 150}</span>
        </div>
        <div className="h-3 w-px bg-[#344672]/40" />
        <div className="text-[11px] text-[#c9c5d1]">
          <span>日薪: </span>
          <strong className="text-[#f8f2e7]">{agent.salary ?? 32} 金币</strong>
        </div>
      </div>

      {/* 3. Current Quest / Goal Banner */}
      {currentGoal && (
        <div className="my-3 p-3 rounded-2xl bg-gradient-to-r from-[#202b46] to-[#273552] border border-[#ffc97a]/25 space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#ffc97a] uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              <span>当前主要目标 (Quest Goal)</span>
            </span>
            <span className="px-1.5 py-0.5 rounded bg-[#ffb86b]/20 text-[#fff1d6] font-mono text-[9px]">
              紧急度: {currentGoal.urgency}/10
            </span>
          </div>
          <div className="text-[#f8f2e7] font-semibold text-xs leading-snug">
            {currentGoal.title}
          </div>
          <p className="text-[11px] text-[#c9c5d1] pt-1 border-t border-[#344672]/20">
            <span className="text-[#7ce1cf] font-medium">心念动机: </span>
            <span>{currentGoal.motivation}</span>
          </p>
        </div>
      )}

      {/* 4. Tab Navigation for Sheet */}
      <div className="flex items-center gap-1 p-1 bg-[#17223b]/60 rounded-xl my-3 border border-[#344672]/30">
        <button
          onClick={() => {
            soundEngine.playClick();
            setActiveTab('vitals');
          }}
          className={`flex-1 py-1 text-xs font-semibold rounded-lg transition ${
            activeTab === 'vitals'
              ? 'bg-[#273552] text-[#fff1d6] shadow-xs border border-[#ffc97a]/30'
              : 'text-[#8f93a8] hover:text-[#f8f2e7]'
          }`}
        >
          状态维生
        </button>
        <button
          onClick={() => {
            soundEngine.playClick();
            setActiveTab('relations');
          }}
          className={`flex-1 py-1 text-xs font-semibold rounded-lg transition ${
            activeTab === 'relations'
              ? 'bg-[#273552] text-[#fff1d6] shadow-xs border border-[#ffc97a]/30'
              : 'text-[#8f93a8] hover:text-[#f8f2e7]'
          }`}
        >
          人际羁绊
        </button>
        <button
          onClick={() => {
            soundEngine.playClick();
            setActiveTab('memories');
          }}
          className={`flex-1 py-1 text-xs font-semibold rounded-lg transition ${
            activeTab === 'memories'
              ? 'bg-[#273552] text-[#fff1d6] shadow-xs border border-[#ffc97a]/30'
              : 'text-[#8f93a8] hover:text-[#f8f2e7]'
          }`}
        >
          物语记忆
        </button>
      </div>

      {/* Tab 1: 7-Attributes RPG Vitals */}
      {activeTab === 'vitals' && (
        <div className="space-y-2.5 my-2">
          {vitals.map(v => (
            <div key={v.label} className="text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-[#c9c5d1] font-medium">
                  {v.icon}
                  <span>{v.label}</span>
                </span>
                <span className="font-mono font-bold text-[#f8f2e7]">{Math.round(v.val)}/100</span>
              </div>
              <div className="w-full bg-[#17223b] rounded-full h-2 overflow-hidden border border-[#344672]/30 p-0.5">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${v.color} transition-all duration-300`}
                  style={{ width: `${Math.max(4, Math.min(100, v.val))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Multi-Dimensional Relationships */}
      {activeTab === 'relations' && (
        <div className="space-y-2.5 my-2">
          {agent.relationships && Object.entries(agent.relationships).length > 0 ? (
            Object.entries(agent.relationships).map(([targetId, rel]) => (
              <div key={targetId} className="p-2.5 rounded-xl bg-[#17223b]/60 border border-[#344672]/30 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-[#f8f2e7]">{rel.targetAgentName}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ffb86b]/15 text-[#ffc97a] border border-[#ffb86b]/20">
                    {rel.relationshipStage === 'close_friend' ? '✨ 挚友' : rel.relationshipStage === 'partner' ? '💖 伴侣' : rel.relationshipStage === 'rival' ? '⚔️ 竞争' : '🤝 寻常之交'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] text-[#c9c5d1] pt-1 border-t border-[#344672]/20">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-[#ff9ec4]" />
                    <span>好感: {rel.affection}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Handshake className="w-3 h-3 text-[#7ce1cf]" />
                    <span>信任: {rel.trust}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-[#ffc97a]" />
                    <span>尊重: {rel.respect}</span>
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-3 text-center text-xs text-[#8f93a8]">
              暂无已觉醒的多维人际数据
            </div>
          )}
        </div>
      )}

      {/* Tab 3: RPG Adventure Memories */}
      {activeTab === 'memories' && (
        <div className="space-y-2 my-2 max-h-56 overflow-y-auto no-scrollbar">
          {agent.memories && agent.memories.length > 0 ? (
            agent.memories.slice(0, 5).map((mem, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-[#17223b]/60 border border-[#344672]/30 text-xs"
              >
                <div className="flex items-center justify-between text-[10px] text-[#ffc97a] mb-1 font-mono">
                  <span>🌟 记忆碎片 #{idx + 1}</span>
                  <span className="text-[#8f93a8]">深度 {mem.importance || 7}/10</span>
                </div>
                <p className="text-[11px] text-[#f8f2e7] leading-relaxed">
                  "{mem.content}"
                </p>
              </div>
            ))
          ) : (
            <div className="p-3 text-center text-xs text-[#8f93a8]">
              居民正在编织新记忆
            </div>
          )}
        </div>
      )}

      {/* 5. Quick Actions */}
      <div className="pt-3 border-t border-[#344672]/30 flex items-center gap-2">
        <button
          onClick={() => {
            soundEngine.playClick();
            onForceInteraction(agent.id);
          }}
          className="game-btn-primary flex-1 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>发起邂逅交流</span>
        </button>

        <button
          onClick={() => {
            soundEngine.playClick();
            onGoToEvolution(agent.id);
          }}
          className="game-btn-secondary px-3 py-2 rounded-xl text-xs flex items-center gap-1"
          title="前往行为演变详卷"
        >
          <TrendingUp className="w-3.5 h-3.5 text-[#ffc97a]" />
          <span>详卷</span>
        </button>
      </div>
    </div>
  );
};
