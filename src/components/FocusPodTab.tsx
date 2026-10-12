import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Volume2,
  VolumeX,
  CloudRain,
  Radio,
  Flame,
  Activity
} from 'lucide-react';
import type { FocusSession, EnergyMode } from '../types';
import { db, getLocalDate } from '../db';
import { awardExp, EXP_RULES } from '../services/expService';
import { soundSynthesizer, type SoundType } from '../services/audioService';
import { MICRO_MOVEMENTS, type MicroMovement } from '../data/microMovementPresets';
import confetti from 'canvas-confetti';
import { IOSAlert } from './IOSModal';

interface FocusPodTabProps {
  energyMode: EnergyMode;
  initialMinutes?: number;
  refreshData: () => void;
  onActiveSessionChange?: (hasActive: boolean) => void;
}

export const FocusPodTab: React.FC<FocusPodTabProps> = ({
  energyMode,
  initialMinutes,
  refreshData,
  onActiveSessionChange
}) => {
  const isRecovery = energyMode === 'recovery';

  const [timerMode, setTimerMode] = useState<'countdown' | 'stopwatch'>('countdown');
  const [targetMinutes, setTargetMinutes] = useState<number>(initialMinutes || (isRecovery ? 10 : 25));

  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const [soundType, setSoundType] = useState<SoundType>('none');
  const [soundVolume, setSoundVolume] = useState<number>(0.5);

  const [settlementData, setSettlementData] = useState<{
    session: FocusSession;
    effectiveSeconds: number;
    pausedSeconds: number;
    earnedExp: number;
    recommendedMovement: MicroMovement;
    movementCompleted: boolean;
  } | null>(null);

  const [showAbandonAlert, setShowAbandonAlert] = useState<boolean>(false);

  const timerIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    async function loadActiveSession() {
      const running = await db.focusSessions
        .where('status')
        .anyOf(['running', 'paused'])
        .first();

      if (running) {
        setActiveSession(running);
        setTimerMode(running.mode);
        setIsPaused(running.status === 'paused');
        if (onActiveSessionChange) onActiveSessionChange(true);
      }
    }
    loadActiveSession();
  }, [onActiveSessionChange]);

  const calculateEffectiveElapsed = useCallback((session: FocusSession): { effective: number; paused: number } => {
    const now = session.endedAt || Date.now();
    let totalPausedMs = 0;

    for (const interval of session.pausedIntervals) {
      const end = interval.endAt || (session.status === 'paused' ? now : interval.startAt);
      totalPausedMs += Math.max(0, end - interval.startAt);
    }

    const totalPassedMs = Math.max(0, now - session.startedAt);
    const effectiveMs = Math.max(0, totalPassedMs - totalPausedMs);

    return {
      effective: Math.floor(effectiveMs / 1000),
      paused: Math.floor(totalPausedMs / 1000)
    };
  }, []);

  useEffect(() => {
    if (!activeSession) {
      if (onActiveSessionChange) onActiveSessionChange(false);
      return;
    }
    if (onActiveSessionChange) onActiveSessionChange(true);

    const updateTimer = () => {
      const { effective } = calculateEffectiveElapsed(activeSession);
      setElapsedSeconds(effective);

      if (
        activeSession.mode === 'countdown' &&
        activeSession.targetSeconds &&
        effective >= activeSession.targetSeconds &&
        activeSession.status === 'running'
      ) {
        handleEndSession();
      }
    };

    updateTimer();
    timerIntervalRef.current = window.setInterval(updateTimer, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updateTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [activeSession, calculateEffectiveElapsed, onActiveSessionChange]);

  const handleStart = async (mode: 'countdown' | 'stopwatch', targetMins: number) => {
    const targetSec = mode === 'countdown' ? targetMins * 60 : undefined;
    const newSession: FocusSession = {
      id: `fs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      mode,
      targetSeconds: targetSec,
      startedAt: Date.now(),
      pausedIntervals: [],
      status: 'running'
    };

    await db.focusSessions.put(newSession);
    setActiveSession(newSession);
    setIsPaused(false);
    setElapsedSeconds(0);
    setTimerMode(mode);

    if (soundType !== 'none') {
      soundSynthesizer.play(soundType);
    }
  };

  const handlePause = async () => {
    if (!activeSession) return;
    const now = Date.now();
    const updated: FocusSession = {
      ...activeSession,
      status: 'paused',
      pausedIntervals: [...activeSession.pausedIntervals, { startAt: now }]
    };
    await db.focusSessions.put(updated);
    setActiveSession(updated);
    setIsPaused(true);
  };

  const handleResume = async () => {
    if (!activeSession) return;
    const now = Date.now();
    const intervals = [...activeSession.pausedIntervals];
    if (intervals.length > 0 && !intervals[intervals.length - 1].endAt) {
      intervals[intervals.length - 1].endAt = now;
    }
    const updated: FocusSession = {
      ...activeSession,
      status: 'running',
      pausedIntervals: intervals
    };
    await db.focusSessions.put(updated);
    setActiveSession(updated);
    setIsPaused(false);
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    const now = Date.now();

    const intervals = [...activeSession.pausedIntervals];
    if (intervals.length > 0 && !intervals[intervals.length - 1].endAt) {
      intervals[intervals.length - 1].endAt = now;
    }

    const { effective, paused } = calculateEffectiveElapsed({
      ...activeSession,
      endedAt: now,
      pausedIntervals: intervals
    });

    const effectiveMinutes = Math.floor(effective / 60);
    const earnedExp = effectiveMinutes >= 1 ? effectiveMinutes * EXP_RULES.FOCUS_PER_MINUTE : 0;

    const completedSession: FocusSession = {
      ...activeSession,
      endedAt: now,
      effectiveSeconds: effective,
      pausedIntervals: intervals,
      status: 'completed'
    };

    await db.focusSessions.put(completedSession);
    setActiveSession(null);
    soundSynthesizer.stop();
    const randomMovement = MICRO_MOVEMENTS[Math.floor(Math.random() * MICRO_MOVEMENTS.length)];

    setSettlementData({
      session: completedSession,
      effectiveSeconds: effective,
      pausedSeconds: paused,
      earnedExp,
      recommendedMovement: randomMovement,
      movementCompleted: false
    });
  };

  const handleAbandon = () => {
    if (!activeSession) return;
    setShowAbandonAlert(true);
  };

  const handleConfirmAbandon = async () => {
    if (!activeSession) return;
    const updated: FocusSession = {
      ...activeSession,
      endedAt: Date.now(),
      status: 'abandoned'
    };
    await db.focusSessions.put(updated);
    setActiveSession(null);
    soundSynthesizer.stop();
    setSoundType('none');
    setElapsedSeconds(0);
    setShowAbandonAlert(false);
    if (onActiveSessionChange) onActiveSessionChange(false);
  };

  const handleConfirmSettlement = async () => {
    if (!settlementData) return;
    const { session, effectiveSeconds, earnedExp, recommendedMovement, movementCompleted } = settlementData;

    if (earnedExp > 0) {
      soundSynthesizer.playCyberHaptic('chime');
      await awardExp({
        dimension: 'focus',
        amount: earnedExp,
        reason: `完成专注会话 (${Math.floor(effectiveSeconds / 60)} 分钟)`,
        sourceType: 'focus_session',
        sourceId: session.id,
        bypassCap: true
      });
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    }

    if (movementCompleted && recommendedMovement) {
      await awardExp({
        dimension: 'body',
        amount: EXP_RULES.HABIT_ACTIVITY,
        reason: `久坐微活动: ${recommendedMovement.name}`,
        sourceType: 'habit_activity',
        sourceId: `mv_${session.id}`,
        bypassCap: false
      });
      await db.activityEvents.put({
        id: `act_mv_${Date.now()}`,
        type: 'micro_movement',
        createdAt: Date.now(),
        localDate: getLocalDate(),
        completed: true,
        note: recommendedMovement.name
      });
    }

    await db.focusSessions.update(session.id, { settledAt: Date.now() });

    setSettlementData(null);
    refreshData();
  };

  const handleDiscardSettlement = async () => {
    if (!settlementData) return;
    await db.focusSessions.update(settlementData.session.id, { status: 'abandoned' });
    setSettlementData(null);
    refreshData();
  };

  const toggleSound = (type: SoundType) => {
    if (soundType === type) {
      soundSynthesizer.stop();
      setSoundType('none');
    } else {
      soundSynthesizer.setVolume(soundVolume);
      soundSynthesizer.play(type);
      setSoundType(type);
    }
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  let displaySeconds = elapsedSeconds;
  let progressRatio = 0;

  if (activeSession) {
    if (activeSession.mode === 'countdown' && activeSession.targetSeconds) {
      displaySeconds = Math.max(0, activeSession.targetSeconds - elapsedSeconds);
      progressRatio = Math.min(1, elapsedSeconds / activeSession.targetSeconds);
    } else {
      displaySeconds = elapsedSeconds;
    }
  }

  return (
    <div className="space-y-5 px-5 py-3.5 max-w-lg mx-auto pb-28">
      {/* Timer Display Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-b from-[#1C1C1E] to-[#161618] border border-white/10 shadow-lg flex flex-col items-center relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#0A84FF]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Status */}
        <div className="w-full flex items-center justify-between text-xs text-[#8E8E93] mb-2 relative z-10">
          <span className="flex items-center gap-2 font-medium">
            <span className={`w-2 h-2 rounded-full ${activeSession ? (isPaused ? 'bg-[#FF9F0A]' : 'bg-[#30D158] animate-pulse') : 'bg-[#636366]'}`} />
            <span className="text-slate-200">{activeSession ? (isPaused ? '已暂停' : '专注心流中') : '准备开始'}</span>
          </span>
          <span className="text-[11px] px-3 py-1 rounded-full bg-[#2C2C2E] text-slate-300 font-medium">
            {activeSession?.mode === 'stopwatch' ? '心流正向' : `${activeSession?.targetSeconds ? Math.floor(activeSession.targetSeconds / 60) + ' 分钟倒计时' : '自律时刻'}`}
          </span>
        </div>

        {/* Circular Progress & Clock */}
        <div className="relative my-3 flex items-center justify-center z-10">
          <svg className="w-64 h-64 -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="110"
              stroke="#2C2C2E"
              strokeWidth="6"
              fill="transparent"
            />
            {activeSession && activeSession.mode === 'countdown' && (
              <circle
                cx="128"
                cy="128"
                r="110"
                stroke={isRecovery ? '#64D2FF' : '#0A84FF'}
                strokeWidth="6"
                strokeDasharray={2 * Math.PI * 110}
                strokeDashoffset={2 * Math.PI * 110 * (1 - progressRatio)}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-300"
              />
            )}
            {activeSession && activeSession.mode === 'stopwatch' && (
              <circle
                cx="128"
                cy="128"
                r="110"
                stroke="#30D158"
                strokeWidth="6"
                strokeDasharray="6 10"
                fill="transparent"
                className="animate-spin"
                style={{ animationDuration: '24s' }}
              />
            )}
          </svg>

          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="font-mono text-5xl font-light tracking-tight text-white tabular-nums select-none">
              {activeSession ? formatTime(displaySeconds) : `${targetMinutes}:00`}
            </span>
            <span className="text-[11px] text-[#8E8E93] mt-2 font-medium">
              {activeSession ? (isPaused ? '计时已暂停 · 扣除暂停时长' : '深度专注中 · 屏蔽一切打扰') : '单次专注 · 摆脱短视频与信息流'}
            </span>
          </div>
        </div>

        {/* Controls */}
        {activeSession ? (
          <div className="flex items-center gap-3 w-full mt-3 z-10">
            {isPaused ? (
              <button
                onClick={handleResume}
                className="flex-1 h-14 rounded-2xl bg-[#0A84FF] hover:bg-blue-400 active:scale-[0.98] text-white font-bold text-base shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                继续专注
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="flex-1 h-14 rounded-2xl bg-[#2C2C2E] hover:bg-[#3A3A3C] active:scale-[0.98] text-white font-bold text-base border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Pause className="w-5 h-5 fill-current" />
                暂停
              </button>
            )}

            <button
              onClick={handleEndSession}
              className="h-14 px-6 rounded-2xl bg-[#30D158] hover:bg-emerald-400 active:scale-[0.98] text-white font-bold text-base shadow-xl shadow-green-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle className="w-5 h-5" />
              完成
            </button>

            <button
              onClick={handleAbandon}
              className="w-14 h-14 rounded-2xl bg-[#2C2C2E] hover:bg-rose-950/40 text-[#8E8E93] hover:text-rose-400 border border-white/10 active:scale-[0.98] flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="放弃本次专注"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="w-full space-y-4 mt-3 z-10">
            {/* iOS Segmented Duration Picker */}
            <div className="flex items-center p-1.5 rounded-2xl bg-[#2C2C2E]/80 border border-white/[0.08] shadow-inner gap-1">
              {isRecovery && (
                <button
                  onClick={() => {
                    setTimerMode('countdown');
                    setTargetMinutes(10);
                  }}
                  className={`flex-1 h-10 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    timerMode === 'countdown' && targetMinutes === 10
                      ? 'bg-cyan-500 text-black shadow-md'
                      : 'text-cyan-400/80 hover:text-cyan-300'
                  }`}
                >
                  10分
                </button>
              )}
              {[15, 25, 45].map((mins) => (
                <button
                  key={mins}
                  onClick={() => {
                    setTimerMode('countdown');
                    setTargetMinutes(mins);
                  }}
                  className={`flex-1 h-10 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    timerMode === 'countdown' && targetMinutes === mins
                      ? 'bg-[#0A84FF] text-white shadow-md'
                      : 'text-[#8E8E93] hover:text-white'
                  }`}
                >
                  {mins}分
                </button>
              ))}
              <button
                onClick={() => setTimerMode('stopwatch')}
                className={`flex-1 h-10 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  timerMode === 'stopwatch'
                    ? 'bg-[#30D158] text-white shadow-md'
                    : 'text-[#8E8E93] hover:text-white'
                }`}
              >
                心流
              </button>
            </div>

            <button
              onClick={() => handleStart(timerMode, targetMinutes)}
              className="w-full h-14 rounded-2xl bg-[#0A84FF] hover:bg-blue-400 active:scale-[0.98] text-white font-bold text-base shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>开启专注</span>
              <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-mono font-medium">
                {timerMode === 'countdown' ? `${targetMinutes} 分钟` : '正向心流'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Streamlined White Noise Card */}
      <div className="p-5 rounded-3xl bg-[#1C1C1E] border border-white/[0.08] space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Volume2 className="w-4 h-4 text-[#0A84FF]" />
            <span>环境白噪音</span>
          </div>
          <span className="text-[11px] text-[#8E8E93]">纯代码合成 · 离线低功耗</span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => toggleSound('none')}
            className={`h-12 rounded-2xl text-xs font-semibold border transition-all cursor-pointer ${
              soundType === 'none'
                ? 'bg-[#2C2C2E] text-white border-white/20 shadow-sm'
                : 'bg-[#2C2C2E]/40 text-[#8E8E93] border-transparent hover:text-slate-200'
            }`}
          >
            静音
          </button>
          <button
            onClick={() => toggleSound('rain')}
            className={`h-12 rounded-2xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              soundType === 'rain'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm'
                : 'bg-[#2C2C2E]/40 text-[#8E8E93] border-transparent hover:text-slate-200'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5" /> 雨声
          </button>
          <button
            onClick={() => toggleSound('brown')}
            className={`h-12 rounded-2xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              soundType === 'brown'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-[#2C2C2E]/40 text-[#8E8E93] border-transparent hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" /> 棕噪
          </button>
          <button
            onClick={() => toggleSound('pink')}
            className={`h-12 rounded-2xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              soundType === 'pink'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                : 'bg-[#2C2C2E]/40 text-[#8E8E93] border-transparent hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" /> 粉噪
          </button>
        </div>

        {soundType !== 'none' && (
          <div className="flex items-center gap-3 pt-1 px-1">
            <VolumeX className="w-3.5 h-3.5 text-[#8E8E93] shrink-0" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={soundVolume}
              onChange={(e) => {
                const vol = parseFloat(e.target.value);
                setSoundVolume(vol);
                soundSynthesizer.setVolume(vol);
              }}
              className="ios-slider flex-1"
            />
            <span className="text-[11px] font-mono text-[#8E8E93] w-8 text-right">
              {Math.round(soundVolume * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Settle Modal */}
      {settlementData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 sm:p-5 animate-fade-in">
          <div className="w-full max-w-sm bg-[#1C1C1E] border border-white/10 rounded-[28px] p-6 shadow-2xl relative overflow-hidden flex flex-col gap-4 text-white">
            {/* Ambient Top Glow */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#0A84FF]/20 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="text-center relative z-10">
              <span className="inline-flex p-3 rounded-full bg-[#0A84FF]/15 text-[#0A84FF] mb-2 border border-[#0A84FF]/25 shadow-sm">
                <CheckCircle className="w-7 h-7" />
              </span>
              <h3 className="text-xl font-bold text-white tracking-tight">专注达成</h3>
              <p className="text-xs text-[#8E8E93] mt-1">深呼吸一下 · 本次专注时长已安全归档</p>
            </div>

            {/* Hero Stat */}
            <div className="flex flex-col items-center justify-center py-2 relative z-10">
              <div className="flex items-baseline">
                <span className="text-5xl font-mono font-extrabold tracking-tight text-white">
                  {settlementData.effectiveSeconds >= 60
                    ? Math.floor(settlementData.effectiveSeconds / 60)
                    : settlementData.effectiveSeconds}
                </span>
                <span className="text-lg font-medium text-[#8E8E93] ml-1.5">
                  {settlementData.effectiveSeconds >= 60 ? '分钟有效专注' : '秒专注'}
                </span>
              </div>
            </div>

            {/* Breakdown Stats Grid */}
            <div className="grid grid-cols-2 gap-2 relative z-10 text-xs">
              <div className="p-3 rounded-2xl bg-[#2C2C2E]/60 border border-white/[0.06] text-center">
                <div className="text-[11px] text-[#8E8E93] mb-0.5">总计时长</div>
                <div className="font-mono font-bold text-sm text-slate-200">
                  {formatTime(settlementData.effectiveSeconds + settlementData.pausedSeconds)}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[#2C2C2E]/60 border border-white/[0.06] text-center">
                <div className="text-[11px] text-[#8E8E93] mb-0.5">中途暂停</div>
                <div className="font-mono font-bold text-sm text-[#8E8E93]">
                  {formatTime(settlementData.pausedSeconds)}
                </div>
              </div>
            </div>

            {/* Optional Stretch Relaxation */}
            {settlementData.recommendedMovement && (
              <div className="p-3.5 rounded-2xl bg-[#2C2C2E]/40 border border-white/[0.08] relative z-10">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#30D158]" />
                    <span className="text-xs font-bold text-slate-200">工位小舒展 (可选)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-[#30D158] font-medium border border-emerald-500/20">
                    {settlementData.recommendedMovement.category === 'desk' ? '工位隐蔽' : '离座'} · 约 {settlementData.recommendedMovement.durationSeconds}s
                  </span>
                </div>
                <div className="text-xs font-semibold text-emerald-300 mb-1">
                  {settlementData.recommendedMovement.name}
                </div>
                <p className="text-[11px] text-[#8E8E93] leading-relaxed mb-2.5">
                  {settlementData.recommendedMovement.description}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setSettlementData(prev =>
                      prev ? { ...prev, movementCompleted: !prev.movementCompleted } : null
                    )
                  }
                  className={`w-full py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-medium transition-all cursor-pointer ${
                    settlementData.movementCompleted
                      ? 'bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/40 shadow-sm'
                      : 'bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08]'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] transition-colors ${
                      settlementData.movementCompleted
                        ? 'bg-[#30D158] text-black font-bold'
                        : 'border border-[#8E8E93]'
                    }`}
                  >
                    {settlementData.movementCompleted ? '✓' : ''}
                  </span>
                  <span>
                    {settlementData.movementCompleted
                      ? '已完成舒展'
                      : '顺便活动一下身体'}
                  </span>
                </button>
              </div>
            )}

            {/* Actions: Big Primary Button & Discard */}
            <div className="space-y-2 pt-1 relative z-10">
              <button
                type="button"
                onClick={handleConfirmSettlement}
                className="w-full h-14 rounded-2xl bg-[#0A84FF] hover:bg-blue-400 active:scale-[0.98] text-white font-bold text-base shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>确认并保存记录</span>
              </button>

              <button
                type="button"
                onClick={handleDiscardSettlement}
                className="w-full py-2 text-center text-xs text-[#8E8E93] hover:text-[#FF453A] transition-colors cursor-pointer"
              >
                放弃本次记录
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Abandon Alert */}
      <IOSAlert
        isOpen={showAbandonAlert}
        title="放弃本次专注？"
        message="当前未保存的时长将不会计入今日记录。"
        cancelText="继续专注"
        confirmText="放弃"
        isDestructive={true}
        onCancel={() => setShowAbandonAlert(false)}
        onConfirm={handleConfirmAbandon}
      />
    </div>
  );
};
