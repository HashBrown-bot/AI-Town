import React, { useRef, useEffect, useState } from 'react';
import { Agent, Building, InteractionRecord, TownAnalysis } from '../types/town';
import { 
  Users, 
  MessageSquare, 
  Heart, 
  Sparkles, 
  Building2, 
  Compass, 
  ArrowUpRight,
  TrendingUp,
  Flame,
  CheckCircle2,
  Database,
  Coins,
  Sun,
  Moon,
  CloudRain,
  Scroll,
  BookOpen,
  MapPin,
  Smile,
  ShieldCheck,
  Star
} from 'lucide-react';
import { soundEngine } from '../utils/audioSystem';

interface DashboardOverviewProps {
  agents: Agent[];
  buildings: Building[];
  interactions: InteractionRecord[];
  latestAnalysis: TownAnalysis | null;
  onSelectAgent: (id: string) => void;
  onSelectBuilding: (id: string) => void;
  onNavigateToTab: (tab: any) => void;
  onOpenFineTuningExport: () => void;
}

const TAILWIND_COLOR_MAP: Record<string, string> = {
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  sky: '#0284c7',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  fuchsia: '#d946ef',
  pink: '#ec4899',
  rose: '#f43f5e',
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  green: '#22c55e',
  slate: '#64748b',
  gray: '#6b7280',
  zinc: '#71717a',
};

