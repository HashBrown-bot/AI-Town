import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceClock, interpolatePosition, SIMULATION_STEP_MS, SIMULATION_STEP_MINUTES } from '../src/utils/simulation';
import { tickAgentAutonomousBehavior } from '../src/systems/ActionSystem';
import { INITIAL_AGENTS, INITIAL_BUILDINGS } from '../src/data/initialTownData';
import { Agent } from '../src/types/town';

function traveler(targetX = 1000, speed = 1): Agent & { plan: NonNullable<Agent['plan']> } {
  const agent = structuredClone(INITIAL_AGENTS[0]);
  const createdAt = { simDay: 1, simTime: '09:00', timestamp: 0 };
  return { ...agent, x: 0, y: 0, speed,
    goal: { id: 'goal', type: 'explore_research', title: '探索', description: '', motivation: '', dominantNeed: 'curiosity', urgency: 1, createdAt, status: 'active' },
    plan: { id: 'plan', goalId: 'goal', goalTitle: '探索', currentStepIndex: 0, totalSteps: 1, isCompleted: false, createdAt,
      steps: [{ id: 'travel', type: 'travel_to_building', description: '步行', targetCoordinates: { x: targetX, y: 0 }, durationMinutes: 10, elapsedMinutes: 0, progress: 0, status: 'pending' }] },
  };
}
function step(agent: Agent, minutes = 1, interacting = false) {
  return tickAgentAutonomousBehavior(agent, minutes, INITIAL_BUILDINGS, [agent], 1, '09:00', 'clear', interacting);
}

test('clock wraps midnight and keeps the current minutes when skipping one hour', () => {
  assert.deepEqual(advanceClock({ day: 3, hour: 23, minute: 58 }, 5), { day: 4, hour: 0, minute: 3 });
  assert.deepEqual(advanceClock({ day: 3, hour: 23, minute: 15 }, 60), { day: 4, hour: 0, minute: 15 });
});
test('clock and behavior advance five simulated minutes per real second at 1×', () => {
  assert.equal(1000 / SIMULATION_STEP_MS * SIMULATION_STEP_MINUTES, 5);
});
test('walking covers 30 pixels per second at normal speed and scales with elapsed simulation time', () => {
  const agent = traveler();
  let moved: Agent = agent;
  for (let i = 0; i < 5; i++) moved = step(moved);
  assert.equal(moved.x, 30);
  assert.equal(step(agent, 5).x, moved.x);
});
test('a large movement step cannot overshoot its destination', () => {
  assert.equal(step(traveler(10, 100)).x, 10);
});
test('ticks do not mutate the previous resident, goal or plan snapshot', () => {
  const agent = traveler();
  const before = structuredClone(agent);
  const next = step(agent);
  assert.deepEqual(agent, before);
  assert.ok(next.plan);
  assert.notEqual(next.plan, agent.plan);
  assert.notEqual(next.plan.steps[0], agent.plan.steps[0]);
});
test('a conversation keeps its participants stationary', () => {
  const agent = traveler();
  const next = step(agent, 5, true);
  assert.equal(next.x, agent.x);
  assert.equal(next.isMoving, false);
});
test('finishing a work action credits wages once without changing its input', () => {
  const agent = traveler(0);
  agent.plan.steps[0] = { ...agent.plan.steps[0], type: 'work_task', durationMinutes: 1 };
  const before = structuredClone(agent);
  const next = step(agent);
  assert.ok(next.plan);
  assert.equal(next.money, Math.min(9999, agent.money + agent.salary));
  assert.equal(next.plan.isCompleted, true);
  assert.deepEqual(agent, before);
});
test('interpolation stays between authoritative endpoints', () => {
  assert.deepEqual(interpolatePosition({ x: 0, y: 10 }, { x: 20, y: 30 }, .5), { x: 10, y: 20 });
  assert.deepEqual(interpolatePosition({ x: 0, y: 10 }, { x: 20, y: 30 }, 4), { x: 20, y: 30 });
});
