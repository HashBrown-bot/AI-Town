import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { isQuotaError, fallbackStatus, sequenceDialogueLines } from './src/utils/generation';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Google Gemini SDK if API key is present
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Circuit Breaker & Real-Time Metrics Tracking for Gemini API Quotas
let quotaExhaustedUntil = 0;

interface ApiCallLog {
  id: string;
  timestamp: number;
  task: 'dialogue' | 'analyze' | 'event_impact' | 'generate_agent' | 'reflect';
  model: string;
  status: 'gemini_success' | 'rate_limited_fallback' | 'quota_error_fallback' | 'procedural_fallback' | 'api_error_fallback';
  latencyMs: number;
  promptCharLength: number;
  approxTokens: number;
  summary?: string;
}

const apiMetrics = {
  startedAt: Date.now(),
  geminiModel: 'gemini-3.8-flash',
  totalCalls: 0,
  geminiSuccessCalls: 0,
  fallbackCalls: 0,
  rateLimitHits: 0,
  totalPromptTokens: 0,
  totalCandidateTokens: 0,
  taskBreakdown: {
    dialogue: 0,
    analyze: 0,
    event_impact: 0,
    generate_agent: 0,
    reflect: 0,
  },
  recentCalls: [] as ApiCallLog[],
  limits: {
    rpmLimit: 15,       // Free tier 15 Requests per minute
    tpmLimit: 1000000,  // Free tier 1M Tokens per minute
    rpdLimit: 1500,     // Free tier 1500 Requests per day
  }
};

function recordApiCall(log: ApiCallLog) {
  // Rule-generated text incurs no model token usage. Failed responses have no
  // measurable output; the token totals remain successful-response estimates.
  if (log.status !== 'gemini_success') log = { ...log, approxTokens: 0 };
  apiMetrics.totalCalls++;
  apiMetrics.taskBreakdown[log.task] = (apiMetrics.taskBreakdown[log.task] || 0) + 1;
  if (log.status === 'gemini_success') {
    apiMetrics.geminiSuccessCalls++;
  } else {
    apiMetrics.fallbackCalls++;
    if (log.status === 'rate_limited_fallback' || log.status === 'quota_error_fallback') {
      apiMetrics.rateLimitHits++;
    }
  }
  if (log.status === 'gemini_success') {
    apiMetrics.totalPromptTokens += Math.round(log.approxTokens * 0.7);
    apiMetrics.totalCandidateTokens += Math.round(log.approxTokens * 0.3);
  }

  apiMetrics.recentCalls.unshift(log);
  if (apiMetrics.recentCalls.length > 50) {
    apiMetrics.recentCalls.pop();
  }
}

function isGeminiRateLimited(): boolean {
  return Date.now() < quotaExhaustedUntil;
}

function handleGeminiQuotaError(err: any, taskName: string) {
  const errMsg = String(err?.message || err);
  const is429 = isQuotaError(err);
  
  if (is429) {
    // 60-second cooldown period before retrying Gemini API
    quotaExhaustedUntil = Date.now() + 60000;
    console.warn(`[Gemini API Quota Notice] ${taskName}: Free tier request limit reached. Switched to procedural simulation engine for 60s cooldown.`);
  } else {
    console.warn(`[Gemini API Warning] ${taskName}:`, errMsg);
  }
  return is429;
}

// ==========================================
// METRICS ENDPOINT: GET /api/metrics/quota
// ==========================================
app.get('/api/metrics/quota', (_req, res) => {
  const now = Date.now();
  const cooldownSecondsRemaining = Math.max(0, Math.ceil((quotaExhaustedUntil - now) / 1000));
  
  // Calculate calls in last 60 seconds for live RPM
  const oneMinuteAgo = now - 60000;
  const recent1mCalls = apiMetrics.recentCalls.filter(c => c.timestamp >= oneMinuteAgo && ['gemini_success', 'quota_error_fallback', 'api_error_fallback'].includes(c.status)).length;
  const recent1mTokens = apiMetrics.recentCalls
    .filter(c => c.timestamp >= oneMinuteAgo && c.status === 'gemini_success')
    .reduce((sum, c) => sum + c.approxTokens, 0);

  res.json({
    ...apiMetrics,
    liveRPM: recent1mCalls,
    liveTPM: recent1mTokens,
    circuitBreaker: {
      isRateLimited: isGeminiRateLimited(),
      cooldownSecondsRemaining,
      quotaExhaustedUntil,
    },
    uptimeSeconds: Math.floor((now - apiMetrics.startedAt) / 1000),
    hasApiKey: Boolean(apiKey),
  });
});

