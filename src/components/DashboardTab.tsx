import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Download,
  Upload,
  Calendar,
  Sparkles,
  FileText
} from 'lucide-react';
import type { DimensionStats, TicketTransaction } from '../types';
import { db, getLocalDate } from '../db';
import { getTicketBalance, useTicket } from '../services/ticketService';
import { exportDatabaseToJson, validateBackup, restoreDatabaseFromJson, type BackupPreview, type BackupPayload } from '../services/backupService';
import confetti from 'canvas-confetti';
import { IOSAlert } from './IOSModal';

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
  const [appAlert, setAppAlert] = useState<{ title: string; message?: string } | null>(null);

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
      setAppAlert({ title: '兑换提示', message: res.message });
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
          setAppAlert({ title: '无效的备份文件', message: preview.error || '文件结构不正确' });
        }
      } catch {
        setAppAlert({ title: '解析失败', message: '请确保上传的是合法的 FocusUp JSON 备份文件。' });
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
      setAppAlert({ title: '恢复成功', message: '所有自律与专注数据已顺利恢复！' });
    } catch {
      setAppAlert({ title: '导入失败', message: '已自动回滚，当前数据未受破坏。' });
    }
  };

  const [inspectedDay, setInspectedDay] = useState<{ date: string; count: number } | null>(null);

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
      <div className="space-y-2">
        <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto py-1 scroll-smooth">
          {days.map((item) => {
            let bg = 'bg-[#242426] border-white/[0.04]';
            if (item.count >= 4) bg = 'bg-[#30D158] border-emerald-300';
            else if (item.count >= 2) bg = 'bg-emerald-600 border-emerald-500';
            else if (item.count >= 1) bg = 'bg-emerald-950 border-emerald-800/80';

            const isSelected = inspectedDay?.date === item.date;

            return (
              <button
                key={item.date}
                type="button"
                onClick={() => setInspectedDay(item)}
                title={`${item.date}：${item.count} 项行动`}
                className={`w-3.5 h-3.5 rounded-[4px] border ${bg} transition-all active:scale-90 outline-none ${
                  isSelected ? 'ring-2 ring-white scale-110 z-10' : ''
                }`}
              />
            );
          })}
        </div>

        {/* Heatmap Selected Day Inspector Tooltip Bar */}
        <div className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-xl bg-[#2C2C2E]/60 border border-white/[0.06] text-slate-300">
          {inspectedDay ? (
            <>
              <span className="font-mono text-white font-medium">{inspectedDay.date}</span>
              <span className="text-[#30D158] font-semibold">
                {inspectedDay.count > 0 ? `完成 ${inspectedDay.count} 项自律行动` : '无行动记录'}
              </span>
            </>
          ) : (
            <span className="text-[#8E8E93] text-center w-full">点击任意方块，查看单日自律详情</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 px-5 py-3.5 max-w-lg mx-auto pb-28">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">成长看板</h2>
        <p className="text-xs text-[#8E8E93] mt-0.5">累积自律数据 · 见证自我蜕变</p>
      </div>

      {/* 3D Growth Breakdown Card */}
      <div className="p-5 rounded-3xl bg-[#1C1C1E] border border-white/[0.08] space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Sparkles className="w-4 h-4 text-[#0A84FF]" />
            <span>三维成长进度</span>
          </div>
          <span className="text-xs font-mono font-semibold text-[#8E8E93]">总计 {stats.totalExp} EXP</span>
        </div>

        {/* Focus */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-[#0A84FF]">专注 Focus · Lv.{stats.focus.level}</span>
            <span className="text-[#8E8E93] font-mono text-[11px]">{stats.focus.levelExp} / {stats.focus.nextLevelExp} EXP</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#2C2C2E] overflow-hidden">
            <div
              className="h-full bg-[#0A84FF] rounded-full transition-all duration-500"
              style={{ width: `${(stats.focus.levelExp / stats.focus.nextLevelExp) * 100}%` }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-[#30D158]">活力 Body · Lv.{stats.body.level}</span>
            <span className="text-[#8E8E93] font-mono text-[11px]">{stats.body.levelExp} / {stats.body.nextLevelExp} EXP</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#2C2C2E] overflow-hidden">
            <div
              className="h-full bg-[#30D158] rounded-full transition-all duration-500"
              style={{ width: `${(stats.body.levelExp / stats.body.nextLevelExp) * 100}%` }}
            />
          </div>
        </div>

        {/* Voice */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-[#FF9F0A]">表达 Voice · Lv.{stats.voice.level}</span>
            <span className="text-[#8E8E93] font-mono text-[11px]">{stats.voice.levelExp} / {stats.voice.nextLevelExp} EXP</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#2C2C2E] overflow-hidden">
            <div
              className="h-full bg-[#FF9F0A] rounded-full transition-all duration-500"
              style={{ width: `${(stats.voice.levelExp / stats.voice.nextLevelExp) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2x2 Metric Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/[0.08] shadow-sm">
          <span className="text-[11px] text-[#8E8E93] font-medium block">累计有效专注</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-white">{summary.effectiveFocusMinutes}</span>
            <span className="text-xs text-[#8E8E93]">分钟</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/[0.08] shadow-sm">
          <span className="text-[11px] text-[#8E8E93] font-medium block">抵御 & 刹车</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-[#0A84FF]">{summary.interceptCount + summary.stopLossCount}</span>
            <span className="text-xs text-[#8E8E93]">次夺回</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/[0.08] shadow-sm">
          <span className="text-[11px] text-[#8E8E93] font-medium block">抢回无意义时间</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-[#FF9F0A]">~{summary.estimatedMinutesSaved}</span>
            <span className="text-xs text-[#8E8E93]">分钟</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/[0.08] shadow-sm">
          <span className="text-[11px] text-[#8E8E93] font-medium block">表达 & 训练打卡</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-[#30D158]">{summary.expressionCount + summary.workoutCount}</span>
            <span className="text-xs text-[#8E8E93]">项记录</span>
          </div>
        </div>
      </div>

      {/* Ticket Wallet Card (Royalty Purple Accent, distinct from Voice Orange) */}
      <div className="p-5 rounded-3xl bg-gradient-to-b from-[#1C1C1E] to-[#1b1522] border border-purple-500/30 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Ticket className="w-4 h-4 text-purple-400" />
            <span>娱乐券赏金钱包</span>
          </div>
          <span className="text-sm font-mono font-bold text-purple-300">
            {ticketData.balance} 张可用
          </span>
        </div>

        <p className="text-xs text-[#8E8E93] leading-relaxed">
          每累计 150 EXP 自动发放 1 张娱乐券（可兑换 30 分钟心安理得、无负罪感的自我放松时光）。
        </p>

        <button
          onClick={() => setConfirmUseTicketOpen(true)}
          disabled={ticketData.balance < 1}
          className="w-full h-12 rounded-2xl bg-[#BF5AF2] hover:bg-purple-400 active:scale-95 disabled:opacity-35 text-white font-bold text-xs shadow-md shadow-purple-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Ticket className="w-4 h-4" />
          兑换 1 张娱乐券（30 分钟无负担放松）
        </button>
      </div>

      {/* 12-Week Heatmap */}
      <div className="p-5 rounded-3xl bg-[#1C1C1E] border border-white/[0.08] space-y-3 shadow-sm">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#30D158]" />
            <span className="text-sm font-bold text-white">12 周行动热力</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#8E8E93]">
            <span>少</span>
            <span className="w-2.5 h-2.5 rounded-sm bg-[#242426] inline-block border border-white/[0.05]" />
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-950 inline-block" />
            <span className="w-2.5 h-2.5 rounded-sm bg-[#30D158] inline-block" />
            <span>多</span>
          </div>
        </div>
        {renderHeatmap()}
      </div>

      {/* Backup and Restore */}
      <div className="p-5 rounded-3xl bg-[#1C1C1E] border border-white/[0.08] space-y-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <FileText className="w-4 h-4 text-[#8E8E93]" />
          <span>本地数据备份与迁移</span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-0.5">
          <button
            onClick={exportDatabaseToJson}
            className="h-11 px-3.5 rounded-2xl bg-[#2C2C2E] hover:bg-[#3A3A3C] text-slate-200 text-xs font-semibold border border-white/[0.08] flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-[#0A84FF]" /> 导出备份
          </button>

          <label className="h-11 px-3.5 rounded-2xl bg-[#2C2C2E] hover:bg-[#3A3A3C] text-slate-200 text-xs font-semibold border border-white/[0.08] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all">
            <Upload className="w-3.5 h-3.5 text-[#30D158]" /> 恢复备份
            <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
          </label>
        </div>
      </div>

      {/* iOS Ticket Alert */}
      <IOSAlert
        isOpen={confirmUseTicketOpen}
        title="兑换 30 分钟自由娱乐？"
        message="将扣减 1 张娱乐券，开启心安理得、无负罪感的自我犒劳时光。"
        cancelText="稍后再用"
        confirmText="确认兑换"
        onCancel={() => setConfirmUseTicketOpen(false)}
        onConfirm={handleRedeemTicket}
      />

      {/* iOS Destructive Import Alert */}
      <IOSAlert
        isOpen={!!importPreview}
        title="确认替换恢复数据？"
        message={importPreview ? `备份时间：${importPreview.exportedDate}。此操作将完全覆盖当前设备上的所有数据，请确认。` : ''}
        cancelText="取消"
        confirmText="确认覆盖"
        isDestructive={true}
        onCancel={() => { setImportPreview(null); setRawBackupData(null); }}
        onConfirm={handleConfirmImport}
      />

      {/* iOS Global App Alert */}
      <IOSAlert
        isOpen={!!appAlert}
        title={appAlert?.title || ''}
        message={appAlert?.message}
        confirmText="好"
        onConfirm={() => setAppAlert(null)}
      />
    </div>
  );
};
