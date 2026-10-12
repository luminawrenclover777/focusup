import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Download,
  Upload,
  Calendar,
  Dumbbell,
  MessageSquare,
  Clock,
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
  // Ticket Wallet state
  const [ticketData, setTicketData] = useState<{
    balance: number;
    totalEarned: number;
    totalUsed: number;
    history: TicketTransaction[];
  }>({ balance: 0, totalEarned: 0, totalUsed: 0, history: [] });

  const [confirmUseTicketOpen, setConfirmUseTicketOpen] = useState<boolean>(false);

  // Stats Summary
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

  // 12-week heatmap data: mapping date string -> count of completed actions
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});

  // Backup Import State
  const [importPreview, setImportPreview] = useState<BackupPreview | null>(null);
  const [rawBackupData, setRawBackupData] = useState<BackupPayload | null>(null);

  // Load dashboard metrics
  const loadDashboardData = async () => {
    // 1. Ticket balance
    const tData = await getTicketBalance();
    setTicketData(tData);

    // 2. Summary stats
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

    // 3. Heatmap (past 84 days)
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

  // Handle Ticket Consumption
  const handleRedeemTicket = async () => {
    const res = await useTicket('兑换 30 分钟无负罪感娱乐时间');
    if (res.success) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      setConfirmUseTicketOpen(false);
      loadDashboardData();
      refreshData();
    } else {
      alert(res.message);
    }
  };

  // Handle Backup File Select
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
      } catch (err) {
        alert('文件解析失败，请确保是标准的 FocusUp JSON 备份文件。');
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  // Confirm Import
  const handleConfirmImport = async () => {
    if (!rawBackupData) return;
    try {
      await restoreDatabaseFromJson(rawBackupData);
      setImportPreview(null);
      setRawBackupData(null);
      refreshData();
      loadDashboardData();
      alert('数据恢复成功！所有历史记录与 EXP 已无缝更新。');
    } catch (err) {
      console.error(err);
      alert('导入失败，已自动回滚，当前数据保持不变。');
    }
  };

  // Generate 84 days list (12 weeks)
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
          let bg = 'bg-dark-900 border-dark-700/60';
          if (item.count >= 5) bg = 'bg-emerald-400 border-emerald-300';
          else if (item.count >= 3) bg = 'bg-emerald-600 border-emerald-500';
          else if (item.count >= 1) bg = 'bg-emerald-900 border-emerald-800';

          return (
            <div
              key={item.date}
              title={`${item.date}：完成 ${item.count} 次有效行动`}
              className={`w-2.5 h-2.5 rounded-sm border ${bg} transition-colors`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4 px-4 py-3 max-w-md mx-auto">
      {/* Dimension Level Details */}
      <div className="p-4 rounded-2xl bg-dark-800 border border-dark-700 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-brand-accent" />
            <h3 className="text-sm font-bold text-white">个人三维成长雷达</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            总累计 {stats.totalExp} EXP
          </span>
        </div>

        {/* Focus Dimension */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-blue-400 font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Focus 专注与自控
            </span>
            <span className="text-slate-300 font-mono">
              Lv.{stats.focus.level} · {stats.focus.levelExp}/{stats.focus.nextLevelExp} EXP
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-dark-900 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${(stats.focus.levelExp / stats.focus.nextLevelExp) * 100}%` }}
            />
          </div>
        </div>

        {/* Body Dimension */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <Dumbbell className="w-3.5 h-3.5" />
              Body 身体活动与力量
            </span>
            <span className="text-slate-300 font-mono">
              Lv.{stats.body.level} · {stats.body.levelExp}/{stats.body.nextLevelExp} EXP
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-dark-900 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(stats.body.levelExp / stats.body.nextLevelExp) * 100}%` }}
            />
          </div>
        </div>

        {/* Voice Dimension */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              Voice 思考与结构表达
            </span>
            <span className="text-slate-300 font-mono">
              Lv.{stats.voice.level} · {stats.voice.levelExp}/{stats.voice.nextLevelExp} EXP
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-dark-900 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${(stats.voice.levelExp / stats.voice.nextLevelExp) * 100}%` }}
            />
          </div>
        </div>

        <p className="text-[10px] text-slate-400 pt-1">
          * 每个维度独立累计，每 300 EXP 升 1 级。所有 EXP 均可追溯至具体的行为流水。
        </p>
      </div>

      {/* 12-Week Heatmap (Section 5.4) */}
      <div className="p-4 rounded-2xl bg-dark-800 border border-dark-700 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              最近 12 周行动热力图
            </h3>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <span>少</span>
            <span className="w-2 h-2 rounded-sm bg-dark-900 border border-dark-700 inline-block"></span>
            <span className="w-2 h-2 rounded-sm bg-emerald-900 inline-block"></span>
            <span className="w-2 h-2 rounded-sm bg-emerald-600 inline-block"></span>
            <span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block"></span>
            <span>多</span>
          </div>
        </div>

        {renderHeatmap()}

        <p className="text-[10px] text-slate-400">
          基于你实际记录并保存的专注、微动作、训练与思考练习生成。
        </p>
      </div>

      {/* Core Action Metrics Summary */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3.5 rounded-xl bg-dark-800 border border-dark-700">
          <span className="text-[10px] text-slate-400 font-medium">有效专注时长</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-white">{summary.effectiveFocusMinutes}</span>
            <span className="text-xs text-slate-400">分钟</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-dark-800 border border-dark-700">
          <span className="text-[10px] text-slate-400 font-medium">截胡 & 止损次数</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-blue-400">{summary.interceptCount + summary.stopLossCount}</span>
            <span className="text-xs text-slate-400">次抢回注意力</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-dark-800 border border-dark-700">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium">潜在抢回时间</span>
            <span className="text-[9px] text-slate-400 bg-dark-900 px-1 py-0.5 rounded">估算值</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-amber-400">~{summary.estimatedMinutesSaved}</span>
            <span className="text-xs text-slate-400">分钟</span>
          </div>
          <span className="text-[9px] text-slate-400 block mt-0.5">按每次截胡 20 分钟估算</span>
        </div>

        <div className="p-3.5 rounded-xl bg-dark-800 border border-dark-700">
          <span className="text-[10px] text-slate-400 font-medium">结构表达 & 训练</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-emerald-400">{summary.expressionCount + summary.workoutCount}</span>
            <span className="text-xs text-slate-400">项行动日志</span>
          </div>
        </div>
      </div>

      {/* Entertainment Ticket Wallet (Section 4.4) */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-dark-800 to-dark-800 border border-amber-600/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Ticket className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">娱乐券赏金钱包</h3>
          </div>
          <span className="text-xs text-amber-300 font-bold bg-amber-950 px-2.5 py-1 rounded-full border border-amber-800">
            可用 {ticketData.balance} 张 (30分/张)
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          每累计获得 <strong>150 EXP</strong>，系统自动发放 1 张 30 分钟娱乐券。用成长换取无负罪感的游戏或追剧时间！
        </p>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setConfirmUseTicketOpen(true)}
            disabled={ticketData.balance < 1}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-dark-900 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1"
          >
            <Ticket className="w-3.5 h-3.5" />
            兑换 1 张娱乐券（30 分钟）
          </button>
        </div>

        <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-dark-700/60">
          <span>累计获得：{ticketData.totalEarned} 张</span>
          <span>已兑换消费：{ticketData.totalUsed} 张</span>
        </div>
      </div>

      {/* Data Backup & Restore (Section 5.4 & 8.5) */}
      <div className="p-4 rounded-2xl bg-dark-800 border border-dark-700 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-300" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              本地数据备份与迁移
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">IndexedDB 离线存储</span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          FocusUp 尊重隐私，所有数据均保存在当前设备浏览器本地。定期导出 JSON 备份可防范浏览器清理网站缓存。
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={exportDatabaseToJson}
            className="py-2.5 px-3 rounded-xl bg-dark-700 hover:bg-dark-600 active:scale-95 text-slate-200 text-xs font-semibold border border-dark-600 flex items-center justify-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            导出 JSON 备份
          </button>

          <label className="py-2.5 px-3 rounded-xl bg-dark-700 hover:bg-dark-600 active:scale-95 text-slate-200 text-xs font-semibold border border-dark-600 flex items-center justify-center gap-1.5 transition-all cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            导入备份恢复
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Ticket Consumption Confirmation Modal */}
      {confirmUseTicketOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-dark-800 border border-amber-500/50 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="text-center">
              <span className="inline-flex p-3 rounded-full bg-amber-500/20 text-amber-400 mb-2">
                <Ticket className="w-7 h-7" />
              </span>
              <h3 className="text-lg font-bold text-white">确认兑换娱乐券？</h3>
              <p className="text-xs text-slate-300 mt-1">
                将扣减 1 张娱乐券，开启 30 分钟属于你的心安理得自由娱乐时间。
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleRedeemTicket}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-dark-900 font-bold text-xs shadow-md transition-all active:scale-95"
              >
                确认兑换
              </button>
              <button
                onClick={() => setConfirmUseTicketOpen(false)}
                className="py-3 px-4 rounded-xl bg-dark-700 text-slate-300 text-xs font-medium"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Import Preview Modal (Section 8.5) */}
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-dark-800 border border-rose-500/50 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-white">确认导入备份数据？</h3>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-200 leading-relaxed">
              ⚠️ <strong>注意：</strong> 导入操作将采用<strong>整库替换</strong>策略，当前设备的所有数据将被此备份文件完全覆盖。
            </div>

            <div className="space-y-1.5 text-xs bg-dark-900/80 p-3 rounded-xl border border-dark-700">
              <p className="text-slate-400">备份生成日期：<strong className="text-white">{importPreview.exportedDate}</strong></p>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-300 pt-1">
                <span>专注会话：{importPreview.counts.focusSessions} 条</span>
                <span>自控截胡：{importPreview.counts.activityEvents} 条</span>
                <span>表达练习：{importPreview.counts.expressionLogs} 条</span>
                <span>训练记录：{importPreview.counts.workoutSets} 条</span>
                <span>EXP 流水：{importPreview.counts.expTransactions} 条</span>
                <span>娱乐券流水：{importPreview.counts.ticketTransactions} 条</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleConfirmImport}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
              >
                确认替换并恢复
              </button>
              <button
                onClick={() => {
                  setImportPreview(null);
                  setRawBackupData(null);
                }}
                className="py-3 px-4 rounded-xl bg-dark-700 text-slate-300 text-xs font-medium"
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
