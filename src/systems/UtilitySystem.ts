import { 
  Agent, 
  AgentNeeds, 
  Building, 
  UtilityActionType, 
  UtilityActionScore, 
  UtilityScoreFactors, 
  TownEvent,
  AgentGoal
} from '../types/town';

/**
 * Utility Action Metadata mapping
 */
export const UTILITY_ACTIONS_META: Record<UtilityActionType, { label: string; icon: string; defaultBuilding: string }> = {
  sleep: { label: '安歇深睡', icon: '💤', defaultBuilding: 'clinic' },
  eat: { label: '就餐进饮', icon: '🍲', defaultBuilding: 'bakery' },
  work: { label: '专属工作', icon: '💼', defaultBuilding: 'town_hall' },
  socialize: { label: '寻友倾谈', icon: '💬', defaultBuilding: 'central_park' },
  explore: { label: '勘察探索', icon: '🔭', defaultBuilding: 'observatory' },
  relax: { label: '散步放松', icon: '🍃', defaultBuilding: 'central_park' },
  study: { label: '文献研读', icon: '📖', defaultBuilding: 'library' },
  shop: { label: '逛店采买', icon: '☕', defaultBuilding: 'cafe' },
  seekHelp: { label: '求医安神', icon: '🌿', defaultBuilding: 'clinic' },
  attendEvent: { label: '参与集会', icon: '🎉', defaultBuilding: 'town_hall' },
};

/**
 * Clamps utility score strictly between 0 and 100
 */
export function clampUtilityScore(val: number): number {
  return Math.min(100, Math.max(0, Math.round(val * 10) / 10));
}

/**
 * Calculates raw need score (0 - 100) for a specific candidate utility action
 * Leverages physicalNeeds, psychologicalNeeds, socialNeeds, and cognitiveNeeds
 */