function resolveColorToRgba(colorStr: string, alpha = 1): string {
  if (!colorStr) return `rgba(255, 184, 107, ${alpha})`;
  const trimmed = colorStr.trim().toLowerCase();
  const baseName = trimmed.split('-')[0];
  const mappedHex = TAILWIND_COLOR_MAP[baseName];
  const hex = mappedHex || (trimmed.startsWith('#') ? trimmed : null);

  if (hex) {
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    if (cleanHex.length >= 6) {
      const r = parseInt(cleanHex.slice(0, 2), 16);
      const g = parseInt(cleanHex.slice(2, 4), 16);
      const b = parseInt(cleanHex.slice(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    }
  }

  if (trimmed.startsWith('rgb')) {
    return trimmed;
  }

  return `rgba(255, 184, 107, ${alpha})`;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  agents,
  buildings,
  interactions,
  latestAnalysis,
  onSelectAgent,
  onSelectBuilding,
  onNavigateToTab,
  onOpenFineTuningExport
}) => {
  const networkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Compute aggregate statistics
  const totalInteractions = interactions.length;
  const positiveInteractions = interactions.filter(i => i.sentiment === 'positive' || i.sentiment === 'deep').length;
  const conflictInteractions = interactions.filter(i => i.sentiment === 'conflict').length;
  
  const avgMood = Math.round(agents.reduce((acc, a) => acc + (a.psychologicalNeeds?.mood ?? (a.state.mood < 0 ? (a.state.mood + 100) / 2 : a.state.mood)), 0) / (agents.length || 1));
  const avgStress = Math.round(agents.reduce((acc, a) => acc + (a.psychologicalNeeds?.stress ?? a.state.stress), 0) / (agents.length || 1));
  const totalWealth = agents.reduce((acc, a) => acc + (a.money || 150), 0);

  // Location popularity ranking
  const locationCounts: Record<string, number> = {};
  interactions.forEach(i => {
    locationCounts[i.location] = (locationCounts[i.location] || 0) + 1;
  });
  const sortedLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]);

  // Social Constellation Graph Canvas Renderer
  useEffect(() => {
    const canvas = networkCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Stardust background particles
    const stars: { x: number; y: number; r: number; alpha: number; pulse: number }[] = [];
    for (let i = 0; i < 40; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.8 + Math.random() * 1.5,
        alpha: 0.2 + Math.random() * 0.6,
        pulse: Math.random() * Math.PI * 2
      });
    }

    // Node layout positions in a graceful circle with subtle floating oscillation
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.38;

    let tick = 0;

    const renderGraph = () => {
      tick++;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Starfield Background
      stars.forEach(s => {
        const a = s.alpha + Math.sin(tick * 0.05 + s.pulse) * 0.2;
        ctx.fillStyle = `rgba(255, 241, 214, ${Math.max(0.1, Math.min(1, a))})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Compute Node Positions with gentle floating
      const nodePositions: Record<string, { x: number; y: number; agent: Agent }> = {};
      agents.forEach((agent, idx) => {
        const baseAngle = (idx / agents.length) * Math.PI * 2 - Math.PI / 2;
        const floatOffset = Math.sin(tick * 0.04 + idx * 1.2) * 4;
        const currentRadius = radius + floatOffset;
        nodePositions[agent.id] = {
          x: centerX + Math.cos(baseAngle) * currentRadius,
          y: centerY + Math.sin(baseAngle) * currentRadius,
          agent
        };
      });

      // 3. Draw Constellation Connection Lines
      agents.forEach(agentA => {
        const posA = nodePositions[agentA.id];
        if (!posA) return;

        agents.forEach(agentB => {
          if (agentA.id >= agentB.id) return; // avoid duplicate lines
          const posB = nodePositions[agentB.id];
          if (!posB) return;

          const rel = agentA.relationships?.[agentB.id];
          const score = rel 
            ? (rel.affection * 0.45 + rel.trust * 0.35 + rel.respect * 0.2 - rel.resentment * 0.4)
            : (agentA.affinity?.[agentB.id] ?? 0);
          
          const stage = rel?.relationshipStage || (score < -20 ? 'enemy' : score > 40 ? 'close_friend' : score > 15 ? 'friend' : 'acquaintance');
          const absScore = Math.abs(score);
          const alpha = Math.min(0.85, Math.max(0.18, absScore / 70));

          ctx.beginPath();
          ctx.moveTo(posA.x, posA.y);
          ctx.lineTo(posB.x, posB.y);

          if (stage === 'enemy') {
            // Hostile Red
            ctx.strokeStyle = `rgba(244, 63, 94, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
          } else if (stage === 'rival') {
            // Rival Amber
            ctx.strokeStyle = `rgba(247, 167, 108, ${alpha})`;
            ctx.lineWidth = 1.8;
            ctx.setLineDash([5, 3]);
          } else if (stage === 'partner' || stage === 'romantic_interest') {
            // Deep Romantic Rose
            ctx.strokeStyle = `rgba(242, 140, 177, ${alpha})`;
            ctx.lineWidth = 2.4;
            ctx.setLineDash([]);
          } else if (stage === 'close_friend') {
            // Close Friend Emerald / Teal
            ctx.strokeStyle = `rgba(101, 214, 196, ${alpha})`;
            ctx.lineWidth = 2.2;
            ctx.setLineDash([]);
          } else if (score < 0) {
            ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
            ctx.lineWidth = 1.2;
            ctx.setLineDash([4, 4]);
          } else {
            // Celestial Starlight Cyan
            ctx.strokeStyle = `rgba(115, 199, 232, ${alpha})`;
            ctx.lineWidth = 1.4;
            ctx.setLineDash([]);
          }

          ctx.stroke();
          ctx.setLineDash([]);
        });
      });

      // 4. Draw Resident Nodes as Glowing Celestial Orbs
      Object.entries(nodePositions).forEach(([id, { x, y, agent }]) => {
        const isHovered = hoveredNode === id;
        const rawColor = agent.spriteColor || '#ffb86b';
        const auraColor = resolveColorToRgba(rawColor, 0.4);
        const strokeColor = isHovered ? '#ffc97a' : resolveColorToRgba(rawColor, 1);

        // Outer Aura
        const auraGrad = ctx.createRadialGradient(x, y, 4, x, y, isHovered ? 26 : 18);
        auraGrad.addColorStop(0, auraColor);
        auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(x, y, isHovered ? 26 : 18, 0, Math.PI * 2);
        ctx.fill();

        // Node Circle
        ctx.fillStyle = '#17223b';
        ctx.beginPath();
        ctx.arc(x, y, isHovered ? 17 : 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isHovered ? 2.5 : 1.8;
        ctx.stroke();

        // Resident Initial
        ctx.fillStyle = '#f8f2e7';
        ctx.font = `bold ${isHovered ? 12 : 10}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(agent.name.slice(0, 1), x, y);

        // Name & Role Tag beneath node
        ctx.fillStyle = '#f8f2e7';
        ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(agent.name, x, y + (isHovered ? 26 : 22));

        ctx.fillStyle = '#c9c5d1';
        ctx.font = '8px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(agent.role || '小镇居民', x, y + (isHovered ? 36 : 31));
      });

      animId = requestAnimationFrame(renderGraph);
    };

    animId = requestAnimationFrame(renderGraph);

    // Canvas click to select resident
    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      agents.forEach((agent, idx) => {
        const baseAngle = (idx / agents.length) * Math.PI * 2 - Math.PI / 2;
        const currentRadius = radius;
        const nx = centerX + Math.cos(baseAngle) * currentRadius;
        const ny = centerY + Math.sin(baseAngle) * currentRadius;

        if (Math.hypot(clickX - nx, clickY - ny) < 22) {
          soundEngine.playClick();
          onSelectAgent(agent.id);
        }
      });
    };

    canvas.addEventListener('click', handleCanvasClick);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [agents, hoveredNode, onSelectAgent]);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 text-[#f8f2e7] max-w-7xl mx-auto">
      {/* 1. Cozy Town Chronicle Header Banner */}
      <div className="relative game-panel-highlight p-6 overflow-hidden">
        {/* Dreamy ambient light sphere */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-gradient-to-br from-[#ffb86b]/20 to-[#9d8cff]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#ffb86b]/20 text-[#ffc97a] border border-[#ffb86b]/35 flex items-center gap-1.5 shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Town Chronicle</span>
              </span>
              <span className="text-xs text-[#c9c5d1]">小镇纪事与生命体态势</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[#f8f2e7]">
              艾瑟利亚小镇演化全景
            </h2>
            <p className="text-xs text-[#c9c5d1] mt-1 max-w-xl leading-relaxed">
              这里是自治居民的日常剧场。居民在此自主工作、烘焙香气漫溢、草药在微风中摇曳，人际羁绊与心灵记忆正生生不息地演化着。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                soundEngine.playClick();
                onNavigateToTab('canvas');
              }}
              className="game-btn-primary px-4 py-2 rounded-xl text-xs flex items-center gap-2"
            >
              <Compass className="w-4 h-4" />
              <span>进入小镇地图</span>
            </button>

            <button
              onClick={() => {
                soundEngine.playClick();
                onOpenFineTuningExport();
              }}
              className="game-btn-secondary px-3.5 py-2 rounded-xl text-xs flex items-center gap-2"
            >
              <Scroll className="w-4 h-4 text-[#ffc97a]" />
              <span>导出物语日志</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Cozy Game HUD Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Happiness Heart */}
        <div className="game-panel p-5 relative overflow-hidden group hover:border-[#ffb86b]/40 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#c9c5d1]">小镇幸福度</span>
            <div className="p-2 rounded-xl bg-[#ff9ec4]/15 text-[#ff9ec4] border border-[#ff9ec4]/30 shadow-xs">
              <Heart className="w-4 h-4 fill-[#ff9ec4]/40" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-[#fff1d6] tracking-tight">
              {avgMood}
            </span>
            <span className="text-xs text-[#8f93a8] font-mono">/ 100</span>
          </div>
          <div className="w-full bg-[#1e2a47] rounded-full h-2 mt-3 overflow-hidden p-0.5 border border-[#344672]/30">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-[#f28cb1] via-[#ffb86b] to-[#71c68b] transition-all duration-500 shadow-xs" 
              style={{ width: `${Math.max(5, Math.min(100, avgMood))}%` }} 
            />
          </div>
          <p className="text-[11px] text-[#71c68b] mt-2 flex items-center gap-1 font-medium">
            <Smile className="w-3.5 h-3.5" />
            <span>居民生活怡然自得</span>
          </p>
        </div>

        {/* Metric 2: Social Interactions */}
        <div className="game-panel p-5 relative overflow-hidden group hover:border-[#73c7e8]/40 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#c9c5d1]">交流与心声记录</span>
            <div className="p-2 rounded-xl bg-[#73c7e8]/15 text-[#73c7e8] border border-[#73c7e8]/30 shadow-xs">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-[#fff1d6] tracking-tight">
              {totalInteractions}
            </span>
            <span className="text-xs text-[#71c68b] flex items-center font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" /> 自主演进
            </span>
          </div>
          <p className="text-[11px] text-[#c9c5d1] mt-2.5">
            温情对话 <strong className="text-[#71c68b]">{positiveInteractions}</strong> 场 · 观点交锋 <strong className="text-[#f7a76c]">{conflictInteractions}</strong> 场
          </p>
        </div>

        {/* Metric 3: Economic Wealth */}
        <div className="game-panel p-5 relative overflow-hidden group hover:border-[#ffc97a]/40 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#c9c5d1]">小镇居民总财富</span>
            <div className="p-2 rounded-xl bg-[#ffc97a]/15 text-[#ffc97a] border border-[#ffc97a]/30 shadow-xs">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-[#ffc97a] tracking-tight">
              {totalWealth}
            </span>
            <span className="text-xs text-[#c9c5d1]">金币</span>
          </div>
          <p className="text-[11px] text-[#c9c5d1] mt-2.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#71c68b]" />
            <span>集市流通繁荣 · 物价平稳</span>
          </p>
        </div>

        {/* Metric 4: Cloud Sync Status */}
        <div className="game-panel p-5 relative overflow-hidden group hover:border-[#9d8cff]/40 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#c9c5d1]">小镇世界状态</span>
            <div className="p-2 rounded-xl bg-[#9d8cff]/15 text-[#b9a6ff] border border-[#9d8cff]/30 shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-[#fff1d6] tracking-tight">
              {agents.length}
            </span>
            <span className="text-xs text-[#c9c5d1]">位常住居民</span>
          </div>
          <p className="text-[11px] text-[#91d69d] mt-2.5 flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#71c68b]" />
            <span>云端 Firestore 记忆持久化</span>
          </p>
        </div>
      </div>

      {/* 3. Main Grid: Constellation Social Graph & Town Hotspots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Constellation Social Graph (2 Cols) */}
        <div className="lg:col-span-2 game-panel p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#344672]/30">
            <div>
              <h3 className="font-bold text-sm text-[#f8f2e7] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#ffc97a]" />
                <span>星宿人际引力图 (Constellation Social Map)</span>
              </h3>
              <p className="text-[11px] text-[#c9c5d1] mt-0.5">
                居民如同星辰依社交引力相连。连线展现情感色彩，点击星宿节点可查阅居民详卷。
              </p>
            </div>

            {/* Constellation Legend */}
            <div className="hidden sm:flex items-center gap-3 text-[11px] text-[#c9c5d1]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#65d6c4]" /> 挚友
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff9ec4]" /> 依恋
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f7a76c]" /> 竞争
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" /> 摩擦
              </span>
            </div>
          </div>

          {/* Network Canvas */}
          <div className="relative w-full h-80 my-2 rounded-2xl overflow-hidden bg-[#151e33] border border-[#2d3d63]/50">
            <canvas
              ref={networkCanvasRef}
              className="w-full h-full cursor-pointer block"
            />

            <div className="absolute bottom-2.5 right-3 text-[10px] text-[#8f93a8] font-mono">
              ✦ 点击星宿查看居民
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-[#c9c5d1]">
            <span>当前共缔结 <strong className="text-[#fff1d6]">{agents.length * (agents.length - 1) / 2}</strong> 条潜在人际共鸣线</span>
            <button
              onClick={() => {
                soundEngine.playClick();
                onNavigateToTab('evolution');
              }}
              className="text-[#ffc97a] hover:text-[#fff1d6] font-semibold text-xs transition"
            >
              查看更详细的羁绊网络 →
            </button>
          </div>
        </div>

        {/* Town Hotspots & Favorite Locations (1 Col) */}
        <div className="game-panel p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-[#f8f2e7] flex items-center gap-2 pb-3 border-b border-[#344672]/30">
              <Building2 className="w-4 h-4 text-[#71c68b]" />
              <span>最受青睐的小镇地标</span>
            </h3>

            <div className="space-y-3 mt-4">
              {buildings.slice(0, 5).map(b => {
                const count = locationCounts[b.name] || locationCounts[b.id] || 0;
                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      soundEngine.playClick();
                      onSelectBuilding(b.id);
                    }}
                    className="p-3 rounded-2xl bg-[#202b46]/70 hover:bg-[#273552] border border-[#344672]/30 hover:border-[#ffc97a]/40 transition cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#2d3d63] flex items-center justify-center text-base shrink-0 border border-white/10">
                        {b.icon || '🏡'}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-[#f8f2e7]">{b.name}</h4>
                        <p className="text-[10px] text-[#c9c5d1] line-clamp-1">{b.description}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <span className="text-xs font-mono font-bold text-[#ffc97a]">
                        {count} 次
                      </span>
                      <p className="text-[9px] text-[#8f93a8]">居民驻足</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#344672]/30 mt-4">
            <div className="p-3 rounded-xl bg-[#202b46]/50 text-xs text-[#c9c5d1] flex items-center justify-between">
              <span>发现你感兴趣的建筑？</span>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onNavigateToTab('canvas');
                }}
                className="text-[#ffc97a] hover:text-[#fff1d6] font-semibold text-xs"
              >
                前往小镇勘查
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Town Chronicle Logbook (Recent Landmarked Interactions) */}
      <div className="game-panel p-5">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#344672]/30 mb-4">
          <div className="flex items-center gap-2">
            <Scroll className="w-4 h-4 text-[#ffc97a]" />
            <h3 className="font-bold text-sm text-[#f8f2e7]">小镇最新回响与物语</h3>
          </div>
          <button
            onClick={() => {
              soundEngine.playClick();
              onNavigateToTab('dialogues');
            }}
            className="text-xs text-[#ffc97a] hover:text-[#fff1d6] font-semibold transition"
          >
            浏览全部记录 ({interactions.length}) →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {interactions.slice(0, 6).map(record => {
            const agentA = agents.find(a => a.id === record.participants?.[0]);
            const agentB = agents.find(a => a.id === record.participants?.[1]);
            const titleNames = record.participantNames?.join(' ✦ ') || `${agentA?.name || '居民A'} ✦ ${agentB?.name || '居民B'}`;

            return (
              <div
                key={record.id}
                className="p-3.5 rounded-2xl bg-[#202b46]/60 hover:bg-[#273552] border border-[#344672]/30 hover:border-[#ffc97a]/35 transition text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] text-[#c9c5d1] mb-2">
                    <span className="font-semibold text-[#ffc97a] flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{record.location}</span>
                    </span>
                    <span className="font-mono text-[10px] text-[#8f93a8]">
                      第 {record.simDay} 天 · {record.simTime}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-bold text-xs text-[#f8f2e7] mb-1.5">
                    <span>{titleNames}</span>
                  </div>

                  <p className="text-[11px] text-[#c9c5d1] line-clamp-2 italic leading-relaxed">
                    "{record.summary}"
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-[#344672]/20 flex items-center justify-between text-[10px]">
                  <span className="px-2 py-0.5 rounded-full bg-[#ffb86b]/15 text-[#ffc97a] font-medium">
                    {record.topic || '闲谈生活'}
                  </span>
                  <span className={record.sentiment === 'positive' ? 'text-[#71c68b]' : record.sentiment === 'conflict' ? 'text-[#f7a76c]' : 'text-[#73c7e8]'}>
                    {record.sentiment === 'positive' ? '✨ 心意相通' : record.sentiment === 'conflict' ? '⚡ 思维碰撞' : '💬 寻常交谈'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
