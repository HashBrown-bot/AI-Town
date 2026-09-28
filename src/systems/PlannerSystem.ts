import { Agent, AgentGoal, AgentPlan, AgentAction, Building } from '../types/town';

/**
 * Decomposes an AgentGoal into an ordered, executable multi-step AgentPlan
 */
export function planGoalActions(
  goal: AgentGoal,
  agent: Agent,
  buildings: Building[],
  otherAgents: Agent[],
  simDay: number,
  simTime: string
): AgentPlan {
  const steps: AgentAction[] = [];
  const targetBuilding = buildings.find(b => b.id === goal.targetBuildingId) || buildings[0];
  const targetAgent = otherAgents.find(a => a.id === goal.targetAgentId);

  switch (goal.type) {
    case 'eat_drink': {
      const foodName = targetBuilding.id === 'bakery' ? '蜂蜜核桃软欧包' : '现磨肉桂手冲咖啡';
      steps.push({
        id: `act-${Date.now()}-1`,
        type: 'travel_to_building',
        description: `步履匆匆赶往${targetBuilding.name}`,
        targetBuildingId: targetBuilding.id,
        targetCoordinates: { x: targetBuilding.entranceX, y: targetBuilding.entranceY },
        durationMinutes: 10,
        elapsedMinutes: 0,
        progress: 0,
        status: 'pending',
      });
      steps.push({
        id: `act-${Date.now()}-2`,
        type: 'consume_food_drink',
        description: `在${targetBuilding.name}点选并品尝香气四溢的${foodName}`,
        targetBuildingId: targetBuilding.id,
        durationMinutes: 20,
        elapsedMinutes: 0,
        progress: 0,
        status: 'pending',
        feedbackEffects: {
          hunger: -55,
          energy: 22,
          comfort: 20,
          stress: -12,
        },
      });
      steps.push({
        id: `act-${Date.now()}-3`,
        type: 'wander_area',
        description: `在${targetBuilding.name}门前驻足消食，神清气爽`,
        targetBuildingId: targetBuilding.id,
        targetCoordinates: { x: targetBuilding.entranceX + 25, y: targetBuilding.entranceY + 15 },
        durationMinutes: 10,
        elapsedMinutes: 0,
        progress: 0,
        status: 'pending',
        feedbackEffects: {
          fun: -10,
          comfort: 5,
        },
      });
      break;
    }

    case 'rest': {
      steps.push({
        id: `act-${Date.now()}-1`,
        type: 'travel_to_building',
        description: `拖着疲惫身躯前往${targetBuilding.name}静处`,
        targetBuildingId: targetBuilding.id,
        targetCoordinates: { x: targetBuilding.entranceX, y: targetBuilding.entranceY },
        durationMinutes: 10,
        elapsedMinutes: 0,
        progress: 0,
        status: 'pending',
      });
      steps.push({
        id: `act-${Date.now()}-2`,
        type: 'rest_sleep',
        description: '在舒适躺椅上闭目养神，调整匀称呼吸深睡休整',
        targetBuildingId: targetBuilding.id,
        durationMinutes: 40,
        elapsedMinutes: 0,
        progress: 0,
        status: 'pending',
        feedbackEffects: {
          energy: 45,
          stress: -28,
          comfort: 25,
        },
      });
      steps.push({
        id: `act-${Date.now()}-3`,
        type: 'wander_area',
        description: '醒来深呼吸活动手腕肩颈，恢复体能充沛状态',
        targetBuildingId: targetBuilding.id,
        targetCoordinates: { x: targetBuilding.entranceX - 20, y: targetBuilding.entranceY + 20 },
        durationMinutes: 10,
        elapsedMinutes: 0,
        progress: 0,
        status: 'pending',
        feedbackEffects: {
          safety: 10,
        },
      });
      break;
    }

    case 'socialize': {
      const friendName = goal.targetAgentName || targetAgent?.name || '熟人';
      const friendLoc = targetAgent ? { x: targetAgent.x, y: targetAgent.y } : { x: targetBuilding.entranceX, y: targetBuilding.entranceY };

      steps.push({
        id: `act-${Date.now()}-1`,
        type: 'travel_to_agent',
        description: `四处张望寻找好友 ${friendName} 的踪影`,
        targetAgentId: goal.targetAgentId,
        targetAgentName: friendName,
        targetCoordinates: friendLoc,
        durationMinutes: 12,
        elapsedMinutes: 0,
        progress: 0,
        status: 'pending',
      });
      steps.push({
        id: `act-${Date.now()}-2`,
        type: 'converse_with_agent',
        description: `与 ${friendName} 并肩漫步，敞开心扉分享近期所思`,
        targetAgentId: goal.targetAgentId,
        targetAgentName: friendName,
        targetBuildingId: targetBuilding.id,
        durationMinutes: 25,
        elapsedMinutes: 0,
        progress: 0,
        status: 'pending',
        feedbackEffects: {
          social: 40,
          belonging: 25,
          stress: -20,
          fun: 20,
          mood: 20,
        },
      });
      steps.push({
        id: `act-${Date.now()}-3`,
        type: 'wander_area',
        description: `与 ${friendName} 依依惜别，带着温暖心情慢行`,
        targetBuildingId: targetBuilding.id,
        targetCoordinates: { x: friendLoc.x + 30, y: friendLoc.y + 20 },
        durationMinutes: 10,
        elapsedMinutes: 0,
        progress: 0,
        status: 'pending',
        feedbackEffects: {
          comfort: 10,
        },
      });
      break;
    }

    case 'explore_research': {
      steps.push({
        id: `act-${Date.now()}-1`,
        type: 'travel_to_building',
        description: `步入充满知识静谧感的${targetBuilding.name}`,
        targetBuildingId: targetBuilding.id,
        targetCoordinates: { x: targetBuilding.entranceX, y: targetBuilding.entranceY },
        durationMinutes: 10,
        elapsedMinutes: 0,
        progress: 0,
        status: 'pending',
      });
      steps.push({
        id: `act-${Date.now()}-2`,
        type: 'inspect_equipment',
        description: `戴上细羊皮手套，小心翻开卷宗并调试精密观测设备`,
        targetBuildingId: targetBuilding.id,
        durationMinutes: 20,
        elapsedMinutes: 0,
        progress: 0,
        status: 'pending',
        feedbackEffects: {
          curiosity: -20,
        },
      });
      steps.push({
        id: `act-${Date.now()}-3`,
        type: 'work_task',
        description: '潜心推演星历公式并摘抄批注关键线索',
        targetBuildingId: targetBuilding.id,
        durationMinutes: 30,
        elapsedMinutes: 0,
        progress: 0,
        status: 'pending',
        feedbackEffects: {
          curiosity: -35,
          achievement: -30,
          stress: -10,
          energy: -12,
        },
      });
      break;
    }

    case 'work_achievement': {
      // Tailored multi-step plan matching resident identity
      if (agent.id === 'agent-4') {
        // Vera: Check telescope -> find missing gear parts -> go to town hall to consult Arthur
        steps.push({
          id: `act-${Date.now()}-1`,
          type: 'travel_to_building',
          description: '前往观星台二楼工坊工作台',
          targetBuildingId: 'observatory',
          targetCoordinates: { x: targetBuilding.entranceX, y: targetBuilding.entranceY },
          durationMinutes: 10,
          elapsedMinutes: 0,
          progress: 0,
          status: 'pending',
        });
        steps.push({
          id: `act-${Date.now()}-2`,
          type: 'inspect_equipment',
          description: '检查发条星盘三号黄铜齿轮磨损情况，记录零件公差',
          targetBuildingId: 'observatory',
          durationMinutes: 20,
          elapsedMinutes: 0,
          progress: 0,
          status: 'pending',
          feedbackEffects: { curiosity: -15 },
        });
        steps.push({
          id: `act-${Date.now()}-3`,
          type: 'travel_to_building',
          description: '因缺少高精度金属配件，动身前往市政厅找陈默备案申请',
          targetBuildingId: 'town_hall',
          targetCoordinates: { x: 550, y: 220 },
          durationMinutes: 15,
          elapsedMinutes: 0,
          progress: 0,
          status: 'pending',
        });
        steps.push({
          id: `act-${Date.now()}-4`,
          type: 'work_task',
          description: '递交工坊耗材特批清单并落实安全配额',
          targetBuildingId: 'town_hall',
          durationMinutes: 25,
          elapsedMinutes: 0,
          progress: 0,
          status: 'pending',
          feedbackEffects: {
            achievement: 35,
            mood: 22,
            safety: 20,
            stress: -8,
            energy: -12,
          },
        });
      } else {
        // Standard vocational execution
        steps.push({
          id: `act-${Date.now()}-1`,
          type: 'travel_to_building',
          description: `赶往专属工位岗位：${targetBuilding.name}`,
          targetBuildingId: targetBuilding.id,
          targetCoordinates: { x: targetBuilding.entranceX, y: targetBuilding.entranceY },
          durationMinutes: 10,
          elapsedMinutes: 0,
          progress: 0,
          status: 'pending',
        });
        steps.push({
          id: `act-${Date.now()}-2`,
          type: 'inspect_equipment',
          description: `清点准备工作器具与原料批次`,
          targetBuildingId: targetBuilding.id,
          durationMinutes: 15,
          elapsedMinutes: 0,
          progress: 0,
          status: 'pending',
        });
        steps.push({
          id: `act-${Date.now()}-3`,
          type: 'work_task',
          description: `全身心投入专属职业事务，一丝不苟推进生产与记录`,
          targetBuildingId: targetBuilding.id,
          durationMinutes: 35,
          elapsedMinutes: 0,
          progress: 0,
          status: 'pending',
          feedbackEffects: {
            achievement: 40,
            mood: 25,
            belonging: 15,
            energy: -14,
            hunger: 12,
          },
        });
      }
      break;
    }

    case 'seek_comfort_care': {
      steps.push({
        id: `act-${Date.now()}-1`,
        type: 'travel_to_building',
        description: '前去青木诊所寻求身心调养与安抚',
        targetBuildingId: 'clinic',
        targetCoordinates: { x: targetBuilding.entranceX, y: targetBuilding.entranceY },
        durationMinutes: 10,
        elapsedMinutes: 0,
        progress: 0,
        status: 'pending',
      });
      steps.push({
        id: `act-${Date.now()}-2`,
        type: 'seek_medical_aid',
        description: '在药香四溢的前厅小坐，饮用温热洋甘菊茶并嗅闻迷迭香精油',
        targetBuildingId: 'clinic',
        durationMinutes: 25,
        elapsedMinutes: 0,
        progress: 0,
        status: 'pending',
        feedbackEffects: {
          stress: -45,
          comfort: 35,
          safety: 20,
        },
      });
      steps.push({
        id: `act-${Date.now()}-3`,
        type: 'wander_area',
        description: '带着一身清爽草木香气离开诊所，步伐明显轻快',
        targetBuildingId: 'clinic',
        targetCoordinates: { x: targetBuilding.entranceX - 25, y: targetBuilding.entranceY + 15 },
        durationMinutes: 10,
        elapsedMinutes: 0,
        progress: 0,
        status: 'pending',
        feedbackEffects: {
          energy: 10,
        },
      });
      break;
    }

    case 'leisure_fun': {
      steps.push({
        id: `act-${Date.now()}-1`,
        type: 'travel_to_building',
        description: '慢步走向绿意盎然的中央公园林荫道',
        targetBuildingId: 'central_park',
        targetCoordinates: { x: 540, y: 460 },
        durationMinutes: 10,
        elapsedMinutes: 0,
        progress: 0,
        status: 'pending',
      });
      steps.push({
        id: `act-${Date.now()}-2`,
        type: 'enjoy_entertainment',
        description: '坐在喷泉边石凳上，聆听诗琴弹唱，注视水波与白鸽嬉戏',
        targetBuildingId: 'central_park',
        targetCoordinates: { x: 560, y: 470 },
        durationMinutes: 30,
        elapsedMinutes: 0,
        progress: 0,
        status: 'pending',
        feedbackEffects: {
          fun: -45,
          stress: -25,
          comfort: 20,
        },
      });
      steps.push({
        id: `act-${Date.now()}-3`,
        type: 'wander_area',
        description: '绕着喷泉环形步道慢步散心，感受微风拂面',
        targetBuildingId: 'central_park',
        targetCoordinates: { x: 500, y: 490 },
        durationMinutes: 15,
        elapsedMinutes: 0,
        progress: 0,
        status: 'pending',
        feedbackEffects: {
          belonging: 10,
        },
      });
      break;
    }

    case 'civic_governance': {
      steps.push({
        id: `act-${Date.now()}-1`,
        type: 'travel_to_building',
        description: '前往市政厅庄严的石阶广场',
        targetBuildingId: 'town_hall',
        targetCoordinates: { x: 550, y: 220 },
        durationMinutes: 10,
        elapsedMinutes: 0,
        progress: 0,
        status: 'pending',
      });
      steps.push({
        id: `act-${Date.now()}-2`,
        type: 'inspect_equipment',
        description: '驻足细读小镇近期公约公告与安全生产规范看板',
        targetBuildingId: 'town_hall',
        durationMinutes: 20,
        elapsedMinutes: 0,
        progress: 0,
        status: 'pending',
        feedbackEffects: {
          safety: 25,
          belonging: 20,
        },
      });
      steps.push({
        id: `act-${Date.now()}-3`,
        type: 'civic_patrol',
        description: '向执勤市政秘书陈默致意问好，登记日常社区反馈',
        targetBuildingId: 'town_hall',
        durationMinutes: 15,
        elapsedMinutes: 0,
        progress: 0,
        status: 'pending',
        feedbackEffects: {
          belonging: 25,
          achievement: -15,
        },
      });
      break;
    }

    default: {
      steps.push({
        id: `act-${Date.now()}-1`,
        type: 'wander_area',
        description: `在${targetBuilding.name}周围散步感知小镇生活`,
        targetBuildingId: targetBuilding.id,
        targetCoordinates: { x: targetBuilding.entranceX, y: targetBuilding.entranceY },
        durationMinutes: 20,
        elapsedMinutes: 0,
        progress: 0,
        status: 'pending',
        feedbackEffects: {
          comfort: 10,
        },
      });
    }
  }

  // Set the first step to in_progress
  if (steps.length > 0) {
    steps[0].status = 'in_progress';
  }

  return {
    id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    goalId: goal.id,
    goalTitle: goal.title,
    steps,
    currentStepIndex: 0,
    createdAt: { simDay, simTime, timestamp: Date.now() },
    totalSteps: steps.length,
    isCompleted: false,
  };
}
