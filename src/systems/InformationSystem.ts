import { 
  Agent, 
  AgentKnowledge, 
  InformationType, 
  KnowledgeSourceType, 
  PropagationNode, 
  Relationship,
  TownEvent,
  Building
} from '../types/town';
import { clamp0to100 } from './RelationshipSystem';

/**
 * Information Type Display Configuration
 */
export const INFO_TYPE_CONFIG: Record<InformationType, {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  icon: string;
  description: string;
}> = {
  knowledge: {
    label: '客观事实',
    badgeBg: 'bg-emerald-950/60',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-800/60',
    icon: '💡',
    description: '亲历观察或经检验属实的小镇客观资讯'
  },
  secret: {
    label: '隐私机密',
    badgeBg: 'bg-purple-950/60',
    badgeText: 'text-purple-300',
    badgeBorder: 'border-purple-800/60',
    icon: '🔒',
    description: '非公开的私人计划、隐忧或关键秘密，仅在高度信任时托付'
  },
  rumor: {
    label: '流言飞语',
    badgeBg: 'bg-amber-950/60',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-700/60',
    icon: '🗣️',
    description: '经人际传播后发生曲解、夸大或添油加醋的非官方传闻'
  },
  belief: {
    label: '主观观念',
    badgeBg: 'bg-sky-950/60',
    badgeText: 'text-sky-300',
    badgeBorder: 'border-sky-800/60',
    icon: '🧭',
    description: '居民基于性格、哲学或审美形成的主观信念与坚定执念'
  }
};

export const SOURCE_TYPE_LABELS: Record<KnowledgeSourceType, { label: string; icon: string }> = {
  direct_observation: { label: '亲眼所见', icon: '👁️' },
  told_by_other: { label: '道听途说', icon: '👂' },
  town_event: { label: '事件亲历', icon: '⚡' },
  work_experience: { label: '工作领会', icon: '🔨' }
};

/**
 * Curated Initial Town Knowledge & Secrets
 */
