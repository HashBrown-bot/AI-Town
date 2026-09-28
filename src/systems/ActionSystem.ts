import { Agent, AgentAction, AgentGoal, AgentPlan, AgentNeeds, Building, TownEvent, UtilityActionScore } from '../types/town';
import { clampNeed, updateAgentNeeds } from './NeedsSystem';
import { evaluateAgentGoal } from './GoalSystem';
import { planGoalActions } from './PlannerSystem';

/**
 * Ticks an individual agent's decision-action cycle:
 * Needs -> Utility AI Evaluation -> Goal -> Plan -> Action -> World Feedback
 */
export function tickAgentAutonomousBehavior(
  agent: Agent,
  deltaMinutes: number,
  buildings: Building[],
  otherAgents: Agent[],
  simDay: number,
  simTime: string,
  weather?: string,
  isInteracting: boolean = false,
  events: TownEvent[] = []
): Agent {
  // If agent is actively engaged in a modal dialogue bubble, pause autonomous movement
  if (isInteracting) {
    return { ...agent, isMoving: false };
  }

  // 1. Current building resolution
  const currentBuilding = buildings.find(b => b.id === agent.currentBuildingId);

  // 2. Needs evolution with simulation time & personality
  let updatedNeeds = updateAgentNeeds(agent, deltaMinutes, currentBuilding, weather);

  // 3. Goal & Plan Lifecycle Check via Utility AI
  let currentGoal = agent.goal;
  let currentPlan = agent.plan;
  let utilityEvaluations = agent.utilityEvaluations;

  // If no goal or previous goal completed, formulate a new goal and plan with Utility AI
  if (!currentGoal || currentGoal.status === 'completed' || !currentPlan || currentPlan.isCompleted) {
    const evalResult = evaluateAgentGoal(
      { ...agent, needs: updatedNeeds },
      buildings,
      otherAgents,
      simDay,
      simTime,
      currentBuilding,
      weather,
      events
    );
    currentGoal = evalResult.goal;
    utilityEvaluations = evalResult.evaluations;
    currentPlan = planGoalActions(currentGoal, { ...agent, needs: updatedNeeds }, buildings, otherAgents, simDay, simTime);
  }

  // Ensure current step index is within bounds
  if (currentPlan.currentStepIndex >= currentPlan.steps.length) {
    currentPlan.isCompleted = true;
    currentGoal.status = 'completed';
    // Re-evaluate immediately with Utility AI
    const evalResult = evaluateAgentGoal(
      { ...agent, needs: updatedNeeds },
      buildings,
      otherAgents,
      simDay,
      simTime,
      currentBuilding,
      weather,
      events
    );
    currentGoal = evalResult.goal;
    utilityEvaluations = evalResult.evaluations;
    currentPlan = planGoalActions(currentGoal, { ...agent, needs: updatedNeeds }, buildings, otherAgents, simDay, simTime);
  }

  let currentAction = currentPlan.steps[currentPlan.currentStepIndex];
  if (!currentAction) {
    currentAction = currentPlan.steps[0];
  }
  currentAction.status = 'in_progress';

  // 4. Resolve spatial destination coordinates for current action
  let destX = agent.x;
  let destY = agent.y;

  if (currentAction.targetCoordinates) {
    destX = currentAction.targetCoordinates.x;
    destY = currentAction.targetCoordinates.y;
  } else if (currentAction.targetBuildingId) {
    const targetB = buildings.find(b => b.id === currentAction.targetBuildingId);
    if (targetB) {
      destX = targetB.entranceX;
      destY = targetB.entranceY;
    }
  } else if (currentAction.targetAgentId) {
    const targetA = otherAgents.find(a => a.id === currentAction.targetAgentId);
    if (targetA) {
      destX = targetA.x;
      destY = targetA.y;
    }
  }

  // 5. Spatial Navigation & Movement
  let newX = agent.x;
  let newY = agent.y;
  let newTargetX = destX;
  let newTargetY = destY;
  let direction = agent.direction;
  let isMoving = false;

  const distToDest = Math.hypot(destX - newX, destY - newY);

  if (distToDest > 8) {
    // Traveling towards target
    isMoving = true;
    const dx = (destX - newX) / distToDest;
    const dy = (destY - newY) / distToDest;

    // Move smoothly along vector
    newX += dx * agent.speed * 2.2;
    newY += dy * agent.speed * 2.2;

    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? 'right' : 'left';
    } else {
      direction = dy > 0 ? 'down' : 'up';
    }
  } else {
    // Reached destination!
    isMoving = false;
  }

  // 6. Action Progress & World Feedback Execution
  let currentActivity = agent.currentActivity;
  let currentThought = agent.currentThought;

  if (isMoving) {
    currentActivity = `前往目标点: ${currentAction.description}`;
    currentThought = `【目标: ${currentGoal.title}】因为${currentGoal.motivation}，正在赶往目的地。`;
  } else {
    // At destination, perform the action
    currentActivity = currentAction.description;
    currentThought = `【计划步骤 ${currentPlan.currentStepIndex + 1}/${currentPlan.totalSteps}】${currentAction.description}`;

    // If it was purely a travel action, reaching target completes it!
    const isPureTravel = currentAction.type === 'travel_to_building' || currentAction.type === 'travel_to_agent';
    const progressInc = isPureTravel ? 100 : (deltaMinutes / Math.max(1, currentAction.durationMinutes)) * 100;

    currentAction.elapsedMinutes += deltaMinutes;
    currentAction.progress = Math.min(100, Math.round(currentAction.progress + progressInc));

    // Check action completion
    if (currentAction.progress >= 100) {
      currentAction.status = 'completed';

      // Apply WORLD FEEDBACK to Needs
      if (currentAction.feedbackEffects) {
        Object.entries(currentAction.feedbackEffects).forEach(([needKey, delta]) => {
          const key = needKey as keyof AgentNeeds;
          if (key in updatedNeeds) {
            updatedNeeds[key] = clampNeed(updatedNeeds[key] + (delta || 0));
          }
        });
      }

      // Advance to next action step
      currentPlan.currentStepIndex += 1;
      if (currentPlan.currentStepIndex < currentPlan.steps.length) {
        currentPlan.steps[currentPlan.currentStepIndex].status = 'in_progress';
      } else {
        // Plan & Goal successfully accomplished!
        currentPlan.isCompleted = true;
        currentGoal.status = 'completed';
      }
    }
  }

  // 7. Update currentBuildingId based on closest building entrance
  let closestBuilding = buildings[0];
  let minBdist = 9999;
  buildings.forEach(b => {
    const d = Math.hypot(b.entranceX - newX, b.entranceY - newY);
    if (d < minBdist) {
      minBdist = d;
      closestBuilding = b;
    }
  });

  // 8. Keep legacy agent.state synced with agent.needs
  const syncedState = {
    energy: Math.round(updatedNeeds.energy),
    mood: Math.max(-100, Math.min(100, Math.round(100 - updatedNeeds.stress * 1.2 - updatedNeeds.hunger * 0.4))),
    stress: Math.round(updatedNeeds.stress),
    sociability: Math.round(100 - updatedNeeds.social),
  };

  return {
    ...agent,
    x: newX,
    y: newY,
    targetX: newTargetX,
    targetY: newTargetY,
    direction,
    isMoving,
    currentBuildingId: minBdist < 80 ? closestBuilding.id : agent.currentBuildingId,
    needs: updatedNeeds,
    goal: currentGoal,
    plan: currentPlan,
    currentAction,
    utilityEvaluations,
    currentGoal: currentGoal.title, // text overview compatibility
    currentActivity,
    currentThought,
    state: syncedState,
  };
}
