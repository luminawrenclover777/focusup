export interface BackupPayload {
  schemaVersion: number;
  exportedAt: number;
  exportedDate: string;
  data: {
    settings: any[];
    focusSessions: any[];
    activityEvents: any[];
    expressionLogs: any[];
    workoutSessions: any[];
    workoutSets: any[];
    dailyHabits: any[];
    expTransactions: any[];
    ticketTransactions: any[];
    bodyMetrics: any[];
  };
}

export interface BackupPreview {
  schemaVersion: number;
  exportedAt: number;
  exportedDate: string;
  counts: {
    focusSessions: number;
    activityEvents: number;
    expressionLogs: number;
    workoutSessions: number;
    workoutSets: number;
    dailyHabits: number;
    expTransactions: number;
    ticketTransactions: number;
    bodyMetrics: number;
  };
  valid: boolean;
  error?: string;
}

export function validateBackup(json: any): BackupPreview {
  if (!json || typeof json !== 'object') {
    return {
      schemaVersion: 0,
      exportedAt: 0,
      exportedDate: '',
      counts: {} as any,
      valid: false,
      error: '文件格式错误：非有效 JSON 对象'
    };
  }

  if (json.schemaVersion !== 1) {
    return {
      schemaVersion: json.schemaVersion || 0,
      exportedAt: json.exportedAt || 0,
      exportedDate: json.exportedDate || '',
      counts: {} as any,
      valid: false,
      error: `不支持的数据版本 (当前仅支持 v1，导入文件版本为 ${json.schemaVersion || '未知'})`
    };
  }

  if (!json.data || typeof json.data !== 'object') {
    return {
      schemaVersion: json.schemaVersion,
      exportedAt: json.exportedAt || 0,
      exportedDate: json.exportedDate || '',
      counts: {} as any,
      valid: false,
      error: '备份数据缺少核心 data 节点'
    };
  }

  const data = json.data;
  const counts = {
    focusSessions: Array.isArray(data.focusSessions) ? data.focusSessions.length : 0,
    activityEvents: Array.isArray(data.activityEvents) ? data.activityEvents.length : 0,
    expressionLogs: Array.isArray(data.expressionLogs) ? data.expressionLogs.length : 0,
    workoutSessions: Array.isArray(data.workoutSessions) ? data.workoutSessions.length : 0,
    workoutSets: Array.isArray(data.workoutSets) ? data.workoutSets.length : 0,
    dailyHabits: Array.isArray(data.dailyHabits) ? data.dailyHabits.length : 0,
    expTransactions: Array.isArray(data.expTransactions) ? data.expTransactions.length : 0,
    ticketTransactions: Array.isArray(data.ticketTransactions) ? data.ticketTransactions.length : 0,
    bodyMetrics: Array.isArray(data.bodyMetrics) ? data.bodyMetrics.length : 0
  };

  return {
    schemaVersion: json.schemaVersion,
    exportedAt: json.exportedAt || Date.now(),
    exportedDate: json.exportedDate || '未知日期',
    counts,
    valid: true
  };
}
