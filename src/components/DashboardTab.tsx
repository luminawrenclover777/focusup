import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Download,
  Upload,
  Calendar,
  Sparkles,
  AlertTriangle,
  FileText
} from 'lucide-react';
import type { DimensionStats, TicketTransaction } from '../types';
import { db, getLocalDate } from '../db';
import { getTicketBalance, useTicket } from '../services/ticketService';
import { exportDatabaseToJson, validateBackup, restoreDatabaseFromJson, type BackupPreview, type BackupPayload } from '../services/backupService';
import confetti from 'canvas-confetti';

interface DashboardTabProps {
  stats: {
    focus: DimensionStats;
    body: DimensionStats;
    voice: DimensionStats;
    totalExp: number;
  };
  refreshData: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ stats, refreshData }) => {
  const [ticketData, setTicketData] = useState<{
    balance: number;
    totalEarned: number;
    totalUsed: number;
    history: TicketTransaction[];
  }>({ balance: 0, totalEarned: 0, totalUsed: 0, history: [] });

  const [confirmUseTicketOpen, setConfirmUseTicketOpen] = useState<boolean>(false);

  const [summary, setSummary] = useState<{
    effectiveFocusMinutes: number;
    interceptCount: number;
    stopLossCount: number;
    estimatedMinutesSaved: number;
    expressionCount: number;
    workoutCount: number;
  }>({
    effectiveFocusMinutes: 0,
    interceptCount: 0,
    stopLossCount: 0,
    estimatedMinutesSaved: 0,
    expressionCount: 0,
    workoutCount: 0
  });

  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
  const [importPreview, setImportPreview] = useState<BackupPreview | null>(null);
  const [rawBackupData, setRawBackupData] = useState<BackupPayload | null>(null);

  const loadDashboardData = async () => {
    const tData = await getTicketBalance();
    setTicketData(tData);

    const sessions = await db.focusSessions.where('status').equals('completed').toArray();
    let totalFocusSec = 0;
    for (const s of sessions) {
      totalFocusSec += s.effectiveSeconds || 0;
    }

    const intercepts = await db.activityEvents.where('type').equals('intercept').toArray();
    const stopLosses = await db.activityEvents.where('type').equals('stop_loss').toArray();
    const expressions = await db.expressionLogs.toArray();
    const workouts = await db.workoutSets.toArray();

    const estMinutes = intercepts.reduce((sum, item) => sum + (item.estimatedMinutesSaved || 20), 0);

    setSummary({
      effectiveFocusMinutes: Math.floor(totalFocusSec / 60),
      interceptCount: intercepts.length,
      stopLossCount: stopLosses.length,
      estimatedMinutesSaved: estMinutes,
      expressionCount: expressions.length,
      workoutCount: workouts.length
    });

    const map: Record<string, number> = {};
    const countDate = (d: string) => {
      map[d] = (map[d] || 0) + 1;
    };

    sessions.forEach(s => s.endedAt && countDate(new Date(s.endedAt).toISOString().split('T')[0]));
    intercepts.forEach(a => countDate(a.localDate));
    stopLosses.forEach(a => countDate(a.localDate));
    expressions.forEach(e => countDate(e.localDate));
    workouts.forEach(w => w.createdAt && countDate(new Date(w.createdAt).toISOString().split('T')[0]));

    setHeatmapData(map);
  };

  useEffect(() => {
    loadDashboardData();
  }, [stats]);

  const handleRedeemTicket = async () => {
    const res = await useTicket('兑换 30 分钟自由娱乐');
    if (res.success) {
      confetti({ particleCount: 45, spread: 60, origin: { y: 0.6 } });
      setConfirmUseTicketOpen(false);
      loadDashboardData();
      refreshData();
    } else {
      alert(res.message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const preview = validateBackup(json);
        if (preview.valid) {
          setImportPreview(preview);
          setRawBackupData(json);
        } else {
          alert(preview.error || '无效的备份文件');
        }
      } catch {
        alert('解析失败，请确保是标准的 FocusUp JSON 备份文件。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!rawBackupData) return;
    try {
      await restoreDatabaseFromJson(rawBackupData);
      setImportPreview(null);
      setRawBackupData(null);
      refreshData();
      loadDashboardData();
      alert('数据恢复成功！');
    } catch {
      alert('导入失败，已回滚。');
    }
  };

  const renderHeatmap = () => {
    const days: Array<{ date: string; count: number }> = [];
    const today = new Date();
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const str = getLocalDate(d);
      days.push({ date: str, count: heatmapData[str] || 0 });
    }

    return (
      <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto py-1">
        {days.map((item) => {
          let bg = 'bg-dark-900 border-white/[0.04]';
          if (item.count >= 4) bg = 'bg-emerald-400 border-emerald-300';
          else if (item.count >= 2) bg = 'bg-emerald-600 border-emerald-500';
          else if (item.count >= 1) bg = 'bg-emerald-900/80 border-emerald-800';

          return (
            <div
              key={item.date}
              title={`${item.date}：${item.count} 项行动`}
              className={`w-2.5 h-2.5 rounded-sm border ${bg} transition-colors`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-3.5 px-4 py-3 max-w-md mx-auto">
      {/* 3D Growth Breakdown Card */}
      <div className="p-4 rounded-2xl bg-dark-800/80 border border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>三维成长进度</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">总计 {stats.totalExp} EXP</span>
        </div>

        {/* Focus */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-blue-400 font-medium">Focus Lv.{stats.focus.level}</span>
            <span className="text-slate-400 font-mono">{stats.focus.levelExp}/{stats.focus.nextLevelExp} EXP</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-dark-900 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${(stats.focus.levelExp / stats.focus.nextLevelExp) * 100}%` }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-emerald-400 font-medium">Body Lv.{stats.body.level}</span>
            <span className="text-slate-400 font-mono">{stats.body.levelExp}/{stats.body.nextLevelExp} EXP</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-dark-900 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(stats.body.levelExp / stats.body.nextLevelExp) * 100}%` }}
            />
          </div>
        </div>

        {/* Voice */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-amber-400 font-medium">Voice Lv.{stats.voice.level}</span>
            <span className="text-slate-400 font-mono">{stats.voice.levelExp}/{stats.voice.nextLevelExp} EXP</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-dark-900 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${(stats.voice.levelExp / stats.voice.nextLevelExp) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 12-Week Heatmap */}
      <div className="p-3.5 rounded-2xl bg-dark-800/70 border border-white/[0.07] space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>12 周行动热力</span>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-slate-500">
            <span>少</span>
            <span className="w-2 h-2 rounded-sm bg-dark-900 inline-block border border-white/[0.05]"></span>
            <span className="w-2 h-2 rounded-sm bg-emerald-900 inline-block"></span>
            <span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block"></span>
            <span>多</span>
          </div>
        </div>
        {renderHeatmap()}
      </div>

      {/* 2x2 Metric Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl bg-dark-800/60 border border-white/[0.06]">
          <span className="text-[10px] text-slate-500 font-medium">有效专注</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-bold font-mono text-white">{summary.effectiveFocusMinutes}</span>
            <span className="text-[10px] text-slate-400">分钟</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-dark-800/60 border border-white/[0.06]">
          <span className="text-[10px] text-slate-500 font-medium">截胡 & 止损</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-bold font-mono text-blue-400">{summary.interceptCount + summary.stopLossCount}</span>
            <span className="text-[10px] text-slate-400">次</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-dark-800/60 border border-white/[0.06]">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-500 font-medium">估算抢回时间</span>
            <span className="text-[8px] text-slate-500">估算</span>
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-bold font-mono text-amber-400">~{summary.estimatedMinutesSaved}</span>
            <span className="text-[10px] text-slate-400">分钟</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-dark-800/60 border border-white/[0.06]">
          <span className="text-[10px] text-slate-500 font-medium">表达 & 训练</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-bold font-mono text-emerald-400">{summary.expressionCount + summary.workoutCount}</span>
            <span className="text-[10px] text-slate-400">项记录</span>
          </div>
        </div>
      </div>

      {/* Ticket Wallet */}
      <div className="p-3.5 rounded-2xl bg-dark-800/70 border border-amber-500/20 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Ticket className="w-4 h-4 text-amber-400" />
            <span>娱乐券钱包</span>
          </div>
          <span className="text-xs font-mono font-bold text-amber-300">
            {ticketData.balance} 张可用
          </span>
        </div>

        <p className="text-[11px] text-slate-400">
          每累计 150 EXP 自动发放 1 张（30 分钟无负担娱乐）。
        </p>

        <button
          onClick={() => setConfirmUseTicketOpen(true)}
          disabled={ticketData.balance < 1}
          className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-40 text-dark-900 font-bold text-xs shadow-sm transition-all"
        >
          兑换 1 张娱乐券（30 分钟）
        </button>
      </div>

      {/* Backup and Restore */}
      <div className="p-3.5 rounded-2xl bg-dark-800/50 border border-white/[0.06] space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          <span>本地数据备份与迁移</span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            onClick={exportDatabaseToJson}
            className="py-2 px-2.5 rounded-xl bg-dark-700/80 hover:bg-dark-600 text-slate-200 text-xs font-medium border border-white/[0.06] flex items-center justify-center gap-1"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" /> 导出备份
          </button>

          <label className="py-2 px-2.5 rounded-xl bg-dark-700/80 hover:bg-dark-600 text-slate-200 text-xs font-medium border border-white/[0.06] flex items-center justify-center gap-1 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-emerald-400" /> 恢复备份
            <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
          </label>
        </div>
      </div>

      {/* Ticket Modal */}
      {confirmUseTicketOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-dark-800 border border-amber-500/30 rounded-3xl p-5 shadow-2xl space-y-3 text-center">
            <Ticket className="w-8 h-8 text-amber-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">兑换 30 分钟自由娱乐？</h3>
            <p className="text-xs text-slate-400">将扣减 1 张娱乐券，开启心安理得的娱乐时间。</p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleRedeemTicket}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-dark-900 font-bold text-xs"
              >
                确认
              </button>
              <button
                onClick={() => setConfirmUseTicketOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-dark-700 text-slate-300 text-xs"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-dark-800 border border-rose-500/40 rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-1.5 text-rose-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <h3 className="text-sm font-bold text-white">确认替换恢复？</h3>
            </div>
            <p className="text-xs text-rose-200/80">此操作将完全覆盖当前设备上的全部数据。</p>
            <div className="text-[11px] text-slate-300 bg-dark-900/70 p-2.5 rounded-xl space-y-0.5">
              <p>备份时间：{importPreview.exportedDate}</p>
              <p>专注会话：{importPreview.counts.focusSessions} 条</p>
              <p>训练记录：{importPreview.counts.workoutSets} 条</p>
              <p>表达练习：{importPreview.counts.expressionLogs} 条</p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleConfirmImport}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs"
              >
                确认替换
              </button>
              <button
                onClick={() => { setImportPreview(null); setRawBackupData(null); }}
                className="py-2.5 px-3 rounded-xl bg-dark-700 text-slate-300 text-xs"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
