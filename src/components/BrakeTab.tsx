import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Wind, Play, RotateCcw, CheckCircle2, ArrowRight } from 'lucide-react';
import { db, getLocalDate } from '../db';
import { soundSynthesizer } from '../services/audioService';

interface BrakeTabProps {
  onStartFocus: (minutes: number) => void;
  onRefreshData?: () => void;
}

type BreathPhase = 'idle' | 'inhale' | 'hold' | 'exhale' | 'finished';

export const BrakeTab: React.FC<BrakeTabProps> = ({ onStartFocus, onRefreshData }) => {
  const [phase, setPhase] = useState<BreathPhase>('idle');
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [cycleCount, setCycleCount] = useState<number>(0);
  const [completedBrakesToday, setCompletedBrakesToday] = useState<number>(0);

  const timerRef = useRef<number | null>(null);

  const loadTodayBrakes = useCallback(async () => {
    const today = getLocalDate();
    const count = await db.activityEvents
      .where('localDate')
      .equals(today)
      .and((e) => e.type === 'stop_loss' || e.type === 'intercept')
      .count();
    setCompletedBrakesToday(count);
  }, []);

  useEffect(() => {
    loadTodayBrakes();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loadTodayBrakes]);

  // Phase transition logic for 4-7-8 breathing
  const startBreathingCycle = (currentCycle: number) => {
    if (timerRef.current) clearInterval(timerRef.current);

    // 1. Inhale: 4 seconds
    setPhase('inhale');
    setSecondsLeft(4);
    soundSynthesizer.playCyberHaptic('pulse');

    let phaseTimer = 4;
    timerRef.current = window.setInterval(() => {
      phaseTimer -= 1;
      setSecondsLeft(phaseTimer);

      if (phaseTimer <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);

        // 2. Hold: 7 seconds
        setPhase('hold');
        setSecondsLeft(7);
        soundSynthesizer.playCyberHaptic('chime');
        let holdTimer = 7;

        timerRef.current = window.setInterval(() => {
          holdTimer -= 1;
          setSecondsLeft(holdTimer);

          if (holdTimer <= 0) {
            if (timerRef.current) clearInterval(timerRef.current);

            // 3. Exhale: 8 seconds
            setPhase('exhale');
            setSecondsLeft(8);
            soundSynthesizer.playCyberHaptic('purify');
            let exhaleTimer = 8;

            timerRef.current = window.setInterval(() => {
              exhaleTimer -= 1;
              setSecondsLeft(exhaleTimer);

              if (exhaleTimer <= 0) {
                if (timerRef.current) clearInterval(timerRef.current);

                const nextCycle = currentCycle + 1;
                setCycleCount(nextCycle);

                if (nextCycle >= 3) {
                  // Completed 3 full rounds (about 1 minute)
                  handleFinishBreathing();
                } else {
                  // Loop next cycle
                  startBreathingCycle(nextCycle);
                }
              }
            }, 1000);
          }
        }, 1000);
      }
    }, 1000);
  };

  const handleStart = () => {
    setCycleCount(0);
    startBreathingCycle(0);
  };

  const handleStop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('idle');
    setSecondsLeft(0);
    setCycleCount(0);
  };

  const handleFinishBreathing = async () => {
    setPhase('finished');
    soundSynthesizer.playCyberHaptic('chime');

    const eventId = `act_sl_${Date.now()}`;
    await db.activityEvents.put({
      id: eventId,
      type: 'stop_loss',
      createdAt: Date.now(),
      localDate: getLocalDate(),
      completed: true,
      note: '4-7-8 神经刹车重置'
    });

    loadTodayBrakes();
    if (onRefreshData) onRefreshData();
  };

  return (
    <div className="space-y-6 px-5 py-4 max-w-lg mx-auto pb-28">
      {/* Top Header */}
      <div className="text-center space-y-1">
        <span className="text-[11px] font-mono tracking-widest text-[#FF9F0A] uppercase font-semibold">
          Neuro Reset Protocol · 4-7-8
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-white">紧急刹车 · 神经重置</h2>
        <p className="text-xs text-[#8E8E93] max-w-xs mx-auto">
          当你意识到自己正在被短视频或信息流无意识劫持时，用 1 分钟深呼吸夺回大脑前额叶主权。
        </p>
      </div>

      {/* Main Breathing Circle */}
      <div className="p-8 rounded-3xl bg-[#1C1C1E] border border-white/10 flex flex-col items-center justify-center relative overflow-hidden min-h-[320px]">
        {/* Ambient Glow */}
        <div
          className={`absolute inset-0 rounded-3xl blur-3xl opacity-20 pointer-events-none transition-all duration-1000 ${
            phase === 'inhale'
              ? 'bg-[#0A84FF] scale-110'
              : phase === 'hold'
              ? 'bg-[#FF9F0A] scale-100'
              : phase === 'exhale'
              ? 'bg-[#30D158] scale-90'
              : 'bg-transparent'
          }`}
        />

        {phase === 'idle' && (
          <div className="flex flex-col items-center justify-center text-center space-y-6 py-6 z-10">
            <div className="w-36 h-36 rounded-full border border-dashed border-white/20 flex items-center justify-center bg-white/[0.02]">
              <Wind className="w-12 h-12 text-[#FF9F0A]" />
            </div>

            <div className="space-y-1">
              <div className="text-lg font-bold text-white">准备好切断无意识滑动</div>
              <div className="text-xs text-[#8E8E93]">吸气 4s · 屏息 7s · 慢呼 8s (共 3 轮)</div>
            </div>

            <button
              onClick={handleStart}
              className="w-48 h-14 rounded-2xl bg-[#FF9F0A] hover:bg-amber-400 active:scale-95 text-black font-bold text-base shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>开始深呼吸</span>
            </button>
          </div>
        )}

        {(phase === 'inhale' || phase === 'hold' || phase === 'exhale') && (
          <div className="flex flex-col items-center justify-center text-center space-y-6 py-4 z-10">
            {/* Morphing Lung Circle */}
            <div className="relative w-44 h-44 flex items-center justify-center">
              <div
                className={`absolute rounded-full border-2 transition-all duration-1000 flex items-center justify-center ${
                  phase === 'inhale'
                    ? 'w-44 h-44 bg-[#0A84FF]/20 border-[#0A84FF] scale-100'
                    : phase === 'hold'
                    ? 'w-44 h-44 bg-[#FF9F0A]/20 border-[#FF9F0A] scale-105'
                    : 'w-24 h-24 bg-[#30D158]/20 border-[#30D158] scale-90'
                }`}
              />
              <div className="relative flex flex-col items-center">
                <span className="text-4xl font-mono font-bold text-white tabular-nums">
                  {secondsLeft}s
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-200 mt-1">
                  {phase === 'inhale' ? '深吸气' : phase === 'hold' ? '屏息保持' : '缓慢呼气'}
                </span>
              </div>
            </div>

            <div className="text-xs font-mono text-[#8E8E93]">
              第 {cycleCount + 1} / 3 轮
            </div>

            <button
              onClick={handleStop}
              className="h-10 px-5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs text-[#8E8E93] hover:text-white flex items-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 提前重置
            </button>
          </div>
        )}

        {phase === 'finished' && (
          <div className="flex flex-col items-center justify-center text-center space-y-5 py-4 z-10 animate-fade-in">
            <span className="w-16 h-16 rounded-full bg-emerald-500/20 text-[#30D158] flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-9 h-9" />
            </span>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-white">多巴胺劫持已阻断</h3>
              <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                副交感神经已激活，心率平稳。你刚刚战胜了一次本能冲动。
              </p>
            </div>

            <div className="w-full space-y-2.5 pt-2">
              <button
                onClick={() => onStartFocus(25)}
                className="w-full h-14 rounded-2xl bg-[#0A84FF] hover:bg-blue-400 active:scale-95 text-white font-bold text-sm shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>顺势开启 25 分钟专注</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setPhase('idle')}
                className="w-full py-2.5 text-xs text-[#8E8E93] hover:text-white transition-colors"
              >
                把手机反扣在桌上即可
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Honest Stat Card */}
      <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/[0.08] flex items-center justify-between text-xs">
        <span className="text-[#8E8E93]">今日成功刹车次数</span>
        <span className="font-mono font-bold text-white text-sm">
          {completedBrakesToday} 次拦截
        </span>
      </div>
    </div>
  );
};