export const INITIAL_TOWN_KNOWLEDGE: AgentKnowledge[] = [
  {
    id: 'info-101',
    subject: '观星台仪器异常卡顿',
    content: '观星台顶层的精密发条天体仪出现周期性异常卡顿与微弱振颤，疑似齿轮齿隙受热膨胀。',
    infoType: 'knowledge',
    sourceAgentId: 'agent-5',
    sourceType: 'work_experience',
    confidence: 96,
    accuracy: 94,
    importance: 82,
    isSecret: false,
    createdAt: { simDay: 1, simTime: '08:30', timestamp: Date.now() - 3600000 },
    spreadCount: 1,
    originalSourceAgentId: 'agent-5',
    originalSourceAgentName: '顾微澜',
    originalContent: '观星台顶层的精密发条天体仪出现周期性异常卡顿与微弱振颤，疑似齿轮齿隙受热膨胀。',
    propagationChain: [
      {
        agentId: 'agent-5',
        agentName: '顾微澜',
        simDay: 1,
        simTime: '08:30',
        content: '观星台顶层的精密发条天体仪出现周期性异常卡顿与微弱振颤，疑似齿轮齿隙受热膨胀。',
        believed: true,
        confidence: 96,
        reason: '作为工坊与机械技师亲自检测所得第一手数据'
      }
    ],
    believedByAgentIds: ['agent-5'],
    disbelievedByAgentIds: []
  },
  {
    id: 'info-102',
    subject: '市政金库与用电赤字隐忧',
    content: '小镇本季度的公共照明与安全整修预算已超支15%，需要整顿工坊大功率机械实验能耗。',
    infoType: 'secret',
    sourceAgentId: 'agent-4',
    sourceType: 'work_experience',
    confidence: 98,
    accuracy: 98,
    importance: 88,
    isSecret: true,
    createdAt: { simDay: 1, simTime: '08:00', timestamp: Date.now() - 4200000 },
    spreadCount: 0,
    originalSourceAgentId: 'agent-4',
    originalSourceAgentName: '陈默',
    originalContent: '小镇本季度的公共照明与安全整修预算已超支15%，需要整顿工坊大功率机械实验能耗。',
    propagationChain: [
      {
        agentId: 'agent-4',
        agentName: '陈默',
        simDay: 1,
        simTime: '08:00',
        content: '小镇本季度的公共照明与安全整修预算已超支15%，需要整顿工坊大功率机械实验能耗。',
        believed: true,
        confidence: 98,
        reason: '亲自审核市政议事堂财务账目所得'
      }
    ],
    believedByAgentIds: ['agent-4'],
    disbelievedByAgentIds: [],
    secretSharedWith: []
  },
  {
    id: 'info-103',
    subject: '暖阳蜜糖秘密酵母菌种',
    content: '利用咖啡馆废弃的香草豆荚残渣培育出了独家活性发酵种，能让烘焙面包具有奇妙奶香。',
    infoType: 'secret',
    sourceAgentId: 'agent-3',
    sourceType: 'work_experience',
    confidence: 100,
    accuracy: 100,
    importance: 65,
    isSecret: true,
    createdAt: { simDay: 1, simTime: '07:15', timestamp: Date.now() - 5000000 },
    spreadCount: 1,
    originalSourceAgentId: 'agent-3',
    originalSourceAgentName: '林小满',
    originalContent: '利用咖啡馆废弃的香草豆荚残渣培育出了独家活性发酵种，能让烘焙面包具有奇妙奶香。',
    propagationChain: [
      {
        agentId: 'agent-3',
        agentName: '林小满',
        simDay: 1,
        simTime: '07:15',
        content: '利用咖啡馆废弃的香草豆荚残渣培育出了独家活性发酵种，能让烘焙面包具有奇妙奶香。',
        believed: true,
        confidence: 100,
        reason: '面包坊历经数月手作实践的独创成果'
      },
      {
        agentId: 'agent-1',
        agentName: '苏清禾',
        simDay: 1,
        simTime: '07:45',
        receivedFromAgentId: 'agent-3',
        receivedFromAgentName: '林小满',
        content: '林小满用咖啡馆赠予的香草豆荚培育成了神奇烘焙酵种。',
        believed: true,
        confidence: 95,
        reason: '与小满是晨光暖意知己，亲自尝到了面包的微妙变化'
      }
    ],
    believedByAgentIds: ['agent-3', 'agent-1'],
    disbelievedByAgentIds: [],
    secretSharedWith: ['agent-1']
  },
  {
    id: 'info-104',
    subject: '古代穹顶先民的星图秘藏',
    content: '古籍残卷中记录着小镇建镇前星轨与地磁交汇的秘密坐标，可能埋藏着上古天文学者的手稿。',
    infoType: 'belief',
    sourceAgentId: 'agent-2',
    sourceType: 'work_experience',
    confidence: 92,
    accuracy: 78,
    importance: 85,
    isSecret: false,
    createdAt: { simDay: 1, simTime: '09:00', timestamp: Date.now() - 2500000 },
    spreadCount: 1,
    originalSourceAgentId: 'agent-2',
    originalSourceAgentName: '陆行川',
    originalContent: '古籍残卷中记录着小镇建镇前星轨与地磁交汇的秘密坐标，可能埋藏着上古天文学者的手稿。',
    propagationChain: [
      {
        agentId: 'agent-2',
        agentName: '陆行川',
        simDay: 1,
        simTime: '09:00',
        content: '古籍残卷中记录着小镇建镇前星轨与地磁交汇的秘密坐标，可能埋藏着上古天文学者的手稿。',
        believed: true,
        confidence: 92,
        reason: '对典籍档案馆数千卷羊皮纸古本的严谨文献考证'
      }
    ],
    believedByAgentIds: ['agent-2'],
    disbelievedByAgentIds: []
  },
  {
    id: 'info-105',
    subject: '喷泉白鸽是昔日诗人的通灵化身',
    content: '中央喷泉栖息的三只白鸽懂得琴弦律动，相传是百年前漂泊至此的游吟诗人们的灵魂化身。',
    infoType: 'rumor',
    sourceAgentId: 'agent-7',
    sourceType: 'told_by_other',
    confidence: 85,
    accuracy: 32,
    importance: 58,
    isSecret: false,
    createdAt: { simDay: 1, simTime: '09:15', timestamp: Date.now() - 1900000 },
    spreadCount: 2,
    originalSourceAgentId: 'agent-7',
    originalSourceAgentName: '姜寻',
    originalContent: '中央喷泉栖息的三只白鸽懂得琴弦律动，相传是百年前漂泊至此的游吟诗人们的灵魂化身。',
    propagationChain: [
      {
        agentId: 'agent-7',
        agentName: '姜寻',
        simDay: 1,
        simTime: '09:15',
        content: '中央喷泉栖息的三只白鸽懂得琴弦律动，相传是百年前漂泊至此的游吟诗人们的灵魂化身。',
        believed: true,
        confidence: 85,
        reason: '在喷泉弹琴时白鸽会随着和弦起舞，直觉告诉我是艺术共鸣'
      }
    ],
    believedByAgentIds: ['agent-7'],
    disbelievedByAgentIds: ['agent-2']
  }
];

