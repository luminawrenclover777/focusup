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
    <div className="space-y-3.5 px-4 py-3 max-w-md mx-auto">
      {/* 3-Dimension Compact Pill Bar */}
      <button
        onClick={onNavigateToDashboard}
        className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-dark-800/60 hover:bg-dark-800 border border-white/[0.06] text-xs text-slate-300 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            Focus Lv.{stats.focus.level}
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Body Lv.{stats.body.level}
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Voice Lv.{stats.voice.level}
          </span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
      </button>

      {/* FocusPod Hero Card */}
      <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-b from-dark-800 to-dark-800/90 border border-white/[0.08] shadow-lg shadow-black/20">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">专注计时</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isRecovery ? '保底日推荐 10 分钟轻启动' : '沉浸心流 · 离线白噪音'}
            </p>
          </div>
          <button
            onClick={() => onNavigateToFocus(selectedMinutes)}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-blue-500 hover:bg-blue-400 active:scale-95 text-white shadow-md shadow-blue-500/30 transition-all"
          >
            <Play className="w-5 h-5 ml-0.5 fill-current" />
          </button>
        </div>

        {/* Preset Duration Chips */}
        <div className="flex items-center gap-1.5">
          {isRecovery && (
            <button
              onClick={() => setSelectedMinutes(10)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                selectedMinutes === 10
                  ? 'bg-emerald-500 text-white border-emerald-400'
                  : 'bg-dark-900/60 text-emerald-400 border-emerald-900/50'
              }`}
            >
              10m
            </button>
          )}
          {[15, 25, 45].map((mins) => (
            <button
              key={mins}
              onClick={() => setSelectedMinutes(mins)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                selectedMinutes === mins
                  ? 'bg-blue-500 text-white border-blue-400'
                  : 'bg-dark-900/60 text-slate-300 border-white/[0.06] hover:border-white/[0.12]'
              }`}
            >
              {mins}m
            </button>
          ))}
          <button
            onClick={() => onNavigateToFocus(0)}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold border bg-dark-900/60 text-slate-300 border-white/[0.06] hover:text-white"
          >
            心流
          </button>
        </div>
      </div>

      {/* Dual Interceptor Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={handleIntercept}
          className="p-3.5 rounded-2xl bg-dark-800/80 hover:bg-dark-800 border border-white/[0.07] active:scale-[0.98] transition-all text-left flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Shield className="w-4 h-4" />
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {dailyCounts.interceptCount}/{dailyCounts.interceptCap}
            </span>
          </div>
          <div className="mt-3">
            <span className="text-sm font-bold text-white block">事前截胡</span>
            <span className="text-[11px] text-blue-400 font-semibold block mt-0.5">
              +{EXP_RULES.INTERCEPT} Focus
            </span>
          </div>
        </button>

        <button
          onClick={handleStopLoss}
          className="p-3.5 rounded-2xl bg-dark-800/80 hover:bg-dark-800 border border-white/[0.07] active:scale-[0.98] transition-all text-left flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <ZapOff className="w-4 h-4" />
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {dailyCounts.stopLossCount}/{dailyCounts.stopLossCap}
            </span>
          </div>
          <div className="mt-3">
            <span className="text-sm font-bold text-white block">主动止损</span>
            <span className="text-[11px] text-amber-400 font-semibold block mt-0.5">
              +{EXP_RULES.STOP_LOSS} Focus
            </span>
          </div>
        </button>
      </div>

      {/* Reactive Guidance Banner */}
      {feedbackMsg && (
        <div className="p-2.5 rounded-xl bg-dark-800 border border-blue-500/30 text-xs flex items-center justify-between animate-fade-in">
          <span className="text-slate-200 font-medium">{feedbackMsg}</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onNavigateToVoice('intercept')}
              className="text-amber-400 hover:text-amber-300 font-semibold text-[11px]"
            >
              60秒表达 →
            </button>
            <button
              onClick={() => setFeedbackMsg(null)}
              className="text-slate-500 hover:text-slate-300 ml-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Daily Habits Checklist */}
      <div className="p-3.5 rounded-2xl bg-dark-800/70 border border-white/[0.07] space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs font-bold text-slate-300 tracking-tight">基石习惯</span>
          <span className="text-[10px] text-slate-500">+5 Body EXP / 项</span>
        </div>

        <div className="space-y-1.5">
          {/* Protein */}
          <div
            onClick={() => toggleHabit('protein')}
            className="flex items-center justify-between py-2 px-2.5 rounded-xl bg-dark-900/50 hover:bg-dark-900/80 cursor-pointer active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2.5">
              {todayHabit.protein ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Circle className="w-4 h-4 text-slate-600" />
              )}
              <span className={`text-xs ${todayHabit.protein ? 'text-slate-400 line-through' : 'text-slate-200 font-medium'}`}>
                优质蛋白质摄入
              </span>
            </div>
            <span className="text-[10px] text-emerald-400/70 font-mono">+5</span>
          </div>

          {/* Sleep */}
          <div
            onClick={() => toggleHabit('sleep')}
            className="flex items-center justify-between py-2 px-2.5 rounded-xl bg-dark-900/50 hover:bg-dark-900/80 cursor-pointer active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2.5">
              {todayHabit.sleep ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Circle className="w-4 h-4 text-slate-600" />
              )}
              <span className={`text-xs ${todayHabit.sleep ? 'text-slate-400 line-through' : 'text-slate-200 font-medium'}`}>
                规律睡眠作息
              </span>
            </div>
            <span className="text-[10px] text-emerald-400/70 font-mono">+5</span>
          </div>

          {/* Activity */}
          <div
            onClick={() => toggleHabit('activity')}
            className="flex items-center justify-between py-2 px-2.5 rounded-xl bg-dark-900/50 hover:bg-dark-900/80 cursor-pointer active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2.5">
              {todayHabit.activity ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Circle className="w-4 h-4 text-slate-600" />
              )}
              <span className={`text-xs ${todayHabit.activity ? 'text-slate-400 line-through' : 'text-slate-200 font-medium'}`}>
                日常步数与微活动
              </span>
            </div>
            <span className="text-[10px] text-emerald-400/70 font-mono">+5</span>
          </div>
        </div>
      </div>

      {/* Quick Shortcuts */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <button
          onClick={onNavigateToBody}
          className="flex items-center justify-between p-2.5 rounded-xl bg-dark-800/40 hover:bg-dark-800/70 border border-white/[0.05] text-slate-300"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
            薄肌训练
          </span>
          <ArrowRight className="w-3 h-3 text-slate-500" />
        </button>

        <button
          onClick={() => onNavigateToVoice('daily_practice')}
          className="flex items-center justify-between p-2.5 rounded-xl bg-dark-800/40 hover:bg-dark-800/70 border border-white/[0.05] text-slate-300"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            60秒表达
          </span>
          <ArrowRight className="w-3 h-3 text-slate-500" />
        </button>
      </div>
    </div>
  );
};
