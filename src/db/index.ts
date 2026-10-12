import Dexie, { type Table } from 'dexie';
import type {
  FocusSession,
  ActivityEvent,
  ExpressionLog,
  WorkoutSession,
  WorkoutSet,
  DailyHabit,
  ExpTransaction,
  TicketTransaction,
  BodyMetric,
  UserSettings
} from '../types';

export class FocusUpDatabase extends Dexie {
  settings!: Table<UserSettings, string>;
  focusSessions!: Table<FocusSession, string>;
  activityEvents!: Table<ActivityEvent, string>;
  expressionLogs!: Table<ExpressionLog, string>;
  workoutSessions!: Table<WorkoutSession, string>;
  workoutSets!: Table<WorkoutSet, string>;
  dailyHabits!: Table<DailyHabit, string>;
  expTransactions!: Table<ExpTransaction, string>;
  ticketTransactions!: Table<TicketTransaction, string>;
  bodyMetrics!: Table<BodyMetric, string>;

  constructor() {
    super('FocusUpDB');
    this.version(1).stores({
      settings: 'id',
      focusSessions: 'id, status, startedAt, settledAt',
      activityEvents: 'id, type, localDate, createdAt',
      expressionLogs: 'id, localDate, createdAt, framework',
      workoutSessions: 'id, localDate, createdAt',
      workoutSets: 'id, sessionId, exerciseId, bodyPart, createdAt',
      dailyHabits: 'localDate',
      expTransactions: 'id, dimension, sourceType, sourceId, localDate, createdAt, [sourceType+sourceId]',
      ticketTransactions: 'id, type, sourceId, createdAt',
      bodyMetrics: 'id, localDate, createdAt'
    });
  }
}

export const db = new FocusUpDatabase();

// Helper to get local date string YYYY-MM-DD
export function getLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Initial settings initialization
export async function ensureUserSettings(): Promise<UserSettings> {
  const existing = await db.settings.get('current');
  const today = getLocalDate();
  if (existing) {
    return existing;
  }
  const defaultSettings: UserSettings = {
    id: 'current',
    energyMode: 'normal',
    lastModeDate: today,
    soundEnabled: true,
    soundVolume: 0.5,
    theme: 'dark'
  };
  await db.settings.put(defaultSettings);
  return defaultSettings;
}
