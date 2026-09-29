import React from 'react';
import { 
  Play, 
  Pause, 
  FastForward, 
  SkipForward, 
  RotateCcw,
  Cloud, 
  Volume2, 
  VolumeX, 
  Sparkles,
  MapPin,
  ScrollText,
  MessageSquareText,
  TrendingUp,
  UserCog,
  Zap,
  BrainCircuit,
  Activity,
  Radio,
  Coins,
  Sun,
  Moon,
  CloudRain,
  Compass
} from 'lucide-react';
import { soundEngine } from '../utils/audioSystem';

export type TabKey = 
  | 'canvas'
  | 'dashboard'
  | 'economy'
  | 'dialogues'
  | 'evolution'
  | 'personas'
  | 'information'
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

  const navItems: { key: TabKey; label: string; icon: React.ReactNode; badge?: string }[] = [
    { key: 'canvas', label: '小镇全景', icon: <MapPin className="w-4 h-4" /> },
    { key: 'dashboard', label: '小镇纪事', icon: <ScrollText className="w-4 h-4" /> },
    { key: 'economy', label: '小镇集市', icon: <Coins className="w-4 h-4 text-[#ffc97a]" /> },
    { key: 'evolution', label: '居民档案', icon: <TrendingUp className="w-4 h-4 text-[#9d8cff]" /> },
    { key: 'information', label: '星网情报', icon: <Radio className="w-4 h-4 text-[#7ce1cf]" /> },
    { key: 'dialogues', label: '对话心声', icon: <MessageSquareText className="w-4 h-4" /> },
    { key: 'events', label: '奇遇触发', icon: <Zap className="w-4 h-4 text-[#ffb86b]" /> },
    { key: 'personas', label: '居民塑造', icon: <UserCog className="w-4 h-4" /> },
    { key: 'analyzer', label: '全知视界', icon: <BrainCircuit className="w-4 h-4 text-[#f28cb1]" /> },
    { key: 'quota', label: '配额洞察', icon: <Activity className="w-4 h-4" /> }
  ];

  const weatherIcons: Record<string, React.ReactNode> = {
    clear: <Sun className="w-3.5 h-3.5 text-[#ffc97a]" />,
    golden_sunset: <Sun className="w-3.5 h-3.5 text-[#f7a76c]" />,
    rainy: <CloudRain className="w-3.5 h-3.5 text-[#73c7e8]" />,
    starry_night: <Moon className="w-3.5 h-3.5 text-[#b9a6ff]" />,
    misty_morning: <Cloud className="w-3.5 h-3.5 text-[#c9c5d1]" />
  };

  const weatherLabels: Record<string, string> = {
    clear: '天朗气清',
    golden_sunset: '落霞流金',
    rainy: '微雨润物',
    starry_night: '星河璀璨',
    misty_morning: '晨雾微光'
  };

  return (
    <header className="relative z-30 shrink-0 select-none bg-[#17223b]/95 backdrop-blur-md border-b border-[#344672]/40 text-[#f8f2e7] shadow-xl">
      {/* Top Main Game Bar */}
      <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-[#2d3d63]/40">
        {/* Left: Game Title & Realm Emblem */}
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer" onClick={() => onSelectTab('canvas')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ffb86b] via-[#f7a76c] to-[#9d8cff] p-0.5 shadow-[0_4px_16px_rgba(247,167,108,0.35)] transition-transform duration-200 group-hover:scale-105">
              <div className="w-full h-full bg-[#17223b] rounded-[14px] flex items-center justify-center font-bold text-base tracking-wider text-[#ffc97a]">
                ✨
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#71c68b] border-2 border-[#17223b] rounded-full shadow-xs" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm tracking-tight text-[#f8f2e7] flex items-center gap-1.5 font-sans">
                <span>Aetheria</span>
                <span className="text-[#ffc97a] font-normal text-xs">艾瑟利亚小镇</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#9d8cff]/15 text-[#b9a6ff] border border-[#9d8cff]/30">
                Cozy RPG Sim
              </span>
            </div>
            <p className="text-[11px] text-[#c9c5d1] hidden sm:block">
              AI 居民自主生活 · 故事编织 · 虚拟社交生态
            </p>
          </div>
        </div>

        {/* Right: Simulation Clock, Weather & Speed HUD */}
        <div className="flex items-center gap-2 bg-[#202b46]/90 border border-[#374973]/50 rounded-2xl px-3 py-1.5 shadow-inner">
          {/* Day & Time Celestial Widget */}
          <div className="flex items-center gap-2.5 pr-2">
            <span className="px-2 py-0.5 rounded-lg bg-[#2a385c] text-[11px] font-bold text-[#ffc97a] border border-[#ffc97a]/20 shadow-xs">
              Day {simDay}
            </span>
            <div className="flex items-center gap-1 font-mono text-xs font-bold text-[#f8f2e7] tracking-wider">
              {simHour >= 6 && simHour < 18 ? (
                <Sun className="w-3.5 h-3.5 text-[#ffc97a]" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-[#b9a6ff]" />
              )}
              <span>{String(simHour).padStart(2, '0')}:{String(simMinute).padStart(2, '0')}</span>
            </div>
          </div>

          <div className="h-4 w-px bg-[#374973]/60" />

          {/* Weather Cycling Button */}
          <button
            onClick={onCycleWeather}
            title="点击切换小镇天气与昼夜环境"
            className="flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs bg-[#273552]/80 hover:bg-[#344672] text-[#c9c5d1] hover:text-[#fff1d6] border border-[#3b4d75]/50 transition"
          >
            {weatherIcons[weather] || <Sun className="w-3.5 h-3.5 text-[#ffc97a]" />}
            <span className="hidden md:inline font-medium text-[11px]">{weatherLabels[weather] || '天气'}</span>
          </button>

          <div className="h-4 w-px bg-[#374973]/60" />

          {/* Speed Jewel Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onSetSpeed(simSpeed === 0 ? 1 : 0)}
              title={simSpeed === 0 ? '恢复时间流逝' : '暂停小镇时间'}
              className={`p-1.5 rounded-xl transition ${
                simSpeed === 0
                  ? 'bg-[#ffb86b]/20 text-[#ffc97a] border border-[#ffb86b]/40 shadow-xs'
                  : 'text-[#8f93a8] hover:text-[#f8f2e7] hover:bg-[#273552]'
              }`}
            >
              {simSpeed === 0 ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>

            {[1, 2, 5].map(speed => (
              <button
                key={speed}
                onClick={() => onSetSpeed(speed)}
                title={`${speed}x 演化倍速`}
                className={`px-2 py-0.5 text-xs font-mono font-bold rounded-xl transition ${
                  simSpeed === speed
                    ? 'bg-gradient-to-r from-[#ffb86b]/25 to-[#f7a76c]/25 text-[#ffc97a] border border-[#ffb86b]/40 shadow-xs'
                    : 'text-[#8f93a8] hover:text-[#f8f2e7] hover:bg-[#273552]'
                }`}
              >
                {speed}x
              </button>
            ))}

            <button
              onClick={onSkipHour}
              title="快进 1 小时 (+1h)"
              className="p-1.5 text-[#8f93a8] hover:text-[#f8f2e7] hover:bg-[#273552] rounded-xl transition ml-0.5"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-[#374973]/60" />

          {/* Ambient BGM Audio Toggle */}
          <button
            onClick={handleToggleSound}
            title={isAudioOn ? '静音治愈背景乐' : '开启小镇治愈环境音'}
            className={`p-1.5 rounded-xl transition ${
              isAudioOn
                ? 'bg-[#71c68b]/20 text-[#91d69d] border border-[#71c68b]/40'
                : 'text-[#8f93a8] hover:text-[#f8f2e7] hover:bg-[#273552]'
            }`}
          >
            {isAudioOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Reset Time Button */}
          {onResetSimulation && (
            <button
              onClick={onResetSimulation}
              title="重置小镇日历回第 1 天"
              className="p-1.5 text-[#8f93a8] hover:text-[#f28cb1] hover:bg-[#273552] rounded-xl transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Game HUD Navigation Tabs */}
      <div className="px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-[#17223b]/60">
        {navItems.map(item => {
          const isActive = currentTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => {
                soundEngine.playClick();
                onSelectTab(item.key);
              }}
              className={`relative px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-[#2c3a5e] to-[#253252] text-[#fff1d6] border border-[#ffc97a]/40 shadow-[0_4px_12px_rgba(255,201,122,0.15)] scale-[1.02]'
                  : 'text-[#8f93a8] hover:text-[#f8f2e7] hover:bg-[#202b46]/70 border border-transparent'
              }`}
            >
              <span className={isActive ? 'text-[#ffc97a]' : 'text-[#8f93a8]'}>
                {item.icon}
              </span>
              <span>{item.label}</span>

              {/* Runic active underline */}
              {isActive && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-1 bg-gradient-to-r from-[#ffc97a] to-[#f7a76c] rounded-full shadow-[0_0_8px_#ffc97a]" />
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
