import { 
  Agent, 
  AgentGoal, 
  AgentNeeds, 
  Building, 
  GoalType, 
  UtilityActionScore,
  TownEvent
} from '../types/town';
import { evaluateAgentUtilityActions } from './UtilitySystem';

/**
 * Finds the closest or most suitable building matching category or id
 */
function findBuilding(buildings: Building[], idOrCategory: string): Building | undefined {
  return buildings.find(b => b.id === idOrCategory || b.category === idOrCategory);
}

/**
 * Maps a top-scored UtilityAction to an AgentGoal
 */
export function mapUtilityToGoal(
  topUtility: UtilityActionScore,
  agent: Agent,
  buildings: Building[],
  otherAgents: Agent[],
  simDay: number,
  simTime: string
): AgentGoal {
  const needs = agent.needs;
  const urgency = Math.min(10, Math.max(1, Math.round(topUtility.score / 10)));

  switch (topUtility.action) {
    case 'sleep': {
      const restSpot = findBuilding(buildings, 'clinic') || findBuilding(buildings, 'central_park') || buildings[0];
      return {
        id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'rest',
        title: '寻找静谧场所闭目休憩安歇',
        description: `${agent.name} 感到身体与意识极度疲惫，按 Utility AI 决策前往静处休憩恢复精力。`,
        motivation: `Utility 评分 ${topUtility.score} 分: ${topUtility.reason}`,
        dominantNeed: 'energy',
        urgency,
        targetBuildingId: restSpot?.id,
        createdAt: { simDay, simTime, timestamp: Date.now() },
        status: 'active',
      };
    }

    case 'eat': {
      const targetB = Math.random() < 0.5 
        ? findBuilding(buildings, 'bakery') || findBuilding(buildings, 'cafe') 
        : findBuilding(buildings, 'cafe') || findBuilding(buildings, 'bakery');
      const foodHost = targetB?.id === 'bakery' ? '林小满' : '苏清禾';
      return {
        id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'eat_drink',
        title: `前往${targetB?.name || '面包房'}享用美味食物`,
        description: `${agent.name} 饥肠辘辘，渴望品尝${foodHost}准备的现烤糕点或热饮补充营养。`,
        motivation: `Utility 评分 ${topUtility.score} 分: ${topUtility.reason}`,
        dominantNeed: 'hunger',
        urgency,
        targetBuildingId: targetB?.id,
        targetAgentName: foodHost,
        createdAt: { simDay, simTime, timestamp: Date.now() },
        status: 'active',
      };
    }

    case 'work': {
      const vocational = getVocationalGoal(agent, buildings);
      return {
        id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'work_achievement',
        title: vocational.title,
        description: vocational.description,
        motivation: `Utility 评分 ${topUtility.score} 分: ${topUtility.reason}`,
        dominantNeed: 'achievement',
        urgency,
        targetBuildingId: vocational.targetBuildingId,
        createdAt: { simDay, simTime, timestamp: Date.now() },
        status: 'active',
      };
    }

    case 'socialize': {
      const targetFriend = otherAgents.find(a => a.id === topUtility.targetAgentId) || otherAgents[0];
      return {
        id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'socialize',
        title: `寻找好友 ${targetFriend?.name || '邻里'} 交流近况倾诉心事`,
        description: `${agent.name} 渴望与同伴交流，分享生活所思所感，缓解内心的孤独感。`,
        motivation: `Utility 评分 ${topUtility.score} 分: ${topUtility.reason}`,
        dominantNeed: 'social',
        urgency,
        targetAgentId: targetFriend?.id,
        targetAgentName: targetFriend?.name,
        targetBuildingId: targetFriend?.currentBuildingId || 'central_park',
        createdAt: { simDay, simTime, timestamp: Date.now() },
        status: 'active',
      };
    }

    case 'explore': {
      const researchSpot = findBuilding(buildings, 'observatory') || findBuilding(buildings, 'library');
      return {
        id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'explore_research',
        title: `前往${researchSpot?.name || '观星台'}探查未解之谜与前沿仪器`,
        description: `${agent.name} 对周围世界与星象运转充满好奇，想实测仪器并勘探记录。`,
        motivation: `Utility 评分 ${topUtility.score} 分: ${topUtility.reason}`,
        dominantNeed: 'curiosity',
        urgency,
        targetBuildingId: researchSpot?.id,
        createdAt: { simDay, simTime, timestamp: Date.now() },
        status: 'active',
      };
    }

    case 'study': {
      const library = findBuilding(buildings, 'library') || buildings[0];
      return {
        id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'explore_research',
        title: `前往${library?.name || '档案馆'}沉浸研读珍本古籍`,
        description: `${agent.name} 希望在静谧的书架间查阅学术文献，积累深层认知。`,
        motivation: `Utility 评分 ${topUtility.score} 分: ${topUtility.reason}`,
        dominantNeed: 'curiosity',
        urgency,
        targetBuildingId: library?.id,
        createdAt: { simDay, simTime, timestamp: Date.now() },
        status: 'active',
      };
    }

    case 'relax': {
      const park = findBuilding(buildings, 'central_park') || buildings[0];
      return {
        id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'leisure_fun',
        title: '漫步中央喷泉花园欣赏鲁特琴诗意散心',
        description: `${agent.name} 想暂时放下严肃的事务，在水畔驻足看白鸽戏水，放松心情。`,
        motivation: `Utility 评分 ${topUtility.score} 分: ${topUtility.reason}`,
        dominantNeed: 'fun',
        urgency,
        targetBuildingId: park?.id,
        createdAt: { simDay, simTime, timestamp: Date.now() },
        status: 'active',
      };
    }

    case 'shop': {
      const cafe = findBuilding(buildings, 'cafe') || findBuilding(buildings, 'bakery');
      return {
        id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'eat_drink',
        title: `前往${cafe?.name || '咖啡馆'}挑选特制饮品与甜品`,
        description: `${agent.name} 享受小镇慢调生活，在吧台角落品尝特调饮品小憩。`,
        motivation: `Utility 评分 ${topUtility.score} 分: ${topUtility.reason}`,
        dominantNeed: 'comfort',
        urgency,
        targetBuildingId: cafe?.id,
        createdAt: { simDay, simTime, timestamp: Date.now() },
        status: 'active',
      };
    }

    case 'seekHelp': {
      const clinic = findBuilding(buildings, 'clinic') || buildings[0];
      return {
        id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'seek_comfort_care',
        title: '前往青木诊所调理身心安抚紧绷神经',
        description: `${agent.name} 思绪繁杂压力偏重，希望去诊所取些草药精油或进行安神疗愈。`,
        motivation: `Utility 评分 ${topUtility.score} 分: ${topUtility.reason}`,
        dominantNeed: 'stress',
        urgency,
        targetBuildingId: clinic?.id,
        targetAgentName: '陆医师',
        createdAt: { simDay, simTime, timestamp: Date.now() },
        status: 'active',
      };
    }

    case 'attendEvent': {
      const townHall = findBuilding(buildings, 'town_hall') || findBuilding(buildings, 'central_park');
      return {
        id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'civic_governance',
        title: '前往市政厅参与公共集会与公约登记',
        description: `${agent.name} 积极融入小镇共同体，参与公告阅览与邻里公共生活。`,
        motivation: `Utility 评分 ${topUtility.score} 分: ${topUtility.reason}`,
        dominantNeed: 'belonging',
        urgency,
        targetBuildingId: townHall?.id,
        createdAt: { simDay, simTime, timestamp: Date.now() },
        status: 'active',
      };
    }
  }
}

