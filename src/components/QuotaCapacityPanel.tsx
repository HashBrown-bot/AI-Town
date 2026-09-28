import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Database, 
  Cpu, 
  ShieldAlert, 
  CheckCircle2, 
  RefreshCw, 
  AlertTriangle, 
  HardDrive, 
  Zap, 
  Server, 
  Clock, 
  Layers, 
  TrendingUp, 
  ArrowUpRight,
  Sparkles,
  BarChart3,
  Flame,
  FileCode2
} from 'lucide-react';
import { FirestoreCapacityMetrics, fetchFirestoreCapacityMetrics } from '../services/firebase';
import { soundEngine } from '../utils/audioSystem';

interface QuotaCapacityPanelProps {
  onRefreshFirestore: () => void;
}

interface ServerQuotaMetrics {
  startedAt: number;
  geminiModel: string;
  totalCalls: number;
  geminiSuccessCalls: number;
  fallbackCalls: number;
  rateLimitHits: number;
  totalPromptTokens: number;
  totalCandidateTokens: number;
  liveRPM: number;
  liveTPM: number;
  taskBreakdown: {
    dialogue: number;
    analyze: number;
    event_impact: number;
    generate_agent: number;
    reflect?: number;
  };
  recentCalls: {
    id: string;
    timestamp: number;
    task: string;
    model: string;
    status: string;
    latencyMs: number;
    promptCharLength: number;
    approxTokens: number;
    summary?: string;
  }[];
  circuitBreaker: {
    isRateLimited: boolean;
    cooldownSecondsRemaining: number;
    quotaExhaustedUntil: number;
  };
  uptimeSeconds: number;
  hasApiKey: boolean;
  limits: {
    rpmLimit: number;
    tpmLimit: number;
    rpdLimit: number;
  };
}

