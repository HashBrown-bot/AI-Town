// Five simulation minutes per real second at 1×, in small consistent steps.
export const SIMULATION_STEP_MS = 200;
export const SIMULATION_STEP_MINUTES = 1;

export interface SimulationClock { day: number; hour: number; minute: number }

export function advanceClock(clock: SimulationClock, minutes: number): SimulationClock {
  const total = clock.hour * 60 + clock.minute + minutes;
  return {
    day: clock.day + Math.floor(total / 1440),
    hour: Math.floor((total % 1440) / 60),
    minute: total % 60,
  };
}

export function interpolatePosition(from: { x: number; y: number }, to: { x: number; y: number }, progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}
