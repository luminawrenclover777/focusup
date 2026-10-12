import { db, getLocalDate } from '../db/index';
import { validateBackup, type BackupPayload, type BackupPreview } from './backupValidator';

export { validateBackup, type BackupPayload, type BackupPreview };

/**
 * Exports entire local database to a JSON file
 */
export async function exportDatabaseToJson(): Promise<void> {
  const settings = await db.settings.toArray();
  const focusSessions = await db.focusSessions.toArray();
  const activityEvents = await db.activityEvents.toArray();
  const expressionLogs = await db.expressionLogs.toArray();
  const workoutSessions = await db.workoutSessions.toArray();
  const workoutSets = await db.workoutSets.toArray();
  const dailyHabits = await db.dailyHabits.toArray();
  const expTransactions = await db.expTransactions.toArray();
  const ticketTransactions = await db.ticketTransactions.toArray();
  const bodyMetrics = await db.bodyMetrics.toArray();

  const backup: BackupPayload = {
    schemaVersion: 1,
    exportedAt: Date.now(),
    exportedDate: getLocalDate(),
    data: {
      settings,
      focusSessions,
      activityEvents,
      expressionLogs,
      workoutSessions,
      workoutSets,
      dailyHabits,
      expTransactions,
      ticketTransactions,
      bodyMetrics
    }
  };

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `FocusUp-backup-${getLocalDate()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Restores database from a validated JSON backup via an atomic overwrite transaction
 */
export async function restoreDatabaseFromJson(backup: BackupPayload): Promise<void> {
  const data = backup.data;

  const tables = [
    db.settings,
    db.focusSessions,
    db.activityEvents,
    db.expressionLogs,
    db.workoutSessions,
    db.workoutSets,
    db.dailyHabits,
    db.expTransactions,
    db.ticketTransactions,
    db.bodyMetrics
  ];

  await db.transaction('rw', tables, async () => {
    // Clear all existing data
    for (const table of tables) {
      await table.clear();
    }

    // Populate data
    if (data.settings?.length) await db.settings.bulkPut(data.settings);
    if (data.focusSessions?.length) await db.focusSessions.bulkPut(data.focusSessions);
    if (data.activityEvents?.length) await db.activityEvents.bulkPut(data.activityEvents);
    if (data.expressionLogs?.length) await db.expressionLogs.bulkPut(data.expressionLogs);
    if (data.workoutSessions?.length) await db.workoutSessions.bulkPut(data.workoutSessions);
    if (data.workoutSets?.length) await db.workoutSets.bulkPut(data.workoutSets);
    if (data.dailyHabits?.length) await db.dailyHabits.bulkPut(data.dailyHabits);
    if (data.expTransactions?.length) await db.expTransactions.bulkPut(data.expTransactions);
    if (data.ticketTransactions?.length) await db.ticketTransactions.bulkPut(data.ticketTransactions);
    if (data.bodyMetrics?.length) await db.bodyMetrics.bulkPut(data.bodyMetrics);
  });
}
