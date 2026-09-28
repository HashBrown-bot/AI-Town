import { 
  Agent, 
  Relationship, 
  RelationshipDimensions, 
  RelationshipStage, 
  RelationshipHistoryEntry 
} from '../types/town';

/**
 * Bounds & Clamping Helpers
 */
export function clamp0to100(val: number): number {
  if (isNaN(val)) return 0;
  return Math.max(0, Math.min(100, Math.round(val)));
}

export function clampMinus100to100(val: number): number {
  if (isNaN(val)) return 0;
  return Math.max(-100, Math.min(100, Math.round(val)));
}

/**
 * Chinese labels for Relationship Stages
 */
export const STAGE_CONFIG: Record<RelationshipStage, {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  accentColor: string;
  description: string;
}> = {
  stranger: {
    label: '陌生人',
    badgeBg: 'bg-slate-800/80',
    badgeText: 'text-slate-400',
    badgeBorder: 'border-slate-700',
    accentColor: '#94a3b8',
    description: '彼此几乎毫无交集，缺乏基本了解与信任基础。'
  },
  acquaintance: {
    label: '点头之交',
    badgeBg: 'bg-sky-950/60',
    badgeText: 'text-sky-400',
    badgeBorder: 'border-sky-800/60',
    accentColor: '#38bdf8',
    description: '有过数面之缘或轻度寒暄，建立了初步的熟识感。'
  },
  friend: {
    label: '朋友',
    badgeBg: 'bg-emerald-950/60',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-800/60',
    accentColor: '#10b981',
    description: '日常交往愉快，具备互助意愿与可观的善意信任。'
  },
  close_friend: {
    label: '挚友知己',
    badgeBg: 'bg-teal-950/60',
    badgeText: 'text-teal-300',
    badgeBorder: 'border-teal-700/60',
    accentColor: '#14b8a6',
    description: '彼此深切了解、信任度极高，能够吐露心声与分担忧患。'
  },
  rival: {
    label: '竞争对手',
    badgeBg: 'bg-amber-950/60',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-700/60',
    accentColor: '#f59e0b',
    description: '在才能、理念或追求上相互较劲，但往往伴随深刻的互重或胜负欲。'
  },
  enemy: {
    label: '敌对宿怨',
    badgeBg: 'bg-rose-950/60',
    badgeText: 'text-rose-400',
    badgeBorder: 'border-rose-800/60',
    accentColor: '#f43f5e',
    description: '积怨深重或遭遇严重背叛，充斥着高度戒备、反感与不信任。'
  },
  romantic_interest: {
    label: '心动倾慕',
    badgeBg: 'bg-pink-950/60',
    badgeText: 'text-pink-300',
    badgeBorder: 'border-pink-700/60',
    accentColor: '#ec4899',
    description: '彼此散发着强烈的吸引力，正处于情愫萌芽与试探阶段。'
  },
  partner: {
    label: '亲密伴侣',
    badgeBg: 'bg-purple-950/60',
    badgeText: 'text-purple-300',
    badgeBorder: 'border-purple-700/60',
    accentColor: '#a855f7',
    description: '高度相互吸引、深厚依赖与坚不可摧的情感同盟。'
  }
};

export function getStageLabel(stage: RelationshipStage): string {
  return STAGE_CONFIG[stage]?.label || '未知阶段';
}

/**
 * Computes a synthesized affinity projection score (-100 to 100) for backward compatibility
 */
export function calculateAffinityProjection(rel: RelationshipDimensions): number {
  const score = (rel.affection * 0.45) + (rel.trust * 0.35) + (rel.respect * 0.2) - (rel.resentment * 0.4);
  return clampMinus100to100(Math.round(score));
}

/**
 * Sophisticated multi-dimensional relationship stage classifier
 */
