import { db, getLocalDate } from '../db';
import type { ExpDimension, ExpTransaction, DimensionStats } from '../types';
import { checkAndAwardTickets } from './ticketService';

export const EXP_RULES = {
  FOCUS_PER_MINUTE: 1, // +1 EXP per focus min (min 1 min)
  INTERCEPT: 10,       // +10 Focus EXP, max 5/day
  STOP_LOSS: 15,       // +15 Focus EXP, max 5/day
  EXPRESSION: 10,      // +10 Voice EXP, max 3/day
  WORKOUT: 20,         // +20 Body EXP, max 2/day
  WORKOUT_BREAKTHROUGH: 10, // +10 Body EXP extra, once per set
  HABIT_PROTEIN: 5,    // +5 Body EXP, max 1/day
  HABIT_SLEEP: 5,      // +5 Body EXP, max 1/day
  HABIT_ACTIVITY: 5,   // +5 Body EXP, max 1/day
  EXP_PER_LEVEL: 300,
  EXP_PER_TICKET: 150
} as const;

export const DAILY_CAPS = {
  intercept: 5,
  stop_loss: 5,
  expression: 3,
  workout: 2,
  habit_protein: 1,
  habit_sleep: 1,
  habit_activity: 1
} as const;

/**
 * Checks remaining daily reward slots for an action type
 */
export async function getDailyRewardCount(sourceType: string, localDate: string = getLocalDate()): Promise<number> {
  const transactions = await db.expTransactions
    .where('localDate')
    .equals(localDate)
    .and(tx => tx.sourceType === sourceType && tx.amount > 0)
    .toArray();
  return transactions.length;
}

export async function getDailyCapInfo(type: keyof typeof DAILY_CAPS, localDate: string = getLocalDate()) {
  const max = DAILY_CAPS[type];
  const used = await getDailyRewardCount(type, localDate);
  const remaining = Math.max(0, max - used);
  return { used, max, remaining };
}

/**
 * Awards EXP safely with idempotency check and daily cap enforcement
 */
export async function awardExp(params: {
  dimension: ExpDimension;
  amount: number;
  reason: string;
  sourceType: string;
  sourceId: string;
  localDate?: string;
  bypassCap?: boolean;
}): Promise<ExpTransaction | null> {
  const localDate = params.localDate || getLocalDate();

  // 1. Idempotency Check: if this exact sourceId + sourceType already received this award, don't duplicate!
  const existing = await db.expTransactions
    .where('[sourceType+sourceId]')
    .equals([params.sourceType, params.sourceId])
    .and(tx => tx.amount > 0 && tx.reason === params.reason)
    .first();

  if (existing) {
    console.warn(`[EXP] Duplicate reward prevented for ${params.sourceType}:${params.sourceId}`);
    return existing;
  }

  // 2. Daily Cap Check
  if (!params.bypassCap && params.sourceType in DAILY_CAPS) {
    const cap = DAILY_CAPS[params.sourceType as keyof typeof DAILY_CAPS];
    const currentCount = await getDailyRewardCount(params.sourceType, localDate);
    if (currentCount >= cap) {
      console.info(`[EXP] Daily cap reached for ${params.sourceType} (${currentCount}/${cap})`);
      return null;
    }
  }

  // 3. Atomically write transaction
  const tx: ExpTransaction = {
    id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    dimension: params.dimension,
    amount: params.amount,
    reason: params.reason,
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    createdAt: Date.now(),
    localDate
  };

  await db.transaction('rw', [db.expTransactions, db.ticketTransactions], async () => {
    await db.expTransactions.put(tx);
    // 4. Update and award entertainment tickets if threshold (150 EXP) reached
    await checkAndAwardTickets();
  });

  return tx;
}

/**
 * Reverts an EXP transaction (冲正流水) to ensure historical auditability
 */
export async function revertExp(params: {
  sourceType: string;
  sourceId: string;
  reason: string;
}): Promise<boolean> {
  // Find all positive awards for this source
  const awards = await db.expTransactions
    .where('[sourceType+sourceId]')
    .equals([params.sourceType, params.sourceId])
    .and(tx => tx.amount > 0)
    .toArray();

  if (awards.length === 0) return false;

  const totalPositive = awards.reduce((acc, cur) => acc + cur.amount, 0);

  // Check if already reverted
  const reversions = await db.expTransactions
    .where('[sourceType+sourceId]')
    .equals([params.sourceType, params.sourceId])
    .and(tx => tx.amount < 0)
    .toArray();

  const totalReverted = reversions.reduce((acc, cur) => acc + Math.abs(cur.amount), 0);
  const remainingToRevert = totalPositive - totalReverted;

  if (remainingToRevert <= 0) {
    return false;
  }

  const sample = awards[0];
  const revertTx: ExpTransaction = {
    id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    dimension: sample.dimension,
    amount: -remainingToRevert,
    reason: `[冲正] ${params.reason}`,
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    createdAt: Date.now(),
    localDate: getLocalDate()
  };

  await db.expTransactions.put(revertTx);
  return true;
}

/**
 * Calculates current level and progress for all 3 dimensions
 */
export async function getDimensionStats(): Promise<{
  focus: DimensionStats;
  body: DimensionStats;
  voice: DimensionStats;
  totalExp: number;
}> {
  const allTxs = await db.expTransactions.toArray();

  const dims: Record<ExpDimension, number> = {
    focus: 0,
    body: 0,
    voice: 0
  };

  for (const tx of allTxs) {
    if (tx.dimension in dims) {
      dims[tx.dimension] += tx.amount;
    }
  }

  const calcDim = (dimension: ExpDimension): DimensionStats => {
    const exp = Math.max(0, dims[dimension]);
    const level = Math.floor(exp / EXP_RULES.EXP_PER_LEVEL) + 1;
    const levelExp = exp % EXP_RULES.EXP_PER_LEVEL;
    return {
      dimension,
      exp,
      level,
      levelExp,
      nextLevelExp: EXP_RULES.EXP_PER_LEVEL
    };
  };

  const focus = calcDim('focus');
  const body = calcDim('body');
  const voice = calcDim('voice');
  const totalExp = focus.exp + body.exp + voice.exp;

  return { focus, body, voice, totalExp };
}
