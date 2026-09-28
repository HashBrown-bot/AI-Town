import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Agent, 
  Building, 
  InteractionRecord, 
  TownEvent, 
  TownAnalysis, 
  ActiveInteractionBubble 
} from './types/town';
import { 
  INITIAL_AGENTS, 
  INITIAL_BUILDINGS, 
  INITIAL_EVENTS, 
  INITIAL_ANALYSIS 
} from './data/initialTownData';
import { TownCanvas } from './components/TownCanvas';
import { HeaderNav, TabKey } from './components/HeaderNav';
import { DashboardOverview } from './components/DashboardOverview';
import { LiveInteractionsView } from './components/LiveInteractionsView';
import { AgentEvolutionView } from './components/AgentEvolutionView';
import { AgentPersonaStudio } from './components/AgentPersonaStudio';
import { TownEventsEngine } from './components/TownEventsEngine';
import { TownAnalyzerView } from './components/TownAnalyzerView';
import { AgentDetailModal } from './components/AgentDetailModal';
import { FineTuningExportModal } from './components/FineTuningExportModal';
import { QuotaCapacityPanel } from './components/QuotaCapacityPanel';
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
  fetchCloudAnalysis
} from './services/firebase';
import { requestAgentDialogue } from './services/aiTownService';
import { soundEngine } from './utils/audioSystem';

// Local Storage Keys for Instant Zero-Flash Hydration
const STORAGE_SIM_STATE = 'aetheria_sim_state_v2';
const STORAGE_AGENTS = 'aetheria_agents_v2';
const STORAGE_INTERACTIONS = 'aetheria_interactions_v2';
const STORAGE_EVENTS = 'aetheria_events_v2';

function loadStoredSimState() {
  console.group('[Aetheria 调试日志] 1. loadStoredSimState: 开始加载本地存储状态');
  console.log('读取 LocalStorage 键名:', STORAGE_SIM_STATE);
  try {
    const item = localStorage.getItem(STORAGE_SIM_STATE);
    console.log('LocalStorage 原始字符串值:', item);
    if (item) {
      const data = JSON.parse(item);
      console.log('JSON.parse 解析后对象:', data);
      if (typeof data.simDay === 'number' && data.simDay >= 1) {
        const loadedState = {
          simDay: data.simDay,
          simHour: typeof data.simHour === 'number' ? data.simHour : 9,
          simMinute: typeof data.simMinute === 'number' ? data.simMinute : 15,
          weather: data.weather || 'clear',
        };
        console.log('✅ 成功从 LocalStorage 恢复模拟状态:', loadedState);
        console.groupEnd();
        return loadedState;
      } else {
        console.warn('⚠️ LocalStorage 中 simDay 校验失败 (非数值或小于1):', data.simDay);
      }
    } else {
      console.log('ℹ️ LocalStorage 为空，尚无本地缓存记录');
    }
  } catch (err) {
    console.error('❌ 解析 LocalStorage 发生异常:', err);
  }
  const defaultState = { simDay: 1, simHour: 9, simMinute: 15, weather: 'clear' as const };
  console.log('ℹ️ 使用默认初始状态:', defaultState);
  console.groupEnd();
  return defaultState;
}

