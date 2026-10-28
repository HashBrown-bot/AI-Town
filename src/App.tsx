import React, { lazy, Suspense, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Agent, 
  Building, 
  InteractionRecord, 
  TownEvent, 
  TownAnalysis, 
  ActiveInteractionBubble,
  AgentKnowledge,
  TownEconomyState
} from './types/town';
import { 
  INITIAL_AGENTS, 
  INITIAL_BUILDINGS, 
  INITIAL_EVENTS, 
  INITIAL_ANALYSIS 
} from './data/initialTownData';
import { TownWorkspace } from './components/TownWorkspace';
import { advanceClock, SIMULATION_STEP_MS, SIMULATION_STEP_MINUTES } from './utils/simulation';
import { useLocalPersistence } from './utils/useLocalPersistence';
import { useAgentObservations } from './utils/useAgentObservations';
import { HeaderNav, TabKey } from './components/HeaderNav';
const DashboardOverview = lazy(() => import('./components/DashboardOverview').then(module => ({ default: module.DashboardOverview })));
const LiveInteractionsView = lazy(() => import('./components/LiveInteractionsView').then(module => ({ default: module.LiveInteractionsView })));
const AgentEvolutionView = lazy(() => import('./components/AgentEvolutionView').then(module => ({ default: module.AgentEvolutionView })));
const AgentPersonaStudio = lazy(() => import('./components/AgentPersonaStudio').then(module => ({ default: module.AgentPersonaStudio })));
const InformationNetworkView = lazy(() => import('./components/InformationNetworkView').then(module => ({ default: module.InformationNetworkView })));
const TownEventsEngine = lazy(() => import('./components/TownEventsEngine').then(module => ({ default: module.TownEventsEngine })));
const TownAnalyzerView = lazy(() => import('./components/TownAnalyzerView').then(module => ({ default: module.TownAnalyzerView })));
const FineTuningExportModal = lazy(() => import('./components/FineTuningExportModal').then(module => ({ default: module.FineTuningExportModal })));
const QuotaCapacityPanel = lazy(() => import('./components/QuotaCapacityPanel').then(module => ({ default: module.QuotaCapacityPanel })));
const TownEconomyPanel = lazy(() => import('./components/TownEconomyPanel').then(module => ({ default: module.TownEconomyPanel })));
import { 
  testConnection, 
  syncInteractionToCloud, 
  syncAgentStateToCloud, 
  syncEventToCloud, 
  syncAnalysisToCloud,
  syncSimulationStateToCloud,
  fetchSimulationStateFromCloud,
  fetchCloudInteractions,
  fetchCloudAgents,
  fetchCloudEvents,
  fetchCloudAnalysis,
  syncEconomyStateToCloud,
  fetchCloudEconomyState
} from './services/firebase';
import { requestAgentDialogue, requestAgentReflection } from './services/aiTownService';
import { 
  retrieveAgentMemories, 
  createAgentMemory, 
  consolidateAndPruneMemories, 
  applyReflectionToAgent 
} from './services/memorySystem';
import { tickAgentAutonomousBehavior, applyDialogueOutcomeToNeeds } from './systems';
import { initializeTownEconomy, tickTownEconomy } from './systems/EconomySystem';
import { updateRelationshipOnInteraction, calculateAffinityProjection, createDefaultRelationship } from './systems/RelationshipSystem';
import { 
  INITIAL_TOWN_KNOWLEDGE, 
  processDialogueKnowledgeExchange, 
  registerEventEyewitnessKnowledge 
} from './systems/InformationSystem';
import { soundEngine } from './utils/audioSystem';
import { logger } from './utils/logger';
import { DebugMetricsHUD } from './components/DebugMetricsHUD';

// Local Storage Keys for Instant Zero-Flash Hydration
const STORAGE_SIM_STATE = 'aetheria_sim_state_v2';
const STORAGE_AGENTS = 'aetheria_agents_v2';
const STORAGE_INTERACTIONS = 'aetheria_interactions_v2';
const STORAGE_EVENTS = 'aetheria_events_v2';
const STORAGE_KNOWLEDGE = 'aetheria_knowledge_v2';
const STORAGE_ECONOMY = 'aetheria_economy_v2';

function loadStoredSimState() {
  try {
    const item = localStorage.getItem(STORAGE_SIM_STATE);
    if (item) {
      const data = JSON.parse(item);
      if (typeof data.simDay === 'number' && data.simDay >= 1) {
        const loadedState = {
          simDay: data.simDay,
          simHour: typeof data.simHour === 'number' ? data.simHour : 9,
          simMinute: typeof data.simMinute === 'number' ? data.simMinute : 15,
          weather: data.weather || 'clear',
        };
        logger.info('SimState', 'Restored simulation state from LocalStorage:', loadedState);
        return loadedState;
      }
    }
  } catch (err) {
    logger.warn('SimState', 'Failed to parse LocalStorage sim state:', err);
  }
  const defaultState = { simDay: 1, simHour: 9, simMinute: 15, weather: 'clear' as const };
  logger.info('SimState', 'Using default simulation state:', defaultState);
  return defaultState;
}

function loadStoredAgents(): Agent[] {
  try {
    const item = localStorage.getItem(STORAGE_AGENTS);
    if (item) {
      const parsed = JSON.parse(item);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((agent: any) => ({
          ...agent,
          money: typeof agent.money === 'number' ? agent.money : 150,
          income: typeof agent.income === 'number' ? agent.income : 0,
          expenses: typeof agent.expenses === 'number' ? agent.expenses : 0,
          occupation: agent.occupation || agent.role || '居民',
          salary: typeof agent.salary === 'number' ? agent.salary : 32,
          economicStatus: agent.economicStatus || 'comfortable',
          needs: agent.needs || {
            energy: agent.state?.energy || 80,
            hunger: 25,
            social: 35,
            fun: 30,
            comfort: 75,
            curiosity: 60,
            safety: 85,
            belonging: 70,
            achievement: 65,
            stress: agent.state?.stress || 20
          }
        }));
      }
    }
  } catch (err) {
    logger.warn('Storage', 'Failed to load local agents:', err);
  }
  return INITIAL_AGENTS;
}

function loadStoredEconomy(): TownEconomyState {
  try {
    const item = localStorage.getItem(STORAGE_ECONOMY);
    if (item) {
      const parsed = JSON.parse(item);
      if (parsed && Array.isArray(parsed.shops)) {
        return initializeTownEconomy(parsed);
      }
    }
  } catch (err) {
    logger.warn('Storage', 'Failed to load local economy:', err);
  }
  return initializeTownEconomy();
}

