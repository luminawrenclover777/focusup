import React from 'react';
import { Zap, ShieldCheck, BatteryCharging, Ticket } from 'lucide-react';
import type { EnergyMode, DimensionStats } from '../types';

interface HeaderProps {
  energyMode: EnergyMode;
  onToggleEnergyMode: () => void;
  stats: {
    focus: DimensionStats;
    body: DimensionStats;
    voice: DimensionStats;
    totalExp: number;
  };
  ticketBalance: number;
  onOpenTickets: () => void;
  todayCompletedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  energyMode,
  onToggleEnergyMode,
  stats,
  ticketBalance,
  onOpenTickets,
  todayCompletedCount
}) => {
  const isRecovery = energyMode === 'recovery';

  return (
    <header className="sticky top-0 z-40 bg-dark-900/90 backdrop-blur-md border-b border-dark-700/60 pt-safe-top px-4 pb-3 transition-colors">
      <div className="flex items-center justify-between">
        {/* Brand & Date */}
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent">
              FocusUp
            </h1>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 px-1.5 py-0.5 rounded bg-dark-700 border border-dark-600">
              v3.1
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' })}
            {isRecovery && (
              <span className="ml-1.5 text-emerald-400 font-medium">· 保底守护中</span>
            )}
          </p>
        </div>

        {/* Right Action: Energy Mode Switcher & Tickets */}
        <div className="flex items-center gap-2">
          {/* Ticket Pill */}
          <button
            onClick={onOpenTickets}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-dark-800 border border-amber-500/30 text-amber-300 text-xs font-medium active:scale-95 transition-transform"
          >
            <Ticket className="w-3.5 h-3.5 text-amber-400" />
            <span>{ticketBalance}</span>
          </button>

          {/* Energy Mode Button */}
          <button
            onClick={onToggleEnergyMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
              isRecovery
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-900/40'
                : 'bg-dark-800 text-slate-300 border-dark-600 hover:border-dark-500'
            }`}
            title="点击切换能量模式（标准 / 保底模式）"
          >
            {isRecovery ? (
              <>
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>低负担模式</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-blue-400" />
                <span>标准模式</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dimension Level Quick Bar */}
      <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] text-slate-300">
        <div className="flex-1 flex items-center justify-between px-2.5 py-1 rounded-lg bg-dark-800/80 border border-blue-900/30">
          <span className="flex items-center gap-1 text-blue-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            Focus
          </span>
          <span className="text-slate-400">Lv.{stats.focus.level} <span className="text-slate-500 text-[10px]">({stats.focus.exp} EXP)</span></span>
        </div>

        <div className="flex-1 flex items-center justify-between px-2.5 py-1 rounded-lg bg-dark-800/80 border border-emerald-900/30">
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Body
          </span>
          <span className="text-slate-400">Lv.{stats.body.level} <span className="text-slate-500 text-[10px]">({stats.body.exp} EXP)</span></span>
        </div>

        <div className="flex-1 flex items-center justify-between px-2.5 py-1 rounded-lg bg-dark-800/80 border border-amber-900/30">
          <span className="flex items-center gap-1 text-amber-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Voice
          </span>
          <span className="text-slate-400">Lv.{stats.voice.level} <span className="text-slate-500 text-[10px]">({stats.voice.exp} EXP)</span></span>
        </div>
      </div>

      {isRecovery && todayCompletedCount > 0 && (
        <div className="mt-2 px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-800/40 text-[11px] text-emerald-300 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>今日低负担保底已达成！今天你的每一次微小坚持都值得肯定。</span>
        </div>
      )}
    </header>
  );
};
