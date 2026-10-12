import React from 'react';
import { Sparkles, Check, Lock } from 'lucide-react';
import { EVOLUTION_PHASES, getEvolutionPhase } from '../data/evolutionStages';
import { IOSSheet } from './IOSModal';

interface EvolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalExp: number;
}

export const EvolutionModal: React.FC<EvolutionModalProps> = ({
  isOpen,
  onClose,
  totalExp
}) => {
  const { current: currentPhase, progressPercent, expInPhase, phaseSpan } = getEvolutionPhase(totalExp);

  return (
    <IOSSheet isOpen={isOpen} onClose={onClose} title="赛博生命体 · 进化图谱">
      <div className="space-y-4 pb-6 text-white">
        {/* Intro & Progress */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/30 via-purple-900/20 to-black border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0A84FF]" />
              <h4 className="text-sm font-bold text-white">当前阶位: {currentPhase.name}</h4>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-300">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0A84FF] to-[#30D158]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#8E8E93]">
            <span>本阶能量: {expInPhase} / {phaseSpan} EXP</span>
            <span>累计总算力: {totalExp} EXP</span>
          </div>
        </div>

        {/* List of 5 phases */}
        <div className="space-y-3">
          {EVOLUTION_PHASES.map((phase) => {
            const isUnlocked = totalExp >= phase.minExp;
            const isCurrent = currentPhase.phase === phase.phase;

            return (
              <div
                key={phase.phase}
                className={`p-4 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-[#1C1C1E] border-[#0A84FF]/60 shadow-lg shadow-blue-500/10'
                    : isUnlocked
                    ? 'bg-[#1C1C1E]/80 border-white/10 opacity-90'
                    : 'bg-[#161618]/50 border-white/[0.05] opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isCurrent
                          ? 'bg-[#0A84FF] text-white'
                          : isUnlocked
                          ? 'bg-emerald-500/20 text-[#30D158]'
                          : 'bg-white/10 text-[#8E8E93]'
                      }`}
                    >
                      {phase.code}
                    </span>
                    <h5 className="text-sm font-bold text-white">{phase.name}</h5>
                    <span className="text-xs text-[#8E8E93]">({phase.enName})</span>
                  </div>

                  <div>
                    {isCurrent ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#0A84FF]/20 text-[#0A84FF] font-semibold border border-[#0A84FF]/30">
                        当前阶位
                      </span>
                    ) : isUnlocked ? (
                      <span className="text-[11px] text-[#30D158] flex items-center gap-1 font-medium">
                        <Check className="w-3.5 h-3.5" /> 已达成
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#8E8E93] flex items-center gap-1">
                        <Lock className="w-3 h-3" /> 需要 {phase.minExp} EXP
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-300 mb-2 leading-relaxed">{phase.subtitle}</p>

                <div className="p-2.5 rounded-xl bg-[#2C2C2E]/60 border border-white/[0.05] text-[11px] space-y-1">
                  <div className="text-[#8E8E93] leading-relaxed">{phase.lore}</div>
                  <div className="text-cyan-300 font-medium">
                    ✦ 解锁特征: {phase.unlockedFeature}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full h-12 rounded-2xl bg-[#2C2C2E] hover:bg-[#3A3A3C] active:scale-95 text-white font-semibold text-sm transition-all cursor-pointer"
        >
          返回今日进化
        </button>
      </div>
    </IOSSheet>
  );
};