// ==========================================
// 1. POST /api/ai/dialogue
// Autonomous dialogue generation between two agents with Memory Retrieval Context
// ==========================================
app.post('/api/ai/dialogue', async (req, res) => {
  const { agentA, agentB, location, context, recentEvents, agentAContext, agentBContext } = req.body;
  const startTime = Date.now();

  if (!ai || isGeminiRateLimited()) {
    const result = generateProceduralDialogue(agentA, agentB, location, context, recentEvents);
    recordApiCall({
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      task: 'dialogue',
      model: isGeminiRateLimited() ? 'procedural-cooldown' : 'procedural-local',
      status: fallbackStatus(Boolean(ai), isGeminiRateLimited()),
      latencyMs: Date.now() - startTime,
      promptCharLength: 0,
      approxTokens: 320,
      summary: `${agentA?.name} & ${agentB?.name} @ ${location?.name || '小镇'}: ${result.topic}`
    });
    return res.json({ ...result, generation: { source: 'server_fallback', reason: !ai ? 'no_api_key' : 'quota', latencyMs: Date.now() - startTime } });
  }

  try {
    const relAtoB = agentA.relationships?.[agentB.id];
    const relBtoA = agentB.relationships?.[agentA.id];
    const relDescA = relAtoB 
      ? `阶段【${relAtoB.relationshipStage}】(${relAtoB.dominantDynamic || '日常往来'}), 熟识:${relAtoB.familiarity}, 信任:${relAtoB.trust}, 好感:${relAtoB.affection}, 敬重:${relAtoB.respect}, 竞争心:${relAtoB.rivalry}, 芥蒂:${relAtoB.resentment}`
      : `好感度: ${agentA.affinity?.[agentB.id] || 0}`;

    const relDescB = relBtoA 
      ? `阶段【${relBtoA.relationshipStage}】(${relBtoA.dominantDynamic || '日常往来'}), 熟识:${relBtoA.familiarity}, 信任:${relBtoA.trust}, 好感:${relBtoA.affection}, 敬重:${relBtoA.respect}, 竞争心:${relBtoA.rivalry}, 芥蒂:${relBtoA.resentment}`
      : `好感度: ${agentB.affinity?.[agentA.id] || 0}`;

    const prompt = `
你是一个社会模拟仿真世界的叙事引擎。在像素小镇"${location?.name || '小镇'}"（功能：${location?.description || '公共设施'}）中，两位居民发生了一次偶遇交谈。

【居民 A 档案】
姓名: ${agentA.name}
职业: ${agentA.role}
MBTI与性格: ${agentA.mbti}, 大五人格(开放性:${agentA.bigFive?.openness}, 尽责性:${agentA.bigFive?.conscientiousness}, 外向性:${agentA.bigFive?.extraversion}, 宜人性:${agentA.bigFive?.agreeableness}, 神经质:${agentA.bigFive?.neuroticism})
当前心情/状态: 心情${agentA.state?.mood}, 压力${agentA.state?.stress}, 当前活动: ${agentA.currentActivity}
当前追求目标: ${agentA.currentGoal || '维持小镇日常并探索生活'}
核心背景与怪癖: ${agentA.bio} | ${agentA.quirks?.join(', ')}
对 ${agentB.name} 的多维关系: ${relDescA}
【居民 A 检索出的长期记忆与反思】:
${agentAContext || '暂无对该居民的深刻历史往来，初次正常接触。'}

【居民 B 档案】
姓名: ${agentB.name}
职业: ${agentB.role}
MBTI与性格: ${agentB.mbti}, 大五人格(开放性:${agentB.bigFive?.openness}, 尽责性:${agentB.bigFive?.conscientiousness}, 外向性:${agentB.bigFive?.extraversion}, 宜人性:${agentB.bigFive?.agreeableness}, 神经质:${agentB.bigFive?.neuroticism})
当前心情/状态: 心情${agentB.state?.mood}, 压力${agentB.state?.stress}, 当前活动: ${agentB.currentActivity}
当前追求目标: ${agentB.currentGoal || '维持小镇日常并探索生活'}
核心背景与怪癖: ${agentB.bio} | ${agentB.quirks?.join(', ')}
对 ${agentA.name} 的多维关系: ${relDescB}
【居民 B 检索出的长期记忆与反思】:
${agentBContext || '暂无对该居民的深刻历史往来，初次正常接触。'}

【当前场景与近期小镇事件】
地点: ${location?.name || '小镇'}
近期全镇事件: ${recentEvents || '小镇岁月安好，微风拂过广场'}
偶遇背景: ${context || '在同一场所驻足相遇'}

【关键对话原则】:
1. 双方必须根据检索出的【长期记忆与反思】展开交流！如果之前有合作、冲突或信任积累，必须自然提及，不能表现得像陌生人！
2. 对话应反映出双方的性格特质与当前心情状态，4-6个交替对话回合。
3. 产生本次交谈后，双方各自沉淀的核心情境记忆（memoryA、memoryB）必须具体生动。

严格输出以下纯JSON格式（不要包含Markdown代码块或其他多余文字）：
{
  "topic": "对话核心主题短语（如：就昨夜星空手稿探讨古籍合作）",
  "summary": "一句话对话简要纪要",
  "sentiment": "positive | neutral | conflict | deep | collaborative",
  "sentimentScore": 0.5, // -1.0 到 1.0 的浮点数
  "dialogue": [
    {"speakerId": "${agentA.id}", "speakerName": "${agentA.name}", "text": "话语内容", "emotion": "curious | happy | thoughtful | irritated | warm"},
    {"speakerId": "${agentB.id}", "speakerName": "${agentB.name}", "text": "话语内容", "emotion": "friendly | nervous | proud | sarcastic | serene"}
  ],
  "affinityDeltaAtoB": 5, // A对B的好感变化 (-15到+15)
  "affinityDeltaBtoA": 5, // B对A的好感变化 (-15到+15)
  "memoryA": "A记住的关于本次互动的具体情境记忆",
  "memoryB": "B记住的关于本次互动的具体情境记忆",
  "importance": 7, // 1-10 本次交流的重要度评分
  "emotionalIntensity": 6 // 1-10 本次交流的情绪波动烈度
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '';
    const parsed = JSON.parse(text);

    recordApiCall({
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      task: 'dialogue',
      model: 'gemini-3.8-flash',
      status: 'gemini_success',
      latencyMs: Date.now() - startTime,
      promptCharLength: prompt.length,
      approxTokens: Math.round((prompt.length + text.length) / 3),
      summary: `${agentA?.name} & ${agentB?.name}: ${parsed.topic || '偶遇交流'}`
    });

    return res.json({ ...parsed, generation: { source: 'model', latencyMs: Date.now() - startTime } });
  } catch (err: any) {
    const quotaError = handleGeminiQuotaError(err, 'Dialogue Generation');
    const result = generateProceduralDialogue(agentA, agentB, location, context, recentEvents);
    recordApiCall({
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      task: 'dialogue',
      model: 'procedural-fallback',
      status: quotaError ? 'quota_error_fallback' : 'api_error_fallback',
      latencyMs: Date.now() - startTime,
      promptCharLength: 0,
      approxTokens: 280,
      summary: `[规则备用] ${agentA?.name} & ${agentB?.name}: ${result.topic}`
    });
    return res.json({ ...result, generation: { source: 'server_fallback', reason: quotaError ? 'quota' : 'api_error', latencyMs: Date.now() - startTime } });
  }
});

// ==========================================
// 1.5. POST /api/ai/reflect
// Agent Long-Term Memory Synthesis & Reflection Engine
// ==========================================
app.post('/api/ai/reflect', async (req, res) => {
  const { agent, recentMemories, currentSimDay, currentSimTime } = req.body;
  const startTime = Date.now();

  if (!ai || isGeminiRateLimited()) {
    const result = generateProceduralReflection(agent, recentMemories);
    recordApiCall({
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      task: 'reflect',
      model: isGeminiRateLimited() ? 'procedural-cooldown' : 'procedural-local',
      status: fallbackStatus(Boolean(ai), isGeminiRateLimited()),
      latencyMs: Date.now() - startTime,
      promptCharLength: 0,
      approxTokens: 290,
      summary: `${agent?.name} 深度反思顿悟 (基准降级)`
    });
    return res.json({ ...result, generation: { source: 'server_fallback', reason: !ai ? 'no_api_key' : 'quota', latencyMs: Date.now() - startTime } });
  }

  try {
    const memoriesText = (recentMemories || []).slice(0, 10).map((m: any, idx: number) => 
      `${idx + 1}. [第${m.simDay || currentSimDay}天 ${m.simTime || ''}] ${m.content} (情感:${m.sentiment || 'neutral'}, 重要度:${m.importance || 5}/10)`
    ).join('\n');

    const prompt = `
你是一个虚拟AI小镇居民的“深层意识与反思系统”（Reflection Engine）。
居民在经历了一系列生活事件、人际交谈与情感波动后，需要站在更高维度，对近期积累的散碎记忆进行深度反思、抽象与顿悟，提炼出长期的认知、人际印象演化或生活目标调整。

【居民个人档案】
姓名: ${agent.name}
职业: ${agent.role}
MBTI性格: ${agent.mbti}
当前生活目标: ${agent.currentGoal || '在小镇探索生活'}
生平背景: ${agent.bio}
当前心情: ${agent.state?.mood}, 压力: ${agent.state?.stress}

【最近累积的未消化记忆日志 (Episodic Memories)】
${memoriesText || '1. 今日在小镇正常工作，与邻里有日常交流。'}

请基于以上记忆流，让${agent.name}进行一次真切而深刻的“反思顿悟 (Reflection)”。
反思可以是：
- 对某个特定居民的信任度加深或产生戒心（如：“我最近越来越信任苏清禾，或许可以请她帮我筹划星空沙龙。”）
- 对生活方式或工作状态的自我领悟（如：“连续数日的赶工让我意识到，不能忽视身体的疲惫，该去诊所走走了。”）
- 产生了一个新的明确目标或行动计划（如：“我决定在下次议事会上正式提出修建观星廊道的提案。”）

严格输出纯JSON格式：
{
  "reflection": "以第一人称表达的深度反思句子（40-90字，真诚有深度）",
  "type": "reflection",
  "importance": 9, // 1-10，反思一般具有较高重要度
  "emotionalIntensity": 7, // 1-10
  "relatedAgentIds": ["关联居民的ID列表，若针对具体人"],
  "tags": ["反思", "人际信任", "成长"],
  "newGoal": "更新后的近期行动目标（若反思促使了目标改变，30字内）",
  "affinityAdjustments": {
    // 目标居民ID: 好感微调数值 (-10 到 +15)
  },
  "moodDelta": 5, // 心情改善或波动 (-15 到 +15)
  "stressDelta": -4 // 压力缓解或增加 (-15 到 +15)
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');

    recordApiCall({
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      task: 'reflect',
      model: 'gemini-3.8-flash',
      status: 'gemini_success',
      latencyMs: Date.now() - startTime,
      promptCharLength: prompt.length,
      approxTokens: Math.round((prompt.length + (response.text?.length || 0)) / 3),
      summary: `${agent?.name} 形成深度反思: ${parsed.reflection?.slice(0, 20)}...`
    });

    return res.json({ ...parsed, generation: { source: 'model', latencyMs: Date.now() - startTime } });
  } catch (err: any) {
    const quotaError = handleGeminiQuotaError(err, 'Agent Reflection Generation');
    const result = generateProceduralReflection(agent, recentMemories);
    recordApiCall({
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      task: 'reflect',
      model: 'procedural-fallback',
      status: quotaError ? 'quota_error_fallback' : 'api_error_fallback',
      latencyMs: Date.now() - startTime,
      promptCharLength: 0,
      approxTokens: 250,
      summary: `[降级] ${agent?.name} 深度反思顿悟`
    });
    return res.json({ ...result, generation: { source: 'server_fallback', reason: quotaError ? 'quota' : 'api_error', latencyMs: Date.now() - startTime } });
  }
});

// ==========================================
// 2. POST /api/ai/analyze
// Town Analyzer: Core conflicts & trend evolution
// ==========================================
app.post('/api/ai/analyze', async (req, res) => {
  const { interactions, agents, recentEvents } = req.body;
  const startTime = Date.now();

  if (!ai || isGeminiRateLimited()) {
    const result = generateProceduralAnalysis(interactions, agents);
    recordApiCall({
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      task: 'analyze',
      model: isGeminiRateLimited() ? 'procedural-cooldown' : 'procedural-local',
      status: fallbackStatus(Boolean(ai), isGeminiRateLimited()),
      latencyMs: Date.now() - startTime,
      promptCharLength: 0,
      approxTokens: 850,
      summary: '小镇全景冲突态势综合评估'
    });
    return res.json(result);
  }

  try {
    const interactionSummaries = (interactions || []).slice(0, 15).map((i: any) => 
      `[${i.simTime || '时段'}] ${i.location}: ${i.participantNames?.join(' 与 ')} 讨论了 "${i.topic}" (情感: ${i.sentiment}, 得分: ${i.sentimentScore})`
    ).join('\n');

    const agentProfiles = (agents || []).map((a: any) => 
      `${a.name} (${a.role}, 心情:${a.state?.mood}, 压力:${a.state?.stress})`
    ).join('; ');

    const prompt = `
你是一位专门研究虚拟微型社会演化的资深社会学与冲突分析学者。
以下是智能小镇最近一段时间的居民档案与互动日志：

【小镇居民概况】
${agentProfiles}

【近期关键互动日志】
${interactionSummaries}

【近期公共事件】
${recentEvents || '无重大外部冲击，居民自由活动'}

请深入剖析当前小镇的复杂社会动态，重点挖掘：
1. 居民间正在酝酿或暴露的核心冲突（利益、价值观、情感、职权等）
2. 正在结成的情感同盟或朋友圈（哪些居民联系紧密）
3. 小镇整体心理氛围指数（-100极度紧张/冷漠 到 +100极度和睦融洽）
4. 针对小镇治理与和谐演化的3条具体政策或干预建议

请严格以纯JSON格式返回：
{
  "title": "小镇社会动态与冲突演化分析简报",
  "summary": "150字左右的综合态势概括",
  "vibeScore": 65, // -100 到 +100
  "emotionalVibe": "充满朝气并伴有微小学术争执的探索期",
  "coreConflicts": [
    {
      "title": "冲突焦点标题",
      "intensity": 75, // 0-100 烈度
      "agentsInvolved": ["居民姓名A", "居民姓名B"],
      "description": "详细冲突起因与分歧要点"
    }
  ],
  "alliances": [
    {
      "name": "圈层/联盟称号（如：晨曦咖啡读书会）",
      "members": ["居民姓名A", "居民姓名C"],
      "cohesion": 88, // 0-100 凝聚度
      "theme": "共同探讨历史古籍与星象奥秘"
    }
  ],
  "recommendations": [
    "建议1：在中央广场举办读书茶话会以化解误解",
    "建议2：由市政厅拨款修缮观测台设备",
    "建议3：关注诊所健康负荷，增加绿植休憩区"
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    recordApiCall({
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      task: 'analyze',
      model: 'gemini-3.8-flash',
      status: 'gemini_success',
      latencyMs: Date.now() - startTime,
      promptCharLength: prompt.length,
      approxTokens: Math.round((prompt.length + (response.text?.length || 0)) / 3),
      summary: parsed.title || 'AI 全镇态势深度研判'
    });
    return res.json(parsed);
  } catch (err) {
    const quotaError = handleGeminiQuotaError(err, 'Town Analysis');
    const result = generateProceduralAnalysis(interactions, agents);
    recordApiCall({
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      task: 'analyze',
      model: 'procedural-fallback',
      status: quotaError ? 'quota_error_fallback' : 'api_error_fallback',
      latencyMs: Date.now() - startTime,
      promptCharLength: 0,
      approxTokens: 600,
      summary: '[配额降级] 小镇社会生态基准研判'
    });
    return res.json(result);
  }
});

// ==========================================
// 3. POST /api/ai/event-impact
// Analyze psychological & schedule ripple effects of a user-triggered event
// ==========================================
app.post('/api/ai/event-impact', async (req, res) => {
  const { event, agents } = req.body;
  const startTime = Date.now();

  if (!ai || isGeminiRateLimited()) {
    const result = {
      impactSummary: `事件“${event.title}”引发了小镇居民的广泛关注与讨论。`,
      agentReactions: (agents || []).map((a: any) => ({
        agentId: a.id,
        reactionThought: `${a.name}得知了“${event.title}”，打算前往现场看看。`,
        moodDelta: Math.floor(Math.random() * 11) - 5,
        stressDelta: Math.floor(Math.random() * 9) - 4
      }))
    };
    recordApiCall({
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      task: 'event_impact',
      model: isGeminiRateLimited() ? 'procedural-cooldown' : 'procedural-local',
      status: fallbackStatus(Boolean(ai), isGeminiRateLimited()),
      latencyMs: Date.now() - startTime,
      promptCharLength: 0,
      approxTokens: 400,
      summary: `事件推演: ${event.title}`
    });
    return res.json(result);
  }

  try {
    const prompt = `
小镇发生了由上帝视角的管理者触发的重大事件：
【事件标题】: ${event.title}
【事件描述】: ${event.description}
【类型】: ${event.type}
【发生地点】: ${event.targetBuilding || '全镇范围'}

当前居民名单:
${(agents || []).map((a: any) => `${a.id}:${a.name}(${a.role}, MBTI:${a.mbti})`).join('\n')}

请分析此事件给小镇带来的连锁反应，以及每位居民的心态反应：
输出纯JSON：
{
  "impactSummary": "全镇范围内的宏观影响描述",
  "agentReactions": [
    {
      "agentId": "agent-1",
      "reactionThought": "第一人称或心理反应一句话",
      "moodDelta": 5, // -20 到 +20
      "stressDelta": -5 // -20 到 +20
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    recordApiCall({
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      task: 'event_impact',
      model: 'gemini-3.8-flash',
      status: 'gemini_success',
      latencyMs: Date.now() - startTime,
      promptCharLength: prompt.length,
      approxTokens: Math.round((prompt.length + (response.text?.length || 0)) / 3),
      summary: `事件影响推演: ${event.title}`
    });
    return res.json(parsed);
  } catch (err) {
    const quotaError = handleGeminiQuotaError(err, 'Event Impact Analysis');
    const result = {
      impactSummary: '事件已生效，正在小镇舆论中发酵。',
      agentReactions: (agents || []).map((a: any) => ({
        agentId: a.id,
        reactionThought: `${a.name}得知了消息，正思索其对小镇的后续影响。`,
        moodDelta: Math.floor(Math.random() * 7) - 3,
        stressDelta: Math.floor(Math.random() * 5) - 2
      }))
    };
    recordApiCall({
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      task: 'event_impact',
      model: 'procedural-fallback',
      status: quotaError ? 'quota_error_fallback' : 'api_error_fallback',
      latencyMs: Date.now() - startTime,
      promptCharLength: 0,
      approxTokens: 350,
      summary: `[降级] 事件影响推演: ${event.title}`
    });
    return res.json(result);
  }
});

// ==========================================
// 4. POST /api/ai/generate-agent
// Custom resident generator
// ==========================================
app.post('/api/ai/generate-agent', async (req, res) => {
  const { promptHint } = req.body;
  const startTime = Date.now();

  if (!ai || isGeminiRateLimited()) {
    const result = generateProceduralResident(promptHint);
    recordApiCall({
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      task: 'generate_agent',
      model: isGeminiRateLimited() ? 'procedural-cooldown' : 'procedural-local',
      status: fallbackStatus(Boolean(ai), isGeminiRateLimited()),
      latencyMs: Date.now() - startTime,
      promptCharLength: 0,
      approxTokens: 300,
      summary: `生成新居民: ${result.name} (${result.role})`
    });
    return res.json(result);
  }

  try {
    const prompt = `
请为一个温馨像素风格的AI智能小镇设计一位全新的个性化居民。
用户参考设定或灵感: ${promptHint || '随机生成一个性格鲜明的小镇新面孔'}

请输出纯JSON：
{
  "name": "中文姓名（如：温暮云 / 艾伦）",
  "role": "小镇职业或身份（如：草本标本师 / 留声机修理工）",
  "age": 26,
  "gender": "男" | "女" | "非二元",
  "mbti": "INFP",
  "bigFive": {
    "openness": 82,
    "conscientiousness": 65,
    "extraversion": 45,
    "agreeableness": 88,
    "neuroticism": 35
  },
  "bio": "生动的背景故事与来到小镇的理由（60-100字）",
  "quirks": ["怪癖1", "怪癖2", "习惯口头禅"],
  "spriteColor": "cyan" // 可选: cyan, amber, emerald, indigo, rose, violet, sky, orange
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    recordApiCall({
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      task: 'generate_agent',
      model: 'gemini-3.8-flash',
      status: 'gemini_success',
      latencyMs: Date.now() - startTime,
      promptCharLength: prompt.length,
      approxTokens: Math.round((prompt.length + (response.text?.length || 0)) / 3),
      summary: `AI 新居民: ${parsed.name} (${parsed.role})`
    });
    return res.json(parsed);
  } catch (err) {
    const quotaError = handleGeminiQuotaError(err, 'Agent Persona Generation');
    const result = generateProceduralResident(req.body.promptHint);
    recordApiCall({
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      task: 'generate_agent',
      model: 'procedural-fallback',
      status: quotaError ? 'quota_error_fallback' : 'api_error_fallback',
      latencyMs: Date.now() - startTime,
      promptCharLength: 0,
      approxTokens: 280,
      summary: `[降级] 新居民: ${result.name}`
    });
    return res.json(result);
  }
});

// ==========================================
// Procedural Fallback Generators
// Guarantee 100% smooth uptime even without network/API keys
// ==========================================
function generateProceduralDialogue(agentA: any, agentB: any, location: any, context?: string, recentEvents?: string) {
  const locName = location?.name || '小镇广场';

  // Role and scenario tailored topics
  const scenarios = [
    {
      topic: '近况与茶聚的闲聊',
      summary: '分享工作近况，并提议找时间组织茶聚。',
      sentiment: 'positive',
      score: 0.65,
      lines: [
        { a: `嗨，${agentB.name}！这么巧在${locName}碰见。刚才听大家提起你的近况，一切还顺利吗？`, ea: 'friendly' },
        { b: `正巧路过！作为${agentB.role}，今天总算告一段落了。你手头的事忙得怎么样了？`, eb: 'warm' },
        { a: `小镇最近节奏很舒适。刚才我还在琢磨，要不要抽空和大家组织一次茶聚。`, ea: 'happy' },
        { b: `太棒了，有需要帮忙的地方随时叫我，小镇和睦离不开大家的心思。`, eb: 'joy' }
      ],
      deltaA: 5,
      deltaB: 6,
      memA: `在${locName}遇到了${agentB.name}，相谈甚欢，感受到了彼此的支持。`,
      memB: `${agentA.name}主动向我致以问候，让人倍感温暖。`
    },
    {
      topic: `关于小镇发展理念的轻微探讨`,
      summary: '讨论事务安排带来的压力，愿意在议事时寻找平衡。',
      sentiment: 'conflict',
      score: -0.2,
      lines: [
        { a: `${agentB.name}，关于近期的事务安排，我有些顾虑。如果按目前的节奏，大家压力可能有点重。`, ea: 'serious' },
        { b: `我理解你的担忧，但从${agentB.role}的角度看，有些规程必须尽早定下标准才不会出乱子。`, eb: 'thoughtful' },
        { a: `规程虽好，但也得考虑每个人的作息与生活自由嘛。`, ea: 'curious' },
        { b: `你说得也有道理，或许我们可以在下次议事时取一个平衡点。`, eb: 'friendly' }
      ],
      deltaA: 2,
      deltaB: 2,
      memA: `在${locName}和${agentB.name}探讨了规则与自由的界限，虽然观点略有差异但彼此理解。`,
      memB: `${agentA.name}提出了很坦率的意见，值得进一步深思。`
    },
    {
      topic: `星空观测与典籍历史的遐想`,
      summary: '分享星轨与古籍的想法，并约定一起去观星台复核。',
      sentiment: 'deep',
      score: 0.75,
      lines: [
        { a: `昨夜仰望小镇夜空时，我注意到星轨的运转似乎与古籍里的记录有微妙呼应。`, ea: 'thoughtful' },
        { b: `真的吗？这正是我一直关注的方向！岁月在流淌，但小镇的历史始终沉淀在这片天地里。`, eb: 'curious' },
        { a: `等把这几卷手稿考证完，我们可以一起去观星台复核观测数据。`, ea: 'happy' },
        { b: `一言为定！能有志同道合的伙伴一起探索真理，真是人生幸事。`, eb: 'joy' }
      ],
      deltaA: 7,
      deltaB: 8,
      memA: `与${agentB.name}分享了关于星空与古籍的深度感悟，感到十分契合。`,
      memB: `与${agentA.name}在${locName}展开了一场启发性的思想对话。`
    },
    {
      topic: `手作美食与草木香气的晨间分享`,
      summary: '分享点心与花草茶，希望把好心情传递给街坊。',
      sentiment: 'collaborative',
      score: 0.8,
      lines: [
        { a: `${agentB.name}，你闻到空气中新鲜的味道了吗？我顺路带了些刚出炉的心意。`, ea: 'happy' },
        { b: `好香啊！正好我刚配制了一些安神舒缓的花草茶，正适合搭配着享用。`, eb: 'joy' },
        { a: `这就是小镇生活的魅力所在，简单纯粹却又让人充满元气。`, ea: 'warm' },
        { b: `是啊，愿这份好心情能传递给今天路过这里的每一位朋友！`, eb: 'friendly' }
      ],
      deltaA: 6,
      deltaB: 7,
      memA: `与${agentB.name}在${locName}分享了美味与茶香，度过了治愈的时刻。`,
      memB: `接受了${agentA.name}分享的心意，今天的心情格外明媚。`
    }
  ];

  const choice = scenarios[Math.floor(Math.random() * scenarios.length)];

  return {
    topic: choice.topic,
    summary: `${agentA.name} 与 ${agentB.name} 在 ${locName} ${choice.summary}`,
    sentiment: choice.sentiment,
    sentimentScore: choice.score,
    dialogue: sequenceDialogueLines(choice.lines, agentA, agentB),
    affinityDeltaAtoB: choice.deltaA,
    affinityDeltaBtoA: choice.deltaB,
    memoryA: choice.memA,
    memoryB: choice.memB
  };
}

function generateProceduralAnalysis(interactions: any[], agents: any[]) {
  return {
    title: '小镇社会生态演化分析（基准态）',
    summary: '小镇整体人际网络呈现出多元互动的良性循环。不同职业的居民在日常碰撞中逐渐建立起了稳固的情感互信纽带。',
    vibeScore: 72,
    emotionalVibe: '温馨而充满探究欲的和谐社区氛围',
    coreConflicts: [
      {
        title: '市政管理效率与学者学术自由的权衡',
        intensity: 45,
        agentsInvolved: ['苏清禾', '陆行川'],
        description: '关于档案馆古籍借阅流程与市政借款登记的沟通存在时间差。'
      }
    ],
    alliances: [
      {
        name: '星光书友互助圈',
        members: ['苏清禾', '林小满', '顾微澜'],
        cohesion: 85,
        theme: '分享手作点心与手稿创作'
      }
    ],
    recommendations: [
      '在小镇广场定期举行下午茶露天沙龙',
      '增设观星台向公众开放的观星日',
      '优化诊所草药补给与面包店面粉供应链'
    ]
  };
}

function generateProceduralResident(hint: string) {
  const names = ['温暮云', '宁星竹', '杜衡', '白鹿鸣', '宋清晏'];
  const roles = ['植物标本研究员', '小镇风物记录人', '古琴与钟表修复师', '星象占卜师', '街角书画匠'];
  const idx = Math.floor(Math.random() * names.length);
  return {
    name: names[idx],
    role: roles[idx],
    age: 25 + Math.floor(Math.random() * 15),
    gender: '非二元',
    mbti: 'INFJ',
    bigFive: {
      openness: 85,
      conscientiousness: 70,
      extraversion: 40,
      agreeableness: 85,
      neuroticism: 30
    },
    bio: `${names[idx]}带着一本斑驳的日记本来到小镇，热爱观察每个静谧时刻。`,
    quirks: ['喜欢收集形状独特的落叶', '每天清晨记录风向', '喝茶从不加糖'],
    spriteColor: 'emerald'
  };
}

function generateProceduralReflection(agent: any, recentMemories: any[]) {
  const candidates = [
    {
      reflection: `这段时间在小镇的忙碌与交谈，让我意识到：生活不仅是孤身一人的钻研，更需要敞开心扉去倾听邻里的心声。`,
      newGoal: `多前往公共绿地或咖啡馆，主动倾听他人的想法`,
      moodDelta: 4,
      stressDelta: -3,
      tags: ['心境调适', '社交认同']
    },
    {
      reflection: `大家对于小镇公共秩序与生活自由的不同观点，让我懂得规则的本质是为了让每个人都能安心安居，不必非黑即白。`,
      newGoal: `寻求更加柔和包容的沟通方式来推进计划`,
      moodDelta: 3,
      stressDelta: -4,
      tags: ['包容理解', '处世之道']
    },
    {
      reflection: `小镇清晨的面包香与黄昏的星光格外治愈，适度放慢步调，反而能激发更多灵感与工作效率。`,
      newGoal: `平衡劳作与歇息，不再过度消耗精力`,
      moodDelta: 6,
      stressDelta: -5,
      tags: ['生活美学', '自我关怀']
    }
  ];

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return {
    reflection: pick.reflection,
    type: 'reflection',
    importance: 8,
    emotionalIntensity: 6,
    relatedAgentIds: recentMemories?.[0]?.relatedAgentIds || [],
    tags: pick.tags,
    newGoal: pick.newGoal,
    affinityAdjustments: {},
    moodDelta: pick.moodDelta,
    stressDelta: pick.stressDelta
  };
}

// ==========================================
// Setup Vite Middleware in Dev or Static in Production
// ==========================================
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[Aetheria Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
