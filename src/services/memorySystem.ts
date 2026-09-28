import { Agent, AgentMemory, MemoryRetrievalOptions, RetrievedMemoryContext, ReflectionResult, MemoryType } from '../types/town';
import { applyReflectionRelationshipAdjustments, createDefaultRelationship, calculateAffinityProjection } from '../systems/RelationshipSystem';

/**
 * Default weights for memory retrieval scoring:
 * memoryScore = importance * w1 + relevance * w2 + recency * w3 + emotionalIntensity * w4
 */
export const DEFAULT_MEMORY_WEIGHTS = {
  importance: 0.35,
  relevance: 0.35,
  recency: 0.15,
  emotionalIntensity: 0.15,
};

/**
 * Calculates a multidimensional relevance score (0.0 - 1.0)
 * Evaluates target agent association, spatial proximity, activity context and semantic keywords.
 */
export function calculateRelevance(memory: AgentMemory, options: MemoryRetrievalOptions): number {
  let score = 0.1; // Baseline relevance

  // 1. Direct social relationship match (Strongest signal)
  if (options.targetAgentId) {
    if (memory.relatedAgentIds?.includes(options.targetAgentId) || memory.associatedAgentId === options.targetAgentId) {
      score += 0.55;
    }
  }

  // 2. Spatial & Location context match
  if (options.currentLocation) {
    const locLower = options.currentLocation.toLowerCase();
    if (
      memory.tags?.some(t => locLower.includes(t.toLowerCase()) || t.toLowerCase().includes(locLower)) ||
      memory.content.includes(options.currentLocation)
    ) {
      score += 0.25;
    }
  }

  // 3. Activity or Topic hint match
  if (options.currentActivity) {
    const actLower = options.currentActivity.toLowerCase();
    if (memory.tags?.some(t => actLower.includes(t.toLowerCase()))) {
      score += 0.15;
    }
  }

  if (options.topicHint && memory.content.toLowerCase().includes(options.topicHint.toLowerCase())) {
    score += 0.2;
  }

  // 4. Boost reflection and semantic memories for general worldview coherence
  if (memory.type === 'reflection' || memory.type === 'semantic') {
    score += 0.1;
  }

  return Math.min(1.0, Math.max(0.05, score));
}

/**
 * Calculates temporal recency with exponential decay (0.05 - 1.0)
 * Memory decays as simulation days pass.
 */
export function calculateRecency(memory: AgentMemory, currentSimDay: number): number {
  const createdDay = memory.createdAt?.simDay ?? memory.simDay ?? 1;
  const dayDelta = Math.max(0, currentSimDay - createdDay);

  // Exponential decay: Halves approximately every 4 simulation days
  // Reflections and semantic beliefs decay much slower
  const decayRate = memory.type === 'reflection' || memory.type === 'semantic' ? 0.94 : 0.82;
  const decayed = Math.pow(decayRate, dayDelta);

  return Math.min(1.0, Math.max(0.08, Number(decayed.toFixed(3))));
}

/**
 * Scores a single memory based on the 4 canonical dimensions:
 * importance, relevance, recency, emotionalIntensity
 */
export function scoreMemory(
  memory: AgentMemory,
  options: MemoryRetrievalOptions
): { score: number; relevance: number; recency: number } {
  const weights = options.weights || DEFAULT_MEMORY_WEIGHTS;

  const normalizedImportance = Math.min(1.0, Math.max(0.1, (memory.importance || 5) / 10));
  const normalizedEmotion = Math.min(1.0, Math.max(0.1, (memory.emotionalIntensity || 5) / 10));
  const relevance = calculateRelevance(memory, options);
  const recency = calculateRecency(memory, options.currentSimDay);

  const rawScore =
    normalizedImportance * weights.importance +
    relevance * weights.relevance +
    recency * weights.recency +
    normalizedEmotion * weights.emotionalIntensity;

  const score = Math.min(1.0, Math.max(0.05, Number(rawScore.toFixed(3))));

  return { score, relevance, recency };
}

/**
 * Retrieves the Top-K most relevant memories for an agent's upcoming encounter or decision.
 * Updates lastAccessedAt and categorizes memories for prompt assembly.
 */
