import React, { useState, useEffect } from 'react';
import {
  Plus,
  Scale,
  Trash2
} from 'lucide-react';
import type { BodyPart, WorkoutSet, BodyMetric } from '../types';
import { db, getLocalDate } from '../db';
import { EXERCISE_PRESETS, BODY_PART_LABELS } from '../data/exercisePresets';
import { awardExp, revertExp, EXP_RULES, getDailyCapInfo } from '../services/expService';
import confetti from 'canvas-confetti';

interface BodyTabProps {
  refreshData: () => void;
}

export const BodyTab: React.FC<BodyTabProps> = ({ refreshData }) => {
  const [selectedPart, setSelectedPart] = useState<BodyPart>('shoulder');
  const [selectedExercise, setSelectedExercise] = useState<string>(EXERCISE_PRESETS[0].id);
  const [customExerciseName, setCustomExerciseName] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  // Set Inputs
  const [setNumber, setSetNumber] = useState<number>(3);
  const [reps, setReps] = useState<number>(12);
  const [weightKg, setWeightKg] = useState<string>('');
  const [assistance, setAssistance] = useState<string>('');

  // History & Comparison
  const [lastWorkoutSet, setLastWorkoutSet] = useState<WorkoutSet | null>(null);
  const [maxWorkoutSet, setMaxWorkoutSet] = useState<WorkoutSet | null>(null);
  const [recentSets, setRecentSets] = useState<WorkoutSet[]>([]);
  const [hoursSinceLastPart, setHoursSinceLastPart] = useState<number | null>(null);

  // Daily caps
  const [dailyCap, setDailyCap] = useState<{ used: number; max: number; remaining: number }>({ used: 0, max: 2, remaining: 2 });

  // Body Metrics
  const [weightInput, setWeightInput] = useState<string>('');
  const [waistInput, setWaistInput] = useState<string>('');
  const [recentMetrics, setRecentMetrics] = useState<BodyMetric[]>([]);
  const [showMetricSection, setShowMetricSection] = useState<boolean>(false);

  const loadExerciseComparison = async (exerciseId: string, part: BodyPart) => {
    const previousSets = await db.workoutSets
      .where('exerciseId')
      .equals(exerciseId)
      .reverse()
      .sortBy('createdAt');

    if (previousSets.length > 0) {
      setLastWorkoutSet(previousSets[0]);

      let best = previousSets[0];
      let bestScore = (best.weightKg || 1) * best.reps * best.setNumber;
      for (const s of previousSets) {
        const score = (s.weightKg || 1) * s.reps * s.setNumber;
        if (score > bestScore) {
          bestScore = score;
          best = s;
        }
      }
      setMaxWorkoutSet(best);
    } else {
      setLastWorkoutSet(null);
      setMaxWorkoutSet(null);
    }

    const partSets = await db.workoutSets
      .where('bodyPart')
      .equals(part)
      .reverse()
      .sortBy('createdAt');

    if (partSets.length > 0) {
      const diffHours = Math.floor((Date.now() - partSets[0].createdAt) / (1000 * 60 * 60));
      setHoursSinceLastPart(diffHours);
    } else {
      setHoursSinceLastPart(null);
    }
  };

  const loadData = async () => {
    const cap = await getDailyCapInfo('workout');
    setDailyCap(cap);

    const allRecent = await db.workoutSets.orderBy('createdAt').reverse().limit(6).toArray();
    setRecentSets(allRecent);

    const metrics = await db.bodyMetrics.orderBy('createdAt').reverse().limit(3).toArray();
    setRecentMetrics(metrics);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadExerciseComparison(selectedExercise, selectedPart);
  }, [selectedExercise, selectedPart]);

  const handlePartChange = (part: BodyPart) => {
    setSelectedPart(part);
    setIsCustomMode(false);
    const presetsForPart = EXERCISE_PRESETS.filter((ex) => ex.bodyPart === part);
    if (presetsForPart.length > 0) {
      setSelectedExercise(presetsForPart[0].id);
    }
  };

  const handleSaveSet = async () => {
    const today = getLocalDate();
    let exerciseId = selectedExercise;
    let exerciseName = '';

    if (isCustomMode) {
      if (!customExerciseName.trim()) {
        alert('请输入动作名称');
        return;
      }
      exerciseId = `custom_${customExerciseName.trim()}`;
      exerciseName = customExerciseName.trim();
    } else {
      const preset = EXERCISE_PRESETS.find((e) => e.id === selectedExercise);
      exerciseName = preset ? preset.name : '训练动作';
    }

    const setId = `ws_${Date.now()}`;
    const parsedWeight = weightKg.trim() ? parseFloat(weightKg) : undefined;

    const newSet: WorkoutSet = {
      id: setId,
      sessionId: `sess_${today}`,
      exerciseId,
      exerciseName,
      bodyPart: selectedPart,
      setNumber: Math.max(1, setNumber),
      reps: Math.max(1, reps),
      weightKg: parsedWeight,
      assistance: assistance.trim() || undefined,
      createdAt: Date.now()
    };

    const currentScore = (parsedWeight || 1) * newSet.reps * newSet.setNumber;
    let isBreakthrough = false;

    if (maxWorkoutSet) {
      const maxScore = (maxWorkoutSet.weightKg || 1) * maxWorkoutSet.reps * maxWorkoutSet.setNumber;
      if (currentScore > maxScore) {
        isBreakthrough = true;
      }
    }

    await db.workoutSets.put(newSet);

    const tx = await awardExp({
      dimension: 'body',
      amount: EXP_RULES.WORKOUT,
      reason: `记录训练：${exerciseName} (${newSet.setNumber}组 × ${newSet.reps}次)`,
      sourceType: 'workout',
      sourceId: setId,
      localDate: today
    });

    if (isBreakthrough) {
      await awardExp({
        dimension: 'body',
        amount: EXP_RULES.WORKOUT_BREAKTHROUGH,
        reason: `个人突破！超越历史记录：${exerciseName}`,
        sourceType: 'workout_breakthrough',
        sourceId: setId,
        localDate: today
      });
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    } else if (tx) {
      confetti({ particleCount: 25, spread: 45, origin: { y: 0.7 } });
    }

    setAssistance('');
    loadData();
    loadExerciseComparison(exerciseId, selectedPart);
    refreshData();
  };

  const handleDeleteSet = async (set: WorkoutSet) => {
    if (window.confirm(`删除该条记录？EXP 将自动冲正。`)) {
      await db.workoutSets.delete(set.id);
      await revertExp({
        sourceType: 'workout',
        sourceId: set.id,
        reason: `删除训练记录 ${set.exerciseName}`
      });
      await revertExp({
        sourceType: 'workout_breakthrough',
        sourceId: set.id,
        reason: `删除个人突破记录 ${set.exerciseName}`
      });

      loadData();
      loadExerciseComparison(selectedExercise, selectedPart);
      refreshData();
    }
  };

  const handleSaveMetric = async () => {
    const today = getLocalDate();
    const w = weightInput ? parseFloat(weightInput) : undefined;
    const wst = waistInput ? parseFloat(waistInput) : undefined;

    if (!w && !wst) return;

    await db.bodyMetrics.put({
      id: `bm_${Date.now()}`,
      localDate: today,
      weightKg: w,
      waistCm: wst,
      createdAt: Date.now()
    });

    setWeightInput('');
    setWaistInput('');
    loadData();
  };

  const filteredPresets = EXERCISE_PRESETS.filter((ex) => ex.bodyPart === selectedPart);

  return (
    <div className="space-y-3.5 px-4 py-3 max-w-md mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">薄肌力量</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {hoursSinceLastPart !== null
              ? `距上次练${BODY_PART_LABELS[selectedPart]}约 ${hoursSinceLastPart}h`
              : '渐进负荷 · 记录成长'}
          </p>
        </div>
        <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded-full bg-dark-800 border border-white/[0.06]">
          今日 {dailyCap.used}/{dailyCap.max} 组
        </span>
      </div>

      {/* Body Part Segmented Tabs */}
      <div className="flex items-center p-1 rounded-xl bg-dark-900/80 border border-white/[0.06]">
        {(Object.keys(BODY_PART_LABELS) as BodyPart[]).map((part) => {
          const isSelected = selectedPart === part;
          return (
            <button
              key={part}
              onClick={() => handlePartChange(part)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isSelected
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {BODY_PART_LABELS[part]}
            </button>
          );
        })}
      </div>

      {/* Exercise Input Card */}
      <div className="p-3.5 rounded-2xl bg-dark-800/70 border border-white/[0.07] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300">动作选择</span>
          <button
            onClick={() => setIsCustomMode(!isCustomMode)}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
          >
            {isCustomMode ? '选择预设' : '+ 自定义'}
          </button>
        </div>

        {isCustomMode ? (
          <input
            type="text"
            placeholder="动作名称"
            value={customExerciseName}
            onChange={(e) => setCustomExerciseName(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl bg-dark-900/70 border border-white/[0.08] text-xs text-white focus:outline-none"
          />
        ) : (
          <select
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-dark-900/70 border border-white/[0.08] text-xs text-white focus:outline-none"
          >
            {filteredPresets.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} {ex.isBodyweight ? '(自重)' : ''}
              </option>
            ))}
          </select>
        )}

        {/* 3 Number Inputs */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="text-[10px] text-slate-500 block mb-1">组数</span>
            <input
              type="number"
              min="1"
              value={setNumber}
              onChange={(e) => setSetNumber(parseInt(e.target.value) || 1)}
              className="w-full py-1.5 bg-dark-900/70 border border-white/[0.06] rounded-xl text-center font-mono font-bold text-white text-xs focus:outline-none"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block mb-1">次数</span>
            <input
              type="number"
              min="1"
              value={reps}
              onChange={(e) => setReps(parseInt(e.target.value) || 1)}
              className="w-full py-1.5 bg-dark-900/70 border border-white/[0.06] rounded-xl text-center font-mono font-bold text-white text-xs focus:outline-none"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block mb-1">重量 (kg)</span>
            <input
              type="number"
              step="0.5"
              placeholder="自重"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full py-1.5 bg-dark-900/70 border border-white/[0.06] rounded-xl text-center font-mono font-bold text-white text-xs focus:outline-none placeholder-slate-600"
            />
          </div>
        </div>

        {/* Past Comparison */}
        {lastWorkoutSet && (
          <div className="text-[11px] text-slate-400 py-1 flex items-center justify-between">
            <span>上次：{lastWorkoutSet.setNumber}组 × {lastWorkoutSet.reps}次 {lastWorkoutSet.weightKg ? `@ ${lastWorkoutSet.weightKg}kg` : ''}</span>
            <span className="text-emerald-400/80 font-medium">历史参照</span>
          </div>
        )}

        <button
          onClick={handleSaveSet}
          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          保存记录 (+{EXP_RULES.WORKOUT} Body EXP)
        </button>
      </div>

      {/* Metric Tracker */}
      <div className="p-3 rounded-2xl bg-dark-800/50 border border-white/[0.05]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
            <Scale className="w-3.5 h-3.5 text-emerald-400" />
            <span>体重 & 腰围 (选填)</span>
          </div>
          <button
            onClick={() => setShowMetricSection(!showMetricSection)}
            className="text-[11px] text-emerald-400 font-medium"
          >
            {showMetricSection ? '收起' : '记录'}
          </button>
        </div>

        {showMetricSection && (
          <div className="mt-2.5 pt-2 border-t border-white/[0.05] space-y-2 animate-fade-in">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.1"
                placeholder="体重 kg"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-dark-900/70 border border-white/[0.06] text-xs text-white focus:outline-none"
              />
              <input
                type="number"
                step="0.5"
                placeholder="腰围 cm"
                value={waistInput}
                onChange={(e) => setWaistInput(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-dark-900/70 border border-white/[0.06] text-xs text-white focus:outline-none"
              />
            </div>
            <button
              onClick={handleSaveMetric}
              className="w-full py-1.5 rounded-xl bg-dark-700 text-slate-200 text-xs font-medium"
            >
              保存身体指标
            </button>
            {recentMetrics.length > 0 && (
              <div className="space-y-1 text-[10px] text-slate-400 pt-1">
                {recentMetrics.map((m) => (
                  <div key={m.id} className="flex justify-between py-0.5 border-b border-white/[0.04]">
                    <span>{m.localDate}</span>
                    <span className="font-mono text-slate-300">
                      {m.weightKg ? `${m.weightKg}kg` : ''} {m.waistCm ? `· 腰围 ${m.waistCm}cm` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Workout Sets */}
      {recentSets.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-bold text-slate-400 px-1">近期记录</span>
          <div className="space-y-1.5">
            {recentSets.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-dark-800/60 border border-white/[0.05]"
              >
                <div>
                  <span className="text-xs font-bold text-white mr-1.5">{s.exerciseName}</span>
                  <span className="text-[10px] text-slate-400">
                    {s.setNumber}组 × {s.reps}次 {s.weightKg ? `@ ${s.weightKg}kg` : ''}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteSet(s)}
                  className="p-1 rounded text-slate-500 hover:text-rose-400"
                  title="删除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