export function determineRelationshipStage(rel: RelationshipDimensions): RelationshipStage {
  const {
    familiarity,
    trust,
    affection,
    respect,
    attraction,
    rivalry,
    resentment
  } = rel;

  // 1. Enemy: High resentment or severe negative trust + negative affection
  if (resentment >= 50 || (trust <= -40 && affection <= -30)) {
    return 'enemy';
  }

  // 2. Partner: High attraction + high affection + strong trust + familiarity + low resentment
  if (attraction >= 60 && affection >= 50 && trust >= 40 && familiarity >= 40 && resentment <= 20) {
    return 'partner';
  }

  // 3. Romantic Interest: High attraction + positive affection + some familiarity + low resentment
  if (attraction >= 50 && affection >= 20 && familiarity >= 20 && resentment <= 30) {
    return 'romantic_interest';
  }

  // 4. Rival: Strong rivalry + (respect or not dominated by pure malice)
  if (rivalry >= 50 && (respect >= 20 || resentment < 50)) {
    return 'rival';
  }

  // 5. Close Friend: High familiarity + solid trust + high affection + low resentment
  if (familiarity >= 55 && trust >= 45 && affection >= 45 && resentment <= 25) {
    return 'close_friend';
  }

  // 6. Friend: Moderate familiarity + positive affection & trust
  if (familiarity >= 30 && affection >= 20 && trust >= 10 && resentment <= 35) {
    return 'friend';
  }

  // 7. Acquaintance: Basic familiarity threshold
  if (familiarity >= 15) {
    return 'acquaintance';
  }

  // 8. Default: Stranger
  return 'stranger';
}

/**
 * Generate human-readable dynamic summary phrase describing the current relationship state
 */
export function getDominantDynamic(rel: RelationshipDimensions): string {
  const { trust, affection, respect, attraction, rivalry, resentment, jealousy, dependency, familiarity } = rel;

  if (resentment >= 60) {
    return respect >= 40 ? '虽认可其才华，但宿怨未解' : '积怨深重，形同陌路或暗生敌意';
  }
  if (affection >= 60 && trust <= -20) {
    return '虽心怀好感，但难以交付完全信任';
  }
  if (respect >= 60 && rivalry >= 50) {
    return '惺惺相惜、互相争锋的宿命劲敌';
  }
  if (attraction >= 65 && affection >= 50) {
    return trust >= 40 ? '灵魂契合、彼此依恋的心灵伴侣' : '情愫暗涌、令人怦然心动的暧昧关系';
  }
  if (trust >= 60 && affection >= 50) {
    return dependency >= 50 ? '休戚与共、深度依仗的莫逆之交' : '坦诚以待、无话不谈的挚友';
  }
  if (rivalry >= 55 && jealousy >= 40) {
    return '较劲之中夹杂着微妙的嫉妒心理';
  }
  if (respect >= 50 && familiarity < 30) {
    return '心存敬意但尚缺深交的前辈或同仁';
  }
  if (affection >= 30 && trust >= 20) {
    return '相处融洽、温暖和善的友好往来';
  }
  if (familiarity >= 20) {
    return '偶有寒暄、客气礼貌的点头之交';
  }
  return '初涉交往，尚待时间沉淀了解';
}

/**
 * Create default relationship structure initialized with zero/neutral values or seeded from affinity
 */
