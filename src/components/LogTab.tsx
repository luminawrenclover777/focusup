import React, { useState, useEffect } from 'react';
import {
  Clock,
  Shield,
  Download,
  Upload,
  Copy,
  Check,
  Smartphone,
  ChevronDown,
  ChevronUp,
  History
} from 'lucide-react';
import { db, getLocalDate } from '../db';
import type { FocusSession } from '../types';
import { exportDatabaseToJson, restoreDatabaseFromJson, validateBackup } from '../services/backupService';
import { IOSAlert } from './IOSModal';

export const LogTab: React.FC = () => {
  const [todayMinutes, setTodayMinutes] = useState<number>(0);
  const [todayBrakes, setTodayBrakes] = useState<number>(0);
  const [totalMinutes, setTotalMinutes] = useState<number>(0);
  const [recentSessions, setRecentSessions] = useState<FocusSession[]>([]);

  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [showShortcutTutorial, setShowShortcutTutorial] = useState<boolean>(true);
  const [alertInfo, setAlertInfo] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    async function loadStats() {
      const today = getLocalDate();
      const allSessions = await db.focusSessions.toArray();

      let tToday = 0;
      let tAll = 0;

      for (const s of allSessions) {
        if (s.status === 'completed' && s.effectiveSeconds) {
          tAll += s.effectiveSeconds;
          const sessionDate = new Date(s.startedAt).toISOString().split('T')[0];
          if (sessionDate === today) {
            tToday += s.effectiveSeconds;
          }
        }
      }

      setTodayMinutes(Math.floor(tToday / 60));
      setTotalMinutes(Math.floor(tAll / 60));

      const sorted = allSessions
        .filter((s) => s.status === 'completed')
        .sort((a, b) => b.startedAt - a.startedAt)
        .slice(0, 10);
      setRecentSessions(sorted);

      const brakeCount = await db.activityEvents
        .where('localDate')
        .equals(today)
        .and((e) => e.type === 'stop_loss' || e.type === 'intercept')
        .count();
      setTodayBrakes(brakeCount);
    }

    loadStats();
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const preview = validateBackup(json);
        if (preview.valid) {
          await restoreDatabaseFromJson(json);
          setAlertInfo({
            title: '恢复完成',
            message: '本地历史记录已顺利还原，刷新后即可查看最新统计。'
          });
        } else {
          setAlertInfo({
            title: '恢复失败',
            message: preview.error || '备份文件结构不正确'
          });
        }
      } catch {
        setAlertInfo({
          title: '恢复失败',
          message: '请确保上传的是合法的 FocusUp JSON 备份文件。'
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const formatHoursAndMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} 分钟`;
    return `${h} 小时 ${m} 分钟`;
  };

  return (
    <div className="space-y-5 px-5 py-4 max-w-lg mx-auto pb-28 text-white">
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">记录与真实反馈</h2>
        <p className="text-xs text-[#8E8E93] mt-0.5">
          无虚拟数值膨胀。只记录你清醒度过的每一分钟与每一次主动刹车。
        </p>
      </div>

      {/* Primary Honest Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/[0.08]">
          <div className="flex items-center gap-2 text-xs text-[#8E8E93] mb-1">
            <Clock className="w-3.5 h-3.5 text-[#0A84FF]" />
            <span>今日专注</span>
          </div>
          <div className="text-2xl font-mono font-bold text-white tracking-tight">
            {todayMinutes} <span className="text-xs font-normal text-[#8E8E93]">分钟</span>
          </div>
          <div className="text-[11px] text-[#8E8E93] mt-1">累计: {formatHoursAndMins(totalMinutes)}</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/[0.08]">
          <div className="flex items-center gap-2 text-xs text-[#8E8E93] mb-1">
            <Shield className="w-3.5 h-3.5 text-[#FF9F0A]" />
            <span>今日刹车拦截</span>
          </div>
          <div className="text-2xl font-mono font-bold text-white tracking-tight">
            {todayBrakes} <span className="text-xs font-normal text-[#8E8E93]">次</span>
          </div>
          <div className="text-[11px] text-[#8E8E93] mt-1">阻断下意识多巴胺滑动</div>
        </div>
      </div>

      {/* Real Weapon: iOS Shortcuts Automation Tutorial */}
      <div className="p-5 rounded-3xl bg-gradient-to-b from-[#1C1C1E] to-[#161618] border border-white/10 space-y-4">
        <div
          onClick={() => setShowShortcutTutorial(!showShortcutTutorial)}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-500/15 text-[#FF9F0A]">
              <Smartphone className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">iPhone 自动化拦截配置</h3>
              <p className="text-[11px] text-[#8E8E93]">让系统在打开短视频时，自动跳转到呼吸刹车</p>
            </div>
          </div>
          <button className="text-[#8E8E93] hover:text-white">
            {showShortcutTutorial ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showShortcutTutorial && (
          <div className="space-y-3 pt-2 text-xs border-t border-white/[0.06] animate-fade-in leading-relaxed">
            <div className="space-y-2">
              <div className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-white/10 text-slate-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <p className="text-slate-200">
                  打开 iPhone 自带的<strong>「快捷指令」App</strong>，点击底部中间的<strong>「自动化」</strong>。
                </p>
              </div>

              <div className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-white/10 text-slate-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <p className="text-slate-200">
                  点击右上角「+」创建<strong>「个人自动化」</strong>，选择<strong>「App」</strong>，勾选抖音/小红书/B站，选择<strong>「打开时」</strong>，下方勾选<strong>「立即运行」</strong>。
                </p>
              </div>

              <div className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-white/10 text-slate-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <p className="text-slate-200">
                  添加操作，搜索<strong>「打开 URL」</strong>，粘贴下方 FocusUp 刹车网址：
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                readOnly
                value={window.location.href}
                className="flex-1 h-10 px-3 rounded-xl bg-[#2C2C2E] border border-white/10 text-xs font-mono text-slate-300 select-all outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="h-10 px-4 rounded-xl bg-[#0A84FF] hover:bg-blue-400 active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? '已复制' : '复制网址'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recent Sessions List */}
      <div className="p-5 rounded-3xl bg-[#1C1C1E] border border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#0A84FF]" />
            <span className="text-sm font-bold text-white">最近专注流水</span>
          </div>
          <span className="text-[11px] text-[#8E8E93]">{recentSessions.length} 条记录</span>
        </div>

        {recentSessions.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#8E8E93]">暂无完成的专注记录</div>
        ) : (
          <div className="space-y-2 pt-1">
            {recentSessions.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-2xl bg-[#2C2C2E]/50 border border-white/[0.04] flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-white">
                    {s.mode === 'stopwatch' ? '正向心流' : '倒计时专注'}
                  </div>
                  <div className="text-[10px] text-[#8E8E93]">
                    {new Date(s.startedAt).toLocaleString('zh-CN', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-sm text-[#0A84FF]">
                    {Math.floor((s.effectiveSeconds || 0) / 60)} 分钟
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data Backup */}
      <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/[0.08] flex items-center justify-between text-xs">
        <div>
          <span className="font-bold text-white block">本地数据备份</span>
          <span className="text-[11px] text-[#8E8E93]">离线存储在当前浏览器，可随时导出 JSON 备份</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={exportDatabaseToJson}
            className="h-9 px-3 rounded-xl bg-[#2C2C2E] hover:bg-[#3A3A3C] active:scale-95 text-xs text-slate-200 border border-white/10 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> 导出
          </button>
          <label className="h-9 px-3 rounded-xl bg-[#2C2C2E] hover:bg-[#3A3A3C] active:scale-95 text-xs text-slate-200 border border-white/10 flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> 恢复
            <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
          </label>
        </div>
      </div>

      <IOSAlert
        isOpen={!!alertInfo}
        title={alertInfo?.title || ''}
        message={alertInfo?.message}
        onConfirm={() => setAlertInfo(null)}
      />
    </div>
  );
};
