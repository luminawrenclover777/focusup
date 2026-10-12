import React, { useState } from 'react';
import {
  Play,
  Shield,
  ZapOff,
  Flame,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Info
} from 'lucide-react';
import type { DailyHabit, EnergyMode } from '../types';
import { db, getLocalDate } from '../db';
import { awardExp, revertExp, EXP_RULES } from '../services/expService';
import confetti from 'canvas-confetti';

interface TodayTabProps {
  energyMode: EnergyMode;
  onNavigateToFocus: (defaultMinutes?: number) => void;
  onNavigateToVoice: (trigger?: 'intercept' | 'stop_loss') => void;
  onNavigateToBody: () => void;
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
  onNavigateToFocus,
  onNavigateToVoice,
  onNavigateToBody,
  todayHabit,
  onHabitChange,
  dailyCounts,
  refreshData
}) => {
  const [justIntercepted, setJustIntercepted] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const today = getLocalDate();
  const isRecovery = energyMode === 'recovery';

  // Trigger Intercept
  const handleIntercept = async () => {
    const eventId = `act_int_${Date.now()}`;
    const activityEvent = {
      id: eventId,
      type: 'intercept' as const,
      createdAt: Date.now(),
      localDate: today,
      completed: true,
      estimatedMinutesSaved: 20
    };

    await db.activityEvents.put(activityEvent);

    const tx = await awardExp({
      dimension: 'focus',
      amount: EXP_RULES.INTERCEPT,
      reason: '事前截胡短视频冲动',
      sourceType: 'intercept',
      sourceId: eventId,
      localDate: today
    });

    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 }
    });

    if (tx) {
      setActionMessage(`🎉 截胡成功！获得 +${EXP_RULES.INTERCEPT} Focus EXP`);
    } else {
      setActionMessage('🛡️ 记录成功！今日截胡奖励次数已达上限 (5/5)，你的自控力依然值得点赞！');
    }

    setJustIntercepted(true);
    refreshData();
  };

  // Trigger Stop Loss
  const handleStopLoss = async () => {
    const eventId = `act_sl_${Date.now()}`;
    const activityEvent = {
      id: eventId,
      type: 'stop_loss' as const,
      createdAt: Date.now(),
      localDate: today,
      completed: true
    };

    await db.activityEvents.put(activityEvent);

    const tx = await awardExp({
      dimension: 'focus',
      amount: EXP_RULES.STOP_LOSS,
      reason: '主动止损切断无意识滑动',
      sourceType: 'stop_loss',
      sourceId: eventId,
      localDate: today
    });

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.7 }
    });

    if (tx) {
      setActionMessage(`⚡ 止损果断！夺回当下注意力，获得 +${EXP_RULES.STOP_LOSS} Focus EXP`);
    } else {
      setActionMessage('🛡️ 记录成功！今日止损奖励次数已达上限 (5/5)，成功抢回主权！');
    }

    setJustIntercepted(true);
    refreshData();
  };

  // Habit Toggle
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
      sleep: '规律作息睡眠打卡',
      activity: '日常步数/活动打卡'
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
      confetti({ particleCount: 25, spread: 50, origin: { y: 0.8 } });
    } else {
      // Revert EXP transaction if user unchecks habit
      await revertExp({
        sourceType,
        sourceId,
        reason: `取消${habitNames[habitKey]}`
      });
    }

    refreshData();
  };

  return (
    <div className="space-y-4 px-4 py-3 max-w-md mx-auto">
      {/* Recovery mode banner if active */}
      {isRecovery && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/70 to-emerald-900/40 border border-emerald-700/50 flex items-start gap-2.5">
          <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold text-emerald-300">保底日已启用</span>
            <p className="text-slate-300 mt-0.5 leading-relaxed">
              今天状态偏累？没关系，无需苛求高强度。为你解锁 10 分钟超短专注，任意完成一次打卡即算今日达标。
            </p>
          </div>
        </div>
      )}

      {/* Main Action: Focus Quick Start */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/60 via-dark-800 to-dark-800 border border-blue-900/40 shadow-lg shadow-blue-950/20">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              FocusPod 专注仓
            </span>
            <h2 className="text-lg font-bold text-white mt-1">进入深度专注</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isRecovery ? '推荐 10 ~ 15 分钟轻启动' : '推荐 25 分钟番茄节奏'} · 离线白噪音辅助
            </p>
          </div>
          <button
            onClick={() => onNavigateToFocus(isRecovery ? 10 : 25)}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-400 active:scale-90 text-white shadow-lg shadow-blue-500/30 transition-all"
          >
            <Play className="w-6 h-6 ml-0.5 fill-current" />
          </button>
        </div>

        <div className="mt-3.5 pt-3 border-t border-dark-700 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>预设时长：</span>
            {isRecovery && (
              <button
                onClick={() => onNavigateToFocus(10)}
                className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-medium"
              >
                10m
              </button>
            )}
            <button
              onClick={() => onNavigateToFocus(15)}
              className="px-2 py-0.5 rounded bg-dark-700 hover:bg-dark-600 text-slate-200"
            >
              15m
            </button>
            <button
              onClick={() => onNavigateToFocus(25)}
              className="px-2 py-0.5 rounded bg-dark-700 hover:bg-dark-600 text-slate-200"
            >
              25m
            </button>
            <button
              onClick={() => onNavigateToFocus(45)}
              className="px-2 py-0.5 rounded bg-dark-700 hover:bg-dark-600 text-slate-200"
            >
              45m
            </button>
          </div>
          <button
            onClick={() => onNavigateToFocus(0)}
            className="text-blue-400 hover:text-blue-300 flex items-center gap-0.5 font-medium"
          >
            心流正向 <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Short Video Interceptors (The Core Disruptor) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            反短视频破局器
          </h3>
          <span className="text-[11px] text-slate-400">点击即刻重掌主动权</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Intercept Button */}
          <button
            onClick={handleIntercept}
            className="group relative flex flex-col justify-between p-3.5 rounded-xl bg-dark-800 border border-dark-700 hover:border-blue-500/50 active:scale-[0.98] transition-all text-left"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Shield className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-medium text-slate-400">
                  今日 {dailyCounts.interceptCount}/{dailyCounts.interceptCap}
                </span>
              </div>
              <div className="mt-2.5">
                <span className="text-sm font-bold text-white block group-hover:text-blue-300">
                  事前截胡
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  想打开短视频前拦截，按 20 分钟估算潜在节省
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between pt-2 border-t border-dark-700/60 text-[11px]">
              <span className="text-blue-400 font-semibold">+{EXP_RULES.INTERCEPT} Focus</span>
              <span className="text-[10px] text-slate-400">（估算值）</span>
            </div>
          </button>

          {/* Stop-Loss Button */}
          <button
            onClick={handleStopLoss}
            className="group relative flex flex-col justify-between p-3.5 rounded-xl bg-dark-800 border border-dark-700 hover:border-orange-500/50 active:scale-[0.98] transition-all text-left"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <ZapOff className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-medium text-slate-400">
                  今日 {dailyCounts.stopLossCount}/{dailyCounts.stopLossCap}
                </span>
              </div>
              <div className="mt-2.5">
                <span className="text-sm font-bold text-white block group-hover:text-orange-300">
                  主动止损
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  已经点开？立刻停住，不追责不留负债
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between pt-2 border-t border-dark-700/60 text-[11px]">
              <span className="text-orange-400 font-semibold">+{EXP_RULES.STOP_LOSS} Focus</span>
              <span className="text-[10px] text-slate-400">即刻切断</span>
            </div>
          </button>
        </div>
      </div>

      {/* Post-Interception Guidance Modal / Banner */}
      {justIntercepted && actionMessage && (
        <div className="p-3.5 rounded-xl bg-dark-800/90 border border-blue-500/40 animate-fade-in space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-200">{actionMessage}</span>
            <button
              onClick={() => setJustIntercepted(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="pt-2 border-t border-dark-700 flex items-center gap-2">
            <button
              onClick={() => {
                setJustIntercepted(false);
                onNavigateToVoice('intercept');
              }}
              className="flex-1 py-1.5 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium flex items-center justify-center gap-1"
            >
              切换至 60 秒思考表达 <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setJustIntercepted(false);
                onNavigateToFocus(15);
              }}
              className="py-1.5 px-3 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-medium"
            >
              去专注 15m
            </button>
          </div>
        </div>
      )}

      {/* Daily 3 Habits (Body Foundation) */}
      <div className="p-4 rounded-xl bg-dark-800 border border-dark-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">日常基石习惯</h3>
          </div>
          <span className="text-[11px] text-slate-400">每项 +5 Body EXP / 天</span>
        </div>

        <div className="space-y-2">
          {/* Protein */}
          <div
            onClick={() => toggleHabit('protein')}
            className="flex items-center justify-between p-2.5 rounded-lg bg-dark-900/60 border border-dark-700/60 cursor-pointer active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2.5">
              {todayHabit.protein ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Circle className="w-5 h-5 text-slate-500" />
              )}
              <div>
                <span className={`text-xs font-medium ${todayHabit.protein ? 'text-emerald-300 line-through' : 'text-slate-200'}`}>
                  优质蛋白质摄入
                </span>
                <p className="text-[10px] text-slate-400">蛋/肉/奶/豆制品，补充身体自愈基石</p>
              </div>
            </div>
            <span className="text-[11px] text-emerald-400/80 font-mono font-medium">+5 EXP</span>
          </div>

          {/* Sleep */}
          <div
            onClick={() => toggleHabit('sleep')}
            className="flex items-center justify-between p-2.5 rounded-lg bg-dark-900/60 border border-dark-700/60 cursor-pointer active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2.5">
              {todayHabit.sleep ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Circle className="w-5 h-5 text-slate-500" />
              )}
              <div>
                <span className={`text-xs font-medium ${todayHabit.sleep ? 'text-emerald-300 line-through' : 'text-slate-200'}`}>
                  规律睡眠作息
                </span>
                <p className="text-[10px] text-slate-400">昨晚或今晚保障充分深度休息</p>
              </div>
            </div>
            <span className="text-[11px] text-emerald-400/80 font-mono font-medium">+5 EXP</span>
          </div>

          {/* Activity / Steps */}
          <div
            onClick={() => toggleHabit('activity')}
            className="flex items-center justify-between p-2.5 rounded-lg bg-dark-900/60 border border-dark-700/60 cursor-pointer active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2.5">
              {todayHabit.activity ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Circle className="w-5 h-5 text-slate-500" />
              )}
              <div>
                <span className={`text-xs font-medium ${todayHabit.activity ? 'text-emerald-300 line-through' : 'text-slate-200'}`}>
                  日常步数 / 离座活动
                </span>
                <p className="text-[10px] text-slate-400">散步、爬楼梯或工位微拉伸，打破连续久坐</p>
              </div>
            </div>
            <span className="text-[11px] text-emerald-400/80 font-mono font-medium">+5 EXP</span>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-dark-700/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">想练薄肌力量？</span>
          <button
            onClick={onNavigateToBody}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
          >
            打开薄肌训练台 <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Honest Boundary Note */}
      <div className="p-3 rounded-lg bg-dark-800/40 border border-dark-700/40 flex items-start gap-2 text-[11px] text-slate-400">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-300 font-medium">真实反馈原则：</strong> FocusUp 不自动监控其他 App 或窃取隐私。所有自控与行动记录均由你诚实记录，每一分成长皆来自你真正的主动选择。
        </p>
      </div>
    </div>
  );
};
