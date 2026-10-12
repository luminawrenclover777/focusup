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

  // Time of day greeting
  const hour = new Date().getHours();
  const greeting = hour < 6 ? '夜深了' : hour < 12 ? '早安' : hour < 18 ? '下午好' : '晚上好';

  return (
    <header className="fixed top-0 left-0 right-0 z-40 ios-glass border-b border-white/[0.08] pt-safe-top px-5 py-3 transition-colors duration-200">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        {/* App Title & Date Greeting */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-1.5">
              FocusUp
            </h1>
            {isRecovery && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-medium border border-cyan-500/30">
                {todayCompletedCount > 0 ? '保底已达标' : '保底休息'}
              </span>
            )}
          </div>
          <p className="text-[12px] text-[#8E8E93] font-medium tracking-tight mt-0.5">
            {new Date().toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' })} · {greeting}
          </p>
        </div>

        {/* Right Actions: Ticket Wallet & Energy Mode */}
        <div className="flex items-center gap-2">
          {/* Ticket Pill (Purple Royalty Accent, distinct from Voice Orange) */}
          <button
            onClick={onOpenTickets}
            className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-semibold active:scale-95 transition-all shadow-sm"
            title="娱乐券赏金钱包"
          >
            <Ticket className="w-3.5 h-3.5 text-purple-300" />
            <span className="text-xs font-bold font-mono">{ticketBalance}</span>
          </button>

          {/* Energy Mode Button (Cyan Recovery vs Classic Slate/Blue Standard) */}
          <button
            onClick={onToggleEnergyMode}
            className={`flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold border transition-all active:scale-95 shadow-sm ${
              isRecovery
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25'
                : 'bg-[#1C1C1E] text-slate-200 border-white/10 hover:bg-[#2C2C2E]'
            }`}
            title="点击切换标准专注 / 保底休息模式"
          >
            {isRecovery ? (
              <>
                <BatteryCharging className="w-3.5 h-3.5 text-cyan-400" />
                <span>保底</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-[#0A84FF]" />
                <span>标准</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
