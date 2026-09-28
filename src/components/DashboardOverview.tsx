import React, { useRef, useEffect, useState } from 'react';
import { Agent, Building, InteractionRecord, TownAnalysis } from '../types/town';
import { 
  Users, 
  MessageSquare, 
  HeartHandshake, 
  AlertTriangle, 
  Sparkles, 
  Building2, 
  Compass, 
  ArrowUpRight,
  TrendingUp,
  Flame,
  CheckCircle2,
  Database
} from 'lucide-react';

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
  
  const avgMood = Math.round(agents.reduce((acc, a) => acc + a.state.mood, 0) / (agents.length || 1));
  const avgStress = Math.round(agents.reduce((acc, a) => acc + a.state.stress, 0) / (agents.length || 1));
  const conflictIndex = Math.min(100, Math.round((conflictInteractions / (totalInteractions || 1)) * 100 + (avgStress * 0.3)));

  // Location popularity ranking
  const locationCounts: Record<string, number> = {};
  interactions.forEach(i => {
    locationCounts[i.location] = (locationCounts[i.location] || 0) + 1;
  });
  const sortedLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]);

  // Social Network Graph Canvas Renderer
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

    // Node layout positions in a circle
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.38;

    const nodePositions: Record<string, { x: number; y: number; agent: Agent }> = {};
    agents.forEach((agent, idx) => {
      const angle = (idx / agents.length) * Math.PI * 2 - Math.PI / 2;
      nodePositions[agent.id] = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        agent
      };
    });

    let tick = 0;

    const renderGraph = () => {
      tick++;
      ctx.clearRect(0, 0, width, height);

      // Draw Relationship Connecting Lines
      agents.forEach(agentA => {
        const posA = nodePositions[agentA.id];
        if (!posA) return;

        Object.entries(agentA.affinity || {}).forEach(([targetId, score]) => {
          const posB = nodePositions[targetId];
          if (!posB || agentA.id >= targetId) return; // avoid duplicate lines

          const isFriction = score < 0;
          const absScore = Math.abs(score);
          const alpha = Math.min(0.8, Math.max(0.15, absScore / 80));

          ctx.beginPath();
          ctx.moveTo(posA.x, posA.y);
          ctx.lineTo(posB.x, posB.y);

          if (isFriction) {
            ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
            ctx.lineWidth = 1 + (absScore / 30);
            ctx.setLineDash([4, 4]);
          } else {
            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
            ctx.lineWidth = 1 + (absScore / 25);
            ctx.setLineDash([]);
          }

          ctx.stroke();
          ctx.setLineDash([]);
        });
      });

      // Draw Nodes
      Object.entries(nodePositions).forEach(([id, { x, y, agent }]) => {
        const isHovered = hoveredNode === id;
        const nodeRadius = isHovered ? 20 : 16;

        // Outer glow
        if (isHovered) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
          ctx.beginPath();
          ctx.arc(x, y, nodeRadius + 8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Node Circle
        ctx.fillStyle = agent.spriteColor || '#3b82f6';
        ctx.beginPath();
        ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = isHovered ? '#38bdf8' : '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Agent Name
        ctx.fillStyle = '#f8fafc';
        ctx.font = isHovered ? 'bold 11px "Plus Jakarta Sans"' : '10px "Plus Jakarta Sans"';
        ctx.textAlign = 'center';
        ctx.fillText(agent.name, x, y + nodeRadius + 14);

        // Role snippet
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px "Plus Jakarta Sans"';
        ctx.fillText(agent.mbti, x, y + nodeRadius + 25);
      });

      animId = requestAnimationFrame(renderGraph);
    };

    renderGraph();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [agents, hoveredNode]);

  // Handle canvas mouse hover
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = networkCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.38;

    let foundId: string | null = null;
    agents.forEach((agent, idx) => {
      const angle = (idx / agents.length) * Math.PI * 2 - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      if (Math.hypot(mouseX - x, mouseY - y) < 22) {
        foundId = agent.id;
      }
    });

    setHoveredNode(foundId);
  };

  const handleCanvasClick = () => {
    if (hoveredNode) {
      onSelectAgent(hoveredNode);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-6 space-y-6 text-slate-100">
      {/* Top Welcome & KPI Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>小镇社会态势全景与演化仪表盘</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
              Live Analytics
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            实时捕获居民间的情感纽带、性格分布、冲突指数与云端持久化分析
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenFineTuningExport}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
          >
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>导出模型微调集 (JSONL)</span>
          </button>

          <button
            onClick={() => onNavigateToTab('analyzer')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-medium shadow-md shadow-blue-900/30 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI 深度冲突分析</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">自主社交交互总量</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {totalInteractions}
            </span>
            <span className="text-[11px] text-emerald-400 flex items-center font-medium">
              <ArrowUpRight className="w-3 h-3" /> 持续演化中
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            积极对话 {positiveInteractions} 场 · 争辩 {conflictInteractions} 场
          </p>
        </div>

        {/* KPI 2 */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">小镇幸福感指数</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono tracking-tight ${avgMood >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {avgMood > 0 ? `+${avgMood}` : avgMood}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ 100</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.max(5, (avgMood + 100) / 2)}%` }} 
            />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">社会张力与冲突指数</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {conflictIndex}%
            </span>
            <span className={`text-[11px] font-medium ${conflictIndex > 40 ? 'text-rose-400' : 'text-slate-400'}`}>
              {conflictIndex > 50 ? '需市政干预' : conflictIndex > 25 ? '正常碰撞' : '极人和睦'}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${conflictIndex > 40 ? 'bg-rose-500' : 'bg-blue-500'}`} 
              style={{ width: `${conflictIndex}%` }} 
            />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">云端持久化状态</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {totalInteractions + agents.length}
            </span>
            <span className="text-xs text-slate-400">条集合</span>
          </div>
          <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-mono">
            <CheckCircle2 className="w-3 h-3" /> Firestore 实时双向同步
          </p>
        </div>
      </div>

      {/* Main Grid: Social Network Graph & AI Brief */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Social Relationship Force Network Graph (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>居民人际关系与社会引力网络图</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                实线代表正向情感互信，虚线代表观念分歧摩擦；悬停可查看居民
              </p>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-blue-400 rounded" />
                <span>友好信任</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-rose-400 rounded" />
                <span>理念分歧</span>
              </div>
            </div>
          </div>

          {/* Network Canvas */}
          <div className="relative flex-1 min-h-[340px] mt-2 cursor-pointer">
            <canvas
              ref={networkCanvasRef}
              onMouseMove={handleCanvasMouseMove}
              onClick={handleCanvasClick}
              className="w-full h-full"
            />

            {hoveredNode && (
              <div className="absolute bottom-3 right-3 bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs shadow-xl pointer-events-none">
                <div className="font-semibold text-white">
                  {agents.find(a => a.id === hoveredNode)?.name}
                </div>
                <div className="text-[11px] text-slate-400">
                  {agents.find(a => a.id === hoveredNode)?.role}
                </div>
                <div className="text-[10px] text-blue-400 mt-0.5">
                  点击查看个人详细演变轨迹 ➔
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Analyzer Executive Brief Card (1 Col) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>AI 小镇态势研判简报</span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                Gemini 3.8
              </span>
            </div>

            {latestAnalysis ? (
              <div className="mt-4 space-y-4">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    小镇心理气候
                  </span>
                  <p className="text-xs text-slate-200 font-medium mt-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    {latestAnalysis.emotionalVibe}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    核心冲突前沿 ({latestAnalysis.coreConflicts?.length || 0})
                  </span>
                  <div className="mt-1 space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {latestAnalysis.coreConflicts?.map((conflict, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs">
                        <div className="flex items-center justify-between text-rose-300 font-semibold">
                          <span>{conflict.title}</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20">
                            烈度 {conflict.intensity}%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {conflict.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    结成同盟圈层
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {latestAnalysis.alliances?.map((alliance, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[11px] font-medium"
                      >
                        {alliance.name} ({alliance.members.join(' · ')})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                正在汇总小镇近期演化数据...
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateToTab('analyzer')}
            className="w-full mt-4 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 text-center transition flex items-center justify-center gap-1.5"
          >
            <span>进入 AI 分析器完整报告</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Section: Location Traffic & Recent Dialogue Snippets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Location Hotspots */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-sm text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>小镇建筑人流与社交活跃度</span>
          </h3>

          <div className="mt-4 space-y-3">
            {buildings.map(b => {
              const count = locationCounts[b.name] || 0;
              const maxCount = Math.max(1, ...Object.values(locationCounts));
              const pct = Math.round((count / maxCount) * 100);

              return (
                <div 
                  key={b.id} 
                  onClick={() => onSelectBuilding(b.id)}
                  className="group cursor-pointer p-2 rounded-xl hover:bg-slate-800/60 transition"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-200 group-hover:text-blue-400 transition flex items-center gap-1.5">
                      <span>{b.icon}</span>
                      <span>{b.name}</span>
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      {count} 次偶遇
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Big Five Average Profile Across Town */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-sm text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <Compass className="w-4 h-4 text-emerald-400" />
            <span>居民大五人格（Big Five）群体均值</span>
          </h3>

          <div className="mt-4 space-y-3.5">
            {[
              {
                key: 'openness',
                label: '开放性 (Openness)',
                desc: '对新事物、知识与艺术的探索欲望',
                val: Math.round(agents.reduce((a, b) => a + b.bigFive.openness, 0) / (agents.length || 1)),
                color: 'from-blue-500 to-cyan-500'
              },
              {
                key: 'conscientiousness',
                label: '尽责性 (Conscientiousness)',
                desc: '自律守序、计划执行与责任担当',
                val: Math.round(agents.reduce((a, b) => a + b.bigFive.conscientiousness, 0) / (agents.length || 1)),
                color: 'from-emerald-500 to-teal-500'
              },
              {
                key: 'extraversion',
                label: '外向性 (Extraversion)',
                desc: '热情善谈、主动社交与群体活力',
                val: Math.round(agents.reduce((a, b) => a + b.bigFive.extraversion, 0) / (agents.length || 1)),
                color: 'from-amber-500 to-orange-500'
              },
              {
                key: 'agreeableness',
                label: '宜人性 (Agreeableness)',
                desc: '同理心、合作互助与善意信任',
                val: Math.round(agents.reduce((a, b) => a + b.bigFive.agreeableness, 0) / (agents.length || 1)),
                color: 'from-pink-500 to-rose-500'
              },
              {
                key: 'neuroticism',
                label: '情绪敏感度 (Neuroticism)',
                desc: '压力耐受与环境波动的感知力',
                val: Math.round(agents.reduce((a, b) => a + b.bigFive.neuroticism, 0) / (agents.length || 1)),
                color: 'from-purple-500 to-indigo-500'
              }
            ].map(trait => (
              <div key={trait.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-300">{trait.label}</span>
                  <span className="font-mono text-slate-200 font-semibold">{trait.val} / 100</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`bg-gradient-to-r ${trait.color} h-full rounded-full`}
                    style={{ width: `${trait.val}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500">{trait.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
