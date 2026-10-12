import React, { useState, useEffect } from 'react';
import {
  Dumbbell,
  CheckCircle2,
  Plus,
  Scale,
  Flame,
  Footprints,
  Sparkles
} from 'lucide-react';
import type { BodyPart, WorkoutSet, BodyMetric } from '../types';
import { db, getLocalDate } from '../db';
import { awardExp, EXP_RULES, getDailyCapInfo } from '../services/expService';
import confetti from 'canvas-confetti';

interface BodyTabProps {
  refreshData: () => void;
}

interface RoutinePreset {
  id: string;
  name: string;
  desc: string;
  bodyPart: BodyPart;
  icon: any;
  defaultReps: number;
}

const QUICK_ROUTINES: RoutinePreset[] = [
  {
    id: 'walk_steps',
    name: '日常健步 / 步数达标',
    desc: '户外散步、通勤走动 30 分钟，激活下肢循环',
    bodyPart: 'legs',
    icon: Footprints,
    defaultReps: 3000
  },
  {
    id: 'desk_stretch',
    name: '全身拉伸 / 筋膜舒展',
    desc: '久坐肩颈放松、胸椎伸展与腿后侧拉伸 10 分钟',
    bodyPart: 'back',
    icon: Sparkles,
    defaultReps: 10
  },
  {
    id: 'bodyweight_power',
    name: '自重力量唤醒',
    desc: '俯卧撑、深蹲或靠墙静蹲，激活核心与上肢力量',
    bodyPart: 'chest',
    icon: Dumbbell,
    defaultReps: 20
  },
  {
    id: 'cardio_activation',
    name: '有氧心肺激活',
    desc: '慢跑、跳绳、开合跳或动感单车，微汗排湿',
    bodyPart: 'core',
    icon: Flame,
    defaultReps: 15
  }
];