function loadStoredAgents(): Agent[] {
  try {
    const item = localStorage.getItem(STORAGE_AGENTS);
    if (item) {
      const parsed = JSON.parse(item);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('Failed to load local agents:', err);
  }
  return INITIAL_AGENTS;
}

function loadStoredInteractions(): InteractionRecord[] | null {
  try {
    const item = localStorage.getItem(STORAGE_INTERACTIONS);
    if (item) {
      const parsed = JSON.parse(item);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('Failed to load local interactions:', err);
  }
  return null;
}

export default function App() {
  // Navigation
  const [currentTab, setCurrentTab] = useState<TabKey>('canvas');

  // Simulation State with persistent local initial state
  const initialSim = loadStoredSimState();
  const [simDay, setSimDay] = useState<number>(initialSim.simDay);
  const [simHour, setSimHour] = useState<number>(initialSim.simHour);
  const [simMinute, setSimMinute] = useState<number>(initialSim.simMinute);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 0=pause, 1=1x, 2=2x, 5=5x
  const [weather, setWeather] = useState<'clear' | 'golden_sunset' | 'rainy' | 'starry_night' | 'misty_morning'>(initialSim.weather as any);

  // Core Data Collections
  const [agents, setAgents] = useState<Agent[]>(loadStoredAgents);
  const [buildings] = useState<Building[]>(INITIAL_BUILDINGS);
  const [interactions, setInteractions] = useState<InteractionRecord[]>(() => loadStoredInteractions() || []);
  const [events, setEvents] = useState<TownEvent[]>(INITIAL_EVENTS);
  const [latestAnalysis, setLatestAnalysis] = useState<TownAnalysis>(INITIAL_ANALYSIS);

  // Active Conversations on Canvas
  const [activeBubbles, setActiveBubbles] = useState<ActiveInteractionBubble[]>([]);

  // Selection / Modal States
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Cloud Firestore Sync State
  const [cloudSyncCount, setCloudSyncCount] = useState<number>(0);
  const [isCloudReady, setIsCloudReady] = useState<boolean>(false);

  // Ref to track interacting agent IDs to prevent double encounters
  const interactingAgentIdsRef = useRef<Set<string>>(new Set());

  // Ref to throttle autonomous dialogue encounters to prevent rapid API exhaustion
  const lastAutonomousEncounterRef = useRef<number>(0);

  // Debounce ref for syncing simulation clock to cloud
  const lastCloudClockSyncRef = useRef<number>(0);

  // 1. Persist clock and weather immediately to LocalStorage and debounced to Firestore
  useEffect(() => {
    localStorage.setItem(STORAGE_SIM_STATE, JSON.stringify({ simDay, simHour, simMinute, weather }));

    // Sync to Firestore every 30 simulated seconds or whenever the hour advances
    const now = Date.now();
    if (isCloudReady && (now - lastCloudClockSyncRef.current > 15000 || simMinute === 0)) {
      lastCloudClockSyncRef.current = now;
      syncSimulationStateToCloud({ simDay, simHour, simMinute, weather });
    }
  }, [simDay, simHour, simMinute, weather, isCloudReady]);

  // Persist agents to LocalStorage whenever modified
  useEffect(() => {
    localStorage.setItem(STORAGE_AGENTS, JSON.stringify(agents));
  }, [agents]);

  // Persist interactions to LocalStorage whenever modified
  useEffect(() => {
    if (interactions.length > 0) {
      localStorage.setItem(STORAGE_INTERACTIONS, JSON.stringify(interactions.slice(0, 100)));
    }
  }, [interactions]);

  // Synchronize on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.setItem(STORAGE_SIM_STATE, JSON.stringify({ simDay, simHour, simMinute, weather }));
      syncSimulationStateToCloud({ simDay, simHour, simMinute, weather });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [simDay, simHour, simMinute, weather]);

  // 2. Initial Firebase boot, cloud hydration and connection test
  useEffect(() => {
    async function bootFirebase() {
      console.group('[Aetheria 调试日志] 2. bootFirebase: 启动云端同步与状态水合');
      console.log('正在检测 Firebase Firestore 连接...');
      const connected = await testConnection();
      setIsCloudReady(connected);
      console.log('Firebase 连接测试结果:', connected ? '✅ 已连接 (Online)' : '❌ 无法连接 (Offline)');

      if (connected) {
        console.log('Firebase Firestore connection verified.');

        // 1. Fetch persistent simulation state from Cloud
        try {
          console.group('[Aetheria 调试日志] 2.1 检查 simulation_state (小镇时钟与天数)');
          console.log('正在调用 fetchSimulationStateFromCloud()...');
          const cloudSim = await fetchSimulationStateFromCloud();
          console.log('Firestore 返回的 cloudSim 数据:', cloudSim);
          console.log('此时 App 组件内存中的本地时钟状态:', {
            simDay,
            simHour,
            simMinute,
            weather
          });

          if (cloudSim && typeof cloudSim.simDay === 'number') {
            console.log('云端存在 simulation_state 记录: simDay =', cloudSim.simDay, ', simHour =', cloudSim.simHour, ', updatedAt =', cloudSim.updatedAt);
            
            // Compare local simulation progress vs cloud simulation progress
            const localTotalSimMinutes = simDay * 24 * 60 + simHour * 60 + simMinute;
            const cloudTotalSimMinutes = cloudSim.simDay * 24 * 60 + cloudSim.simHour * 60 + cloudSim.simMinute;

            console.log('时钟进度对比 (换算为累计分钟): 本地 =', localTotalSimMinutes, 'vs 云端 =', cloudTotalSimMinutes);

            if (cloudTotalSimMinutes > localTotalSimMinutes) {
              console.warn('⚠️ 【触发状态覆盖】检测到云端进度领先于本地，正在从云端覆盖本地状态:', {
                原本地: { simDay, simHour, simMinute },
                覆盖为云端: { simDay: cloudSim.simDay, simHour: cloudSim.simHour, simMinute: cloudSim.simMinute }
              });
              setSimDay(cloudSim.simDay);
              setSimHour(cloudSim.simHour);
              setSimMinute(cloudSim.simMinute);
              if (cloudSim.weather) setWeather(cloudSim.weather as any);
            } else if (localTotalSimMinutes > cloudTotalSimMinutes) {
              console.log('ℹ️ 【保留本地状态】本地进度领先于云端 (本地更新)，将本地时钟同步覆盖至云端...');
              syncSimulationStateToCloud({ simDay, simHour, simMinute, weather });
            } else {
              console.log('✅ 【状态一致】本地进度与云端进度完全一致 (simDay:', simDay, ')，无需覆盖变更。');
            }
          } else {
            console.log('ℹ️ 云端暂无 simulation_state 记录，以当前本地状态作为初值上传云端:', {
              simDay,
              simHour,
              simMinute,
              weather
            });
            syncSimulationStateToCloud({ simDay, simHour, simMinute, weather });
          }
          console.groupEnd();
        } catch (e) {
          console.error('❌ 获取或同步云端 simulation_state 异常:', e);
          console.groupEnd();
        }

        // 2. Fetch persistent interactions from Cloud
        try {
          console.group('[Aetheria 调试日志] 2.2 恢复交互记录 (interactions)');
          console.log('正在从 Firestore 拉取 interactions...');
          const cloudInteractions = await fetchCloudInteractions();
          console.log('从 Firestore 获取到的交互记录数量:', cloudInteractions?.length || 0);
          if (cloudInteractions && cloudInteractions.length > 0) {
            setInteractions(cloudInteractions);
            setCloudSyncCount(cloudInteractions.length);
          } else if (interactions.length === 0) {
            console.log('本地与云端均无交互记录，生成初始演示记录...');
            generateInitialHistoricalInteractions();
          }
          console.groupEnd();
        } catch (e) {
          console.warn('Could not fetch cloud interactions:', e);
          console.groupEnd();
        }

        // 3. Fetch persistent agents from Cloud
        try {
          console.group('[Aetheria 调试日志] 2.3 恢复居民状态 (agents)');
          const cloudAgents = await fetchCloudAgents();
          console.log('从 Firestore 获取到的居民状态数量:', cloudAgents?.length || 0);
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
          console.groupEnd();
        } catch (e) {
          console.warn('Could not fetch cloud agents:', e);
          console.groupEnd();
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
          console.warn('Could not fetch cloud events:', e);
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
          console.warn('Could not fetch cloud analysis:', e);
        }
      } else {
        // If offline and no interactions, seed initial
        if (interactions.length === 0) {
          generateInitialHistoricalInteractions();
        }
      }
      console.groupEnd();
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

  // 2. Main Simulation Tick Loop (Advances clock & agent movement)
  useEffect(() => {
    if (simSpeed === 0) return;

    const intervalTime = 1000 / simSpeed;
    const timer = setInterval(() => {
      // Advance clock
      setSimMinute(prevMin => {
        let nextMin = prevMin + 5;
        if (nextMin >= 60) {
          nextMin = 0;
          setSimHour(prevHour => {
            let nextHour = prevHour + 1;
            if (nextHour >= 24) {
              nextHour = 0;
              setSimDay(d => d + 1);
            }
            // Auto update weather based on time of day
            if (nextHour === 6) setWeather('misty_morning');
            else if (nextHour === 12) setWeather('clear');
            else if (nextHour === 18) setWeather('golden_sunset');
            else if (nextHour === 21) setWeather('starry_night');

            return nextHour;
          });
        }
        return nextMin;
      });

      // Advance agent autonomous movement & check proximity encounters
      updateAgentsStep();
    }, intervalTime);

    return () => clearInterval(timer);
  }, [simSpeed, buildings]);

  // Agent Step & Encounter Detection
  const updateAgentsStep = useCallback(() => {
    setAgents(prevAgents => {
      const updated = prevAgents.map(agent => {
        // If agent is chatting, stay still
        if (interactingAgentIdsRef.current.has(agent.id)) {
          return { ...agent, isMoving: false };
        }

        let newX = agent.x;
        let newY = agent.y;
        let newTargetX = agent.targetX;
        let newTargetY = agent.targetY;
        let isMoving = false;
        let direction = agent.direction;

        const dist = Math.hypot(newTargetX - newX, newTargetY - newY);

        if (dist > 4) {
          isMoving = true;
          const dx = (newTargetX - newX) / dist;
          const dy = (newTargetY - newY) / dist;

          newX += dx * agent.speed * 2.2;
          newY += dy * agent.speed * 2.2;

          if (Math.abs(dx) > Math.abs(dy)) {
            direction = dx > 0 ? 'right' : 'left';
          } else {
            direction = dy > 0 ? 'down' : 'up';
          }
        } else {
          // Reached target destination: pick a new wander target nearby or visit another building
          if (Math.random() < 0.25) {
            // Chance to visit a different building entrance
            const randomBuilding = buildings[Math.floor(Math.random() * buildings.length)];
            newTargetX = randomBuilding.entranceX + (Math.random() * 40 - 20);
            newTargetY = randomBuilding.entranceY + (Math.random() * 20 - 10);
          } else {
            // Wander around current area
            newTargetX = Math.max(100, Math.min(950, newX + (Math.random() * 120 - 60)));
            newTargetY = Math.max(120, Math.min(850, newY + (Math.random() * 120 - 60)));
          }
        }

        return {
          ...agent,
          x: newX,
          y: newY,
          targetX: newTargetX,
          targetY: newTargetY,
          direction,
          isMoving
        };
      });

      // Proximity encounter trigger: check if two agents are close (< 45px) and not chatting
      // Throttle autonomous dialogues to at least 15s apart so quota is preserved and simulation feels natural
      const now = Date.now();
      if (now - lastAutonomousEncounterRef.current > 15000 && activeBubbles.length === 0) {
        for (let i = 0; i < updated.length; i++) {
          for (let j = i + 1; j < updated.length; j++) {
            const a = updated[i];
            const b = updated[j];

            if (
              !interactingAgentIdsRef.current.has(a.id) &&
              !interactingAgentIdsRef.current.has(b.id)
            ) {
              const distance = Math.hypot(a.x - b.x, a.y - b.y);
              if (distance < 45 && Math.random() < 0.4) {
                lastAutonomousEncounterRef.current = now;
                // Trigger autonomous encounter!
                triggerAutonomousDialogue(a, b);
                return updated;
              }
            }
          }
        }
      }

      return updated;
    });
  }, [buildings]);

  // 3. Trigger Autonomous Dialogue between two agents
  const triggerAutonomousDialogue = async (agentA: Agent, agentB: Agent) => {
    // Mark both agents as occupied
    interactingAgentIdsRef.current.add(agentA.id);
    interactingAgentIdsRef.current.add(agentB.id);

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
      progress: 0
    };

    setActiveBubbles(prev => [...prev, initialBubble]);
    soundEngine.playChime();

    try {
      // Call Gemini / server dialogue generation
      const recentEventsStr = events.slice(0, 2).map(e => e.title).join('; ');
      const dialogueResult = await requestAgentDialogue(agentA, agentB, nearestBuilding, recentEventsStr);

      // Play through dialogue lines sequentially on canvas bubble
      let lineIdx = 0;
      const speechInterval = setInterval(() => {
        if (lineIdx < dialogueResult.dialogue.length) {
          const line = dialogueResult.dialogue[lineIdx];
          setActiveBubbles(prev =>
            prev.map(b =>
              b.id === bubbleId
                ? {
                    ...b,
                    topic: dialogueResult.topic,
                    speakerName: line.speakerName,
                    currentSpeech: line.text,
                    sentiment: dialogueResult.sentiment
                  }
                : b
            )
          );
          lineIdx++;
        } else {
          // Finished conversation
          clearInterval(speechInterval);

          // Remove bubble after a short pause
          setTimeout(() => {
            setActiveBubbles(prev => prev.filter(b => b.id !== bubbleId));
            interactingAgentIdsRef.current.delete(agentA.id);
            interactingAgentIdsRef.current.delete(agentB.id);
          }, 2000);
        }
      }, 2500);

      // Construct complete InteractionRecord
      const newRecord: InteractionRecord = {
        id: `interaction-${Date.now()}`,
        timestamp: Date.now(),
        simDay,
        simTime: `${String(simHour).padStart(2, '0')}:${String(simMinute).padStart(2, '0')}`,
        participants: [agentA.id, agentB.id],
        participantNames: [agentA.name, agentB.name],
        location: nearestBuilding.name,
        topic: dialogueResult.topic,
        summary: dialogueResult.summary,
        sentiment: dialogueResult.sentiment,
        sentimentScore: dialogueResult.sentimentScore,
        messages: dialogueResult.dialogue,
        relationshipImpact: {
          [agentA.id]: { deltaAffinity: dialogueResult.affinityDeltaAtoB, note: dialogueResult.memoryA },
          [agentB.id]: { deltaAffinity: dialogueResult.affinityDeltaBtoA, note: dialogueResult.memoryB }
        },
        tags: [nearestBuilding.name, dialogueResult.sentiment]
      };

      // Update State: Add Interaction Record
      setInteractions(prev => [newRecord, ...prev]);

      // Update Agent State & Memory Stream
      setAgents(prev =>
        prev.map(a => {
          if (a.id === agentA.id) {
            const currentAffinity = a.affinity?.[agentB.id] || 0;
            const newAffinity = Math.max(-100, Math.min(100, currentAffinity + dialogueResult.affinityDeltaAtoB));
            const newMood = Math.max(-100, Math.min(100, a.state.mood + Math.round(dialogueResult.sentimentScore * 10)));
            const newMem: any = {
              id: `mem-${Date.now()}-A`,
              simDay,
              simTime: `${String(simHour).padStart(2, '0')}:${String(simMinute).padStart(2, '0')}`,
              content: dialogueResult.memoryA,
              importance: Math.min(10, Math.max(3, Math.round(Math.abs(dialogueResult.sentimentScore) * 8 + 3))),
              associatedAgentId: agentB.id,
              associatedAgentName: agentB.name,
              sentiment: dialogueResult.sentiment
            };

            const updatedHistory = [
              ...(a.moodHistory || []),
              { simTime: `${String(simHour).padStart(2, '0')}:${String(simMinute).padStart(2, '0')}`, mood: newMood, stress: a.state.stress }
            ].slice(-10);

            const updatedA: Agent = {
              ...a,
              state: { ...a.state, mood: newMood },
              currentThought: `关于“${dialogueResult.topic}”，${agentB.name}的见解让我印象颇深。`,
              affinity: { ...a.affinity, [agentB.id]: newAffinity },
              memories: [newMem, ...(a.memories || [])].slice(0, 15),
              moodHistory: updatedHistory
            };
            syncAgentStateToCloud(updatedA);
            return updatedA;
          }

          if (a.id === agentB.id) {
            const currentAffinity = a.affinity?.[agentA.id] || 0;
            const newAffinity = Math.max(-100, Math.min(100, currentAffinity + dialogueResult.affinityDeltaBtoA));
            const newMood = Math.max(-100, Math.min(100, a.state.mood + Math.round(dialogueResult.sentimentScore * 10)));
            const newMem: any = {
              id: `mem-${Date.now()}-B`,
              simDay,
              simTime: `${String(simHour).padStart(2, '0')}:${String(simMinute).padStart(2, '0')}`,
              content: dialogueResult.memoryB,
              importance: Math.min(10, Math.max(3, Math.round(Math.abs(dialogueResult.sentimentScore) * 8 + 3))),
              associatedAgentId: agentA.id,
              associatedAgentName: agentA.name,
              sentiment: dialogueResult.sentiment
            };

            const updatedHistory = [
              ...(a.moodHistory || []),
              { simTime: `${String(simHour).padStart(2, '0')}:${String(simMinute).padStart(2, '0')}`, mood: newMood, stress: a.state.stress }
            ].slice(-10);

            const updatedB: Agent = {
              ...a,
              state: { ...a.state, mood: newMood },
              currentThought: `和${agentA.name}交流了“${dialogueResult.topic}”，收获不少。`,
              affinity: { ...a.affinity, [agentA.id]: newAffinity },
              memories: [newMem, ...(a.memories || [])].slice(0, 15),
              moodHistory: updatedHistory
            };
            syncAgentStateToCloud(updatedB);
            return updatedB;
          }

          return a;
        })
      );

      // Async Persistent Save to Firebase Firestore!
      syncInteractionToCloud(newRecord);
      setCloudSyncCount(c => c + 1);

    } catch (err) {
      console.error('Encounter execution error:', err);
      setActiveBubbles(prev => prev.filter(b => b.id !== bubbleId));
      interactingAgentIdsRef.current.delete(agentA.id);
      interactingAgentIdsRef.current.delete(agentB.id);
    }
  };

  // 4. Force Dialogue Trigger (e.g. from UI inspector)
  const handleForceInteraction = (agentId: string) => {
    const agentA = agents.find(a => a.id === agentId);
    if (!agentA) return;

    // Pick closest or random other resident
    const otherAgents = agents.filter(a => a.id !== agentId);
    if (otherAgents.length === 0) return;
    const agentB = otherAgents[Math.floor(Math.random() * otherAgents.length)];

    // Move them toward each other
    setAgents(prev =>
      prev.map(a => {
        if (a.id === agentA.id) return { ...a, targetX: agentB.x, targetY: agentB.y };
        if (a.id === agentB.id) return { ...a, targetX: agentA.x, targetY: agentA.y };
        return a;
      })
    );

    triggerAutonomousDialogue(agentA, agentB);
    setSelectedAgentId(null);
  };

  // 5. Trigger Custom Event Intervention
  const handleTriggerEvent = (event: TownEvent, agentReactions: any[]) => {
    setEvents(prev => [event, ...prev]);
    syncEventToCloud(event);

    // Apply mood/stress updates to agents
    setAgents(prev =>
      prev.map(a => {
        const reaction = agentReactions?.find(r => r.agentId === a.id);
        if (reaction) {
          const newMood = Math.max(-100, Math.min(100, a.state.mood + (reaction.moodDelta || 0)));
          const newStress = Math.max(0, Math.min(100, a.state.stress + (reaction.stressDelta || 0)));
          const updated = {
            ...a,
            state: { ...a.state, mood: newMood, stress: newStress },
            currentThought: reaction.reactionThought || a.currentThought
          };
          syncAgentStateToCloud(updated);
          return updated;
        }
        return a;
      })
    );

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
    setSimHour(prev => (prev + 1) % 24);
    updateAgentsStep();
    soundEngine.playClick();
  };

  // Reset simulation time to Day 1
  const handleResetSimulation = () => {
    if (window.confirm('确定要将小镇时间重置回到第 1 天吗？现有居民档案与交互历史仍将保留。')) {
      setSimDay(1);
      setSimHour(8);
      setSimMinute(0);
      setWeather('clear');
      localStorage.setItem(STORAGE_SIM_STATE, JSON.stringify({ simDay: 1, simHour: 8, simMinute: 0, weather: 'clear' }));
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

  const selectedAgentObj = agents.find(a => a.id === selectedAgentId) || null;
  const selectedBuildingObj = buildings.find(b => b.id === selectedBuildingId) || null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
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
      <main className="flex-1 relative overflow-hidden">
        {currentTab === 'canvas' && (
          <div className="relative w-full h-full">
            <TownCanvas
              agents={agents}
              buildings={buildings}
              selectedAgentId={selectedAgentId}
              onSelectAgent={setSelectedAgentId}
              selectedBuildingId={selectedBuildingId}
              onSelectBuilding={setSelectedBuildingId}
              activeInteractions={activeBubbles}
              simHour={simHour}
              simMinute={simMinute}
              weather={weather}
            />

            {/* Quick Inspect Drawer for Selected Agent */}
            <AgentDetailModal
              agent={selectedAgentObj}
              building={selectedBuildingObj}
              onClose={() => setSelectedAgentId(null)}
              onGoToEvolution={agentId => {
                setSelectedAgentId(agentId);
                setCurrentTab('evolution');
              }}
              onForceInteraction={handleForceInteraction}
            />
          </div>
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
      </main>

      {/* Model Fine-Tuning Exporter Modal */}
      <FineTuningExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        interactions={interactions}
        agents={agents}
      />
    </div>
  );
}