export function calculateNeedScore(
  action: UtilityActionType, 
  agentOrNeeds: Agent | AgentNeeds
): { score: number; reason: string } {
  // Extract or fallback
  const isAgent = 'physicalNeeds' in agentOrNeeds || 'bigFive' in agentOrNeeds;
  const agent = isAgent ? (agentOrNeeds as Agent) : undefined;
  const flatNeeds = isAgent ? (agentOrNeeds as Agent).needs : (agentOrNeeds as AgentNeeds);
  
  const physical = agent?.physicalNeeds || {
    energy: flatNeeds?.energy ?? 80,
    hunger: flatNeeds?.hunger ?? 20,
    health: flatNeeds?.health ?? 90,
  };

  const psychological = agent?.psychologicalNeeds || {
    mood: flatNeeds?.mood ?? 70,
    stress: flatNeeds?.stress ?? 20,
    fun: flatNeeds?.fun ?? 55,
    comfort: flatNeeds?.comfort ?? 75,
  };

  const social = agent?.socialNeeds || {
    social: flatNeeds?.social ?? 70,
    belonging: flatNeeds?.belonging ?? 75,
  };

  const cognitive = agent?.cognitiveNeeds || {
    curiosity: flatNeeds?.curiosity ?? 60,
    achievement: flatNeeds?.achievement ?? 60,
  };

  switch (action) {
    case 'sleep': {
      // Need surges as energy drops below 40, and slightly increases with stress and low health
      const fatigue = Math.max(0, 100 - physical.energy);
      let score = fatigue > 45 ? fatigue * 1.15 : fatigue * 0.7;
      if (psychological.stress > 65) score += 10;
      if (physical.health < 50) score += 15;
      return { 
        score: clampUtilityScore(score),
        reason: `精力储备剩余 ${Math.round(physical.energy)}% (疲惫负荷: ${Math.round(fatigue)}，健康: ${Math.round(physical.health)}%)`
      };
    }

    case 'eat': {
      // Direct correlation with hunger and drops comfort
      const hungerFactor = physical.hunger;
      const score = hungerFactor > 50 ? hungerFactor * 1.15 : hungerFactor * 0.75;
      return {
        score: clampUtilityScore(score),
        reason: `生理饥饿度达到 ${Math.round(physical.hunger)}%`
      };
    }

    case 'work': {
      // Driven by achievement, but throttled by low energy and excessive stress/hunger
      let base = cognitive.achievement * 0.95;
      if (physical.energy < 30) base *= 0.45;
      if (physical.hunger > 70) base *= 0.55;
      if (psychological.stress > 80) base *= 0.6;
      return {
        score: clampUtilityScore(base),
        reason: `进取与成就动机 ${Math.round(cognitive.achievement)}% (受精力/饥饿约束调节)`
      };
    }

    case 'socialize': {
      // Driven by social craving (lower social satisfaction = higher craving) and low belonging
      const socialDeficit = Math.max(0, 100 - social.social);
      const belongingDeficit = Math.max(0, 100 - social.belonging);
      const score = socialDeficit * 0.75 + belongingDeficit * 0.35;
      return {
        score: clampUtilityScore(score),
        reason: `社交充实度 ${Math.round(social.social)}%，归属感渴求 ${Math.round(belongingDeficit)}%`
      };
    }

    case 'explore': {
      // Driven by curiosity and fun
      const score = cognitive.curiosity * 0.85 + psychological.fun * 0.25;
      return {
        score: clampUtilityScore(score),
        reason: `求知探索欲望 ${Math.round(cognitive.curiosity)}% 与游历兴趣`
      };
    }

    case 'relax': {
      // Driven by stress, low comfort, and low mood
      const comfortDeficit = Math.max(0, 100 - psychological.comfort);
      const moodDeficit = Math.max(0, 100 - psychological.mood);
      const stressNeed = psychological.stress * 0.75 + comfortDeficit * 0.35 + moodDeficit * 0.2;
      return {
        score: clampUtilityScore(stressNeed),
        reason: `心理压力 ${Math.round(psychological.stress)}%，身心舒适度 ${Math.round(psychological.comfort)}%`
      };
    }

    case 'study': {
      // Academic focus: curiosity + achievement
      const score = cognitive.curiosity * 0.7 + cognitive.achievement * 0.4;
      return {
        score: clampUtilityScore(score),
        reason: `求知心 ${Math.round(cognitive.curiosity)}% 与学术成就心 ${Math.round(cognitive.achievement)}%`
      };
    }

    case 'shop': {
      // Commerce and coffee/pastry leisure: hunger + fun + comfort
      const comfortDeficit = Math.max(0, 100 - psychological.comfort);
      const score = physical.hunger * 0.45 + comfortDeficit * 0.35 + psychological.fun * 0.3;
      return {
        score: clampUtilityScore(score),
        reason: `小憩采买欲与放松心愿`
      };
    }

    case 'seekHelp': {
      // Low health or extreme stress
      const healthDeficit = Math.max(0, 100 - physical.health);
      const urgency = psychological.stress * 0.65 + healthDeficit * 0.85;
      return {
        score: clampUtilityScore(urgency),
        reason: `生理健康 ${Math.round(physical.health)}%，心理紧绷度 ${Math.round(psychological.stress)}%`
      };
    }

    case 'attendEvent': {
      // Community participation: fun + belonging deficit
      const belongingDeficit = Math.max(0, 100 - social.belonging);
      const score = psychological.fun * 0.5 + (100 - social.social) * 0.3 + belongingDeficit * 0.4;
      return {
        score: clampUtilityScore(score),
        reason: `社区融入愿景 ${Math.round(social.belonging)}% 与集体集会趣味`
      };
    }
  }
}

/**
 * Calculates MBTI and Big Five personality modifier (0.5 - 1.8)
 */
