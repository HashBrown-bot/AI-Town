import React, { useState, useEffect } from 'react';
import { devMetrics } from '../utils/logger';
import { Activity, ChevronUp, ChevronDown, CheckCircle2, AlertTriangle, ShieldCheck, Database, Cpu, Users, Clock } from 'lucide-react';

interface DebugMetricsHUDProps {
  agentCount: number;
  activeBubblesCount: number;
  simDay: number;
  simHour: number;
  simMinute: number;
  isCloudReady: boolean;
}

export const DebugMetricsHUD: React.FC<DebugMetricsHUDProps> = ({
  agentCount,
  activeBubblesCount,
  simDay,
  simHour,
  simMinute,
  isCloudReady,
}) => {
  // Only display in development mode
  if (!import.meta.env.DEV) return null;

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [, setTick] = useState(0);

  // Poll metrics every 1.5s in development for visual dashboard without console noise
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  return (
    <aside aria-label="Dev Diagnostics" className="fixed bottom-4 right-4 z-40 select-none font-mono text-xs">
      {isExpanded ? (
        <div className="game-panel p-4 shadow-2xl border border-[#ffc97a]/40 w-72 space-y-3 bg-[#17223b]/95 backdrop-blur-md text-[#f8f2e7] animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-[#344672]/40">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#ffc97a] animate-pulse" />
              <span className="font-bold text-xs text-[#fff1d6]">Dev Diagnostics HUD</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 text-[#8f93a8] hover:text-white rounded-lg hover:bg-[#202b46]"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-[#c9c5d1] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#73c7e8]" />
                <span>Simulation Ticks:</span>
              </span>
              <span className="font-bold text-[#ffc97a]">{devMetrics.simulationTicks}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#c9c5d1] flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#9d8cff]" />
                <span>React Renders:</span>
              </span>
              <span className="font-bold text-[#b9a6ff]">{devMetrics.renders}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#c9c5d1] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#71c68b]" />
                <span>Active Agents:</span>
              </span>
              <span className="font-bold text-[#71c68b]">{agentCount}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#c9c5d1] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#65d6c4]" />
                <span>Firestore Reads:</span>
              </span>
              <span className="font-bold text-[#65d6c4]">{devMetrics.firestoreReads}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#c9c5d1] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#ffb86b]" />
                <span>Firestore Writes:</span>
              </span>
              <span className="font-bold text-[#ffb86b]">{devMetrics.firestoreWrites}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#c9c5d1] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#7ce1cf]" />
                <span>Firestore Status:</span>
              </span>
              <span className={`font-bold ${isCloudReady ? 'text-[#71c68b]' : 'text-[#f7a76c]'}`}>
                {isCloudReady ? 'Online' : 'Offline/Connecting'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#c9c5d1] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#f43f5e]" />
                <span>Firebase Errors:</span>
              </span>
              <span className={`font-bold ${devMetrics.firebaseErrors > 0 ? 'text-[#f43f5e]' : 'text-[#71c68b]'}`}>
                {devMetrics.firebaseErrors}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#c9c5d1] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#ff9ec4]" />
                <span>Active Interactions:</span>
              </span>
              <span className="font-bold text-[#ff9ec4]">{activeBubblesCount}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#344672]/30 flex items-center justify-between text-[10px] text-[#8f93a8]">
            <span>Day {simDay} · {String(simHour).padStart(2, '0')}:{String(simMinute).padStart(2, '0')}</span>
            <span className="text-[#71c68b] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Zero-Spam Active</span>
            </span>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className="game-panel px-3 py-1.5 shadow-xl border border-[#ffc97a]/30 flex items-center gap-2 hover:border-[#ffc97a]/60 transition text-[#fff1d6]"
          title="点击展开开发环境指标 HUD (无需控制台刷屏)"
        >
          <Activity className="w-3.5 h-3.5 text-[#ffc97a]" />
          <span className="text-[11px] font-bold">Dev HUD</span>
          <span className="w-2 h-2 rounded-full bg-[#71c68b] animate-pulse" />
          <ChevronUp className="w-3.5 h-3.5 text-[#8f93a8]" />
        </button>
      )}
    </aside>
  );
};