function loadStoredInteractions(): InteractionRecord[] | null {
  try {
    const item = localStorage.getItem(STORAGE_INTERACTIONS);
    if (item) {
      const parsed = JSON.parse(item);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    logger.warn('Storage', 'Failed to load local interactions:', err);
  }
  return null;
}

function loadStoredKnowledge(): AgentKnowledge[] {
  try {
    const item = localStorage.getItem(STORAGE_KNOWLEDGE);
    if (item) {
      const parsed = JSON.parse(item);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    logger.warn('Storage', 'Failed to load local knowledge:', err);
  }
  return INITIAL_TOWN_KNOWLEDGE;
}

export default function App() {
  logger.recordMetric('renders', 1);

  // Navigation
  const [currentTab, setCurrentTab] = useState<TabKey>('canvas');

  // Simulation State with lazy persistent local initial state (evaluated only on mount)
  const [initialSim] = useState(loadStoredSimState);
  const [simDay, setSimDay] = useState<number>(() => initialSim.simDay);
  const [simHour, setSimHour] = useState<number>(() => initialSim.simHour);
  const [simMinute, setSimMinute] = useState<number>(() => initialSim.simMinute);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 0=pause, 1=1x, 2=2x, 5=5x
  const [weather, setWeather] = useState<'clear' | 'golden_sunset' | 'rainy' | 'starry_night' | 'misty_morning'>(() => initialSim.weather as any);

  // Core Data Collections
  const [agents, setAgents] = useState<Agent[]>(loadStoredAgents);
  const [buildings] = useState<Building[]>(INITIAL_BUILDINGS);
  const [interactions, setInteractions] = useState<InteractionRecord[]>(() => loadStoredInteractions() || []);
  const [events, setEvents] = useState<TownEvent[]>(INITIAL_EVENTS);
  const [latestAnalysis, setLatestAnalysis] = useState<TownAnalysis>(INITIAL_ANALYSIS);
  const [knowledgeItems, setKnowledgeItems] = useState<AgentKnowledge[]>(loadStoredKnowledge);
  const [economyState, setEconomyState] = useState<TownEconomyState>(loadStoredEconomy);
  const observations = useAgentObservations(agents, simDay, simHour, simMinute);

  useLocalPersistence(STORAGE_ECONOMY, economyState);
  useLocalPersistence(STORAGE_AGENTS, agents);
  const savedInteractions = useMemo(() => interactions.slice(0, 100), [interactions]);
  useLocalPersistence(STORAGE_INTERACTIONS, savedInteractions);
  useLocalPersistence(STORAGE_KNOWLEDGE, knowledgeItems);
  useLocalPersistence(STORAGE_SIM_STATE, { simDay, simHour, simMinute, weather });

  // Active Conversations on Canvas
  const [activeBubbles, setActiveBubbles] = useState<ActiveInteractionBubble[]>([]);

  // Selection / Modal States
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Cloud Firestore Sync State
  const [cloudSyncCount, setCloudSyncCount] = useState<number>(0);
  const [isCloudReady, setIsCloudReady] = useState<boolean>(false);

  // Reflection active status
  const [isReflectingAgentId, setIsReflectingAgentId] = useState<string | null>(null);

  // Floating RPG Game Toasts Feedback System
  const [gameToasts, setGameToasts] = useState<{ id: string; badge: string; text: string; icon: string; color: string }[]>([]);

  const addGameToast = useCallback((badge: string, text: string, icon = '✨', color = '#ffc97a') => {
    const newToast = {
      id: `${Date.now()}-${Math.random()}`,
      badge,
      text,
      icon,
      color
    };
    setGameToasts(prev => [newToast, ...prev].slice(0, 4));
    const timer = setTimeout(() => {
      activeTimersRef.current.delete(timer);
      setGameToasts(prev => prev.filter(t => t.id !== newToast.id));
    }, 3500);
    activeTimersRef.current.add(timer);
  }, []);

  // Ref to track interacting agent IDs to prevent double encounters
  const interactingAgentIdsRef = useRef<Set<string>>(new Set());

  // Ref to throttle autonomous dialogue encounters to prevent rapid API exhaustion
  const lastAutonomousEncounterRef = useRef<number>(Date.now());
  const dialogueHandlerRef = useRef<(a: Agent, b: Agent) => Promise<void>>(null);
  const reflectionHandlerRef = useRef<(id: string) => Promise<void>>(null);

  // Debounce ref for syncing simulation clock to cloud
  const lastCloudClockSyncRef = useRef<number>(0);

  // High-efficiency mutable references for the requestAnimationFrame controller
  const simClockRef = useRef({
    day: initialSim.simDay,
    hour: initialSim.simHour,
    minute: initialSim.simMinute,
  });

  const agentsRef = useRef<Agent[]>(agents);
  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  // Keep simClockRef synced if time is set externally (e.g. skip hour or reset)
  useEffect(() => {
    simClockRef.current = { day: simDay, hour: simHour, minute: simMinute };
  }, [simDay, simHour, simMinute]);

  const simStateRef = useRef({
    simSpeed,
    simDay,
    simHour,
    simMinute,
    weather,
    buildings,
    events,
    activeBubbles,
  });

  // Keep simStateRef synchronized with current state on every render
  useEffect(() => {
    simStateRef.current = {
      simSpeed,
      simDay,
      simHour,
      simMinute,
      weather,
      buildings,
      events,
      activeBubbles,
    };
  });

  // Track active speech intervals and timers to guarantee zero memory buildup on unmount
  const activeTimersRef = useRef<Set<any>>(new Set());
  useEffect(() => {
    return () => {
      activeTimersRef.current.forEach(timer => {
        clearInterval(timer);
        clearTimeout(timer);
      });
      activeTimersRef.current.clear();
    };
  }, []);

  // Debounced cloud clock sync; local snapshots are saved by useLocalPersistence.
  useEffect(() => {
    // Sync to Firestore every 30 simulated seconds or whenever the hour advances
    const now = Date.now();
    if (isCloudReady && (now - lastCloudClockSyncRef.current > 15000 || simMinute === 0)) {
      lastCloudClockSyncRef.current = now;
      syncSimulationStateToCloud({ simDay, simHour, simMinute, weather });
    }
  }, [simDay, simHour, simMinute, weather, isCloudReady]);

  // Synchronize on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      syncSimulationStateToCloud({ simDay, simHour, simMinute, weather });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [simDay, simHour, simMinute, weather]);

  // Idempotency refs for StrictMode initialization
  const isBootingRef = useRef<boolean>(false);
  const bootCompletedRef = useRef<boolean>(false);

  // 2. Initial Firebase boot, cloud hydration and connection test
  useEffect(() => {
    if (isBootingRef.current || bootCompletedRef.current) return;
    isBootingRef.current = true;

    async function bootFirebase() {
      logger.info('Firebase', 'Booting Firebase sync and cloud state hydration...');
      const connected = await testConnection();
      setIsCloudReady(connected);

      if (connected) {
        // 1. Fetch persistent simulation state from Cloud
        try {
          const cloudSim = await fetchSimulationStateFromCloud();
          if (cloudSim && typeof cloudSim.simDay === 'number') {
            const localTotalSimMinutes = simDay * 24 * 60 + simHour * 60 + simMinute;
            const cloudTotalSimMinutes = cloudSim.simDay * 24 * 60 + cloudSim.simHour * 60 + cloudSim.simMinute;

            if (cloudTotalSimMinutes > localTotalSimMinutes) {
              logger.info('Firebase', 'Hydrating local clock with cloud progress', cloudSim);
              setSimDay(cloudSim.simDay);
              setSimHour(cloudSim.simHour);
              setSimMinute(cloudSim.simMinute);
              if (cloudSim.weather) setWeather(cloudSim.weather as any);
            } else if (localTotalSimMinutes > cloudTotalSimMinutes) {
              syncSimulationStateToCloud({ simDay, simHour, simMinute, weather });
            }
          } else {
            syncSimulationStateToCloud({ simDay, simHour, simMinute, weather });
          }
        } catch (e) {
          logger.warn('Firebase', 'Failed to fetch/sync simulation state:', e);
        }

        // 2. Fetch persistent interactions from Cloud
        try {
          const cloudInteractions = await fetchCloudInteractions();
          if (cloudInteractions && cloudInteractions.length > 0) {
            setInteractions(cloudInteractions);
            setCloudSyncCount(cloudInteractions.length);
          } else if (interactions.length === 0) {
            generateInitialHistoricalInteractions();
          }
        } catch (e) {
          logger.warn('Firebase', 'Could not fetch cloud interactions:', e);
        }

        // 3. Fetch persistent agents from Cloud
        try {
          const cloudAgents = await fetchCloudAgents();
          if (cloudAgents && cloudAgents.length > 0) {
            setAgents(prev => {
              return prev.map(a => {
                const ca = cloudAgents.find(c => c.id === a.id) as any;
                if (ca) {
                  return {
                    ...a,
                    ...ca,
                    state: {
                      ...a.state,
                      ...(ca.state || {}),
                      energy: typeof ca.energy === 'number' ? ca.energy : a.state.energy,
                      mood: typeof ca.mood === 'number' ? ca.mood : a.state.mood,
                      stress: typeof ca.stress === 'number' ? ca.stress : a.state.stress,
                    },
                    currentActivity: ca.currentActivity || a.currentActivity,
                  };
                }
                return a;
              });
            });
          }
        } catch (e) {
          logger.warn('Firebase', 'Could not fetch cloud agents:', e);
        }

        // 4. Fetch persistent events from Cloud
        try {
          const cloudEvents = await fetchCloudEvents();
          if (cloudEvents && cloudEvents.length > 0) {
            setEvents(cloudEvents);
          } else {
            INITIAL_EVENTS.forEach(e => syncEventToCloud(e));
          }
        } catch (e) {
          logger.warn('Firebase', 'Could not fetch cloud events:', e);
        }

        // 5. Fetch persistent analysis from Cloud
        try {
          const cloudAnalysis = await fetchCloudAnalysis();
          if (cloudAnalysis) {
            setLatestAnalysis(cloudAnalysis);
          } else {
            syncAnalysisToCloud(INITIAL_ANALYSIS);
          }
        } catch (e) {
          logger.warn('Firebase', 'Could not fetch cloud analysis:', e);
        }

        // 6. Fetch persistent economy state from Cloud
        try {
          const cloudEconomy = await fetchCloudEconomyState();
          if (cloudEconomy && Array.isArray(cloudEconomy.shops) && cloudEconomy.shops.length > 0) {
            setEconomyState(initializeTownEconomy(cloudEconomy));
          } else {
            syncEconomyStateToCloud(initializeTownEconomy());
          }
        } catch (e) {
          logger.warn('Firebase', 'Could not fetch cloud economy state:', e);
        }
      } else {
        // If offline and no interactions, seed initial
        if (interactions.length === 0) {
          generateInitialHistoricalInteractions();
        }
      }
      bootCompletedRef.current = true;
      isBootingRef.current = false;
    }

    bootFirebase();
  }, []);

  // Helper to seed initial sample interactions
  const generateInitialHistoricalInteractions = () => {
    const initialRecords: InteractionRecord[] = [
      {
        id: 'record-init-1',
        timestamp: Date.now() - 3600000,
        simDay: 1,
        simTime: '08:45',
        participants: ['agent-1', 'agent-2'],
        participantNames: ['苏清禾', '陆行川'],
        location: '星光像素咖啡馆',
        topic: '古籍修缮与咖啡烘焙的节奏',
        summary: '陆学者来到咖啡馆点了一杯浓缩，苏清禾询问关于十七世纪星象手稿的考证进展。',
        sentiment: 'positive',
        sentimentScore: 0.6,
        messages: [
          { speakerId: 'agent-1', speakerName: '苏清禾', text: '陆学者，今天依旧是一杯不加糖的热美式？', emotion: 'warm' },
          { speakerId: 'agent-2', speakerName: '陆行川', text: '多谢。今天需要集中精力校对《群星引力志》的羊皮纸残页。', emotion: 'friendly' },
          { speakerId: 'agent-1', speakerName: '苏清禾', text: '别太辛苦了，如果累了随时来闻闻现磨咖啡香。', emotion: 'happy' }
        ],
        relationshipImpact: {
          'agent-1': { deltaAffinity: 5, note: '欣赏陆学者的专注' },
          'agent-2': { deltaAffinity: 6, note: '感谢店长的贴心关照' }
        },
        tags: ['咖啡', '古籍', '晨间问候']
      },
      {
        id: 'record-init-2',
        timestamp: Date.now() - 1800000,
        simDay: 1,
        simTime: '09:20',
        participants: ['agent-3', 'agent-7'],
        participantNames: ['林小满', '姜寻'],
        location: '晨曦喷泉绿地',
        topic: '面包麦香与鲁特琴旋律的协奏',
        summary: '林小满带着刚出炉的核桃面包路过喷泉，分享给正在写生的姜寻，姜寻为新出炉的面包即兴赋诗一首。',
        sentiment: 'positive',
        sentimentScore: 0.8,
        messages: [
          { speakerId: 'agent-3', speakerName: '林小满', text: '姜诗人！尝尝刚出炉的焦糖核桃软欧包，超松软！', emotion: 'happy' },
          { speakerId: 'agent-7', speakerName: '姜寻', text: '麦香在风中飞旋，恰如第三个音阶的颤音，太美妙了。', emotion: 'joy' },
          { speakerId: 'agent-3', speakerName: '林小满', text: '哈哈，你的诗每次都这么浪漫！多吃一个！', emotion: 'friendly' }
        ],
        relationshipImpact: {
          'agent-3': { deltaAffinity: 8, note: '喜欢姜寻的夸奖' },
          'agent-7': { deltaAffinity: 9, note: '被美食与热情深深打动' }
        },
        tags: ['烘焙', '诗歌', '美食分享']
      }
    ];

    setInteractions(initialRecords);
    setCloudSyncCount(initialRecords.length);
    initialRecords.forEach(r => syncInteractionToCloud(r));
  };

  // Evening reflection: at 22:00, pick an agent with memories to synthesize daily reflection
  const triggerEveningReflection = useCallback(() => {
    const candidates = agentsRef.current.filter(a => (a.memories || []).length >= 3);
    if (!candidates.length) return;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    const timer = setTimeout(() => {
      activeTimersRef.current.delete(timer);
      reflectionHandlerRef.current?.(picked.id);
    }, 1200);
    activeTimersRef.current.add(timer);
  }, []);

  // Agent Step & Autonomous Behavior Cycle (Needs -> Goal -> Plan -> Action)
  // Refactored to operate synchronously with memoized callback, avoiding closure re-creations
  const updateAgentsStep = useCallback((stepDay?: number, stepHour?: number, stepMin?: number) => {
    const curDay = stepDay ?? simClockRef.current.day;
    const curHour = stepHour ?? simClockRef.current.hour;
    const curMin = stepMin ?? simClockRef.current.minute;
    const timeStr = `${String(curHour).padStart(2, '0')}:${String(curMin).padStart(2, '0')}`;
    const { buildings, weather, events } = simStateRef.current;
    const previous = agentsRef.current;
    const updated = previous.map(agent => tickAgentAutonomousBehavior(
      agent, SIMULATION_STEP_MINUTES, buildings, previous, curDay, timeStr, weather,
      interactingAgentIdsRef.current.has(agent.id), events
    ));
    agentsRef.current = updated;
    setAgents(updated);

    // Keep network requests outside React state updaters. Even at 5×, the
    // real-time cooldown remains 15 seconds and only one encounter runs at once.
    const now = Date.now();
    if (now - lastAutonomousEncounterRef.current <= 15000 || interactingAgentIdsRef.current.size > 0) return;
    for (let i = 0; i < updated.length; i++) {
      for (let j = i + 1; j < updated.length; j++) {
        const a = updated[i], b = updated[j];
        if (Math.hypot(a.x - b.x, a.y - b.y) < 45 && Math.random() < 0.4) {
          lastAutonomousEncounterRef.current = now;
          void dialogueHandlerRef.current?.(a, b);
          return;
        }
      }
    }
  }, []);

  // Fixed steps share the same elapsed minutes across clock, needs and movement.
  // Pause hidden tabs and cap catch-up work after a slow frame.
  useEffect(() => {
    if (simSpeed === 0) return;

    let rafId: number | null = null;
    let lastTime: number = performance.now();
    let accumulator: number = 0;
    const intervalTime = SIMULATION_STEP_MS / simSpeed;
    const maxSubsteps = 4; // Prevent spiral of death when returning from background tabs

    const loop = (currentTime: number) => {
      // Avoid advancing a large amount of simulation time after returning to the tab.
      const delta = document.hidden ? 0 : Math.min(currentTime - lastTime, 250);
      lastTime = currentTime;
      accumulator += delta;

      let substeps = 0;
      while (accumulator >= intervalTime && substeps < maxSubsteps) {
        accumulator -= intervalTime;
        substeps++;
        logger.recordMetric('simulationTicks', 1);

        // Advance simulation clock
        const previousHour = simClockRef.current.hour;
        simClockRef.current = advanceClock(simClockRef.current, SIMULATION_STEP_MINUTES);
        if (simClockRef.current.hour !== previousHour) {
          setSimDay(simClockRef.current.day);
          const curHour = simClockRef.current.hour;
          setSimHour(curHour);

          // Auto update weather based on time of day
          if (curHour === 6) setWeather('misty_morning');
          else if (curHour === 12) setWeather('clear');
          else if (curHour === 18) setWeather('golden_sunset');
          else if (curHour === 21) setWeather('starry_night');

          // Trigger evening daily reflection check at 22:00
          if (curHour === 22) {
            triggerEveningReflection();
          }
        }
        setSimMinute(simClockRef.current.minute);

        const curDay = simClockRef.current.day;
        const curHour = simClockRef.current.hour;
        const curMin = simClockRef.current.minute;
        const timeStr = `${String(curHour).padStart(2, '0')}:${String(curMin).padStart(2, '0')}`;

        // Economy tick: update dynamic pricing & store inventories
        const { buildings } = simStateRef.current;
        setEconomyState(prevEcon => {
          const { updatedEconomy } = tickTownEconomy(
            prevEcon,
            agentsRef.current,
            buildings,
            curHour,
            curMin,
            curDay,
            timeStr
          );
          return updatedEconomy;
        });

        // Advance agent autonomous movement & check proximity encounters
        updateAgentsStep(curDay, curHour, curMin);
      }

      // If maxSubsteps reached, drop remainder to prevent accumulator lag
      if (substeps >= maxSubsteps) {
        accumulator = 0;
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [simSpeed, updateAgentsStep, triggerEveningReflection]);

  // 3. Trigger Autonomous Dialogue between two agents
  const triggerAutonomousDialogue = async (agentA: Agent, agentB: Agent) => {
    // Mark both agents as occupied
    interactingAgentIdsRef.current.add(agentA.id);
    interactingAgentIdsRef.current.add(agentB.id);
    setAgents(previous => previous.map(agent => agent.id === agentA.id || agent.id === agentB.id ? { ...agent, isMoving: false } : agent));

    // Find nearest building
    let nearestBuilding = buildings[0];
    let minDist = 9999;
    buildings.forEach(b => {
      const d = Math.hypot(b.entranceX - agentA.x, b.entranceY - agentA.y);
      if (d < minDist) {
        minDist = d;
        nearestBuilding = b;
      }
    });

    const bubbleId = `bubble-${Date.now()}`;
    const midX = (agentA.x + agentB.x) / 2;
    const midY = (agentA.y + agentB.y) / 2;

    // Show initial typing bubble on canvas
    const initialBubble: ActiveInteractionBubble = {
      id: bubbleId,
      agentAId: agentA.id,
      agentBId: agentB.id,
      x: midX,
      y: midY,
      topic: '正在萌生交谈...',
      speakerName: agentA.name,
      currentSpeech: `💬 ${agentA.name} 与 ${agentB.name} 驻足相视...`,
      sentiment: 'neutral',
      progress: 0,
      phase: 'generating'
    };

    setActiveBubbles(prev => [...prev, initialBubble]);
    soundEngine.playChime();

    try {
      const timeStr = `${String(simHour).padStart(2, '0')}:${String(simMinute).padStart(2, '0')}`;

      // 1. Retrieve relevant memories for both interacting agents
      const retrievedA = retrieveAgentMemories(agentA, {
        targetAgentId: agentB.id,
        targetAgentName: agentB.name,
        currentLocation: nearestBuilding.name,
        currentActivity: agentA.currentActivity,
        currentSimDay: simDay,
        currentSimTime: timeStr,
        topK: 5
      });

      const retrievedB = retrieveAgentMemories(agentB, {
        targetAgentId: agentA.id,
        targetAgentName: agentA.name,
        currentLocation: nearestBuilding.name,
        currentActivity: agentB.currentActivity,
        currentSimDay: simDay,
        currentSimTime: timeStr,
        topK: 5
      });

      // 2. Call Gemini / server dialogue generation with retrieved memory context
      const recentEventsStr = events.slice(0, 2).map(e => e.title).join('; ');
      const dialogueResult = await requestAgentDialogue(
        agentA, 
        agentB, 
        nearestBuilding, 
        recentEventsStr,
        retrievedA.formattedPromptContext,
        retrievedB.formattedPromptContext
      );

      // Play through dialogue lines sequentially on canvas bubble
      const showLine = (line: typeof dialogueResult.dialogue[number]) => {
        setActiveBubbles(prev => prev.map(b => b.id === bubbleId ? {
          ...b, topic: dialogueResult.topic, speakerName: line.speakerName,
          currentSpeech: line.text, sentiment: dialogueResult.sentiment,
          phase: 'speaking', progress: 100 / dialogueResult.dialogue.length,
          ...(dialogueResult.generation ? { generation: dialogueResult.generation } : {})
        } : b));
      };
      if (dialogueResult.dialogue[0]) showLine(dialogueResult.dialogue[0]);
      let lineIdx = 1;
      const speechInterval = setInterval(() => {
        if (lineIdx < dialogueResult.dialogue.length) {
          const line = dialogueResult.dialogue[lineIdx];
          const lineProgress = (lineIdx + 1) / dialogueResult.dialogue.length * 100;
          setActiveBubbles(prev =>
            prev.map(b =>
              b.id === bubbleId
                ? {
                    ...b,
                    topic: dialogueResult.topic,
                    speakerName: line.speakerName,
                    currentSpeech: line.text,
                    sentiment: dialogueResult.sentiment,
                    progress: lineProgress
                  }
                : b
            )
          );
          lineIdx++;
        } else {
          // Finished conversation
          clearInterval(speechInterval);
          activeTimersRef.current.delete(speechInterval);
          setActiveBubbles(prev => prev.map(bubble => bubble.id === bubbleId ? { ...bubble, phase: 'finished', progress: 100 } : bubble));

          // Remove bubble after a short pause
          const cleanupTimer = setTimeout(() => {
            activeTimersRef.current.delete(cleanupTimer);
            setActiveBubbles(prev => prev.filter(b => b.id !== bubbleId));
            interactingAgentIdsRef.current.delete(agentA.id);
            interactingAgentIdsRef.current.delete(agentB.id);
          }, 2000);
          activeTimersRef.current.add(cleanupTimer);
        }
      }, Math.max(700, 1600 / Math.max(1, simStateRef.current.simSpeed)));
      activeTimersRef.current.add(speechInterval);

      // Construct complete InteractionRecord
      // 2. Compute Multi-Dimensional Relationship 2.0 Bilateral Evolution
      const relOutcome = updateRelationshipOnInteraction({
        agentA,
        agentB,
        sentiment: dialogueResult.sentiment,
        sentimentScore: dialogueResult.sentimentScore,
        topic: dialogueResult.topic,
        summary: dialogueResult.summary,
        locationName: nearestBuilding.name,
        simDay,
        simTime: timeStr,
        importance: dialogueResult.importance,
        emotionalIntensity: dialogueResult.emotionalIntensity,
        suggestedDeltaAtoB: dialogueResult.affinityDeltaAtoB,
        suggestedDeltaBtoA: dialogueResult.affinityDeltaBtoA
      });

      // 2.2 Execute Bilateral Knowledge / Secret / Rumor propagation & mutation
      const knowledgeExchange = processDialogueKnowledgeExchange(
        agentA,
        agentB,
        knowledgeItems,
        relOutcome.updatedRelAtoB,
        relOutcome.updatedRelBtoA,
        simDay,
        timeStr,
        nearestBuilding.name
      );
      setKnowledgeItems(knowledgeExchange.updatedKnowledgeBase);

      const newRecord: InteractionRecord = {
        id: `interaction-${Date.now()}`,
        timestamp: Date.now(),
        simDay,
        simTime: timeStr,
        participants: [agentA.id, agentB.id],
        participantNames: [agentA.name, agentB.name],
        location: nearestBuilding.name,
        topic: dialogueResult.topic,
        summary: dialogueResult.summary,
        sentiment: dialogueResult.sentiment,
        sentimentScore: dialogueResult.sentimentScore,
        messages: dialogueResult.dialogue,
        relationshipImpact: {
          [agentA.id]: { 
            deltaAffinity: calculateAffinityProjection(relOutcome.updatedRelAtoB) - (agentA.affinity?.[agentB.id] ?? 0),
            stage: relOutcome.updatedRelAtoB.relationshipStage,
            dynamic: relOutcome.updatedRelAtoB.dominantDynamic,
            ...(relOutcome.stageTransitionAtoB ? { stageTransition: relOutcome.stageTransitionAtoB } : {}),
            note: dialogueResult.memoryA 
          },
          [agentB.id]: { 
            deltaAffinity: calculateAffinityProjection(relOutcome.updatedRelBtoA) - (agentB.affinity?.[agentA.id] ?? 0),
            stage: relOutcome.updatedRelBtoA.relationshipStage,
            dynamic: relOutcome.updatedRelBtoA.dominantDynamic,
            ...(relOutcome.stageTransitionBtoA ? { stageTransition: relOutcome.stageTransitionBtoA } : {}),
            note: dialogueResult.memoryB 
          }
        },
        tags: [nearestBuilding.name, dialogueResult.sentiment],
        ...(dialogueResult.generation ? { generation: dialogueResult.generation } : {})
      };

      // Update State: Add Interaction Record
      setInteractions(prev => [newRecord, ...prev]);

      // 3. Create standardized episodic memories and apply consolidation & pruning
      const newMemA = createAgentMemory({
        type: 'episodic',
        simDay,
        simTime: timeStr,
        content: dialogueResult.memoryA,
        importance: dialogueResult.importance || Math.min(10, Math.max(3, Math.round(Math.abs(dialogueResult.sentimentScore) * 8 + 3))),
        emotionalIntensity: dialogueResult.emotionalIntensity || Math.min(10, Math.max(3, Math.round(Math.abs(dialogueResult.sentimentScore) * 7 + 3))),
        relatedAgentIds: [agentB.id],
        relatedAgentNames: [agentB.name],
        tags: [nearestBuilding.name, dialogueResult.sentiment],
        sentiment: dialogueResult.sentiment
      });

      const newMemB = createAgentMemory({
        type: 'episodic',
        simDay,
        simTime: timeStr,
        content: dialogueResult.memoryB,
        importance: dialogueResult.importance || Math.min(10, Math.max(3, Math.round(Math.abs(dialogueResult.sentimentScore) * 8 + 3))),
        emotionalIntensity: dialogueResult.emotionalIntensity || Math.min(10, Math.max(3, Math.round(Math.abs(dialogueResult.sentimentScore) * 7 + 3))),
        relatedAgentIds: [agentA.id],
        relatedAgentNames: [agentA.name],
        tags: [nearestBuilding.name, dialogueResult.sentiment],
        sentiment: dialogueResult.sentiment
      });

      setAgents(prev =>
        prev.map(a => {
          if (a.id === agentA.id) {
            const updatedRels = { ...(a.relationships || {}) };
            updatedRels[agentB.id] = relOutcome.updatedRelAtoB;
            const newAffinity = calculateAffinityProjection(relOutcome.updatedRelAtoB);

            const needsOutcome = applyDialogueOutcomeToNeeds(a, dialogueResult.sentiment, dialogueResult.sentimentScore);

            const updatedHistory = [
              ...(a.moodHistory || []),
              { simTime: timeStr, mood: needsOutcome.psychologicalNeeds.mood, stress: needsOutcome.psychologicalNeeds.stress }
            ].slice(-10);

            const updatedMemories = consolidateAndPruneMemories([newMemA, ...(a.memories || [])], simDay, 35);
            const unreflected = (a.unreflectedMemoryCount || 0) + 1;

            const updatedA: Agent = {
              ...a,
              ...needsOutcome,
              currentThought: `关于“${dialogueResult.topic}”，${agentB.name}的见解让我印象颇深。`,
              relationships: updatedRels,
              affinity: { ...a.affinity, [agentB.id]: newAffinity },
              memories: updatedMemories,
              moodHistory: updatedHistory,
              unreflectedMemoryCount: unreflected
            };
            syncAgentStateToCloud(updatedA);

            // If accumulated enough unreflected memories, schedule reflection
            if (unreflected >= 4) {
              setTimeout(() => handleTriggerAgentReflection(a.id), 3000);
            }

            return updatedA;
          }

          if (a.id === agentB.id) {
            const updatedRels = { ...(a.relationships || {}) };
            updatedRels[agentA.id] = relOutcome.updatedRelBtoA;
            const newAffinity = calculateAffinityProjection(relOutcome.updatedRelBtoA);

            const needsOutcome = applyDialogueOutcomeToNeeds(a, dialogueResult.sentiment, dialogueResult.sentimentScore);

            const updatedHistory = [
              ...(a.moodHistory || []),
              { simTime: timeStr, mood: needsOutcome.psychologicalNeeds.mood, stress: needsOutcome.psychologicalNeeds.stress }
            ].slice(-10);

            const updatedMemories = consolidateAndPruneMemories([newMemB, ...(a.memories || [])], simDay, 35);
            const unreflected = (a.unreflectedMemoryCount || 0) + 1;

            const updatedB: Agent = {
              ...a,
              ...needsOutcome,
              currentThought: `和${agentA.name}交流了“${dialogueResult.topic}”，收获不少。`,
              relationships: updatedRels,
              affinity: { ...a.affinity, [agentA.id]: newAffinity },
              memories: updatedMemories,
              moodHistory: updatedHistory,
              unreflectedMemoryCount: unreflected
            };
            syncAgentStateToCloud(updatedB);

            // If accumulated enough unreflected memories, schedule reflection
            if (unreflected >= 4) {
              setTimeout(() => handleTriggerAgentReflection(a.id), 5000);
            }

            return updatedB;
          }

          return a;
        })
      );

      // Async Persistent Save to Firebase Firestore!
      syncInteractionToCloud(newRecord);
      setCloudSyncCount(c => c + 1);
      const formatChange = (delta: number) => `${delta > 0 ? '+' : ''}${delta}`;
      addGameToast('对话已记录', `${agentA.name} 好感 ${formatChange(newRecord.relationshipImpact[agentA.id].deltaAffinity)} · ${agentB.name} 好感 ${formatChange(newRecord.relationshipImpact[agentB.id].deltaAffinity)}`, '💬', '#9be0c9');

    } catch (err) {
      console.error('Encounter execution error:', err);
      setActiveBubbles(prev => prev.filter(b => b.id !== bubbleId));
      interactingAgentIdsRef.current.delete(agentA.id);
      interactingAgentIdsRef.current.delete(agentB.id);
    }
  };

  dialogueHandlerRef.current = triggerAutonomousDialogue;

  // 3.5. Trigger Agent Long-Term Reflection & Memory Consolidation
  const handleTriggerAgentReflection = async (agentId: string) => {
    const target = agents.find(a => a.id === agentId);
    if (!target) return;

    setIsReflectingAgentId(agentId);
    try {
      const timeStr = `${String(simHour).padStart(2, '0')}:${String(simMinute).padStart(2, '0')}`;
      const recentMemories = (target.memories || []).slice(0, 10);
      const reflectionResult = await requestAgentReflection(target, recentMemories, simDay, timeStr);

      setAgents(prev =>
        prev.map(a => {
          if (a.id === agentId) {
            const updated = applyReflectionToAgent(a, reflectionResult, simDay, timeStr);
            syncAgentStateToCloud(updated);
            addGameToast('✨ 顿悟新记忆', `${target.name} 领悟了新的长期心智认知`, '🌟', '#ffc97a');
            return updated;
          }
          return a;
        })
      );
      soundEngine.playChime();
    } catch (err) {
      console.warn('Agent reflection error:', err);
    } finally {
      setIsReflectingAgentId(null);
    }
  };

  reflectionHandlerRef.current = handleTriggerAgentReflection;

  // 4. Force Dialogue Trigger (e.g. from UI inspector)
  const handleForceInteraction = (agentId: string) => {
    const agentA = agents.find(a => a.id === agentId);
    if (!agentA) return;
    if (interactingAgentIdsRef.current.has(agentId)) return;

    // Choose the nearest available neighbor for a predictable intervention.
    const otherAgents = agents.filter(a => a.id !== agentId && !interactingAgentIdsRef.current.has(a.id));
    if (otherAgents.length === 0) return;
    const agentB = otherAgents.reduce((nearest, candidate) => Math.hypot(candidate.x - agentA.x, candidate.y - agentA.y) < Math.hypot(nearest.x - agentA.x, nearest.y - agentA.y) ? candidate : nearest);

    // Move them toward each other
    setAgents(prev =>
      prev.map(a => {
        if (a.id === agentA.id) return { ...a, targetX: agentB.x, targetY: agentB.y };
        if (a.id === agentB.id) return { ...a, targetX: agentA.x, targetY: agentA.y };
        return a;
      })
    );

    triggerAutonomousDialogue(agentA, agentB);
  };

  // 5. Trigger Custom Event Intervention
  const handleTriggerEvent = (event: TownEvent, agentReactions: any[]) => {
    event = { ...event, simDay };
    setEvents(prev => [event, ...prev]);
    syncEventToCloud(event);
    addGameToast('⚡ 奇遇降临', `【${event.title}】正在席卷小镇！`, '⚡', '#f7a76c');

    // Apply mood/stress updates to agents
    setAgents(prev =>
      prev.map(a => {
        const reaction = agentReactions?.find(r => r.agentId === a.id);
        if (reaction) {
          const currentMood = a.psychologicalNeeds?.mood ?? (a.state.mood < 0 ? (a.state.mood + 100) / 2 : a.state.mood);
          const currentStress = a.psychologicalNeeds?.stress ?? a.state.stress;
          const newMood = Math.max(0, Math.min(100, Math.round(currentMood + (reaction.moodDelta || 0))));
          const newStress = Math.max(0, Math.min(100, Math.round(currentStress + (reaction.stressDelta || 0))));
          
          const updatedPsy = {
            ...(a.psychologicalNeeds || { mood: 75, stress: 18, fun: 60, comfort: 80 }),
            mood: newMood,
            stress: newStress,
          };
          const updatedNeeds = {
            ...a.needs,
            mood: newMood,
            stress: newStress,
          };
          const updated: Agent = {
            ...a,
            psychologicalNeeds: updatedPsy,
            needs: updatedNeeds,
            state: { ...a.state, mood: newMood, stress: newStress },
            currentThought: reaction.reactionThought || a.currentThought
          };
          syncAgentStateToCloud(updated);
          return updated;
        }
        return a;
      })
    );

    // Register eyewitness knowledge: ONLY residents present at event location discover this!
    const targetBuildingObj = buildings.find(b => b.id === event.targetBuilding);
    const eyewitnessResult = registerEventEyewitnessKnowledge(
      event,
      agents,
      knowledgeItems,
      simDay,
      `${String(simHour).padStart(2, '0')}:${String(simMinute).padStart(2, '0')}`,
      targetBuildingObj
    );
    setKnowledgeItems(eyewitnessResult.updatedKnowledgeBase);

    // If event has a target building, send residents there!
    if (event.targetBuilding) {
      const targetB = buildings.find(b => b.id === event.targetBuilding);
      if (targetB) {
        setAgents(prev =>
          prev.map((a, idx) => {
            if (idx < 4) {
              return {
                ...a,
                targetX: targetB.entranceX + (Math.random() * 30 - 15),
                targetY: targetB.entranceY + (Math.random() * 30 - 15)
              };
            }
            return a;
          })
        );
      }
    }
  };

  // 6. Knowledge System Handlers
  const handleInjectKnowledge = (newKnowledge: AgentKnowledge) => {
    setKnowledgeItems(prev => [newKnowledge, ...prev]);
    addGameToast('💡 闻获新传闻', `【${newKnowledge.subject}】开始在小镇蔓延`, '💡', '#73c7e8');
  };

  const handleDebunkRumor = (knowledgeId: string, debunkNote: string) => {
    setKnowledgeItems(prev => prev.map(k => {
      if (k.id === knowledgeId) {
        return {
          ...k,
          isDebunked: true,
          debunkNote,
          accuracy: 95,
          infoType: 'knowledge' as const
        };
      }
      return k;
    }));
  };

  // 6. Agent Configuration Studio Actions
  const handleSaveAgent = (updated: Agent) => {
    setAgents(prev => prev.map(a => (a.id === updated.id ? updated : a)));
    syncAgentStateToCloud(updated);
  };

  const handleCreateAgent = (newAgent: Agent) => {
    setAgents(prev => [...prev, newAgent]);
    syncAgentStateToCloud(newAgent);
  };

  const handleDeleteAgent = (id: string) => {
    setAgents(prev => prev.filter(a => a.id !== id));
  };

  // Skip one hour shortcut
  const handleSkipHour = () => {
    const next = advanceClock(simClockRef.current, 60);
    simClockRef.current = next;
    setSimDay(next.day);
    setSimHour(next.hour);
    setSimMinute(next.minute);
    updateAgentsStep(next.day, next.hour, next.minute);
    soundEngine.playClick();
  };

  // Reset simulation time to Day 1
  const handleResetSimulation = () => {
    if (window.confirm('确定要将小镇时间重置回到第 1 天吗？现有居民档案与交互历史仍将保留。')) {
      simClockRef.current = { day: 1, hour: 8, minute: 0 };
      setSimDay(1);
      setSimHour(8);
      setSimMinute(0);
      setWeather('clear');
      syncSimulationStateToCloud({ simDay: 1, simHour: 8, simMinute: 0, weather: 'clear' });
      soundEngine.playClick();
    }
  };

  // Weather cycle
  const handleCycleWeather = () => {
    const list: ('clear' | 'golden_sunset' | 'rainy' | 'starry_night' | 'misty_morning')[] = [
      'clear',
      'golden_sunset',
      'rainy',
      'starry_night',
      'misty_morning'
    ];
    const next = list[(list.indexOf(weather) + 1) % list.length];
    setWeather(next);
    soundEngine.playClick();
  };

  return (
    <div className="town-app flex flex-col w-full overflow-hidden">
      {/* Top Global Navigation Bar */}
      <HeaderNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        simDay={simDay}
        simHour={simHour}
        simMinute={simMinute}
        simSpeed={simSpeed}
        onSetSpeed={setSimSpeed}
        onSkipHour={handleSkipHour}
        onResetSimulation={handleResetSimulation}
        weather={weather}
        onCycleWeather={handleCycleWeather}
        cloudSyncCount={cloudSyncCount}
        isCloudSynced={isCloudReady}
        onTriggerAnalyze={() => setCurrentTab('analyzer')}
      />

      {/* Main Tab View Port */}
      <main className="flex-1 min-h-0 relative overflow-hidden">
        <Suspense fallback={<div className="town-loading" role="status">正在打开…</div>}>
        {currentTab === 'canvas' && (
          <TownWorkspace
            agents={agents} buildings={buildings} interactions={interactions} events={events} observations={observations}
            selectedAgentId={selectedAgentId} onSelectAgent={setSelectedAgentId}
            selectedBuildingId={selectedBuildingId} onSelectBuilding={setSelectedBuildingId}
            activeInteractions={activeBubbles} simDay={simDay} simHour={simHour} simMinute={simMinute}
            simSpeed={simSpeed} weather={weather}
            onOpenAgent={id => { setSelectedAgentId(id); setCurrentTab('evolution'); }}
            onForceInteraction={handleForceInteraction}
            onOpenDialogues={() => setCurrentTab('dialogues')}
          />
        )}

        {currentTab === 'dashboard' && (
          <DashboardOverview
            agents={agents}
            buildings={buildings}
            interactions={interactions}
            latestAnalysis={latestAnalysis}
            onSelectAgent={id => {
              setSelectedAgentId(id);
              setCurrentTab('evolution');
            }}
            onSelectBuilding={id => {
              setSelectedBuildingId(id);
              setCurrentTab('canvas');
            }}
            onNavigateToTab={setCurrentTab}
            onOpenFineTuningExport={() => setIsExportModalOpen(true)}
          />
        )}

        {currentTab === 'economy' && (
          <TownEconomyPanel
            economyState={economyState}
            agents={agents}
            buildings={buildings}
            simDay={simDay}
            simHour={simHour}
            simMinute={simMinute}
            simTime={`${String(simHour).padStart(2, '0')}:${String(simMinute).padStart(2, '0')}`}
            onUpdateEconomy={(updatedEconomy, updatedAgents, newTx) => {
              setEconomyState(updatedEconomy);
              setAgents(updatedAgents);
              if (newTx) {
                syncEconomyStateToCloud(updatedEconomy);
              }
            }}
            onAddTownEvent={(event) => {
              setEvents(prev => [event, ...prev]);
              syncEventToCloud(event);
            }}
          />
        )}

        {currentTab === 'dialogues' && (
          <LiveInteractionsView
            interactions={interactions}
            agents={agents}
            onSelectAgent={id => {
              setSelectedAgentId(id);
              setCurrentTab('evolution');
            }}
            onOpenFineTuningExport={() => setIsExportModalOpen(true)}
          />
        )}

        {currentTab === 'evolution' && (
          <AgentEvolutionView
            agents={agents}
            buildings={buildings}
            selectedAgentId={selectedAgentId || agents[0]?.id}
            onSelectAgent={setSelectedAgentId}
            simDay={simDay}
            simTime={`${String(simHour).padStart(2, '0')}:${String(simMinute).padStart(2, '0')}`}
            weather={weather}
            onTriggerReflection={handleTriggerAgentReflection}
            isReflecting={isReflectingAgentId === (selectedAgentId || agents[0]?.id)}
            knowledgeItems={knowledgeItems}
          />
        )}

        {currentTab === 'information' && (
          <InformationNetworkView
            knowledgeItems={knowledgeItems}
            agents={agents}
            simDay={simDay}
            simTime={`${String(simHour).padStart(2, '0')}:${String(simMinute).padStart(2, '0')}`}
            onInjectKnowledge={handleInjectKnowledge}
            onDebunkRumor={handleDebunkRumor}
            onSelectAgent={id => {
              setSelectedAgentId(id);
              setCurrentTab('evolution');
            }}
          />
        )}

        {currentTab === 'personas' && (
          <AgentPersonaStudio
            agents={agents}
            onSaveAgent={handleSaveAgent}
            onCreateAgent={handleCreateAgent}
            onDeleteAgent={handleDeleteAgent}
          />
        )}

        {currentTab === 'events' && (
          <TownEventsEngine
            buildings={buildings}
            agents={agents}
            eventsHistory={events}
            onTriggerEvent={handleTriggerEvent}
          />
        )}

        {currentTab === 'analyzer' && (
          <TownAnalyzerView
            currentAnalysis={latestAnalysis}
            interactions={interactions}
            agents={agents}
            events={events}
            onUpdateAnalysis={analysis => {
              setLatestAnalysis(analysis);
              syncAnalysisToCloud(analysis);
            }}
          />
        )}

        {currentTab === 'quota' && (
          <QuotaCapacityPanel
            onRefreshFirestore={() => {
              fetchCloudInteractions().then(list => {
                if (list?.length) setInteractions(list);
              });
            }}
          />
        )}

        </Suspense>
        {/* Floating RPG Game Feedback Toasts */}
        <div aria-live="polite" className="fixed bottom-6 right-6 z-50 pointer-events-none space-y-2.5 max-w-sm">
          {gameToasts.map(toast => (
            <div
              key={toast.id}
              className="pointer-events-auto game-panel-highlight px-4 py-2.5 shadow-2xl flex items-center gap-3 animate-fadeIn border border-[#ffc97a]/40"
            >
              <span className="text-xl shrink-0">{toast.icon}</span>
              <div className="text-xs">
                <div className="font-bold text-[#ffc97a] tracking-wide text-xs">{toast.badge}</div>
                <div className="text-[#f8f2e7] text-[11px] leading-snug mt-0.5">{toast.text}</div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Model Fine-Tuning Exporter Modal */}
      {isExportModalOpen && <Suspense fallback={null}><FineTuningExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        interactions={interactions}
        agents={agents}
      /></Suspense>}

      {/* Development Diagnostics HUD (Bottom-Left) */}
      {import.meta.env.DEV && new URLSearchParams(window.location.search).get('debug') === '1' && <DebugMetricsHUD
        agentCount={agents.length}
        activeBubblesCount={activeBubbles.length}
        simDay={simDay}
        simHour={simHour}
        simMinute={simMinute}
        isCloudReady={isCloudReady}
      />}
    </div>
  );
}
