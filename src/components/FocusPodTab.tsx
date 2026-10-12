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

  // Mode: countdown vs stopwatch
  const [timerMode, setTimerMode] = useState<'countdown' | 'stopwatch'>('countdown');
  const [targetMinutes, setTargetMinutes] = useState<number>(initialMinutes || (isRecovery ? 10 : 25));

  // Active session
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Audio state
  const [soundType, setSoundType] = useState<SoundType>('none');
  const [soundVolume, setSoundVolume] = useState<number>(0.5);

  // Settlement modal state
  const [settlementData, setSettlementData] = useState<{
    session: FocusSession;
    effectiveSeconds: number;
    pausedSeconds: number;
    earnedExp: number;
  } | null>(null);

  // Micro movement modal state
  const [showMicroMovement, setShowMicroMovement] = useState<boolean>(false);
  const [selectedMovement, setSelectedMovement] = useState<MicroMovement | null>(null);
  const [movementDone, setMovementDone] = useState<boolean>(false);

  const timerIntervalRef = useRef<number | null>(null);

  // Load active session from IndexedDB on mount
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

  // Recalculate elapsed time based on timestamps (iOS background resilient!)
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

  // Update timer display every second with timestamp calibration
  useEffect(() => {
    if (!activeSession) {
      if (onActiveSessionChange) onActiveSessionChange(false);
      return;
    }
    if (onActiveSessionChange) onActiveSessionChange(true);

    const updateTimer = () => {
      const { effective } = calculateEffectiveElapsed(activeSession);
      setElapsedSeconds(effective);

      // If countdown finished
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

    // Listen for tab visibility change (calibrates immediately when coming back from background)
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

  // Start new session
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

    // If sound selected, start sound
    if (soundType !== 'none') {
      soundSynthesizer.play(soundType);
    }
  };

  // Pause session
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

  // Resume session
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

  // End session and prepare settlement
  const handleEndSession = async () => {
    if (!activeSession) return;
    const now = Date.now();

    // Close any ongoing pause
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

    // Present settlement modal
    setSettlementData({
      session: completedSession,
      effectiveSeconds: effective,
      pausedSeconds: paused,
      earnedExp
    });
  };

  // Abandon session
  const handleAbandon = async () => {
    if (!activeSession) return;
    if (window.confirm('确定要放弃本次专注吗？未结算的时间将不会获得 EXP。')) {
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

  // Confirm settlement and award EXP
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
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
    }

    // Mark settled
    await db.focusSessions.update(session.id, { settledAt: Date.now() });

    setSettlementData(null);
    refreshData();

    // Trigger sedentary activity prompt
    setSelectedMovement(MICRO_MOVEMENTS[Math.floor(Math.random() * MICRO_MOVEMENTS.length)]);
    setShowMicroMovement(true);
    setMovementDone(false);
  };

  // Complete micro movement
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
    }, 1200);
  };

  // Sound selection toggle
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

  // Format seconds mm:ss
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Display calculations
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
      {/* Timer Screen Container */}
      <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-b from-dark-800 to-dark-900 border border-dark-700/80 shadow-2xl flex flex-col items-center">
        {/* Top Mode Label */}
        <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="flex items-center gap-1.5 font-medium">
            <span className={`w-2 h-2 rounded-full ${activeSession ? (isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse') : 'bg-slate-500'}`} />
            {activeSession ? (isPaused ? '已暂停' : '专注进行中') : '准备开始'}
          </span>
          <span className="text-[11px] text-slate-400">
            {activeSession ? (activeSession.mode === 'countdown' ? '倒计时模式' : '正向心流') : (isRecovery ? '低负担保底已就绪' : '标准番茄律动')}
          </span>
        </div>

        {/* Circular Progress & Time Display */}
        <div className="relative my-4 flex items-center justify-center">
          <svg className="w-64 h-64 -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="110"
              stroke="#1e2436"
              strokeWidth="8"
              fill="transparent"
            />
            {activeSession && activeSession.mode === 'countdown' && (
              <circle
                cx="128"
                cy="128"
                r="110"
                stroke="#3B82F6"
                strokeWidth="8"
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
                stroke="#10B981"
                strokeWidth="8"
                strokeDasharray="6 8"
                fill="transparent"
                className="animate-spin"
                style={{ animationDuration: '30s' }}
              />
            )}
          </svg>

          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="font-mono text-5xl font-black tracking-tight text-white drop-shadow-md">
              {activeSession ? formatTime(displaySeconds) : `${targetMinutes}:00`}
            </span>
            <span className="text-xs text-slate-400 mt-2 font-medium">
              {activeSession ? (
                isPaused ? '已暂停（暂停不计有效时长）' : '深度聚焦中 · +1 EXP/分'
              ) : (
                '点击下方开始'
              )}
            </span>
          </div>
        </div>

        {/* Active Controls */}
        {activeSession ? (
          <div className="flex items-center gap-3 w-full mt-2">
            {isPaused ? (
              <button
                onClick={handleResume}
                className="flex-1 py-3 rounded-2xl bg-blue-500 hover:bg-blue-400 active:scale-95 text-white font-bold text-sm shadow-lg shadow-blue-500/30 flex items-center justify-center gap-1.5 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                继续专注
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="flex-1 py-3 rounded-2xl bg-dark-700 hover:bg-dark-600 active:scale-95 text-slate-200 font-bold text-sm border border-dark-600 flex items-center justify-center gap-1.5 transition-all"
              >
                <Pause className="w-4 h-4 fill-current" />
                暂停
              </button>
            )}

            <button
              onClick={handleEndSession}
              className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              结算
            </button>

            <button
              onClick={handleAbandon}
              className="p-3 rounded-2xl bg-dark-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-dark-700 active:scale-95 transition-all"
              title="放弃本次专注"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Preset Selector & Start Button */
          <div className="w-full space-y-3.5 mt-2">
            <div className="flex items-center justify-center gap-2">
              {isRecovery && (
                <button
                  onClick={() => {
                    setTimerMode('countdown');
                    setTargetMinutes(10);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    timerMode === 'countdown' && targetMinutes === 10
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                      : 'bg-dark-800 text-emerald-400 border-emerald-900/60'
                  }`}
                >
                  10m 保底
                </button>
              )}
              {[15, 25, 45].map((mins) => (
                <button
                  key={mins}
                  onClick={() => {
                    setTimerMode('countdown');
                    setTargetMinutes(mins);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    timerMode === 'countdown' && targetMinutes === mins
                      ? 'bg-blue-500 text-white border-blue-400 shadow-md shadow-blue-500/20'
                      : 'bg-dark-800 text-slate-300 border-dark-700 hover:border-dark-600'
                  }`}
                >
                  {mins}m
                </button>
              ))}
              <button
                onClick={() => setTimerMode('stopwatch')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  timerMode === 'stopwatch'
                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                    : 'bg-dark-800 text-slate-300 border-dark-700 hover:border-dark-600'
                }`}
              >
                心流正向
              </button>
            </div>

            <button
              onClick={() => handleStart(timerMode, targetMinutes)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 active:scale-98 text-white font-bold text-base shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              开启专注
            </button>
          </div>
        )}
      </div>

      {/* Web Audio White Noise Synthesizer (Section 5.1.2) */}
      <div className="p-4 rounded-2xl bg-dark-800 border border-dark-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              离线合成白噪音
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">Web Audio API · 免下载流量</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => toggleSound('rain')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-medium transition-all ${
              soundType === 'rain'
                ? 'bg-blue-500/20 border-blue-400 text-blue-300 shadow-sm'
                : 'bg-dark-900/60 border-dark-700 text-slate-300 hover:border-dark-600'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5" />
            雨声
          </button>

          <button
            onClick={() => toggleSound('brown')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-medium transition-all ${
              soundType === 'brown'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                : 'bg-dark-900/60 border-dark-700 text-slate-300 hover:border-dark-600'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            棕噪音 (深沉)
          </button>

          <button
            onClick={() => toggleSound('pink')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-medium transition-all ${
              soundType === 'pink'
                ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-sm'
                : 'bg-dark-900/60 border-dark-700 text-slate-300 hover:border-dark-600'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            粉红噪音 (柔和)
          </button>
        </div>

        {soundType !== 'none' && (
          <div className="mt-3 pt-2.5 border-t border-dark-700/60 flex items-center gap-3">
            <VolumeX className="w-3.5 h-3.5 text-slate-400" />
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
              className="flex-1 accent-blue-500 h-1.5 bg-dark-700 rounded-lg cursor-pointer"
            />
            <Volume2 className="w-3.5 h-3.5 text-blue-400" />
            <button
              onClick={() => {
                soundSynthesizer.stop();
                setSoundType('none');
              }}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium ml-1"
            >
              停止
            </button>
          </div>
        )}

        <p className="text-[10px] text-slate-400 mt-2 leading-tight">
          💡 iOS 系统机制在锁屏或挂起后台时可能暂停音频；返回应用时将如实展示播放状态，核心计时器不依赖音频常驻。
        </p>
      </div>

      {/* Settlement Modal (Section 4.2.1) */}
      {settlementData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-dark-800 border border-dark-600 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="text-center">
              <span className="inline-flex p-3 rounded-full bg-blue-500/20 text-blue-400 mb-2 border border-blue-500/30">
                <CheckCircle className="w-8 h-8" />
              </span>
              <h3 className="text-lg font-bold text-white">会话结算确认</h3>
              <p className="text-xs text-slate-400 mt-0.5">专注时间转化为真实可溯的 Focus EXP</p>
            </div>

            <div className="space-y-2 bg-dark-900/80 rounded-2xl p-3.5 border border-dark-700/80 text-xs">
              <div className="flex justify-between py-1 border-b border-dark-700/50">
                <span className="text-slate-400">有效专注时长</span>
                <span className="text-white font-mono font-bold text-sm">
                  {Math.floor(settlementData.effectiveSeconds / 60)} 分钟{' '}
                  <span className="text-slate-400 text-xs">({settlementData.effectiveSeconds % 60}秒)</span>
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-dark-700/50">
                <span className="text-slate-400">主动暂停时长</span>
                <span className="text-slate-400 font-mono">
                  {Math.floor(settlementData.pausedSeconds / 60)} 分钟 ({settlementData.pausedSeconds % 60}秒)
                </span>
              </div>
              <div className="flex justify-between py-1 items-center">
                <span className="text-slate-300 font-medium">本次奖励 Focus EXP</span>
                <span className="text-blue-400 font-mono font-black text-base">
                  +{settlementData.earnedExp} EXP
                </span>
              </div>
            </div>

            {settlementData.earnedExp === 0 && (
              <p className="text-[11px] text-amber-400/90 text-center">
                ⚠️ 本次有效专注不足 1 分钟，按规则不计入 EXP 流水。
              </p>
            )}

            <button
              onClick={handleConfirmSettlement}
              className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 active:scale-95 text-white font-bold text-sm shadow-lg shadow-blue-500/30 transition-all"
            >
              确认结算入账
            </button>
          </div>
        </div>
      )}

      {/* Sedentary Activity Awakening (Section 5.1.3) */}
      {showMicroMovement && selectedMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-dark-800 border border-emerald-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">久坐唤醒建议</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                {selectedMovement.category === 'desk' ? '工位隐蔽动作' : '离座微活动'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-dark-900/80 border border-dark-700/60">
              <div className="flex items-baseline justify-between mb-1.5">
                <h4 className="text-sm font-bold text-emerald-300">{selectedMovement.name}</h4>
                <span className="text-xs text-slate-400 font-mono">约 {selectedMovement.durationSeconds} 秒</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedMovement.description}
              </p>
            </div>

            {movementDone ? (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-700 text-center text-xs text-emerald-300 font-medium flex items-center justify-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                已记录碎片活动！保持呼吸与身心平衡。
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCompleteMicroMovement}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all active:scale-95"
                >
                  我已完成此动作
                </button>
                <button
                  onClick={() => setShowMicroMovement(false)}
                  className="py-2.5 px-3 rounded-xl bg-dark-700 text-slate-400 hover:text-slate-200 text-xs font-medium"
                >
                  稍后 / 略过
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