export const QuotaCapacityPanel: React.FC<QuotaCapacityPanelProps> = ({ onRefreshFirestore }) => {
  const [serverMetrics, setServerMetrics] = useState<ServerQuotaMetrics | null>(null);
  const [dbMetrics, setDbMetrics] = useState<FirestoreCapacityMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const [serverRes, firestoreData] = await Promise.allSettled([
        fetch('/api/metrics/quota').then(r => r.json()),
        fetchFirestoreCapacityMetrics(),
      ]);

      if (serverRes.status === 'fulfilled') {
        setServerMetrics(serverRes.value);
      }
      if (firestoreData.status === 'fulfilled') {
        setDbMetrics(firestoreData.value);
      }
      setLastCheckTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('Failed to load quota metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();

    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchMetrics();
    }, 6000);

    return () => clearInterval(interval);
  }, [fetchMetrics, autoRefresh]);

  const handleManualRefresh = () => {
    soundEngine.playClick();
    fetchMetrics();
    onRefreshFirestore();
  };

  // Helper formatting functions
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(3)} GB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'gemini_success':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Gemini 成功
          </span>
        );
      case 'rate_limited_fallback':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            熔断降级
          </span>
        );
      case 'quota_error_fallback':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            配额超限保护
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300">
            本地生成
          </span>
        );
    }
  };

  const getTaskName = (task: string) => {
    switch (task) {
      case 'dialogue': return '居民日常对话';
      case 'analyze': return '小镇态势研判';
      case 'event_impact': return '事件效应推演';
      case 'generate_agent': return '居民设定生成';
      default: return task;
    }
  };

  // Compute calculated metrics
  const totalCalls = serverMetrics?.totalCalls || 0;
  const successRate = totalCalls > 0 
    ? Math.round(((serverMetrics?.geminiSuccessCalls || 0) / totalCalls) * 100) 
    : 100;
  
  const rpmRatio = serverMetrics ? (serverMetrics.liveRPM / (serverMetrics.limits.rpmLimit || 15)) : 0;
  const tpmRatio = serverMetrics ? (serverMetrics.liveTPM / (serverMetrics.limits.tpmLimit || 1000000)) : 0;

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-6 space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Google API 配额与云端数据库容量监控看板</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
              Live Monitor
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            实时监测 Gemini 3.8 Flash 模型请求频次 (RPM/TPM)、熔断状态与 Firebase Firestore 存储容量
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
              autoRefresh 
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span>自动刷新 (6s)</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>立即检测</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Gemini Live Rate Limits */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Gemini 实时请求频次 (RPM)</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Activity className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white tracking-tight">
                {serverMetrics?.liveRPM || 0}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                / {serverMetrics?.limits.rpmLimit || 15} RPM
              </span>
            </div>

            {/* RPM Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  rpmRatio > 0.8 ? 'bg-rose-500' : rpmRatio > 0.5 ? 'bg-amber-400' : 'bg-blue-500'
                }`} 
                style={{ width: `${Math.min(100, Math.max(3, rpmRatio * 100))}%` }} 
              />
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">熔断保护状态:</span>
            {serverMetrics?.circuitBreaker.isRateLimited ? (
              <span className="text-amber-400 font-medium flex items-center gap-1 font-mono">
                <Flame className="w-3 h-3 text-amber-400" />
                冷却中 ({serverMetrics.circuitBreaker.cooldownSecondsRemaining}s)
              </span>
            ) : (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 正常就绪
              </span>
            )}
          </div>
        </div>

        {/* KPI 2: Token Throughput */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Token 吞吐量 (TPM)</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Cpu className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white tracking-tight">
                {serverMetrics?.liveTPM || 0}
              </span>
              <span className="text-xs text-slate-400 font-mono">/ 1M TPM</span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(2, tpmRatio * 100))}%` }} 
              />
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">累计 Token:</span>
            <span className="text-indigo-300 font-semibold">
              {((serverMetrics?.totalPromptTokens || 0) + (serverMetrics?.totalCandidateTokens || 0)).toLocaleString()} Tokens
            </span>
          </div>
        </div>

        {/* KPI 3: Firestore Cloud Storage */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Firestore 存储容量</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <HardDrive className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white tracking-tight">
                {formatBytes(dbMetrics?.totalEstimatedBytes || 0)}
              </span>
              <span className="text-xs text-slate-400 font-mono">/ 1.00 GB</span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(1, (dbMetrics?.storageUsageRatio || 0) * 100))}%` }} 
              />
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">总云端文档:</span>
            <span className="text-emerald-300 font-semibold">
              {dbMetrics?.totalDocuments || 0} 个 Document
            </span>
          </div>
        </div>

        {/* KPI 4: Firestore Daily Free Tier Quota */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Firestore 每日读写配额</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Database className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white tracking-tight">
                {dbMetrics?.sessionWrites || 0}
              </span>
              <span className="text-xs text-slate-400 font-mono">写 / {dbMetrics?.sessionReads || 0} 读</span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className="bg-amber-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(2, (dbMetrics?.dailyWriteUsageRatio || 0) * 100))}%` }} 
              />
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">免费上限:</span>
            <span className="text-slate-300">
              20k 写 / 50k 读 (天)
            </span>
          </div>
        </div>
      </div>

      {/* Middle Section: Task Breakdown & Cloud Collections Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Gemini API Breakdown & Model Info */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              <h3 className="font-semibold text-sm text-white">
                Gemini 模型调用负载与任务分布
              </h3>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {serverMetrics?.geminiModel || 'gemini-3.8-flash'}
            </span>
          </div>

          {/* Model Status Metrics */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center font-mono">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">总请求次数</span>
              <span className="text-base font-bold text-white">{totalCalls} 次</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">成功直连率</span>
              <span className="text-base font-bold text-emerald-400">{successRate}%</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">降级补偿次数</span>
              <span className="text-base font-bold text-amber-400">{serverMetrics?.fallbackCalls || 0} 次</span>
            </div>
          </div>

          {/* Task Breakdown Bars */}
          <div className="space-y-3 pt-1">
            {[
              { key: 'dialogue', label: '居民自主交谈 (Dialogue)', count: serverMetrics?.taskBreakdown.dialogue || 0, color: 'from-blue-500 to-cyan-500' },
              { key: 'reflect', label: '长期记忆反思与顿悟 (Reflection)', count: serverMetrics?.taskBreakdown.reflect || 0, color: 'from-violet-500 to-purple-500' },
              { key: 'analyze', label: 'AI 全镇态势研判 (Town Analysis)', count: serverMetrics?.taskBreakdown.analyze || 0, color: 'from-indigo-500 to-blue-500' },
              { key: 'event_impact', label: '上帝视角事件推演 (Event Impact)', count: serverMetrics?.taskBreakdown.event_impact || 0, color: 'from-amber-500 to-orange-500' },
              { key: 'generate_agent', label: '个性化新居民生成 (Persona Studio)', count: serverMetrics?.taskBreakdown.generate_agent || 0, color: 'from-pink-500 to-rose-500' }
            ].map(item => {
              const pct = totalCalls > 0 ? Math.round((item.count / totalCalls) * 100) : 0;
              return (
                <div key={item.key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">{item.label}</span>
                    <span className="font-mono text-slate-400">{item.count} 次 ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className={`bg-gradient-to-r ${item.color} h-full rounded-full transition-all duration-300`} style={{ width: `${Math.max(2, pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-400 italic">
            * 提示：当触发 Google 免费层配额上限 (429) 时，熔断器会自动接管并由本地拟真计算引擎生成剧情，绝不中断小镇运行。
          </p>
        </div>

        {/* Right: Cloud Firestore Collections Breakdown */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <h3 className="font-semibold text-sm text-white">
                Firestore 数据库集合结构与体量
              </h3>
            </div>
            <span className="font-mono text-[10px] text-slate-400">
              最后检查: {lastCheckTime || '刚刚'}
            </span>
          </div>

          {/* Database Meta */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>项目 ID:</span>
              <span className="text-slate-200">{dbMetrics?.projectId || 'your-firebase-project-id'}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>数据库 ID:</span>
              <span className="text-slate-200 text-[11px] truncate max-w-[240px]">{dbMetrics?.firestoreDatabaseId || 'default'}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>连接模式:</span>
              <span className="text-emerald-400 font-semibold">Web Client SDK (Live Online)</span>
            </div>
          </div>

          {/* Collection Rows */}
          <div className="space-y-2">
            {[
              { path: '/interactions', name: '居民交互日志 (Interactions)', data: dbMetrics?.collections.interactions, color: 'text-blue-400' },
              { path: '/agents', name: '居民状态与档案 (Agents)', data: dbMetrics?.collections.agents, color: 'text-emerald-400' },
              { path: '/town_events', name: '小镇公共事件 (Town Events)', data: dbMetrics?.collections.town_events, color: 'text-amber-400' },
              { path: '/analyses', name: 'AI 冲突研判报告 (Analyses)', data: dbMetrics?.collections.analyses, color: 'text-purple-400' },
              { path: '/simulation_state', name: '小镇时钟与天数 (Clock State)', data: dbMetrics?.collections.simulation_state, color: 'text-rose-400' }
            ].map(col => (
              <div key={col.path} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <span className="font-mono text-[11px] text-slate-500">{col.path}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{col.name}</div>
                </div>

                <div className="text-right font-mono">
                  <span className={`font-bold ${col.color}`}>{col.data?.count || 0} 条</span>
                  <span className="text-slate-500 text-[10px] block">{formatBytes(col.data?.estimatedBytes || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Real-time API Call Audit Stream */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-sm text-white">
              实时 API 调用流水与配额消耗审计日志 (Recent Invocations)
            </h3>
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            最近 {serverMetrics?.recentCalls?.length || 0} 条记录
          </span>
        </div>

        {(!serverMetrics?.recentCalls || serverMetrics.recentCalls.length === 0) ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            暂无 API 交互调用记录，等待居民发起交流...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-mono">
                  <th className="pb-2.5 font-medium">调用时刻</th>
                  <th className="pb-2.5 font-medium">任务类型</th>
                  <th className="pb-2.5 font-medium">执行模型</th>
                  <th className="pb-2.5 font-medium">执行状态</th>
                  <th className="pb-2.5 font-medium">耗时 (Latency)</th>
                  <th className="pb-2.5 font-medium">Token 估算</th>
                  <th className="pb-2.5 font-medium">调用概要</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {serverMetrics.recentCalls.map(call => (
                  <tr key={call.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 text-slate-400 text-[11px]">
                      {new Date(call.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 font-sans font-medium text-slate-200">
                      {getTaskName(call.task)}
                    </td>
                    <td className="py-2.5 text-[11px] text-slate-400">
                      {call.model}
                    </td>
                    <td className="py-2.5">
                      {getStatusBadge(call.status)}
                    </td>
                    <td className="py-2.5 text-slate-300">
                      {call.latencyMs} ms
                    </td>
                    <td className="py-2.5 text-slate-300">
                      ~{call.approxTokens}
                    </td>
                    <td className="py-2.5 font-sans text-slate-400 text-[11px] max-w-[260px] truncate" title={call.summary}>
                      {call.summary || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