export function calculatePersonalityModifier(
  action: UtilityActionType,
  traits: Agent['bigFive'],
  mbti: string = 'INFJ'
): number {
  const o = (traits?.openness ?? 50) / 50;
  const c = (traits?.conscientiousness ?? 50) / 50;
  const e = (traits?.extraversion ?? 50) / 50;
  const a = (traits?.agreeableness ?? 50) / 50;
  const n = (traits?.neuroticism ?? 50) / 50;

  let mod = 1.0;

  switch (action) {
    case 'sleep':
      // Conscientious people might delay sleep slightly, neurotic people feel exhaustion faster
      mod = 0.9 + n * 0.15 - c * 0.05;
      break;

    case 'eat':
      // High extraversion / openness enjoys dining out
      mod = 0.95 + e * 0.1;
      break;

    case 'work':
      // Strong boost from Conscientiousness (J types)
      mod = 0.7 + c * 0.45;
      if (mbti.includes('J')) mod += 0.1;
      break;

    case 'socialize':
      // High Extraversion + Agreeableness loves socializing
      mod = 0.55 + e * 0.45 + a * 0.2;
      if (mbti.startsWith('E')) mod += 0.15;
      if (mbti.startsWith('I')) mod -= 0.1;
      break;

    case 'explore':
      // High Openness + Perceiving (P types)
      mod = 0.6 + o * 0.5;
      if (mbti.endsWith('P')) mod += 0.1;
      break;

    case 'relax':
      // Introverts and high neuroticism prize calm relaxation
      mod = 0.8 + (2 - e) * 0.2 + n * 0.2;
      if (mbti.startsWith('I')) mod += 0.1;
      break;

    case 'study':
      // High Openness + Conscientiousness (NT / NF types)
      mod = 0.6 + o * 0.35 + c * 0.25;
      if (mbti.includes('N')) mod += 0.1;
      break;

    case 'shop':
      // Extraverts and feelers enjoy visiting community shops
      mod = 0.8 + e * 0.25 + a * 0.15;
      break;

    case 'seekHelp':
      // Agreeableness and Neuroticism lowers hesitation to seek medical advice
      mod = 0.8 + a * 0.2 + n * 0.25;
      break;

    case 'attendEvent':
      // Extraverts and agreeable residents love public assemblies
      mod = 0.6 + e * 0.4 + a * 0.25;
      if (mbti.startsWith('E')) mod += 0.15;
      break;
  }

  return Math.min(1.8, Math.max(0.5, Number(mod.toFixed(2))));
}

/**
 * Calculates alignment modifier with high-level Goal (0.8 - 1.6)
 */
export function calculateGoalModifier(action: UtilityActionType, goal?: AgentGoal): number {
  if (!goal) return 1.0;

  const goalType = goal.type;
  if (goalType === 'rest' && action === 'sleep') return 1.5;
  if (goalType === 'eat_drink' && (action === 'eat' || action === 'shop')) return 1.5;
  if (goalType === 'socialize' && action === 'socialize') return 1.55;
  if (goalType === 'work_achievement' && (action === 'work' || action === 'study')) return 1.5;
  if (goalType === 'explore_research' && (action === 'explore' || action === 'study')) return 1.5;
  if (goalType === 'leisure_fun' && (action === 'relax' || action === 'attendEvent')) return 1.45;
  if (goalType === 'seek_comfort_care' && (action === 'seekHelp' || action === 'relax')) return 1.5;
  if (goalType === 'civic_governance' && (action === 'work' || action === 'attendEvent')) return 1.45;

  return 0.92;
}

/**
 * Calculates relationship affinity modifier (0.8 - 1.5)
 */