export function retrieveAgentMemories(
  agent: Agent,
  options: MemoryRetrievalOptions
): RetrievedMemoryContext {
  const topK = options.topK || 6;
  const allMemories = agent.memories || [];

  if (allMemories.length === 0) {
    return {
      topMemories: [],
      relationshipMemories: [],
      recentReflections: [],
      recentEpisodic: [],
      semanticBeliefs: [],
      formattedPromptContext: '【过往记忆】：该居民初来小镇，对周围世界保持着纯粹的好奇与观察。'
    };
  }

  // Score all memories
  const scoredMemories = allMemories.map(m => {
    const { score, relevance, recency } = scoreMemory(m, options);
    return {
      ...m,
      score,
      relevance,
      recency,
      lastAccessedAt: {
        simDay: options.currentSimDay,
        simTime: options.currentSimTime,
        timestamp: Date.now()
      }
    };
  });

  // Sort descending by calculated score
  scoredMemories.sort((a, b) => (b.score || 0) - (a.score || 0));

  const topMemories = scoredMemories.slice(0, topK);

  // Group by memory types for contextual breakdown
  const relationshipMemories = scoredMemories.filter(
    m =>
      (m.type === 'relationship' || m.relatedAgentIds?.includes(options.targetAgentId || '')) &&
      (!options.targetAgentId || m.relatedAgentIds?.includes(options.targetAgentId))
  );

  const recentReflections = scoredMemories.filter(m => m.type === 'reflection').slice(0, 3);
  const semanticBeliefs = scoredMemories.filter(m => m.type === 'semantic').slice(0, 3);
  const recentEpisodic = scoredMemories.filter(m => m.type === 'episodic').slice(0, 4);

  // Assemble formatted narrative prompt context for Gemini
  const sections: string[] = [];

  if (relationshipMemories.length > 0 && options.targetAgentName) {
    sections.push(
      `【关于 ${options.targetAgentName} 的长期印象与过往往来】\n` +
      relationshipMemories
        .slice(0, 3)
        .map(m => `• [第${m.simDay}天] ${m.content} (情感基调:${m.sentiment}, 影响深度:${m.importance}/10)`)
        .join('\n')
    );
  }

  if (recentReflections.length > 0) {
    sections.push(
      `【近期深层反思与领悟 (Reflection)】\n` +
      recentReflections.map(m => `• [顿悟] ${m.content}`).join('\n')
    );
  }

  if (semanticBeliefs.length > 0) {
    sections.push(
      `【居民长期生活信念与处世认知 (Semantic)】\n` +
      semanticBeliefs.map(m => `• ${m.content}`).join('\n')
    );
  }

  if (recentEpisodic.length > 0) {
    sections.push(
      `【近期关键情境经历 (Episodic)】\n` +
      recentEpisodic.map(m => `• [第${m.simDay}天 ${m.simTime}] ${m.content}`).join('\n')
    );
  }

  const formattedPromptContext = sections.length > 0 
    ? sections.join('\n\n') 
    : '【过往记忆】：日常生活平稳，暂无强烈冲击事件。';

  return {
    topMemories,
    relationshipMemories,
    recentReflections,
    recentEpisodic,
    semanticBeliefs,
    formattedPromptContext
  };
}

/**
 * Helper to construct a standardized, fully typed AgentMemory item
 */
export function createAgentMemory(params: {
  type: MemoryType;
  content: string;
  simDay: number;
  simTime: string;
  importance?: number;
  emotionalIntensity?: number;
  relatedAgentIds?: string[];
  relatedAgentNames?: string[];
  tags?: string[];
  sentiment?: 'positive' | 'neutral' | 'conflict' | 'deep' | 'collaborative';
  evidenceMemoryIds?: string[];
}): AgentMemory {
  const importance = Math.min(10, Math.max(1, Math.round(params.importance ?? 5)));
  const emotionalIntensity = Math.min(10, Math.max(1, Math.round(params.emotionalIntensity ?? 5)));

  return {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: params.type,
    simDay: params.simDay,
    simTime: params.simTime,
    content: params.content,
    importance,
    emotionalIntensity,
    relatedAgentIds: params.relatedAgentIds || [],
    relatedAgentNames: params.relatedAgentNames || [],
    tags: params.tags || [],
    createdAt: {
      simDay: params.simDay,
      simTime: params.simTime,
      timestamp: Date.now()
    },
    lastAccessedAt: {
      simDay: params.simDay,
      simTime: params.simTime,
      timestamp: Date.now()
    },
    associatedAgentId: params.relatedAgentIds?.[0],
    associatedAgentName: params.relatedAgentNames?.[0],
    sentiment: params.sentiment || 'neutral',
    evidenceMemoryIds: params.evidenceMemoryIds || [],
    consolidated: false
  };
}

/**
 * Memory Consolidation, Decay & Capacity Management
 * Enforces memory retention policies to prevent unbounded array growth:
 * 1. Preserves all critical reflections (up to 8 newest)
 * 2. Preserves semantic worldview beliefs
 * 3. Preserves key relationship impressions per acquaintance
 * 4. Protects memories with importance >= 8
 * 5. Consolidates decaying episodic memories into higher-level semantic summaries
 * 6. Hard-prunes lowest scoring stale episodic memories if exceeding maxCount
 */
