import { 
  Agent, 
  PhysicalNeeds, 
  PsychologicalNeeds, 
  SocialNeeds, 
  CognitiveNeeds, 
  AgentNeeds, 
  AgentStateValues, 
  Building, 
  BigFiveTraits 
} from '../types/town';

/**
 * Default fallback needs for any newly spawned or uninitialized resident
 */
export const DEFAULT_PHYSICAL_NEEDS: PhysicalNeeds = {
  energy: 85,
  hunger: 20,
  health: 92,
};

export const DEFAULT_PSYCHOLOGICAL_NEEDS: PsychologicalNeeds = {
  mood: 75,
  stress: 18,
  fun: 60,
  comfort: 80,
};

export const DEFAULT_SOCIAL_NEEDS: SocialNeeds = {
  social: 70,
  belonging: 75,
};

export const DEFAULT_COGNITIVE_NEEDS: CognitiveNeeds = {
  curiosity: 65,
  achievement: 60,
};

export const DEFAULT_INITIAL_NEEDS: AgentNeeds = {
  energy: 85,
  hunger: 20,
  health: 92,
  social: 70,
  fun: 60,
  comfort: 80,
  curiosity: 65,
  safety: 85,
  belonging: 75,
  achievement: 60,
  stress: 18,
  mood: 75,
};

/**
 * Enforces strict 0-100 numerical bounds with 1-decimal precision
 */
export function clampNeed(val: number): number {
  if (isNaN(val)) return 50;
  return Math.min(100, Math.max(0, Math.round(val * 10) / 10));
}

/**
 * Ensures an agent has fully structured, validated 4-dimensional needs.
 * If legacy flat values exist, migrates them gracefully.
 */
export function ensureAgentFullNeeds(agent: Partial<Agent>): {
  physicalNeeds: PhysicalNeeds;
  psychologicalNeeds: PsychologicalNeeds;
  socialNeeds: SocialNeeds;
  cognitiveNeeds: CognitiveNeeds;
  needs: AgentNeeds;
  state: AgentStateValues;
  activeConditionTags: string[];
} {
  const legacyNeeds = agent.needs || DEFAULT_INITIAL_NEEDS;
  const legacyState = agent.state;

  const physical: PhysicalNeeds = {
    energy: clampNeed(agent.physicalNeeds?.energy ?? legacyNeeds.energy ?? legacyState?.energy ?? 85),
    hunger: clampNeed(agent.physicalNeeds?.hunger ?? legacyNeeds.hunger ?? 20),
    health: clampNeed(agent.physicalNeeds?.health ?? legacyNeeds.health ?? 90),
  };

  const rawMood = agent.psychologicalNeeds?.mood ?? legacyNeeds.mood ?? (
    legacyState?.mood !== undefined 
      ? (legacyState.mood < 0 ? (legacyState.mood + 100) / 2 : legacyState.mood) // normalize -100..100 to 0..100
      : 75
  );

  const psychological: PsychologicalNeeds = {
    mood: clampNeed(rawMood),
    stress: clampNeed(agent.psychologicalNeeds?.stress ?? legacyNeeds.stress ?? legacyState?.stress ?? 18),
    fun: clampNeed(agent.psychologicalNeeds?.fun ?? legacyNeeds.fun ?? 55),
    comfort: clampNeed(agent.psychologicalNeeds?.comfort ?? legacyNeeds.comfort ?? 80),
  };

  const social: SocialNeeds = {
    social: clampNeed(agent.socialNeeds?.social ?? legacyNeeds.social ?? legacyState?.sociability ?? 70),
    belonging: clampNeed(agent.socialNeeds?.belonging ?? legacyNeeds.belonging ?? 75),
  };

  const cognitive: CognitiveNeeds = {
    curiosity: clampNeed(agent.cognitiveNeeds?.curiosity ?? legacyNeeds.curiosity ?? 65),
    achievement: clampNeed(agent.cognitiveNeeds?.achievement ?? legacyNeeds.achievement ?? 60),
  };

  // Keep flat views synced
  const flatNeeds: AgentNeeds = {
    energy: physical.energy,
    hunger: physical.hunger,
    health: physical.health,
    social: social.social,
    fun: psychological.fun,
    comfort: psychological.comfort,
    curiosity: cognitive.curiosity,
    safety: clampNeed(legacyNeeds.safety ?? 85),
    belonging: social.belonging,
    achievement: cognitive.achievement,
    stress: psychological.stress,
    mood: psychological.mood,
  };

  const syncedState: AgentStateValues = {
    energy: Math.round(physical.energy),
    mood: Math.round(psychological.mood),
    stress: Math.round(psychological.stress),
    sociability: Math.round(social.social),
  };

  return {
    physicalNeeds: physical,
    psychologicalNeeds: psychological,
    socialNeeds: social,
    cognitiveNeeds: cognitive,
    needs: flatNeeds,
    state: syncedState,
    activeConditionTags: agent.activeConditionTags || [],
  };
}

