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
import { db } from '../db';
import { awardExp, EXP_RULES } from '../services/expService';
import { soundSynthesizer, type SoundType } from '../services/audioService';
import { MICRO_MOVEMENTS, type MicroMovement } from '../data/microMovementPresets';
import confetti from 'canvas-confetti';

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
  } | null>(null);

  const [showMicroMovement, setShowMicroMovement] = useState<boolean>(false);
  const [selectedMovement, setSelectedMovement] = useState<MicroMovement | null>(null);
  const [movementDone, setMovementDone] = useState<boolean>(false);

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
    setSoundType('none');

    setSettlementData({
      session: completedSession,
      effectiveSeconds: effective,
      pausedSeconds: paused,
      earnedExp
    });
  };

  const handleAbandon = async () => {
    if (!activeSession) return;
    if (window.confirm('放弃本次专注？未结算时间不计入 EXP。')) {
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
      if (onActiveSessionChange) onActiveSessionChange(false);
    }
  };

  const handleConfirmSettlement = async () => {
    if (!settlementData) return;
    const { session, effectiveSeconds, earnedExp } = settlementData;

    if (earnedExp > 0) {
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

    await db.focusSessions.update(session.id, { settledAt: Date.now() });

    setSettlementData(null);
    refreshData();

    setSelectedMovement(MICRO_MOVEMENTS[Math.floor(Math.random() * MICRO_MOVEMENTS.length)]);
    setShowMicroMovement(true);
    setMovementDone(false);
  };

  const handleCompleteMicroMovement = async () => {
    if (!selectedMovement) return;
    await db.activityEvents.put({
      id: `act_mv_${Date.now()}`,
      type: 'micro_movement',
      createdAt: Date.now(),
      localDate: new Date().toISOString().split('T')[0],
      completed: true,
      note: selectedMovement.name
    });
    setMovementDone(true);
    setTimeout(() => {
      setShowMicroMovement(false);
      refreshData();
    }, 1000);
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
    <div className="space-y-4 px-4 py-3 max-w-md mx-auto">
      {/* Timer Display Card */}
      <div className="relative overflow-hidden p-6 rounded-3xl bg-dark-800/80 border border-white/[0.08] shadow-xl flex flex-col items-center">
        {/* Top Status */}
        <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="flex items-center gap-1.5 font-medium">
            <span className={`w-2 h-2 rounded-full ${activeSession ? (isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse') : 'bg-slate-600'}`} />
            {activeSession ? (isPaused ? '已暂停' : '专注中') : '准备开始'}
          </span>
          <span className="text-[11px] text-slate-400">
            {activeSession?.mode === 'stopwatch' ? '心流正向' : `${activeSession?.targetSeconds ? Math.floor(activeSession.targetSeconds / 60) + 'm 倒计时' : ''}`}
          </span>
        </div>

        {/* Circular Progress & Clock */}
        <div className="relative my-2 flex items-center justify-center">
          <svg className="w-56 h-56 -rotate-90">
            <circle
              cx="112"
              cy="112"
              r="96"
              stroke="#1A1E2C"
              strokeWidth="6"
              fill="transparent"
            />
            {activeSession && activeSession.mode === 'countdown' && (
              <circle
                cx="112"
                cy="112"
                r="96"
                stroke="#3B82F6"
                strokeWidth="6"
                strokeDasharray={2 * Math.PI * 96}
                strokeDashoffset={2 * Math.PI * 96 * (1 - progressRatio)}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-300"
              />
            )}
            {activeSession && activeSession.mode === 'stopwatch' && (
              <circle
                cx="112"
                cy="112"
                r="96"
                stroke="#10B981"
                strokeWidth="6"
                strokeDasharray="4 8"
                fill="transparent"
                className="animate-spin"
                style={{ animationDuration: '24s' }}
              />
            )}
          </svg>

          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="font-mono text-4xl font-extrabold tracking-tight text-white tabular-nums">
              {activeSession ? formatTime(displaySeconds) : `${targetMinutes}:00`}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 font-medium">
              {activeSession ? (isPaused ? '暂停不计入有效时长' : '+1 EXP / 分钟') : '保持专注'}
            </span>
          </div>
        </div>

        {/* Controls */}
        {activeSession ? (
          <div className="flex items-center gap-2.5 w-full mt-3">
            {isPaused ? (
              <button
                onClick={handleResume}
                className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 active:scale-95 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                继续
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="flex-1 py-2.5 rounded-xl bg-dark-700 hover:bg-dark-600 active:scale-95 text-slate-200 font-semibold text-xs border border-white/[0.08] transition-all flex items-center justify-center gap-1.5"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                暂停
              </button>
            )}

            <button
              onClick={handleEndSession}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              完成
            </button>

            <button
              onClick={handleAbandon}
              className="p-2.5 rounded-xl bg-dark-700/60 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-white/[0.05] active:scale-95"
              title="放弃本次专注"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="w-full space-y-3 mt-2">
            {/* Minimalist Segmented Duration Picker */}
            <div className="flex items-center p-1 rounded-xl bg-dark-900/80 border border-white/[0.06]">
              {isRecovery && (
                <button
                  onClick={() => {
                    setTimerMode('countdown');
                    setTargetMinutes(10);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    timerMode === 'countdown' && targetMinutes === 10
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-emerald-400/80 hover:text-emerald-300'
                  }`}
                >
                  10m
                </button>
              )}
              {[15, 25, 45].map((mins) => (
                <button
                  key={mins}
                  onClick={() => {
                    setTimerMode('countdown');
                    setTargetMinutes(mins);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    timerMode === 'countdown' && targetMinutes === mins
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mins}m
                </button>
              ))}
              <button
                onClick={() => setTimerMode('stopwatch')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  timerMode === 'stopwatch'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                心流
              </button>
            </div>

            <button
              onClick={() => handleStart(timerMode, targetMinutes)}
              className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 active:scale-95 text-white font-bold text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-1.5 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              开启专注
            </button>
          </div>
        )}
      </div>

      {/* Streamlined White Noise Selector */}
      <div className="p-3.5 rounded-2xl bg-dark-800/60 border border-white/[0.07] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Volume2 className="w-3.5 h-3.5 text-blue-400" />
            <span>白噪音</span>
          </div>
          <span className="text-[10px] text-slate-500">离线合成 · 免流量</span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => toggleSound('none')}
            className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${
              soundType === 'none'
                ? 'bg-dark-700 text-white border-white/[0.15]'
                : 'bg-dark-900/40 text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            静音
          </button>
          <button
            onClick={() => toggleSound('rain')}
            className={`py-1.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1 transition-all ${
              soundType === 'rain'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                : 'bg-dark-900/40 text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <CloudRain className="w-3 h-3" /> 雨声
          </button>
          <button
            onClick={() => toggleSound('brown')}
            className={`py-1.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1 transition-all ${
              soundType === 'brown'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-dark-900/40 text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Radio className="w-3 h-3" /> 棕噪
          </button>
          <button
            onClick={() => toggleSound('pink')}
            className={`py-1.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1 transition-all ${
              soundType === 'pink'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-dark-900/40 text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Flame className="w-3 h-3" /> 粉噪
          </button>
        </div>

        {soundType !== 'none' && (
          <div className="flex items-center gap-2 pt-1">
            <VolumeX className="w-3 h-3 text-slate-500" />
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
              className="flex-1 accent-blue-500 h-1 bg-dark-700 rounded-lg cursor-pointer"
            />
            <Volume2 className="w-3 h-3 text-blue-400" />
          </div>
        )}
      </div>

      {/* Settle Modal */}
      {settlementData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-dark-800 border border-white/[0.1] rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="text-center">
              <span className="inline-flex p-2.5 rounded-full bg-blue-500/15 text-blue-400 mb-2">
                <CheckCircle className="w-6 h-6" />
              </span>
              <h3 className="text-base font-bold text-white">专注结算</h3>
            </div>

            <div className="space-y-2 bg-dark-900/60 rounded-xl p-3 border border-white/[0.05] text-xs">
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">有效时长</span>
                <span className="text-white font-mono font-bold">
                  {Math.floor(settlementData.effectiveSeconds / 60)} 分钟
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">暂停时长</span>
                <span className="text-slate-400 font-mono">
                  {Math.floor(settlementData.pausedSeconds / 60)} 分钟
                </span>
              </div>
              <div className="flex justify-between py-1 border-t border-white/[0.06] items-center">
                <span className="text-slate-300 font-medium">获得 Focus EXP</span>
                <span className="text-blue-400 font-mono font-bold text-sm">
                  +{settlementData.earnedExp} EXP
                </span>
              </div>
            </div>

            <button
              onClick={handleConfirmSettlement}
              className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 active:scale-95 text-white font-bold text-xs shadow-md transition-all"
            >
              确认入账
            </button>
          </div>
        </div>
      )}

      {/* Sedentary Awakening Modal */}
      {showMicroMovement && selectedMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-dark-800 border border-emerald-500/30 rounded-3xl p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">久坐唤醒</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                {selectedMovement.category === 'desk' ? '工位动作' : '离座活动'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-dark-900/60 border border-white/[0.05]">
              <div className="flex items-baseline justify-between mb-1">
                <h4 className="text-xs font-bold text-emerald-300">{selectedMovement.name}</h4>
                <span className="text-[10px] text-slate-400 font-mono">~{selectedMovement.durationSeconds}s</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedMovement.description}
              </p>
            </div>

            {movementDone ? (
              <div className="p-2.5 rounded-xl bg-emerald-950/60 text-center text-xs text-emerald-300 font-medium">
                ✓ 已完成碎片活动记录
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCompleteMicroMovement}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-95"
                >
                  已完成
                </button>
                <button
                  onClick={() => setShowMicroMovement(false)}
                  className="py-2.5 px-3 rounded-xl bg-dark-700 text-slate-400 text-xs"
                >
                  稍后
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
