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
    <header className="sticky top-0 z-40 bg-[#000000] border-b border-white/[0.08] pt-safe-top px-5 py-3.5">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        {/* App Title & Date */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              FocusUp
            </h1>
            {isRecovery && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium border border-emerald-500/30">
                {todayCompletedCount > 0 ? '保底已达标' : '保底休息'}
              </span>
            )}
          </div>
          <p className="text-xs text-[#8E8E93] font-medium mt-0.5">
            {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </div>

        {/* Right Actions: Tickets & Energy Mode */}
        <div className="flex items-center gap-2">
          {/* Ticket Pill */}
          <button
            onClick={onOpenTickets}
            className="flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] border border-white/10 text-amber-400 text-xs font-semibold active:scale-95 transition-all shadow-sm"
            title="娱乐券赏金钱包"
          >
            <Ticket className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold">{ticketBalance}</span>
          </button>

          {/* Energy Mode Button */}
          <button
            onClick={onToggleEnergyMode}
            className={`flex items-center gap-1.5 h-10 px-3.5 rounded-full text-xs font-semibold border transition-all active:scale-95 shadow-sm ${
              isRecovery
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-[#1C1C1E] text-slate-200 border-white/10 hover:bg-[#2C2C2E]'
            }`}
            title="点击切换标准专注 / 保底休息模式"
          >
            {isRecovery ? (
              <>
                <BatteryCharging className="w-4 h-4 text-emerald-400" />
                <span>保底</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-blue-400" />
                <span>标准</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
