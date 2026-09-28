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
 */
export function calculateNeedScore(action: UtilityActionType, needs: AgentNeeds): { score: number; reason: string } {
  switch (action) {
    case 'sleep': {
      // Need surges as energy drops below 40, and slightly increases with stress
      const fatigue = Math.max(0, 100 - needs.energy);
      const score = fatigue > 50 ? fatigue * 1.05 : fatigue * 0.7;
      return { 
        score: clampUtilityScore(score),
        reason: `精力储备剩余 ${needs.energy}% (疲惫指数: ${Math.round(fatigue)})`
      };
    }

    case 'eat': {
      // Direct correlation with hunger
      const hungerFactor = needs.hunger;
      const score = hungerFactor > 50 ? hungerFactor * 1.1 : hungerFactor * 0.75;
      return {
        score: clampUtilityScore(score),
        reason: `饥饿度达到 ${needs.hunger}%`
      };
    }

    case 'work': {
      // Driven by achievement, but throttled by low energy and excessive stress
      let base = needs.achievement * 0.9;
      if (needs.energy < 30) base *= 0.5;
      if (needs.hunger > 70) base *= 0.6;
      return {
        score: clampUtilityScore(base),
        reason: `进取与成就动机 ${needs.achievement}%`
      };
    }

    case 'socialize': {
      // Driven by social craving and low belonging
      const socialCraving = needs.social * 0.8 + (100 - needs.belonging) * 0.3;
      return {
        score: clampUtilityScore(socialCraving),
        reason: `社交渴求度 ${needs.social}%，社区归属感 ${needs.belonging}%`
      };
    }

    case 'explore': {
      // Driven by curiosity and fun
      const score = needs.curiosity * 0.85 + needs.fun * 0.25;
      return {
        score: clampUtilityScore(score),
        reason: `求知探索欲望 ${needs.curiosity}%`
      };
    }

    case 'relax': {
      // Driven by stress and low comfort
      const stressNeed = needs.stress * 0.8 + (100 - needs.comfort) * 0.35 + needs.fun * 0.2;
      return {
        score: clampUtilityScore(stressNeed),
        reason: `心理压力负荷 ${needs.stress}%，舒适感 ${needs.comfort}%`
      };
    }

    case 'study': {
      // Academic focus: curiosity + achievement
      const score = needs.curiosity * 0.7 + needs.achievement * 0.4;
      return {
        score: clampUtilityScore(score),
        reason: `求知心 ${needs.curiosity}% 与学术进取心 ${needs.achievement}%`
      };
    }

    case 'shop': {
      // Commerce and coffee/pastry leisure: hunger + fun + comfort
      const score = needs.hunger * 0.45 + (100 - needs.comfort) * 0.35 + needs.fun * 0.3;
      return {
        score: clampUtilityScore(score),
        reason: `糕点饮品补给欲与舒适放松心愿`
      };
    }

    case 'seekHelp': {
      // Extreme stress or very low safety/comfort
      const urgency = needs.stress * 0.9 + (100 - needs.safety) * 0.3;
      return {
        score: clampUtilityScore(urgency),
        reason: `精神紧绷压力 ${needs.stress}%，安全秩序感 ${needs.safety}%`
      };
    }

    case 'attendEvent': {
      // Community participation: fun + social + belonging
      const score = needs.fun * 0.5 + needs.social * 0.4 + (100 - needs.belonging) * 0.4;
      return {
        score: clampUtilityScore(score),
        reason: `社区归属呼唤 ${needs.belonging}% 与集体活动趣味`
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

  // Find the acquaintance with highest affinity
  let highestAffinity = -999;
  let bestFriend: Agent | undefined;

  otherAgents.forEach(other => {
    if (other.id === agent.id) return;
    const aff = agent.affinity?.[other.id] ?? 0;
    if (aff > highestAffinity) {
      highestAffinity = aff;
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
 * Calculates environmental affordance and weather modifier (0.7 - 1.4)
 */
export function calculateEnvironmentModifier(
  action: UtilityActionType,
  currentBuilding?: Building,
  weather?: string,
  events: TownEvent[] = []
): number {
  let mod = 1.0;

  // Active public event boosts attendEvent
  const hasActiveEvent = events.some(e => e.active);
  if (hasActiveEvent && action === 'attendEvent') {
    mod *= 1.4;
  }

  // Weather influences outdoor vs indoor actions
  if (weather === 'thunderstorm' || weather === 'overcast_rain') {
    if (action === 'relax' || action === 'explore') mod *= 0.7; // Avoid outdoor wandering
    if (action === 'study' || action === 'sleep' || action === 'shop') mod *= 1.25; // Favor cozy indoors
  } else if (weather === 'golden_sunset' || weather === 'starry_night') {
    if (action === 'relax' || action === 'explore') mod *= 1.25;
  }

  // Current building affordance: if agent is already at the relevant building, reduce travel friction
  if (currentBuilding) {
    if (action === 'eat' && (currentBuilding.id === 'bakery' || currentBuilding.id === 'cafe')) mod *= 1.2;
    if (action === 'sleep' && currentBuilding.id === 'clinic') mod *= 1.2;
    if (action === 'study' && currentBuilding.id === 'library') mod *= 1.25;
    if (action === 'explore' && currentBuilding.id === 'observatory') mod *= 1.25;
    if (action === 'relax' && currentBuilding.id === 'central_park') mod *= 1.2;
    if (action === 'shop' && currentBuilding.id === 'cafe') mod *= 1.2;
    if (action === 'seekHelp' && currentBuilding.id === 'clinic') mod *= 1.3;
  }

  return Math.min(1.4, Math.max(0.7, Number(mod.toFixed(2))));
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
  const needs = agent.needs;
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
    const { score: needScore, reason: needReason } = calculateNeedScore(act, needs);
    const personalityMod = calculatePersonalityModifier(act, agent.bigFive, agent.mbti);
    const goalMod = calculateGoalModifier(act, agent.goal);
    const { modifier: relMod, targetAgent } = calculateRelationshipModifier(act, agent, otherAgents);
    const envMod = calculateEnvironmentModifier(act, currentBuilding, weather, events);
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
