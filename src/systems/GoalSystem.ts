import { Agent, AgentGoal, AgentNeeds, Building, GoalType } from '../types/town';

interface GoalCandidate {
  type: GoalType;
  title: string;
  description: string;
  motivation: string;
  dominantNeed: keyof AgentNeeds;
  urgency: number; // 1-10
  targetBuildingId?: string;
  targetAgentId?: string;
  targetAgentName?: string;
}

/**
 * Finds the closest or most suitable building matching category or id
 */
function findBuilding(buildings: Building[], idOrCategory: string): Building | undefined {
  return buildings.find(b => b.id === idOrCategory || b.category === idOrCategory);
}

/**
 * Evaluates the agent's 10 needs and personality profile,
 * selecting the most urgent and contextually appropriate goal.
 */
export function evaluateAgentGoal(
  agent: Agent,
  buildings: Building[],
  otherAgents: Agent[],
  simDay: number,
  simTime: string
): AgentGoal {
  const needs = agent.needs;
  const candidates: GoalCandidate[] = [];

  // 1. Extreme Fatigue: Energy < 28
  if (needs.energy < 28) {
    const homeOrRest = findBuilding(buildings, 'clinic') || findBuilding(buildings, 'central_park') || buildings[0];
    candidates.push({
      type: 'rest',
      title: '寻找静谧场所闭目休憩',
      description: `${agent.name} 感到身体与意识极度疲惫，需要找个安静的地方坐下安神休息。`,
      motivation: `精力见底 (Energy: ${needs.energy}%)，体能濒临透支`,
      dominantNeed: 'energy',
      urgency: Math.min(10, Math.round((30 - needs.energy) / 3 + 7)),
      targetBuildingId: homeOrRest?.id,
    });
  }

  // 2. High Hunger: Hunger > 60
  if (needs.hunger > 60) {
    // Alternate between bakery and cafe
    const targetB = Math.random() < 0.5 
      ? findBuilding(buildings, 'bakery') || findBuilding(buildings, 'cafe') 
      : findBuilding(buildings, 'cafe') || findBuilding(buildings, 'bakery');

    const foodHost = targetB?.id === 'bakery' ? '林小满' : '苏清禾';
    candidates.push({
      type: 'eat_drink',
      title: `前往${targetB?.name || '面包房'}享用热食与饮品`,
      description: `${agent.name} 饥肠辘辘，渴望品尝${foodHost}准备的现烤糕点或热饮来补充能量。`,
      motivation: `饥饿感急剧上升 (Hunger: ${needs.hunger}%)，急需补充营养`,
      dominantNeed: 'hunger',
      urgency: Math.min(10, Math.round((needs.hunger - 55) / 5 + 6)),
      targetBuildingId: targetB?.id,
      targetAgentName: foodHost,
    });
  }

  // 3. High Mental Stress: Stress > 60
  if (needs.stress > 60) {
    const clinic = findBuilding(buildings, 'clinic') || findBuilding(buildings, 'central_park');
    candidates.push({
      type: 'seek_comfort_care',
      title: '前往诊所调理身心安抚紧绷神经',
      description: `${agent.name} 近来思绪繁杂压力颇重，希望能去陆大夫处取些草药精油或在水畔深呼吸。`,
      motivation: `压力负荷过重 (Stress: ${needs.stress}%)，急需释怀减压`,
      dominantNeed: 'stress',
      urgency: Math.min(10, Math.round((needs.stress - 55) / 5 + 6)),
      targetBuildingId: clinic?.id,
      targetAgentName: '陆医师',
    });
  }

  // 4. High Social Craving: Social > 55
  if (needs.social > 55) {
    // Pick highest affinity friend
    const friends = [...otherAgents].sort((a, b) => {
      const affA = agent.affinity?.[a.id] || 0;
      const affB = agent.affinity?.[b.id] || 0;
      return affB - affA;
    });
    const targetFriend = friends[0] || otherAgents[0];

    candidates.push({
      type: 'socialize',
      title: `寻找 ${targetFriend.name} 交流近况倾诉心事`,
      description: `${agent.name} 渴望与同伴交流，分享生活所思所感，缓解内心的孤独感。`,
      motivation: `社交渴望度强烈 (Social: ${needs.social}%)，需要情感连结`,
      dominantNeed: 'social',
      urgency: Math.min(9, Math.round((needs.social - 50) / 6 + 5)),
      targetAgentId: targetFriend.id,
      targetAgentName: targetFriend.name,
      targetBuildingId: targetFriend.currentBuildingId || 'central_park',
    });
  }

  // 5. High Curiosity & Exploration: Curiosity > 55
  if (needs.curiosity > 55) {
    const researchSpot = Math.random() < 0.5 
      ? findBuilding(buildings, 'library') || findBuilding(buildings, 'observatory')
      : findBuilding(buildings, 'observatory') || findBuilding(buildings, 'library');

    candidates.push({
      type: 'explore_research',
      title: `前往${researchSpot?.name || '档案馆'}探索未解之谜与前沿知识`,
      description: `${agent.name} 对周围世界与星象运转充满好奇，想查阅最新卷宗或实测仪器。`,
      motivation: `求知欲与探索心旺盛 (Curiosity: ${needs.curiosity}%)`,
      dominantNeed: 'curiosity',
      urgency: Math.min(8, Math.round((needs.curiosity - 50) / 8 + 5)),
      targetBuildingId: researchSpot?.id,
    });
  }

  // 6. High Achievement & Vocational Calling: Achievement > 50
  if (needs.achievement > 50) {
    const vocationalGoal = getVocationalGoal(agent, buildings);
    candidates.push(vocationalGoal);
  }

  // 7. High Need for Fun / Recreation: Fun > 55
  if (needs.fun > 55) {
    const park = findBuilding(buildings, 'central_park') || buildings[0];
    candidates.push({
      type: 'leisure_fun',
      title: '漫步喷泉花园欣赏鲁特琴诗意散心',
      description: `${agent.name} 想暂时放下严肃的事务，在中央广场驻足看白鸽戏水，放松心情。`,
      motivation: `娱乐休闲欲望高 (Fun: ${needs.fun}%)，追求生活趣味`,
      dominantNeed: 'fun',
      urgency: Math.min(8, Math.round((needs.fun - 50) / 7 + 4)),
      targetBuildingId: park?.id,
    });
  }

  // 8. Low Belonging: Belonging < 45
  if (needs.belonging < 45) {
    const townHall = findBuilding(buildings, 'town_hall') || findBuilding(buildings, 'central_park');
    candidates.push({
      type: 'civic_governance',
      title: '前往市政厅参与公共议事或公约登记',
      description: `${agent.name} 希望更深入地参与到小镇共同体的建设中，增强与邻里的归属感。`,
      motivation: `社区归属感偏低 (Belonging: ${needs.belonging}%)，渴望融入集体`,
      dominantNeed: 'belonging',
      urgency: 6,
      targetBuildingId: townHall?.id,
    });
  }

  // If no critical thresholds triggered, fallback to vocational achievement or gentle socialization
  if (candidates.length === 0) {
    candidates.push(getVocationalGoal(agent, buildings));
  }

  // Pick candidate with highest urgency
  candidates.sort((a, b) => b.urgency - a.urgency);
  const picked = candidates[0];

  return {
    id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: picked.type,
    title: picked.title,
    description: picked.description,
    motivation: picked.motivation,
    dominantNeed: picked.dominantNeed,
    urgency: picked.urgency,
    targetBuildingId: picked.targetBuildingId,
    targetAgentId: picked.targetAgentId,
    targetAgentName: picked.targetAgentName,
    createdAt: {
      simDay,
      simTime,
      timestamp: Date.now(),
    },
    status: 'active',
  };
}