export const BodyTab: React.FC<BodyTabProps> = ({ refreshData }) => {
  const [dailyCap, setDailyCap] = useState<{ used: number; max: number; remaining: number }>({ used: 0, max: 2, remaining: 2 });
  const [todayCompletedSets, setTodayCompletedSets] = useState<WorkoutSet[]>([]);
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [showWeightSection, setShowWeightSection] = useState<boolean>(false);

  // Custom Workout input
  const [customName, setCustomName] = useState<string>('');
  const [customSets, setCustomSets] = useState<number>(3);
  const [customReps, setCustomReps] = useState<number>(12);
  const [customWeight, setCustomWeight] = useState<string>('');

  // Body Metrics
  const [weightInput, setWeightInput] = useState<string>('');
  const [recentMetrics, setRecentMetrics] = useState<BodyMetric[]>([]);

  const loadData = async () => {
    const cap = await getDailyCapInfo('workout');
    setDailyCap(cap);

    const sets = await db.workoutSets
      .where('createdAt')
      .above(Date.now() - 24 * 60 * 60 * 1000)
      .reverse()
      .toArray();
    setTodayCompletedSets(sets);

    const metrics = await db.bodyMetrics.orderBy('createdAt').reverse().limit(3).toArray();
    setRecentMetrics(metrics);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick Routine check-in
  const handleQuickCheckin = async (routine: RoutinePreset) => {
    const today = getLocalDate();
    const setId = `wset_${Date.now()}`;
    const newSet: WorkoutSet = {
      id: setId,
      sessionId: `wsess_${today}`,
      exerciseId: routine.id,
      exerciseName: routine.name,
      bodyPart: routine.bodyPart,
      setNumber: 1,
      reps: routine.defaultReps,
      createdAt: Date.now()
    };

    await db.workoutSets.put(newSet);

    const tx = await awardExp({
      dimension: 'body',
      amount: EXP_RULES.WORKOUT,
      reason: `完成身体活力训练 (${routine.name})`,
      sourceType: 'workout_set',
      sourceId: setId,
      localDate: today
    });

    if (tx) {
      confetti({ particleCount: 45, spread: 60, origin: { y: 0.6 } });
    }

    loadData();
    refreshData();
  };

  // Custom workout save
  const handleSaveCustomWorkout = async () => {
    if (!customName.trim()) {
      alert('请输入动作名称');
      return;
    }
    const today = getLocalDate();
    const setId = `wset_${Date.now()}`;
    const wKg = customWeight ? parseFloat(customWeight) : undefined;

    const newSet: WorkoutSet = {
      id: setId,
      sessionId: `wsess_${today}`,
      exerciseId: `custom_${Date.now()}`,
      exerciseName: customName.trim(),
      bodyPart: 'chest',
      setNumber: customSets,
      reps: customReps,
      weightKg: wKg,
      createdAt: Date.now()
    };

    await db.workoutSets.put(newSet);

    await awardExp({
      dimension: 'body',
      amount: EXP_RULES.WORKOUT,
      reason: `自定义力量打卡: ${customName.trim()} (${customSets}组 × ${customReps}次)`,
      sourceType: 'workout_set',
      sourceId: setId,
      localDate: today
    });

    confetti({ particleCount: 45, spread: 60, origin: { y: 0.6 } });
    setShowCustomModal(false);
    setCustomName('');
    loadData();
    refreshData();
  };

  // Body Metric Save
  const handleSaveWeight = async () => {
    if (!weightInput) return;
    const w = parseFloat(weightInput);
    if (isNaN(w) || w <= 0) return;

    await db.bodyMetrics.put({
      id: `metric_${Date.now()}`,
      localDate: getLocalDate(),
      weightKg: w,
      createdAt: Date.now()
    });

    setWeightInput('');
    loadData();
  };

  return (
    <div className="space-y-6 px-5 py-4 max-w-lg mx-auto pb-28">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">身体活力</h2>
          <p className="text-xs text-[#8E8E93] mt-1">远离久坐 · 唤醒肌肉 · 保持充沛精力</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#8E8E93] px-3 py-1 rounded-full bg-[#1C1C1E] border border-white/10">
            今日 {dailyCap.used}/{dailyCap.max}
          </span>
          <button
            onClick={() => setShowWeightSection(!showWeightSection)}
            className="w-10 h-10 rounded-full bg-[#1C1C1E] border border-white/10 text-slate-300 hover:text-white flex items-center justify-center active:scale-95 transition-all shadow-sm"
            title="体重记录"
          >
            <Scale className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Weight Section (Collapsible) */}
      {showWeightSection && (
        <div className="p-5 rounded-3xl bg-[#1C1C1E] border border-emerald-500/30 space-y-3 animate-fade-in shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              体重记录 (kg)
            </span>
            {recentMetrics[0]?.weightKg && (
              <span className="text-xs text-emerald-400 font-mono font-semibold">
                最新: {recentMetrics[0].weightKg} kg
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              placeholder="输入今日体重，如 68.5"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="flex-1 h-12 px-4 rounded-2xl bg-[#2C2C2E] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-emerald-500/50"
            />
            <button
              onClick={handleSaveWeight}
              className="h-12 px-5 rounded-2xl bg-[#34C759] text-white font-semibold text-sm active:scale-95 shadow-sm"
            >
              保存
            </button>
          </div>
        </div>
      )}

      {/* 4 Easy Routine Cards */}
      <div className="space-y-3.5">
        <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider block px-1">
          今日身体激活 · 点击即打卡
        </span>

        {QUICK_ROUTINES.map((routine) => {
          const Icon = routine.icon;
          const isDoneToday = todayCompletedSets.some((s) => s.exerciseId === routine.id);

          return (
            <div
              key={routine.id}
              className="p-5 rounded-3xl bg-[#1C1C1E] border border-white/[0.08] flex items-center justify-between gap-4 shadow-sm hover:bg-[#242426] transition-all"
            >
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  isDoneToday ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#2C2C2E] text-slate-200'
                }`}>
                  <Icon className="w-6 h-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-bold text-white leading-snug">{routine.name}</h4>
                  <p className="text-xs text-[#8E8E93] mt-1 leading-relaxed">{routine.desc}</p>
                </div>
              </div>

              {isDoneToday ? (
                <span className="h-11 px-4 rounded-2xl bg-emerald-500/15 text-emerald-400 font-semibold text-xs flex items-center gap-1.5 shrink-0 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" />
                  已达标
                </span>
              ) : (
                <button
                  onClick={() => handleQuickCheckin(routine)}
                  className="h-11 px-4 rounded-2xl bg-[#34C759] hover:bg-emerald-400 active:scale-95 text-white font-semibold text-xs shadow-md shadow-green-500/20 transition-all shrink-0 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  打卡 +25
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom Workout Card / Trigger */}
      <div className="p-5 rounded-3xl bg-[#1C1C1E] border border-white/[0.08] flex items-center justify-between shadow-sm">
        <div>
          <h4 className="text-base font-bold text-white">进阶力量训练记录</h4>
          <p className="text-xs text-[#8E8E93] mt-0.5">有器械或专项训练？可记录组数与负重</p>
        </div>
        <button
          onClick={() => setShowCustomModal(true)}
          className="h-11 px-4 rounded-2xl bg-[#2C2C2E] hover:bg-[#3A3A3C] text-slate-200 font-semibold text-xs border border-white/10 active:scale-95 transition-all"
        >
          添加记录
        </button>
      </div>

      {/* Today Completed Sets Log */}
      {todayCompletedSets.length > 0 && (
        <div className="space-y-3">
          <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider block px-1">
            今日完成动态
          </span>
          <div className="space-y-2">
            {todayCompletedSets.map((set) => (
              <div
                key={set.id}
                className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/[0.06] flex items-center justify-between text-xs text-[#8E8E93]"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-white">{set.exerciseName}</span>
                </div>
                <span className="font-mono text-emerald-400 font-semibold">+25 Body EXP</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Workout Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-5 animate-fade-in">
          <div className="w-full max-w-sm bg-[#1C1C1E] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">记录进阶训练</h3>
              <button
                onClick={() => setShowCustomModal(false)}
                className="text-[#8E8E93] hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#8E8E93] block mb-1">动作名称</label>
                <input
                  type="text"
                  placeholder="如：哑铃侧平举、引体向上"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#2C2C2E] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs text-[#8E8E93] block mb-1">完成组数</label>
                  <input
                    type="number"
                    value={customSets}
                    onChange={(e) => setCustomSets(parseInt(e.target.value) || 1)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#2C2C2E] border border-white/[0.08] text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#8E8E93] block mb-1">每组次数</label>
                  <input
                    type="number"
                    value={customReps}
                    onChange={(e) => setCustomReps(parseInt(e.target.value) || 1)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#2C2C2E] border border-white/[0.08] text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[#8E8E93] block mb-1">负重 (kg，自重可留空)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="自重留空或填 0"
                  value={customWeight}
                  onChange={(e) => setCustomWeight(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#2C2C2E] border border-white/[0.08] text-sm text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSaveCustomWorkout}
                className="flex-1 h-13 rounded-2xl bg-[#34C759] hover:bg-emerald-400 text-white font-bold text-sm shadow-md transition-all active:scale-95"
              >
                保存打卡 (+25 EXP)
              </button>
              <button
                onClick={() => setShowCustomModal(false)}
                className="h-13 px-4 rounded-2xl bg-[#2C2C2E] text-slate-300 text-sm hover:text-white"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