/**
 * Evaluates the agent's goal using Utility AI decision scoring:
 * Computes scores across all candidate actions and maps the highest scoring action into an active goal.
 */
export function evaluateAgentGoal(
  agent: Agent,
  buildings: Building[],
  otherAgents: Agent[],
  simDay: number,
  simTime: string,
  currentBuilding?: Building,
  weather?: string,
  events: TownEvent[] = []
): { goal: AgentGoal; evaluations: UtilityActionScore[] } {
  // 1. Run Utility AI evaluation
  const { topAction, allScores } = evaluateAgentUtilityActions(
    agent,
    buildings,
    otherAgents,
    currentBuilding,
    weather,
    events
  );

  // 2. Map highest Utility action to active goal
  const goal = mapUtilityToGoal(topAction, agent, buildings, otherAgents, simDay, simTime);

  return {
    goal,
    evaluations: allScores,
  };
}

/**
 * Generates personalized vocational achievement goal tailored to resident's role & lore
 */
function getVocationalGoal(agent: Agent, buildings: Building[]): {
  title: string;
  description: string;
  targetBuildingId: string;
} {
  switch (agent.id) {
    case 'agent-1': // 苏清禾 (Elena)
      return {
        title: '在星光咖啡馆调配专属季节手冲与擦拭吧台',
        description: '准备新鲜研磨的浅烘咖啡豆，调试水温与注水流速，为全镇居民提供精神庇护所。',
        targetBuildingId: 'cafe',
      };

    case 'agent-2': // 陆行川 (Marcus)
      return {
        title: '在档案馆校对十七世纪星历残卷并整理索引',
        description: '仔细翻阅羊皮纸文献，考证小镇建城初期的引力异常记录，推进学术专著编写。',
        targetBuildingId: 'library',
      };

    case 'agent-3': // 林小满 (Lily)
      return {
        title: '在面包工坊烘烤金黄酥脆的蜂蜜核桃软欧包',
        description: '计算面团发酵时间，将新鲜出炉的麦香散播到整个街区，为晨起居民带来元气。',
        targetBuildingId: 'bakery',
      };

    case 'agent-4': // 顾微澜 (Vera)
      return {
        title: '在观星工坊检修巨型发条星仪的三号齿轮',
        description: '用卡尺测量黄铜零件啮合间隙，调试擒纵机构，确保天文异象观测的分毫不差。',
        targetBuildingId: 'observatory',
      };

    case 'agent-5': // 陆大夫 (Julian)
      return {
        title: '在青木诊所萃取百草精华并调配舒缓香薰',
        description: '将采摘的洋甘菊与迷迭香研磨烘干，配制安抚身心的草药茶饮与精油。',
        targetBuildingId: 'clinic',
      };

    case 'agent-6': // 陈默 (Arthur)
      return {
        title: '在市政厅核查公共设施用电负荷与路灯煤油预算',
        description: '一丝不苟地核验各工坊安全通知执照，确保小镇基础设施与公共秩序稳健运行。',
        targetBuildingId: 'town_hall',
      };

    case 'agent-7': // 姜寻 (Jiang Xun)
      return {
        title: '在中央喷泉水畔为飞鸽速写并谱写《四季谣》第三乐章',
        description: '怀抱鲁特琴观察波光倒影，将街角扑鼻的面包香气与微风谱写成抒情诗篇。',
        targetBuildingId: 'central_park',
      };

    default:
      return {
        title: `在${agent.role}岗位上专注执行日常事务`,
        description: `${agent.name} 积极投入到工作之中，为小镇繁荣贡献一份心力。`,
        targetBuildingId: agent.currentBuildingId || buildings[0]?.id,
      };
  }
}