/**
 * Check if sender is willing to share a specific knowledge item with receiver
 */
export function evaluateSharingDecision(
  sender: Agent,
  receiver: Agent,
  knowledge: AgentKnowledge,
  relAtoB?: Relationship
): {
  shouldShare: boolean;
  reason: string;
  isSecretLeaked?: boolean;
} {
  const trust = relAtoB?.trust ?? sender.affinity?.[receiver.id] ?? 0;
  const stage = relAtoB?.relationshipStage || 'acquaintance';
  const resentment = relAtoB?.resentment ?? 0;

  // Personality traits
  const extraversion = (sender.bigFive?.extraversion ?? 50) / 100;
  const conscientiousness = (sender.bigFive?.conscientiousness ?? 60) / 100;
  const neuroticism = (sender.bigFive?.neuroticism ?? 30) / 100;
  const senderStress = (sender.psychologicalNeeds?.stress ?? sender.state.stress ?? 20) / 100;

  // 1. Resentment / Enemy Check: If deeply hostile, will not share helpful knowledge or secrets
  if (stage === 'enemy' || resentment > 50) {
    // Only share malicious distorted rumors if any
    if (knowledge.infoType === 'rumor') {
      return { shouldShare: true, reason: '出于对对方的宿怨，故意宣扬流言以激化矛盾' };
    }
    return { shouldShare: false, reason: '因关系敌对而心怀戒备，拒绝分享有价值的信息' };
  }

  // 2. Secret Sharing Check
  if (knowledge.isSecret) {
    // Trusted intimate circle can share
    if (stage === 'close_friend' || stage === 'partner' || trust >= 50) {
      return { shouldShare: true, reason: '彼此信任深厚，愿意托付隐私机密', isSecretLeaked: false };
    }

    // Gossip leak condition: High neuroticism + High stress + Low conscientiousness
    if (neuroticism > 0.65 && senderStress > 0.55 && conscientiousness < 0.45 && extraversion > 0.5) {
      return { 
        shouldShare: true, 
        reason: '因近期压力过大且口风不严，一时嘴快泄露了机密秘密！', 
        isSecretLeaked: true 
      };
    }

    return { shouldShare: false, reason: '受秘密约束与职责考量，暂不向普通朋友透露' };
  }

  // 3. Regular Knowledge, Rumor, or Belief sharing probability
  // Driven by extraversion, positive relationship and importance
  let shareProbability = 0.5 + extraversion * 0.35 + (trust > 0 ? 0.2 : -0.2);

  // If Rumor and high extraversion, sharing eagerness is higher
  if (knowledge.infoType === 'rumor') {
    shareProbability += 0.2;
  }

  // If Belief, willingness to share depends on openness
  if (knowledge.infoType === 'belief') {
    const openness = (sender.bigFive?.openness ?? 50) / 100;
    shareProbability += openness * 0.25;
  }

  const shouldShare = Math.random() < Math.max(0.2, Math.min(0.95, shareProbability));

  return {
    shouldShare,
    reason: shouldShare 
      ? '偶遇交谈投机，顺势交流了近来所知' 
      : '话题未引向该领域，暂未主动提及'
  };
}

/**
 * Mutation Engine: Generates information distortion or rumor evolution
 */
