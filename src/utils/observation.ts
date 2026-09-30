import { Agent, AgentAction, Building, ActiveInteractionBubble, GenerationInfo } from '../types/town';

export interface Observation {
  id: string;
  agentId: string;
  agentName: string;
  kind: 'goal' | 'action' | 'attention';
  title: string;
  detail: string;
  changes: string[];
  timestamp: number;
  simDay: number;
  simTime: string;
}

export function attentionReasons(agent: Agent): string[] {
  const reasons: string[] = [];
  if ((agent.physicalNeeds?.energy ?? agent.state.energy) < 25) reasons.push('精力不足');
  if ((agent.psychologicalNeeds?.stress ?? agent.state.stress) > 75) reasons.push('压力偏高');
  if ((agent.physicalNeeds?.hunger ?? agent.needs?.hunger ?? 0) > 80) reasons.push('需要进食');
  if ((agent.physicalNeeds?.health ?? agent.needs?.health ?? 100) < 30) reasons.push('健康偏低');
  return reasons;
}

export function currentAction(agent: Agent): AgentAction | undefined {
  return agent.currentAction ?? agent.plan?.steps[agent.plan.currentStepIndex];
}

export function residentStatus(agent: Agent, bubbles: ActiveInteractionBubble[]) {
  const bubble = bubbles.find(item => item.agentAId === agent.id || item.agentBId === agent.id);
  if (bubble) return { label: bubble.phase === 'generating' ? '准备交谈' : '交谈中', tone: 'social' };
  if (attentionReasons(agent).length) return { label: '需关注', tone: 'attention' };
  if (agent.isMoving) return { label: '移动中', tone: 'moving' };
  const action = currentAction(agent);
  if (action?.status === 'completed') return { label: '已完成', tone: 'idle' };
  if (action?.type === 'work_task' || action?.type === 'inspect_equipment') return { label: '工作中', tone: 'working' };
  if (action?.type === 'rest_sleep' || action?.type === 'seek_medical_aid') return { label: '恢复中', tone: 'idle' };
  return { label: '活动中', tone: 'idle' };
}

export function readableMotivation(motivation?: string): string {
  return motivation?.replace(/^Utility 评分\s*[\d.]+\s*分[:：]\s*/, '')
    .replace(/\s*[(（]特质加成:[^)）]*[)）]/g, '')
    .replace(/，受薪酬需求加权|，受可支配收入调节/g, '')
    .trim() || '尚未记录决策原因';
}

export function locationLabel(agent: Agent, buildings: Building[]) {
  const action = currentAction(agent);
  const target = buildings.find(building => building.id === action?.targetBuildingId);
  if (agent.isMoving) return target ? `前往${target.name}` : action?.targetAgentName ? `寻找${action.targetAgentName}` : '前往目标地点';
  const nearby = buildings.find(building => Math.hypot(building.entranceX - agent.x, building.entranceY - agent.y) < 80);
  return nearby?.name || '小镇户外';
}

export function generationLabel(info?: GenerationInfo) {
  if (!info) return '来源未记录';
  if (info.source === 'model') return 'AI 生成';
  if (info.source === 'client_fallback') return '备用对话 · 请求失败';
  return info.reason === 'no_api_key' ? '规则生成 · 未配置 AI' : info.reason === 'quota' ? '规则生成 · 配额保护' : '规则生成 · AI 请求失败';
}

export interface AgentSnapshot {
  name: string;
  goalId?: string;
  goalStatus?: string;
  completedActions: string[];
  energy: number;
  mood: number;
  stress: number;
  money: number;
  attention: string[];
}

// Keep scalar snapshots: engine state can contain nested plans and large memories.
export function snapshotAgent(agent: Agent): AgentSnapshot {
  return {
    name: agent.name, goalId: agent.goal?.id, goalStatus: agent.goal?.status,
    completedActions: agent.plan?.steps.filter(step => step.status === 'completed').map(step => step.id) || [],
    energy: agent.physicalNeeds?.energy ?? agent.state.energy,
    mood: agent.psychologicalNeeds?.mood ?? agent.state.mood,
    stress: agent.psychologicalNeeds?.stress ?? agent.state.stress,
    money: agent.money ?? 0, attention: attentionReasons(agent),
  };
}

export function observeAgent(previous: AgentSnapshot, agent: Agent, clock: { simDay: number; simTime: string }, timestamp: number): Observation[] {
  const next = snapshotAgent(agent);
  const items: Omit<Observation, 'id' | 'agentId' | 'agentName' | 'timestamp' | 'simDay' | 'simTime'>[] = [];
  if (next.goalId && next.goalId !== previous.goalId) {
    items.push({ kind: 'goal', title: `${agent.name}有了新目标`, detail: agent.goal!.title, changes: [readableMotivation(agent.goal?.motivation)] });
  } else if (next.goalStatus === 'completed' && previous.goalStatus !== 'completed') {
    items.push({ kind: 'goal', title: `${agent.name}完成目标`, detail: agent.goal!.title, changes: [] });
  }
  const completed = agent.plan?.steps.filter(step => step.status === 'completed' && !previous.completedActions.includes(step.id)) || [];
  if (completed.length) {
    const changes: string[] = [];
    const fields = [['精力', next.energy - previous.energy], ['心情', next.mood - previous.mood], ['压力', next.stress - previous.stress], ['余额', next.money - previous.money]] as const;
    for (const [name, difference] of fields) {
      const value = Math.round(difference);
      if (value) changes.push(`${name} ${value > 0 ? '+' : ''}${value}`);
    }
    items.push({ kind: 'action', title: `${agent.name}完成行动`, detail: completed.map(step => step.description).join('；'), changes });
  }
  const added = next.attention.filter(reason => !previous.attention.includes(reason));
  const resolved = previous.attention.filter(reason => !next.attention.includes(reason));
  if (added.length || resolved.length) {
    items.push({ kind: 'attention', title: added.length ? `${agent.name}需要关注` : `${agent.name}${next.attention.length ? '部分状态改善' : '状态恢复'}`, detail: added.length ? added.join('、') : `已缓解：${resolved.join('、')}`, changes: [] });
  }
  return items.map((item, index) => ({ ...item, ...clock, timestamp, agentId: agent.id, agentName: agent.name, id: `observation-${agent.id}-${timestamp}-${index}` }));
}
