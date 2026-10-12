import { db } from '../db';
import type { TicketTransaction } from '../types';

const EXP_PER_TICKET = 150;

/**
 * Checks lifetime EXP and issues tickets if a new milestone (each 150 EXP) has been reached
 */
export async function checkAndAwardTickets(): Promise<number> {
  const allExp = await db.expTransactions.toArray();
  const lifetimeEligibleExp = allExp
    .filter(tx => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalEligibleTickets = Math.floor(lifetimeEligibleExp / EXP_PER_TICKET);

  // Count how many earned tickets have already been recorded
  const earnedTransactions = await db.ticketTransactions
    .where('type')
    .equals('earned')
    .toArray();

  const totalEarnedSoFar = earnedTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  const ticketsToIssue = totalEligibleTickets - totalEarnedSoFar;

  if (ticketsToIssue > 0) {
    for (let i = 0; i < ticketsToIssue; i++) {
      const ticketTx: TicketTransaction = {
        id: `ticket_earned_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'earned',
        amount: 1,
        sourceId: `exp_milestone_${(totalEarnedSoFar + i + 1) * EXP_PER_TICKET}`,
        createdAt: Date.now(),
        note: `达成累计 ${(totalEarnedSoFar + i + 1) * EXP_PER_TICKET} EXP 奖励 1 张 30 分钟娱乐券`
      };
      await db.ticketTransactions.put(ticketTx);
    }
    return ticketsToIssue;
  }

  return 0;
}

/**
 * Get ticket balance and transaction list
 */
export async function getTicketBalance(): Promise<{
  balance: number;
  totalEarned: number;
  totalUsed: number;
  history: TicketTransaction[];
}> {
  const history = await db.ticketTransactions.orderBy('createdAt').reverse().toArray();

  let totalEarned = 0;
  let totalUsed = 0;

  for (const item of history) {
    if (item.type === 'earned') {
      totalEarned += item.amount;
    } else if (item.type === 'used') {
      totalUsed += Math.abs(item.amount);
    }
  }

  const balance = Math.max(0, totalEarned - totalUsed);
  return { balance, totalEarned, totalUsed, history };
}

/**
 * Consume 1 ticket with idempotency protection
 */
export async function useTicket(note: string = '使用 30 分钟娱乐兑换'): Promise<{ success: boolean; message: string }> {
  return await db.transaction('rw', db.ticketTransactions, async () => {
    const history = await db.ticketTransactions.toArray();
    let earned = 0;
    let used = 0;
    for (const item of history) {
      if (item.type === 'earned') earned += item.amount;
      if (item.type === 'used') used += Math.abs(item.amount);
    }
    const currentBalance = earned - used;

    if (currentBalance < 1) {
      return { success: false, message: '娱乐券余额不足' };
    }

    const useTx: TicketTransaction = {
      id: `ticket_used_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'used',
      amount: -1,
      sourceId: `user_redemption_${Date.now()}`,
      createdAt: Date.now(),
      note
    };

    await db.ticketTransactions.put(useTx);
    return { success: true, message: '成功使用 1 张娱乐券（30 分钟）' };
  });
}
