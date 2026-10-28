import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipForward, Map, Users, MessageSquare, LayoutDashboard, ChevronDown, Sun, Moon, CloudRain, Cloud, Volume2, VolumeX, RotateCcw, Coins, Radio, Zap, UserCog, BrainCircuit, Activity } from 'lucide-react';
import { soundEngine } from '../utils/audioSystem';

export type TabKey = 'canvas' | 'dashboard' | 'economy' | 'dialogues' | 'evolution' | 'personas' | 'information' | 'events' | 'analyzer' | 'quota';
interface HeaderNavProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  simDay: number;
  simHour: number;
  simMinute: number;
  simSpeed: number;
  onSetSpeed: (speed: number) => void;
  onSkipHour: () => void;
  onResetSimulation?: () => void;
  weather: 'clear' | 'golden_sunset' | 'rainy' | 'starry_night' | 'misty_morning';
  onCycleWeather: () => void;
  cloudSyncCount: number;
  isCloudSynced: boolean;
  onTriggerAnalyze: () => void;
}
const primaryTabs = [
  { key: 'canvas' as TabKey, label: '小镇', icon: Map },
  { key: 'evolution' as TabKey, label: '居民', icon: Users },
  { key: 'dialogues' as TabKey, label: '对话', icon: MessageSquare },
  { key: 'dashboard' as TabKey, label: '总览', icon: LayoutDashboard },
];
const toolTabs = [
  { key: 'events' as TabKey, label: '创建事件', description: '为小镇带来新的故事', icon: Zap },
  { key: 'personas' as TabKey, label: '管理居民', description: '创建、编辑居民设定', icon: UserCog },
  { key: 'economy' as TabKey, label: '经济与商店', description: '交易、物价与居民收入', icon: Coins },
  { key: 'information' as TabKey, label: '信息传播', description: '查看知识和传闻', icon: Radio },
  { key: 'analyzer' as TabKey, label: '小镇分析', description: '生成社会生态报告', icon: BrainCircuit },
  { key: 'quota' as TabKey, label: '运行与配额', description: '查看 AI 用量和同步状态', icon: Activity },
];
const weatherLabels = { clear: '晴天', golden_sunset: '日落', rainy: '下雨', starry_night: '星夜', misty_morning: '晨雾' };

export const HeaderNav: React.FC<HeaderNavProps> = props => {
  const { currentTab, onSelectTab, simDay, simHour, simMinute, simSpeed, onSetSpeed, onSkipHour, onResetSimulation, weather, onCycleWeather, isCloudSynced } = props;
  const [audioOn, setAudioOn] = useState(soundEngine.getIsPlaying());
  const lastSpeed = useRef(1);
  const toolsRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (simSpeed > 0) lastSpeed.current = simSpeed; }, [simSpeed]);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) toolsRef.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && toolsRef.current?.open) {
        toolsRef.current.open = false;
        toolsRef.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, []);
  const WeatherIcon = weather === 'rainy' ? CloudRain : weather === 'starry_night' ? Moon : weather === 'misty_morning' ? Cloud : Sun;
  const selectedTool = toolTabs.find(tab => tab.key === currentTab);

  return (
    <header className="town-header">
      <div className="town-brand-row">
        <button className="town-brand" onClick={() => onSelectTab('canvas')} aria-label="返回小镇">
          <span className="town-mark"><Map size={20} /></span>
          <span><strong>Aetheria<span>艾瑟利亚</span></strong><small>每一个居民，都有自己的故事</small></span>
        </button>
        <div className="town-header-meta">
          <span className="town-save-state" title={isCloudSynced ? '已连接云端，自动保存' : '正在本地运行，自动保存'}><i className={isCloudSynced ? 'connected' : ''} />{isCloudSynced ? '云端已连接' : '本地运行'}</span>
          <button className="town-icon-button" aria-label={audioOn ? '关闭环境音' : '开启环境音'} aria-pressed={audioOn} onClick={() => setAudioOn(soundEngine.toggleMusic())}>{audioOn ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
        </div>
      </div>
      <div className="town-navigation-row">
        <nav className="town-navigation" aria-label="主导航">
          {primaryTabs.map(({ key, label, icon: Icon }) => <button key={key} className={currentTab === key ? 'active' : ''} aria-current={currentTab === key ? 'page' : undefined} onClick={() => onSelectTab(key)}><Icon size={16} />{label}</button>)}
          <details className="town-tools" ref={toolsRef}>
            <summary className={selectedTool ? 'active' : ''}>{selectedTool?.label || '更多'}<ChevronDown size={14} /></summary>
            <div className="town-tools-menu">
              <p>小镇工具</p>
              {toolTabs.map(({ key, label, description, icon: Icon }) => <button key={key} aria-current={currentTab === key ? 'page' : undefined} onClick={() => { onSelectTab(key); if (toolsRef.current) toolsRef.current.open = false; }}><Icon size={18} /><span><strong>{label}</strong><small>{description}</small></span></button>)}
              {onResetSimulation && <button className="town-reset" onClick={() => { if (toolsRef.current) toolsRef.current.open = false; onResetSimulation(); }}><RotateCcw size={17} /><span><strong>重置日历</strong><small>保留居民和历史记录</small></span></button>}
            </div>
          </details>
        </nav>
        <div className="town-simulation-controls" aria-label="模拟控制">
          <span className="town-clock">第 {simDay} 天 <b>{String(simHour).padStart(2, '0')}:{String(simMinute).padStart(2, '0')}</b></span>
          <button className="town-weather" onClick={onCycleWeather} aria-label={`切换天气，当前${weatherLabels[weather]}`}><WeatherIcon size={15} /><span>{weatherLabels[weather]}</span></button>
          <div className="town-speed-controls">
            <button className="town-play" aria-label={simSpeed === 0 ? '继续模拟' : '暂停模拟'} onClick={() => onSetSpeed(simSpeed === 0 ? lastSpeed.current : 0)}>{simSpeed === 0 ? <Play size={15} fill="currentColor" /> : <Pause size={15} fill="currentColor" />}</button>
            {[1, 2, 5].map(speed => <button key={speed} aria-pressed={simSpeed === speed} className={simSpeed === speed ? 'active' : ''} onClick={() => onSetSpeed(speed)}>{speed}×</button>)}
            <button className="town-icon-button" aria-label="快进一小时" onClick={onSkipHour}><SkipForward size={15} /></button>
          </div>
        </div>
      </div>
    </header>
  );
};