export function calculateRelationshipModifier(
  action: UtilityActionType,
  agent: Agent,
  otherAgents: Agent[]
): { modifier: number; targetAgent?: Agent } {
  if (action !== 'socialize') {
    return { modifier: 1.0 };
  }

  // Find the acquaintance with highest multi-dimensional affinity/social bond
  let highestAffinity = -999;
  let bestFriend: Agent | undefined;

  otherAgents.forEach(other => {
    if (other.id === agent.id) return;
    const rel = agent.relationships?.[other.id];
    const score = rel 
      ? (rel.affection * 0.45 + rel.trust * 0.35 + rel.familiarity * 0.2 - rel.resentment * 0.3) 
      : (agent.affinity?.[other.id] ?? 0);

    if (score > highestAffinity) {
      highestAffinity = score;
      bestFriend = other;
    }
  });

  // Affinity from -100 to 100 maps to modifier 0.8 to 1.45
  const normalized = (highestAffinity + 100) / 200; // 0 to 1
  const mod = 0.8 + normalized * 0.65;

  return {
    modifier: Number(mod.toFixed(2)),
    targetAgent: bestFriend,
  };
}

/**
 * Calculates environmental affordance and weather modifier (0.65 - 1.45)
 */
export function calculateEnvironmentModifier(
  action: UtilityActionType,
  currentBuilding?: Building,
  weather?: string,
  events: TownEvent[] = [],
  agent?: Agent
): number {
  let mod = 1.0;

  // Active public event boosts attendEvent
  const hasActiveEvent = events.some(e => e.active);
  if (hasActiveEvent && action === 'attendEvent') {
    mod *= 1.4;
  }

  // Weather influences: Rain / Storm / Sunshine
  const isRain = weather === 'thunderstorm' || weather === 'overcast_rain' || weather === 'rain';
  const openness = agent?.bigFive?.openness ?? 50;

  if (isRain) {
    if (openness >= 68) {
      // 高开放性居民雨天富有诗意灵感与思索，更享受静处漫步或研读
      if (action === 'relax' || action === 'explore') mod *= 1.15;
      if (action === 'study' || action === 'shop') mod *= 1.25;
    } else {
      // 常规居民避免外出淋雨，偏好室内避雨休憩
      if (action === 'relax' || action === 'explore') mod *= 0.65;
      if (action === 'study' || action === 'sleep' || action === 'shop') mod *= 1.25;
    }
  } else if (weather === 'golden_sunset' || weather === 'starry_night') {
    if (action === 'relax' || action === 'explore') mod *= 1.25;
  }

  // Nighttime effect (circadian urge to sleep & return to shelter)
  const isNight = weather?.includes('night') || agent?.activeConditionTags?.includes('🌙 夜幕渐深');
  if (isNight) {
    if (action === 'sleep') mod *= 1.45;
    if (action === 'work' || action === 'explore') mod *= 0.75;
  }

  // Current building affordance: if agent is already at the relevant building, reduce travel friction
  if (currentBuilding) {
    if (action === 'eat' && (currentBuilding.id === 'bakery' || currentBuilding.id === 'cafe')) mod *= 1.2;
    if (action === 'sleep' && (currentBuilding.id === 'clinic' || currentBuilding.id === 'cottages')) mod *= 1.25;
    if (action === 'study' && currentBuilding.id === 'library') mod *= 1.25;
    if (action === 'explore' && currentBuilding.id === 'observatory') mod *= 1.25;
    if (action === 'relax' && currentBuilding.id === 'central_park') mod *= 1.2;
    if (action === 'shop' && currentBuilding.id === 'cafe') mod *= 1.2;
    if (action === 'seekHelp' && currentBuilding.id === 'clinic') mod *= 1.35;
  }

  return Math.min(1.45, Math.max(0.65, Number(mod.toFixed(2))));
}

/**
 * Evaluates memory imprint modifier (0.85 - 1.35)
 */