/**
 * Calculates individualized dynamic decay and sensitivity rates based on MBTI and Big Five
 */
export function generatePersonalityNeedRates(traits: BigFiveTraits, mbti: string = 'ENFJ') {
  const o = (traits.openness ?? 50) / 50;
  const c = (traits.conscientiousness ?? 50) / 50;
  const e = (traits.extraversion ?? 50) / 50;
  const a = (traits.agreeableness ?? 50) / 50;
  const n = (traits.neuroticism ?? 50) / 50;

  return {
    // High Conscientiousness preserves energy through disciplined habits; High Neuroticism burns more via tension
    energyDrainRate: Math.max(0.02, 0.055 - c * 0.015 + n * 0.012),
    // Hunger accumulates steadily
    hungerRate: 0.08,
    // Extraverts' social battery drops much faster when isolated
    socialDecayRate: Math.max(0.02, 0.05 * e),
    // Fun / recreational craving
    funDecayRate: Math.max(0.02, 0.045 * (e * 0.6 + o * 0.4)),
    // Comfort natural decay in bustling conditions
    comfortDecayRate: 0.03 * (0.8 + n * 0.3),
    // High Openness agents build curiosity and yearning for exploration much faster
    curiosityGrowthRate: Math.max(0.03, 0.075 * o),
    // High Conscientiousness builds drive to achieve tasks
    achievementGrowthRate: Math.max(0.03, 0.065 * c),
    // Agreeableness agents crave belonging and community resonance
    belongingSensitivity: a,
    // Neuroticism compounds stress build-up and slows stress recovery
    neuroticismFactor: n,
    // Openness determines weather appreciation (e.g. rain)
    lovesRain: traits.openness >= 68,
  };
}

/**
 * Core simulation tick for updating an agent's 4-dimension needs:
 * 1. Personality-based natural decay/growth
 * 2. Weather & Day/Night circadian rhythm effects
 * 3. Dynamic inter-variable linkages (e.g. sleep deprivation, prolonged hunger)
 * 4. Building affordances and recovery buffs
 */