export function createDefaultRelationship(
  targetAgentId: string, 
  targetAgentName?: string, 
  initialAffinity?: number
): Relationship {
  const aff = initialAffinity ?? 0;
  
  // Seed dimensions sensibly if initial affinity exists
  const hasHistory = aff !== 0;
  const familiarity = hasHistory ? Math.min(70, Math.max(15, Math.round(Math.abs(aff) * 0.6 + 20))) : 0;
  const affection = clampMinus100to100(aff);
  const trust = clampMinus100to100(Math.round(aff * 0.75));
  const respect = clampMinus100to100(Math.round(aff * 0.5));
  const attraction = aff > 40 ? Math.round(aff * 0.4) : 0;
  const rivalry = aff < -20 ? Math.min(80, Math.round(Math.abs(aff) * 0.7)) : 0;
  const resentment = aff < -30 ? Math.min(80, Math.round(Math.abs(aff) * 0.8)) : 0;
  const jealousy = 0;
  const dependency = aff > 50 ? Math.round(aff * 0.3) : 0;

  const dims: RelationshipDimensions = {
    familiarity,
    trust,
    affection,
    respect,
    attraction,
    rivalry,
    resentment,
    jealousy,
    dependency
  };

  const stage = determineRelationshipStage(dims);
  const dominantDynamic = getDominantDynamic(dims);

  const initialHistory: RelationshipHistoryEntry[] = hasHistory ? [
    {
      id: `rel-init-${targetAgentId}`,
      simDay: 1,
      simTime: '08:00',
      event: `确立小镇初始社交印象`,
      reason: `既往小镇生活沉淀的关系基底`,
      importance: 5,
      dimensionChanges: {
        familiarity,
        affection,
        trust,
        respect
      }
    }
  ] : [];

  return {
    targetAgentId,
    targetAgentName: targetAgentName || targetAgentId,
    relationshipStage: stage,
    ...dims,
    history: initialHistory,
    dominantDynamic,
    summaryNote: hasHistory ? `小镇初始熟识基线` : `初入视野`
  };
}

/**
 * Ensures an agent has complete and populated relationships dictionary
 */
export function ensureAgentRelationships(
  agent: Partial<Agent>, 
  allAgents?: { id: string; name: string }[]
): Record<string, Relationship> {
  const currentRels = { ...(agent.relationships || {}) };

  if (allAgents) {
    allAgents.forEach(other => {
      if (other.id === agent.id) return;
      if (!currentRels[other.id]) {
        const fallbackAffinity = agent.affinity?.[other.id] ?? 0;
        currentRels[other.id] = createDefaultRelationship(other.id, other.name, fallbackAffinity);
      } else {
        // Guarantee all dimension properties exist and are valid numbers
        const r = currentRels[other.id];
        currentRels[other.id] = {
          ...r,
          targetAgentName: r.targetAgentName || other.name,
          familiarity: clamp0to100(r.familiarity ?? 0),
          trust: clampMinus100to100(r.trust ?? 0),
          affection: clampMinus100to100(r.affection ?? 0),
          respect: clampMinus100to100(r.respect ?? 0),
          attraction: clamp0to100(r.attraction ?? 0),
          rivalry: clamp0to100(r.rivalry ?? 0),
          resentment: clamp0to100(r.resentment ?? 0),
          jealousy: clamp0to100(r.jealousy ?? 0),
          dependency: clamp0to100(r.dependency ?? 0),
          relationshipStage: r.relationshipStage || determineRelationshipStage(r),
          history: Array.isArray(r.history) ? r.history : []
        };
      }
    });
  }

  return currentRels;
}

/**
 * Dialogue & Interaction outcome consequence evaluator for Relationship 2.0
 */
export interface DialogueRelationshipUpdateInput {
  agentA: Agent;
  agentB: Agent;
  sentiment: 'positive' | 'neutral' | 'conflict' | 'deep' | 'collaborative';
  sentimentScore: number; // -1.0 to 1.0
  topic: string;
  summary: string;
  locationName: string;
  simDay: number;
  simTime: string;
  importance?: number;
  emotionalIntensity?: number;
  suggestedDeltaAtoB?: number;
  suggestedDeltaBtoA?: number;
}

export interface DialogueRelationshipUpdateResult {
  updatedRelAtoB: Relationship;
  updatedRelBtoA: Relationship;
  stageTransitionAtoB?: { from: RelationshipStage; to: RelationshipStage };
  stageTransitionBtoA?: { from: RelationshipStage; to: RelationshipStage };
  historyEntryA: RelationshipHistoryEntry;
  historyEntryB: RelationshipHistoryEntry;
}

/**
 * Calculates and updates bilateral relationship dimensions based on dialogue encounter,
 * personalities, emotional states, memory context, and event situation.
 */
