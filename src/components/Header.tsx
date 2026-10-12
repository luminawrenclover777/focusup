import React from 'react';
import { Timer, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  todayMinutes: number;
  todayBrakes: number;
}

export const Header: React.FC<HeaderProps> = ({
  todayMinutes,
  todayBrakes
}) => {
  // Time of day greeting
  const hour = new Date().getHours();
  const greeting = hour < 6 ? '深夜' : hour < 12 ? '早安' : hour < 18 ? '下午' : '晚间';

  return (
    <header className="fixed top-0 left-0 right-0 z-40 ios-glass border-b border-white/[0.08] pt-safe-top px-5 py-3 transition-colors duration-200">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        {/* App Title & Date Greeting */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-1.5 font-sans">
              FocusUp
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.07] text-[#8E8E93] font-medium tracking-wide">
              MINIMAL
            </span>
          </div>
          <p className="text-[12px] text-[#8E8E93] font-medium tracking-tight mt-0.5">
            {new Date().toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' })} · {greeting}
          </p>
        </div>

        {/* Right Honest Summary Badges */}
        <div className="flex items-center gap-2">
          {/* Today's Focus Minutes */}
          <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-xl bg-[#1C1C1E] border border-white/10 text-slate-200 text-xs font-medium">
            <Timer className="w-3.5 h-3.5 text-[#0A84FF]" />
            <span className="font-mono font-bold text-white">{todayMinutes}</span>
            <span className="text-[10px] text-[#8E8E93]">m</span>
          </div>

          {/* Today's Brakes Intercepted */}
          <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-xl bg-[#1C1C1E] border border-white/10 text-slate-200 text-xs font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-[#30D158]" />
            <span className="font-mono font-bold text-white">{todayBrakes}</span>
            <span className="text-[10px] text-[#8E8E93]">次刹车</span>
          </div>
        </div>
      </div>
    </header>
  );
};