export function mutateInformationContent(
  sender: Agent,
  receiver: Agent,
  originalKnowledge: AgentKnowledge,
  relAtoB?: Relationship
): {
  newContent: string;
  newAccuracy: number;
  newInfoType: InformationType;
  mutationNote?: string;
} {
  const neuroticism = (sender.bigFive?.neuroticism ?? 30) / 100;
  const extraversion = (sender.bigFive?.extraversion ?? 50) / 100;
  const conscientiousness = (sender.bigFive?.conscientiousness ?? 60) / 100;
  const rivalry = relAtoB?.rivalry ?? 0;
  const hops = originalKnowledge.propagationChain.length;

  let newAccuracy = Math.max(10, Math.min(100, originalKnowledge.accuracy - (hops * 8 + Math.round((1 - conscientiousness) * 12))));
  let newInfoType = originalKnowledge.infoType;
  let newContent = originalKnowledge.content;
  let mutationNote: string | undefined;

  // Specific canonical mutation patterns for iconic topics
  if (originalKnowledge.subject.includes('观星台') && originalKnowledge.subject.includes('异常')) {
    if (hops === 1) {
      newContent = '听说观星台发条齿轮发热剧烈，隐约传出不寻常的金属撞击轰鸣。';
      newAccuracy = 75;
      newInfoType = 'rumor';
      mutationNote = '将轻微卡顿夸张化为金属轰鸣传闻';
    } else if (hops >= 2) {
      newContent = '惊天秘闻！观星台高压发条轴承严重过载失控，随时可能在小镇上空发生剧烈爆炸！';
      newAccuracy = 20;
      newInfoType = 'rumor';
      mutationNote = '谣言升级：添油加醋渲染为即将发生致命爆炸危机';
    }
  } else if (originalKnowledge.subject.includes('用电赤字') || originalKnowledge.subject.includes('金库')) {
    if (hops >= 1) {
      newContent = '市政厅金库据说严重亏空，陈默市长准备全面关闭工坊和商铺的晚间照明配额！';
      newAccuracy = 45;
      newInfoType = 'rumor';
      mutationNote = '将正常的预算赤字整顿误传为强制断电制裁';
    }
  } else if (originalKnowledge.subject.includes('秘密酵母')) {
    if (hops >= 1) {
      newContent = '暖阳工坊的面包之所以香气扑鼻，传闻是加入了一种从星光咖啡馆偷采的致幻香料。';
      newAccuracy = 35;
      newInfoType = 'rumor';
      mutationNote = '将普通的香草残渣再利用曲解为致幻秘方';
    }
  } else {
    // Generic dynamic mutation based on neuroticism / rivalry
    if (neuroticism > 0.6 && Math.random() < 0.45) {
      newContent = `${originalKnowledge.content} 据说情况比表面还要严重得多！`;
      newAccuracy = Math.max(15, newAccuracy - 20);
      newInfoType = 'rumor';
      mutationNote = '情绪焦虑倾向导致的危言耸听夸大';
    } else if (rivalry > 50 && Math.random() < 0.4) {
      newContent = `${originalKnowledge.content} 显而易见有人在其中严重失职。`;
      newAccuracy = Math.max(25, newAccuracy - 15);
      newInfoType = 'rumor';
      mutationNote = '竞争与敌意驱使的归咎扭曲';
    }
  }

  return {
    newContent,
    newAccuracy,
    newInfoType,
    mutationNote
  };
}

/**
 * Receiver Evaluation: Decides whether receiver believes the information
 */
export function evaluateBeliefDecision(
  receiver: Agent,
  sender: Agent,
  content: string,
  infoType: InformationType,
  accuracy: number,
  relBtoA?: Relationship
): {
  believed: boolean;
  confidence: number;
  reason: string;
} {
  const trust = relBtoA?.trust ?? receiver.affinity?.[sender.id] ?? 0;
  const respect = relBtoA?.respect ?? 0;
  const neuroticism = (receiver.bigFive?.neuroticism ?? 30) / 100;
  const openness = (receiver.bigFive?.openness ?? 50) / 100;
  const conscientiousness = (receiver.bigFive?.conscientiousness ?? 60) / 100;

  // 1. High Trust directly fosters high belief
  if (trust >= 40) {
    const conf = clamp0to100(Math.round(65 + trust * 0.3 + respect * 0.15));
    return {
      believed: true,
      confidence: conf,
      reason: `深信不疑：由高度信任的${sender.name}亲口所告`
    };
  }

  // 2. Severe Negative Trust directly prompts suspicion/disbelief
  if (trust <= -25) {
    const conf = clamp0to100(Math.round(15 + Math.abs(trust) * 0.2));
    return {
      believed: false,
      confidence: conf,
      reason: `心存疑窦：对${sender.name}的为人与动机持高度保留态度`
    };
  }

  // 3. For rumors: Conscientious agents doubt, Neurotic agents fall for panic
  if (infoType === 'rumor') {
    if (conscientiousness > 0.7 && accuracy < 50) {
      return {
        believed: false,
        confidence: 25,
        reason: '审慎求真：缺乏第一手事实支撑，判断大概率为市井附会之词'
      };
    }
    if (neuroticism > 0.6) {
      return {
        believed: true,
        confidence: 75,
        reason: '惶惶不安：对潜在的危机与剧变传闻产生本能焦虑'
      };
    }
  }

  // 4. Moderate Baseline acceptance
  const baseConf = clamp0to100(Math.round(45 + trust * 0.35 + openness * 20));
  const isBelieved = baseConf >= 45;

  return {
    believed: isBelieved,
    confidence: baseConf,
    reason: isBelieved 
      ? `半信半疑：虽无铁证，但${sender.name}所言听来逻辑尚可自圆其说` 
      : '将信将疑：暂且听过，待亲自查验后再作定论'
  };
}

