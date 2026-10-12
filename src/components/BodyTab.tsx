import React, { useState, useEffect } from 'react';
import {
  Dumbbell,
  Plus,
  Clock,
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
  const [weightKg, setWeightKg] = useState<string>(''); // string to allow empty for bodyweight
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

  // Load exercise comparison data
  const loadExerciseComparison = async (exerciseId: string, part: BodyPart) => {
    // Find all sets for this exercise
    const previousSets = await db.workoutSets
      .where('exerciseId')
      .equals(exerciseId)
      .reverse()
      .sortBy('createdAt');

    if (previousSets.length > 0) {
      setLastWorkoutSet(previousSets[0]);

      // Calculate max historical volume or max reps
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

    // Calculate hours since last training of this body part
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

    const allRecent = await db.workoutSets.orderBy('createdAt').reverse().limit(10).toArray();
    setRecentSets(allRecent);

    const metrics = await db.bodyMetrics.orderBy('createdAt').reverse().limit(5).toArray();
    setRecentMetrics(metrics);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadExerciseComparison(selectedExercise, selectedPart);
  }, [selectedExercise, selectedPart]);

  // Handle Part Change
  const handlePartChange = (part: BodyPart) => {
    setSelectedPart(part);
    setIsCustomMode(false);
    const presetsForPart = EXERCISE_PRESETS.filter((ex) => ex.bodyPart === part);
    if (presetsForPart.length > 0) {
      setSelectedExercise(presetsForPart[0].id);
    }
  };

  // Save Workout Set
  const handleSaveSet = async () => {
    const today = getLocalDate();
    let exerciseId = selectedExercise;
    let exerciseName = '';

    if (isCustomMode) {
      if (!customExerciseName.trim()) {
        alert('请输入自定义动作名称');
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

    // Calculate Personal Breakthrough (Section 5.3.2)
    const currentScore = (parsedWeight || 1) * newSet.reps * newSet.setNumber;
    let isBreakthrough = false;

    if (maxWorkoutSet) {
      const maxScore = (maxWorkoutSet.weightKg || 1) * maxWorkoutSet.reps * maxWorkoutSet.setNumber;
      if (currentScore > maxScore) {
        isBreakthrough = true;
      }
    }

    await db.workoutSets.put(newSet);

    // Award standard workout EXP (+20 Body EXP, max 2/day)
    const tx = await awardExp({
      dimension: 'body',
      amount: EXP_RULES.WORKOUT,
      reason: `记录训练：${exerciseName} (${newSet.setNumber}组 × ${newSet.reps}次)`,
      sourceType: 'workout',
      sourceId: setId,
      localDate: today
    });

    // Award breakthrough EXP if applicable (+10 Body EXP extra)
    if (isBreakthrough) {
      await awardExp({
        dimension: 'body',
        amount: EXP_RULES.WORKOUT_BREAKTHROUGH,
        reason: `个人突破！超越历史记录：${exerciseName}`,
        sourceType: 'workout_breakthrough',
        sourceId: setId,
        localDate: today
      });
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
    } else if (tx) {
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } });
    }

    // Reset inputs
    setAssistance('');
    loadData();
    loadExerciseComparison(exerciseId, selectedPart);
    refreshData();
  };

  // Delete Workout Set with reversal (冲正流水)
  const handleDeleteSet = async (set: WorkoutSet) => {
    if (window.confirm(`确定要删除此条训练记录吗？相关的 EXP 将自动写入冲正流水。`)) {
      await db.workoutSets.delete(set.id);

      // Revert standard workout award
      await revertExp({
        sourceType: 'workout',
        sourceId: set.id,
        reason: `删除训练记录 ${set.exerciseName}`
      });

      // Revert breakthrough if awarded
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

  // Save Body Metric (weight/waist)
  const handleSaveMetric = async () => {
    const today = getLocalDate();
    const w = weightInput ? parseFloat(weightInput) : undefined;
    const wst = waistInput ? parseFloat(waistInput) : undefined;

    if (!w && !wst) {
      alert('请至少输入体重或腰围');
      return;
    }

    const metric: BodyMetric = {
      id: `bm_${Date.now()}`,
      localDate: today,
      weightKg: w,
      waistCm: wst,
      createdAt: Date.now()
    };

    await db.bodyMetrics.put(metric);
    setWeightInput('');
    setWaistInput('');
    loadData();
  };

  const filteredPresets = EXERCISE_PRESETS.filter((ex) => ex.bodyPart === selectedPart);

  return (
    <div className="space-y-4 px-4 py-3 max-w-md mx-auto">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <Dumbbell className="w-3.5 h-3.5" />
            Body 薄肌训练台
          </span>
          <h2 className="text-lg font-bold text-white mt-0.5">力量塑形与恢复</h2>
        </div>
        <span className="text-xs text-slate-400 bg-dark-800 px-2.5 py-1 rounded-full border border-dark-700">
          今日已奖 {dailyCap.used}/{dailyCap.max} 组
        </span>
      </div>

      {/* Body Part Selector */}
      <div className="flex items-center justify-between gap-1.5 p-1 rounded-2xl bg-dark-800 border border-dark-700">
        {(Object.keys(BODY_PART_LABELS) as BodyPart[]).map((part) => {
          const isSelected = selectedPart === part;
          return (
            <button
              key={part}
              onClick={() => handlePartChange(part)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                isSelected
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {BODY_PART_LABELS[part]}
            </button>
          );
        })}
      </div>

      {/* Recovery Hint (Section 5.3.3) */}
      <div className="p-3 rounded-xl bg-dark-800/80 border border-dark-700 flex items-start gap-2.5">
        <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300">
          {hoursSinceLastPart !== null ? (
            <p>
              距上次训练该部位约 <strong className="text-emerald-400 font-mono">{hoursSinceLastPart} 小时</strong>。
              {hoursSinceLastPart < 24 && '（近期刚练过，建议选择其他肌群交替或降低训练强度）'}
            </p>
          ) : (
            <p>暂无该部位近期训练记录，可作为今日优先启动项。</p>
          )}
          <span className="text-[10px] text-slate-400 mt-1 block">
            * 恢复时间仅作一般参考，请结合个人酸痛与体感自主决定。
          </span>
        </div>
      </div>

      {/* Exercise Form */}
      <div className="p-4 rounded-2xl bg-dark-800 border border-dark-700 space-y-3">
        {/* Preset vs Custom Toggle */}
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-200">选择训练动作</span>
          <button
            onClick={() => setIsCustomMode(!isCustomMode)}
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            {isCustomMode ? '选择预设动作' : '+ 自定义动作'}
          </button>
        </div>

        {isCustomMode ? (
          <input
            type="text"
            placeholder="输入自定义动作名称（如：壶铃摇摆）"
            value={customExerciseName}
            onChange={(e) => setCustomExerciseName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-dark-600 focus:border-emerald-500 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        ) : (
          <select
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 focus:border-emerald-500 text-xs text-white focus:outline-none"
          >
            {filteredPresets.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} {ex.isBodyweight ? '(自重)' : ''}
              </option>
            ))}
          </select>
        )}

        {/* Inputs: Sets, Reps, Weight */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">组数</label>
            <input
              type="number"
              min="1"
              value={setNumber}
              onChange={(e) => setSetNumber(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-dark-600 text-center font-mono font-bold text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">每组次数</label>
            <input
              type="number"
              min="1"
              value={reps}
              onChange={(e) => setReps(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-dark-600 text-center font-mono font-bold text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">单边/总重 (kg)</label>
            <input
              type="number"
              step="0.5"
              placeholder="自重留空"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-dark-600 text-center font-mono font-bold text-white text-xs focus:outline-none focus:border-emerald-500 placeholder-slate-600"
            />
          </div>
        </div>

        {/* Assistance / Note */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">辅助方式 / 动作手感备注 (选填)</label>
          <input
            type="text"
            placeholder="例如：弹力带辅助、慢速离心 3 秒"
            value={assistance}
            onChange={(e) => setAssistance(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl bg-dark-900 border border-dark-600 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder-slate-600"
          />
        </div>

        {/* Comparison Preview (Section 5.3.2) */}
        {lastWorkoutSet && (
          <div className="p-2.5 rounded-xl bg-dark-900/60 border border-dark-700/60 text-[11px] flex items-center justify-between text-slate-400">
            <span>上次表现：{lastWorkoutSet.setNumber}组 × {lastWorkoutSet.reps}次 {lastWorkoutSet.weightKg ? `@ ${lastWorkoutSet.weightKg}kg` : '(自重)'}</span>
            <span className="text-emerald-400 font-medium">同动作对比</span>
          </div>
        )}

        <button
          onClick={handleSaveSet}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          保存训练记录 (+{EXP_RULES.WORKOUT} Body EXP)
        </button>
      </div>

      {/* Body Metrics Drawer (Optional weight/waist - Section 5.3.4) */}
      <div className="p-3.5 rounded-2xl bg-dark-800 border border-dark-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-white">身体指标跟踪 (选填)</span>
          </div>
          <button
            onClick={() => setShowMetricSection(!showMetricSection)}
            className="text-xs text-emerald-400 font-medium"
          >
            {showMetricSection ? '收起' : '展开记录'}
          </button>
        </div>

        {showMetricSection && (
          <div className="mt-3 pt-3 border-t border-dark-700 space-y-3 animate-fade-in">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">今日体重 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="如 68.5"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-dark-900 border border-dark-600 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">腰围 (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="如 78.0"
                  value={waistInput}
                  onChange={(e) => setWaistInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-dark-900 border border-dark-600 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleSaveMetric}
              className="w-full py-2 rounded-xl bg-dark-700 hover:bg-dark-600 text-slate-200 text-xs font-semibold"
            >
              更新身体指标
            </button>

            {recentMetrics.length > 0 && (
              <div className="space-y-1 text-[11px] text-slate-400 pt-1">
                {recentMetrics.map((m) => (
                  <div key={m.id} className="flex justify-between py-1 border-b border-dark-700/50">
                    <span>{m.localDate}</span>
                    <span className="text-white font-mono">
                      {m.weightKg ? `${m.weightKg} kg` : ''} {m.waistCm ? `· 腰围 ${m.waistCm} cm` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Workout Sets History */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
          近期训练记录
        </h3>

        {recentSets.length === 0 ? (
          <div className="p-6 text-center bg-dark-800 rounded-2xl border border-dark-700 text-slate-400 text-xs">
            暂无训练记录。记录你的第一组力量训练吧！
          </div>
        ) : (
          <div className="space-y-2">
            {recentSets.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-xl bg-dark-800 border border-dark-700"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{s.exerciseName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-900">
                      {BODY_PART_LABELS[s.bodyPart]}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {s.setNumber} 组 × {s.reps} 次 {s.weightKg ? `@ ${s.weightKg} kg` : '(自重)'}
                    {s.assistance && ` · ${s.assistance}`}
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteSet(s)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 active:scale-95 transition-all"
                  title="删除记录（将同步冲正 EXP）"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
