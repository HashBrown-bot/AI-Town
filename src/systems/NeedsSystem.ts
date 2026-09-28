import { Agent, AgentNeeds, Building, BigFiveTraits } from '../types/town';

export const DEFAULT_INITIAL_NEEDS: AgentNeeds = {
  energy: 85,
  hunger: 20,
  social: 30,
  fun: 25,
  comfort: 80,
  curiosity: 50,
  safety: 85,
  belonging: 75,
  achievement: 60,
  stress: 15,
};

/**
 * Enforces strict 0-100 numerical bounds on any need metric
 */
export function clampNeed(val: number): number {
  return Math.min(100, Math.max(0, Math.round(val * 10) / 10));
}

/**
 * Updates agent's 10 needs dynamically over simulation time (deltaMinutes),
 * factoring in personality traits (Big Five) and environmental affordances.
 */
export function updateAgentNeeds(
  agent: Agent,
  deltaMinutes: number,
  currentBuilding?: Building,
  weather?: string
): AgentNeeds {
  const current = agent.needs || { ...DEFAULT_INITIAL_NEEDS };
  const traits = agent.bigFive || {
    openness: 60,
    conscientiousness: 60,
    extraversion: 60,
    agreeableness: 60,
    neuroticism: 30,
  };

  // Base natural delta per minute (scaled by deltaMinutes)
  const dt = Math.max(0.1, Math.min(60, deltaMinutes));

  // 1. Energy: depletes naturally with activity; preserved slightly better by high Conscientiousness
  const energyDrainRate = 0.05 - (traits.conscientiousness / 100) * 0.015;
  let newEnergy = current.energy - energyDrainRate * dt;

  // 2. Hunger: accumulates naturally over time
  const hungerRate = 0.08;
  let newHunger = current.hunger + hungerRate * dt;

  // 3. Social need (craving for interaction):
  // High Extraversion causes social craving to surge much faster when solitary
  const extraversionFactor = (traits.extraversion / 50); // e.g. 0.4 to 1.8
  let newSocial = current.social + 0.06 * extraversionFactor * dt;

  // 4. Fun / Recreation craving:
  let newFun = current.fun + 0.05 * (traits.extraversion / 60) * dt;

  // 5. Comfort: decays slowly in harsh conditions
  let newComfort = current.comfort - 0.03 * dt;

  // 6. Curiosity:
  // High Openness agents build curiosity and thirst for discovery significantly faster
  const opennessFactor = (traits.openness / 50);
  let newCuriosity = current.curiosity + 0.07 * opennessFactor * dt;

  // 7. Safety: remains relatively stable unless stress is very high or weather is severe
  let newSafety = current.safety - 0.01 * dt;

  // 8. Belonging:
  // High Agreeableness values community connection and feels isolated if unattended
  const agreeablenessFactor = (traits.agreeableness / 50);
  let newBelonging = current.belonging - 0.02 * agreeablenessFactor * dt;

  // 9. Achievement / Productive Drive:
  // High Conscientiousness agents feel strong urge to accomplish duties and research
  const conscientiousnessFactor = (traits.conscientiousness / 50);
  let newAchievement = current.achievement + 0.06 * conscientiousnessFactor * dt;

  // 10. Stress:
  // High Neuroticism compounds stress when hungry, tired, or unattended
  const neuroticismFactor = (traits.neuroticism / 50);
  let stressBase = 0.02 * neuroticismFactor;
  if (current.hunger > 65) stressBase += 0.05 * neuroticismFactor;
  if (current.energy < 30) stressBase += 0.06 * neuroticismFactor;
  if (weather === 'thunderstorm') stressBase += 0.04 * neuroticismFactor;
  let newStress = current.stress + stressBase * dt;

  // Environmental Buffs & Dampeners based on current building
  if (currentBuilding) {
    switch (currentBuilding.id) {
      case 'cafe':
        newComfort += 0.08 * dt;
        newStress -= 0.06 * dt;
        break;
      case 'bakery':
        newComfort += 0.08 * dt;
        break;
      case 'clinic':
        newStress -= 0.12 * dt;
        newComfort += 0.06 * dt;
        newSafety += 0.08 * dt;
        break;
      case 'central_park':
        newFun += 0.04 * dt;
        newStress -= 0.08 * dt;
        break;
      case 'library':
        newCuriosity -= 0.02 * dt; // Nourishing curiosity
        newSafety += 0.05 * dt;
        break;
      case 'observatory':
        newCuriosity -= 0.02 * dt;
        break;
      case 'town_hall':
        newSafety += 0.08 * dt;
        newBelonging += 0.05 * dt;
        break;
    }
  }

  return {
    energy: clampNeed(newEnergy),
    hunger: clampNeed(newHunger),
    social: clampNeed(newSocial),
    fun: clampNeed(newFun),
    comfort: clampNeed(newComfort),
    curiosity: clampNeed(newCuriosity),
    safety: clampNeed(newSafety),
    belonging: clampNeed(newBelonging),
    achievement: clampNeed(newAchievement),
    stress: clampNeed(newStress),
  };
}
