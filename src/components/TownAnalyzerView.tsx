import React, { useState } from 'react';
import { TownAnalysis, InteractionRecord, Agent, TownEvent } from '../types/town';
import { 
  BrainCircuit, 
  Sparkles, 
  AlertTriangle, 
  Users, 
  Compass, 
  Lightbulb, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  Flame,
  Heart
} from 'lucide-react';
import { requestTownAnalysis } from '../services/aiTownService';
import { soundEngine } from '../utils/audioSystem';

interface TownAnalyzerViewProps {
  currentAnalysis: TownAnalysis;
  interactions: InteractionRecord[];
  agents: Agent[];
  events: TownEvent[];
  onUpdateAnalysis: (newAnalysis: TownAnalysis) => void;
}

export const TownAnalyzerView: React.FC<TownAnalyzerViewProps> = ({
  currentAnalysis,
  interactions,
  agents,
  events,
  onUpdateAnalysis
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<TownAnalysis[]>([currentAnalysis]);

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    soundEngine.playClick();

    try {
      const recentEventsStr = events.slice(0, 3).map(e => e.title).join('; ');
      const result = await requestTownAnalysis(interactions, agents, recentEventsStr);
      onUpdateAnalysis(result);
      setAnalysisHistory(prev => [result, ...prev]);
      soundEngine.playChime();
    } catch (err) {
      console.error('Failed to run town analysis:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-6 space-y-6 text-slate-100">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>AI 核心态势与社会冲突演化分析器</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
              Town Mind Analyzer
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            由 Google Gemini 大模型驱动，自主聚类居民对话线索、识别潜在利益冲突、圈层同盟与演化趋势
          </p>
        </div>

        <button
          onClick={handleRunAnalysis}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-blue-900/30 transition active:scale-95 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'Gemini 正在推演小镇数据...' : '执行全镇深度态势分析'}</span>
        </button>
      </div>

      {/* Vibe & Macro Summary Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
          <div>
            <span className="text-[11px] font-mono text-indigo-400 uppercase tracking-wider font-semibold">
              最新评估简报
            </span>
            <h3 className="text-base font-bold text-white mt-0.5">
              {currentAnalysis.title}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-mono">
                社区和睦氛围指数
              </span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {currentAnalysis.vibeScore > 0 ? `+${currentAnalysis.vibeScore}` : currentAnalysis.vibeScore} / 100
              </span>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Heart className="w-6 h-6" />
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          {currentAnalysis.summary}
        </p>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-semibold text-slate-300">当前主导心理气氛：</span>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
            {currentAnalysis.emotionalVibe}
          </span>
        </div>
      </div>

      {/* Two Pillars: Core Conflicts & Social Alliances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pillar 1: Core Conflicts Identified */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h4 className="font-semibold text-sm text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-400" />
              <span>核心矛盾与隐性冲突识别 ({currentAnalysis.coreConflicts?.length || 0})</span>
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">
              Conflict Detection
            </span>
          </div>

          <div className="space-y-3.5">
            {currentAnalysis.coreConflicts?.map((conflict, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-950/70 border border-rose-500/20 hover:border-rose-500/40 transition space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-300 text-xs">
                    {conflict.title}
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    冲突烈度 {conflict.intensity}%
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>对立/分歧主体:</span>
                  <div className="flex items-center gap-1.5 font-medium text-slate-200">
                    {conflict.agentsInvolved?.map((name, i) => (
                      <span key={i} className="px-1.5 py-0.2 rounded bg-slate-800">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-slate-300 text-[11px] leading-relaxed pt-1">
                  {conflict.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Pillar 2: Social Alliances & Cliques */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h4 className="font-semibold text-sm text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span>新兴社交圈层与情感同盟 ({currentAnalysis.alliances?.length || 0})</span>
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">
              Social Cliques
            </span>
          </div>

          <div className="space-y-3.5">
            {currentAnalysis.alliances?.map((alliance, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-950/70 border border-blue-500/20 hover:border-blue-500/40 transition space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-300 text-xs">
                    {alliance.name}
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    凝聚度 {alliance.cohesion}%
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>圈层成员:</span>
                  <div className="flex items-center gap-1.5 font-medium text-slate-200">
                    {alliance.members?.map((name, i) => (
                      <span key={i} className="px-1.5 py-0.2 rounded bg-slate-800">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-slate-300 text-[11px] leading-relaxed pt-1">
                  共识纽带: {alliance.theme}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Governance & Intervention Recommendations */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h4 className="font-semibold text-sm text-white flex items-center gap-2 pb-3 border-b border-slate-800">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span>AI 市政治理与社会演化干预建议</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentAnalysis.recommendations?.map((rec, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs"
            >
              <div className="flex items-center gap-2 font-mono text-[11px] text-blue-400 font-semibold">
                <span>0{idx + 1}</span>
                <span>政策建议</span>
              </div>
              <p className="text-slate-200 leading-relaxed">{rec}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
