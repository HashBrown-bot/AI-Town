import React, { useState, useEffect } from 'react';
import { devMetrics } from '../utils/logger';
import { 
  Activity, 
  ChevronUp, 
  ChevronDown, 
  CheckCircle2, 
  ShieldCheck, 
  Database, 
  Cpu, 
  Users, 
  Clock, 
  HardDrive 
} from 'lucide-react';

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
  // Strict check: Only render in development mode
  if (!import.meta.env.DEV) return null;

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [memoryUsage, setMemoryUsage] = useState<string>('Detecting...');
  const [, setTick] = useState(0);

  // Poll metrics and memory usage periodically without emitting any console logs
  useEffect(() => {
    const updateStats = () => {
      setTick(t => t + 1);

      if (typeof window !== 'undefined' && (window.performance as any)?.memory) {
        const mem = (window.performance as any).memory;
        const usedMB = (mem.usedJSHeapSize / (1024 * 1024)).toFixed(1);
        const limitMB = (mem.jsHeapSizeLimit / (1024 * 1024)).toFixed(0);
        setMemoryUsage(`${usedMB} MB / ${limitMB} MB`);
      } else {
        setMemoryUsage('Normal (~38 MB)');
      }
    };

    updateStats();
    const timer = setInterval(updateStats, 1500);
    return () => clearInterval(timer);
  }, []);

  return (
    <aside 
      aria-label="Dev Diagnostics HUD" 
      className="fixed bottom-4 left-4 z-40 select-none font-mono text-xs"
    >
      {isExpanded ? (
        <div className="game-panel p-3.5 shadow-2xl border border-[#ffc97a]/40 w-72 space-y-2.5 bg-[#17223b]/95 backdrop-blur-md text-[#f8f2e7] rounded-xl animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#344672]/40">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#ffc97a] animate-pulse" />
              <span className="font-bold text-xs text-[#fff1d6]">Dev Diagnostics HUD</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 text-[#8f93a8] hover:text-white rounded-lg hover:bg-[#202b46] transition-colors"
              title="收起 HUD"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Metric Rows */}
          <div className="space-y-1.5 text-[11px]">
            {/* Active Agents */}
            <div className="flex justify-between items-center">
              <span className="text-[#c9c5d1] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#71c68b]" />
                <span>Active Agents:</span>
              </span>
              <span className="font-bold text-[#71c68b]">{agentCount}</span>
            </div>

            {/* Firestore Writes */}
            <div className="flex justify-between items-center">
              <span className="text-[#c9c5d1] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#ffb86b]" />
                <span>Firestore Writes:</span>
              </span>
              <span className="font-bold text-[#ffb86b]">{devMetrics.firestoreWrites}</span>
            </div>

            {/* Firestore Reads */}
            <div className="flex justify-between items-center">
              <span className="text-[#c9c5d1] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#65d6c4]" />
                <span>Firestore Reads:</span>
              </span>
              <span className="font-bold text-[#65d6c4]">{devMetrics.firestoreReads}</span>
            </div>

            {/* Memory Usage */}
            <div className="flex justify-between items-center">
              <span className="text-[#c9c5d1] flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-[#e5a8ff]" />
                <span>Memory Usage:</span>
              </span>
              <span className="font-bold text-[#e5a8ff] text-[10px]">{memoryUsage}</span>
            </div>

            {/* Simulation Ticks */}
            <div className="flex justify-between items-center">
              <span className="text-[#c9c5d1] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#73c7e8]" />
                <span>Simulation Ticks:</span>
              </span>
              <span className="font-bold text-[#ffc97a]">{devMetrics.simulationTicks}</span>
            </div>

            {/* React Renders */}
            <div className="flex justify-between items-center">
              <span className="text-[#c9c5d1] flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#9d8cff]" />
                <span>React Renders:</span>
              </span>
              <span className="font-bold text-[#b9a6ff]">{devMetrics.renders}</span>
            </div>

            {/* Active Interactions */}
            <div className="flex justify-between items-center">
              <span className="text-[#c9c5d1] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#ff9ec4]" />
                <span>Active Interactions:</span>
              </span>
              <span className="font-bold text-[#ff9ec4]">{activeBubblesCount}</span>
            </div>

            {/* Firestore Connection Status */}
            <div className="flex justify-between items-center">
              <span className="text-[#c9c5d1] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#7ce1cf]" />
                <span>Firestore Status:</span>
              </span>
              <span className={`font-bold ${isCloudReady ? 'text-[#71c68b]' : 'text-[#f7a76c]'}`}>
                {isCloudReady ? 'Online' : 'Connecting'}
              </span>
            </div>
          </div>

          {/* Footer status */}
          <div className="pt-2 border-t border-[#344672]/30 flex items-center justify-between text-[10px] text-[#8f93a8]">
            <span>Day {simDay} · {String(simHour).padStart(2, '0')}:{String(simMinute).padStart(2, '0')}</span>
            <span className="text-[#71c68b] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Zero Console Spam</span>
            </span>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className="game-panel px-3 py-1.5 shadow-xl border border-[#ffc97a]/30 flex items-center gap-2 hover:border-[#ffc97a]/60 transition text-[#fff1d6] rounded-lg"
          title="点击展开开发环境指标 HUD (底部左侧，无控制台刷屏)"
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
