import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_AGENTS } from '../src/data/initialTownData';
import { attentionReasons, generationLabel, observeAgent, readableMotivation, snapshotAgent } from '../src/utils/observation';
import { fallbackStatus, isQuotaError, sequenceDialogueLines } from '../src/utils/generation';
import { Agent } from '../src/types/town';

const clock = { simDay: 3, simTime: '00:01' };
function resident(): Agent {
  const agent = structuredClone(INITIAL_AGENTS[0]);
  const createdAt = { ...clock, timestamp: 100 };
  return { ...agent, goal: { id: 'goal-1', type: 'rest', title: '休息', description: '', motivation: 'Utility 评分 76 分: 精力不足，需要休息', dominantNeed: 'energy', urgency: 7, createdAt, status: 'active' },
    plan: { id: 'plan-1', goalId: 'goal-1', goalTitle: '休息', steps: [{ id: 'rest-1', type: 'rest_sleep', description: '闭目休息', durationMinutes: 10, elapsedMinutes: 0, progress: 0, status: 'in_progress' }], currentStepIndex: 0, totalSteps: 1, isCompleted: false, createdAt },
    physicalNeeds: { ...agent.physicalNeeds!, energy: 50, hunger: 30, health: 80 },
    psychologicalNeeds: { ...agent.psychologicalNeeds!, mood: 60, stress: 50, fun: 40, comfort: 60 }, money: 100,
  };
}
test('per-tick movement and progress do not flood the observation log', () => {
  const agent = resident(); const before = snapshotAgent(agent);
  agent.x += 3; agent.plan!.steps[0].progress = 35;
  assert.deepEqual(observeAgent(before, agent, clock, 200), []);
});
test('a newly chosen goal carries its recorded reason and simulation day', () => {
  const agent = resident(); const before = snapshotAgent(agent); agent.goal!.id = 'goal-2';
  const [item] = observeAgent(before, agent, clock, 200);
  assert.equal(item.kind, 'goal'); assert.equal(item.simDay, 3); assert.equal(item.simTime, '00:01');
  assert.deepEqual(item.changes, ['精力不足，需要休息']);
});
test('completed actions report measured net changes once', () => {
  const agent = resident(); const before = snapshotAgent(agent);
  agent.plan!.steps[0].status = 'completed'; agent.physicalNeeds!.energy = 61; agent.money = 130;
  const [item] = observeAgent(before, agent, clock, 200);
  assert.equal(item.kind, 'action'); assert.deepEqual(item.changes, ['精力 +11', '余额 +30']);
  assert.deepEqual(observeAgent(snapshotAgent(agent), agent, clock, 201), []);
});
test('threshold crossings record both attention and recovery without recurring alerts', () => {
  const agent = resident(); const before = snapshotAgent(agent); agent.physicalNeeds!.energy = 20;
  assert.deepEqual(attentionReasons(agent), ['精力不足']);
  assert.equal(observeAgent(before, agent, clock, 200)[0].kind, 'attention');
  const low = snapshotAgent(agent); assert.deepEqual(observeAgent(low, agent, clock, 201), []);
  agent.physicalNeeds!.energy = 30; assert.match(observeAgent(low, agent, clock, 202)[0].title, /状态恢复/);
});
test('snapshot scalars survive later in-place changes of a legacy plan', () => {
  const agent = resident(); const before = snapshotAgent(agent); agent.plan!.steps[0].status = 'completed';
  assert.deepEqual(before.completedActions, []);
  assert.equal(observeAgent(before, agent, clock, 200)[0].kind, 'action');
});
test('low health is visible and partial recovery does not imply all needs recovered', () => {
  const agent = resident(); agent.physicalNeeds!.health = 10; agent.physicalNeeds!.hunger = 85;
  assert.deepEqual(attentionReasons(agent), ['需要进食', '健康偏低']);
  const before = snapshotAgent(agent); agent.physicalNeeds!.health = 50;
  const [item] = observeAgent(before, agent, clock, 200);
  assert.match(item.title, /部分状态改善/);
  assert.equal(item.detail, '已缓解：健康偏低');
  assert.deepEqual(attentionReasons(agent), ['需要进食']);
});
test('missing reasons and historic generation sources remain explicit', () => {
  assert.equal(readableMotivation(undefined), '尚未记录决策原因');
  assert.equal(readableMotivation('Utility 评分 80 分: 生理饥饿度达到 88% (特质加成: ×1.01, 目标加权: ×0.92)'), '生理饥饿度达到 88%');
  assert.equal(generationLabel(undefined), '来源未记录');
  assert.equal(generationLabel({ source: 'server_fallback', reason: 'no_api_key', latencyMs: 1 }), '规则生成 · 未配置 AI');
  assert.equal(generationLabel({ source: 'client_fallback', reason: 'request_error', latencyMs: 1 }), '备用对话 · 请求失败');
});
test('procedural and quota fallbacks cannot be counted as model success', () => {
  assert.equal(fallbackStatus(false, false), 'procedural_fallback');
  assert.equal(fallbackStatus(true, true), 'rate_limited_fallback');
  assert.equal(fallbackStatus(true, false), 'api_error_fallback');
});
test('non-quota API errors are distinguished from rate limits', () => {
  assert.equal(isQuotaError(new Error('403 permission denied')), false);
  assert.equal(isQuotaError(new Error('429 RESOURCE_EXHAUSTED')), true);
  assert.equal(isQuotaError({ message: 'Quota exceeded' }), true);
});

test('fallback conversations preserve script order and never emit empty turns', () => {
  const dialogue = sequenceDialogueLines([
    { a: '问候', ea: 'friendly' }, { b: '回应', eb: 'warm' },
    { a: '提议', ea: 'happy' }, { b: '约定', eb: 'joy' },
  ], { id: 'a', name: '甲' }, { id: 'b', name: '乙' });
  assert.deepEqual(dialogue.map(line => line.speakerId), ['a', 'b', 'a', 'b']);
  assert.deepEqual(dialogue.map(line => line.text), ['问候', '回应', '提议', '约定']);
});