export function calculateMemoryModifier(action: UtilityActionType, agent: Agent): number {
  const memories = agent.memories || [];
  if (memories.length === 0) return 1.0;

  let mod = 1.0;

  // Look for reflection or recent memories matching the action intent
  const recentThree = memories.slice(0, 3);
  for (const m of recentThree) {
    const text = m.content.toLowerCase();
    if (action === 'socialize' && (text.includes('交流') || text.includes('倾听') || text.includes('伙伴'))) {
      mod += 0.15;
    }
    if (action === 'study' && (text.includes('古籍') || text.includes('文献') || text.includes('知识'))) {
      mod += 0.15;
    }
    if (action === 'explore' && (text.includes('星仪') || text.includes('齿轮') || text.includes('探索'))) {
      mod += 0.15;
    }
    if (action === 'relax' && (text.includes('放慢') || text.includes('歇息') || text.includes('散心'))) {
      mod += 0.15;
    }
    if (action === 'work' && (text.includes('专注') || text.includes('职责') || text.includes('工坊'))) {
      mod += 0.15;
    }
  }

  return Math.min(1.35, Math.max(0.85, Number(mod.toFixed(2))));
}

/**
 * Complete Utility AI Engine:
 * Scores all 10 candidate actions for the agent and selects the top-scoring utility action.
 * Formula:
 * FinalScore = NeedScore * PersonalityModifier * GoalModifier * RelationshipModifier * EnvironmentModifier * MemoryModifier * Randomness
 * Clamped strictly to [0, 100].
 */
export function evaluateAgentUtilityActions(
  agent: Agent,
  buildings: Building[],
  otherAgents: Agent[],
  currentBuilding?: Building,
  weather?: string,
  events: TownEvent[] = []
): { topAction: UtilityActionScore; allScores: UtilityActionScore[] } {
  const actionsList: UtilityActionType[] = [
    'sleep',
    'eat',
    'work',
    'socialize',
    'explore',
    'relax',
    'study',
    'shop',
    'seekHelp',
    'attendEvent',
  ];

  const evaluations: UtilityActionScore[] = actionsList.map(act => {
    const meta = UTILITY_ACTIONS_META[act];
    const { score: needScore, reason: needReason } = calculateNeedScore(act, agent);
    const personalityMod = calculatePersonalityModifier(act, agent.bigFive, agent.mbti);
    const goalMod = calculateGoalModifier(act, agent.goal);
    const { modifier: relMod, targetAgent } = calculateRelationshipModifier(act, agent, otherAgents);
    const envMod = calculateEnvironmentModifier(act, currentBuilding, weather, events, agent);
    const memMod = calculateMemoryModifier(act, agent);

    // Controlled small randomness (0.95 - 1.05) to break strict ties and prevent robotic rigidity
    const randomness = Number((0.95 + Math.random() * 0.1).toFixed(3));

    // Multiplicative Utility Score
    const rawMultiplied = needScore * personalityMod * goalMod * relMod * envMod * memMod * randomness;
    const finalScore = clampUtilityScore(rawMultiplied);

    // Target Building mapping based on resident identity
    let targetBuildingId = meta.defaultBuilding;
    if (act === 'work') {
      targetBuildingId = agent.currentBuildingId || meta.defaultBuilding;
    } else if (act === 'eat') {
      targetBuildingId = Math.random() > 0.5 ? 'bakery' : 'cafe';
    } else if (act === 'shop') {
      targetBuildingId = 'cafe';
    }

    const factors: UtilityScoreFactors = {
      needScore,
      personalityModifier: personalityMod,
      goalModifier: goalMod,
      relationshipModifier: relMod,
      environmentModifier: envMod,
      memoryModifier: memMod,
      randomness,
    };

    // Human-readable explanation
    const reason = `${needReason} (特质加成: ×${personalityMod}, 目标加权: ×${goalMod})`;

    return {
      action: act,
      label: meta.label,
      icon: meta.icon,
      score: finalScore,
      rawScore: Math.round(rawMultiplied),
      factors,
      reason,
      targetBuildingId,
      targetAgentId: targetAgent?.id,
      targetAgentName: targetAgent?.name,
    };
  });

  // Sort descending by calculated Utility Score
  evaluations.sort((a, b) => b.score - a.score);

  return {
    topAction: evaluations[0],
    allScores: evaluations,
  };
}
