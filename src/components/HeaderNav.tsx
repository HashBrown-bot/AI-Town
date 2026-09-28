import React from 'react';
import { 
  Play, 
  Pause, 
  FastForward, 
  SkipForward, 
  RotateCcw,
  Cloud, 
  CloudCheck, 
  Volume2, 
  VolumeX, 
  Sparkles,
  MapPin,
  BarChart3,
  MessageSquareText,
  TrendingUp,
  UserCog,
  Zap,
  BrainCircuit,
  Activity
} from 'lucide-react';
import { soundEngine } from '../utils/audioSystem';

export type TabKey = 
  | 'canvas'
  | 'dashboard'
  | 'dialogues'
  | 'evolution'
  | 'personas'
  | 'events'
  | 'analyzer'
  | 'quota';

interface HeaderNavProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  simDay: number;
  simHour: number;
  simMinute: number;
  simSpeed: number; // 0=paused, 1=1x, 2=2x, 5=5x
  onSetSpeed: (speed: number) => void;
  onSkipHour: () => void;
  onResetSimulation?: () => void;
  weather: 'clear' | 'golden_sunset' | 'rainy' | 'starry_night' | 'misty_morning';
  onCycleWeather: () => void;
  cloudSyncCount: number;
  isCloudSynced: boolean;
  onTriggerAnalyze: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentTab,
  onSelectTab,
  simDay,
  simHour,
  simMinute,
  simSpeed,
  onSetSpeed,
  onSkipHour,
  onResetSimulation,
  weather,
  onCycleWeather,
  cloudSyncCount,
  isCloudSynced,
  onTriggerAnalyze
}) => {
  const [isAudioOn, setIsAudioOn] = React.useState(soundEngine.getIsPlaying());

  const handleToggleSound = () => {
    const nextState = soundEngine.toggleMusic();
    setIsAudioOn(nextState);
  };

  const navItems: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'canvas', label: '小镇全景', icon: <MapPin className="w-4 h-4" /> },
    { key: 'dashboard', label: '社会动态', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'dialogues', label: '交互与记录', icon: <MessageSquareText className="w-4 h-4" /> },
    { key: 'evolution', label: '行为演变', icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'personas', label: '个性化配置', icon: <UserCog className="w-4 h-4" /> },
    { key: 'events', label: '事件触发器', icon: <Zap className="w-4 h-4" /> },
    { key: 'analyzer', label: 'AI分析器', icon: <BrainCircuit className="w-4 h-4" /> },
    { key: 'quota', label: '配额与容量', icon: <Activity className="w-4 h-4" /> }
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 select-none z-30 shrink-0">
      {/* Top Bar: Title & Simulation Controls */}
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-900/30 border border-blue-400/20 font-bold text-sm tracking-wider">
            AE
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-sm tracking-tight text-white">
                Aetheria 智能小镇
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                Gemini Agent 2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              自主社交演化与行为分析实验沙盒
            </p>
          </div>
        </div>

        {/* Simulation Clock & Speed Controls */}
        <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-1.5 shadow-inner">
          <div className="flex items-center gap-2 mr-2">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono text-slate-300">
              第 {simDay} 天
            </span>
            <span className="font-mono text-xs font-semibold text-slate-100">
              {String(simHour).padStart(2, '0')}:{String(simMinute).padStart(2, '0')}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Speed Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onSetSpeed(simSpeed === 0 ? 1 : 0)}
              title={simSpeed === 0 ? '恢复模拟运行' : '暂停模拟'}
              className={`p-1.5 rounded-lg transition ${
                simSpeed === 0
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {simSpeed === 0 ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => onSetSpeed(1)}
              title="1x 正常步速"
              className={`px-2 py-1 text-xs font-mono rounded-lg transition ${
                simSpeed === 1
                  ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              1x
            </button>
            <button
              onClick={() => onSetSpeed(2)}
              title="2x 快速演化"
              className={`px-2 py-1 text-xs font-mono rounded-lg transition ${
                simSpeed === 2
                  ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              2x
            </button>
            <button
              onClick={() => onSetSpeed(5)}
              title="5x 疾速模拟"
              className={`p-1.5 rounded-lg transition ${
                simSpeed === 5
                  ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FastForward className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onSkipHour}
              title="推进 1 小时"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            {onResetSimulation && (
              <button
                onClick={onResetSimulation}
                title="重新开始小镇时间 (重置至第1天)"
                className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Status Indicators & Right Controls */}
        <div className="flex items-center gap-2">
          {/* Weather Toggle */}
          <button
            onClick={onCycleWeather}
            title="切换天气与昼夜光照"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <span>
              {weather === 'rainy' ? '🌧️ 微雨' : weather === 'golden_sunset' ? '🌅 落霞' : weather === 'starry_night' ? '🌌 星夜' : '☀️ 晴空'}
            </span>
          </button>

          {/* Audio Ambient Toggle */}
          <button
            onClick={handleToggleSound}
            title={isAudioOn ? '点击静音像素环境音' : '点击开启轻柔环境音效'}
            className={`p-1.5 rounded-xl border transition ${
              isAudioOn
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            {isAudioOn ? <Volume2 className="w-4 h-4 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Cloud Firestore Status & Quota Badge (Clickable to open monitor) */}
          <button
            onClick={() => {
              onSelectTab('quota');
              soundEngine.playClick();
            }}
            title="查看 Google API 配额与 Firestore 云端容量看板"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-mono transition cursor-pointer"
          >
            <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-300 text-[11px] font-medium hidden md:inline">
              云端配额
            </span>
            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-emerald-300 font-semibold">
              {cloudSyncCount} 条
            </span>
          </button>

          {/* Quick AI Analyze Button */}
          <button
            onClick={onTriggerAnalyze}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-medium shadow-md shadow-blue-900/20 transition active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI 态势评估</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <nav className="flex items-center gap-1 px-4 py-1.5 overflow-x-auto no-scrollbar bg-slate-950/40">
        {navItems.map(item => {
          const isActive = currentTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => {
                onSelectTab(item.key);
                soundEngine.playClick();
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                isActive
                  ? 'bg-slate-800 text-blue-400 border border-slate-700/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span className={isActive ? 'text-blue-400' : 'text-slate-500'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};
