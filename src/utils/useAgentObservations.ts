import { useEffect, useRef, useState } from 'react';
import { Agent } from '../types/town';
import { AgentSnapshot, Observation, observeAgent, snapshotAgent } from './observation';

export function useAgentObservations(agents: Agent[], simDay: number, simHour: number, simMinute: number) {
  const previous = useRef(new Map<string, AgentSnapshot>());
  const [observations, setObservations] = useState<Observation[]>([]);
  useEffect(() => {
    const timestamp = Date.now();
    const clock = { simDay, simTime: `${String(simHour).padStart(2, '0')}:${String(simMinute).padStart(2, '0')}` };
    const additions = agents.flatMap(agent => {
      const snapshot = previous.current.get(agent.id);
      return snapshot ? observeAgent(snapshot, agent, clock, timestamp) : [];
    });
    previous.current = new Map(agents.map(agent => [agent.id, snapshotAgent(agent)]));
    if (additions.length) setObservations(items => [...additions.reverse(), ...items].slice(0, 120));
  }, [agents, simDay, simHour, simMinute]);
  return observations;
}