export function updateAgentNeeds(
  agent: Agent,
  deltaMinutes: number,
  currentBuilding?: Building,
  weather: string = 'clear',
  simHour: number = 10
): {
  physicalNeeds: PhysicalNeeds;
  psychologicalNeeds: PsychologicalNeeds;
  socialNeeds: SocialNeeds;
  cognitiveNeeds: CognitiveNeeds;
  needs: AgentNeeds;
  state: AgentStateValues;
  activeConditionTags: string[];
} {
  const dt = Math.max(0.1, Math.min(60, deltaMinutes));
  const traits = agent.bigFive || {
    openness: 60,
    conscientiousness: 60,
    extraversion: 60,
    agreeableness: 60,
    neuroticism: 35,
  };

  const current = ensureAgentFullNeeds(agent);
  const p = { ...current.physicalNeeds };
  const psy = { ...current.psychologicalNeeds };
  const soc = { ...current.socialNeeds };
  const cog = { ...current.cognitiveNeeds };
  const conditionTags = new Set<string>();

  const rates = generatePersonalityNeedRates(traits, agent.mbti);

  // --- 1. Natural Drift & Personality Rates ---
  const isNight = simHour >= 21 || simHour < 6;
  const nightEnergyMultiplier = isNight ? 1.6 : 1.0;

  // Energy drops
  p.energy -= rates.energyDrainRate * nightEnergyMultiplier * dt;
  if (isNight) {
    conditionTags.add('🌙 夜幕渐深');
  }

  // Hunger increases
  p.hunger += rates.hungerRate * dt;

  // Social need decays if isolated (social satisfaction drops)
  soc.social -= rates.socialDecayRate * dt;

  // Fun decays slowly without entertainment
  psy.fun -= rates.funDecayRate * dt;

  // Comfort decays slowly
  psy.comfort -= rates.comfortDecayRate * dt;

  // Curiosity accumulates naturally (desire to learn)
  cog.curiosity += rates.curiosityGrowthRate * dt;

  // Achievement craving accumulates
  cog.achievement += rates.achievementGrowthRate * dt;

  // Base stress drift (moderated by neuroticism)
  psy.stress += 0.015 * rates.neuroticismFactor * dt;

  // --- 2. Dynamic Inter-Variable Linkages (联动关系) ---

  // Linkage A: 睡眠不足 (Sleep Deprivation)
  // 当精力低于 35 时：压力上升、情绪愉悦度下降
  if (p.energy < 35) {
    psy.stress += (0.07 * rates.neuroticismFactor) * dt;
    psy.mood -= 0.06 * dt;
    conditionTags.add('⚡ 睡眠不足');

    // 极端疲乏 (< 18)：健康度受损
    if (p.energy < 18) {
      p.health -= 0.05 * dt;
      conditionTags.add('⚠️ 极度虚耗');
    }
  }

  // Linkage B: 长期饥饿 (Prolonged Hunger)
  // 当饥饿度超过 65 时：情绪下降、压力增加、精力损耗加剧
  if (p.hunger > 65) {
    psy.mood -= 0.07 * dt;
    psy.stress += (0.06 * rates.neuroticismFactor) * dt;
    p.energy -= 0.03 * dt;
    conditionTags.add('🍞 饥肠辘辘');

    // 严重饥饿 (> 85)：生理健康受损
    if (p.hunger > 85) {
      p.health -= 0.06 * dt;
      conditionTags.add('⚠️ 饥饿虚弱');
    }
  }

  // Linkage C: 心理高压负荷 (Severe Stress Linkage)
  // 当压力超过 70 时：身心不适、心情受损、健康慢性磨损
  if (psy.stress > 70) {
    psy.mood -= 0.08 * dt;
    psy.comfort -= 0.05 * dt;
    p.health -= 0.03 * dt;
    conditionTags.add('🔥 精神紧绷');
  }

  // Linkage D: 孤独感与归属感 (Isolation / Lack of Social Connection)
  // 当社交充实度低于 30 时：感到孤单，归属感持续流失
  if (soc.social < 30) {
    soc.belonging -= 0.03 * rates.belongingSensitivity * dt;
    if (traits.extraversion >= 70) {
      psy.mood -= 0.05 * dt; // 外向者孤独时心情更低落
    }
    conditionTags.add('💬 感到孤单');
  }

  // Linkage E: 身心充盈滋养 (Nourished & Rested Dynamic Recovery)
  // 当精力充沛 (> 70) 且饱腹 (饥饿 < 35) 且压力较轻 (< 30) 时：健康自然愈合，心情平和回升
  if (p.energy > 70 && p.hunger < 35 && psy.stress < 30) {
    p.health += 0.06 * dt;
    psy.mood += 0.04 * dt;
    psy.comfort += 0.04 * dt;
    conditionTags.add('✨ 身心饱满');
  }

  // Linkage F: 认知好奇与成就渴望指示
  if (cog.curiosity > 80) {
    conditionTags.add('🔍 求知心切');
  }
  if (cog.achievement > 80) {
    conditionTags.add('💼 渴望建树');
  }

  // --- 3. Weather Influence (天气动态响应) ---
  const isRainy = weather === 'rain' || weather === 'thunderstorm';
  if (isRainy) {
    if (rates.lovesRain) {
      // 高开放性居民反而喜欢雨天 (诗意沉思、灵感涌现)
      psy.mood += 0.04 * dt;
      cog.curiosity += 0.03 * dt;
      psy.comfort += 0.02 * dt;
      conditionTags.add('🌧️ 雨中漫想');
    } else {
      // 常规或高神经质居民在雨天感到湿冷与不便
      psy.mood -= 0.04 * dt;
      psy.comfort -= 0.05 * dt;
      if (weather === 'thunderstorm') {
        psy.stress += (0.05 * rates.neuroticismFactor) * dt;
        p.health -= 0.03 * dt; // 淋雨感冒风险
        conditionTags.add('⛈️ 风雨惊悸');
      } else {
        conditionTags.add('🌧️ 避雨中');
      }
    }
  }

  // --- 4. Building Environmental Affordances ---
  if (currentBuilding) {
    switch (currentBuilding.id) {
      case 'cafe':
        psy.comfort += 0.12 * dt;
        psy.stress -= 0.09 * dt;
        psy.fun += 0.04 * dt;
        break;

      case 'bakery':
        psy.comfort += 0.10 * dt;
        psy.mood += 0.05 * dt;
        break;

      case 'clinic':
        // 诊所提供专业调养与心理疏导
        p.health += 0.22 * dt;
        psy.stress -= 0.20 * dt;
        psy.comfort += 0.12 * dt;
        break;

      case 'central_park':
        psy.fun += 0.08 * dt;
        psy.stress -= 0.08 * dt;
        psy.comfort += 0.05 * dt;
        break;

      case 'library':
        cog.curiosity += 0.06 * dt;
        cog.achievement += 0.04 * dt;
        psy.stress -= 0.06 * dt;
        break;

      case 'observatory':
        cog.curiosity += 0.08 * dt;
        psy.fun += 0.06 * dt;
        break;

      case 'town_hall':
        soc.belonging += 0.09 * dt;
        cog.achievement += 0.05 * dt;
        break;

      case 'cottages':
        // 居所深度休憩
        psy.comfort += 0.12 * dt;
        psy.stress -= 0.08 * dt;
        break;
    }
  }

  // --- 5. Clamp all 0-100 ---
  const clampedPhysical: PhysicalNeeds = {
    energy: clampNeed(p.energy),
    hunger: clampNeed(p.hunger),
    health: clampNeed(p.health),
  };

  const clampedPsychological: PsychologicalNeeds = {
    mood: clampNeed(psy.mood),
    stress: clampNeed(psy.stress),
    fun: clampNeed(psy.fun),
    comfort: clampNeed(psy.comfort),
  };

  const clampedSocial: SocialNeeds = {
    social: clampNeed(soc.social),
    belonging: clampNeed(soc.belonging),
  };

  const clampedCognitive: CognitiveNeeds = {
    curiosity: clampNeed(cog.curiosity),
    achievement: clampNeed(cog.achievement),
  };

  // Synchronized flat representations
  const flatNeeds: AgentNeeds = {
    energy: clampedPhysical.energy,
    hunger: clampedPhysical.hunger,
    health: clampedPhysical.health,
    social: clampedSocial.social,
    fun: clampedPsychological.fun,
    comfort: clampedPsychological.comfort,
    curiosity: clampedCognitive.curiosity,
    safety: clampNeed(current.needs.safety),
    belonging: clampedSocial.belonging,
    achievement: clampedCognitive.achievement,
    stress: clampedPsychological.stress,
    mood: clampedPsychological.mood,
  };

  const syncedState: AgentStateValues = {
    energy: Math.round(clampedPhysical.energy),
    mood: Math.round(clampedPsychological.mood),
    stress: Math.round(clampedPsychological.stress),
    sociability: Math.round(clampedSocial.social),
  };

  return {
    physicalNeeds: clampedPhysical,
    psychologicalNeeds: clampedPsychological,
    socialNeeds: clampedSocial,
    cognitiveNeeds: clampedCognitive,
    needs: flatNeeds,
    state: syncedState,
    activeConditionTags: Array.from(conditionTags),
  };
}