export function updateRelationshipOnInteraction(
  input: DialogueRelationshipUpdateInput
): DialogueRelationshipUpdateResult {
  const {
    agentA,
    agentB,
    sentiment,
    sentimentScore,
    topic,
    summary,
    locationName,
    simDay,
    simTime,
    importance = 6,
    emotionalIntensity = 5,
    suggestedDeltaAtoB,
    suggestedDeltaBtoA
  } = input;

  const currentRelAtoB = agentA.relationships?.[agentB.id] || 
    createDefaultRelationship(agentB.id, agentB.name, agentA.affinity?.[agentB.id] ?? 0);

  const currentRelBtoA = agentB.relationships?.[agentA.id] || 
    createDefaultRelationship(agentA.id, agentA.name, agentB.affinity?.[agentA.id] ?? 0);

  // Personality modifiers (Big Five & MBTI influences)
  const aAgreeable = (agentA.bigFive?.agreeableness ?? 50) / 100;
  const aNeurotic = (agentA.bigFive?.neuroticism ?? 30) / 100;
  const aExtravert = (agentA.bigFive?.extraversion ?? 50) / 100;
  const aOpenness = (agentA.bigFive?.openness ?? 60) / 100;
  const aConscientious = (agentA.bigFive?.conscientiousness ?? 60) / 100;

  const bAgreeable = (agentB.bigFive?.agreeableness ?? 50) / 100;
  const bNeurotic = (agentB.bigFive?.neuroticism ?? 30) / 100;
  const bExtravert = (agentB.bigFive?.extraversion ?? 50) / 100;
  const bOpenness = (agentB.bigFive?.openness ?? 60) / 100;
  const bConscientious = (agentB.bigFive?.conscientiousness ?? 60) / 100;

  // Emotional states modifiers
  const aStressMod = (agentA.psychologicalNeeds?.stress ?? agentA.state.stress ?? 20) / 100;
  const bStressMod = (agentB.psychologicalNeeds?.stress ?? agentB.state.stress ?? 20) / 100;

  // 1. Calculate Dimension Shifts for A towards B
  const dFamA = Math.round(4 + aExtravert * 3 + bExtravert * 2);
  let dTrustA = 0;
  let dAffectionA = 0;
  let dRespectA = 0;
  let dAttractionA = 0;
  let dRivalryA = 0;
  let dResentmentA = 0;
  let dJealousyA = 0;
  let dDependencyA = 0;

  // 2. Calculate Dimension Shifts for B towards A
  const dFamB = Math.round(4 + bExtravert * 3 + aExtravert * 2);
  let dTrustB = 0;
  let dAffectionB = 0;
  let dRespectB = 0;
  let dAttractionB = 0;
  let dRivalryB = 0;
  let dResentmentB = 0;
  let dJealousyB = 0;
  let dDependencyB = 0;

  // Sentiment Branching
  switch (sentiment) {
    case 'conflict': {
      // Conflict: trust drops, resentment rises, rivalry may spike
      const baseDrop = Math.round(10 + Math.abs(sentimentScore) * 12);
      dTrustA = -Math.round(baseDrop * (1 + aNeurotic * 0.5 + aStressMod * 0.4 - aAgreeable * 0.3));
      dTrustB = -Math.round(baseDrop * (1 + bNeurotic * 0.5 + bStressMod * 0.4 - bAgreeable * 0.3));

      dAffectionA = -Math.round((baseDrop * 0.8) + (suggestedDeltaAtoB ? Math.min(0, suggestedDeltaAtoB) : 0));
      dAffectionB = -Math.round((baseDrop * 0.8) + (suggestedDeltaBtoA ? Math.min(0, suggestedDeltaBtoA) : 0));

      dResentmentA = Math.round(12 + aNeurotic * 12 + aStressMod * 8);
      dResentmentB = Math.round(12 + bNeurotic * 12 + bStressMod * 8);

      dRivalryA = Math.round(8 + aConscientious * 6);
      dRivalryB = Math.round(8 + bConscientious * 6);

      // If respect was already high, respect might decrease slightly or remain as begrudging respect
      dRespectA = currentRelAtoB.respect > 40 ? -3 : -8;
      dRespectB = currentRelBtoA.respect > 40 ? -3 : -8;
      break;
    }
    case 'deep': {
      // Deep intellectual or emotional conversation: big trust, respect, familiarity, low resentment
      dTrustA = Math.round(8 + aOpenness * 6 + aAgreeable * 4);
      dTrustB = Math.round(8 + bOpenness * 6 + bAgreeable * 4);

      dAffectionA = Math.round(8 + aAgreeable * 5);
      dAffectionB = Math.round(8 + bAgreeable * 5);

      dRespectA = Math.round(10 + aOpenness * 8);
      dRespectB = Math.round(10 + bOpenness * 8);

      // Deep conversations can spark romantic attraction if openness is high
      if (aOpenness > 0.65 && bOpenness > 0.65) {
        dAttractionA = Math.round(5 + Math.random() * 5);
        dAttractionB = Math.round(5 + Math.random() * 5);
      }

      // Healing effect on past resentment
      dResentmentA = -Math.round(8 + aAgreeable * 8);
      dResentmentB = -Math.round(8 + bAgreeable * 8);

      dDependencyA = Math.round(3 + aNeurotic * 4);
      dDependencyB = Math.round(3 + bNeurotic * 4);
      break;
    }
    case 'collaborative': {
      // Teamwork / cooperation: boosts trust, respect, reduces rivalry into partnership
      dTrustA = Math.round(10 + aConscientious * 5 + aAgreeable * 5);
      dTrustB = Math.round(10 + bConscientious * 5 + bAgreeable * 5);

      dAffectionA = Math.round(6 + aAgreeable * 4);
      dAffectionB = Math.round(6 + bAgreeable * 4);

      dRespectA = Math.round(10 + bConscientious * 6);
      dRespectB = Math.round(10 + aConscientious * 6);

      dDependencyA = Math.round(5 + aStressMod * 5);
      dDependencyB = Math.round(5 + bStressMod * 5);

      dRivalryA = -Math.round(5);
      dRivalryB = -Math.round(5);

      dResentmentA = -Math.round(10);
      dResentmentB = -Math.round(10);
      break;
    }
    case 'positive': {
      // Cheerful, warm encounter
      dTrustA = Math.round(5 + aAgreeable * 4);
      dTrustB = Math.round(5 + bAgreeable * 4);

      dAffectionA = Math.round(6 + aAgreeable * 5);
      dAffectionB = Math.round(6 + bAgreeable * 5);

      dRespectA = Math.round(3 + aAgreeable * 3);
      dRespectB = Math.round(3 + bAgreeable * 3);

      dResentmentA = -Math.round(5);
      dResentmentB = -Math.round(5);
      break;
    }
    case 'neutral':
    default: {
      dTrustA = Math.round(1 + aAgreeable * 2);
      dTrustB = Math.round(1 + bAgreeable * 2);
      dAffectionA = Math.round(1 + aAgreeable * 2);
      dAffectionB = Math.round(1 + bAgreeable * 2);
      dRespectA = 1;
      dRespectB = 1;
      break;
    }
  }

  // Construct updated dimensions for A -> B
  const newDimsA: RelationshipDimensions = {
    familiarity: clamp0to100(currentRelAtoB.familiarity + dFamA),
    trust: clampMinus100to100(currentRelAtoB.trust + dTrustA),
    affection: clampMinus100to100(currentRelAtoB.affection + dAffectionA),
    respect: clampMinus100to100(currentRelAtoB.respect + dRespectA),
    attraction: clamp0to100(currentRelAtoB.attraction + dAttractionA),
    rivalry: clamp0to100(currentRelAtoB.rivalry + dRivalryA),
    resentment: clamp0to100(currentRelAtoB.resentment + dResentmentA),
    jealousy: clamp0to100(currentRelAtoB.jealousy + dJealousyA),
    dependency: clamp0to100(currentRelAtoB.dependency + dDependencyA)
  };

  // Construct updated dimensions for B -> A
  const newDimsB: RelationshipDimensions = {
    familiarity: clamp0to100(currentRelBtoA.familiarity + dFamB),
    trust: clampMinus100to100(currentRelBtoA.trust + dTrustB),
    affection: clampMinus100to100(currentRelBtoA.affection + dAffectionB),
    respect: clampMinus100to100(currentRelBtoA.respect + dRespectB),
    attraction: clamp0to100(currentRelBtoA.attraction + dAttractionB),
    rivalry: clamp0to100(currentRelBtoA.rivalry + dRivalryB),
    resentment: clamp0to100(currentRelBtoA.resentment + dResentmentB),
    jealousy: clamp0to100(currentRelBtoA.jealousy + dJealousyB),
    dependency: clamp0to100(currentRelBtoA.dependency + dDependencyB)
  };

  const newStageA = determineRelationshipStage(newDimsA);
  const newStageB = determineRelationshipStage(newDimsB);

  const stageTransitionAtoB = newStageA !== currentRelAtoB.relationshipStage ? {
    from: currentRelAtoB.relationshipStage,
    to: newStageA
  } : undefined;

  const stageTransitionBtoA = newStageB !== currentRelBtoA.relationshipStage ? {
    from: currentRelBtoA.relationshipStage,
    to: newStageB
  } : undefined;

  // History narratives
  const eventDescA = stageTransitionAtoB 
    ? `在${locationName}探讨“${topic}”，关系阶段演变为【${getStageLabel(newStageA)}】`
    : sentiment === 'conflict'
      ? `在${locationName}发生理念分歧与言语争端（Trust: ${dTrustA > 0 ? '+' : ''}${dTrustA}）`
      : sentiment === 'deep'
        ? `在${locationName}共话“${topic}”，思想产生深刻共鸣`
        : sentiment === 'collaborative'
          ? `在${locationName}协作推进事务，默契与互信显著深化`
          : `在${locationName}与${agentB.name}偶遇交谈并互通心声`;

  const eventDescB = stageTransitionBtoA
    ? `在${locationName}探讨“${topic}”，关系阶段演变为【${getStageLabel(newStageB)}】`
    : sentiment === 'conflict'
      ? `在${locationName}与${agentA.name}各持己见发生碰撞（Trust: ${dTrustB > 0 ? '+' : ''}${dTrustB}）`
      : sentiment === 'deep'
        ? `在${locationName}就“${topic}”深入交流，倍感启发`
        : sentiment === 'collaborative'
          ? `与${agentA.name}齐心协力解决问题，感受到了坚实支持`
          : `在${locationName}同${agentA.name}驻足闲聊`;

  const reasonA = sentiment === 'conflict'
    ? `受对话火药味影响，情绪产生抵触防备`
    : sentiment === 'deep'
      ? `精神层面的深度探讨极大拉近了心理距离`
      : `日常互动的自然积累与情感共振`;

  const reasonB = sentiment === 'conflict'
    ? `意见不合导致彼此芥蒂增加`
    : sentiment === 'deep'
      ? `对方独特的见解令我十分钦佩`
      : `愉快的交谈强化了对对方的认可`;

  const historyEntryA: RelationshipHistoryEntry = {
    id: `hist-${Date.now()}-A-${agentB.id}`,
    simDay,
    simTime,
    event: eventDescA,
    stageTransition: stageTransitionAtoB,
    dimensionChanges: {
      trust: dTrustA,
      affection: dAffectionA,
      respect: dRespectA,
      familiarity: dFamA,
      ...(dResentmentA !== 0 ? { resentment: dResentmentA } : {}),
      ...(dRivalryA !== 0 ? { rivalry: dRivalryA } : {}),
      ...(dAttractionA !== 0 ? { attraction: dAttractionA } : {})
    },
    reason: reasonA,
    importance
  };

  const historyEntryB: RelationshipHistoryEntry = {
    id: `hist-${Date.now()}-B-${agentA.id}`,
    simDay,
    simTime,
    event: eventDescB,
    stageTransition: stageTransitionBtoA,
    dimensionChanges: {
      trust: dTrustB,
      affection: dAffectionB,
      respect: dRespectB,
      familiarity: dFamB,
      ...(dResentmentB !== 0 ? { resentment: dResentmentB } : {}),
      ...(dRivalryB !== 0 ? { rivalry: dRivalryB } : {}),
      ...(dAttractionB !== 0 ? { attraction: dAttractionB } : {})
    },
    reason: reasonB,
    importance
  };

  const updatedRelAtoB: Relationship = {
    ...currentRelAtoB,
    targetAgentId: agentB.id,
    targetAgentName: agentB.name,
    ...newDimsA,
    relationshipStage: newStageA,
    dominantDynamic: getDominantDynamic(newDimsA),
    lastInteractionTime: simTime,
    lastInteractionDay: simDay,
    summaryNote: summary,
    history: [historyEntryA, ...(currentRelAtoB.history || [])].slice(0, 20)
  };

  const updatedRelBtoA: Relationship = {
    ...currentRelBtoA,
    targetAgentId: agentA.id,
    targetAgentName: agentA.name,
    ...newDimsB,
    relationshipStage: newStageB,
    dominantDynamic: getDominantDynamic(newDimsB),
    lastInteractionTime: simTime,
    lastInteractionDay: simDay,
    summaryNote: summary,
    history: [historyEntryB, ...(currentRelBtoA.history || [])].slice(0, 20)
  };

  return {
    updatedRelAtoB,
    updatedRelBtoA,
    stageTransitionAtoB,
    stageTransitionBtoA,
    historyEntryA,
    historyEntryB
  };
}

