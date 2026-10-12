import React from 'react';
import { Zap, BatteryCharging, Ticket } from 'lucide-react';
import type { EnergyMode } from '../types';

interface HeaderProps {
  energyMode: EnergyMode;
  onToggleEnergyMode: () => void;
  ticketBalance: number;
  onOpenTickets: () => void;
  todayCompletedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  energyMode,
  onToggleEnergyMode,
  ticketBalance,
  onOpenTickets,
  todayCompletedCount
}) => {
  const isRecovery = energyMode === 'recovery';

  return (
    <header className="sticky top-0 z-40 bg-dark-900/80 backdrop-blur-xl border-b border-white/[0.06] pt-safe-top px-4 py-2.5 transition-colors">
      <div className="flex items-center justify-between max-w-md mx-auto">
        {/* App Title & Date */}
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-bold tracking-tight text-white">
            FocusUp
          </h1>
          <span className="text-[11px] text-slate-400 font-medium">
            {new Date().toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' })}
          </span>
          {isRecovery && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 font-medium border border-emerald-500/20">
              {todayCompletedCount > 0 ? '保底已达标' : '保底模式'}
            </span>
          )}
        </div>

        {/* Right Actions: Mode Toggle & Tickets */}
        <div className="flex items-center gap-1.5">
          {/* Ticket Pill */}
          <button
            onClick={onOpenTickets}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-dark-800/80 hover:bg-dark-700/80 border border-amber-500/20 text-amber-300 text-[11px] font-semibold active:scale-95 transition-all"
            title="娱乐券赏金钱包"
          >
            <Ticket className="w-3 h-3 text-amber-400" />
            <span>{ticketBalance}</span>
          </button>

          {/* Energy Mode Button */}
          <button
            onClick={onToggleEnergyMode}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all active:scale-95 ${
              isRecovery
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-dark-800/80 text-slate-300 border-white/[0.08] hover:border-white/[0.15]'
            }`}
            title="点击切换标准 / 保底模式"
          >
            {isRecovery ? (
              <>
                <BatteryCharging className="w-3 h-3 text-emerald-400" />
                <span>保底</span>
              </>
            ) : (
              <>
                <Zap className="w-3 h-3 text-blue-400" />
                <span>标准</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
