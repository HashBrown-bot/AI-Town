import { Agent, Building, InteractionRecord, TownEvent, TownAnalysis, AgentMemory, ReflectionResult } from '../types/town';
import { logger } from '../utils/logger';

export async function requestAgentDialogue(
  agentA: Agent,
  agentB: Agent,
  location: Building,
  recentEvents: string,
  agentAContext?: string,
  agentBContext?: string
): Promise<{
  topic: string;
  summary: string;
  sentiment: 'positive' | 'neutral' | 'conflict' | 'deep' | 'collaborative';
  sentimentScore: number;
  dialogue: { speakerId: string; speakerName: string; text: string; emotion: string }[];
  affinityDeltaAtoB: number;
  affinityDeltaBtoA: number;
  memoryA: string;
  memoryB: string;
  importance?: number;
  emotionalIntensity?: number;
}> {
  try {
    const res = await fetch('/api/ai/dialogue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentA,
        agentB,
        location: {
          id: location.id,
          name: location.name,
          description: location.description
        },
        recentEvents,
        agentAContext,
        agentBContext
      })
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    logger.warn('AI', 'Dialogue generation fallback triggered:', err);
    // Client-side fallback if server request fails
    return {
      topic: `${location.name}的即兴交谈`,
      summary: `${agentA.name}与${agentB.name}在${location.name}偶遇，互相致以问候并交换了看法。`,
      sentiment: 'positive',
      sentimentScore: 0.5,
      dialogue: [
        {
          speakerId: agentA.id,
          speakerName: agentA.name,
          text: `好久不见，${agentB.name}！今天在${location.name}忙些什么呢？`,
          emotion: 'friendly'
        },
        {
          speakerId: agentB.id,
          speakerName: agentB.name,
          text: `正巧路过这儿！看你神采奕奕，是不是有什么好消息？`,
          emotion: 'warm'
        },
        {
          speakerId: agentA.id,
          speakerName: agentA.name,
          text: `心情确实不错，小镇今天的天气与光线格外令人安心。`,
          emotion: 'happy'
        },
        {
          speakerId: agentB.id,
          speakerName: agentB.name,
          text: `赞同，愿我们今天都有好收获！`,
          emotion: 'serene'
        }
      ],
      affinityDeltaAtoB: 4,
      affinityDeltaBtoA: 4,
      memoryA: `在${location.name}见到了${agentB.name}，两人聊得很愉快。`,
      memoryB: `在${location.name}与${agentA.name}寒暄，感受到了积极的气息。`,
      importance: 6,
      emotionalIntensity: 5
    };
  }
}

export async function requestAgentReflection(
  agent: Agent,
  recentMemories: AgentMemory[],
  currentSimDay: number,
  currentSimTime: string
): Promise<ReflectionResult> {
  try {
    const res = await fetch('/api/ai/reflect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent,
        recentMemories,
        currentSimDay,
        currentSimTime
      })
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    logger.warn('AI', 'Agent reflection fallback triggered:', err);
    return {
      reflection: `近来在小镇的生活和交流，让我深感邻里之间的关照与真诚最为可贵。我希望能为社区做更多有价值的事。`,
      type: 'reflection',
      importance: 8,
      emotionalIntensity: 6,
      relatedAgentIds: recentMemories.flatMap(m => m.relatedAgentIds || []).slice(0, 2),
      tags: ['日常顿悟', '社区归属'],
      newGoal: '主动增进与邻里的互动，平衡日常作息',
      moodDelta: 4,
      stressDelta: -3
    };
  }
}

export async function requestTownAnalysis(
  interactions: InteractionRecord[],
  agents: Agent[],
  recentEvents: string
): Promise<TownAnalysis> {
  try {
    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interactions: interactions.slice(0, 15),
        agents,
        recentEvents
      })
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    return {
      id: `analysis-${Date.now()}`,
      title: data.title || '小镇社会生态演化简报',
      summary: data.summary || '小镇各居民保持积极互动，群体凝聚力稳定提升。',
      vibeScore: typeof data.vibeScore === 'number' ? data.vibeScore : 65,
      emotionalVibe: data.emotionalVibe || '平静祥和且充满求知欲的社区环境',
      coreConflicts: Array.isArray(data.coreConflicts) ? data.coreConflicts : [],
      alliances: Array.isArray(data.alliances) ? data.alliances : [],
      recommendations: Array.isArray(data.recommendations) ? data.recommendations : [
        '增设公众草地茶叙时间，提升居民幸福感',
        '鼓励学者与手工艺人开展跨界合作'
      ],
      timestamp: Date.now()
    };
  } catch (err) {
    logger.warn('AI', 'Town analysis fallback triggered:', err);
    return {
      id: `analysis-${Date.now()}`,
      title: '小镇社会动态与冲突演化态势分析',
      summary: '通过对近期居民对话频率与情感极性的综合评估，小镇社交生态处于良好稳态，生活服务与文化求索并存。',
      vibeScore: 70,
      emotionalVibe: '温润安宁，偶有思维火花碰撞的良性社区',
      coreConflicts: [
        {
          title: '日常秩序与艺术灵感的偶发性理念碰撞',
          intensity: 30,
          agentsInvolved: ['陈默', '姜寻'],
          description: '市政秘书长陈默希望规范广场公共空间的使用时间，而游吟诗人姜寻希望灵感不被时刻表束缚。'
        }
      ],
      alliances: [
        {
          name: '星光下午茶默契社',
          members: ['苏清禾', '林小满'],
          cohesion: 90,
          theme: '用咖啡与热烘焙温暖每一个路过的镇民'
        }
      ],
      recommendations: [
        '在晨曦喷泉边设立自由表演角，给予艺术家合理的展示窗口',
        '定期在档案馆开展小镇史料研讨会，增进学术研究与公共生活的融合'
      ],
      timestamp: Date.now()
    };
  }
}

export async function requestEventImpact(
  event: TownEvent,
  agents: Agent[]
): Promise<{
  impactSummary: string;
  agentReactions: {
    agentId: string;
    reactionThought: string;
    moodDelta: number;
    stressDelta: number;
  }[];
}> {
  try {
    const res = await fetch('/api/ai/event-impact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, agents })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    logger.warn('AI', 'Event impact fallback:', err);
    return {
      impactSummary: `事件“${event.title}”在小镇传播开来，引起了大家的热烈讨论。`,
      agentReactions: agents.map(a => ({
        agentId: a.id,
        reactionThought: `${a.name}听到消息后心生好奇，正在思索其对小镇的深远影响。`,
        moodDelta: Math.floor(Math.random() * 8) - 3,
        stressDelta: Math.floor(Math.random() * 6) - 2
      }))
    };
  }
}

export async function generateNewAgentPersona(hint: string): Promise<Partial<Agent>> {
  try {
    const res = await fetch('/api/ai/generate-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptHint: hint })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    logger.warn('AI', 'Agent generation fallback:', err);
    return {
      name: '沐子衿',
      role: '古法木器雕刻师',
      age: 27,
      gender: '女',
      mbti: 'ISFP',
      bigFive: {
        openness: 82,
        conscientiousness: 78,
        extraversion: 45,
        agreeableness: 88,
        neuroticism: 28
      },
      bio: '携带一套祖传凿刀来到小镇的雕刻手艺人，专注于从自然原木的纹理中发现故事。',
      quirks: ['口袋里随时揣着打磨砂纸', '工作时沉浸得听不到雷声'],
      spriteColor: '#06b6d4'
    };
  }
}