/**
 * Apply reflection / event relationship adjustments to an agent
 */
export function applyReflectionRelationshipAdjustments(
  agent: Agent,
  adjustments: Record<string, Partial<RelationshipDimensions>>,
  simDay: number,
  simTime: string,
  reflectionNarrative: string
): Agent {
  if (!adjustments || Object.keys(adjustments).length === 0) {
    return agent;
  }

  const updatedRels = { ...(agent.relationships || {}) };
  const updatedAffinity = { ...(agent.affinity || {}) };

  Object.entries(adjustments).forEach(([targetId, dimsDelta]) => {
    const curRel = updatedRels[targetId] || createDefaultRelationship(targetId, targetId, agent.affinity?.[targetId] ?? 0);
    
    const newDims: RelationshipDimensions = {
      familiarity: clamp0to100(curRel.familiarity + (dimsDelta.familiarity || 0)),
      trust: clampMinus100to100(curRel.trust + (dimsDelta.trust || 0)),
      affection: clampMinus100to100(curRel.affection + (dimsDelta.affection || 0)),
      respect: clampMinus100to100(curRel.respect + (dimsDelta.respect || 0)),
      attraction: clamp0to100(curRel.attraction + (dimsDelta.attraction || 0)),
      rivalry: clamp0to100(curRel.rivalry + (dimsDelta.rivalry || 0)),
      resentment: clamp0to100(curRel.resentment + (dimsDelta.resentment || 0)),
      jealousy: clamp0to100(curRel.jealousy + (dimsDelta.jealousy || 0)),
      dependency: clamp0to100(curRel.dependency + (dimsDelta.dependency || 0))
    };

    const newStage = determineRelationshipStage(newDims);
    const stageTransition = newStage !== curRel.relationshipStage ? {
      from: curRel.relationshipStage,
      to: newStage
    } : undefined;

    const histEntry: RelationshipHistoryEntry = {
      id: `hist-refl-${Date.now()}-${targetId}`,
      simDay,
      simTime,
      event: `【深度沉淀反思】：重新审视了与对方的交集`,
      stageTransition,
      dimensionChanges: dimsDelta,
      reason: reflectionNarrative,
      importance: 7
    };

    updatedRels[targetId] = {
      ...curRel,
      ...newDims,
      relationshipStage: newStage,
      dominantDynamic: getDominantDynamic(newDims),
      history: [histEntry, ...(curRel.history || [])].slice(0, 20)
    };

    updatedAffinity[targetId] = calculateAffinityProjection(newDims);
  });

  return {
    ...agent,
    relationships: updatedRels,
    affinity: updatedAffinity
  };
}