/**
 * Generates personalized vocational achievement goal tailored to resident's role & lore
 */
function getVocationalGoal(agent: Agent, buildings: Building[]): GoalCandidate {
  const needs = agent.needs;
  const urgency = Math.min(9, Math.max(5, Math.round((needs.achievement - 45) / 7 + 5)));

  switch (agent.id) {
    case 'agent-1': // 苏清禾 (Elena)
      return {
        type: 'work_achievement',
        title: '在星光咖啡馆调配专属季节手冲与擦拭吧台',
        description: '准备新鲜研磨的浅烘咖啡豆，调试水温与注水流速，为全镇居民提供精神庇护所。',
        motivation: `主理人职责心切 (Achievement: ${needs.achievement}%)，追求极致咖啡风味`,
        dominantNeed: 'achievement',
        urgency,
        targetBuildingId: 'cafe',
      };

    case 'agent-2': // 陆行川 (Marcus)
      return {
        type: 'work_achievement',
        title: '在档案馆校对十七世纪星历残卷并整理索引',
        description: '仔细翻阅羊皮纸文献，考证小镇建城初期的引力异常记录，推进学术专著编写。',
        motivation: `治学态度严谨专注 (Achievement: ${needs.achievement}%)`,
        dominantNeed: 'achievement',
        urgency,
        targetBuildingId: 'library',
      };

    case 'agent-3': // 林小满 (Lily)
      return {
        type: 'work_achievement',
        title: '在面包工坊烘烤金黄酥脆的蜂蜜核桃软欧包',
        description: '计算面团发酵时间，将新鲜出炉的麦香散播到整个街区，为晨起居民带来元气。',
        motivation: `热爱烘焙与分享美味 (Achievement: ${needs.achievement}%)`,
        dominantNeed: 'achievement',
        urgency,
        targetBuildingId: 'bakery',
      };

    case 'agent-4': // 顾微澜 (Vera)
      return {
        type: 'work_achievement',
        title: '在观星工坊检修巨型发条星仪的三号齿轮',
        description: '用卡尺测量黄铜零件啮合间隙，调试擒纵机构，确保天文异象观测的分毫不差。',
        motivation: `发明创造灵感爆发 (Achievement: ${needs.achievement}%)`,
        dominantNeed: 'achievement',
        urgency,
        targetBuildingId: 'observatory',
      };

    case 'agent-5': // 陆大夫 (Julian)
      return {
        type: 'work_achievement',
        title: '在青木诊所萃取百草精华并调配舒缓香薰',
        description: '将采摘的洋甘菊与迷迭香研磨烘干，配制安抚身心的草药茶饮与精油。',
        motivation: `仁心医术精益求精 (Achievement: ${needs.achievement}%)`,
        dominantNeed: 'achievement',
        urgency,
        targetBuildingId: 'clinic',
      };

    case 'agent-6': // 陈默 (Arthur)
      return {
        type: 'work_achievement',
        title: '在市政厅核查公共设施用电负荷与路灯煤油预算',
        description: '一丝不苟地核验各工坊安全通知执照，确保小镇基础设施与公共秩序稳健运行。',
        motivation: `恪尽职守维护公约秩序 (Achievement: ${needs.achievement}%)`,
        dominantNeed: 'achievement',
        urgency,
        targetBuildingId: 'town_hall',
      };

    case 'agent-7': // 姜寻 (Jiang Xun)
      return {
        type: 'work_achievement',
        title: '在中央喷泉水畔为飞鸽速写并谱写《四季谣》第三乐章',
        description: '怀抱鲁特琴观察波光倒影，将街角扑鼻的面包香气与微风谱写成抒情诗篇。',
        motivation: `诗意喷涌追求艺术表达 (Achievement: ${needs.achievement}%)`,
        dominantNeed: 'achievement',
        urgency,
        targetBuildingId: 'central_park',
      };

    default:
      return {
        type: 'work_achievement',
        title: `在${agent.role}岗位上专注执行日常事务`,
        description: `${agent.name} 积极投入到工作之中，为小镇繁荣贡献一份心力。`,
        motivation: `敬业进取 (Achievement: ${needs.achievement}%)`,
        dominantNeed: 'achievement',
        urgency,
        targetBuildingId: agent.currentBuildingId || buildings[0]?.id,
      };
  }
}
