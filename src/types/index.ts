export type EnergyMode = "normal" | "recovery";
export type ExpDimension = "focus" | "body" | "voice";

export interface FocusSession {
  id: string;
  mode: "countdown" | "stopwatch";
  targetSeconds?: number;
  startedAt: number;
  endedAt?: number;
  pausedIntervals: Array<{ startAt: number; endAt?: number }>;
  effectiveSeconds?: number;
  status: "running" | "paused" | "completed" | "abandoned";
  settledAt?: number;
}

export interface ActivityEvent {
  id: string;
  type: "intercept" | "stop_loss" | "micro_movement";
  createdAt: number;
  localDate: string; // YYYY-MM-DD
  completed: boolean;
  rewardTransactionId?: string;
  estimatedMinutesSaved?: number; // 仅估算值
  note?: string;
}

export interface ExpressionLog {
  id: string;
  createdAt: number;
  localDate: string;
  triggerType?: "intercept" | "stop_loss" | "daily_practice";
  framework: "PREP" | "WHAT_WHY_HOW" | "PRO_CON";
  topic: string;
  slot1: string;
  slot2: string;
  slot3: string;
  mentorQuestion: string;
  mentorAnswer?: string;
  completed: boolean;
}

export interface WorkoutSession {
  id: string;
  createdAt: number;
  localDate: string;
  note?: string;
  completed: boolean;
}

export type BodyPart = "shoulder" | "back" | "chest" | "core" | "legs";

export interface WorkoutSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  bodyPart: BodyPart;
  setNumber: number;
  reps: number;
  weightKg?: number;
  assistance?: string;
  createdAt: number;
}

export interface ExpTransaction {
  id: string;
  dimension: ExpDimension;
  amount: number; // 正数奖励，负数冲正
  reason: string;
  sourceType: string;
  sourceId: string; // 幂等校验关键字段
  createdAt: number;
  localDate: string;
}

export interface TicketTransaction {
  id: string;
  type: "earned" | "used" | "adjustment";
  amount: number;
  sourceId: string;
  createdAt: number;
  note?: string;
}

export interface DailyHabit {
  localDate: string; // YYYY-MM-DD (primary key)
  protein: boolean;
  sleep: boolean;
  activity: boolean;
}

export interface BodyMetric {
  id: string;
  localDate: string;
  weightKg?: number;
  waistCm?: number;
  createdAt: number;
}

export interface UserSettings {
  id: string; // "current"
  energyMode: EnergyMode;
  lastModeDate: string;
  soundEnabled: boolean;
  soundVolume: number;
  theme: "dark";
}

export interface DimensionStats {
  dimension: ExpDimension;
  exp: number;
  level: number;
  levelExp: number;
  nextLevelExp: number;
}
