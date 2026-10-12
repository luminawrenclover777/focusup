import React, { useState } from 'react';
import {
  Play,
  Shield,
  ZapOff,
  CheckCircle2,
  Circle,
  ArrowRight,
  Dumbbell,
  MessageSquare
} from 'lucide-react';
import type { DailyHabit, EnergyMode, DimensionStats } from '../types';
import { db, getLocalDate } from '../db';
import { awardExp, revertExp, EXP_RULES } from '../services/expService';
import confetti from 'canvas-confetti';

interface TodayTabProps {
  energyMode: EnergyMode;
  stats: {
    focus: DimensionStats;
    body: DimensionStats;
    voice: DimensionStats;
    totalExp: number;
  };
  onNavigateToFocus: (defaultMinutes?: number) => void;
  onNavigateToVoice: (trigger?: 'intercept' | 'stop_loss' | 'daily_practice') => void;
  onNavigateToBody: () => void;
  onNavigateToDashboard: () => void;
  todayHabit: DailyHabit;
  onHabitChange: (habit: DailyHabit) => void;
  dailyCounts: {
    interceptCount: number;
    interceptCap: number;
    stopLossCount: number;
    stopLossCap: number;
  };
  refreshData: () => void;
}

export const TodayTab: React.FC<TodayTabProps> = ({
  energyMode,
  stats,
  onNavigateToFocus,
  onNavigateToVoice,
  onNavigateToBody,
  onNavigateToDashboard,
  todayHabit,
  onHabitChange,
  dailyCounts,
  refreshData
}) => {
  const [selectedMinutes, setSelectedMinutes] = useState<number>(energyMode === 'recovery' ? 10 : 25);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const today = getLocalDate();
  const isRecovery = energyMode === 'recovery';

  // Intercept action
  const handleIntercept = async () => {
    const eventId = `act_int_${Date.now()}`;
    await db.activityEvents.put({
      id: eventId,
      type: 'intercept',
      createdAt: Date.now(),
      localDate: today,
      completed: true,
      estimatedMinutesSaved: 20
    });

    const tx = await awardExp({
      dimension: 'focus',
      amount: EXP_RULES.INTERCEPT,
      reason: '事前截胡短视频冲动',
      sourceType: 'intercept',
      sourceId: eventId,
      localDate: today
    });

    confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
    setFeedbackMsg(tx ? `截胡成功 +${EXP_RULES.INTERCEPT} Focus EXP (已估算节省 ~20分)` : '截胡已记录 (今日奖励已满 5/5)');
    refreshData();
  };

  // Stop-loss action
  const handleStopLoss = async () => {
    const eventId = `act_sl_${Date.now()}`;
    await db.activityEvents.put({
      id: eventId,
      type: 'stop_loss',
      createdAt: Date.now(),
      localDate: today,
      completed: true
    });

    const tx = await awardExp({
      dimension: 'focus',
      amount: EXP_RULES.STOP_LOSS,
      reason: '主动止损切断无意识滑动',
      sourceType: 'stop_loss',
      sourceId: eventId,
      localDate: today
    });

    confetti({ particleCount: 40, spread: 70, origin: { y: 0.7 } });
    setFeedbackMsg(tx ? `止损果断 +${EXP_RULES.STOP_LOSS} Focus EXP` : '止损已记录 (今日奖励已满 5/5)');
    refreshData();
  };

  // Habit toggle
  const toggleHabit = async (habitKey: 'protein' | 'sleep' | 'activity') => {
    const newState = !todayHabit[habitKey];
    const updated: DailyHabit = {
      ...todayHabit,
      localDate: today,
      [habitKey]: newState
    };

    await db.dailyHabits.put(updated);
    onHabitChange(updated);

    const sourceType = `habit_${habitKey}`;
    const sourceId = `habit_${habitKey}_${today}`;
    const habitNames = {
      protein: '优质蛋白质打卡',
      sleep: '规律睡眠打卡',
      activity: '日常活动步数打卡'
    };

    if (newState) {
      await awardExp({
        dimension: 'body',
        amount: EXP_RULES.HABIT_PROTEIN,
        reason: habitNames[habitKey],
        sourceType,
        sourceId,
        localDate: today
      });
      confetti({ particleCount: 20, spread: 45, origin: { y: 0.8 } });
    } else {
      await revertExp({
        sourceType,
        sourceId,
        reason: `取消${habitNames[habitKey]}`
      });
    }

    refreshData();
  };

  return (
    <div className="space-y-5 px-5 py-4 max-w-lg mx-auto pb-24">
      {/* 3-Dimension Apple Style Summary Bar */}
      <button
        onClick={onNavigateToDashboard}
        className="w-full flex items-center justify-between p-4 rounded-3xl bg-[#1C1C1E] hover:bg-[#242426] border border-white/[0.08] transition-all active:scale-[0.99] shadow-sm"
      >
        <div className="flex items-center gap-4 text-sm font-semibold">
          <span className="flex items-center gap-2 text-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            专注 Lv.{stats.focus.level}
          </span>
          <span className="flex items-center gap-2 text-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            活力 Lv.{stats.body.level}
          </span>
          <span className="flex items-center gap-2 text-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            表达 Lv.{stats.voice.level}
          </span>
        </div>
        <ArrowRight className="w-4 h-4 text-[#8E8E93]" />
      </button>

      {/* FocusPod Hero Card */}
      <div className="p-6 rounded-3xl bg-[#1C1C1E] border border-white/[0.08] shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">专注计时</h2>
            <p className="text-xs text-[#8E8E93] mt-1">
              {isRecovery ? '保底日推荐 10 分钟轻启动' : '沉浸心流 · 离线白噪音陪伴'}
            </p>
          </div>
          <button
            onClick={() => onNavigateToFocus(selectedMinutes)}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-[#007AFF] hover:bg-blue-400 active:scale-95 text-white shadow-lg shadow-blue-500/25 transition-all"
            title="开始专注"
          >
            <Play className="w-6 h-6 ml-0.5 fill-current" />
          </button>
        </div>

        {/* Preset Duration Chips */}
        <div className="flex items-center gap-2">
          {isRecovery && (
            <button
              onClick={() => setSelectedMinutes(10)}
              className={`flex-1 h-11 rounded-2xl text-sm font-semibold border transition-all ${
                selectedMinutes === 10
                  ? 'bg-emerald-500 text-white border-emerald-400'
                  : 'bg-[#2C2C2E] text-emerald-400 border-emerald-500/30'
              }`}
            >
              10分
            </button>
          )}
          {[15, 25, 45].map((mins) => (
            <button
              key={mins}
              onClick={() => setSelectedMinutes(mins)}
              className={`flex-1 h-11 rounded-2xl text-sm font-semibold border transition-all ${
                selectedMinutes === mins
                  ? 'bg-[#007AFF] text-white border-blue-400 shadow-sm'
                  : 'bg-[#2C2C2E] text-slate-200 border-white/[0.06] hover:bg-[#3A3A3C]'
              }`}
            >
              {mins}分
            </button>
          ))}
          <button
            onClick={() => onNavigateToFocus(0)}
            className="flex-1 h-11 rounded-2xl text-sm font-semibold border bg-[#2C2C2E] text-slate-300 border-white/[0.06] hover:bg-[#3A3A3C]"
          >
            心流
          </button>
        </div>
      </div>

      {/* Dual Interceptor Cards */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* 抵御诱惑 */}
        <button
          onClick={handleIntercept}
          className="p-5 rounded-3xl bg-[#1C1C1E] hover:bg-[#242426] border border-white/[0.08] active:scale-[0.98] transition-all text-left flex flex-col justify-between shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </span>
            <span className="text-xs text-[#8E8E93] font-mono">
              {dailyCounts.interceptCount}/{dailyCounts.interceptCap}
            </span>
          </div>
          <div className="mt-4">
            <span className="text-base font-bold text-white block">抵御诱惑</span>
            <span className="text-xs text-[#8E8E93] block mt-0.5">觉察冲动 · 停下深呼吸</span>
            <span className="text-xs text-blue-400 font-semibold block mt-2">
              +{EXP_RULES.INTERCEPT} 专注值
            </span>
          </div>
        </button>

        {/* 立即刹车 */}
        <button
          onClick={handleStopLoss}
          className="p-5 rounded-3xl bg-[#1C1C1E] hover:bg-[#242426] border border-white/[0.08] active:scale-[0.98] transition-all text-left flex flex-col justify-between shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <ZapOff className="w-5 h-5" />
            </span>
            <span className="text-xs text-[#8E8E93] font-mono">
              {dailyCounts.stopLossCount}/{dailyCounts.stopLossCap}
            </span>
          </div>
          <div className="mt-4">
            <span className="text-base font-bold text-white block">立即刹车</span>
            <span className="text-xs text-[#8E8E93] block mt-0.5">切断滑动 · 找回掌控</span>
            <span className="text-xs text-amber-400 font-semibold block mt-2">
              +{EXP_RULES.STOP_LOSS} 专注值
            </span>
          </div>
        </button>
      </div>

      {/* Reactive Guidance Banner */}
      {feedbackMsg && (
        <div className="p-4 rounded-2xl bg-[#2C2C2E] border border-blue-500/40 text-sm flex items-center justify-between animate-fade-in shadow-md">
          <span className="text-slate-100 font-medium">{feedbackMsg}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateToVoice('intercept')}
              className="text-amber-400 hover:text-amber-300 font-semibold text-xs"
            >
              60秒倾倒 →
            </button>
            <button
              onClick={() => setFeedbackMsg(null)}
              className="text-[#8E8E93] hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Daily Habits Checklist */}
      <div className="p-5 rounded-3xl bg-[#1C1C1E] border border-white/[0.08] space-y-3 shadow-sm">
        <div className="flex items-center justify-between px-1">
          <span className="text-base font-bold text-white tracking-tight">基石习惯</span>
          <span className="text-xs text-[#8E8E93]">+5 活力值 / 项</span>
        </div>

        <div className="space-y-2">
          {/* Protein */}
          <div
            onClick={() => toggleHabit('protein')}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-[#2C2C2E]/60 hover:bg-[#2C2C2E] cursor-pointer active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              {todayHabit.protein ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Circle className="w-5 h-5 text-[#8E8E93]" />
              )}
              <span className={`text-sm ${todayHabit.protein ? 'text-[#8E8E93] line-through' : 'text-slate-100 font-medium'}`}>
                优质蛋白质摄入
              </span>
            </div>
            <span className="text-xs text-emerald-400/80 font-mono font-medium">+5</span>
          </div>

          {/* Sleep */}
          <div
            onClick={() => toggleHabit('sleep')}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-[#2C2C2E]/60 hover:bg-[#2C2C2E] cursor-pointer active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              {todayHabit.sleep ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Circle className="w-5 h-5 text-[#8E8E93]" />
              )}
              <span className={`text-sm ${todayHabit.sleep ? 'text-[#8E8E93] line-through' : 'text-slate-100 font-medium'}`}>
                规律充沛睡眠
              </span>
            </div>
            <span className="text-xs text-emerald-400/80 font-mono font-medium">+5</span>
          </div>

          {/* Activity */}
          <div
            onClick={() => toggleHabit('activity')}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-[#2C2C2E]/60 hover:bg-[#2C2C2E] cursor-pointer active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              {todayHabit.activity ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Circle className="w-5 h-5 text-[#8E8E93]" />
              )}
              <span className={`text-sm ${todayHabit.activity ? 'text-[#8E8E93] line-through' : 'text-slate-100 font-medium'}`}>
                30分钟日常微活动 / 步数
              </span>
            </div>
            <span className="text-xs text-emerald-400/80 font-mono font-medium">+5</span>
          </div>
        </div>
      </div>

      {/* Quick Shortcuts */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onNavigateToBody}
          className="flex items-center justify-between p-4 rounded-2xl bg-[#1C1C1E] hover:bg-[#242426] border border-white/[0.08] text-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Dumbbell className="w-4 h-4" />
            </span>
            <span className="text-sm font-semibold">身体激活</span>
          </div>
          <ArrowRight className="w-4 h-4 text-[#8E8E93]" />
        </button>

        <button
          onClick={() => onNavigateToVoice('daily_practice')}
          className="flex items-center justify-between p-4 rounded-2xl bg-[#1C1C1E] hover:bg-[#242426] border border-white/[0.08] text-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </span>
            <span className="text-sm font-semibold">随心表达</span>
          </div>
          <ArrowRight className="w-4 h-4 text-[#8E8E93]" />
        </button>
      </div>
    </div>
  );
};
