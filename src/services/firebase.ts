import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDocFromServer, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { InteractionRecord, Agent, TownEvent, TownAnalysis } from '../types/town';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// CRITICAL: The app will break without passing firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Operation types for strict error logging per guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
  return errInfo;
}

// Connection test helper
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or starting up.');
    }
    return false;
  }
}

// Sync single interaction record to Firestore
export async function syncInteractionToCloud(interaction: InteractionRecord): Promise<boolean> {
  const path = `interactions/${interaction.id}`;
  try {
    await setDoc(doc(db, 'interactions', interaction.id), {
      id: interaction.id,
      participants: interaction.participants,
      participantNames: interaction.participantNames,
      location: interaction.location,
      topic: interaction.topic,
      sentiment: interaction.sentiment,
      sentimentScore: interaction.sentimentScore,
      messages: interaction.messages,
      relationshipImpact: interaction.relationshipImpact,
      timestamp: interaction.timestamp,
      simDay: interaction.simDay,
      simTime: interaction.simTime
    });
    recordFirestoreWrite();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

// Sync agent current state to Firestore
export async function syncAgentStateToCloud(agent: Agent): Promise<boolean> {
  const path = `agents/${agent.id}`;
  try {
    await setDoc(doc(db, 'agents', agent.id), {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      mbti: agent.mbti,
      energy: agent.state.energy,
      mood: agent.state.mood,
      stress: agent.state.stress,
      currentActivity: agent.currentActivity,
      location: agent.currentBuildingId,
      updatedAt: Date.now()
    }, { merge: true });
    recordFirestoreWrite();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

// Sync town event to Firestore
export async function syncEventToCloud(event: TownEvent): Promise<boolean> {
  const path = `town_events/${event.id}`;
  try {
    await setDoc(doc(db, 'town_events', event.id), {
      id: event.id,
      title: event.title,
      description: event.description,
      type: event.type,
      impactSummary: event.impactSummary,
      targetBuilding: event.targetBuilding || 'all',
      timestamp: event.timestamp
    });
    recordFirestoreWrite();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

// Sync AI analysis report to Firestore
export async function syncAnalysisToCloud(analysis: TownAnalysis): Promise<boolean> {
  const path = `analyses/${analysis.id}`;
  try {
    await setDoc(doc(db, 'analyses', analysis.id), {
      id: analysis.id,
      title: analysis.title,
      summary: analysis.summary,
      vibeScore: analysis.vibeScore,
      emotionalVibe: analysis.emotionalVibe,
      coreConflicts: analysis.coreConflicts,
      alliances: analysis.alliances,
      recommendations: analysis.recommendations,
      timestamp: analysis.timestamp
    });
    recordFirestoreWrite();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

// Sync global simulation clock & state to Firestore
export async function syncSimulationStateToCloud(state: {
  simDay: number;
  simHour: number;
  simMinute: number;
  weather: string;
}): Promise<boolean> {
  const path = 'simulation_state/current';
  try {
    await setDoc(doc(db, 'simulation_state', 'current'), {
      id: 'current',
      simDay: state.simDay,
      simHour: state.simHour,
      simMinute: state.simMinute,
      weather: state.weather,
      updatedAt: Date.now()
    }, { merge: true });
    recordFirestoreWrite();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

// Fetch simulation state from cloud
export async function fetchSimulationStateFromCloud(): Promise<{
  simDay: number;
  simHour: number;
  simMinute: number;
  weather?: string;
  updatedAt?: number;
} | null> {
  try {
    const snapshot = await getDocs(collection(db, 'simulation_state'));
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      return {
        simDay: typeof data.simDay === 'number' ? data.simDay : 1,
        simHour: typeof data.simHour === 'number' ? data.simHour : 9,
        simMinute: typeof data.simMinute === 'number' ? data.simMinute : 0,
        weather: data.weather || 'clear',
        updatedAt: data.updatedAt
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'simulation_state/current');
    return null;
  }
}

// Fetch historical interactions from cloud
export async function fetchCloudInteractions(): Promise<InteractionRecord[]> {
  try {
    const q = query(collection(db, 'interactions'), orderBy('timestamp', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    const records: InteractionRecord[] = [];
    snapshot.forEach((doc) => {
      records.push(doc.data() as InteractionRecord);
    });
    return records;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'interactions');
    return [];
  }
}

// Fetch cloud agents
export async function fetchCloudAgents(): Promise<Partial<Agent>[]> {
  try {
    const snapshot = await getDocs(collection(db, 'agents'));
    const list: Partial<Agent>[] = [];
    snapshot.forEach(doc => {
      list.push(doc.data() as Partial<Agent>);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'agents');
    return [];
  }
}

// Fetch cloud events
export async function fetchCloudEvents(): Promise<TownEvent[]> {
  try {
    const q = query(collection(db, 'town_events'), orderBy('timestamp', 'desc'), limit(20));
    const snapshot = await getDocs(q);
    const list: TownEvent[] = [];
    snapshot.forEach(doc => {
      list.push(doc.data() as TownEvent);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'town_events');
    return [];
  }
}

// Fetch cloud analysis
export async function fetchCloudAnalysis(): Promise<TownAnalysis | null> {
  try {
    const q = query(collection(db, 'analyses'), orderBy('timestamp', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as TownAnalysis;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'analyses');
    return null;
  }
}

// Session Operation Counters for Real-Time Metrics
let sessionWriteCount = 0;
let sessionReadCount = 0;
let lastCloudOpTimestamp = Date.now();

export function recordFirestoreWrite() {
  sessionWriteCount++;
  lastCloudOpTimestamp = Date.now();
}

export function recordFirestoreRead(count: number = 1) {
  sessionReadCount += count;
  lastCloudOpTimestamp = Date.now();
}

export interface FirestoreCapacityMetrics {
  connected: boolean;
  projectId: string;
  firestoreDatabaseId: string;
  sessionReads: number;
  sessionWrites: number;
  lastOperationTimestamp: number;
  collections: {
    interactions: { count: number; estimatedBytes: number };
    agents: { count: number; estimatedBytes: number };
    town_events: { count: number; estimatedBytes: number };
    analyses: { count: number; estimatedBytes: number };
    simulation_state: { count: number; estimatedBytes: number };
  };
  totalDocuments: number;
  totalEstimatedBytes: number;
  storageUsageRatio: number; // 0 to 1
  dailyReadUsageRatio: number; // 0 to 1
  dailyWriteUsageRatio: number; // 0 to 1
  limits: {
    freeStorageBytes: number;
    freeDailyReads: number;
    freeDailyWrites: number;
  };
}

// Inspect Firestore collections and compute capacity metrics
export async function fetchFirestoreCapacityMetrics(): Promise<FirestoreCapacityMetrics> {
  const FREE_STORAGE_BYTES = 1024 * 1024 * 1024; // 1 GiB
  const FREE_DAILY_READS = 50000;
  const FREE_DAILY_WRITES = 20000;

  let interactionsCount = 0;
  let agentsCount = 0;
  let eventsCount = 0;
  let analysesCount = 0;
  let simStateCount = 0;

  try {
    const [snapInteractions, snapAgents, snapEvents, snapAnalyses, snapSim] = await Promise.allSettled([
      getDocs(collection(db, 'interactions')),
      getDocs(collection(db, 'agents')),
      getDocs(collection(db, 'town_events')),
      getDocs(collection(db, 'analyses')),
      getDocs(collection(db, 'simulation_state')),
    ]);

    if (snapInteractions.status === 'fulfilled') {
      interactionsCount = snapInteractions.value.size;
      recordFirestoreRead(interactionsCount);
    }
    if (snapAgents.status === 'fulfilled') {
      agentsCount = snapAgents.value.size;
      recordFirestoreRead(agentsCount);
    }
    if (snapEvents.status === 'fulfilled') {
      eventsCount = snapEvents.value.size;
      recordFirestoreRead(eventsCount);
    }
    if (snapAnalyses.status === 'fulfilled') {
      analysesCount = snapAnalyses.value.size;
      recordFirestoreRead(analysesCount);
    }
    if (snapSim.status === 'fulfilled') {
      simStateCount = snapSim.value.size;
      recordFirestoreRead(simStateCount);
    }
  } catch (err) {
    console.warn('Error fetching Firestore collection counts:', err);
  }

  const interactionsBytes = interactionsCount * 1250;
  const agentsBytes = agentsCount * 850;
  const eventsBytes = eventsCount * 650;
  const analysesBytes = analysesCount * 2600;
  const simStateBytes = simStateCount * 450;

  const totalBytes = interactionsBytes + agentsBytes + eventsBytes + analysesBytes + simStateBytes;
  const totalDocs = interactionsCount + agentsCount + eventsCount + analysesCount + simStateCount;

  return {
    connected: true,
    projectId: firebaseConfig.projectId || 'your-firebase-project-id',
    firestoreDatabaseId: firebaseConfig.firestoreDatabaseId || 'default',
    sessionReads: sessionReadCount,
    sessionWrites: sessionWriteCount,
    lastOperationTimestamp: lastCloudOpTimestamp,
    collections: {
      interactions: { count: interactionsCount, estimatedBytes: interactionsBytes },
      agents: { count: agentsCount, estimatedBytes: agentsBytes },
      town_events: { count: eventsCount, estimatedBytes: eventsBytes },
      analyses: { count: analysesCount, estimatedBytes: analysesBytes },
      simulation_state: { count: simStateCount, estimatedBytes: simStateBytes }
    },
    totalDocuments: totalDocs,
    totalEstimatedBytes: totalBytes,
    storageUsageRatio: totalBytes / FREE_STORAGE_BYTES,
    dailyReadUsageRatio: sessionReadCount / FREE_DAILY_READS,
    dailyWriteUsageRatio: sessionWriteCount / FREE_DAILY_WRITES,
    limits: {
      freeStorageBytes: FREE_STORAGE_BYTES,
      freeDailyReads: FREE_DAILY_READS,
      freeDailyWrites: FREE_DAILY_WRITES,
    }
  };
}