/**
 * Applies immediate consequences to agent needs when a dialogue concludes
 * (Good conversation restores social/belonging, lowers stress; conflict spikes stress & drops mood)
 */
export function applyDialogueOutcomeToNeeds(
  agent: Agent,
  sentiment: 'positive' | 'neutral' | 'conflict' | 'deep' | 'collaborative',
  sentimentScore: number
): {
  physicalNeeds: PhysicalNeeds;
  psychologicalNeeds: PsychologicalNeeds;
  socialNeeds: SocialNeeds;
  cognitiveNeeds: CognitiveNeeds;
  needs: AgentNeeds;
  state: AgentStateValues;
  activeConditionTags: string[];
} {
  const current = ensureAgentFullNeeds(agent);
  const p = { ...current.physicalNeeds };
  const psy = { ...current.psychologicalNeeds };
  const soc = { ...current.socialNeeds };
  const cog = { ...current.cognitiveNeeds };
  const tags = new Set<string>(current.activeConditionTags);

  switch (sentiment) {
    case 'positive':
    case 'collaborative':
      // 良好社交：社交满足恢复、归属感增加、压力降低、心情提升
      soc.social = clampNeed(soc.social + 35);
      soc.belonging = clampNeed(soc.belonging + 18);
      psy.stress = clampNeed(psy.stress - 18);
      psy.mood = clampNeed(psy.mood + 22);
      psy.fun = clampNeed(psy.fun + 15);
      tags.delete('💬 感到孤单');
      tags.add('🤝 愉悦共鸣');
      break;

    case 'deep':
      // 深度倾谈：好奇求知得到启发、归属感与心情显著增加
      soc.social = clampNeed(soc.social + 40);
      soc.belonging = clampNeed(soc.belonging + 24);
      cog.curiosity = clampNeed(cog.curiosity + 20);
      psy.stress = clampNeed(psy.stress - 15);
      psy.mood = clampNeed(psy.mood + 25);
      tags.add('💡 深刻启发');
      break;

    case 'conflict':
      // 冲突：压力飙升、心情骤降、归属感受挫
      psy.stress = clampNeed(psy.stress + 28);
      psy.mood = clampNeed(psy.mood - 25);
      soc.belonging = clampNeed(soc.belonging - 18);
      psy.comfort = clampNeed(psy.comfort - 15);
      tags.add('⚡ 邻里龃龉');
      break;

    case 'neutral':
    default:
      soc.social = clampNeed(soc.social + 15);
      psy.mood = clampNeed(psy.mood + 5);
      break;
  }

  // Synchronized views
  const flatNeeds: AgentNeeds = {
    ...current.needs,
    energy: p.energy,
    hunger: p.hunger,
    health: p.health,
    social: soc.social,
    fun: psy.fun,
    comfort: psy.comfort,
    curiosity: cog.curiosity,
    belonging: soc.belonging,
    achievement: cog.achievement,
    stress: psy.stress,
    mood: psy.mood,
  };

  const syncedState: AgentStateValues = {
    energy: Math.round(p.energy),
    mood: Math.round(psy.mood),
    stress: Math.round(psy.stress),
    sociability: Math.round(soc.social),
  };

  return {
    physicalNeeds: p,
    psychologicalNeeds: psy,
    socialNeeds: soc,
    cognitiveNeeds: cog,
    needs: flatNeeds,
    state: syncedState,
    activeConditionTags: Array.from(tags),
  };
}