/**
 * Bilateral Dialogue Knowledge Exchange Engine
 * Allows two residents to naturally share, mutate, believe or discard knowledge
 */
export interface KnowledgeExchangeResult {
  updatedKnowledgeBase: AgentKnowledge[];
  exchangedEventsNarratives: string[];
}

export function processDialogueKnowledgeExchange(
  agentA: Agent,
  agentB: Agent,
  globalKnowledge: AgentKnowledge[],
  relAtoB: Relationship,
  relBtoA: Relationship,
  simDay: number,
  simTime: string,
  locationName: string
): KnowledgeExchangeResult {
  const updatedBase = [...globalKnowledge];
  const narratives: string[] = [];

  // Find candidate knowledge owned by A that B doesn't know
  const aKnown = updatedBase.filter(k => 
    k.propagationChain.some(node => node.agentId === agentA.id)
  );

  // Find candidate knowledge owned by B that A doesn't know
  const bKnown = updatedBase.filter(k => 
    k.propagationChain.some(node => node.agentId === agentB.id)
  );

  // Helper to execute transmission from Sender to Receiver
  const tryTransmit = (sender: Agent, receiver: Agent, item: AgentKnowledge, relSndRec: Relationship, relRecSnd: Relationship) => {
    // Check if receiver already knows this item
    const alreadyKnows = item.propagationChain.some(n => n.agentId === receiver.id);
    if (alreadyKnows) return;

    // Check sharing willingness
    const shareDecision = evaluateSharingDecision(sender, receiver, item, relSndRec);
    if (!shareDecision.shouldShare) return;

    // Mutate content
    const mutation = mutateInformationContent(sender, receiver, item, relSndRec);

    // Receiver evaluates belief
    const belief = evaluateBeliefDecision(receiver, sender, mutation.newContent, mutation.newInfoType, mutation.newAccuracy, relRecSnd);

    // Construct new propagation node
    const newNode: PropagationNode = {
      agentId: receiver.id,
      agentName: receiver.name,
      simDay,
      simTime,
      receivedFromAgentId: sender.id,
      receivedFromAgentName: sender.name,
      content: mutation.newContent,
      mutationNote: mutation.mutationNote,
      believed: belief.believed,
      confidence: belief.confidence,
      reason: belief.reason
    };

    // Update the item in the knowledge base
    const itemIndex = updatedBase.findIndex(k => k.id === item.id);
    if (itemIndex >= 0) {
      const existing = updatedBase[itemIndex];
      const newPropagationChain = [...existing.propagationChain, newNode];
      const newBelieved = belief.believed 
        ? Array.from(new Set([...existing.believedByAgentIds, receiver.id]))
        : existing.believedByAgentIds;
      const newDisbelieved = !belief.believed
        ? Array.from(new Set([...existing.disbelievedByAgentIds, receiver.id]))
        : existing.disbelievedByAgentIds;

      const updatedItem: AgentKnowledge = {
        ...existing,
        content: mutation.newContent,
        infoType: mutation.newInfoType,
        accuracy: mutation.newAccuracy,
        spreadCount: existing.spreadCount + 1,
        propagationChain: newPropagationChain,
        believedByAgentIds: newBelieved,
        disbelievedByAgentIds: newDisbelieved,
        secretSharedWith: existing.isSecret 
          ? Array.from(new Set([...(existing.secretSharedWith || []), receiver.id]))
          : existing.secretSharedWith
      };

      updatedBase[itemIndex] = updatedItem;

      const logMsg = mutation.mutationNote 
        ? `【流言演化】：${sender.name} 向 ${receiver.name} 转述了“${item.subject}”，内容失真：“${mutation.mutationNote}”`
        : shareDecision.isSecretLeaked
          ? `【秘密泄露】：${sender.name} 一时不慎，向 ${receiver.name} 透露了关于“${item.subject}”的隐私机密！`
          : `【信息传播】：${sender.name} 在${locationName}向 ${receiver.name} 分享了关于“${item.subject}”的${INFO_TYPE_CONFIG[mutation.newInfoType].label}。`;

      narratives.push(logMsg);
    }
  };

  // Try 1 transmission from A -> B
  if (aKnown.length > 0) {
    const candidateA = aKnown[Math.floor(Math.random() * aKnown.length)];
    tryTransmit(agentA, agentB, candidateA, relAtoB, relBtoA);
  }

  // Try 1 transmission from B -> A
  if (bKnown.length > 0) {
    const candidateB = bKnown[Math.floor(Math.random() * bKnown.length)];
    tryTransmit(agentB, agentA, candidateB, relBtoA, relAtoB);
  }

  return {
    updatedKnowledgeBase: updatedBase,
    exchangedEventsNarratives: narratives
  };
}

