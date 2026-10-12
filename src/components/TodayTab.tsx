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

  // Floating reward toast state
  const [floatingReward, setFloatingReward] = useState<{ text: string; id: number } | null>(null);

  const showRewardBadge = (text: string) => {
    const id = Date.now();
    setFloatingReward({ text, id });
    setTimeout(() => {
      setFloatingReward((current) => (current?.id === id ? null : current));
    }, 1600);
  };

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

    if (tx) {
      showRewardBadge(`+${EXP_RULES.INTERCEPT} 专注值`);
      setFeedbackMsg(`已抵御诱惑，抢回约 20 分钟注意力时光`);
    } else {
      setFeedbackMsg('今日抵御诱惑已达上限 5/5');
    }
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

    if (tx) {
      showRewardBadge(`+${EXP_RULES.STOP_LOSS} 专注值`);
      setFeedbackMsg(`主动刹车成功，掌控权重回手中`);
    } else {
      setFeedbackMsg('今日主动刹车已达上限 5/5');
    }
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
      sleep: '规律充沛睡眠打卡',
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
      showRewardBadge(`+${EXP_RULES.HABIT_PROTEIN} 活力值`);
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
    <div className="relative space-y-4 px-5 py-3.5 max-w-lg mx-auto pb-24">
      {/* Floating Micro Reward Pill */}
      {floatingReward && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-float-reward">
          <div className="px-4 py-1.5 rounded-full bg-white/90 text-black text-xs font-bold tracking-tight shadow-xl backdrop-blur-md flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#0A84FF]" />
            {floatingReward.text}
          </div>
        </div>
      )}

      {/* 3-Dimension Apple Style Summary Bar */}
      <button
        onClick={onNavigateToDashboard}
        className="w-full flex items-center justify-between p-3.5 px-4 rounded-2xl bg-[#1C1C1E] hover:bg-[#242426] border border-white/[0.08] transition-all active:scale-[0.99] shadow-sm"
      >
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-slate-200">
            <span className="w-2 h-2 rounded-full bg-[#0A84FF]" />
            专注 Lv.{stats.focus.level}
          </span>
          <span className="flex items-center gap-1.5 text-slate-200">
            <span className="w-2 h-2 rounded-full bg-[#30D158]" />
            活力 Lv.{stats.body.level}
          </span>
          <span className="flex items-center gap-1.5 text-slate-200">
            <span className="w-2 h-2 rounded-full bg-[#FF9F0A]" />
            表达 Lv.{stats.voice.level}
          </span>
        </div>
        <ArrowRight className="w-4 h-4 text-[#8E8E93]" />
      </button>

      {/* FocusPod Hero Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-b from-[#1C1C1E] to-[#171719] border border-white/10 shadow-lg relative overflow-hidden">
        {/* Subtle radial glow for hero prominence */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-[#0A84FF]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4 relative z-10">
          <div>
            <span className="text-[11px] font-semibold text-[#0A84FF] tracking-wider uppercase block mb-0.5">
              核心心流 · Focus
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">专注计时仓</h2>
            <p className="text-xs text-[#8E8E93] mt-1">
              {isRecovery ? '保底日推荐 10 分钟轻启动' : '沉浸心流 · 离线原生白噪音'}
            </p>
          </div>
          <button
            onClick={() => onNavigateToFocus(selectedMinutes)}
            className="flex items-center justify-center w-13 h-13 rounded-full bg-[#0A84FF] hover:bg-blue-400 active:scale-95 text-white shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
            title="开始专注"
          >
            <Play className="w-5 h-5 ml-0.5 fill-current" />
          </button>
        </div>

        {/* Preset Duration Chips */}
        <div className="flex items-center gap-2 relative z-10">
          {isRecovery && (
            <button
              onClick={() => setSelectedMinutes(10)}
              className={`flex-1 h-10 rounded-xl text-xs font-semibold border transition-all ${
                selectedMinutes === 10
                  ? 'bg-cyan-500 text-black border-cyan-400 shadow-sm'
                  : 'bg-[#2C2C2E] text-cyan-400 border-cyan-500/30'
              }`}
            >
              10分
            </button>
          )}
          {[15, 25, 45].map((mins) => (
            <button
              key={mins}
              onClick={() => setSelectedMinutes(mins)}
              className={`flex-1 h-10 rounded-xl text-xs font-semibold border transition-all ${
                selectedMinutes === mins
                  ? 'bg-[#0A84FF] text-white border-blue-400 shadow-sm'
                  : 'bg-[#2C2C2E] text-slate-200 border-white/[0.06] hover:bg-[#3A3A3C]'
              }`}
            >
              {mins}分
            </button>
          ))}
          <button
            onClick={() => onNavigateToFocus(0)}
            className="flex-1 h-10 rounded-xl text-xs font-semibold border bg-[#2C2C2E] text-slate-300 border-white/[0.06] hover:bg-[#3A3A3C]"
          >
            心流
          </button>
        </div>
      </div>

      {/* Dual Interceptor Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* 抵御诱惑 */}
        <button
          onClick={handleIntercept}
          className="p-4 rounded-2xl bg-[#1C1C1E] hover:bg-[#242426] border border-white/[0.08] active:scale-[0.98] transition-all text-left flex flex-col justify-between shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="w-9 h-9 rounded-xl bg-[#0A84FF]/15 text-[#0A84FF] flex items-center justify-center transition-transform group-hover:scale-105">
              <Shield className="w-4 h-4" />
            </span>
            <span className="text-xs text-[#8E8E93] font-mono">
              {dailyCounts.interceptCount}/{dailyCounts.interceptCap}
            </span>
          </div>
          <div className="mt-3.5">
            <span className="text-sm font-bold text-white block">抵御诱惑</span>
            <span className="text-[11px] text-[#8E8E93] block mt-0.5">觉察冲动 · 停下深呼吸</span>
            <span className="text-[11px] text-[#0A84FF] font-semibold block mt-1.5">
              +{EXP_RULES.INTERCEPT} 专注值
            </span>
          </div>
        </button>

        {/* 立即刹车 */}
        <button
          onClick={handleStopLoss}
          className="p-4 rounded-2xl bg-[#1C1C1E] hover:bg-[#242426] border border-white/[0.08] active:scale-[0.98] transition-all text-left flex flex-col justify-between shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="w-9 h-9 rounded-xl bg-orange-500/15 text-[#FF9F0A] flex items-center justify-center transition-transform group-hover:scale-105">
              <ZapOff className="w-4 h-4" />
            </span>
            <span className="text-xs text-[#8E8E93] font-mono">
              {dailyCounts.stopLossCount}/{dailyCounts.stopLossCap}
            </span>
          </div>
          <div className="mt-3.5">
            <span className="text-sm font-bold text-white block">立即刹车</span>
            <span className="text-[11px] text-[#8E8E93] block mt-0.5">切断滑动 · 找回掌控</span>
            <span className="text-[11px] text-[#FF9F0A] font-semibold block mt-1.5">
              +{EXP_RULES.STOP_LOSS} 专注值
            </span>
          </div>
        </button>
      </div>

      {/* Reactive Guidance Banner */}
      {feedbackMsg && (
        <div className="p-3.5 rounded-2xl bg-[#2C2C2E] border border-[#0A84FF]/30 text-xs flex items-center justify-between animate-fade-in shadow-md">
          <span className="text-slate-200 font-medium">{feedbackMsg}</span>
          <div className="flex items-center gap-3 shrink-0 ml-2">
            <button
              onClick={() => onNavigateToVoice('intercept')}
              className="text-[#FF9F0A] hover:underline font-semibold"
            >
              随心倾倒 →
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
        <div className="flex items-center justify-between px-0.5">
          <div>
            <span className="text-base font-bold text-white tracking-tight">今日基石习惯</span>
            <p className="text-[11px] text-[#8E8E93] mt-0.5">基础体能维系 · 进阶力量请前往「训练」模块</p>
          </div>
          <span className="text-xs text-[#30D158] font-mono font-medium">+5 EXP</span>
        </div>

        <div className="space-y-2 pt-1">
          {/* Protein */}
          <div
            onClick={() => toggleHabit('protein')}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-[#2C2C2E]/60 hover:bg-[#2C2C2E] cursor-pointer active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              {todayHabit.protein ? (
                <CheckCircle2 className="w-5 h-5 text-[#30D158]" />
              ) : (
                <Circle className="w-5 h-5 text-[#8E8E93]" />
              )}
              <span className={`text-sm ${todayHabit.protein ? 'text-[#8E8E93] line-through' : 'text-slate-100 font-medium'}`}>
                优质蛋白质摄入
              </span>
            </div>
            <span className="text-xs text-[#30D158]/80 font-mono font-medium">+5</span>
          </div>

          {/* Sleep */}
          <div
            onClick={() => toggleHabit('sleep')}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-[#2C2C2E]/60 hover:bg-[#2C2C2E] cursor-pointer active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              {todayHabit.sleep ? (
                <CheckCircle2 className="w-5 h-5 text-[#30D158]" />
              ) : (
                <Circle className="w-5 h-5 text-[#8E8E93]" />
              )}
              <span className={`text-sm ${todayHabit.sleep ? 'text-[#8E8E93] line-through' : 'text-slate-100 font-medium'}`}>
                规律充沛睡眠
              </span>
            </div>
            <span className="text-xs text-[#30D158]/80 font-mono font-medium">+5</span>
          </div>

          {/* Activity */}
          <div
            onClick={() => toggleHabit('activity')}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-[#2C2C2E]/60 hover:bg-[#2C2C2E] cursor-pointer active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              {todayHabit.activity ? (
                <CheckCircle2 className="w-5 h-5 text-[#30D158]" />
              ) : (
                <Circle className="w-5 h-5 text-[#8E8E93]" />
              )}
              <span className={`text-sm ${todayHabit.activity ? 'text-[#8E8E93] line-through' : 'text-slate-100 font-medium'}`}>
                30分钟基础轻活动 / 步数达标
              </span>
            </div>
            <span className="text-xs text-[#30D158]/80 font-mono font-medium">+5</span>
          </div>
        </div>
      </div>

      {/* Quick Shortcuts */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onNavigateToBody}
          className="flex items-center justify-between p-3.5 rounded-2xl bg-[#1C1C1E] hover:bg-[#242426] border border-white/[0.08] text-slate-200 shadow-sm active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/15 text-[#30D158] flex items-center justify-center">
              <Dumbbell className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-semibold">进阶体能训练</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[#8E8E93]" />
        </button>

        <button
          onClick={() => onNavigateToVoice('daily_practice')}
          className="flex items-center justify-between p-3.5 rounded-2xl bg-[#1C1C1E] hover:bg-[#242426] border border-white/[0.08] text-slate-200 shadow-sm active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-orange-500/15 text-[#FF9F0A] flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-semibold">60秒随心倾倒</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[#8E8E93]" />
        </button>
      </div>
    </div>
  );
};