export function consolidateAndPruneMemories(
  memories: AgentMemory[],
  currentSimDay: number,
  maxCount: number = 32
): AgentMemory[] {
  if (memories.length <= maxCount) return memories;

  // Split into protected and evictable candidates
  const protectedMemories: AgentMemory[] = [];
  const evictableCandidates: AgentMemory[] = [];

  // Group relationship memories by target agent to keep the most recent/important one
  const relationshipByAgent = new Map<string, AgentMemory>();

  for (const m of memories) {
    if (m.type === 'reflection') {
      protectedMemories.push(m);
    } else if (m.type === 'semantic') {
      protectedMemories.push(m);
    } else if (m.type === 'relationship' && m.relatedAgentIds?.[0]) {
      const targetId = m.relatedAgentIds[0];
      const existing = relationshipByAgent.get(targetId);
      if (!existing || m.importance > existing.importance) {
        relationshipByAgent.set(targetId, m);
      }
    } else if (m.importance >= 8) {
      protectedMemories.push(m);
    } else {
      evictableCandidates.push(m);
    }
  }

  // Add the preserved relationship memories
  relationshipByAgent.forEach(rel => protectedMemories.push(rel));

  // If protected alone exceed maxCount, keep the newest/most important reflections and semantics
  if (protectedMemories.length >= maxCount) {
    protectedMemories.sort((a, b) => {
      if (a.importance !== b.importance) return b.importance - a.importance;
      return (b.createdAt?.timestamp || 0) - (a.createdAt?.timestamp || 0);
    });
    return protectedMemories.slice(0, maxCount);
  }

  // Score evictable candidates by retention priority:
  // priority = importance * 0.45 + recency * 0.35 + emotion * 0.20
  const remainingSlots = maxCount - protectedMemories.length;

  evictableCandidates.sort((a, b) => {
    const recA = calculateRecency(a, currentSimDay);
    const recB = calculateRecency(b, currentSimDay);
    const scoreA = (a.importance / 10) * 0.45 + recA * 0.35 + (a.emotionalIntensity / 10) * 0.2;
    const scoreB = (b.importance / 10) * 0.45 + recB * 0.35 + (b.emotionalIntensity / 10) * 0.2;
    return scoreB - scoreA;
  });

  const keptEvictable = evictableCandidates.slice(0, remainingSlots);

  // Combine and sort chronologically/priority
  const combined = [...protectedMemories, ...keptEvictable];
  combined.sort((a, b) => (b.createdAt?.timestamp || 0) - (a.createdAt?.timestamp || 0));

  return combined;
}

/**
 * Applies a Reflection result to an agent:
 * - Injects the new Reflection memory
 * - Modifies currentGoal if a new direction was formed
 * - Adjusts social affinities within bounds [-100, 100]
 * - Adjusts psychological state (mood, stress)
 * - Consolidates memory collection
 */
export function applyReflectionToAgent(
  agent: Agent,
  reflection: ReflectionResult,
  simDay: number,
  simTime: string
): Agent {
  const newMemory = createAgentMemory({
    type: reflection.type || 'reflection',
    content: reflection.reflection,
    simDay,
    simTime,
    importance: reflection.importance || 9,
    emotionalIntensity: reflection.emotionalIntensity || 7,
    relatedAgentIds: reflection.relatedAgentIds || [],
    tags: reflection.tags || ['反思', '顿悟'],
    sentiment: 'deep',
    evidenceMemoryIds: reflection.evidenceMemoryIds || []
  });

  // Apply multi-dimensional relationship & affinity adjustments
  let intermediateAgent: Agent = { ...agent };
  if (reflection.relationshipAdjustments) {
    intermediateAgent = applyReflectionRelationshipAdjustments(
      intermediateAgent,
      reflection.relationshipAdjustments,
      simDay,
      simTime,
      reflection.reflection
    );
  } else if (reflection.affinityAdjustments) {
    // If only legacy affinityAdjustments provided, map to relationship affection/trust
    const dimsMap: Record<string, any> = {};
    Object.entries(reflection.affinityAdjustments).forEach(([targetId, delta]) => {
      dimsMap[targetId] = {
        affection: delta,
        trust: Math.round(delta * 0.75)
      };
    });
    intermediateAgent = applyReflectionRelationshipAdjustments(
      intermediateAgent,
      dimsMap,
      simDay,
      simTime,
      reflection.reflection
    );
  }

  // Apply emotional adjustments
  const newMood = Math.max(
    -100,
    Math.min(100, (agent.state.mood || 0) + (reflection.moodDelta || 0))
  );
  const newStress = Math.max(
    0,
    Math.min(100, (agent.state.stress || 20) + (reflection.stressDelta || 0))
  );

  const updatedMemories = [newMemory, ...(agent.memories || [])];
  const prunedMemories = consolidateAndPruneMemories(updatedMemories, simDay, 35);

  return {
    ...intermediateAgent,
    currentGoal: reflection.newGoal || agent.currentGoal || '在小镇探索生活与社交',
    currentThought: `【今日反思】：${reflection.reflection}`,
    state: {
      ...agent.state,
      mood: newMood,
      stress: newStress
    },
    memories: prunedMemories,
    unreflectedMemoryCount: 0 // Reset memory accumulation counter after reflection
  };
}