/**
 * Event-Driven Eyewitness Knowledge Discovery
 * Only residents who were actually present at the event's location gain direct observation!
 */
export function registerEventEyewitnessKnowledge(
  event: TownEvent,
  allAgents: Agent[],
  currentKnowledgeBase: AgentKnowledge[],
  simDay: number,
  simTime: string,
  targetBuilding?: Building
): {
  updatedKnowledgeBase: AgentKnowledge[];
  eyewitnessAgentIds: string[];
} {
  // Find residents located at or near the target building
  const eyewitnesses = allAgents.filter(a => {
    if (event.targetBuilding && event.targetBuilding !== 'all') {
      return a.currentBuildingId === event.targetBuilding;
    }
    return true; // global environmental event
  });

  const eyewitnessIds = eyewitnesses.map(a => a.id);

  if (eyewitnesses.length === 0) {
    return {
      updatedKnowledgeBase: currentKnowledgeBase,
      eyewitnessAgentIds: []
    };
  }

  const primaryWitness = eyewitnesses[0];
  const newKnowledgeItem: AgentKnowledge = {
    id: `info-event-${event.id}`,
    subject: event.title,
    content: `${event.description} 现场目击：${event.impactSummary}`,
    infoType: event.type === 'emergency' ? 'knowledge' : event.type === 'festival' ? 'knowledge' : 'knowledge',
    sourceAgentId: primaryWitness.id,
    sourceType: 'direct_observation',
    confidence: 100,
    accuracy: 95,
    importance: 85,
    isSecret: false,
    createdAt: {
      simDay,
      simTime,
      timestamp: Date.now()
    },
    spreadCount: 0,
    originalSourceAgentId: primaryWitness.id,
    originalSourceAgentName: primaryWitness.name,
    originalContent: `${event.description} 现场目击：${event.impactSummary}`,
    propagationChain: eyewitnesses.map(w => ({
      agentId: w.id,
      agentName: w.name,
      simDay,
      simTime,
      content: `${event.description} 现场目击：${event.impactSummary}`,
      believed: true,
      confidence: 98,
      reason: `亲临${targetBuilding?.name || '小镇现场'}目击事件发生经过`
    })),
    believedByAgentIds: eyewitnessIds,
    disbelievedByAgentIds: []
  };

  return {
    updatedKnowledgeBase: [newKnowledgeItem, ...currentKnowledgeBase],
    eyewitnessAgentIds: eyewitnessIds
  };
}

/**
 * Filter what a specific agent knows from the global knowledge base
 */
export function getAgentPersonalKnowledge(
  agentId: string,
  globalKnowledge: AgentKnowledge[]
): AgentKnowledge[] {
  return globalKnowledge.filter(k => 
    k.propagationChain.some(node => node.agentId === agentId)
  );
}