/**
 * Applies immediate consequences to agent needs upon completing an autonomous action
 */
export function applyActionEffectsToNeeds(
  agent: Agent,
  feedback: Partial<Record<keyof AgentNeeds, number>>
): {
  physicalNeeds: PhysicalNeeds;
  psychologicalNeeds: PsychologicalNeeds;
  socialNeeds: SocialNeeds;
  cognitiveNeeds: CognitiveNeeds;
  needs: AgentNeeds;
  state: AgentStateValues;
  activeConditionTags: string[];
} {
  const current = ensureAgentFullNeeds(agent);
  const p = { ...current.physicalNeeds };
  const psy = { ...current.psychologicalNeeds };
  const soc = { ...current.socialNeeds };
  const cog = { ...current.cognitiveNeeds };
  const tags = new Set<string>(current.activeConditionTags);

  // Apply explicit deltas
  if (typeof feedback.energy === 'number') p.energy = clampNeed(p.energy + feedback.energy);
  if (typeof feedback.hunger === 'number') p.hunger = clampNeed(p.hunger + feedback.hunger);
  if (typeof feedback.health === 'number') p.health = clampNeed(p.health + feedback.health);
  if (typeof feedback.mood === 'number') psy.mood = clampNeed(psy.mood + feedback.mood);
  if (typeof feedback.stress === 'number') psy.stress = clampNeed(psy.stress + feedback.stress);
  if (typeof feedback.fun === 'number') psy.fun = clampNeed(psy.fun + feedback.fun);
  if (typeof feedback.comfort === 'number') psy.comfort = clampNeed(psy.comfort + feedback.comfort);
  if (typeof feedback.social === 'number') soc.social = clampNeed(soc.social + feedback.social);
  if (typeof feedback.belonging === 'number') soc.belonging = clampNeed(soc.belonging + feedback.belonging);
  if (typeof feedback.curiosity === 'number') cog.curiosity = clampNeed(cog.curiosity + feedback.curiosity);
  if (typeof feedback.achievement === 'number') {
    cog.achievement = clampNeed(cog.achievement + feedback.achievement);
    // 工作/研究成就联动：成就感提升带来心情愉悦
    if (feedback.achievement > 0) {
      psy.mood = clampNeed(psy.mood + Math.round(feedback.achievement * 0.4));
      tags.add('🏆 成果喜悦');
    }
  }

  // If just ate, clear severe hunger tag
  if (feedback.hunger && feedback.hunger < -20) {
    tags.delete('🍞 饥肠辘辘');
    tags.delete('⚠️ 饥饿虚弱');
  }

  // If just slept, clear exhaustion
  if (feedback.energy && feedback.energy > 30) {
    tags.delete('⚡ 睡眠不足');
    tags.delete('⚠️ 极度虚耗');
    psy.mood = clampNeed(psy.mood + 15);
  }

  const flatNeeds: AgentNeeds = {
    ...current.needs,
    energy: p.energy,
    hunger: p.hunger,
    health: p.health,
    social: soc.social,
    fun: psy.fun,
    comfort: psy.comfort,
    curiosity: cog.curiosity,
    belonging: soc.belonging,
    achievement: cog.achievement,
    stress: psy.stress,
    mood: psy.mood,
  };

  const syncedState: AgentStateValues = {
    energy: Math.round(p.energy),
    mood: Math.round(psy.mood),
    stress: Math.round(psy.stress),
    sociability: Math.round(soc.social),
  };

  return {
    physicalNeeds: p,
    psychologicalNeeds: psy,
    socialNeeds: soc,
    cognitiveNeeds: cog,
    needs: flatNeeds,
    state: syncedState,
    activeConditionTags: Array.from(tags),
  };
}
