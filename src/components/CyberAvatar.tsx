import React, { useState, useEffect } from 'react';
import { Sparkles, ChevronRight } from 'lucide-react';
import { getEvolutionPhase, AVATAR_DIALOGUES } from '../data/evolutionStages';
import { soundSynthesizer } from '../services/audioService';

interface CyberAvatarProps {
  totalExp: number;
  focusExp?: number;
  bodyExp?: number;
  voiceExp?: number;
  isRecovery?: boolean;
  isCharging?: boolean;
  externalMessage?: string | null;
  onOpenEvolutionSheet?: () => void;
}

export const CyberAvatar: React.FC<CyberAvatarProps> = ({
  totalExp,
  focusExp = 0,
  bodyExp = 0,
  voiceExp = 0,
  isRecovery = false,
  isCharging = false,
  externalMessage,
  onOpenEvolutionSheet
}) => {
  const { current: phase, next: nextPhase, progressPercent, expInPhase, phaseSpan } = getEvolutionPhase(totalExp);

  const [dialogue, setDialogue] = useState<string>('');
  const [isInteracting, setIsInteracting] = useState<boolean>(false);

  // Initialize dialogue or react to external message
  useEffect(() => {
    if (externalMessage) {
      setDialogue(externalMessage);
    } else {
      const pool = isRecovery ? AVATAR_DIALOGUES.recovery : AVATAR_DIALOGUES.idle;
      setDialogue(pool[Math.floor(Math.random() * pool.length)]);
    }
  }, [externalMessage, isRecovery, totalExp]);

  const handleTapAvatar = () => {
    soundSynthesizer.playCyberHaptic('pulse');
    setIsInteracting(true);

    const pool = isCharging
      ? AVATAR_DIALOGUES.charged
      : isRecovery
      ? AVATAR_DIALOGUES.recovery
      : AVATAR_DIALOGUES.idle;

    const nextDialogue = pool[Math.floor(Math.random() * pool.length)];
    setDialogue(nextDialogue);

    setTimeout(() => {
      setIsInteracting(false);
    }, 600);
  };

  // Phase-specific colors & geometries
  const isPhase2 = phase.phase === 2;
  const isPhase3 = phase.phase === 3;
  const isPhase4 = phase.phase === 4;
  const isPhase5 = phase.phase >= 5;

  // Dimension activity glow weights
  const focusCoreOpacity = Math.min(1, 0.7 + (focusExp % 300) / 1000);
  const bodyStrokeWeight = Math.min(4, 1.5 + (bodyExp % 300) / 150);
  const voiceDashArray = voiceExp > 0 ? '4 8' : '2 12';

  return (
    <div className="relative rounded-3xl bg-gradient-to-b from-[#1C1C1E] via-[#161618] to-[#121214] border border-white/10 p-5 shadow-2xl overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div
        className={`absolute -top-12 -left-12 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none transition-colors duration-700 ${
          isRecovery ? 'bg-cyan-500' : 'bg-[#0A84FF]'
        }`}
      />
      <div
        className="absolute -bottom-10 -right-10 w-44 h-44 rounded-full blur-3xl opacity-20 pointer-events-none bg-[#30D158]"
      />

      {/* Header Readout: Stage Name & Lore trigger */}
      <div className="flex items-center justify-between relative z-10 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/15">
            {phase.code}
          </span>
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
            <span>{phase.name}</span>
            <span className="text-[11px] text-[#8E8E93] font-normal hidden sm:inline">
              · {phase.enName}
            </span>
          </h3>
        </div>

        <button
          type="button"
          onClick={onOpenEvolutionSheet}
          className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/10 px-2.5 py-1 rounded-full transition-all border border-white/[0.08] cursor-pointer"
        >
          <span>形态档案</span>
          <ChevronRight className="w-3 h-3 text-[#8E8E93]" />
        </button>
      </div>

      {/* Main Avatar Entity Showcase */}
      <div
        onClick={handleTapAvatar}
        className="relative my-2 py-3 flex flex-col items-center justify-center cursor-pointer group"
        title="点击互动唤醒核心"
      >
        {/* Living Organism Interactive Viewbox */}
        <div className={`relative w-44 h-44 flex items-center justify-center transition-transform duration-300 ${
          isInteracting ? 'scale-105' : 'hover:scale-102'
        }`}>
          {/* Subtle Outer Particle Aura */}
          <div
            className={`absolute inset-0 rounded-full blur-xl transition-all duration-700 pointer-events-none ${
              isCharging
                ? 'bg-blue-500/40 animate-pulse'
                : isRecovery
                ? 'bg-cyan-500/20'
                : 'bg-[#0A84FF]/20 group-hover:bg-[#0A84FF]/35'
            }`}
          />

          <svg className="w-44 h-44 pointer-events-none" viewBox="0 0 200 200">
            <defs>
              <radialGradient id="cyberCoreGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                <stop offset="35%" stopColor={isRecovery ? '#64D2FF' : '#0A84FF'} stopOpacity="0.9" />
                <stop offset="70%" stopColor="#0040DD" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>

              <linearGradient id="bodyRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#30D158" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#64D2FF" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#30D158" stopOpacity="0.1" />
              </linearGradient>

              <linearGradient id="voiceHaloGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FF9F0A" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#FF453A" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Orbit 3 (Voice Wave Resonance - Outer Segmented) */}
            <circle
              cx="100"
              cy="100"
              r="86"
              stroke="url(#voiceHaloGrad)"
              strokeWidth="1.5"
              fill="none"
              strokeDasharray={voiceDashArray}
              className={isCharging ? 'animate-spin' : ''}
              style={{
                transformOrigin: 'center',
                animationDuration: '28s'
              }}
            />

            {/* Orbit 2 (Body Kinetic Shell - Middle Mechanical Ring) */}
            <circle
              cx="100"
              cy="100"
              r="70"
              stroke="url(#bodyRingGrad)"
              strokeWidth={bodyStrokeWeight}
              fill="none"
              strokeDasharray={isPhase2 || isPhase3 || isPhase4 || isPhase5 ? '18 10 6 10' : '4 14'}
              className="animate-spin"
              style={{
                transformOrigin: 'center',
                animationDuration: isCharging ? '8s' : '18s',
                animationDirection: 'reverse'
              }}
            />

            {/* Phase 3+ Mechanical Exoskeleton Calipers */}
            {(isPhase3 || isPhase4 || isPhase5) && (
              <g className="animate-spin" style={{ transformOrigin: 'center', animationDuration: '40s' }}>
                <path d="M 100 20 L 105 32 L 95 32 Z" fill="#30D158" />
                <path d="M 100 180 L 105 168 L 95 168 Z" fill="#30D158" />
                <path d="M 20 100 L 32 105 L 32 95 Z" fill="#30D158" />
                <path d="M 180 100 L 168 105 L 168 95 Z" fill="#30D158" />
              </g>
            )}

            {/* Phase 4+ Celestial Wings / Force Fields */}
            {(isPhase4 || isPhase5) && (
              <g opacity="0.6">
                <circle cx="100" cy="100" r="95" stroke="#BF5AF2" strokeWidth="1" strokeDasharray="30 20" fill="none" />
                <circle cx="100" cy="100" r="98" stroke="#FF9F0A" strokeWidth="0.8" strokeDasharray="15 35" fill="none" />
              </g>
            )}

            {/* Orbit 1 (Focus Mind Orbit - High Speed Inner Pulse) */}
            <circle
              cx="100"
              cy="100"
              r="52"
              stroke={isRecovery ? '#64D2FF' : '#0A84FF'}
              strokeWidth="2"
              fill="none"
              strokeDasharray="24 16"
              className="animate-spin"
              style={{
                transformOrigin: 'center',
                animationDuration: isCharging ? '4s' : '10s'
              }}
            />

            {/* Core Center Pulse (The Quantum Heart) */}
            <circle
              cx="100"
              cy="100"
              r="34"
              fill="url(#cyberCoreGlow)"
              opacity={focusCoreOpacity}
              className="animate-pulse"
              style={{
                animationDuration: isCharging ? '1s' : '2.4s'
              }}
            />

            {/* Core Neural Spark Points */}
            <circle cx="100" cy="100" r="10" fill="#FFFFFF" opacity="0.9" />
            <circle cx="100" cy="100" r="4" fill={isRecovery ? '#64D2FF' : '#0A84FF'} />
          </svg>

          {/* Center Interactive Touch Indicator badge */}
          <div className="absolute flex flex-col items-center pointer-events-none">
            <span className="text-[10px] font-mono tracking-widest text-white/90 uppercase font-bold drop-shadow">
              {isCharging ? '超频充能' : isRecovery ? '轻载守恒' : '核心在线'}
            </span>
          </div>
        </div>

        {/* AI Companion Speech Bubble */}
        <div className="w-full max-w-sm mt-1 px-4 py-2.5 rounded-2xl bg-[#2C2C2E]/80 border border-white/[0.08] backdrop-blur-md shadow-md text-center transition-all">
          <p className="text-xs text-slate-200 font-medium leading-relaxed">
            {dialogue}
          </p>
        </div>
      </div>

      {/* Progress to Next Evolution */}
      <div className="mt-3 pt-3 border-t border-white/[0.08] space-y-1.5 relative z-10">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#8E8E93] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#0A84FF]" />
            <span>形态跃迁进度</span>
          </span>
          <span className="text-white font-mono font-bold">
            {nextPhase ? `${expInPhase} / ${phaseSpan} EXP` : '已达至臻形态'}
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-[#2C2C2E] overflow-hidden p-0.5 border border-white/[0.05]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#0A84FF] via-cyan-400 to-[#30D158] transition-all duration-500 shadow-sm"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#8E8E93] pt-0.5">
          <span>当前: {phase.name}</span>
          <span>{nextPhase ? `下一阶: ${nextPhase.name}` : '终极觉醒'}</span>
        </div>
      </div>
    </div>
  );
};
