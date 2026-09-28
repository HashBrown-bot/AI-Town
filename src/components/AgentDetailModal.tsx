import React from 'react';
import { Agent, Building } from '../types/town';
import { X, MessageSquare, TrendingUp, Sparkles, MapPin, Battery, Smile, AlertCircle } from 'lucide-react';
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
  if (!agent) return null;

  return (
    <div className="absolute top-16 left-6 z-20 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-3xl p-5 shadow-2xl text-slate-100 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow border border-white/20"
            style={{ backgroundColor: agent.spriteColor || '#3b82f6' }}
          >
            {agent.name.slice(0, 1)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">{agent.name}</h3>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-semibold">
                {agent.mbti}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{agent.role}</p>
          </div>
        </div>

        <button
          onClick={() => {
            soundEngine.playClick();
            onClose();
          }}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="py-3 space-y-3 text-xs">
        {/* Current Activity */}
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
            此刻状态与行踪
          </span>
          <div className="text-slate-200 mt-0.5 flex items-center gap-1.5 font-medium">
            <span>{building?.icon || '📍'}</span>
            <span>{agent.currentActivity}</span>
          </div>
        </div>

        {/* Thought Bubble */}
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
            内心心声
          </span>
          <p className="text-slate-300 italic mt-0.5">
            "{agent.currentThought}"
          </p>
        </div>

        {/* Quick Meters */}
        <div className="grid grid-cols-3 gap-2 text-center font-mono">
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[9px] text-slate-500 block">精力</span>
            <span className="text-amber-400 font-bold">{agent.state.energy}%</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[9px] text-slate-500 block">心情</span>
            <span className="text-emerald-400 font-bold">
              {agent.state.mood > 0 ? `+${agent.state.mood}` : agent.state.mood}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[9px] text-slate-500 block">压力</span>
            <span className="text-rose-400 font-bold">{agent.state.stress}%</span>
          </div>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
        <button
          onClick={() => onForceInteraction(agent.id)}
          className="flex-1 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 text-center transition flex items-center justify-center gap-1.5"
        >
          <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
          <span>促成社交交谈</span>
        </button>

        <button
          onClick={() => onGoToEvolution(agent.id)}
          className="flex-1 py-2 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition flex items-center justify-center gap-1.5 shadow"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>演变全轨迹</span>
        </button>
      </div>
    </div>
  );
};
